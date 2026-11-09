-- GRACH · iteration 3: tutorial authoring, workshop templates + sessions (no more "events"),
-- organizer reminders, order transitions with proof. Apply after 20261108_iteration2.sql.
-- Data is migrated, never dropped: every former event / one-date workshop becomes a template
-- with one session, and every enrollment is attached to that session.

begin;

-- =====================================================================
-- 1. Tutorials: authoring status and richer content
-- =====================================================================
do $$ begin
  create type tutorial_status as enum ('draft', 'published', 'hidden');
exception when duplicate_object then null; end $$;

alter table tutorials add column if not exists status tutorial_status not null default 'published';
alter table tutorials add column if not exists direction text;
alter table tutorials add column if not exists content text;
alter table tutorials add column if not exists video_url text check (video_url is null or video_url ~ '^https?://');
alter table tutorials add column if not exists links jsonb not null default '[]';        -- [{label, url}]
alter table tutorials add column if not exists views int not null default 0;
alter table tutorials add column if not exists updated_at timestamptz not null default now();

create table if not exists tutorial_images (
  id uuid primary key default gen_random_uuid(),
  tutorial_id uuid not null references tutorials(id) on delete cascade,
  storage_path text not null,
  position int not null default 0
);
-- Steps stay in tutorials.steps (jsonb): each step gets an optional "image" key — no schema change needed.

alter table tutorials enable row level security;
drop policy if exists "published tutorials are public" on tutorials;
create policy "published tutorials are public" on tutorials for select using (status = 'published' or author_id = auth.uid());
drop policy if exists "author writes tutorials" on tutorials;
create policy "author writes tutorials" on tutorials for all using (author_id = auth.uid()) with check (author_id = auth.uid());
alter table tutorial_images enable row level security;
drop policy if exists "images follow tutorial" on tutorial_images;
create policy "images follow tutorial" on tutorial_images for select
  using (exists (select 1 from tutorials t where t.id = tutorial_id and (t.status = 'published' or t.author_id = auth.uid())));
drop policy if exists "author writes tutorial images" on tutorial_images;
create policy "author writes tutorial images" on tutorial_images for all
  using (exists (select 1 from tutorials t where t.id = tutorial_id and t.author_id = auth.uid()))
  with check (exists (select 1 from tutorials t where t.id = tutorial_id and t.author_id = auth.uid()));

create or replace function register_tutorial_view(p_tutorial uuid) returns void
language sql security definer set search_path = public as $$
  update tutorials set views = views + 1 where id = p_tutorial and status = 'published' and author_id <> auth.uid();
$$;

-- =====================================================================
-- 2. Workshops → templates + sessions; "event" entity removed
-- =====================================================================
create table if not exists workshop_sessions (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references workshops(id) on delete cascade,
  host_id uuid not null references profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  time_zone text not null,
  format text not null check (format in ('online', 'offline')),
  country char(2),
  city text,
  venue text,
  online_url text check (online_url is null or online_url ~ '^https://'),
  seats_total int not null check (seats_total > 0),
  external_seats int not null default 0,
  price_amount numeric(12,2),                 -- snapshot taken from the template when the session is created
  price_currency char(3),
  terms text,
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz
);
create index if not exists workshop_sessions_upcoming on workshop_sessions (status, starts_at);
create index if not exists workshop_sessions_workshop on workshop_sessions (workshop_id, starts_at);

-- Template-only columns
alter table workshops add column if not exists photos text[] not null default '{}';
alter table workshops add column if not exists technique text;
alter table workshops add column if not exists online_info text;
alter table workshops add column if not exists archived boolean not null default false;

-- 2a. Data migration: each existing workshop row (incl. former events) → one session.
insert into workshop_sessions (id, workshop_id, host_id, starts_at, ends_at, time_zone, format, country, city, venue,
                               online_url, seats_total, price_amount, price_currency, terms, status, created_at, updated_at, cancelled_at)
