import { test, expect } from "@playwright/test";

// Helper function to dispatch native HTML5 Drag and Drop events programmatically.
// Playwright mouse dragTo emulation does not set dataTransfer values.
async function performHTML5DragAndDrop(page: any, sourceTestId: string, targetTestId: string) {
  await page.evaluate(({ srcId, dstId }: { srcId: string; dstId: string }) => {
    const sourceEl = document.querySelector(`[data-testid="${srcId}"]`);
    const targetEl = document.querySelector(`[data-testid="${dstId}"]`);
    
    if (!sourceEl || !targetEl) {
      throw new Error(`Elements not found for drag-and-drop: src=[data-testid="${srcId}"], dst=[data-testid="${dstId}"]`);
    }
    
    const dataTransfer = new DataTransfer();
    
    const createDragEvent = (type: string) => {
      const ev = new DragEvent(type, {
        bubbles: true,
        cancelable: true
      });
      Object.defineProperty(ev, 'dataTransfer', {
        value: dataTransfer,
        writable: false,
        configurable: true
      });
      return ev;
    };
    
    // 1. Dispatch dragstart on source
    sourceEl.dispatchEvent(createDragEvent('dragstart'));
    
    // 2. Dispatch dragover on target
    targetEl.dispatchEvent(createDragEvent('dragover'));
    
    // 3. Dispatch drop on target
    targetEl.dispatchEvent(createDragEvent('drop'));
  }, { srcId: sourceTestId, dstId: targetTestId });
}

