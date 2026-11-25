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

Os arquivos gerados são artefatos do deploy. Inclua-os em `public/dict`
antes de publicar a aplicação. As definições são distribuídas sob
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
