import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

const languages = new Set(["pt", "en"]);

export async function publishDictionary(bucket, root, language) {
  if (!languages.has(language)) throw new Error("Language must be pt or en");

  const directory = join(root, language);
  const manifest = await readFile(join(directory, "manifest.json"));
  const { sha256, prefixes } = JSON.parse(manifest);
  if (typeof sha256 !== "string" || !/^[a-f0-9]{64}$/.test(sha256)
    || !Array.isArray(prefixes) || !prefixes.length
    || new Set(prefixes).size !== prefixes.length
    || !prefixes.every(prefix => typeof prefix === "string" && /^(?:[a-z]{1,2}|other)$/.test(prefix))) {
    throw new Error(`Invalid ${language} dictionary manifest`);
  }

  async function upload(path, body, cacheControl, upsert) {
    const { error } = await bucket.upload(path, body, { cacheControl, contentType: "application/json", upsert });
    if (!error) return;
    if (!upsert && (error.status === 409 || String(error.statusCode) === "409")) {
      const existing = await bucket.download(path);
      if (!existing.error && body.equals(Buffer.from(await existing.data.arrayBuffer()))) return;
    }
    throw new Error(`Could not publish ${path}: ${error.message}`);
  }

  // Leave the active manifest in place until all new shards are available.
  const parallel = 6;
  for (let offset = 0; offset < prefixes.length; offset += parallel) {
    await Promise.all(prefixes.slice(offset, offset + parallel).map(async prefix => {
      const filename = `${prefix}.json`;
      const body = await readFile(join(directory, filename));
      await upload(`${language}/${sha256}/${filename}`, body, "31536000", false);
    }));
  }
  await upload(`${language}/manifest.json`, manifest, "60", true);
}

async function main() {
  const [language, root = "public/dict"] = process.argv.slice(2);
  const { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = process.env;
  if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for this command");
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  await publishDictionary(supabase.storage.from("dictionaries"), root, language);
  console.log(`Published ${language} dictionary.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
