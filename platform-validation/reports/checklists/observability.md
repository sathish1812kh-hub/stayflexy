# Observability Validation Checklist — Stayflexi v2.0.0

> Owner: Platform Engineering  
> Review cycle: Monthly  
> Last updated: 2026-05-18  
> Stack: Prometheus + Grafana + Loki + Jaeger + Alertmanager

---

## Metrics (Prometheus)

### Required Metrics — All Services

- [ ] `http_requests_total{service, method, path, status}` — counter; incremented on every HTTP response
- [ ] `http_request_duration_seconds{service, method, path, status}` — histogram; observe on response finish
  - Buckets: `[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]`
- [ ] `process_cpu_seconds_total` — counter (Node.js default metrics)
- [ ] `process_resident_memory_bytes` — gauge (Node.js default metrics)
- [ ] `nodejs_active_handles_total` — gauge
- [ ] `nodejs_event_loop_lag_seconds` — histogram
- [ ] All metrics exposed at `GET /metrics` in Prometheus text format (handled by `infrastructure/observability/src/metrics.ts`)

### Required Metrics — Domain-Specific

| Metric | Type | Labels | Service |
|--------|------|--------|---------|
| `booking_creation_total` | counter | `{status: "success"\|"conflict"\|"error"}` | booking-service |
| `booking_lock_acquisition_total` | counter | `{result: "acquired"\|"timeout"\|"failed"}` | booking-service |
| `booking_lock_wait_duration_seconds` | histogram | `{}` | booking-service |
| `payment_processing_total` | counter | `{status, method}` | payment-service |
| `payment_amount_total` | counter | `{currency, method}` | payment-service |
| `inventory_cache_hit_total` | counter | `{result: "hit"\|"miss"}` | inventory-service |
| `inventory_cache_hit_ratio` | gauge | `{}` | inventory-service |
| `kafka_consumer_lag` | gauge | `{topic, partition, group}` | all event consumers |
| `kafka_messages_consumed_total` | counter | `{topic, group, status}` | all event consumers |
| `kafka_messages_produced_total` | counter | `{topic, status}` | all event producers |
| `redis_connection_pool_size` | gauge | `{service}` | all services using Redis |
| `redis_operations_total` | counter | `{operation, status}` | all services using Redis |
| `db_query_duration_seconds` | histogram | `{operation, table}` | all services using PostgreSQL |
| `notification_delivery_total` | counter | `{channel, status}` | notification-service |
| `notification_delivery_duration_seconds` | histogram | `{channel}` | notification-service |
| `auth_attempts_total` | counter | `{result: "success"\|"failure"\|"blocked"}` | auth-service |
| `ota_sync_duration_seconds` | histogram | `{provider, operation}` | ota-service |
| `workflow_execution_total` | counter | `{rule_type, status}` | workflow-service |

### Metric Validation

- [ ] All Prometheus annotations present in all deployment manifests: `prometheus.io/scrape: "true"`, `prometheus.io/port`, `prometheus.io/path: "/metrics"`
- [ ] Prometheus scrape targets healthy: `curl http://prometheus:9090/api/v1/targets | jq '.data.activeTargets[] | select(.health != "up")'` returns empty
- [ ] `GET /metrics` returns 200 on all services: verify with `kubectl exec deployment/<svc> -n stayflexi -- curl -s localhost:<port>/metrics | head -10`
- [ ] All histograms include p50, p95, p99 derived recording rules configured in Prometheus
- [ ] No `NaN` values in metrics endpoints: `curl /metrics | grep NaN` returns empty

---

## Grafana Dashboards

- [ ] **Platform Overview** (`/d/platform-overview`): All 11 services; request rate, error rate, p95 latency side-by-side; pod count per service; HPA replicas
- [ ] **Booking Service Deep-Dive** (`/d/booking-service`): Booking creation rate, lock contention rate, p95/p99 latency breakdown by endpoint, Redis lock wait time, idempotency cache hit rate, saga completion/failure rate
- [ ] **Payment Processing** (`/d/payment-processing`): Payment initiation rate, confirmation rate, refund rate, provider latency, idempotency store hit rate, error rate by payment method
- [ ] **Inventory Availability** (`/d/inventory`): Cache hit ratio, availability query latency (hit vs. miss path), inventory block/unblock events, OTA sync inventory adjustments
- [ ] **Error Rates & SLO Burn Rate** (`/d/slo-burn-rate`): Per-service error rates, SLO compliance gauge (99.9% availability), error budget remaining, burn rate at 1h/6h/24h windows
- [ ] **Infrastructure** (`/d/infrastructure`): Node CPU/memory/disk per AZ, pod resource requests vs. actual, HPA scaling events, OOMKill events
- [ ] **Redis Metrics** (`/d/redis`): Memory used vs. maxmemory, eviction rate, connected clients, operations/s, hit rate, slow log entries, key expiry rate
- [ ] **Kafka Consumer Lag** (`/d/kafka`): Consumer lag per group per topic, messages/s produced vs. consumed, DLQ message count, broker availability
- [ ] **Notification Delivery** (`/d/notifications`): Delivery rate by channel (email/SMS/push/WhatsApp), retry queue depth, provider error rate, dedup rate
- [ ] All dashboards use `stayflexi` namespace filter variable
- [ ] All dashboards have alert panel annotations showing firing alerts
- [ ] Dashboard JSON exported and stored in `infrastructure/observability/grafana/dashboards/`

