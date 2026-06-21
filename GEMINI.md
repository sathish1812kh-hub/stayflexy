# Project Rules & Ingestion Governance

This file defines the mandatory startup protocol for the Stayflexi Platform.

---

## Mandatory Boot Protocol (Phase 0)

Before executing any developer task, you must establish context using the following steps:

1.  **Read state**: Open and read [docs/discovery/current-state.md](file:///C:/Stayflexi/docs/discovery/current-state.md) to locate the active task and focus modules.
2.  **Verify Git status**: Run `git status --porcelain` to check for unrecorded drift.
3.  **Verify Services**: Verify that all required databases and services (PostgreSQL on port 5432, Neo4j on port 7687, Redis, Kafka) are active. Confirm that Neo4j is active. If any services/databases (especially Neo4j) are not active, make them active (e.g., run `docker compose up -d neo4j` or start PostgreSQL). Only after confirming they are active, proceed to the active developer task.
4.  **Read tasks**: Open and read [docs/discovery/active-tasks.md](file:///C:/Stayflexi/docs/discovery/active-tasks.md) to inspect dependency conditions.
5.  **Confirm rules**: Reference the rulebook [docs/discovery/V5.2-Orchestrator.md](file:///C:/Stayflexi/docs/discovery/V5.2-Orchestrator.md).
6.  **Summarize & Prompt**: Output a short "Context Recovery Report" (Active Task, Git Status, Identified Risks) and request user confirmation before making any code modifications.

---

## Core Operational Constraints

- **Stateless Boot**: Never assume previous chat context or session history exists.
- **No Untracked Changes**: Any code modifications must update the [current-state.md](file:///C:/Stayflexi/docs/discovery/current-state.md) status before completion.
- **Synchronized State**: Neo4j, Graphiti, and GraphQL schema validation must compile without errors before code is pushed.
- **Mandatory Neo4j Update**: At the end of every task, Neo4j must be updated and synchronized before completion.
