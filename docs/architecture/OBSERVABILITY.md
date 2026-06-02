# Observability Architecture — Stayflexi v2.0.0

> Last updated: 2026-05-18  
> Stack: Prometheus + Grafana + Loki + Jaeger + OpenTelemetry + Alertmanager

---

## Overview

Stayflexi v2.0.0 uses a full observability stack providing metrics, distributed tracing, structured logging, and alerting across all 11 microservices. The observability infrastructure is codified in `infrastructure/observability/`.

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        Observability Stack                                 │
│                                                                            │
│  Services ──/metrics──► Prometheus ──► Grafana Dashboards                 │
│  Services ──traces───► Jaeger Collector ──► Jaeger Query UI               │
│  Services ──logs─────► Loki (via Promtail) ──► Grafana Log Explorer       │
│                                                                            │
│  Prometheus ──────────► Alertmanager ──► PagerDuty (Critical)             │
│                                     ──► Slack (Warning/Info)              │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Metrics Collection

### Architecture

All 11 services expose a Prometheus-compatible `/metrics` endpoint using the `MetricsRegistry` from `infrastructure/observability/src/metrics.ts`. The registry:
- Implements `Counter`, `Histogram`, and `Gauge` interfaces
- Serializes to Prometheus text format via `toPrometheusText()`
- Uses `createHttpMetricsMiddleware()` to automatically instrument all HTTP requests with `http_requests_total` and `http_request_duration_seconds` histograms

### Prometheus Scrape Configuration

Prometheus discovers scrape targets via Kubernetes pod annotations:
```yaml
# In every service deployment manifest (e.g., infrastructure/kubernetes/services/booking-service/deployment.yaml)
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "3005"       # Service-specific port
  prometheus.io/path: "/metrics"
```

Prometheus scrape interval: `15s`  
Retention: `15 days` (local); long-term storage via Thanos/Cortex recommended for > 15 days

### Custom Metrics Per Domain

**booking-service (port 3005)**
- `booking_creation_total{status}` — counter: bookings created, conflicted, or failed
- `booking_lock_acquisition_total{result}` — counter: Redis distributed lock outcomes
- `booking_lock_wait_duration_seconds` — histogram: time spent waiting for lock (from `services/booking-service/src/infrastructure/locking/RedisDistributedLock.ts`)
- `booking_saga_completion_total{status}` — counter: saga success/rollback rate

**inventory-service (port 3004)**
- `inventory_cache_hit_total{result}` — counter: Redis cache hits vs. misses
- `inventory_cache_hit_ratio` — gauge: rolling hit rate (updated every minute)
- `inventory_availability_query_duration_seconds` — histogram: DB query performance

**payment-service (port 3006)**
- `payment_processing_total{status, method}` — counter: payment outcomes by provider
- `payment_amount_total{currency, method}` — counter: total payment volume
- `payment_idempotency_hit_total` — counter: dedup key hits preventing double charges

**auth-service (port 3001)**
- `auth_attempts_total{result}` — counter: login success/failure/blocked by `BruteForceProtector`
- `token_refresh_total{result}` — counter: refresh token operations

**notification-service (port 3009)**
- `notification_delivery_total{channel, status}` — counter: delivery outcomes per channel
- `notification_delivery_duration_seconds{channel}` — histogram: provider response times
- `notification_retry_queue_depth` — gauge: pending retry count

**Kafka metrics (all consumer services)**
- `kafka_consumer_lag{topic, partition, group}` — gauge: consumer lag per partition
- `kafka_messages_consumed_total{topic, group, status}` — counter
- `kafka_messages_produced_total{topic, status}` — counter

---

## Distributed Tracing

### OpenTelemetry SDK Initialization

All services call `initTracer(serviceName, options)` from `infrastructure/observability/src/tracer.ts` at startup, before any request handling:

```typescript
// Example: services/booking-service/src/main.ts
import { initTracer } from '@stayflexi/observability'

initTracer('booking-service', {
  jaegerEndpoint: process.env.JAEGER_ENDPOINT ?? 'http://jaeger:14268/api/traces',
  enabled: process.env.NODE_ENV !== 'test',
})
```

### Auto-instrumentation

