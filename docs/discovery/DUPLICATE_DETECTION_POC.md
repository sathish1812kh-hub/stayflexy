# Duplicate Detection Proof of Concept — Stayflexi Platform

This document describes the validation proof-of-concept for intercepting duplicate feature creation requests during graph ETL compilation.

---

## 1. Scenario: Double Ingestion of Guest Management Feature

- **Baseline Graph State**: A `Feature` node already exists with parameters:
  - `featureId`: "FEAT-GUEST-01"
  - `name`: "Guest Profiling"
- **Duplicate Event**: An automated AST documentation scan attempts to merge a newly discovered feature derived from a new requirements specification sheet:
  - `featureId`: "FEAT-GUEST-NEW"
  - `name`: "Guest Profiling" (exact name match)

---

## 2. Ingestion Guard Strategy (Cypher + Node.js)

To prevent duplicate nodes, the ingestion client executes a dry-run check query before running Cypher merges:

### Cypher Match Check

```cypher
// Check if a feature node with the same name already exists under a different ID
MATCH (f:Feature)
WHERE f.name = $newName AND f.featureId <> $newFeatureId
RETURN f.featureId AS existingFeatureId, f.name AS existingFeatureName;
```

---

## 3. Duplicate Resolution Pipeline

When the ETL orchestrator executes, it evaluates duplicate markers:

```
[ETL Request: Merge Feature]
             │
             ▼
   [Uniqueness ID Check] ──────────(ID Match)───────────► [EXACT_MATCH: Reject / Overwrite]
             │ (ID Mismatch)
             ▼
  [Fuzzy/Name Identity Check] ─────(Name Match)─────────► [CONFLICT_ALERT: Flag for review]
             │ (No match)
             ▼
      [Create New Node]
```

### Action Output Types

- **`EXACT_MATCH` (ID Matches)**: The orchestrator merges attributes and updates the `updatedAt` date. No duplicate is created.
- **`CONFLICT_ALERT` (ID Mismatches, Name Matches)**: The orchestrator halts auto-insertion, writes a warning to `scripts/extractor/warnings.json`, and outputs:
  ```json
  {
    "status": "CONFLICT_ALERT",
    "incomingId": "FEAT-GUEST-NEW",
    "existingId": "FEAT-GUEST-01",
    "propertyName": "name",
    "value": "Guest Profiling",
    "resolution": "Review required: duplicate feature names detected."
  }
  ```
