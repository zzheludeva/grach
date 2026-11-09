-- Iteration 4: two mandatory buyer confirmations for orders (readiness, receipt), seller cancellation and
-- reminders, organizer adds participants manually, conversation context for messages.
-- Apply after 20261109_iteration3.sql. Same rules as src/lib/orders.ts and the store actions.
begin;

/* ───────────── 1. Orders: readiness request → buyer confirms or rejects → shipping → receipt ───────────── */

alter table orders add column if not exists ready_requested_at timestamptz;
alter table orders add column if not exists ready_confirmed_at timestamptz;
alter table orders add column if not exists ready_reminded_at timestamptz;
alter table orders add column if not exists ready_rejection_reason text;
alter table orders add column if not exists ready_rejected_at timestamptz;
alter table orders add column if not exists cancelled_by uuid references profiles(id);
alter table orders add column if not exists cancel_reason text;

-- Several photos per readiness request (bucket 'order-proofs', private). ready_photo_path stays = the first one.
create table if not exists order_ready_photos (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  history_id uuid references order_status_history(id) on delete cascade,
  photo_path text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);
alter table order_ready_photos enable row level security;
drop policy if exists "order sides read ready photos" on order_ready_photos;
create policy "order sides read ready photos" on order_ready_photos for select using (
  exists (select 1 from orders o where o.id = order_id and auth.uid() in (o.buyer_id, o.seller_id))
);
-- No insert/update/delete policies: rows are written only by order_transition().

-- History entries that are not status changes (readiness confirmed/rejected, reminder).
alter table order_status_history add column if not exists kind text check (kind in ('readyConfirmed', 'readyRejected', 'readyReminder'));

-- Orders already waiting in "ready": treat the latest ready step as a readiness request.
update orders o set
  ready_requested_at = coalesce((select h.created_at from order_status_history h where h.order_id = o.id and h.status = 'ready' and h.kind is null order by h.created_at desc limit 1), o.created_at),
  ready_confirmed_at = (select case when h.ack = 'confirmed' then h.created_at end from order_status_history h where h.order_id = o.id and h.status = 'ready' and h.kind is null order by h.created_at desc limit 1)
where o.status = 'ready' and o.ready_requested_at is null;
-- Buyer answers that were pending on other steps are no longer required.
update order_status_history set ack = null where ack = 'pending' and status <> 'ready';

-- History is append-only and written by the functions below only.
drop policy if exists "order sides read history" on order_status_history;
create policy "order sides read history" on order_status_history for select using (
  exists (select 1 from orders o where o.id = order_id and auth.uid() in (o.buyer_id, o.seller_id))
);

-- The guard also blocks direct writes to the confirmation columns.
create or replace function guard_order_status() returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('app.order_transition', true), '') <> 'on' and (
       new.status is distinct from old.status
    or new.ready_requested_at is distinct from old.ready_requested_at
    or new.ready_confirmed_at is distinct from old.ready_confirmed_at
    or new.ready_rejected_at is distinct from old.ready_rejected_at
    or new.cancelled_by is distinct from old.cancelled_by
    or new.shipment_number is distinct from old.shipment_number
    or new.shipment_url is distinct from old.shipment_url
  ) then
    raise exception 'order state changes must go through the order_* functions' using errcode = '42501';
  end if;
  return new;
end $$;

/**
 * Seller step. "ready" = readiness request with 1–4 photos; "handed_over" only after the buyer confirmed
 * readiness, with a tracking number (+ carrier) or an http(s) link. Other steps need no buyer answer.
 */
drop function if exists order_transition(uuid, order_status, text, text, text, text, text);
create or replace function order_transition(p_order uuid, p_to order_status, p_comment text default null, p_photo_paths text[] default null,
                                            p_carrier text default null, p_number text default null, p_url text default null)
