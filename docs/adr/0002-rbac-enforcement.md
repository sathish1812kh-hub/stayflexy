# ADR-0002: RBAC Enforcement — Gateway Resolves, Services Enforce Locally

- **Status**: Accepted
- **Date**: 2026-08-28
- **Scope**: Cross-cutting — gateway, auth-service, all twelve domain services
- **Deciders**: Platform Security Group
- **Related**: Checklist 1.1, `packages/shared-auth/src/rbac.ts`, `services/auth-service/src/application/use-cases/ManageRoles.ts`, `infrastructure/gateway/`, ADR-007 (rbac-gateway-permissions), ADR-002 (s2s-jwt)

## Context

Before checklist 1.1 every service re-implemented authorization by querying
the database or decoding JWT roles locally. There was no single place where
permissions were resolved, no invalidation on role change, and no
consistent guard (`requirePermission(resource, action)` existed only as an
idea). This caused:

- Inconsistent enforcement — some routes enforced, others did not; some
  checked roles, others checked ad-hoc flags.
- Extra DB load on the hot path — every request fetched `UserRole` rows
  for the calling user.
- Twelve divergent authorization implementations, none of them
  audit-friendly.
- Permission revocation required a token refresh or service restart, so
  revocations lagged by minutes-to-hours.

The platform needs an RBAC model that scales to 12 services without
coupling each service to the user/role tables, that supports prompt
revocation, and that produces a consistent audit trail.

## Decision

1. **The gateway resolves permissions once per request.**
   - On authenticated requests, the gateway calls
     `GET /internal/users/:id/permissions?orgId=&hotelId=` on auth-service.
   - The result is cached in Redis with a short TTL (default 60 s).
   - The flattened permission set is forwarded downstream as the
     `x-permissions` header (comma-separated `resource:action` keys; see
     `packages/shared-auth/src/rbac.ts`).

2. **Services enforce locally via a shared middleware.**
   - Services use `requirePermission(resource, action, opts?)` from
     `@stayflexi/shared-auth`, which reads `x-permissions` and throws
     `ForbiddenError` (HTTP 403, code `FORBIDDEN`) if the key is missing.
   - No direct DB query for permissions on the hot path inside a service.
   - The guard is idempotent and stateless: given the same header, every
     service makes the same decision.

3. **Wildcard semantics are uniform.**
   - `*` — all permissions (super-admin bypass is the explicit alternative
     to this; see §4).
   - `resource:*` — every action on the resource.
   - `resource:action` — exact match.
   - Semantics are identical to those used in
     `auth-service/ManageRoles` so the resolver and the enforcer never
     disagree.

4. **Service-to-service and super-admin bypass is explicit.**
   - `req.user.isServiceCall === true` (set when the request carries a
     valid S2S JWT per ADR-002) bypasses the check.
   - `req.user.primaryRole === 'SUPER_ADMIN'` bypasses the check; this
     is the only hard-coded role-name in `shared-auth` and is
     configurable via the `superAdminRole` option.

5. **Cache invalidation on role change.**
   - Role assignment and revocation in auth-service publish a
     `rbac.permissions.invalidated` event (Kafka topic) carrying
     `{ userId, orgId, hotelId }`.
   - The gateway subscribes to the topic and deletes the corresponding
     Redis key, so the next request fetches a fresh permission set.

6. **Fail-closed.**
   - If the `x-permissions` header is missing for an authenticated,
     non-S2S, non-super-admin request, the guard returns 403, never
     silently allows.

7. **Permission catalog is versioned and additive.**
   - The catalog lives in auth-service (`/internal/permissions`). New
     `resource:action` pairs are added freely; removing or renaming a
     pair requires a migration step and a coordinated rollout.

## Consequences

### Positive

- A single enforcement point (the guard) keeps the policy consistent and
  testable in isolation.
- The audit trail is uniform: every authorization decision can be logged
  with the same `{ userId, resource, action, granted, source }` shape.
- Per-service DB load drops; permission resolution is one Redis hit per
  request.
- Permission changes propagate within the cache TTL plus the explicit
  invalidation event — typically sub-second, never requiring a restart.
- Services depend only on the `@stayflexi/shared-auth` header contract,
  not on the `users/roles` tables, which preserves ADR-0001's service
  isolation.

### Negative

- The gateway becomes a critical path for permission resolution; the
  architecture now requires both Redis availability and the
  auth-service internal endpoint to meet its SLO.
