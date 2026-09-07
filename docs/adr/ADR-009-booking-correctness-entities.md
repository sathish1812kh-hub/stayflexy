# ADR-009: Booking Correctness Entities — CancellationPolicy and Tax/Fee Config

- **Status**: Accepted
- **Date**: 2026-08-28
- **Scope**: booking-service, payment-service, `src/database/prisma/schema/*`
- **Deciders**: Platform Architecture Group
- **Related**: Checklist 1.3, 1.4, `services/booking-service`, `services/payment-service`

## Context

Two correctness gaps were found on the critical booking→payment path:

- **1.3 CancellationPolicy**: `CancelBookingSaga` step 1 verified a cancellation
  policy that did not exist as an entity. Every cancellation fell back to ad-hoc
  rules, making refunds inconsistent and unauditable.
- **1.4 TaxConfig/FeeConfig**: Invoice calculation used hard-coded rates. There
  was no owned entity for tax/fee configuration, so per-hotel/per-org variance,
  audit, and correct settlement were impossible. The saga's financial step lacked
  a source of truth.

Both gaps would silently produce wrong money — the highest-severity class of
defect for a PMS.

## Decision

1. **CancellationPolicy is a booking-service entity.** Model
   `CancellationPolicy` (with rules, windows, penalty tiers) is owned by
   booking-service; `CancelBookingSaga` loads the applicable policy and applies
   it deterministically. Policies are versioned and auditable.
2. **TaxConfig and FeeConfig are payment-service entities.** Models
   `TaxConfig` and `FeeConfig` are owned by payment-service and consumed during
   `calculateInvoice` / `finalizeInvoice`. Lookup is by `hotelId`/`orgId` with
   fallback to org defaults.
3. **No hard-coded rates.** All monetary calculations require a config lookup;
   missing config fails closed with `ValidationError` rather than silent 0%.
4. **Saga wiring is explicit.** Cancellation and invoicing sagas receive the
   policy/config objects as inputs; retry/idempotency is at the saga executor
   level, not hidden inside calculation.

## Consequences

### Positive

- Deterministic, testable financial math; audit trail for every charge/penalty.
- Per-hotel and per-org variance without code changes.
- Sagas become pure coordinators — policy/config are data, not branching logic.

### Negative

- Additional read on the hot path (mitigated by short-lived cache and batch
  loaders).
- Config seeding/migration required for existing hotels.

### Neutral

- Prisma schema is the single home for now (ADR-0001); logical ownership is
  enforced at the service layer.

## Alternatives Considered

| Alternative                                | Why rejected                                                                                                                |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| **Policies in `src/` config files**        | Not transactional, not per-tenant, not auditable; review called out `src/` as BFF-only (ADR-0001).                          |
| **Hard-coded + env var overrides**         | Env vars are global, not per-hotel/per-org, and lack versioning/audit.                                                      |
| **Single shared `finance-config` service** | Premature service for two small config sets; clear ownership in booking vs payment is simpler and keeps blast radius small. |
| **Calculate on frontend**                  | Untrusted, inconsistent, and bypasses server-side validation.                                                               |

## Migration Plan

1.  Add `CancellationPolicy` to `src/database/prisma/schema/operations.prisma`
    (or inventory/room schema as appropriate) and `TaxConfig`/`FeeConfig` to
    `revenue.prisma`; run `prisma generate` + `prisma migrate`.
2.  Implement repositories, validation (Zod via `@stayflexi/shared-validation`),
    and CRUD in owning services with permission guards.
3.  Wire `CancelBookingSaga` to require and apply `CancellationPolicy`; wire
    `calculateInvoice` to require `TaxConfig`/`FeeConfig`.
4.  Seed default configs per existing hotel/org; add coverage tests for edge
    tiers (free cancellation window, no-show, partial penalties, zero-tax
    jurisdictions).
5.  Verify with `turbo type-check`, `turbo run test`, and Prisma validation;
    commit per checklist item (1.3, 1.4) with one verification per item.

## References

- `services/booking-service/src/application/sagas/cancel-booking.saga.ts`
- `services/payment-service/src/application/services/invoice.service.ts`
- `src/database/prisma/schema/revenue.prisma` / `operations.prisma`
- Checklist 1.3, 1.4
