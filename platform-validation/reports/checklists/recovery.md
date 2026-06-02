# Disaster Recovery Procedures — Stayflexi v2.0.0

> Owner: Platform Engineering / SRE  
> RTO Target: ≤ 60 minutes  
> RPO Target: ≤ 15 minutes  
> Last updated: 2026-05-18  
> Last DR drill: 2026-04-15 (quarterly)

---

## RPO/RTO Targets

| Target | Value | How Achieved |
|--------|-------|-------------|
| Recovery Time Objective (RTO) | ≤ 60 minutes | Kubernetes rolling restart + automated failover |
| Recovery Point Objective (RPO) | ≤ 15 minutes | WAL archiving (continuous) + Redis RDB snapshot every 15 minutes |
| Booking API MTTR | ≤ 30 minutes | Automated health checks + runbook procedures |
| Payment data RPO | ≤ 5 minutes | Synchronous replication to hot standby |

---

## Backup Procedures

### PostgreSQL Backup

**Full logical backup (daily, 02:00 UTC):**
```bash
# Scheduled via Kubernetes CronJob in infrastructure/kubernetes/
pg_dump -Fc \
  -d "$DATABASE_URL" \
  -f "/backup/stayflexi-$(date +%Y%m%d-%H%M%S).dump"

# Upload to object storage (S3-compatible)
aws s3 cp /backup/stayflexi-$(date +%Y%m%d)*.dump \
  s3://stayflexi-backups/postgresql/daily/ \
  --storage-class STANDARD_IA
```

**Verify backup integrity:**
```bash
pg_restore --list /backup/stayflexi-20260518-020000.dump | head -20
# Should show: TABLE DATA public bookings, TABLE DATA public payments, etc.
```

**WAL archiving (continuous, for PITR):**
```
# postgresql.conf settings required:
wal_level = replica
archive_mode = on
archive_command = 'aws s3 cp %p s3://stayflexi-backups/wal/%f'
archive_timeout = 60   # Force WAL segment switch every 60s at most
```

**Retention policy:**
- Daily full backups: 30 days on S3 (`STANDARD_IA` storage class)
- WAL archives: 30 days
- Monthly backup snapshot: 12 months (taken on 1st of month)

### Redis Backup

**AOF persistence (continuous):**
```
# redis.conf settings:
appendonly yes
appendfsync everysec
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

**RDB snapshot (every 15 minutes):**
```
# redis.conf settings:
save 900 1
save 300 10
save 60 10000

# Or trigger manually:
redis-cli BGSAVE
redis-cli LASTSAVE  # Returns Unix timestamp of last successful save
```

**Upload RDB to object storage (every 15 minutes via cron):**
```bash
redis-cli BGSAVE && sleep 2
redis-cli LASTSAVE  # Confirm completion
cp /data/dump.rdb /backup/redis-$(date +%Y%m%d-%H%M).rdb
aws s3 cp /backup/redis-$(date +%Y%m%d-%H%M).rdb \
  s3://stayflexi-backups/redis/
```

### Kafka Offset Backup

```bash
# Export consumer group offsets to S3 daily
kafka-consumer-groups.sh --bootstrap-server kafka:9092 \
  --describe --all-groups \
  > /backup/kafka-offsets-$(date +%Y%m%d).txt

aws s3 cp /backup/kafka-offsets-$(date +%Y%m%d).txt \
  s3://stayflexi-backups/kafka/offsets/
```

---

## Restore Procedures

### PostgreSQL Restore from Backup

**Full restore from logical backup:**
```bash
# 1. Ensure target database is empty or create new database
createdb stayflexi_restore -U postgres

# 2. Restore
pg_restore \
  -d stayflexi_restore \
  -U postgres \
  --no-owner \
  --role=stayflexi_app \
  -j 4 \
  /backup/stayflexi-20260518-020000.dump

# 3. Verify row counts
psql -d stayflexi_restore -U postgres -c "
SELECT table_name, n_live_tup 
FROM pg_stat_user_tables 
ORDER BY n_live_tup DESC 
LIMIT 10;"

# 4. Update services to point to restored database
kubectl create secret generic stayflexi-db-secret \
  --from-literal=DATABASE_URL=postgresql://stayflexi_app:<pass>@pgbouncer:5432/stayflexi_restore \
  -n stayflexi --dry-run=client -o yaml | kubectl apply -f -

