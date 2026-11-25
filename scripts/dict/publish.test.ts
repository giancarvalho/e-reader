import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import { publishDictionary } from "./publish.mjs";

const sha256 = "a".repeat(64);
const shard = "{}";

async function withCorpus(run: (root: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), "dictionary-publish-"));
  try {
    const directory = join(root, "pt");
    await mkdir(directory);
    await writeFile(join(directory, "manifest.json"), JSON.stringify({ sha256, prefixes: ["ag", "other"] }));
    await writeFile(join(directory, "ag.json"), shard);
    await writeFile(join(directory, "other.json"), shard);
    await run(root);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
}

it("publishes versioned shards before switching the live manifest", async () => {
  await withCorpus(async root => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    await publishDictionary({ upload }, root, "pt");
    expect(upload).toHaveBeenCalledTimes(3);
    expect(upload).toHaveBeenCalledWith(`pt/${sha256}/ag.json`, Buffer.from(shard), {
      cacheControl: "31536000", contentType: "application/json", upsert: false,
    });
    expect(upload).toHaveBeenLastCalledWith("pt/manifest.json", expect.any(Buffer), {
      cacheControl: "60", contentType: "application/json", upsert: true,
    });
  });
});

it("keeps the old manifest when a shard upload fails", async () => {
  await withCorpus(async root => {
    const upload = vi.fn().mockResolvedValue({ error: { message: "Unavailable" } });
    await expect(publishDictionary({ upload }, root, "pt")).rejects.toThrow("Unavailable");
    expect(upload.mock.calls.map(([path]) => path)).not.toContain("pt/manifest.json");
  });
});

it("can resume a partial upload when already published shards match", async () => {
  await withCorpus(async root => {
    const upload = vi.fn().mockImplementation(async (path: string) => ({
      error: path.includes(sha256) ? { statusCode: "409", message: "Already exists" } : null,
    }));
    const download = vi.fn().mockResolvedValue({ error: null, data: new Blob([shard]) });
    await publishDictionary({ upload, download }, root, "pt");
    expect(download).toHaveBeenCalledTimes(2);
    expect(upload.mock.lastCall?.[0]).toBe("pt/manifest.json");
  });
});
