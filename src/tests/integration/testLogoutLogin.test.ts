import { test, expect } from "@playwright/test";

test.describe("Logout and Login Authentication gate Verification Flow", () => {
  test("should load login page, login successfully, logout to clear session, and login again", async ({ page }) => {
    // 1. Navigate directly to `/login`
    await page.goto("/login");
    
    // Save screenshot of the login screen
    const loginScreenPath = "C:/Users/Sathish/.gemini/antigravity-cli/brain/257c6469-581c-42b9-864a-b771dbd1051a/fresh_login_page.png";
    await page.screenshot({ path: loginScreenPath });
    console.warn(`[Login Screen] Saved screenshot to: ${loginScreenPath}`);

    // 2. Submit the pre-filled credentials
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // 3. Verify redirected to main console / dashboard page
    await page.waitForURL("**/");
    const chatLauncher = page.locator("button.hover-glow");
    await expect(chatLauncher).toBeVisible({ timeout: 10000 });

    // Verify token exists in local storage
    const token = await page.evaluate(() => localStorage.getItem("sf_jwt_token"));
    expect(token).not.toBeNull();

    // Save screenshot of the logged-in dashboard
    const dashboardScreenPath = "C:/Users/Sathish/.gemini/antigravity-cli/brain/257c6469-581c-42b9-864a-b771dbd1051a/logged_in_dashboard.png";
    await page.screenshot({ path: dashboardScreenPath });
    console.warn(`[Dashboard Screen] Saved screenshot to: ${dashboardScreenPath}`);

    // 4. Locate and click the Sign Out button
    const signOutBtn = page.locator('a.logout-btn');
    await expect(signOutBtn).toBeVisible();
    await signOutBtn.click();

    // 5. Verify redirection back to the `/login` page
    await page.waitForURL("**/login");
    await expect(page).toHaveURL(/.*login/);

    // Verify localStorage auth keys are fully cleared by the login mount effect
    const clearedToken = await page.evaluate(() => localStorage.getItem("sf_jwt_token"));
    expect(clearedToken).toBeNull();

    // Save screenshot after sign out
    const afterLogoutScreenPath = "C:/Users/Sathish/.gemini/antigravity-cli/brain/257c6469-581c-42b9-864a-b771dbd1051a/after_logout_login_page.png";
    await page.screenshot({ path: afterLogoutScreenPath });
    console.warn(`[After Logout Screen] Saved screenshot to: ${afterLogoutScreenPath}`);

    // 6. Log back in again to confirm re-authenticating works
    await submitBtn.click();
    await page.waitForURL("**/");
    await expect(chatLauncher).toBeVisible({ timeout: 10000 });

    // Save final screenshot after logging back in
    const secondLoginScreenPath = "C:/Users/Sathish/.gemini/antigravity-cli/brain/257c6469-581c-42b9-864a-b771dbd1051a/second_login_dashboard.png";
    await page.screenshot({ path: secondLoginScreenPath });
    console.warn(`[Second Login Dashboard] Saved screenshot to: ${secondLoginScreenPath}`);
  });
});
