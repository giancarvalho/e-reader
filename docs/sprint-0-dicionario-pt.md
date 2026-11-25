# Sprint 0 · Fonte do dicionário em português

**Decisão.** Usar a extração JSONL bruta do Wiktextract publicada pelo Kaikki,
filtrada por `lang_code: pt` e baseada no **Wikcionário em português**. A fonte
oferece glossas em português e relações `form_of`. O JSONL pós-processado por
idioma está sinalizado para remoção, por isso a importação deve usar a
[extração bruta](https://kaikki.org/ptwiktionary/rawdata.html).

## Amostra

Em 25/11/2026, o download bruto indicava 35,5 MB compactados e 341,6 MB
descompactados. A extração publicada era de 02/11/2026, sobre o dump
de 01/10/2026. A amostra usou 100 formas distintas do primeiro capítulo de
[Dom Casmurro](https://pt.wikisource.org/wiki/Dom_Casmurro/I), priorizando
dez casos de verbos, plurais, ênclise e ortografia histórica. O ensaio
procurou a forma exata, seguiu as relações de lema e, quando necessário,
tentou a parte anterior ao hífen.

- **92 de 100** retornaram alguma glossa. Esse número mede presença, e a
  revisão por contexto ainda está pendente.
- `encontrei`, `sentou-se`, `recitando-me` e `alcunhando-me` chegaram a
  `encontrar`, `sentar`, `recitar` e `alcunhar`.
- A escolha automática do primeiro candidato errou em `vindo`, `versos`
  e `olhos`. O pipeline deve conservar candidatos e preferir mostrar
  alternativas quando houver ambiguidade.
- Oito formas ficaram sem definição, entre elas `visinhos`, `succedeu`,
  `cançado` e `tiral-os`. Tratar ortografia histórica e ênclise como
  casos de teste da sprint 6. O critério de 90% de definições corretas
  ainda precisa de avaliação contextual em PT e EN.

## Licença e publicação

Publicar as definições e seus derivados sob **CC BY-SA 4.0**. Cada origem
deve manter link para o verbete e seu histórico, indicação da licença,
referência ao Kaikki/Wiktextract e indicação de extração ou outras
alterações. Preservar atribuições adicionais quando indicadas no verbete.
A folha do dicionário deve expor essa informação. Antes de publicar,
fixar versão e hash da fonte para reproduzir os arquivos por prefixo.
[Termos da Wikimedia](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use)
· [Licença CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
