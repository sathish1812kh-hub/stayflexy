# Deployment Workflow

## Environment Promotion Path

```
Local Dev  →  Staging  →  Production
(docker compose)  (k8s staging namespace)  (k8s prod namespace)
```

---

## Pre-Deployment Agent Sign-Off Matrix

| Check | Responsible Agent | Required Before |
|-------|-----------------|----------------|
| TypeScript compiles | `integration-governance-agent` | All environments |
| Unit tests pass | `qa-resilience-agent` | All environments |
| Platform validation passes | `qa-resilience-agent` | Staging + Production |
| Security secrets validated | `auth-security-agent` | Production only |
| Schema migration safe | `database-prisma-agent` | Staging + Production |
| Kafka topics configured | `kafka-event-agent` | Staging + Production |
| Docker images build | `infrastructure-devops-agent` | All environments |
| Health checks pass | `integration-governance-agent` | All environments |
| Metrics endpoint responds | `observability-sre-agent` | Staging + Production |
| Network policies tested | `infrastructure-devops-agent` | Production only |

---

## Staging Deployment (automated on `develop` branch push)

GitHub Actions: `.github/workflows/deploy-staging.yml`

```yaml
trigger: push to develop branch
steps:
  1. Build all 10 service images (parallel, tag: staging + sha-{commit})
  2. Push to GHCR (ghcr.io/stayflexi/{service}:staging)
  3. Apply K8s manifests to stayflexi-staging namespace
  4. Run prisma migrate deploy (wait for completion)
  5. Deploy all services (kubectl set image)
  6. Wait for rollout (kubectl rollout status, timeout 5m)
  7. Run health check validation
  8. Run smoke test suite
  9. Alert on failure (Slack webhook)
```

---

## Production Deployment (manual, requires semver tag)

GitHub Actions: `.github/workflows/deploy-production.yml`

```yaml
trigger: git tag v*.*.* (e.g., v2.1.0)
steps:
  1. Validate semver format
  2. Build all 10 service images (tag: v2.1.0 + latest)
  3. Push to GHCR
  4. Manual approval gate (GitHub Actions environment protection)
  5. Run prisma migrate deploy (production cluster, wait for completion)
  6. Deploy Tier 1 (auth, org) → wait for readiness
  7. Deploy Tier 2 (hotel, inventory) → wait
  8. Deploy Tier 3 (booking, payment) → wait
  9. Deploy Tier 4 (ota, analytics, notification, workflow) → wait
  10. Validate all health checks (20 probes across all services)
  11. Run integration smoke tests
  12. Mark deployment as successful or trigger automated rollback
```

---

## Automated Rollback Triggers

Production deployment rolls back automatically if within 5 minutes of deployment:
- Any service's health check fails 3 consecutive times
- Error rate > 5% on any service (Prometheus alert)
- p99 latency > 10s on any critical service (auth, booking, payment)

Rollback procedure (automated):
```bash
for svc in auth organization hotel inventory booking payment ota analytics notification workflow; do
  kubectl rollout undo deployment/${svc}-service -n stayflexi
done
kubectl rollout status deployment --namespace stayflexi  # wait for rollback
# Notify team via PagerDuty + Slack
```

---

## Service Deployment Configuration

Each service K8s Deployment references these ConfigMap keys:
```yaml
env:
  - name: KAFKA_ENABLED
    valueFrom: { configMapKeyRef: { name: stayflexi-config, key: KAFKA_ENABLED } }
  - name: OTEL_ENABLED
    valueFrom: { configMapKeyRef: { name: stayflexi-config, key: OTEL_ENABLED } }
  - name: JAEGER_ENDPOINT
    valueFrom: { configMapKeyRef: { name: stayflexi-config, key: JAEGER_ENDPOINT } }
  - name: DATABASE_URL
    valueFrom: { secretKeyRef: { name: stayflexi-app-secrets, key: DATABASE_URL } }
  - name: REDIS_URL
    valueFrom: { secretKeyRef: { name: stayflexi-app-secrets, key: REDIS_URL } }
  - name: SERVICE_KEY
    valueFrom: { secretKeyRef: { name: stayflexi-app-secrets, key: SERVICE_KEY } }
```

---

## Secrets Management

Owner: `auth-security-agent` (review), `infrastructure-devops-agent` (execution)

Pre-production checklist:
```bash
# Verify no placeholder secrets remain
kubectl get secret stayflexi-app-secrets -n stayflexi -o json | \
  python3 -c "import sys,json,base64; \
  s=json.load(sys.stdin); \
  [print(f'PLACEHOLDER: {k}') for k,v in s['data'].items() \
   if 'placeholder' in base64.b64decode(v).decode().lower() or \
      'change' in base64.b64decode(v).decode().lower()]"

# Required secrets:
# DATABASE_URL, REDIS_URL, JWT_SECRET (≥32 chars), JWT_REFRESH_SECRET (≥32 chars)
# SERVICE_KEY (≥32 chars), WEBHOOK_SECRET, KAFKA_BROKERS
```
