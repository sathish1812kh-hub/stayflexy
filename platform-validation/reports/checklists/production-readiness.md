# Production Readiness Checklist — Stayflexi v2.0.0

> Last updated: 2026-05-18  
> All items must be checked before any production deployment. Items marked with a service name apply only to that service.

---

## Infrastructure

### Kubernetes Cluster
- [ ] Cluster version is Kubernetes 1.29 or later (check: `kubectl version --short`)
- [ ] Minimum 3 worker nodes across 3 availability zones
- [ ] Node auto-provisioner or Cluster Autoscaler configured
- [ ] `stayflexi` namespace created: `kubectl apply -f infrastructure/kubernetes/namespace.yaml`
- [ ] RBAC policies applied: `kubectl apply -f infrastructure/kubernetes/rbac.yaml`
- [ ] ConfigMap applied: `kubectl apply -f infrastructure/kubernetes/configmap.yaml`
- [ ] Ingress controller (nginx-ingress) deployed and healthy
- [ ] Ingress resource applied: `kubectl apply -f infrastructure/kubernetes/ingress.yaml`
- [ ] Image pull secret `regcred` configured in `stayflexi` namespace: `kubectl get secret regcred -n stayflexi`

### Docker Images
- [ ] All 11 service images built and pushed to container registry with tag matching `version: "2.0.0"` in deployment manifests
  - `stayflexi/auth-service:2.0.0`
  - `stayflexi/organization-service:2.0.0`
  - `stayflexi/hotel-service:2.0.0`
  - `stayflexi/inventory-service:2.0.0`
  - `stayflexi/booking-service:2.0.0`
  - `stayflexi/payment-service:2.0.0`
  - `stayflexi/ota-service:2.0.0`
  - `stayflexi/analytics-service:2.0.0`
  - `stayflexi/notification-service:2.0.0`
  - `stayflexi/workflow-service:2.0.0`
  - `stayflexi/api-gateway:2.0.0`
- [ ] All images scanned with Trivy (zero critical CVEs): `trivy image stayflexi/booking-service:2.0.0`
- [ ] All images run as non-root user (UID 1001, confirmed in Dockerfiles)

### Kubernetes Manifests
- [ ] All service deployments applied: `kubectl apply -f infrastructure/kubernetes/services/`
- [ ] All HPA objects created and reporting metrics: `kubectl get hpa -n stayflexi`
- [ ] All service Service objects created: `kubectl get svc -n stayflexi`
- [ ] PodDisruptionBudgets applied for all services: `kubectl get pdb -n stayflexi`
- [ ] PersistentVolumeClaims for PostgreSQL bound: `kubectl get pvc -n stayflexi`
- [ ] StorageClass with `WaitForFirstConsumer` binding mode configured

---

## Database

### PostgreSQL Setup
- [ ] PostgreSQL 15+ cluster running with primary and at least one read replica
- [ ] PgBouncer deployed in transaction pooling mode, `pool_mode = transaction`
- [ ] PgBouncer `max_client_conn = 1000`, `default_pool_size = 25` per database
- [ ] Per-service connection limits enforced via `ALTER ROLE <svc_user> CONNECTION LIMIT 50`
- [ ] All Prisma migrations applied: `npx prisma migrate deploy` (run from monorepo root)
- [ ] Migration status clean: `npx prisma migrate status`

### Required Database Indexes
- [ ] `CREATE INDEX CONCURRENTLY idx_bookings_org_hotel_status ON bookings(organization_id, hotel_id, status);`
- [ ] `CREATE INDEX CONCURRENTLY idx_inventory_hotel_roomtype_date ON inventory(hotel_id, room_type_id, inventory_date);`
- [ ] `CREATE INDEX CONCURRENTLY idx_payments_booking_status ON payments(booking_id, status);`
- [ ] `CREATE INDEX CONCURRENTLY idx_audit_logs_org_created ON audit_logs(organization_id, created_at DESC);`
- [ ] `CREATE INDEX CONCURRENTLY idx_bookings_checkin_checkout ON bookings(check_in_date, check_out_date) WHERE status != 'CANCELLED';`
- [ ] `CREATE INDEX CONCURRENTLY idx_booking_rooms_room_dates ON booking_rooms(room_id, check_in_date, check_out_date);`
- [ ] All indexes verified present: `SELECT indexname FROM pg_indexes WHERE tablename IN ('bookings','inventory','payments','audit_logs');`

### Database Configuration
- [ ] `max_connections = 200` in postgresql.conf (PgBouncer handles multiplexing)
- [ ] `shared_buffers = 4GB` (or 25% of available RAM)
- [ ] `work_mem = 64MB`
- [ ] `wal_level = replica` for streaming replication
- [ ] `log_min_duration_statement = 500` (log slow queries > 500ms)
- [ ] `pg_stat_statements` extension enabled
- [ ] Connection string for each service uses PgBouncer endpoint, not PostgreSQL directly

---

## Redis

