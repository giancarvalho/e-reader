import { expect, test, type Frame, type Locator } from "@playwright/test";
import { downloadPortugueseDictionary } from "./support/dictionary";
import { bytes, hash } from "./support/epub";

test("opens a local EPUB, navigates its index and restores the last chapter offline", async ({ page, context, browserName }) => {
  const remote: string[] = [];
  page.on("request", request => {
    if (request.url().includes("example.invalid")) remote.push(request.url());
  });

  await page.goto("/estante-offline");
  await page.getByText("Entre com sua conta quando estiver online para ver a estante deste aparelho.").waitFor();
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

  if (process.env.TEST_DICTIONARY) await downloadPortugueseDictionary(page);

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
  // Only browsers with the Fullscreen API offer the option.
  if (browserName === "chromium") await expect(page.getByRole("button", { name: "Ligada", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Noite", exact: true }).click();
  await expect(page.locator("section[data-theme=night]")).toBeVisible();
  await expect(page.locator('head meta[name="theme-color"]').first()).toHaveAttribute("content", "rgb(23, 19, 15)");
  // The page behind the reader follows the reader's theme, not the app's, so no light strip shows under the bars.
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).toBe("rgb(23, 19, 15)");
  const barBackground = () => page.locator("header").first().evaluate(element => getComputedStyle(element).backgroundColor);
  await expect(page.getByRole("button", { name: "Automático" })).toHaveCount(0);
  await expect.poll(barBackground).toBe("rgb(23, 19, 15)");
  await page.getByRole("button", { name: "Pôr do Sol", exact: true }).click();
  await expect(page.locator("section[data-theme=sunset]")).toBeVisible();
  await expect.poll(barBackground).toBe("rgb(239, 223, 194)");
  await page.getByRole("button", { name: "Meia-Noite", exact: true }).click();
  await expect(page.locator("section[data-theme=midnight]")).toBeVisible();
  await expect.poll(barBackground).toBe("rgb(0, 0, 0)");
  await expect(page.locator('head meta[name="theme-color"]').first()).toHaveAttribute("content", "rgb(0, 0, 0)");
  await page.getByRole("button", { name: "Personalizado", exact: true }).click();
  await page.getByLabel("Cor de fundo").fill("#333333");
  await expect.poll(barBackground).toBe("rgb(51, 51, 51)");
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
  // The bars now sit over the text, so hide them before touching the first lines.
  await page.getByRole("button", { name: "Ocultar controles de leitura" }).click();

  if (process.env.TEST_DICTIONARY) {
    const frame = page.frames().find(entry => entry.url().startsWith("blob:"));
    if (!frame) throw new Error("Missing chapter frame");
    await frame.getByText("Segundo capítulo").evaluate(selectChapterWord);
    const dictionary = page.getByRole("dialog", { name: "capítulo" });
    await expect(page.getByRole("button", { name: "Verde", exact: true })).toBeVisible();
    await expect(dictionary).toHaveCount(0);
    if (browserName === "webkit") {
      const [begin] = await chapterWordPoints(frame);
      const startHandle = page.getByRole("button", { name: "Ajustar início da seleção" });
      const { x, y, caretX } = await handlePoint(startHandle);
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + begin.x - caretX, y);
      await page.mouse.up();
      const selected = () => frame.evaluate(() => document.getSelection()?.toString());
      await expect.poll(selected).toBe("Segundo capítulo");
      await startHandle.press("ArrowRight");
      await expect.poll(selected).toBe("capítulo");
    }
    await page.getByRole("button", { name: "Definir", exact: true }).click();
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
    const [begin, word] = await chapterWordPoints(frame);
    const cdp = await context.newCDPSession(page);
    const dictionary = page.getByRole("dialog", { name: "capítulo" });
    const pressSelection = () => frame.evaluate(() => document.getSelection()?.toString() ?? "");
    const start = () => cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [word] });
    const release = () => cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    const startHandle = page.getByRole("button", { name: "Ajustar início da seleção" });
    const endHandle = page.getByRole("button", { name: "Ajustar fim da seleção" });
    async function dragHandle(handle: typeof startHandle, target: typeof word) {
      const { x, y, caretX } = await handlePoint(handle);
      const origin = { x, y, id: 1 };
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [origin] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{
        ...origin, x: origin.x + target.x - caretX, y: origin.y + target.y - word.y,
      }] });
      await release();
    }

    await start();
    await page.waitForTimeout(600);
    expect(await pressSelection()).toBe("");
    await release();
    await expect(dictionary).toHaveCount(0);

    await start();
    await expect.poll(pressSelection).toBe("capítulo");
    await expect(dictionary).toHaveCount(0);
    await release();
    const menu = page.getByRole("group", { name: "Ações do trecho selecionado" });
    await expect(menu.getByRole("button", { name: "Verde", exact: true })).toBeVisible();
    const menuBounds = await menu.boundingBox();
    expect(menuBounds).not.toBeNull();
    expect(menuBounds!.y).toBeGreaterThan(word.y);
    expect(menuBounds!.y - word.y).toBeLessThan(44);
    await expect(dictionary).toHaveCount(0);
    await dragHandle(startHandle, begin);
    await expect.poll(pressSelection).toBe("Segundo capítulo");
    await expect(menu.getByRole("button", { name: "Definir", exact: true })).toHaveCount(0);
    await dragHandle(endHandle, begin);
    await expect.poll(pressSelection).toBe("Segundo");
    await endHandle.press("ArrowRight");
    await expect.poll(pressSelection).toBe("Segundo capítulo");
    await startHandle.press("ArrowRight");
    await expect.poll(pressSelection).toBe("capítulo");
    const nextLine = await frame.getByText("Segundo capítulo").evaluate(element => {
      const doc = element.ownerDocument;
      const paragraph = doc.createElementNS(element.namespaceURI, "p");
      paragraph.textContent = "Outra";
      element.after(paragraph);
      const range = doc.createRange();
      range.selectNodeContents(paragraph);
      const { left, top, width, height } = range.getBoundingClientRect();
      return { x: left + width / 2, y: top + height / 2 };
    });
    await dragHandle(endHandle, { ...word, x: nextLine.x + bounds.x, y: nextLine.y + bounds.y });
    await expect.poll(pressSelection).toMatch(/^capítulo\s+Outra$/);
    await expect(menu.getByRole("button", { name: "Definir", exact: true })).toHaveCount(0);
    await endHandle.press("ArrowLeft");
    await expect.poll(pressSelection).toBe("capítulo");
    await page.getByRole("button", { name: "Definir", exact: true }).click();
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
    await expect(page.getByRole("button", { name: "Verde", exact: true })).toBeVisible();
    await expect(dictionary).toHaveCount(0);
    await page.getByRole("button", { name: "Definir", exact: true }).click();
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
    element.ownerDocument.documentElement.dataset.readerSelectable = ""; // as the app does when it selects
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
  await selectPhrase();
  const green = page.getByRole("button", { name: "Verde", exact: true });
  const blue = page.getByRole("button", { name: "Azul", exact: true });
  const note = page.getByRole("button", { name: "Adicionar nota", exact: true });
  const notePanel = page.getByRole("dialog", { name: "Adicionar nota" });
  await expect(page.getByRole("button", { name: "Definir", exact: true })).toHaveCount(0);
  await note.click();
  await expect(notePanel.getByText("Âmbar", { exact: true })).toBeVisible();
  await notePanel.getByRole("button", { name: "Cancelar", exact: true }).click();
  await selectPhrase();
  await green.click();
  await expect(green).toHaveAttribute("aria-pressed", "true");
  await blue.click();
  await expect(blue).toHaveAttribute("aria-pressed", "true");
  await expect(green).toHaveAttribute("aria-pressed", "false");
  await note.click();
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
  await expect.poll(() => page.locator("foliate-view").evaluate(element => {
    const view = element as HTMLElement & { renderer: { getContents: () => { overlayer?: { element: SVGElement } }[] } };
    const marker = view.renderer.getContents()
      .map(({ overlayer }) => overlayer?.element.querySelector<SVGPathElement>("[data-comment-marker]"))
      .find(path => path);
    const rect = marker?.parentElement?.querySelector("rect:last-child");
    if (!marker || !rect) return false;
    const box = marker.getBBox();
    return box.width <= 6 && box.y + box.height < Number(rect.getAttribute("y"));
  })).toBe(true);
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
  element.ownerDocument.documentElement.dataset.readerSelectable = ""; // as the app does when it selects
  selection?.removeAllRanges();
  selection?.addRange(range);
}

async function handlePoint(handle: Locator) {
  const bounds = await handle.boundingBox();
  if (!bounds) throw new Error("Missing selection handle");
  const caretX = await handle.evaluate(button => Number.parseFloat(button.style.left));
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2, caretX };
}

async function chapterWordPoints(frame: Frame) {
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
  return points.map(point => ({ x: point.x + bounds.x, y: point.y + bounds.y, id: 1 }));
}
