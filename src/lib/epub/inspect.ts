import { strFromU8, unzipSync } from "fflate";

export const maxEpubBytes = 20 * 1024 * 1024;
const maxXmlBytes = 512 * 1024;
const maxCoverBytes = 2 * 1024 * 1024;
const containerPath = "META-INF/container.xml";
const identifier = "application/epub+zip";

function xml(bytes: Uint8Array | undefined) {
  if (!bytes) throw new Error("Missing EPUB XML entry");
  const source = strFromU8(bytes);
  if (/<!\s*(DOCTYPE|ENTITY)\b/i.test(source)) throw new Error("Unsupported EPUB XML declaration");
  const document = new DOMParser().parseFromString(source, "application/xml");
  if (document.getElementsByTagNameNS("*", "parsererror").length) throw new Error("Invalid EPUB XML");
  return document;
}

function archivePath(base: string, relative: string) {
  const path = decodeURIComponent(relative);
  if (/^\/|[\\:?#\u0000]/.test(path)) throw new Error("Invalid EPUB entry path");
  const parts = base.split("/").slice(0, -1);
  for (const segment of path.split("/")) {
    if (segment === "..") {
      if (!parts.length) throw new Error("EPUB entry escapes archive");
      parts.pop();
    } else if (segment && segment !== ".") parts.push(segment);
  }
  return parts.join("/");
}

function coverMime(bytes: Uint8Array) {
  const prefix = String.fromCharCode(...bytes.subarray(0, 12));
  if (prefix.startsWith("\x89PNG\r\n\x1a\n")) return "image/png";
  if (prefix.startsWith("\xff\xd8\xff")) return "image/jpeg";
  if (/^GIF8[79]a/.test(prefix)) return "image/gif";
  if (prefix.startsWith("RIFF") && prefix.slice(8, 12) === "WEBP") return "image/webp";
  return null;
}

export async function sha256(bytes: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function inspectEpub(file: Blob) {
  if (!file.size || file.size > maxEpubBytes) throw new Error("Invalid EPUB size");
  const bytes = await file.arrayBuffer();
  const archive = new Uint8Array(bytes);
  const initial = unzipSync(archive, { filter: entry =>
    (entry.name === "mimetype" && entry.originalSize === identifier.length)
      || (entry.name === containerPath && entry.originalSize <= maxXmlBytes),
  });
  if (!initial.mimetype || strFromU8(initial.mimetype) !== identifier) throw new Error("Invalid EPUB type");

  const container = xml(initial[containerPath]);
  const rootfile = container.getElementsByTagNameNS("*", "rootfile")[0]?.getAttribute("full-path");
  if (!rootfile) throw new Error("Missing EPUB package path");

  const packagePath = archivePath("", rootfile);
  const entries = unzipSync(archive, { filter: entry =>
    entry.name === packagePath && entry.originalSize <= maxXmlBytes,
  });
  const document = xml(entries[packagePath]);
  const metadata = document.getElementsByTagNameNS("*", "metadata")[0];
  const manifest = document.getElementsByTagNameNS("*", "manifest")[0];
  if (document.documentElement.localName !== "package" || !metadata || !manifest) {
    throw new Error("Missing EPUB package metadata");
  }

  const dc = "http://purl.org/dc/elements/1.1/";
  const read = (name: string, limit: number) =>
    metadata.getElementsByTagNameNS(dc, name)[0]?.textContent?.trim().slice(0, limit) || null;
  const title = read("title", 300);
  if (!title) throw new Error("Missing EPUB title");

  const legacyCover = Array.from(metadata.getElementsByTagNameNS("*", "meta"))
    .find(element => element.getAttribute("name") === "cover")?.getAttribute("content");
  const href = Array.from(manifest.getElementsByTagNameNS("*", "item"))
    .find(element => element.getAttribute("properties")?.split(/\s+/).includes("cover-image")
      || (legacyCover && element.getAttribute("id") === legacyCover))
    ?.getAttribute("href");

  let cover: Blob | null = null;
  if (href) {
    const path = archivePath(packagePath, href);
    const image = unzipSync(archive, { filter: entry =>
      entry.name === path && entry.originalSize <= maxCoverBytes,
    })[path];
    const mime = image && coverMime(image);
    if (mime) cover = new Blob([Uint8Array.from(image)], { type: mime });
  }

  return { hash: await sha256(bytes), title, author: read("creator", 300), language: read("language", 64), cover };
}
