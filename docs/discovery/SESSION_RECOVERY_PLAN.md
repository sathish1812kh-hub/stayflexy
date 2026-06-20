# Session Recovery Plan — Stayflexi Platform

This document describes the automated boot-up sequence that recovers the operational context when a developer launches a new pair programming session.

---

## 1. Session Initialization Sequence

To prevent context loss after a system shutdown, the newly spawned AI agent executes a 5-step recovery sequence:

```
  [Developer launches new session]
                 │
                 ▼
 1. [Read Local Memory Pack Files] ──► (Loads context, active tasks, decision log)
                 │
                 ▼
 2. [Query Neo4j Database State]  ──► (Verifies active services and schema status)
                 │
                 ▼
 3. [Verify Graphiti Memory API]  ──► (Restores semantic relationship weights)
                 │
                 ▼
 4. [Check Git Commit Logs]       ──► (Identifies code diffs since last session)
                 │
                 ▼
 5. [Assemble Prompt Context]     ──► (Compiles system prompt with verified project awareness)
```

---

## 2. Boot-up Script Execution Steps

A developer triggers session restoration by executing the bootstrap CLI command or typing a restore shortcut:

```bash
npm run session:restore
```

This script executes the following restoration tasks:

### Task 1: Document Scrapes

- Reads the local `.agents/memory/` files:
  - [`project-context.md`](file:///C:/Stayflexi/docs/discovery/project-context.md) (restores port listings and logical boundaries).
  - [`active-tasks.md`](file:///C:/Stayflexi/docs/discovery/active-tasks.md) (loads the pending task queue).
  - [`decision-log.md`](file:///C:/Stayflexi/docs/discovery/decision-log.md) (loads approved ADR scopes).

### Task 2: Graph Database Verification

- Tests Bolt database connection to `bolt://localhost:7687`.
- Executes Cypher count sanity check:
  ```cypher
  MATCH (s:Service), (e:Endpoint), (t:DatabaseTable)
  RETURN count(s) AS servicesCount, count(e) AS endpointsCount, count(t) AS tablesCount;
  ```

### Task 3: Git Workspace Checks

- Queries modified files:
  ```bash
  git status --porcelain
  git log -1 --pretty=format:"%H - %an, %ar : %s"
  ```
- Identifies modifications that occurred since the session log's last updated timestamp.

### Task 4: Building the AI Context Payload

- Concatenates the gathered parameters into a single structured system context payload, which is loaded as the developer's chat header. This ensures the AI model immediately registers active features, open risks, and recent decisions without token-heavy codebase re-scans.
