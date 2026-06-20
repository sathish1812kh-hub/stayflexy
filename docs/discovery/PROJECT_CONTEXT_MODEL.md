# Project Context Model — Stayflexi Platform

This document describes the key awareness metadata parameters, domains, features, and active task boundaries maintained inside prompt contexts.

---

## 1. Core Context Variables

The Project Awareness Engine maintains constant access to nine fundamental operational variables:

- **Project Name**: Stayflexi Platform (Unified Autonomous Software Intelligence Orchestrator).
- **Current Version**: `5.2.0`
- **Current Release**: `v5.2.0-certified`
- **Architecture**: Distributed Monorepo utilizing Apollo Federated subgraphs, code-first Pothos schemas, Express microservices, Prisma PostgreSQL ORM, and Neo4j + Graphiti Knowledge layers.
- **Domains**: Booking, Inventory, Payments, Reporting, Operations, Telemetry, and OTA Sync.
- **Features**: Active user-facing capability nodes (e.g., `FEAT-BOOK-CREATE`, `FEAT-COMP-COMP`).
- **Dependencies**: Coupling interfaces between microservices and whitelisted npm packages.
- **Open Risks**: Critical anomalies and compliance drifts (e.g. un-indexed timeline queries).
- **Open Tasks**: Active sprint deliverables.

---

## 2. Context Mappings Table

| Variable                   | Hydration Source                                                                               | Memory Mapping Relation                    | Verification Gate                       |
| :------------------------- | :--------------------------------------------------------------------------------------------- | :----------------------------------------- | :-------------------------------------- |
| **Project Name & Version** | `package.json`                                                                                 | `(p:Project)`                              | Pre-commit metadata checker.            |
| **Architecture Layout**    | [project-context.md](file:///C:/Stayflexi/docs/discovery/project-context.md)                   | `(s:Service)-[:USES_REPO]->(r:Repository)` | Pre-commit directory path check.        |
| **Features & Status**      | [feature-registry.md](file:///C:/Stayflexi/docs/discovery/feature-registry.md)                 | `(f:Feature {featureId: $featureId})`      | Duplicate matching scan check.          |
| **Dependencies**           | [dependency-registry.md](file:///C:/Stayflexi/docs/discovery/dependency-registry.md)           | `(s1)-[:DEPENDS_ON]->(s2)`                 | Circular imports dependency checker.    |
| **Open Risks**             | [PROJECT_HEALTH_DASHBOARD.md](file:///C:/Stayflexi/docs/discovery/PROJECT_HEALTH_DASHBOARD.md) | `(i:Incident {status: "ACTIVE"})`          | Continuous Prometheus alerting scraper. |
| **Open Tasks**             | [active-tasks.md](file:///C:/Stayflexi/docs/discovery/active-tasks.md)                         | `(t:Task {status: "OPEN"})`                | AI Planner sprint task scheduler.       |

---

## 3. Hydration Directives

During session recovery, the Context Builder populates these fields by executing topological graph queries to construct a lightweight text block. This block is injected at the beginning of the prompt window, immediately establishing system awareness.
