# Memory Validation Plan — Stayflexi Platform

This document describes the validation checks, testing schedules, and CLI commands to verify Graphiti memory completeness, freshness, and consistency.

---

## 1. Memory Verification Matrix

| Validation Type  | Target Check                                                                | Verification Command / Method                                    | Action on Failure                   |
| :--------------- | :-------------------------------------------------------------------------- | :--------------------------------------------------------------- | :---------------------------------- |
| **Completeness** | Ensure all `Requirement` nodes map to at least one `Feature`.               | Cypher: Check requirements with no link to feature.              | Flag build warning in CI.           |
| **Freshness**    | Detect stale nodes where file code hash does not match graph hash metadata. | Compare Git commit file hash with Graphiti `codeHash` parameter. | Queue file for AST re-scan.         |
| **Accuracy**     | Verify API controllers routes match active Graphiti `Endpoint` nodes.       | Exclude endpoint query route mismatch audit.                     | Override graph node attributes.     |
| **Consistency**  | Cross-validate local `active-tasks.md` with Neo4j `AuditEvent` tasks.       | Compare task checklist items with query outputs.                 | Synchronize local markdown context. |

---

## 2. Validation Cypher Queries

### A. Completeness: Orphaned Requirements Check

Identifies product specifications that have no matching functional implementations:

```cypher
MATCH (r:Requirement)
WHERE NOT (r)-[:DEFINES]->(:Feature)
RETURN r.id AS orphanedRequirementId, r.title AS requirementTitle;
```

---

### B. Accuracy: Validator Binding Check

Ensures all endpoint parameters map to a registered validator schema contract:

```cypher
MATCH (e:Endpoint)
WHERE NOT (e)-[:USES]->(:DTO)-[:VALIDATES_WITH]->(:Validator)
RETURN e.routeId AS endpointMissingValidation;
```

---

### C. Consistency: Decayed Nodes Check

Locates nodes representing deleted or refactored files that have not been pruned:

```cypher
MATCH (n)
WHERE n.isStale = true AND n.lastScannedAt < datetime() - duration({days: 7})
RETURN labels(n) AS staleLabels, n.name AS staleNodeName;
```
