# Stayflexi Service Dependency Map

## Service Ports

| Service              | Port | Kafka Consumer Group      |
|----------------------|------|---------------------------|
| auth-service         | 3001 | auth-service              |
| organization-service | 3002 | organization-service      |
| hotel-service        | 3003 | hotel-service             |
| inventory-service    | 3004 | inventory-service         |
| booking-service      | 3005 | booking-service           |
| payment-service      | 3006 | payment-service           |
| ota-service          | 3007 | ota-service               |
| analytics-service    | 3008 | analytics-service         |
| notification-service | 3009 | notification-service      |
| workflow-service     | 3010 | workflow-service          |
| api-gateway          | 8080 | —                         |

## Dependency Graph

```
api-gateway
├── auth-service          (JWT validation, session cache)
├── organization-service  (tenant context)
├── hotel-service         (property management)
├── inventory-service     (room availability)
│   └── depends: hotel-service (room types)
├── booking-service       (reservations)
│   ├── depends: inventory-service (availability locks)
│   └── depends: auth-service (user validation)
├── payment-service       (financial transactions)
│   └── depends: booking-service (booking reference)
├── ota-service           (channel manager)
│   └── depends: inventory-service (availability sync)
├── analytics-service     (reporting, dashboards)
│   ├── depends: booking-service (events)
│   └── depends: payment-service (revenue events)
├── notification-service  (multi-channel messaging)
│   └── depends: booking-service (booking events)
└── workflow-service      (automation engine)
    ├── depends: booking-service (trigger events)
    ├── depends: payment-service (trigger events)
    └── depends: notification-service (workflow actions)
```

## Kafka Event Flow

```
booking.created ──────────────────────────────────────────────────
  → payment-service (consumer: flag booking for payment)
  → inventory-service (consumer: confirm reservation hold)
  → notification-service (consumer: send confirmation email)
  → workflow-service (consumer: trigger booking workflow)
  → analytics-service (consumer: increment booking KPIs)

payment.completed ────────────────────────────────────────────────
  → booking-service (consumer: mark booking as CONFIRMED)
  → analytics-service (consumer: update revenue metrics)
  → notification-service (consumer: send payment receipt)

booking.cancelled ────────────────────────────────────────────────
  → payment-service (consumer: flag for refund if payment exists)
  → inventory-service (consumer: release room hold)
  → notification-service (consumer: send cancellation notice)
  → analytics-service (consumer: update cancellation metrics)

inventory.reserved ───────────────────────────────────────────────
  → ota-service (consumer: update channel availability)
  → analytics-service (consumer: update occupancy metrics)

ota.sync.completed ───────────────────────────────────────────────
  → analytics-service (consumer: update OTA metrics)

notification.sent ────────────────────────────────────────────────
  → workflow-service (consumer: advance step in workflow)

workflow.completed ───────────────────────────────────────────────
  → analytics-service (consumer: log automation execution)
```

## Shared Infrastructure Dependencies

| Service | PostgreSQL | Redis | Kafka |
|---------|-----------|-------|-------|
| All services | ✓ (shared DB, separate schemas) | ✓ | ✓ (when KAFKA_ENABLED=true) |

### Redis Key Namespaces

| Service | Prefix Pattern |
|---------|---------------|
| auth-service | `stayflexi:session:*`, `stayflexi:brute:*` |
| inventory-service | `stayflexi:lock:inventory:*`, `stayflexi:inventory:*` |
| booking-service | `stayflexi:lock:booking:*`, `stayflexi:booking:*`, `stayflexi:idempotency:booking:*` |
| payment-service | `stayflexi:lock:payment:*`, `stayflexi:payment:*`, `stayflexi:idempotency:payment:*` |
| ota-service | `stayflexi:ota:sync:*`, `stayflexi:lock:ota:*` |
| analytics-service | `stayflexi:analytics:*` |
| notification-service | `stayflexi:notification:dedup:*`, `stayflexi:notification:retry:*` |
| workflow-service | `stayflexi:workflow:exec:*`, `stayflexi:workflow:lock:*`, `stayflexi:workflow:idempotency:*` |

## Startup Order for Local Development

```bash
# 1. Infrastructure
docker compose up -d postgres redis

# 2. Optional: Kafka
docker compose up -d zookeeper kafka

# 3. Run Prisma migrations
npm run db:migrate

# 4. Start services (profile "services")
docker compose --profile services up -d
```
