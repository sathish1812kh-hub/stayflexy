# Long Term Memory Strategy — Stayflexi Platform

This document describes the preservation rules, garbage-collection filters, and backup policies for securing critical system metadata that must never be lost in the Graphiti Memory Layer.

---

## 1. Permanent Memory Segments

While temporary metrics, runtime locks, and incident histories can be archived or purged, the following segments are labeled as **Unforgettable** and carry a permanent retention status:

```
  [Graphiti Garbage Collector]
              │
              ├──► Purgeable/Archived ──► Telemetry metrics, locks logs (> 90 days)
              └──► Unforgettable      ──► Architecture, Business, and Security rules
```

---

## 2. Protected Memory Categories

### A. Architectural Decisions (ADRs)

- _Why_: Explains _why_ specific choices were made (e.g. Apollo Router over BFF proxy).
- _Retention_: Permanent.
- _Exploit Protection_: Cypher deletes are blocked on `Decision` nodes unless explicitly authorized by a repository admin.

### B. Core Business Rules

- _Why_: Models core system computations (e.g. booking holds expiration, weekend surge multiplier formulas).
- _Retention_: Permanent.

### C. Critical Dependencies & SDKs

- _Why_: Tracks third-party integrations (Stripe, Twilio, SendGrid) and internal packages configuration.
- _Retention_: Permanent.

### D. Security Boundaries & Multi-tenant Rules

- _Why_: Asserts multi-tenant tenant-isolation filters (`organizationId` matching check rules) and token rotation durations.
- _Retention_: Permanent.

### E. Domain Boundaries

- _Why_: Asserts microservices boundaries mapped in domain registry definitions.
- _Retention_: Permanent.

---

## 3. Storage & Disaster Recovery (LTM Backups)

To ensure this long-term memory survives computer shutdowns, git cleans, or local container failures:

1.  **Triple Persistence**: Long-term parameters are written to (1) Neo4j disk storage, (2) the local `.agents/memory/` markdown files, and (3) an S3 backup bucket.
2.  **Validation Gate**: The build pipeline verifies that the local markdown files contain all permanent node elements mapped in Neo4j before compiling packages.
