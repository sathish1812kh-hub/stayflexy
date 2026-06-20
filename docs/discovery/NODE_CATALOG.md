# Node Catalog — Neo4j Knowledge Graph

This document details the Neo4j nodes representing requirements, engineering blocks, database layers, operations variables, and telemetry logs of the Stayflexi platform.

---

## 1. Requirement & Business Logic Nodes

### `Requirement`

- **Purpose**: Represents a product requirement or system feature request.
- **Properties**: `id: String` (Unique ID, e.g. "REQ-REV-01"), `title: String`, `description: String`, `priority: String`, `owner: String`.
- **Source of Extraction**: PRDs, design documents (`docs/**/*.md`), and Jira/task trackers.

### `RequirementVersion`

- **Purpose**: Manages revisions of a requirement over time.
- **Properties**: `versionId: String` (e.g. "REQ-REV-01:v1.2"), `requirementId: String`, `updatedAt: DateTime`, `author: String`, `changeLog: String`.
- **Source of Extraction**: Git history of docs folder, frontmatter of design MD files.

### `BusinessCapability`

- **Purpose**: Identifies high-level capabilities of the software domain.
- **Properties**: `name: String` (e.g. "Dynamic pricing optimization"), `domain: String`, `impactMetric: String`.
- **Source of Extraction**: Architectural context anchors in plans and domain maps.

### `BusinessRule`

- **Purpose**: Specifies mathematical or boolean rules governing business operations.
- **Properties**: `ruleId: String` (e.g. "RULE-WKND-SURGE"), `formula: String`, `description: String`, `isActive: Boolean`.
- **Source of Extraction**: Pricing rules and algorithms (e.g., `RevenueOptimizer.ts`, `PricingCalculator.ts`).

---

## 2. Software Architecture & Engineering Nodes

### `Feature`

