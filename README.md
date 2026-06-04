<p align="center">
  <img src="https://img.shields.io/badge/🏨_Stayflexi-Hospitality_Platform-0A0A23?style=for-the-badge&labelColor=0A0A23&color=5865F2" alt="Stayflexi" />
</p>

<h1 align="center">Stayflexi</h1>

<p align="center">
  <strong>Enterprise-Grade Cloud-Native Hospitality Management Platform</strong>
</p>

<p align="center">
  An event-driven microservices architecture for modern hotel operations — built with TypeScript, Kafka, PostgreSQL, and Next.js.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Apache_Kafka-7.5-231F20?style=flat-square&logo=apachekafka&logoColor=white" />
  <img src="https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-6.8-2D3748?style=flat-square&logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/Kubernetes-Helm-326CE5?style=flat-square&logo=kubernetes&logoColor=white" />
  <img src="https://img.shields.io/badge/Microservices-12-FF6B6B?style=flat-square" />
  <img src="https://img.shields.io/badge/Domain_Modules-33-06D6A0?style=flat-square" />
  <img src="https://img.shields.io/badge/Containers-21-FFC43D?style=flat-square" />
</p>

---

## 📋 Table of Contents

- [🏨 Project Overview](#-project-overview)
- [🏗️ Architecture](#️-architecture)
- [🔧 Microservices](#-microservices)
- [🛠️ Tech Stack](#️-tech-stack)
- [📁 Project Structure](#-project-structure)
- [🚀 Getting Started](#-getting-started)
- [🔐 Environment Variables](#-environment-variables)
- [🐳 Deployment](#-deployment)
- [🧪 Testing](#-testing)
- [📊 Monitoring & Observability](#-monitoring--observability)
- [📄 License](#-license)

---

## 🏨 Project Overview

**Stayflexi** is a comprehensive, production-ready hospitality management platform designed for hotels, resorts, serviced apartments, and property chains of any size. The platform digitizes and automates every aspect of hotel operations — from guest bookings and room management to revenue optimization and OTA distribution.

### Platform at a Glance

| Metric | Value |
|--------|-------|
| **Microservices** | 12 domain services |
| **Frontend Modules** | 33 UI modules |
| **Database Models** | 16 Prisma schema files |
| **Shared Packages** | 9 reusable libraries |
| **API Routes** | 22 route prefixes |
| **Containers** | 21 (15 custom builds + 6 infrastructure) |
| **OTA Integrations** | 5 channel adapters |
| **RBAC Roles** | 6 built-in roles |
| **Notification Channels** | 4 (Email, SMS, Push, WhatsApp) |

---

### 🌟 Core Feature Highlights

<table>
<tr>
<td width="50%">

#### 🔐 Authentication & RBAC

**6 Built-in Roles:**
- `SUPER_ADMIN` — Platform-level superuser
- `ORG_ADMIN` — Organization administrator
- `HOTEL_MANAGER` — Hotel-level management
- `FRONT_DESK` — Front desk operations
- `HOUSEKEEPING` — Housekeeping staff
- `ACCOUNTANT` — Financial operations

**Security Features:**
- JWT access tokens (**15-min expiry**) + opaque refresh tokens (**7-day expiry**)
- Token claims: `sub`, `organizationId`, `primaryRole`
- **Brute force protection** — 5 attempts / 900s window per IP+email (Redis-backed)
- JTI-based **token blacklisting** via Redis `setex`
- Password reset tokens with one-time use (`usedAt` consumption tracking)
- Email verification, IP address & user-agent tracking
- Granular permissions: `resource × action` (create, read, update, delete, export, approve, cancel)
- Hotel-level role scoping with optional expiration (`expiresAt`)
- System roles (seeded, immutable) + custom org-scoped roles

</td>
<td width="50%">

#### 📅 Booking & Reservations

**Booking Lifecycle:**
`PENDING → CONFIRMED → CHECKED_IN → CHECKED_OUT`
`PENDING → CANCELLED` | `CONFIRMED → NO_SHOW`

**7 Booking Sources:**
`DIRECT` · `OTA` · `WALK_IN` · `PHONE` · `EMAIL` · `AGENT` · `ONLINE`

**Key Features:**
- **Saga Pattern** (`BookingCreationSaga`) with compensating transactions:
  - Step 1: Reserve inventory → (compensate: release + cancel)
  - Step 2: Publish event → (compensate: no-op)
- **Distributed locking** — per-room Redis locks with sorted acquisition (deadlock prevention)
- Multi-room bookings (up to **10 rooms**, duplicate detection)
- Multi-guest support with nationality, government ID, DOB
- Financial calculation: base amount + 10% tax − discount = final amount
- **Idempotent operations** with 24-hour TTL deduplication
- Advance booking up to **365 days**
- State machine: `canBeCancelled()`, `canCheckIn()`, `canCheckOut()`, `canBeModified()`
- Event-driven: publishes `booking.created` with full context

</td>
</tr>
<tr>
<td width="50%">

#### 🏠 Hotel & Room Management

**Hotel Statuses:** `ACTIVE` · `INACTIVE` · `UNDER_RENOVATION`

**6 Room Statuses with State Machine:**
- `AVAILABLE` → OCCUPIED / HOUSEKEEPING / MAINTENANCE / OUT_OF_ORDER / BLOCKED
- `OCCUPIED` → AVAILABLE / HOUSEKEEPING
- `HOUSEKEEPING` → AVAILABLE
- `MAINTENANCE` → AVAILABLE
- `OUT_OF_ORDER` → AVAILABLE / MAINTENANCE

**Room Features:**
- Physical attributes: floor, wing, zone
- **Smart lock integration**: vendor, deviceId, secret
- WiFi credentials per room (SSID + password)
- Connecting rooms & parent room hierarchy
- Arrival notes for guest pre-check-in

**Room Type Features:**
- Occupancy: max adults, children, infants, extra beds
- Age restrictions: min/max child age, infant age
- Pricing: base, hourly, extra bed, extra guest rates
- Amenities array & active/inactive toggle

</td>
<td width="50%">

#### 📦 Inventory Management

**Real-Time Availability Engine:**
```
availableCount = totalRooms − reservedCount − blockedCount
```

- **Date-level granularity** — per room type, per date tracking
- **Distributed locking** (`LOCK_TTL_MS=30000`, 3 retry attempts)
- Business rule validation: `canReserve(qty)`, `canBlock(qty)`
- **60-second cache TTL** for hot inventory queries
- Calendar view: date-by-date breakdown (total, reserved, blocked, available)
- Multi-night availability: checks minimum across all requested nights
- Hotel-wide AND room-type-specific queries

**Use Cases:**
CheckAvailability · ReserveInventory · ReleaseInventory · BlockInventory · UnblockInventory · GetAvailabilityCalendar

</td>
</tr>
<tr>
<td width="50%">

#### 💰 Dynamic Pricing Engine

**5-Step Pricing Algorithm:**

1. **Rule Selection** — Find highest-priority active rule (filtered by date, day-of-week)
2. **Rule Adjustment** — Apply flat or percentage increase/decrease/fixed
3. **Occupancy Multiplier** — 5-tier system:
   - ≥95% occupancy → **1.6×**
   - ≥85% occupancy → **1.4×**
   - ≥70% occupancy → **1.25×**
   - ≥40% occupancy → **1.1×**
   - <40% occupancy → **1.0×**
4. **Demand Factor** — From revenue forecast data
5. **Surge Cap** — Max `3.0×` base rate (`MAX_SURGE_MULTIPLIER`)
6. **Floor/Ceiling** — Rule-level min/max price enforcement

**Additional:**
- Redis-based **surge pricing** with TTL expiration
- Room-type or hotel-wide surge (hierarchical lookup)
- Day-of-week filtering (MON–SUN)
- Seasonal rules (PEAK, DEC, SUMMER)
- Priority-based rule resolution

</td>
<td width="50%">

#### 📊 Revenue Management

**Revenue Optimizer Formula:**
```
price = basePrice × occupancyFactor × demandFactor 
        × targetPressure × seasonalFactor
```

**Occupancy Factors:**
- ≥95% → **1.50×** | ≥85% → **1.35×** | ≥70% → **1.20×**
- ≥50% → **1.05×** | ≤30% → **0.92×**

**Forecast Engine:**
- **Weighted moving average** with recency bias
- Day-of-week seasonal analysis
- Weekend factor: **1.15×** for Sat/Sun
- 7-day rolling booking velocity
- Confidence: HIGH (≥60d data) · MEDIUM (≥30d) · LOW (<30d)
- **90-day forecast horizon**

**Target Tracking:**
- Behind target (<80%) → **1.08×** pressure
- Ahead of target (>110%) → **0.97×** relief
- 12-month Northern hemisphere seasonal curve
- Floor: 70% of base | Ceiling: 300% of base
- **24-hour recommendation TTL**
- Human-readable rationale generation

</td>
</tr>
<tr>
<td width="50%">

#### 🌐 OTA Channel Management

**5 Integrated OTAs:**

| OTA | Adapter | Protocol |
|-----|---------|----------|
| **Booking.com** | `BookingComAdapter` | OTA XML (ARI push), JSON API (reservation pull) |
| **Expedia** | `ExpediaAdapter` | API integration |
| **Agoda** | `AgodaAdapter` | API integration |
| **Airbnb** | `AirbnbAdapter` | API integration |
| **MakeMyTrip** | `MakeMyTripAdapter` | API integration |

**5 Capabilities Per OTA:**
- `pushInventory()` — Room availability distribution
- `pushRates()` — Rate plan synchronization
- `pullReservations()` — Incoming booking import
- `validateCredentials()` — Connection health check
- `normalizeWebhookPayload()` — Webhook standardization

**Sync Engine:**
- Auto-sync every **5 minutes** (`OTA_SYNC_INTERVAL_MS=300000`)
- Retry with exponential backoff
- **Reconciliation engine** with discrepancy reports:
  - `RESERVATION_IMPORT_FAILURE` · `SYNC_JOB_FAILURE` · `MAPPING_INACTIVE`
  - Severity levels: LOW / MEDIUM / HIGH
  - Stale pending reservation detection (1-hour threshold)
  - Duplicate detection

</td>
<td width="50%">

#### 💳 Payment Processing

**9 Payment Statuses:**
`PENDING → PROCESSING → AUTHORIZED → CAPTURED → SUCCESS`
`→ REFUNDED / PARTIALLY_REFUNDED / CANCELLED / FAILED`

**8 Payment Methods:**
`CASH` · `CREDIT_CARD` · `DEBIT_CARD` · `BANK_TRANSFER` · `UPI` · `WALLET` · `OTA_COLLECT` · `OTHER`

**Key Features:**
- **Immutable financial ledger** — append-only with CREDIT/DEBIT entries
- Ledger balance: totalDebits, totalCredits, netBalance per hotel per currency
- **Reconciliation service** for financial accuracy
- Refund window up to **30 days** (`MAX_REFUND_DAYS=30`)
- **Idempotent** payments with 24-hour deduplication
- Multi-currency support
- Provider-agnostic gateway integration
- Webhook secret verification (`WEBHOOK_SECRET`)
- Transaction tracking: paymentReference, transactionId
- State machine: `canBeRefunded()` (SUCCESS/PARTIALLY_REFUNDED/CAPTURED), `canBeCancelled()` (PENDING/AUTHORIZED)

</td>
</tr>
<tr>
<td width="50%">

#### 🔔 Notifications

**4 Delivery Channels:**

| Channel | Provider | Details |
|---------|----------|---------|
| **Email** | `EmailProvider` | SMTP integration, template rendering |
| **SMS** | `SmsProvider` | SMS gateway integration |
| **Push** | `PushProvider` | Mobile push notifications |
| **WhatsApp** | `WhatsAppProvider` | Twilio Business API, E.164 validation |

**Features:**
- **Template engine** (`TemplateRenderer`) with dynamic variable injection
- **Retry mechanism** — configurable maxRetries per notification
- Delivery statuses: `PENDING → SENT → DELIVERED / FAILED`
- Scheduled notifications (`scheduledAt`)
- Event-driven triggers from other services via Kafka
- Background workers for async delivery
- Booking confirmations, check-in reminders, payment receipts

</td>
<td width="50%">

#### 🔄 Workflow Automation

**Engine Components:**
- **WorkflowEngine** — trigger by name or by event
- **ConditionEvaluator** — rule conditions against event context
- **WorkflowStepExecutor** — typed action parameters

**Features:**
- **Event-driven automation** — `triggerByEvent()` matches active rules by trigger source
- **Idempotent execution** — key-based deduplication (Redis + DB fallback)
- **Distributed execution locks** with acquire/release
- Async execution — returns executionId immediately
- Status tracking: `PENDING → RUNNING → COMPLETED / FAILED`
- Workflow events: `workflow.started`, `workflow.completed`, `workflow.failed`
- Periodic scheduling via cron-based schedulers
- Automation rules with condition evaluation

</td>
</tr>
</table>

### 👥 Multi-Tenant Organization Management

| Feature | Details |
|---------|---------|
| **4 Plans** | `FREE` · `STARTER` · `PROFESSIONAL` · `ENTERPRISE` |
| **4 Statuses** | `ACTIVE` · `PENDING_SETUP` · `SUSPENDED` · `CANCELLED` |
| **Data Isolation** | Every entity scoped by `organizationId` |
| **Hotel Limits** | `maxHotels` per plan with enforcement |
| **Membership** | Explicit `OrganizationMember` records |
| **Ownership** | Single owner with transfer capability |
| **Branding** | Custom logo, website, legal entity details |
| **Slugs** | Unique slug-based identification |

### 🧠 Advanced Platform Capabilities

| Capability | Module | Description |
|------------|--------|-------------|
| 🤖 **AI Intelligence** | `src/modules/ai/` | Gemini AI for review scoring, staffing recommendations, chatbot |
| 🏠 **Housekeeping** | `src/modules/housekeeping/` | Cleaning schedules, staff assignment, status tracking |
| 🧾 **Invoicing** | `src/modules/invoice/` | Auto-generation, tax calculation, multi-currency |
| 🔄 **Disaster Recovery** | `src/modules/disaster-recovery/` | Failover validation, RTO/RPO testing |
| 🛡️ **Security Hardening** | `src/modules/hardening/` | Audit logging, compliance checks |
| 📈 **Business Intelligence** | `src/modules/intelligence/` | Trend analysis, predictive analytics |
| 🔧 **Maintenance** | `src/modules/maintenance/` | Equipment lifecycle, preventive scheduling |
| ⚡ **Circuit Breakers** | `src/modules/resilience/` | Health monitoring, failover orchestration |
| 🔍 **Audit Trail** | `src/modules/audit/` | Complete audit logging with user tracking |
| 📋 **Compliance** | `src/modules/compliance/` | Regulatory compliance management |
| 💾 **Backup** | `src/modules/backup/` | Automated data backup & restore |
| 🔄 **Data Sync** | `src/modules/synchronization/` | Dead letter queues, retry queues, sync strategies |

---

## 🏗️ Architecture

### High-Level System Design

```
                              ┌──────────────────────────┐
                              │      Web Application      │
                              │    (Next.js 16 + React)    │
                              │       Port: 3000          │
                              │    33 UI Domain Modules    │
                              └────────────┬─────────────┘
                                           │
                              ┌────────────▼─────────────┐
                              │       API Gateway         │
                              │  22 Route Prefixes        │
                              │  Rate Limiting · JWT Auth  │
                              │  CORS · Request Routing    │
                              │       Port: 8080          │
                              └────────────┬─────────────┘
                                           │
            ┌──────────┬───────────┬───────┼───────┬──────────┬──────────┐
            │          │           │       │       │          │          │
            ▼          ▼           ▼       ▼       ▼          ▼          ▼
       ┌────────┐ ┌────────┐ ┌────────┐ ┌─────┐ ┌─────┐ ┌────────┐ ┌──────┐
       │  Auth  │ │  Org   │ │ Hotel  │ │ Inv │ │Book │ │Payment │ │ OTA  │
       │ :3001  │ │ :3002  │ │ :3003  │ │:3004│ │:3005│ │ :3006  │ │:3007 │
       │ 6 RBAC │ │ 4 Plan │ │ Smart  │ │Dist.│ │Saga │ │Ledger  │ │5 OTA │
       │ Roles  │ │ Tiers  │ │ Locks  │ │Lock │ │Patt.│ │System  │ │Adapt.│
       └───┬────┘ └───┬────┘ └───┬────┘ └──┬──┘ └──┬──┘ └───┬────┘ └──┬───┘
           │          │          │         │       │        │         │
           └──────────┴──────────┴─────────┼───────┴────────┴─────────┘
                                           │
                              ┌────────────▼─────────────┐
                              │     Apache Kafka          │
                              │     Event Mesh            │
                              │  3 Partitions · 7d Retain │
                              │     Port: 29092           │
                              └────────────┬─────────────┘
                                           │
            ┌──────────────┬───────────────┼───────────────┬──────────────┐
            │              │               │               │              │
            ▼              ▼               ▼               ▼              ▼
       ┌─────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌─────────┐
       │Analytics│   │Notif.    │   │Workflow  │   │Pricing   │   │Revenue  │
       │ :3008   │   │ :3009    │   │ :3010    │   │ :3011    │   │ :3012   │
       │3 Report │   │4 Channel │   │Condition │   │5-Step    │   │Forecast │
       │  Types  │   │Email/SMS │   │Evaluator │   │Algorithm │   │Engine   │
       │(replica)│   │Push/WApp │   │          │   │          │   │         │
       └────┬────┘   └──────────┘   └──────────┘   └──────────┘   └─────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                        Data Layer                                        │
│                                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ PostgreSQL   │  │  PostgreSQL   │  │ PgBouncer│  │     Redis 7      │  │
│  │  Primary     │  │   Replica     │  │ Pool:50  │  │  256MB LRU      │  │
│  │  :5432      │  │   :5433       │  │ Max:500  │  │  Sessions+Cache  │  │
│  │  512MB      │  │   256MB       │  │  :6432   │  │  Locks+Blacklist │  │
│  │ 16 Schemas  │  │ Analytics RO  │  │          │  │    :6379        │  │
│  └─────────────┘  └──────────────┘  └──────────┘  └──────────────────┘  │
│                                                                          │
└───────────────────────────────────────────────────────────────────────────┘
```

### Architecture Patterns

| Pattern | Implementation | Where |
|---------|---------------|-------|
| **Clean/Hexagonal Architecture** | domain → application → infrastructure → interfaces | All 12 services |
| **Saga Pattern** | `BookingCreationSaga` with compensating transactions | booking-service |
| **Event Sourcing** | Kafka event mesh with 7-day retention & replay | Cross-service |
| **CQRS** | Write to Primary, Read from Replica | analytics-service |
| **Circuit Breaker** | `CircuitBreaker.ts` with health monitoring | resilience module |
| **Adapter Pattern** | `IOtaAdapter` interface for 5 OTA integrations | ota-service |
| **Factory Pattern** | `AdapterFactory`, `ProviderFactory` | ota-service, notification-service |
| **Distributed Locking** | Redis-based with TTL, sorted acquisition | booking, inventory, pricing |
| **Idempotency** | Key-based deduplication with 24h TTL | booking, payment, workflow |
| **Dead Letter Queue** | Failed message capture & retry | synchronization module |

### Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Service Communication** | Apache Kafka Event Mesh | Async decoupling, event replay, dead-letter queues |
| **Database** | PostgreSQL 16 + Read Replicas | ACID compliance, JSONB, 16 schema files |
| **Connection Pooling** | PgBouncer (50 pool, 500 max) | Reduces DB connections across 12 services |
| **Caching** | Redis 7 (256MB, LRU eviction) | Sessions, rate limiting, locks, token blacklist |
| **API Gateway** | Custom Express gateway | 22 route prefixes, JWT validation, rate limiting |
| **ORM** | Prisma 6.8 | Type-safe queries, auto-migrations, schema-first |
| **Monorepo** | Turborepo | Parallel builds, dependency graph, caching |
| **Container Security** | Read-only + tmpfs | Defense-in-depth, immutable infrastructure |

### API Gateway Routes (22 Prefixes)

```
/api/v1/auth                /api/v1/organizations       /api/v1/roles
/api/v1/hotels              /api/v1/rooms               /api/v1/room-types
/api/v1/inventory           /api/v1/bookings            /api/v1/payments
/api/v1/invoices            /api/v1/billing             /api/v1/ota
/api/v1/analytics           /api/v1/revenue             /api/v1/notifications
/api/v1/automation          /api/v1/intelligence        /api/v1/ai
/api/v1/security            /api/v1/compliance          /api/v1/disaster-recovery
/api/v1/resilience
```

---

## 🔧 Microservices

### 12 Domain Services + 3 Platform Components

| # | Service | Port | Memory | Rate Limit | Key Features |
|---|---------|------|--------|------------|--------------|
| 1 | **auth-service** | `3001` | 256M | 100/min | 6 RBAC roles, JWT+refresh tokens, brute force protection, token blacklisting |
| 2 | **organization-service** | `3002` | 256M | 200/min | 4 plan tiers, multi-tenant isolation, membership & ownership management |
| 3 | **hotel-service** | `3003` | 256M | 200/15min | 13 use cases, smart locks, room state machine, 5-min cache TTL |
| 4 | **inventory-service** | `3004` | 256M | 500/15min | Distributed locks (30s TTL), real-time availability, calendar view |
| 5 | **booking-service** | `3005` | 256M | 200/15min | Saga pattern, 6 statuses, 7 sources, idempotent ops, multi-guest |
| 6 | **payment-service** | `3006` | 256M | 100/min | 9 statuses, 8 methods, immutable ledger, reconciliation, 30-day refunds |
| 7 | **ota-service** | `3007` | 256M | 200/min | 5 OTA adapters, 5-min sync, reconciliation engine, webhook handling |
| 8 | **analytics-service** | `3008` | 256M | 300/min | 3 report types, 11 use cases, export generator, reads from replica |
| 9 | **notification-service** | `3009` | 256M | 200/min | 4 channels (Email/SMS/Push/WhatsApp), template engine, retry mechanism |
| 10 | **workflow-service** | `3010` | 256M | 200/min | Event-driven automation, condition evaluator, distributed execution locks |
| 11 | **pricing-engine-service** | `3011` | 256M | 500/min | 5-step pricing algorithm, 5-tier occupancy multiplier, surge control (3×) |
| 12 | **revenue-management-service** | `3012` | 256M | 300/min | Weighted moving average forecast, revenue optimizer, 90-day horizon |

### Platform Components

| Component | Port | Memory | Description |
|-----------|------|--------|-------------|
| **Web App** | `3000` | 512M | Next.js 16 frontend with 33 domain modules |
| **API Gateway** | `8080` | 256M | Express reverse-proxy, 22 route prefixes, JWT auth |
| **Worker** | — | 256M | Background job processor (concurrency: 2) |

### Infrastructure Containers

| Component | Port | Memory | Description |
|-----------|------|--------|-------------|
| **PostgreSQL Primary** | `5432` | 512M | Primary database, 16 schema files |
| **PostgreSQL Replica** | `5433` | 256M | Read replica for analytics queries |
| **PgBouncer** | `6432` | — | Connection pooling (50 pool / 500 max) |
| **Redis** | `6379` | 300M | Cache, sessions, locks, token blacklist (LRU) |
| **Kafka** | `29092` | 1G | Event mesh (3 partitions, 7-day retention) |
| **Zookeeper** | `2181` | 256M | Kafka coordination |

### Dev Tools (Optional)

| Tool | Port | Description |
|------|------|-------------|
| **pgAdmin 4** | `5050` | Database administration UI |
| **RedisInsight** | `5540` | Redis monitoring & debugging |

---

## 🛠️ Tech Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 20+ | Runtime environment |
| **TypeScript** | 5.x | End-to-end type safety |
| **Express.js** | 4.x | HTTP framework for microservices |
| **Prisma** | 6.8 | ORM — 16 schema files, auto-migrations, type-safe queries |
| **KafkaJS** | Latest | Event streaming client |
| **Zod** | 3.25 | Runtime schema validation |
| **bcryptjs** | 3.x | Password hashing |
| **jsonwebtoken** | 9.x | JWT token generation & verification |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16 | React framework with SSR/SSG |
| **React** | 19 | UI component library |
| **Lucide React** | 1.16 | Icon library |

### Infrastructure

| Technology | Version | Purpose |
|------------|---------|---------|
| **PostgreSQL** | 16-alpine | Primary + Replica RDBMS |
| **PgBouncer** | Latest | Connection pooling (50/500) |
| **Apache Kafka** | 7.5 (Confluent) | Event mesh, 3 partitions, 7d retention |
| **Zookeeper** | 7.5 (Confluent) | Kafka cluster coordination |
| **Redis** | 7 | 256MB cache, LRU eviction, distributed locks |
| **Docker Compose** | Latest | Local orchestration with profiles |
| **Kubernetes** | Latest | Production orchestration |
| **Helm** | 3.x | K8s package management |

### Shared Packages (9 Libraries)

| Package | Purpose |
|---------|---------|
| `shared-auth` | JWT generation, password hashing, token utilities |
| `shared-config` | Centralized configuration management |
| `shared-database` | Prisma client, DB utilities, shared enums |
| `shared-errors` | Error classes: BadRequest, Unauthorized, Forbidden, Conflict, etc. |
| `shared-events` | Event publisher, event types (AUTH_EVENTS, etc.), Kafka integration |
| `shared-logger` | Structured logging with correlation |
| `shared-observability` | OpenTelemetry tracing utilities |
| `shared-types` | Shared TypeScript type definitions |
| `shared-validation` | Input validation utilities |

### Developer Tooling

| Tool | Purpose |
|------|---------|
| **Turborepo** | Monorepo build system with caching |
| **Playwright** | E2E & API testing framework |
| **ESLint 9** | Code linting |
| **Prettier** | Code formatting |
| **Husky** | Git hooks (pre-commit, pre-push) |
| **lint-staged** | Run linters on staged files |
| **commitlint** | Conventional commit enforcement |

---

## 📁 Project Structure

```
stayflexi/
│
├── 📦 services/                          # 12 Microservices (Clean Architecture)
│   ├── auth-service/                     #   JWT, RBAC (6 roles), brute force protection
│   │   └── src/
│   │       ├── domain/                   #     Entities, value objects, repository interfaces
│   │       ├── application/              #     Use cases (Register, Login, Logout, Refresh)
│   │       ├── infrastructure/           #     Prisma repos, Redis cache, Kafka events
│   │       └── interfaces/              #     HTTP controllers, GraphQL resolvers
│   ├── organization-service/             #   Multi-tenant (4 plans), membership management
│   ├── hotel-service/                    #   13 use cases, smart locks, room state machine
│   ├── inventory-service/                #   Distributed locks, real-time availability
│   ├── booking-service/                  #   Saga pattern, 7 sources, multi-guest
│   ├── payment-service/                  #   Immutable ledger, 8 methods, reconciliation
│   ├── ota-service/                      #   5 OTA adapters, reconciliation engine
│   ├── analytics-service/                #   3 report types, export generator (CSV/JSON)
│   ├── notification-service/             #   4 channels (Email/SMS/Push/WhatsApp)
│   ├── workflow-service/                 #   Event-driven automation, condition evaluator
│   ├── pricing-engine-service/           #   5-step algorithm, surge pricing (3× cap)
│   └── revenue-management-service/       #   Forecast engine, revenue optimizer
│
├── 🏗️ infrastructure/
│   ├── gateway/                          #   API Gateway — 22 route prefixes
│   ├── event-bus/                        #   Kafka event bus abstraction
│   ├── observability/                    #   Logger, metrics, tracer, correlation
│   ├── monitoring/                       #   Prometheus, Grafana, Loki, Alertmanager
│   ├── secrets/                          #   Centralized secret management
│   ├── service-discovery/                #   Service registry & discovery
│   ├── distributed-config/               #   Distributed config store
│   ├── deployment/                       #   Helm charts (base, staging, production)
│   └── kubernetes/                       #   K8s manifests
│       ├── namespace.yaml
│       ├── configmap.yaml
│       ├── ingress.yaml
│       ├── network-policies.yaml         #     Network segmentation
│       ├── pod-disruption-budgets.yaml   #     HA guarantees
│       ├── rbac.yaml                     #     Role-based access
│       ├── autoscaling/                  #     KEDA scaled objects
│       ├── jobs/                         #     Backup CronJobs, Kafka topic setup, Prisma migrate
│       ├── secrets/                      #     App secrets, DB secrets
│       └── services/                     #     Per-service deployments + HPAs
│
├── 📱 src/
│   ├── modules/                          #   33 Domain Modules
│   │   ├── ai/                           #     Gemini AI: review scoring, chatbot, staffing
│   │   ├── analytics/                    #     KPIs: occupancy, ADR, RevPAR, cancellation rate
│   │   ├── audit/                        #     Complete audit trail
│   │   ├── auth/                         #     Login, registration, password reset
│   │   ├── automation/                   #     Workflow rule management
│   │   ├── backup/                       #     Data backup & restore
│   │   ├── booking/                      #     Reservation management
│   │   ├── channel-manager/              #     OTA distribution management
│   │   ├── compliance/                   #     Regulatory compliance
│   │   ├── disaster-recovery/            #     DR validation & failover
│   │   ├── hardening/                    #     Security hardening
│   │   ├── hotel/                        #     Property management
│   │   ├── housekeeping/                 #     Cleaning operations
│   │   ├── intelligence/                 #     Business insights
│   │   ├── inventory/                    #     Room availability
│   │   ├── invoice/                      #     Billing & invoicing
│   │   ├── maintenance/                  #     Equipment tracking
│   │   ├── monitoring/                   #     System health monitoring
│   │   ├── notification/                 #     Alert delivery (4 channels)
│   │   ├── operations/                   #     Hotel operations dashboard
│   │   ├── organization/                 #     Tenant management
│   │   ├── ota/                          #     OTA sync management
│   │   ├── payment/                      #     Financial transactions
│   │   ├── pricing/                      #     Rate management
│   │   ├── recommendations/              #     AI-powered recommendations
│   │   ├── resilience/                   #     Circuit breaker, failover
│   │   ├── revenue/                      #     Revenue analytics
│   │   ├── room/                         #     Room management
│   │   ├── security/                     #     Security events & sessions
│   │   ├── synchronization/              #     DLQ, retry queues, sync strategies
│   │   └── workflow-engine/              #     Process workflows
│   └── tests/
│       ├── api/v1/                       #     API endpoint tests
│       ├── integration/                  #     Full flow tests (10 suites)
│       ├── fixtures/                     #     Test data factories
│       └── setup/                        #     Global setup/teardown
│
├── 📦 packages/                          #   9 Shared Libraries
│   ├── shared-auth/                      #     JWT, password hashing
│   ├── shared-config/                    #     Configuration
│   ├── shared-database/                  #     Prisma client, enums
│   ├── shared-errors/                    #     Error classes
│   ├── shared-events/                    #     Kafka event types
│   ├── shared-logger/                    #     Structured logging
│   ├── shared-observability/             #     OpenTelemetry
│   ├── shared-types/                     #     Type definitions
│   └── shared-validation/               #     Input validation
│
├── 🗄️ src/database/prisma/schema/       #   16 Prisma Schema Files
│   ├── index.prisma                      #     Datasource & generator
│   ├── auth.prisma                       #     User, RefreshToken, PasswordResetToken
│   ├── organization.prisma               #     Organization, Member, Role, Permission
│   ├── hotel.prisma                      #     Hotel, HotelSettings
│   ├── room.prisma                       #     Room, RoomType, RoomAmenity
│   ├── booking.prisma                    #     Booking, BookingRoom, BookingGuest
│   ├── inventory.prisma                  #     Inventory, InventoryBlock, InventoryReservation
│   ├── payment.prisma                    #     Payment, Refund, Invoice, LedgerEntry
│   ├── ota.prisma                        #     OTAProvider, OTAMapping, SyncJob
│   ├── revenue.prisma                    #     PricingRule, DynamicRate, ForecastDataPoint
│   ├── operations.prisma                 #     HousekeepingTask, MaintenanceTask
│   ├── security.prisma                   #     UserSession, SecurityAudit
│   ├── ai.prisma                         #     AI/ML models
│   ├── infrastructure.prisma             #     System infrastructure
│   ├── common.prisma                     #     AuditLog, shared models
│   └── system.prisma                     #     System config, jobs
│
├── 📊 platform-validation/               #   Chaos engineering & DR testing
├── 📚 docs/                              #   Documentation
│   ├── architecture/                     #     Architecture docs
│   ├── runbooks/                         #     Operational runbooks
│   ├── BACKEND_CERTIFICATION.md          #     Backend certification report
│   ├── DATABASE_ARCHITECTURE.md          #     Database architecture
│   └── PRODUCTION-READINESS-ASSESSMENT.md#     Production readiness
│
├── docker-compose.yml                    #   21 containers, 4 profiles
├── Dockerfile                            #   Web app multi-stage build
├── Dockerfile.worker                     #   Worker multi-stage build
├── turbo.json                            #   Turborepo monorepo config
├── tsconfig.base.json                    #   Shared TypeScript config
└── package.json                          #   Root dependencies & scripts
```

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Minimum Version | Check Command |
|-------------|----------------|---------------|
| **Node.js** | 20.x | `node --version` |
| **npm** | 10.x | `npm --version` |
| **Docker Desktop** | Latest | `docker --version` |
| **Docker Compose** | v2+ | `docker compose version` |
| **Git** | 2.x | `git --version` |

### Step 1: Clone the Repository

```bash
git clone git@github.com:sathish1812kh-hub/stayflexy.git
cd stayflexy
```

### Step 2: Configure Environment

```bash
# Copy the environment template
cp .env.example .env

# Edit with your secrets
# See "Environment Variables" section below
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Start Infrastructure

```bash
# Start PostgreSQL, Redis, Kafka, Zookeeper, PgBouncer
docker compose up -d

# Wait for health checks (all should show "healthy")
docker compose ps
```

### Step 5: Database Setup

```bash
# Generate Prisma client from 16 schema files
npx prisma generate

# Run migrations
npx prisma migrate deploy

# (Optional) Seed test data
npm run db:seed

# (Optional) Open Prisma Studio
npx prisma studio
```

### Step 6: Start the Application

```bash
# Option A: Development mode (web app only)
npm run dev

# Option B: Full stack with Docker
docker compose --profile services up -d

# Option C: Full stack + background worker
docker compose --profile services --profile worker up -d

# Option D: Everything + dev tools (pgAdmin, RedisInsight)
docker compose --profile services --profile tools up -d
```

### Step 7: Verify

```bash
# Check all containers
docker compose ps

# Test endpoints
curl http://localhost:3000                          # Web App
curl http://localhost:8080/health/live              # API Gateway
curl http://localhost:3001/health/live              # Auth Service
```

### 🎉 Access Points

| Service | URL |
|---------|-----|
| **Web Application** | http://localhost:3000 |
| **API Gateway** | http://localhost:8080 |
| **pgAdmin** | http://localhost:5050 |
| **RedisInsight** | http://localhost:5540 |
| **Prisma Studio** | http://localhost:5555 |

---

## 🔐 Environment Variables

### Application

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | ✅ |
| `APP_NAME` | Application name | `stayflexi` | |
| `APP_VERSION` | Application version | `1.1.0` | |
| `APP_PORT` | Web app port | `3000` | |

### Database

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | — | ✅ |
| `DATABASE_POOL_SIZE` | Connection pool size | `10` | |
| `DATABASE_CONNECTION_TIMEOUT` | Timeout (ms) | `30000` | |
| `POSTGRES_PASSWORD` | PostgreSQL password | `stayflexi_dev` | ✅ |

### Authentication

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `JWT_SECRET` | Signing secret (min 64 chars) | — | ✅ |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | Access token expiry | `15m` | |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | Refresh token expiry | `7d` | |

### Redis

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `REDIS_URL` | Connection string | `redis://:redis_dev@localhost:6379` | ✅ |
| `REDIS_PASSWORD` | Redis password | `redis_dev` | ✅ |

### Kafka

| Variable | Description | Default |
|----------|-------------|---------|
| `KAFKA_BROKERS` | Broker addresses | `kafka:9092` |
| `KAFKA_ENABLED` | Enable event streaming | `false` |

### Rate Limiting

| Variable | Description | Default |
|----------|-------------|---------|
| `RATE_LIMIT_WINDOW_MS` | Window duration (ms) | `60000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests/window | `100` |

### Scaling

| Variable | Description | Default |
|----------|-------------|---------|
| `WORKER_CONCURRENCY` | Worker threads | `2` |
| `INSTANCE_COUNT` | App instances | `1` |

### AI Integration

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key | For AI features |
| `NEXT_PUBLIC_GEMINI_API_KEY` | Client Gemini key | For AI features |

### Service-Specific

| Variable | Service | Description | Default |
|----------|---------|-------------|---------|
| `WEBHOOK_SECRET` | payment | Payment webhook verification | — |
| `EMAIL_FROM` | notification | Sender email address | `noreply@stayflexi.com` |
| `OTA_SYNC_INTERVAL_MS` | ota | OTA sync interval | `300000` (5 min) |
| `MAX_SURGE_MULTIPLIER` | pricing | Max surge pricing cap | `3.0` |
| `FORECAST_HORIZON_DAYS` | revenue | Forecast window | `90` |
| `RECOMMENDATION_TTL_HOURS` | revenue | Recommendation refresh | `24` |
| `MAX_ROOMS_PER_BOOKING` | booking | Max rooms per booking | `10` |
| `MAX_ADVANCE_BOOKING_DAYS` | booking | Max advance booking | `365` |
| `MAX_REFUND_DAYS` | payment | Refund window | `30` |

> ⚠️ **Security**: `.env`, `.env.local`, `.env.docker` are all in `.gitignore`. Never commit secrets.

---

## 🐳 Deployment

### Docker Compose Profiles

```bash
# ─── Infrastructure Only (default) ──────────────────────────────
docker compose up -d
# → PostgreSQL, PostgreSQL Replica, PgBouncer, Redis, Kafka, Zookeeper

# ─── Infrastructure + All Services ──────────────────────────────
docker compose --profile services up -d
# → + API Gateway + 12 microservices + Web App

# ─── Full Stack with Background Worker ──────────────────────────
docker compose --profile services --profile worker up -d
# → + Background job processor

# ─── Full Stack with Dev Tools ──────────────────────────────────
docker compose --profile services --profile tools up -d
# → + pgAdmin (5050) + RedisInsight (5540)

# ─── View Logs ──────────────────────────────────────────────────
docker compose logs -f                          # All
docker compose logs -f booking-service          # Specific service

# ─── Stop Everything ────────────────────────────────────────────
docker compose --profile services down          # Stop all
docker compose --profile services down -v       # + Remove volumes
```

### Container Resource Allocation

| Tier | Services | Memory Limit | Memory Reserved |
|------|----------|-------------|-----------------|
| **Heavy** | Kafka | 1 GB | 512 MB |
| **Medium** | PostgreSQL Primary, Web App | 512 MB | 256 MB |
| **Standard** | 12 microservices, API Gateway, Redis, Worker, Replica | 256 MB | 128 MB |
| **Total** | **21 containers** | **~5.5 GB** | **~3 GB** |

### Kubernetes (Production)

#### kubectl

```bash
# Create namespace
kubectl apply -f infrastructure/kubernetes/namespace.yaml

# Deploy secrets, config, RBAC
kubectl apply -f infrastructure/kubernetes/secrets/
kubectl apply -f infrastructure/kubernetes/configmap.yaml
kubectl apply -f infrastructure/kubernetes/rbac.yaml

# Deploy network policies & PDBs
kubectl apply -f infrastructure/kubernetes/network-policies.yaml
kubectl apply -f infrastructure/kubernetes/pod-disruption-budgets.yaml

# Deploy services & ingress
kubectl apply -f infrastructure/kubernetes/services/
kubectl apply -f infrastructure/kubernetes/ingress.yaml

# Autoscaling (KEDA)
kubectl apply -f infrastructure/kubernetes/autoscaling/

# Init jobs (Prisma migrate, Kafka topics, backups)
kubectl apply -f infrastructure/kubernetes/jobs/
```

#### Helm

```bash
# Staging
helm install stayflexi infrastructure/deployment/helm/ \
  -f infrastructure/deployment/helm/values.staging.yaml \
  --namespace stayflexi --create-namespace

# Production
helm install stayflexi infrastructure/deployment/helm/ \
  -f infrastructure/deployment/helm/values.production.yaml \
  --namespace stayflexi-prod --create-namespace

# Upgrade & Rollback
helm upgrade stayflexi infrastructure/deployment/helm/ \
  -f infrastructure/deployment/helm/values.production.yaml
helm rollback stayflexi 1
```

### Security Features

| Feature | Implementation |
|---------|---------------|
| **Read-only containers** | `read_only: true` on all services |
| **tmpfs mounts** | `/tmp:size=64M` for ephemeral writes |
| **Network isolation** | Separate `backend` and `frontend` networks |
| **Resource limits** | Memory caps on every container |
| **Health checks** | HTTP `/health/live` on all 14 services |
| **Graceful shutdown** | 30-second `stop_grace_period` |
| **Auto-restart** | `unless-stopped` policy |
| **K8s Network Policies** | Namespace-level network segmentation |
| **Pod Disruption Budgets** | HA guarantees during rolling updates |

---

## 🧪 Testing

### Commands

```bash
# ─── Playwright Tests ───────────────────────────────────────────
npm run test                    # All tests
npm run test:api                # API endpoint tests
npm run test:integration        # Integration tests
npm run test:ui                 # Interactive UI mode
npm run test:debug              # Debug with inspector
npm run test:report             # HTML test report

# ─── Service Tests ─────────────────────────────────────────────
npm run test:services           # All service unit tests (Turborepo)

# ─── Code Quality ──────────────────────────────────────────────
npm run lint                    # ESLint
npm run lint:fix                # Auto-fix
npm run lint:services           # Lint all services
npm run format                  # Prettier format
npm run format:check            # Check formatting
npm run type-check              # TypeScript check
npm run type-check:all          # Check all packages

# ─── Database ──────────────────────────────────────────────────
npm run db:generate             # Generate Prisma client
npm run db:migrate              # Dev migrations
npm run db:migrate:prod         # Production migrations
npm run db:migrate:status       # Migration status
npm run db:migrate:reset        # Reset (destructive!)
npm run db:studio               # Prisma Studio
npm run db:seed                 # Seed data
npm run db:push                 # Push schema
npm run db:format               # Format schema
```

### Integration Test Suites

| Test | File | Coverage |
|------|------|----------|
| **Full Booking Flow** | `bookAllRooms.test.ts` | End-to-end booking lifecycle |
| **OTA Sync** | `otaSync.test.ts` | OTA channel synchronization |
| **Session Limits** | `sessionLimit.test.ts` | Concurrent session management |
| **AI Review Scoring** | `testAIReviewScore.test.ts` | Gemini AI review analysis |
| **Chatbot** | `testChatbot.test.ts` | AI chatbot interaction |
| **Staff AI** | `testStaffAI.test.ts` | AI staffing recommendations |
| **Room Blocking** | `testBlockRoom103.test.ts` | Room blocking operations |
| **Auth Flow** | `testLogoutLogin.test.ts` | Login/logout lifecycle |
| **Diagnostics** | `diagnose.test.ts` | System diagnostics |
| **Live Capture** | `captureLiveLocalhost.test.ts` | Live localhost testing |

---

## 📊 Monitoring & Observability

### Monitoring Stack

| Tool | Purpose |
|------|---------|
| **Prometheus** | Metrics collection |
| **Grafana** | Dashboards & visualization |
| **Loki** | Log aggregation |
| **Alertmanager** | Alert routing & notifications |

### Built-in Observability

| Layer | Implementation |
|-------|---------------|
| **Health Checks** | HTTP `/health/live` on all 14 services (30s interval, 3 retries) |
| **Structured Logging** | JSON logs with correlation IDs (`infrastructure/observability/src/logger.ts`) |
| **Metrics** | Custom metrics (`infrastructure/observability/src/metrics.ts`) |
| **Distributed Tracing** | OpenTelemetry (`infrastructure/observability/src/tracer.ts`) |
| **Correlation IDs** | Request-scoped context (`infrastructure/observability/src/correlation.ts`) |
| **Container Logs** | JSON file driver, max 10MB × 3 files, tagged by container name |

### Health Check Endpoints

| Service | URL |
|---------|-----|
| Web App | `http://localhost:3000/api/v1/monitoring/status` |
| API Gateway | `http://localhost:8080/health/live` |
| Auth | `http://localhost:3001/health/live` |
| Organization | `http://localhost:3002/health/live` |
| Hotel | `http://localhost:3003/health/live` |
| Inventory | `http://localhost:3004/health/live` |
| Booking | `http://localhost:3005/health/live` |
| Payment | `http://localhost:3006/health/live` |
| OTA | `http://localhost:3007/health/live` |
| Analytics | `http://localhost:3008/health/live` |
| Notification | `http://localhost:3009/health/live` |
| Workflow | `http://localhost:3010/health/live` |
| Pricing Engine | `http://localhost:3011/health/live` |
| Revenue Mgmt | `http://localhost:3012/health/live` |

### Resilience Patterns

| Pattern | Module | Description |
|---------|--------|-------------|
| **Circuit Breaker** | `CircuitBreaker.ts` | Prevents cascading failures |
| **Health Monitor** | `HealthMonitor.ts` | Continuous service health tracking |
| **Failover Orchestrator** | `FailoverOrchestrator.ts` | Automated failover coordination |
| **Dead Letter Queue** | `DeadLetterQueue.ts` | Failed message capture |
| **Retry Queue** | `RetryQueue.ts` | Automatic retry with backoff |
| **Sync Queue** | `SyncQueue.ts` | Ordered synchronization queue |

### Analytics KPIs

| KPI | Calculation |
|-----|-------------|
| **Occupancy Rate** | Occupied rooms / Total rooms |
| **ADR** | Total room revenue / Rooms sold |
| **RevPAR** | Total room revenue / Available rooms |
| **Cancellation Rate** | Cancelled bookings / Total bookings |
| **Avg Stay Duration** | Total nights / Total bookings |
| **Revenue by Channel** | Grouped by booking source |
| **Revenue by Room Type** | Grouped by room type |

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** with conventional commits: `git commit -m 'feat: add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

> **Note**: Direct pushes to `main` are blocked. Commits are validated with `commitlint`.

---

## 📄 License

This project is proprietary software. All rights reserved.

---

<p align="center">
  <sub>Built with ❤️ by the <strong>Stayflexi</strong> team</sub>
</p>
<p align="center">
  <sub>12 Microservices · 33 Domain Modules · 16 Schema Files · 9 Shared Packages · 21 Containers</sub>
</p>
