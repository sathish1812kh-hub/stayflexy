import { test, expect } from "@playwright/test";
import { prisma } from "../../common/lib/prisma";

test.describe("3-Device Login Limit & Session Warnings", () => {
  test.beforeEach(async () => {
    // Clean up active sessions and hijack warnings for user "u-1"
    await prisma.refreshToken.updateMany({
      where: { userId: "u-1", revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await prisma.securityEvent.deleteMany({
      where: { userId: "u-1", eventType: "SESSION_HIJACK_ATTEMPT" },
    });
  });

  test("should allow up to 3 devices, block 4th device, and show warning to existing sessions", async ({ browser }) => {
    test.setTimeout(60000);

    // Helper to log in a user
    const loginUser = async (page: any) => {
      await page.goto("/login");
      await page.fill('input[type="email"]', 'admin@stayflexi.com');
      // Wait briefly for hydration to catch up and handle input events
      await page.waitForTimeout(500);
      await page.fill('input[type="password"]', 'dev-pass');
      await page.click('button[type="submit"]');
    };

    // 1. Launch 3 separate browsers (devices) that successfully log in
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    page1.on("console", (msg) => console.log(`[Page 1 Console] ${msg.text()}`));
    page1.on("pageerror", (err) => console.error(`[Page 1 Error] ${err.message}`));
    await loginUser(page1);
    await page1.waitForURL("**/");

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    page2.on("console", (msg) => console.log(`[Page 2 Console] ${msg.text()}`));
    page2.on("pageerror", (err) => console.error(`[Page 2 Error] ${err.message}`));
    await loginUser(page2);
    await page2.waitForURL("**/");

    const context3 = await browser.newContext();
    const page3 = await context3.newPage();
    page3.on("console", (msg) => console.log(`[Page 3 Console] ${msg.text()}`));
    page3.on("pageerror", (err) => console.error(`[Page 3 Error] ${err.message}`));
    await loginUser(page3);
    await page3.waitForURL("**/");

    // Verify 3 active refresh tokens exist in DB
    const activeCount = await prisma.refreshToken.count({
      where: { userId: "u-1", revokedAt: null },
    });
    expect(activeCount).toBe(3);

    // 2. Try to log in from a 4th device (context4 / page4)
    const context4 = await browser.newContext();
    const page4 = await context4.newPage();
    page4.on("console", (msg) => console.log(`[Page 4 Console] ${msg.text()}`));
    page4.on("pageerror", (err) => console.error(`[Page 4 Error] ${err.message}`));
    await loginUser(page4);

    // Verify login is blocked on the 4th device and shows the specific limit warning
    const errorMessage = page4.locator('div[style*="color: #ef4444"], div[style*="color: rgb(239, 68, 68)"]');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    await expect(errorMessage).toContainText("Maximum device limit reached");

    // Verify 4th login was blocked (still exactly 3 active tokens)
    const activeCountAfterBlocked = await prisma.refreshToken.count({
      where: { userId: "u-1", revokedAt: null },
    });
    expect(activeCountAfterBlocked).toBe(3);

    // 3. Verify that the warning banner appears on the 1st device (page1)
    // Wait for the warning banner to render via polling (polls every 10s, so we check with a 15s timeout)
    const warningBanner = page1.locator('strong:has-text("Security Alert:")');
    await expect(warningBanner).toBeVisible({ timeout: 15000 });

    // Clean up browser contexts
    await context1.close();
    await context2.close();
    await context3.close();
    await context4.close();
  });
});

