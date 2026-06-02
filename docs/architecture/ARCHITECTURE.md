# Stayflexi v2.0.0 — Distributed Architecture

## Overview

Stayflexi v2.0.0 transitions from a Next.js monolith (`src/`) to a set of 10 focused
Express.js microservices, each owning a bounded domain. The monolith remains the canonical
source of truth for the Prisma schema; all services share a single PostgreSQL database
during the initial migration phase. Database-per-service is the long-term target, enabled
once the domain boundaries stabilise and data synchronisation patterns are validated.

The monolith (`src/`) is **not modified** — services are additive and independent.

---

## Service Catalog

| # | Service              | Port | Responsibility                                                        | Primary Models Owned                                          |
|---|----------------------|------|-----------------------------------------------------------------------|---------------------------------------------------------------|
| 1 | auth-service         | 3001 | Authentication, JWT issuance, token refresh/revocation                | User, Role, Permission, AuditLog                              |
| 2 | organization-service | 3002 | Organisation and hotel group management                               | Organization, OrganizationMember, Subscription                |
| 3 | hotel-service        | 3003 | Hotel, room type, room inventory CRUD                                 | Hotel, RoomType, Room, HotelAmenity                           |
| 4 | inventory-service    | 3004 | Real-time room availability and inventory management                  | RoomInventory, DynamicRate, PricingRule                       |
| 5 | booking-service      | 3005 | Booking lifecycle: create, check-in, check-out, cancellation          | Booking, BookingRoom, GuestProfile                            |
| 6 | payment-service      | 3006 | Payment processing, refunds, invoicing                                | Payment, Refund, Invoice                                      |
| 7 | ota-service          | 3007 | OTA channel management, sync jobs, reservation import                 | OTAProvider, OTAMapping, SyncJob, SyncEvent, OTAReservation   |
| 8 | analytics-service    | 3008 | Booking/payment analytics, revenue metrics, occupancy, forecasting    | RevenueMetric, AnalyticsSnapshot (read-only cross-domain)     |
| 9 | notification-service | 3009 | Outbound notifications (email/SMS/push), template management          | Notification, NotificationTemplate                            |
|10 | workflow-service     | 3010 | Automation rules, workflow executions, security, compliance, DR, AI   | AutomationRule, WorkflowExecution, ComplianceRequest, BackupSnapshot, RecoveryExecution, UserSession, SecurityEvent, Recommendation, OperationalInsight, AnomalyDetection |

---

## ASCII Architecture Diagram

```
                         ┌─────────────────────────────────┐
  Web / Mobile / OTA ───>│        API Gateway : 8080        │
                         │   (nginx / Kong / Express proxy) │
                         └───────────────┬─────────────────┘
                                         │  HTTP
          ┌──────────────────────────────┼────────────────────────────────────┐
          │                              │                                    │
          ▼                              ▼                                    ▼
  ┌───────────────┐             ┌───────────────┐                  ┌──────────────────┐
  │ auth-service  │             │hotel-service  │                  │ ota-service      │
  │    : 3001     │             │    : 3003     │                  │    : 3007        │
  └───────────────┘             └───────────────┘                  └──────────────────┘
  ┌───────────────┐             ┌───────────────┐                  ┌──────────────────┐
  │ org-service   │             │inventory-svc  │                  │analytics-service │
  │    : 3002     │             │    : 3004     │                  │    : 3008        │
  └───────────────┘             └───────────────┘                  └──────────────────┘
  ┌───────────────┐             ┌───────────────┐                  ┌──────────────────┐
  │booking-service│             │payment-service│                  │notification-svc  │
  │    : 3005     │             │    : 3006     │                  │    : 3009        │
  └───────────────┘             └───────────────┘                  └──────────────────┘
                                                                   ┌──────────────────┐
                                                                   │workflow-service  │
                                                                   │    : 3010        │
                                                                   └──────────────────┘
          │                              │                                    │
          └──────────────────────────────┼────────────────────────────────────┘
                                         │
                           ┌─────────────┴──────────────┐
                           │                            │
                    ┌──────────────┐            ┌──────────────┐
                    │  PostgreSQL  │            │    Redis     │
                    │  (shared DB) │            │  (cache +    │
                    │             │            │  event bus)  │
                    └──────────────┘            └──────────────┘

Event Bus (Redis Streams):
  Services ──xadd──> stayflexi:events:{type} ──xreadgroup──> Consumer Services
```

