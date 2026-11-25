import { strFromU8, unzipSync } from "fflate";
import { EPUB } from "@/vendor/foliate/epub";

const maxEntryBytes = 10 * 1024 * 1024;

export async function openEpub(file: Blob) {
  const archive = new Uint8Array(await file.arrayBuffer());
  const sizes = new Map<string, number>();
  unzipSync(archive, { filter: entry => {
    if (sizes.has(entry.name)) throw new Error("Duplicate EPUB entry");
    sizes.set(entry.name, entry.originalSize);
    return false;
  } });

  function load(name: string) {
    const size = sizes.get(name);
    if (size === undefined) return null;
    if (size > maxEntryBytes) throw new Error("EPUB entry exceeds size limit");
    return unzipSync(archive, { filter: entry => entry.name === name })[name] ?? null;
  }

  return new EPUB({
    loadText: name => {
      const bytes = load(name);
      if (!bytes) return null;
      const text = strFromU8(bytes).replace(/<!DOCTYPE\s+html\s*>/gi, "");
      if (/<!\s*(DOCTYPE|ENTITY)\b/i.test(text)) throw new Error("Unsupported EPUB declaration");
      return text;
    },
    loadBlob: (name, type) => {
      const bytes = load(name);
      return bytes ? new Blob([Uint8Array.from(bytes)], { type }) : null;
    },
    getSize: name => sizes.get(name) ?? 0,
  }).init();
}
