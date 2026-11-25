# Plano de sprints

25/11/2026 · [Documento técnico](documento-tecnico.md)

Cada sprint entrega um fluxo testável em celular. A ordem abaixo segue as dependências do produto. Abra um PR por tarefa, mantenha os registros de validação em `docs/` e avance com unitários, integração e lint verdes no PR, junto dos demais checks automáticos aplicáveis. Registre separadamente o preview e a aceitação em aparelhos reais. Se um teste de campo revelar um bloqueio, resolva-o antes de iniciar tarefas que dependem dele.

| Sprint | Sequência e dependências | Aceitação |
| --- | --- | --- |
| **0 — Fundação e riscos** | Inicializar Next.js, tokens, PWA e pipeline. Subir Supabase local. Ligar Vercel e Supabase de teste, configurar Google OAuth e validar o fluxo no PWA instalado. Avaliar a fonte PT com amostra e licença. | Instalar em iPhone e Android, entrar com Google, ver nome/foto, fechar, reabrir e verificar renovação e shell offline. Registrar alternativa de login se o teste falhar e decisão da fonte PT com licença. |
| **1 — Design system e acesso** | Após validar o caminho de autenticação, montar catálogo e componentes acessíveis. Criar perfis, grupos, membros, convites e `join_group` com RLS e limite de tentativas. Integrar sessão persistente, renovação e entrada na estante vazia. | Conta nova entra pelo convite, código errado tem feedback e sofre bloqueio por tentativas. Testar isolamento, expiração, rede indisponível e renovação concorrente. |
| **2 — Estante e livros** | Depois da autorização por papel, criar metadados e bucket privado. Implementar upload do organizador com hash e deduplicação, livro atual e ordenação. Baixar por URL assinada, validar o hash e armazenar no IndexedDB. | Organizador publica no celular, membro baixa em outro aparelho e acessa em modo avião. Verificar upload negado ao membro, arquivo alterado e reenvio idêntico. |
| **3 — Leitor** | Com EPUB íntegro e local, integrar foliate-js no cliente, paginação/CFI, barras e índice. Persistir progresso e preferências imediatamente e sincronizar por conta. Aplicar tema antes da primeira pintura. Confirmar o modelo de respostas antes da sprint 5. | Ler em iPhone e Android, checar seleção e paginação, restaurar posição e preferências após fechar à força ou trocar de aparelho. Conferir privacidade, contraste do tema personalizado e fonte de 12 a 36 px. |
| **4 — Grifos e sincronização** | Sobre CFI validado, criar RLS e armazenamento local de grifos. Estender fila com transporte, cursor, reenvio e exclusão. Implementar seleção em quatro cores, nota, lista por capítulo e status offline. | Dois usuários recebem grifos e exclusões, inclusive após modo avião e reenvio sem duplicar. Validar edição por autor e ancoragem após mudar a fonte. |
| **5 — Comentários em fio** | Reusar transporte e fila da sprint 4. Criar comentários com RLS, fio, avatars, ícone e contagens. | A grifa, B responde e A replica. Ambos veem o fio, inclusive após reconectar. Testar exclusão por autor e E2E com dois contextos. |
| **6 — Dicionário** | Usar a fonte e a licença aprovadas na sprint 0. Gerar prefixos PT/EN, detectar idioma do EPUB e tratar lemas e hífens. Integrar consulta, cache, atribuição e estado offline. | Medir cobertura da amostra de 100 palavras por idioma, com alvo proposto de 90%. Consultar em dois livros e verificar prefixo em cache e indisponível em modo avião. |
| **7 — Robustez e lançamento** | Validar atualização offline do PWA, diagnóstico, desempenho e acessibilidade. Escolher plano Supabase, testar restauração de backup e rodar beta antes de liberar o convite. | Completar o [roteiro de operação](sprint-7-operacao.md) no iPhone e Android, incluindo leitura, grifos e comentários em modo avião. Restaurar backup num banco novo e registrar o resultado do beta. |

## Sprint 0 em execução

