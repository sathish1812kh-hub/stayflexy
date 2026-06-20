# Graph Governance — Stayflexi Platform

This document defines the rules for graph quality control, duplicate detection, node/relationship validation, confidence/freshness scoring, and automatic graph repair procedures.

---

## 1. Governance Rules Matrix

```
   [ETL Extraction] ──► [Duplicate Check (Fuzzy/Exact Keys)]
                                     │
                                     ▼
   [Validation Gate] ◄── [Score (Confidence & Freshness)]
         │
         ├─── (Passed)  ──► [Commit to Neo4j]
         │
         └─── (Failed)  ──► [Trigger Graph Repair Rules]
```

---

## 2. Duplicate Detection Strategy

Duplicate nodes disrupt graph query accuracy. Stayflexi enforces two matching tiers:

1.  **Exact Match (Uniqueness Constraints)**:
    - _Endpoints_: Method + Route string match.
    - _Services_: Monorepo package name string match.
    - _DatabaseTables_: Table name match.
    - _PlaywrightTests_: File path location string match.
2.  **Fuzzy Match (Natural Language Rules)**:
    - _Features & Capabilities_: If a new `Feature` is parsed from docs with a name sharing a Cosine Similarity score >= `0.85` with an existing node, prevent auto-creation. Place the node in a `Pending Review` queue for human confirmation.

---

## 3. Validation Enforcements

### Node Attribute Validations

Every node written to Neo4j must satisfy the following schema check:

- Must contain `extractedAt` timestamp.
- Must carry `extractionSource` (the file path or pipeline parser name).
- Must carry `confidenceScore` (0.0 to 1.0) and `freshnessScore` (0.0 to 1.0).
- String values must be trimmed and non-empty.

### Relationship Layout Validations

Relationships must adhere to valid source-target maps. Invalid relationships are blocked at ingest:

- _Blocked_: `DatabaseTable -[:CALLS]-> DatabaseTable` (Direct calls are prohibited; relations must be FK references represented as `DEPENDS_ON`).
- _Blocked_: `Page -[:READS]-> DatabaseTable` (Pages cannot query tables directly; they must traverse through `Endpoint` and `Repository` nodes).

---

## 4. Scoring Framework

### Confidence Scoring

Calculates a coefficient `[0.0 - 1.0]` based on source reliability:

- **Score 1.0 (Deterministic)**: Extracted directly from typescript compilers, `package.json`, or Prisma engine schemas.
- **Score 0.8 (Semi-Deterministic)**: Extracted from explicit markdown PRDs, ADR files, and test annotation tags.
- **Score 0.5 (Heuristic)**: Derived from natural language parsing of code comments or regex similarity searches.

### Freshness Scoring

Tracks node alignment with active Git branches:

- Compare the node's `extractedAt` date against the source file's `LastModified` commit date in Git.
- If `extractedAt` < `LastModified`, set `isStale = true` and reduce `freshnessScore` to `0.0` until the AST re-scrapes the target file.

---

## 5. Automated Graph Repair Rules

When validation checks fail, the Graph Orchestrator triggers repair sequences:

1.  **Orphan Cleanup**:
    - If a source code file is deleted in Git, execute a cascading delete in Neo4j to remove the corresponding `UIComponent`/`Repository`/`Endpoint` node and its incoming/outgoing edges.
2.  **Contract Mismatch Repair**:
    - If an `Endpoint` payload schema changes, delete the old `APIContract` node and link the endpoint to the newly parsed validator contract.
3.  **Cross-Tenant Leak Correction**:
    - If a repository query is modified and is parsed as missing an `organizationId` scope, flag the corresponding `Repository` and `Feature` nodes with a `SecurityRisk` property to alert auditors.
