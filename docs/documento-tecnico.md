# Leitor EPUB Compartilhado — Documento Técnico

25/11/2026

## 1. Visão e escopo

Um PWA (iOS e Android) em que um grupo lê o mesmo EPUB: só grifos e comentários são compartilhados, e o progresso de leitura é de cada pessoa. O MVP atende um único grupo (cerca de 200 pessoas) com um único organizador. Este documento é a fonte de verdade para os agentes que vão construir o app.

**Decisões fechadas**

- **Acesso:** login com Google; na primeira vez, um código de convite único; depois o app abre direto no grupo. Do Google aparecem só nome e foto.
- **Grupo único, modelo preparado para vários:** `group_id` em todas as tabelas, sem nenhuma tela de grupos.
- **Estante:** vários livros, um deles "atual". Só o organizador adiciona livros (upload do EPUB) e todos leem o mesmo arquivo. O id do livro é o SHA-256 do arquivo.
- **Anotações:** grifos em 4 cores, nota opcional e respostas em comentários (threads).
- **Sem filtro de spoiler:** tudo sincroniza em segundo plano e cada leitor decide o que abrir. A lista de anotações é agrupada por capítulo, com o atual expandido e os demais recolhidos com contagem.
- **Progresso:** individual e privado, uma linha por pessoa e livro.
- **Dicionário PT e EN:** idioma detectado a partir do livro, sem alternância manual. **Índice** de capítulos (TOC) também entra.
- **Temas:** Automático (segue o sistema, padrão), Dia, Noite e Personalizado (fundo e texto à escolha, com aviso de contraste). Fonte de 12 a 36 px; o leitor escolhe serifa ou sem serifa para o texto do livro.
- **Offline é essencial:** ler, grifar e comentar sem conexão, sincronizando depois.
- **Membros:** sem remoção no MVP (o organizador faz isso manualmente no banco).

* **Sessão longa:** a pessoa não precisa fazer login de novo; a sessão se renova sozinha e só termina se ela sair (seção 2).
* **Estado do leitor nunca se perde:** tema, cores personalizadas, tamanho e família da fonte e a posição de leitura são gravados na hora, sincronizados e restaurados em qualquer aparelho.

- **Mobile first:** tudo é projetado e construído primeiro para celular em pé e só depois ajustado para telas maiores (regra 12 da seção 3).

**Fora do MVP**

- Interface de múltiplos grupos, mais de um organizador e remoção de membros.
- Modo de arquivo local com verificação de hash (a arquitetura deve permitir, mas não é construído).
- Busca no livro, leitura em voz alta, notificações e EPUBs de layout fixo.

## 2. Stack e arquitetura

Next.js cobre interface e servidor, e a Supabase fornece banco, login Google e armazenamento de arquivos. Não existe backend separado para escrever ou hospedar.

```text
APARELHO (PWA)                                      SERVIDOR: Vercel e Supabase

 Service worker      Reader (foliate-js) <-> Interface (Next.js + design system) --login--> Login Google (Supabase Auth, via Next.js)
 (app shell, fontes,                              ^
 ícones, dicionário,                              | lê e grava
 offline)                                         v
                                              IndexedDB (grifos, progresso, EPUBs)
                                                  ^
                                                  | lê e grava
                                                  v
                                              Motor de sync (fila e cursor) --> Postgres + RLS (grifos, comentários, progresso)
                                                                            --> Storage privado (EPUBs por link temporário)
```

A interface só lê e grava no IndexedDB; apenas o motor de sync fala com o Postgres e o Storage. O `Reader` recebe e devolve dados por props e callbacks.

| Camada | Escolha | Observação |
| --- | --- | --- |
| Framework | Next.js (App Router) + TypeScript | Interface, Route Handlers e Server Actions. O foliate-js roda só no cliente (import dinâmico, sem SSR). |
| PWA | Manifest + service worker (Serwist) | Cache do app shell, das fontes (self-hosted) e dos arquivos do dicionário. No iOS o app precisa ser instalado na Tela de Início. |
| Banco, auth, arquivos | Supabase: Postgres, Google OAuth, Storage privado | Acesso controlado por RLS; EPUB entregue por link temporário (signed URL). Cliente via `@supabase/ssr`. |
| Dados no aparelho | IndexedDB (`idb`) | Fila de operações, anotações, progresso, EPUBs baixados e dicionário em cache. |
| Leitor | foliate-js (MIT), vendorizado | Paginação, CFI e camada de grifos. O spike já validou abrir, grifar e restaurar posição no Chromium. |
| Estilo | CSS Modules + variáveis CSS (tokens) | Sem biblioteca de componentes de terceiros; primitivos sem estilo (Radix) para sheets, diálogos e menus. |
| Testes | Vitest, Testing Library, Playwright, Supabase CLI local | Detalhes na seção 9. |
| Hospedagem | Vercel (Hobby) + Supabase | O plano Hobby da Vercel é só para uso não comercial. |

**Princípios**

- **Local-first:** a interface lê do IndexedDB. Ler, grifar e comentar nunca esperam a rede.
- **O banco é a autoridade de acesso:** a RLS decide quem lê o quê; um erro na API não pode vazar dados.
- **A chave `service_role` não existe no cliente** nem em variáveis públicas.
- **Tudo que o app precisa offline é servido pelo próprio app:** fontes, dicionário, ícones e o shell.

**Sessão de login (não deve expirar sem necessidade)**

