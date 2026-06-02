import { test, expect } from "@playwright/test";

test.describe("Block Room 103 Navigation and State Persistence Test", () => {
  test("should block room 103, redirect to /inventory, and keep the chat widget open with messages", async ({ page }) => {
    // 1. Navigate to bookings page
    await page.goto("/bookings");

    page.on('console', msg => {
      console.warn(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
    });

    // 2. Locate and click the chat widget launcher
    const chatLauncher = page.locator("button.hover-glow");
    await expect(chatLauncher).toBeVisible({ timeout: 10000 });
    await chatLauncher.click();

    // 3. Verify it is in Staff Mode
    const chatTitle = page.locator('h3:has-text("Flexi AI Operations")');
    await expect(chatTitle).toBeVisible();

    // 4. Type "block room 103" and press Enter
    const chatInput = page.locator('input[placeholder*="Command operations"]');
    await expect(chatInput).toBeVisible();
    await chatInput.fill("block room 103");
    await page.keyboard.press("Enter");

    // 5. Wait for the loading indicator to disappear and confirmation message to show
    const typingIndicator = page.locator(".dot");
    await expect(typingIndicator.first()).toBeVisible({ timeout: 5000 });
    await expect(typingIndicator.first()).toBeHidden({ timeout: 15000 });

    // 6. Check that the confirmation message is rendered
    const confirmationText = page.locator('div:has-text("successfully blocked Room 103")');
    await expect(confirmationText.first()).toBeVisible({ timeout: 5000 });

    console.warn("Message sent, confirmation visible, waiting for redirect...");

    // 7. Wait for the redirect to complete (the code redirects after 3500ms)
    await page.waitForURL("**/inventory", { timeout: 10000 });
    console.warn("Redirected successfully to /inventory");

    // 8. Verify the chat widget is still open and contains the message history
    const chatTitleAfterRedirect = page.locator('h3:has-text("Flexi AI Operations")');
    await expect(chatTitleAfterRedirect).toBeVisible({ timeout: 5000 });

    const confirmationAfterRedirect = page.locator('div:has-text("successfully blocked Room 103")');
    await expect(confirmationAfterRedirect.first()).toBeVisible({ timeout: 5000 });

    const localStorageData = await page.evaluate(() => {
      return {
        sf_rooms: localStorage.getItem('sf_rooms'),
        sf_room_types: localStorage.getItem('sf_room_types'),
        sf_hotels: localStorage.getItem('sf_hotels'),
        sf_blocked_inventory: localStorage.getItem('sf_blocked_inventory'),
        sf_selected_hotel: localStorage.getItem('sf_selected_hotel'),
      };
    });
    console.warn("LocalStorage Data:", JSON.stringify(localStorageData, null, 2));

    // Wait 3 seconds for calendar data loading and browser console logs to flush
    await page.waitForTimeout(3000);

    // 9. Take a screenshot of /inventory with the open chat widget as proof
    const screenshotPath = "C:/Users/Sathish/.gemini/antigravity-cli/brain/257c6469-581c-42b9-864a-b771dbd1051a/block_room_103_redirect_proof.png";
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.warn(`[testBlockRoom103 proof] Screenshot successfully saved at: ${screenshotPath}`);
  });
});
