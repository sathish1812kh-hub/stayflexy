# Feature Evolution Model — Stayflexi Platform

This document describes how the Graphiti Memory Layer tracks the lifecycle of system features from creation and modifications to deprecation, maintaining a historic audit trail.

---

## 1. Feature Lifecycle States

A Feature node transitions through defined lifecycle states over time:

```
  [Requirement Created] ──► [Feature State: Draft]
                                  │
                                  ▼
[E2E Playwright Pass]   ──► [Feature State: Active]
                                  │
                                  ├── (Code Updates) ──► Create :FeatureVersion
                                  │
                                  ▼
[Code Refactor/Pruned]  ──► [Feature State: Deprecated]
```

---

## 2. Tracking Evolution in the Graph

### A. Feature Creation (`MERGE` Cypher)

When a feature is initialized from requirement markdown pages:

```cypher
MERGE (f:Feature {featureId: $featureId})
ON CREATE SET f.name = $name,
              f.status = "Active",
              f.createdAt = datetime(),
              f.version = "1.0.0"
RETURN f.featureId;
```

---

### B. Feature Versioning (`:FeatureVersion` Nodes)

To prevent overwriting historical code parameters, feature modifications create version nodes linked to the parent:

```cypher
MATCH (f:Feature {featureId: $featureId})
// 1. Snapshot current parameters as a version node
CREATE (fv:FeatureVersion {
  versionId: $featureId + ":" + f.version,
  version: f.version,
  archivedAt: datetime(),
  codeHashSnapshot: $oldHash
})
// 2. Link version snapshot to parent
CREATE (f)-[:HAD_VERSION]->(fv)
// 3. Update main feature parameters
SET f.version = $newVersion,
    f.updatedAt = datetime()
RETURN f.featureId, f.version;
```

---

### C. Feature Deprecation

When a feature is replaced or pruned, its status is changed to `Deprecated` rather than deleting the node:

```cypher
MATCH (f:Feature {featureId: $featureId})
SET f.status = "Deprecated",
    f.deprecatedAt = datetime(),
    f.deprecationReason = $reason
RETURN f.featureId, f.status;
```

---

## 3. Querying Feature History

To retrieve the complete evolutionary history of a feature, developers or AI agents run this Cypher query:

```cypher
MATCH (f:Feature {featureId: "FEAT-BILLING-01"})-[:HAD_VERSION]->(fv:FeatureVersion)
RETURN f.name AS featureName, fv.version AS pastVersion, fv.archivedAt AS dateArchived
ORDER BY fv.archivedAt DESC;
```
