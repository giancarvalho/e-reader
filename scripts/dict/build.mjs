import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { appendFile, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { Transform } from "node:stream";
import { createGunzip } from "node:zlib";
import { normalizeWord, wordPrefix } from "../../src/lib/dictionary/words.mjs";

const sources = {
  pt: {
    url: "https://kaikki.org/ptwiktionary/rawdata.html",
    download: "https://kaikki.org/ptwiktionary/raw-wiktextract-data.jsonl.gz",
    wiki: "https://pt.wiktionary.org/wiki/",
  },
  en: {
    url: "https://kaikki.org/dictionary/rawdata.html",
    download: "https://kaikki.org/dictionary/raw-wiktextract-data.jsonl.gz",
    wiki: "https://en.wiktionary.org/wiki/",
  },
};

const license = "https://creativecommons.org/licenses/by-sa/4.0/";

function normalizeEntry(raw, language) {
  if (raw.lang_code !== language || typeof raw.word !== "string" || !Array.isArray(raw.senses)) return null;
  const word = normalizeWord(raw.word);
  if (!word || word.length > 100 || !/^[\p{L}\p{N}][\p{L}\p{M}\p{N}'’ -]*$/u.test(word)) return null;
  const definitions = [];
  const lemmas = new Set();
  for (const sense of raw.senses) {
    if (Array.isArray(sense.form_of) && sense.form_of.length) {
      for (const item of sense.form_of) {
        if (typeof item.word === "string") {
          const lemma = normalizeWord(item.word);
          if (lemma && lemma !== word && lemma.length <= 100) lemmas.add(lemma);
        }
      }
      continue;
    }
    const gloss = Array.isArray(sense.glosses) ? sense.glosses.find(value => typeof value === "string" && value.trim()) : null;
    if (gloss) definitions.push({ text: gloss.trim().slice(0, 1200), pos: typeof raw.pos === "string" ? raw.pos : "" });
  }
  if (!definitions.length && !lemmas.size) return null;
  return { word, definitions: definitions.slice(0, 12), lemmas: [...lemmas].slice(0, 12) };
}

function combine(records) {
  const entries = Object.create(null);
  for (const record of records) {
    const entry = entries[record.word] ??= { definitions: [], lemmas: [] };
    for (const definition of record.definitions) {
      const duplicate = entry.definitions.some(previous => previous.text === definition.text && previous.pos === definition.pos);
      if (!duplicate && entry.definitions.length < 12) entry.definitions.push(definition);
    }
    for (const lemma of record.lemmas) {
      if (!entry.lemmas.includes(lemma) && entry.lemmas.length < 12) entry.lemmas.push(lemma);
    }
  }
  return entries;
}

export async function buildDictionary({ language, input, output, revision }) {
  const source = sources[language];
  if (!source || !input || !output || !revision) throw new Error("Pass language, input dump, output directory and source revision.");

  const target = resolve(output, language);
  await mkdir(dirname(target), { recursive: true });
  const work = await mkdtemp(join(dirname(target), ".dictionary-"));
  const shards = join(work, "shards");
  const result = join(work, "generated");
  await mkdir(shards);
  await mkdir(result);

  const hash = createHash("sha256");
  const stream = input === "-" ? process.stdin : createReadStream(input);
  const digest = new Transform({
    transform(chunk, _encoding, callback) {
      hash.update(chunk);
      callback(null, chunk);
    },
  });
  stream.on("error", error => digest.destroy(error));
  let unpacked = stream.pipe(digest);
  if (input === "-" || input.endsWith(".gz")) {
    const gzip = createGunzip();
    unpacked.on("error", error => gzip.destroy(error));
    unpacked = unpacked.pipe(gzip);
  }
  const lines = createInterface({ input: unpacked, crlfDelay: Infinity });
  const buffers = new Map();
  const prefixes = new Set();
  let count = 0;

  async function flush(prefix, value) {
    await appendFile(join(shards, prefix), value);
    buffers.delete(prefix);
  }

  try {
    for await (const line of lines) {
      if (!line.trim()) continue;
      const entry = normalizeEntry(JSON.parse(line), language);
      if (!entry) continue;
      const prefix = wordPrefix(entry.word);
      const value = (buffers.get(prefix) ?? "") + JSON.stringify(entry) + "\n";
      prefixes.add(prefix);
      if (value.length >= 32_768) await flush(prefix, value);
      else buffers.set(prefix, value);
    }
    for (const [prefix, value] of buffers) await flush(prefix, value);

    for (const prefix of [...prefixes].sort()) {
      const records = (await readFile(join(shards, prefix), "utf8")).trim().split("\n").map(line => JSON.parse(line));
      const entries = combine(records);
      count += Object.keys(entries).length;
      await writeFile(join(result, `${prefix}.json`), JSON.stringify(entries));
    }
    if (!count) throw new Error("No dictionary entries found for the requested language.");
    const manifest = {
      language, revision, sha256: hash.digest("hex"), license,
      source: source.url, download: source.download, wiki: source.wiki,
      entries: count, prefixes: [...prefixes].sort(),
    };
    await writeFile(join(result, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
    await rename(result, target);
    return manifest;
  } finally {
    lines.close();
    stream.destroy();
    await rm(work, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [language, input, revision, output = "public/dict"] = process.argv.slice(2);
  buildDictionary({ language, input, output, revision }).then(manifest => {
    process.stdout.write(`${manifest.entries} entries in ${manifest.prefixes.length} shards\n`);
  }).catch(error => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