---

## Distributed Tracing (Jaeger / OpenTelemetry)

### Tracer Configuration

- [ ] All 11 services initialize OpenTelemetry SDK via `initTracer(serviceName, { jaegerEndpoint: process.env.JAEGER_ENDPOINT })` from `infrastructure/observability/src/tracer.ts`
- [ ] `JAEGER_ENDPOINT` set to `http://jaeger:14268/api/traces` via ConfigMap in all deployments
- [ ] Auto-instrumentation enabled for:
  - [ ] HTTP inbound/outbound (`@opentelemetry/instrumentation-http`)
  - [ ] Express routes (`@opentelemetry/instrumentation-express`)
  - [ ] PostgreSQL queries via Prisma (`@opentelemetry/instrumentation-pg`)
  - [ ] Redis operations via ioredis (`@opentelemetry/instrumentation-ioredis`)
  - [ ] KafkaJS produce/consume (manual span instrumentation in event publisher)

### Trace Sampling Configuration

- [ ] Production sampling rate: 10% for normal traffic (1 in 10 requests sampled)
- [ ] 100% sampling for error responses (status code ≥ 500)
- [ ] 100% sampling for requests with `x-force-trace: true` header (for on-demand debugging)
- [ ] Sampling rate configurable via `OTEL_TRACES_SAMPLER_ARG` environment variable without restart

### Required Span Coverage

- [ ] HTTP inbound span created for every request at gateway and each service
- [ ] Database query spans include: query text (sanitized), table name, row count
- [ ] Redis operation spans include: command, key pattern (redacted actual key values)
- [ ] Kafka produce span includes: topic, partition
- [ ] Kafka consume span includes: topic, partition, consumer group, offset
- [ ] Cross-service HTTP calls include `traceparent` propagation header
- [ ] `x-correlation-id` mapped to OpenTelemetry trace ID for log correlation

### Trace Validation

- [ ] End-to-end trace visible in Jaeger for: `POST /api/v1/bookings` → auth-service JWT verify → booking-service → inventory-service → Kafka publish
- [ ] Trace search by `correlationId` returns correct trace
- [ ] No orphaned spans (all spans have valid parent except root)
- [ ] Jaeger collector healthy: `curl http://jaeger:14269/` returns 200

---

## Logging (Loki / Pino)

### Log Format Requirements

All services must emit structured JSON logs via Pino with the following required fields:

```json
{
  "level": "info",
  "time": 1716048000000,
  "service": "booking-service",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Booking created",
  "bookingId": "clx1234...",
  "bookingNumber": "BK-2026-001234"
}
```

- [ ] `level` — one of: `error`, `warn`, `info`, `debug`
- [ ] `time` — Unix millisecond timestamp (Pino default)
- [ ] `service` — service name constant matching deployment label
- [ ] `correlationId` — propagated from `x-correlation-id` header via correlation middleware
- [ ] `message` — human-readable description
- [ ] `traceId` — OpenTelemetry trace ID for cross-reference with Jaeger

### Log Level Policy

| Level | When to Use | Examples |
|-------|-------------|---------|
| `error` | Unhandled exceptions, 5xx responses, failed external calls | DB connection failed, payment gateway unreachable |
| `warn` | Recoverable errors, 4xx except 404/401, degraded behavior | Lock acquisition failed (will retry), cache miss, slow query > 1s |
| `info` | Critical business operations | Booking created, payment confirmed, user logged in, saga completed |
| `debug` | Detailed internal state (disabled in production) | Cache lookup, lock acquire attempt, Kafka message received |

- [ ] `LOG_LEVEL=info` set via ConfigMap in production (not `debug`)
- [ ] No PII logged in plaintext: Pino `redact` configuration excludes `req.headers.authorization`, `body.password`, `body.governmentIdNumber`, `body.cardNumber`
- [ ] No secrets in log output: `grep -r "JWT_SECRET\|DATABASE_URL" logs/` returns nothing

### Loki Configuration

