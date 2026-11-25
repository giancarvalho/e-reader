# Configuração inicial do grupo

O schema e os testes do convite rodam com Supabase local sem Google OAuth.
Os testes criam suas contas e os dados temporários dentro de uma transação.

Para configurar o grupo real, o organizador precisa existir em `auth.users`
após entrar com Google. No SQL Editor, substitua o UUID e o nome indicados e
rode a transação abaixo uma vez. O código vem do gerador aleatório do
Postgres, usa o alfabeto base32 e deve ser compartilhado apenas com o grupo.

```sql
begin;
with new_group as (
  insert into public.groups (name) values ('Nome do grupo') returning id
), organizer as (
  select id, raw_user_meta_data
  from auth.users
  where id = '00000000-0000-0000-0000-000000000000'::uuid
), organizer_profile as (
  insert into public.profiles (id, display_name, avatar_url)
  select id, raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'avatar_url'
  from organizer
  on conflict (id) do nothing
), membership as (
  insert into public.memberships (group_id, user_id, role)
  values ((select id from new_group), (select id from organizer), 'organizer')
  returning group_id
)
insert into public.group_invites (group_id, code)
select group_id, (
  select string_agg(substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', 1 + (get_byte(bytes, idx) & 31), 1), '' order by idx)
  from (select extensions.gen_random_bytes(24) as bytes) generated
  cross join generate_series(0, 23) as idx
)
from membership
returning group_id, code;
commit;
```

A interface consome o retorno de `join_group(code)`. Somente `joined`
contém um `group_id`. As respostas de erro permitem que a interface
mostre mensagens distintas para código inválido e limite de tentativas.

Após o login, `/convite` consulta a participação da pessoa. Um membro
segue para `/estante`. Uma pessoa sem participação recebe o formulário e
vê o erro da RPC no mesmo lugar, com o código preservado para correção.
A estante exige sessão e vínculo com o grupo.
