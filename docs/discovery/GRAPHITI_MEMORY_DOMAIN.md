# Graphiti Memory Domain Design — Stayflexi Platform

This document defines the semantic memory categories (subdomains) managed by the Graphiti AI Memory Layer, which operates on top of the Neo4j database.

---

## 1. Memory Subdomains Catalog

```
 [Graphiti AI Memory Layer]
           │
           ├──► [Engineering Specs]  ──► Requirement, Feature, and Decision Memories
           ├──► [System Topology]    ──► Architecture, Dependency, and Journey Memories
           ├──► [Operations Runtime] ──► Runtime, Deployment, and Incident Memories
           └──► [Audit Forensics]    ──► Impact and Consequence Memories
```

---

## 2. Detailed Memory Domains

### A. Engineering Specifications & Intent Memory

1.  **Requirement Memory**: Remembers product constraints, regulatory rules, and tax compliance criteria.
2.  **Feature Memory**: Preserves feature scopes, target UI pages, status flags, and E2E test results.
3.  **Decision Memory**: Logs Architecture Decision Records (ADRs), reasons, alternatives reviewed, and approvals.

### B. System Topology & Structural Memory

4.  **Architecture Memory**: Manages microservices namespaces, exposed ports, database schemas, and gateways.
5.  **Dependency Memory**: Tracks third-party package dependencies, version requirements, and vulnerabilities.
6.  **User Journey Memory**: Remembers multi-page operational steps (e.g. Booking Saga flows) completed by users.

### C. Operations & Runtime Performance Memory

7.  **Runtime Memory**: Tracks telemetry averages, HTTP response limits, and CPU alerts.
8.  **Deployment Memory**: Tracks active container replications and Git release tags.
9.  **Incident Memory**: Logs system failures, dead-letter queue exceptions, and recovery steps.

### D. Audit & Consequence Forensics Memory

10. **Impact Analysis Memory**: Records historical change propagation scans (e.g., how schema updates affected endpoints).
11. **Consequence Analysis Memory**: Evaluates systemic changes (e.g., how adopting GraphQL affected endpoint performance and network latency).
