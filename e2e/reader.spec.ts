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
      userId: "reader", groupId: "group", hash, file: Uint8Array.from(bytes).buffer, cover: null,
    });
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = event => reject((event.target as IDBRequest).error ?? transaction.error);
    });
    db.close();
  }, { bytes: Array.from(bytes), hash });

  await page.goto(`/ler#${hash}`);
  const controls = () => page.getByRole("button", { name: "Mostrar controles de leitura" }).click();
  const closePanel = () => page.getByRole("button", { name: "Fechar painel", exact: true }).click();
  await expect(page.getByRole("button", { name: "Mostrar controles de leitura" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Próxima página" })).toHaveCount(0);
  const viewportHeight = await page.locator("foliate-view").evaluate(element => element.clientHeight);
  await controls();
  await expect(page.getByRole("button", { name: "Próxima página" })).toBeVisible();
  expect(await page.locator("foliate-view").evaluate(element => element.clientHeight)).toBe(viewportHeight);
  async function chapterVisible(text: string) {
    const views = page.frames().filter(frame => frame.url().startsWith("blob:"));
    return (await Promise.all(views.map(frame => frame.getByText(text).isVisible().catch(() => false)))).some(Boolean);
  }
  await expect.poll(() => chapterVisible("Primeiro capítulo")).toBe(true);
  expect(await page.locator("body").getAttribute("data-epub-script")).toBeNull();
  expect(remote).toEqual([]);
  await page.getByRole("button", { name: "Sumário", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Sumário" })).toBeVisible();
  await page.getByRole("button", { name: "Dois", exact: true }).click();
  await expect.poll(() => chapterVisible("Segundo capítulo")).toBe(true);
  await expect(page.getByRole("dialog", { name: "Sumário" })).toHaveCount(0);
  await expect.poll(async () => page.evaluate(async () => {
    const open = indexedDB.open("e-reader-library");
    const db = await new Promise<IDBDatabase>(resolve => { open.onsuccess = () => resolve(open.result); });
    const count = db.transaction("positions").objectStore("positions").count();
    return new Promise<number>(resolve => { count.onsuccess = () => { db.close(); resolve(count.result); }; });
  })).toBe(1);

  await controls();
  await page.getByRole("button", { name: "Aparência", exact: true }).click();
  await page.getByRole("button", { name: "Noite", exact: true }).click();
  await expect(page.locator("section[data-theme=night]")).toBeVisible();
  await page.getByRole("button", { name: "Personalizado", exact: true }).click();
  await page.getByLabel("Cor de fundo").fill("#333333");
  await page.getByLabel("Cor do texto").fill("#333333");
  await expect(page.getByText("O contraste está abaixo do recomendado para leitura.")).toBeVisible();
  await expect.poll(async () => page.evaluate(async () => {
    const open = indexedDB.open("e-reader-library");
    const db = await new Promise<IDBDatabase>(resolve => { open.onsuccess = () => resolve(open.result); });
    const read = db.transaction("readerPreferences").objectStore("readerPreferences").get("reader");
    return new Promise<string>(resolve => {
      read.onsuccess = () => { db.close(); resolve(read.result?.value.ink); };
    });
  })).toBe("#333333");
  await closePanel();

  if (process.env.TEST_DICTIONARY) {
    const frame = page.frames().find(entry => entry.url().startsWith("blob:"));
    if (!frame) throw new Error("Missing chapter frame");
    await frame.getByText("Segundo capítulo").evaluate(selectChapterWord);
    await page.getByRole("button", { name: "Consultar dicionário" }).click();
    const dictionary = page.getByRole("dialog", { name: "capítulo" });
    await expect(dictionary.getByText("Uma divisão de um livro.")).toBeVisible();
    await expect(dictionary.getByRole("link", { name: "CC BY-SA 4.0" })).toBeVisible();
    await dictionary.getByRole("button", { name: "Fechar dicionário" }).click();
  }

  if (browserName === "webkit") return;
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("section[data-theme=custom]")).toBeVisible();
  await expect.poll(() => chapterVisible("Segundo capítulo")).toBe(true);
  if (process.env.TEST_DICTIONARY) {
    const frame = page.frames().find(entry => entry.url().startsWith("blob:"));
    if (!frame) throw new Error("Missing chapter frame");
    await frame.getByText("Segundo capítulo").evaluate(selectChapterWord);
    await page.getByRole("button", { name: "Consultar dicionário" }).click();
    const dictionary = page.getByRole("dialog", { name: "capítulo" });
    await expect(dictionary.getByText("Uma divisão de um livro.")).toBeVisible();
    await dictionary.getByRole("button", { name: "Fechar dicionário" }).click();
  }
  const visibleFrame = page.frames().find(frame => frame.url().startsWith("blob:"));
  if (!visibleFrame) throw new Error("Missing reading frame");
  await visibleFrame.getByText("Segundo capítulo").evaluate(element => {
    const selection = element.ownerDocument.getSelection();
    const range = element.ownerDocument.createRange();
    range.selectNodeContents(element);
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
  await expect(page.getByRole("heading", { name: "Novo grifo" })).toBeVisible();
  await page.getByLabel("Verde", { exact: true }).check();
  await page.getByRole("textbox", { name: "Nota opcional" }).fill("Leitura sem rede");
  await page.getByRole("button", { name: "Salvar grifo" }).click();
  await page.reload();
  await controls();
  await expect(page.getByText("Grifos (1)", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Grifos (1)", exact: true }).click();
  await page.getByRole("dialog", { name: "Grifos", exact: true }).locator("summary").first().click();
  await expect(page.getByText("Leitura sem rede")).toBeVisible();
  await page.getByRole("button", { name: "Comentários (0)" }).click();
  const thread = page.getByRole("dialog", { name: "Comentários do grifo" });
  await thread.getByRole("textbox", { name: "Escreva uma resposta" }).fill("Resposta offline");
  await thread.getByRole("button", { name: "Enviar resposta" }).click();
  await expect(thread.getByText("Resposta offline")).toBeVisible();
  await thread.getByRole("button", { name: "Fechar comentários" }).click();
  await expect(page.getByRole("button", { name: "Comentários (1)" })).toBeVisible();
  await page.reload();
  await controls();
  await page.getByRole("button", { name: "Grifos (1)", exact: true }).click();
  await page.getByRole("dialog", { name: "Grifos", exact: true }).locator("summary").first().click();
  await page.getByRole("button", { name: "Comentários (1)" }).click();
  await expect(thread.getByText("Resposta offline")).toBeVisible();
  await thread.getByRole("button", { name: "Apagar comentário" }).click();
  await expect(thread.getByText("Resposta offline")).toHaveCount(0);
  await thread.getByRole("button", { name: "Fechar comentários" }).click();
  await page.getByRole("button", { name: "Editar grifo" }).click();
  await page.getByRole("button", { name: "Apagar grifo" }).click();
  await expect(page.getByText("Grifos (0)", { exact: true })).toBeVisible();
});

function selectChapterWord(element: Element) {
  const text = element.firstChild;
  if (!text) throw new Error("Missing chapter text");
  const selection = element.ownerDocument.getSelection();
  const range = element.ownerDocument.createRange();
  range.setStart(text, "Segundo ".length);
  range.setEnd(text, "Segundo capítulo".length);
  selection?.removeAllRanges();
  selection?.addRange(range);
}
