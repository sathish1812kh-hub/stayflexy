---
name: rbac-matrix-prober
description: >
  Executes automated RBAC matrix verification and 403 Forbidden negative probes across all 6 Stayflexi system roles and 118 permissions.
  Use when modifying permission guards, adding API routes, modifying JWT claims, testing staff roles, or running security compliance suites.
argument-hint: '[role-name|all]'
license: MIT
---

# Stayflexi RBAC Matrix Prober

This skill enforces strict Role-Based Access Control (RBAC) and security verification across all Stayflexi endpoints and GraphQL resolvers.

## System Roles & Hierarchy

Stayflexi defines 6 immutable system roles:

1. `SUPER_ADMIN`: Root platform administration.
2. `HOTEL_MANAGER`: Property operations, rates, and staff assignment.
3. `FRONT_DESK`: Check-in/out, folios, and guest management.
4. `HOUSEKEEPING`: Task status updates and room cleaning logs.
5. `REVENUE_MANAGER`: Dynamic pricing and rate plan updates.
6. `GUEST`: Personal reservation view and self-service booking.

## Mandatory Negative-Path Probing (Tenet 6)

A security guard is ONLY verified when an explicit **403 Forbidden** probe is executed:

- Probing unauthorized endpoints with lower-privilege credentials must return HTTP `403 Forbidden` / GraphQL `FORBIDDEN`.
- System roles marked `isSystem: true` must reject delete and modify mutations with HTTP `403 Forbidden`.

## Test Execution

```bash
npm run test -- src/tests/api/v1/rbac-seeded-accounts.test.ts
```
