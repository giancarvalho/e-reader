import { expect, test } from "@playwright/test";

test("shows the reading shell in both system themes", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Leitor compartilhado" })).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(250, 245, 236)");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(23, 19, 15)");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("reopens the public shell offline after installation", async ({ page, context, browserName }) => {
  test.skip(browserName === "webkit", "Installed iOS PWA offline behavior is covered on a real device.");
  await page.goto("/");
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Leitor compartilhado" })).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("font-family", /Inter Variable/);
});
