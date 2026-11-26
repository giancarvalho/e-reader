// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { downloadDictionary } from "./offline-download";
import { installedCatalog, removeOfflineDictionary } from "./offline-store";
import { lookupDictionary } from "./lookup";

const revision = "a".repeat(64);
const newerRevision = "b".repeat(64);
const agua = { definitions: [{ text: "Substância líquida.", pos: "noun" }], lemmas: [] };
const leve = { definitions: [{ text: "Com pouco peso.", pos: "adjective" }], lemmas: [] };

beforeEach(async () => {
  await removeOfflineDictionary("pt");
});
afterEach(vi.unstubAllGlobals);

function fixture(failedPrefix?: string, version = revision) {
  const fetcher = vi.fn(async (url: string) => {
    if (url.endsWith("/manifest.json")) return Response.json({ sha256: version, prefixes: ["ag", "le"] });
    if (failedPrefix && url.includes(`/${failedPrefix}.json`)) return new Response(null, { status: 503 });
    if (url.includes("/ag.json")) return Response.json({ água: agua });
    if (url.includes("/le.json")) return Response.json({ leve, leves: { definitions: [], lemmas: ["leve"] } });
    return new Response(null, { status: 404 });
  });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

it("reads accented entries and follows lemmas locally without making any request", async () => {
  const fetcher = fixture();
  await downloadDictionary("pt", new AbortController().signal, vi.fn());
  fetcher.mockClear();
  fetcher.mockRejectedValue(new Error("offline"));
  await expect(lookupDictionary("pt", "água")).resolves.toEqual([{ word: "água", definitions: agua.definitions }]);
  await expect(lookupDictionary("pt", "leves")).resolves.toEqual([{ word: "leve", definitions: leve.definitions }]);
  await expect(lookupDictionary("pt", "desconhecida")).resolves.toEqual([]);
  expect(fetcher).not.toHaveBeenCalled();
});

it("resumes a partial download and exposes the catalog only when all prefixes are ready", async () => {
  const abort = new AbortController();
  fixture("le");
  await expect(downloadDictionary("pt", abort.signal, vi.fn())).rejects.toThrow();
  expect(await installedCatalog("pt")).toBeUndefined();

  const fetcher = fixture();
  const progress = vi.fn();
  await downloadDictionary("pt", abort.signal, progress);
  expect(progress.mock.calls).toEqual([[{ done: 1, total: 2 }], [{ done: 2, total: 2 }]]);
  expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
    "/dict/pt/manifest.json", `/dict/pt/le.json?v=${revision}&pack=1`,
  ]);
  expect(await installedCatalog("pt")).toMatchObject({ sha256: revision });
});

it("keeps the installed edition usable after a failed update", async () => {
  fixture();
  const abort = new AbortController();
  await downloadDictionary("pt", abort.signal, vi.fn());
  const fetcher = fixture("le", newerRevision);
  await expect(downloadDictionary("pt", abort.signal, vi.fn())).rejects.toThrow();
  fetcher.mockClear();
  await expect(lookupDictionary("pt", "leves")).resolves.toHaveLength(1);
  expect(fetcher).not.toHaveBeenCalled();
  await removeOfflineDictionary("pt");
  expect(await installedCatalog("pt")).toBeUndefined();
});