1. **Fundação do repositório.** Salvar especificação e instruções, criar esqueleto Next.js, tokens iniciais, fontes locais, manifest, service worker e CI. Validar instalação, temas e shell offline em automação.
2. **Ambiente de preview e acesso.** Configurar preview na Vercel, projeto Supabase e credenciais Google OAuth. Documentar callbacks, renovação e teste no PWA instalado.
3. **Dicionário PT.** Inspecionar amostra real, qualidade das definições, tamanho e atribuição. Registrar a decisão antes do pipeline editorial.

O roteiro de validação, as evidências esperadas e as pendências desta sprint estão em [aceitação da sprint 0](sprint-0-aceitacao.md).

## Sprint 1 em execução

O catálogo de desenvolvimento em `/dev/design` começa com `Button`, `Text`
e `Heading`, além de `TextField` e `TextArea` com estados de erro e desabilitado. A validação manual dos componentes inclui foco por teclado,
toque em 320 px, texto ampliado e os painéis Dia e Noite. O fluxo com
convite depende da validação do Google OAuth instalado na sprint 0.

O banco de convites da sprint 1 inclui grupos, perfis, participações e RLS.
A [configuração do grupo](sprint-1-acesso.md) registra a criação do primeiro
organizador. A CI roda a suíte SQL do convite no Supabase local.

## Sprint 2 em execução

O bucket privado e a tabela `books` usam caminhos derivados de grupo e SHA-256.
A publicação, o livro atual e a ordenação são operações do organizador. Os
membros recebem acesso aos arquivos após a publicação. O primeiro livro
publicado é marcado como atual. O limite inicial é de 20 MiB por arquivo.

A estante extrai metadados no navegador, envia o EPUB diretamente ao Storage
por URL assinada e grava no IndexedDB apenas arquivos com SHA-256 conferido.
Ao perder a rede, a navegação para a estante abre a lista de livros baixados
na sessão local. O teste em aparelho real continua pendente.

## Sprint 3 em execução

O leitor abre EPUBs refluíveis do IndexedDB, oferece índice e navegação por
páginas e restaura o CFI salvo por conta, grupo e livro. Já permite tema
automático, dia ou noite, escala de 12 a 36 e texto com ou sem serifa.
O primeiro teste de navegação e restauração offline passou em Chromium.
A sincronização entre aparelhos, o tema personalizado e a avaliação em
iPhone e Android instalados continuam nesta sprint.

O progresso e as preferências de leitura agora são gravados localmente antes de
qualquer envio. Ao abrir, reconectar ou voltar ao app, o leitor sincroniza com
as tabelas privadas. Uma confirmação atrasada não descarta alterações mais
novas feitas no aparelho. O tema personalizado avisa quando o contraste é baixo.

## Sprint 4 em execução

O leitor exibe grifos das quatro cores, com nota opcional e edição e
exclusão pelo próprio autor. A lista agrupa por capítulo. Grifos feitos
offline entram no IndexedDB junto da fila e são enviados após reconectar.
O servidor oferece um cursor por livro e replica exclusões como tombstones.

A aceitação em aparelho real usa duas contas no mesmo grupo. Crie um grifo
no aparelho A em modo avião, confira que reaparece após reabrir o leitor,
reconecte A e aguarde o grifo em B. Mude o tamanho do texto em B e confira
a âncora. Apague em A e confira que some em B.

## Sprint 5 em execução

A conversa de cada grifo é um fio plano. A folha mostra autor, nota e
respostas em ordem cronológica. O autor da resposta pode apagá-la. O
aparelho conserva novas respostas sem rede e reusa a fila e o cursor dos
grifos para sincronizar ao reconectar. O teste em aparelhos reais usa dois
membros que respondem ao mesmo grifo e verifica a exclusão em ambos.

## Sprint 6 em execução

A seleção de uma palavra abre as definições no idioma do livro, tenta
lemas e formas com hífen e apresenta as atribuições do Wikcionário. Os
fragmentos consultados ficam disponíveis offline. O [processo do corpus](sprint-6-dicionario.md)
gera os arquivos e publica os fragmentos versionados no Supabase. O deploy da
Vercel mantém as consultas no domínio do app. A publicação em produção e a
revisão de precisão contextual em 100 palavras de cada idioma ainda estão pendentes.
