# Stayflexi Multi-Agent Execution Architecture

## Overview

17 specialized agents govern all implementation, validation, and deployment work on the Stayflexi distributed platform. Each agent owns a strict bounded context and may not modify code outside its boundary without review from `integration-governance-agent`.

## Agent Registry

| Agent | Owned Domain | Port / Topic Scope |
|-------|-------------|-------------------|
| `platform-architect-agent` | Architecture governance, cross-service contracts | All |
| `auth-security-agent` | auth-service, JWT, RBAC, tenant isolation | 3001 |
| `organization-agent` | organization-service, tenant management | 3002 |
| `hotel-agent` | hotel-service, room lifecycle | 3003 |
| `inventory-consistency-agent` | inventory-service, distributed locking | 3004 |
| `booking-saga-agent` | booking-service, saga orchestration | 3005 |
| `payment-ledger-agent` | payment-service, ledger, reconciliation | 3006 |
| `ota-sync-agent` | ota-service, channel sync, webhooks | 3007 |
| `analytics-agent` | analytics-service, aggregation, reporting | 3008 |
| `notification-workflow-agent` | notification-service, workflow-service | 3009–3010 |
| `infrastructure-devops-agent` | Docker, Kubernetes, CI/CD | infrastructure/ |
| `observability-sre-agent` | OpenTelemetry, Prometheus, Grafana, Loki | shared-observability |
| `database-prisma-agent` | Prisma schemas, migrations, indexing | src/database/prisma/ |
| `kafka-event-agent` | Kafka contracts, consumers, DLQ | shared-events |
| `redis-consistency-agent` | Redis caching, distributed locks | shared-redis |
| `qa-resilience-agent` | Integration tests, chaos, load | platform-validation/ |
| `integration-governance-agent` | Cross-agent validation, deployment sign-off | All |

## Execution Workflow

```
Task Received
     │
     ▼
platform-architect-agent   ← validates scope, prevents drift
     │
     ▼
Domain Agent               ← implements feature in bounded context
     │
     ├──► database-prisma-agent      (schema changes)
     ├──► kafka-event-agent          (event contract changes)
     ├──► redis-consistency-agent    (cache/lock changes)
     ├──► observability-sre-agent    (metrics/tracing)
     └──► qa-resilience-agent        (test coverage)
                │
                ▼
     integration-governance-agent   ← validates integration
                │
                ▼
     infrastructure-devops-agent    ← validates deployment
                │
                ▼
          MERGE APPROVED
```

## Governance Rules

1. **No schema modification** without `database-prisma-agent` validation
2. **No event contract modification** without `kafka-event-agent` validation
3. **No cross-service HTTP calls** added without `platform-architect-agent` approval
4. **No Redis key namespace collision** without `redis-consistency-agent` review
5. **No deployment** without `integration-governance-agent` sign-off
6. **No security change** (auth middleware, RBAC, JWT) without `auth-security-agent` review
7. **All new use-cases** must have unit tests validated by `qa-resilience-agent`

## Conflict Prevention Protocol

When two agents need to modify the same file:
1. `integration-governance-agent` arbitrates ownership
2. The owning agent makes the change
3. The requesting agent reviews the diff
4. Both agents sign off before merge

## Shared Interface Governance

Files in `packages/shared-*` are governed by:
- `kafka-event-agent` → `shared-events`
- `database-prisma-agent` → `shared-database`
- `redis-consistency-agent` → `shared-types` (ServiceHttpClient, lock utilities)
- `observability-sre-agent` → `shared-observability`
- `auth-security-agent` → `shared-auth`, `shared-types` (AuthUser)
- `platform-architect-agent` → all shared package interfaces
