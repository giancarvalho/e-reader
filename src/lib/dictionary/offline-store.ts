import { gzipSync, gunzipSync, strFromU8, strToU8 } from "fflate";
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { DictionaryCatalog, DictionaryLanguage, DictionaryShard } from "./catalog";
import { wordPrefix } from "./words.mjs";

type ShardKey = [DictionaryLanguage, string, string];
type BlockKey = [...ShardKey, number];

interface DictionaryDatabase extends DBSchema {
  catalogs: { key: DictionaryLanguage; value: DictionaryCatalog };
  completed: { key: ShardKey; value: true };
  blocks: { key: BlockKey; value: Uint8Array };
}

let connection: Promise<IDBPDatabase<DictionaryDatabase>> | undefined;

function openDictionary() {
  connection ??= openDB<DictionaryDatabase>("shared-margins-dictionaries", 1, {
    upgrade(db) {
      db.createObjectStore("catalogs");
      db.createObjectStore("completed");
      db.createObjectStore("blocks");
    },
    blocking(_current, _next, event) {
      (event.target as IDBDatabase).close();
      connection = undefined;
    },
    terminated() { connection = undefined; },
  }).catch(error => {
    connection = undefined;
    throw error;
  });
  return connection;
}

function languageRange(language: DictionaryLanguage) {
  return IDBKeyRange.bound([language], [language, "\uffff"]);
}

function revisionRange(language: DictionaryLanguage, revision: string) {
  return IDBKeyRange.bound([language, revision], [language, revision, "\uffff"]);
}

export async function installedCatalog(language: DictionaryLanguage) {
  return (await openDictionary()).get("catalogs", language);
}

export async function hasDownloadedShards(language: DictionaryLanguage) {
  return (await (await openDictionary()).count("completed", languageRange(language))) > 0;
}

export async function savedPrefixes(language: DictionaryLanguage, revision: string) {
  const keys = await (await openDictionary()).getAllKeys("completed", revisionRange(language, revision));
  return new Set(keys.map(([, , prefix]) => prefix));
}

function blockIndex(word: string) {
  let hash = 2166136261;
  for (let i = 0; i < word.length; i++) hash = Math.imul(hash ^ word.charCodeAt(i), 16777619);
  return (hash >>> 0) % 32;
}

export async function saveDictionaryShard(key: ShardKey, shard: DictionaryShard) {
  if (!shard || typeof shard !== "object" || Array.isArray(shard)) throw new Error("Invalid dictionary shard");
  const groups = new Map<number, DictionaryShard>();
  for (const [word, entry] of Object.entries(shard)) {
    const index = blockIndex(word);
    let block = groups.get(index);
    if (!block) {
      block = Object.create(null) as DictionaryShard;
      groups.set(index, block);
    }
    block[word] = entry;
  }
  const compressed = [...groups].map(([index, words]) =>
    [index, gzipSync(strToU8(JSON.stringify(words)), { level: 3 })] as const);
  const db = await openDictionary();
  const transaction = db.transaction(["blocks", "completed"], "readwrite");
  await Promise.all([
    ...compressed.map(([index, buffer]) => transaction.objectStore("blocks").put(buffer, [...key, index])),
    transaction.objectStore("completed").put(true, key),
    transaction.done,
  ]);
}

export async function activateDictionary(language: DictionaryLanguage, catalog: DictionaryCatalog) {
  const db = await openDictionary();
  await db.put("catalogs", catalog, language);
  await removeShards(language, catalog.sha256).catch(() => undefined);
}

async function removeShards(language: DictionaryLanguage, keep?: string) {
  const db = await openDictionary();
  const range = languageRange(language);
  const tx = db.transaction(["blocks", "completed", "catalogs"], "readwrite");
  if (keep) {
    const completed = tx.objectStore("completed");
    const revisions = new Set((await completed.getAllKeys(range)).map(([, revision]) => revision));
    revisions.delete(keep);
    const blocks = tx.objectStore("blocks");
    await Promise.all([...revisions].flatMap(revision => {
      const stale = revisionRange(language, revision);
      return [blocks.delete(stale), completed.delete(stale)];
    }));
  } else {
    await Promise.all([
      tx.objectStore("blocks").delete(range),
      tx.objectStore("completed").delete(range),
      tx.objectStore("catalogs").delete(language),
    ]);
  }
  await tx.done;
}

export function removeOfflineDictionary(language: DictionaryLanguage) {
  const remove = () => removeShards(language);
  return navigator.locks ? navigator.locks.request(dictionaryLock(language), remove) : remove();
}

export function dictionaryLock(language: DictionaryLanguage) {
  return `shared-margins-dictionary-${language}`;
}

const recentBlocks = new Map<string, Promise<DictionaryShard>>();

export async function readOfflineEntry(language: DictionaryLanguage, catalog: DictionaryCatalog, word: string) {
  const prefix = wordPrefix(word);
  if (!catalog.prefixes.includes(prefix)) return;
  const index = blockIndex(word);
  const key = `${language}:${catalog.sha256}:${prefix}:${index}`;
  let block = recentBlocks.get(key);
  if (!block) {
    block = openDictionary().then(db => db.get("blocks", [language, catalog.sha256, prefix, index]))
      .then(bytes => bytes ? JSON.parse(strFromU8(gunzipSync(bytes))) as DictionaryShard : {});
    if (recentBlocks.size >= 16) recentBlocks.delete(recentBlocks.keys().next().value!);
    block.catch(() => recentBlocks.delete(key));
  }
  recentBlocks.delete(key);
  recentBlocks.set(key, block);
  const shard = await block;
  return Object.hasOwn(shard, word) ? shard[word] : undefined;
}
