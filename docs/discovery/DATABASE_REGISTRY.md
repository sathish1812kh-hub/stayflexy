# Database Registry — Stayflexi Platform

This document describes the logical and physical datastore architecture, table definitions, indexing logic, cascade rules, and schema migrations.

---

## 1. Schema Architecture & Tenant Isolation

Stayflexi adopts a **multi-file Prisma schema configuration** (16 schema files) under `src/database/prisma/schema/` that compiles into a single unified client:

```
src/database/prisma/schema/
├── index.prisma          — Generator, database client configurations, and postgres connection options
├── common.prisma         — Enums (RoleEnum, BookingStatus) and AuditLog
├── auth.prisma           — User authentication tables
├── organization.prisma   — Tenancy boundary, members, RBAC
├── hotel.prisma          — Hotels registry
├── room.prisma           — Room Types and Rooms
├── inventory.prisma      — Inventory allocations and calendar blocks
├── booking.prisma        — Reservations, Booking Rooms, and Booking Guests
├── payment.prisma        — Payments, Refunds, Invoices, Webhooks, and Double-entry Ledgers
├── ota.prisma            — OTA providers mapping and Sync logs
├── revenue.prisma        — Competitors registry, Scraped Rates, recommendations
├── operations.prisma     — Housekeeping Tasks, Maintenance Tickets, Audit logs
├── security.prisma       — Sessions, Compliance, Backup & Recovery executions
├── ai.prisma             — AI insights, recommendation systems, automation rules
├── system.prisma         — System health logs, notifications queues
└── infrastructure.prisma — Event queue buffer log and worker metadata
```

### Multi-Tenant Isolation Strategy

**Organization is the tenant boundary.** Every resource in the system (Hotel, Room, Booking, Payment, AuditLog) carries an `organizationId` foreign key. Query routing is systematically scoped by tenant:

- Queries scope on `organizationId = X` at the repository level.
- **SUPER_ADMIN** is the only role with a null `organizationId` allowed.
- Cascade delete boundaries ensure child entities under an Organization are removed if the parent tenant is deleted (except audit logs, which enforce `RESTRICT`).

---

## 2. Core Tables Catalog

| Table                    | Prisma File           | Description                                            | Primary Key / Index / Constraints                                  |
| :----------------------- | :-------------------- | :----------------------------------------------------- | :----------------------------------------------------------------- |
| `User`                   | `auth.prisma`         | User profile credentials and primary role designation. | PK: `id`, Unique: `email`, Index: `status, deletedAt`              |
| `Organization`           | `organization.prisma` | Main tenant organization definition.                   | PK: `id`, FK: `ownerId` -> `User`                                  |
| `Hotel`                  | `hotel.prisma`        | Hotel property registry.                               | PK: `id`, Unique: `[organizationId, slug]`, Index: `city, country` |
| `RoomType`               | `room.prisma`         | Configuration classes for rooms (e.g. Deluxe).         | PK: `id`, FK: `hotelId` -> `Hotel`                                 |
| `Room`                   | `room.prisma`         | Physical room metadata and active status.              | PK: `id`, FK: `roomTypeId` -> `RoomType`                           |
| `Inventory`              | `inventory.prisma`    | Date-by-date availability numbers.                     | PK: `id`, Unique: `[roomTypeId, date]`                             |
| `Booking`                | `booking.prisma`      | Reservation details, lifecycle state, dates.           | PK: `id`, FK: `hotelId` -> `Hotel`, Index: `status`                |
| `Payment`                | `payment.prisma`      | Billing transactions records.                          | PK: `id`, FK: `bookingId`, Index: `status`                         |
| `LedgerEntry`            | `payment.prisma`      | Double-entry append-only bookkeeping registry.         | PK: `id`, FK: `hotelId` -> `Hotel`, Index: `createdAt`             |
| `CompetitorHotel`        | `revenue.prisma`      | Competitor hotels grouped by Stayflexi properties.     | PK: `id`, FK: `hotelId` -> `Hotel`                                 |
| `CompetitorScrapedPrice` | `revenue.prisma`      | Market price snapshots scraped/imported for dates.     | PK: `id`, FK: `competitorHotelId`, Index: `checkInDate`            |
| `AuditLog`               | `common.prisma`       | Local tenant append-only audit trail.                  | PK: `id`, Index: `[resource, resourceId]`, Index: `createdAt`      |

---

## 3. Constraints & Cascades Rules

Cascades are strictly configured in Prisma schemas to prevent orphaned rows while securing permanent history (RESTRICT):

| Parent Entity    | Child Entity     |   Action   | Rationale                                                                              |
| :--------------- | :--------------- | :--------: | :------------------------------------------------------------------------------------- |
| **Organization** | **Hotel**        | `CASCADE`  | Hotel properties exist only within the context of their organization.                  |
| **Organization** | **AuditLog**     | `RESTRICT` | Prevent deletion of organizations if audit records exist. Logs must be archived first. |
| **User**         | **RefreshToken** | `CASCADE`  | Logged-out or deleted users have their active refresh tokens instantly revoked.        |
| **User**         | **AuditLog**     | `RESTRICT` | Audit trails cannot be deleted by deleting the user.                                   |
| **Hotel**        | **RoomType**     | `CASCADE`  | Room types are permanently tied to a property.                                         |
| **RoomType**     | **Inventory**    | `CASCADE`  | Date-based availability ranges disappear with the room class.                          |
| **Booking**      | **Payment**      | `RESTRICT` | Booking cannot be deleted if billing history is attached.                              |

---

## 4. Migration & Schema Updates

- **Migration CLI Engine**: Prisma Migrate is configured to generate schema diff sql files.
- **Command Set**:
  - _Development_: `npm run db:migrate -- --name <name>`
  - _Production deployment_: `npm run db:migrate:prod` (Executes pending sql diff migrations).
- **Idempotent Seeder**: Seeder script (`src/database/seeders/index.ts`) populates static `Permission` and pre-configured `Role` permissions. Safe to re-run in any deployment stage.