The NodeSDK auto-instrumentations enabled in `tracer.ts`:
- `@opentelemetry/instrumentation-http`: captures all inbound/outbound HTTP spans
- `@opentelemetry/instrumentation-express`: adds route-level span names
- `@opentelemetry/instrumentation-pg`: captures PostgreSQL queries (via Prisma's pg driver)
- `@opentelemetry/instrumentation-ioredis`: captures all Redis commands

### Manual Span Instrumentation

For business-critical operations not covered by auto-instrumentation, use `withSpan()`:

```typescript
import { withSpan } from '@stayflexi/observability'

// Wrapping a booking saga
const result = await withSpan(
  'booking.saga.execute',
  { 'booking.id': bookingId, 'hotel.id': hotelId },
  async () => await saga.execute(dto, ctx)
)
```

Kafka produce/consume operations are wrapped manually in the event publisher.

### Trace Propagation

The `x-correlation-id` header flows from client → gateway → all services. The gateway's tracing middleware (`infrastructure/gateway/src/middleware/tracing.ts`) maps this to the OpenTelemetry trace context, ensuring every span carries the same correlation ID.

The W3C `traceparent` header is automatically propagated via HTTP auto-instrumentation.

### Sampling Configuration

| Environment | Sampling Rate | Override |
|-------------|-------------|---------|
| Production | 10% (1 in 10) | `OTEL_TRACES_SAMPLER_ARG=0.1` |
| Staging | 100% | `OTEL_TRACES_SAMPLER_ARG=1.0` |
| Error responses (5xx) | 100% | Always sampled regardless of rate |
| Debug header | 100% | `x-force-trace: true` on request |

### Jaeger Backend

- Jaeger collector endpoint: `http://jaeger:14268/api/traces` (HTTPS in production: `https://jaeger:14268/api/traces`)
- Jaeger Query UI: `https://jaeger.internal.stayflexi.com`
- Trace retention: 7 days (configurable via `SPAN_STORAGE_TYPE` and storage backend)

---

## Centralized Logging

### Pino Configuration

All services use Pino (`@stayflexi/shared-logger`) with structured JSON output. The logger factory is in `infrastructure/observability/src/logger.ts`.

**Required log fields:**
```json
{
  "level": "info",
  "time": 1716048000000,
  "service": "booking-service",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "message": "Booking created successfully",
  "bookingId": "clx1234...",
  "bookingNumber": "BK-2026-001234"
}
```

**Redacted fields (never in logs):**
- `req.headers.authorization`
- `body.password`
- `body.currentPassword`
- `body.governmentIdNumber`
- `body.cardNumber`
- `body.cvv`

### Loki Log Aggregation

Promtail DaemonSet runs on every Kubernetes node, scraping pod logs from `/var/log/containers/` and shipping to Loki. Logs are labeled by:
- `namespace` (e.g., `stayflexi`)
- `app` (e.g., `booking-service`)
- `pod`

**Grafana LogQL queries for common investigations:**

```logql
# All errors from booking-service in last 15 minutes
{namespace="stayflexi", app="booking-service"} | json | level="error"

# Trace a single request by correlation ID across all services
{namespace="stayflexi"} | json | correlationId="550e8400-e29b-41d4-a716-446655440000"

# Count error rate by service (last 5 minutes)
sum by (app) (rate({namespace="stayflexi"} | json | level="error" [5m]))

# Find slow database queries
{namespace="stayflexi"} | json | message=~".*slow query.*" | dbDurationMs > 500
```

### Log Retention

| Tier | Storage | Retention |
|------|---------|-----------|
| Hot | Loki (local storage) | 30 days |
| Cold | Object storage (S3 via Loki compactor) | 90 days |
| Forensic hold | Object storage (legal hold) | Indefinitely (security incidents only) |

---

## Alert Routing

### Alertmanager Configuration

```yaml
# alertmanager.yml routing tree
route:
  group_by: ['alertname', 'service']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'slack-warning'

  routes:
  - match:
      severity: critical
    receiver: 'pagerduty-critical'
    group_wait: 10s
    repeat_interval: 1h

  - match:
      severity: warning
    receiver: 'slack-warning'

  - match:
      severity: info
    receiver: 'slack-info'

receivers:
- name: 'pagerduty-critical'
  pagerduty_configs:
  - service_key: '$PAGERDUTY_SERVICE_KEY'
    description: '{{ .CommonAnnotations.summary }}'
    details:
      runbook: '{{ .CommonAnnotations.runbook }}'

- name: 'slack-warning'
  slack_configs:
  - api_url: '$SLACK_WEBHOOK_URL'
    channel: '#alerts-warning'
    text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

- name: 'slack-info'
  slack_configs:
  - api_url: '$SLACK_WEBHOOK_URL'
    channel: '#alerts-info'
```

### Alert Rules

**Critical (PagerDuty):**

| Alert | Condition | Duration | Runbook |
|-------|-----------|----------|---------|
| `BookingAPIDown` | `up{job="booking-service"} == 0` | 1m | `docs/runbooks/incident-response.md` |
| `HighErrorRate` | error rate > 5% | 2m | `docs/runbooks/incident-response.md` |
| `BookingLatencyCritical` | p95 > 1000ms | 5m | Incident response — Pattern 1 |
| `PodCrashLoop` | `CrashLoopBackOff` | 5m | Incident response — Pattern 4 |
| `OOMKill` | OOMKilled event | 0m | `docs/runbooks/scaling-guide.md` |
| `ErrorBudgetBurn14x` | burn rate > 14.4× | 2m | Incident response — declare P0 |
| `DatabaseDown` | PostgreSQL unreachable | 1m | `platform-validation/reports/checklists/recovery.md` |

**Warning (Slack #alerts-warning):**

| Alert | Condition | Duration | Runbook |
|-------|-----------|----------|---------|
| `BookingLatencyWarning` | p95 > 500ms | 10m | `docs/runbooks/service-degradation.md` |
| `ErrorRateWarning` | error rate > 1% | 5m | `docs/runbooks/incident-response.md` |
| `CacheHitRateLow` | cache hit < 80% | 15m | `docs/runbooks/scaling-guide.md` |
| `KafkaConsumerLag` | lag > 1000 | 5m | `docs/runbooks/incident-response.md` — Pattern 4 |
| `DiskUsageHigh` | > 80% PVC capacity | 15m | `docs/runbooks/scaling-guide.md` |
| `RedisMemoryHigh` | > 80% maxmemory | 10m | `docs/runbooks/scaling-guide.md` |
| `PgBouncerPoolSaturation` | pool > 80% | 5m | `docs/runbooks/scaling-guide.md` |

---

## Dashboard Registry

All dashboards are stored as JSON in `infrastructure/observability/grafana/dashboards/` and imported via Grafana provisioning.

| Dashboard Name | UID | Purpose | Primary Panels |
|---------------|-----|---------|----------------|
| Platform Overview | `platform-overview` | Single-pane-of-glass across all services | Request rate, error rate, p95 latency, pod count |
| Booking Service | `booking-service` | Booking-specific metrics | Throughput, lock contention, saga rate, Redis lock wait |
| Payment Processing | `payment-processing` | Payment pipeline health | Success rate, provider latency, refund rate, idempotency hits |
| Inventory Availability | `inventory` | Room availability health | Cache hit ratio, query latency, block/unblock events |
| Notification Delivery | `notifications` | Notification pipeline | Delivery rate by channel, retry depth, provider uptime |
| SLO Burn Rate | `slo-burn-rate` | Error budget and SLO compliance | Error budget remaining, burn rate charts, SLO gauges |
| Infrastructure | `infrastructure` | Kubernetes node and pod resources | CPU/memory/disk, HPA events, OOMKill events |
| Redis Metrics | `redis` | Redis cluster health | Memory, hit rate, eviction, connections, slow log |
| Kafka Consumer Lag | `kafka` | Event processing health | Consumer lag per topic/group, DLQ depth, throughput |

---

## Correlation ID Flow

The `x-correlation-id` header ensures that a single client request can be traced across all services, log entries, and Kafka events.

```
Client Request
  → x-correlation-id: 550e8400-e29b-41d4-a716-446655440000 (provided or generated)

API Gateway (infrastructure/gateway/src/middleware/tracing.ts)
  → Generates UUID if absent
  → Sets req.correlationId
  → Forwards x-correlation-id to all proxied upstream requests

Each Service (services/*/src/middleware/correlation.ts)
  → Reads x-correlation-id from headers
  → Attaches to req.correlationId
  → Pino logger binds correlationId to all log entries in request scope
  → Returns x-correlation-id in response headers

Kafka Event Envelope (platform-validation/src/contracts/schemas/EventEnvelopeSchema.ts)
  → correlationId field required in every event

API Responses
  → correlationId field included in all JSON responses
```

**Verification query:**
```logql
# Find all log entries across services for one request
{namespace="stayflexi"} | json | correlationId="550e8400-e29b-41d4-a716-446655440000"
```

---

## Runbook Cross-Reference

| Scenario | Runbook |
|---------|--------|
| Booking API down | `docs/runbooks/incident-response.md` — Pattern 1 |
| Payment failures | `docs/runbooks/incident-response.md` — Pattern 2 |
| Inventory stale | `docs/runbooks/incident-response.md` — Pattern 3 |
| Kafka lag | `docs/runbooks/incident-response.md` — Pattern 4 |
| OTA sync stuck | `docs/runbooks/incident-response.md` — Pattern 5 |
| Redis failure | `docs/runbooks/service-degradation.md` — booking-service section |
| Database failure | `platform-validation/reports/checklists/recovery.md` — Scenario 1 |
| Horizontal scale-up | `docs/runbooks/scaling-guide.md` |
| P0 incident | `docs/runbooks/incident-response.md` — P0 Response Procedure |
| SLO burn rate alert | `platform-validation/reports/checklists/sre-operations.md` — Error Budget |
