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
  <img src="https://img.shields.io/badge/Containers-21-06D6A0?style=flat-square" />
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

### 🌟 Core Feature Highlights

<table>
<tr>
<td width="50%">

#### 🛏️ Room & Inventory Management
- Real-time room availability tracking with **distributed locking** (`LOCK_TTL_MS=30000`)
- Room type configuration with amenities, policies & photos
- Bulk inventory updates across date ranges
- Overbooking prevention with pessimistic locking
- **60-second cache TTL** for hot inventory queries

</td>
<td width="50%">

#### 📅 Booking & Reservations
- Full reservation lifecycle: `PENDING → CONFIRMED → CHECKED_IN → CHECKED_OUT`
- Multi-room bookings (up to **10 rooms per booking**)
- Advance booking window up to **365 days**
- **Idempotent operations** with 24-hour TTL deduplication
- Conflict detection with distributed lock retries (5 retries, 200ms delay)

</td>
</tr>
<tr>
<td width="50%">

#### 💰 Dynamic Pricing Engine
- Real-time rate optimization based on demand, occupancy & market data
- **Surge pricing** with configurable max multiplier (`MAX_SURGE_MULTIPLIER=3.0`)
- Rate plans: BAR, promotional, corporate, package rates
- Competitor price monitoring & response strategies
- **Distributed pricing locks** to prevent race conditions

</td>
<td width="50%">

#### 📊 Revenue Management
- **90-day revenue forecasting** horizon (`FORECAST_HORIZON_DAYS=90`)
- Occupancy optimization algorithms
- RevPAR, ADR, and GOPPAR analytics
- Yield management with automated rate recommendations
- **24-hour recommendation refresh cycle** (`RECOMMENDATION_TTL_HOURS=24`)

</td>
</tr>
<tr>
<td width="50%">

#### 🌐 OTA Channel Management
- Two-way sync with **Booking.com, Expedia, Agoda** and more
- Automated inventory push every **5 minutes** (`OTA_SYNC_INTERVAL_MS=300000`)
- Rate parity management across channels
- Reservation import from OTA channels
- Reconciliation engine for discrepancy detection

</td>
<td width="50%">

#### 💳 Payment Processing
- PCI-compliant payment handling with webhook verification
- Multi-gateway support with failover
- Refund management (up to **30-day refund window**)
- **Idempotent payment operations** with 24-hour deduplication
- Transaction ledger with audit trail

</td>
</tr>
<tr>
<td width="50%">

#### 🔐 Authentication & Security
- JWT-based auth with access tokens (**15-min expiry**) + refresh tokens (**7-day expiry**)
- Role-Based Access Control (RBAC) with granular permissions
- Session management with suspicious activity detection
- Rate limiting per service (100-500 req/window)
- **Multi-tenant data isolation** via `organizationId` enforcement

</td>
<td width="50%">

#### 🔔 Notifications & Workflows
- Multi-channel: **Email, SMS, Push** notifications
- Event-driven triggers via Kafka consumers
- Configurable workflow automation engine
- Booking confirmation, check-in reminders, payment receipts
- Customizable email templates per organization

</td>
</tr>
</table>

### 🧠 Advanced Platform Capabilities

| Capability | Description |
|------------|-------------|
| **🤖 AI-Powered Intelligence** | Gemini AI integration for guest insights, review scoring, staffing recommendations |
| **🏠 Housekeeping Management** | Room cleaning schedules, staff assignment, status tracking |
| **🧾 Invoice Generation** | Automated invoice creation, tax calculation, multi-currency support |
| **🔄 Disaster Recovery** | Automated failover, backup/restore, RTO/RPO validation |
| **🛡️ Security Hardening** | Audit logging, compliance checks, penetration testing |
| **📈 Business Intelligence** | Custom dashboards, trend analysis, predictive analytics |
| **🔧 Maintenance Tracking** | Equipment lifecycle, preventive maintenance scheduling |
| **⚡ Circuit Breakers** | Resilience patterns with health monitoring and auto-recovery |

---

