import { test, expect } from "@playwright/test";

test.describe("Automated PMS Booking for All Rooms", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the bookings page
    await page.goto("/bookings");

    // Initialize clean state for rooms and reservations in localStorage
    await page.evaluate(() => {
      localStorage.clear();
      
      const defaultRooms = [
        {
          id: "r-101",
          hotelId: "h1-resort-goa",
          organizationId: "org-stayflexi",
          roomTypeId: "rt-deluxe",
          roomNumber: "101",
          floor: 1,
          status: "AVAILABLE",
          isActive: true,
          notes: "Regular guest pre-check requested poolside delivery.",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "r-102",
          hotelId: "h1-resort-goa",
          organizationId: "org-stayflexi",
          roomTypeId: "rt-deluxe",
          roomNumber: "102",
          floor: 1,
          status: "AVAILABLE",
          isActive: true,
          notes: "Guest checking out late tomorrow at 1:00 PM.",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "r-103",
          hotelId: "h1-resort-goa",
          organizationId: "org-stayflexi",
          roomTypeId: "rt-executive",
          roomNumber: "103",
          floor: 1,
          status: "AVAILABLE",
          isActive: true,
          notes: "Deep cleaning session needed. VIP guest arrivals scheduled.",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "r-201",
          hotelId: "h1-resort-goa",
          organizationId: "org-stayflexi",
          roomTypeId: "rt-deluxe",
          roomNumber: "201",
          floor: 2,
          status: "AVAILABLE",
          isActive: true,
          notes: "Air conditioning filter recently serviced.",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "r-202",
          hotelId: "h1-resort-goa",
          organizationId: "org-stayflexi",
          roomTypeId: "rt-executive",
          roomNumber: "202",
          floor: 2,
          status: "AVAILABLE",
          isActive: true,
          notes: "Balcony sliding door track needs repair replacement.",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "r-301",
          hotelId: "h1-resort-goa",
          organizationId: "org-stayflexi",
          roomTypeId: "rt-presidential",
          roomNumber: "301",
          floor: 3,
          status: "AVAILABLE",
          isActive: true,
          notes: "Held exclusively for state department delegation.",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "r-901",
          hotelId: "h2-suites-blr",
          organizationId: "org-stayflexi",
          roomTypeId: "rt-business-std",
          roomNumber: "901",
          floor: 9,
          status: "AVAILABLE",
          isActive: true,
          notes: "Dual monitors workspace initialized.",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "r-902",
          hotelId: "h2-suites-blr",
          organizationId: "org-stayflexi",
          roomTypeId: "rt-business-std",
          roomNumber: "902",
          floor: 9,
          status: "AVAILABLE",
          isActive: true,
          notes: "Corporate account booking from Socifyy.",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ];
      localStorage.setItem("sf_rooms", JSON.stringify(defaultRooms));
      localStorage.setItem("sf_reservations", JSON.stringify([]));
      localStorage.setItem("sf_selected_hotel", "h1-resort-goa");
    });

    // Reload page to apply changes
    await page.reload();
  });

  test("should successfully book all 8 rooms for 7 days", async ({ page }) => {
    test.setTimeout(90000);
    // Listen for alerts/dialogs and print them
    page.on("dialog", async (dialog) => {
      console.warn(`ALERT/DIALOG SEEN: ${dialog.message()}`);
      await dialog.dismiss();
    });

    // Rooms to book
    const rooms = [
      { id: "r-101", number: "101" },
      { id: "r-102", number: "102" },
      { id: "r-103", number: "103" },
      { id: "r-201", number: "201" },
      { id: "r-202", number: "202" },
      { id: "r-301", number: "301" },
      { id: "r-901", number: "901" },
      { id: "r-902", number: "902" }
    ];

    // Set timeline navigation start date to 2026-07-01 to visualize our bookings perfectly
    const dateInput = page.locator('button:has-text("Next ▶") ~ input[type="date"]');
    await expect(dateInput).toBeVisible();
    await dateInput.fill("2026-07-01");
    await dateInput.dispatchEvent("change");

    for (const room of rooms) {
      // 1. Click "Create Booking"
      const createBookingBtn = page.locator('button:has-text("Create Booking")');
      await expect(createBookingBtn).toBeVisible();
      await createBookingBtn.click();

      // 2. Wait for the drawer wizard form to open
      const drawer = page.locator('h3:has-text("Advanced Booking Creation Wizard")');
      await expect(drawer).toBeVisible();

      // 3. Fill guest registration details
      await page.locator('input[placeholder="e.g. John"]').fill(`Guest${room.number}`);
      await page.locator('input[placeholder="e.g. Doe"]').fill(`Room${room.number}`);
      await page.locator('input[placeholder="e.g. john.doe@example.com"]').fill(`guest.${room.number}@example.com`);
      await page.locator('input[placeholder="e.g. +1 555-0100"]').fill(`+1 555-0${room.number}`);
      await page.locator('input[placeholder="e.g. United States"]').fill("United States");
      await page.locator('input[placeholder="e.g. P1892019"]').fill(`P-ID-${room.number}`);
      await page.locator('label:has-text("Date of Birth") + input').fill("1990-01-01");

      // 4. Select Physical Room
      const roomSelect = page.locator('label:has-text("Physical Room Allocation") + select');
      await roomSelect.selectOption(room.id);

      // 5. Select stay dates (2026-07-01 to 2026-07-08)
      const checkInInput = page.locator('label:has-text("Check-In Date") + input');
      await checkInInput.fill("2026-07-01");
      const checkOutInput = page.locator('label:has-text("Check-Out Date") + input');
      await checkOutInput.fill("2026-07-08");

      // 6. Settle advance payment with a manual high value that easily satisfies the 50% check
      const advancePaymentInput = page.locator('label:has-text("Advance Payment Made ($)") + div input[type="number"]');
      await expect(advancePaymentInput).toBeVisible();
      await advancePaymentInput.fill("5000"); // High enough to cover any stay option

      // 7. Click "Confirm Reservation"
      const confirmBtn = page.locator('button:has-text("Confirm Reservation")');
      await confirmBtn.click();

      // 8. Wait for the drawer to close
      await expect(drawer).not.toBeVisible();
    }

    // Now reload page and verify that all 8 rooms have reservation blocks on the Gantt chart
    await page.reload();

    const dateInputAfterReload = page.locator('button:has-text("Next ▶") ~ input[type="date"]');
    await expect(dateInputAfterReload).toBeVisible();
    await dateInputAfterReload.fill("2026-07-01");
    await dateInputAfterReload.dispatchEvent("change");

    // Wait for the timeline to update and show "Jul 1"
    await expect(page.locator('text=Jul 1').first()).toBeVisible();

    // Verify localStorage has our 8 reservations
    const reservationsCount = await page.evaluate(() => {
      const saved = localStorage.getItem("sf_reservations");
      if (!saved) return 0;
      const list = JSON.parse(saved);
      return list.filter((r: any) => r.guestName?.startsWith("Guest") && !r.id.endsWith("-default")).length;
    });
    expect(reservationsCount).toBe(8);

    // Verify all 8 guest names are visible as reservation blocks on the timeline
    for (const room of rooms) {
      const resBlock = page.locator(`.reservation-block:has-text("Guest${room.number} Room${room.number}"):not([data-testid$="-default"])`);
      await expect(resBlock).toBeVisible();
    }

    // Take a screenshot of the Gantt chart as visual proof
    const screenshotPath = "C:/Users/Sathish/.gemini/antigravity-cli/brain/257c6469-581c-42b9-864a-b771dbd1051a/bookings_proof.png";
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.warn(`[proof] Screenshot saved successfully at: ${screenshotPath}`);
  });
});
