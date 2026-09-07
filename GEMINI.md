# Project Rules & Ingestion Governance — Stayflexi Platform

This file defines the mandatory startup protocol and operational governance for the Stayflexi Platform under the V6.0 Ultimate Autonomous Software Intelligence Orchestrator.

---

## Mandatory Boot Protocol (Phase 0)

Before executing any developer task, code refactoring, or feature implementation, you must establish context using the following steps:

1. **Read State**: Open and read [docs/discovery/current-state.md](file:///C:/Stayflexi/docs/discovery/current-state.md) to locate the active task and focus modules.
2. **Verify Git Status**: Run `git status --porcelain` to check for unrecorded drift or dirty working trees.
3. **Verify Services**: Verify that all required databases and services (PostgreSQL on port 5432, Native Neo4j on port 7687, Redis, Kafka) are active. Confirm that Neo4j is active. If any services/databases (especially Neo4j) are not active, make them active (e.g., run `powershell -ExecutionPolicy Bypass -File scripts/start-neo4j.ps1` or start PostgreSQL).
4. **Read Active Tasks**: Open and read [docs/discovery/active-tasks.md](file:///C:/Stayflexi/docs/discovery/active-tasks.md) to inspect dependency conditions.
5. **Confirm Rules & Progressive Index**: Reference the authoritative rulebook [docs/discovery/V6.0-Ultimate-Orchestrator.md](file:///C:/Stayflexi/docs/discovery/V6.0-Ultimate-Orchestrator.md).
6. **Summarize & Prompt**: Output a short "Context Recovery Report" (Active Task, Git Status, Identified Risks) and request user confirmation before making any code modifications.
7. **Codegraph Exploration First**: Before modifying or refactoring any code symbols, use `codegraph_explore` to inspect callers, dynamic dispatch paths, and covering unit tests.

---

## Source Authority Hierarchy

When resolving conflicting specifications or ambiguous instructions, always strictly adhere to this non-negotiable authority ladder:

$$\text{Security & System Invariants} > \text{PRD / Business Requirements} > \text{Accepted ADRs} > \text{Contracts / Schemas} > \text{Tests} > \text{Implementation Reality} > \text{Assumptions}$$

---

## Core Operational Constraints

- **Stateless Boot**: Never assume previous chat context or session history exists across prompts.
- **Pre-Edit Blast-Radius Verification**: Never modify shared interfaces, entities, or utilities without verifying the caller blast radius in Codegraph first.
- **No Untracked Changes**: Any code modifications must update the [current-state.md](file:///C:/Stayflexi/docs/discovery/current-state.md) status before completion.
- **Synchronized State**: Neo4j, Codegraph, Graphiti, and GraphQL schema validation must compile without errors before code is pushed.
- **Mandatory 1000-Point Quality Scorecard**: Every milestone completion must achieve 1000/1000 on `certification-scorecard.ps1`.
- **Mandatory Neo4j Update**: At the end of every task, Neo4j must be updated and synchronized before completion.
