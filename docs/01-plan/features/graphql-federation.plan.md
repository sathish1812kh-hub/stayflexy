---
template: plan
version: 1.2
description: PDCA Plan phase document template with Architecture and Convention considerations
variables:
  - feature: graphql-federation
  - date: 2026-05-21
  - author: Gemini Agent
  - project: Stayflexi
  - version: 1.0.0
---

# graphql-federation Planning Document

> **Summary**: Migrate existing REST microservices architecture to a GraphQL Federated Gateway using Apollo Federation (Code-First approach).
>
> **Project**: Stayflexi
> **Version**: 1.0.0
> **Author**: Gemini Agent
> **Date**: 2026-05-21
> **Status**: Draft

---

## Context Anchor

| Dimension | Content |
|-----------|---------|
| WHY | Solve N+1 REST over-fetching problems and provide a unified supergraph API for frontends and mobile clients without creating a monolith. |
| WHO | Frontend/Mobile teams (consumers) and Backend Microservice teams (producers). |
| RISK | 1. Security vulnerabilities from unbounded query depth. 2. Performance degradation if DataLoader isn't used. 3. Cache invalidation complexity vs existing REST caching. |
| SUCCESS | Apollo Router deployed as Gateway, one sub-graph running Apollo Server code-first, and GraphQL queries successfully stitched. |
| SCOPE | IN SCOPE: API Gateway GraphQL BFF deployment, `hotel-service` Apollo subgraph addition. OUT OF SCOPE: Immediate rewrite of all microservices, removal of existing REST endpoints. |

## 1. Overview

### 1.1 Purpose
Introduce Apollo Federation to the Stayflexi platform. This will allow the API Gateway to route a single unified GraphQL schema ("Supergraph") to multiple independent microservices ("Subgraphs").

### 1.2 Background
Currently, the Stayflexi architecture relies heavily on standard REST API patterns. A frontend needing booking details, hotel data, and payment status must make multiple API calls to `api-gateway`, which proxies to `booking-service`, `hotel-service`, and `payment-service`. This leads to over-fetching and network latency. GraphQL Federation solves this by unifying the schema while preserving microservice autonomy.

### 1.3 Related Documents
- Requirements: N/A
- References: Apollo Federation Documentation, Pothos/TypeGraphQL Code-First concepts.

---

## 2. Scope

### 2.1 In Scope
- [x] Deploy Apollo Router (or Node Apollo Server Gateway) into the `api-gateway`.
- [x] Configure `hotel-service` as the first GraphQL Subgraph (Code-first using Pothos/TypeGraphQL + Prisma).
- [x] Implement DataLoader pattern in `hotel-service` to prevent N+1 database queries.
- [x] Implement Query Complexity limiting and Persisted Queries in the Gateway.

### 2.2 Out of Scope
- Complete migration of all 10+ microservices in one sprint.
- Deprecation or removal of existing REST endpoints (REST remains for OTA webhooks and legacy).

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | API Gateway serves a unified GraphQL endpoint | High | Pending |
| FR-02 | `hotel-service` serves an Apollo Subgraph endpoint | High | Pending |
| FR-03 | Subgraph schemas are composed automatically | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | DataLoader batches requests to Prisma | Query logging / APM Tracing |
| Security | Query complexity limited to max depth/points | Gateway rejection tests |
| Maintainability | Code-first schema generation (no .graphql files) | Code review |

---

## 4. Success Criteria

### 4.1 Definition of Done
- [ ] Gateway accepts a GraphQL query and routes it to `hotel-service`.
- [ ] `hotel-service` resolves the query via Prisma and returns data.
- [ ] No `N+1` query issues detected in Prisma logs.
- [ ] Code-first TypeScript types align perfectly with GraphQL schema.

### 4.2 Quality Criteria
- [ ] Schema composition succeeds without errors.
- [ ] Gateway handles malicious deep-queries gracefully (rejection).

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| N+1 DB Queries | High | High | Enforce DataLoader patterns on all Subgraph resolvers. |
| Query Complexity | High | Medium | Implement query depth/complexity limits at the Gateway level. |
| Broken Caching | Medium | High | Use Apollo `@cacheControl` directives tied into the existing Redis infrastructure. |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection
Selected: **Enterprise** (Strict layer separation, DI, microservices).

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Gateway | Apollo Router / Apollo Server | Apollo Router | Rust-based, high performance, native Federation v2 support. |
| Schema Approach | Schema-First / Code-First | Code-First | Ensures 100% TS-Prisma-GraphQL type safety using Pothos or TypeGraphQL. |
| Federation | Apollo v1 / Apollo v2 | Apollo Federation v2 | Improved composition rules, shareable types, better error handling. |

---

## 8. Next Steps

1. [ ] Write design document (`graphql-federation.design.md`) detailing the exact file changes needed in `api-gateway` and `hotel-service`.
2. [ ] Team review and approval
3. [ ] Start implementation