kubectl rollout restart deployment -n stayflexi
```

**Point-in-time recovery (PITR):**
```bash
# 1. Restore base backup
# 2. Create recovery.conf (PostgreSQL 12+: use postgresql.conf recovery settings)
cat >> /var/lib/postgresql/data/postgresql.conf << 'EOF'
restore_command = 'aws s3 cp s3://stayflexi-backups/wal/%f %p'
recovery_target_time = '2026-05-18 14:30:00 UTC'
recovery_target_action = 'promote'
EOF

# 3. Create standby.signal to trigger recovery mode
touch /var/lib/postgresql/data/standby.signal

# 4. Start PostgreSQL; it will replay WAL to the target time
# 5. Verify: psql -c "SELECT now(), pg_last_xact_replay_timestamp();"
```

### Redis Restore from RDB

```bash
# 1. Stop Redis (or use replication-based approach in production)
kubectl scale deployment redis -n stayflexi --replicas=0

# 2. Copy RDB file into place
aws s3 cp s3://stayflexi-backups/redis/redis-20260518-1400.rdb /data/dump.rdb

# 3. Set correct permissions
chown redis:redis /data/dump.rdb

# 4. Start Redis
kubectl scale deployment redis -n stayflexi --replicas=1

# 5. Verify data loaded
redis-cli INFO keyspace
# Should show: db0:keys=<count>,expires=<count>
```

**Zero-downtime restore via replica promotion:**
```bash
# 1. Start a new Redis replica from the backup RDB
# 2. Verify data integrity on replica
# 3. Failover Sentinel to new primary
redis-cli -h sentinel-host -p 26379 SENTINEL FAILOVER mymaster
```

### Kafka Consumer Offset Reset

```bash
# Reset consumer group to earliest (reprocess all events)
kafka-consumer-groups.sh --bootstrap-server kafka:9092 \
  --group booking-service-consumer \
  --topic booking.events \
  --reset-offsets --to-earliest \
  --execute

# Reset to specific datetime (reprocess from a point in time)
kafka-consumer-groups.sh --bootstrap-server kafka:9092 \
  --group booking-service-consumer \
  --topic booking.events \
  --reset-offsets \
  --to-datetime 2026-05-18T12:00:00.000 \
  --execute

# Reset to latest (skip backlog, catch up from now)
kafka-consumer-groups.sh --bootstrap-server kafka:9092 \
  --group booking-service-consumer \
  --topic booking.events \
  --reset-offsets --to-latest \
  --execute
