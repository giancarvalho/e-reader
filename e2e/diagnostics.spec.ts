import { expect, test } from "@playwright/test";

test("shows the local app version, current connection and recent diagnostic failures", async ({ page }) => {
  await page.addInitScript(() => {
    const entry = { system: "comments", state: "error", time: "2026-11-25T12:00:00.000Z" };
    localStorage.setItem("e-reader-diagnostics", JSON.stringify({ last: { comments: entry }, errors: [entry] }));
  });
  await page.goto("/diagnostico");
  await expect(page.getByRole("heading", { name: "Diagnóstico" })).toBeVisible();
  await expect(page.getByText("Versão", { exact: true })).toBeVisible();
  await expect(page.getByText("Online", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Falhas recentes" })).toBeVisible();
  await expect(page.getByRole("listitem").getByText(/Comentários/)).toBeVisible();
});
