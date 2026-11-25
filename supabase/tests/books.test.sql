begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(12);

insert into auth.users(id) values ('10000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002'), ('10000000-0000-0000-0000-000000000003');
insert into public.groups(id, name) values ('10000000-0000-0000-0000-000000000010', 'Books test');
insert into public.memberships(group_id,user_id,role) values
  ('10000000-0000-0000-0000-000000000010','10000000-0000-0000-0000-000000000001','organizer'),
  ('10000000-0000-0000-0000-000000000010','10000000-0000-0000-0000-000000000002','member');

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
select lives_ok($$ insert into storage.objects(bucket_id,name) values
  ('books','10000000-0000-0000-0000-000000000010/' || repeat('a',64) || '.epub'),
  ('books','10000000-0000-0000-0000-000000000010/' || repeat('b',64) || '.epub') $$,
  'organizer can stage books');
select throws_ok($$ select public.publish_book('10000000-0000-0000-0000-000000000010',
  repeat('c',64),'Missing',null,null,false) $$,'23514','EPUB upload is missing','requires staged file');

set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000002';
select is((select count(*) from storage.objects where bucket_id = 'books'), 0::bigint, 'staged files are private');
select throws_ok($$ insert into storage.objects(bucket_id,name) values
  ('books','10000000-0000-0000-0000-000000000010/' || repeat('c',64) || '.epub') $$,
  '42501','new row violates row-level security policy for table "objects"','member cannot upload');
select throws_ok($$ select public.publish_book('10000000-0000-0000-0000-000000000010',
  repeat('a',64),'First',null,null,false) $$,'42501',null,'member cannot publish');

set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
select lives_ok($$ select public.publish_book('10000000-0000-0000-0000-000000000010',
  repeat(hash,64),title,null,null,false) from (values ('a','First'),('b','Second'),('a','First')) b(hash,title) $$,
  'publishes staged EPUBs and supports retry');
select is((select count(*) from public.books), 2::bigint, 'duplicate hash does not create another book');
select lives_ok($$ select public.set_current_book('10000000-0000-0000-0000-000000000010',repeat('b',64)) $$,
  'organizer can change the current book');
select lives_ok($$ select public.move_book('10000000-0000-0000-0000-000000000010',repeat('b',64),-1) $$,
  'organizer can reorder books');

set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000002';
select is((select title from public.books where is_current and position = 0), 'Second', 'member reads order and current book');
select is((select count(*) from storage.objects where bucket_id = 'books'), 2::bigint, 'member can read published files');
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';
select is((select count(*) from public.books) + (select count(*) from storage.objects where bucket_id = 'books'),
  0::bigint, 'outsider cannot read books or files');

select * from finish();
rollback;
