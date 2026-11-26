begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(3);

insert into auth.users(id) values ('70000000-0000-4000-8000-000000000001');
insert into public.groups(id,name) values ('70000000-0000-4000-8000-000000000002','Clube de teste');
insert into public.group_invites(group_id,code) values ('70000000-0000-4000-8000-000000000002','ABCDEFGH234567AB');

set local role anon;
select throws_ok($$ select public.preview_group_invite('ABCDEFGH234567AB') $$, '42501', null, 'anonymous readers cannot preview invites');
set local role authenticated;
set local request.jwt.claim.sub = '70000000-0000-4000-8000-000000000001';
select is(public.preview_group_invite('ABCDEFGH234567AB'), 'Clube de teste', 'invite holder can read the group name');
select is(public.preview_group_invite('ZZZZZZZZ234567AB'), null, 'unknown code reveals nothing');

select * from finish();
rollback;
