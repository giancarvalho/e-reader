// @vitest-environment jsdom
import { strToU8, zipSync } from "fflate";
import { expect, it } from "vitest";
import { inspectEpub } from "./inspect";

function epub(overrides: Record<string, Uint8Array> = {}) {
  return new Blob([Uint8Array.from(zipSync({
    mimetype: strToU8("application/epub+zip"),
    "META-INF/container.xml": strToU8('<container><rootfiles><rootfile full-path="EPUB/book.opf"/></rootfiles></container>'),
    "EPUB/book.opf": strToU8(`<package><metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:title> A Biblioteca </dc:title><dc:creator>Ana</dc:creator><dc:language>pt-BR</dc:language>
      </metadata><manifest><item id="cover" href="../images/capa.png" properties="cover-image"/></manifest></package>`),
    "images/capa.png": Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
    ...overrides,
  }))]);
}

it("extracts EPUB metadata, cover and a stable SHA-256 from the actual bytes", async () => {
  const file = epub();
  const info = await inspectEpub(file);
  expect(info).toMatchObject({ title: "A Biblioteca", author: "Ana", language: "pt-BR" });
  expect(info.cover?.type).toBe("image/png");
  expect(info.hash).toMatch(/^[a-f0-9]{64}$/);
  expect((await inspectEpub(file)).hash).toBe(info.hash);
});

it("does not publish SVG as a cover", async () => {
  const info = await inspectEpub(epub({ "images/capa.png": strToU8("<svg/>") }));
  expect(info.cover).toBeNull();
});

it("rejects invalid ZIPs and XML with external entities", async () => {
  await expect(inspectEpub(new Blob(["invalid"]))).rejects.toThrow();
  await expect(inspectEpub(epub({
    "META-INF/container.xml": strToU8('<!DOCTYPE container SYSTEM "https://example.test/evil"><container/>'),
  }))).rejects.toThrow("Unsupported EPUB XML declaration");
});
