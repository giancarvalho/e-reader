create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0)
);

create table public.memberships (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('organizer', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index memberships_user_idx on public.memberships (user_id, group_id);
create unique index memberships_one_organizer_per_group
  on public.memberships (group_id) where role = 'organizer';

create table public.group_invites (
  group_id uuid primary key references public.groups(id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z2-7]{16,64}$')
);

create table private.invite_attempts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null,
  failures integer not null check (failures between 1 and 5)
);

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.memberships enable row level security;
alter table public.group_invites enable row level security;
alter table private.invite_attempts enable row level security;

revoke all on public.profiles, public.groups, public.memberships, public.group_invites from anon, authenticated;
revoke all on private.invite_attempts from public, anon, authenticated;
grant select on public.profiles, public.groups, public.memberships, public.group_invites to authenticated;
grant insert (id, display_name, avatar_url), update (display_name, avatar_url) on public.profiles to authenticated;
grant insert, delete, update (code) on public.group_invites to authenticated;

create function private.has_membership(target_group uuid, required_role text default null)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.group_id = target_group
      and m.user_id = (select auth.uid())
      and (required_role is null or m.role = required_role)
  );
$$;

revoke all on function private.has_membership(uuid, text) from public;
grant execute on function private.has_membership(uuid, text) to authenticated;

create policy profiles_read on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1 from public.memberships m
    where m.user_id = profiles.id and private.has_membership(m.group_id)
  )
);
create policy profiles_insert on public.profiles for insert to authenticated
with check (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy groups_read on public.groups for select to authenticated
using (private.has_membership(id));
create policy memberships_read on public.memberships for select to authenticated
using (private.has_membership(group_id));
create policy invites_manage on public.group_invites for all to authenticated
using (private.has_membership(group_id, 'organizer'))
with check (private.has_membership(group_id, 'organizer'));

create function public.join_group(code text)
returns table (status text, group_id uuid)
language plpgsql security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  attempted_at timestamptz;
  attempt private.invite_attempts%rowtype;
  target_group uuid;
  profile_metadata jsonb;
begin
  if caller is null then
    raise insufficient_privilege using message = 'Authentication required';
  end if;

  -- Serialize attempts per user so parallel requests cannot bypass the limit.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller::text, 0));
  attempted_at := pg_catalog.clock_timestamp();

  select a.* into attempt from private.invite_attempts a where a.user_id = caller;
  if attempt.failures >= 5 and attempt.window_started_at > attempted_at - interval '15 minutes' then
    return query select 'rate_limited'::text, null::uuid;
    return;
  end if;

  select i.group_id into target_group
  from public.group_invites i
  where i.code = upper(btrim(join_group.code));

  if target_group is null then
    insert into private.invite_attempts as a (user_id, window_started_at, failures)
    values (caller, attempted_at, 1)
    on conflict (user_id) do update set
      window_started_at = case when a.window_started_at <= attempted_at - interval '15 minutes'
        then attempted_at else a.window_started_at end,
      failures = case when a.window_started_at <= attempted_at - interval '15 minutes'
        then 1 else a.failures + 1 end;

    return query select 'invalid_code'::text, null::uuid;
    return;
  end if;

  select u.raw_user_meta_data into profile_metadata from auth.users u where u.id = caller;
  insert into public.profiles (id, display_name, avatar_url)
  values (
    caller,
    nullif(btrim(coalesce(profile_metadata ->> 'full_name', profile_metadata ->> 'name')), ''),
    nullif(btrim(coalesce(profile_metadata ->> 'avatar_url', profile_metadata ->> 'picture')), '')
  )
  on conflict (id) do nothing;

  insert into public.memberships (user_id, group_id)
  values (caller, target_group)
  on conflict on constraint memberships_pkey do nothing;

  delete from private.invite_attempts a where a.user_id = caller;

  return query select 'joined'::text, target_group;
end;
$$;

revoke all on function public.join_group(text) from public, anon, authenticated;
grant execute on function public.join_group(text) to authenticated;
