# Plano de manutenibilidade: duplicação, consistência visual e regras para agentes

Estado: executado. As trilhas A e B foram concluídas (veja a seção 7). Origem: análise de duplicação e de
consistência de design feita sobre a `main` após o PR #38.

## 1. Diagnóstico da causa

As regras já existem no `AGENTS.md` (reutilizar antes de criar, nada de valor
visual fora dos tokens, componente reutilizável nasce no design system), mas
são só texto. A única verificação automática de arquitetura hoje é uma regra do
ESLint (`design-system` não importa de `features` nem de `lib`). Resultado:

- 5 wrappers de página quase idênticos, 8 arquivos repetindo o outline de foco
  (dois deles sem `outline-offset`) e 17 usos soltos de `role="status"`/`role="alert"`.
- Valores literais fora dos tokens (`rgb(0 0 0 / 20%)`, `1px`, token de espaçamento usado como raio).
- `features/comments` importa de dentro de `features/annotations` (`actions`, `AnnotationIcon`) sem passar pelo `index`.
- Arquivos grandes sem limite (`ReaderCanvas.tsx` com 551 linhas).
- A numeração do `AGENTS.md` começa na regra 2, e as regras 2 e 3 não dizem como o agente descobre o que já existe.

Princípio do plano: **regra que não falha na CI não é regra.** Cada regra de
manutenção vira uma verificação mecânica, e o texto do `AGENTS.md` só aponta
para ela.

## 2. Trilha A: guarda-corpos (vem antes de qualquer migração)

Objetivo: impedir que o problema cresça enquanto o corrigimos. Cada item é um PR.

### A1. Linha de base e catraca (ratchet)
Toda verificação nova nasce como `error`, com as violações atuais registradas
numa lista de exceções (`docs/manutencao-baseline.json` ou comentários
`eslint-disable` com motivo e link para a tarefa de migração). Cada PR de
migração remove entradas; um teste garante que a lista só encolhe.

### A2. ESLint: restrições de uso (`no-restricted-syntax` e `no-restricted-imports`)
Fora de `src/design-system`:

| Proibido | Use |
|---|---|
| `role="status"` / `role="alert"` em JSX | `Notice` (A5) |
| `<button>`, `<input>`, `<textarea>`, `<dialog>`, `<progress>` crus | `Button`, `TextField`, `TextArea`, `Sheet`, `Progress` |
| `navigator.onLine` e `addEventListener("online"/"offline")` fora de `src/lib/online` | `useOnline`, `useOnReconnect` |
| `new Intl.NumberFormat/DateTimeFormat` fora de `src/lib/format` | `formatPercent`, `formatDateTime` |
| `style={{ ... }}` com valores literais | tokens/CSS modules |
| importar `@/features/<x>/<arquivo>` de outra feature | só `@/features/<x>` (o `index`) |

Também: `max-lines` (alvo 300) e `complexity`, com a catraca para os arquivos que já passam do limite.

### A3. Stylelint nos CSS modules
- `color-no-hex`, `function-disallowed-list: [rgb, rgba, hsl]` e unidades literais (`px`, `rem`) só em `tokens/` e `design-system/`; o resto usa `var(--...)`.
- Fora de `src/design-system`, proibir as propriedades que definem identidade de componente: `outline*`, `min-block-size: var(--touch-target)`, `max-inline-size: var(--layout-width)`, `border-radius`, `box-shadow`, `list-style`. Se a feature precisa disso, o componente certo não existe ainda (A5/B).
- `declaration-property-value-allowed-list` para `font` (só tokens `--font-*`).

### A4. Detector de duplicação com catraca
`jscpd` na CI (TS, TSX e CSS), com limite global e por arquivo que só pode cair.
Ele sinaliza em PR o que o agente não enxergou ao procurar por nome.

### A5. Verificações do design system (Vitest, sem dependência nova)
Um teste que varre `src/design-system/components/*` e exige: `index.ts`, teste de
componente, entrada em `/dev/design`, uso de tokens (sem literais) e tema Noite
conferido pelo catálogo. Cobre a regra 3 do `AGENTS.md`, hoje sem verificação.

### A6. Rede de segurança visual
Refatorar CSS compartilhado mexe em todas as telas. Antes das migrações,
capturas do Playwright (`toHaveScreenshot`, Chromium, Linux, só na CI) das telas
chave em 390 px e 320 px, nos temas Dia e Noite: estante, conta, diagnóstico,
dicionários, leitor com barra de seleção, folha do dicionário e comentário.

### A7. Processo e documentação
- `.github/pull_request_template.md` com as seções da regra 2 (o que foi procurado, por que não serviu) e o checklist do `AGENTS.md`. A seção "reutilização" passa a ser obrigatória.
- `docs/design-system.md`: índice curto de componentes, tokens e quando usar cada um. É o primeiro arquivo que o agente lê antes de escrever UI.
- `AGENTS.md`: corrigir a numeração; reescrever as regras 2, 3 e 4 com a regra de três abaixo; apontar cada regra para a verificação que a aplica; incluir a lista "proibido sem componente do design system".

Regra de três proposta: na **segunda** ocorrência de um padrão de UI, o agente
extrai para o design system no mesmo PR, se couber em mudança pequena; senão
abre tarefa registrada e usa o `TODO(manutencao: id)` na lista de exceções.

## 3. Trilha B: migração (um PR por tarefa)

Ordem por dependência e retorno. Cada PR remove suas entradas da linha de base.

