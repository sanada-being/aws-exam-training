import { defineConfig, devices } from "@playwright/test";

// 開発サーバ(base='/')に対してUIスモークを実行する。
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
