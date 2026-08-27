# ADR-0003: Cancellation Policy — Hotel/Org-Scoped with Default Precedence

- **Status**: Accepted
- **Date**: 2026-08-28
- **Scope**: `services/booking-service`, `services/payment-service`, OTA
  channel integrations
- **Deciders**: Booking Domain Group
- **Related**: Checklist 3.10, `services/booking-service/src/domain/entities/CancellationPolicy.ts`, `services/booking-service/src/application/use-cases/FindApplicableCancellationPolicy.ts`, `services/booking-service/src/infrastructure/database/PrismaCancellationPolicyRepository.ts`

## Context

Stayflexi supports thousands of properties under many organizations and
sells rooms through both direct and OTA channels. Each property has its
own cancellation terms, and organizations want to set policy defaults
that individual hotels can override. The booking flow must pick exactly
one policy per booking — the wrong one leads to incorrect refunds,
disputed chargebacks, and inconsistent guest experience.

Before this ADR:

- A prototype policy resolver in `src/` applied a single, hard-coded
  24-hour rule regardless of source or rate plan.
- Some OTA integrations re-implemented the policy lookup locally and
  picked a different policy than the booking-service did, leading to
  mismatches between what the OTA was told and what was actually
  enforced at cancel time.
- There was no concept of "default" — every hotel had to define a
  policy explicitly, or the system fell back to the global rule.
- The cancellation-fee arithmetic (`penaltyPercent` × booking amount,
  capped by `nonRefundableAfter`) lived in three different files and
  produced three different answers for the same input.

We need a single, deterministic policy resolution that:

- is scoped per organization and per hotel,
- lets the organization define a default,
- lets a hotel override the default for its own bookings,
- applies optional source / rate-plan filters,
- produces a single refund/penalty calculation that booking-service and
  payment-service both call.

## Decision

1. **A `CancellationPolicy` is owned by `booking-service` and lives in
   its `domain/entities/`.**
   - Fields: `id`, `organizationId`, `hotelId | null`, `name`,
     `description | null`, `noticeHours`, `penaltyPercent`,
     `refundMethod` (enum: `ORIGINAL_PAYMENT` | `CREDIT_NOTE` | `MANUAL`),
     `nonRefundableAfter | null`, `isDefault`, `appliesToSources[]`,
     `appliesToRatePlans[]`, audit fields.
   - `hotelId === null` means "organization-wide". A non-null `hotelId`
     means "scoped to that hotel only".

2. **Resolution precedence is deterministic and well-defined.**
   `FindApplicableCancellationPolicy` returns the first match in this
   order:
   1. **Hotel default** — the policy with `hotelId = H`, `isDefault =
true`, and the requested `source` (and `ratePlanId` if given) in
      its applicability lists.
   2. **Organization default** — the policy with `hotelId = null`,
      `isDefault = true`, and the requested `source` (and `ratePlanId`
      if given) in its applicability lists.
   3. **First applicable policy** — any non-default policy for the
      hotel or the organization whose applicability lists match
      `source` (and `ratePlanId` if given), ordered by
      `isDefault DESC` and then by `createdAt ASC`.
   4. If nothing matches, the use-case throws `NotFoundError(
"No applicable cancellation policy found")`.

   This order is stable across services and channels.

3. **At most one `isDefault = true` per scope.**
   - Per scope = `(organizationId, hotelId)`. A unique partial index
     enforces this in the database.
   - `CreateCancellationPolicy` and `UpdateCancellationPolicy` clear the
     previous default in the same scope when `isDefault = true` is
     being set — the swap is performed in the same transaction as the
     create/update so the invariant is never observable mid-flight.

4. **Applicability is `OR`-empty (default-applies).**
   - `appliesToSources = []` means "applies to every source".
   - `appliesToRatePlans = []` means "applies to every rate plan".
   - The `isApplicableToSource` and `isApplicableToRatePlan` helpers on
     the entity encode this rule so it cannot drift between the
     resolver and OTA adapters.

5. **Refund calculation lives on the entity, not in callers.**
   - `CancellationPolicyEntity.calculateRefund(amount, checkInDate)`
     returns `{ refundAmount, penaltyAmount }`.
   - `canCancel(checkInDate)` returns `{ allowed, reason? }`.
   - Payment-service calls these methods through a thin DTO; it does
     not re-derive the math. This is the single source of truth for
     refund arithmetic.

6. **OTA channels receive the resolved policy at booking creation.**
   - At `CreateBooking` time, the resolved policy id and a snapshot of
     the refund terms are persisted on the booking row
     (`booking.cancellationPolicyId` and `booking.cancellationSnapshot`).
   - The snapshot is what the OTA is told at confirmation; later edits
     to the policy do not retroactively change existing bookings.

7. **Soft delete only.**
   - Cancellation policies are never hard-deleted; a `deletedAt`
     timestamp is set and the resolver filters on `deletedAt: null`.
   - This preserves the audit trail and lets cancelled bookings point
     to the policy that was in force at the time.

