# Incident Response Runbook — Stayflexi v2.0.0

> Owner: Platform Engineering / SRE  
> Last updated: 2026-05-18  
> Post-incident reviews tracked in Linear project: PLAT-OPS

---

## 1. Incident Classification

| Severity | Definition | Examples | Max Response Time |
|----------|-----------|---------|-------------------|
| **P0** | Complete outage; all users affected; revenue impact ongoing | Booking API returning 5xx for all requests; Database unreachable; Payment service down; Gateway not responding | 5 minutes |
| **P1** | Major degradation; > 10% of users affected or critical revenue path broken | Booking creation failing for ≥ 2 hotel groups; Payment processing latency > 30s; Inventory returning stale data causing overbookings | 15 minutes |
| **P2** | Partial degradation; < 10% users affected; workaround exists | OTA sync delayed > 1 hour; Analytics stale > 4 hours; Notification delivery > 5 minutes; Single hotel group affected | 1 hour |
| **P3** | Minor issue; single user or non-critical feature affected | Single booking lookup slow; PDF invoice failing; Export timing out for one organization | Next business day |

---

## 2. P0 Response Procedure

**Timer starts when the first alert fires or the issue is reported. Target: first response within 5 minutes.**

### Step 1 — Immediate Actions (0–5 minutes)

1. Acknowledge the PagerDuty alert to stop escalation.
2. Join the war room bridge: `https://meet.google.com/stayflexi-incident` (permanent link)
3. Create an incident Slack channel: `#incident-YYYYMMDD-HHMM` (e.g., `#incident-20260518-1430`)
4. Announce in `#incidents` Slack channel:
   ```
   P0 INCIDENT DECLARED — <brief description>
   Incident channel: #incident-20260518-1430
   Bridge: https://meet.google.com/stayflexi-incident
   IC: @<your-name>
   ```
5. Assign roles:
   - **Incident Commander (IC)**: Coordinates response; owns communication cadence; makes go/no-go decisions
   - **Technical Lead (TL)**: Drives diagnosis and fix; has hands on keyboard
   - **Communications Lead (CL)**: Writes stakeholder updates; handles customer communication; NOT on technical calls

### Step 2 — Immediate Mitigation Options (5–15 minutes)

The Technical Lead should attempt one of the following mitigations before root-cause analysis if the system is completely down:

| Option | Command | When to Use |
|--------|---------|------------|
| Rollback deployment | `kubectl rollout undo deployment/<svc> -n stayflexi` | Incident started after a recent deploy |
| Scale up | `kubectl scale deployment/<svc> -n stayflexi --replicas=8` | Overload / pod count insufficient |
| Rolling restart | `kubectl rollout restart deployment/<svc> -n stayflexi` | Suspected memory leak or hung processes |
| Disable feature flag | Set `FEATURE_<NAME>=false` in ConfigMap and restart | New feature causing cascading failure |
| Activate circuit breaker | Trip circuit breaker manually to isolate failing dependency | Upstream dependency causing cascading failures |
| Gateway traffic shedding | Reduce rate limit to 10 req/min, return 503 with `Retry-After: 60` | Overload protecting downstream services |

### Step 3 — Stakeholder Communication (P0: every 30 minutes)

Template for Slack `#incidents` and email to stakeholders:

```
[P0 UPDATE — T+30min]
Status: INVESTIGATING / MITIGATING / RESOLVED
Impact: All booking creation requests failing with 503
Affected users: ~<N> active sessions
Last action: Rolled back booking-service to v1.9.2
Next update: T+60min or when status changes
IC: @<name>
```

Customer-facing status page update (if breach > 10 minutes):
```
We are currently investigating an issue affecting booking creation.
Our team is actively working on a resolution. 
Current impact: Users may experience errors when creating bookings.
Start time: HH:MM UTC
```

---

## 3. P1 Response Procedure

**Target: acknowledge within 15 minutes.**

1. Acknowledge PagerDuty alert.
2. Post in `#incidents`: `P1 DECLARED — <description>. Investigating.`
3. Join incident bridge if multiple engineers needed.
4. Assign Technical Lead; IC role optional for P1.
5. Assess whether immediate mitigation is possible (rollback, scale up).
6. Update stakeholders every 1 hour.
7. Aim to resolve or downgrade to P2 within 4 hours.

