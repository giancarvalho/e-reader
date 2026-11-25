alter table public.annotations add unique (id, group_id, book_id);

create table public.comments (
  id uuid primary key,
  annotation_id uuid not null,
  group_id uuid not null,
  book_id text not null,
  author_id uuid not null references auth.users(id),
  text text not null check (length(btrim(text)) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (annotation_id, group_id, book_id) references public.annotations(id, group_id, book_id) on delete cascade
);

create index comments_book_cursor_idx on public.comments (group_id, book_id, updated_at, id);
create index comments_annotation_thread_idx on public.comments (annotation_id, created_at, id);

alter table public.comments enable row level security;
revoke all on public.comments from anon, authenticated;
grant select on public.comments to authenticated;
grant insert (id, annotation_id, group_id, book_id, author_id, text, deleted_at),
  update (id, annotation_id, group_id, book_id, author_id, text, deleted_at)
on public.comments to authenticated;

create policy comments_read on public.comments for select to authenticated
using (private.has_membership(group_id));

create policy comments_add on public.comments for insert to authenticated
with check (
  private.has_membership(group_id) and author_id = (select auth.uid())
  and exists (
    select 1 from public.annotations a
    where a.id = annotation_id and a.group_id = comments.group_id
      and a.book_id = comments.book_id and a.deleted_at is null
  )
);

create policy comments_edit on public.comments for update to authenticated
using (private.has_membership(group_id) and author_id = (select auth.uid()))
with check (private.has_membership(group_id) and author_id = (select auth.uid()));

create function private.stamp_comment()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if (new.id, new.annotation_id, new.group_id, new.book_id, new.author_id, new.text)
      is distinct from (old.id, old.annotation_id, old.group_id, old.book_id, old.author_id, old.text) then
      raise check_violation using message = 'A posted comment can only be deleted';
    end if;
    new.created_at := old.created_at;
    if old.deleted_at is not null then
      new.deleted_at := old.deleted_at;
    end if;
    if (new.deleted_at is not null) = (old.deleted_at is not null) then
      new.updated_at := old.updated_at;
      return new;
    end if;
  end if;

  insert into private.annotation_timestamps as stamps (group_id, last_stamp)
  values (new.group_id, pg_catalog.clock_timestamp())
  on conflict (group_id) do update set
    last_stamp = greatest(pg_catalog.clock_timestamp(), stamps.last_stamp + interval '1 microsecond')
  returning last_stamp into new.updated_at;

  if tg_op = 'INSERT' then
    new.created_at := new.updated_at;
  end if;
  if new.deleted_at is not null and (tg_op = 'INSERT' or old.deleted_at is null) then
    new.deleted_at := new.updated_at;
  end if;
  return new;
end;
$$;

revoke all on function private.stamp_comment() from public;
create trigger stamp_comment before insert or update on public.comments
for each row execute function private.stamp_comment();

create function public.list_comment_changes(
  target_group uuid, target_book text, after_stamp timestamptz default null,
  after_id uuid default null, page_size integer default 100
)
returns setof public.comments
language sql stable security invoker
set search_path = ''
as $$
  select c.*
  from public.comments c
  where c.group_id = target_group and c.book_id = target_book
    and (after_stamp is null or (c.updated_at, c.id) >
      (after_stamp, coalesce(after_id, '00000000-0000-0000-0000-000000000000'::uuid)))
  order by c.updated_at, c.id
  limit greatest(1, least(coalesce(page_size, 100), 200));
$$;

revoke all on function public.list_comment_changes(uuid, text, timestamptz, uuid, integer)
from public, anon, authenticated;
grant execute on function public.list_comment_changes(uuid, text, timestamptz, uuid, integer)
to authenticated;
