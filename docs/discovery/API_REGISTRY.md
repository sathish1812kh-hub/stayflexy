# API Registry — Stayflexi Platform

This document catalogs the REST endpoints, internal APIs, webhooks, and GraphQL structures exposed by the Stayflexi platform microservices.

---

## 1. Authentication Service (`auth-service` : `3001`)

| Method | Route                   | Purpose                                                 | Inputs                                                 | Outputs                                       | Dependencies                                     |
| :----- | :---------------------- | :------------------------------------------------------ | :----------------------------------------------------- | :-------------------------------------------- | :----------------------------------------------- |
| `POST` | `/api/v1/auth/register` | Register a new platform administrator or user           | Body: `{ email, password, firstName, lastName, role }` | `201 Created` with User JSON                  | `User` DB model                                  |
| `POST` | `/api/v1/auth/login`    | Authenticate user, check brute force, issue tokens      | Body: `{ email, password }`                            | `200 OK` with `{ accessToken, refreshToken }` | `User` DB model, Redis brute-force keys          |
| `POST` | `/api/v1/auth/logout`   | Revoke a refresh token and destroy session              | Body: `{ refreshToken }`                               | `200 OK` with success status                  | `RefreshToken` DB model, Redis session blacklist |
| `POST` | `/api/v1/auth/refresh`  | Rotate access token using a refresh token               | Body: `{ refreshToken }`                               | `200 OK` with new tokens                      | `RefreshToken` DB model                          |
| `GET`  | `/api/v1/auth/me`       | Fetch details of the current authenticated user session | Header: `Authorization Bearer <token>`                 | `200 OK` with User profile                    | `User` DB model                                  |

---

## 2. Organization Service (`organization-service` : `3002`)

| Method   | Route                                         | Purpose                                 | Inputs                             | Outputs                              | Dependencies               |
| :------- | :-------------------------------------------- | :-------------------------------------- | :--------------------------------- | :----------------------------------- | :------------------------- |
| `POST`   | `/api/v1/organizations`                       | Create a new tenant organization        | Body: `{ name, subscriptionPlan }` | `210 Created` with Organization JSON | `Organization` model       |
| `GET`    | `/api/v1/organizations`                       | List all organizations (admin only)     | None                               | `200 OK` with Array of Orgs          | `Organization` model       |
| `GET`    | `/api/v1/organizations/:id`                   | Fetch specific organization details     | Path ID                            | `200 OK` with Org JSON               | `Organization` model       |
| `PATCH`  | `/api/v1/organizations/:id`                   | Update organization profile settings    | Path ID, Body updates              | `200 OK` with updated Org            | `Organization` model       |
| `POST`   | `/api/v1/organizations/:id/members`           | Invite/add a member to the organization | Path ID, Body: `{ email, roleId }` | `201 Created` with Member JSON       | `OrganizationMember` model |
| `DELETE` | `/api/v1/organizations/:id/members/:memberId` | Remove member from organization         | Path ID, Member ID                 | `200 OK`                             | `OrganizationMember` model |

---

## 3. Hotel Service (`hotel-service` : `3003`)

| Method  | Route                      | Purpose                                     | Inputs                                      | Outputs                          | Dependencies     |
| :------ | :------------------------- | :------------------------------------------ | :------------------------------------------ | :------------------------------- | :--------------- |
| `POST`  | `/api/v1/hotels`           | Create a new hotel property                 | Body: `{ name, location, organizationId }`  | `201 Created` with Hotel JSON    | `Hotel` model    |
| `GET`   | `/api/v1/hotels`           | List hotels under the caller's organization | Query: `organizationId`                     | `200 OK` with Array of Hotels    | `Hotel` model    |
| `GET`   | `/api/v1/hotels/:id`       | Fetch specific hotel metadata               | Path ID                                     | `200 OK` with Hotel JSON         | `Hotel` model    |
| `POST`  | `/api/v1/room-types`       | Define a new room class (e.g. Deluxe Suite) | Body: `{ name, basePrice, hotelId }`        | `201 Created` with RoomType JSON | `RoomType` model |
| `POST`  | `/api/v1/rooms`            | Create a physical room entry                | Body: `{ roomNumber, roomTypeId, hotelId }` | `201 Created` with Room JSON     | `Room` model     |
| `PATCH` | `/api/v1/rooms/:id/status` | Update housekeeping/physical status of room | Path ID, Body: `{ status }`                 | `200 OK` with updated Room       | `Room` model     |

