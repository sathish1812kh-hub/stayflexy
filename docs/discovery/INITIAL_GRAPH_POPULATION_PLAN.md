# Initial Graph Population Plan — Stayflexi Platform

This document describes the strategy, input data sets, and Cypher parameters to initialize the base architecture, capability, and database nodes in Neo4j.

---

## 1. Baseline Seed Data Strategy

Before executing AST parsers on source code files, the extraction pipeline runs a bootstrap script (`scripts/extractor/seed.ts`) to inject the static nodes identified during the Phase 1 Discovery:

```
[seed.ts Bootstrap Script]
           │
           ├──► Ingest Bounded Domains ──► Create :BusinessCapability
           ├──► Ingest Monorepo Config ──► Create :Service & :Package
           └──► Ingest System ADRs     ──► Create :Decision & :Feature
```

---

## 2. Bootstrapping Cypher Statements

### A. Populating Business Capabilities

The capabilities identified in the domain registry are seeded as high-level capability nodes:

```cypher
UNWIND [
  {name: "Dynamic Yield Pricing", domain: "Revenue", impact: "High"},
  {name: "Multi-tenant Access Isolation", domain: "Security", impact: "Critical"},
  {name: "OTAs Distribution Sync", domain: "Distribution", impact: "High"},
  {name: "Booking Saga Concurrency Orchestration", domain: "Reservations", impact: "Critical"}
] AS cap
MERGE (c:BusinessCapability {name: cap.name})
SET c.domain = cap.domain,
    c.impactMetric = cap.impact,
    c.extractedAt = datetime()
RETURN c.name;
```

---

### B. Populating Monorepo Services

Populates the microservice port structures:

```cypher
UNWIND [
  {name: "auth-service", port: 3001, framework: "Express"},
  {name: "hotel-service", port: 3003, framework: "Express"},
  {name: "inventory-service", port: 3004, framework: "Express"},
  {name: "booking-service", port: 3005, framework: "Express"},
  {name: "payment-service", port: 3006, framework: "Express"},
  {name: "ota-service", port: 3007, framework: "Express"},
  {name: "revenue-management-service", port: 3008, framework: "Express"}
] AS svc
MERGE (s:Service {name: svc.name})
SET s.port = svc.port,
    s.framework = svc.framework,
    s.language = "TypeScript",
    s.extractedAt = datetime()
RETURN s.name;
```

---

### C. Populating Database Tables

Pre-seeds the table nodes representing data schema boundaries:

```cypher
UNWIND [
  {name: "users", owner: "auth-service"},
  {name: "hotels", owner: "hotel-service"},
  {name: "rooms", owner: "hotel-service"},
  {name: "bookings", owner: "booking-service"},
  {name: "payments", owner: "payment-service"},
  {name: "competitor_hotels", owner: "revenue-management-service"}
] AS tbl
MERGE (t:DatabaseTable {tableName: tbl.name})
SET t.schemaOwner = tbl.owner,
    t.extractedAt = datetime()
RETURN t.tableName;
```

---

### D. Populating Architecture Decisions (ADRs)

Pre-seeds ADR decisions parsed from Markdown frontmatter:

```cypher
UNWIND [
  {id: "ADR-FED-01", title: "GraphQL Federation Implementation", status: "Approved", rationale: "Mitigate REST over-fetching and N+1 queries"}
] AS adr
MERGE (d:Decision {decisionId: adr.id})
SET d.title = adr.title,
    d.status = adr.status,
    d.rationale = adr.rationale,
    d.extractedAt = datetime()
RETURN d.decisionId;
```