select gen_random_uuid(), w.id, w.host_id, w.starts_at, w.ends_at, w.time_zone, w.format, w.country, w.city, w.venue,
       p.online_url, w.seats_total, w.price_amount, w.price_currency, w.terms,
       case when w.status = 'cancelled' then 'cancelled' else 'scheduled' end,
       w.created_at, w.updated_at, w.cancelled_at
from workshops w
left join workshop_private p on p.workshop_id = w.id
where not exists (select 1 from workshop_sessions s where s.workshop_id = w.id);

-- Former events stay as regular workshops (nothing is deleted); cancelled ones keep a cancelled session.
-- The `kind` column is archived (renamed) rather than dropped, so the original classification is not lost.
do $$ begin
  alter table workshops rename column kind to legacy_kind;
exception when undefined_column then null; end $$;
update workshops set status = 'published' where status = 'cancelled';  -- the cancellation now lives on the session

-- 2b. Bookings belong to a session; one booking per user and session, possibly several seats.
alter table workshop_enrollments add column if not exists session_id uuid references workshop_sessions(id) on delete cascade;
alter table workshop_enrollments add column if not exists seats int not null default 1 check (seats between 1 and 20);
update workshop_enrollments e set session_id = s.id
from workshop_sessions s where s.workshop_id = e.workshop_id and e.session_id is null;
alter table workshop_enrollments alter column session_id set not null;
alter table workshop_enrollments drop constraint if exists workshop_enrollments_pkey;
alter table workshop_enrollments add primary key (user_id, session_id);       -- no double booking of one session

-- Session-level columns are no longer read from the template (kept for history, can be dropped later):
comment on column workshops.starts_at is 'deprecated: see workshop_sessions';
comment on column workshops.seats_total is 'deprecated: see workshop_sessions';

-- 2c. RLS
alter table workshop_sessions enable row level security;
drop policy if exists "sessions of public workshops" on workshop_sessions;
create policy "sessions of public workshops" on workshop_sessions for select using (
  host_id = auth.uid() or exists (select 1 from workshops w where w.id = workshop_id and w.status = 'published')
);
drop policy if exists "host writes sessions" on workshop_sessions;
create policy "host writes sessions" on workshop_sessions for all using (host_id = auth.uid()) with check (host_id = auth.uid());
-- The joining link must not leak through the public select: expose it via a view for booked users only.
create or replace view workshop_session_links as
  select s.id as session_id, s.online_url from workshop_sessions s
  where s.host_id = auth.uid()
     or exists (select 1 from workshop_enrollments e where e.session_id = s.id and e.user_id = auth.uid());

-- 2d. Booking through a function: checks status, start time, duplicates and free seats atomically.
create or replace function book_session(p_session uuid, p_seats int) returns void
language plpgsql security definer set search_path = public as $$
declare s workshop_sessions%rowtype; taken int;
begin
  select * into s from workshop_sessions where id = p_session for update;
  if not found or s.status <> 'scheduled' or s.starts_at <= now() then raise exception 'closed'; end if;
  if s.host_id = auth.uid() then raise exception 'closed'; end if;
  if not exists (select 1 from workshops w where w.id = s.workshop_id and w.status = 'published') then raise exception 'closed'; end if;
  if exists (select 1 from workshop_enrollments where session_id = p_session and user_id = auth.uid()) then raise exception 'duplicate'; end if;
  select s.external_seats + coalesce(sum(seats), 0) into taken from workshop_enrollments where session_id = p_session;
  if p_seats < 1 or taken + p_seats > s.seats_total then raise exception 'full'; end if;
  insert into workshop_enrollments (user_id, workshop_id, session_id, seats) values (auth.uid(), s.workshop_id, p_session, p_seats);
end $$;

drop policy if exists "enroll in published" on workshop_enrollments;   -- direct inserts replaced by book_session()
drop policy if exists "own or hosted enrollments" on workshop_enrollments;
create policy "own or hosted enrollments" on workshop_enrollments for select using (
  user_id = auth.uid() or exists (select 1 from workshop_sessions s where s.id = session_id and s.host_id = auth.uid())
);
drop policy if exists "host removes bookings" on workshop_enrollments;
create policy "host removes bookings" on workshop_enrollments for delete using (
  user_id = auth.uid() or exists (select 1 from workshop_sessions s where s.id = session_id and s.host_id = auth.uid())
);

