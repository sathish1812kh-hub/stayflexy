# GraphQL Architecture Design — Stayflexi Platform

This document describes the design architecture, schema composition strategy, and resolver patterns for the GraphQL Synchronization Layer.

---

## 1. GraphQL Synchronization Topology

GraphQL acts as the unified query interface ("BFF / Access Layer") on top of Neo4j, Graphiti, and Postgres databases:

```
      [Frontend Clients / AI Orchestrator]
                       │
                       ▼
        [Apollo Router Gateway: port 8080]
                       │
       ┌───────────────┼───────────────┐ (Federated Subgraphs)
       ▼               ▼               ▼
[hotel-service] [booking-svc]  [revenue-svc] ... (port 3001-3010)
  (Pothos SG)     (Pothos SG)    (Pothos SG)
       │               │               │
       └───────────────┼───────────────┘
                       ▼
            [Neo4j Bolt Graph Driver]
                       │
                       ▼
          [Neo4j / Graphiti DB Engine]
```

---

## 2. Core Architectural Decisions

### A. Schema Strategy (Code-First Federation v2)

- **Approach**: Code-First schema building using `@pothos/core` and `@pothos/plugin-federation` in individual microservices.
- **Ingestion**: Individual subgraph schemas are generated programmatically from TypeScript codebase entities and are composed into a unified `supergraph.graphql` schema using the **Rover CLI** during CI/CD workflows.
- **Gateway**: The Rust-based **Apollo Router** serves as the API gateway gateway on port `8080`, performing query routing and caching.

### B. Resolver Strategy (DataLoaders & APOC queries)

- **Design**: Subgraph resolvers utilize a context-injected **DataLoader** layer to batch queries.
- **Database Access**: Queries targeting graph relations compile into atomic APOC (Awesome Procedures on Cypher) statements, querying Neo4j via the Bolt protocol.
- **N+1 Prevention**: In-memory DataLoader instances batch array queries (e.g. collecting `Requirement` nodes linked to a list of `Feature` IDs) to ensure only a single transactional Bolt call is made per schema level.

### C. Schema Versioning Strategy

- **Directives**: Versioning is managed using GraphQL `@deprecated` directives rather than API route version prefixes (e.g., no `/api/v2/graphql`).
- **Compatibility Gate**: The CI build runs schema checks via `rover subgraph check` before deployment to ensure no breaking changes are introduced to the active Supergraph.
