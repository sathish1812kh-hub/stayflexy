# Automatic Extraction Strategy — Stayflexi Platform

This document describes the automated pipeline engines, tools, and scripts used to scan the Stayflexi repository, parse runtime metrics, and feed graph data directly into Neo4j.

---

## 1. Extraction Pipeline Architecture

The automated extraction flow functions as a multi-stage parser engine:

```
[Stayflexi Repository] ──────► [AST Scanners (ts-morph)]
[Prisma Schemas]       ──────► [Prisma Schema Parser]   ──────► [Graph ETL Adapter] ──► [Neo4j DB]
[K8s & CI/CD Configs]  ──────► [YAML & JSON Parsers]
[OTel & Pino Logs]     ──────► [Pino Stream Scraper]
```

---

## 2. Extraction Pipeline Methods by Source

### A. Source Code AST Parsing

- **Target Nodes**: `Service`, `Repository`, `DTO`, `Validator`, `UIComponent`, `Page`.
- **Target Relationships**: `EXPOSES`, `USES`, `VALIDATES_WITH`, `READS`, `WRITES`.
- **Extraction Method**:
  - Use a TypeScript AST manipulation library (e.g. `ts-morph`).
  - **Endpoints & Services**: Scan `*routes.ts` file patterns for express route methods (`router.get`, `router.post`). Map controller targets to endpoints.
  - **Data Layer**: Scan repository files (`*Repository.ts`) matching method signatures containing Prisma calls (e.g. `db.booking.findMany` translates to `READS` on `Booking` table).
  - **DTOs & Validators**: Extract interface shapes from Zod validations inside validation packages (`packages/shared-validation`).

### B. Database Schema & Migration Scanning

- **Target Nodes**: `DatabaseTable`, `DatabaseColumn`, `Migration`.
- **Target Relationships**: `BELONGS_TO`, `DEPENDS_ON` (Table references), `APPLIES_TO`.
- **Extraction Method**:
  - Parse the 16 `.prisma` files under `src/database/prisma/schema/` using `@mrleopold/prisma-ast` or custom regex scanners.
  - Map `@relation` directives to establish the `DEPENDS_ON` foreign key relationship between `DatabaseTable` nodes.
  - Read files under `src/database/prisma/schema/migrations/` and cross-reference table modifications to generate `Migration` nodes.

### C. API Gateway & Routing Configurations

- **Target Nodes**: `Endpoint`, `APIContract`.
- **Target Relationships**: `EXPOSES`, `DEFINES_CONTRACT`.
- **Extraction Method**:
  - Parse express gateway routes in `infrastructure/gateway/` to extract proxy targets and rate limits.
  - For GraphQL, compile Apollo Federation supergraph configuration profiles (`supergraph.graphql`) to index GraphQL resolvers and schema federation keys.

### D. Documentation Parsing

- **Target Nodes**: `Requirement`, `RequirementVersion`, `Decision`, `ExternalSystem`, `Feature`.
- **Target Relationships**: `DEFINES`, `IMPLEMENTS`.
- **Extraction Method**:
  - Read markdown files under `docs/` using a Markdown abstract syntax parser (`remark-parse`).
  - Parse frontmatter variables (e.g. `feature: graphql-federation`, `version: 1.0.0` in ADR files) to index `Decision` and `Feature` nodes.
  - Parse structural lists in [`SERVICE_DEPENDENCY_MAP.md`](file:///C:/Stayflexi/docs/architecture/SERVICE_DEPENDENCY_MAP.md) to initialize the network relationship maps.

### E. Playwright Test Suite Analysis

- **Target Nodes**: `PlaywrightTest`, `UserJourney`.
- **Target Relationships**: `TESTED_BY`.
- **Extraction Method**:
  - Scan test files in `platform-validation/src/` for `describe()` and `test()` declarations.
  - Read custom annotations or tags (e.g. `@concurrency`, `@security`, `@feature:bookings`) to link specific test nodes back to the `Feature` nodes they validate.

### F. Telemetry & Log Streams Scrapers

- **Target Nodes**: `RuntimeMetric`, `ErrorEvent`, `AuditEvent`.
- **Target Relationships**: `OBSERVED_BY`, `LOGGED_BY`, `AUDITS`.
- **Extraction Method**:
  - **Prometheus**: Query the Prometheus API (`GET /api/v1/targets` or active scraper status) to pull exposed metric keys.
  - **Pino Logs**: A file-watch worker parses JSON logs. Alerts with severity `error` create `ErrorEvent` nodes, matching the `x-correlation-id` header to route them to the originating `Service`.
