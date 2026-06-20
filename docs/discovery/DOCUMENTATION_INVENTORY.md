# Documentation Inventory — Stayflexi Platform

This document catalogs existing architecture files, runbooks, decision logs, planning templates, and verification reports available in the repository.

---

## 1. System Architecture & Design Documents

Located under `docs/architecture/` and feature folders:

- **[`ARCHITECTURE.md`](file:///C:/Stayflexi/docs/architecture/ARCHITECTURE.md)**: Describes the transition of Stayflexi from monolith to 10 Express microservices. Outlines logical boundaries, data ownership tables, headers propagation (`x-correlation-id`), Redis Streams events naming, and the GraphQL Federation setup.
- **[`SERVICE_DEPENDENCY_MAP.md`](file:///C:/Stayflexi/docs/architecture/SERVICE_DEPENDENCY_MAP.md)**: Maps microservice ports (`3001` -> `3010`, gateway `8080`), Redis namespace prefixes (e.g. `stayflexi:lock:inventory:*`), event bus flows (`booking.created` consumers), and startup orders.
- **[`DEPLOYMENT.md`](file:///C:/Stayflexi/docs/architecture/DEPLOYMENT.md)**: Outlines Kubernetes deployment settings, CPU/Memory triggers, and zones configuration.
- **[`EVENTS.md`](file:///C:/Stayflexi/docs/architecture/EVENTS.md)**: Specifications for event-driven contracts, Kafka topics, and payload schemas.
- **[`OBSERVABILITY.md`](file:///C:/Stayflexi/docs/architecture/OBSERVABILITY.md)**: Instruments metrics scrapes, alerts routing (Slack/PagerDuty), and tracing configs.
- **[`RESILIENCE.md`](file:///C:/Stayflexi/docs/architecture/RESILIENCE.md)**: Outlines Saga flow patterns, failover fallbacks, and locks auto-expirations.
- **[`SERVICE-OWNERSHIP.md`](file:///C:/Stayflexi/docs/architecture/SERVICE-OWNERSHIP.md)**: Boundary matrix tracking development teams ownership.
- **[`graphql-federation.design.md`](file:///C:/Stayflexi/docs/02-design/features/graphql-federation.design.md)**: Architectural Decision Record (ADR) analyzing options for GraphQL Gateway (Option A: BFF, Option B: Rust Router, Option C: Node.js Gateway) and choosing Option B (Apollo Router).
- **[`graphql-federation.plan.md`](file:///C:/Stayflexi/docs/01-plan/features/graphql-federation.plan.md)**: Transition project schedule, requirements index, and success validation markers.

---

## 2. Operations Runbooks

Located under `docs/runbooks/`:

- **[`DEPLOYMENT_RUNBOOK.md`](file:///C:/Stayflexi/docs/runbooks/DEPLOYMENT_RUNBOOK.md)**: Step-by-step instructions for deploying namespace, setups, databases migrations, services launch, and ingress maps.
- **[`KAFKA_DLQ_RUNBOOK.md`](file:///C:/Stayflexi/docs/runbooks/KAFKA_DLQ_RUNBOOK.md)**: Procedure to inspect Kafka dead-letter queues, repair payloads, and re-inject events.
- **[`incident-response.md`](file:///C:/Stayflexi/docs/runbooks/incident-response.md)**: Runbook defining priority levels (P0-P4) and resolution procedures for service outages.
- **[`scaling-guide.md`](file:///C:/Stayflexi/docs/runbooks/scaling-guide.md)**: Operational guide for autoscaling settings, replicas sizing, and PgBouncer scaling targets.
- **[`service-degradation.md`](file:///C:/Stayflexi/docs/runbooks/service-degradation.md)**: Instructions on graceful feature degradation when backing systems (like Kafka or Redis) are offline.

---

## 3. General & Certification Reports

- **[`README.md`](file:///C:/Stayflexi/README.md)**: The root-level overview outlining installation steps, environment files, Turborepo commands, database setup, and port listings.
- **[`BACKEND_CERTIFICATION.md`](file:///C:/Stayflexi/docs/BACKEND_CERTIFICATION.md)**: Sign-off report confirming the successful execution of 119 validation tests, K8s network policy checks, and distributed locks.
- **[`PRODUCTION-READINESS-ASSESSMENT.md`](file:///C:/Stayflexi/docs/PRODUCTION-READINESS-ASSESSMENT.md)**: Exhaustive check of services readiness, database indexes, backups, and observability gaps (e.g. metrics registry wiring).
- **[`verification_report.md`](file:///C:/Users/Sathish/.gemini/antigravity-cli/brain/264b6ede-4cd3-4cad-a80f-6d7eddbb7afd/verification_report.md)**: Artifact tracing end-to-end testing of Phase 2 Revenue Management APIs and Next.js frontend dashboard.
