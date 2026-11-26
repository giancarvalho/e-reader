import { normalizeWord, wordPrefix } from "./words.mjs";

import { fetchDictionaryCatalog, fetchDictionaryShard, type DictionaryCatalog, type DictionaryEntry,
  type DictionaryLanguage, type DictionaryShard } from "./catalog";
import { installedCatalog, readOfflineEntry } from "./offline-store";

export type { Definition, DictionaryEntry, DictionaryLanguage, DictionaryShard } from "./catalog";
type Match = { word: string; definitions: DictionaryEntry["definitions"] };

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
  const shards = new Map<string, Promise<DictionaryShard>>();
  return resolveDefinitions(word, async candidate => {
    const prefix = wordPrefix(candidate);
    if (!shards.has(prefix)) shards.set(prefix, load(prefix));
    const shard = await shards.get(prefix)!;
    return Object.hasOwn(shard, candidate) ? shard[candidate] : undefined;
  });
}

async function resolveDefinitions(word: string, read: (candidate: string) => Promise<DictionaryEntry | undefined>): Promise<Match[]> {
  const queue = [word];
  const visited = new Set<string>();
  const matches: Match[] = [];
  let failure: unknown;

  for (let i = 0; i < queue.length && visited.size < 16 && matches.length < 6; i++) {
    const candidate = queue[i];
    if (visited.has(candidate)) continue;
    visited.add(candidate);
    let entry: DictionaryEntry | undefined;
    try {
      entry = await read(candidate);
    } catch (error) {
      failure = error;
      if (i === 0 && word.includes("-")) queue.push(word.split("-")[0]);
      continue;
    }
    if (entry?.definitions.length) matches.push({ word: candidate, definitions: entry.definitions });
    if (entry) queue.push(...entry.lemmas);
    if (i === 0 && word.includes("-")) queue.push(word.split("-")[0]);
  }
  if (!matches.length && failure) throw failure;
  return matches;
}

const onlineCatalogs = new Map<DictionaryLanguage, { expires: number; value: Promise<DictionaryCatalog> }>();
const onlineShards = new Map<string, Promise<DictionaryShard>>();

function onlineCatalog(language: DictionaryLanguage) {
  const cached = onlineCatalogs.get(language);
  if (cached && cached.expires > Date.now()) return cached.value;
  const value = fetchDictionaryCatalog(language);
  onlineCatalogs.set(language, { value, expires: Date.now() + 60_000 });
  value.catch(() => { if (onlineCatalogs.get(language)?.value === value) onlineCatalogs.delete(language); });
  return value;
}

function onlineShard(language: DictionaryLanguage, revision: string, prefix: string) {
  const key = `${language}:${revision}:${prefix}`;
  let value = onlineShards.get(key);
  if (!value) {
    value = fetchDictionaryShard(language, revision, prefix);
    value.catch(() => { if (onlineShards.get(key) === value) onlineShards.delete(key); });
    if (onlineShards.size >= 4) onlineShards.delete(onlineShards.keys().next().value!);
  }
  onlineShards.delete(key);
  onlineShards.set(key, value);
  return value;
}

export async function lookupDictionary(language: DictionaryLanguage, word: string) {
  const local = await installedCatalog(language).catch(() => undefined);
  if (local) return resolveDefinitions(word, candidate => readOfflineEntry(language, local, candidate));

  const catalog = await onlineCatalog(language);
  return findDefinitions(word, async prefix => catalog.prefixes.includes(prefix)
    ? onlineShard(language, catalog.sha256, prefix)
    : {});
}