- [ ] Redis 7.2+ deployed in Sentinel mode with 3 Sentinel nodes (or Redis Cluster with 3 primary shards)
- [ ] `maxmemory` set to 80% of available RAM (e.g., `maxmemory 6gb`)
- [ ] `maxmemory-policy allkeys-lru`
- [ ] Keyspace notifications enabled: `notify-keyspace-events KEA` (or at minimum `notify-keyspace-events Ex` for expiry events)
- [ ] AOF persistence enabled: `appendonly yes`, `appendfsync everysec`
- [ ] RDB persistence enabled: `save 900 1`, `save 300 10`, `save 60 10000`
- [ ] Redis password/ACL configured; no anonymous access
- [ ] Redis Sentinel quorum = 2 (majority of 3)
- [ ] `REDIS_URL` secret points to Sentinel endpoint, not direct Redis node
- [ ] Redis slow log threshold: `slowlog-log-slower-than 10000` (10ms)
- [ ] `redis-cli PING` returns `PONG` from all nodes

---

## Kafka

- [ ] Kafka 3.6+ cluster with minimum 3 brokers across 3 AZs
- [ ] `auto.create.topics.enable = false` in all broker configs
- [ ] Topics pre-created with correct settings (replication factor ≥ 3, min.insync.replicas = 2):

```bash
kafka-topics.sh --create --topic booking.events \
  --replication-factor 3 --partitions 12 \
  --config min.insync.replicas=2 \
  --config retention.ms=604800000 \
  --bootstrap-server kafka:9092

kafka-topics.sh --create --topic payment.events \
  --replication-factor 3 --partitions 6 \
  --config min.insync.replicas=2 \
  --config retention.ms=604800000 \
  --bootstrap-server kafka:9092

kafka-topics.sh --create --topic inventory.events \
  --replication-factor 3 --partitions 12 \
  --config min.insync.replicas=2 \
  --config retention.ms=604800000 \
  --bootstrap-server kafka:9092

kafka-topics.sh --create --topic notification.events \
  --replication-factor 3 --partitions 6 \
  --config min.insync.replicas=2 \
  --config retention.ms=604800000 \
  --bootstrap-server kafka:9092

kafka-topics.sh --create --topic workflow.events \
  --replication-factor 3 --partitions 6 \
  --config min.insync.replicas=2 \
  --config retention.ms=604800000 \
  --bootstrap-server kafka:9092
```

- [ ] Dead-letter topics created: `booking.events.dlq`, `payment.events.dlq`, `inventory.events.dlq`, `notification.events.dlq`, `workflow.events.dlq`
- [ ] All topics confirmed present: `kafka-topics.sh --list --bootstrap-server kafka:9092`
- [ ] `acks = all` (acks=-1) set in all producer configs
- [ ] `enable.idempotence = true` for all producers
- [ ] Consumer group offsets committed: verify with `kafka-consumer-groups.sh --describe --group <group> --bootstrap-server kafka:9092`

---

## Security

- [ ] `JWT_SECRET` generated with: `openssl rand -hex 32` (64 hex chars = 256-bit entropy)
- [ ] `JWT_SECRET` stored in Kubernetes Secret `stayflexi-jwt-secret`, NOT in ConfigMap
- [ ] `SERVICE_KEY` generated per service with `openssl rand -hex 16` and stored in `stayflexi-service-secret`
- [ ] CORS `allowedOrigins` in `infrastructure/gateway/src/middleware/security.ts` does NOT include `*` in production; only production domains listed
- [ ] HTTPS enforced at ingress; HTTP redirects to HTTPS via `nginx.ingress.kubernetes.io/ssl-redirect: "true"`
- [ ] TLS certificates issued via cert-manager with Let's Encrypt or internal CA
- [ ] cert-manager ClusterIssuer verified: `kubectl get clusterissuer`
- [ ] Rate limiting at gateway: `maxRequests = 100` per 60-second window (in `infrastructure/gateway/src/middleware/rateLimit.ts`)
- [ ] `BruteForceProtector` in auth-service: max 5 attempts per 15-minute window (`services/auth-service/src/application/services/BruteForceProtector.ts`)
- [ ] Kubernetes Secrets RBAC: only service accounts in `stayflexi` namespace can read their respective secrets
- [ ] No secrets hard-coded in any Dockerfile (confirmed via `grep -rn "SECRET\|PASSWORD\|KEY" services/*/Dockerfile`)
- [ ] Network policies applied restricting pod-to-pod traffic to service mesh only
- [ ] Container security context enforced: `runAsNonRoot: true`, `readOnlyRootFilesystem: true`, `allowPrivilegeEscalation: false` (confirmed in `infrastructure/kubernetes/services/booking-service/deployment.yaml`)

---

## Observability