---

## Bounded Contexts

Each service maps to a DDD bounded context with its own ubiquitous language:

| Context              | Service(s)                   | Core Concept                                        |
|----------------------|------------------------------|-----------------------------------------------------|
| Identity & Access    | auth-service                 | User, Session, Token, Permission                    |
| Organisation         | organization-service         | Organisation, Member, Subscription, Plan            |
| Property Management  | hotel-service                | Hotel, Property, Room, RoomType, Amenity            |
| Inventory            | inventory-service            | Availability, Allocation, PricingRule, DynamicRate  |
| Reservations         | booking-service              | Booking, GuestProfile, CheckIn, CheckOut            |
| Payments             | payment-service              | Payment, Refund, Invoice, Settlement                |
| Distribution         | ota-service                  | OTAProvider, Mapping, SyncJob, ExternalReservation  |
| Intelligence         | analytics-service            | Metric, Snapshot, Forecast, Occupancy               |
| Communications       | notification-service         | Notification, Template, DeliveryChannel             |
| Automation & Safety  | workflow-service             | Rule, Execution, Alert, Compliance, Backup, DR      |

---

## Data Ownership

During Phase 1 (shared database), each service "owns" its tables at the application layer:

| Tables                                                    | Owning Service       | Others May Read |
|-----------------------------------------------------------|----------------------|-----------------|
| users, roles, permissions, audit_logs                     | auth-service         | all             |
| organizations, organization_members, subscriptions        | org-service          | all             |
| hotels, room_types, rooms, hotel_amenities                | hotel-service        | all             |
| room_inventory, pricing_rules, dynamic_rates              | inventory-service    | booking, ota    |
| bookings, booking_rooms, guest_profiles                   | booking-service      | analytics, ota  |
| payments, refunds, invoices                               | payment-service      | analytics       |
| ota_providers, ota_mappings, sync_jobs, sync_events, ota_reservations | ota-service | analytics |
| revenue_metrics, analytics_snapshots                      | analytics-service    | —               |
| notifications, notification_templates                     | notification-service | —               |
| automation_rules, workflow_executions                     | workflow-service     | —               |
| user_sessions, security_events, compliance_requests       | workflow-service     | auth            |
| backup_snapshots, recovery_executions                     | workflow-service     | —               |
| recommendations, operational_insights, anomaly_detections | workflow-service     | analytics       |

---

## Communication Patterns

### Synchronous — HTTP REST via API Gateway

All external requests enter through the API Gateway on port 8080. The gateway routes by
path prefix to the appropriate upstream service using ClusterIP addresses inside Kubernetes.

Propagated headers on every request:
- `x-correlation-id` — generated by the gateway if absent; passed through intact
- `x-organization-id` — injected after JWT verification
- `x-user-id` — injected after JWT verification
- `x-user-role` — injected after JWT verification
- `x-service-key` — set by the gateway for service-to-service trust

### Asynchronous — Redis Streams (Event Bus)

Services publish domain events using `XADD` to `stayflexi:events:{eventType}`.
Consumers use `XREADGROUP` with named consumer groups for at-least-once delivery.

Stream naming: `stayflexi:events:<eventType>` e.g.:
- `stayflexi:events:booking.created`
- `stayflexi:events:payment.completed`
- `stayflexi:events:ota.sync.completed`
- `stayflexi:events:notification.sent`

### Service-to-Service Authentication

Direct service calls (bypassing the gateway) use the `x-service-key` header, which must
match the `SERVICE_KEY` environment variable configured per service. This prevents external
callers from spoofing internal service calls.

## GraphQL Federation

On 2026-05-21, the decision was made to adopt Apollo Federation as the primary API aggregation layer. The pi-gateway will act as the Supergraph router, and individual microservices (starting with hotel-service) will implement Subgraphs using a Code-First TypeScript approach (e.g., Pothos/TypeGraphQL) to guarantee end-to-end type safety with Prisma. Existing REST endpoints will be maintained for external integrations (like OTA webhooks) and legacy support. All GraphQL resolvers must implement DataLoader to prevent N+1 database queries.
