# Graph Schema Plan — Stayflexi Platform

This document defines the schema constraints, indexes, and uniqueness rules in Cypher to initialize the Neo4j Knowledge Graph.

---

## 1. Uniqueness Constraints (Cypher)

To prevent duplication and guarantee deterministic relationships, unique constraints are applied:

```cypher
// 1. Service Uniqueness
CREATE CONSTRAINT FOR (s:Service) REQUIRE s.name IS UNIQUE;

// 2. Feature Uniqueness
CREATE CONSTRAINT FOR (f:Feature) REQUIRE f.featureId IS UNIQUE;

// 3. Endpoint Uniqueness (Composite Key matching method and route)
CREATE CONSTRAINT FOR (e:Endpoint) REQUIRE e.routeId IS UNIQUE; // e.routeId = "METHOD:ROUTE" (e.g. "POST:/api/v1/bookings")

// 4. Database Table Uniqueness
CREATE CONSTRAINT FOR (t:DatabaseTable) REQUIRE t.tableName IS UNIQUE;

// 5. Package Uniqueness
CREATE CONSTRAINT FOR (p:Package) REQUIRE p.name IS UNIQUE;

// 6. Playwright Test File Uniqueness
CREATE CONSTRAINT FOR (pt:PlaywrightTest) REQUIRE pt.filePath IS UNIQUE;

// 7. Product Requirement Uniqueness
CREATE CONSTRAINT FOR (r:Requirement) REQUIRE r.id IS UNIQUE;

// 8. Decision (ADR) Uniqueness
CREATE CONSTRAINT FOR (d:Decision) REQUIRE d.decisionId IS UNIQUE;
```

---

## 2. Index Design

Indexes optimize query traversal speed for change impact analysis:

```cypher
// 1. Column Search Indexes
CREATE INDEX FOR (c:DatabaseColumn) ON (c.name);

// 2. Feature Status Index
CREATE INDEX FOR (f:Feature) ON (f.status);

// 3. API Contract Index
CREATE INDEX FOR (ac:APIContract) ON (ac.id);

// 4. Traceability Tag Index
CREATE INDEX FOR (pt:PlaywrightTest) ON (pt.suite);
```

---

## 3. Relationship Integrity Guard Rules

- **Rule 1: Directional Typing**: Edges must point in a single logical direction (e.g. `Service -[:EXPOSES]-> Endpoint`).
- **Rule 2: Foreign Key Constraints**: Relational links between database tables must be represented as `DatabaseTable -[:DEPENDS_ON]-> DatabaseTable`, preventing columns from connecting directly to columns across tables without table anchors.

---

## 4. Schema Verification Script

Run the following query after script initialization to verify constraints and indexes are loaded:

```cypher
SHOW CONSTRAINTS;
SHOW INDEXES;
```
