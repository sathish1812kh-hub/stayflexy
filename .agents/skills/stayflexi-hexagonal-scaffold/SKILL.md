---
name: stayflexi-hexagonal-scaffold
description: >
  Scaffolds and refactors Stayflexi microservice features using strict Hexagonal Architecture (Domain -> Repositories -> Application UseCases -> Infrastructure Prisma -> HTTP & GraphQL Interfaces).
  Use when adding new microservices, creating use cases, entities, repository interfaces, Prisma database mappings, or REST/GraphQL controller endpoints.
argument-hint: '[service-name] [feature-name]'
license: MIT
---

# Stayflexi Hexagonal Architecture Scaffolder

This skill enforces strict domain-driven hexagonal boundaries across all 12 Stayflexi microservices.

## Architecture Layers & File Conventions

Every service under `/services/<service-name>/src/` must adhere to:

```
src/
├── domain/
│   ├── entities/          # Pure TypeScript domain models with invariants
│   └── repositories/      # Interface contracts (e.g. IHotelRepository.ts)
├── application/
│   ├── dtos/              # Input/Output DTOs with Zod validation
│   └── use-cases/         # Single-responsibility command/query orchestrators
├── infrastructure/
│   ├── database/          # Prisma database repositories implementing domain interfaces
│   └── external/          # Outbound API clients & gateway bridges
└── interfaces/
    ├── http/              # Express / Fastify REST controllers & route bindings
    └── graphql/           # Pothos GraphQL subgraph resolvers & schema builders
```

## Mandatory Rules

1. **Pure Domain**: Domain entities MUST NOT import Prisma, Express, Apollo, or external libraries.
2. **Repository Interfaces**: Use cases only depend on `domain/repositories/I*Repository.ts`.
3. **Single Responsibility**: One use case per file (e.g. `CreateReservation.ts`, `CancelReservation.ts`).
4. **Dual Interface Parity**: If a feature is exposed via REST (`interfaces/http`), it must maintain 100% authorization and error parity with the GraphQL subgraph (`interfaces/graphql`).
5. **AST Synchronization**: Before and after modifying symbols, run `codegraph_explore` to verify callers and unit test links.
