# Impact Analysis Model — Stayflexi Platform

This document describes the change impact propagation model, tracing dependency links from code, schemas, and requirements to user-facing pages, integrations, and Playwright verification suites.

---

## 1. Impact Propagation Vectors

Stayflexi models change impact via bidirectional graph traversals:

```
[Downstream Ingestion Vectors] (Change Database schema / External Gateway)
DatabaseTable ──► Repository ──► Service ──► Endpoint ──► Feature ──► UserJourney ──► PlaywrightTest

[Upstream Requirement Vectors] (Change Business Specs / Regulation rules)
Requirement ──► Feature ──► Page ──► UIComponent ──► Endpoint ──► APIContract ──► Validator
```

---

## 2. Downward Impact Propagation Chain (Schema/Infrastructure Drift)

When a physical schema column, database table, or external system is modified, the impact cascades downstream:

- **Trigger**: Alter table column (e.g. `Booking.status` type changes).
- **Propagation Path**:
  1.  `DatabaseTable` flags matching `Repository` nodes (`READS`/`WRITES`).
  2.  `Repository` flags the backend `Service` that imports it.
  3.  `Service` flags the exposed `Endpoint` route.
  4.  `Endpoint` flags the parent `Feature` and `APIContract`.
  5.  `Feature` flags the `Page` rendering the data.
  6.  `Page` flags the associated `UserJourney` and `PlaywrightTest` files.
- **Audit Cypher Query**:
  ```cypher
  MATCH path = (t:DatabaseTable {tableName: "bookings"})<-[:READS|:WRITES]-(r:Repository)<-[:USES]-(e:Endpoint)<-[:EXPOSES]-(f:Feature)<-[:TESTED_BY]-(p:PlaywrightTest)
  RETURN path;
  ```

---

## 3. Upstream Traceability Vectors (Business requirement modifications)

When a product requirement or compliance regulation shifts, the engineering requirements cascade upstream:

- **Trigger**: Adjusting minimum tax calculation logic or security guidelines (e.g. GDPR compliance request updates).
- **Propagation Path**:
  1.  `Requirement` updates flag matching `Feature` nodes.
  2.  `Feature` highlights the user-facing `Page` and `UIComponent`.
  3.  `Page` traces down to the backend `Endpoint` mapping.
  4.  `Endpoint` queries identify the validating `APIContract` and `Validator` schema.
- **Audit Cypher Query**:
  ```cypher
  MATCH path = (req:Requirement {id: "REQ-GDPR-01"})-[:DEFINES]->(f:Feature)-[:IMPLEMENTS]-(p:Page)-[:USES]->(e:Endpoint)
  RETURN path;
  ```

---

## 4. Cross-System Integration Traces

Changes in external integrations propagate sideways through the graph, impacting notification and automation flows:

- **Stripe Webhook Shift**:
  `ExternalSystem (Stripe)` -> `Endpoint (/webhooks)` -> `Service (payment-service)` -> `DatabaseTable (PaymentWebhookEvent)`.
- **Twilio SMS payload change**:
  `ExternalSystem (Twilio)` -> `Service (notification-service)` -> `Feature (SMS Notification)` -> `PlaywrightTest (notification.test.ts)`.
- **Audit Cypher Query**:
  ```cypher
  MATCH path = (ext:ExternalSystem {name: "Stripe"})-[:CALLS]->(e:Endpoint)<-[:EXPOSES]-(s:Service)
  RETURN path;
  ```
