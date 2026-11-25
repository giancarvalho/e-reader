import { normalizeWord, wordPrefix } from "./words.mjs";

export type DictionaryLanguage = "pt" | "en";
export type Definition = { text: string; pos: string };
export type DictionaryEntry = { definitions: Definition[]; lemmas: string[] };
export type DictionaryShard = Record<string, DictionaryEntry>;
type Match = { word: string; definitions: Definition[] };

export function detectDictionaryLanguage(language?: string | null, sample = ""): DictionaryLanguage {
  const primary = language?.toLowerCase().split(/[-_]/)[0];
  if (primary === "en" || primary === "pt") return primary;

  const words = sample.toLowerCase().match(/\p{L}+/gu) ?? [];
  let portuguese = 0;
  let english = 0;
  for (const word of words) {
    if (["não", "que", "para", "uma", "com", "dos"].includes(word)) portuguese++;
    if (["the", "and", "with", "from", "was", "have"].includes(word)) english++;
  }
  return english > portuguese ? "en" : "pt";
}

export function dictionaryWord(selection: string) {
  const word = normalizeWord(selection);
  return word.length <= 100 && /^\p{L}+(?:[-']\p{L}+)*$/u.test(word) ? word : null;
}

export async function findDefinitions(word: string, load: (prefix: string) => Promise<DictionaryShard>): Promise<Match[]> {
  const queue = [word];
  const visited = new Set<string>();
  const shards = new Map<string, Promise<DictionaryShard>>();
  const matches: Match[] = [];
  let failure: unknown;

  for (let i = 0; i < queue.length && visited.size < 16 && matches.length < 6; i++) {
    const candidate = queue[i];
    if (visited.has(candidate)) continue;
    visited.add(candidate);
    const prefix = wordPrefix(candidate);
    if (!shards.has(prefix)) shards.set(prefix, load(prefix));
    let shard: DictionaryShard;
    try {
      shard = await shards.get(prefix)!;
    } catch (error) {
      failure = error;
      if (i === 0 && word.includes("-")) queue.push(word.split("-")[0]);
      continue;
    }
    const entry = Object.hasOwn(shard, candidate) ? shard[candidate] : undefined;
    if (entry?.definitions.length) matches.push({ word: candidate, definitions: entry.definitions });
    if (entry) queue.push(...entry.lemmas);
    if (i === 0 && word.includes("-")) queue.push(word.split("-")[0]);
  }
  if (!matches.length && failure) throw failure;
  return matches;
}

export async function lookupDictionary(language: DictionaryLanguage, word: string) {
  const root = `/dict/${language}`;
  const response = await fetch(`${root}/manifest.json`);
  if (!response.ok) throw new Error("Dictionary manifest unavailable");
  const manifest = await response.json() as { sha256?: string; prefixes?: string[] };
  if (!manifest.sha256 || !/^[a-f0-9]{64}$/.test(manifest.sha256) || !Array.isArray(manifest.prefixes)) {
    throw new Error("Invalid dictionary manifest");
  }

  return findDefinitions(word, async prefix => {
    if (!manifest.prefixes?.includes(prefix)) return {};
    const shard = await fetch(`${root}/${prefix}.json?v=${manifest.sha256}`);
    if (!shard.ok) throw new Error("Dictionary prefix unavailable");
    return shard.json() as Promise<DictionaryShard>;
  });
}
