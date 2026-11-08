-- GRACH · iteration 2: own events, seller products, projects, search filters.
-- Apply after supabase/schema.sql. Idempotent where practical.
-- Server-side access control lives here (RLS + security-definer functions);
-- the demo client mirrors the same rules in src/lib/store.tsx.

-- =====================================================================
-- Techniques (shared vocabulary for products, posts, tutorials, filters)
-- =====================================================================
create table if not exists techniques (
  id text primary key,
  categories text[] not null default '{}'
);
create table if not exists technique_translations (
  technique_id text references techniques(id) on delete cascade,
  locale text not null,
  name text not null,
  primary key (technique_id, locale)
);
alter table techniques enable row level security;
alter table technique_translations enable row level security;
drop policy if exists "techniques are public" on techniques;
create policy "techniques are public" on techniques for select using (true);
drop policy if exists "technique names are public" on technique_translations;
create policy "technique names are public" on technique_translations for select using (true);

alter table posts add column if not exists technique text;
alter table tutorials add column if not exists technique text;
alter table tutorials add column if not exists format text not null default 'steps' check (format in ('steps', 'video'));

-- =====================================================================
-- Workshops & events created by authors
-- =====================================================================
do $$ begin
  create type workshop_kind as enum ('workshop', 'event');
exception when duplicate_object then null; end $$;
do $$ begin
  create type workshop_status as enum ('draft', 'published', 'cancelled');   -- "completed" = published and ends_at < now()
exception when duplicate_object then null; end $$;

alter table workshops add column if not exists kind workshop_kind not null default 'workshop';
alter table workshops add column if not exists status workshop_status not null default 'published';
alter table workshops add column if not exists ends_at timestamptz;
update workshops set ends_at = starts_at + make_interval(mins => duration_min) where ends_at is null;
alter table workshops alter column ends_at set not null;
alter table workshops add column if not exists level text check (level in ('any', 'beginner', 'intermediate', 'advanced'));
alter table workshops add column if not exists materials text[] not null default '{}';
alter table workshops add column if not exists terms text;
alter table workshops add column if not exists created_at timestamptz not null default now();
alter table workshops add column if not exists updated_at timestamptz not null default now();
alter table workshops add column if not exists cancelled_at timestamptz;
alter table workshops add constraint workshops_time_order check (ends_at > starts_at) not valid;
create index if not exists workshops_status_starts on workshops (status, starts_at);

-- The joining link is private: only the host and enrolled participants can read it.
create table if not exists workshop_private (
  workshop_id uuid primary key references workshops(id) on delete cascade,
  online_url text check (online_url is null or online_url ~ '^https://')
);

alter table workshops enable row level security;
drop policy if exists "public events" on workshops;
create policy "public events" on workshops for select
  using (status in ('published', 'cancelled') or host_id = auth.uid());
drop policy if exists "host creates" on workshops;
create policy "host creates" on workshops for insert with check (host_id = auth.uid());
drop policy if exists "host edits" on workshops;
create policy "host edits" on workshops for update
  using (host_id = auth.uid() and status <> 'cancelled')       -- cancelled events are read-only
  with check (host_id = auth.uid());
drop policy if exists "host deletes drafts" on workshops;
create policy "host deletes drafts" on workshops for delete using (host_id = auth.uid() and status = 'draft');

alter table workshop_private enable row level security;
drop policy if exists "host or participant reads link" on workshop_private;
create policy "host or participant reads link" on workshop_private for select using (
  exists (select 1 from workshops w where w.id = workshop_id and w.host_id = auth.uid())
  or exists (select 1 from workshop_enrollments e where e.workshop_id = workshop_private.workshop_id and e.user_id = auth.uid())
);
drop policy if exists "host writes link" on workshop_private;
create policy "host writes link" on workshop_private for all
  using (exists (select 1 from workshops w where w.id = workshop_id and w.host_id = auth.uid()))
  with check (exists (select 1 from workshops w where w.id = workshop_id and w.host_id = auth.uid()));

alter table workshop_enrollments enable row level security;
drop policy if exists "own or hosted enrollments" on workshop_enrollments;
create policy "own or hosted enrollments" on workshop_enrollments for select using (
  user_id = auth.uid() or exists (select 1 from workshops w where w.id = workshop_id and w.host_id = auth.uid())
);
drop policy if exists "enroll in published" on workshop_enrollments;
create policy "enroll in published" on workshop_enrollments for insert with check (
  user_id = auth.uid()
  and exists (select 1 from workshops w where w.id = workshop_id and w.status = 'published' and w.starts_at > now())
);
drop policy if exists "leave own" on workshop_enrollments;
create policy "leave own" on workshop_enrollments for delete using (user_id = auth.uid());

-- ---------- notifications about significant event changes ----------
alter table notifications add column if not exists changes jsonb;   -- [{field, from, to}] raw values, formatted per reader