returns void language plpgsql security definer set search_path = public as $$
declare o orders%rowtype; nxt order_status; hid uuid; n int := coalesce(array_length(p_photo_paths, 1), 0); i int;
begin
  select * into o from orders where id = p_order for update;
  if not found or o.seller_id <> auth.uid() then raise exception 'forbidden' using errcode = '42501'; end if;
  if o.status in ('cancelled', 'received', 'delivered') then raise exception 'closed'; end if;
  if p_to = 'handed_over' and o.status = 'ready' and o.ready_confirmed_at is null then raise exception 'readyNotConfirmed'; end if;
  nxt := case o.status when 'pending' then 'confirmed' when 'confirmed' then 'preparing' when 'preparing' then 'ready' when 'ready' then 'handed_over' end;
  if nxt is null or nxt <> p_to then raise exception 'notAllowed'; end if;
  if p_to = 'ready' then
    if n = 0 then raise exception 'photoRequired'; end if;
    if n > 4 then raise exception 'tooManyPhotos'; end if;
  end if;
  if p_to = 'handed_over' then
    if coalesce(trim(p_number), '') = '' and coalesce(trim(p_url), '') = '' then raise exception 'shipmentRequired'; end if;
    if coalesce(trim(p_number), '') <> '' and coalesce(trim(p_carrier), '') = '' then raise exception 'carrierRequired'; end if;
    if coalesce(trim(p_url), '') <> '' and p_url !~ '^https?://\S+\.\S+' then raise exception 'invalidUrl'; end if;
  end if;
  perform set_config('app.order_transition', 'on', true);
  update orders set status = p_to,
    ready_photo_path   = case when p_to = 'ready' then p_photo_paths[1] else ready_photo_path end,
    ready_requested_at = case when p_to = 'ready' then now() else ready_requested_at end,
    ready_confirmed_at = case when p_to = 'ready' then null else ready_confirmed_at end,
    ready_reminded_at  = case when p_to = 'ready' then null else ready_reminded_at end,
    ready_rejection_reason = case when p_to = 'ready' then null else ready_rejection_reason end,
    shipment_carrier = case when p_to = 'handed_over' then p_carrier else shipment_carrier end,
    shipment_number  = case when p_to = 'handed_over' then p_number else shipment_number end,
    shipment_url     = case when p_to = 'handed_over' then p_url else shipment_url end
  where id = p_order;
  insert into order_status_history (order_id, status, from_status, actor_id, comment, photo_path, carrier, tracking_number, tracking_url, ack)
  values (p_order, p_to, o.status, auth.uid(), p_comment, p_photo_paths[1], p_carrier, p_number, p_url, case when p_to = 'ready' then 'pending' end)
  returning id into hid;
  if p_to = 'ready' then
    for i in 1..n loop
      insert into order_ready_photos (order_id, history_id, photo_path, position) values (p_order, hid, p_photo_paths[i], i - 1);
      insert into messages (from_id, to_id, text, image_path, order_id) values (auth.uid(), o.buyer_id, case when i = 1 then coalesce(p_comment, '') else '' end, p_photo_paths[i], p_order);
    end loop;
  end if;
  insert into notifications (user_id, type, actor_id, message_key, params, href)
  values (o.buyer_id, 'order', auth.uid(),
          case p_to when 'ready' then 'orderReadyRequest' when 'handed_over' then 'orderShipped' else 'orderStep' end,
          jsonb_build_object('number', o.number, 'status', '@orderStatus.' || p_to), '/orders/' || p_order);
end $$;

