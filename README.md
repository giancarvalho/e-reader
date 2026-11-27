# Shared Margins

**Um livro. Muitas leituras.**

Shared Margins é um leitor de EPUB para celular (um PWA para iPhone e Android) em que
um grupo lê o mesmo livro e conversa **dentro do texto**: cada pessoa grifa trechos,
escreve notas e responde às notas dos outros, no ritmo dela, mesmo sem internet.

## O problema

Ler junto costuma ser uma experiência dividida entre dois lugares. O livro está num
aplicativo de leitura e a conversa acontece em outro, como um grupo de mensagens, um
fórum ou uma reunião. Isso traz atritos conhecidos de quem participa de clubes de
leitura:

- **A conversa perde o contexto.** "Aquela parte do capítulo 3" exige descrever o
  trecho, ou copiar e colar, e quem lê depois não sabe do que se trata.
- **Cada pessoa lê num ritmo.** Quem está no capítulo 2 não quer ser surpreendido
  pelo comentário de quem já terminou.
- **Compartilhar anotações costuma ser trabalhoso:** exportar, enviar, importar, ou
  todos precisarem da mesma conta e do mesmo ecossistema.
- **A leitura acontece em trânsito**, no metrô, no avião, sem sinal, e um app que
  depende da rede atrapalha.

O Shared Margins junta o livro e a conversa. A anotação fica presa ao trecho do
texto, aparece para todo o grupo e funciona offline.

> Esta seção descreve a motivação do produto. O que o app faz de fato está nas
> próximas seções e nos documentos em [`docs/`](docs/).

## Como funciona

1. **O organizador publica um EPUB** na estante do grupo e define qual é o livro atual.
   Todos leem o mesmo arquivo.
2. **Cada pessoa entra pelo celular** com a conta Google e, na primeira vez, um código
   de convite. Do Google o app usa só **nome e foto**. O convite pode ser enviado como
   link (`/?invite=CÓDIGO`).
3. **O livro é baixado e salvo no aparelho.** A leitura nunca espera a rede.
4. **Quem lê grifa e conversa.** Cada grifo pode ter uma nota, e cada nota tem um fio
   de respostas. Tudo sincroniza em segundo plano quando há conexão.

### O que se pode fazer no leitor

- **Ler** EPUBs refluíveis, com índice de capítulos, progresso e a posição lembrada em
  qualquer aparelho.
- **Grifar** em quatro cores, com nota opcional, e desfazer rápido.
- **Comentar** em fio: cada grifo abre uma conversa com autor, hora e respostas. Só o
  autor edita ou apaga o que escreveu.
- **Consultar o dicionário** (português e inglês) tocando em **Definir**, no idioma do
  livro, também offline.
- **Ajustar a leitura:** tema Automático, Dia, Noite ou Personalizado (com aviso de
  contraste), fonte de 12 a 36 px e texto com ou sem serifa.
- **Ver as anotações** do grupo agrupadas por capítulo, com o capítulo atual aberto e
  os demais recolhidos com contagem. Não há filtro de spoiler: cada pessoa decide o que
  abrir.

### Gestos de leitura

| Gesto | O que faz |
| --- | --- |
| Toque rápido na lateral esquerda (30% da largura) | Página anterior |
| Toque rápido na lateral direita (30%) | Próxima página |
| Toque rápido no centro (40%) | Mostra ou esconde as barras |
| Arrastar para o lado | Vira a página (arrastos que começam nos 24 px da borda ficam para o gesto de voltar do sistema) |
| Segurar uma palavra por 1 segundo | Seleciona a palavra e abre as alças para ajustar o trecho |
| Segurar entre 0,25 e 1 segundo | Nada acontece, para uma hesitação nunca virar a página |

As regras estão em [`src/features/reader/page-gestures.ts`](src/features/reader/page-gestures.ts).
Para diagnosticar problemas de toque num aparelho real, a página de **Diagnóstico** tem
**Copiar diagnóstico**, que reúne o estado do app, o aparelho e o registro dos toques
(só tipo, posição e hora, nunca o texto do livro).

## Princípios

- **Local-first.** Ler, grifar e comentar leem e gravam no aparelho (IndexedDB). A rede
  só sincroniza depois. Preferências e posição de leitura são gravadas na hora.
- **Privacidade por padrão.** O progresso de leitura é individual e privado. O banco
  decide quem lê o quê com RLS (Row Level Security) em todas as tabelas, e a chave
  `service_role` nunca vai ao cliente.
- **Mobile first.** Tudo nasce para celular em pé (referência de 390 × 844 px, mínimo de
  320 px). Telas maiores mostram a mesma coluna centralizada.
- **Acessível.** Contraste WCAG AA, alvos de toque de pelo menos 44 px, foco visível,
  rótulo em todo ícone e respeito a `prefers-reduced-motion`.
- **Sessão longa.** A pessoa só precisa entrar de novo se sair por conta própria.

## Estado do projeto

