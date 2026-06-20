# Graph Construction Plan — Stayflexi Platform

This document outlines the step-by-step ETL order, creation scripts, relationship routing paths, and database validation queries to build the initial Stayflexi Neo4j Unified Intelligence Graph.

---

## 1. Graph Construction Workflow

The construction follows a strict topological ordering:

```
[Extract Configs & Code Docs] ──► [Create Static Nodes (Service, Req)]
             │
             ▼
[Create Code & Data Nodes]    ──► [Map Internal Relations (Exposes, Reads)]
             │
             ▼
[Load Dynamic Nodes]          ──► [Create Telemetry Relations (Logged_By)]
             │
             ▼
[Run Constraint Validations]  ──► [Certified Software Graph]
```

---

## 2. Step-by-Step Construction Guide

### Step A: Extraction & Ingestion Order

1.  **System Blueprint (Level 1)**: Parse package configurations and ports map to catalog microservice identities.
2.  **Product Requirements (Level 2)**: Scrape markdown files under `docs/` to register feature scopes, capabilities, and ADR logs.
3.  **Relational Database (Level 3)**: Scan Prisma schemas to create table columns and isolation parameters.
4.  **Source AST & APIs (Level 4)**: Parse Express routes controllers and repositories code.
5.  **Verifications & Deployments (Level 5)**: Read Playwright test blocks and Kubernetes deployment manifests.
6.  **Active Telemetry (Level 6)**: Read metrics lists and Pino error traces.

---

### Step B: Node Creation Order (Cypher Insertions)

Nodes must be written sequentially to avoid foreign constraint failures during ETL ingestion:

1.  `Package` (Dependencies must be indexed first).
2.  `Service` (Microservices acting as anchors).
3.  `Environment` (Target environments, e.g. dev, prod).
4.  `Requirement` -> `RequirementVersion` (Specs anchors).
5.  `BusinessCapability` -> `BusinessRule` (Logical rules).
6.  `Feature` -> `FeatureVersion` (User-facing feature nodes).
7.  `Decision` (ADRs).
8.  `ExternalSystem` (Gateways and channels).
9.  `DatabaseTable` -> `DatabaseColumn` (Relational schemas).
10. `Endpoint` -> `APIContract` (API routes).
11. `DTO` -> `Validator` (Request body interfaces).
12. `Repository` (Code query blocks).
13. `Page` -> `UIComponent` (Frontend routes).
14. `UserJourney` -> `PlaywrightTest` (Test coverages).
15. `RuntimeMetric` -> `ErrorEvent` -> `AuditEvent` (Runtime nodes).

---

### Step C: Relationship Creation Order

Edges are connected in topological order to build structural layers:

1.  **Packages Maps**: `Package -[:DEPENDS_ON]-> Package` and `Service -[:DEPENDS_ON]-> Package`.
2.  **Specifications Trace**: `Requirement -[:DEFINES]-> Feature` and `Decision -[:AFFECTS]-> Feature`.
3.  **Implementations Bind**: `Service -[:IMPLEMENTS]-> Feature` and `Service -[:EXPOSES]-> Endpoint`.
4.  **API Schema Validation**: `Endpoint -[:DEFINES_CONTRACT]-> APIContract` and `Endpoint -[:USES]-> DTO`.
5.  **Payload Cleaning**: `DTO -[:VALIDATES_WITH]-> Validator`.
6.  **Code Data Access**: `Repository -[:READS]-> DatabaseTable` and `Repository -[:WRITES]-> DatabaseTable`.
7.  **Database Keys Map**: `DatabaseColumn -[:BELONGS_TO]-> DatabaseTable` and `DatabaseTable -[:DEPENDS_ON]-> DatabaseTable` (FK references).
8.  **Frontend Assembly**: `Page -[:USES]-> UIComponent`.
9.  **Verification Coverage**: `Feature -[:TESTED_BY]-> PlaywrightTest`.
10. **Telemetry Scrape**: `Service -[:OBSERVED_BY]-> RuntimeMetric` and `ErrorEvent -[:LOGGED_BY]-> Service`.

---

### Step D: Validation Order & Cypher Integrity Checks

Before certifying the graph, automated queries run validation checks:

- **Constraint 1: Uniqueness Checks**: Ensure no duplicate IDs exist for node entities.
  ```cypher
  CREATE CONSTRAINT FOR (s:Service) REQUIRE s.name IS UNIQUE;
  CREATE CONSTRAINT FOR (e:Endpoint) REQUIRE e.route IS UNIQUE;
  ```
- **Constraint 2: Orphan Detection**: Flags nodes that have no relationships.
  ```cypher
  MATCH (n) WHERE NOT (n)-[]-() RETURN n;
  ```
- **Constraint 3: API Service Binding Check**: Ensures every API Endpoint node is exposed by exactly one Service.
  ```cypher
  MATCH (e:Endpoint) WHERE NOT (e)<-[:EXPOSES]-(:Service) RETURN e;
  ```
- **Constraint 4: Bounded Context Isolation Check**: Identifies cross-service data queries bypassing repository boundaries.
  ```cypher
  MATCH (s:Service)-[:EXPOSES]->(e:Endpoint)-[:USES]->(d:DTO)<-[:READS]-(r:Repository)-[:READS]->(t:DatabaseTable)
  WHERE NOT t.schemaOwner = s.name
  RETURN s.name, t.tableName;
  ```