/** Buyer answers the readiness request: confirm, or reject with a comment (→ back to "preparing"). */
drop function if exists order_ack(uuid, boolean, text);
create or replace function order_ready_answer(p_order uuid, p_accept boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare o orders%rowtype; h order_status_history%rowtype;
begin
  select * into o from orders where id = p_order for update;
  if not found or o.buyer_id <> auth.uid() then raise exception 'forbidden' using errcode = '42501'; end if;
  if o.status <> 'ready' or o.ready_confirmed_at is not null then raise exception 'nothingToConfirm'; end if;
  select * into h from order_status_history where order_id = p_order and status = 'ready' and kind is null order by created_at desc limit 1;
  perform set_config('app.order_transition', 'on', true);
  if p_accept then
    update order_status_history set ack = 'confirmed' where id = h.id;
    update orders set ready_confirmed_at = now() where id = p_order;
    insert into order_status_history (order_id, status, actor_id, kind) values (p_order, 'ready', auth.uid(), 'readyConfirmed');
    insert into notifications (user_id, type, actor_id, message_key, params, href)
    values (o.seller_id, 'order', auth.uid(), 'orderReadyConfirmed', jsonb_build_object('number', o.number), '/orders/' || p_order);
    return;
  end if;
  if length(coalesce(trim(p_reason), '')) < 3 then raise exception 'reasonRequired'; end if;
  update order_status_history set ack = 'rejected', reject_reason = p_reason where id = h.id;
  update orders set status = 'preparing', ready_photo_path = null, ready_requested_at = null, ready_reminded_at = null,
                    ready_rejection_reason = p_reason, ready_rejected_at = now()
  where id = p_order;
  insert into order_status_history (order_id, status, from_status, actor_id, comment, is_revert, kind)
  values (p_order, 'preparing', 'ready', auth.uid(), p_reason, true, 'readyRejected');
  insert into notifications (user_id, type, actor_id, message_key, params, href)
  values (o.seller_id, 'order', auth.uid(), 'orderReadyRejected', jsonb_build_object('number', o.number, 'reason', p_reason), '/orders/' || p_order);
end $$;

/** Seller reminds a buyer who hasn't answered the readiness request (at most once per 24 h). */
create or replace function order_ready_remind(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
declare o orders%rowtype;
begin
  select * into o from orders where id = p_order for update;
  if not found or o.seller_id <> auth.uid() then raise exception 'forbidden' using errcode = '42501'; end if;
  if o.status <> 'ready' or o.ready_confirmed_at is not null then raise exception 'nothingToConfirm'; end if;
  if coalesce(o.ready_reminded_at, o.ready_requested_at) > now() - interval '24 hours' then raise exception 'tooSoon'; end if;
  perform set_config('app.order_transition', 'on', true);
  update orders set ready_reminded_at = now() where id = p_order;
  insert into order_status_history (order_id, status, actor_id, kind) values (p_order, 'ready', auth.uid(), 'readyReminder');
  insert into notifications (user_id, type, actor_id, message_key, params, href)
  values (o.buyer_id, 'order', auth.uid(), 'orderReadyReminder', jsonb_build_object('number', o.number), '/orders/' || p_order);
end $$;

/**
 * Buyer: confirm receipt (only after shipping; never automatic) or cancel before production.
 * Seller: cancel before shipping, with a reason (e.g. no answer to the readiness request).
 */
drop function if exists order_buyer_action(uuid, text);
create or replace function order_action(p_order uuid, p_action text, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
declare o orders%rowtype; target order_status; notify_user uuid; k text;
begin
  select * into o from orders where id = p_order for update;
  if not found or auth.uid() not in (o.buyer_id, o.seller_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_action = 'received' and auth.uid() = o.buyer_id and o.status in ('handed_over', 'in_transit', 'arrived') then
    target := 'received'; notify_user := o.seller_id; k := 'orderReceived';
  elsif p_action = 'cancel' and auth.uid() = o.buyer_id and o.status in ('pending', 'confirmed') then
    target := 'cancelled'; notify_user := o.seller_id; k := 'orderCancelledByBuyer';
  elsif p_action = 'cancel' and auth.uid() = o.seller_id and o.status in ('pending', 'confirmed', 'preparing', 'ready') then
    if length(coalesce(trim(p_reason), '')) < 3 then raise exception 'reasonRequired'; end if;
    target := 'cancelled'; notify_user := o.buyer_id; k := 'orderCancelledBySeller';
  else
    raise exception 'notAllowed';
  end if;
  perform set_config('app.order_transition', 'on', true);
  update orders set status = target,
    cancelled_by = case when target = 'cancelled' then auth.uid() else cancelled_by end,
    cancel_reason = case when target = 'cancelled' then nullif(trim(p_reason), '') else cancel_reason end
  where id = p_order;
  insert into order_status_history (order_id, status, from_status, actor_id, comment) values (p_order, target, o.status, auth.uid(), nullif(trim(p_reason), ''));
  insert into notifications (user_id, type, actor_id, message_key, params, href)
  values (notify_user, 'order', auth.uid(), k, jsonb_build_object('number', o.number, 'reason', coalesce(p_reason, '')), '/orders/' || p_order);
end $$;

revoke all on function order_transition(uuid, order_status, text, text[], text, text, text) from public;
revoke all on function order_ready_answer(uuid, boolean, text) from public;
revoke all on function order_ready_remind(uuid) from public;
revoke all on function order_action(uuid, text, text) from public;
grant execute on function order_transition(uuid, order_status, text, text[], text, text, text) to authenticated;
grant execute on function order_ready_answer(uuid, boolean, text) to authenticated;
grant execute on function order_ready_remind(uuid) to authenticated;
grant execute on function order_action(uuid, text, text) to authenticated;

/* ───────────── 2. Organizer adds participants manually ───────────── */

alter table workshop_enrollments add column if not exists added_by uuid references profiles(id);

/** Only the host of the session; same checks as book_session(): upcoming, not cancelled, no double booking, seat limit. */
create or replace function host_add_participant(p_session uuid, p_user uuid, p_seats int default 1) returns void
language plpgsql security definer set search_path = public as $$
declare s workshop_sessions%rowtype; taken int; title text;
begin
  select * into s from workshop_sessions where id = p_session for update;
  if not found or s.host_id <> auth.uid() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_user = auth.uid() or not exists (select 1 from profiles where id = p_user) then raise exception 'forbidden'; end if;
  if s.status <> 'scheduled' or s.starts_at <= now() then raise exception 'closed'; end if;
  if exists (select 1 from workshops w where w.id = s.workshop_id and w.status = 'archived') then raise exception 'closed'; end if;
  if exists (select 1 from workshop_enrollments where session_id = p_session and user_id = p_user) then raise exception 'duplicate'; end if;
  select s.external_seats + coalesce(sum(seats), 0) into taken from workshop_enrollments where session_id = p_session;
  if p_seats < 1 or taken + p_seats > s.seats_total then raise exception 'full'; end if;
  insert into workshop_enrollments (user_id, workshop_id, session_id, seats, added_by) values (p_user, s.workshop_id, p_session, p_seats, auth.uid());
  select w.title into title from workshops w where w.id = s.workshop_id;
  insert into notifications (user_id, type, actor_id, message_key, params, href)
  values (p_user, 'workshop', auth.uid(), 'addedToSession', jsonb_build_object('title', title, 'startsAt', s.starts_at), '/learn/workshop/' || s.workshop_id || '?session=' || p_session);
end $$;
revoke all on function host_add_participant(uuid, uuid, int) from public;
grant execute on function host_add_participant(uuid, uuid, int) to authenticated;

/**
 * People search for the organizer: name, username or exact email. Emails are matched but never returned.
 * Hosts only (anyone hosting at least one session).
 */
create or replace function search_people_for_host(p_query text) returns table (id uuid, username text, name text, city text)
language sql stable security definer set search_path = public as $$
  select p.id, p.username, p.name, p.city from profiles p
  where exists (select 1 from workshop_sessions s where s.host_id = auth.uid())
    and length(trim(p_query)) >= 2 and p.id <> auth.uid()
    and (p.name ilike '%' || trim(p_query) || '%' or p.username ilike '%' || ltrim(trim(p_query), '@') || '%'
         or exists (select 1 from auth.users u where u.id = p.id and lower(u.email) = lower(trim(p_query))))
  order by p.name limit 8
$$;
revoke all on function search_people_for_host(text) from public;
grant execute on function search_people_for_host(text) to authenticated;

/* ───────────── 3. Conversation context and message notifications ───────────── */

alter table messages add column if not exists workshop_id uuid references workshops(id) on delete set null;
alter table messages add column if not exists session_id uuid references workshop_sessions(id) on delete set null;

-- A user may attach a workshop context only if they host it or are booked on it.
drop policy if exists "sender writes" on messages;
create policy "sender writes" on messages for insert with check (
  auth.uid() = from_id
  and (workshop_id is null or exists (
    select 1 from workshops w where w.id = workshop_id and (w.host_id = auth.uid() or w.host_id = to_id)
  ))
  and (order_id is null or exists (select 1 from orders o where o.id = order_id and auth.uid() in (o.buyer_id, o.seller_id) and to_id in (o.buyer_id, o.seller_id)))
);

-- One unread "new message" notification per conversation (updated, not duplicated).
create or replace function notify_new_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare who text; title text; uname text;
begin
  if new.order_id is not null and new.image_path is not null then return new; end if; -- readiness photos notify via orderReadyRequest
  select name, username into who, uname from profiles where id = new.from_id;
  if new.workshop_id is not null then select w.title into title from workshops w where w.id = new.workshop_id; end if;
  delete from notifications where user_id = new.to_id and actor_id = new.from_id and not read and message_key like 'newMessage%';
  insert into notifications (user_id, type, actor_id, message_key, params, href)
  values (new.to_id, 'system', new.from_id, case when title is null then 'newMessage' else 'newMessageWorkshop' end,
          jsonb_build_object('name', who, 'title', coalesce(title, '')), '/messages/' || uname);
  return new;
end $$;
drop trigger if exists messages_notify on messages;
create trigger messages_notify after insert on messages for each row execute function notify_new_message();

commit;
