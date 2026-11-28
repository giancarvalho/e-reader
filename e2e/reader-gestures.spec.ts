import { expect, test, type Page } from "@playwright/test";
import { seedLibrary } from "./support/library";

// Real touch sequences end to end: native taps in WebKit (iOS), CDP touch events in Chromium.
async function openBook(page: Page) {
  const hash = await seedLibrary(page);
  await page.goto(`/ler#${hash}`);
  await page.getByRole("button", { name: "Mostrar controles de leitura" }).waitFor();
  await expect.poll(() => visibleChapter(page)).toBe("Primeiro capítulo");
}

async function visibleChapter(page: Page) {
  for (const frame of page.frames().filter(item => item.url().startsWith("blob:"))) {
    for (const text of ["Primeiro capítulo", "Segundo capítulo"]) {
      if (await frame.getByText(text).isVisible().catch(() => false)) return text;
    }
  }
  return "";
}

async function press(page: Page, fraction: number, holdMs: number) {
  const cdp = await page.context().newCDPSession(page);
  const column = (await page.locator("foliate-view").boundingBox())!;
  const point = { x: Math.round(column.x + column.width * fraction), y: Math.round(column.y + column.height * 0.6), id: 1 };
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
  await page.waitForTimeout(holdMs);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

async function tap(page: Page, fraction: number) {
  if (page.context().browser()?.browserType().name() !== "webkit") return press(page, fraction, 80);
  const column = (await page.locator("foliate-view").boundingBox())!;
  await page.touchscreen.tap(column.x + column.width * fraction, column.y + column.height * 0.6);
}

test("a quick tap in the middle toggles the bars and on the sides turns the page", async ({ page }) => {
  await openBook(page);
  const show = page.getByRole("button", { name: "Mostrar controles de leitura" });
  const hide = page.getByRole("button", { name: "Ocultar controles de leitura" });

  await tap(page, 0.5);
  await expect(hide).toBeVisible();
  await tap(page, 0.5);
  await expect(show).toBeVisible();

  await tap(page, 0.85);
  await expect.poll(() => visibleChapter(page)).toBe("Segundo capítulo");
  await page.waitForTimeout(800); // the paginator ignores commands while a page turn is animating
  await tap(page, 0.15);
  await expect.poll(() => visibleChapter(page)).toBe("Primeiro capítulo");

  // The on-device gesture log records what happened, without any book text.
  const kinds = async () => page.evaluate(() => {
    const entries: { k: string }[] = JSON.parse(localStorage.getItem("e-reader-gesture-log") ?? "[]");
    return { kinds: entries.map(entry => entry.k), text: JSON.stringify(entries) };
  });
  await expect.poll(async () => (await kinds()).kinds.includes("tap-zone")).toBe(true);
  const { kinds: seen, text } = await kinds();
  for (const kind of ["chapter-load", "touchstart", "touchend", "turn"]) expect(seen).toContain(kind);
  expect(text).not.toContain("capítulo");
});

test("a hesitant press near the edge neither turns the page nor toggles the bars", async ({ page, browserName }) => {
  test.skip(browserName === "webkit", "press duration needs CDP touch input");
  await openBook(page);
  await press(page, 0.9, 400);
  await page.waitForTimeout(700);
  expect(await visibleChapter(page)).toBe("Primeiro capítulo");
  await expect(page.getByRole("button", { name: "Mostrar controles de leitura" })).toBeVisible();
});