Projeto em desenvolvimento. Já existem acesso por convite, estante, leitor, grifos,
comentários, sincronização offline e dicionário (sprints 0 a 7 do
[plano de sprints](docs/sprints.md)), e o redesign do leitor (sprints 8 a 11) está em
andamento. Ainda estão pendentes a aceitação em iPhone e Android reais e o beta com um
grupo, registrados em [`docs/`](docs/).

**Escopo atual:** um único grupo (cerca de 200 pessoas) com um único organizador. O
modelo de dados já prevê vários grupos (`group_id` em todas as tabelas), mas não existe
tela para isso.

**Fora do escopo por enquanto:** vários grupos e organizadores, remoção de membros pela
interface, busca no livro, leitura em voz alta, notificações e EPUBs de layout fixo.

> No iPhone, o app precisa ser **instalado na Tela de Início** (Compartilhar → Adicionar
> à Tela de Início) para o modo offline e a sessão persistente funcionarem.

## Tecnologias

| Camada | Escolha |
| --- | --- |
| Interface e servidor | Next.js (App Router) e TypeScript |
| PWA e offline | Manifest e service worker com Serwist, dados em IndexedDB (`idb`) |
| Banco, login e arquivos | Supabase: Postgres com RLS, Google OAuth e Storage privado |
| Leitor de EPUB | [foliate-js](https://github.com/johnfactotum/foliate-js), incluído em `src/vendor/` |
| Estilo | CSS Modules com tokens (variáveis CSS) e um design system próprio |
| Testes | Vitest, Testing Library, Playwright, Supabase CLI local |
| Hospedagem | Vercel e Supabase |

A interface só lê e grava no IndexedDB. Apenas o motor de sincronização conversa com o
Postgres e o Storage. Os detalhes da arquitetura estão no
[documento técnico](docs/documento-tecnico.md).

## Como rodar

Use Node.js 24.

```sh
npm ci
cp .env.example .env.local   # preencha as variáveis abaixo
npm run dev
```

| Variável | Para que serve |
| --- | --- |
| `APP_ORIGIN` | Endereço do app, por exemplo `http://localhost:3000` |
| `SUPABASE_URL` | Endereço do Supabase (local: `http://127.0.0.1:54321`) |
| `SUPABASE_PUBLISHABLE_KEY` | Chave pública do Supabase |
| `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` | Credenciais do Google OAuth. Veja [`docs/sprint-0-oauth.md`](docs/sprint-0-oauth.md) |

Para testar o service worker, use `npm run build` seguido de `npm start`. Para um
Supabase local (exige Docker e a Supabase CLI 2.72.7), use `supabase start`.

## Testes e qualidade

```sh
npm run lint          # ESLint e Stylelint
npm run typecheck
npm run dup           # detecção de código duplicado
npm run test:unit

npx playwright install chromium webkit
npm run build
npm run test:e2e

supabase start
eval "$(supabase status -o env)"
SUPABASE_URL="$API_URL" SUPABASE_ANON_KEY="$ANON_KEY" SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" npm run test:integration
supabase stop
```

A CI roda esses mesmos checks em cada pull request (`.github/workflows/checks.yml`).
As capturas de referência dos testes visuais ficam em `e2e/visual.spec.ts-snapshots/` e
são geradas no Linux da CI (veja [`docs/design-system.md`](docs/design-system.md)).

## Estrutura

```text
src/app            rotas e páginas (Next.js)
src/design-system  tokens e componentes reutilizáveis (catálogo em /dev/design)
src/features       acesso, estante, leitor, grifos, comentários, dicionário, diagnóstico
src/lib            sincronização, IndexedDB, mensagens em pt-BR e utilitários
src/vendor         foliate-js
supabase           migrations, configuração e testes SQL
e2e                testes de ponta a ponta (Playwright)
scripts            geração e publicação do dicionário, operação
docs               especificação, plano de sprints e registros de validação
```

## Documentação

- [Documento técnico](docs/documento-tecnico.md): visão, arquitetura, dados e sincronização
- [Plano de sprints](docs/sprints.md)
- [Design system](docs/design-system.md)
- [Acesso e convites](docs/sprint-1-acesso.md) e [configuração do Google OAuth](docs/sprint-0-oauth.md)
- [Dicionário](docs/sprint-6-dicionario.md) e [fonte em português](docs/sprint-0-dicionario-pt.md)
- [Operação e beta](docs/sprint-7-operacao.md)
- [Plano de manutenibilidade](docs/plano-manutenibilidade.md)

## Contribuindo

Leia o [`AGENTS.md`](AGENTS.md): ele define as regras do repositório (reutilizar antes de
criar, design system como única fonte de UI, testes junto do código, RLS em toda tabela e
mobile first) e o checklist de pull request. A interface e as mensagens são em
português do Brasil; código e comentários, em inglês.

## Créditos e licenças

- **Fontes:** Newsreader e Inter, sob a SIL Open Font License.
- **foliate-js:** licença MIT.
- **Dicionário:** definições do Wikcionário (português e inglês), extraídas pelo
  [Kaikki](https://kaikki.org/) com o [Wiktextract](https://github.com/tatuylonen/wiktextract),
  sob a licença [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). As
  atribuições aparecem no app, em **Créditos e licenças**.
