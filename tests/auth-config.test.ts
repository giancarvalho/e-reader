import { expect, it } from "vitest";
import { getAuthConfig } from "../src/lib/supabase/config";

const env = {
  APP_ORIGIN: "https://reader.example",
  SUPABASE_URL: "https://auth.example",
  SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
};

it("enables secure cookies for HTTPS deployments", () => {
  expect(getAuthConfig(env)).toEqual({
    origin: "https://reader.example",
    secure: true,
    url: "https://auth.example",
    key: "test-publishable-key",
  });
});

it("allows loopback HTTP for local development", () => {
  expect(getAuthConfig({ ...env, APP_ORIGIN: "http://localhost:3000" }))
    .toMatchObject({ origin: "http://localhost:3000", secure: false });
});

it.each([
  { APP_ORIGIN: "http://reader.example" },
  { APP_ORIGIN: "https://reader.example/arbitrary" },
  { APP_ORIGIN: "https://reader.example?next=https://other.example" },
  { SUPABASE_URL: "invalid URL" },
  { SUPABASE_PUBLISHABLE_KEY: undefined },
])("disables incomplete or unsafe auth configuration (%o)", (changes) => {
  expect(getAuthConfig({ ...env, ...changes })).toBeNull();
});
