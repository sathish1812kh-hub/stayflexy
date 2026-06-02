# Service Ownership Matrix — Stayflexi v2.0.0

> Last updated: 2026-05-18  
> Review cycle: Quarterly  
> On-call rotation managed in PagerDuty

---

## Overview

This document defines ownership, criticality, dependencies, and SLO targets for each of the 11 services in the Stayflexi platform. All escalations should follow the paths defined here.

---

## api-gateway

| Attribute | Value |
|-----------|-------|
| **Port** | 8080 |
| **Purpose** | Single ingress point for all external traffic; JWT authentication, rate limiting (100 req/min per IP), CORS enforcement, request routing to upstream services, correlation ID generation, metrics/tracing middleware |
| **Primary Owner Team** | Platform Engineering |
| **On-Call Rotation** | Platform SRE rotation (PagerDuty service: `stayflexi-gateway`) |
| **Criticality** | P0 — Gateway outage = complete platform outage |
| **Upstream Dependencies** | TLS certificate (cert-manager), Redis (rate limiting), Kubernetes ingress controller |
| **Downstream Services** | All 10 microservices; all external requests flow through gateway |
| **Key Files** | `infrastructure/gateway/src/app.ts`, `infrastructure/gateway/src/middleware/` |
| **Data Owned** | No persistent state; rate limit counters in Redis (`stayflexi:ratelimit:*`) |
| **SLO Targets** | Availability: 99.95%; p95 overhead latency (gateway only, excluding backend): < 10ms |
| **Escalation Path** | On-call engineer → Platform SRE Lead → VP Engineering |

---

## auth-service

| Attribute | Value |
|-----------|-------|
| **Port** | 3001 |
| **Purpose** | User registration, login, JWT issuance (access + refresh tokens), token refresh and revocation, session caching, brute force protection. Every request to the platform passes through auth validation at the gateway. |
| **Primary Owner Team** | Platform Engineering (Security sub-team) |
| **On-Call Rotation** | Platform SRE rotation (PagerDuty service: `stayflexi-auth`) |
| **Criticality** | P0 — Auth outage blocks all authenticated requests |
| **Upstream Dependencies** | PostgreSQL (user records, refresh tokens), Redis (session cache, brute force counters, token blacklist) |
| **Downstream Services** | Gateway (validates tokens); all services consume JWT claims |
| **Key Files** | `services/auth-service/src/application/services/TokenService.ts`, `services/auth-service/src/application/services/BruteForceProtector.ts` |
| **Data Owned** | Tables: `User`, `Role`, `Permission`, `RefreshToken`, `AuditLog`; Redis keys: `stayflexi:auth:session:*`, `stayflexi:auth:bf:*`, `stayflexi:auth:revoked:*` |
| **SLO Targets** | Availability: 99.9%; p95 login latency: < 200ms; p95 token refresh: < 100ms |
| **Escalation Path** | On-call engineer → Platform SRE Lead → Security Engineer → VP Engineering |

---

## organization-service

| Attribute | Value |
|-----------|-------|
| **Port** | 3002 |
| **Purpose** | Organization and hotel group management: create/manage organizations, membership roles (OWNER, ADMIN, MEMBER), subscription management. Provides the organizational context that all other services scope data to via `organizationId`. |
| **Primary Owner Team** | Core Platform Team |
| **On-Call Rotation** | Platform SRE rotation (PagerDuty service: `stayflexi-org`) |
| **Criticality** | P1 — Outage prevents new organizations and member management; existing operations using cached JWT claims unaffected short-term |
| **Upstream Dependencies** | PostgreSQL |
| **Downstream Services** | All services consume `organizationId` from JWT claims; no direct runtime dependency |
| **Key Files** | `services/organization-service/src/` |
| **Data Owned** | Tables: `Organization`, `OrganizationMember`, `Subscription` |
| **SLO Targets** | Availability: 99.5%; p95 latency: < 300ms |
| **Escalation Path** | On-call engineer → Core Platform Lead → VP Engineering |

---

## hotel-service

