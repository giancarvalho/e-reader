import { expect, test } from "@playwright/test";

test("routes unauthenticated readers to sign-in", async ({ page }) => {
  await page.goto("/conta");
  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page.getByRole("heading", { name: "Entre no leitor compartilhado" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar com Google" })).toBeVisible();
});

test("a callback without a code cannot log a reader in or redirect away", async ({ request }) => {
  const response = await request.get("/auth/callback?next=https://other.example", { maxRedirects: 0 });
  expect(response.status()).toBe(303);
  expect(response.headers().location).toBe("/entrar?status=failed");
  expect(response.headers()["cache-control"]).toContain("no-store");
});
