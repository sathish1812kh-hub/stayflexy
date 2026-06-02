# Service Degradation Playbook — Stayflexi v2.0.0

> Owner: Platform Engineering / SRE  
> Last updated: 2026-05-18  
> Related: `docs/runbooks/incident-response.md`, `docs/architecture/RESILIENCE.md`

---

## Overview

This playbook defines how each service behaves when its dependencies fail and what operational actions to take. The guiding principle is **fail gracefully, fail open where safe, fail closed where data integrity requires it**.

---

## 1. Graceful Degradation Modes

### booking-service

| Dependency | Failure Mode | Service Behavior | Operator Action |
|-----------|-------------|-----------------|----------------|
| **Redis (down)** | `RedisDistributedLock.acquire()` returns null | Booking creation fails with 409 `LOCK_CONFLICT` — no overbooking risk from concurrent creates, but throughput drops to ~1 concurrent booking per room | Alert on-call (P1); scale down booking-service to 1 replica to reduce conflict risk; restore Redis urgently |
| **Redis (partial — slow)** | Lock acquisition retries (exponential backoff up to 5 retries × 200ms base) | Booking p95 latency increases; timeouts possible after ~3s | Monitor lock wait histogram; investigate Redis slow log |
| **Kafka (down)** | `eventPublisher.publish()` rejects with connection error; caught in `.catch()` handler in `CreateBooking.ts` line 139 | Booking still created in PostgreSQL; `booking.created` event not published; downstream services (notification, analytics, workflow) do not receive event | Alert on-call (P2); manually trigger notification for bookings created during outage once Kafka recovers; Kafka consumer will process events from WAL on recovery |
| **PostgreSQL (down)** | Prisma throws `P1001` connection error | All booking operations fail with 503 | P0 incident; execute Scenario 1 in `platform-validation/reports/checklists/recovery.md` |
| **inventory-service (down)** | HTTP call to check availability fails; circuit breaker trips after 5 failures | `CreateBooking` cannot verify inventory; throws 503 | Reject new bookings gracefully with `"Inventory service temporarily unavailable"` |

**Overbooking Risk Protocol:** If Redis is down for > 5 minutes:
1. Page on-call immediately (P1 escalation)
2. Optionally: put booking-service in read-only mode via feature flag `BOOKING_READONLY=true`
3. Manual review required for all bookings created during the Redis outage window to check for overbookings

---

### payment-service

| Dependency | Failure Mode | Service Behavior | Operator Action |
|-----------|-------------|-----------------|----------------|
| **Redis (idempotency store down)** | `markProcessing()` fails; falls back to allow request through | Duplicate payment risk increases; idempotency not guaranteed | Alert (P2); monitor for duplicate payment events; manual reconciliation may be needed |
| **Kafka (down)** | `payment.confirmed` event not published | Payment stored in DB; downstream (notification, analytics) not notified | Alert (P2); events will re-publish once Kafka recovers if retry logic is in place |
| **PostgreSQL (down)** | All payment operations fail | All payment endpoints return 503 | P0 incident |
| **External payment gateway (down)** | HTTP call fails; circuit breaker trips | `InitiatePayment` returns 503 with `PAYMENT_GATEWAY_UNAVAILABLE` | Alert (P1); notify customer support; implement fallback gateway if configured |
| **External payment gateway (slow)** | HTTP call exceeds timeout (30s) | `ConfirmPayment` times out; payment may be in undefined state | Check payment gateway status page; query gateway for transaction status using stored reference ID |

---

### notification-service

| Dependency | Failure Mode | Service Behavior | Operator Action |
|-----------|-------------|-----------------|----------------|
| **Email provider (SendGrid/SES) down** | `EmailProvider.send()` throws | Notification marked `FAILED`; `NotificationRetryWorker` retries with exponential backoff (3 attempts over 1h) | Alert after 3 failures (`services/notification-service/src/workers/NotificationRetryWorker.ts`); check provider status page; switch to backup provider if configured |
| **SMS provider down** | `SmsProvider.send()` throws | Same retry behavior as email | Alert; check Twilio/provider status; fallback to email if SMS fails and email address exists |
| **Push provider (FCM/APNs) down** | `PushProvider.send()` throws | Same retry behavior | Push is non-critical; downgrade to P3 if email/SMS working |
| **Redis (dedup) down** | `checkDedup()` returns false (fail-open in `NotificationCache.ts`) | Notifications may be sent as duplicates | Alert (P2); monitor for complaints; Redis usually recovers quickly |
| **Kafka (consumer) down** | Consumer group not consuming | Notification events accumulate in Kafka topic; delivered after consumer recovers | Alert when consumer lag > 1000; restart consumer; catch up will happen automatically |
| **PostgreSQL (down)** | Cannot store notification record | Notification dispatch blocked | P0 incident |

