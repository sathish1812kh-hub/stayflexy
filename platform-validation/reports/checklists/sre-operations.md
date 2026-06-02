# SRE Operations Runbook — Stayflexi v2.0.0

> Owner: Platform Engineering  
> Review cycle: Quarterly  
> Last updated: 2026-05-18

---

## 1. Service Level Objectives (SLOs)

| Service | SLO | Target | Measurement Window |
|---------|-----|--------|--------------------|
| Booking API availability | HTTP 2xx+3xx rate | 99.9% | Rolling 30 days |
| Booking creation latency | p95 response time | < 500ms | Rolling 7 days |
| Payment processing latency | p95 response time | < 2000ms | Rolling 7 days |
| Inventory read latency (cache hit) | p95 response time | < 50ms | Rolling 7 days |
| Inventory read latency (cache miss) | p95 response time | < 200ms | Rolling 7 days |
| Notification delivery | p95 time-to-delivery | < 30s | Rolling 7 days |

### SLI Definitions

**Booking API Availability**: `sum(rate(http_requests_total{service="booking-service",status!~"5.."}[5m])) / sum(rate(http_requests_total{service="booking-service"}[5m]))`

**Booking p95 Latency**: `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{service="booking-service",endpoint="/bookings",method="POST"}[5m])) by (le))`

**Payment p95 Latency**: `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{service="payment-service"}[5m])) by (le))`

**Inventory Cache Hit Latency**: `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{service="inventory-service",cache="hit"}[5m])) by (le))`

---

## 2. Error Budget

### Calculation

Monthly error budget for 99.9% availability SLO:

```
Total minutes in 30 days = 30 × 24 × 60 = 43,200 minutes
Allowed downtime = 43,200 × 0.001 = 43.2 minutes per month
```

### Burn Rate Alerting

Burn rates indicate how fast the error budget is being consumed relative to the ideal spend rate.

| Burn Rate | Alert Severity | Meaning | Response |
|-----------|---------------|---------|----------|
| 14.4× | Critical (P0) | 100% budget gone in ~3 hours | Page on-call immediately |
| 5× | Critical (P1) | 100% budget gone in ~1 day | Page on-call within 15 min |
| 1× | Warning | On track to exhaust budget exactly | Slack warning, investigate |

**Prometheus recording rule for 1-hour burn rate:**
```yaml
- record: booking_api:error_budget_burn_rate:1h
  expr: >
    (1 - (sum(rate(http_requests_total{service="booking-service",status!~"5.."}[1h]))
          / sum(rate(http_requests_total{service="booking-service"}[1h])))) / 0.001
```

**Alerting rule (14.4× burn rate):**
```yaml
- alert: BookingAPIErrorBudgetCritical
  expr: booking_api:error_budget_burn_rate:1h > 14.4
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "Booking API burning error budget at 14.4x rate"
    description: "At this rate, the monthly error budget will be exhausted in 3 hours."
```

---

## 3. Incident Severity Levels

| Level | Definition | Examples | Response SLA |
|-------|-----------|---------|--------------|
| **P0** | Complete service outage affecting all users; revenue-impacting | Booking API returning 5xx for all requests; Database unreachable; Payment service down | 5 minutes |
| **P1** | Major degradation affecting > 10% of users or a critical path broken | Booking creation failing for specific hotel groups; Payment processing latency > 30s; Inventory availability incorrect | 15 minutes |
| **P2** | Partial degradation; workaround exists; < 10% of users affected | OTA sync delayed by > 1 hour; Analytics data stale by > 4 hours; Notification delivery > 5 minutes | 1 hour |
| **P3** | Minor issue; single user or non-critical feature; cosmetic/UI issue | Single booking lookup slow; PDF invoice generation failing; Analytics export timing out | Next business day |

---

## 4. On-Call Rotation

### Rotation Structure

| Role | Responsibility | Escalation Order |
|------|---------------|-----------------|
| Primary On-Call | First responder for all pages; must acknowledge within response SLA | Step 1 |
| Secondary On-Call | Escalation if Primary does not respond; backup during incidents | Step 2 |
| Engineering Manager | Final escalation; customer and executive communication for P0/P1 | Step 3 |

