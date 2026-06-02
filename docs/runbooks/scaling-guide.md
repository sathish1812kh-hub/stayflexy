# Operational Scaling Guide — Stayflexi v2.0.0

> Owner: Platform Engineering  
> Last updated: 2026-05-18  
> Related: `platform-validation/reports/checklists/scalability.md`

---

## 1. Horizontal Scaling

### Manual Scale Commands

```bash
# Scale a specific service
kubectl scale deployment booking-service -n stayflexi --replicas=6

# Scale multiple services simultaneously (pre-event scale-up)
kubectl scale deployment booking-service inventory-service payment-service \
  -n stayflexi --replicas=6

# Verify scale-out completed
kubectl rollout status deployment/booking-service -n stayflexi --timeout=5m
kubectl get pods -n stayflexi -l app=booking-service
```

### HPA Configuration

All HPA configs live in `infrastructure/kubernetes/services/<service>/hpa.yaml`. The booking-service HPA is the reference implementation:

```yaml
# infrastructure/kubernetes/services/booking-service/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: booking-service-hpa
  namespace: stayflexi
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: booking-service
  minReplicas: 3      # Higher minimum for booking due to lock coordination
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300   # Wait 5 min before scale-down
      policies:
      - type: Pods
        value: 1
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 30    # Fast scale-up
      policies:
      - type: Pods
        value: 2
        periodSeconds: 30
```

### Service-Specific Scaling Considerations

| Service | Min Replicas | Max Replicas | Special Considerations |
|---------|-------------|-------------|----------------------|
| `api-gateway` | 2 | 6 | Stateless; scales freely; rate limit counters per pod (Redis-backed, so consistent) |
| `auth-service` | 2 | 6 | Stateless; Redis session cache shared across pods; no sticky sessions needed |
| `booking-service` | 3 | 10 | Redis distributed locks work correctly with any replica count; higher minimum for availability SLO |
| `inventory-service` | 2 | 8 | Stateless; cache shared in Redis; scale before large OTA sync operations |
| `payment-service` | 2 | 6 | Idempotency store in Redis; all replicas see same store; no sticky sessions |
| `notification-service` | 2 | 8 | Multiple replicas consume Kafka partitions; partition count (6) limits effective parallelism |
| `analytics-service` | 2 | 4 | Memory-intensive; each pod needs 2Gi RAM for aggregation; scale vertically first |
| `ota-service` | 2 | 6 | Distributed lock per OTA provider prevents concurrent sync conflicts (`services/ota-service/src/infrastructure/locking/OtaDistributedLock.ts`) |
| `workflow-service` | 2 | 6 | Stateless; Kafka-driven |
| `organization-service` | 2 | 4 | Low-traffic management service; rarely needs > 2 replicas |
| `hotel-service` | 2 | 4 | Low-write, high-read; data heavily cached; rarely bottleneck |

---

## 2. Vertical Scaling

### When to Scale Vertically vs. Horizontally

| Situation | Recommendation |
|-----------|---------------|
| High CPU, low memory; stateless service | Scale horizontally (HPA) |
| High memory, near OOMKill | Scale vertically (increase `resources.limits.memory`) first, then investigate leak |
| PostgreSQL `max_connections` limit hit | Scale PgBouncer pool size, or reduce horizontal pod count with larger individual limits |
| Single-threaded CPU bottleneck (event loop lag) | Scale horizontally; Node.js is single-threaded per worker |
| Analytics aggregation OOM | Scale vertically; aggregation workload doesn't parallelize across pods easily |

### Changing Resource Limits

```bash
# Temporarily increase booking-service memory limit
kubectl patch deployment booking-service -n stayflexi --type=json \
  -p='[{
    "op": "replace",
    "path": "/spec/template/spec/containers/0/resources/limits/memory",
    "value": "2Gi"
  }]'

# Verify the change
kubectl describe deployment booking-service -n stayflexi | grep -A4 "Limits:"
```

**Current resource allocations** (from `infrastructure/kubernetes/services/booking-service/deployment.yaml`):

| Service | CPU Request | CPU Limit | Memory Request | Memory Limit |
|---------|------------|-----------|---------------|-------------|
| booking-service | 500m | 1000m | 512Mi | 1Gi |
| All others | 250m | 500m | 256Mi | 512Mi |
| analytics-service | 500m | 1000m | 1Gi | 2Gi |

### PostgreSQL Connection Limit Implications

Each additional horizontal replica consumes PgBouncer connections:
```
Connections used = (num_pods × prisma_pool_size_per_pod)

Example at 6 booking-service replicas:
  6 pods × 10 Prisma connections = 60 connections from booking-service
  Total all services (6 each × 11 services × 10): ~660 connections to PgBouncer
  PgBouncer max_client_conn = 1000 → comfortable headroom

  PgBouncer → PostgreSQL: default_pool_size = 25 per database
  PostgreSQL max_connections = 200 → 175 available for services
```

