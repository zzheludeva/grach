-- Remeslo — PostgreSQL schema for Supabase.
-- The MVP runs on an in-browser demo repository (src/lib/store.tsx) with the same shapes;
-- this schema is the target for connecting Supabase (Auth, Storage, Postgres).
-- Money is always numeric + ISO currency, never a formatted string.

create extension if not exists "pgcrypto";

-- ---------- reference / localized system content ----------
create table categories (
  id text primary key,                         -- 'ceramics', 'knitting', ...
  color text not null,
  sort_order int not null default 0
);

create table category_translations (
  category_id text references categories(id) on delete cascade,
  locale text not null,                         -- 'ru', 'en', 'pt-BR', 'es'
  name text not null,
  search_terms text[] not null default '{}',    -- synonyms / spellings for multilingual search
  primary key (category_id, locale)
);

create table system_content_translations (    -- static texts managed outside UI dictionaries
  key text not null,
  locale text not null,
  value text not null,
  primary key (key, locale)
);

create table countries (                       -- regional config; add a row to support a country
  code char(2) primary key,
  currency char(3) not null,
  format_locale text not null,                  -- e.g. 'ru-RU', 'pt-BR' (numbers/dates only)
  default_time_zone text not null,
  phone_mask text not null,
  address_schema jsonb not null                 -- ordered field list + validation patterns
);

create table delivery_methods (
  id text not null,
  country char(2) references countries(code),
  min_days int not null,
  max_days int not null,
  primary key (country, id)
);

create table delivery_method_prices (          -- demo prices per seller currency
  country char(2) not null,
  method_id text not null,
  currency char(3) not null,
  amount numeric(12,2) not null,
  primary key (country, method_id, currency),
  foreign key (country, method_id) references delivery_methods(country, id)
);

-- ---------- users & profiles ----------
create type author_status as enum ('hobbyist', 'independent', 'pro');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9._]{3,24}$'),
  name text not null,
  avatar_url text,
  avatar_color text not null default '#15484c',
  bio text not null default '' check (char_length(bio) <= 240),
  city text,
  country char(2),
  status author_status not null default 'hobbyist',
  skills text[] not null default '{}',
  links jsonb not null default '[]',            -- [{label, url}]
  goals text[] not null default '{}',
  content_lang text not null default 'en',      -- language the author writes in
  created_at timestamptz not null default now()
);

create table user_interests (
  user_id uuid references profiles(id) on delete cascade,
  category_id text references categories(id),
  primary key (user_id, category_id)
);

-- Language, country, currency and time zone are independent settings.
create table user_regional_settings (
  user_id uuid primary key references profiles(id) on delete cascade,
  ui_locale text not null,                      -- 'ru' | 'en' | 'pt-BR' | 'es'
  country char(2) not null references countries(code),
  time_zone text not null,
  display_currency char(3) not null,
  city text,
  updated_at timestamptz not null default now()
);

create table follows (
  follower_id uuid references profiles(id) on delete cascade,
  following_id uuid references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)          -- no self-follow; PK prevents duplicates
);

-- ---------- posts ----------
create type post_kind as enum ('finished', 'process', 'tools', 'video', 'tip', 'experiment');

create table posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  kind post_kind not null,
  title text not null check (char_length(title) between 3 and 90),
  body text not null,
  category_id text references categories(id),
  lang text not null,                           -- stored in the author's language
  video_url text,
  views int not null default 0,
  created_at timestamptz not null default now()
);
create index on posts (created_at desc);
create index on posts (category_id);

create table post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  storage_path text not null,                   -- Supabase Storage: bucket 'post-images'
  position int not null default 0
);

create table post_translations (               -- only created on explicit user action
  post_id uuid references posts(id) on delete cascade,
  locale text not null,
  title text not null,
  body text not null,
  primary key (post_id, locale)
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 600),
  created_at timestamptz not null default now()
);

