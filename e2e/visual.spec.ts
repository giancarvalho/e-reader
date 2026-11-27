import { expect, test, type Page } from "@playwright/test";
import { downloadPortugueseDictionary } from "./support/dictionary";
import { hash } from "./support/epub";
import { seedLibrary } from "./support/library";

// Visual regression for the shared building blocks. Baselines are Linux
// Chromium screenshots generated in CI (see docs/design-system.md). They run in
// the 320 px and 390 px phone projects, in both themes, because those are the
// reference sizes of AGENTS.md rule 12.
const themes = ["day", "night"] as const;

test.beforeEach(({}, info) => {
  test.skip(!["android-small", "phone"].includes(info.project.name), "Visual baselines cover the phone sizes only.");
});

async function open(page: Page, theme: (typeof themes)[number]) {
  await page.emulateMedia({ colorScheme: theme === "night" ? "dark" : "light", reducedMotion: "reduce" });
  await page.addInitScript(value => localStorage.setItem("app-theme", value), theme);
}

async function settled(page: Page) {
  await page.evaluate(() => document.fonts.ready);
}

for (const theme of themes) {
  test.describe(`${theme} theme`, () => {
    for (const [name, path, heading] of [
      ["home", "/", "Shared Margins"],
      ["credits", "/creditos", "Créditos e licenças"],
      ["diagnostics", "/diagnostico", "Diagnóstico"],
    ] as const) {
      test(`${name} page`, async ({ page }) => {
        await open(page, theme);
        await page.goto(path);
        await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
        await settled(page);
        // Diagnostics values (build hash, service worker state) differ between runs.
        await expect(page).toHaveScreenshot(`${name}-${theme}.png`, { fullPage: true, mask: [page.locator("dd")] });
      });
    }

    test("offline shelf with progress", async ({ page }) => {
      await open(page, theme);
      await seedLibrary(page, { progress: 0.4 });
      await page.goto("/estante-offline");
      await expect(page.getByRole("heading", { name: "Livro de teste" })).toBeVisible();
      await settled(page);
      await expect(page).toHaveScreenshot(`shelf-${theme}.png`, { fullPage: true });
    });

    test("reader selection menu", async ({ page }) => {
      await open(page, theme);
      await seedLibrary(page);
      await openReaderWithWordSelected(page);
      await expect(page.getByRole("button", { name: "Definir", exact: true })).toBeVisible();
      await settled(page);
      await expect(page).toHaveScreenshot(`reader-selection-${theme}.png`);
    });

    test("dictionary sheet", async ({ page }) => {
      test.skip(!process.env.TEST_DICTIONARY, "Needs the dictionary fixture built by CI.");
      await open(page, theme);
      await seedLibrary(page);
      await downloadPortugueseDictionary(page);
      await openReaderWithWordSelected(page);
      await page.getByRole("button", { name: "Definir", exact: true }).click();
      await expect(page.getByRole("dialog", { name: "capítulo" }).getByText("Uma divisão de um livro.")).toBeVisible();
      await settled(page);
      await expect(page).toHaveScreenshot(`dictionary-${theme}.png`);
    });
  });
}

async function openReaderWithWordSelected(page: Page) {
  await page.goto(`/ler#${hash}`);
  const frame = await chapterFrame(page, "Primeiro capítulo");
  await frame.getByText("Primeiro capítulo").evaluate(element => {
    const text = element.firstChild!;
    const range = element.ownerDocument.createRange();
    range.setStart(text, "Primeiro ".length);
    range.setEnd(text, "Primeiro capítulo".length);
    const selection = element.ownerDocument.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
}

async function chapterFrame(page: Page, text: string) {
  await expect.poll(async () => {
    const views = page.frames().filter(frame => frame.url().startsWith("blob:"));
    const visible = await Promise.all(views.map(frame => frame.getByText(text).isVisible().catch(() => false)));
    return visible.some(Boolean);
  }).toBe(true);
  return page.frames().find(frame => frame.url().startsWith("blob:"))!;
}
