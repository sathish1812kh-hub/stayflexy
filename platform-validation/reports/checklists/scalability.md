# Scalability Checklist — Stayflexi v2.0.0

> Owner: Platform Engineering  
> Review cycle: Monthly capacity review  
> Last updated: 2026-05-18

---

## Horizontal Scaling

- [ ] All services are stateless: no in-process session state; all mutable state in Redis or PostgreSQL
  - Booking locks: Redis distributed locks (`stayflexi:lock:booking:room:<roomId>`) via `services/booking-service/src/infrastructure/locking/RedisDistributedLock.ts`
  - Idempotency store: Redis (`stayflexi:idempotency:booking:<key>`) via `services/booking-service/src/infrastructure/idempotency/IdempotencyStore.ts`
  - Auth sessions: Redis (`stayflexi:session:<userId>`) via `services/auth-service/src/application/services/SessionCache.ts`
  - Notification dedup: Redis (`stayflexi:notif:dedup:<org>:<recipient>:<hash>`) via `services/notification-service/src/infrastructure/cache/NotificationCache.ts`
- [ ] HPA configured for all 11 services: `kubectl get hpa -n stayflexi`
- [ ] `booking-service`: minReplicas=3, maxReplicas=10 (higher minimum due to distributed lock coordination overhead)
- [ ] `api-gateway`: minReplicas=2, maxReplicas=6
- [ ] All other services: minReplicas=2, maxReplicas=8
- [ ] Booking-service uses pod anti-affinity to spread across nodes (configured in `infrastructure/kubernetes/services/booking-service/deployment.yaml`)
- [ ] Analytics-service memory limit set to 2Gi (higher than other services due to aggregation workloads)
- [ ] `terminationGracePeriodSeconds: 30` allows in-flight requests to complete before pod termination
- [ ] Graceful shutdown hook releases distributed locks and closes Kafka consumer before exit

---

## Database Scaling

- [ ] Read replica deployed for analytics and reporting queries
- [ ] `analytics-service` and `ota-service` read from read replica endpoint (set `DATABASE_REPLICA_URL` env var)
- [ ] `booking-service`, `payment-service` read/write to primary only
- [ ] PgBouncer in transaction pooling mode: `pool_mode = transaction`
- [ ] PgBouncer `default_pool_size = 25` per database (25 connections × 11 services = 275 max; PostgreSQL `max_connections = 300`)
- [ ] PgBouncer `max_client_conn = 1000` (application connections from multiple pods)
- [ ] Slow query log enabled: `log_min_duration_statement = 500` (500ms threshold)
- [ ] `pg_stat_statements` extension enabled and monitored
- [ ] `EXPLAIN ANALYZE` required for any new query touching > 10,000 rows (enforced in code review)
- [ ] Connection strings use PgBouncer endpoint, not direct PostgreSQL
- [ ] Application-level connection pool: Prisma default (10 connections per process instance) — this multiplies against PgBouncer pool
- [ ] Query timeout set: `statement_timeout = 30000` (30s) prevents runaway queries

### Index Verification

```sql
-- Verify critical indexes are present and used
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE tablename IN ('bookings', 'inventory', 'payments', 'audit_logs')
ORDER BY idx_scan DESC;
```

- [ ] Index scan rates healthy (idx_scan > 0 for all listed indexes after traffic has flowed)
- [ ] No sequential scans on large tables in production query logs

---

## Caching Strategy

### Redis Cache Inventory

| Cache Key Pattern | TTL | Service | Description |
|------------------|-----|---------|-------------|
| `stayflexi:booking:cache:<bookingId>` | 300s (5 min) | booking-service | Full booking with rooms and guests |
| `stayflexi:inventory:avail:<hotelId>:<roomTypeId>:<date>` | 60s | inventory-service | Availability count per date |
| `stayflexi:hotel:<hotelId>` | 3600s (1 hour) | hotel-service | Hotel details and room types |
| `stayflexi:notif:<id>` | 300s | notification-service | Notification record |
| `stayflexi:notif:dedup:<org>:<recipient>:<hash>` | 3600s | notification-service | Duplicate send prevention |
| `stayflexi:auth:session:<userId>` | 900s (15 min) | auth-service | User session data |
| `stayflexi:lock:booking:room:<roomId>` | 30000ms | booking-service | Distributed lock (not a cache) |
| `stayflexi:idempotency:booking:<key>` | 86400s (24h) | booking-service | Idempotency deduplication |
| `stayflexi:analytics:snapshot:<org>:<period>` | 300s | analytics-service | Pre-computed aggregates |

