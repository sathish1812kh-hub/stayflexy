# Versioning Strategy — Stayflexi Platform

This document describes how schema revisions, user-facing feature versions, API routes, and container release tags are managed and synchronized.

---

## 1. Version Classification Matrix

| Version Type        | ID Format         | Management Tool            | Sync Trigger        |
| :------------------ | :---------------- | :------------------------- | :------------------ |
| **Schema Version**  | `YYYYMMDDHHMMSS`  | Prisma Migrate / Git       | DB Migration Run    |
| **Feature Version** | `X.Y.Z`           | Feature registry / Tags    | E2E Playwright Pass |
| **API Version**     | `/api/vX/` routes | Express Router controllers | Code change commit  |
| **Release Version** | `vX.Y.Z`          | Docker tag / Git tags      | CI/CD Deployment    |

---

## 2. Dynamic Change Auditing

### A. Schema Version Checks

- Schema changes are logged as SQL migration files.
- Prisma updates write matching records to `_prisma_migrations` in PostgreSQL.
- The migration runner extracts the migration timestamp, generating a `Migration` node in Neo4j linked to the altered `DatabaseTable` nodes.

### B. API Versioning (Endpoint Isolation)

- Routes expose explicit path structures (e.g. `/api/v1/bookings`).
- To deprecate a route without breaking existing callers, the backend registers the route with a `@deprecated` annotation. The AST scanner marks the `Endpoint` node's status property as `Deprecated`, prompting the AI coordinator to avoid routing calls to it.

### C. Release Version Tags

- Production releases are tagged using Semantic Versioning (`v2.0.0`).
- The CI/CD pipeline pushes the release tag to Neo4j. This creates a `Release` node, linking it to the corresponding `Service` and `Deployment` nodes.