If approaching limits, increase PgBouncer `default_pool_size` before adding more pods.

---

## 3. Database Scaling

### Adding a Read Replica

```bash
# 1. Configure PostgreSQL streaming replication on replica
# On primary (postgresql.conf):
wal_level = replica
max_wal_senders = 5
wal_keep_size = 1GB

# On replica: restore base backup and configure
pg_basebackup -h postgres-primary -U replicator -D /var/lib/postgresql/data \
  -P -R --wal-method=stream

# 2. Verify replica is streaming
psql -h postgres-primary -U postgres -c "SELECT client_addr, state, write_lag FROM pg_stat_replication;"

# 3. Update services to use replica for read-only queries
kubectl create secret generic stayflexi-db-replica-secret \
  --from-literal=DATABASE_REPLICA_URL=postgresql://stayflexi_app:<pass>@postgres-replica:5432/stayflexi \
  -n stayflexi
kubectl rollout restart deployment/analytics-service -n stayflexi
```

### Promoting Replica to Primary

```bash
# With Patroni (recommended for automated failover):
patronictl -c /etc/patroni/patroni.yml failover stayflexi \
  --master postgres-primary \
  --candidate postgres-replica-0 \
  --force

# Manual promotion (no Patroni):
pg_ctl promote -D /var/lib/postgresql/data

# Update connection strings after promotion
kubectl create secret generic stayflexi-db-secret \
  --from-literal=DATABASE_URL=postgresql://stayflexi_app:<pass>@postgres-replica-0:5432/stayflexi \
  -n stayflexi --dry-run=client -o yaml | kubectl apply -f -
kubectl rollout restart deployment -n stayflexi
```

### PgBouncer Configuration Changes

```ini
# /etc/pgbouncer/pgbouncer.ini — key parameters for scaling
[databases]
stayflexi = host=postgres-primary port=5432 dbname=stayflexi

[pgbouncer]
pool_mode = transaction          # Transaction pooling (best for microservices)
max_client_conn = 1000           # Max connections from application pods
default_pool_size = 25           # Server connections per database (to PostgreSQL)
reserve_pool_size = 5            # Extra connections for spikes
reserve_pool_timeout = 5.0       # Seconds before using reserve pool
server_idle_timeout = 600        # Close idle server connections after 10 min
client_idle_timeout = 0          # Never close idle client connections
```

```bash
# Apply config change without downtime (PgBouncer reload)
kubectl exec deployment/pgbouncer -n stayflexi -- \
  psql -h localhost -p 5432 -U pgbouncer pgbouncer -c "RELOAD;"

# Verify new settings
kubectl exec deployment/pgbouncer -n stayflexi -- \
  psql -h localhost -p 5432 -U pgbouncer pgbouncer -c "SHOW CONFIG;"
```

---

## 4. Kafka Scaling

### Adding Partitions

Partitions can be increased but **never decreased**. Add partitions only when consumer group has reached maximum parallelism.

```bash
# Increase booking.events partitions from 12 to 18
kafka-topics.sh --bootstrap-server kafka:9092 \
  --alter --topic booking.events \
  --partitions 18

# Verify change
kafka-topics.sh --describe --bootstrap-server kafka:9092 --topic booking.events
```

**Caution:** Adding partitions changes the partition key routing for keyed messages. If messages are partitioned by `hotelId`, existing consumers may see out-of-order messages for a brief rebalance period.

### Rebalancing Consumer Groups

```bash
# Trigger a consumer group rebalance by restarting consumers
kubectl rollout restart deployment/booking-service -n stayflexi

# Monitor rebalance completion
kafka-consumer-groups.sh --bootstrap-server kafka:9092 \
  --describe --group booking-service-consumer

# Preferred replica election after adding broker
kafka-leader-election.sh --bootstrap-server kafka:9092 \
  --election-type PREFERRED \
  --all-topic-partitions
```

### Adding a Kafka Broker

```bash
# 1. Add new broker to StatefulSet (Kubernetes)
kubectl scale statefulset kafka -n kafka --replicas=4

# 2. Verify new broker joined
kafka-broker-api-versions.sh --bootstrap-server kafka:9092 2>&1 | grep "id:"

# 3. Rebalance partitions to include new broker
kafka-reassign-partitions.sh --bootstrap-server kafka:9092 \
  --topics-to-move-json-file topics.json \
  --broker-list "0,1,2,3" \
  --generate

# Execute reassignment
kafka-reassign-partitions.sh --bootstrap-server kafka:9092 \
  --reassignment-json-file reassignment.json \
  --execute

# Monitor reassignment progress
kafka-reassign-partitions.sh --bootstrap-server kafka:9092 \
  --reassignment-json-file reassignment.json \
  --verify
```

---

## 5. Redis Scaling

### Redis Cluster Configuration

Current deployment: Redis Sentinel (3 Sentinel nodes + 1 primary + 1 replica). For higher throughput, upgrade to Redis Cluster.

