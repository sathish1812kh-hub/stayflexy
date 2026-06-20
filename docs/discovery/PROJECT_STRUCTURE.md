# Project Structure — Stayflexi Monorepo

This document details the file and folder layout of the Stayflexi monorepo codebase, organizing elements by microservices, shared packages, Next.js frontend pages, and core infrastructure folders.

---

## 1. Top-Level Folder Layout

```
Stayflexi/
├── apps/               — Future Next.js app migration target
├── docs/               — System documentation, architecture guides, and runbooks
├── infrastructure/     — Shared Kubernetes manifests, gateway configs, and setups
├── packages/           — Internal shared npm packages (npm workspaces)
├── platform-validation/— Integration, chaos, and performance tests
├── scripts/            — Build, environment initialization, and maintenance scripts
├── services/           — Express.js backend domain microservices
└── src/                — Next.js frontend app and legacy modular core
    ├── app/            — Next.js App Router (pages, layouts, globals.css)
    ├── common/         — Shared UI utilities, HTTP clients, and assets
    ├── database/       — Prisma models, schemas, seeders, and migrations
    ├── infrastructure/ — Shared validation, logging, and security utilities
    ├── modules/        — Feature-specific backend logic (domain, endpoints, repos)
    └── tests/          — Frontend-related unit and integration tests
```

---

## 2. Microservices Directory (`services/`)

The backend is composed of 12 distinct Node.js Express services, each representing a bounded context:

| Directory                    | Service Name                      | Responsibility                                                                |
| :--------------------------- | :-------------------------------- | :---------------------------------------------------------------------------- |
| `analytics-service`          | `@stayflexi/analytics-service`    | Aggregates booking/revenue metrics, snapshots, and forecasts.                 |
| `auth-service`               | `@stayflexi/auth-service`         | Handles JWT credentials, authentication, sessions, and brute-force blockages. |
| `booking-service`            | `@stayflexi/booking-service`      | Manages reservation flows, guest profiles, check-in, and check-out.           |
| `hotel-service`              | `@stayflexi/hotel-service`        | Manages hotels, categories, amenities, and room inventories.                  |
| `inventory-service`          | `@stayflexi/inventory-service`    | Manages active room allocations, calendar blocks, and availability holds.     |
| `notification-service`       | `@stayflexi/notification-service` | Multi-channel delivery engine (email, SMS, templates).                        |
| `organization-service`       | `@stayflexi/organization-service` | Organization settings, memberships, plans, and subscriptions.                 |
| `ota-service`                | `@stayflexi/ota-service`          | Coordinates OTA connections, mappings, price syncs, and imports.              |
| `payment-service`            | `@stayflexi/payment-service`      | Integrates payment gateways, processing refunds, ledger audits.               |
| `pricing-engine-service`     | `@stayflexi/pricing-engine-svc`   | Computes dynamic multipliers, weekend premiums, and base rates.               |
| `revenue-management-service` | `@stayflexi/revenue-mgmt-svc`     | Integrates competitor price feeds and updates dynamic pricing rules.          |
| `workflow-service`           | `@stayflexi/workflow-service`     | Coordinates automation rules, system recovery plans, and audits.              |

---

## 3. Internal Shared Packages (`packages/`)

Internal workspace dependencies used to enforce uniformity and reuse logic:

- **`shared-auth`**: JWT signing/verification middlewares, service-to-service validation headers.
- **`shared-config`**: Shared configurations (tsconfig profiles, lint configurations, prettier).
- **`shared-database`**: Standard Prisma client factory singleton, BaseRepository helper.
- **`shared-errors`**: Centralized custom error classes (Unauthorized, NotFound, ValidationError) and middleware.
- **`shared-events`**: Event publishers/subscribers for Redis/Kafka messaging.
- **`shared-logger`**: Custom Pino logger wrappers for structured JSON logging.
- **`shared-observability`**: OpenTelemetry trace instrumentation and Prometheus metrics exporter setup.
- **`shared-types`**: Domain-wide TypeScript type declarations and interface signatures.
- **`shared-validation`**: Reusable Zod schemas for sanitizing API payload inputs.

---

## 4. Frontend Structure (`src/app/`)

Stayflexi utilizes Next.js App Router for frontend layout and page views.

### Reusable Components (`src/app/components/`)

- `DashboardShell.tsx`: The primary admin shell, sidebar navigation, top bar controls, and alert banners.
- `FlexiAIChatWidget.tsx`: The conversational AI co-pilot panel available in the lower corner of the dashboard.

### Core Dashboard Views

- `billing/`: Billing summaries, invoicing lists, and payment gateways status.
- `bookings/`: Reservation grid timeline, guest profiles, check-in checkout controls.
- `console/`: GraphQL supergraph schema playground and server stats.
- `guest/`: Guest cards, history indexes, and CRM profiles.
- `hotels/`: Hotel properties catalog, location profiles, amenities config.
- `housekeeping/`: Housekeeper assignments, task status checkers (Clean, Dirty).
- `inventory/`: Room inventory grid, calendar updates, and booking-window blockages.
- `login/`: Authentication gateway portal interface.
- `monitoring/`: OpenTelemetry metrics dashboard, request error trackers, and trace triggers.
- `revenue/`: Competitor price grids, recommendation approvals, yield optimization.
- `rooms/`: Individual room master list and physical status.
- `workflows/`: Automated compliance rules, retry logs, backup triggers.

---

## 5. Infrastructure & Verification Scripts

- `infrastructure/kubernetes/`: Orchestration manifests (deployments, hpas, network policies, secrets).
- `infrastructure/gateway/`: Express reverse proxy routes and rate-limiting scripts.
- `platform-validation/src/`: Heavyweight suites testing:
  - `chaos/`: System resilience against outages (Redis, Kafka, DB latency).
  - `concurrency/`: Overbooking prevention and lock race testing.
  - `contracts/`: Schema type compatibility checks.
  - `observability/`: OTEL tracing context propagation confirmation.
  - `security/`: RBAC restrictions and penetration tests.