| Attribute | Value |
|-----------|-------|
| **Port** | 3003 |
| **Purpose** | Hotel, room type, and room CRUD management. Manages the physical inventory catalog: hotel properties, amenities, room types (king/queen/suite), room configurations, pricing baselines. Data is mostly read-heavy with infrequent writes. |
| **Primary Owner Team** | Core Platform Team |
| **On-Call Rotation** | Platform SRE rotation (PagerDuty service: `stayflexi-hotel`) |
| **Criticality** | P1 — Outage prevents new hotel setup; existing operations using cached room data continue short-term |
| **Upstream Dependencies** | PostgreSQL |
| **Downstream Services** | booking-service (room rates via `getRoomRates()` in `CreateBooking.ts`), inventory-service (room type catalog), ota-service (OTA mapping) |
| **Key Files** | `services/hotel-service/src/` |
| **Data Owned** | Tables: `Hotel`, `RoomType`, `Room`, `HotelAmenity`; Redis cache: `stayflexi:hotel:<hotelId>` (TTL 1h) |
| **SLO Targets** | Availability: 99.5%; p95 latency: < 100ms (cache hit); < 300ms (cache miss) |
| **Escalation Path** | On-call engineer → Core Platform Lead → VP Engineering |

---

## inventory-service

| Attribute | Value |
|-----------|-------|
| **Port** | 3004 |
| **Purpose** | Real-time room availability and inventory management. Tracks total/reserved/blocked inventory per room type per date. Handles inventory blocking for maintenance, OTA blocks, VIP holds. Provides availability query endpoint used by booking flow. |
| **Primary Owner Team** | Reservations Platform Team |
| **On-Call Rotation** | Platform SRE rotation (PagerDuty service: `stayflexi-inventory`) |
| **Criticality** | P0 — Outage blocks all booking creation (availability check required before booking) |
| **Upstream Dependencies** | PostgreSQL (inventory table), Redis (availability cache), Kafka (inventory.events consumer) |
| **Downstream Services** | booking-service (availability check, inventory reservation), ota-service (inventory sync), analytics-service (occupancy metrics) |
| **Key Files** | `services/inventory-service/src/routes/inventory.ts`, `services/inventory-service/src/` |
| **Data Owned** | Tables: `Inventory`, `InventoryBlock`; Kafka topics (producer): `inventory.events`; Redis keys: `stayflexi:inventory:avail:*` (TTL 60s) |
| **SLO Targets** | Availability: 99.9%; p95 availability read: < 50ms (cache hit), < 200ms (cache miss); inventory accuracy: zero overbooking events |
| **Escalation Path** | On-call engineer → Reservations Platform Lead → VP Engineering |

---

## booking-service

| Attribute | Value |
|-----------|-------|
| **Port** | 3005 |
| **Purpose** | Core booking lifecycle: create, retrieve, update, cancel, check-in, check-out. Uses Redis distributed locks (`stayflexi:lock:booking:room:*`) to prevent concurrent overbooking. Implements idempotency for all mutations. Orchestrates booking creation saga. |
| **Primary Owner Team** | Reservations Platform Team |
| **On-Call Rotation** | Platform SRE rotation; Reservations specialist on secondary (PagerDuty service: `stayflexi-booking`) |
| **Criticality** | P0 — Core revenue path; outage directly impacts hotel operations and guest experience |
| **Upstream Dependencies** | PostgreSQL (booking records), Redis (distributed locks, booking cache, idempotency), Kafka (events), inventory-service (availability), payment-service (async) |
| **Downstream Services** | payment-service (payment initiation triggers), notification-service (booking.created event consumer), analytics-service (booking events), workflow-service (automation triggers), ota-service (OTA reservation sync) |
| **Key Files** | `services/booking-service/src/application/use-cases/CreateBooking.ts`, `services/booking-service/src/infrastructure/locking/RedisDistributedLock.ts`, `services/booking-service/src/sagas/BookingCreationSaga.ts` |
| **Data Owned** | Tables: `Booking`, `BookingRoom`, `BookingGuest`; Kafka topics (producer): `booking.events`; Redis keys: `stayflexi:booking:cache:*` (TTL 5min), `stayflexi:lock:booking:room:*`, `stayflexi:idempotency:booking:*` (TTL 24h) |
| **SLO Targets** | Availability: 99.9%; p95 booking creation: < 500ms; p99 booking creation: < 1000ms; overbooking rate: 0 |
| **Escalation Path** | On-call engineer → Reservations Platform Lead → VP Engineering (immediate for overbooking events) |

---

## payment-service

