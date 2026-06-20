# Change Detection Model — Stayflexi Platform

This document describes the change detection mechanisms and AST scanning routines to intercept new, modified, or removed components across codebase folders.

---

## 1. Change Ingestion Scanners

```
                   [Code Change committed]
                              │
             ┌────────────────┼────────────────┐
             ▼                ▼                ▼
     [Prisma schema diff]   [AST route scan]  [Doc Parser]
             │                │                │
             ▼                ▼                ▼
     - New/Removed Fields  - New/Removed     - New Feature / ADR
                           Endpoints
```

---

## 2. Detection Routines

### A. Detecting Database Fields Changes (Prisma Diff)

- **Method**: The schema extractor compares the previous commit's `schema.prisma` content with the current working directory files.
- **New Field**: If a field token exists in the current file but is absent in the target cache, it triggers:
  ```cypher
  CREATE (c:DatabaseColumn {name: $fieldName})-[r:BELONGS_TO]->(t:DatabaseTable {tableName: $tableName})
  ```
- **Removed Field**: If a field token is missing in the current file but exists in Neo4j, execute a Cypher delete of the column node and its associated relationship links.

### B. Detecting Endpoints Changes (Express Routes AST)

- **Method**: AST sweeps analyze microservices `routes.ts` file controllers.
- **New Endpoint**: Instantiates a new `Endpoint` node and maps it under `Service -[:EXPOSES]-> Endpoint`.
- **Removed Endpoint**: Flags the `Endpoint` node in the database as `Deleted` (pruning it from active routing maps) and triggers downstream impact alerts if it is still referenced by any active repository class.

### C. Detecting Features Changes (Docs & Registries)

- **Method**: Sweeper scripts parse [`FEATURE_REGISTRY.md`](file:///C:/Stayflexi/docs/discovery/FEATURE_REGISTRY.md) table variables.
- **New Feature**: Merges a new `Feature` node.
- **Deprecated Feature**: If a row's status changes to `Deprecated`, executes the Cypher transition script archiving the active node and updating version attributes.
