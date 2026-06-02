import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { defineConfig } from "@playwright/test";
import path from "path";

const BASE_URL = process.env["TEST_BASE_URL"] ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./src/tests",
  testMatch: "**/*.test.ts",
  fullyParallel: false,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  workers: process.env["CI"] ? 1 : undefined,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },

  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "playwright-report/results.json" }],
  ],

  use: {
    baseURL: BASE_URL,
    extraHTTPHeaders: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "api",
      testMatch: "**/api/**/*.test.ts",
      use: {},
    },
    {
      name: "integration",
      testMatch: "**/integration/**/*.test.ts",
      use: {
        channel: "chromium",
        launchOptions: {
          // Exposes CDP on ws://localhost:9223 — connect via chrome://inspect or VS Code Playwright devtools
          args: ["--remote-debugging-port=9223"],
        },
      },
    },
  ],

  globalSetup: path.resolve("./src/tests/setup/global.setup.ts"),
  globalTeardown: path.resolve("./src/tests/setup/global.teardown.ts"),

  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !process.env["CI"],
    timeout: 60_000,
  },
});