```

---

## Runbook Scenarios

### Scenario 1: PostgreSQL Primary Failure

**Symptoms:** All services reporting `DATABASE_URL connection refused`; booking creation failing with 503; `kubectl logs -f -l app=booking-service -n stayflexi` shows Prisma connection errors.

**Procedure:**

1. Verify primary is down:
   ```bash
   kubectl exec deployment/pgbouncer -n stayflexi -- \
     psql -h postgres-primary -U postgres -c "SELECT 1;" 2>&1
   ```

2. Promote the replica to primary (if using Patroni/repmgr):
   ```bash
   # With Patroni:
   patronictl -c /etc/patroni/patroni.yml failover stayflexi --master postgres-primary --candidate postgres-replica-0 --force

   # With repmgr:
   repmgr -h postgres-replica-0 -U repmgr -d repmgr standby promote
   ```

3. Update PgBouncer connection string to point to new primary:
   ```bash
   kubectl create secret generic stayflexi-db-secret \
     --from-literal=DATABASE_URL=postgresql://stayflexi_app:<pass>@postgres-replica-0:5432/stayflexi \
     -n stayflexi --dry-run=client -o yaml | kubectl apply -f -
   ```

4. Rolling restart all services to pick up new connection:
   ```bash
   kubectl rollout restart deployment -n stayflexi
   kubectl rollout status deployment/booking-service -n stayflexi --timeout=3m
   ```

5. Verify health:
   ```bash
   kubectl get pods -n stayflexi  # All Running
   curl https://api.stayflexi.com/health  # 200 OK
   ```

6. Rebuild the old primary as a new replica; do not reintroduce as primary without investigation.

**Expected recovery time:** 10–20 minutes

---

### Scenario 2: Redis Failure

**Symptoms:** Booking-service logs show lock acquisition errors; auth-service logs show session cache misses; notification-service dedup not working.

**Procedure:**

1. Verify Redis is down:
   ```bash
   kubectl exec deployment/booking-service -n stayflexi -- \
     node -e "const Redis=require('ioredis'); const r=new Redis(process.env.REDIS_URL); r.ping().then(console.log).catch(console.error)"
   ```

2. Services degrade gracefully:
   - booking-service: `RedisDistributedLock.acquire` returns null → throws `ConflictError` → clients receive 409; booking creation continues but with reduced concurrency protection
   - notification-service: `checkDedup` returns false (fail-open) → allow messages through; possible duplicates
   - auth-service: session cache misses → falls back to JWT validation only (stateless path)
   - Rate limiter in gateway: fails open (requests allowed through)

3. Alert on-call team immediately; Redis failure affects overbooking protection.

4. Bring up new Redis instance:
   ```bash
   kubectl rollout restart deployment/redis -n stayflexi
   kubectl rollout status deployment/redis -n stayflexi --timeout=5m
   ```

5. If data loss acceptable (Redis is a cache), services auto-reconnect and warm cache organically.

6. If Redis state must be restored (idempotency keys, active locks):
   - Restore from latest RDB backup (see restore procedure above)
   - Wait for services to detect new Redis and reconnect (ioredis auto-reconnect with backoff)

7. Verify lock service health:
   ```bash
   redis-cli KEYS "stayflexi:lock:*"  # Should be empty after recovery (no stale locks)
   redis-cli KEYS "stayflexi:idempotency:*" | wc -l  # Count idempotency keys
   ```

8. Cache warm-up: optionally trigger a cache warm-up request for hotel/inventory data.

**Expected recovery time:** 5–15 minutes (cache warm-up takes additional 5–10 minutes)

---

### Scenario 3: Kafka Broker Failure

**Symptoms:** Event publishing failing; consumer lag growing; services logging `KafkaJS could not connect to broker`.

**Procedure:**

1. Identify failed broker:
   ```bash
   kafka-broker-api-versions.sh --bootstrap-server kafka:9092 2>&1 | grep -v CONNECTED
   ```

2. If remaining brokers handle load (replication factor ≥ 3, min.insync.replicas = 2):
   - With 2 of 3 brokers healthy, all topics continue operating (2 >= min.insync.replicas)
   - Services continue producing and consuming without intervention

3. Check consumer lag to verify no backlog:
   ```bash
   kafka-consumer-groups.sh --bootstrap-server kafka:9092 \
     --describe --all-groups 2>/dev/null | awk 'NR>1 {print $5}' | sort -rn | head -5
   ```

4. Fix failed broker (restart pod or provision replacement node):
   ```bash
   kubectl rollout restart statefulset/kafka -n kafka
   ```

5. Verify broker rejoins cluster:
   ```bash
   kafka-broker-api-versions.sh --bootstrap-server kafka:9092
   # All broker IDs should appear
   ```

6. Check partition leader distribution (rebalance if uneven):
   ```bash
   kafka-topics.sh --describe --bootstrap-server kafka:9092 --topic booking.events
   # Verify leader distribution across brokers
   ```

7. If min.insync.replicas violation causes producer failures (ERROR: NOT_ENOUGH_REPLICAS):
   - Services will accumulate in-memory events or fail; check application logs
   - Restore third broker before producers recover

**Expected recovery time:** 5–30 minutes depending on broker recovery

---

### Scenario 4: Service Crash Loop

**Symptoms:** Pod in `CrashLoopBackOff`; bookings timing out at gateway with 503.

**Procedure:**

1. Identify crashing pod:
   ```bash
   kubectl get pods -n stayflexi | grep -v Running
   # Example: booking-service-7d9f4c-abc12  0/1  CrashLoopBackOff  5  3m
   ```

2. Get crash logs:
   ```bash
   # Current container logs
   kubectl logs booking-service-7d9f4c-abc12 -n stayflexi --tail=100
   
   # Previous container logs (before last crash)
   kubectl logs booking-service-7d9f4c-abc12 -n stayflexi --previous --tail=100
   ```

3. Check for OOMKill:
   ```bash
   kubectl describe pod booking-service-7d9f4c-abc12 -n stayflexi | grep -A5 "Last State:"
   # OOMKilled: exit code 137
   ```

4. If OOMKill: temporarily increase memory limit:
   ```bash
   kubectl patch deployment booking-service -n stayflexi --type=json \
     -p='[{"op":"replace","path":"/spec/template/spec/containers/0/resources/limits/memory","value":"2Gi"}]'
   ```

5. If application error (non-OOM crash): check for config, secret, or migration issues:
   ```bash
   # Verify secrets are mounted
   kubectl exec deployment/booking-service -n stayflexi -- env | grep -E "DATABASE_URL|REDIS_URL|JWT_SECRET"
   
   # Verify database connectivity
   kubectl exec deployment/booking-service -n stayflexi -- \
     node -e "require('@stayflexi/shared-database').getPrismaClient().\$queryRaw\`SELECT 1\`.then(()=>console.log('DB OK')).catch(console.error)"
   ```

6. Rollback to last known good version:
   ```bash
   # Check rollout history
   kubectl rollout history deployment/booking-service -n stayflexi
   
   # Rollback to previous version
   kubectl rollout undo deployment/booking-service -n stayflexi
   
   # Verify recovery
   kubectl rollout status deployment/booking-service -n stayflexi --timeout=5m
   ```

7. Investigate root cause in staging before re-deploying fixed version.

**Expected recovery time:** 5–15 minutes (rollback) or 30–60 minutes (fix and redeploy)

---

### Scenario 5: Database Connection Pool Exhaustion

**Symptoms:** All service requests failing with `too many connections`; `pg_stat_activity` shows `max_connections` reached; PgBouncer logs show `no more connections allowed`.

**Diagnosis:**
```bash
# Check current PostgreSQL connections
kubectl exec deployment/pgbouncer -n stayflexi -- \
  psql -h postgres-primary -U postgres -c "
  SELECT count(*), state, usename
  FROM pg_stat_activity
  GROUP BY state, usename
  ORDER BY count DESC;"

