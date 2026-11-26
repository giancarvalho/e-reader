import { createHash } from "node:crypto";
import { expect, test, type Locator } from "@playwright/test";
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

  if (process.env.TEST_DICTIONARY) {
    await page.goto("/dicionarios");
    const portuguese = page.locator("section").filter({ has: page.getByRole("heading", { name: "Português" }) });
    await portuguese.getByRole("button", { name: "Baixar dicionário" }).click();
    await expect(portuguese.getByText("Dicionário completo disponível neste aparelho.")).toBeVisible();
  }

  await page.goto(`/ler#${hash}`);
  const controls = () => page.getByRole("button", { name: "Mostrar controles de leitura" }).click();
  const closePanel = () => page.getByRole("button", { name: "Fechar painel", exact: true }).click();
  await expect(page.getByRole("button", { name: "Mostrar controles de leitura" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Próxima página" })).toHaveCount(0);
  const animated = () => page.locator("foliate-view").evaluate(element =>
    (element as HTMLElement & { renderer: HTMLElement }).renderer.hasAttribute("animated"));
  await expect.poll(animated).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(animated).toBe(false);
  await page.emulateMedia({ reducedMotion: "no-preference" });
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

  if (browserName === "webkit") {
    const view = page.locator("foliate-view");
    const swipe = (x: number, y: number, pause: number, cancelled = false) =>
      swipePaginator(view, { x, y, pause, cancelled });
    const pageOffset = () => view.evaluate(element =>
      (element as HTMLElement & { renderer: { start: number } }).renderer.start);
    const firstPageOffset = await pageOffset();
    await swipe(-54, 5, 200);
    await expect.poll(() => chapterVisible("Segundo capítulo")).toBe(true);
    await swipe(26, -3, 0);
    await expect.poll(() => chapterVisible("Primeiro capítulo")).toBe(true);
    await swipe(-8, 72, 0);
    expect(await pageOffset()).toBe(firstPageOffset);
    await swipe(-60, 0, 200, true);
    await expect.poll(pageOffset).toBe(firstPageOffset);
    await expect.poll(() => chapterVisible("Primeiro capítulo")).toBe(true);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }

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
  await expect(page.locator('head meta[name="theme-color"]').first()).toHaveAttribute("content", "rgb(23, 19, 15)");
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
    const dictionary = page.getByRole("dialog", { name: "capítulo" });
    await expect(dictionary.getByText("Uma divisão de um livro.")).toBeVisible();
    await expect(dictionary.getByText("CC BY-SA 4.0", { exact: true })).toHaveCount(0);
    await expect(dictionary.getByRole("link", { name: "Wikcionário", exact: true })).toHaveAttribute("href", "https://pt.wiktionary.org/wiki/cap%C3%ADtulo");
    await expect(dictionary.getByText("Histórico e autores", { exact: true })).toHaveCount(0);
    await expect(dictionary.getByText("Definições adaptadas", { exact: true })).toHaveCount(0);
    await dictionary.getByRole("heading", { name: "capítulo", exact: true }).click();
    await expect(dictionary).toBeVisible();
    await page.mouse.click(1, 1);
    await expect(dictionary).toHaveCount(0);
  }

  if (test.info().project.name === "android-small") {
    const frame = page.frames().find(entry => entry.url().startsWith("blob:"));
    if (!frame) throw new Error("Missing chapter frame");
    const bounds = await (await frame.frameElement()).boundingBox();
    if (!bounds) throw new Error("Missing chapter bounds");
    const points = await frame.getByText("Segundo capítulo").evaluate(element => {
      const range = element.ownerDocument.createRange();
      const text = element.firstChild!;
      return [[0, 7], [8, 16]].map(([start, end]) => {
        range.setStart(text, start);
        range.setEnd(text, end);
        const { left, top, width, height } = range.getBoundingClientRect();
        return { x: left + width / 2, y: top + height / 2 };
      });
    });
    const [begin, word] = points.map(point => ({ x: point.x + bounds.x, y: point.y + bounds.y, id: 1 }));
    const cdp = await context.newCDPSession(page);
    const dictionary = page.getByRole("dialog", { name: "capítulo" });
    const pressSelection = () => frame.evaluate(() => document.getSelection()?.toString() ?? "");
    const start = () => cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [word] });
    const release = () => cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

    await start();
    await page.waitForTimeout(1_000);
    expect(await pressSelection()).toBe("");
    await release();
    await expect(dictionary).toHaveCount(0);

    await start();
    await expect.poll(pressSelection).toBe("capítulo");
    await expect(dictionary).toHaveCount(0);
    await release();
    await expect(dictionary).toBeVisible();
    await dictionary.getByRole("button", { name: "Fechar dicionário" }).click();
    await expect.poll(pressSelection).toBe("");

    await start();
    await expect.poll(pressSelection).toBe("capítulo");
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [begin] });
    await release();
    await expect(page.getByRole("button", { name: "Verde", exact: true })).toBeVisible();
    await expect(dictionary).toHaveCount(0);
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  }

  let dictionaryRequests = 0;
  page.on("request", request => {
    if (new URL(request.url()).pathname.startsWith("/dict/")) dictionaryRequests++;
  });
  // Offline PWA behavior on iOS requires an installed app on a real device.
  if (browserName !== "webkit") await context.setOffline(true);
  await page.reload();
  await expect(page.locator("section[data-theme=custom]")).toBeVisible();
  await expect.poll(() => chapterVisible("Segundo capítulo")).toBe(true);
  if (process.env.TEST_DICTIONARY) {
    const frame = page.frames().find(entry => entry.url().startsWith("blob:"));
    if (!frame) throw new Error("Missing chapter frame");
    await frame.getByText("Segundo capítulo").evaluate(selectChapterWord);
    const dictionary = page.getByRole("dialog", { name: "capítulo" });
    await expect(dictionary.getByText("Uma divisão de um livro.")).toBeVisible();
    await dictionary.getByRole("button", { name: "Fechar dicionário" }).click();
    if (browserName !== "webkit") expect(dictionaryRequests).toBe(0);
  }
  const visibleFrame = page.frames().find(frame => frame.url().startsWith("blob:"));
  if (!visibleFrame) throw new Error("Missing reading frame");
  const selectPhrase = () => visibleFrame.getByText("Segundo capítulo").evaluate(element => {
    const selection = element.ownerDocument.getSelection();
    const range = element.ownerDocument.createRange();
    range.selectNodeContents(element);
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
  await selectPhrase();
  const green = page.getByRole("button", { name: "Verde", exact: true });
  const blue = page.getByRole("button", { name: "Azul", exact: true });
  const note = page.getByRole("button", { name: "Adicionar nota", exact: true });
  await expect(note).toBeDisabled();
  await green.click();
  await expect(green).toHaveAttribute("aria-pressed", "true");
  await blue.click();
  await expect(blue).toHaveAttribute("aria-pressed", "true");
  await expect(green).toHaveAttribute("aria-pressed", "false");
  await note.click();
  const notePanel = page.getByRole("dialog", { name: "Adicionar nota" });
  await expect(notePanel.getByText("Azul", { exact: true })).toBeVisible();
  await notePanel.getByRole("textbox", { name: "Nota opcional" }).fill("Leitura sem rede");
  await notePanel.getByRole("button", { name: "Salvar nota" }).click();
  await expect(notePanel).toHaveCount(0);
  await page.reload();
  await controls();
  await expect(page.getByText("Grifos (1)", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Grifos (1)", exact: true }).click();
  await expect(page.getByText("Leitura sem rede")).toBeVisible();
  await expect(page.getByRole("button", { name: "Comentários do grifo" })).toBeVisible();
  await expect(page.getByText("Comentários (0)")).toHaveCount(0);
  const overlayCount = (selector: string) => page.locator("foliate-view").evaluate((element, query) => {
    const view = element as HTMLElement & { renderer: { getContents: () => { overlayer?: { element: SVGElement } }[] } };
    return view.renderer.getContents().reduce((total, { overlayer }) =>
      total + (overlayer?.element.querySelectorAll(query).length ?? 0), 0);
  }, selector);
  const markers = () => overlayCount("[data-comment-marker]");
  await expect.poll(() => overlayCount("g > rect")).toBeGreaterThan(0);
  await expect.poll(markers).toBe(0);
  const readingPosition = () => page.locator("foliate-view").evaluate(element =>
    (element as HTMLElement & { lastLocation: { cfi: string } }).lastLocation.cfi);
  const before = await readingPosition();

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Ocultar controles de leitura" }).click();
  const chapterFrame = page.frames().find(frame => frame.url().startsWith("blob:"))!;
  const frameBox = await (await chapterFrame.frameElement()).boundingBox();
  if (!frameBox) throw new Error("Missing chapter bounds");
  const point = await chapterFrame.getByText("Segundo capítulo").evaluate(element => {
    const range = element.ownerDocument.createRange();
    range.selectNodeContents(element);
    const { left, top, width, height } = range.getClientRects()[0]!;
    return { x: left + width / 2, y: top + height / 2 };
  });
  if (test.info().project.name === "desktop") {
    await page.mouse.click(frameBox.x + point.x, frameBox.y + point.y);
  } else {
    await page.touchscreen.tap(frameBox.x + point.x, frameBox.y + point.y);
  }
  const thread = page.getByRole("dialog", { name: "Comentários do grifo" });
  await expect(thread).toBeVisible();
  await expect(thread.getByText("Segundo capítulo")).toHaveCount(0);
  const reply = thread.getByRole("textbox", { name: "Escreva uma resposta" });
  await expect(thread.getByText("Você", { exact: true })).toBeVisible();
  await expect(reply).toHaveCount(0);
  await thread.getByRole("button", { name: "Responder", exact: true }).click();
  await expect(reply).toBeFocused();
  await reply.fill("Resposta offline");
  const reducedHeight = await page.evaluate(() => {
    const viewport = window.visualViewport!;
    const height = viewport.height * 0.55;
    Object.defineProperty(viewport, "height", { configurable: true, value: height });
    viewport.dispatchEvent(new Event("resize"));
    return height;
  });
  await expect.poll(async () => {
    const box = await reply.boundingBox();
    return Boolean(box && box.y + box.height <= reducedHeight);
  }).toBe(true);
  await page.evaluate(() => {
    Reflect.deleteProperty(window.visualViewport!, "height");
    window.visualViewport!.dispatchEvent(new Event("resize"));
  });
  expect(await readingPosition()).toBe(before);
  await thread.getByRole("button", { name: "Enviar resposta" }).click();
  await expect(thread.getByText("Resposta offline")).toBeVisible();
  await expect.poll(markers).toBe(1);
  await page.mouse.click(2, 2);
  await expect(thread).toHaveCount(0);
  expect(await readingPosition()).toBe(before);
  await page.reload();
  await controls();
  await page.getByRole("button", { name: "Grifos (1)", exact: true }).click();
  await page.getByRole("button", { name: "Comentários (1)" }).click();
  await expect(thread.getByText("Resposta offline")).toBeVisible();
  await thread.getByRole("button", { name: "Apagar comentário" }).click();
  await expect(thread.getByText("Resposta offline")).toHaveCount(0);
  await expect.poll(markers).toBe(0);
  await thread.getByRole("button", { name: "Fechar comentários" }).click();
  await page.getByRole("button", { name: "Grifos (1)", exact: true }).click();
  await page.getByRole("button", { name: "Opções do grifo" }).click();
  await page.getByRole("button", { name: "Editar grifo" }).click();
  await expect(blue).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Apagar grifo" }).click();
  await expect(page.getByText("Grifos (0)", { exact: true })).toBeVisible();
});

async function swipePaginator(view: Locator, gesture: { x: number; y: number; pause: number; cancelled: boolean }) {
  // Playwright WebKit only supports native touchscreen taps, so dispatch the touch sequence to the paginator.
  await view.evaluate((element, { x, y, pause, cancelled }) => {
    const { renderer: target } = element as HTMLElement & { renderer: HTMLElement };
    const send = (type: string, dx: number, dy: number, timeStamp: number) => {
      const touch = { identifier: 1, target, screenX: 150 + dx, screenY: 200 + dy,
        clientX: 150 + dx, clientY: 200 + dy };
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperties(event, {
        timeStamp: { value: timeStamp },
        changedTouches: { value: [touch] },
        touches: { value: type === "touchstart" || type === "touchmove" ? [touch] : [] },
      });
      target.dispatchEvent(event);
    };
    send("touchstart", 0, 0, 0);
    send("touchmove", x * 0.75, y * 0.75, 20);
    send("touchmove", x, y, 40 + pause);
    send(cancelled ? "touchcancel" : "touchend", x, y, 45 + pause);
  }, gesture);
}

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
