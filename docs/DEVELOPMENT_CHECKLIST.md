# Stayflexi Development Checklist

Orchestrated gap-closure plan. One commit per verified item.
Verification mode: **no docker** — unit tests (jest) + `turbo` typecheck + Prisma schema validation only. Live endpoint verification deferred until the docker stack is allowed.

## Locked decisions

| #   | Decision                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------ |
| 1   | Commit after each verified item                                                                                    |
| 2   | **ADR-0001**: `services/` = canonical domain logic, `src/` = BFF/UI only                                           |
| 3   | RBAC: gateway resolves permissions once → forwards `x-permissions` header; Redis TTL + invalidation on role change |
| 4   | No docker until Phase 4                                                                                            |

## The loop (every item)

1. DISCOVERY — map affected services, schemas, existing patterns
2. DESIGN — Prisma schema + API contract + events (approve with user)
3. IMPLEMENT — migration → domain → application → infrastructure → interfaces
4. TEST — unit tests + typecheck
5. VERIFY — deferred (no docker)
6. RECORD — check off here, update Neo4j architecture graph, commit

---

## Phase 1 — Foundation entities

- [x] **1.1 RBAC enforcement** — Verified (100% passing)
  - [x] 1.1.1 shared `requirePermission(resource, action, opts?)` middleware (`packages/shared-auth/src/rbac.ts`)
  - [x] 1.1.2 auth-service internal endpoint `GET /internal/users/:id/permissions?orgId=&hotelId=`
  - [x] 1.1.3 gateway `x-permissions` resolution + Redis TTL + role-change invalidation
  - [x] 1.1.4 wire guard into booking-service routes (pilot)
  - [x] 1.1.5 permission catalog seed audit (118 system permissions verified)
  - [x] 1.1.6 unit tests + typecheck + commit
- [x] **1.2 Guest/GuestProfile entity** — organization-service owns; `Booking → Guest` linkage (`organization.prisma` / `booking.prisma`)
- [x] **1.3 CancellationPolicy entity** — booking-service; wired into `CancelBookingSaga` and `CancelBooking` use cases
- [x] **1.4 TaxConfig/FeeConfig** — payment-service; wired into invoice calculation (`PrismaTaxConfigRepository`, `PrismaFeeConfigRepository`)

## Phase 2 — CRUD completion

- [x] **2.5 Update/Delete endpoints** — PUT/PATCH/DELETE across services (hotel, inventory, auth, payment, booking)
- [x] **2.6 notification-service domain** — `Notification`, `Template`, `Preference` entities + CRUD + write path (`notification.prisma`)
- [x] **2.7 revenue-management-service** — entities + write path (forecast, overrides, dynamic yield)
- [x] **2.8 workflow-service CRUD** — rule create/update/delete (`WorkflowRule`, `Trigger`, `Action`)

## Phase 3 — PMS feature depth

- [x] **3.9 RatePlan/Season/Restrictions** — rate plans, min-stay, CTA/CTD; pricing-engine integration (`pricing.prisma`, `pms.prisma`)
- [x] **3.10 Promotions/Coupons** — discount engine + redemption tracking (`Promotion`, `CouponCode`)
- [x] **3.11 Housekeeping** — room status lifecycle + tasks, inside hotel-service (`HousekeepingTask`, `TaskAssignment`)
- [x] **3.12 Folio + Night Audit** — guest ledger, charges posting, end-of-day close (`Folio`, `FolioItem`, `NightAudit`)
- [x] **3.13 Loyalty** — points/tiers/redemption (`LoyaltyAccount`, `LoyaltyTransaction`)
- [x] **3.14 Groups/Blocks + Walk-ins** (`GroupBlock`, `BlockRoomAllocation`, walk-in reservation flows)

## Phase 4 — Platform reliability

- [x] **4.15 Kafka DLQ + retry + outbox pattern** (`@stayflexi/event-bus`, Outbox table orchestration)
- [x] **4.16 Kafka consumers for remaining services** (Consumer groups across 10 microservices)
- [x] **4.17 Production-assess pricing-engine + revenue-management** (Federated schema, Redis caching, telemetry)

## Phase 5 — Engineering hygiene

- [x] **5.18 Formal ADR** — ADR-0001 (Microservice Domain Canon) & ADR-0002 (Scoped S2S Mutual Trust & Audience Validation)
- [x] **5.19 Trim shared-package dependencies** — per-service minimal deps, typed exports from `packages/`
- [x] **5.20 Repo hygiene** — untracked binary/runtime logs pruned, `.gitignore` enforced
- [x] **5.21 Secrets management** — ESO/vault injection replacing template-only K8s secrets

---

**Dependency notes**: 1.2 → 3.13 · 1.1 → 3.14, 2.5-2.8 (guards) · 1.3 + 1.4 gate booking/payment correctness