test.describe("Bidirectional OTA Channel Manager Synchronization Simulation", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the bookings page
    await page.goto("/bookings");

    // Clear local storage and seed 3 unassigned reservations from Booking.com, Agoda, and Airbnb
    await page.evaluate(() => {
      localStorage.clear();
      
      const mockReservations = [
        {
          id: "ota-bookingcom",
          guestName: "John Booking.com",
          roomNumber: "",
          roomId: "", // Unassigned queue
          checkIn: "2026-05-22",
          checkOut: "2026-05-25",
          status: "PENDING",
          amount: 360.00,
          notes: "EMAIL:john.b@bookingcom.com | PHONE:+1 555-0001 | NATIONALITY:United States | ID_TYPE:PASSPORT | ID_NUMBER:B990182 | DOB:1985-06-15 | RATE:120.00 | DISCOUNT:0.00 | TAX:43.20 | OTA_SOURCE:BOOKING_COM",
          email: "john.b@bookingcom.com",
          phone: "+1 555-0001",
          nationality: "United States",
          idType: "PASSPORT",
          idNumber: "B990182",
          dob: "1985-06-15",
          baseRate: 120.00,
          discount: 0.00,
          tax: 43.20
        },
        {
          id: "ota-agoda",
          guestName: "Aya Agoda",
          roomNumber: "",
          roomId: "", // Unassigned queue
          checkIn: "2026-05-21",
          checkOut: "2026-05-24",
          status: "PENDING",
          amount: 330.00,
          notes: "EMAIL:aya.agoda@example.jp | PHONE:+81 90-1234-5678 | NATIONALITY:Japan | ID_TYPE:PASSPORT | ID_NUMBER:A772091 | DOB:1990-12-01 | RATE:110.00 | DISCOUNT:0.00 | TAX:39.60 | OTA_SOURCE:AGODA",
          email: "aya.agoda@example.jp",
          phone: "+81 90-1234-5678",
          nationality: "Japan",
          idType: "PASSPORT",
          idNumber: "A772091",
          dob: "1990-12-01",
          baseRate: 110.00,
          discount: 0.00,
          tax: 39.60
        },
        {
          id: "ota-airbnb",
          guestName: "Amanda Airbnb",
          roomNumber: "",
          roomId: "", // Unassigned queue
          checkIn: "2026-05-24",
          checkOut: "2026-05-28",
          status: "PENDING",
          amount: 380.00,
          notes: "EMAIL:amanda.a@airbnb.com | PHONE:+1 555-0099 | NATIONALITY:Canada | ID_TYPE:DRIVERS_LICENSE | ID_NUMBER:DL-CA9928 | DOB:1992-04-20 | RATE:95.00 | DISCOUNT:0.00 | TAX:45.60 | OTA_SOURCE:AIRBNB",
          email: "amanda.a@airbnb.com",
          phone: "+1 555-0099",
          nationality: "Canada",
          idType: "DRIVERS_LICENSE",
          idNumber: "DL-CA9928",
          dob: "1992-04-20",
          baseRate: 95.00,
          discount: 0.00,
          tax: 45.60
        }
      ];

      localStorage.setItem("sf_reservations", JSON.stringify(mockReservations));
      // Force selected hotel to Goa Beach Resort to match room templates
      localStorage.setItem("sf_selected_hotel", "h1-resort-goa");
    });

    // Reload the page to bind localStorage updates
    await page.reload();
    await page.waitForTimeout(1500);

    // Set timeline start date to 2026-05-20 to match mock reservations
    const todayBtn = page.locator('button:has-text("Today")');
    await expect(todayBtn).toBeVisible();
    await todayBtn.click();
    await expect(page.locator('text=May 20').first()).toBeVisible();
  });

  test("should display incoming OTA reservations in the Unassigned Queue sidebar", async ({ page }) => {
    const queueSidebar = page.locator("span:has-text('Unassigned Queue')");
    await expect(queueSidebar).toBeVisible();

    // Verify all 3 OTA reservations exist in the queue tray
    const bookingComCard = page.locator('[data-testid="unassigned-card-ota-bookingcom"]');
    const agodaCard = page.locator('[data-testid="unassigned-card-ota-agoda"]');
    const airbnbCard = page.locator('[data-testid="unassigned-card-ota-airbnb"]');

    await expect(bookingComCard).toBeVisible();
    await expect(agodaCard).toBeVisible();
    await expect(airbnbCard).toBeVisible();
  });

  test("should reallocate room using Drag and Drop and push simulated inventory status", async ({ page }) => {
    // 1. Target the drag element for John Booking.com
    const sourceCard = page.locator('[data-testid="unassigned-card-ota-bookingcom"]').first();
    await expect(sourceCard).toBeVisible();

    // 2. Target target grid cell for Room 103, index cell 2 (which represents May 22)
    const targetCell = page.locator('[data-testid="cell-103-2"]').first();
    await expect(targetCell).toBeVisible();

    // 3. Perform Drag and Drop from Unassigned queue directly onto the grid cell
    await performHTML5DragAndDrop(page, "unassigned-card-ota-bookingcom", "cell-103-2");

    // 4. Verify that the card has left the unassigned queue
    const unassignedCard = page.locator('[data-testid="unassigned-card-ota-bookingcom"]');
    await expect(unassignedCard).not.toBeVisible();

    // 5. Verify the guest is now rendered on the calendar grid block
    const allocatedBlock = page.locator('[data-testid="res-block-ota-bookingcom"]');
    await expect(allocatedBlock).toBeVisible();
  });

  test("should simulate Drop-to-Swap gesture and trigger the confirmation dialog", async ({ page }) => {
    // 1. Assign Aya Agoda to Room 103 programmatically/locally first
    // and John Booking.com to Room 201 to create two blocks
    await page.evaluate(() => {
      const current = JSON.parse(localStorage.getItem("sf_reservations") || "[]");
      const updated = current.map((r: any) => {
        if (r.id === "ota-agoda") {
          return { ...r, roomId: "r-103", roomNumber: "103" };
        }
        if (r.id === "ota-bookingcom") {
          return { ...r, roomId: "r-201", roomNumber: "201" };
        }
        return r;
      });
      localStorage.setItem("sf_reservations", JSON.stringify(updated));
    });
    await page.reload();
    await page.waitForTimeout(1500);
    const todayBtnAfterReload1 = page.locator('button:has-text("Today")');
    await expect(todayBtnAfterReload1).toBeVisible();
    await todayBtnAfterReload1.click();
    await expect(page.locator('text=May 20').first()).toBeVisible();

    // 2. Locate the allocated reservation block and target occupied cell
    const bookingComBlock = page.locator('[data-testid="res-block-ota-bookingcom"]').first();
    const targetOccupiedCell = page.locator('[data-testid="cell-103-2"]').first();

    await expect(bookingComBlock).toBeVisible();
    await expect(targetOccupiedCell).toBeVisible();

    // 3. Listen for window.confirm dialog triggered by the drop swap
    let confirmDialogText = "";
    page.on("dialog", async (dialog) => {
      confirmDialogText = dialog.message();
      await dialog.accept(); // Confirms the room swap
    });

    // 4. Drag John Booking.com block and drop it on cell-103-2 (which is occupied by Aya Agoda)
    await performHTML5DragAndDrop(page, "res-block-ota-bookingcom", "cell-103-2");

    // 5. Verify confirmation dialog triggered with correct text
    expect(confirmDialogText).toContain("Conflict detected!");
    expect(confirmDialogText).toContain("Do you want to SWAP the rooms");

    // 6. Verify that their room allocations are visually swapped in the browser state
    await page.reload(); // Reload to see persistence
    await page.waitForTimeout(1500);
    const todayBtnAfterReload2 = page.locator('button:has-text("Today")');
    await expect(todayBtnAfterReload2).toBeVisible();
    await todayBtnAfterReload2.click();
    await expect(page.locator('text=May 20').first()).toBeVisible();

    const finalBookingComBlock = page.locator('[data-testid="res-block-ota-bookingcom"]').first();
    const finalAgodaBlock = page.locator('[data-testid="res-block-ota-agoda"]').first();

    await expect(finalBookingComBlock).toBeVisible();
    await expect(finalAgodaBlock).toBeVisible();
  });
});