- Stale permissions are possible within the TTL window if the
  invalidation event is delayed or dropped (mitigated by a short TTL and
  the guard's idempotence — an over-permissive state self-corrects at
  the next refresh).
- Header bloat: a power user with hundreds of permissions makes the
  `x-permissions` header long. Mitigated by per-tenant scoping in the
  resolver (only permissions for the caller's active `orgId`/`hotelId`
  are included).
- The wildcard `*` is convenient but easy to over-grant; reviewers
  should reject PRs that add `*` to a real role.

### Neutral

- The permission catalog is now a versioned, reviewable surface;
  additions flow through normal code review.
- The auth-service internal `/users/:id/permissions` endpoint is part of
  the platform's SLO surface and is monitored like any other service
  endpoint.

## Alternatives Considered

| Alternative                                                              | Why rejected                                                                                                                                                               |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Per-service DB lookup** (`SELECT … FROM user_roles WHERE user_id = ?`) | Duplicates logic across 12 services, couples every service to auth tables, and adds N+1 load on the hot path.                                                              |
| **JWT claims carry permissions**                                         | Token bloat (power users push the JWT past cookie size limits), stale permissions until refresh, and revocation requires a token-deny-list.                                |
| **Sidecar policy engine (OPA with Rego)**                                | Overkill for the current RBAC-only phase; introduces a second language and runtime. Re-evaluate when ABAC is needed.                                                       |
| **No caching — always call auth-service**                                | Adds ~15–30 ms per request and a hard runtime dependency on auth-service availability for every other service.                                                             |
| **Authorization at the gateway only (no service-side enforcement)**      | Removes defense in depth: a misrouted internal request bypasses the gateway check entirely.                                                                                |
| **Centralized policy decision point (PDP) service**                      | Reasonable at higher scale; for now, the auth-service internal endpoint already plays the PDP role and the gateway cache is the PDP-cache. Document as a future evolution. |

## Migration Plan

1. **Stand up the shared guard.**
   - Implement `requirePermission`, `hasPermission`,
     `parsePermissionsHeader`, and `buildPermissionsHeader` in
     `@stayflexi/shared-auth` (already shipped as part of checklist 1.1).
   - Pin the API and forbid header-name drift; CI verifies the constant
     `PERMISSIONS_HEADER = 'x-permissions'`.

2. **Stand up the auth-service internal endpoint.**
   - `GET /internal/users/:id/permissions?orgId=&hotelId=` returns the
     effective, scoped, deduplicated permission set.
   - Authenticated via the S2S JWT contract (ADR-002).
   - Behind a feature flag initially so a 1% canary can compare to the
     old per-service DB lookup.

3. **Wire the gateway.**
   - On authenticated requests, the gateway middleware fetches and
     caches the permission set in Redis with TTL=60 s, then sets
     `x-permissions` before forwarding.
   - Subscribe to `rbac.permissions.invalidated` and `DEL` the matching
     key.

4. **Pilot in `booking-service`.**
   - Replace local permission checks with `requirePermission` on every
     route. Add unit tests asserting 401/403/200 outcomes for missing
     auth, missing header, and present header cases.

5. **Service-by-service rollout.**
   - One commit per remaining service. Each commit:
     - Adds `@stayflexi/shared-auth` if missing.
     - Replaces local checks with `requirePermission`.
     - Adds/extends unit tests for the guard.
     - Removes any now-dead permission-querying code.

6. **Validation.**
   - `npm run type-check -w services/<svc>` for each touched service.
   - `npm test` for the guard.
   - End-to-end: a Playwright test logs in as a non-admin user and
     attempts each guarded endpoint; expects 403 with the platform error
     shape.

7. **Deprecate the local DB lookups.**
   - Once all twelve services are migrated, remove any leftover
     permission-table reads (e.g. `RoleRepository.findByUser` in a
     service's hot path).
   - Update ADR-007 to point at this ADR as the canonical reference.

## References

- `packages/shared-auth/src/rbac.ts` — guard implementation
- `services/auth-service/src/interfaces/http/permissions.routes.ts` —
  internal endpoint
- `infrastructure/gateway/src/middleware/auth.ts` — gateway resolution
- `services/booking-service/src/middleware/auth.ts` — pilot wiring
- `infrastructure/kafka/topics/rbac.permissions.invalidated.yaml` —
  invalidation topic
- ADR-007 (rbac-gateway-permissions) — earlier exploratory ADR
