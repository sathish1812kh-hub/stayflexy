# Graphiti Ingestion Plan — Stayflexi Platform

This document describes how the Graphiti Memory Layer receives, filters, and ingests semantic data from codebase operations, tests, git logs, and runtime telemetry.

---

## 1. Ingestion Pipeline Mappings

```
 [Neo4j Graph Changes] ──────► [Graphiti Listener Hook]
 [Git commits / Push]   ──────► [Webhook/Commit Hook]    ──────► [Graphiti Memory Store]
 [Playwright E2E Runs]  ──────► [Test Reporter Scraper]
 [Telemetry & Logs]     ──────► [Pino alert scraper]
```

---

## 2. Ingestion Rules by Source

### A. Ingestion from Neo4j Graph

- **Trigger**: Any Cypher write transaction on structural nodes (`Service`, `DatabaseTable`).
- **Mechanism**: A Neo4j database transaction handler event listener invokes a Graphiti webhook payload, updating the corresponding `Architecture Memory` context mapping.

### B. Ingestion from Codebase AST & Schemas

- **Trigger**: File changes to packages or database models.
- **Mechanism**: The AST parser scans modified classes and updates `Dependency Memory` nodes directly via the Graphiti ingestion API.

### C. Ingestion from Documentation & ADRs

- **Trigger**: A file save or git push containing changes to markdown files under `docs/`.
- **Mechanism**: A markdown parser extracts yaml frontmatter metadata, updates the `Decision Memory` logs, and appends changes to `active-tasks.md`.

### D. Ingestion from Git Commit History

- **Trigger**: Code commits merged into the main development branches.
- **Mechanism**: A git post-commit hook extracts commit subjects (e.g. `feat(billing): add stripe confirmation`) to update `Release Memory`.

### E. Ingestion from Playwright Test Results

- **Trigger**: Completion of integration or E2E tests in the CI/CD pipeline.
- **Mechanism**: A custom Playwright test reporter format script parses test failure stack traces, matching failed tag assertions (e.g. `@feature:bookings`) to update `Feature Memory` with the latest `verificationStatus = "FAILED"`.

### F. Ingestion from Telemetry & Runtime Events

- **Trigger**: Outages, exceptions, or high database latency thresholds.
- **Mechanism**: Critical alert signals (e.g., error rate >1% in `booking-service`) are intercepted by the Pino log stream analyzer, immediately creating a temporary `Incident Memory` block to guide the AI co-pilot's operational recommendations.
