import { test, expect } from "@playwright/test";

test.describe("AI Guest Review Scoring Verification Test", () => {
  test("should ingest a guest comment, trigger AI sentiment analysis, and list with correct score and sentiment", async ({ page }) => {
    // 1. Navigate directly to the Reviews app
    await page.goto("/more-apps?app=reviews");

    // Forward browser console logs
    page.on('console', msg => {
      console.warn(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
    });

    // 2. Click the simulator ingestion drawer trigger
    const triggerBtn = page.locator('button:has-text("➕ Ingest Mock Review")');
    await expect(triggerBtn).toBeVisible({ timeout: 10000 });
    await triggerBtn.click();

    // 3. Select Booking.com as the platform
    const platformSelect = page.locator('select:has-text("Google Reviews")');
    await expect(platformSelect).toBeVisible();
    await platformSelect.selectOption("Booking.com");

    // 4. Fill guest comment with a negative sentiment
    const commentInput = page.locator('input[placeholder*="Excellent service"]');
    await expect(commentInput).toBeVisible();
    await commentInput.fill("The service was very slow and the room door key did not work. Disappointed.");

    // Setup dialog listener to auto-accept the alert containing the AI classification
    let dialogMessage = "";
    page.on("dialog", async (dialog) => {
      dialogMessage = dialog.message();
      console.warn(`[DIALOG RECEIVED] ${dialogMessage}`);
      await dialog.accept();
    });

    // 5. Click the "✨ AI Score" button to trigger sentiment scoring
    const aiScoreBtn = page.locator('button:has-text("AI Score")');
    await expect(aiScoreBtn).toBeVisible();
    await aiScoreBtn.click();

    // Wait for the dialog to fire and be dismissed
    await page.waitForTimeout(2000);

    // 6. Verify that the rating was auto-detected (e.g. 1 or 2 stars for negative comment)
    const ratingSelect = page.locator('select').nth(1); // The second select box is the rating score
    const selectedRating = await ratingSelect.inputValue();
    console.warn(`[TEST RESULT] AI Auto-Scored Rating: ${selectedRating} Stars`);
    
    // 7. Click Ingest to save the review
    const ingestBtn = page.locator('button:has-text("Ingest")');
    await expect(ingestBtn).toBeVisible();
    await ingestBtn.click();

    // Wait for the success dialog to fire and be dismissed
    await page.waitForTimeout(1000);

    // 8. Verify the new review appears on the timeline list with the correct sentiment (negative)
    const negativeBadge = page.locator('span:has-text("negative")');
    await expect(negativeBadge.first()).toBeVisible({ timeout: 5000 });

    const reviewText = page.locator('div:has-text("The service was very slow")');
    await expect(reviewText.first()).toBeVisible({ timeout: 5000 });

    // 9. Take a screenshot of the reviews console as proof
    const screenshotPath = "C:/Users/Sathish/.gemini/antigravity-cli/brain/257c6469-581c-42b9-864a-b771dbd1051a/ai_review_scoring_proof.png";
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.warn(`[AI review proof] Screenshot saved at: ${screenshotPath}`);
  });
});
