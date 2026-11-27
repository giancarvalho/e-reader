import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://127.0.0.1:3000" },
  expect: { toHaveScreenshot: { maxDiffPixels: 50, animations: "disabled" } },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /visual\.spec\.ts/ },
    { name: "android-small", use: { ...devices["Pixel 7"], viewport: { width: 320, height: 568 } } },
    { name: "iphone", use: { ...devices["iPhone 13"] }, testIgnore: /visual\.spec\.ts/ },
    // Reference design size of AGENTS.md rule 12; only the visual baselines run here.
    { name: "phone", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } }, testMatch: /visual\.spec\.ts/ },
  ],
  webServer: {
    command: "npm run start",
    url: "http://127.0.0.1:3000",
    env: {
      APP_ORIGIN: "http://127.0.0.1:3000",
      SUPABASE_URL: "http://127.0.0.1:54321",
      SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
      GOOGLE_CLIENT_ID: "test-client.apps.googleusercontent.com",
      GOOGLE_CLIENT_SECRET: "test-client-secret",
    },
  },
});
