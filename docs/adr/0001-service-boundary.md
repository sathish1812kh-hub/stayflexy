# ADR-0001: Canonical Home for Domain Logic — `services/` vs `src/`

- **Status**: Accepted
- **Date**: 2026-08-27
- **Supersedes**: mini-ADR of 2026-08-27 (this is the formalized version)
- **Scope**: All new domain code from the gap-closure plan onward; migration of existing domain code is tracked under "Migration Plan"
- **Deciders**: Platform Architecture Group
- **Related**: `docs/PROJECT_STRUCTURE_REVIEW.md`, checklist item 5.18, ADR-001 (hexagonal-architecture), ADR-002 (s2s-jwt), ADR-005 (apollo-federation)

## Context

The Stayflexi repository has accumulated two locations with overlapping
responsibilities for domain logic:

1. The top-level `src/` tree (Next.js app directory) contains API routes,
   modules, GraphQL resolvers, and domain-oriented code for users, hotels,
   bookings, payments, organizations, and more. This code predates the
   service-extraction effort.
2. The `services/` directory contains twelve domain services
   (`auth-service`, `booking-service`, `hotel-service`, etc.) following a
   hexagonal layout (domain / application / infrastructure / interfaces).

The platform structure review (`docs/PROJECT_STRUCTURE_REVIEW.md`, issue #1)
flags this ambiguity as the single biggest architectural risk in the
codebase: the same business rule can plausibly appear in two places with no
rule stating which is canonical, which means:

- A bug fix in `services/booking-service` may not be picked up by the
  `src/app/api/v1/bookings` route, leaving inconsistent behaviour in
  production.
- New engineers default to whichever directory they find first, perpetuating
  the split.
- Schema ownership is unclear — `src/database/prisma/schema/pms.prisma`
  mixes models for all bounded contexts, but services are expected to own
  their own data.
- Testing is duplicated or skipped, and CI cannot enforce which side is
  authoritative.
- ADR-001 (hexagonal architecture) is applied inconsistently: `services/*`
  follow ports-and-adapters; `src/` is a free-form Next.js tree.

The split is the residue of an incremental rewrite that began with a
Next.js monolith and progressively carved out services. Migration was
incomplete; this ADR is the commitment to complete it.

## Decision

1. **`services/<name>` is the canonical home for all domain logic.**
   - Entities, value objects, domain events, use-cases, repository ports,
     adapters, sagas/workers, and HTTP/GraphQL interfaces for a bounded
     context live only in the relevant service directory.
   - Each service is independently deployable, owns its database (logical
     or physical), and is the single source of truth for its bounded
     context's invariants.

2. **`src/` is a BFF (Backend-For-Frontend) and UI boundary only.**
   - Next.js app code (pages, components, client state, server actions that
     orchestrate UI flows).
   - The API gateway / Apollo Router configuration and any BFF composition
     that genuinely belongs at the edge (e.g. session-to-token translation,
     UI-specific projections).
   - Cross-cutting infrastructure: Prisma schema home (until per-service
     schemas are extracted — see ADR-001), shared middleware definitions
     that the gateway consumes, and CI tooling.
   - Business rules in `src/` are **prohibited**. `src/` reaches services
     only via their published HTTP/GraphQL contracts or Kafka/Redis-Streams
     events. No direct Prisma queries against service-owned tables from
     `src/`.

3. **Services never import each other's internals.**
   - Cross-service communication is one of:
     - Synchronous HTTP through a published contract (OpenAPI / GraphQL).
     - Asynchronous events on Kafka topics, owned by the producing service
       and versioned per ADR-003.
   - Shared code lives in `packages/shared-*` and must be minimal,
     dependency-lean, and contain no business rules — only types, error
     envelopes, validation primitives, and observability plumbing.

4. **New bounded contexts get new directories under `services/`** (or
   extend an existing service when the context is small — e.g. Housekeeping
   starts inside `hotel-service` per checklist item 3.11).

5. **The Prisma schema home (`src/database/prisma/schema/`) is transitional.**
   - It remains the single schema file for now (simpler migrations).
   - Extraction to per-service schemas is a future ADR; for now, services
     generate clients against the unified schema and respect table-prefix
     ownership rules.

## Consequences

### Positive

- A single, unambiguous answer to "where does this rule live?" — the
  service that owns the bounded context.
- Reviewers can mechanically reject PRs that add business rules to `src/`.
- Service deployment, scaling, and failure isolation become correct
  (today, a bug in `src/app/api/v1/bookings` can bring down unrelated
  flows).
- Testing surface narrows: service tests + a thin set of BFF integration
  tests suffice.
- Clearer ADR enforcement: ADR-001 (hexagonal) applies uniformly because
  every domain module is a service.

### Negative

- Existing domain code in `src/` is technical debt and must be migrated
  opportunistically. Until migration is complete, the repository is in a
  known-inconsistent state and a violation linter (see Migration Plan §1)
  is the only backstop.
- Two ways to do the same thing during the migration window increases
  cognitive load for engineers; documentation must clearly mark canonical
  vs legacy.
- Migrating modules means touching active hot paths (booking, payment);
  this is invasive and cannot be done in one PR.
- The unified Prisma schema remains a coupling point until per-service
  extraction; for now, schema changes still need cross-service review.

### Neutral

- The `packages/shared-*` set is now an explicit, audited contract surface;
  additions require ADR-0001 conformance.
- `src/components/` and the Next.js app continue to render the UI but no
  longer make domain decisions.

## Alternatives Considered

| Alternative                                                                                              | Why rejected                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Modular monolith** (keep everything in `src/`, split by module folders, no services)                   | Loses the deployability, fault isolation, and per-team ownership already in place. Cannot meet the SLOs for booking/payment isolation. Reverses six months of work.                                           |
| **BFF-only** (no services; `src/` calls a single shared domain library)                                  | Creates a shared library anti-pattern at platform scale — coupling returns the moment two contexts diverge. Also does not give the team fault isolation we already have.                                      |
| **Services-only, no `src/`** (delete `src/`, expose services directly to the SPA)                        | Breaks the Next.js rendering/SSR pipeline the product relies on, and loses the gateway's cross-cutting middleware. Too disruptive to ship.                                                                    |
| **Service-per-folder in monorepo, no separate deployable** (current `src/` structure but rename folders) | Does not solve the deployability, scaling, or fault-isolation issues; only changes the cosmetic shape.                                                                                                        |
| **Branch by abstraction + strangler fig in production**                                                  | This is what we're doing; the alternative considered here is "do nothing further" — the long-lived migration window is itself a risk and we mitigate it with a lint rule and a deadline (see Migration Plan). |

## Migration Plan

The migration must be incremental to keep the platform shipping. The
sequence is the same one used in the existing gap-closure plan; this ADR
records it as the canonical roadmap.

1. **Lint enforcement (immediate).**
   - Add an ESLint rule (and a `scripts/check-domain-imports.mjs` script)
     that fails the build if `src/app/api/v1/**` or `src/modules/**`
     imports a Prisma model that has a counterpart in a service's
     `domain/entities/`, or if a service module imports from `src/`.
   - The rule is a backstop, not a fix; it prevents regression while
     migration is in progress.

2. **Inventory and module-level ownership map.**
   - Produce `docs/DOMAIN_OWNERSHIP.md` listing every business rule in
     `src/` and its eventual service home. Each item gets a tracking
     issue: `<service>-migration-<n>`.

3. **Strangler-fig per module.**
   - For each `src/app/api/v1/<resource>/` route, build a thin BFF
     pass-through that delegates to the service via HTTP. Once traffic
     flows through the service, the legacy code path is deleted. This
     pattern was piloted on the booking search route (checklist 3.x).

4. **Per-context extraction, one PR per context.**
   - Hotel → already in `hotel-service`; remaining `src/modules/hotels/*`
     migrates as part of checklist 3.11.
   - Booking → `booking-service` is canonical; `src/app/api/v1/bookings`
     is converted to a BFF and the underlying `src/modules/bookings/*` is
     removed.
   - Payment → `payment-service` is canonical; same pattern.
   - Inventory, pricing, revenue, notification, organization, analytics,
     workflow, OTA — same pattern, in that order, with the smallest
     contexts first to land the muscle memory.

5. **Per-service Prisma schema (future ADR).**
   - Once per-context extraction is complete, split
     `src/database/prisma/schema/pms.prisma` into per-service `schema.prisma`
     files and replace the unified migration pipeline with per-service
     migrations. Out of scope for this ADR.

6. **Deprecation milestone.**
   - When `src/app/api/v1/**` no longer contains any direct Prisma
     import, the `// @deprecated` markers are removed and ADR-0001 is
     re-issued as "Migration complete".

7. **Tracking.**
   - A single GitHub Project board tracks all `*-migration-*` issues.
   - The PR template requires a checkbox: "I have not added domain logic to
     `src/`" — answered by every PR until the deprecation milestone.

## References

- `services/<name>/src/{domain,application,infrastructure,interfaces}/` —
  canonical structure
- `src/app/api/v1/**` — BFF/UI boundary (deprecation target)
- `src/database/prisma/schema/pms.prisma` — unified schema (transitional)
- `docs/PROJECT_STRUCTURE_REVIEW.md` — original audit
- ADR-001 (hexagonal-architecture), ADR-002 (s2s-jwt), ADR-005
  (apollo-federation) — depend on this ADR
