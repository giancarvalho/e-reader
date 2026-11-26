# Sprint 6 · Corpus e distribuição

Os dicionários são gerados de dumps Wiktextract e servidos pelo próprio
app em `public/dict/<idioma>`. O gerador mantém definições e candidatos
a lema, preserva acentos e divide o resultado por prefixo. O manifesto
registra a edição, a origem, a licença e o SHA-256 do dump de entrada.

Use a data informada pelo provedor como revisão. O gerador cria um diretório
novo por idioma. Para atualizar, gere em outra pasta e substitua o artefato
da versão anterior no build, junto com o manifesto.

```sh
node scripts/dict/build.mjs pt /dados/ptwiktionary.jsonl.gz AAAA-MM-DD
node scripts/dict/build.mjs en /dados/enwiktionary.jsonl.gz AAAA-MM-DD
```

Para evitar armazenar o dump inglês compactado no mesmo disco da saída,
o gerador aceita um fluxo gzip em stdin. Use uma URL do snapshot escolhida
no provedor e verifique o hash calculado antes de promover a versão.

```sh
set -o pipefail
curl -fSL https://kaikki.org/dictionary/raw-wiktextract-data.jsonl.gz |
  node scripts/dict/build.mjs en - AAAA-MM-DD
```

Arquivos em `public/dict` são servidos localmente se estiverem no build.
Na Vercel, quando esses arquivos não estiverem no build, o app usa o bucket
público `dictionaries` do projeto Supabase definido em `SUPABASE_URL`.
As definições são distribuídas sob
CC BY-SA 4.0 e o leitor vincula cada verbete ao histórico de origem.
O corpus completo em inglês exige uma máquina com espaço e banda
compatíveis com o dump bruto (2,9 GB compactados no snapshot consultado).
Falta medir a precisão em contexto das 100 formas de cada idioma.
[Dados PT](https://kaikki.org/ptwiktionary/rawdata.html)
· [Dados EN](https://kaikki.org/dictionary/rawdata.html)
· [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

A execução completa da fonte PT selecionada gerou 380.075 entradas em 490
fragmentos, ocupando 32 MiB no disco de teste.

Para o snapshot de 01/10/2026, a exportação compactada somente em inglês
também está disponível (534 MB). O argumento `english-only` registra essa
origem no manifesto. O Kaikki sinaliza que a exportação por idioma poderá
ser removida. O dump bruto continua sendo a fonte padrão.

```sh
set -o pipefail
curl -fSL https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.jsonl.gz |
  node scripts/dict/build.mjs en - 2026-10-01 public/dict english-only
```

## Publicar o corpus na Vercel

1. Aplique a migration que cria o bucket `dictionaries` no Supabase do
   ambiente de destino. O bucket público contém somente verbetes e metadados
   de licença. O bucket de EPUBs continua privado.
2. Em um terminal administrativo, configure temporariamente `SUPABASE_URL`
   e `SUPABASE_SERVICE_ROLE_KEY` para o projeto de destino. Use a chave
   administrativa só no ambiente que publica o corpus.
3. Execute `node scripts/dict/publish.mjs pt` e
   `node scripts/dict/publish.mjs en`. O segundo argumento opcional indica
   a pasta que contém os diretórios `pt` e `en`. Cada publicação envia os
   fragmentos para um caminho versionado antes de atualizar o manifesto
   consultado pelo leitor. Repetir o comando retoma envios incompletos.
   Em um terminal que usa um proxy, exporte `NODE_USE_ENV_PROXY=1` no Node 24.
   O publicador repete erros transitórios e inclui o status HTTP quando
   o Storage fornece um. Se um idioma já foi publicado, execute só o outro.
4. Depois do deploy, confira `/dict/pt/manifest.json` e
   `/dict/en/manifest.json` no domínio do app. Consulte uma palavra em cada
   idioma e repita em modo avião para confirmar o cache dos fragmentos.

## Dicionários completos no aparelho

Em **Sua conta → Dicionários offline**, baixe português ou inglês antes de
ficar sem rede. O app pode retomar uma transferência interrompida, buscar
atualizações e remover os dados de cada idioma individualmente.

Os fragmentos versionados do Storage são transferidos por um worker. O
worker guarda pequenos blocos comprimidos no IndexedDB e ativa a edição
somente depois de gravar todos os fragmentos. Durante uma atualização,
a edição anterior continua disponível. A busca usa o bloco local da
palavra e segue referências para o lema, sem acessar a rede quando o
idioma está instalado.

Consulte uma palavra após baixar o idioma, recarregue o PWA em modo
avião e consulte uma palavra nova. Repita no iPhone e no Android. O
navegador pode liberar dados deste aparelho quando falta armazenamento.
