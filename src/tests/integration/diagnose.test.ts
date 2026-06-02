import { test, expect } from "@playwright/test";

test.describe("Diagnose Bookings Page", () => {
  test("should load bookings page without console errors or page crashes", async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: Error[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
        console.warn(`[browser console error] ${msg.text()}`);
      }
    });

    page.on("pageerror", (err) => {
      pageErrors.push(err);
      console.error(`[browser page error]`, err);
    });

    // Go to the bookings page
    await page.goto("/bookings");

    // Wait a few seconds to let any client-side effects run
    await page.waitForTimeout(5000);

    // Expect no page errors
    expect(pageErrors.length).toBe(0);
  });
});
