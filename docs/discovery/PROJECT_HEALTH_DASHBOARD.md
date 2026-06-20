# Project Health Dashboard Model — Stayflexi Platform

This document describes the interface widgets, metrics indicators, and Cypher database queries designed for the Project Health Dashboard.

---

## 1. Dashboard Interface Layout

The dashboard aggregates operational status, security indicators, active task bounds, and architectural alignment.

```text
+-----------------------------------------------------------------------------------------+
|                                PROJECT HEALTH DASHBOARD                                 |
+------------------------------------+----------------------------------------------------+
|  [OPEN RISKS & INCIDENTS WIDGET]   |  [ACTIVE SPRINTS & TASKS WIDGET]                   |
|  - P1 Incident: 0 active           |  - Sprint progress: 85%                            |
|  - p95 Checkout Latency: 0.18s     |  - Active task: TSK-00129 (In Progress)           |
+------------------------------------+----------------------------------------------------+
|  [RECENT CHANGES LOG]              |  [PENDING COMPLIANCE & MERGES WIDGET]              |
|  - Commit: 9b1fb2d (customerType)  |  - PR #284 (Review warning: Zod schema change)     |
|  - Migration: 20260620_cust_type   |  - GPG Signatures: 0 pending                       |
+------------------------------------+----------------------------------------------------+
|  [ARCHITECTURE DRIFT WIDGET]       |  [KNOWLEDGE SYNCHRONIZATION STATUS WIDGET]          |
|  - Mapped Endpoints: 100%          |  - Neo4j: SYNCED (Date: 2026-06-20)                 |
|  - Un-indexed columns: 0           |  - Graphiti: SYNCED (Date: 2026-06-20)             |
|                                    |  - GraphQL Subgraphs: SYNCED (Date: 2026-06-20)    |
+------------------------------------+----------------------------------------------------+
```

---

## 2. Widget Metric Indicators & Cypher Queries

### 1. Open Risks

- **Indicator**: Active incident counts, p95 endpoints latency charts, and DB query lock delays.
- **Query**:
  `MATCH (i:Incident {status: "ACTIVE"}) RETURN count(i) AS ActiveIncidentsCount`

### 2. Active Tasks

- **Indicator**: Sprint burndown progress bars and task dependency mappings lists.
- **Query**:
  `MATCH (t:Task) RETURN t.status, count(t) AS TasksCount`

### 3. Recent Changes

- **Indicator**: Commits and schema updates log.
- **Query**:
  `MATCH (c:Commit) RETURN c.hash, c.author, c.timestamp ORDER BY c.timestamp DESC LIMIT 10`

### 4. Pending Approvals

- **Indicator**: PR review indicators and GPG signature checkers.
- **Query**:
  `MATCH (c:Change {status: "PENDING_REVIEW"}) RETURN c.id, c.compositeRiskScore, c.riskLevel`

### 5. Architecture Drift

- **Indicator**: Mismatches grid between repository structures and the database catalog.
- **Query**:
  `MATCH (col:DatabaseColumn) WHERE NOT (col)<-[:HAS_COLUMN]-(:DatabaseTable) RETURN col`

### 6. Synchronization Status

- **Indicator**: Green/Red indicator lights tracking Neo4j, Graphiti, and GraphQL gateway health metrics.
- **Query**:
  `MATCH (sa:SyncAudit) RETURN sa.actionType, sa.outcome, sa.timestamp ORDER BY sa.timestamp DESC LIMIT 3`
