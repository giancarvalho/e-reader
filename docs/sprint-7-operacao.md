# Sprint 7 · Operação e validação

O diagnóstico fica na conta e na estante offline. Registra apenas as categorias
de erro, os horários e o estado do último sync ou download. O painel mostra
a versão do deploy e se o service worker controla a página.

A conta também guarda um registro de gestos de toque (tipo, posição, tempo e
decisão de cada toque na leitura, sem texto do livro). Use **Copiar registro**
na conta para enviar o relatório ao investigar problemas de toque no iPhone.

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

## Beta do redesign

Use um iPhone com o PWA instalado e um Android com o PWA instalado. Anote
modelo, versão do sistema e versão do app mostrada em Diagnóstico.
Registre se cada cenário passou e descreva o ponto exato de eventual falha.

1. Com a conta de organização, publique um EPUB e defina a leitura do clube.
   Use **Copiar convite** para enviar o link à segunda conta.
2. Abra o convite em uma sessão nova, entre com Google, confirme o nome do
   clube e confira se a estante abre. Repita com código colado com espaços.
3. Abra o EPUB, avance por dez páginas, mude a fonte e use o sumário.
   Reabra o app e confira se **Continuar lendo** recupera a posição.
4. Selecione uma palavra, consulte o dicionário e faça um grifo rápido.
   Desfaça, grave uma nota e responda com a outra conta.
5. Em modo avião, abra a estante e leia o livro salvo. Digite uma resposta
   com o teclado aberto e reconecte para confirmar a entrega.
6. Repita navegação e fechamento de painéis com VoiceOver ou TalkBack,
   texto ampliado, modo Noite e orientação horizontal.

A prévia com nome do clube usa a migration `20261126010000_invite_preview.sql`.
A consulta ao corpus na infraestrutura hospedada exige a publicação
documentada na [sprint 6](sprint-6-dicionario.md).