- [ ] Cache-aside pattern implemented: read from cache → on miss, read from DB → populate cache
- [ ] Cache warming on service startup for hotel/room type data (reduces cold start latency spikes)
- [ ] Circuit breaker on cache miss handling: if Redis is unavailable, fallback to DB without crashing (confirmed in `NotificationCache.ts` — all methods have try/catch with fail-open)
- [ ] Inventory cache TTL is 60s to balance freshness with load reduction
- [ ] Cache invalidation on booking creation: `BookingCache.invalidate(bookingId)` called in `CancelBooking` and `PatchBooking` use cases
- [ ] Redis `maxmemory-policy allkeys-lru` ensures LRU eviction; no OOM kills
- [ ] Cache hit ratio monitored: alert if `inventory_cache_hit_ratio < 0.80` for > 15 minutes

---

## Event Processing (Kafka)

- [ ] Each service has its own consumer group ID (no group sharing):
  - `booking-service-consumer`
  - `payment-service-consumer`
  - `inventory-service-consumer`
  - `notification-service-consumer`
  - `workflow-service-consumer`
  - `analytics-service-consumer`
  - `ota-service-consumer`
- [ ] Partition count for `booking.events` = 12 (supports up to 12 concurrent consumers per group)
- [ ] Partition count equals or exceeds maximum concurrent consumer instances
- [ ] Consumer lag monitoring: `kafka-consumer-groups.sh --describe --group <group> --bootstrap-server kafka:9092`
- [ ] Consumer lag alert: `kafka_consumer_lag{topic="booking.events"} > 1000` → Slack warning
- [ ] Dead-letter topic (DLQ) implemented for all consumers: failed events after 3 retries → `<topic>.dlq`
- [ ] DLQ monitoring: alert when DLQ topic has unprocessed messages > 0 for > 5 minutes
- [ ] `acks = all` and `enable.idempotence = true` on all producers (prevents duplicate events on network retry)
- [ ] Consumer commit strategy: manual commit after processing, not auto-commit
- [ ] `max.poll.records = 50` to prevent consumers from starving on large batches
- [ ] Kafka consumer CPU/memory monitored; scale consumer deployment if lag grows

---

## Load Testing Thresholds

Load tests are defined in `platform-validation/`. Run before any major release.

### Booking Creation

```
Scenario:   Create booking with 1 room, 2 guests
VUs:        50 concurrent virtual users
Duration:   60 seconds
Assertions:
  - p95 response time < 500ms
  - p99 response time < 1000ms
  - Error rate < 0.5%
  - No lock conflict errors > 1% of requests
Expected throughput: ≥ 100 bookings/minute sustained
```

### Inventory Reads (Availability Check)

```
Scenario:   GET /availability?hotelId=X&checkIn=...&checkOut=...
VUs:        200 concurrent virtual users
Duration:   60 seconds
Assertions:
  - p95 response time < 50ms (cache hit path)
  - p95 response time < 200ms (cache miss path)
  - Error rate < 0.1%
Expected cache hit ratio: > 80%
```

### Payment Processing

```
Scenario:   POST /payments (initiate) + POST /payments/{id}/confirm
VUs:        30 concurrent virtual users
Duration:   60 seconds
Assertions:
  - p95 response time < 2000ms
  - p99 response time < 4000ms
  - Error rate < 0.1%
  - Duplicate payment prevention: 0 duplicate charges
```

### Notification Dispatch