**Retry Schedule:** `NotificationRetryWorker` polls every 5 minutes for `FAILED` notifications within last 24 hours with `retryCount < 3`. Backoff: attempt 1 = immediate, attempt 2 = 15 min delay, attempt 3 = 60 min delay.

---

### analytics-service

| Dependency | Failure Mode | Service Behavior | Operator Action |
|-----------|-------------|-----------------|----------------|
| **booking-service (down)** | Cannot fetch booking data for live queries | Returns cached aggregates from last successful computation (`stayflexi:analytics:snapshot:<org>:<period>` with 300s TTL) | Alert (P3); analytics data will be stale until booking-service recovers; acceptable degradation |
| **PostgreSQL read replica (down)** | Queries fail | Falls back to primary database if connection string supports read/write split | Alert; failover replica; reduce analytics query frequency to not overload primary |
| **PostgreSQL primary (down)** | All queries fail | Analytics endpoints return 503 | P0 incident |
| **Kafka (consumer) down** | Real-time metric updates stop | Snapshot data stale; `AggregationWorker` not updating | Alert (P2); catch up after Kafka recovery |
| **Redis (cache) down)** | `AnalyticsCache.get()` throws; fail-open | Every analytics request hits PostgreSQL directly | Alert (P2); database load will spike; consider circuit breaker on analytics queries |

---

### inventory-service

| Dependency | Failure Mode | Service Behavior | Operator Action |
|-----------|-------------|-----------------|----------------|
| **PostgreSQL (down)** | All availability checks fail | All `GET /availability` return 503 | P0; booking-service circuit breaker will trip after 5 failures |
| **Kafka (consumer) down** | Inventory reservation events not processed | Available inventory count becomes stale | Alert (P2); events queued in Kafka; will process on recovery |

---

## 2. Feature Flags (Operational Toggles)

Feature flags are set as environment variables in the ConfigMap or as Kubernetes Secrets and take effect on rolling restart. For hot-reload without restart, use the distributed config service at `infrastructure/distributed-config/`.

| Flag | Default | Effect When Enabled | Use Case |
|------|---------|---------------------|---------|
| `BOOKING_READONLY=true` | false | Booking creation returns 503 `SERVICE_READONLY`; reads still work | Redis outage with overbooking risk; scheduled maintenance |
| `OTA_SYNC_DISABLED=true` | false | OTA sync jobs do not start; existing bookings unaffected | External OTA API outage; OTA service maintenance |
| `NOTIFICATIONS_DISABLED=true` | false | All notification dispatch skipped; events consumed and discarded | Provider outage; notification content emergency (wrong template) |
| `ANALYTICS_LIVE_QUERIES=false` | true | Analytics returns cached snapshots only; no live DB queries | Analytics query load causing DB pressure |
| `PAYMENT_GATEWAY_FALLBACK=stripe` | primary | Routes payments to fallback gateway | Primary gateway outage |
| `RATE_LIMIT_REQUESTS_PER_MINUTE=50` | 100 | Halves gateway rate limit | DDoS mitigation; traffic spike protection |

**How to set a feature flag:**
```bash
# 1. Update ConfigMap
kubectl patch configmap stayflexi-config -n stayflexi \
  --type=merge -p '{"data":{"BOOKING_READONLY":"true"}}'

# 2. Rolling restart to pick up (or use distributed config for hot-reload)
kubectl rollout restart deployment/booking-service -n stayflexi

# 3. Verify flag active in pod
kubectl exec deployment/booking-service -n stayflexi -- \
  sh -c 'echo $BOOKING_READONLY'
```

---

## 3. Traffic Shedding

### Gateway Rate Limit Adjustment

Reduce rate limits when the platform is under stress to protect core services:

