# Consistency Validation Plan — Stayflexi Platform

This document describes the validation rules, scripts, and testing criteria to ensure absolute alignment across the codebase, Neo4j, Graphiti, and the GraphQL schema.

---

## 1. Five-Way Alignment Verification

```
      [Codebase Code / Schemas]
             ▲         ▲
             │         │
             ▼         ▼
    [Neo4j Graph] ◄─► [GraphQL Supergraph]
             ▲         ▲
             │         │
             ▼         ▼
     [Graphiti Memory Layer]
```

---

## 2. Validation Gates

### A. Neo4j == Codebase

- **Audit**: Verifies all physical tables and columns in compiled Prisma schemas have matching `DatabaseTable` and `DatabaseColumn` nodes in Neo4j.
- **Verification Command**:
  ```bash
  npm run verify:neo4j-vs-codebase
  ```
- **Trigger**: Pre-push git hooks.

### B. Graphiti == Neo4j

- **Audit**: Verifies that Graphiti's semantic memory relationships map accurately to Neo4j's physical structural relationships (e.g. validating that a `Feature` marked as deprecated in Neo4j updates Graphiti's active context memory blocks).
- **Verification Query (Cypher)**: Checks for mismatching feature status attributes.

### C. GraphQL == Codebase

- **Audit**: Verifies that local subgraph schemas match active express route controllers.
- **Verification Command**:
  ```bash
  npm run verify:graphql-vs-codebase
  ```
- **Action on Failure**: Aborts composition and rejects code merge.

### D. GraphQL == Neo4j

- **Audit**: Asserts that exposed query endpoints in GraphQL correspond to active `Endpoint` nodes mapped in Neo4j.
- **Verification Query**: Compares composed supergraph operations list with database endpoints count.

### E. GraphQL == Graphiti

- **Audit**: Asserts that memory categories queries (ADRs list, open risks) correspond to current Graphiti database memory states.
- **Verification Method**: Executes automated testing queries and validates schema integrity checks.
