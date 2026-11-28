import { expect, test, type Frame, type Page } from "@playwright/test";
import { longBook } from "./support/epub";
import { seedLibrary } from "./support/library";

// iPhone reports a touch hold as pointer + touch events and, about 40 ms after it ends, a click.
// Playwright cannot hold a finger down, so the touch half is dispatched here, in the order iOS uses.
test.skip(({ browserName }) => browserName !== "webkit", "the selection fixes are tested in WebKit, the iPhone engine");

async function openChapter(page: Page) {
  const hash = await seedLibrary(page, { book: longBook });
  await page.goto(`/ler#${hash}`);
  await page.getByRole("button", { name: "Mostrar controles de leitura" }).waitFor();
  let chapter: Frame | undefined;
  await expect.poll(async () => {
    chapter = page.frames().find(frame => frame.url().startsWith("blob:"));
    return chapter ? await chapter.locator("p").count().catch(() => 0) : 0;
  }).toBeGreaterThan(0);
  await chapter!.evaluate(() => {
    const send = (type: string, x: number, y: number) => {
      const target = document.elementFromPoint(x, y) ?? document.body;
      const touch = { identifier: 1, target, clientX: x, clientY: y, screenX: x, screenY: y };
      const event = new Event(type, { bubbles: true, cancelable: true, composed: true });
      const list = type === "touchend" ? [] : [touch];
      Object.defineProperties(event, { touches: { value: list }, targetTouches: { value: list }, changedTouches: { value: [touch] } });
      target.dispatchEvent(event);
    };
    const pointer = (type: string, x: number, y: number) => (document.elementFromPoint(x, y) ?? document.body).dispatchEvent(
      new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, pointerId: 1, pointerType: "touch", isPrimary: true, clientX: x, clientY: y }));
    Object.assign(window, {
      fingerDown: (x: number, y: number) => { pointer("pointerdown", x, y); send("touchstart", x, y); },
      fingerUp: (x: number, y: number) => { pointer("pointerup", x, y); send("touchend", x, y); },
    });
  });
  return chapter!;
}

/** Where the finger lands: on a word, or in the space right after it. */
async function pointOnLine(frame: Frame, wordIndex: number, where: "word" | "gap") {
  return frame.evaluate(({ wordIndex, where }) => {
    const text = document.querySelector("p")!.firstChild!;
    const match = [...text.textContent!.matchAll(/[\p{L}\p{M}]+/gu)][wordIndex];
    const range = document.createRange();
    range.setStart(text, match.index);
    range.setEnd(text, match.index + match[0].length);
    const rect = range.getBoundingClientRect();
    return { x: where === "word" ? rect.x + rect.width / 2 : rect.right + 2, y: rect.y + rect.height / 2 };
  }, { wordIndex, where });
}

async function hold(page: Page, frame: Frame, point: { x: number; y: number }, ms: number) {
  await frame.evaluate(({ x, y }) => (window as never as { fingerDown: (x: number, y: number) => void }).fingerDown(x, y), point);
  await page.waitForTimeout(ms);
  await frame.evaluate(({ x, y }) => (window as never as { fingerUp: (x: number, y: number) => void }).fingerUp(x, y), point);
}

const selected = (frame: Frame) => frame.evaluate(() => document.getSelection()?.toString() ?? "");
const menu = (page: Page) => page.getByRole("dialog", { name: "Ações do trecho selecionado" }).or(page.getByLabel("Ações do trecho selecionado"));

test("a hold between two words selects the nearest word", async ({ page }) => {
  const frame = await openChapter(page);
  await hold(page, frame, await pointOnLine(frame, 5, "gap"), 700);
  await expect.poll(() => selected(frame)).toMatch(/^\p{L}+$/u);
  await expect(menu(page)).toBeVisible();
});

test("the click iOS sends after a hold does not clear the new selection", async ({ page }) => {
  const frame = await openChapter(page);
  const point = await pointOnLine(frame, 5, "word");
  await hold(page, frame, point, 700);
  await page.waitForTimeout(40);
  const bounds = (await (await frame.frameElement()).boundingBox())!;
  await page.mouse.click(bounds.x + point.x, bounds.y + point.y);
  await page.waitForTimeout(800);
  expect(await selected(frame)).not.toBe("");
  await expect(menu(page)).toBeVisible();
});