-- People to notify: enrolled ∪ saved, without the host. A person in both sets appears once.
create or replace function event_audience(p_workshop uuid)
returns table (user_id uuid) language sql stable security definer set search_path = public as $$
  select distinct u.user_id from (
    select e.user_id from workshop_enrollments e where e.workshop_id = p_workshop
    union
    select f.user_id from favorites f where f.object_type = 'workshop' and f.object_id = p_workshop
  ) u
  join workshops w on w.id = p_workshop
  where u.user_id <> w.host_id;
$$;

-- Shown to the host BEFORE saving a significant change. Only the host may ask.
create or replace function event_audience_count(p_workshop uuid)
returns int language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from workshops where id = p_workshop and host_id = auth.uid()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return (select count(*) from event_audience(p_workshop));
end $$;

-- Detects significant changes on published events and notifies the audience once per person.
create or replace function notify_event_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  ch jsonb := '[]'::jsonb;
  key text;
begin
  if old.status <> 'published' then return new; end if;

  if new.status = 'cancelled' then
    insert into notifications (user_id, type, actor_id, message_key, params, href)
    select a.user_id, 'workshop', new.host_id, 'eventCancelled', jsonb_build_object('title', new.title), '/learn/workshop/' || new.id
    from event_audience(new.id) a;
    return new;
  end if;

  if new.starts_at is distinct from old.starts_at then ch := ch || jsonb_build_object('field', 'startsAt', 'from', old.starts_at, 'to', new.starts_at); end if;
  if new.ends_at is distinct from old.ends_at then ch := ch || jsonb_build_object('field', 'endsAt', 'from', old.ends_at, 'to', new.ends_at); end if;
  if new.time_zone is distinct from old.time_zone then ch := ch || jsonb_build_object('field', 'timeZone', 'from', old.time_zone, 'to', new.time_zone); end if;
  if new.format is distinct from old.format then ch := ch || jsonb_build_object('field', 'format', 'from', old.format, 'to', new.format); end if;
  if (new.country, new.city, new.venue) is distinct from (old.country, old.city, old.venue) then
    ch := ch || jsonb_build_object('field', 'place',
      'from', concat_ws('|', old.country, old.city, old.venue), 'to', concat_ws('|', new.country, new.city, new.venue));
  end if;
  if (new.price_amount, new.price_currency) is distinct from (old.price_amount, old.price_currency) then
    ch := ch || jsonb_build_object('field', 'price',
      'from', coalesce(old.price_amount::text || '|' || old.price_currency, ''), 'to', coalesce(new.price_amount::text || '|' || new.price_currency, ''));
  end if;
  if new.program is distinct from old.program then ch := ch || jsonb_build_object('field', 'program', 'from', array_to_string(old.program, E'\n'), 'to', array_to_string(new.program, E'\n')); end if;
  if coalesce(new.terms, '') is distinct from coalesce(old.terms, '') then ch := ch || jsonb_build_object('field', 'terms', 'from', coalesce(old.terms, ''), 'to', coalesce(new.terms, '')); end if;
  -- Title, description, cover, seats, materials: minor edits → no notification.

  if jsonb_array_length(ch) > 0 then
    insert into notifications (user_id, type, actor_id, message_key, params, href, changes)
    select a.user_id, 'workshop', new.host_id, 'eventChanged', jsonb_build_object('title', new.title), '/learn/workshop/' || new.id, ch
    from event_audience(new.id) a;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists workshops_notify_change on workshops;
create trigger workshops_notify_change before update on workshops
  for each row execute function notify_event_change();

-- Link changes live in workshop_private: notify without exposing the link itself.
create or replace function notify_event_link_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare w workshops%rowtype;
begin
  select * into w from workshops where id = new.workshop_id;
  if w.status = 'published' and new.online_url is distinct from old.online_url then
    insert into notifications (user_id, type, actor_id, message_key, params, href, changes)
    select a.user_id, 'workshop', w.host_id, 'eventChanged', jsonb_build_object('title', w.title), '/learn/workshop/' || w.id,
           jsonb_build_array(jsonb_build_object('field', 'onlineUrl', 'from', '', 'to', ''))
    from event_audience(w.id) a;
  end if;
  return new;
end $$;
drop trigger if exists workshop_private_notify on workshop_private;
create trigger workshop_private_notify after update on workshop_private
  for each row execute function notify_event_link_change();

-- =====================================================================
-- Seller products
-- =====================================================================
do $$ begin
  create type product_status as enum ('draft', 'published', 'hidden');
exception when duplicate_object then null; end $$;
do $$ begin
  create type sale_type as enum ('ready', 'to_order', 'personalized');
exception when duplicate_object then null; end $$;
do $$ begin
  create type shipping_mode as enum ('region', 'fixed', 'free');
exception when duplicate_object then null; end $$;

alter table products add column if not exists status product_status not null default 'published';
alter table products add column if not exists sale_type sale_type not null default 'ready';
alter table products add column if not exists technique text references techniques(id) on delete set null;
alter table products add column if not exists specs jsonb not null default '[]';            -- [{label, value}]
alter table products add column if not exists shipping_mode shipping_mode not null default 'region';
alter table products add column if not exists shipping_cost numeric(12,2) check (shipping_cost is null or shipping_cost >= 0);
alter table products add column if not exists shipping_terms text;
alter table products add column if not exists updated_at timestamptz not null default now();
alter table products alter column story set default '';
create index if not exists products_status_created on products (status, created_at desc);

