# Memory Integration Plan — Stayflexi Platform

This document describes the synchronization mappings, script execution triggers, and validation routines to link local Project Memory Pack markdown files to the Neo4j database.

---

## 1. Synchronization Topology

```
 [Local Markdown Memory Files] (Source of Truth for LLM Sessions)
           │
           ├── (doc-extractor parses md frontmatter/lists) ──► [Neo4j Nodes]
           │
           └── (neo4j-exporter exports node properties)   ◄── [Neo4j Graph]
```

---

## 2. Document-to-Graph Mappings

| Memory Pack File             | Extraction Source (Markdown)                   | Neo4j Target Node        | Target Relationship                      |
| :--------------------------- | :--------------------------------------------- | :----------------------- | :--------------------------------------- |
| **`decision-log.md`**        | Frontmatter YAML tags + markdown descriptions. | `Decision`               | `Decision -[:AFFECTS]-> Feature`         |
| **`feature-registry.md`**    | Features table rows.                           | `Feature`                | `Feature -[:TESTED_BY]-> PlaywrightTest` |
| **`dependency-registry.md`** | package-lock tables list.                      | `Package`                | `Package -[:DEPENDS_ON]-> Package`       |
| **`release-history.md`**     | Deployments / Tags lists.                      | `Release` / `Deployment` | `Service -[:DEPLOYED_IN]-> Deployment`   |

---

## 3. Synchronization Triggers & Directions

1.  **Read Synchronization (Markdown -> Neo4j)**:
    - _Trigger_: Git commit hooks and build pipelines.
    - _Script_: `npm run graph:sync:read` parses markdown files, extracts attributes, and runs Cypher `MERGE` queries to ensure Neo4j nodes match the document state.
2.  **Write Synchronization (Neo4j -> Markdown)**:
    - _Trigger_: Post-deployment release triggers, Playwright test completions, and manual pricing override events.
    - _Script_: `npm run graph:sync:write` queries Neo4j for the latest active test outcomes, error events count, and release tags, and updates the local markdown files.

---

## 4. Anti-Drift Verification Queries

An automated CI lint task executes a comparison check to confirm that no out-of-sync nodes exist:

```bash
# Checks if the number of features in feature-registry.md matches the Feature nodes count in Neo4j
npm run graph:verify:drift
```