---

## 4. War Room Protocol

### Roles and Responsibilities During Active Incident

| Role | Responsibilities | Who Fills It |
|------|-----------------|-------------|
| Incident Commander | Time-boxes investigations (15-min check-ins); decides when to escalate or change strategy; owns the incident channel | Senior SRE or Engineering Lead |
| Technical Lead | Diagnosis and remediation; directs other engineers; owns kubectl access | Most senior available engineer familiar with affected service |
| Communications Lead | Drafts all external comms; updates status page; interfaces with Support team; does NOT run commands | Engineering Manager or PM |
| Subject Matter Expert | Called in as needed for specific services (e.g., database admin for DB issues) | Service owner per `docs/architecture/SERVICE-OWNERSHIP.md` |

### P0 Communication Cadence

| Time Since Declaration | Action |
|-----------------------|--------|
| T+0 | Incident channel created; IC/TL/CL assigned |
| T+10 | First technical update in incident channel |
| T+15 | If not mitigated: Engineering Manager notified |
| T+30 | First stakeholder update (Slack + email) |
| T+30 (every 30 min) | Recurring stakeholder update until resolved |
| T+60 | If not resolved: VP Engineering notified; consider customer status page update |
| Resolution | All-clear in `#incidents`; post-incident review scheduled |

---

## 5. Common Incident Patterns

### Pattern 1: Booking API Down

**Symptoms:** 503 from `POST /api/v1/bookings`; booking-service pods not ready; or gateway timing out.

**Diagnosis flowchart:**

```bash
# Step 1: Is the gateway up?
curl -s https://api.stayflexi.com/health | jq .
# Expected: {"status":"ok"}
# If failing: check gateway pods

# Step 2: Are booking-service pods running?
kubectl get pods -n stayflexi -l app=booking-service
# If CrashLoopBackOff: kubectl logs -l app=booking-service -n stayflexi --previous

# Step 3: Is PostgreSQL reachable from booking-service?
kubectl exec deployment/booking-service -n stayflexi -- \
  node -e "const {getPrismaClient}=require('@stayflexi/shared-database'); getPrismaClient().\$queryRaw\`SELECT 1\`.then(()=>console.log('DB OK')).catch(e=>console.error('DB FAIL',e.message))"

# Step 4: Is Redis reachable?
kubectl exec deployment/booking-service -n stayflexi -- \
  node -e "const Redis=require('ioredis'); const r=new Redis(process.env.REDIS_URL,{lazyConnect:true}); r.connect().then(()=>r.ping()).then(console.log).catch(e=>console.error('REDIS FAIL',e.message))"

# Step 5: Check for distributed lock starvation (all lock slots taken)
kubectl exec deployment/booking-service -n stayflexi -- \
  node -e "const Redis=require('ioredis'); const r=new Redis(process.env.REDIS_URL,{lazyConnect:true}); r.connect().then(()=>r.keys('stayflexi:lock:*')).then(k=>console.log('Active locks:',k.length,k.slice(0,10))).catch(console.error)"

# Step 6: Check recent deployment
kubectl rollout history deployment/booking-service -n stayflexi
```

**Resolution options:**
- If PostgreSQL failure → Scenario 1 in `platform-validation/reports/checklists/recovery.md`
- If Redis failure → Scenario 2 in recovery runbook
- If crash loop → rollback: `kubectl rollout undo deployment/booking-service -n stayflexi`
- If lock starvation (stale locks): `redis-cli KEYS "stayflexi:lock:*" | xargs redis-cli DEL` (CAUTION: only do this if no bookings are in flight)

---

### Pattern 2: Payment Failures Spiking

**Symptoms:** `payment_processing_total{status="failed"}` rising; customers reporting payment errors; `POST /api/v1/payments` returning 500 or 422.

**Diagnosis:**

