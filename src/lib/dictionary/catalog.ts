export type DictionaryLanguage = "pt" | "en";
export type Definition = { text: string; pos: string };
export type DictionaryEntry = { definitions: Definition[]; lemmas: string[] };
export type DictionaryShard = Record<string, DictionaryEntry>;
export type DictionaryCatalog = { sha256: string; prefixes: string[] };

export async function fetchDictionaryCatalog(language: DictionaryLanguage, signal?: AbortSignal): Promise<DictionaryCatalog> {
  const response = await fetch(`/dict/${language}/manifest.json`, { signal });
  if (!response.ok) throw new Error("Dictionary manifest unavailable");
  const { sha256, prefixes } = await response.json();
  if (typeof sha256 !== "string" || !/^[a-f0-9]{64}$/.test(sha256) || !Array.isArray(prefixes)
    || !prefixes.length || new Set(prefixes).size !== prefixes.length
    || prefixes.some(prefix => typeof prefix !== "string" || !/^(?:[a-z]{1,2}|other)$/.test(prefix))) {
    throw new Error("Invalid dictionary manifest");
  }
  return { sha256, prefixes };
}

export async function fetchDictionaryShard(language: DictionaryLanguage, revision: string, prefix: string,
  download?: AbortSignal,
): Promise<DictionaryShard> {
  const url = `/dict/${language}/${prefix}.json?v=${revision}${download ? "&pack=1" : ""}`;
  const response = await fetch(url, download ? { signal: download, cache: "no-store" } : undefined);
  if (!response.ok) throw new Error("Dictionary prefix unavailable");
  return response.json();
}
