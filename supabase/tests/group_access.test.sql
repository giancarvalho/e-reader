begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(19);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000001', 'organizer@example.test', '{"full_name":"Organizer"}'),
  ('00000000-0000-0000-0000-000000000002', 'reader@example.test',
   '{"full_name":"Reader","avatar_url":"https://example.test/avatar","email":"reader@example.test"}'),
  ('00000000-0000-0000-0000-000000000003', 'outsider@example.test', '{}');
insert into public.groups (id, name) values ('00000000-0000-0000-0000-000000000010', 'Test group');
insert into public.memberships (group_id, user_id, role)
values ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'organizer');
insert into public.profiles (id, display_name)
values ('00000000-0000-0000-0000-000000000001', 'Organizer');
insert into public.group_invites (group_id, code)
values ('00000000-0000-0000-0000-000000000010', 'ABCDEFGH234567AB');

set local role anon;
select throws_ok($$ select * from public.join_group('ABCDEFGH234567AB') $$, '42501',
  'permission denied for function join_group', 'anonymous caller cannot use the invite RPC');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select is((select count(*) from public.groups), 0::bigint, 'outsider cannot see any group');
select is((select count(*) from public.memberships), 0::bigint, 'outsider cannot see memberships');
select is((select count(*) from public.profiles), 0::bigint, 'outsider cannot see profiles');
select is((select count(*) from public.group_invites), 0::bigint, 'outsider cannot read invite codes');
select throws_ok($$ insert into public.memberships (group_id, user_id, role)
  values ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002', 'organizer') $$,
  '42501', 'permission denied for table memberships', 'client cannot directly create membership');

select is((select status from public.join_group('wrong')), 'invalid_code', 'invalid code is rejected');
do $$
begin
  for counter in 1..4 loop
    perform public.join_group('another-wrong-code');
  end loop;
end;
$$;
select is((select status from public.join_group('ABCDEFGH234567AB')), 'rate_limited',
  'a correct code is rate limited after five failed attempts');

reset role;
update private.invite_attempts set window_started_at = clock_timestamp() - interval '16 minutes'
where user_id = '00000000-0000-0000-0000-000000000002';
set local role authenticated;
select results_eq(
  $$ select * from public.join_group(' abcdefgh234567ab ') $$,
  $$ values ('joined'::text, '00000000-0000-0000-0000-000000000010'::uuid) $$,
  'valid code joins after the limit expires');
select is((select status from public.join_group('ABCDEFGH234567AB')), 'joined', 'retry is idempotent');
select is((select count(*) from public.memberships), 2::bigint, 'there is exactly one membership per member');
select is((select count(*) from public.groups), 1::bigint, 'member can read their group');
select is((select role from public.memberships where user_id = auth.uid()), 'member', 'invite confers member role');
select is((select count(*) from public.group_invites), 0::bigint, 'member cannot read the invite code');
select is((select count(*) from public.profiles), 2::bigint, 'member can see profiles in the same group');
select is((select avatar_url from public.profiles where id = auth.uid()), 'https://example.test/avatar',
  'profile captures avatar from auth metadata');
with updated as (update public.profiles set display_name = 'Changed' where id <> auth.uid() returning 1)
select is((select count(*) from updated), 0::bigint, 'member cannot change another profile');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select is((select count(*) from public.group_invites), 1::bigint, 'organizer can read their invite code');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
select is((select count(*) from public.profiles), 0::bigint, 'another authenticated outsider still has no access');

select * from finish();
rollback;
