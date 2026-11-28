import { expect, test } from "@playwright/test";
import { seedLibrary } from "./support/library";

test("starts the installed app at the reading shelf", async ({ request }) => {
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBe(true);
  expect(await manifest.json()).toMatchObject({ id: "/", start_url: "/estante" });
});

test("shows the reading shell in both system themes", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Shared Margins" })).toBeVisible();
  await expect(page.getByText("Um livro. Muitas leituras.", { exact: true })).toBeVisible();
  const home = page.getByRole("main");
  await expect(home.getByRole("link")).toHaveCount(2);
  await expect(home.locator("footer").getByRole("link", { name: "Créditos e licenças" })).toHaveAttribute("href", "/creditos");
  await expect(home.getByRole("link", { name: "Entrar", exact: true })).toHaveAttribute("href", "/auth/google/start");
  await expect(home.locator("img")).toHaveCount(0);
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(250, 245, 236)");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(23, 19, 15)");
  await expect(page.locator("html")).toHaveCSS("background-color", "rgb(23, 19, 15)");
  await expect(page.locator('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]'))
    .toHaveAttribute("content", "#17130F");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("persists the global theme when it overrides the system theme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Alternar tema claro e escuro" });
  await expect(toggle.locator('[data-icon="sun"]')).toBeVisible();
  await toggle.click();
  await expect(toggle.locator('[data-icon="moon"]')).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "day");
  await page.goto("/estante-offline");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(250, 245, 236)");
});

test("offers no shelf offline to someone who never signed in", async ({ page, context, browserName }) => {
  test.skip(browserName === "webkit", "Installed iOS PWA offline behavior is covered on a real device.");
  await page.goto("/");
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Shared Margins" })).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("font-family", /Inter Variable/);
  await expect(page.getByText("Sem conexão. Entre quando estiver online para abrir sua estante.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Entrar", exact: true })).toHaveCount(0);
});

test("reopens the offline shelf from the public shell for someone who signed in before", async ({ page, context, browserName }) => {
  test.skip(browserName === "webkit", "Installed iOS PWA offline behavior is covered on a real device.");
  await seedLibrary(page);
  await page.goto("/");
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Shared Margins" })).toBeVisible();
  const enter = page.getByRole("link", { name: "Entrar", exact: true });
  await expect(enter).toHaveAttribute("href", "/estante-offline");
  await enter.click();
  await expect(page.getByText("Estante offline", { exact: true })).toBeVisible();
  await expect(page.getByText("Livro de teste").first()).toBeVisible();
});
