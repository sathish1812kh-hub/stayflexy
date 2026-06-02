# Security Hardening Checklist — Stayflexi v2.0.0

> Owner: Platform Security  
> Review cycle: Quarterly  
> Last updated: 2026-05-18  
> Compliance scope: PCI-DSS SAQ A-EP, GDPR Article 32

---

## Authentication & Authorization

- [ ] JWT `JWT_SECRET` is minimum 64 hex characters (256-bit entropy). Generate with: `openssl rand -hex 32`
- [ ] JWT access token expiry: 15 minutes (`expiresIn: '15m'` in `services/auth-service/src/application/services/TokenService.ts`)
- [ ] JWT refresh token expiry: 7 days; stored as hashed value in database
- [ ] JWT rotation procedure: quarterly key rotation documented; old tokens invalidated via Redis blacklist
- [ ] Refresh token revocation implemented via Redis blacklist key `stayflexi:auth:revoked:<tokenHash>` with TTL matching token remaining lifetime
- [ ] All refresh tokens invalidated on password change (confirmed in `LogoutUser` and `RegisterUser` use cases)
- [ ] MFA (TOTP) enforced for all admin accounts (role: ADMIN, SUPER_ADMIN)
- [ ] Service-to-service calls authenticated via `X-Service-Key` header; validated in `services/*/src/middleware/auth.ts`
- [ ] `SERVICE_KEY` values are unique per service (not shared); stored in `stayflexi-service-secret` Kubernetes Secret
- [ ] RBAC roles reviewed quarterly; unused roles removed; principle of least privilege enforced
- [ ] `BruteForceProtector` active in auth-service: max 5 failed attempts per 15-minute window per IP+email combination (`services/auth-service/src/application/services/BruteForceProtector.ts`)
- [ ] Auth rate limiting: 10 requests/minute on `POST /auth/login` and `POST /auth/register`
- [ ] Session invalidation on suspicious activity (multiple concurrent sessions from different geolocations)

---

## Secrets Management

- [ ] All secrets stored in Kubernetes Secrets, not ConfigMaps
  - `stayflexi-jwt-secret`: `JWT_SECRET`
  - `stayflexi-db-secret`: `DATABASE_URL`
  - `stayflexi-redis-secret`: `REDIS_URL`
  - `stayflexi-service-secret`: `SERVICE_KEY`
  - `stayflexi-kafka-secret`: `KAFKA_BROKERS`, `KAFKA_SSL_CERT`, `KAFKA_SSL_KEY`
- [ ] Kubernetes RBAC: only pods with `serviceAccountName: stayflexi-service-account` can read secrets; `kubectl auth can-i get secret -n stayflexi --as=system:serviceaccount:default:default` returns `no`
- [ ] No plaintext secrets in Dockerfiles: `grep -rn "ENV.*SECRET\|ENV.*PASSWORD\|ENV.*KEY" services/*/Dockerfile` returns nothing
- [ ] No plaintext secrets in ConfigMaps: `kubectl get configmap stayflexi-config -n stayflexi -o yaml | grep -iE "secret|password|key"` returns nothing sensitive
- [ ] Sealed Secrets or External Secrets Operator deployed: secrets encrypted at rest in Git
- [ ] Secret rotation procedure:
  1. Generate new secret: `openssl rand -hex 32`
  2. Update Kubernetes Secret: `kubectl create secret generic stayflexi-jwt-secret --from-literal=JWT_SECRET=<new> -n stayflexi --dry-run=client -o yaml | kubectl apply -f -`
  3. Rolling restart all services consuming the secret: `kubectl rollout restart deployment -n stayflexi`
  4. Verify all pods healthy post-rotation
  5. Revoke old JWTs if rotating JWT_SECRET (requires Redis blacklist population or short-lived token approach)
- [ ] `JWT_SECRET` rotation scheduled quarterly (next rotation: 2026-08-01)
- [ ] No secrets in application logs: Pino `redact` config includes `['req.headers.authorization', 'body.password', 'body.cardNumber']`

---

## Network Security

- [ ] Kubernetes NetworkPolicies applied:
  - [ ] Default-deny all ingress and egress in `stayflexi` namespace
  - [ ] Allow ingress to api-gateway from ingress-controller namespace only
  - [ ] Allow ingress to services from api-gateway namespace only
  - [ ] Allow egress from services to PostgreSQL namespace on port 5432
  - [ ] Allow egress from services to Redis namespace on port 6379/26379
  - [ ] Allow egress from services to Kafka namespace on port 9092
  - [ ] Allow egress from services to observability namespace (Jaeger: 14268, Prometheus: 9090)