| # | Tarefa | Substitui | Observações |
|---|---|---|---|
| B1 | Tokens: `--color-divider`, `--radius-surface`, `--shadow-floating`; fundir o bloco duplicado do tema Noite | `color-mix` 22% (4×), `rgb(0 0 0 / 20%)`, raio via token de espaçamento | só CSS; verificar contraste no Noite, incluindo `--highlight-*` |
| B2 | `Page` (largura, área segura, padding) | 5 wrappers | corrige também a diferença de padding entre telas |
| B3 | `Link`/`LinkButton` (`Button` com `href`) | `.enter`, `a.read`, `.manage`, links soltos | unifica foco e hover; cuidado com o `.enter` da home, que hoje difere do `Button` |
| B4 | `Notice` | 17 usos de `role="status"/"alert"`; `StatusBanner` passa a compor `Notice` | preservar o comportamento do `onlyAnnouncement` do `InviteForm` |
| B5 | `useOnline`/`useOnReconnect` e `lib/format` | 5 listeners; 2 formatadores | `EnterLink` já serve de molde |
| B6 | `Icon` no design system (mover `AnnotationIcon`) e `IconButton` | `×` solto; import cruzado entre features | rótulos acessíveis continuam obrigatórios |
| B7 | `Progress`, `List`/`ListItem`/`Divider`, `Section`, variante de `Heading` | listas, barras, títulos com `font-weight: 650` | pequenos; podem ir juntos se o diff ficar curto |
| B8 | `useVisualViewport` | duplicação entre `Sheet` e `CommentThread` | depende de teste em aparelho real |
| B9 | `Popover`/`FloatingPanel` | `.bubble`, `.selectionMenu`, `.savedNotice` | usa B1; extrai foco, Esc, clique fora e posicionamento do `CommentThread`; **último** por mexer no teclado virtual |
| B10 | Quebrar `ReaderCanvas` e `CommentThread` em partes | arquivos acima do limite | sem mudança de comportamento; testes antes |

Fora do escopo desta trilha por ganho baixo: fábrica para `pushAnnotation`/`pushComment` (só duas instâncias; reavaliar na terceira tabela) e o hook genérico `useAsync` (os casos têm particularidades demais).

## 4. Critérios de pronto e métricas

- A trilha A está pronta quando a CI falha para: literal visual novo, `role="status"` cru, `navigator.onLine` fora de `lib/online`, componente do design system sem teste ou catálogo, e aumento de duplicação.
- A trilha B está pronta quando a lista de exceções está vazia e o `jscpd` fica abaixo do limite acordado.
- Acompanhar por PR: percentual de duplicação, tamanho da lista de exceções e número de arquivos acima de 300 linhas.

## 5. Riscos

- **Regressão visual**: mitigada por A6 e por migrar uma tela por vez.
- **Falsos positivos nas regras**: a lista de exceções com motivo evita bloquear trabalho legítimo; revisar a lista a cada sprint.
- **Dependências novas** (`stylelint`, `jscpd`): a regra 9 exige justificativa de tamanho, licença e manutenção; ver decisões abaixo. Ambas rodam só em desenvolvimento e CI, sem impacto no bundle.
- **Escopo**: esta é uma trilha de manutenção, fora das sprints de produto; registrar em `docs/sprints.md` para respeitar a regra 9.

## 6. Decisões pendentes

1. Aprovar `stylelint` e `jscpd` como devDependencies (ou usar só ESLint e scripts próprios, com menos cobertura de CSS).
2. Incluir as capturas visuais (A6) ou aceitar o risco de regressão sem elas.
3. Rigor inicial: `error` com linha de base (recomendado) ou `warn` por uma sprint.
4. Quando executar: antes da próxima sprint de produto, ou intercalado.

## 7. Resultado

Trilha A (guarda-corpos) e trilha B (migração) concluídas, uma PR por tarefa.

| Tarefa | Resultado |
|---|---|
| A1 a A5, A7 | ESLint com regras do projeto e supressões por contagem, Stylelint, `jscpd`, teste de contrato do design system, `AGENTS.md`, template de PR e `docs/design-system.md` |
| A6 | 24 capturas (320 e 390 px, Dia e Noite) mais 4 da folha do dicionário, com limite absoluto de 50 pixels |
| B1 | Tokens `--border-divider`, `--shadow-floating`, `--radius-surface`; teste de paridade dos temas |
| B2 | `Page` |
| B3 | `Link` e `LinkButton` |
| B4 | `Notice` |
| B5 | `src/lib/online` e `src/lib/format` |
| B6 | `Icon`, `IconButton` e entradas `index.ts`/`server.ts` por feature |
| B7 | `Progress`, `Swatch`, `ColorField`, `Section`, `List`, `Disclosure` e variantes de `Heading` e `Text` |
| B8 | `src/design-system/viewport.ts` |
| B9 | `Popover` e `ActionBar` |
| B10 | `ReaderCanvas` dividido (555 para 96 linhas); linha de base zerada |

Medidas ao fim: duplicação 2,13% para 0,43%; supressões do ESLint 60 para 0; comentários de CSS na linha de base 68 para 0; nenhum arquivo acima de 300 linhas.

Exceções permanentes e documentadas (não são linha de base): largura da coluna no cromo do leitor, `reader-chrome.module.css` (barras do leitor), o botão de progresso do leitor e o catálogo `/dev/design`.

Achados visuais em 320 px: o valor do progresso que quebrava ("40 %") e o título sublinhado na capa-placeholder foram corrigidos. A barra de seleção do leitor continua em duas linhas a 320 e 390 px por decisão: 4 cores e 3 botões de 44 px não cabem numa linha, e redesenhá-la é uma decisão de produto.

Pendente fora do código: aceitação em aparelho real do fluxo "Definir", do teclado virtual (folhas e balão de comentário) e dos gestos de seleção no Android e no iOS.
