create table public.progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null,
  book_id text not null,
  cfi text not null check (length(cfi) between 9 and 4096 and left(cfi, 8) = 'epubcfi('),
  fraction double precision not null check (fraction between 0 and 1),
  updated_at timestamptz not null default now(),
  primary key (user_id, group_id, book_id),
  foreign key (group_id, book_id) references public.books(group_id, id) on delete cascade
);

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'auto' check (theme in ('auto', 'day', 'night', 'custom')),
  custom_bg text not null default '#FAF5EC' check (custom_bg ~ '^#[0-9a-fA-F]{6}$'),
  custom_ink text not null default '#2B2420' check (custom_ink ~ '^#[0-9a-fA-F]{6}$'),
  font_size integer not null default 18 check (font_size between 12 and 36),
  font_family text not null default 'serif' check (font_family in ('serif', 'sans')),
  updated_at timestamptz not null default now()
);

create function private.stamp_reader_state()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.clock_timestamp();
  return new;
end;
$$;

create trigger stamp_progress before insert or update on public.progress
for each row execute function private.stamp_reader_state();
create trigger stamp_user_preferences before insert or update on public.user_preferences
for each row execute function private.stamp_reader_state();

alter table public.progress enable row level security;
alter table public.user_preferences enable row level security;
revoke all on public.progress, public.user_preferences from anon, authenticated;
grant select on public.progress, public.user_preferences to authenticated;
grant insert (user_id, group_id, book_id, cfi, fraction), update (user_id, group_id, book_id, cfi, fraction)
on public.progress to authenticated;
grant insert (user_id, theme, custom_bg, custom_ink, font_size, font_family),
  update (user_id, theme, custom_bg, custom_ink, font_size, font_family)
on public.user_preferences to authenticated;

create policy progress_read on public.progress for select to authenticated
using (user_id = (select auth.uid()) and private.has_membership(group_id));
create policy progress_create on public.progress for insert to authenticated
with check (user_id = (select auth.uid()) and private.has_membership(group_id));
create policy progress_update on public.progress for update to authenticated
using (user_id = (select auth.uid()) and private.has_membership(group_id))
with check (user_id = (select auth.uid()) and private.has_membership(group_id));

create policy preferences_read on public.user_preferences for select to authenticated
using (user_id = (select auth.uid()));
create policy preferences_create on public.user_preferences for insert to authenticated
with check (user_id = (select auth.uid()));
create policy preferences_update on public.user_preferences for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
