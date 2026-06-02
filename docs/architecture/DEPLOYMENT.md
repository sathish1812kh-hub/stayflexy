# Deployment Architecture

## Kubernetes Topology

```
Cluster: stayflexi-prod (GKE / EKS / AKS)
│
├── Namespace: stayflexi                 (production)
│   ├── Ingress (nginx-ingress)
│   ├── api-gateway        (Deployment, ClusterIP :8080)
│   ├── auth-service       (Deployment, ClusterIP :3001)
│   ├── org-service        (Deployment, ClusterIP :3002)
│   ├── hotel-service      (Deployment, ClusterIP :3003)
│   ├── inventory-service  (Deployment, ClusterIP :3004)
│   ├── booking-service    (Deployment, ClusterIP :3005)
│   ├── payment-service    (Deployment, ClusterIP :3006)
│   ├── ota-service        (Deployment, ClusterIP :3007)
│   ├── analytics-service  (Deployment, ClusterIP :3008)
│   ├── notification-svc   (Deployment, ClusterIP :3009)
│   ├── workflow-service   (Deployment, ClusterIP :3010)
│   ├── postgresql         (StatefulSet, ClusterIP :5432)
│   └── redis              (StatefulSet, ClusterIP :6379)
│
├── Namespace: stayflexi-staging         (staging)
│   └── [same topology, smaller replicas]
│
└── Namespace: stayflexi-monitoring
    ├── prometheus
    ├── grafana
    └── alertmanager
```

Ingress routes by path prefix:
```
/api/auth/*         → auth-service:3001
/api/organizations/*→ org-service:3002
/api/hotels/*       → hotel-service:3003
/api/inventory/*    → inventory-service:3004
/api/bookings/*     → booking-service:3005
/api/payments/*     → payment-service:3006
/api/ota/*          → ota-service:3007
/api/analytics/*    → analytics-service:3008
/api/revenue/*      → analytics-service:3008
/api/notifications/*→ notification-service:3009
/api/automation/*   → workflow-service:3010
/api/security/*     → workflow-service:3010
/api/compliance/*   → workflow-service:3010
/api/disaster-recovery/* → workflow-service:3010
/api/resilience/*   → workflow-service:3010
/api/intelligence/* → workflow-service:3010
/api/ai/*           → workflow-service:3010
```

---

## Scaling Configuration

### Horizontal Pod Autoscaler (HPA)

| Service              | Min Replicas | Max Replicas | Scale Up Trigger   |
|----------------------|--------------|--------------|-------------------|
| auth-service         | 2            | 10           | CPU > 70%          |
| org-service          | 2            | 5            | CPU > 70%          |
| hotel-service        | 2            | 8            | CPU > 70%          |
| inventory-service    | 2            | 10           | CPU > 60%          |
| booking-service      | 3            | 10           | CPU > 60%          |
| payment-service      | 3            | 10           | CPU > 60%          |
| ota-service          | 2            | 8            | CPU > 70%          |
| analytics-service    | 2            | 8            | CPU > 70%          |
| notification-service | 2            | 10           | Queue depth > 1000 |
| workflow-service     | 2            | 8            | CPU > 70%          |

Booking and payment services have a higher minimum replica count (3) because they handle
customer-facing writes where latency directly affects revenue.

HPA manifest example:
```yaml
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
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
```

---

## Rolling Deployment

All deployments use `RollingUpdate` strategy with zero-downtime settings:

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1           # one extra pod allowed during update
    maxUnavailable: 0     # no pods taken offline until replacement is ready
```

With `maxUnavailable: 0`, Kubernetes:
1. Starts a new pod with the new image version
2. Waits until its readiness probe (`/health/ready`) passes
3. Only then terminates one old pod

Combined with a `preStop` hook for graceful drain:
```yaml
lifecycle:
  preStop:
    exec:
      command: ["sh", "-c", "sleep 5"]
