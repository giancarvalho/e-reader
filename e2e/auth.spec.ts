import { expect, test } from "@playwright/test";

for (const path of ["/conta", "/convite", "/estante"]) {
  test(`routes unauthenticated readers from ${path} to sign-in`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/entrar$/);
    await expect(page.getByRole("heading", { name: "Entre no leitor compartilhado" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar com Google" })).toBeVisible();
  });
}

for (const path of ["/auth/callback", "/auth/google/callback"]) {
  test(`rejects an unsolicited callback at ${path}`, async ({ request }) => {
    const response = await request.get(`${path}?next=https://other.example`, { maxRedirects: 0 });
    expect(response.status()).toBe(303);
    expect(response.headers().location).toBe("/entrar?status=failed");
    expect(response.headers()["cache-control"]).toContain("no-store");
  });
}
