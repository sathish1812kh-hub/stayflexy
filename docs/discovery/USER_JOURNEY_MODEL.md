# User Journey Discovery Model — Stayflexi Platform

This document catalogs and designs the user journey validation schemas used by the browser automation layer to trace end-to-end functionality.

---

## 1. Login Journey

- **Goal**: Authenticate user and store jwt token in localStorage.
- **Target URI**: `http://localhost:3000/login`
- **Action Flow**:
  1. Navigate to `/login`.
  2. Input username/email into input element `[type="email"]` or auto-fill pre-configured user.
  3. Input password into `[type="password"]`.
  4. Click button `button[type="submit"]`.
  5. Wait for redirection to `/` (dashboard).
- **Selectors**:
  - Email Input: `input[type="email"]`
  - Password Input: `input[type="password"]`
  - Submit Button: `button[type="submit"]`
  - Session Validation Hook: `localStorage.getItem('sf_jwt_token')`
- **Verification Anchors**:
  - Dispatched endpoint call: `POST /api/v1/auth/login`
  - Post-conditions: Dashboard container selector `div.dashboard-container` must be visible.
  - Test Source: [testLogoutLogin.test.ts](file:///C:/Stayflexi/src/tests/integration/testLogoutLogin.test.ts)

---

## 2. Registration Journey

- **Goal**: Register a new Organization/Property Admin.
- **Target URI**: `http://localhost:3000/register`
- **Action Flow**:
  1. Navigate to `/register`.
  2. Input Organization Name in `input[name="orgName"]`.
  3. Input Contact Email in `input[name="email"]`.
  4. Input Contact Password in `input[name="password"]`.
  5. Select plan options in drop-down list `select[name="tier"]`.
  6. Click button `button.register-submit-btn`.
  7. Verify success banner and redirect to `/login`.
- **Selectors**:
  - Org Name: `input[name="orgName"]`
  - Email: `input[name="email"]`
  - Password: `input[name="password"]`
  - Register Submit: `button.register-submit-btn`
- **Verification Anchors**:
  - Dispatched endpoint call: `POST /api/v1/auth/register`
  - Post-conditions: Success modal showing text "Registration Successful".

---

## 3. Search Journey

- **Goal**: Search for available rooms based on dates, guests, and preferences.
- **Target URI**: `http://localhost:3000/inventory` or customer-facing portal.
- **Action Flow**:
  1. Navigate to `/inventory` or `/bookings`.
  2. Locate search widget inputs.
  3. Set `checkin` date input `input[name="checkIn"]` to a future date.
  4. Set `checkout` date input `input[name="checkOut"]` to check-in + 3 days.
  5. Set room category filter.
  6. Click search button `button.search-btn`.
- **Selectors**:
  - Check-in Date Picker: `input[name="checkIn"]`
  - Check-out Date Picker: `input[name="checkOut"]`
  - Search Button: `button.search-btn`
- **Verification Anchors**:
  - Dispatched endpoint call: `GET /api/v1/rooms/search` or `GET /api/v1/inventory/availability`
  - Post-conditions: Discovered room grid items container `div.room-grid` containing active room items.

---

## 4. Checkout Journey

- **Goal**: Complete guest check-out, calculate final bills, record payments, and release room status.
- **Target URI**: `http://localhost:3000/bookings`
- **Action Flow**:
  1. Navigate to `/bookings`.
  2. Click on a checked-in booking block `div.reservation-block.checked-in`.
  3. In the reservation drawer, click "Checkout Guest" button `button.checkout-trigger`.
  4. Confirm invoice ledger items, adding any optional laundry or restaurant charges.
  5. Click "Process Invoice & Charge" button `button.process-checkout`.
  6. Verify billing success message and change in reservation cell color/class to `checked-out`.
- **Selectors**:
  - Guest Block: `div.reservation-block.checked-in`
  - Checkout Button: `button.checkout-trigger`
  - Process Button: `button.process-checkout`
- **Verification Anchors**:
  - Dispatched endpoint call: `POST /api/v1/bookings/:id/checkout`
  - Post-conditions: Room state changes to "dirty" or "available".

---

## 5. Booking Journey

- **Goal**: Create a new reservation and assign it to a room grid cell.
- **Target URI**: `http://localhost:3000/bookings`
- **Action Flow**:
  1. Navigate to `/bookings`.
  2. Input start date `input[type="date"]`.
  3. Click and drag across room grid slots or click "New Reservation" button.
  4. Fill in Guest Name `input[name="guestName"]` and Guest Email `input[name="guestEmail"]`.
  5. Select Room Type or specific Room Number.
  6. Click "Create Booking" button `button.confirm-booking-btn`.
- **Selectors**:
  - Create Booking Button: `button.new-booking-btn`
  - Guest Name Input: `input[name="guestName"]`
  - Save Button: `button.confirm-booking-btn`
- **Verification Anchors**:
  - Dispatched endpoint call: `POST /api/v1/bookings/create`
  - Post-conditions: New SVG/div booking block appears inside the grid for that room.
  - Test Source: [bookJuneRoom101.test.ts](file:///C:/Stayflexi/src/tests/integration/bookJuneRoom101.test.ts)

---

## 6. Reporting Journey

- **Goal**: View revenue reports, occupancy rate, ADR, and RevPAR metrics.
- **Target URI**: `http://localhost:3000/revenue` (or general dashboard layout).
- **Action Flow**:
  1. Navigate to dashboard or `/revenue`.
  2. Click date range filter dropdown `button.filter-date-btn`.
  3. Select "Last 30 Days" or input specific start/end inputs.
  4. Click "Apply Filters" button.
  5. Verify dashboard charts and summary statistics reload.
- **Selectors**:
  - Filter Button: `button.filter-date-btn`
  - Revenue Metric Cards: `div.metric-card-revenue`
- **Verification Anchors**:
  - Dispatched endpoint call: `GET /api/v1/reports/revenue-summary`
  - Post-conditions: Non-empty charts or populated dataset elements.
