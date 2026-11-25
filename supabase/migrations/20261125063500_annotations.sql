create table public.annotations (
  id uuid primary key,
  group_id uuid not null,
  book_id text not null,
  author_id uuid not null references auth.users(id),
  cfi text not null check (length(cfi) between 9 and 4096 and left(cfi, 8) = 'epubcfi('),
  color text not null check (color in ('amber', 'green', 'blue', 'pink')),
  quote_text text not null check (length(btrim(quote_text)) between 1 and 4000),
  note text check (length(note) <= 4000),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (group_id, book_id) references public.books(group_id, id) on delete cascade
);

create index annotations_book_cursor_idx on public.annotations (group_id, book_id, updated_at, id);

create table private.annotation_timestamps (
  group_id uuid primary key references public.groups(id) on delete cascade,
  last_stamp timestamptz not null
);

alter table public.annotations enable row level security;
alter table private.annotation_timestamps enable row level security;
revoke all on public.annotations from anon, authenticated;
revoke all on private.annotation_timestamps from public, anon, authenticated;
grant select on public.annotations to authenticated;
grant insert (id, group_id, book_id, author_id, cfi, color, quote_text, note, deleted_at),
  update (id, group_id, book_id, author_id, cfi, color, quote_text, note, deleted_at)
on public.annotations to authenticated;

create policy annotations_read on public.annotations for select to authenticated
using (private.has_membership(group_id));

create policy annotations_add on public.annotations for insert to authenticated
with check (private.has_membership(group_id) and author_id = (select auth.uid()));

create policy annotations_edit on public.annotations for update to authenticated
using (private.has_membership(group_id) and author_id = (select auth.uid()))
with check (private.has_membership(group_id) and author_id = (select auth.uid()));

create function private.stamp_annotation()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if (new.id, new.group_id, new.book_id, new.author_id)
      is distinct from (old.id, old.group_id, old.book_id, old.author_id) then
      raise check_violation using message = 'Annotation identity cannot change';
    end if;

    if old.deleted_at is not null then
      new.deleted_at := old.deleted_at;
    end if;

    if (new.cfi, new.color, new.quote_text, new.note, new.deleted_at is not null)
      is not distinct from (old.cfi, old.color, old.quote_text, old.note, old.deleted_at is not null) then
      new.updated_at := old.updated_at;
      return new;
    end if;
  end if;

  -- The row lock is held until commit. A cursor cannot skip a slower concurrent write.
  insert into private.annotation_timestamps as stamps (group_id, last_stamp)
  values (new.group_id, pg_catalog.clock_timestamp())
  on conflict (group_id) do update set
    last_stamp = greatest(pg_catalog.clock_timestamp(), stamps.last_stamp + interval '1 microsecond')
  returning last_stamp into new.updated_at;

  if new.deleted_at is not null and (tg_op = 'INSERT' or old.deleted_at is null) then
    new.deleted_at := new.updated_at;
  end if;
  return new;
end;
$$;

revoke all on function private.stamp_annotation() from public;
create trigger stamp_annotation before insert or update on public.annotations
for each row execute function private.stamp_annotation();

create function public.list_annotation_changes(
  target_group uuid, target_book text, after_stamp timestamptz default null,
  after_id uuid default null, page_size integer default 100
)
returns setof public.annotations
language sql stable security invoker
set search_path = ''
as $$
  select a.*
  from public.annotations a
  where a.group_id = target_group and a.book_id = target_book
    and (after_stamp is null or (a.updated_at, a.id) >
      (after_stamp, coalesce(after_id, '00000000-0000-0000-0000-000000000000'::uuid)))
  order by a.updated_at, a.id
  limit greatest(1, least(coalesce(page_size, 100), 200));
$$;

revoke all on function public.list_annotation_changes(uuid, text, timestamptz, uuid, integer)
from public, anon, authenticated;
grant execute on function public.list_annotation_changes(uuid, text, timestamptz, uuid, integer)
to authenticated;
