import { expect, test } from "@playwright/test";

test("starts Google authentication directly from the home page", async ({ page, baseURL }) => {
  const google = "https://accounts.google.com/o/oauth2/v2/auth";
  await page.route(`${google}?*`, route => route.fulfill({ body: "Google OAuth test page" }));
  await page.goto("/");

  const documentPaths: string[] = [];
  page.on("request", request => {
    if (request.isNavigationRequest()) documentPaths.push(new URL(request.url()).pathname);
  });
  const [authorization] = await Promise.all([
    page.waitForRequest(request => request.url().startsWith(`${google}?`)),
    page.getByRole("link", { name: "Entrar", exact: true }).click(),
  ]);

  const url = new URL(authorization.url());
  expect(url.searchParams.get("redirect_uri")).toBe(`${baseURL}/auth/google/callback`);
  expect(documentPaths).not.toContain("/entrar");
  expect(documentPaths).not.toContain("/convite");
});

test("carries an invite through the Google start without sending its code to Google", async ({ page, context, baseURL }) => {
  const code = "ABCDEFGH234567AB";
  const google = "https://accounts.google.com/o/oauth2/v2/auth";
  await page.route(`${google}?*`, route => route.fulfill({ body: "Google OAuth test page" }));
  await page.goto(`/convite?codigo=${code}`);
  await expect(page).toHaveURL(`/entrar?codigo=${code}`);
  const [authorization] = await Promise.all([
    page.waitForRequest(request => request.url().startsWith(`${google}?`)),
    page.getByRole("button", { name: "Entrar com Google" }).click(),
  ]);
  expect(authorization.url()).not.toContain(code);
  const cookies = await context.cookies(`${baseURL}/auth/google/callback`);
  expect(cookies.find(cookie => cookie.name === "shared_margins_invite")).toMatchObject({ value: code, httpOnly: true });
});

test("carries a new home invite into Google authentication", async ({ page, context, baseURL }) => {
  const code = "ABCDEFGH234567AB";
  const google = "https://accounts.google.com/o/oauth2/v2/auth";
  await page.route(`${google}?*`, route => route.fulfill({ body: "Google OAuth test page" }));
  await page.goto(`/?invite=${code}`);
  await expect(page.getByRole("heading", { name: "Shared Margins" })).toBeVisible();
  const enter = page.getByRole("link", { name: "Entrar", exact: true });
  await expect(enter).toHaveAttribute("href", `/auth/google/start?codigo=${code}`);
  const [authorization] = await Promise.all([
    page.waitForRequest(request => request.url().startsWith(`${google}?`)),
    enter.click(),
  ]);
  expect(authorization.url()).not.toContain(code);
  const cookies = await context.cookies(`${baseURL}/auth/google/callback`);
  expect(cookies.find(cookie => cookie.name === "shared_margins_invite")).toMatchObject({ value: code, httpOnly: true });
});

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