| Attribute | Value |
|-----------|-------|
| **Port** | 3006 |
| **Purpose** | Payment processing, refund handling, invoice generation, ledger management, payment reconciliation. Integrates with external payment gateway. Implements idempotency to prevent double charges. Never stores raw card data (PCI compliance). |
| **Primary Owner Team** | Payments Team |
| **On-Call Rotation** | Platform SRE rotation; Payments specialist on secondary (PagerDuty service: `stayflexi-payment`) |
| **Criticality** | P0 — Outage blocks all payment collection; direct revenue impact |
| **Upstream Dependencies** | PostgreSQL (payment records, invoices, ledger), Redis (idempotency store), Kafka (payment.events), external payment gateway (Stripe/Razorpay/etc.) |
| **Downstream Services** | notification-service (payment.confirmed triggers receipt notifications), analytics-service (revenue metrics), workflow-service (automated payment rules) |
| **Key Files** | `services/payment-service/src/application/use-cases/InitiatePayment.ts`, `services/payment-service/src/application/use-cases/ConfirmPayment.ts`, `services/payment-service/src/infrastructure/idempotency/PaymentIdempotencyStore.ts`, `services/payment-service/src/reconciliation/ReconciliationService.ts` |
| **Data Owned** | Tables: `Payment`, `Refund`, `Invoice`, `LedgerEntry`; Kafka topics (producer): `payment.events`; Redis keys: `stayflexi:idempotency:payment:*` |
| **SLO Targets** | Availability: 99.9%; p95 payment initiation: < 500ms; p95 payment confirmation: < 2000ms; duplicate charge rate: 0% |
| **Escalation Path** | On-call engineer → Payments Lead → Finance (for reconciliation issues) → VP Engineering |

---

## ota-service

| Attribute | Value |
|-----------|-------|
| **Port** | 3007 |
| **Purpose** | OTA (Online Travel Agency) channel management: Booking.com, Airbnb, Expedia, Agoda, MakeMyTrip adapters. Manages sync jobs for inventory and rates, imports OTA reservations, runs reconciliation between OTA bookings and internal bookings. |
| **Primary Owner Team** | Distribution & Channels Team |
| **On-Call Rotation** | Platform SRE rotation (PagerDuty service: `stayflexi-ota`) |
| **Criticality** | P1 — Outage affects OTA channel parity; no immediate guest impact but revenue loss from channel distribution failure |
| **Upstream Dependencies** | PostgreSQL, Redis (sync locks: `stayflexi:ota:lock:*`, sync cache: `OtaSyncCache`), Kafka (booking.events consumer for OTA sync), external OTA APIs |
| **Downstream Services** | inventory-service (inventory sync), booking-service (OTA reservation import creates bookings) |
| **Key Files** | `services/ota-service/src/adapters/`, `services/ota-service/src/application/use-cases/SyncReservations.ts`, `services/ota-service/src/workers/RetryWorker.ts`, `services/ota-service/src/reconciliation/ReconciliationEngine.ts` |
| **Data Owned** | Tables: `OTAProvider`, `OTAMapping`, `SyncJob`, `SyncEvent`, `OTAReservation`; Kafka topics (consumer): `booking.events` |
| **SLO Targets** | Availability: 99.5%; OTA sync latency: < 5 minutes per sync cycle; reconciliation accuracy: 99.9% |
| **Escalation Path** | On-call engineer → Distribution & Channels Lead → VP Product |

---

## analytics-service

| Attribute | Value |
|-----------|-------|
| **Port** | 3008 |
| **Purpose** | Booking, payment, and operational analytics: revenue metrics, occupancy rates, KPI dashboards, forecasting, financial reports, OTA performance reports, data exports. Consumes events from booking, payment, and inventory topics. |
| **Primary Owner Team** | Data & Analytics Team |
| **On-Call Rotation** | Platform SRE rotation (PagerDuty service: `stayflexi-analytics`) |
| **Criticality** | P2 — Outage affects reporting only; no guest-facing or operational impact; cached data available |
| **Upstream Dependencies** | PostgreSQL (read replica preferred), Redis (analytics snapshot cache), Kafka (booking.events, payment.events, inventory.events consumers) |
| **Downstream Services** | None (read-only data service; no services depend on analytics) |
| **Key Files** | `services/analytics-service/src/aggregators/KpiCalculator.ts`, `services/analytics-service/src/workers/AggregationWorker.ts`, `services/analytics-service/src/exports/ExportGenerator.ts` |
| **Data Owned** | Tables: `RevenueMetric`, `AnalyticsSnapshot`; Redis keys: `stayflexi:analytics:snapshot:*` (TTL 5min) |
| **SLO Targets** | Availability: 99.0%; p95 dashboard query: < 2000ms; data freshness: < 5 minutes lag from events |
| **Escalation Path** | On-call engineer → Data & Analytics Lead → VP Product |

---

## notification-service

