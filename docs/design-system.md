# Design system: índice para quem vai escrever UI

Leia este arquivo antes de criar qualquer componente, estilo ou hook de UI.
Se o que você precisa não está aqui, procure em `src/design-system` e
`src/features` (regra 2 do `AGENTS.md`) antes de criar. Se mesmo assim não
existir, crie no design system (regra 3), não na feature.

O catálogo visual dos componentes, nos temas Dia e Noite, roda em
`/dev/design` (`npm run dev`).

## Componentes existentes

| Componente | Use para | Observações |
|---|---|---|
| `Button` | Qualquer ação clicável. Variantes `primary`, `secondary`, `quiet`, `icon`; estados `disabled` e `loading` | `icon` exige `aria-label`. Alvo de toque de 44 px já incluído |
| `Page` | A coluna centralizada de uma tela, com largura máxima e área segura do iPhone. `variant` `default`, `intro` (mais espaço acima, para formulários e conta) ou `banner` (faixa compacta); `as` `main`, `div`, `header` ou `section` | Toda tela nova começa nela. Não repita largura, `margin-inline: auto` nem `env(safe-area-inset-*)` em CSS de feature |
| `Icon` | Ícone decorativo (`close`, `reply`, `trash`, `conversation`, `more`, `send`); herda a cor do texto e fica oculto para leitores de tela | Para ícone clicável, use `IconButton`. Ícone novo entra em `Icon.tsx` |
| `IconButton` | Botão só com ícone. `icon` e `label` obrigatórios (o rótulo é o nome acessível); repassa `aria-expanded`, `type`, `disabled`, `loading` | Substitui o caractere `×` e qualquer `<Button variant="icon">` com SVG solto |
| `Progress` | Barra de progresso com nome acessível e, opcionalmente, o valor ao lado (`valueText`, que nunca quebra de linha) | Substitui `<progress>` cru |
| `Swatch` | Amostra de uma cor de grifo (`tone`: `amber`, `green`, `blue`, `pink`); `selected` desenha o anel | Decorativo: o botão que a contém dá o nome |
| `ColorField` | Seletor de cor com rótulo | Substitui `<input type="color">` |
| `Popover` | Painel não modal ancorado a um ponto da tela (`anchor`). Mantém-se dentro da área visível e fecha com Esc ou ao tocar fora. A variante padrão recebe o foco ao abrir e o devolve ao fechar. | `label` é o nome acessível. A variante `toolbar` mantém o foco na seleção de texto e prefere ficar acima dela quando há espaço. |
| `ActionBar` | Barra curta de ações fixada embaixo do ancestral posicionado, acima do rodapé (`--action-bar-offset`), que quebra em mais linhas em tela estreita | `label` é o nome do grupo |
| `Link` | Link de texto. `variant` `standalone` (alvo de toque de 44 px) ou `inline` (dentro de texto); `tone` `accent` ou `muted` | Por padrão é navegação de documento (funciona offline pelo service worker); `client` usa a navegação do Next |
| `LinkButton` | Ação que navega, com a aparência do `Button` (`primary`, `secondary`, `quiet`) | Use no lugar de `<a>` estilizado como botão |
| `Heading`, `Text` | Títulos e texto. `Heading` tem `variant` `page` (padrão), `section` (grupo dentro da tela) e `display` (título grande da home). `Text` tem `variant` `body`, `reading` e `label` (legenda pequena) e `tone` `default` ou `muted` | Não defina `font-*` em CSS de feature |
| `Section` | Grupo de conteúdo com título opcional (h2). `variant` `divided` (separado por uma linha) ou `outlined` (cartão com borda) | Substitui `<section>` com borda e `h2` estilizados à mão |
| `List`, `ListItem` | Lista sem marcadores que mantém a semântica de lista; `ListItem divided` põe uma linha acima | `List as="ol"` para lista ordenada. O espaçamento entre itens é do `ListItem` |
| `Disclosure` | Grupo expansível nativo (`details`) com resumo de 44 px | `open` define o estado inicial |
| `TextField`, `TextArea` | Campos com rótulo, erro e foco consistentes | Rótulo obrigatório; `hideLabel` só quando há placeholder claro |
| `Sheet` | Painéis modais (dicionário, listas, ajustes). Variante `compact` | Já trata o teclado virtual e a área segura |
| `Notice` | Mensagem curta que leitores de tela anunciam. `live` `status` (padrão, educado) ou `alert` (falhas); `announceOnly` para texto já visível em outro lugar | Nunca escreva `role="status"`/`role="alert"` à mão. A região fica no DOM mesmo vazia. Botões e links ficam fora dela |
| `StatusBanner` | Aviso persistente com ação opcional | Compõe `Notice` |
| `Avatar` | Foto ou iniciais de uma pessoa | |
| `BookCard`, `BookCover` | Livro na estante. Traz fundo, raio e margem próprios; `featured` usa o título de página em vez do de seção | `BookCover` é composto por `BookCard` |

