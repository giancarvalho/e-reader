# Sprint 7 · Operação e validação

O diagnóstico fica na conta e na estante offline. Registra apenas as categorias
de erro, os horários e o estado do último sync ou download. O painel mostra
a versão do deploy e se o service worker controla a página.

## Restaurar um backup local

Com o Supabase local iniciado, execute `scripts/ops/check-local-restore.sh`.
O ensaio cria um grupo e um livro temporários, gera um dump lógico, restaura
em outro banco do mesmo Postgres e compara os metadados. O runner usa
somente a instância local de teste. O ensaio ignora os grants do dump,
inclusive os de funções internas que o Supabase recria durante o
provisionamento. Quando o papel administrativo não está disponível,
o ensaio também ignora os proprietários. A suíte SQL verifica as
políticas e os grants da aplicação na instância Supabase.

## Preparar o ambiente hospedado

- Definir o plano Supabase, a frequência do backup e quem pode restaurar.
- Exportar separadamente os objetos do bucket privado e verificar o SHA-256
  dos EPUBs após restaurar. O dump lógico cobre os metadados e as permissões.
- Restaurar em outro projeto de teste, conferir usuários, participações,
  arquivos, grifos e comentários e registrar o tempo de recuperação.
- Criar dois usuários de teste com o [roteiro de acesso](sprint-0-oauth.md).
  Validar instalação, sessão e atualização do PWA em iPhone e Android.
- Rodar um beta com um grupo pequeno. Em dois aparelhos, abrir o mesmo EPUB,
  criar um grifo em modo avião, reconectar e responder ao grifo pelo outro
  aparelho. Conferir posição, preferências, exclusões e avisos de sync.
