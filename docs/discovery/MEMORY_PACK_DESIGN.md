# Project Memory Pack Design — Stayflexi Platform

This document designs the Project Memory Pack, a collection of standardized markdown files that persist state, track active tasks, record decisions, and enable future LLM orchestration sessions to regain context.

---

## 1. Memory Pack Schema Catalog

```
[Stayflexi Codebase] ──► [AST Scrapes] ──► [Neo4j Graph]
                                                │
                                                ▼ (Sync Hook)
[Memory Pack Docs Folder] ◄─────────────────────┘
├── project-context.md     — Overall system status and baseline ports map
├── active-tasks.md        — Dynamic queue of ongoing engineering actions
├── decision-log.md        — ADR changes and configuration selections
├── feature-registry.md    — Functional status of components
├── dependency-registry.md — Direct and dev libraries list
└── release-history.md     — Deployment logs and tag markers
```

---

## 2. Document Specifications

### A. `project-context.md`

- **Purpose**: Holds system architecture baselines, active microservice ports, database engines, and structural boundaries.
- **Owner**: AI Orchestrator Core / Lead Architect.
- **Update Rules**: Re-generated upon service creation, port redirection, or changes to core infrastructure directories (such as adding subgraphs).
- **Synchronization Rules**: Direct mapping from Neo4j `Service` and `Environment` node variables.

### B. `active-tasks.md`

- **Purpose**: Tracks running development steps, completed milestones, and pending validation blocks.
- **Owner**: Autonomous Agent Team / Task Planner.
- **Update Rules**: Updated at the beginning and termination of every execution step. Append logs showing date, agent identity, and changes made.
- **Synchronization Rules**: Triggers a Neo4j update to write `AuditEvent` and link them to active `Agent` nodes.

### C. `decision-log.md`

- **Purpose**: Log Architectural Decision Records (ADRs) with design options and rationale.
- **Owner**: Principal Architect / Senior Engineers.
- **Update Rules**: Edited whenever a team changes packages, upgrades frameworks, or pivots architecture designs.
- **Synchronization Rules**: Parses ADR file frontmatter to output `Decision` nodes in Neo4j.

### D. `feature-registry.md`

- **Purpose**: Track functional status of code blocks (Active, Partial, Deprecated).
- **Owner**: Product Owner / AI Auditor.
- **Update Rules**: Updated automatically when a Playwright E2E verification test fails or is added, changing a feature's verification status.
- **Synchronization Rules**: Synchronizes with Neo4j `Feature` and `PlaywrightTest` relationships.

### E. `dependency-registry.md`

- **Purpose**: Index of library versions and usage coordinates.
- **Owner**: Security Engineer / Release Manager.
- **Update Rules**: Script checks root and workspace `package.json` files on git commit hook gates.
- **Synchronization Rules**: Maps `Package` nodes and `DEPENDS_ON` relations in Neo4j.

### F. `release-history.md`

- **Purpose**: Catalog of production git tags, build targets, and deploy times.
- **Owner**: DevOps Engineer.
- **Update Rules**: Automated step in CI/CD release workflow pipelines.
- **Synchronization Rules**: Writes `Release` and `Deployment` nodes in Neo4j.

---

## 3. Synchronization & Persistence Rules

To ensure graph data and local text context do not drift, Stayflexi enforces synchronization rules:

1.  **Git Commit Hook Sync**: A pre-commit hook runs a lightweight AST parser. If dependency modifications or route changes are detected, it updates the local Markdown registries.
2.  **Telemetry Aggregation Trigger**: Every deployment pipeline run pushes active release hashes and Docker tags directly to Neo4j.
3.  **LLM Session Recovery Routine**: When a new LLM pair programming session starts, the agent reads the local `.agents/memory/` folder to instantly load the context state without querying Neo4j.
