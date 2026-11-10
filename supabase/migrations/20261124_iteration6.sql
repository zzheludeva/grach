-- Iteration 6: collections in Favorites, visibility (public / private / link) for tutorials and collections,
-- cache for machine translations. Apply after 20261117_iteration5.sql.
-- Same rules as src/lib/access.ts. Access is enforced here (RLS + security-definer functions), not by hiding UI.
begin;

create extension if not exists pgcrypto;  -- gen_random_bytes for share tokens

create type visibility as enum ('public', 'private', 'link');

/* ───────────── 1. Tutorials: visibility + share token ───────────── */

alter table tutorials add column if not exists visibility visibility not null default 'public';   -- existing materials stay public
-- URL-safe random token (128 bits) for share links.
alter table tutorials add column if not exists share_token text not null default replace(replace(rtrim(encode(gen_random_bytes(16), 'base64'), '='), '+', '-'), '/', '_');

-- Access granted by opening a valid share link; valid only while the token is unchanged.
create table if not exists link_grants (
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('tutorial', 'collection')),
  object_id uuid not null,
  token text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, kind, object_id)
);
alter table link_grants enable row level security;
drop policy if exists "own grants" on link_grants;
create policy "own grants" on link_grants for select using (user_id = auth.uid());
-- No insert policy: grants are created only by redeem_link() after the token is checked.

-- Readers: the author; everyone for published + public; for link — only people holding a valid grant.
-- Private materials are invisible to others even by id (direct URL or API).
drop policy if exists "published tutorials are public" on tutorials;
create policy "tutorials by visibility" on tutorials for select using (
  author_id = auth.uid()
  or (status = 'published' and visibility = 'public')
  or (status = 'published' and visibility = 'link' and exists (
        select 1 from link_grants g where g.user_id = auth.uid() and g.kind = 'tutorial' and g.object_id = tutorials.id and g.token = tutorials.share_token))
);
-- Steps/images follow the tutorial's own visibility.
drop policy if exists "images follow tutorial" on tutorial_images;
create policy "images follow tutorial" on tutorial_images for select using (exists (select 1 from tutorials t where t.id = tutorial_id));

-- Catalogue and search read only this view: link-only and private materials are never listed or indexed.
create or replace view tutorials_listed as
  select * from tutorials where status = 'published' and visibility = 'public';

/* ───────────── 2. Collections ───────────── */

create table if not exists collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 80),
  description text check (description is null or length(description) <= 300),
  visibility visibility not null default 'private',
  share_token text not null default replace(replace(rtrim(encode(gen_random_bytes(16), 'base64'), '='), '+', '-'), '/', '_'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists collections_owner on collections (owner_id, updated_at desc);

-- Items are references to the original objects (never copies); one object can be in many collections.
create table if not exists collection_items (
  collection_id uuid not null references collections(id) on delete cascade,
  object_type favorite_type not null,
  object_id uuid not null,
  position int not null default 0,
  added_at timestamptz not null default now(),
  primary key (collection_id, object_type, object_id)
);

alter table collections enable row level security;
alter table collection_items enable row level security;

drop policy if exists "collections by visibility" on collections;
create policy "collections by visibility" on collections for select using (
  owner_id = auth.uid()
  or visibility = 'public'
  or (visibility = 'link' and exists (
        select 1 from link_grants g where g.user_id = auth.uid() and g.kind = 'collection' and g.object_id = collections.id and g.token = collections.share_token))
);
drop policy if exists "owner writes collections" on collections;
create policy "owner writes collections" on collections for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Items are readable exactly when their collection is. The referenced objects keep their own RLS:
-- a private tutorial inside a public collection still returns no row to others.
drop policy if exists "items follow collection" on collection_items;
create policy "items follow collection" on collection_items for select using (exists (select 1 from collections c where c.id = collection_id));
drop policy if exists "owner writes items" on collection_items;
create policy "owner writes items" on collection_items for all
  using (exists (select 1 from collections c where c.id = collection_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from collections c where c.id = collection_id and c.owner_id = auth.uid()));

-- Adding to a collection also saves the object to Favorites (one shared favorites list).
create or replace function collection_item_to_favorites() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into favorites (user_id, object_type, object_id)
  select c.owner_id, new.object_type, new.object_id from collections c where c.id = new.collection_id
  on conflict do nothing;
  update collections set updated_at = now() where id = new.collection_id;
  return new;
end $$;
drop trigger if exists collection_items_fav on collection_items;
create trigger collection_items_fav after insert on collection_items for each row execute function collection_item_to_favorites();

-- Profiles and any public listing read only this view: link-only and private collections never appear.
create or replace view collections_public as
  select * from collections where visibility = 'public';

/* ───────────── 3. Share links ───────────── */

/** Opening a share link: checks the token and remembers access for this person. Returns false for a wrong token. */
create or replace function redeem_link(p_kind text, p_id uuid, p_token text) returns boolean
language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  if auth.uid() is null then return false; end if;
  if p_kind = 'tutorial' then
    select true into ok from tutorials where id = p_id and status = 'published' and visibility = 'link' and share_token = p_token;
  elsif p_kind = 'collection' then
    select true into ok from collections where id = p_id and visibility = 'link' and share_token = p_token;
  end if;
  if not coalesce(ok, false) then return false; end if;
  insert into link_grants (user_id, kind, object_id, token) values (auth.uid(), p_kind, p_id, p_token)
  on conflict (user_id, kind, object_id) do update set token = excluded.token, created_at = now();
  return true;
end $$;
revoke all on function redeem_link(text, uuid, text) from public;
grant execute on function redeem_link(text, uuid, text) to authenticated;

/** New secret link: old links and access granted through them stop working (grants carry the old token). */
create or replace function regenerate_share_link(p_kind text, p_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare tok text := replace(replace(rtrim(encode(gen_random_bytes(16), 'base64'), '='), '+', '-'), '/', '_');
begin
  if p_kind = 'tutorial' then
    update tutorials set share_token = tok where id = p_id and author_id = auth.uid();
  elsif p_kind = 'collection' then
    update collections set share_token = tok where id = p_id and owner_id = auth.uid();
  end if;
  if not found then raise exception 'forbidden' using errcode = '42501'; end if;
  return tok;
end $$;
revoke all on function regenerate_share_link(text, uuid) from public;
grant execute on function regenerate_share_link(text, uuid) to authenticated;

-- share_token is readable only by the owner: others get it only from the link itself.
revoke select (share_token) on tutorials from anon, authenticated;
revoke select (share_token) on collections from anon, authenticated;
create or replace function my_share_token(p_kind text, p_id uuid) returns text
language sql stable security definer set search_path = public as $$
  select case p_kind
    when 'tutorial' then (select share_token from tutorials where id = p_id and author_id = auth.uid())
    when 'collection' then (select share_token from collections where id = p_id and owner_id = auth.uid())
  end
$$;
grant execute on function my_share_token(text, uuid) to authenticated;

/* ───────────── 4. Machine translation cache ───────────── */

-- Cache shared by all users: (target language, sha256 of the exact source text). An edited source text has a
-- different hash, so an outdated translation is never served. Written only by the server (service role).
create table if not exists translations_cache (
  target text not null,
  source_hash text not null,
  source_lang text,
  translation text not null,
  created_at timestamptz not null default now(),
  primary key (target, source_hash)
);
alter table translations_cache enable row level security;  -- no policies: only the service role reads/writes

commit;
