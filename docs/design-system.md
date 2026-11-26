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
| `Link` | Link de texto. `variant` `standalone` (alvo de toque de 44 px) ou `inline` (dentro de texto); `tone` `accent` ou `muted` | Por padrão é navegação de documento (funciona offline pelo service worker); `client` usa a navegação do Next |
| `LinkButton` | Ação que navega, com a aparência do `Button` (`primary`, `secondary`, `quiet`) | Use no lugar de `<a>` estilizado como botão |
| `Heading`, `Text` | Títulos e texto. `Text` tem `variant` (`body`, `reading`) e `tone` (`default`, `muted`) | Não defina `font-*` em CSS de feature |
| `TextField`, `TextArea` | Campos com rótulo, erro e foco consistentes | Rótulo obrigatório; `hideLabel` só quando há placeholder claro |
| `Sheet` | Painéis modais (dicionário, listas, ajustes). Variante `compact` | Já trata o teclado virtual e a área segura |
| `Notice` | Mensagem curta que leitores de tela anunciam. `live` `status` (padrão, educado) ou `alert` (falhas); `announceOnly` para texto já visível em outro lugar | Nunca escreva `role="status"`/`role="alert"` à mão. A região fica no DOM mesmo vazia. Botões e links ficam fora dela |
| `StatusBanner` | Aviso persistente com ação opcional | Compõe `Notice` |
| `Avatar` | Foto ou iniciais de uma pessoa | |
| `BookCard`, `BookCover` | Livro na estante | `BookCover` é composto por `BookCard` |

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
- `min-*-size` com `--touch-target` ou `--layout-width`, e bordas com `--focus-ring`. Exceção permanente e restrita: o cromo fixo do leitor (`src/features/reader`) pode usar `--layout-width` para acompanhar a coluna.

Se você precisa de algo disso, o componente certo não existe ainda: crie-o no
design system.

## O que NÃO fazer em TypeScript de feature

O `npm run lint` bloqueia, fora de `src/design-system`:

- `role="status"` e `role="alert"` à mão (use `Notice`);
- `<button>`, `<input>`, `<textarea>`, `<dialog>`, `<progress>` crus;
- `navigator.onLine` e `addEventListener("online" | "offline")` (use os hooks de `src/lib/online`);
- `Intl.NumberFormat` e `Intl.DateTimeFormat` (use `src/lib/format`);
- importar o interior de outra feature: só `@/features/<nome>` (o `index.ts`);
- arquivos com mais de 300 linhas.

`Notice`, `Progress`, `src/lib/online` e `src/lib/format` ainda não existem: são
as tarefas B4, B5 e B7 do plano. Até lá, ao precisar de um deles, crie-o
seguindo a regra 3 em vez de repetir o padrão na feature; o lint vai apontar
quem ainda usa o padrão antigo pela linha de base.

## Capturas visuais

`e2e/visual.spec.ts` compara capturas de tela em 320 px e 390 px, nos temas Dia
e Noite: início, créditos, diagnóstico, estante offline e a barra de seleção do
leitor. As imagens de referência ficam em `e2e/visual.spec.ts-snapshots/` e só
valem se geradas no runner da CI (Linux, Chromium do projeto); as geradas em
outra máquina não servem. Alterou a aparência de propósito?

1. Apague as imagens afetadas e envie o PR. O job `e2e` falha e grava as novas.
2. Baixe o artefato `visual-snapshots` da execução (`gh run download <id> -n visual-snapshots -D e2e/visual.spec.ts-snapshots`).
3. Revise as imagens, faça commit e envie de novo. Mudança visual sem motivo é regressão.

Tolerância: 0,2% dos pixels (`playwright.config.ts`). Para telas que precisam de
login, ainda não há captura; cubra com o catálogo `/dev/design`.

## Linha de base (exceções antigas)

Violações anteriores às regras estão registradas e só podem diminuir:

- ESLint: `eslint-suppressions.json` (contagem por arquivo e regra). Corrigiu uma? Rode `npm run lint:prune` e inclua o arquivo no PR.
- Stylelint: comentários `stylelint-disable-next-line ... -- baseline(Bx)` no CSS. Corrigiu? Apague o comentário; um comentário sem violação falha o lint.
- Duplicação: `npm run dup` falha acima do limite em `.jscpd.json`. Reduziu? Baixe o `threshold`.

Nunca adicione uma exceção nova para fazer a CI passar. O plano das migrações
está em [plano-manutenibilidade.md](plano-manutenibilidade.md).
