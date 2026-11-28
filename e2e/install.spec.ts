import { expect, test, type Page } from "@playwright/test";

// The page is public, so the install guide can be checked in each browser project without signing in.

async function offerInstallPrompt(page: Page) {
  // The browser fires this event once, so it is simulated after the app is listening.
  await page.evaluate(() => {
    const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
      prompt: () => { Reflect.set(window, "installPrompted", true); return Promise.resolve(); },
      userChoice: Promise.resolve({ outcome: "dismissed" }),
    });
    window.dispatchEvent(event);
  });
}

test("explains how to install on the device in use", async ({ page }) => {
  const project = test.info().project.name;
  await page.goto("/instalar");
  await expect(page.getByRole("heading", { name: "Instalar o app" })).toBeVisible();

  if (project === "iphone") {
    await expect(page.getByText("Adicionar à Tela de Início", { exact: false }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Instalar", exact: true })).toHaveCount(0);
  } else if (project === "android-small") {
    const install = page.getByRole("button", { name: "Instalar", exact: true });
    await expect(async () => {
      await offerInstallPrompt(page);
      await expect(install).toBeVisible({ timeout: 500 });
    }).toPass();
    await install.click();
    await expect.poll(() => page.evaluate(() => Reflect.get(window, "installPrompted"))).toBe(true);
  } else {
    await expect(page.getByText("Abra o Shared Margins no navegador do celular", { exact: false })).toBeVisible();
  }
});