```bash
# Temporary: reduce to 50 req/min per IP (emergency traffic shed)
kubectl patch configmap stayflexi-config -n stayflexi \
  --type=merge -p '{"data":{"RATE_LIMIT_REQUESTS_PER_MINUTE":"50","RATE_LIMIT_WINDOW_MS":"60000"}}'

kubectl rollout restart deployment/api-gateway -n stayflexi
```

### 503 Response with Retry-After Header

The gateway returns a proper `503 Service Unavailable` with `Retry-After: 60` header when rate-limited or in maintenance mode. Clients should respect this header and not retry immediately.

```typescript
// infrastructure/gateway/src/middleware/rateLimit.ts behavior:
// count > maxRequests → 429 with x-ratelimit headers
// BOOKING_READONLY=true → booking-service returns 503 with Retry-After
```

### Nginx Ingress Traffic Shedding

For extreme load, configure nginx-ingress to return 503 directly:
```bash
kubectl annotate ingress stayflexi-ingress -n stayflexi \
  nginx.ingress.kubernetes.io/server-snippet='
    location /api/v1/bookings {
      limit_req zone=booking_zone burst=10 nodelay;
      limit_req_status 503;
    }'
```

---

## 4. Health Check Interpretation

Each service exposes three health endpoints:

| Endpoint | Purpose | Kubernetes Probe |
|----------|---------|-----------------|
| `GET /health/live` | Process is alive (not deadlocked) | `livenessProbe` |
| `GET /health/ready` | Service can handle traffic (dependencies available) | `readinessProbe` |
| `GET /health/status` | Full diagnostic (version, uptime, dep status) | Manual inspection |

### What `/health/ready` Checks Per Service

| Service | Ready Check | Degraded Response |
|---------|------------|------------------|
| `booking-service` | `SELECT 1` on PostgreSQL (from `services/booking-service/src/health.ts`) | 503 if DB unreachable; stops receiving traffic |
| `auth-service` | `SELECT 1` on PostgreSQL; Redis PING | 503 if either unreachable |
| `payment-service` | PostgreSQL `SELECT 1` | 503 if DB unreachable |
| `inventory-service` | PostgreSQL `SELECT 1` | 503 if DB unreachable |
| `notification-service` | PostgreSQL `SELECT 1`; Redis PING | 503 if either unreachable |
| `analytics-service` | PostgreSQL read replica `SELECT 1` | 503 if replica unreachable |
| `ota-service` | PostgreSQL `SELECT 1`; Redis PING | 503 if either unreachable |
| `api-gateway` | Self-check; tests one backend service | 503 if gateway itself misconfigured |

### Actions When a Service Reports `not ready`

1. Check what the service logged at shutdown time: `kubectl logs <pod> -n stayflexi --previous`
2. Check if the dependency (PostgreSQL/Redis) is available from within the pod
3. If the readiness failure is transient (network blip), the pod will recover automatically
4. If persistent > 5 minutes: investigate root cause; consider rolling restart
5. `readinessProbe.failureThreshold: 3` means a pod is removed from the load balancer after 3 consecutive readiness failures (30 seconds at 10s interval)

### Manual Health Check

```bash
# Check all service health endpoints at once
for svc in auth organization hotel inventory booking payment ota analytics notification workflow; do
  echo -n "$svc: "
  kubectl exec deployment/api-gateway -n stayflexi -- \
    curl -s --max-time 3 http://${svc}-service:$(get-port $svc)/health/ready | jq -r '.status // "ERROR"'
done
```

---

## 5. Dependency Graph and Isolation

```
External Clients
      ↓
api-gateway (8080)
      ↓
auth-service (3001) ← validates every JWT
      ↓ (parallel)
┌─────────────────────────────────────────┐
│  booking-service (3005)                 │
│    → inventory-service (3004) [sync]    │
│    → payment-service (3006) [async]     │
│    → Kafka: booking.events              │
└─────────────────────────────────────────┘
      ↓ (Kafka consumers)
notification-service (3009)
analytics-service (3008)
workflow-service (3010)
ota-service (3007)
```

**Circuit breaker thresholds** (from `docs/architecture/RESILIENCE.md`):
- 5 consecutive failures → OPEN (30s timeout before HALF_OPEN probe)
- All inter-service HTTP calls wrapped in `CircuitBreaker` from `platform-validation/src/resilience/CircuitBreaker.ts`
- Circuit open state returns cached fallback or 503 immediately without waiting for timeout
