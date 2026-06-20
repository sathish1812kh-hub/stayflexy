# Project Context — Stayflexi Platform Monorepo

This file provides the primary architectural and directory routing layout of the Stayflexi monorepo. It establishes the folder mapping structure so that the AI Orchestrator can locate services, shared packages, and databases instantly during recovery.

---

## 1. Monorepo Structural Map

The Stayflexi platform is organized as a Turborepo monorepo with Express-based microservices, Apollo Federated subgraphs, code-first Pothos GraphQL schema builders, and Prisma ORM.

### Services Layout (`/services/`)

- **[analytics-service](file:///C:/Stayflexi/services/analytics-service)**: Aggregates runtime events and generates BI reports.
- **[auth-service](file:///C:/Stayflexi/services/auth-service)**: User session validation and role management.
- **[booking-service](file:///C:/Stayflexi/services/booking-service)**: Processes reservations, timeline queries, and invoicing.
- **[hotel-service](file:///C:/Stayflexi/services/hotel-service)**: Property and room layouts definition.
- **[inventory-service](file:///C:/Stayflexi/services/inventory-service)**: Manages physical room blocks and dynamic availability.
- **[notification-service](file:///C:/Stayflexi/services/notification-service)**: Triggers SMS, Email, and Push alerts.
- **[organization-service](file:///C:/Stayflexi/services/organization-service)**: Handles corporate accounts and customer hierarchies.
- **[ota-service](file:///C:/Stayflexi/services/ota-service)**: Connects to external channels (Expedia, Booking.com) via sync bridges.
- **[payment-service](file:///C:/Stayflexi/services/payment-service)**: Integrates with Stripe/Adyen gateway processors.
- **[pricing-engine-service](file:///C:/Stayflexi/services/pricing-engine-service)**: Evaluates dynamic room rates based on occupancy spikes.
- **[revenue-management-service](file:///C:/Stayflexi/services/revenue-management-service)**: Reconciliation tools and accounting balance sheets.
- **[workflow-service](file:///C:/Stayflexi/services/workflow-service)**: Coordinates distributed multi-service operations.

### Shared Workspace Packages (`/packages/`)

- **[shared-auth](file:///C:/Stayflexi/packages/shared-auth)**: Core auth guards and JSON Web Token validations.
- **[shared-config](file:///C:/Stayflexi/packages/shared-config)**: Unified Esbuild and TypeScript configurations.
- **[shared-database](file:///C:/Stayflexi/packages/shared-database)**: Central database clients, schema models, and migrations.
- **[shared-errors](file:///C:/Stayflexi/packages/shared-errors)**: Standardized application exceptions mapping to HTTP/GraphQL.
- **[shared-events](file:///C:/Stayflexi/packages/shared-events)**: PubSub/Kafka interfaces for event-driven coordination.
- **[shared-logger](file:///C:/Stayflexi/packages/shared-logger)**: Winston log formatting outputs with request correlation IDs.
- **[shared-observability](file:///C:/Stayflexi/packages/shared-observability)**: OpenTelemetry wrappers and custom Prometheus gauges.
- **[shared-types](file:///C:/Stayflexi/packages/shared-types)**: Shared database interfaces and runtime models.
- **[shared-validation](file:///C:/Stayflexi/packages/shared-validation)**: Centralized Zod verification contracts.

---

## 2. Infrastructure Layout

- **Database Layers**:
  - **Relational**: PostgreSQL instances containing booking tables, payment receipts, and guest accounts.
  - **Knowledge Graph**: Neo4j (`bolt://localhost:7687`) holds AST extractions, feature dependencies, and service maps.
  - **Semantic Narrative**: Graphiti Memory layer maps semantic relationships and audit logs.
- **Server Ports Configuration**:
  - Gateway API GraphQL: Port `4000`
  - PostgreSQL DB: Port `5432`
  - Neo4j DB Bolt: Port `7687`
  - Dev Web Dashboard: Port `3000`