### Response Time Requirements

| Severity | Acknowledge SLA | Active Response SLA |
|----------|----------------|---------------------|
| P0 | 5 minutes | Immediately; war room within 10 minutes |
| P1 | 15 minutes | Active investigation within 15 minutes |
| P2 | 1 hour | Ticket created within 1 hour; fix within 4 hours |
| P3 | Next business day | Ticket created; prioritized in next sprint |

### Escalation Procedure

1. PagerDuty pages Primary On-Call
2. If no acknowledgement within 5 minutes (P0) or 15 minutes (P1): auto-escalate to Secondary
3. If Secondary does not acknowledge within 5 minutes: auto-escalate to Engineering Manager
4. Engineering Manager notifies VP Engineering for P0 incidents > 30 minutes unresolved

---

## 5. Key Operational Dashboards

Access Grafana at `https://grafana.internal.stayflexi.com`

| Dashboard | URL Slug | Purpose |
|-----------|----------|---------|
| Platform Overview | `/d/platform-overview` | All-services health: request rate, error rate, latency |
| Booking Service | `/d/booking-service` | Booking throughput, lock contention, saga completion rate |
| Payment Processing | `/d/payment-processing` | Payment success rate, provider latency, refund rate |
| Inventory Availability | `/d/inventory` | Cache hit ratio, availability query latency, block rate |
| Notification Delivery | `/d/notifications` | Delivery rate by channel, retry queue depth, provider errors |
| Error Rates & SLO | `/d/slo-burn-rate` | Error budget remaining, burn rate, SLO compliance |
| Infrastructure | `/d/infrastructure` | CPU/memory/disk per node and pod |
| Redis Metrics | `/d/redis` | Memory usage, eviction rate, connection pool, slow log |
| Kafka Consumer Lag | `/d/kafka` | Consumer group lag per topic, partition leader distribution |

---

## 6. Common Operational Tasks

### 6.1 Scale a Deployment Manually

```bash
# Scale booking-service to 5 replicas (overrides HPA temporarily)
kubectl scale deployment booking-service -n stayflexi --replicas=5

# Verify rollout
kubectl rollout status deployment/booking-service -n stayflexi

# After incident, remove manual override so HPA resumes control
kubectl patch hpa booking-service-hpa -n stayflexi --type=merge \
  -p '{"spec":{"minReplicas":3}}'
```

### 6.2 Rolling Restart (to pick up new secrets or config)

```bash
# Restart all pods in a deployment gracefully
kubectl rollout restart deployment/booking-service -n stayflexi

# Monitor rollout progress
kubectl rollout status deployment/booking-service -n stayflexi --timeout=5m
```

### 6.3 Get Logs

```bash
# Tail logs from all booking-service pods
kubectl logs -f -l app=booking-service -n stayflexi --max-log-requests=10

# Get logs from a specific pod (last 500 lines)
kubectl logs booking-service-7d9f4c-abc12 -n stayflexi --tail=500

# Get logs from previous (crashed) container
kubectl logs booking-service-7d9f4c-abc12 -n stayflexi --previous

# Filter by correlation ID using stern (if installed)
stern booking-service -n stayflexi | grep "correlationId:\"abc123\""
```

### 6.4 Port-Forward for Local Debugging

```bash
# Forward booking-service to localhost:3005
kubectl port-forward deployment/booking-service 3005:3005 -n stayflexi

# Forward PostgreSQL (via PgBouncer pod) to localhost:5432
kubectl port-forward deployment/pgbouncer 5432:5432 -n stayflexi

# Forward Redis Sentinel to localhost:26379
kubectl port-forward deployment/redis-sentinel-0 26379:26379 -n stayflexi
```

### 6.5 Rollback a Deployment

```bash
# Rollback to previous revision
kubectl rollout undo deployment/booking-service -n stayflexi

# Rollback to a specific revision
kubectl rollout history deployment/booking-service -n stayflexi
kubectl rollout undo deployment/booking-service -n stayflexi --to-revision=3

# Verify rollback
kubectl rollout status deployment/booking-service -n stayflexi
```

### 6.6 Drain a Node (for maintenance)