- [ ] Promtail DaemonSet deployed on all nodes: `kubectl get daemonset promtail -n monitoring`
- [ ] Promtail scraping all pod logs from `stayflexi` namespace
- [ ] Loki retention: 30 days hot (Loki storage), 90 days cold (object storage via Loki compactor)
- [ ] Log correlation query working in Grafana: `{namespace="stayflexi",service="booking-service"} | json | correlationId="<id>"`
- [ ] Log query returns results within 5 seconds for last-30-minutes range

---

## Alerting (Alertmanager)

### Critical Alerts (Page On-Call via PagerDuty)

- [ ] `BookingAPIHighLatency`: `histogram_quantile(0.95, ...) > 1.0` for > 5 minutes
  - Action: See `docs/runbooks/incident-response.md` — Booking API down
- [ ] `HighErrorRate`: `rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05` for > 2 minutes
  - Action: See `docs/runbooks/incident-response.md`
- [ ] `PodCrashLoop`: `kube_pod_container_status_waiting_reason{reason="CrashLoopBackOff"} > 0` for > 5 minutes
  - Action: See `docs/runbooks/incident-response.md` — Scenario 4
- [ ] `OOMKill`: `kube_pod_container_status_last_terminated_reason{reason="OOMKilled"} > 0`
  - Action: Increase memory limits; see `platform-validation/reports/checklists/scalability.md`
- [ ] `BookingAPIErrorBudgetCritical`: burn rate > 14.4× for > 2 minutes
  - Action: Immediate incident declaration

### Warning Alerts (Slack `#alerts-warning`)

- [ ] `BookingAPILatencyWarning`: `histogram_quantile(0.95, ...) > 0.5` for > 10 minutes
- [ ] `ErrorRateWarning`: error rate > 1% for > 5 minutes
- [ ] `CacheHitRateLow`: `inventory_cache_hit_ratio < 0.80` for > 15 minutes
- [ ] `KafkaConsumerLagWarning`: `kafka_consumer_lag > 1000` for > 5 minutes
- [ ] `DiskUsageHigh`: `kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes > 0.80`
- [ ] `PostgreSQLConnectionsHigh`: PgBouncer pool utilization > 80% for > 5 minutes
- [ ] `RedisMemoryHigh`: Redis memory > 80% of maxmemory

### Info Alerts (Slack `#alerts-info`)

- [ ] `DeploymentScaleEvent`: HPA scaled up or down any deployment
- [ ] `BackupCompleted`: daily backup job completed (informational confirmation)
- [ ] `BackupFailed`: daily backup job failed → escalate to on-call

### Alert Validation

- [ ] All critical alerts verified to fire in staging by injecting artificial errors
- [ ] PagerDuty integration tested: create a test alert, verify page received
- [ ] Slack integration tested: `curl -X POST $SLACK_WEBHOOK_URL -d '{"text":"test alert"}'`
- [ ] Alertmanager routing rules tested with `amtool check-config alertmanager.yml`
- [ ] Alert silencing procedure documented: `amtool silence add alertname=<name> --duration=1h`

---

## Correlation ID Flow Validation

The `x-correlation-id` header must propagate end-to-end through every service call.

- [ ] Gateway generates UUID correlation ID if absent: `infrastructure/gateway/src/middleware/tracing.ts`
- [ ] Gateway attaches `x-correlation-id` to all proxied upstream requests
- [ ] Each service reads correlation ID from header and stores in `req.correlationId`: confirmed in `services/*/src/middleware/correlation.ts`
- [ ] Correlation ID included in all Pino log entries: `logger.info({ correlationId: req.correlationId }, ...)`
- [ ] Correlation ID included in all Kafka event envelopes: `platform-validation/src/contracts/schemas/EventEnvelopeSchema.ts`
- [ ] Correlation ID returned in all API responses: `res.json({ ..., correlationId: req.correlationId })`
- [ ] Correlation ID passed to all outgoing HTTP calls as `x-correlation-id` header

**End-to-end validation test:**
```bash
# Make a request with a known correlation ID
CORR_ID="test-corr-$(date +%s)"
curl -H "x-correlation-id: $CORR_ID" \
  https://api.stayflexi.com/api/v1/bookings/search?limit=1

# Verify correlation ID appears in Loki for all services touched
# Loki query: {namespace="stayflexi"} | json | correlationId="$CORR_ID"
# Expected: log entries from api-gateway, auth-service, booking-service
```

- [ ] End-to-end correlation ID propagation verified across: gateway → auth-service → booking-service → inventory-service for a booking creation request
- [ ] Correlation ID visible in Jaeger trace (mapped as attribute `correlation.id`)
- [ ] Correlation ID searchable in Loki across all services for same request