---

## 4. Inventory Service (`inventory-service` : `3004`)

| Method | Route                            | Purpose                                | Inputs                                                  | Outputs                         | Dependencies                   |
| :----- | :------------------------------- | :------------------------------------- | :------------------------------------------------------ | :------------------------------ | :----------------------------- |
| `POST` | `/api/v1/inventory/reserve`      | Hold room availability for booking     | Body: `{ roomTypeId, startDate, endDate, quantity }`    | `200 OK` with Hold reference ID | `Inventory` model, Redis locks |
| `POST` | `/api/v1/inventory/release`      | Release held room availability         | Body: `{ holdId }`                                      | `200 OK`                        | `Inventory` model, Redis locks |
| `POST` | `/api/v1/inventory/block`        | Blackout dates/rooms for maintenance   | Body: `{ hotelId, roomId, startDate, endDate, reason }` | `201 Created` with Block JSON   | `InventoryBlock` model         |
| `GET`  | `/api/v1/inventory/availability` | Query available room count for dates   | Query: `hotelId, checkIn, checkOut`                     | `200 OK` with available counts  | `Inventory` model              |
| `GET`  | `/api/v1/inventory/calendar`     | Fetch inventory timeline snapshot grid | Query: `hotelId, startDate, endDate`                    | `200 OK` with calendar details  | `Inventory` model              |

---

## 5. Booking Service (`booking-service` : `3005`)

| Method | Route                            | Purpose                                       | Inputs                                               | Outputs                         | Dependencies                                      |
| :----- | :------------------------------- | :-------------------------------------------- | :--------------------------------------------------- | :------------------------------ | :------------------------------------------------ |
| `POST` | `/api/v1/bookings`               | Create booking reservation                    | Body: `{ hotelId, roomTypeId, guestDetails, dates }` | `201 Created` with Booking JSON | `Booking` model, Redis locks, `inventory-service` |
| `GET`  | `/api/v1/bookings/:id`           | Fetch specific booking dossier                | Path ID                                              | `200 OK` with Booking JSON      | `Booking` model                                   |
| `POST` | `/api/v1/bookings/:id/check-in`  | Perform check-in on arrival                   | Path ID                                              | `200 OK`                        | `Booking` model, `hotel-service`                  |
| `POST` | `/api/v1/bookings/:id/check-out` | Perform checkout on departure                 | Path ID                                              | `200 OK`                        | `Booking` model, `payment-service`                |
| `POST` | `/api/v1/bookings/:id/cancel`    | Process booking cancellation and release hold | Path ID                                              | `200 OK`                        | `Booking` model, Redis holds                      |

---

## 6. Payment Service (`payment-service` : `3006`)

| Method | Route                          | Purpose                                | Inputs                                          | Outputs                         | Dependencies                                   |
| :----- | :----------------------------- | :------------------------------------- | :---------------------------------------------- | :------------------------------ | :--------------------------------------------- |
| `POST` | `/api/v1/payments/initiate`    | Generate a billing transaction request | Body: `{ bookingId, amount, currency, method }` | `201 Created` with Payment JSON | `Payment` model, Redis idempotency keys        |
| `POST` | `/api/v1/payments/:id/confirm` | Confirm payment capture from gateway   | Path ID                                         | `200 OK`                        | `Payment` model, `LedgerEntry` model           |
| `POST` | `/api/v1/payments/:id/refund`  | Return payments (partially or fully)   | Path ID, Body: `{ amount }`                     | `201 Created` with Refund JSON  | `Refund` model, `Payment` model limits         |
| `POST` | `/api/v1/payments/webhooks`    | Handle raw Stripe webhook events       | Header: `stripe-signature`, Body: raw JSON      | `200 OK`                        | `PaymentWebhookEvent`, timing-safe HMAC checks |
| `GET`  | `/api/v1/reconciliation`       | Query transaction records matches      | Query: `hotelId, startDate, endDate`            | `200 OK` with mismatches/ledger | `LedgerEntry` model                            |

---

## 7. OTA Service (`ota-service` : `3007`)