```bash
# Check payment-service logs for error pattern
kubectl logs -f -l app=payment-service -n stayflexi --tail=200 | \
  grep -E '"level":"error"'

# Check for external payment gateway connectivity
kubectl exec deployment/payment-service -n stayflexi -- \
  curl -s --max-time 5 https://api.paymentgateway.com/health | jq .

# Check idempotency store for stuck PROCESSING entries
kubectl exec deployment/payment-service -n stayflexi -- \
  node -e "const Redis=require('ioredis'); const r=new Redis(process.env.REDIS_URL,{lazyConnect:true}); r.connect().then(()=>r.keys('stayflexi:idempotency:payment:*')).then(k=>k.filter(async key=>await r.get(key)==='__PROCESSING__')).then(console.log)"

# Check for database issues (payment table locks)
kubectl exec deployment/pgbouncer -n stayflexi -- \
  psql -h postgres-primary -U postgres -c "
  SELECT pid, state, query_start, now()-query_start AS duration, query
  FROM pg_stat_activity
  WHERE state != 'idle' AND query ILIKE '%payment%'
  ORDER BY duration DESC;"
```

**Resolution options:**
- If external gateway down: enable circuit breaker; return user-friendly error; retry when gateway recovers
- If stuck `PROCESSING` idempotency keys: delete stuck keys after confirming no active transactions
- If database locks: terminate blocking queries; check for long-running transactions
- If payment-service OOMKill: increase memory limit temporarily

---

### Pattern 3: Inventory Cache Poisoning

**Symptoms:** Customers reporting incorrect room availability; bookings succeeding for rooms that should be full; `inventory_cache_hit_ratio` high but bookings are incorrect.

**Detection:**

```bash
# Scan for suspicious inventory cache keys
kubectl exec deployment/booking-service -n stayflexi -- \
  node -e "const Redis=require('ioredis'); const r=new Redis(process.env.REDIS_URL,{lazyConnect:true}); r.connect().then(()=>r.scan('0','MATCH','stayflexi:inventory:avail:*','COUNT','100')).then(([cursor,keys])=>console.log('Found',keys.length,'inventory cache keys')).catch(console.error)"

# Compare cached availability with database truth for a specific hotel
# First get cached value:
redis-cli GET "stayflexi:inventory:avail:<hotelId>:<roomTypeId>:<date>"

# Then query database directly:
kubectl exec deployment/pgbouncer -n stayflexi -- \
  psql -h postgres-primary -U postgres -d stayflexi -c "
  SELECT total_inventory - reserved_inventory - blocked_inventory AS available
  FROM inventory
  WHERE hotel_id = '<hotelId>' AND room_type_id = '<roomTypeId>'
    AND inventory_date = '<date>'::date;"
```

**Resolution:**

```bash
# 1. Invalidate all inventory cache keys for affected hotel
redis-cli KEYS "stayflexi:inventory:avail:<hotelId>:*" | xargs redis-cli DEL

# 2. Force re-read from database (cache will repopulate on next request)
# 3. Verify consistency: run the comparison queries above again post-invalidation
# 4. Audit recent inventory mutations for the affected hotel
kubectl exec deployment/pgbouncer -n stayflexi -- \
  psql -h postgres-primary -U postgres -d stayflexi -c "
  SELECT * FROM audit_logs
  WHERE resource_type = 'inventory'
    AND metadata->>'hotelId' = '<hotelId>'
    AND created_at > NOW() - INTERVAL '4 hours'
  ORDER BY created_at DESC;"
```

---

### Pattern 4: Kafka Consumer Lag Growing

**Symptoms:** `kafka_consumer_lag` metric rising; notifications delayed; analytics data stale; workflow automations not firing.

**Diagnosis:**

```bash
# Check all consumer group lag
kafka-consumer-groups.sh --bootstrap-server kafka:9092 \
  --describe --all-groups 2>/dev/null | \
  awk 'NR>1 && $5>0 {print}' | sort -k5 -rn

# Check consumer pod CPU/memory (lag often caused by slow processing)
kubectl top pods -n stayflexi -l app=notification-service

# Check if consumer is connected at all
kafka-consumer-groups.sh --bootstrap-server kafka:9092 \
  --describe --group notification-service-consumer | \
  grep -E "CONSUMER-ID|ERROR"

# Check DLQ for failed messages
kafka-topics.sh --bootstrap-server kafka:9092 \
  --describe --topic notification.events.dlq
kafka-consumer-groups.sh --bootstrap-server kafka:9092 \
  --describe --group notification-service-dlq-consumer
```

**Resolution:**