- **Purpose**: Focuses on user-facing functional blocks.
- **Properties**: `featureId: String` (e.g. "FEAT-COMP-COMP"), `name: String`, `status: String` (Active, Deprecated, Partial), `description: String`.
- **Source of Extraction**: [`FEATURE_REGISTRY.md`](file:///C:/Stayflexi/docs/discovery/FEATURE_REGISTRY.md) and folder layouts.

### `FeatureVersion`

- **Purpose**: Pinpoints release versions of specific features.
- **Properties**: `version: String` (e.g. "2.0.0"), `releaseDate: DateTime`, `isCertified: Boolean`.
- **Source of Extraction**: [`BACKEND_CERTIFICATION.md`](file:///C:/Stayflexi/docs/BACKEND_CERTIFICATION.md) and tags.

### `Endpoint`

- **Purpose**: Represents exposed REST API paths or GraphQL query points.
- **Properties**: `method: String` (GET, POST, etc.), `route: String` (e.g. "/api/v1/revenue/comparison"), `rateLimit: String`, `isAuthRequired: Boolean`.
- **Source of Extraction**: `routes.ts` files inside microservices, Next.js routing structures.

### `APIContract`

- **Purpose**: Standardizes parameters and schemas for APIs.
- **Properties**: `id: String` (e.g. "CONTRACT-POST-BOOKING"), `payloadType: String` (JSON), `schemaDefinition: String` (Zod definition).
- **Source of Extraction**: Zod schema files (`packages/shared-validation/src` or service-level validator schemas).

### `Service`

- **Purpose**: Identifies microservices and gateway instances.
- **Properties**: `name: String` (e.g. "booking-service"), `port: Integer` (e.g. 3005), `language: String`, `framework: String`.
- **Source of Extraction**: `package.json` names, [`SERVICE_DEPENDENCY_MAP.md`](file:///C:/Stayflexi/docs/architecture/SERVICE_DEPENDENCY_MAP.md).

### `Repository`

- **Purpose**: Represents data access modules query classes.
- **Properties**: `className: String` (e.g. "PrismaBookingRepository"), `queriesImplemented: String[]`, `dataSource: String` (PostgreSQL).
- **Source of Extraction**: AST parsing of `*Repository.ts` files in service structures.

### `DTO`

- **Purpose**: Data Transfer Objects representing payloads.
- **Properties**: `name: String` (e.g. "CreateBookingRequestDto"), `fields: String[]`.
- **Source of Extraction**: AST parsing of `*Dto.ts` class files.

### `Validator`

- **Purpose**: Evaluates payload rules.
- **Properties**: `name: String` (e.g. "BookingValidator"), `validationRules: String[]`.
- **Source of Extraction**: Zod parsing middleware.

### `UIComponent`

- **Purpose**: Frontend view modules and blocks.
- **Properties**: `name: String` (e.g. "DashboardShell"), `fileLocation: String`, `isClientOnly: Boolean`.
- **Source of Extraction**: `src/app/components/` and local page layout components.

### `Page`

- **Purpose**: Represents Next.js routing endpoints served to users.
- **Properties**: `route: String` (e.g. "/revenue"), `title: String`, `isProtected: Boolean`.
- **Source of Extraction**: Next.js App Router directories (`src/app/**/page.tsx`).

---

## 3. Database Layer Nodes

### `DatabaseTable`

- **Purpose**: Maps relational tables in PostgreSQL.
- **Properties**: `tableName: String` (e.g. "bookings"), `schemaOwner: String` (e.g. "booking"), `isPartitioned: Boolean`.
- **Source of Extraction**: `src/database/prisma/schema/*.prisma` files.

### `DatabaseColumn`

- **Purpose**: Identifies column variables and constraints inside tables.
- **Properties**: `name: String`, `dataType: String`, `isPrimaryKey: Boolean`, `isForeignKey: Boolean`, `isNullable: Boolean`.
- **Source of Extraction**: Prisma schema parsing.

### `Migration`

- **Purpose**: Tracks schema update scripts.
- **Properties**: `migrationId: String` (e.g. "20240101000000_auth_initial"), `appliedAt: DateTime`.
- **Source of Extraction**: `prisma migrate status` logs, SQL file folders.

---

## 4. Environment & Operations Nodes

### `Package`

- **Purpose**: External and internal npm packages definitions.
- **Properties**: `name: String` (e.g. "ioredis"), `version: String`, `isInternal: Boolean`.
- **Source of Extraction**: `package.json` dependencies and `packages/` workspaces directories.

### `Decision`

- **Purpose**: Logs Architecture Decision Records (ADRs).
- **Properties**: `decisionId: String` (e.g. "ADR-FED-01"), `title: String`, `status: String` (Approved, Draft), `rationale: String`.
- **Source of Extraction**: `docs/02-design/**/*.md` decision files.

### `ExternalSystem`

- **Purpose**: Represents external payment systems, messaging APIs, and OTA channels.
- **Properties**: `name: String` (e.g. "Stripe"), `type: String` (Payment, SMS, OTA), `protocol: String` (REST Webhook, XML).
- **Source of Extraction**: [`EXTERNAL_SYSTEMS.md`](file:///C:/Stayflexi/docs/discovery/EXTERNAL_SYSTEMS.md).

### `UserJourney`

- **Purpose**: Defines flow patterns completed by administrators or guests.
- **Properties**: `journeyName: String` (e.g. "Guest Check-in Flow"), `steps: String[]`.
- **Source of Extraction**: UI specification documents and Playwright tests.

### `PlaywrightTest`

- **Purpose**: Automated test scripts.
- **Properties**: `fileName: String` (e.g. "overbooking.test.ts"), `suite: String`, `testCount: Integer`.
- **Source of Extraction**: `platform-validation/src/` test suites.

### `Environment`

- **Purpose**: Identifies target environments.
- **Properties**: `name: String` (e.g. "production", "staging", "development"), `clusterURL: String`.
- **Source of Extraction**: `.env` files and Kubernetes namespace configurations.

### `Release`

- **Purpose**: Deployed production releases tags.
- **Properties**: `tag: String` (e.g. "v2.0.0"), `releaseDate: DateTime`.
- **Source of Extraction**: Git tags, CI release logs.

### `Deployment`

- **Purpose**: Running Kubernetes deployment variables.
- **Properties**: `name: String` (e.g. "booking-deployment"), `replicas: Integer`, `imageTag: String`.
- **Source of Extraction**: `kubectl get deployments -o json` queries.

---

## 5. Telemetry & Security Nodes

### `RuntimeMetric`

- **Purpose**: Running metrics indicators.
- **Properties**: `name: String` (e.g. "http_requests_total"), `value: Float`, `timestamp: DateTime`.
- **Source of Extraction**: Prometheus scraping points (`/metrics`).

### `ErrorEvent`

- **Purpose**: Tracks runtime errors and alerts.
- **Properties**: `errorClass: String` (e.g. "ForbiddenError"), `message: String`, `timestamp: DateTime`, `serviceSource: String`.
- **Source of Extraction**: Pino JSON log files and AlertManager integrations.

### `Threat`

- **Purpose**: Models security threats (e.g., cross-tenant queries).
- **Properties**: `id: String` (e.g. "THREAT-XTENANT"), `description: String`, `severity: String`.
- **Source of Extraction**: Architectural risk threat assessments.

### `Vulnerability`

- **Purpose**: Tracks CVE security issues or package advisories.
- **Properties**: `cveId: String`, `packageName: String`, `severity: String`, `isPatched: Boolean`.
- **Source of Extraction**: `npm audit` scans.

### `Agent`

- **Purpose**: Represents AI system orchestration actors.
- **Properties**: `name: String` (e.g. "RevenueOptimizationAgent"), `role: String`, `scope: String`.
- **Source of Extraction**: System orchestrator configurations.

### `AuditEvent`

- **Purpose**: Access and modification event records.
- **Properties**: `id: String`, `userId: String`, `action: String`, `timestamp: DateTime`, `resource: String`.
- **Source of Extraction**: `AuditLog` database tables.