## 🏗️ Architecture

### High-Level System Design

```
                              ┌──────────────────────────┐
                              │      Web Application      │
                              │    (Next.js 16 + React)    │
                              │       Port: 3000          │
                              └────────────┬─────────────┘
                                           │
                              ┌────────────▼─────────────┐
                              │       API Gateway         │
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
       │(replica)│   │          │   │          │   │          │   │         │
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
│  │  512MB      │  │   256MB       │  │  :6432   │  │    :6379        │  │
│  └─────────────┘  └──────────────┘  └──────────┘  └──────────────────┘  │
│                                                                          │
└───────────────────────────────────────────────────────────────────────────┘
```

### Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Service Communication** | Apache Kafka Event Mesh | Async decoupling, event replay, dead-letter queues |
| **Database** | PostgreSQL 16 + Read Replicas | ACID compliance, JSONB, mature replication |
| **Connection Pooling** | PgBouncer (50 pool, 500 max) | Reduces DB connections across 12 services |
| **Caching** | Redis 7 (256MB, LRU eviction) | Session store, rate limiting, distributed locks |
| **API Gateway** | Custom Express gateway | Service routing, JWT validation, rate limiting |
| **ORM** | Prisma 6.8 | Type-safe queries, auto-migrations, schema-first |
| **Monorepo** | Turborepo | Parallel builds, dependency graph, caching |
| **Container Orchestration** | Docker Compose / Kubernetes + Helm | Local dev / Production scaling |
| **Security** | Read-only containers + tmpfs | Defense-in-depth, immutable infrastructure |

---

## 🔧 Microservices

### 12 Domain Services + 3 Platform Components

| # | Service | Port | Container | Memory | Rate Limit | Description |
|---|---------|------|-----------|--------|------------|-------------|
| 1 | **auth-service** | `3001` | `stayflexi-auth-service` | 256M | 100/min | JWT auth, RBAC, session management |
| 2 | **organization-service** | `3002` | `stayflexi-organization-service` | 256M | 200/min | Multi-tenant org & property management |
| 3 | **hotel-service** | `3003` | `stayflexi-hotel-service` | 256M | 200/15min | Hotel config, room types, amenities (5-min cache) |
| 4 | **inventory-service** | `3004` | `stayflexi-inventory-service` | 256M | 500/15min | Real-time availability, distributed locks |
| 5 | **booking-service** | `3005` | `stayflexi-booking-service` | 256M | 200/15min | Reservations, idempotent ops, conflict resolution |
| 6 | **payment-service** | `3006` | `stayflexi-payment-service` | 256M | 100/min | Payment processing, webhooks, refunds |
| 7 | **ota-service** | `3007` | `stayflexi-ota-service` | 256M | 200/min | OTA channel sync (5-min intervals) |
| 8 | **analytics-service** | `3008` | `stayflexi-analytics-service` | 256M | 300/min | Dashboards & BI (reads from replica) |
| 9 | **notification-service** | `3009` | `stayflexi-notification-service` | 256M | 200/min | Email, SMS, push notifications |
| 10 | **workflow-service** | `3010` | `stayflexi-workflow-service` | 256M | 200/min | Business process automation |
| 11 | **pricing-engine-service** | `3011` | `stayflexi-pricing-engine` | 256M | 500/min | Dynamic pricing, surge control (3x max) |
| 12 | **revenue-management-service** | `3012` | `stayflexi-revenue-mgmt` | 256M | 300/min | Revenue forecasting (90-day horizon) |

### Platform Components

| Component | Port | Container | Memory | Description |
|-----------|------|-----------|--------|-------------|
| **Web App** | `3000` | `stayflexi-app` | 512M | Next.js 16 frontend application |
| **API Gateway** | `8080` | `stayflexi-api-gateway` | 256M | Central routing, auth, rate limiting |
| **Worker** | — | `stayflexi-worker` | 256M | Background job processor (concurrency: 2) |

### Infrastructure Containers

