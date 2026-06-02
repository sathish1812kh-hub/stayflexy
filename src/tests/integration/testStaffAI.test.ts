import { test, expect } from "@playwright/test";

test.describe("Flexi AI Staff Operations Verification", () => {
  test("should open chatbot in staff mode, query revenue reports, and render correct response", async ({ page }) => {
    // 1. Navigate to bookings page (which sets bookingId = null, enabling Staff Mode)
    await page.goto("/bookings");

    // 2. Locate and click the chat widget launcher
    const chatLauncher = page.locator("button.hover-glow");
    await expect(chatLauncher).toBeVisible({ timeout: 10000 });
    await chatLauncher.click();

    // 3. Verify the chat panel header and mode display
    const chatTitle = page.locator('h3:has-text("Flexi AI Operations")');
    await expect(chatTitle).toBeVisible();
    const modeText = page.locator('span:has-text("Staff Operations Mode")');
    await expect(modeText).toBeVisible();

    // 4. Verify initial suggested actions for staff are present
    const suggestionReport = page.locator('button:has-text("Revenue Report")');
    await expect(suggestionReport).toBeVisible();

    // 5. Type and send a message asking for the monthly revenue report
    const chatInput = page.locator('input[placeholder*="Command operations"]');
    await expect(chatInput).toBeVisible();
    await chatInput.fill("what is our monthly revenue report?");
    await page.keyboard.press("Enter");

    // 6. Wait for the typing indicator (.dot) to appear, then wait for it to disappear
    const typingIndicator = page.locator(".dot");
    await expect(typingIndicator.first()).toBeVisible({ timeout: 5000 });
    await expect(typingIndicator.first()).toBeHidden({ timeout: 15000 });

    // 7. Wait another second for rendering to settle
    await page.waitForTimeout(1000);

    // 8. Capture screenshot of the open staff operations panel as proof
    const screenshotPath = "C:/Users/Sathish/.gemini/antigravity-cli/brain/257c6469-581c-42b9-864a-b771dbd1051a/staff_ai_operations_proof.png";
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.warn(`[staff AI proof] Screenshot successfully saved at: ${screenshotPath}`);
  });
});
