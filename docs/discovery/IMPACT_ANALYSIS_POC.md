# Impact Analysis Proof of Concept — Stayflexi Platform

This document presents a concrete proof-of-concept demonstrating how a database schema modification (e.g. adding a new field `customerType` to the guest tables) propagates downstream.

---

## 1. Scenario: Adding `customerType` Column

- **Objective**: Trace the downstream impact of adding the `customerType` column to the `BookingGuest` model.
- **Target Change Node**: `DatabaseColumn` named `customerType` belonging to `DatabaseTable` named `BookingGuest`.

---

## 2. Downward Propagation Path

```
 [DatabaseColumn: customerType]
               │ (belongs to)
               ▼
   [DatabaseTable: BookingGuest]
               │ (queried by)
               ▼
 [Repository: PrismaBookingRepository]
               │ (imported by)
               ▼
    [Service: booking-service]
               │ (exposes)
               ▼
[Endpoint: POST /api/v1/bookings]
               │ (used by)
               ▼
  [Feature: Reservation Booking]
               │ (rendered in)
               ▼
   [Page: /bookings dashboard]
               │ (tested by)
               ▼
[PlaywrightTest: overbooking.test.ts]
```

---

## 3. POC Impact Verification Query (Cypher)

To audit the downstream path and identify all affected files, run the following traversal:

```cypher
MATCH (col:DatabaseColumn {name: "customerType"})-[:BELONGS_TO]->(tbl:DatabaseTable {tableName: "BookingGuest"})
MATCH path = (tbl)<-[:READS|:WRITES]-(repo:Repository)<-[:USES]-(svc:Service)-[:EXPOSES]->(e:Endpoint)<-[:USES]-(f:Feature)-[:RENDERS_IN]->(p:Page)<-[:USES]-(t:PlaywrightTest)
RETURN
  tbl.tableName AS databaseSource,
  repo.className AS affectedRepository,
  svc.name AS affectedService,
  e.routeId AS affectedEndpoint,
  f.name AS affectedFeature,
  p.route AS affectedUIPath,
  t.filePath AS testToExecute;
```

---

## 4. Expected Diagnostic Audit Report

| Affected Layer | Entity Identifier                 | Impact Assessment                                                     |
| :------------- | :-------------------------------- | :-------------------------------------------------------------------- |
| **Database**   | Table: `BookingGuest`             | Source table altered. Schema compilation required.                    |
| **Repository** | Class: `PrismaBookingRepository`  | Needs update to include `customerType` in SELECT and INSERT mappings. |
| **Service**    | Microservice: `booking-service`   | Service controller must sanitize the input variable.                  |
| **Endpoint**   | Route: `POST /api/v1/bookings`    | API contract is modified. Request validator schema must adapt.        |
| **Feature**    | Capability: `Reservation Booking` | Domain logic handles VIP customer discounts based on new type.        |
| **UI Page**    | Path: `/bookings`                 | Guest profiles form requires a dropdown field for customer selection. |
| **Testing**    | Suite: `overbooking.test.ts`      | Test inputs must include `customerType` value to verify integration.  |