| Component | Port | Container | Memory | Description |
|-----------|------|-----------|--------|-------------|
| **PostgreSQL Primary** | `5432` | `stayflexi-postgres` | 512M | Primary database (16-alpine) |
| **PostgreSQL Replica** | `5433` | `stayflexi-postgres-replica` | 256M | Read replica for analytics |
| **PgBouncer** | `6432` | `stayflexi-pgbouncer` | — | Connection pooling (50 pool / 500 max) |
| **Redis** | `6379` | `stayflexi-redis` | 300M | Cache, sessions, distributed locks |
| **Kafka** | `29092` | `stayflexi-kafka` | 1G | Event mesh (3 partitions, 7-day retention) |
| **Zookeeper** | `2181` | `stayflexi-zookeeper` | 256M | Kafka coordination |

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
| **Prisma** | 6.8 | ORM with auto-migrations & type-safe queries |
| **KafkaJS** | Latest | Apache Kafka client for event streaming |
| **Zod** | 3.25 | Runtime schema validation |
| **bcryptjs** | 3.x | Password hashing |
| **jsonwebtoken** | 9.x | JWT token generation & verification |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16 | React framework with SSR/SSG |
| **React** | 19 | UI component library |
| **Lucide React** | 1.16 | Icon library |
| **TypeScript** | 5.x | Type-safe components |

### Infrastructure

| Technology | Version | Purpose |
|------------|---------|---------|
| **PostgreSQL** | 16-alpine | Primary RDBMS with JSONB support |
| **PgBouncer** | Latest | Connection pooling (50 pool / 500 max clients) |
| **Apache Kafka** | 7.5 (Confluent) | Event mesh with 3 partitions, 7-day retention |
| **Zookeeper** | 7.5 (Confluent) | Kafka cluster coordination |
| **Redis** | 7 | Cache (256MB, LRU eviction), sessions, distributed locks |
| **Docker** | Latest | Containerization with read-only filesystems |
| **Docker Compose** | Latest | Local orchestration with profiles |
| **Kubernetes** | Latest | Production container orchestration |
| **Helm** | 3.x | K8s package management |

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
| **pgAdmin 4** | Database administration |
| **RedisInsight** | Redis debugging & monitoring |

---

## 📁 Project Structure

