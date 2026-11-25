# Preview e validação do Google OAuth

O botão **Entrar** da página inicial leva visitantes sem sessão direto ao
Google. O Google retorna ao
domínio do Shared Margins em `/auth/google/callback`. O servidor valida
`state`, usa PKCE para trocar o código e envia o token de identidade e o
`nonce` ao Supabase Auth para abrir a sessão. O fluxo segue para o convite
ou para a estante. O fluxo direto entra em vigor quando as duas credenciais
do Google estão no servidor. Ambientes sem nenhuma das duas variáveis do Google
continuam usando o login hospedado pelo Supabase durante a migração.
A rota anterior `/auth/callback` também conclui logins já iniciados.

## Configuração

1. Na Vercel, escolha um domínio HTTPS estável e use essa origem em
   `APP_ORIGIN`, sem caminho. Defina `SUPABASE_URL` e
   `SUPABASE_PUBLISHABLE_KEY` com os valores do projeto Supabase.
2. No Google Cloud, abra o cliente OAuth do tipo **Aplicativo da Web** e
   adicione `https://<domínio-do-app>/auth/google/callback` em **URIs de
   redirecionamento autorizados**. Se o app estiver em modo de teste, inclua
   os e-mails de teste na tela de consentimento.
3. Em Supabase Auth → Providers → Google, habilite o provedor e use o mesmo
   Client ID do passo anterior. Mantenha ativa a verificação de nonce. O
   Supabase valida a audiência do token contra os Client IDs configurados.
4. Na Vercel, defina `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` com as
   credenciais desse mesmo cliente OAuth. Guarde o segredo nas variáveis
   do servidor. Refaça o deploy com as cinco variáveis configuradas no
   ambiente correspondente.
5. Aplique as migrations e prepare o grupo conforme a
   [configuração do grupo](sprint-1-acesso.md). Rode o
   [roteiro da sprint 0](sprint-0-aceitacao.md) no preview e confirme
   que a URI de retorno no Google tem o domínio do Shared Margins.

Para rodar o fluxo localmente, autorize também
`http://localhost:3000/auth/google/callback` no cliente OAuth e aponte
`APP_ORIGIN` para `http://localhost:3000`. O Supabase usado no teste deve
ter o mesmo Client ID autorizado no provedor Google.