create table likes (
  user_id uuid references profiles(id) on delete cascade,
  post_id uuid references posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table category_views (                  -- input for the recommendation engine
  user_id uuid references profiles(id) on delete cascade,
  category_id text references categories(id),
  weight int not null default 0,
  primary key (user_id, category_id)
);

-- ---------- learning ----------
create type level as enum ('beginner', 'intermediate', 'advanced');

create table tutorials (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  summary text not null,
  cover_path text not null,
  category_id text references categories(id),
  level level not null,
  duration_min int not null,
  price_amount numeric(12,2),                   -- null = free
  price_currency char(3),
  materials text[] not null default '{}',
  steps jsonb not null,                         -- [{title, text}]
  lang text not null,
  created_at timestamptz not null default now(),
  check ((price_amount is null) = (price_currency is null))
);

create table tutorial_reviews (
  tutorial_id uuid references tutorials(id) on delete cascade,
  author_id uuid references profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  text text not null,
  created_at timestamptz not null default now(),
  primary key (tutorial_id, author_id)
);

create table tutorial_purchases (
  user_id uuid references profiles(id) on delete cascade,
  tutorial_id uuid references tutorials(id) on delete cascade,
  amount numeric(12,2) not null,
  currency char(3) not null,
  created_at timestamptz not null default now(),
  primary key (user_id, tutorial_id)
);

create table workshops (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  cover_path text not null,
  category_id text references categories(id),
  starts_at timestamptz not null,
  duration_min int not null,
  time_zone text not null,
  format text not null check (format in ('online', 'offline')),
  country char(2),
  city text,
  venue text,
  price_amount numeric(12,2),
  price_currency char(3),
  seats_total int not null check (seats_total > 0),
  description text not null,
  program text[] not null default '{}',
  lang text not null
);
create index on workshops (starts_at);
create index on workshops (country, city);

create table workshop_enrollments (
  user_id uuid references profiles(id) on delete cascade,
  workshop_id uuid references workshops(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, workshop_id)
);

-- ---------- marketplace ----------
create type availability as enum ('in_stock', 'made_to_order', 'sold_out');

create table products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  price_amount numeric(12,2) not null check (price_amount >= 0),
  price_currency char(3) not null,
  category_id text references categories(id),
  summary text not null,
  description text not null,
  story text not null,
  materials text[] not null default '{}',
  dimensions text,
  availability availability not null,
  stock int not null default 0,
  make_days int,
  ships_from char(2) not null,
  lang text not null,
  views int not null default 0,
  created_at timestamptz not null default now()
);

create table product_ship_regions (
  product_id uuid references products(id) on delete cascade,
  country char(2) not null,
  primary key (product_id, country)
);

create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  storage_path text not null,                   -- bucket 'product-images'
  position int not null default 0
);

create table product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  author_id uuid references profiles(id) on delete cascade,
  order_id uuid,
  rating int not null check (rating between 1 and 5),
  text text not null,
  created_at timestamptz not null default now()
);

-- One table for every saved object type; saving ≠ adding to cart.
create type favorite_type as enum ('post', 'tutorial', 'product', 'workshop');
create table favorites (
  user_id uuid references profiles(id) on delete cascade,
  object_type favorite_type not null,
  object_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, object_type, object_id)
);

create table carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references profiles(id) on delete cascade,
  updated_at timestamptz not null default now()
);

create table cart_items (
  cart_id uuid references carts(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  qty int not null check (qty > 0),
  price_at_add_amount numeric(12,2) not null,   -- detects price changes
  price_at_add_currency char(3) not null,
  added_at timestamptz not null default now(),
  primary key (cart_id, product_id)
);

create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  country char(2) not null references countries(code),
  fields jsonb not null,                        -- validated against countries.address_schema
  recipient text not null,
  phone text not null,
  email text not null,
  created_at timestamptz not null default now()
);

-- ---------- orders ----------
create type order_status as enum (
  'pending', 'confirmed', 'preparing', 'handed_over', 'in_transit',
  'arrived', 'delivered', 'received', 'cancelled'
);

create table checkouts (                       -- one checkout → one order (shipment) per seller
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  number text unique not null,
  checkout_id uuid not null references checkouts(id),
  buyer_id uuid not null references profiles(id),
  seller_id uuid not null references profiles(id),
  delivery_country char(2) not null,
  delivery_method text not null,
  address_snapshot jsonb not null,
  currency char(3) not null,
  subtotal numeric(12,2) not null,
  shipping numeric(12,2) not null,
  total numeric(12,2) not null,
  status order_status not null default 'pending',
  tracking_number text,                         -- demo value in the MVP
  eta date,
  created_at timestamptz not null default now()
);
create index on orders (buyer_id, created_at desc);
create index on orders (seller_id, created_at desc);

