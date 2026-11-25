import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { expect, it } from "vitest";
import { buildDictionary } from "./build.mjs";

it("builds reproducible language shards, preserving definitions and form links", async () => {
  const dir = await mkdtemp(join(tmpdir(), "epub-dictionary-"));
  try {
    const input = join(dir, "fixture.jsonl.gz");
    const rows = [
      { lang_code: "pt", word: "Água", pos: "noun", senses: [{ glosses: ["Substância líquida."] }] },
      { lang_code: "pt", word: "águas", pos: "noun", senses: [{ form_of: [{ word: "Água" }] }] },
      { lang_code: "en", word: "water", pos: "noun", senses: [{ glosses: ["Liquid substance."] }] },
    ];
    await writeFile(input, gzipSync(rows.map(row => JSON.stringify(row)).join("\n")));
    const output = join(dir, "output");
    const manifest = await buildDictionary({ language: "pt", input, output, revision: "test" });
    expect(manifest).toMatchObject({ language: "pt", entries: 2, prefixes: ["ag"], revision: "test" });
    expect(manifest.sha256).toMatch(/^[0-9a-f]{64}$/);
    const shard = JSON.parse(await readFile(join(output, "pt", "ag.json"), "utf8"));
    expect(shard).toMatchObject({
      água: { definitions: [{ text: "Substância líquida.", pos: "noun" }] },
      águas: { lemmas: ["água"] },
    });
    expect(shard.water).toBeUndefined();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