```

---

## Secret Management

Secrets flow: **HashiCorp Vault → Kubernetes Secrets → Pod environment variables**

```
Vault (source of truth)
  │
  ├── secret/stayflexi/prod/database    → DATABASE_URL
  ├── secret/stayflexi/prod/redis       → REDIS_URL
  └── secret/stayflexi/prod/service-key → SERVICE_KEY

  │  (Vault Agent Injector or External Secrets Operator)
  ▼

Kubernetes Secret: stayflexi-secrets (namespace: stayflexi)
  │  envFrom:
  ▼  secretRef: stayflexi-secrets

Pod environment:
  DATABASE_URL=postgresql://user:pass@postgres:5432/stayflexi
  REDIS_URL=redis://:pass@redis:6379
  SERVICE_KEY=<64-char random hex>
```

Secrets are never committed to source control. The `.env` pattern is only used for
local development with `.env.local` in `.gitignore`.

---

## Database Migrations

Migrations run as a Kubernetes **init container** before the service container starts.
This ensures the schema is up to date before any service accepts requests.

```yaml
initContainers:
- name: migrate
  image: stayflexi/prisma-migrator:latest  # slim image with prisma CLI only
  command: ["npx", "prisma", "migrate", "deploy"]
  env:
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: stayflexi-secrets
        key: DATABASE_URL
```

The migrator image is built from the monorepo root and contains only the Prisma schema and
the `prisma` CLI binary. It does not start any HTTP server.

Prisma shadow database is used in development (`prisma migrate dev`). Production uses
`prisma migrate deploy` which applies only pending migrations without creating a shadow DB.

---

## Blue-Green Deployment

For high-risk releases (schema changes, major feature rollouts), Stayflexi uses a
blue-green strategy:

```
         ┌─────────────────────────────────────────┐
         │           Load Balancer / Ingress        │
         │         (100% traffic → blue)            │
         └────────────────┬────────────────────────┘
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
        ┌──────────┐           ┌──────────┐
        │  BLUE    │           │  GREEN   │
        │ (current)│           │  (new)   │
        │  v2.0.0  │           │  v2.1.0  │
        └──────────┘           └──────────┘
              ▲
              │ (after validation: switch traffic to green)
```

Steps:
1. Deploy `green` Deployment alongside `blue` using label `version: green`
2. Green pods pass readiness probes and run smoke tests against a preview endpoint
3. Update the Service `selector` to `version: green` — instant traffic switch
4. Monitor for 15 minutes; if error rate is normal, delete `blue` Deployment
5. If regression detected, revert by switching selector back to `version: blue`

---

## Docker Build

All service images are built from the **monorepo root** using service-specific Dockerfiles.
This is necessary because Prisma schema files live in `src/database/prisma/`.

```bash
# Build a specific service
docker build \
  -f services/ota-service/Dockerfile \
  -t stayflexi/ota-service:2.0.0 \
  .

# Build all services (CI script)
SERVICES=(
  auth-service
  organization-service
  hotel-service
  inventory-service
  booking-service
  payment-service
  ota-service
  analytics-service
  notification-service
  workflow-service
)

for svc in "${SERVICES[@]}"; do
  docker build \
    -f "services/$svc/Dockerfile" \
    -t "stayflexi/$svc:${VERSION:-latest}" \
    .
done
```

The Dockerfile multi-stage build:
- **Stage 1 (builder)**: Copies Prisma schema + service source, runs `npm ci`, generates
  Prisma client, compiles TypeScript to `dist/`
- **Stage 2 (runtime)**: Copies only `dist/` and `node_modules` from builder, sets
  `NODE_ENV=production`, exposes the service port, runs `node dist/index.js`

This produces a minimal runtime image (~150MB) that contains no TypeScript compiler,
test tools, or source files.

### Image Tagging Convention

```
stayflexi/{service-name}:{semver}
stayflexi/{service-name}:{git-sha}   (immutable, used for rollback)
stayflexi/{service-name}:latest      (only in dev/staging)
```

Production deployments always use the immutable git-sha tag to guarantee reproducibility.