- [ ] Prometheus deployed in `monitoring` namespace; scrape interval = 15s
- [ ] All 11 service deployments have Prometheus annotations: `prometheus.io/scrape: "true"`, `prometheus.io/port`, `prometheus.io/path: "/metrics"`
- [ ] Grafana deployed and accessible; admin password rotated from default
- [ ] Grafana dashboards imported: Platform Overview, Booking Deep-Dive, Payment Processing, Inventory Availability, SLO Burn Rate
- [ ] Jaeger collector running and accepting traces on port 14268
- [ ] All services initialized with `initTracer` from `infrastructure/observability/src/tracer.ts`
- [ ] Loki deployed; Promtail DaemonSet running on all nodes and shipping pod logs
- [ ] Alertmanager configured with routes for:
  - [ ] p95 latency > 500ms for > 10 minutes → Slack `#alerts-warning`
  - [ ] Error rate > 1% for > 5 minutes → Slack `#alerts-warning`
  - [ ] p95 latency > 1s for > 5 minutes → PagerDuty
  - [ ] Error rate > 5% for > 2 minutes → PagerDuty
  - [ ] Pod OOMKill → PagerDuty
  - [ ] Disk usage > 80% → Slack `#alerts-warning`
- [ ] Alertmanager PagerDuty integration key configured
- [ ] Alertmanager Slack webhook URL configured
- [ ] `x-correlation-id` header propagation verified end-to-end (gateway → all services → log entries)

---

## Service Health & Availability

- [ ] All 11 service pods in `Running` state: `kubectl get pods -n stayflexi`
- [ ] All readiness probes passing: `kubectl get pods -n stayflexi -o wide` (all READY)
- [ ] Liveness probes configured with `initialDelaySeconds: 30`, `periodSeconds: 20`, `failureThreshold: 3`
- [ ] Readiness probes configured with `initialDelaySeconds: 10`, `periodSeconds: 10`, `successThreshold: 1`
- [ ] Resource requests and limits set for all containers (confirmed in deployment manifests)
- [ ] HPA configured for all services: `kubectl get hpa -n stayflexi`
  - [ ] `booking-service-hpa`: minReplicas=3, maxReplicas=10, CPU threshold=70%
  - [ ] `api-gateway-hpa`: minReplicas=2, maxReplicas=6
  - [ ] All other services: minReplicas=2, maxReplicas=8
- [ ] PodDisruptionBudgets set: `minAvailable: 1` for all services
- [ ] Rolling update strategy: `maxUnavailable: 1`, `maxSurge: 1` (booking-service: `maxUnavailable: 0`)
- [ ] Pod anti-affinity rules prevent multiple replicas on same node (confirmed in `infrastructure/kubernetes/services/booking-service/deployment.yaml`)
- [ ] `terminationGracePeriodSeconds: 30` set on all deployments

---

## CI/CD

- [ ] All 11 service CI pipelines green (passing unit + integration tests)
- [ ] `platform-validation` test suite passing: `cd platform-validation && npm test`
- [ ] Docker image vulnerability scan step in pipeline with Trivy; pipeline fails on critical CVEs
- [ ] Secrets stored in Kubernetes Secrets, referenced via `secretKeyRef` in all deployment manifests
- [ ] No secrets in ConfigMaps (confirmed via `kubectl get configmap stayflexi-config -n stayflexi -o yaml | grep -i secret`)
- [ ] Production deployment requires manual approval gate (environment protection rule)
- [ ] Deployment pipeline performs `kubectl rollout status deployment/<name> -n stayflexi --timeout=5m` as post-deploy verification
- [ ] Rollback procedure tested: `kubectl rollout undo deployment/<name> -n stayflexi`

---

## Backup

- [ ] Automated daily `pg_dump` scheduled (cron job at 02:00 UTC): `pg_dump -Fc -d $DATABASE_URL -f backup-$(date +%Y%m%d-%H%M%S).dump`
- [ ] Backup uploaded to object storage (S3-compatible) with lifecycle policy
- [ ] WAL archiving enabled for PITR capability
- [ ] Redis AOF file backed up every 15 minutes via `redis-cli BGSAVE` cronjob
- [ ] Backup retention policy: 30 days on object storage
- [ ] Restore procedure tested in staging environment within the last 30 days
- [ ] Backup restore verification: `pg_restore --list backup.dump | head -20` shows expected tables
- [ ] Kafka consumer group offsets exported to S3 daily

---

## Final Validation

- [ ] `platform-validation` full suite executed against staging: `npm test` in `platform-validation/`
- [ ] All contract tests passing: `platform-validation/src/contracts/`
- [ ] All resilience tests passing: `platform-validation/src/resilience/`
- [ ] Load test at 50% expected production traffic executed; all SLO thresholds met
- [ ] Booking creation: 50 VU × 60s → p95 < 500ms
- [ ] Inventory reads: 200 VU × 60s → p95 < 50ms (cache hit)
- [ ] Payment processing: 30 VU × 60s → p95 < 2000ms
- [ ] Notification dispatch: 100 VU × 60s → p95 < 200ms
- [ ] Incident response runbook reviewed by on-call team (`docs/runbooks/incident-response.md`)
- [ ] DR runbook reviewed and last drill date recorded (`docs/runbooks/recovery.md`)
- [ ] All SLO targets documented and agreed with stakeholders (`docs/runbooks/sre-operations.md`)
- [ ] Service ownership matrix reviewed and up to date (`docs/architecture/SERVICE-OWNERSHIP.md`)