```bash
# Cordon node to prevent new scheduling
kubectl cordon <node-name>

# Drain workloads (respects PodDisruptionBudgets)
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data --force

# After maintenance, uncordon
kubectl uncordon <node-name>
```

### 6.7 Inspect Pod Resource Usage

```bash
# Top pods by CPU and memory in stayflexi namespace
kubectl top pods -n stayflexi --sort-by=memory

# Describe a pod (check OOMKill events)
kubectl describe pod <pod-name> -n stayflexi

# Check HPA status and current metrics
kubectl describe hpa booking-service-hpa -n stayflexi
```

### 6.8 Execute Commands in a Running Container

```bash
# Open a shell in a booking-service pod
kubectl exec -it deployment/booking-service -n stayflexi -- /bin/sh

# Run a one-off Prisma query check
kubectl exec deployment/booking-service -n stayflexi -- \
  node -e "const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); p.\$queryRaw\`SELECT COUNT(*) FROM bookings\`.then(console.log)"
```

---

## 7. Capacity Planning

### Review Schedule

Capacity review is performed **monthly** on the first Monday of each month. The review covers:
1. Current CPU and memory utilization per service (30-day average and peak)
2. Database storage growth rate and projected full date
3. Redis memory usage and eviction rate
4. Kafka storage and retention utilization
5. Cost per booking/transaction metric

### Alert Thresholds

| Resource | Warning Threshold | Critical Threshold |
|----------|------------------|-------------------|
| CPU utilization (pod average) | 70% sustained > 1 hour | 85% sustained > 15 min |
| Memory utilization (pod) | 80% sustained > 1 hour | 90% sustained > 15 min |
| PostgreSQL storage | 70% of PVC capacity | 85% of PVC capacity |
| Redis memory | 75% of maxmemory | 90% of maxmemory |
| Kafka partition lag | > 1,000 messages per consumer group | > 10,000 messages |
| PgBouncer connection pool | 80% of pool_size in use | 95% of pool_size |

### Capacity Planning Formula

```
Projected capacity = baseline_usage × (1 + growth_rate)^projection_months × safety_factor

Where:
  baseline_usage      = current 30-day average utilization
  growth_rate         = month-over-month growth (typically 5–15% for hospitality SaaS)
  projection_months   = 3 (quarterly planning horizon)
  safety_factor       = 1.20 (20% headroom)

Example (booking-service CPU, current 400m/1000m = 40%):
  Projected = 400m × (1.08)^3 × 1.20 = 400m × 1.26 × 1.20 = 604m

  Action: if projected > 700m (70% of limit), provision next tier before projection month.
```

### Scaling Triggers

The following conditions require an immediate capacity review outside the monthly cycle:
- Any service's 7-day CPU p95 exceeds 70%
- Any service triggers OOMKill events > 3 times in a week
- Database storage growth exceeds 5% in a single day
- Kafka consumer lag exceeds 10,000 messages for > 30 minutes
- HPA reaches `maxReplicas` for any service

---

## 8. Change Management

### Deployment Windows

| Environment | Allowed Deployment Windows |
|-------------|--------------------------|
| Staging | Any time |
| Production | Tuesday–Thursday, 10:00–16:00 UTC (outside peak check-in/check-out hours) |
| Emergency hotfix | Any time; requires Engineering Manager approval and post-incident review |

### Pre-Deployment Checklist

1. All `platform-validation` tests passing on the build being deployed
2. Staging deployment healthy for > 1 hour before production promotion
3. Rollback plan documented in the deployment ticket
4. Primary on-call notified of deployment window
5. Deployment announced in `#deployments` Slack channel with ETA and service name

### Post-Deployment Verification

After every production deployment:
```bash
# 1. Verify all pods running
kubectl get pods -n stayflexi | grep -v Running

# 2. Check error rate in Grafana for 15 minutes post-deploy
# Navigate to /d/platform-overview and set time range to "Last 15 minutes"

# 3. Verify HPA targets are met
kubectl get hpa -n stayflexi

# 4. Check Alertmanager for any firing alerts
# Navigate to https://alertmanager.internal.stayflexi.com
```