create table order_items (
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id),
  title_snapshot text not null,
  image_snapshot text,
  qty int not null check (qty > 0),
  unit_price numeric(12,2) not null,
  primary key (order_id, product_id)
);

create table order_status_history (
  id bigserial primary key,
  order_id uuid not null references orders(id) on delete cascade,
  status order_status not null,
  created_at timestamptz not null default now()
);

-- ---------- messaging & notifications ----------
create table messages (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references profiles(id) on delete cascade,
  to_id uuid not null references profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now(),
  check (from_id <> to_id)
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,                           -- like | comment | follow | order | workshop | system
  actor_id uuid references profiles(id),
  message_key text not null,                    -- localized on the client (notifications.k.*)
  params jsonb not null default '{}',
  href text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index on notifications (user_id, read, created_at desc);

-- ---------- AI studio ----------
create table ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  scenario text not null,
  mode text not null check (mode in ('demo', 'live')),
  context_post_id uuid references posts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  text text not null,
  ideas jsonb,                                  -- idea cards suggested in this turn
  created_at timestamptz not null default now()
);

create table saved_ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  conversation_id uuid references ai_conversations(id) on delete set null,
  title text not null,
  text text not null,
  tags text[] not null default '{}',
  is_project boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- author analytics ----------
-- Computed from real records; materialize daily for large accounts.
create view author_income_monthly as
select o.seller_id as author_id, date_trunc('month', o.created_at) as month, o.currency,
       'products'::text as source, sum(o.subtotal) as amount
from orders o where o.status <> 'cancelled'
group by 1, 2, 3
union all
select w.host_id, date_trunc('month', e.created_at), w.price_currency, 'workshops', sum(w.price_amount)
from workshop_enrollments e join workshops w on w.id = e.workshop_id
where w.price_amount is not null group by 1, 2, 3
union all
select t.author_id, date_trunc('month', p.created_at), p.currency, 'tutorials', sum(p.amount)
from tutorial_purchases p join tutorials t on t.id = p.tutorial_id group by 1, 2, 3;

-- ---------- Row Level Security (essentials) ----------
alter table profiles enable row level security;
create policy "profiles are public" on profiles for select using (true);
create policy "own profile" on profiles for update using (auth.uid() = id);

alter table posts enable row level security;
create policy "posts are public" on posts for select using (true);
create policy "author writes posts" on posts for all using (auth.uid() = author_id) with check (auth.uid() = author_id);

alter table comments enable row level security;
create policy "comments are public" on comments for select using (true);
create policy "author writes comments" on comments for insert with check (auth.uid() = author_id);
create policy "author deletes comments" on comments for delete using (auth.uid() = author_id);

alter table likes enable row level security;
create policy "likes are public" on likes for select using (true);
create policy "own likes" on likes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table follows enable row level security;
create policy "follows are public" on follows for select using (true);
create policy "own follows" on follows for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);

alter table favorites enable row level security;
create policy "own favorites" on favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table user_regional_settings enable row level security;
create policy "own settings" on user_regional_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table carts enable row level security;
create policy "own cart" on carts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter table cart_items enable row level security;
create policy "own cart items" on cart_items for all
  using (exists (select 1 from carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from carts c where c.id = cart_id and c.user_id = auth.uid()));

alter table addresses enable row level security;
create policy "own addresses" on addresses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table orders enable row level security;
create policy "buyer or seller reads order" on orders for select using (auth.uid() in (buyer_id, seller_id));
-- Inserts/status changes go through a server function (checkout / seller actions), not direct client writes.

alter table messages enable row level security;
create policy "participants read messages" on messages for select using (auth.uid() in (from_id, to_id));
create policy "sender writes" on messages for insert with check (auth.uid() = from_id);

alter table notifications enable row level security;
create policy "own notifications" on notifications for all using (auth.uid() = user_id);

alter table ai_conversations enable row level security;
create policy "own conversations" on ai_conversations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter table ai_messages enable row level security;
create policy "own ai messages" on ai_messages for all
  using (exists (select 1 from ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()));
alter table saved_ideas enable row level security;
create policy "own ideas" on saved_ideas for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage buckets (create in the dashboard or via API): post-images, product-images, avatars, covers.
