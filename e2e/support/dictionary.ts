import { expect, type Page } from "@playwright/test";

// Downloads the Portuguese dictionary the way a reader does, so lookups work
// without a network. Requires the dictionary fixture built by CI.
export async function downloadPortugueseDictionary(page: Page) {
  await page.goto("/dicionarios");
  const portuguese = page.locator("section").filter({ has: page.getByRole("heading", { name: "Português" }) });
  await portuguese.getByRole("button", { name: "Baixar dicionário" }).click();
  await expect(portuguese.getByText("Dicionário completo disponível neste aparelho.")).toBeVisible();
}
