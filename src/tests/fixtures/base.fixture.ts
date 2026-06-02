import { test as base, type APIRequestContext } from "@playwright/test";

export interface TestFixtures {
  apiContext: APIRequestContext;
  authenticatedContext: APIRequestContext;
}

export const test = base.extend<TestFixtures>({
  apiContext: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({
      baseURL: process.env["TEST_BASE_URL"] ?? "http://localhost:3000",
      extraHTTPHeaders: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    await use(context);
    await context.dispose();
  },

  // Placeholder for authenticated context — wire in JWT token in Phase 2
  authenticatedContext: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({
      baseURL: process.env["TEST_BASE_URL"] ?? "http://localhost:3000",
      extraHTTPHeaders: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${process.env["TEST_AUTH_TOKEN"] ?? ""}`,
      },
    });
    await use(context);
    await context.dispose();
  },
});

export { expect } from "@playwright/test";
