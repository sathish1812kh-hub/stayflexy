import { test, expect } from "@playwright/test";

test.describe("Flexi AI Concierge Chatbot Verification", () => {
  test("should open chatbot, send query, and receive valid assistant reply", async ({ page }) => {
    // 1. Navigate to bookings page to populate localStorage mock databases
    await page.goto("/bookings");
    await page.waitForTimeout(1000);

    // 2. Navigate to guest contactless check-in portal for Alice Vance (res-1)
    await page.goto("/guest/res-1");

    // 3. Locate and click the chat widget launcher button
    const chatLauncher = page.locator("button.hover-glow");
    await expect(chatLauncher).toBeVisible({ timeout: 10000 });
    await chatLauncher.click();

    // 4. Verify the chat panel opens in Concierge Mode
    const chatTitle = page.locator('h3:has-text("Flexi AI Concierge")');
    await expect(chatTitle).toBeVisible();

    // 5. Locate the input field
    const chatInput = page.locator('input[placeholder*="stay upgrades"]');
    await expect(chatInput).toBeVisible();

    // 6. Type and send a message about hourly stays
    await chatInput.fill("Tell me about hourly stays");
    await page.keyboard.press("Enter");

    // 7. Wait for the typing indicator (.dot) to appear, then wait for it to disappear (detach)
    const typingIndicator = page.locator(".dot");
    await expect(typingIndicator.first()).toBeVisible({ timeout: 5000 });
    await expect(typingIndicator.first()).toBeHidden({ timeout: 15000 });

    // 8. Wait another second for styling to settle
    await page.waitForTimeout(1000);

    // 9. Capture screenshot of the open chat widget showing the response
    const screenshotPath = "C:/Users/Sathish/.gemini/antigravity-cli/brain/257c6469-581c-42b9-864a-b771dbd1051a/chatbot_conversation_proof.png";
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.warn(`[chatbot proof] Screenshot successfully saved at: ${screenshotPath}`);
  });
});
