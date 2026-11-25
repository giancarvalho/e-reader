begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(11);

insert into auth.users(id) values ('20000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002'), ('20000000-0000-0000-0000-000000000003');
insert into public.groups(id,name) values ('20000000-0000-0000-0000-000000000010','Reading group');
insert into public.memberships(group_id,user_id) values
  ('20000000-0000-0000-0000-000000000010','20000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000010','20000000-0000-0000-0000-000000000002');
insert into public.books(group_id,id,title)
values ('20000000-0000-0000-0000-000000000010',repeat('a',64),'Reader state test');

set local role authenticated;
set local request.jwt.claim.sub = '20000000-0000-0000-0000-000000000001';
select lives_ok($$
  insert into public.progress(user_id, group_id, book_id, cfi, fraction)
  values (auth.uid(), '20000000-0000-0000-0000-000000000010', repeat('a',64), 'epubcfi(/6/4)', 0.5)
  on conflict (user_id, group_id, book_id) do update set cfi = excluded.cfi, fraction = excluded.fraction;
$$, 'member can save progress');
select lives_ok($$
  insert into public.progress(user_id, group_id, book_id, cfi, fraction)
  values (auth.uid(), '20000000-0000-0000-0000-000000000010', repeat('a',64), 'epubcfi(/6/6)', 0.75)
  on conflict (user_id, group_id, book_id) do update set cfi = excluded.cfi, fraction = excluded.fraction;
$$, 'member can update progress through upsert');
select is((select cfi from public.progress), 'epubcfi(/6/6)', 'progress stores the latest CFI');
select ok((select updated_at is not null from public.progress), 'server records update time');
select lives_ok($$ insert into public.user_preferences(user_id, theme, font_size)
  values (auth.uid(), 'custom', 24) $$, 'reader can save preferences');
select throws_ok($$ update public.user_preferences set font_size = 100 $$, '23514', null, 'font size is bounded');
select throws_ok($$ update public.progress set fraction = -1 $$, '23514', null, 'fraction is bounded');

set local request.jwt.claim.sub = '20000000-0000-0000-0000-000000000002';
select is((select count(*) from public.progress), 0::bigint, 'group members do not see another reader’s progress');
select is((select count(*) from public.user_preferences), 0::bigint, 'group members do not see another reader’s preferences');
with changed as (update public.user_preferences set font_size = 22 returning 1)
select is((select count(*) from changed), 0::bigint, 'group members cannot update another reader’s preferences');

set local request.jwt.claim.sub = '20000000-0000-0000-0000-000000000003';
select throws_ok($$ insert into public.progress(user_id, group_id, book_id, cfi, fraction)
  values (auth.uid(), '20000000-0000-0000-0000-000000000010', repeat('a',64), 'epubcfi(/6/4)', 0.5)
$$,'42501',null,'outsider cannot save progress for a private group');

select * from finish();
rollback;