## Consequences

### Positive

- A single, deterministic lookup produces the same answer from
  booking-service, payment-service, and OTA adapters, eliminating the
  chargeback mismatch class of bugs.
- The precedence rule is reviewable in one place
  (`PrismaCancellationPolicyRepository.findApplicable`); reviewers can
  reason about the order without reading three services.
- Snapshotting the policy onto the booking means policy edits never
  silently change past bookings — important for finance reconciliation.
- The refund arithmetic is centralized on the entity, so
  penalty-percent edge cases (rounding, currency minor units,
  `nonRefundableAfter` cutoff) are unit-tested in one place.

### Negative

- A two-step "clear previous default then set new default" update has a
  small window where neither is the default; mitigated by wrapping both
  steps in a single transaction (and the unique partial index as a
  backstop).
- Snapshotting the policy on every booking adds columns to the booking
  table; for the current scale this is negligible but the snapshot
  format must be versioned if the policy schema changes.
- An organization that forgets to set a default falls through to the
  "first applicable policy" rule, which is non-obvious; we mitigate by
  surfacing a warning in the org admin UI ("No default cancellation
  policy — falling back to first match") and an SLO alert if a booking
  is ever created without a default match.

### Neutral

- The policy resolver is called synchronously on the booking creation
  hot path; for current traffic it is a single indexed lookup followed
  by in-memory checks. No caching layer is justified at this scale.
- The `appliesToSources` list is a free-form string array (e.g.
  `["DIRECT", "BOOKING_COM", "EXPEDIA"]`); we accept the schema cost
  in exchange for zero-deployment additions of new OTA channels.

## Alternatives Considered

| Alternative                                                | Why rejected                                                                                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Global single policy** (one rule for the whole platform) | Cannot serve the diversity of property types and OTAs; the original prototype is the proof of failure.                   |
| **Per-rate-plan policies only, no org/hotel default**      | Forces every property to define a policy per rate plan, which is operationally untenable.                                |
| **Per-OTA policy table, joined on source**                 | Duplicates state and makes precedence ambiguous when two OTAs match. A single policy with `appliesToSources` is simpler. |
| **Compute the refund in payment-service**                  | Two services, two answers, two tests; we chose the entity-method pattern for a single source of truth.                   |
| **No snapshot — always re-resolve at cancel time**         | Re-introduces the "policy changed mid-stay" footgun and breaks OTA reconciliation.                                       |
| **Hard delete with a tombstone in a separate audit table** | Two writes per delete; the soft-delete column is sufficient at this scale.                                               |

## Migration Plan

1. **Land the entity and repository.**
   - `CancellationPolicyEntity`, `ICancellationPolicyRepository`,
     `PrismaCancellationPolicyRepository.findApplicable` already ship as
     part of checklist 3.10. This ADR formalises the precedence they
     encode.

2. **Add the database constraint.**
   - Unique partial index on `(organizationId, hotelId)` where
     `isDefault = true AND deletedAt IS NULL`.
   - Migration is reversible: drop the index.

3. **Snapshot on booking.**
   - Add `cancellationPolicyId` and `cancellationSnapshot` columns to
     the `Booking` model.
   - `CreateBooking` calls `FindApplicableCancellationPolicy` and writes
     the snapshot in the same transaction.
   - Existing bookings (pre-snapshot) get a backfill job that resolves
     the policy and writes the snapshot.

4. **Wire OTA adapters.**
   - Replace each OTA adapter's local policy lookup with a call to
     `FindApplicableCancellationPolicy` (or a published equivalent on
     the booking-service HTTP contract).
   - The OTA is told the policy id and a human-readable summary; the
     snapshot is the source of truth on the booking row.

5. **Wire payment-service.**
   - `CancelBooking` calls `CancellationPolicyEntity.calculateRefund`
     on the snapshot and produces the refund/penalty pair.
   - payment-service never re-derives the math.

6. **Observability.**
   - Log a warning when a booking is created with the "first
     applicable" fallback (no default in scope).
   - SLO alert if the rate of "first applicable" fallbacks exceeds 1%
     of bookings per organization per day.

7. **Deprecation.**
   - When the prototype policy resolver in `src/` is unused, delete it
     under ADR-0001's migration plan.

## References

- `services/booking-service/src/domain/entities/CancellationPolicy.ts` —
  entity and arithmetic
- `services/booking-service/src/application/use-cases/FindApplicableCancellationPolicy.ts` —
  resolution entrypoint
- `services/booking-service/src/infrastructure/database/PrismaCancellationPolicyRepository.ts` —
  precedence implementation
- `services/booking-service/src/application/use-cases/CreateBooking.ts` —
  snapshot on creation
- `services/payment-service/src/application/use-cases/ProcessRefund.ts` —
  consumer of the arithmetic
- ADR-0001 (service-boundary) — `booking-service` is the canonical home
