begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(10);

insert into auth.users(id) values ('30000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000002'), ('30000000-0000-0000-0000-000000000003');
insert into public.groups(id,name) values ('30000000-0000-0000-0000-000000000010','Annotation group');
insert into public.memberships(group_id,user_id) values
  ('30000000-0000-0000-0000-000000000010','30000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000010','30000000-0000-0000-0000-000000000002');
insert into public.books(group_id,id,title)
values ('30000000-0000-0000-0000-000000000010',repeat('a',64),'Annotation test');
create temp table original_cursor(id uuid, updated_at timestamptz);

set local role authenticated;
set local request.jwt.claim.sub = '30000000-0000-0000-0000-000000000001';
select lives_ok($$ insert into public.annotations(id,group_id,book_id,author_id,cfi,color,quote_text,note)
values ('30000000-0000-0000-0000-000000000020','30000000-0000-0000-0000-000000000010',repeat('a',64),
  auth.uid(),'epubcfi(/6/4)','amber','Shared quote','Note') $$, 'member creates own annotation');

reset role;
insert into original_cursor select id, updated_at from public.annotations;
grant select on original_cursor to authenticated;
set local role authenticated;
select lives_ok($$ update public.annotations set color = 'amber' $$, 'replaying same values is safe');
select is((select updated_at from public.annotations), (select updated_at from original_cursor), 'replay keeps timestamp stable');

set local request.jwt.claim.sub = '30000000-0000-0000-0000-000000000002';
select is((select quote_text from public.list_annotation_changes('30000000-0000-0000-0000-000000000010',repeat('a',64))),
  'Shared quote', 'a group member can sync the annotation');
with changed as (update public.annotations set color = 'green' returning 1)
select is((select count(*) from changed), 0::bigint, 'another member cannot edit the annotation');
select throws_ok($$ insert into public.annotations(id,group_id,book_id,author_id,cfi,color,quote_text)
values ('30000000-0000-0000-0000-000000000021','30000000-0000-0000-0000-000000000010',repeat('a',64),
  '30000000-0000-0000-0000-000000000001','epubcfi(/6/4)','blue','Impersonated') $$,
  '42501',null,'a member cannot post as another author');

set local request.jwt.claim.sub = '30000000-0000-0000-0000-000000000001';
select lives_ok($$ update public.annotations set deleted_at = '2000-01-01' $$, 'author can mark deletion');
select ok((select deleted_at = updated_at from public.annotations), 'server stamps the deletion');
set local request.jwt.claim.sub = '30000000-0000-0000-0000-000000000002';
select is((select count(*) from original_cursor c cross join lateral
  public.list_annotation_changes('30000000-0000-0000-0000-000000000010',repeat('a',64),c.updated_at,c.id,1) a
  where a.deleted_at is not null), 1::bigint, 'next cursor page includes the tombstone');

set local request.jwt.claim.sub = '30000000-0000-0000-0000-000000000003';
select is((select count(*) from public.list_annotation_changes('30000000-0000-0000-0000-000000000010',repeat('a',64))),
  0::bigint,'outsider receives no changes');

select * from finish();
rollback;