```
stayflexi/
│
├── 📦 services/                          # 12 Microservices
│   ├── auth-service/                     #   JWT auth, RBAC, sessions
│   ├── organization-service/             #   Multi-tenant management
│   ├── hotel-service/                    #   Property configuration
│   ├── inventory-service/                #   Room availability & locks
│   ├── booking-service/                  #   Reservation lifecycle
│   ├── payment-service/                  #   Payment processing
│   ├── ota-service/                      #   OTA channel sync
│   ├── analytics-service/                #   Dashboards & BI
│   ├── notification-service/             #   Email/SMS/Push
│   ├── workflow-service/                 #   Process automation
│   ├── pricing-engine-service/           #   Dynamic pricing
│   └── revenue-management-service/       #   Revenue optimization
│
├── 🏗️ infrastructure/
│   ├── gateway/                          #   API Gateway (Express)
│   ├── event-bus/                        #   Kafka abstraction layer
│   ├── observability/                    #   Logging, metrics, tracing
│   ├── secrets/                          #   Secret management
│   ├── service-discovery/                #   Service registry
│   ├── distributed-config/               #   Centralized config store
│   ├── monitoring/                       #   Health & performance monitoring
│   ├── deployment/                       #   Helm charts & prod configs
│   │   └── helm/                         #     Chart.yaml, values.yaml
│   │       ├── values.yaml               #     Base configuration
│   │       ├── values.staging.yaml       #     Staging overrides
│   │       └── values.production.yaml    #     Production overrides
│   └── kubernetes/                       #   K8s manifests
│       ├── namespace.yaml                #     Namespace isolation
│       ├── configmap.yaml                #     Application config
│       ├── ingress.yaml                  #     Ingress routing
│       ├── network-policies.yaml         #     Network segmentation
│       ├── pod-disruption-budgets.yaml   #     HA guarantees
│       ├── rbac.yaml                     #     Role-based access
│       ├── autoscaling/                  #     KEDA scaled objects
│       ├── jobs/                         #     CronJobs & init jobs
│       ├── secrets/                      #     K8s secrets
│       └── services/                     #     Per-service deployments
│
├── 📱 src/
│   ├── modules/                          #   33 Domain Modules
│   │   ├── ai/                           #     Gemini AI integration
│   │   ├── analytics/                    #     Business intelligence
│   │   ├── audit/                        #     Audit logging
│   │   ├── auth/                         #     Authentication
│   │   ├── automation/                   #     Task automation
│   │   ├── backup/                       #     Data backup
│   │   ├── booking/                      #     Reservation management
│   │   ├── channel-manager/              #     OTA distribution
│   │   ├── compliance/                   #     Regulatory compliance
│   │   ├── disaster-recovery/            #     DR validation
│   │   ├── hardening/                    #     Security hardening
│   │   ├── hotel/                        #     Property management
│   │   ├── housekeeping/                 #     Cleaning operations
│   │   ├── intelligence/                 #     Business insights
│   │   ├── inventory/                    #     Room inventory
│   │   ├── invoice/                      #     Billing & invoicing
│   │   ├── maintenance/                  #     Equipment tracking
│   │   ├── monitoring/                   #     System monitoring
│   │   ├── notification/                 #     Alert delivery
│   │   ├── operations/                   #     Hotel operations
│   │   ├── organization/                 #     Tenant management
│   │   ├── ota/                          #     OTA sync
│   │   ├── payment/                      #     Financial transactions
│   │   ├── pricing/                      #     Rate management
│   │   ├── recommendations/              #     AI recommendations
│   │   ├── resilience/                   #     Circuit breakers
│   │   ├── revenue/                      #     Revenue analytics
│   │   ├── room/                         #     Room management
│   │   ├── security/                     #     Security events
│   │   ├── synchronization/              #     Data sync engine
│   │   └── workflow-engine/              #     Process workflows
│   └── tests/                            #   Test suites
│       ├── api/                          #     API tests
│       ├── integration/                  #     Integration tests
│       └── fixtures/                     #     Test data
│
├── 📦 packages/
│   └── shared-auth/                      #   Shared JWT/auth library
│
├── 📊 platform-validation/               #   Chaos engineering & DR
├── 📚 docs/                              #   Documentation
│   ├── architecture/                     #     Architecture docs
│   └── runbooks/                         #     Operational runbooks
├── 🗄️ prisma/                            #   Database schema & migrations
├── 🐳 docker/                            #   Docker init scripts
│
├── docker-compose.yml                    #   21 containers orchestration
├── Dockerfile                            #   Web app build
├── Dockerfile.worker                     #   Worker build
├── turbo.json                            #   Turborepo config
├── tsconfig.base.json                    #   Shared TS config
├── package.json                          #   Root dependencies
└── .env.example                          #   Environment template
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

# Edit with your secrets (database passwords, JWT secrets, API keys)
# See "Environment Variables" section below for details
```

### Step 3: Install Dependencies

```bash
# Install root + all service dependencies
npm install
```

### Step 4: Start Infrastructure

```bash
# Start PostgreSQL, Redis, Kafka, Zookeeper, PgBouncer
docker compose up -d

# Wait for health checks to pass
docker compose ps
```

### Step 5: Run Database Migrations

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# (Optional) Open Prisma Studio
npx prisma studio
```

### Step 6: Start the Application

```bash
# Option A: Start web app only (development)
npm run dev

# Option B: Start everything with Docker
docker compose --profile services up -d

# Option C: Include background worker
docker compose --profile services --profile worker up -d

# Option D: Include dev tools (pgAdmin, RedisInsight)
docker compose --profile services --profile tools up -d
```

### Step 7: Verify Deployment

```bash
# Check all containers are healthy
docker compose ps

# Test the web app
curl http://localhost:3000

# Test the API Gateway
curl http://localhost:8080/health/live

