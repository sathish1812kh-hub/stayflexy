# Completion Gate Rules — Stayflexi Platform

This document describes the validation rules that block code changes from being merged or marked as complete until database schemas, memory nodes, and GraphQL routers are synchronized.

---

## 1. Completion Gate Workflow

Every code change task must pass the validation workflow before completion:

```
 [Developer submits code patch]
               │
               ▼
 1. [Neo4j Database Sync] ──(Passed)──► 2. [Graphiti Memory Sync] ──(Passed)──► 3. [GraphQL Gateway Sync]
                                                                                     │
                                                                                  (Passed)
                                                                                     ▼
                                                                             4. [Verify All Rules]
                                                                                     │
                                                                                  (Passed)
                                                                                     ▼
                                                                             [Task Completed]
```

---

## 2. Gate Verification Requirements

### Rule 1: Neo4j Schema Check

- The codebase AST change must write matching `DatabaseTable`/`DatabaseColumn` updates in Neo4j.
- **Verification Cypher Query**: Confirm node parameters align with Prisma models.

### Rule 2: Graphiti Memory Check

- Active memory subdomains in Graphiti must reflect the code changes.
- **Verification Method**: Confirm features status variables match between Neo4j and Graphiti.

### Rule 3: GraphQL Gateway Check

- The Apollo Router gateway must reload the updated federated supergraph schema.
- **Verification Command**:
  ```bash
  rover supergraph compose --config ./supergraph-config.yaml
  ```

### Rule 4: Verification Check

- Verify that five-way consistency validation checks pass:
  ```bash
  npm run verify:consistency
  ```
- **Action on Failure**: If any check fails, the commit is rolled back and the build is aborted.
