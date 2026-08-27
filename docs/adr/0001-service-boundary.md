# ADR-0001: Canonical home for domain logic — `services/` vs `src/`

- **Status**: Accepted (mini-ADR; to be formalized in checklist item 5.18)
- **Date**: 2026-08-27
- **Scope**: All new domain code from the gap-closure plan onward

## Context

The repository has two locations with overlapping responsibilities: the top-level
`src/` tree contains API routes, modules, and domain-oriented code, while
`services/` contains twelve domain services with similar responsibilities. The
platform structure review (`docs/PROJECT_STRUCTURE_REVIEW.md`, issue #1) flags
this ambiguity as the biggest architectural risk: the same business rule can
appear in two places with no rule stating which is canonical.

## Decision

1. **`services/<name>` is the canonical home for all domain logic.**
   Entities, use-cases, repositories, sagas/workers, HTTP and GraphQL interfaces
   for a bounded context live only in its service directory.
2. **`src/` is a BFF/UI boundary only.**
   Next.js app code (pages, components, client state), the API gateway, and
   cross-cutting infrastructure (Prisma schema home, gateway middlewares) live in
   `src/`. Business rules in `src/` are prohibited; it reaches services only via
   their published HTTP/GraphQL contracts or Kafka events.
3. **Services never import each other's internals.**
   Cross-service communication is HTTP (internal endpoints) or events. Shared
   code lives in `packages/shared-*` and must be minimal and dependency-lean.
4. **New bounded contexts get new directories under `services/`** (or extend an
   existing service when the context is small — e.g. Housekeeping starts inside
   hotel-service per checklist item 3.11).

## Consequences

- Existing domain code in `src/` is technical debt; migration to `services/`
  happens opportunistically and must be tracked (item 5.18).
- The Prisma schema directory (`src/database/prisma/schema/`) stays as the
  single schema home for now; per-service schema extraction is a future ADR.
- Reviews should reject PRs that add business rules to `src/`.