# Test a microservice directly
curl http://localhost:3001/health/live   # auth-service
```

### 🎉 Access Points

| Service | URL |
|---------|-----|
| **Web Application** | http://localhost:3000 |
| **API Gateway** | http://localhost:8080 |
| **pgAdmin** | http://localhost:5050 |
| **RedisInsight** | http://localhost:5540 |

---

## 🔐 Environment Variables

### Application Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | ✅ |
| `APP_NAME` | Application name | `stayflexi` | |
| `APP_VERSION` | Application version | `1.1.0` | |
| `APP_PORT` | Web app port | `3000` | |

### Database

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://USER:PASSWORD@HOST:5432/stayflexi_dev?schema=public` | ✅ |
| `DATABASE_POOL_SIZE` | Connection pool size | `10` | |
| `DATABASE_CONNECTION_TIMEOUT` | Connection timeout (ms) | `30000` | |
| `POSTGRES_PASSWORD` | PostgreSQL password | `stayflexi_dev` | ✅ |

### Authentication

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `JWT_SECRET` | JWT signing secret (min 64 chars) | — | ✅ |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | Access token expiry | `15m` | |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | Refresh token expiry | `7d` | |

### Redis

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `REDIS_URL` | Redis connection string | `redis://:redis_dev@localhost:6379` | ✅ |
| `REDIS_PASSWORD` | Redis password | `redis_dev` | ✅ |

### Kafka

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `KAFKA_BROKERS` | Broker addresses | `kafka:9092` | |
| `KAFKA_ENABLED` | Enable event streaming | `false` | |

### Rate Limiting

