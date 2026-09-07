# ADR-007: RBAC Gateway Permission Resolution

- **Status**: Accepted
- **Date**: 2026-08-28
- **Scope**: Cross-cutting — gateway, auth-service, all domain services
- **Deciders**: Platform Security Group
- **Related**: Checklist 1.1, `packages/shared-auth/src/rbac.ts`, `src/modules/auth`, `infrastructure/gateway`

## Context

Before checklist 1.1 every service re-implemented authorization by querying the
database or decoding JWT roles locally. There was no single place where
permissions were resolved, no invalidation on role change, and no consistent
guard (`requirePermission(resource, action)` existed only as an idea). This
caused inconsistent enforcement, extra DB load on the hot path, and made
auditing permission changes difficult. The platform needs a scalable RBAC model
that works for 12 services without coupling each service to the user/role tables.

## Decision

1. **Gateway resolves permissions once per request.** On authenticated requests
   the gateway calls `GET /internal/users/:id/permissions?orgId=&hotelId=` on
   auth-service, caches the result in Redis with a TTL, and forwards the
   flattened permission set as `x-permissions` header.
2. **Services enforce via shared middleware.** Services use
   `requirePermission(resource, action, opts?)` from `@stayflexi/shared-auth`
   which reads `x-permissions` (or `x-user-*` fallback) and throws
   `ForbiddenError` if missing. No direct DB query for permissions on the hot
   path.
3. **Cache invalidation on role change.** Role assignment/revocation publishes
   a cache-invalidation event; the gateway deletes the Redis key for the
   affected user/org.
4. **Fail-closed.** If the permission set is absent or stale, the request is
   rejected. Super-admin bypass is explicit via `withSuperAdmin()`.

## Consequences

### Positive

- Single enforcement point, consistent audit trail, reduced per-service DB load.
- Permission changes propagate within TTL + explicit invalidation — no restart.
- Services depend only on `@stayflexi/shared-auth` header contract, not on
  `users/roles` tables.

### Negative

- Gateway becomes a critical path for permission resolution — requires Redis
  availability and auth-service internal endpoint SLO.
- Stale permissions possible within TTL window if invalidation event is delayed
  (mitigated by short TTL and idempotent guards).

### Neutral

- Permission catalog is seeded and versioned in auth-service; additive changes
  only — no breaking rename without migration.

## Alternatives Considered

| Alternative                               | Why rejected                                                                 |
| ----------------------------------------- | ---------------------------------------------------------------------------- |
| **Per-service DB lookup**                 | Duplicates logic, couples every service to auth tables, N+1 load.            |
| **JWT claims carry permissions**          | Token bloat, stale until refresh, revocation complexity.                     |
| **Sidecar policy engine (OPA)**           | Overkill for RBAC-only phase; deferred until ABAC/rego is needed.            |
| **No caching — always call auth-service** | Adds ~15–30 ms per request and hard dependency on auth-service availability. |

## Migration Plan

1.  Implement `requirePermission` in `@stayflexi/shared-auth` and internal
    permissions endpoint in auth-service.
2.  Update gateway to resolve + forward `x-permissions` with Redis TTL.
3.  Wire guard into booking-service as pilot (1.1.4), then roll out to remaining
    services — one service per commit with unit tests + typecheck.
4.  Add role-change invalidation publisher and gateway subscriber.
5.  Verify via `turbo run test --filter='@stayflexi/*-service'` and gateway
    integration tests; monitor Redis hit ratio and auth-service latency.

## References

- `services/booking-service/src/middleware/auth.ts` — pilot wiring
- `packages/shared-auth/src/rbac.ts` — guard implementation
- `infrastructure/gateway/src/middleware/auth.ts` — gateway resolution
