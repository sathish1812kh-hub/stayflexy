# Project Awareness Model — Stayflexi Platform

This document describes the structural template and variable mappings representing the baseline context the AI Orchestration Engine must maintain during any pair programming session.

---

## 1. Project Identity Context Map

```
  [AI System Prompt Header]
             │
             ├──► Project Baseline ──► Identity (Stayflexi v2.0.0), Architecture, and Services Ports
             ├──► Operational State ──► Active Features, Tasks Queue, and System Risks
             └──► Recent Changes   ──► ADR Logs and Git commit diff hashes
```

---

## 2. Core Awareness Fields

### A. Project Baseline

- **Current Project**: `Stayflexi` — multi-tenant hospitality property management system (PMS) and channel distribution hub.
- **Current Version**: `2.0.0`.
- **Current Architecture**: Distributed Express microservices (12 services) and a Next.js 16 monorepo backend, sharing a single logically isolated PostgreSQL 16 database.

---

### B. Current Operational State

- **Active Features**:
  - Auth: JWT rotation, bcrypt hashing, brute force locks.
  - PMS: Hotels, RoomTypes, Rooms metadata.
  - Booking: Reservation holds, 7-step sagas.
  - Billing: Stripe webhook HMAC routing, double-entry ledger audits.
  - Revenue: Competitor price uploads, yield recommendations, human approvals UI.
- **Open Tasks**:
  1.  Deploy a PgBouncer connection pooler in Kubernetes.
  2.  Wire `MetricsRegistry` and HTTP middleware into Express services.
  3.  Substitute placeholder credentials in K8s secrets templates.
- **Open Risks**:
  - Observability: Centralized metrics alerts are currently incomplete due to unwired Express Prometheus adapters.
  - Scale: Database pool saturation if container pods scale beyond 10 instances.

---

### C. Change Traceability

- **Recent Decisions**:
  - ADR: Implement Apollo GraphQL Federation v2 using a Code-First schema builder (Pothos) in `hotel-service`, routing traffic via the Rust-based Apollo Router gateway.
- **Recent Changes**:
  - Phase 2 Revenue Management expansion: Added competitor model schema migrations, price scrapers uploads, yields recommendation calculator, and pricing approvals history tracking.
