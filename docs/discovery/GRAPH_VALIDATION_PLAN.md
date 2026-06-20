# Graph Validation Plan — Stayflexi Platform

This document describes the automated validation scripts and Cypher queries to verify graph consistency, detect orphans, isolate circular references, and flag structural errors.

---

## 1. Automated Validation Queries (Cypher)

### A. Detecting Orphan Nodes (Isolated files or components)

Finds nodes that have no incoming or outgoing relationships of any type:

```cypher
MATCH (n)
WHERE NOT (n)-[]-()
RETURN labels(n) AS nodeLabel, keys(n) AS nodeProperties, id(n) AS neo4jId
LIMIT 50;
```

---

### B. Detecting Missing Service-to-Endpoint Bindings

Identifies API Endpoints that are not exposed by any backend Service node:

```cypher
MATCH (e:Endpoint)
WHERE NOT (e)<-[:EXPOSES]-(:Service)
RETURN e.routeId AS missingEndpointBinding;
```

---

### C. Detecting Broken References (API-to-Database anomalies)

Locates endpoints that map to repositories that do not target any existing DatabaseTable node:

```cypher
MATCH (e:Endpoint)-[:USES]->(repo:Repository)
WHERE NOT (repo)-[:READS|:WRITES]->(:DatabaseTable)
RETURN e.routeId, repo.className AS brokenReferenceRepo;
```

---

### D. Detecting Circular Dependencies in Services

Identifies circular synchronization or communication loops between Express microservices:

```cypher
MATCH path = (s1:Service)-[:CALLS*2..5]->(s1)
RETURN [n IN nodes(path) | n.name] AS circularServicePath, length(path) AS loopSize;
```

---

### E. Detecting Duplicate Feature Mapping

Isolates features that share identical properties:

```cypher
MATCH (f1:Feature), (f2:Feature)
WHERE f1.featureId < f2.featureId AND f1.name = f2.name
RETURN f1.featureId, f2.featureId, f1.name AS duplicateName;
```

---

## 2. Validation Execution Strategy

- **Execution Trigger**: Validations run as a pre-deploy phase in the CI/CD pipeline and at the completion of any AST re-extraction task.
- **Action on Failure**: If circular dependencies or broken references are found, the build is flagged as `Failed`, blocking code merges until the graph issues are resolved.