alter table products enable row level security;
drop policy if exists "published products are public" on products;
create policy "published products are public" on products for select using (status = 'published' or seller_id = auth.uid());
drop policy if exists "seller writes products" on products;
create policy "seller writes products" on products for all using (seller_id = auth.uid()) with check (seller_id = auth.uid());

alter table product_images enable row level security;
drop policy if exists "images follow product" on product_images;
create policy "images follow product" on product_images for select
  using (exists (select 1 from products p where p.id = product_id and (p.status = 'published' or p.seller_id = auth.uid())));
drop policy if exists "seller writes images" on product_images;
create policy "seller writes images" on product_images for all
  using (exists (select 1 from products p where p.id = product_id and p.seller_id = auth.uid()))
  with check (exists (select 1 from products p where p.id = product_id and p.seller_id = auth.uid()));

alter table product_ship_regions enable row level security;
drop policy if exists "regions follow product" on product_ship_regions;
create policy "regions follow product" on product_ship_regions for select
  using (exists (select 1 from products p where p.id = product_id and (p.status = 'published' or p.seller_id = auth.uid())));
drop policy if exists "seller writes regions" on product_ship_regions;
create policy "seller writes regions" on product_ship_regions for all
  using (exists (select 1 from products p where p.id = product_id and p.seller_id = auth.uid()))
  with check (exists (select 1 from products p where p.id = product_id and p.seller_id = auth.uid()));

-- Only published products can be put in a cart (and never your own).
drop policy if exists "own cart items" on cart_items;
create policy "own cart items" on cart_items for all
  using (exists (select 1 from carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (
    exists (select 1 from carts c where c.id = cart_id and c.user_id = auth.uid())
    and exists (select 1 from products p where p.id = product_id and p.status = 'published' and p.seller_id <> auth.uid())
  );

-- Views are counted by a function so sellers can't inflate their own numbers.
create or replace function register_product_view(p_product uuid) returns void
language sql security definer set search_path = public as $$
  update products set views = views + 1
  where id = p_product and status = 'published' and seller_id <> auth.uid();
$$;

-- =====================================================================
-- Projects (private personal space)
-- =====================================================================
do $$ begin
  create type project_status as enum ('idea', 'planning', 'in_progress', 'paused', 'done');
exception when duplicate_object then null; end $$;

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  idea text not null default '',
  cover_path text,
  category_id text references categories(id),
  technique text,                                   -- technique id or free text
  materials text[] not null default '{}',
  tools text[] not null default '{}',
  status project_status not null default 'idea',
  conversation_id uuid references ai_conversations(id) on delete set null,
  published_post_id uuid references posts(id) on delete set null,
  product_id uuid references products(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists projects_user_updated on projects (user_id, updated_at desc);

create table if not exists project_items (               -- plan steps, checklist stages, notes, AI recommendations
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  kind text not null check (kind in ('plan', 'checklist', 'note', 'recommendation')),
  text text not null,
  done boolean,
  position int not null default 0,
  conversation_id uuid references ai_conversations(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists project_items_project on project_items (project_id, kind, position);

create table if not exists project_photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  storage_path text not null,                        -- bucket 'project-photos' (private)
  is_final boolean not null default false,
  created_at timestamptz not null default now()
);

alter table projects enable row level security;
drop policy if exists "own projects" on projects;
create policy "own projects" on projects for all using (user_id = auth.uid()) with check (user_id = auth.uid());
alter table project_items enable row level security;
drop policy if exists "own project items" on project_items;
create policy "own project items" on project_items for all
  using (exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid()))
  with check (exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid()));
alter table project_photos enable row level security;
drop policy if exists "own project photos" on project_photos;
create policy "own project photos" on project_photos for all
  using (exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid()))
  with check (exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid()));

alter table ai_conversations add column if not exists project_id uuid references projects(id) on delete set null;
alter table saved_ideas add column if not exists project_id uuid references projects(id) on delete set null;

-- =====================================================================
-- Search (multilingual content → 'simple' config, no stemming bias)
-- =====================================================================
alter table posts add column if not exists search tsvector
  generated always as (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(body, ''))) stored;
create index if not exists posts_search on posts using gin (search);
alter table products add column if not exists search tsvector
  generated always as (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(description, '') || ' ' || array_to_string(materials, ' '))) stored;
create index if not exists products_search on products using gin (search);
alter table workshops add column if not exists search tsvector
  generated always as (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(city, ''))) stored;
create index if not exists workshops_search on workshops using gin (search);
alter table tutorials add column if not exists search tsvector
  generated always as (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(summary, ''))) stored;
create index if not exists tutorials_search on tutorials using gin (search);
create index if not exists products_filters on products (category_id, technique, price_currency, price_amount) where status = 'published';
create index if not exists workshops_filters on workshops (kind, format, country, city, starts_at) where status = 'published';
-- Projects are searched only through the "own projects" RLS policy, so other people's projects never appear.