## Utilitários

- `src/design-system/viewport.ts`: `getViewport()` devolve a área realmente visível (posição, tamanho e o espaço coberto pelo teclado, `bottomInset`); `observeViewport(callback)` avisa quando ela muda. `Sheet` e o balão de comentário usam; todo painel flutuante novo deve usar (regra 12).

## Tokens (`src/design-system/tokens/base.css`)

Espaço `--space-8/12/16/24/48`; raio `--radius-control`, `--radius-round`;
alvo de toque `--touch-target`; foco `--focus-ring`; largura `--layout-width`;
tipografia `--font-body`, `--font-reading-body`, `--font-label`, `--font-heading`,
`--font-display`; cores `--color-bg/surface/ink/muted/accent/accent-text/amber`
e `--highlight-*`; movimento `--transition-short`.
O âmbar é só para grifos e decoração, nunca para texto.

## O que NÃO fazer em CSS de feature ou de rota

O `npm run lint:css` bloqueia, fora de `src/design-system`:

- cores literais (`#fff`, `rgb()`), `px`, `rem`, `em`;
- `outline*`, `border-radius`, `box-shadow`, `list-style`;
- `font-family`, `font-weight`, `font-size`, `letter-spacing` e o atalho `font` com tokens de fonte;
- `min-*-size` com `--touch-target` ou `--layout-width`, e bordas com `--focus-ring`. Exceções permanentes e restritas: o cromo fixo do leitor (`src/features/reader`) pode usar `--layout-width` para acompanhar a coluna, e `reader-chrome.module.css` (as barras superior e inferior do leitor) também pode ter bordas, tipografia, alvos de toque e anel de foco próprios; o botão da faixa de progresso do leitor é o único `<button>` cru permitido (`ReaderToolbars.tsx`).

Se você precisa de algo disso, o componente certo não existe ainda: crie-o no
design system.

## O que NÃO fazer em TypeScript de feature

O `npm run lint` bloqueia, fora de `src/design-system`:

- `role="status"` e `role="alert"` à mão (use `Notice`);
- `<button>`, `<input>`, `<textarea>`, `<dialog>`, `<progress>` crus (um `<input type="hidden">` é permitido);
- `navigator.onLine` e `addEventListener("online" | "offline")` (use `src/lib/online`: `useOnline`, `useOnReconnect`, `isOnline`, `onReconnect`, `onDisconnect`);
- `window.visualViewport` (use `src/design-system/viewport`: `getViewport`, `observeViewport`; é o que mantém folhas e painéis acima do teclado virtual);
- `Intl.NumberFormat` e `Intl.DateTimeFormat` (use `src/lib/format`: `formatPercent`, `formatDateTime`; formatadores novos entram lá);
- importar o interior de outra feature: só `@/features/<nome>` (o `index.ts`, com a interface) ou `@/features/<nome>/server` (o `server.ts`, só para código de servidor, como rotas e callbacks, sem carregar a interface);
- arquivos com mais de 300 linhas.

Se o componente de que você precisa não existe, crie-o seguindo a regra 3 em vez de
repetir o padrão na feature; o lint aponta quem ainda usa o padrão antigo pela linha de base.

## Capturas visuais

`e2e/visual.spec.ts` compara capturas de tela em 320 px e 390 px, nos temas Dia
e Noite: início, créditos, diagnóstico, estante offline e a barra de seleção do
leitor. As imagens de referência ficam em `e2e/visual.spec.ts-snapshots/` e só
valem se geradas no runner da CI (Linux, Chromium do projeto); as geradas em
outra máquina não servem. Alterou a aparência de propósito?

1. Apague as imagens afetadas e envie o PR. O job `e2e` falha e grava as novas.
2. Baixe o artefato `visual-snapshots` da execução (`gh run download <id> -n visual-snapshots -D e2e/visual.spec.ts-snapshots`).
3. Revise as imagens, faça commit e envie de novo. Mudança visual sem motivo é regressão.

Tolerância: 50 pixels (um limite proporcional esconde mudanças pequenas, como um ícone de 18 px) (`playwright.config.ts`). Para telas que precisam de
login, ainda não há captura; cubra com o catálogo `/dev/design`.

## Linha de base (exceções antigas)

Violações anteriores às regras estão registradas e só podem diminuir:

- ESLint: `eslint-suppressions.json` (contagem por arquivo e regra). Corrigiu uma? Rode `npm run lint:prune` e inclua o arquivo no PR.
- Stylelint: comentários `stylelint-disable-next-line ... -- baseline(Bx)` no CSS. Corrigiu? Apague o comentário; um comentário sem violação falha o lint.
- Duplicação: `npm run dup` falha acima do limite em `.jscpd.json`. Reduziu? Baixe o `threshold`.

Nunca adicione uma exceção nova para fazer a CI passar. O plano das migrações
está em [plano-manutenibilidade.md](plano-manutenibilidade.md).
