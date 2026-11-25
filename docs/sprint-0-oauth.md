# Preview e validação do Google OAuth

O fluxo implementado começa em `/entrar` e usa o Supabase Auth com PKCE.
O callback da aplicação é `/auth/callback` e encaminha para o convite ou a estante. A conta em `/conta` mostra
nome e foto do Google após validar a sessão no servidor. O proxy atualiza
cookies nesse caminho, e o service worker continua pré-carregando o shell
público. A saída encerra a sessão do dispositivo.

## Configuração do ambiente de teste

1. Escolha um projeto Supabase de teste e um domínio HTTPS estável de preview
   na Vercel. Em Supabase Auth, mantenha desativados o limite de duração da
   sessão e o limite de inatividade.
2. No Google Cloud, configure a tela de consentimento e um cliente OAuth Web.
   Adicione `https://<projeto>.supabase.co/auth/v1/callback` como URI de
   redirecionamento autorizado. Use a URL exata mostrada pelo provedor Google
   no painel do Supabase. Se o app no Google estiver em teste, inclua a conta
   que será usada nos aparelhos.
3. Habilite o Google no Supabase Auth e guarde o ID e o segredo do cliente
   nesse painel. Em Auth → URL Configuration, acrescente
   `https://<preview>/auth/callback` à lista de redirecionamentos.
4. Aplique as migrations e prepare o grupo conforme a [configuração do grupo](sprint-1-acesso.md).
5. Na Vercel, configure `APP_ORIGIN=https://<preview>`,
   `SUPABASE_URL=https://<projeto>.supabase.co` e
   `SUPABASE_PUBLISHABLE_KEY` com a chave publicável. Faça um novo deploy.
6. Rode o [roteiro da sprint 0](sprint-0-aceitacao.md). Registre em qual
   janela o callback abriu, se a sessão reapareceu ao relançar e o resultado
   do teste offline em iPhone e Android.

A validação com o provedor real continua pendente. A renovação ao voltar ao
primeiro plano e o tratamento de fila offline dependem do fluxo de sessão e
sincronização das próximas tarefas.
