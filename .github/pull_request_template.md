## O que muda

<!-- Uma tarefa por PR, dentro da sprint ativa. -->

## Reutilização (obrigatório)

- Procurei em `docs/design-system.md`, `src/design-system` e `src/features` por: <!-- nomes e propósitos buscados -->
- Reutilizei ou estendi: <!-- componentes, hooks, utilitários -->
- Criei algo novo? <!-- Se sim: por que nenhum existente serviu e onde vive (design system ou feature) -->

## Guarda-corpos

- [ ] `npm run lint`, `npm run typecheck`, `npm run dup` e `npm run test:unit` passam
- [ ] Nenhuma exceção nova na linha de base (`eslint-suppressions.json`, comentários `stylelint-disable ... baseline`); se removi violações, rodei `npm run lint:prune`
- [ ] Nenhum valor visual literal fora dos tokens
- [ ] Testado nos temas Dia e Noite e com texto grande
- [ ] Conferi a tela em 320 px, em celular deitado e em tela grande, com a área segura e o teclado virtual
- [ ] Tabelas novas têm RLS e testes de política
- [ ] `AGENTS.md` e `docs/` refletem qualquer contrato alterado

## Verificação

<!-- O que foi testado e o que depende de aparelho real. -->
