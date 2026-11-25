import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://127.0.0.1:3000" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "android-small", use: { ...devices["Pixel 7"], viewport: { width: 320, height: 568 } } },
    { name: "iphone", use: { ...devices["iPhone 13"] } },
  ],
  webServer: { command: "npm run start", url: "http://127.0.0.1:3000" },
});