# Check PgBouncer stats
kubectl exec deployment/pgbouncer -n stayflexi -- \
  psql -h localhost -p 5432 -U pgbouncer pgbouncer -c "SHOW POOLS;"
```

**Procedure:**

1. Immediately kill idle connections over 5 minutes old:
   ```sql
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE state = 'idle'
     AND query_start < NOW() - INTERVAL '5 minutes'
     AND usename != 'postgres';
   ```

2. Scale down non-critical services to release connection slots:
   ```bash
   kubectl scale deployment analytics-service -n stayflexi --replicas=1
   kubectl scale deployment ota-service -n stayflexi --replicas=1
   kubectl scale deployment workflow-service -n stayflexi --replicas=1
   ```

3. Increase PgBouncer pool size (temporary):
   ```bash
   # Edit PgBouncer config and reload
   kubectl exec deployment/pgbouncer -n stayflexi -- \
     psql -h localhost -U pgbouncer pgbouncer -c "
     SET default_pool_size=40;
     RELOAD;"
   ```

4. Investigate root cause: connection leak in application code (Prisma `$disconnect()` not called), or sustained traffic spike.

5. Permanent fix: increase PgBouncer pool_size in configmap and apply; or increase PostgreSQL `max_connections` (requires restart).

6. Scale services back up after pool is healthy.

**Expected recovery time:** 5–10 minutes

---

## Testing Schedule

| Test Type | Frequency | Owner | Procedure |
|-----------|-----------|-------|-----------|
| DR Drill (full failover simulation) | Quarterly | SRE Lead | Simulate primary DB failure in staging; measure actual RTO/RPO |
| Backup Restore Test | Monthly | On-call engineer | Restore latest PostgreSQL backup to staging; verify data integrity |
| Redis Failover Test | Monthly (staging) | On-call engineer | Kill Redis primary; verify Sentinel promotes replica; verify services recover |
| Kafka Broker Failure Test | Quarterly (staging) | SRE Lead | Kill one broker; verify no message loss with RF≥3 |
| Runbook Review | Quarterly | Platform Engineering | Walk through all 5 scenarios; update procedures if platform has changed |

### Monthly Backup Restore Verification Checklist

- [ ] Download latest backup from S3: `aws s3 ls s3://stayflexi-backups/postgresql/daily/ | tail -5`
- [ ] Restore to staging PostgreSQL: `pg_restore -d stayflexi_staging ...`
- [ ] Verify row counts match production snapshot
- [ ] Verify key tables: `bookings`, `payments`, `inventory`, `users`
- [ ] Run application smoke tests against restored database
- [ ] Document restore duration and any issues in incident log
- [ ] `pg_restore --list backup.dump | wc -l` matches expected table count
