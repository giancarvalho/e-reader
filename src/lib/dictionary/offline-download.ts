import { fetchDictionaryCatalog, fetchDictionaryShard, type DictionaryLanguage } from "./catalog";
import { activateDictionary, dictionaryLock, installedCatalog, savedPrefixes, saveDictionaryShard } from "./offline-store";

export type DictionaryProgress = { done: number; total: number };
export type DictionaryDownloadMessage =
  | { type: "progress"; progress: DictionaryProgress }
  | { type: "done" | "paused" }
  | { type: "error"; reason: "storage" | "network" };

export function downloadDictionary(language: DictionaryLanguage, signal: AbortSignal, progress: (value: DictionaryProgress) => void) {
  const download = async () => {
    const catalog = await fetchDictionaryCatalog(language, signal);
    const { prefixes, sha256 } = catalog;
    if ((await installedCatalog(language))?.sha256 === sha256) return;
    const completed = await savedPrefixes(language, sha256);
    const total = prefixes.length;
    const pending = prefixes.filter(prefix => !completed.has(prefix));
    let done = total - pending.length;
    progress({ done, total });

    const parallel = 5;
    for (let offset = 0; offset < pending.length; offset += parallel) {
      signal.throwIfAborted();
      const results = await Promise.allSettled(pending.slice(offset, offset + parallel).map(async prefix => {
        const shard = await fetchDictionaryShard(language, sha256, prefix, signal);
        signal.throwIfAborted();
        await saveDictionaryShard([language, sha256, prefix], shard);
        progress({ done: ++done, total });
      }));
      const failed = results.find(result => result.status === "rejected");
      if (failed) throw failed.reason;
    }
    signal.throwIfAborted();
    await activateDictionary(language, catalog);
  };

  return navigator.locks
    ? navigator.locks.request(dictionaryLock(language), { signal }, download)
    : download();
}
