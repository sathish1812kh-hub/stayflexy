# Relationship Generation Plan — Stayflexi Platform

This document describes the Cypher insertion scripts and mapping parameters to dynamically link nodes in the Neo4j Knowledge Graph.

---

## 1. Edge Ingestion Cypher Scripts

### A. Linking Endpoint to Service (`Service -[:EXPOSES]-> Endpoint`)

This link is established during AST route scans inside microservices:

```cypher
MATCH (s:Service {name: $serviceName})
MERGE (e:Endpoint {routeId: $routeId})
SET e.method = $method,
    e.route = $route,
    e.extractedAt = datetime()
MERGE (s)-[r:EXPOSES]->(e)
SET r.extractedAt = datetime()
RETURN s.name, e.routeId;
```

---

### B. Linking Service to Repository (`Service -[:USES]-> Repository`)

AST parsers scan class initializations inside the service controllers:

```cypher
MATCH (s:Service {name: $serviceName})
MERGE (repo:Repository {className: $className})
SET repo.dataSource = "PostgreSQL",
    repo.extractedAt = datetime()
MERGE (s)-[r:USES]->(repo)
SET r.extractedAt = datetime()
RETURN s.name, repo.className;
```

---

### C. Linking Repository to Database Table (`Repository -[:READS/WRITES]-> DatabaseTable`)

AST scripts scan Prisma client query statements (e.g. `db.booking.findMany` / `db.booking.create`):

```cypher
MATCH (repo:Repository {className: $className})
MATCH (t:DatabaseTable {tableName: $tableName})
MERGE (repo)-[r:READS]->(t)
SET r.extractedAt = datetime()
RETURN repo.className, t.tableName;
```

---

### D. Linking Feature to Endpoint (`Feature -[:USES]-> Endpoint`)

Scrapes markdown PRDs and routing maps to link routes to core product capabilities:

```cypher
MATCH (f:Feature {featureId: $featureId})
MATCH (e:Endpoint {routeId: $routeId})
MERGE (f)-[r:USES]->(e)
SET r.extractedAt = datetime()
RETURN f.featureId, e.routeId;
```

---

### E. Linking Feature to UI Pages (`Feature -[:RENDERS_IN]-> Page`)

Links user-facing pages back to product specifications:

```cypher
MATCH (f:Feature {featureId: $featureId})
MATCH (p:Page {route: $pageRoute})
MERGE (f)-[r:RENDERS_IN]->(p)
SET r.extractedAt = datetime()
RETURN f.featureId, p.route;
```

---

### F. Linking Feature to External Integrations (`Feature -[:DEPENDS_ON]-> ExternalSystem`)

Tracks third-party dependencies for billing and notifications:

```cypher
MATCH (f:Feature {featureId: $featureId})
MATCH (ext:ExternalSystem {name: $extSystemName})
MERGE (f)-[r:DEPENDS_ON]->(ext)
SET r.extractedAt = datetime()
RETURN f.featureId, ext.name;
```
