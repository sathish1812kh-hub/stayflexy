# Database Architecture — Stayflexi

## Schema layout

```
src/database/prisma/schema/
├── index.prisma        — generator + datasource (single source of truth)
├── common.prisma       — shared enums + AuditLog
├── auth.prisma         — User, RefreshToken, PasswordResetToken
├── organization.prisma — Organization, OrganizationMember, Role, Permission, UserRole, RolePermission
└── hotel.prisma        — Hotel
```

Future domain files: `room.prisma`, `booking.prisma`, `inventory.prisma`, `payment.prisma`, `housekeeping.prisma`, `notification.prisma`

---

## Multi-tenant isolation strategy

**Organization is the tenant boundary.** Every resource in the system (Hotel, Room, Booking, Payment) carries an `organizationId`. Queries are always scoped to the caller's organization; cross-tenant data access is impossible without an explicit `organizationId` mismatch.

```
Organization
├── Users          (organizationId FK — null for SUPER_ADMIN only)
├── Hotels         (organizationId FK — CASCADE on hard delete)
├── Roles          (organizationId FK — null for system roles)
└── AuditLogs      (organizationId FK — RESTRICT, no delete while logs exist)
```

**SUPER_ADMIN** is the only user type with a null `organizationId`. All other roles must belong to an organization.

---

## RBAC flow

```
User.primaryRole        — coarse-grained role enum (fast permission checks)
  └── UserRole           — scoped assignment (userId + roleId + orgId? + hotelId?)
        └── Role         — named role (system or org-scoped)
              └── RolePermission
                    └── Permission (resource + action)
```

### Two-layer permission model

| Layer | Field | Purpose |
|---|---|---|
| **Coarse** | `User.primaryRole` | Fast, index-friendly gate (e.g. "is this a HOUSEKEEPING user?") |
| **Fine-grained** | `UserRole → Role → Permission` | Exact resource:action grants |

**Scope chain in UserRole:**
- `organizationId = null, hotelId = null` → platform-wide (SUPER_ADMIN only)
- `organizationId = X, hotelId = null` → all hotels in org X
- `organizationId = X, hotelId = Y` → hotel Y only (Phase 2)

### Why `UserRole` has no `@@unique` on nullable composite
PostgreSQL treats `NULL != NULL` in unique indexes — two rows with `(userId, roleId, NULL, NULL)` would both pass a unique constraint. Uniqueness is enforced at the service layer in `OrganizationService.inviteMember()`.

---

## Entity relationships

### User
- Belongs to one `Organization` (`SetNull` on org delete — user survives but loses org scope)
- Is the owner of at most one `Organization` (`RESTRICT` — org owner cannot be deleted while org exists)
- Has many `RefreshToken`, `PasswordResetToken` (`CASCADE`)
- Has many `UserRole` entries (`CASCADE`)
- Has many `AuditLog` entries (`RESTRICT` — cannot delete user with audit history)

### Organization
- Has one `User` as owner (`RESTRICT`)
- Has many `User` members (`SetNull`)
- Has many `Hotel` (`CASCADE` — hotels are children of the org)
- Has many `Role` (`CASCADE` — org-scoped roles die with the org)
- Has many `AuditLog` (`RESTRICT`)

### Hotel
- Belongs to one `Organization` (`CASCADE`)
- Slug is unique **per organization** (`@@unique([organizationId, slug])`) — same slug allowed across different orgs
- Future child relations: `Room[]`, `Booking[]`, `HousekeepingTask[]`

### Role
- `organizationId = null` + `isSystem = true` → seeded at startup, read-only
- `organizationId = <id>` → org-created custom role, deleted with org

### Permission
- Static `resource:action` pairs, seeded at startup
- Never modified or deleted at runtime
- `@@unique([resource, action])` enforces no duplicates

### AuditLog
- Append-only (`update` and `hardDelete` throw in `AuditLogRepository`)
- `onDelete: Restrict` on both `userId` and `organizationId` — intentional: you must archive/export audit logs before deleting the owning entity
- Retention: 365 days (enforced by scheduled cleanup job, not at DB level)

---

## Cascade rules summary

| Relationship | On Delete |
|---|---|
| Organization → Hotel | CASCADE |
| Organization → OrganizationMember | CASCADE |
| Organization → Role (org-scoped) | CASCADE |
| User → RefreshToken | CASCADE |
| User → PasswordResetToken | CASCADE |
| User → UserRole | CASCADE |
| Role → UserRole | CASCADE |
| Role → RolePermission | CASCADE |
| Permission → RolePermission | CASCADE |
| User → AuditLog | RESTRICT |
| Organization → AuditLog | RESTRICT |
| Organization → User | SET NULL |
| User (owner) → Organization | RESTRICT |

---

## Index strategy

Every foreign key is indexed. Additional indexes:

| Table | Index | Reason |
|---|---|---|
| `users` | `email` | Login lookup (unique) |
| `users` | `status, deletedAt` | Active user filters |
| `hotels` | `city, country` | Location search |
| `hotels` | `starRating, category` | Filter by class |
| `audit_logs` | `resource, resourceId` | Per-entity audit trail |
| `audit_logs` | `createdAt` | Time-range queries |
| `refresh_tokens` | `expiresAt` | Scheduled cleanup job |

---

## Migration strategy

```bash
# Development — generates migration file + applies it
npm run db:migrate -- --name <descriptive-name>

# Production — applies pending migrations only (no generation)
npm run db:migrate:prod

# Check pending migrations in any environment
npm run db:migrate:status

# Reset dev database (destructive — dev only)
npm run db:migrate:reset
```

### Migration naming convention
`YYYYMMDDHHMMSS_<domain>_<description>`
- `20240101000000_auth_initial_users`
- `20240102000000_org_rbac_foundation`
- `20240103000000_hotel_base`

---

## Seeding

```bash
npm run db:seed
```

Seeds (idempotent via `upsert`):
1. **Permissions** — all `resource:action` pairs (44 permissions)
2. **System roles** — 6 roles with pre-assigned permission sets
3. Role–permission join records

Seed is safe to re-run in any environment. Never seeds user data or org data.

---

## Scalability considerations

1. **Microservice extraction** — each schema file maps to a bounded context. When a domain grows large enough, `hotel.prisma` + `room.prisma` + `booking.prisma` can be extracted to their own service with a separate database. The `Hotel.id` becomes a cross-service reference (no FK, enforced at application layer).

2. **Read replicas** — `prisma.$transaction` is used for write operations. Read-heavy queries (availability search, audit logs) can be routed to a read replica by instantiating a second `PrismaClient` with `DATABASE_URL_REPLICA`.

3. **Connection pooling** — `DATABASE_POOL_SIZE` env var controls `connection_limit` in the connection string. For serverless (Vercel/Lambda), use PgBouncer or Prisma Accelerate.

4. **Partitioning** — `audit_logs` and future `bookings` tables are candidates for range partitioning on `createdAt` once row count exceeds ~10M.

5. **Soft deletes** — `deletedAt` is present on `users`, `organizations`, `hotels`. All queries in repositories must filter `deletedAt: null` by default. Hard deletes are reserved for compliance/erasure flows only.