-- 2e. Change notifications now work per session (replaces the event trigger of iteration 2).
drop trigger if exists workshops_notify_change on workshops;
drop trigger if exists workshop_private_notify on workshop_private;

create or replace function notify_session_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare ch jsonb := '[]'::jsonb; t text;
begin
  if old.status <> 'scheduled' then return new; end if;
  select title into t from workshops where id = new.workshop_id;
  if new.status = 'cancelled' then
    insert into notifications (user_id, type, actor_id, message_key, params, href)
    select distinct e.user_id, 'workshop', new.host_id, 'sessionCancelled', jsonb_build_object('title', t, 'startsAt', old.starts_at), '/learn/workshop/' || new.workshop_id
    from workshop_enrollments e where e.session_id = new.id and e.user_id <> new.host_id;
    return new;
  end if;
  if new.starts_at is distinct from old.starts_at then ch := ch || jsonb_build_object('field', 'startsAt', 'from', old.starts_at, 'to', new.starts_at); end if;
  if new.ends_at is distinct from old.ends_at then ch := ch || jsonb_build_object('field', 'endsAt', 'from', old.ends_at, 'to', new.ends_at); end if;
  if new.time_zone is distinct from old.time_zone then ch := ch || jsonb_build_object('field', 'timeZone', 'from', old.time_zone, 'to', new.time_zone); end if;
  if (new.country, new.city, new.venue) is distinct from (old.country, old.city, old.venue) then
    ch := ch || jsonb_build_object('field', 'place', 'from', concat_ws('|', old.country, old.city, old.venue), 'to', concat_ws('|', new.country, new.city, new.venue));
  end if;
  if new.online_url is distinct from old.online_url then ch := ch || jsonb_build_object('field', 'onlineUrl', 'from', '', 'to', ''); end if;
  if (new.price_amount, new.price_currency) is distinct from (old.price_amount, old.price_currency) then
    ch := ch || jsonb_build_object('field', 'price', 'from', coalesce(old.price_amount::text || '|' || old.price_currency, ''), 'to', coalesce(new.price_amount::text || '|' || new.price_currency, ''));
  end if;
  if coalesce(new.terms, '') is distinct from coalesce(old.terms, '') then ch := ch || jsonb_build_object('field', 'terms', 'from', coalesce(old.terms, ''), 'to', coalesce(new.terms, '')); end if;
  if jsonb_array_length(ch) > 0 then
    insert into notifications (user_id, type, actor_id, message_key, params, href, changes)
    select distinct e.user_id, 'workshop', new.host_id, 'sessionChanged', jsonb_build_object('title', t), '/learn/workshop/' || new.workshop_id, ch
    from workshop_enrollments e where e.session_id = new.id and e.user_id <> new.host_id;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists workshop_sessions_notify on workshop_sessions;
create trigger workshop_sessions_notify before update on workshop_sessions for each row execute function notify_session_change();

-- =====================================================================
-- 3. Organizer reminders (24 h / 1 h) — background job, deduplicated
-- =====================================================================
alter table user_regional_settings add column if not exists remind_24h boolean not null default true;
alter table user_regional_settings add column if not exists remind_1h boolean not null default true;

create table if not exists session_reminders_sent (
  session_id uuid references workshop_sessions(id) on delete cascade,
  kind text not null check (kind in ('24h', '1h')),
  sent_at timestamptz not null default now(),
  primary key (session_id, kind)                 -- one reminder per session and interval
);

