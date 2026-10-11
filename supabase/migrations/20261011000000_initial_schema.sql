-- Rabbit Hole: private-first collections, reusable items, and explicit sharing.
-- The application must authenticate users before writing to these tables.
begin;

create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to anon, authenticated;

create type public.collection_visibility as enum ('private', 'unlisted', 'public');
create type public.item_kind as enum ('note', 'link', 'photo', 'video', 'person', 'place', 'event');
create type public.membership_role as enum ('contributor', 'viewer');
create type public.membership_status as enum ('invited', 'requested', 'accepted');
create type public.share_link_kind as enum ('view', 'join');
create type public.feedback_kind as enum ('not_relevant', 'dislike', 'hide_entity');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 80),
  avatar_url text,
  bio text check (length(bio) <= 1000),
  created_at timestamptz not null default now()
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  cover_url text,
  visibility public.collection_visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index collections_owner_idx on public.collections(owner_id);
create index collections_public_idx on public.collections(created_at desc) where visibility = 'public';

create table public.items (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  kind public.item_kind not null,
  title text not null check (length(trim(title)) between 1 and 240),
  summary text check (length(summary) <= 4000),
  content text,
  source_url text,
  cover_url text,
  location_name text,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  starts_at timestamptz,
  ends_at timestamptz,
  event_timezone text,
  update_source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((latitude is null) = (longitude is null)),
  check (ends_at is null or (starts_at is not null and ends_at >= starts_at))
);
create index items_creator_idx on public.items(created_by);

