<p align="center">
  <h1 align="center">🏨 Stayflexi</h1>
  <p align="center">
    <strong>Enterprise-Grade Hospitality Management Platform</strong>
  </p>
  <p align="center">
    A cloud-native, event-driven microservices platform for modern hotel operations, built with TypeScript, Kafka, and PostgreSQL.
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Kafka-Event%20Mesh-231F20?style=for-the-badge&logo=apachekafka&logoColor=white" alt="Kafka" />
  <img src="https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
</p>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Microservices](#microservices)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

---

## 🌟 Overview

**Stayflexi** is a full-featured hospitality management platform designed for hotels, resorts, and property chains. It provides end-to-end management of:

- 🛏️ **Room Inventory & Availability** — Real-time room management across properties
- 📅 **Bookings & Reservations** — Multi-channel booking engine with conflict resolution
- 💰 **Dynamic Pricing** — AI-powered revenue management and rate optimization
- 🌐 **OTA Channel Management** — Two-way sync with Booking.com, Expedia, and more
- 💳 **Payment Processing** — PCI-compliant payment handling with multi-gateway support
- 📊 **Analytics & Reporting** — Real-time dashboards and business intelligence
- 🔔 **Notifications** — Multi-channel alerts (email, SMS, push)
- 🔄 **Workflow Automation** — Configurable business process engine
- 👥 **Multi-Tenant Architecture** — Organization-level data isolation

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Web Application                       │
│                   (Next.js Frontend)                      │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                   API Gateway                            │
│          (Rate Limiting · Auth · Routing)                 │
└──────────────────────┬──────────────────────────────────┘
                       │
    ┌──────────────────┼──────────────────────┐
    │                  │                      │
    ▼                  ▼                      ▼
┌────────┐    ┌─────────────┐    ┌──────────────────┐
│  Auth  │    │   Booking   │    │  Organization    │
│Service │    │   Service   │    │    Service       │
└────────┘    └─────────────┘    └──────────────────┘
    │                  │                      │
    ▼                  ▼                      ▼
┌────────────────────────────────────────────────────────┐
│                 Apache Kafka (Event Mesh)                │
│            Async Communication · Event Sourcing          │
└────────────────────────┬───────────────────────────────┘
                         │
    ┌────────────────────┼────────────────────────┐
    │                    │                        │
    ▼                    ▼                        ▼
┌──────────┐    ┌──────────────┐    ┌──────────────────┐
│ Payment  │    │  Analytics   │    │  Notification    │
│ Service  │    │   Service    │    │    Service       │
└──────────┘    └──────────────┘    └──────────────────┘
                         │
┌────────────────────────▼───────────────────────────────┐
│              PostgreSQL (Primary + Replica)              │
│         PgBouncer (Connection Pooling) · Redis           │
└────────────────────────────────────────────────────────┘
```

### Key Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Communication** | Kafka Event Mesh | Async decoupling, event sourcing, replay capability |
| **Database** | PostgreSQL 16 + Read Replicas | ACID compliance, JSONB support, mature ecosystem |
| **Connection Pooling** | PgBouncer | Reduces connection overhead across 12 microservices |
| **Caching** | Redis 7 | Session management, rate limiting, distributed locks |
| **ORM** | Prisma | Type-safe queries, auto-migrations, schema-first design |
| **Language** | TypeScript | End-to-end type safety across all services |

---

## 🔧 Microservices

| # | Service | Port | Description |
|---|---------|------|-------------|
| 1 | **auth-service** | 3001 | Authentication, JWT tokens, RBAC, session management |
| 2 | **organization-service** | 3002 | Multi-tenant organization & property management |
| 3 | **hotel-service** | 3003 | Hotel property configuration & room types |
| 4 | **inventory-service** | 3004 | Real-time room inventory & availability tracking |
| 5 | **booking-service** | 3005 | Reservation lifecycle management |
| 6 | **payment-service** | 3006 | Payment processing & financial transactions |
| 7 | **ota-service** | 3007 | OTA channel synchronization (Booking.com, Expedia) |
| 8 | **analytics-service** | 3008 | Reporting, dashboards & business intelligence |
| 9 | **notification-service** | 3009 | Email, SMS & push notification delivery |
| 10 | **workflow-service** | 3010 | Business process automation engine |
| 11 | **pricing-engine-service** | 3011 | Dynamic pricing & rate optimization |
| 12 | **revenue-management-service** | 3012 | Revenue forecasting & yield management |

### Platform Components

| Component | Description |
|-----------|-------------|
| **api-gateway** | Central entry point — routing, rate limiting, auth middleware |
| **web-app** | Next.js frontend application |
| **worker** | Background job processor for async tasks |

---

## 🛠️ Tech Stack

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20+ | Runtime environment |
| TypeScript | 5.x | Type-safe development |
| Express.js | 4.x | HTTP framework |
| Prisma | Latest | ORM & database toolkit |
| Kafka.js | Latest | Event streaming client |
| Zod | Latest | Runtime schema validation |

### Infrastructure
| Technology | Version | Purpose |
|------------|---------|---------|
| PostgreSQL | 16 | Primary database |
| PgBouncer | Latest | Connection pooling |
| Apache Kafka | 7.5 | Event mesh / message broker |
| Redis | 7 | Caching & session store |
| Docker | Latest | Containerization |
| Docker Compose | Latest | Local orchestration |

### Frontend
| Technology | Purpose |
|------------|---------|
| Next.js | React framework with SSR |
| TailwindCSS | Utility-first CSS |
| TypeScript | Type-safe components |

---

## 📁 Project Structure

```
stayflexy/
├── services/                    # Microservices
│   ├── auth-service/            # Authentication & authorization
│   ├── organization-service/    # Organization management
│   ├── hotel-service/           # Hotel property management
│   ├── inventory-service/       # Room inventory
│   ├── booking-service/         # Reservation management
│   ├── payment-service/         # Payment processing
│   ├── ota-service/             # OTA channel sync
│   ├── analytics-service/       # Analytics & reporting
│   ├── notification-service/    # Notifications
│   ├── workflow-service/        # Workflow automation
│   ├── pricing-engine-service/  # Dynamic pricing
│   └── revenue-management-service/ # Revenue management
├── infrastructure/
│   ├── gateway/                 # API Gateway
│   ├── event-bus/               # Kafka event bus abstraction
│   ├── observability/           # Logging, metrics, tracing
│   ├── secrets/                 # Secret management
│   ├── service-discovery/       # Service registry
│   ├── deployment/              # Helm charts & production configs
│   └── kubernetes/              # K8s manifests
├── packages/
│   └── shared-auth/             # Shared authentication library
├── platform-validation/         # Chaos engineering & DR validation
├── src/
│   ├── modules/                 # Domain modules
│   └── tests/                   # Integration & E2E tests
├── docs/
│   ├── architecture/            # Architecture documentation
│   └── runbooks/                # Operational runbooks
├── docker-compose.yml           # Local development orchestration
├── prisma/                      # Database schema & migrations
└── turbo.json                   # Turborepo monorepo config
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 20.x
- **Docker Desktop** (with Docker Compose)
- **Git**

### 1. Clone the Repository

```bash
git clone git@github.com:sathish1812kh-hub/stayflexy.git
cd stayflexy
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 4. Start Infrastructure

```bash
docker compose up -d
```

### 5. Run Database Migrations

```bash
npx prisma migrate deploy
npx prisma generate
```

### 6. Start All Services

```bash
docker compose --profile services up -d
```

### 7. Verify Health

```bash
# Check all containers are running
docker compose ps

# Test API Gateway
curl http://localhost:3000/health
```

---

## 🔐 Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `KAFKA_BROKERS` | Kafka broker addresses | `localhost:29092` |
| `JWT_SECRET` | JWT signing secret | — |
| `JWT_REFRESH_SECRET` | Refresh token secret | — |
| `STRIPE_SECRET_KEY` | Stripe payment key | — |
| `SMTP_HOST` | Email server host | — |
| `NODE_ENV` | Environment | `development` |

> ⚠️ **Never commit `.env` files.** Use `.env.example` as a template.

---

## 🐳 Deployment

### Docker Compose (Development)

```bash
# Start everything
docker compose --profile services up -d

# View logs
docker compose logs -f [service-name]

# Stop everything
docker compose down
```

### Production (Kubernetes)

```bash
# Apply Kubernetes manifests
kubectl apply -f infrastructure/kubernetes/

# Or use Helm
helm install stayflexi infrastructure/deployment/helm/ \
  -f infrastructure/deployment/helm/values.production.yaml
```

---

## 📖 API Documentation

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `POST /api/v1/auth/login` | User authentication |
| `POST /api/v1/auth/register` | User registration |
| `GET /api/v1/hotels` | List hotels |
| `GET /api/v1/inventory` | Room availability |
| `POST /api/v1/bookings` | Create booking |
| `GET /api/v1/analytics/dashboard` | Analytics dashboard |

Full API documentation available at `/api/docs` when running locally.

---

## 🧪 Testing

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Test coverage
npm run test:coverage
```

---

## 📊 Monitoring & Observability

| Tool | Purpose |
|------|---------|
| **Structured Logging** | JSON logs with correlation IDs |
| **Distributed Tracing** | Request tracing across services |
| **Health Checks** | `/health` endpoints on every service |
| **Metrics** | Prometheus-compatible metrics |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is proprietary software. All rights reserved.

---

<p align="center">
  Built with ❤️ by the <strong>Stayflexi</strong> team
</p>
