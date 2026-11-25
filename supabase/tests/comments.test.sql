begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(8);

insert into auth.users(id) values ('40000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000002'), ('40000000-0000-0000-0000-000000000003');
insert into public.groups(id,name) values ('40000000-0000-0000-0000-000000000010','Thread group');
insert into public.memberships(group_id,user_id) values
  ('40000000-0000-0000-0000-000000000010','40000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000010','40000000-0000-0000-0000-000000000002');
insert into public.books(group_id,id,title)
values ('40000000-0000-0000-0000-000000000010',repeat('a',64),'Comment test');
insert into public.annotations(id,group_id,book_id,author_id,cfi,color,quote_text) values
  ('40000000-0000-0000-0000-000000000020','40000000-0000-0000-0000-000000000010',repeat('a',64),
   '40000000-0000-0000-0000-000000000001','epubcfi(/6/4)','amber','Shared quote');

set local role authenticated;
set local request.jwt.claim.sub = '40000000-0000-0000-0000-000000000002';
select lives_ok($$ insert into public.comments(id,annotation_id,group_id,book_id,author_id,text)
values ('40000000-0000-0000-0000-000000000021','40000000-0000-0000-0000-000000000020',
  '40000000-0000-0000-0000-000000000010',repeat('a',64),auth.uid(),'Reply') $$,
  'member can reply to another member’s annotation');
select throws_ok($$ update public.comments set text = 'Changed' $$, '23514',
  'A posted comment can only be deleted','author cannot rewrite a published reply');

set local request.jwt.claim.sub = '40000000-0000-0000-0000-000000000001';
select is((select text from public.list_comment_changes('40000000-0000-0000-0000-000000000010',repeat('a',64))),
  'Reply','annotation owner can read a reply');
with changed as (update public.comments set deleted_at = now() returning 1)
select is((select count(*) from changed), 0::bigint, 'annotation owner cannot delete another person’s reply');

set local request.jwt.claim.sub = '40000000-0000-0000-0000-000000000002';
select lives_ok($$ update public.comments set deleted_at = '2000-01-01' $$, 'comment author can delete a reply');
select ok((select deleted_at = updated_at and created_at < updated_at from public.comments),
  'server timestamps deletion separately from creation');

set local request.jwt.claim.sub = '40000000-0000-0000-0000-000000000001';
select is((select count(*) from public.list_comment_changes(
  '40000000-0000-0000-0000-000000000010',repeat('a',64)) where deleted_at is not null),
  1::bigint, 'annotation owner can synchronize the deleted reply');

set local request.jwt.claim.sub = '40000000-0000-0000-0000-000000000003';
select is((select count(*) from public.list_comment_changes('40000000-0000-0000-0000-000000000010',repeat('a',64))),
  0::bigint,'outsider cannot read the thread');
select * from finish();
rollback;
