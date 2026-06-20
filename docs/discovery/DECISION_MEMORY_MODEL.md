# Decision Memory Model — Stayflexi Platform

This document describes the schema properties, relationships, and Cypher parameters to record and trace Architecture Decision Records (ADRs) inside the Graphiti Memory Layer.

---

## 1. Decision Node Properties

A `Decision` represents an ADR, structured as follows:

- `decisionId: String` (Unique ID, e.g. "ADR-FED-01")
- `title: String` (Summary statement of the choice)
- `reason: String` (Motivation / problem anchor)
- `alternatives: String[]` (Options evaluated, e.g. BFF vs Standalone Router vs Node proxy)
- `approver: String` (Lead Architect / Team ID)
- `evidence: String` (Links to benchmarks, test runs, or certification summaries)
- `timestamp: DateTime` (Date approved)
- `status: String` (Approved, Proposed, Rejected)

---

## 2. Ingestion Cypher Script

When a decision is created or updated:

```cypher
MERGE (d:Decision {decisionId: $decisionId})
SET d.title = $title,
    d.reason = $reason,
    d.alternatives = $alternatives,
    d.approver = $approver,
    d.evidence = $evidence,
    d.timestamp = datetime($timestamp),
    d.status = $status,
    d.extractedAt = datetime()
RETURN d.decisionId;
```

---

## 3. Decision Relationship Mapping

Decisions are linked to features, packages, and services to trace the architectural footprint:

```cypher
MATCH (d:Decision {decisionId: $decisionId})
MATCH (f:Feature {featureId: $featureId})
// Connect decision to feature
MERGE (d)-[r:AFFECTS]->(f)
SET r.extractedAt = datetime()
RETURN d.decisionId, f.featureId;
```

---

## 4. Querying Decision Traces

To trace the rationale behind a specific feature implementation (e.g. why GraphQL was chosen for the billing/reconciliation components), the AI runs:

```cypher
MATCH (d:Decision)-[:AFFECTS]->(f:Feature {featureId: "FEAT-RECON-01"})
RETURN d.decisionId, d.title AS adrTitle, d.reason AS motivation, d.status AS decisionStatus;
```
