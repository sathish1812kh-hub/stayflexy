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

- [ ] **1.1 RBAC enforcement**
  - [ ] 1.1.1 shared `requirePermission(resource, action, opts?)` middleware (`packages/shared-auth/src/rbac.ts`)
  - [ ] 1.1.2 auth-service internal endpoint `GET /internal/users/:id/permissions?orgId=&hotelId=`
  - [ ] 1.1.3 gateway `x-permissions` resolution + Redis TTL + role-change invalidation
  - [ ] 1.1.4 wire guard into booking-service routes (pilot)
  - [ ] 1.1.5 permission catalog seed audit
  - [ ] 1.1.6 unit tests + typecheck + commit
- [ ] **1.2 Guest/GuestProfile entity** — organization-service owns; `Booking → Guest` linkage
- [ ] **1.3 CancellationPolicy entity** — booking-service; wired into `CancelBookingSaga` (step 1 currently verifies a policy that doesn't exist)
- [ ] **1.4 TaxConfig/FeeConfig** — payment-service; wired into invoice calculation

## Phase 2 — CRUD completion

- [ ] **2.5 Update/Delete endpoints** — PUT/PATCH/DELETE across services (booking PATCH already exists; verify + fill the rest)
- [ ] **2.6 notification-service domain** — `Notification`, `Template`, `Preference` entities + CRUD + write path
- [ ] **2.7 revenue-management-service** — entities + write path (forecast-only today)
- [ ] **2.8 workflow-service CRUD** — rule create/update/delete

## Phase 3 — PMS feature depth

- [ ] **3.9 RatePlan/Season/Restrictions** — rate plans, min-stay, CTA/CTD; pricing-engine integration
- [ ] **3.10 Promotions/Coupons** — discount engine + redemption tracking
- [ ] **3.11 Housekeeping** — room status lifecycle + tasks, inside hotel-service (extract to service later if it grows)
- [ ] **3.12 Folio + Night Audit** — guest ledger, charges posting, end-of-day close
- [ ] **3.13 Loyalty** — points/tiers/redemption (needs 1.2)
- [ ] **3.14 Groups/Blocks + Walk-ins** (needs 1.1)

## Phase 4 — Platform reliability

- [ ] **4.15 Kafka DLQ + retry + outbox pattern**
- [ ] **4.16 Kafka consumers for remaining services**
- [ ] **4.17 Production-assess pricing-engine + revenue-management** (missing from readiness doc)

## Phase 5 — Engineering hygiene

- [ ] **5.18 Formal ADR** — expand ADR-0001 into full decision record
- [ ] **5.19 Trim shared-package dependencies** — per-service minimal deps (currently 12 × all 9)
- [ ] **5.20 Repo hygiene** — remove dump.rdb, PPTX files, logs, graphify artifacts from git
- [ ] **5.21 Secrets management** — ESO/vault injection replacing template-only K8s secrets

---

**Dependency notes**: 1.2 → 3.13 · 1.1 → 3.14, 2.5-2.8 (guards) · 1.3 + 1.4 gate booking/payment correctness
