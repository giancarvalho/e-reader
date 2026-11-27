import { expect, test, type Page } from "@playwright/test";
import { seedLibrary } from "./support/library";

// Chromium touch emulation: real touchstart/touchend sequences, so the page gesture rules run end to end.
test.skip(({ browserName }) => browserName !== "chromium", "touch input is sent through CDP");

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

test("a quick tap in the middle toggles the bars and on the sides turns the page", async ({ page }) => {
  await openBook(page);
  const show = page.getByRole("button", { name: "Mostrar controles de leitura" });
  const hide = page.getByRole("button", { name: "Ocultar controles de leitura" });

  await press(page, 0.5, 80);
  await expect(hide).toBeVisible();
  await press(page, 0.5, 80);
  await expect(show).toBeVisible();

  await press(page, 0.85, 80);
  await expect.poll(() => visibleChapter(page)).toBe("Segundo capítulo");
  await press(page, 0.15, 80);
  await expect.poll(() => visibleChapter(page)).toBe("Primeiro capítulo");
});

test("a hesitant press near the edge neither turns the page nor toggles the bars", async ({ page }) => {
  await openBook(page);
  await press(page, 0.9, 600);
  await page.waitForTimeout(700);
  expect(await visibleChapter(page)).toBe("Primeiro capítulo");
  await expect(page.getByRole("button", { name: "Mostrar controles de leitura" })).toBeVisible();
});