create or replace function send_session_reminders() returns int
language plpgsql security definer set search_path = public as $$
declare n int := 0; r record;
begin
  for r in
    select s.id, s.host_id, s.starts_at, s.format, w.title,
           s.external_seats + coalesce((select sum(seats) from workshop_enrollments e where e.session_id = s.id), 0) as booked,
           case when now() >= s.starts_at - interval '1 hour' then '1h' else '24h' end as kind,
           coalesce(u.remind_24h, true) as r24, coalesce(u.remind_1h, true) as r1
    from workshop_sessions s
    join workshops w on w.id = s.workshop_id and w.status = 'published'
    left join user_regional_settings u on u.user_id = s.host_id
    where s.status = 'scheduled' and s.starts_at > now() and s.starts_at <= now() + interval '24 hours'
  loop
    continue when (r.kind = '24h' and not r.r24) or (r.kind = '1h' and not r.r1);
    insert into session_reminders_sent (session_id, kind) values (r.id, r.kind) on conflict do nothing;
    if found then
      if r.kind = '1h' then insert into session_reminders_sent (session_id, kind) values (r.id, '24h') on conflict do nothing; end if;
      insert into notifications (user_id, type, message_key, params, href)
      values (r.host_id, 'workshop', case when r.kind = '24h' then 'reminder24' else 'reminder1' end,
              jsonb_build_object('title', r.title, 'startsAt', r.starts_at, 'format', '@workshop.' || r.format, 'count', r.booked),
              '/dashboard/workshops');
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;
-- Schedule with pg_cron (enable the extension in the Supabase dashboard):
-- select cron.schedule('session-reminders', '*/5 * * * *', $$select send_session_reminders()$$);

-- =====================================================================
-- 4. Orders: proof-backed transitions, buyer acknowledgement, full history
-- =====================================================================
alter type order_status add value if not exists 'ready' after 'preparing';
alter table orders add column if not exists ready_photo_path text;
alter table orders add column if not exists shipment_carrier text;
alter table orders add column if not exists shipment_number text;
alter table orders add column if not exists shipment_url text check (shipment_url is null or shipment_url ~ '^https?://');

alter table order_status_history add column if not exists from_status order_status;
alter table order_status_history add column if not exists actor_id uuid references profiles(id);
alter table order_status_history add column if not exists comment text;
alter table order_status_history add column if not exists photo_path text;               -- bucket 'order-proofs' (private)
alter table order_status_history add column if not exists carrier text;
alter table order_status_history add column if not exists tracking_number text;
alter table order_status_history add column if not exists tracking_url text;
alter table order_status_history add column if not exists ack text check (ack in ('pending', 'confirmed', 'rejected'));
alter table order_status_history add column if not exists reject_reason text;
alter table order_status_history add column if not exists is_revert boolean not null default false;

alter table messages add column if not exists image_path text;
alter table messages add column if not exists order_id uuid references orders(id) on delete set null;

-- Direct status updates are blocked; only these functions may change orders.status.
create or replace function guard_order_status() returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status and coalesce(current_setting('app.order_transition', true), '') <> 'on' then
    raise exception 'status changes must go through order_transition()' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists orders_guard_status on orders;
create trigger orders_guard_status before update on orders for each row execute function guard_order_status();

/** Seller step with mandatory proof (same rules as src/lib/orders.ts validateTransition). */
create or replace function order_transition(p_order uuid, p_to order_status, p_comment text default null, p_photo_path text default null,
                                            p_carrier text default null, p_number text default null, p_url text default null)
