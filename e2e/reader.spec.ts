import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";
import { strToU8, zipSync } from "fflate";

const xhtml = (body: string) =>
  `<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Leitura</title></head><body>${body}</body></html>`;

const bytes = zipSync({
  mimetype: strToU8("application/epub+zip"),
  "META-INF/container.xml": strToU8(
    '<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
  ),
  "book.opf": strToU8(`<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book">example-reader</dc:identifier>
    <dc:title>Livro de teste</dc:title><dc:language>pt</dc:language></metadata>
    <manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="one" href="one.xhtml" media-type="application/xhtml+xml"/>
    <item id="two" href="two.xhtml" media-type="application/xhtml+xml"/></manifest>
    <spine><itemref idref="one"/><itemref idref="two"/></spine></package>`),
  "nav.xhtml": strToU8(xhtml('<nav xmlns:epub="http://www.idpf.org/2007/ops" epub:type="toc"><ol><li><a href="one.xhtml">Um</a></li><li><a href="two.xhtml">Dois</a></li></ol></nav>')),
  "one.xhtml": strToU8(xhtml('<p>Primeiro capítulo</p><script>parent.document.body.dataset.epubScript = "executed"</script><img src="https://example.invalid/tracker.png" alt=""/>')),
  "two.xhtml": strToU8(xhtml("<p>Segundo capítulo</p>")),
});

test("opens a local EPUB, navigates its index and restores the last chapter offline", async ({ page, context, browserName }) => {
  const hash = createHash("sha256").update(bytes).digest("hex");
  const remote: string[] = [];
  page.on("request", request => {
    if (request.url().includes("example.invalid")) remote.push(request.url());
  });

  await page.goto("/estante-offline");
  await page.getByText("Conecte-se para baixar livros neste aparelho.").waitFor();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.evaluate(async ({ bytes, hash }) => {
    const request = indexedDB.open("e-reader-library");
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = db.transaction(["shelf", "files"], "readwrite");
    transaction.objectStore("shelf").put({
      userId: "reader",
      books: [{
        id: hash, group_id: "group", title: "Livro de teste", author: null, language: "pt",
        cover_path: null, position: 0, is_current: true,
      }],
    }, "active");
    transaction.objectStore("files").put({
      userId: "reader", groupId: "group", hash, file: new Blob([Uint8Array.from(bytes)]), cover: null,
    });
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  }, { bytes: Array.from(bytes), hash });

  await page.goto(`/ler#${hash}`);
  await expect(page.getByRole("button", { name: "Próxima página" })).toBeVisible();
  async function chapterVisible(text: string) {
    const views = page.frames().filter(frame => frame.url().startsWith("blob:"));
    return (await Promise.all(views.map(frame => frame.getByText(text).isVisible().catch(() => false)))).some(Boolean);
  }
  await expect.poll(() => chapterVisible("Primeiro capítulo")).toBe(true);
  expect(await page.locator("body").getAttribute("data-epub-script")).toBeNull();
  expect(remote).toEqual([]);
  await page.getByText("Índice", { exact: true }).click();
  await page.getByRole("button", { name: "Dois", exact: true }).click();
  await expect.poll(() => chapterVisible("Segundo capítulo")).toBe(true);
  await expect.poll(async () => page.evaluate(async () => {
    const open = indexedDB.open("e-reader-library");
    const db = await new Promise<IDBDatabase>(resolve => { open.onsuccess = () => resolve(open.result); });
    const count = db.transaction("positions").objectStore("positions").count();
    return new Promise<number>(resolve => { count.onsuccess = () => { db.close(); resolve(count.result); }; });
  })).toBe(1);

  if (browserName === "webkit") return;
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("button", { name: "Próxima página" })).toBeVisible();
  await expect.poll(() => chapterVisible("Segundo capítulo")).toBe(true);
});
