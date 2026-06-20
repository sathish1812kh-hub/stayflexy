# Security Inventory — Stayflexi Platform

This document details the security model, tenant boundaries, authentication lifecycle, and authorization mechanisms of the Stayflexi platform.

---

## 1. Authentication Flow

Stayflexi handles user sessions via token rotation, protected by security filters:

```
[User Login Request]
       │ (Body: email, password)
       ▼
[Brute Force Gate] ──────(> 5 failures in 15 mins)──────► [Blocked (429 Too Many Requests)]
       │ (Valid window)
       ▼
[Bcrypt Hash Match] ─────(Mismatch)──────────────────────► [Increment Redis Failure Count]
       │ (Success)
       ▼
[Generate JWT pair] ─────(Signs HS256 Tokens) ───────────► [Save RefreshToken to DB]
       │
       ▼
[Tokens Returned] ───────(Access: 15 mins | Refresh: 7 days)
```

### JWT Properties & Claims

Access tokens are signed using the `HS256` symmetric algorithm with a minimum 32-character secret key. Custom claims inside the payload include:

- `sub`: User identifier (`userId`)
- `email`: Registered user email
- `role`: Primary role assigned
- `orgId`: Owning organization/tenant ID
- `jti`: Unique token identifier used for single-use validation (replay prevention)

### Refresh Token Lifecycle

- Refresh tokens are long-lived (7 days) and stored in the database.
- **Rotation**: Every token refresh request revokes the previous token and generates a new pair.
- **Revocation**: Logging out revokes the refresh token from the database and registers the access token's `jti` in a Redis blacklist cache for its remaining TTL.

---

## 2. Authorization & RBAC

Stayflexi implements a **two-layer permission model**:

1.  **Coarse-grained Authorization**:
    - Evaluated via the user's `primaryRole` claim directly at the Gateway or controller level (e.g. fast-gating `HOUSEKEEPING` or `FRONT_DESK` users).
2.  **Fine-grained Authorization**:
    - Evaluated via the join tables `UserRole` -> `Role` -> `RolePermission` -> `Permission` which define specific `resource:action` pairs (e.g. `booking:create`, `revenue:approve`).

### System Roles & Permission Mapping

The database seeder maps 6 core system roles at startup:

| Role Name         | Scope          | Core Capabilities                                                             |
| :---------------- | :------------- | :---------------------------------------------------------------------------- |
| **SUPER_ADMIN**   | Platform-wide  | Root system control, organization creation, system metrics.                   |
| **ORG_ADMIN**     | Organization   | Full control over the organization's hotels, members, billing, and settings.  |
| **HOTEL_MANAGER** | Hotel Property | Manage room inventory, pricing rules, check-ins, check-outs, and local staff. |
| **FRONT_DESK**    | Hotel Property | Create bookings, check-in guests, collect payments, and view calendar.        |
| **HOUSEKEEPER**   | Rooms          | Read housekeeping lists, update room cleaning status.                         |
| **READ_ONLY**     | Organization   | General dashboard read access. No billing, check-in, or price adjustments.    |

---

## 3. Multi-Tenant Separation

Tenancy isolation is strictly enforced at the **application database query level**:

- Every data schema includes a mandatory `organizationId` foreign key (with the exception of global system structures).
- Any API route that fetches, updates, or deletes data is scoped by the caller's JWT-injected `x-organization-id` header.
- If a request contains an ID referencing a resource belonging to a different tenant, the repository layers throw a `ForbiddenError`, which registers a `SecurityEvent` log.

---

## 4. Service-to-Service Security

- Internal HTTP communications between microservices bypass standard user authentication.
- They carry an `x-service-key` request header.
- The downstream service compares this header against its local `SERVICE_KEY` environment variable. If they do not match, the request is rejected with `403 Forbidden`.
