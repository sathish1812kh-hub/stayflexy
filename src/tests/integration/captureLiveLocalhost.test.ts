import { test, expect } from "@playwright/test";

test.describe("Capture Live Localhost Bookings", () => {
  test("should capture screenshot of http://localhost:3000/bookings", async ({ page }) => {
    // Go to the bookings page on the running server
    await page.goto("/bookings");

    // Wait for the timeline container and at least one reservation block to be visible
    await page.waitForSelector(".reservation-block", { timeout: 10000 });

    // Set timeline start date to 2026-05-20
    const dateInput = page.locator('button:has-text("Next ▶") ~ input[type="date"]');
    await expect(dateInput).toBeVisible();
    await dateInput.fill("2026-05-20");
    await dateInput.dispatchEvent("change");

    // Click "Monthly" view scale
    const monthlyBtn = page.locator('button:has-text("Monthly")');
    await expect(monthlyBtn).toBeVisible();
    await monthlyBtn.click();

    // Let any client-side rendering settle
    await page.waitForTimeout(3000);

    // Save the screenshot to the artifacts folder
    const screenshotPath = "C:/Users/Sathish/.gemini/antigravity-cli/brain/257c6469-581c-42b9-864a-b771dbd1051a/localhost_live_proof.png";
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.warn(`[live proof] Live screenshot saved successfully at: ${screenshotPath}`);
  });
});