| Method | Route                        | Purpose                                  | Inputs                                          | Outputs                         | Dependencies                              |
| :----- | :--------------------------- | :--------------------------------------- | :---------------------------------------------- | :------------------------------ | :---------------------------------------- |
| `POST` | `/api/v1/ota/providers`      | Define an external OTA partner profile   | Body: `{ name, code, supportEmail }`            | `201 Created` with OTA JSON     | `OTAProvider` model                       |
| `POST` | `/api/v1/ota/connections`    | Bind a Stayflexi hotel to an OTA channel | Body: `{ hotelId, providerId, channelHotelId }` | `201 Created` with connection   | `OTAMapping` model                        |
| `POST` | `/api/v1/ota/sync/inventory` | Sync availability to active channels     | Body: `{ hotelId }`                             | `200 OK` with SyncJob reference | `SyncJob` model, `inventory-service`      |
| `POST` | `/api/v1/ota/sync/rates`     | Sync price shifts to OTA platforms       | Body: `{ hotelId }`                             | `200 OK` with SyncJob reference | `SyncJob` model, `pricing-engine-service` |
| `GET`  | `/api/v1/ota/sync/status`    | Check details of sync jobs               | Query: `jobId`                                  | `200 OK` with Job status        | `SyncJob`, `SyncEvent` models             |

---

## 8. Revenue Management Service (`revenue-management-service` / Monolith Modules)

| Method | Route                                         | Purpose                                       | Inputs                                              | Outputs                                      | Dependencies                               |
| :----- | :-------------------------------------------- | :-------------------------------------------- | :-------------------------------------------------- | :------------------------------------------- | :----------------------------------------- |
| `POST` | `/api/v1/revenue/competitors`                 | Setup competitor hotel mappings               | Body: `{ hotelId, name, location, pricingSegment }` | `201 Created` with Competitor JSON           | `CompetitorHotel` model                    |
| `GET`  | `/api/v1/revenue/competitors`                 | Fetch competitor hotels                       | Query: `hotelId`                                    | `200 OK`                                     | `CompetitorHotel` model                    |
| `POST` | `/api/v1/revenue/competitors/prices/upload`   | Upload scraped prices from competitors        | Body: `{ prices: [...] }`                           | `200 OK`                                     | `CompetitorScrapedPrice` model             |
| `GET`  | `/api/v1/revenue/comparison`                  | Compare Stayflexi prices to market statistics | Query: `hotelId, roomTypeId, checkInDate`           | `200 OK` with min/avg/median and differences | `CompetitorScrapedPrice` model             |
| `POST` | `/api/v1/revenue/recommendations`             | Generate dynamic price recommendations        | Body: `{ hotelId }`                                 | `200 OK`                                     | `RevenueOptimizer.ts`, `DynamicRate` model |
| `GET`  | `/api/v1/revenue/recommendations`             | Fetch recommendations list                    | Query: `hotelId`                                    | `200 OK` with list                           | `RateRecommendation` model                 |
| `POST` | `/api/v1/revenue/recommendations/:id/approve` | Approve recommendation & push price live      | Path ID                                             | `200 OK` with update log                     | `RateRecommendation`, `DynamicRate` models |

---

## 9. Analytics Service (`analytics-service` : `3008`)

| Method | Route                         | Purpose                                 | Inputs                  | Outputs                       | Dependencies                         |
| :----- | :---------------------------- | :-------------------------------------- | :---------------------- | :---------------------------- | :----------------------------------- |
| `GET`  | `/api/v1/analytics/dashboard` | Fetch dashboard KPI counts              | Query: `hotelId, range` | `200 OK` with counts          | `RevenueMetric`, `AnalyticsSnapshot` |
| `GET`  | `/api/v1/reports/financial`   | Fetch financial report ledger summaries | Query: `hotelId, month` | `200 OK` with revenue numbers | `LedgerEntry` read-only snapshots    |

---

## 10. GraphQL API (Apollo Federation)

### Router Gateway (`8080`)

Exposes `/graphql` endpoint routing query requests to subgraphs.

### Hotel Subgraph (`hotel-service` : `3003`)

Serves `/graphql` internally for supergraph compilation.

- **Query**: `hotel(id: ID!)` / `hotels`
- **Entities**: `Hotel` (keys: `id`), `RoomType` (keys: `id`), `Room` (keys: `id`)
- **DataLoader Integration**: Resolves sub-entities (e.g. `rooms` on `Hotel`) via batch keys query maps to avoid `N+1` database loops.