| Variable | Description | Default |
|----------|-------------|---------|
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `60000` (1 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

### API & Scaling

| Variable | Description | Default |
|----------|-------------|---------|
| `API_BASE_URL` | API base URL | `http://localhost:3000` |
| `API_VERSION` | API version prefix | `v1` |
| `WORKER_CONCURRENCY` | Background worker threads | `2` |
| `INSTANCE_COUNT` | App instances | `1` |

### AI Integration

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key | For AI features |
| `NEXT_PUBLIC_GEMINI_API_KEY` | Client-side Gemini key | For AI features |

### Payment & Notifications

| Variable | Description | Required |
|----------|-------------|----------|
| `WEBHOOK_SECRET` | Payment webhook secret | For payments |
| `EMAIL_FROM` | Sender email address | For notifications |

> ⚠️ **Security**: Never commit `.env` files. The `.gitignore` already excludes `.env`, `.env.local`, `.env.docker`, and all environment-specific files. Use `.env.example` as your template.

---

## 🐳 Deployment

### Docker Compose Profiles

```bash
# ─── Infrastructure Only (default) ──────────────────────────────
docker compose up -d
# Starts: PostgreSQL, PostgreSQL Replica, PgBouncer, Redis, Kafka, Zookeeper

# ─── Infrastructure + All Services ──────────────────────────────
docker compose --profile services up -d
# Adds: API Gateway + 12 microservices + Web App

# ─── Full Stack with Background Worker ──────────────────────────
docker compose --profile services --profile worker up -d
# Adds: Background job processor

# ─── Full Stack with Dev Tools ──────────────────────────────────
docker compose --profile services --profile tools up -d
# Adds: pgAdmin (5050) + RedisInsight (5540)

# ─── View Logs ──────────────────────────────────────────────────
docker compose logs -f                          # All services
docker compose logs -f booking-service          # Specific service

# ─── Stop Everything ────────────────────────────────────────────
docker compose --profile services down          # Stop services + infra
docker compose --profile services down -v       # + Remove volumes
```

### Container Resource Allocation

| Tier | Services | Memory Limit | Memory Reserved |
|------|----------|-------------|-----------------|
| **Heavy** | Kafka | 1 GB | 512 MB |
| **Medium** | PostgreSQL, Web App | 512 MB | 256 MB |
| **Standard** | All 12 microservices, API Gateway, Redis, Worker | 256 MB | 128 MB |
| **Total** | 21 containers | **~5.5 GB** | **~3 GB** |

### Kubernetes (Production)

#### Using kubectl

```bash
# Create namespace
kubectl apply -f infrastructure/kubernetes/namespace.yaml

# Deploy secrets & config
kubectl apply -f infrastructure/kubernetes/secrets/
kubectl apply -f infrastructure/kubernetes/configmap.yaml

# Deploy network policies & RBAC
kubectl apply -f infrastructure/kubernetes/network-policies.yaml
kubectl apply -f infrastructure/kubernetes/rbac.yaml

# Deploy services
kubectl apply -f infrastructure/kubernetes/services/

# Configure ingress
kubectl apply -f infrastructure/kubernetes/ingress.yaml

# Set up autoscaling (KEDA)
kubectl apply -f infrastructure/kubernetes/autoscaling/

# Configure pod disruption budgets
kubectl apply -f infrastructure/kubernetes/pod-disruption-budgets.yaml

# Run initialization jobs
kubectl apply -f infrastructure/kubernetes/jobs/
```

#### Using Helm

```bash
# Staging deployment
helm install stayflexi infrastructure/deployment/helm/ \
  -f infrastructure/deployment/helm/values.staging.yaml \
  --namespace stayflexi --create-namespace

# Production deployment
helm install stayflexi infrastructure/deployment/helm/ \
  -f infrastructure/deployment/helm/values.production.yaml \
  --namespace stayflexi-prod --create-namespace

# Upgrade
helm upgrade stayflexi infrastructure/deployment/helm/ \
  -f infrastructure/deployment/helm/values.production.yaml

# Rollback
helm rollback stayflexi 1
```

### Security Features

| Feature | Implementation |
|---------|---------------|
| **Read-only containers** | `read_only: true` on all service containers |
| **tmpfs mounts** | `/tmp:size=64M` for ephemeral writes |
| **Network isolation** | Separate `backend` and `frontend` networks |
| **Resource limits** | Memory caps on every container |
| **Health checks** | HTTP `/health/live` on every service |
| **Graceful shutdown** | 30-second `stop_grace_period` |
| **Auto-restart** | `unless-stopped` restart policy |
| **K8s Network Policies** | Namespace-level network segmentation |
| **Pod Disruption Budgets** | HA guarantees during rolling updates |
| **RBAC** | Kubernetes role-based access control |

---

## 🧪 Testing

### Test Commands

```bash
# ─── Playwright Tests ───────────────────────────────────────────
npm run test                    # Run all tests
npm run test:api                # API endpoint tests only
npm run test:integration        # Integration tests only
npm run test:ui                 # Interactive UI mode
npm run test:debug              # Debug mode with inspector
npm run test:report             # View HTML test report

# ─── Service-Level Tests ───────────────────────────────────────
npm run test:services           # Run all service unit tests (via Turborepo)

# ─── Code Quality ──────────────────────────────────────────────
npm run lint                    # ESLint check
npm run lint:fix                # ESLint auto-fix
npm run lint:services           # Lint all services
npm run format                  # Prettier format all files
npm run format:check            # Check formatting
npm run type-check              # TypeScript type check
npm run type-check:all          # Type check all packages

# ─── Database ──────────────────────────────────────────────────
npm run db:generate             # Generate Prisma client
npm run db:migrate              # Run dev migrations
npm run db:migrate:prod         # Deploy production migrations
npm run db:migrate:status       # Check migration status
npm run db:migrate:reset        # Reset database (WARNING: destructive)
npm run db:studio               # Open Prisma Studio
npm run db:seed                 # Seed test data
npm run db:push                 # Push schema changes
npm run db:format               # Format Prisma schema
```

### Test Structure

```
src/tests/
├── api/v1/                     # API endpoint tests
│   ├── health.test.ts          #   Health check validation
│   └── organization.test.ts    #   Organization CRUD tests
├── integration/                # Integration tests
│   ├── bookAllRooms.test.ts    #   Full booking flow
│   ├── otaSync.test.ts         #   OTA synchronization
│   ├── sessionLimit.test.ts    #   Session management
│   ├── testAIReviewScore.test.ts #  AI review scoring
│   ├── testChatbot.test.ts     #   Chatbot interaction
│   └── testStaffAI.test.ts     #   Staff AI assistant
├── fixtures/                   # Test data factories
│   └── base.fixture.ts
├── helpers/
│   └── apiAssert.ts            # Custom assertions
└── setup/
    ├── global.setup.ts         # Test environment setup
    └── global.teardown.ts      # Test cleanup
```

---

## 📊 Monitoring & Observability

### Built-in Monitoring

| Layer | Technology | Details |
|-------|-----------|---------|
| **Health Checks** | HTTP `/health/live` | Every service exposes liveness probes (30s interval, 3 retries) |
| **Structured Logging** | JSON with correlation IDs | Distributed request tracing across services |
| **Metrics** | Custom metrics module | `infrastructure/observability/src/metrics.ts` |
| **Distributed Tracing** | OpenTelemetry-compatible | `infrastructure/observability/src/tracer.ts` |
| **Correlation IDs** | Request-scoped context | `infrastructure/observability/src/correlation.ts` |
| **Container Logs** | JSON file driver | Max 10MB × 3 files per container, tagged by name |

### Service Health Endpoints

| Service | Health Check URL | Method |
|---------|-----------------|--------|
| Web App | `http://localhost:3000/api/v1/monitoring/status` | `GET` |
| API Gateway | `http://localhost:8080/health/live` | `GET` |
| Auth Service | `http://localhost:3001/health/live` | `GET` |
| Organization Service | `http://localhost:3002/health/live` | `GET` |
| Hotel Service | `http://localhost:3003/health/live` | `GET` |
| Inventory Service | `http://localhost:3004/health/live` | `GET` |
| Booking Service | `http://localhost:3005/health/live` | `GET` |
| Payment Service | `http://localhost:3006/health/live` | `GET` |
| OTA Service | `http://localhost:3007/health/live` | `GET` |
| Analytics Service | `http://localhost:3008/health/live` | `GET` |
| Notification Service | `http://localhost:3009/health/live` | `GET` |
| Workflow Service | `http://localhost:3010/health/live` | `GET` |
| Pricing Engine | `http://localhost:3011/health/live` | `GET` |
| Revenue Management | `http://localhost:3012/health/live` | `GET` |

### Infrastructure Monitoring

| Component | Health Check | Interval |
|-----------|-------------|----------|
| PostgreSQL | `pg_isready -U stayflexi` | 10s |
| PostgreSQL Replica | `pg_isready -U stayflexi` | 10s |
| Redis | `redis-cli ping` | 10s |
| Kafka | `kafka-topics --list` | 15s |
| Zookeeper | `echo srvr \| nc localhost 2181` | 10s |

### Platform Resilience

| Feature | Module | Description |
|---------|--------|-------------|
| **Circuit Breaker** | `src/modules/resilience/CircuitBreaker.ts` | Prevents cascading failures |
| **Health Monitor** | `src/modules/resilience/HealthMonitor.ts` | Continuous service health tracking |
| **Failover Orchestrator** | `src/modules/resilience/FailoverOrchestrator.ts` | Automated failover coordination |
| **Dead Letter Queues** | `src/modules/synchronization/queues/DeadLetterQueue.ts` | Failed message capture |
| **Retry Queues** | `src/modules/synchronization/queues/RetryQueue.ts` | Automatic message retry |
| **Disaster Recovery** | `src/modules/disaster-recovery/` | RTO/RPO validation & failover testing |

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** with conventional commits: `git commit -m 'feat: add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

> **Note**: Direct pushes to `main` are blocked. All changes must go through pull requests. Commits are validated with `commitlint` for conventional commit format.

---

## 📄 License

This project is proprietary software. All rights reserved.

---

<p align="center">
  <sub>Built with ❤️ by the <strong>Stayflexi</strong> team</sub>
</p>
<p align="center">
  <sub>12 Microservices · 33 Domain Modules · 21 Containers · Production-Ready</sub>
</p>