- [ ] API gateway is the only public-facing ingress point; all service endpoints return 404 from external IPs
- [ ] All services deployed in `stayflexi` private namespace with no LoadBalancer-type services
- [ ] TLS termination at ingress; HSTS header enforced: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` (configured in `infrastructure/gateway/src/middleware/security.ts` via Helmet)
- [ ] Mutual TLS (mTLS) for inter-service communication in production (via Istio service mesh or cert-manager with auto-rotation)
- [ ] Kafka TLS client certificates required for all producers and consumers

---

## Container Security

- [ ] All Dockerfiles use non-root user: `USER 1001` (confirmed in base image build)
- [ ] `readOnlyRootFilesystem: true` in all deployment security contexts (`infrastructure/kubernetes/services/booking-service/deployment.yaml` line 101)
- [ ] `allowPrivilegeEscalation: false` in all containers
- [ ] `capabilities.drop: [ALL]` in all containers; no NET_ADMIN, SYS_PTRACE, or other privileged capabilities
- [ ] No containers running as `privileged: true`
- [ ] Trivy vulnerability scanning runs in CI pipeline on every build: `trivy image --exit-code 1 --severity CRITICAL stayflexi/<service>:<tag>`
- [ ] Image digest pinning in production deployments (use `image: stayflexi/booking-service@sha256:<digest>` instead of mutable tags)
- [ ] Base images pinned to specific digest, not `latest`
- [ ] `/tmp` and writable paths mounted as `emptyDir` volumes to work around `readOnlyRootFilesystem`
- [ ] No sensitive files in Docker image layers (verified with `docker history --no-trunc <image>`)

---

## Data Security

- [ ] PostgreSQL transparent encryption (TDE) enabled for data at rest
- [ ] Database backups encrypted with AES-256 before upload to object storage
- [ ] Payment card data (PAN, CVV, expiry) is never stored in any database table or log; payment service tokenizes via payment gateway
- [ ] PCI compliance: all card operations proxied through payment gateway; Stayflexi stores only payment tokens
- [ ] PII fields encrypted at the application layer for high-sensitivity data (passport numbers, government IDs in `booking_guests` table)
- [ ] Audit logs written for all data access events: auth, booking create/update/cancel, payment initiation/confirmation, admin actions
- [ ] Audit log retention: minimum 90 days hot (PostgreSQL), 1 year cold (object storage)
- [ ] GDPR data export endpoint implemented: `GET /api/v1/users/{id}/export` returns all user data as JSON
- [ ] GDPR data deletion endpoint implemented: `DELETE /api/v1/users/{id}` anonymizes PII fields; does not delete booking records (financial retention required)
- [ ] Data classification documented: PII (names, emails, phone, DoB, IDs), Financial (amounts, invoice numbers), Operational (booking data, inventory)
- [ ] Cross-border data transfer compliance: production data does not leave approved regions without DPA

---

## API Security

- [ ] Helmet.js security headers enforced on all responses (configured in `infrastructure/gateway/src/middleware/security.ts`):
  - `Content-Security-Policy`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Strict-Transport-Security`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] CORS restricted to production domain list; `*` not allowed in production
- [ ] Request body size limit: `express.json({ limit: '2mb' })` enforced on all service apps
- [ ] Input validation with Zod on all routes (confirmed: `BookingEventSchemas.ts`, booking/payment routes use Zod parse)
- [ ] SQL injection prevention: all database queries via Prisma parameterized queries; no raw string interpolation in `$queryRaw` calls
- [ ] `X-Correlation-Id` header validated as UUID format before propagation
- [ ] API versioning: all routes under `/api/v1/`; deprecated versions return `Sunset` header
- [ ] OpenAPI schema validation middleware on all public endpoints
- [ ] HTTP method restriction: only required methods allowed per endpoint (enforced in Express Router)

---

## Monitoring & Security Alerts

- [ ] Security events logged to centralized audit log with structured JSON: `{ level: "warn", event: "auth.brute_force_blocked", ip, email, timestamp }`
- [ ] Brute force detection active: `BruteForceProtector` tracks failures per IP+email, blocks after 5 attempts in 15-minute window
- [ ] Alert on 429 spike: `rate(http_requests_total{status="429"}[5m]) > 10` → Slack `#security-alerts`
- [ ] Alert on authentication failure spike: `rate(auth_failures_total[5m]) > 5` → Slack `#security-alerts`
- [ ] Alert on anomalous admin actions: `rate(audit_log_admin_actions_total[5m]) > 20` → PagerDuty
- [ ] JWT decode failures logged and alerted: potential replay or forgery attempts
- [ ] Rate limiting configured at gateway: 100 requests/minute per IP (global), 10/minute on auth endpoints
- [ ] Anomaly detection for booking patterns: > 10 bookings per minute from single user triggers alert

---

## Incident Response — Security

### Escalation Path

1. Detection (automated alert or user report)
2. On-call engineer acknowledges within P0/P1 SLA
3. Assess if data breach has occurred; if yes, immediately escalate to Engineering Manager + Legal
4. Engineering Manager notifies DPO (Data Protection Officer) within 1 hour of confirmed breach
5. DPO assesses if breach requires regulatory notification (threshold: personal data of EU residents)

### Data Breach Notification Procedure

EU GDPR Article 33 requires notification to supervisory authority within **72 hours** of becoming aware of a breach affecting EU personal data.

1. **Hour 0–2**: Contain the breach; revoke compromised credentials; isolate affected systems
2. **Hour 2–4**: Assess scope; identify affected users; preserve forensic evidence (do not delete logs)
3. **Hour 4–24**: Internal incident report drafted with: nature of breach, categories of data, approximate number of data subjects, likely consequences, measures taken
4. **Hour 24–48**: Legal review of breach report; determine notification requirements
5. **Hour 48–72**: Submit notification to supervisory authority if required; prepare user notification
6. **Day 3–30**: Full post-incident review; remediation; Article 30 record updated

### Forensic Log Retention

- Application logs (Loki): 30 days hot, 90 days cold (minimum for forensics)
- Kubernetes audit logs: 90 days
- Database audit logs: 1 year
- Network flow logs: 30 days
- Do NOT delete any logs when a security incident is under investigation; place a hold via object storage legal-hold API

---

## Quarterly Security Review Checklist

- [ ] JWT_SECRET rotated
- [ ] All service SERVICE_KEY values rotated
- [ ] RBAC roles reviewed; unused roles and service accounts removed
- [ ] Dependency audit: `npm audit --audit-level=high` across all services; high/critical findings remediated
- [ ] Trivy baseline scan of all production images; findings triaged
- [ ] Access review: remove stale user accounts from production systems
- [ ] Penetration test results reviewed; open findings tracked to remediation
- [ ] Security runbook reviewed and updated
