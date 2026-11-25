export function normalizeWord(value) {
  return value.normalize("NFC").toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[‐‑]/g, "-")
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

export function wordPrefix(word) {
  const folded = word.normalize("NFKD").replace(/\p{M}/gu, "");
  return folded.match(/^[a-z]{1,2}/)?.[0] ?? "other";
}
