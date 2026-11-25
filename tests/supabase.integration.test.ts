import { expect, it } from "vitest";

it("can read the Google provider configuration from local Supabase Auth", async () => {
  const endpoint = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!endpoint || !key) {
    throw new Error("Start local Supabase and set SUPABASE_URL and SUPABASE_ANON_KEY.");
  }

  const response = await fetch(new URL("/auth/v1/settings", endpoint), {
    headers: { apikey: key },
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ external: { google: false } });
});
