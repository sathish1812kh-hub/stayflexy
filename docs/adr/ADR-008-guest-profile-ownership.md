# ADR-008: Guest Profile Ownership in Organization Service

- **Status**: Accepted
- **Date**: 2026-08-28
- **Scope**: organization-service, booking-service, shared-types
- **Deciders**: Platform Architecture Group
- **Related**: Checklist 1.2, `src/database/prisma/schema/*`, `services/organization-service`

## Context

Guest information was previously ad-hoc — stored as free-form fields on the
Booking model or duplicated across services. There was no canonical
Guest/GuestProfile entity, no linkage to Organization, and no reuse for
loyalty (3.13) or housekeeping context. The platform needs a single owned
entity for guest identity that can be linked to bookings, used for compliance
search, and extended without coupling booking-service to organization internals.

## Decision

1. **Organization-service owns Guest/GuestProfile.** The Prisma models
   `Guest` and `GuestProfile` are owned by organization-service at the
   application layer (tables in shared DB for now per ADR-0001).
2. **Booking links via `guestId`, not embedded data.** `Booking` holds a
   nullable `guestId` FK; services fetch guest details via HTTP or event
   projection, not direct table join across ownership boundaries.
3. **Cross-service access is contract-based.** Other services may read guest
   data via organization-service's HTTP API or denormalised event payloads;
   direct `guest` table writes outside organization-service are prohibited.
4. **Foundation for loyalty.** Loyalty (3.13) will extend GuestProfile rather
   than create a parallel identity.

## Consequences

### Positive

- Deduplicated guest records; single place for PII handling and compliance
  requests (GDPR export/delete).
- Booking-service stays focused on reservation lifecycle; guest enrichment is
  additive.

### Negative

- Additional hop for booking flows that need guest details (mitigated by
  DataLoader/caching and event denormalisation).
- Shared-DB FK is logical ownership only until schema-per-service extraction.

### Neutral

- Existing bookings backfilled with `guestId = null` — compatible default.

## Alternatives Considered

| Alternative                        | Why rejected                                                                                                                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Guest lives in booking-service** | Couples guest identity to reservation lifecycle; loyalty/compliance would need cross-service writes into booking.                                                                   |
| **Guest embedded in Booking JSON** | No identity, no reuse, search/compliance scans become table scans on JSON.                                                                                                          |
| **New dedicated guest-service**    | Premature microservice for a small bounded context; organization-service already owns identity-adjacent data (members, orgs). Evaluated for extraction later if growth warrants it. |

## Migration Plan

1.  Add `Guest`/`GuestProfile` models to Prisma schema and generate client.
2.  Implement CRUD and linkage in organization-service with audit and
    permission checks.
3.  Add `guestId` to `Booking`, wire create-booking flow to create/link guest
    via `requirePermission` guard.
4.  Backfill/migrate existing bookings; update booking read paths to include
    guest include where needed.
5.  Verify with `npm run type-check:all` and service tests; add contract test
    for guest → booking linkage.

## References

- `services/organization-service/src/` — guest domain
- `services/booking-service/src/interfaces/http/routes.ts` — linkage wiring
- `docs/architecture/ARCHITECTURE.md` — bounded contexts