```bash
# Option 1: Scale up consumer service if processing is slow
kubectl scale deployment/notification-service -n stayflexi --replicas=6

# Option 2: If consumer is not connected (no consumer IDs), restart
kubectl rollout restart deployment/notification-service -n stayflexi

# Option 3: If lag is growing due to burst, it will self-recover after burst subsides
# Monitor: watch -n 10 "kafka-consumer-groups.sh --bootstrap-server kafka:9092 --describe --group notification-service-consumer"

# Option 4: If lag is permanent backlog and message ordering allows skipping:
# Reset to latest (WARNING: skips unprocessed events)
kafka-consumer-groups.sh --bootstrap-server kafka:9092 \
  --group notification-service-consumer \
  --topic notification.events \
  --reset-offsets --to-latest --execute
```

---

### Pattern 5: OTA Sync Stuck

**Symptoms:** OTA sync jobs not completing; `ota-service` logs showing repeated retry errors; OTA reservations not appearing in booking-service; `ota_sync_duration_seconds` histogram accumulating long-tail samples.

**Diagnosis:**

```bash
# Check OTA service logs for error pattern
kubectl logs -f -l app=ota-service -n stayflexi --tail=200 | \
  grep -E '"level":"(error|warn)"'

# Check external OTA API connectivity
kubectl exec deployment/ota-service -n stayflexi -- \
  curl -s --max-time 10 https://api.booking.com/health

# Check sync job status in database
kubectl exec deployment/pgbouncer -n stayflexi -- \
  psql -h postgres-primary -U postgres -d stayflexi -c "
  SELECT id, provider_id, status, started_at, completed_at,
         now()-started_at AS running_for, retry_count, last_error
  FROM sync_jobs
  WHERE status IN ('RUNNING','FAILED')
  ORDER BY started_at DESC
  LIMIT 20;"

# Check OTA distributed lock (stuck sync lock)
redis-cli KEYS "stayflexi:ota:lock:*"
# If stale lock found (no active sync): redis-cli DEL "stayflexi:ota:lock:<providerId>"
```

**Resolution:**
- If external OTA API is down: ota-service retry worker (`services/ota-service/src/workers/RetryWorker.ts`) will retry with exponential backoff; no manual action needed
- If stuck sync lock: manually delete the Redis lock key after confirming no active sync
- If sync job in RUNNING state for > 30 minutes: mark as FAILED in DB and trigger re-sync
- If OTA API credentials expired: rotate credentials in `stayflexi-ota-secrets` Kubernetes Secret and restart ota-service

---

## 6. Post-Incident Review

### Timeline

| Action | Deadline |
|--------|----------|
| Incident timeline documented (5-why timeline) | Within 24 hours of resolution |
| Five-whys analysis completed | Within 48 hours |
| Action items created in Linear (project: PLAT-OPS) | Within 48 hours |
| Action items assigned with due dates | Within 72 hours |
| Post-incident review meeting (P0/P1 only) | Within 72 hours |
| Follow-up items resolved | Per ticket priority |

### Post-Incident Review Template

```markdown
## Post-Incident Review: [Incident Title]

**Incident ID**: INC-YYYYMMDD-XXX
**Severity**: P0/P1
**Duration**: HH:MM (detection to resolution)
**Impact**: [N users affected, N bookings failed, $N revenue at risk]

### Timeline
- HH:MM — Alert fired
- HH:MM — On-call acknowledged
- HH:MM — [Action taken]
- HH:MM — [Root cause identified]
- HH:MM — [Fix deployed]
- HH:MM — All-clear declared

### Root Cause (Five Whys)
1. Why did bookings fail? → booking-service pods in CrashLoopBackOff
2. Why were they crashing? → OOM after memory leak introduced in v2.0.3
3. Why was the leak introduced? → New caching logic did not clear accumulating references
4. Why was it not caught in testing? → Memory profiling not in CI/CD load test
5. Why was profiling not included? → No NFR for memory leak detection in test plan

### What Went Well
- Alertmanager fired within 2 minutes of issue onset
- Rollback completed in 8 minutes

### What Could Be Improved
- Memory profiling should be added to CI load test step

### Action Items
- [ ] PLAT-1234: Add clinic.js memory profiling to CI load test (Owner: @engineer, Due: 2026-06-01)
- [ ] PLAT-1235: Add OOMKill alert with specific pod identification (Owner: @sre, Due: 2026-05-28)
```
