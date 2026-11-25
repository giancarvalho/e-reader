# Leitor EPUB compartilhado

PWA para ler EPUBs e compartilhar grifos e comentários com um grupo.

- [Plano de sprints](docs/sprints.md)
- [Documento técnico](docs/documento-tecnico.md)
- [Aceitação da sprint 0](docs/sprint-0-aceitacao.md)

## Desenvolvimento

Use Node.js 24 e `npm ci`. Execute `npm run dev` para desenvolvimento.
Para conferir o service worker, use `npm run build` seguido de `npm start`.

```sh
npm run lint
npm run typecheck
npm run test:unit
npx playwright install chromium webkit
npm run build
npm run test:e2e
```

Para a integração, use Docker e Supabase CLI 2.72.7. Suba o projeto local,
carregue as variáveis da CLI e rode o teste.

```sh
supabase start
eval "$(supabase status -o env)"
SUPABASE_URL="$API_URL" SUPABASE_ANON_KEY="$ANON_KEY" npm run test:integration
supabase stop
```

O service worker da fundação pré-carrega apenas o shell público e os arquivos
estáticos. Ao adicionar autenticação, preserve uma rota pública para o shell
offline e mantenha as respostas autenticadas fora desse cache.

Newsreader e Inter usam a SIL Open Font License. A integração Webpack do
Serwist gera o service worker e sua lista de arquivos durante o build.
