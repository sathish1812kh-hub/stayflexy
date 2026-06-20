# GraphQL Synchronization Strategy — Stayflexi Platform

This document describes the synchronization workflow triggered when a developer modifies codebase files, schemas, or requirements.

---

## 1. Synchronization Flow Diagram

```
 [1. Codebase Modification] ──► (Git Commit Hook / Pre-push CI)
             │
             ▼
 [2. Neo4j Graph Update]    ──► (Cypher script executes AST diff merges)
             │
             ▼
 [3. Graphiti Memory Sync]  ──► (Neo4j listener triggers Graphiti webhook entity mapping)
             │
             ▼
 [4. GraphQL Schema Update] ──► (Rover CLI rebuilds Subgraphs & Supergraph gateway)
             │
             ▼
 [5. Consistency Check]     ──► (Auto-validation rules pass / Fail build gate)
```

---

## 2. Detailed Execution Steps

### Step 1: Code Change Detection

- A developer modifies a file (e.g. adding a column to a Prisma schema or changing an API route controller).
- A git pre-commit hook runs a file-change tokenizer (`npm run diff:detect`).

### Step 2: Neo4j Sync Ingestion

- The AST extractor runs on the modified files.
- It issues targeted Cypher `MERGE` queries to overwrite modified node attributes (e.g. updating table columns or endpoints) and updates the node's `LastScannedAt` and `codeHash` values in Neo4j.

### Step 3: Graphiti Memory Association

- A database transaction listener in Neo4j catches the modification event.
- It issues a webhook POST request to the Graphiti Memory API to update the semantic `Architecture Memory` structures.

### Step 4: GraphQL Supergraph Composition

- The microservice's Pothos compiler auto-generates the updated local subgraph schema (`subgraph.graphql`).
- Rover CLI executes composition:
  ```bash
  rover supergraph compose --config ./supergraph-config.yaml > ./supergraph.graphql
  ```
- The new schema is hot-reloaded into the running Apollo Router gateway instances.

### Step 5: Consistency Validation

- Automated verification scripts run consistency check validations (e.g. verifying GraphQL types match Neo4j node parameters).
- If validation passes, the build completes. If it fails, the transaction is rolled back and the build is aborted.