returns void language plpgsql security definer set search_path = public as $$
declare o orders%rowtype; nxt order_status;
begin
  select * into o from orders where id = p_order for update;
  if not found or o.seller_id <> auth.uid() then raise exception 'forbidden' using errcode = '42501'; end if;
  if o.status in ('cancelled', 'received') then raise exception 'closed'; end if;
  nxt := case o.status when 'pending' then 'confirmed' when 'confirmed' then 'preparing' when 'preparing' then 'ready' when 'ready' then 'handed_over' end;
  if nxt is null or nxt <> p_to then raise exception 'notAllowed'; end if;
  if p_to = 'ready' and p_photo_path is null then raise exception 'photoRequired'; end if;
  if p_to = 'handed_over' then
    if coalesce(trim(p_number), '') = '' and coalesce(trim(p_url), '') = '' then raise exception 'shipmentRequired'; end if;
    if coalesce(trim(p_number), '') <> '' and coalesce(trim(p_carrier), '') = '' then raise exception 'carrierRequired'; end if;
    if coalesce(trim(p_url), '') <> '' and p_url !~ '^https?://' then raise exception 'invalidUrl'; end if;
  end if;
  perform set_config('app.order_transition', 'on', true);
  update orders set status = p_to,
    ready_photo_path = case when p_to = 'ready' then p_photo_path else ready_photo_path end,
    shipment_carrier = case when p_to = 'handed_over' then p_carrier else shipment_carrier end,
    shipment_number = case when p_to = 'handed_over' then p_number else shipment_number end,
    shipment_url = case when p_to = 'handed_over' then p_url else shipment_url end
  where id = p_order;
  insert into order_status_history (order_id, status, from_status, actor_id, comment, photo_path, carrier, tracking_number, tracking_url, ack)
  values (p_order, p_to, o.status, auth.uid(), p_comment, p_photo_path, p_carrier, p_number, p_url, 'pending');
  if p_to = 'ready' then
    insert into messages (from_id, to_id, text, image_path, order_id) values (auth.uid(), o.buyer_id, coalesce(p_comment, ''), p_photo_path, p_order);
  end if;
  insert into notifications (user_id, type, actor_id, message_key, params, href)
  values (o.buyer_id, 'order', auth.uid(), 'orderStep', jsonb_build_object('number', o.number, 'status', '@orderStatus.' || p_to), '/orders/' || p_order);
end $$;

/** Buyer accepts (p_accept = true) or rejects the latest seller step; rejection reverts the status. */
create or replace function order_ack(p_order uuid, p_accept boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare o orders%rowtype; h order_status_history%rowtype;
begin
  select * into o from orders where id = p_order for update;
  if not found or o.buyer_id <> auth.uid() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into h from order_status_history where order_id = p_order order by created_at desc limit 1;
  if h.ack is distinct from 'pending' then raise exception 'nothingToAck'; end if;
  if p_accept then
    update order_status_history set ack = 'confirmed' where id = h.id;
    return;
  end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'reasonRequired'; end if;
  update order_status_history set ack = 'rejected', reject_reason = p_reason where id = h.id;
  perform set_config('app.order_transition', 'on', true);
  update orders set status = h.from_status,
    ready_photo_path = case when h.status = 'ready' then null else ready_photo_path end,
    shipment_number = case when h.status = 'handed_over' then null else shipment_number end,
    shipment_url = case when h.status = 'handed_over' then null else shipment_url end
  where id = p_order;
  insert into order_status_history (order_id, status, from_status, actor_id, comment, is_revert) values (p_order, h.from_status, h.status, auth.uid(), p_reason, true);
  insert into notifications (user_id, type, actor_id, message_key, params, href)
  values (o.seller_id, 'order', auth.uid(), 'orderStepRejected', jsonb_build_object('number', o.number, 'status', '@orderStatus.' || h.status, 'reason', p_reason), '/orders/' || p_order);
end $$;

/** Buyer confirms receipt (only after shipping) or cancels before production. */
create or replace function order_buyer_action(p_order uuid, p_action text) returns void
language plpgsql security definer set search_path = public as $$
declare o orders%rowtype; target order_status;
begin
  select * into o from orders where id = p_order for update;
  if not found or o.buyer_id <> auth.uid() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_action = 'received' and o.status in ('handed_over', 'in_transit', 'arrived', 'delivered') then target := 'received';
  elsif p_action = 'cancel' and o.status in ('pending', 'confirmed') then target := 'cancelled';
  else raise exception 'notAllowed'; end if;
  perform set_config('app.order_transition', 'on', true);
  update orders set status = target where id = p_order;
  insert into order_status_history (order_id, status, from_status, actor_id) values (p_order, target, o.status, auth.uid());
end $$;

commit;
