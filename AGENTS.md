# Instruções do repositório

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


## Preferência de entrega do Gian

Abra um PR para cada tarefa. Quando os checks de testes unitários, integração e
lint estiverem verdes no PR, o merge e o avanço para a próxima sprint estão
autorizados, sem nova confirmação. A CI também exige typecheck e os demais testes
automáticos aplicáveis. Registre separadamente a aceitação em aparelho real e
qualquer dependência pendente que bloqueie uma tarefa posterior.

## Contratos da experiência de leitura

- O tema do aplicativo usa `html[data-theme]` e a chave `app-theme` no
  `localStorage`. Sem escolha, segue o sistema. O `data-theme` na seção do
  leitor segue as preferências individuais do EPUB.
- Convites compartilhados usam `/?invite=CODIGO`. A home envia
  `POST /auth/invite` na mesma origem com JSON `{ code }`. O endpoint usa a
  sessão do leitor, devolve `401` para iniciar o fluxo de login da home e
  responde com `{ path }` após uma tentativa autenticada de ingresso. Os
  callbacks OAuth também usam a RPC `join_group` e o cookie de convite
  pendente. Links antigos por `/convite?codigo=CODIGO` continuam válidos.
