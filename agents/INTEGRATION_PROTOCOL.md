# Integration Protocol

## Cross-Service Communication Contract

All service-to-service communication must use one of two approved channels:

### 1. Synchronous: ServiceHttpClient
```typescript
import { ServiceHttpClient } from '@stayflexi/shared-types'

const client = new ServiceHttpClient({
  baseUrl: process.env['SERVICE_INVENTORY_URL'] ?? 'http://inventory-service:3004',
  serviceKey: config.SERVICE_KEY,
  timeoutMs: 10_000,
  maxRetries: 3,
})

const result = await client.get<AvailabilityResult>('/api/v1/inventory/availability', {
  correlationId: req.headers['x-correlation-id'] as string,
  organizationId: req.user?.organizationId ?? undefined,
})
```

### 2. Asynchronous: Kafka Events
```typescript
await eventPublisher.publish('booking.events', {
  eventType: BOOKING_EVENTS.BOOKING_CREATED,
  aggregateId: booking.id,
  aggregateType: 'Booking',
  organizationId: booking.organizationId,
  correlationId: correlationId,
  payload: { bookingId: booking.id, ... },
})
```

**PROHIBITED patterns:**
- Direct Prisma queries to another service's models
- Shared in-memory state between services
- Hardcoded service URLs (use environment variables + configmap)

---

## Inter-Service Header Propagation

Every service-to-service HTTP call must forward:
```
X-Correlation-Id:   {from incoming request or generated}
X-Organization-Id:  {tenant context}
X-User-Id:          {acting user, if available}
X-User-Role:        {user role, if available}
X-Service-Key:      {service authentication key}
```

These are automatically handled by `ServiceHttpClient` when fields are provided.

---

## Event Publishing Contract

Before publishing any event, validate:
1. `eventId` is a UUIDv4 (use `randomUUID()` from 'crypto')
2. `timestamp` is ISO 8601 (`new Date().toISOString()`)
3. `organizationId` is non-null (no system-wide events without org context, except DLQ)
4. `payload` validates against the Zod schema for that event type
5. `version` is 1 for new event types, incremented only on breaking changes

---

## Service Health Contract

All services must implement:
```
GET /health/live    → 200 OK {"status":"ok"} (liveness: is process running?)
GET /health/ready   → 200 OK {"status":"ok"} (readiness: can serve traffic?)
                    → 503 {"status":"not-ready","checks":{...}} if dependency is down
GET /metrics        → 200 text/plain Prometheus format
```

Readiness checks must verify:
- Database connectivity (Prisma `$queryRaw`)
- Redis connectivity (`redis.ping()`)

---

## Deployment Integration Sequence

```bash
# Step 1: Pre-flight checks
prisma validate
tsc --noEmit  # all services
jest          # all services

# Step 2: Infrastructure
kubectl apply -f infrastructure/kubernetes/namespace.yaml
kubectl apply -f infrastructure/kubernetes/secrets/
kubectl apply -f infrastructure/kubernetes/configmap.yaml
kubectl apply -f infrastructure/kubernetes/rbac.yaml
kubectl apply -f infrastructure/kubernetes/network-policies.yaml

# Step 3: Database migration (blocking)
kubectl apply -f infrastructure/kubernetes/jobs/prisma-migrate.yaml
kubectl wait --for=condition=complete job/prisma-migrate -n stayflexi --timeout=300s

# Step 4: Kafka topic setup
kubectl apply -f infrastructure/kubernetes/jobs/kafka-topic-setup.yaml
kubectl wait --for=condition=complete job/kafka-topic-setup -n stayflexi --timeout=120s

# Step 5: Deploy services (tiered)
# Tier 1
kubectl apply -f infrastructure/kubernetes/services/auth-service.yaml
kubectl apply -f infrastructure/kubernetes/services/organization-service.yaml
kubectl rollout status deployment/auth-service -n stayflexi
kubectl rollout status deployment/organization-service -n stayflexi

# Tier 2-4 (continue as per DEPLOYMENT_RUNBOOK.md)

# Step 6: Validation
for port in 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010; do
  curl -sf http://localhost:$port/health/ready || (echo "FAILED: port $port" && exit 1)
done
```

---

## Distributed Consistency Validation Matrix

| Operation | Consistency Requirement | Mechanism |
|-----------|------------------------|-----------|
| Booking creation | Inventory reserved before booking confirmed | Distributed lock + saga |
| Payment initiated | Booking must exist | FK constraint + event check |
| Inventory released | On booking cancel (not before) | Kafka consumer |
| Refund issued | Total refunds ≤ original payment | Lock + re-read inside lock |
| OTA sync | One sync job per hotel per time window | Distributed lock |
| Analytics aggregation | Idempotent per hotel+date | Unique constraint |
| Notification send | Deduplicated per recipient+content | Redis NX + SHA-256 hash |
| Workflow execution | One execution per idempotency key | Unique constraint |

---

## Observability Integration Requirements

All services must produce:

```
Traces:  booking.create span → inventory.reserve child span → db.write child span
         All HTTP outbound calls automatically traced via OTel auto-instrumentation

Metrics: http_requests_total{service, method, status_code, path}
         http_request_duration_seconds (histogram with buckets)

Logs:    {level, message, service, correlationId, timestamp, ...contextFields}
         Correlation ID from X-Correlation-Id header, generated if absent
```

---

## Rollback Decision Tree

```
Deployment fails (health check fails within 5 minutes):
  │
  ├─► Is it a migration issue?
  │     YES → database-prisma-agent: assess migration rollback safety
  │           If safe: prisma migrate resolve --rolled-back {migration-id}
  │           If unsafe: hotfix forward (never rollback data migrations)
  │
  ├─► Is it a service startup issue?
  │     YES → kubectl rollout undo deployment/{service-name} -n stayflexi
  │
  ├─► Is it a Kafka consumer issue?
  │     YES → kafka-event-agent: check consumer lag, DLQ count
  │           Scale down consumer, fix code, redeploy, replay from DLQ
  │
  └─► Is it a cross-service contract break?
        YES → integration-governance-agent: identify which service changed
              Rollback that service only, investigate compatibility
```
