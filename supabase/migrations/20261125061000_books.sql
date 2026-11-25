create table public.books (
  group_id uuid not null references public.groups(id) on delete cascade,
  id text not null check (id ~ '^[0-9a-f]{64}$'),
  file_hash text generated always as (id) stored,
  title text not null check (length(btrim(title)) between 1 and 300),
  author text check (length(author) <= 300),
  language text check (length(language) <= 64),
  file_path text generated always as (group_id::text || '/' || id || '.epub') stored,
  cover_path text check (cover_path = group_id::text || '/' || id || '.cover'),
  position integer not null default 0 check (position >= 0),
  is_current boolean not null default false,
  primary key (group_id, id)
);

create unique index books_one_current_per_group
  on public.books (group_id) where is_current;

alter table public.books enable row level security;
revoke all on public.books from anon, authenticated;
grant select on public.books to authenticated;

create policy books_read on public.books for select to authenticated
using (private.has_membership(group_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'books', 'books', false, 20971520,
  array['application/epub+zip', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

create policy epub_objects_read on storage.objects for select to authenticated
using (
  bucket_id = 'books' and exists (
    select 1 from public.books b where b.file_path = name or b.cover_path = name
  )
);

create policy epub_objects_upload on storage.objects for insert to authenticated
with check (
  bucket_id = 'books'
  and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{64}\.(epub|cover)$'
  and exists (
    select 1 from public.memberships m
    where m.user_id = (select auth.uid())
      and m.role = 'organizer'
      and m.group_id::text = split_part(name, '/', 1)
  )
);

-- The organizer can inspect staged objects to resume interrupted uploads.
create policy epub_staged_objects_read on storage.objects for select to authenticated
using (
  bucket_id = 'books'
  and exists (
    select 1 from public.memberships m
    where m.user_id = (select auth.uid())
      and m.role = 'organizer'
      and m.group_id::text = split_part(name, '/', 1)
  )
);

create function public.publish_book(target_group uuid, book_hash text, book_title text,
  book_author text, book_language text, has_cover boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.has_membership(target_group, 'organizer') then
    raise insufficient_privilege;
  end if;

  perform 1 from public.groups where id = target_group for update;
  if not found or not private.has_membership(target_group, 'organizer') then
    raise insufficient_privilege;
  end if;

  if not exists (
    select 1 from storage.objects
    where bucket_id = 'books' and name = target_group::text || '/' || book_hash || '.epub'
  ) then
    raise check_violation using message = 'EPUB upload is missing';
  end if;

  if has_cover and not exists (
    select 1 from storage.objects
    where bucket_id = 'books' and name = target_group::text || '/' || book_hash || '.cover'
      and metadata ->> 'mimetype' in ('image/jpeg', 'image/png', 'image/webp', 'image/gif')
  ) then
    raise check_violation using message = 'Cover upload is missing or invalid';
  end if;

  insert into public.books (group_id, id, title, author, language, cover_path, position, is_current)
  values (
    target_group, book_hash, book_title, book_author, book_language,
    case when has_cover then target_group::text || '/' || book_hash || '.cover' end,
    coalesce((select max(b.position) + 1 from public.books b where b.group_id = target_group), 0),
    not exists (select 1 from public.books b where b.group_id = target_group and b.is_current)
  )
  on conflict (group_id, id) do nothing;
end;
$$;

create function public.set_current_book(target_group uuid, book_hash text)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.has_membership(target_group, 'organizer') then
    raise insufficient_privilege;
  end if;

  perform 1 from public.groups where id = target_group for update;
  if not found or not private.has_membership(target_group, 'organizer') then
    raise insufficient_privilege;
  end if;

  if not exists (select 1 from public.books b where b.group_id = target_group and b.id = book_hash) then
    raise no_data_found;
  end if;

  update public.books set is_current = false where group_id = target_group and is_current;
  update public.books set is_current = true where group_id = target_group and id = book_hash;
end;
$$;

create function public.move_book(target_group uuid, book_hash text, direction integer)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  source_position integer;
  neighbor public.books%rowtype;
begin
  if not private.has_membership(target_group, 'organizer') then
    raise insufficient_privilege;
  end if;

  perform 1 from public.groups where id = target_group for update;
  if not found or not private.has_membership(target_group, 'organizer') then
    raise insufficient_privilege;
  end if;
  if direction is null or direction not in (-1, 1) then
    raise invalid_parameter_value;
  end if;

  select b.position into strict source_position
  from public.books b where b.group_id = target_group and b.id = book_hash;

  select b.* into neighbor from public.books b
  where b.group_id = target_group and
    ((direction = -1 and b.position < source_position) or (direction = 1 and b.position > source_position))
  order by case when direction = 1 then b.position else -b.position end
  limit 1;

  if found then
    update public.books set position = case when id = book_hash then neighbor.position else source_position end
    where group_id = target_group and id in (book_hash, neighbor.id);
  end if;
end;
$$;

revoke all on function public.publish_book(uuid, text, text, text, text, boolean),
  public.set_current_book(uuid, text), public.move_book(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.publish_book(uuid, text, text, text, text, boolean),
  public.set_current_book(uuid, text), public.move_book(uuid, text, integer) to authenticated;
