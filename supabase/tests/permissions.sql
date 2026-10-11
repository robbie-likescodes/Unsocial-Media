-- Run with psql -v ON_ERROR_STOP=1 -f supabase/tests/permissions.sql.
-- Fixtures and changes are rolled back; this is safe on a local development DB.
begin;
create function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is distinct from true then raise exception 'Permission test failed: %', message; end if;
end;
$$;
create temporary table test_links (label text primary key, link_id uuid, token text);
grant select, insert on test_links to authenticated, anon;

insert into auth.users(id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222'),
  ('33333333-3333-3333-3333-333333333333');
insert into public.profiles(id, display_name) values
  ('11111111-1111-1111-1111-111111111111', 'Owner'),
  ('22222222-2222-2222-2222-222222222222', 'Alice'),
  ('33333333-3333-3333-3333-333333333333', 'Bob');
insert into public.collections(id, owner_id, name, visibility) values
  ('aaaaaaaa-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Private trip', 'private'),
  ('aaaaaaaa-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Public source', 'public'),
  ('aaaaaaaa-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'Bob saves', 'public'),
  ('aaaaaaaa-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Link only', 'unlisted');
insert into public.items(id, created_by, kind, title) values
  ('bbbbbbbb-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'place', 'Private campsite'),
  ('bbbbbbbb-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'link', 'Shared coffee guide'),
  ('bbbbbbbb-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'note', 'Alice contribution'),
  ('bbbbbbbb-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'event', 'Link-only festival');
insert into public.collection_items(collection_id, item_id, contributed_by) values
  ('aaaaaaaa-1111-1111-1111-111111111111', 'bbbbbbbb-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-2222-2222-2222-222222222222', 'bbbbbbbb-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
  ('aaaaaaaa-4444-4444-4444-444444444444', 'bbbbbbbb-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111');
insert into public.private_item_notes(user_id, item_id, body) values
  ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-1111-1111-1111-111111111111', 'PRIVATE_NOTE_DO_NOT_SHARE'),
  ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-4444-4444-4444-444444444444', 'PRIVATE_NOTE_DO_NOT_SHARE');

set local role anon;
select pg_temp.assert_true((select count(*) = 2 from public.collections), 'anonymous browsing only shows public collections');
select pg_temp.assert_true((select count(*) = 1 from public.items), 'private and unlisted items are hidden from anonymous queries');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.collection_memberships(collection_id, user_id, status) values
  ('aaaaaaaa-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'invited');
insert into test_links select 'view', link_id, token from public.create_collection_link('aaaaaaaa-4444-4444-4444-444444444444', 'view');
insert into test_links select 'join', link_id, token from public.create_collection_link('aaaaaaaa-1111-1111-1111-111111111111', 'join');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select pg_temp.assert_true(not app_private.can_read_collection('aaaaaaaa-1111-1111-1111-111111111111'), 'invitation alone does not grant access');
select public.accept_collection_invitation('aaaaaaaa-1111-1111-1111-111111111111');
select pg_temp.assert_true(app_private.can_read_collection('aaaaaaaa-1111-1111-1111-111111111111'), 'accepted invitation grants access');
select pg_temp.assert_true((select count(*) = 0 from public.private_item_notes), 'collaborators cannot read the owner personal notes');
do $$
begin
  begin
    perform public.create_saved_item('{}'::uuid[], '{"kind":"note","title":"No collection"}'::jsonb);
    raise exception 'Save without a collection unexpectedly worked';
  exception when raise_exception then
    if sqlerrm <> 'Select at least one collection' then raise; end if;
  end;
  begin
    perform public.create_saved_item(array['aaaaaaaa-3333-3333-3333-333333333333']::uuid[], '{"kind":"note","title":"Unauthorized collection"}'::jsonb);
    raise exception 'Save to another owner collection unexpectedly worked';
  exception when insufficient_privilege then null;
  end;
end;
$$;
select public.create_saved_item(array['aaaaaaaa-1111-1111-1111-111111111111']::uuid[], '{"kind":"note","title":"Atomic save"}'::jsonb);
select pg_temp.assert_true((select count(*) = 1 from public.items where title = 'Atomic save'), 'atomic create saves an item');
select pg_temp.assert_true((select count(*) = 1 from public.collection_items ci join public.items i on i.id = ci.item_id where i.title = 'Atomic save'), 'atomic create places the item in its selected collection');
insert into public.collection_items(collection_id, item_id, contributed_by, published_review) values
  ('aaaaaaaa-1111-1111-1111-111111111111', 'bbbbbbbb-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'My contribution');
with changed as (update public.collection_items set published_review = 'Tampered'
  where item_id = 'bbbbbbbb-1111-1111-1111-111111111111' returning *)
select pg_temp.assert_true((select count(*) = 0 from changed), 'collaborator cannot edit another contribution');
with changed as (update public.items set title = 'Tampered'
  where id = 'bbbbbbbb-1111-1111-1111-111111111111' returning *)
select pg_temp.assert_true((select count(*) = 0 from changed), 'collaborator cannot edit another creator item');
with changed as (update public.collection_items set published_review = 'My revised contribution'
  where item_id = 'bbbbbbbb-3333-3333-3333-333333333333' returning *)
select pg_temp.assert_true((select count(*) = 1 from changed), 'collaborator can edit their own contribution');
with removed as (delete from public.collection_items where item_id = 'bbbbbbbb-1111-1111-1111-111111111111' returning *)
select pg_temp.assert_true((select count(*) = 0 from removed), 'collaborator cannot remove another contribution');
reset role;

set local role anon;
select pg_temp.assert_true(public.get_shared_collection((select token from test_links where label = 'view')) is not null, 'valid view link supports anonymous browsing');
select pg_temp.assert_true(public.get_shared_collection((select token from test_links where label = 'view'))::text not like '%PRIVATE_NOTE_DO_NOT_SHARE%', 'shared snapshot never contains personal notes');
select pg_temp.assert_true(public.get_shared_collection((select token from test_links where label = 'join')) is null, 'join token is not a view token');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select public.redeem_collection_link((select token from test_links where label = 'view'));
select pg_temp.assert_true(app_private.can_read_collection('aaaaaaaa-4444-4444-4444-444444444444'), 'redeeming a valid view link grants unlisted access');
select pg_temp.assert_true(public.request_collection_access((select token from test_links where label = 'join')) = 'requested', 'join link creates a request');
select pg_temp.assert_true(not app_private.can_read_collection('aaaaaaaa-1111-1111-1111-111111111111'), 'pending request does not grant access');
with changed as (update public.collection_memberships set status = 'accepted'
  where collection_id = 'aaaaaaaa-1111-1111-1111-111111111111' returning *)
select pg_temp.assert_true((select count(*) = 0 from changed), 'requester cannot approve their own request');
select public.save_existing_item('aaaaaaaa-3333-3333-3333-333333333333', 'bbbbbbbb-2222-2222-2222-222222222222', 'aaaaaaaa-2222-2222-2222-222222222222');
select pg_temp.assert_true((select count(*) = 1 from public.collection_item_attributions), 'public source attribution is visible');
insert into public.collection_feedback(collection_id, user_id, kind, entity_key) values
  ('aaaaaaaa-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'hide_entity', 'artist:keith-urban');
select pg_temp.assert_true((select count(*) = 0 from public.collection_feedback where collection_id = 'aaaaaaaa-2222-2222-2222-222222222222'), 'hidden artist preference stays scoped to the selected collection');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.collection_memberships set status = 'accepted'
  where collection_id = 'aaaaaaaa-1111-1111-1111-111111111111' and user_id = '33333333-3333-3333-3333-333333333333';
with removed as (delete from public.collection_items where item_id = 'bbbbbbbb-3333-3333-3333-333333333333' returning *)
select pg_temp.assert_true((select count(*) = 1 from removed), 'owner can remove a collaborator contribution from the collection');
select public.revoke_collection_link((select link_id from test_links where label = 'view'));
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select pg_temp.assert_true(app_private.can_read_collection('aaaaaaaa-1111-1111-1111-111111111111'), 'owner approval grants contributor access');
select pg_temp.assert_true(not app_private.can_read_collection('aaaaaaaa-4444-4444-4444-444444444444'), 'revoking a view link removes redeemed access');
reset role;

set local role anon;
select pg_temp.assert_true(public.get_shared_collection((select token from test_links where label = 'view')) is null, 'revoked link cannot retrieve a snapshot');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
update public.collections set visibility = 'private' where id = 'aaaaaaaa-2222-2222-2222-222222222222';
select pg_temp.assert_true((select count(*) = 0 from public.collection_item_attributions), 'credit disappears even for the source owner when the source becomes private');
select pg_temp.assert_true((select count(*) = 0 from public.collection_feedback), 'another user feedback is private');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select pg_temp.assert_true((select count(*) = 0 from public.collection_item_attributions), 'private source attribution disappears from someone else saves');
select pg_temp.assert_true((select count(*) = 1 from public.collection_items where collection_id = 'aaaaaaaa-3333-3333-3333-333333333333'), 'saved item remains after source collection becomes private');
select pg_temp.assert_true(app_private.can_read_item('bbbbbbbb-2222-2222-2222-222222222222'), 'saved canonical item remains accessible through destination collection');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
delete from public.collection_memberships where collection_id = 'aaaaaaaa-1111-1111-1111-111111111111'
  and user_id = '33333333-3333-3333-3333-333333333333';
select public.revoke_collection_link((select link_id from test_links where label = 'join'));
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select pg_temp.assert_true(not app_private.can_read_collection('aaaaaaaa-1111-1111-1111-111111111111'), 'owner can revoke contributor access');
do $$
begin
  begin
    perform public.request_collection_access((select token from test_links where label = 'join'));
    raise exception 'Revoked join link unexpectedly worked';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;
rollback;