| Attribute | Value |
|-----------|-------|
| **Port** | 3009 |
| **Purpose** | Outbound notification dispatch across channels: email, SMS, WhatsApp, push notifications. Template rendering, notification deduplication (Redis), retry with exponential backoff (`NotificationRetryWorker`). Consumes booking and payment events from Kafka. |
| **Primary Owner Team** | Guest Experience Team |
| **On-Call Rotation** | Platform SRE rotation (PagerDuty service: `stayflexi-notification`) |
| **Criticality** | P1 — Outage means guests do not receive booking confirmations, check-in reminders, payment receipts |
| **Upstream Dependencies** | PostgreSQL (notification records, templates), Redis (dedup cache: `stayflexi:notif:dedup:*`, retry status), Kafka (booking.events, payment.events consumers), external providers (SendGrid, Twilio, FCM, APNs, WhatsApp Business API) |
| **Downstream Services** | None (leaf service; sends to external providers) |
| **Key Files** | `services/notification-service/src/providers/`, `services/notification-service/src/workers/NotificationRetryWorker.ts`, `services/notification-service/src/infrastructure/cache/NotificationCache.ts`, `services/notification-service/src/templates/TemplateRenderer.ts` |
| **Data Owned** | Tables: `Notification`, `NotificationTemplate`; Kafka topics (consumer): `notification.events`, `booking.events`, `payment.events`; Redis keys: `stayflexi:notif:*` |
| **SLO Targets** | Availability: 99.5%; p95 notification dispatch (to external provider): < 30s; delivery success rate: > 95% |
| **Escalation Path** | On-call engineer → Guest Experience Lead → VP Product (for widespread delivery failures) |

---

## workflow-service

| Attribute | Value |
|-----------|-------|
| **Port** | 3010 |
| **Purpose** | Automation rules engine, workflow execution, compliance management, disaster recovery coordination, AI-driven operational insights, anomaly detection, user session security management. Consumes events from all other services. |
| **Primary Owner Team** | Platform Engineering (Automation sub-team) |
| **On-Call Rotation** | Platform SRE rotation (PagerDuty service: `stayflexi-workflow`) |
| **Criticality** | P2 — Outage affects automation rules and compliance workflows; no direct guest or booking impact in short term |
| **Upstream Dependencies** | PostgreSQL, Kafka (all topics: consumer), Redis |
| **Downstream Services** | May trigger actions in notification-service (automated notifications), booking-service (automated status changes), payment-service (automated payment rules) via Kafka events |
| **Key Files** | `services/workflow-service/src/` |
| **Data Owned** | Tables: `AutomationRule`, `WorkflowExecution`, `ComplianceRequest`, `BackupSnapshot`, `RecoveryExecution`, `UserSession`, `SecurityEvent`, `Recommendation`, `OperationalInsight`, `AnomalyDetection`; Kafka topics (consumer): `booking.events`, `payment.events`, `inventory.events`, `notification.events` |
| **SLO Targets** | Availability: 99.0%; automation rule execution latency: < 5s from trigger event |
| **Escalation Path** | On-call engineer → Platform Engineering Lead → VP Engineering |

---

## Criticality Summary

| Criticality | Services | Impact of Outage |
|-------------|----------|-----------------|
| **P0** (Complete outage risk) | api-gateway, auth-service, booking-service, payment-service, inventory-service | Revenue-impacting; guest operations blocked |
| **P1** (Major degradation) | notification-service, ota-service, organization-service, hotel-service | Guest experience degraded; channel distribution affected |
| **P2** (Partial degradation) | analytics-service, workflow-service | Reporting and automation affected; core operations continue |

---

## Dependency Map

```
                    External Clients
                          │
                    api-gateway (P0)
                          │
                   auth-service (P0)  ← JWT validation on every request
                          │
         ┌────────────────┼────────────────────────┐
         │                │                        │
booking-service (P0) inventory-service (P0)   payment-service (P0)
         │                │                        │
         │         hotel-service (P1)              │
         │         org-service (P1)                │
         │                                         │
         └──────────────────────────────────────────┘
                          │ Kafka Events
         ┌────────────────┼──────────────────────┐
         │                │                      │
notification-svc (P1) analytics-svc (P2)  workflow-svc (P2)
                          │
                    ota-service (P1)
```

---

## On-Call Contacts and Escalation

| Role | Contact Method | Response SLA |
|------|---------------|-------------|
| Primary On-Call | PagerDuty rotation (see service-specific PagerDuty service) | P0: 5 min, P1: 15 min |
| Secondary On-Call | PagerDuty escalation policy | P0: 10 min (auto-escalate if primary no-ack) |
| Engineering Manager | PagerDuty + Slack DM | P0 > 15 min unresolved; all P0s for awareness |
| VP Engineering | Phone + Slack | P0 > 30 min unresolved; any data breach |
| Legal/DPO | Email | Data breach suspected (72-hour GDPR clock) |
| Payment Specialist | PagerDuty secondary for payment-service | Payment reconciliation discrepancies |
