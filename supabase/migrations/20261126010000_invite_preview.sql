create function public.preview_group_invite(invite_code text)
returns text
language sql stable security definer
set search_path = ''
as $$
  select g.name
  from public.group_invites i
  join public.groups g on g.id = i.group_id
  where (select auth.uid()) is not null
    and i.code = invite_code
    and invite_code ~ '^[A-Z2-7]{16,64}$';
$$;

revoke all on function public.preview_group_invite(text) from public, anon, authenticated;
grant execute on function public.preview_group_invite(text) to authenticated;
