# Resolver Strategy — Stayflexi Platform

This document describes the design architecture and execution patterns of the GraphQL resolvers querying Neo4j.

---

## 1. Resolver Ingestion Design

```
   [GraphQL Query Client]
             │
             ▼
   [DataLoader Scraper Cache] (Deduplicates node request IDs)
             │
             ▼
   [Cypher Translation Engine] (Compiles GraphQL query parameters into APOC Cypher statements)
             │
             ▼
   [Bolt Driver execution] ──► [Neo4j/Graphiti Graph DB]
```

---

## 2. Resolver Configurations

### A. Requirements Resolver

- **Query**: `requirement(id: ID!)` / `requirements`
- **Database Query execution**:
  ```cypher
  MATCH (r:Requirement {id: $id})
  OPTIONAL MATCH (r)-[:DEFINES]->(f:Feature)
  RETURN r, collect(f.featureId) AS featuresScope;
  ```
- **DataLoader Integration**: Batch loads linked feature arrays using a key mapping cache.

### B. Impact Analysis Resolver

- **Query**: `impactAnalysis(tableName: String!)`
- **Database Query execution**: Maps the downward impact propagation path (Table -> Repo -> Service -> Endpoint -> Feature -> Page -> Test):
  ```cypher
  MATCH (t:DatabaseTable {tableName: $tableName})
  MATCH path = (t)<-[:READS|:WRITES]-(r:Repository)<-[:USES]-(svc:Service)-[:EXPOSES]->(e:Endpoint)<-[:USES]-(f:Feature)-[:RENDERS_IN]->(p:Page)<-[:USES]-(test:PlaywrightTest)
  RETURN path;
  ```

### C. Decisions Resolver (ADRs)

- **Query**: `decision(id: ID!)` / `decisions`
- **Database Query execution**:
  ```cypher
  MATCH (d:Decision {decisionId: $id})
  OPTIONAL MATCH (d)-[:AFFECTS]->(f:Feature)
  RETURN d, collect(f.featureId) AS affectedFeatures;
  ```

---

## 3. DataLoader Performance Optimization

To prevent `N+1` connection spikes (e.g. querying the child columns for 50 distinct database table nodes), all relational sub-entities use DataLoaders:

```typescript
import DataLoader from 'dataloader'

export const createTableLoader = (db: Neo4jSession) =>
  new DataLoader<string, DatabaseColumn[]>(async (tableNames) => {
    // Queries all columns for the batched tables in a single Cypher execution
    const records = await db.run(
      `MATCH (t:DatabaseTable) WHERE t.tableName IN $tableNames
       MATCH (c:DatabaseColumn)-[:BELONGS_TO]->(t)
       RETURN t.tableName AS table, collect(c) AS columns`,
      { tableNames },
    )

    // Map database output keys back to the request array order
    const tableMap = new Map(records.map((r) => [r.table, r.columns]))
    return tableNames.map((name) => tableMap.get(name) || [])
  })
```