```
Scenario:   Trigger booking.created event → notification delivered
VUs:        100 concurrent virtual users (event producers)
Duration:   60 seconds
Assertions:
  - p95 end-to-end delivery time < 200ms (not including external provider)
  - p95 provider submission time < 30s
  - Dedup effectiveness: 0 duplicate notifications for same event
```

### Gateway Throughput

```
Scenario:   Mixed read/write traffic across all endpoints
VUs:        500 concurrent virtual users
Duration:   120 seconds
Assertions:
  - Gateway p95 response time < 100ms (excluding backend latency)
  - Rate limiting correct: 429 returned after 100 req/min per IP
  - Error rate < 0.5%
```

---

## Bottleneck Identification

### Application Profiling

```bash
# Profile a running Node.js service with clinic.js (run in staging)
# 1. Install clinic: npm install -g clinic
# 2. Capture a flame graph during load test
clinic flame -- node dist/main.js

# 3. View flame graph to identify hot paths
# Expected: most time in Prisma/pg driver (database I/O), acceptable
# Red flag: excessive time in JSON.stringify, synchronous operations, event loop lag
```

### Database Query Analysis

```sql
-- Top 10 slowest queries (pg_stat_statements)
SELECT query, calls, total_exec_time/calls AS avg_ms,
       mean_exec_time, stddev_exec_time, rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- Queries causing sequential scans
SELECT relname, seq_scan, seq_tup_read, idx_scan
FROM pg_stat_user_tables
WHERE seq_scan > 100
ORDER BY seq_scan DESC;
```

### Redis Slow Log

```bash
# Get slow log entries (commands exceeding 10ms)
redis-cli SLOWLOG GET 25

# Reset slow log
redis-cli SLOWLOG RESET

# Check Redis memory fragmentation ratio (healthy: 1.0–1.5)
redis-cli INFO memory | grep mem_fragmentation_ratio
```

### Kafka Consumer Lag Monitoring

```bash
# Check consumer group lag for all groups
kafka-consumer-groups.sh --bootstrap-server kafka:9092 \
  --describe --all-groups 2>/dev/null | \
  awk 'NR>1 && $5>0 {print $0}' | sort -k5 -rn

# Check specific group
kafka-consumer-groups.sh --bootstrap-server kafka:9092 \
  --describe --group booking-service-consumer
```

---

## Auto-scaling Triggers

### HPA Metrics

```yaml
# CPU-based (configured in infrastructure/kubernetes/services/booking-service/hpa.yaml)
- type: Resource
  resource:
    name: cpu
    target:
      type: Utilization
      averageUtilization: 70   # Scale up at 70% CPU

# Memory-based
- type: Resource
  resource:
    name: memory
    target:
      type: Utilization
      averageUtilization: 80   # Scale up at 80% memory
```

### Custom Metrics (Prometheus Adapter)

Configure `kube-prometheus-stack` with custom metrics adapter to enable:

```yaml
# Scale on Kafka consumer lag
- type: External
  external:
    metric:
      name: kafka_consumer_lag_sum
      selector:
        matchLabels:
          topic: booking.events
          group: booking-service-consumer
    target:
      type: AverageValue
      averageValue: "1000"    # Scale when lag > 1000 per replica

# Scale on booking request latency p95
- type: External
  external:
    metric:
      name: booking_p95_latency_seconds
    target:
      type: Value
      value: "1"              # Scale when p95 > 1 second
```

### Manual Scale-Up Triggers

Immediately scale up (ahead of HPA) when:
- [ ] Major event known to drive high bookings (conference, festival)
- [ ] Marketing campaign launching (expect 3–5× traffic spike)
- [ ] OTA sync batch running (can cause burst on inventory-service)
- [ ] Month-end payment reconciliation batch (can cause burst on payment-service)

Pre-scale command:
```bash
# Pre-scale booking-service before known traffic event
kubectl scale deployment booking-service -n stayflexi --replicas=8
kubectl scale deployment inventory-service -n stayflexi --replicas=6
kubectl scale deployment api-gateway -n stayflexi --replicas=4
```
