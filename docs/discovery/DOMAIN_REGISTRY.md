# Domain Registry — Stayflexi Platform

This registry maps the business domains of the Stayflexi platform to their core responsibilities, features, services, database tables, and API schemas.

---

## 1. Identity & Access Management (IAM)

- **Description**: Gathers all authentication gateways, role credentials, refresh token rotation pools, and brute force blockers.
- **Features**: User registration, login sessions, token rotation, session revocation, brute force locking, and platform RBAC control.
- **Related Services**: `auth-service`, `shared-auth`.
- **Related Tables**: `User`, `RefreshToken`, `PasswordResetToken`, `Role`, `Permission`, `UserRole`, `RolePermission`.
- **Related APIs**: `/api/v1/auth/*` routes (login, register, logout, refresh, me).

---

## 2. Property & Room Management (PMS Core)

- **Description**: Defines hotel properties, physical room assets, room category classes, and layout rules.
- **Features**: Property CRUD, room configuration uploads, room type base rate setup, and housekeeping status updates (Clean, Dirty, Inspected).
- **Related Services**: `hotel-service`.
- **Related Tables**: `Hotel`, `RoomType`, `Room`, `HotelAmenity`.
- **Related APIs**: `/api/v1/hotels/*`, `/api/v1/room-types/*`, `/api/v1/rooms/*`.

---

## 3. Inventory & Availability Management

- **Description**: Coordinates room allocations, reservations holdings, calendar locks, and maintenance blockages.
- **Features**: Real-time room availability calculation, holding allocations during saga booking steps, calendar blockages, and concurrency lock checks.
- **Related Services**: `inventory-service`.
- **Related Tables**: `Inventory`, `InventoryBlock`.
- **Related APIs**: `/api/v1/inventory/reserve`, `/api/v1/inventory/release`, `/api/v1/inventory/block`, `/api/v1/inventory/availability`, `/api/v1/inventory/calendar`.

---

## 4. Reservation & Booking Lifecycle

- **Description**: Orchestrates the guest reservation flow, check-in arrivals, check-out departures, and cancellation events.
- **Features**: Booking transaction saga (7 steps with automatic rolling rollback compensation), guest profiling, arrival checking, and checkout reconciliations.
- **Related Services**: `booking-service`.
- **Related Tables**: `Booking`, `BookingRoom`, `BookingGuest`, `BookingAudit`.
- **Related APIs**: `/api/v1/bookings/*` (create, search, list, check-in, check-out, cancel).

---

## 5. Payments & Financial Ledger

- **Description**: Directs billing transactions, Stripe gateway communication, refunds, and double-entry ledger bookkeeping.
- **Features**: Transaction token generation, refund checks, billing webhook HMAC parsing, and append-only ledger audit balancing.
- **Related Services**: `payment-service`.
- **Related Tables**: `Payment`, `Refund`, `Invoice`, `InvoiceItem`, `LedgerEntry`, `PaymentAudit`, `PaymentIdempotencyKey`.
- **Related APIs**: `/api/v1/payments/*` (initiate, confirm, refund, webhooks), `/api/v1/invoices/*`, `/api/v1/reconciliation`.

---

## 6. Distribution & OTA Management

- **Description**: Syncs pricing rates and rooms availability metadata to external distribution channels.
- **Features**: Channel binding mappings, inventory sync jobs, pricing sync tasks, and reservation downloads from OTAs (Booking.com, Expedia).
- **Related Services**: `ota-service`.
- **Related Tables**: `OTAProvider`, `OTAMapping`, `SyncJob`, `SyncEvent`, `OTAReservation`.
- **Related APIs**: `/api/v1/ota/*` (providers, connections, sync, reservations, reconciliation).

---

## 7. Revenue Intelligence & Dynamic Pricing

- **Description**: Computes price recommendations based on market rates, competitor price uploads, occupancy indexes, and seasonal rules.
- **Features**: Competitor hotel master set, competitor prices scraper upload, yield optimization recommendations, and manual/auto price overrides.
- **Related Services**: `revenue-management-service`, `pricing-engine-service`.
- **Related Tables**: `CompetitorHotel`, `CompetitorScrapedPrice`, `PricingRule`, `DynamicRate`, `RevenueMetric`, `RateRecommendation`, `PricingAuditLog`.
- **Related APIs**: `/api/v1/revenue/competitors/*`, `/api/v1/revenue/comparison`, `/api/v1/revenue/recommendations/*`, `/api/v1/pricing/*`.

---

## 8. Automation & Compliance Workflows

- **Description**: Coordinates administrative automations, database cron snapshots, disaster recovery logs, and security checks.
- **Features**: Backup snapshot rules, recovery run execution logs, user session audits, and compliance requests tracking.
- **Related Services**: `workflow-service`.
- **Related Tables**: `AutomationRule`, `WorkflowExecution`, `WorkflowStep`, `WorkflowExecutionLog`, `UserSession`, `SecurityEvent`, `ComplianceRequest`, `BackupSnapshot`, `RecoveryExecution`.
- **Related APIs**: `/api/v1/workflows/*` (create, list, execute, rules, retry).

---

## 9. Notifications & Communications

- **Description**: Handles transactional messaging via SMS and Email channels based on system lifecycle events.
- **Features**: Email/SMS generation, template variable rendering, and message status audit logs.
- **Related Services**: `notification-service`.
- **Related Tables**: `Notification`, `NotificationTemplate`, `NotificationDelivery`, `NotificationRetryLog`.
- **Related APIs**: `/api/v1/notifications/*` (send, templates, status).

---

## 10. Reporting & Performance Analytics

- **Description**: Aggregates booking events and revenue parameters to build performance indices.
- **Features**: Yield analytics snapshots, forecasting, and CSV report export.
- **Related Services**: `analytics-service`.
- **Related Tables**: `RevenueMetric`, `AnalyticsSnapshot` (read-only views).
- **Related APIs**: `/api/v1/analytics/*`, `/api/v1/reports/*`.