- O Google só identifica a pessoa; o app não guarda nem renova tokens do Google. O que mantém a pessoa logada é a sessão da Supabase: um token de acesso curto (JWT, padrão de 1 hora) e um token de renovação. Segundo a [documentação da Supabase](https://supabase.com/docs/guides/auth/sessions), por padrão a sessão dura indefinidamente, até a pessoa sair; o token de renovação não expira, mas é de uso único e trocado a cada renovação.
- Configuração do projeto: não ativar "Time-box user sessions" nem "Inactivity timeout" (desligados por padrão). Registrar isso em `docs/` e conferir no projeto de produção.
- Cliente: `persistSession` e `autoRefreshToken` ligados; sessão em cookies via `@supabase/ssr`, renovada pelo middleware do Next.js a cada requisição. O app também renova ao voltar ao primeiro plano (`visibilitychange`) e ao reconectar.
- Offline por dias: o token de acesso expira, mas ler, grifar e comentar continuam locais. Ao reconectar, o motor de sync renova a sessão antes de enviar e repete a operação se receber 401.
- Falha de rede ao renovar nunca desloga. Só uma recusa definitiva do servidor (token de renovação inválido) leva à tela de login, e a fila local é preservada e enviada depois do novo login.
- Testes: expiração simulada com token de acesso de poucos segundos no Supabase local, renovação silenciosa, falha de rede durante a renovação e abas concorrentes sem deslogar.

## 3. Regras para agentes (conteúdo do AGENTS.md)

Este bloco vira o `AGENTS.md` na raiz do repositório e vale para todo agente, em toda tarefa. Quando uma regra conflitar com uma instrução de tarefa, o agente para e pergunta em vez de escolher.

1. **O design system é a única fonte de UI.** Cores, espaçamentos, tipografia, raios, sombras e durações vêm de tokens em `src/design-system/tokens`. Nenhum valor literal (hex, px solto, ms) em componentes de feature.
2. **Reutilize antes de criar.** Antes de criar um componente, hook ou utilitário:
   1. Procure em `src/design-system` e `src/features` (nome, propósito e usos parecidos).
   2. Se algo igual ou similar existir, use-o ou estenda-o por props ou variantes.
   3. Só crie um novo se nenhum existente puder ser adaptado com uma mudança pequena. Na descrição do PR, registre o que foi procurado e por que não serviu.
3. **Componente reutilizável nasce no design system.** Vai em `src/design-system/components/<Nome>/`, com tipos, variantes por props, todos os estados (hover, foco, desabilitado, carregando), suporte aos temas, entrada no catálogo e testes. Um componente de uso único vive na feature e compõe peças do design system.
4. **Harmonia visual antes de tudo.** Todo componente novo precisa parecer da mesma família: mesma escala de espaçamento, mesmos raios, mesma tipografia (Newsreader para o texto de leitura e títulos editoriais, Inter para a interface), transições suaves e discretas, acento terracota. O âmbar é só para grifos e decoração, nunca para texto. Confira nos temas Dia e Noite antes de entregar.
5. **Acessibilidade é requisito.** Contraste mínimo WCAG AA, alvos de toque de pelo menos 44 px, foco visível, rótulo em todo ícone, e respeito a `prefers-reduced-motion`.
6. **Testes acompanham o código.** Unitários para lógica pura (sync, CFI, lematização, parsing); de componente para o design system (render, variantes, interação, a11y); de integração onde camadas se cruzam (sync com Supabase local, políticas RLS, entrada por código); e2e para os fluxos críticos de cada sprint. Corrigiu um bug? Escreva o teste de regressão.
7. **Segurança de dados.** Toda tabela nova nasce com RLS ligada e testes de política (membro lê, não membro não, autor edita só o que é seu). Nunca coloque `service_role` no cliente.
8. **Local-first.** Telas de leitura leem do IndexedDB; nenhuma ação de ler, grifar ou comentar pode ser bloqueada pela rede. Preferências (tema, tamanho, fonte) e posição de leitura são gravadas na hora e nunca se perdem; a sessão de login só termina quando a pessoa sai.
9. **Mudanças pequenas e dentro do escopo.** Um PR por tarefa, dentro da sprint ativa. Sem refatorações não pedidas. Nova dependência só com justificativa de tamanho, licença e manutenção.
10. **Contratos documentados.** Mudou schema, tokens ou API? Atualize este documento no mesmo PR.
11. **Textos de interface em pt-BR**, num arquivo de mensagens único (sem strings soltas nos componentes). Código e comentários em inglês. Esta é uma proposta; ajuste se preferir outro padrão.

**Regra 12: mobile first**

- Toda tela e componente nasce para celular em pé, com largura mínima de 320 px e referência de design de 390 × 844 px. Telas maiores ganham ajustes com media queries `min-width`, nunca o contrário.
- Em tablet e desktop não há layout novo: o conteúdo fica numa coluna centralizada de largura máxima, e as `Sheet` mantêm a largura dessa coluna (proposta).
- Barras e sheets respeitam a área segura do iPhone com `env(safe-area-inset-*)`; o app usa `viewport-fit=cover` e `dvh` no lugar de `vh`.
- Campos de texto dentro de sheets (nota, resposta, código) não podem ficar cobertos pelo teclado virtual; use `visualViewport` e teste isso.
- Celular deitado precisa funcionar sem quebrar o leitor; as barras podem encolher.
- Nenhuma ação depende de hover. Alvos de toque de pelo menos 44 px e ações principais ao alcance do polegar, na metade inferior da tela.

**Checklist antes de abrir um PR**

- [ ] Procurei componentes e utilitários existentes e registrei o resultado
- [ ] Nenhum valor visual literal fora dos tokens
- [ ] Testado nos temas Dia e Noite e com texto grande
- [ ] Testes novos e antigos passam; lint e typecheck limpos
- [ ] Tabelas novas têm RLS e testes de política
- [ ] Este documento reflete qualquer contrato alterado

* [ ] Conferi a tela em 320 px, em celular deitado e em tela grande, com a área segura e o teclado virtual

## 4. Design system

A direção é "papel e tinta": superfícies quentes, tinta escura, acento terracota e transições discretas. O mock em canvas é a referência visual; esta seção fixa as regras para que o código não se desvie dele. Os valores abaixo vêm do mock, exceto os marcados como proposta.

**Tokens de cor (semânticos)**

| Token | Dia | Noite | Uso |
| --- | --- | --- | --- |
| `--color-bg` | `#FAF5EC` | `#17130F` | Fundo da leitura e das telas |
| `--color-surface` | `#F1E9DA` | `#221C17` | Cartões, sheets, barras |
| `--color-ink` | `#2B2420` | `#E8DFD2` | Texto principal |
| `--color-muted` | `#6E6258` | `#A89B8C` | Texto secundário |
| `--color-accent` | `#B5532F` | `#E08A64` | Ações e destaques de interface |
| `--color-accent-text` | `#9E4524` | `#E08A64` | Acento usado como texto sobre o fundo |
| `--color-amber` | `#C98A1B` | `#E3A94A` | Só grifo e decoração, nunca texto |

Cores de grifo (iguais nos dois temas, aplicadas com transparência): âmbar, verde `#8FB573`, azul `#7FA6C9` e rosa `#D98BA0`.

**Temas**

- O tema vive em `data-theme` no elemento raiz: `auto`, `day`, `night` ou `custom`. `auto` é o padrão e segue `prefers-color-scheme`, reagindo em tempo real.
- `custom` define só `--color-bg` e `--color-ink`; o restante deriva deles com `color-mix`. Se o contraste ficar abaixo de 4,5:1, a interface mostra um aviso e não bloqueia.
- O tamanho (`--reader-font-size`, 12 a 36 px) e a família do texto do livro (`--reader-font-family`: serifa ou sem serifa) são preferências do leitor, independentes do tema.
- Os contrastes de todos os pares de token têm teste automatizado nos temas Dia e Noite.

**Tipografia, espaço e movimento**

- Newsreader (serifa) para o texto de leitura e títulos editoriais; Inter para a interface. Ambas servidas pelo próprio app, nunca por link externo.
- Escala de espaçamento em múltiplos de 4 px (proposta: 4, 8, 12, 16, 24, 32, 48). Raios em três níveis (proposta: 6, 12, 20 px).
- Movimento: transições de opacidade e deslocamento curtos (proposta: 150 ms e 250 ms, curva ease-out), desligadas sob `prefers-reduced-motion`.

**Catálogo inicial de componentes**

| Componente | Onde é usado | Variantes e estados |
| --- | --- | --- |
| `Button` | Todas as telas | primário, secundário, discreto, ícone; carregando, desabilitado |
| `Sheet` | Dicionário, ajustes, lista de anotações, índice | alturas parcial e total; arrastar para fechar |
| `Dialog` | Confirmações, código de convite | com e sem ação destrutiva |
| `Bar` (superior e inferior) | Chrome do leitor | visível e oculta, com fade |
| `SegmentedControl` | Tema, serifa ou sem serifa | 2 a 4 opções |
| `Slider` | Tamanho da fonte | com valor visível |
| `SwatchPicker` | Cor do grifo, cores do tema personalizado | cores fixas e livre |
| `TextField` e `TextArea` | Nota, resposta, código de convite | erro, desabilitado |
| `Avatar` | Autor de grifo e comentário | foto e iniciais |
| `BookCover` e `BookCard` | Estante | livro atual, com progresso |
| `ListRow` | Anotações, capítulos, resultados | com contagem, recolhido e expandido |
| `Badge` | Contagem de anotações por capítulo | neutro e acento |
| `StatusBanner` e `Toast` | Offline, sincronizando, erros | informativo, aviso, erro |
| `Text` e `Heading` | Todo texto | escalas de interface e de leitura |
| `Skeleton` e `EmptyState` | Carregamentos e listas vazias | — |

**Estrutura e governança**

- `src/design-system/tokens` (CSS e export em TS), `themes`, e `components/<Nome>/` com `Nome.tsx`, `Nome.module.css`, `Nome.test.tsx` e `index.ts`.
- O catálogo é uma rota interna `/dev/design` (só em desenvolvimento) que mostra todo componente em todas as variantes e nos temas Dia e Noite. Ela também serve de alvo para capturas de tela nos testes. Esta é uma proposta no lugar de Storybook, para não somar outra ferramenta.
- Mudar um token ou componente do design system exige atualizar o catálogo e os testes no mesmo PR. Features nunca sobrescrevem estilos do design system; pedem uma variante nova.

* O catálogo `/dev/design` mostra cada componente em 320, 390 e 768 px. Componentes são fluidos (sem larguras fixas em px, salvo ícones e alvos de toque) e não dependem de hover.

## 5. Modelo de dados, RLS e convite

Toda tabela de conteúdo carrega `group_id`, mesmo com um único grupo no MVP, para que múltiplos grupos não exijam migração de dados. Os ids de grifos e comentários são UUIDs gerados no cliente, o que permite criar offline e enviar depois sem duplicar.

| Tabela | Campos principais | Observação |
| --- | --- | --- |
| `profiles` | `id` (= usuário do auth), `display_name`, `avatar_url` | Preenchida a partir do Google: só nome e foto. |
| `groups` | `id`, `name` | Sem dados sensíveis. |
| `group_invites` | `group_id`, `code` | Tabela à parte, para que só o organizador possa lê-la. |
| `memberships` | `user_id`, `group_id`, `role` (`organizer` ou `member`), `joined_at` | Criada apenas pela função de convite. |
| `books` | `id`, `group_id`, `file_hash` (SHA-256), `title`, `author`, `language`, `file_path`, `cover_path`, `position`, `is_current` | `(group_id, file_hash)` único. |
| `annotations` | `id`, `group_id`, `book_id`, `author_id`, `cfi`, `color`, `quote_text`, `note`, `updated_at`, `deleted_at` | O grifo e a nota do próprio autor. |
| `comments` | `id`, `group_id`, `book_id`, `annotation_id`, `author_id`, `text`, `created_at`, `updated_at`, `deleted_at` | Respostas de qualquer membro a um grifo, em fio plano e ordem cronológica. |
| `progress` | `user_id`, `book_id`, `group_id`, `cfi`, `fraction`, `updated_at` | Chave `(user_id, group_id, book_id)`. Privada. |
| user\_preferences | user\_id (chave), theme, custom\_bg, custom\_ink, font\_size, font\_family, updated\_at | Uma linha por pessoa; vale em todos os aparelhos. Privada. |

As respostas têm um nível só: cada grifo tem um fio de comentários, sem respostas a respostas. Se quiser aninhamento, é só acrescentar `parent_id` em `comments`; confirme antes da sprint 3.

**Regras de acesso (RLS ligada em todas as tabelas)**

| Tabela | Quem lê | Quem escreve |
| --- | --- | --- |
| `profiles` | A própria pessoa e membros do mesmo grupo | Cada pessoa, só o próprio perfil |
| `groups` | Membros | Ninguém pelo app |
| `group_invites` | Organizador | Organizador |
| `memberships` | Membros do grupo | Ninguém direto; só `join_group` |
| `books` | Membros | Organizador |
| `annotations` e `comments` | Membros | O autor, apenas as próprias linhas (`author_id = auth.uid()`); apagar é marcar `deleted_at` |
| `progress` | Só o dono | Só o dono |
| Storage (bucket `books`, caminho `<group_id>/<file_hash>.epub`) | Membros do grupo do caminho | Organizador |
| user\_preferences | Só o dono | Só o dono |

**Entrada por código de convite**

- A função `join_group(code)` roda com privilégio no servidor: valida o código e cria a participação como membro. A RPC devolve uma linha com `status` (`joined`, `invalid_code` ou `rate_limited`) e `group_id` quando a entrada é confirmada. Repetir uma entrada é seguro e preserva o papel já atribuído. A participação inicial do organizador é criada na configuração administrativa.
- O código é aleatório, com no mínimo 16 caracteres (base32). Tentativas erradas são limitadas a cinco por usuário numa janela de 15 minutos. A janela começa na primeira tentativa errada, e só a RPC acessa o contador.
- O grupo e o primeiro organizador são criados por seed/migration. Remover membro e trocar o código são operações manuais no banco, por decisão de escopo.

**Campos de sincronização:** `updated_at` é sempre preenchido por trigger no servidor (não pelo relógio do aparelho), e há índice em `(group_id, updated_at)` nas tabelas sincronizadas. As políticas têm testes SQL próprios (`supabase test db`): membro lê, não membro não, autor edita o seu, ninguém edita o alheio, progresso alheio é invisível.

## 6. Sincronização local-first

O aparelho é a fonte da interface: toda ação grava primeiro no IndexedDB e depois vai ao servidor. O motor de sync fica em `src/lib/sync/` e conversa com o servidor por uma interface `SyncTransport`, o que permite testá-lo com um servidor falso.

**Escrita**

1. A pessoa grifa, comenta ou muda de página; a linha é gravada localmente com um UUID gerado no cliente e a interface atualiza na hora.
2. Uma operação entra na fila (`outbox`). Quando há conexão, a fila é enviada com `upsert` por id; reenviar a mesma operação é seguro.
3. O servidor carimba `updated_at`. Ao receber a confirmação, a operação sai da fila.
4. Apagar é gravar `deleted_at` (a linha continua existindo), para que a remoção chegue aos outros aparelhos.

**Leitura**

- O app busca, por livro da estante, as linhas de `annotations` e `comments` com `updated_at` maior que o cursor guardado, ordenadas por `(updated_at, id)`, em páginas, até esvaziar. As apagadas vêm junto e removem a linha local. O livro atual é sincronizado primeiro.
- Conflito: vence a escrita com o `updated_at` mais recente do servidor. Como cada linha tem um único autor, isso só importa para a mesma pessoa em dois aparelhos.
- O progresso é uma linha por pessoa e livro. Cada virada de página grava a posição no IndexedDB na hora (no máximo uma gravação a cada 250 ms, sempre com a última garantida) e de novo ao esconder ou fechar o app (visibilitychange e pagehide), para que fechar o app à força não perca a página. O envio ao servidor ocorre em até alguns segundos (proposta: 10 s) e também ao esconder o app. Ao abrir o livro, vale a posição mais recente entre a local e a do servidor.

* As preferências (tema, cores personalizadas, tamanho e família da fonte) são uma linha por pessoa em `user_preferences`: gravadas no aparelho no instante da mudança e enviadas pela mesma fila. Vale a escrita mais recente, e valem em todos os aparelhos da pessoa.

**Quando sincroniza**

- Ao abrir o app, ao voltar ao primeiro plano, ao detectar `online`, logo depois de cada mudança local (com atraso curto) e periodicamente enquanto o app está aberto.
- Não dependemos de Background Sync: pelo que sei o Safari no iPhone não o suporta (a confirmar no aparelho). No Android ele pode ser um extra, nunca o mecanismo principal.
- Realtime da Supabase fica fora do MVP; a consulta periódica basta para o tamanho do grupo.

**Arquivos do livro**

- O EPUB é baixado por link temporário, conferido contra o `file_hash` (SHA-256) e guardado no IndexedDB. O app pede armazenamento persistente (`navigator.storage.persist()`).
- A estante mostra, por livro, se ele já está disponível offline e permite baixar.

**Estado visível:** o `StatusBanner` mostra offline, sincronizando, ou erro com “tentar de novo”. Falhas usam espera crescente entre tentativas.

**Testes obrigatórios do motor:** criar offline e sincronizar ao voltar; mesma operação reenviada sem duplicar; apagar em um aparelho e sumir no outro; dois clientes na mesma paginação por cursor; falha de rede no meio de um lote; corrupção do arquivo detectada pelo hash.

## 7. Leitor, temas e preferências

O leitor usa o foliate-js, vendorizado em `src/vendor/foliate/` (só EPUB). O spike validou no Chromium: abrir, grifar, editar nota, trocar tema e fonte, restaurar posição e navegar por toque nas bordas. O iOS Safari ainda não foi testado.

**Contrato do componente `Reader`**

- Entrada: o arquivo do livro, a posição inicial (CFI) e as preferências. Saídas: eventos de posição (`relocate`), de seleção e de toque em grifo. O `Reader` não conhece Supabase nem sync; fala com o resto só por props e callbacks.
- Grifos são ancorados por CFI e desenhados como retângulos translúcidos na camada do foliate. Quem tem comentários mostra um ícone discreto de balão ao lado do grifo, sem cartão de nota aberto.
- Barra de seleção: 4 cores de grifo, botão “Nota” e, quando a seleção é uma única palavra, botão “Definir”. Selecionar uma palavra nunca abre o dicionário sozinho; só o botão abre. Não há seletor de idioma.
- Toque nas bordas troca de página e toque no centro mostra ou esconde as barras (fade, sem deslocar o texto). As coordenadas do toque são convertidas para a tela, porque o conteúdo fica num iframe largo.

**Preferências de leitura** (guardadas por pessoa, no aparelho e no servidor)

- Tema: automático, dia, noite ou personalizado (seção 4). Tamanho: 12 a 36 px. Família: serifa ou sem serifa. Todas aplicam sem recarregar o livro e sem perder a posição.
- Ao mudar tamanho ou família, o app preserva a posição pelo CFI atual, já que as páginas se reorganizam.

* Toda mudança (tema, cores personalizadas, tamanho, família) é gravada no aparelho no instante em que acontece e sincronizada com o servidor; ao reabrir o app ou entrar em outro aparelho, tudo volta como estava.
* As preferências são aplicadas antes da primeira pintura da tela: um script inline lê a cópia local e define `data-theme` e as variáveis, para o app não piscar no tema errado ao abrir.

**Índice (TOC) e lista de anotações**

- O índice vem do próprio EPUB e abre num `Sheet`; tocar leva ao capítulo.
- A lista de anotações é agrupada por capítulo: o atual vem expandido, os outros recolhidos com um `Badge` de contagem. Cada item mostra trecho, autor (`Avatar` e nome) e o fio de comentários; tocar leva ao trecho no livro.

**Pontos de atenção conhecidos**

- A seleção de texto e a paginação no iOS Safari precisam de teste em aparelho real antes de se considerar o leitor pronto.
- Anotações de livros diferentes não se misturam: o id do livro é o hash do arquivo, então outra edição do mesmo título é outro livro.

## 8. Dicionário PT e EN

O dicionário funciona sem servidor e sem API paga: arquivos estáticos por prefixo de palavra, baixados sob demanda e guardados em cache. A fonte dos dados para português é a extração bruta do Wikcionário em português publicada pelo Kaikki. A [decisão da sprint 0](sprint-0-dicionario-pt.md) registra licença, amostra e limitações.

**Fontes candidatas**

| Opção | Vantagem | Problema a verificar |
| --- | --- | --- |
| Wikcionário em português (extração própria a partir dos dumps) | Definições em português; licença livre com atribuição | Não confirmei se existe extração pronta; pode exigir escrever o pipeline. |
| Wikcionário via kaikki.org (JSON por idioma) | Pronto para uso; liga formas flexionadas ao lema (`form_of`) | Os dados de português vêm do Wikcionário em inglês, com definições em inglês. Serve bem para o livro em inglês. |
| Dicionário Aberto | Gratuito, em português | Baseado numa edição de 1913 (ortografia e vocabulário antigos); licença exata não confirmada. |

Para inglês, a opção do kaikki atende. A licença do Wikcionário exige atribuição e compartilhamento pela mesma licença (CC BY-SA, a confirmar na fonte), então a folha do dicionário sempre mostra a fonte da definição.

**Como funciona**

1. **Pipeline de build** (`scripts/dict/`): baixa o dump, gera um arquivo JSON por prefixo de palavra (`public/dict/<idioma>/<prefixo>.json`) com lema, classe gramatical, definições e formas. Roda fora do app, e o resultado entra no deploy.
2. **Idioma do livro:** vem de `dc:language` do EPUB; se faltar, uma heurística sobre o texto; se ainda assim falhar, português. Não há alternância manual.
3. **Consulta:** normaliza a palavra tocada (caixa, pontuação), busca no arquivo do prefixo e, se for forma flexionada, segue para o lema. Em português, formas com próclise ou ênclíse (“recitando-me”) tentam primeiro o radical antes do hífen. A lematização de conjugações é o ponto mais frágil e é tratada como melhor esforço.
4. **Cache e offline:** o service worker guarda os prefixos já consultados. Sem conexão e sem o prefixo em cache, a folha mostra o estado “Sem conexão” com “Tentar de novo”. Um pacote completo para baixar de uma vez entra se o tamanho medido for razoável.
5. **Folha do dicionário:** palavra, classe gramatical, idioma, “no texto: \<forma encontrada>”, definições e a fonte.

**Critério de qualidade (proposta):** numa amostra de 100 palavras tiradas de um livro real em português, incluindo verbos conjugados, plurais e formas com pronome, pelo menos 90% devem resolver para uma definição correta. A mesma amostra, em inglês, para um livro em inglês. O número é um ponto de partida para o Gian ajustar.

## 9. Repositório e estratégia de testes

```text
/
├─ AGENTS.md                 regras da seção 3
├─ docs/                     este documento e decisões (ADRs)
├─ public/                   fonts/  dict/  icons/  manifest
├─ scripts/dict/             pipeline do dicionário
├─ supabase/                 migrations/  seed.sql  tests/ (RLS)
├─ e2e/                      Playwright
└─ src/
   ├─ app/                   rotas Next.js: login, convite, estante, leitor
   ├─ design-system/         tokens/  themes/  components/
   ├─ features/              auth  invite  shelf  reader  annotations
   │                          dictionary  settings
   ├─ lib/                   sync  db  supabase  epub  messages
   └─ vendor/foliate/
```

**Regras de dependência (impostas por lint, `eslint-plugin-import`)**

- `design-system` não importa de `features` nem de `lib`.
- Uma `feature` importa de `design-system` e `lib`, e de outra feature só pelo `index.ts` público dela.
- Rotas em `app/` só compõem features; não têm lógica própria.

**Pirâmide de testes**

| Tipo | Ferramenta | O que cobre | Quando roda |
| --- | --- | --- | --- |
| Unitário | Vitest | Lógica pura: motor de sync, ordenação por CFI e capítulo, detecção de idioma, lematização, contraste, parsing | Todo PR |
| Componente | Vitest + Testing Library + axe | Design system e telas: variantes, estados, interação, acessibilidade | Todo PR |
| Banco e RLS | `supabase test db` | Políticas de acesso, `join_group`, limite de tentativas | Todo PR |
| Integração | Vitest + Supabase local (CLI) | Sync contra Postgres real, upload e download de livro, sessões de dois usuários | Todo PR |
| E2E | Playwright | Fluxos críticos de cada sprint, incluindo dois navegadores e modo offline simulado | Todo PR e antes de cada release |
| Visual | Playwright sobre `/dev/design` | Capturas de cada componente nos temas Dia e Noite | Mudanças no design system |
| Aparelho real | Roteiro manual | Login no PWA instalado, seleção de texto, offline, no iPhone e no Android | Fim de cada sprint |

- A CI (por exemplo GitHub Actions) roda lint, typecheck e todos os testes automáticos em todo PR; nada entra com a CI vermelha.
- Como não há Mac para depurar o Safari do iPhone, o app inclui um painel de diagnóstico simples nos Ajustes (versão, estado do sync, erros recentes), para que falhas de aparelho real possam ser lidas sem ferramentas de desenvolvedor.
- Cada sprint tem um roteiro manual de aceitação em `docs/` que o Gian segue no celular; ele faz parte da definição de pronto.

* Os testes de componente e os e2e do Playwright rodam também com emulação de celular (por exemplo 320 × 568 e 390 × 844, com toque em vez de mouse), além do desktop. A emulação não substitui o roteiro em aparelho real.

## 10. Plano de sprints

São 8 sprints (0 a 7), em sequência. Cada uma termina com algo que o Gian consegue usar no celular, e a próxima só começa com a anterior aceita. As sprints não têm duração estimada: o escopo é o que importa.

| Sprint | Foco | Parte testável ao final |
| --- | --- | --- |
| 0 | Fundação e riscos | PWA instalável no iPhone e no Android, com login Google funcionando |
| 1 | Design system e acesso | Pessoa nova entra com Google e código de convite e cai no grupo |
| 2 | Estante e livros | Organizador envia um EPUB; outro usuário vê e baixa |
| 3 | Leitor | Ler um livro inteiro, com índice, temas, fonte e posição salva |
| 4 | Grifos e sync | Grifo de uma pessoa aparece para outra, inclusive criado offline |
| 5 | Comentários | Conversa em fio sobre um grifo entre duas pessoas |
| 6 | Dicionário | Tocar numa palavra e ver a definição, em PT e EN, com offline |
| 7 | Robustez e lançamento | Roteiro completo no aparelho real e convite aberto ao grupo |

**Definição de pronto geral (vale para toda sprint, além da própria)**

- CI verde: lint, typecheck e todos os testes automáticos.
- Testes novos para o que foi construído, no nível certo da pirâmide (seção 9).
- Regras do `AGENTS.md` cumpridas: sem componentes duplicados, sem valores visuais fora dos tokens, temas Dia e Noite conferidos.
- Roteiro manual da sprint executado em aparelho real e anotado em `docs/`.
- Deploy de preview funcionando e este documento atualizado se algum contrato mudou.

* Telas novas conferidas em 320 px, 390 px, celular deitado e tela grande, com área segura e teclado virtual.

### Sprint 0 — Fundação e riscos

**Objetivo:** ter o esqueleto rodando de ponta a ponta e matar os dois maiores riscos antes de construir em cima deles.

- Repositório Next.js + TypeScript com a estrutura da seção 9, lint, typecheck, Vitest, Playwright e CI.
- `AGENTS.md` com as regras da seção 3. Supabase local (CLI) e um projeto Supabase real, ligados à Vercel.
- PWA mínimo: manifest, ícones, service worker com app shell e fontes self-hosted.
- Tokens e tema automático, dia e noite, aplicados numa página de teste.
- **Spike 1:** login Google dentro do PWA instalado no iPhone. Inclui verificar que a sessão se renova sozinha e continua ao fechar e reabrir o app. Resultado documentado, com alternativa se falhar.
- **Spike 2:** fonte de dados do dicionário em português decidida, com amostra real (seção 8).

**DoD:** o app instala pela Tela de Início no iPhone e no Android, abre offline mostrando o shell, e o login Google funciona no PWA instalado (ou há decisão escrita sobre a alternativa). A decisão do dicionário está registrada com licença conferida.

**Teste de aceitação:** instalar no iPhone, entrar com Google, ver nome e foto, desligar a rede e reabrir o app.

### Sprint 1 — Design system e acesso

**Objetivo:** o design system v1 existe e a porta de entrada do app funciona.

- Componentes: `Button`, `Text`, `Heading`, `TextField`, `TextArea`, `Dialog`, `Sheet`, `Avatar`, `StatusBanner`, `Toast`, `Skeleton`, `EmptyState`, e a rota `/dev/design` com todos nos temas Dia e Noite.
- Banco: `profiles`, `groups`, `group_invites`, `memberships`, a função `join_group`, seed do grupo e do organizador, políticas RLS e seus testes.
- Telas: login, código de convite, e uma estante vazia como destino.

* Sessão longa conforme a seção 2: renovação automática, middleware do Next.js e Auth sem time-box nem inactivity timeout.

**DoD:** pessoa nova entra com Google, digita o código e chega à estante do grupo; código errado mostra erro claro; o limite de tentativas bloqueia; quem não é membro não lê nada (testes SQL); a sessão sobrevive a fechar e reabrir o PWA e se renova sozinha, sem pedir login de novo (teste com token de acesso de poucos segundos no Supabase local); todos os componentes têm teste de render, variantes e acessibilidade.

**Teste de aceitação:** com uma conta Google nova, percorrer o fluxo no celular, depois errar o código de propósito.

### Sprint 2 — Estante e livros

**Objetivo:** o organizador coloca livros no grupo e os membros os recebem no aparelho.

- Tabela `books`, bucket privado e políticas (leitura por membros, escrita pelo organizador).
- Fluxo do organizador (visível só para ele): escolher o EPUB, calcular o SHA-256, extrair título, autor, capa e idioma, enviar, marcar como livro atual e ordenar.
- Estante com `BookCover` e `BookCard`, livro atual em destaque, estado “disponível offline” e ação de baixar.
- Download por link temporário, conferência do hash e armazenamento no IndexedDB, com pedido de armazenamento persistente.

**DoD:** um EPUB real enviado pelo organizador aparece na estante de outra conta e baixa com sucesso; um arquivo adulterado é recusado pelo hash; um membro comum não vê a ação de enviar e o storage recusa o envio dele (testes); o mesmo arquivo enviado duas vezes não duplica o livro.

**Teste de aceitação:** enviar um livro pelo celular do organizador, baixar em outro aparelho e abrir a estante em modo avião.

### Sprint 3 — Leitor

**Objetivo:** ler de verdade, com todas as comodidades de um e-reader, ainda sem anotações.

- Componente `Reader` sobre o foliate-js (contrato da seção 7), toque nas bordas, barras com fade.
- Progresso individual: gravado no IndexedDB, enviado à tabela `progress` (privada) e restaurado ao abrir; a posição é gravada a cada virada de página e ao esconder o app (seção 6).
- Índice do livro num `Sheet`.
- Ajustes de leitura: tema automático, dia, noite e personalizado (com aviso de contraste), tamanho de 12 a 36 px, serifa ou sem serifa.

* Preferências por pessoa (`user_preferences`): tema, cores personalizadas, tamanho e família da fonte, gravadas na hora, sincronizadas e aplicadas antes da primeira pintura. Esta sprint entrega a versão mínima do motor de sync (fila e envio por `upsert`) para `progress` e `user_preferences`; a sprint 4 a estende para grifos.

**DoD:** um livro real é lido do começo ao fim no iPhone e no Android; fechar e reabrir volta à mesma página, também em outro aparelho da mesma conta; trocar tema, tamanho ou família mantém a posição; o progresso de uma pessoa é inacessível a outra (teste RLS); tema, cores personalizadas, tamanho e família da fonte e a página atual voltam iguais ao abrir o app em outro aparelho; matar o app à força logo após virar a página não perde a posição; o app abre já no tema certo, sem piscar; a seleção de texto e a paginação no iOS Safari foram verificadas em aparelho real e os problemas registrados.

**Teste de aceitação:** ler alguns capítulos, mudar o tema e a fonte no meio de uma página, fechar o app, reabrir em outro aparelho.

### Sprint 4 — Grifos e sincronização

**Objetivo:** grifos compartilhados que funcionam offline, a parte mais crítica do produto.

- Tabela `annotations`, armazenamento local, fila de operações e a extensão do motor de sync da sprint 3 (busca por cursor, seção 6), com `SyncTransport` e testes.
- No `Reader`: barra de seleção com 4 cores e “Nota”, desenho dos grifos por CFI, editar e apagar os próprios.
- Lista de anotações agrupada por capítulo, com o atual expandido e os demais recolhidos com contagem; tocar leva ao trecho.
- `StatusBanner` com offline, sincronizando e erro.

**DoD:** o grifo de A aparece para B na próxima rodada de sync; um grifo criado em modo avião sincroniza ao voltar a conexão, sem duplicar; apagar em um aparelho some no outro; ninguém edita ou apaga grifo alheio (teste RLS); os testes do motor da seção 6 passam; os grifos continuam no lugar certo após mudar tamanho de fonte.

**Teste de aceitação:** dois celulares, duas contas, o mesmo livro; grifar em um com o outro aberto, depois repetir com um deles em modo avião.

### Sprint 5 — Comentários em fio

**Objetivo:** conversa entre leitores em cima de um trecho.

- Tabela `comments`, sync de comentários reaproveitando o motor da sprint 4 (sem código de sync duplicado).
- Fio de comentários num `Sheet`, com `Avatar` e nome, resposta de qualquer membro, apagar o próprio.
- Ícone discreto de comentário ao lado do grifo, e contagem de comentários na lista por capítulo.

**DoD:** A grifa com nota, B responde, A responde de volta, e ambos veem o fio completo; o ícone aparece só onde há comentário; funciona offline como os grifos; membros não apagam comentário alheio (teste RLS); o e2e com dois navegadores cobre o fio inteiro.

**Teste de aceitação:** repetir a conversa entre dois aparelhos e conferir o ícone e a contagem.

### Sprint 6 — Dicionário

**Objetivo:** consultar palavras sem sair do livro, em português e inglês.

- Pipeline de build, arquivos por prefixo, cache pelo service worker e a decisão de fonte da sprint 0.
- Detecção do idioma pelo livro, consulta com resolução de lema e tratamento de formas com hífen.
- Folha do dicionário, com a atribuição da fonte, o estado “Sem conexão” e o botão na barra de seleção.

**DoD:** a amostra de 100 palavras da seção 8 atinge o critério, em português e em inglês; palavras já consultadas funcionam em modo avião; o estado sem conexão aparece quando falta o prefixo; a fonte e a licença ficam visíveis; a lematização tem testes unitários com casos reais de verbos e pronomes.

**Teste de aceitação:** num livro em português e num em inglês, tocar em dez palavras variadas, incluindo verbos conjugados, e repetir uma delas sem rede.

### Sprint 7 — Robustez e lançamento

**Objetivo:** deixar o app confiável para um grupo de cerca de 200 pessoas.

- Revisão do service worker: app inteiro offline, aviso de nova versão disponível, limpeza de caches antigos.
- Painel de diagnóstico nos Ajustes (versão, estado do sync, erros recentes).
- Operação: backup do banco com restauração testada, decisão sobre o plano da Supabase (o gratuito pausa projetos parados e não inclui backups automáticos), monitoramento básico de erros.
- Passada de acessibilidade, desempenho de abertura do livro e e2e completo do roteiro.
- Beta com poucas pessoas antes de abrir o código para o grupo.

**DoD:** o e2e completo passa; o roteiro de aparelho real passa no iPhone e no Android; ler, grifar e comentar em modo avião funciona para o que já foi baixado; um backup foi restaurado num banco novo com sucesso; o plano da Supabase está decidido; o beta rodou sem erro bloqueante.

**Teste de aceitação:** o roteiro completo, do convite ao fio de comentários, com pessoas reais do grupo.

## 11. Riscos, validações pendentes e pós-MVP

Os riscos abaixo ainda não foram verificados em aparelho real ou na fonte; cada um tem a sprint em que é resolvido.

| Risco | Por que importa | Mitigação | Sprint |
| --- | --- | --- | --- |
| Login Google no PWA instalado no iPhone | A evidência que vi é mista; sem login o app não abre | Testar cedo em aparelho real; se falhar, alternativa de entrada por link ou código por e-mail | 0 |
| Dados de dicionário em português | Definições em inglês ou vocabulário antigo não servem ao leitor | Decidir a fonte com amostra real; pipeline próprio a partir do Wikcionário em português se preciso | 0 e 6 |
| Licença e atribuição do dicionário | Uso e redistribuição dos dados dependem dela | Conferir a licença na fonte antes de publicar; mostrar a atribuição na folha | 0 |
| Seleção de texto e paginação no iOS Safari | O spike não pôde ser testado em WebKit | Roteiro em iPhone real na sprint 3, antes de grifos | 3 |
| Sync em segundo plano no iOS | Pelo que sei, o Safari não suporta Background Sync; a confirmar | Sync com o app aberto (abrir, voltar ao primeiro plano, `online`, periódico) | 4 |
| Limpeza de dados do Safari | No iOS, sites não instalados podem perder dados locais após dias sem uso | Orientar a instalação; pedir armazenamento persistente; o servidor guarda tudo, só a fila ainda não enviada ficaria em risco | 2 e 7 |
| Plano gratuito da Supabase | Pausa projetos parados e não inclui backup automático | Decidir entre o plano Pro ou rotina de atividade e backup manual testado | 7 |
| Direitos autorais dos EPUBs | Hospedar arquivos protegidos tem risco jurídico | Bucket privado, só membros; o risco para um grupo fechado é menor, mas não sou advogado e não é aconselhamento jurídico. O modo de arquivo local com hash fica como evolução | Pós-MVP |
| Vercel Hobby | O plano é só para uso não comercial | Migrar para plano pago se o app virar produto | — |
| Sessão de login expirar ou ser perdida | A pessoa seria deslogada; no iOS, dados locais de sites podem ser limpos | Auth sem time-box nem inactivity timeout, renovação automática, sessão em cookies do @supabase/ssr, fila local preservada após novo login | 0, 1 e 7 |

**Decisões a confirmar antes das sprints indicadas**

- Respostas de um nível por grifo (sprint 3, antes de desenhar `comments`).
- Idioma da interface em pt-BR e do código em inglês (sprint 0).
- Valores propostos de espaçamento, raios, tempos de transição, limite de tentativas do convite e critério de 90% do dicionário (sprints 1 e 6).
- Se o catálogo `/dev/design` basta no lugar de Storybook (sprint 1).

**Pós-MVP (não construído, mas o modelo já comporta)**

- Interface de múltiplos grupos, mais organizadores e remoção de membros.
- Modo de arquivo local com verificação de hash.
- Respostas aninhadas, busca no livro, leitura em voz alta e notificações.
- Atualizações ao vivo (Realtime).