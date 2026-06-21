import { test, expect } from '@playwright/test'

test.describe('Book Room 101 for June 9 and 10', () => {
  test('should successfully book Room 101 for June 9 to 11', async ({ page }) => {
    test.setTimeout(45000)

    page.on('console', (msg) => {
      console.warn(`[browser console ${msg.type()}] ${msg.text()}`)
    })
    page.on('pageerror', (err) => {
      console.error(`[browser page error]`, err)
    })
    page.on('requestfailed', (request) => {
      console.warn(`[request failed] ${request.url()} - ${request.failure()?.errorText}`)
    })
    page.on('response', (response) => {
      if (!response.ok()) {
        console.warn(`[response error] ${response.url()} status=${response.status()}`)
      }
    })

    // 1. Navigate to bookings page
    await page.goto('/bookings')

    // 2. Set timeline navigation start date to 2026-06-01 to visualize June bookings
    const dateInput = page.locator('button:has-text("Next ▶") ~ input[type="date"]')
    await expect(dateInput).toBeVisible()
    await dateInput.fill('2026-06-01')
    await dateInput.dispatchEvent('change')

    // Wait for the timeline to update and show "Jun 1"
    await expect(page.locator('text=Jun 1').first()).toBeVisible()

    // 3. Click "Create Booking"
    const createBookingBtn = page.locator('button:has-text("Create Booking")')
    await expect(createBookingBtn).toBeVisible()
    await createBookingBtn.click()

    // 4. Wait for the drawer wizard form to open
    const drawer = page.locator('h3:has-text("Advanced Booking Creation Wizard")')
    await expect(drawer).toBeVisible()

    // 5. Fill guest registration details
    await page.locator('input[placeholder="e.g. John"]').fill('Playwright')
    await page.locator('input[placeholder="e.g. Doe"]').fill('Guest101')
    await page.locator('input[placeholder="e.g. john.doe@example.com"]').fill('playwright.101@example.com')
    await page.locator('input[placeholder="e.g. +1 555-0100"]').fill('+1 555-0101')
    await page.locator('input[placeholder="e.g. United States"]').fill('United States')
    await page.locator('input[placeholder="e.g. P1892019"]').fill('P-ID-101')
    await page.locator('label:has-text("Date of Birth") + input').fill('1990-01-01')

    // 6. Select Physical Room (r-101)
    const roomSelect = page.locator('label:has-text("Physical Room Allocation") + select')
    await roomSelect.selectOption('r-101')

    // 7. Select stay dates (June 9 to June 11, spanning June 9 and 10)
    const checkInInput = page.locator('label:has-text("Check-In Date") + input')
    await checkInInput.fill('2026-06-09')
    const checkOutInput = page.locator('label:has-text("Check-Out Date") + input')
    await checkOutInput.fill('2026-06-11')

    // 8. Settle advance payment to cover standard 50% checkout validation rule
    const advancePaymentInput = page.locator(
      'label:has-text("Advance Payment Made ($)") + div input[type="number"]'
    )
    await expect(advancePaymentInput).toBeVisible()
    await advancePaymentInput.fill('5000')

    // 9. Click "Confirm Reservation"
    const confirmBtn = page.locator('button:has-text("Confirm Reservation")')
    await confirmBtn.click()

    // 10. Wait for the drawer to close
    await expect(drawer).not.toBeVisible()

    // 11. Reload page to force reload database bookings and verify it persists
    await page.reload()

    // Reset date input back to June 8th to visualize the block
    const dateInputAfterReload = page.locator('button:has-text("Next ▶") ~ input[type="date"]')
    await expect(dateInputAfterReload).toBeVisible()
    await dateInputAfterReload.fill('2026-06-08')
    await dateInputAfterReload.dispatchEvent('change')

    // Verify guest block is visible on the timeline
    const resBlock = page.locator(
      '.reservation-block:has-text("Playwright Guest101"):not([data-testid$="-default"])'
    )
    await expect(resBlock).toBeVisible()

    // Take screenshot as proof
    const screenshotPath =
      'C:/Users/Sathish/.gemini/antigravity-cli/brain/133893f6-796c-423f-a533-abbea9e9f0fd/june_101_booking_proof.png'
    await page.screenshot({ path: screenshotPath, fullPage: true })
    console.warn(`[proof] June booking screenshot saved successfully at: ${screenshotPath}`)
  })
})