create table public.collection_memberships (
  collection_id uuid not null references public.collections(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.membership_role not null default 'contributor',
  status public.membership_status not null,
  created_at timestamptz not null default now(),
  primary key (collection_id, user_id)
);
create index collection_memberships_user_idx on public.collection_memberships(user_id, status);

create table public.collection_items (
  collection_id uuid not null references public.collections(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  contributed_by uuid not null references public.profiles(id) on delete cascade,
  -- A consciously published review belongs to this contribution, not a private note.
  published_review text check (length(published_review) <= 10000),
  added_at timestamptz not null default now(),
  primary key (collection_id, item_id)
);
create index collection_items_item_idx on public.collection_items(item_id);
create index collection_items_grid_idx on public.collection_items(collection_id, added_at desc);

create table public.private_item_notes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  body text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table public.collection_share_links (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  kind public.share_link_kind not null,
  -- Store a one-way digest. The original token is returned only when a link is created.
  token_hash text not null unique,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index collection_share_links_collection_idx on public.collection_share_links(collection_id);

create table public.collection_link_access (
  link_id uuid not null references public.collection_share_links(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (link_id, user_id)
);

create table public.collection_item_attributions (
  collection_id uuid not null,
  item_id uuid not null,
  source_collection_id uuid not null references public.collections(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (collection_id, item_id),
  foreign key (collection_id, item_id) references public.collection_items(collection_id, item_id) on delete cascade,
  check (source_collection_id <> collection_id)
);

create table public.collection_feedback (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid references public.items(id) on delete cascade,
  entity_key text,
  kind public.feedback_kind not null,
  created_at timestamptz not null default now(),
  check (
    (kind = 'hide_entity' and item_id is null and entity_key is not null and length(trim(entity_key)) > 0)
    or (kind in ('not_relevant', 'dislike') and item_id is not null and entity_key is null)
  )
);
create unique index collection_feedback_item_idx on public.collection_feedback(user_id, collection_id, item_id) where item_id is not null;
create unique index collection_feedback_entity_idx on public.collection_feedback(user_id, collection_id, entity_key) where entity_key is not null;

-- These narrow helpers avoid policy recursion. They return only permission booleans.
create function app_private.owns_collection(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.collections c where c.id = target and c.owner_id = (select auth.uid()));
$$;

create function app_private.can_read_collection(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.collections c where c.id = target and (
      c.visibility = 'public' or c.owner_id = (select auth.uid())
      or exists (select 1 from public.collection_memberships m
        where m.collection_id = c.id and m.user_id = (select auth.uid()) and m.status = 'accepted')
      or (c.visibility = 'unlisted' and exists (
        select 1 from public.collection_link_access a join public.collection_share_links l on l.id = a.link_id
        where a.user_id = (select auth.uid()) and l.collection_id = c.id and l.kind = 'view'
          and l.revoked_at is null and (l.expires_at is null or l.expires_at > now())
      ))
    )
  );
$$;

create function app_private.can_contribute(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select app_private.owns_collection(target) or exists (
    select 1 from public.collection_memberships m where m.collection_id = target
      and m.user_id = (select auth.uid()) and m.status = 'accepted' and m.role = 'contributor'
  );
$$;

create function app_private.can_read_item(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.items i where i.id = target and i.created_by = (select auth.uid()))
    or exists (select 1 from public.collection_items ci
      where ci.item_id = target and app_private.can_read_collection(ci.collection_id));
$$;

create function app_private.can_read_attribution(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  -- A private source suppresses credit, including for its owner.
  select exists (select 1 from public.collections c
    where c.id = target and c.visibility <> 'private' and app_private.can_read_collection(c.id));
$$;

create function app_private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger collections_updated_at before update on public.collections
for each row execute function app_private.touch_updated_at();
create trigger items_updated_at before update on public.items
for each row execute function app_private.touch_updated_at();
create trigger private_notes_updated_at before update on public.private_item_notes
for each row execute function app_private.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.collections enable row level security;
alter table public.items enable row level security;
alter table public.collection_memberships enable row level security;
alter table public.collection_items enable row level security;
alter table public.private_item_notes enable row level security;
alter table public.collection_share_links enable row level security;
alter table public.collection_link_access enable row level security;
alter table public.collection_item_attributions enable row level security;
alter table public.collection_feedback enable row level security;

-- Profiles contain public identity fields only. Emails stay in auth.users.
create policy profiles_read on public.profiles for select using (true);
create policy profiles_insert on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy collections_read on public.collections for select using (app_private.can_read_collection(id));
create policy collections_insert on public.collections for insert to authenticated with check (owner_id = (select auth.uid()));
create policy collections_update on public.collections for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy collections_delete on public.collections for delete to authenticated using (owner_id = (select auth.uid()));

create policy items_read on public.items for select using (app_private.can_read_item(id));
create policy items_insert on public.items for insert to authenticated with check (created_by = (select auth.uid()));
create policy items_update on public.items for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));
create policy items_delete on public.items for delete to authenticated using (created_by = (select auth.uid()));

create policy memberships_read on public.collection_memberships for select to authenticated
using (user_id = (select auth.uid()) or app_private.owns_collection(collection_id));
create policy memberships_owner_insert on public.collection_memberships for insert to authenticated
with check (app_private.owns_collection(collection_id) and status = 'invited');
create policy memberships_owner_update on public.collection_memberships for update to authenticated
using (app_private.owns_collection(collection_id)) with check (app_private.owns_collection(collection_id));
create policy memberships_delete on public.collection_memberships for delete to authenticated
using (user_id = (select auth.uid()) or app_private.owns_collection(collection_id));

create policy contributions_read on public.collection_items for select using (app_private.can_read_collection(collection_id));
create policy contributions_insert on public.collection_items for insert to authenticated
with check (contributed_by = (select auth.uid()) and app_private.can_contribute(collection_id) and app_private.can_read_item(item_id));
create policy contributions_update on public.collection_items for update to authenticated
using (app_private.owns_collection(collection_id) or (contributed_by = (select auth.uid()) and app_private.can_contribute(collection_id)))
with check (app_private.can_read_item(item_id) and (app_private.owns_collection(collection_id) or (contributed_by = (select auth.uid()) and app_private.can_contribute(collection_id))));
create policy contributions_delete on public.collection_items for delete to authenticated
using (app_private.owns_collection(collection_id) or (contributed_by = (select auth.uid()) and app_private.can_contribute(collection_id)));

create policy notes_read on public.private_item_notes for select to authenticated using (user_id = (select auth.uid()));
create policy notes_insert on public.private_item_notes for insert to authenticated with check (user_id = (select auth.uid()) and app_private.can_read_item(item_id));
create policy notes_update on public.private_item_notes for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and app_private.can_read_item(item_id));
create policy notes_delete on public.private_item_notes for delete to authenticated using (user_id = (select auth.uid()));

create policy share_links_owner_read on public.collection_share_links for select to authenticated using (app_private.owns_collection(collection_id));
create policy link_access_read on public.collection_link_access for select to authenticated using (user_id = (select auth.uid()));
create policy link_access_delete on public.collection_link_access for delete to authenticated using (user_id = (select auth.uid()));

create policy attributions_read on public.collection_item_attributions for select
using (app_private.can_read_collection(collection_id) and app_private.can_read_attribution(source_collection_id));
create policy attributions_insert on public.collection_item_attributions for insert to authenticated with check (
  app_private.can_read_attribution(source_collection_id)
  and exists (select 1 from public.collection_items ci where ci.collection_id = collection_item_attributions.collection_id
    and ci.item_id = collection_item_attributions.item_id and ci.contributed_by = (select auth.uid()))
  and exists (select 1 from public.collection_items ci where ci.collection_id = source_collection_id and ci.item_id = collection_item_attributions.item_id)
);
create policy attributions_delete on public.collection_item_attributions for delete to authenticated using (
  app_private.owns_collection(collection_id) or exists (select 1 from public.collection_items ci
    where ci.collection_id = collection_item_attributions.collection_id and ci.item_id = collection_item_attributions.item_id
      and ci.contributed_by = (select auth.uid()) and app_private.can_contribute(ci.collection_id))
);

create policy feedback_read on public.collection_feedback for select to authenticated using (user_id = (select auth.uid()));
create policy feedback_insert on public.collection_feedback for insert to authenticated with check (user_id = (select auth.uid()) and app_private.can_read_collection(collection_id));
create policy feedback_update on public.collection_feedback for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and app_private.can_read_collection(collection_id));
create policy feedback_delete on public.collection_feedback for delete to authenticated using (user_id = (select auth.uid()));

create function app_private.hash_share_token(token text)
returns text language sql immutable set search_path = '' as $$
  select encode(sha256(convert_to(token, 'UTF8')), 'hex');
$$;

-- A normal save creates the item and all collection memberships atomically.
create function public.create_saved_item(target_collections uuid[], item_data jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_item uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to save an item' using errcode = '42501'; end if;
  if target_collections is null or cardinality(target_collections) = 0 then
    raise exception 'Select at least one collection';
  end if;
  if exists (select 1 from unnest(target_collections) target where target is null or not app_private.can_contribute(target)) then
    raise exception 'You cannot contribute to one of these collections' using errcode = '42501';
  end if;
  insert into public.items(created_by, kind, title, summary, content, source_url, cover_url,
    location_name, latitude, longitude, starts_at, ends_at, event_timezone, update_source_url)
  values (auth.uid(), (item_data->>'kind')::public.item_kind, item_data->>'title', item_data->>'summary',
    item_data->>'content', item_data->>'source_url', item_data->>'cover_url', item_data->>'location_name',
    (item_data->>'latitude')::double precision, (item_data->>'longitude')::double precision,
    (item_data->>'starts_at')::timestamptz, (item_data->>'ends_at')::timestamptz,
    item_data->>'event_timezone', item_data->>'update_source_url') returning id into new_item;
  insert into public.collection_items(collection_id, item_id, contributed_by)
    select distinct target, new_item, auth.uid() from unnest(target_collections) target;
  return new_item;
end;
$$;

create function public.save_existing_item(target_collection uuid, target_item uuid, source_collection uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not app_private.can_contribute(target_collection) or not app_private.can_read_item(target_item) then
    raise exception 'You cannot save this item into that collection' using errcode = '42501';
  end if;
  if source_collection is not null and (
    source_collection = target_collection or not app_private.can_read_attribution(source_collection)
    or not exists (select 1 from public.collection_items where collection_id = source_collection and item_id = target_item)
  ) then raise exception 'This source cannot be credited' using errcode = '42501'; end if;
  insert into public.collection_items(collection_id, item_id, contributed_by)
    values (target_collection, target_item, auth.uid()) on conflict do nothing;
  -- Saving an existing contribution never changes its contributor or attribution.
  if found and source_collection is not null then
    insert into public.collection_item_attributions(collection_id, item_id, source_collection_id)
      values (target_collection, target_item, source_collection);
  end if;
end;
$$;

-- Only the owner can create or revoke links. A join link never grants membership.
create function public.create_collection_link(target_collection uuid, link_kind public.share_link_kind, expires_at timestamptz default null)
returns table (link_id uuid, token text) language plpgsql security definer set search_path = '' as $$
declare new_token text; new_id uuid;
begin
  if auth.uid() is null or not app_private.owns_collection(target_collection) then
    raise exception 'Only the collection owner can create links' using errcode = '42501';
  end if;
  if link_kind = 'view' and exists (select 1 from public.collections where id = target_collection and visibility = 'private') then
    raise exception 'Choose unlisted or public visibility before creating a view link';
  end if;
  if expires_at is not null and expires_at <= now() then raise exception 'Link expiration must be in the future'; end if;
  new_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into public.collection_share_links(collection_id, kind, token_hash, expires_at)
    values (target_collection, link_kind, app_private.hash_share_token(new_token), expires_at) returning id into new_id;
  return query select new_id, new_token;
end;
$$;

create function public.revoke_collection_link(target_link uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (select 1 from public.collection_share_links l
    where l.id = target_link and app_private.owns_collection(l.collection_id)) then
    raise exception 'Only the collection owner can revoke links' using errcode = '42501';
  end if;
  update public.collection_share_links set revoked_at = now() where id = target_link;
end;
$$;

create function public.redeem_collection_link(token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare found_link public.collection_share_links;
begin
  if auth.uid() is null then raise exception 'Sign in to save link access' using errcode = '42501'; end if;
  select l.* into found_link from public.collection_share_links l join public.collections c on c.id = l.collection_id
    where l.token_hash = app_private.hash_share_token(token) and l.kind = 'view' and l.revoked_at is null
      and (l.expires_at is null or l.expires_at > now()) and c.visibility <> 'private';
  if found_link.id is null then raise exception 'This link is unavailable' using errcode = '42501'; end if;
  insert into public.collection_link_access(link_id, user_id) values (found_link.id, auth.uid()) on conflict do nothing;
  return found_link.collection_id;
end;
$$;

create function public.request_collection_access(token text)
returns public.membership_status language plpgsql security definer set search_path = '' as $$
declare target uuid; result public.membership_status;
begin
  if auth.uid() is null then raise exception 'Sign in to request access' using errcode = '42501'; end if;
  select l.collection_id into target from public.collection_share_links l
    where l.token_hash = app_private.hash_share_token(token) and l.kind = 'join' and l.revoked_at is null
      and (l.expires_at is null or l.expires_at > now());
  if target is null then raise exception 'This link is unavailable' using errcode = '42501'; end if;
  if app_private.owns_collection(target) then return 'accepted'; end if;
  insert into public.collection_memberships(collection_id, user_id, role, status)
    values (target, auth.uid(), 'contributor', 'requested') on conflict do nothing;
  select status into result from public.collection_memberships where collection_id = target and user_id = auth.uid();
  return result;
end;
$$;

create function public.accept_collection_invitation(target_collection uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in to accept an invitation' using errcode = '42501'; end if;
  update public.collection_memberships set status = 'accepted'
    where collection_id = target_collection and user_id = auth.uid() and status = 'invited';
  if not found then raise exception 'No pending invitation'; end if;
end;
$$;

-- Anonymous link visitors receive a curated snapshot. A join token cannot call this.
create function public.get_shared_collection(token text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare target uuid; result jsonb;
begin
  select l.collection_id into target from public.collection_share_links l join public.collections c on c.id = l.collection_id
    where l.token_hash = app_private.hash_share_token(token) and l.kind = 'view' and l.revoked_at is null
      and (l.expires_at is null or l.expires_at > now()) and c.visibility <> 'private';
  if target is null then return null; end if;
  select jsonb_build_object(
    'id', c.id, 'name', c.name, 'cover_url', c.cover_url, 'visibility', c.visibility,
    'owner', jsonb_build_object('id', p.id, 'display_name', p.display_name, 'avatar_url', p.avatar_url),
    'items', coalesce((select jsonb_agg(jsonb_build_object(
      'item', to_jsonb(i), 'added_at', ci.added_at, 'published_review', ci.published_review,
      'found_through', (select jsonb_build_object('collection_id', source.id, 'collection_name', source.name,
        'profile_id', author.id, 'display_name', author.display_name)
        from public.collection_item_attributions a join public.collections source on source.id = a.source_collection_id
        join public.profiles author on author.id = source.owner_id
        where a.collection_id = ci.collection_id and a.item_id = ci.item_id and source.visibility = 'public')
    ) order by ci.added_at desc) from public.collection_items ci join public.items i on i.id = ci.item_id
      where ci.collection_id = c.id), '[]'::jsonb)
  ) into result from public.collections c join public.profiles p on p.id = c.owner_id where c.id = target;
  return result;
end;
$$;

-- Grant table access deliberately; RLS is the actual row boundary.
revoke all on public.profiles, public.collections, public.items, public.collection_memberships,
  public.collection_items, public.private_item_notes, public.collection_share_links,
  public.collection_link_access, public.collection_item_attributions, public.collection_feedback from anon, authenticated;
grant select on public.profiles, public.collections, public.items, public.collection_items, public.collection_item_attributions to anon;
grant select, insert, update, delete on public.collections, public.items, public.collection_memberships,
  public.collection_items, public.private_item_notes, public.collection_feedback to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.collection_share_links to authenticated;
grant select, delete on public.collection_link_access to authenticated;
grant select, insert, delete on public.collection_item_attributions to authenticated;

revoke all on all functions in schema app_private from public;
grant execute on function app_private.owns_collection(uuid), app_private.can_read_collection(uuid),
  app_private.can_contribute(uuid), app_private.can_read_item(uuid), app_private.can_read_attribution(uuid) to anon, authenticated;
revoke all on function public.create_collection_link(uuid, public.share_link_kind, timestamptz),
  public.revoke_collection_link(uuid), public.redeem_collection_link(text), public.request_collection_access(text),
  public.accept_collection_invitation(uuid), public.get_shared_collection(text),
  public.create_saved_item(uuid[], jsonb), public.save_existing_item(uuid, uuid, uuid) from public;
grant execute on function public.create_collection_link(uuid, public.share_link_kind, timestamptz),
  public.revoke_collection_link(uuid), public.redeem_collection_link(text), public.request_collection_access(text),
  public.accept_collection_invitation(uuid), public.create_saved_item(uuid[], jsonb),
  public.save_existing_item(uuid, uuid, uuid) to authenticated;
grant execute on function public.get_shared_collection(text) to anon, authenticated;

commit;