```bash
# Create a 3-shard Redis Cluster (6 nodes: 3 primary + 3 replica)
redis-cli --cluster create \
  redis-node-0:6379 redis-node-1:6379 redis-node-2:6379 \
  redis-node-3:6379 redis-node-4:6379 redis-node-5:6379 \
  --cluster-replicas 1

# Verify cluster health
redis-cli --cluster check redis-node-0:6379
redis-cli cluster info | grep cluster_state
```

### Slot Rebalancing

```bash
# After adding a new shard to existing Redis Cluster
redis-cli --cluster add-node redis-node-6:6379 redis-node-0:6379
redis-cli --cluster reshard redis-node-0:6379

# Check slot distribution
redis-cli cluster nodes | awk '{print $3, $9}'
```

**Application change required for Redis Cluster:** Update `REDIS_URL` to cluster mode in `ioredis`:
```typescript
// ioredis cluster config (update REDIS_CLUSTER_NODES env var)
const redis = new Redis.Cluster([
  { host: 'redis-node-0', port: 6379 },
  { host: 'redis-node-1', port: 6379 },
  { host: 'redis-node-2', port: 6379 },
])
```

---

## 6. Load Testing Before Scaling

Run k6 load tests from `platform-validation/` before any major scaling operation to establish baseline and validate that scaling is needed.

### Booking Service

```bash
# From platform-validation directory
# Simulate 50 concurrent users creating bookings for 60 seconds
k6 run --vus 50 --duration 60s \
  -e BASE_URL=https://api.stayflexi.com \
  -e AUTH_TOKEN=$TEST_TOKEN \
  src/performance/booking-load-test.js

# Expected passing thresholds:
# p95 response time < 500ms
# error rate < 0.5%
# throughput > 100 bookings/min
```

### Inventory Service

```bash
# 200 VUs hitting availability endpoint (tests cache hit ratio)
k6 run --vus 200 --duration 60s \
  -e BASE_URL=https://api.stayflexi.com \
  src/performance/inventory-load-test.js

# Expected:
# p95 < 50ms (cache hit), p95 < 200ms (cache miss)
# cache hit rate > 80%
```

### Payment Service

```bash
# 30 VUs processing payments end-to-end
k6 run --vus 30 --duration 60s \
  -e BASE_URL=https://api.stayflexi.com \
  src/performance/payment-load-test.js

# Expected:
# p95 < 2000ms
# zero duplicate payments
```

### Notification Service

```bash
# 100 VUs triggering notification events
k6 run --vus 100 --duration 60s \
  -e BASE_URL=https://api.stayflexi.com \
  src/performance/notification-load-test.js

# Expected:
# p95 end-to-end < 200ms (to Kafka)
# dedup effectiveness: 0 duplicates
```

---

## 7. Capacity Planning Formula

```
Required capacity = current_baseline × (1 + growth_rate)^months × safety_factor

Parameters:
  current_baseline  = 30-day average utilization (CPU cores or memory GB)
  growth_rate       = observed monthly growth (default: 8% MoM for hospitality SaaS)
  months            = projection horizon (3 months for quarterly planning)
  safety_factor     = 1.20 (20% headroom above projected peak)

Example (booking-service):
  Current: 400m CPU average across 3 pods = 1.2 cores total
  Growth:  8% MoM
  3-month projection: 1.2 × (1.08)^3 × 1.20 = 1.2 × 1.259 × 1.20 = 1.81 cores
  Needed: ceil(1.81 / 1.0 limit per pod) = 2 additional pods → total 5 pods
  Verify: HPA maxReplicas ≥ 5 (currently 10, sufficient)

Memory example (analytics-service):
  Current: 1.2Gi average across 2 pods = 2.4Gi total
  Growth:  15% MoM (data grows with booking volume)
  3-month projection: 2.4 × (1.15)^3 × 1.20 = 2.4 × 1.521 × 1.20 = 4.38Gi
  Needed: ceil(4.38 / 2.0 limit per pod) = 3 pods minimum
  Action: Set minReplicas=3 for analytics-service in Q3 planning
```

### Monthly Capacity Review Checklist

- [ ] Pull 30-day average and peak utilization per service from Grafana (`/d/infrastructure`)
- [ ] Calculate 3-month projection using formula above for CPU and memory
- [ ] Check PostgreSQL storage growth rate: `SELECT pg_database_size('stayflexi');` compared to last month
- [ ] Check Redis memory trend: `redis-cli INFO memory | grep used_memory_human` vs. `maxmemory`
- [ ] Check Kafka storage: `kafka-log-dirs.sh --bootstrap-server kafka:9092 --topic-list booking.events --describe`
- [ ] Update HPA `maxReplicas` if projected needs exceed current maximum
- [ ] Update resource request/limit if sustained utilization > 70%
- [ ] File capacity ticket in Linear if any service needs provisioning > 30 days out
