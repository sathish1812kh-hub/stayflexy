# Schema Generation Strategy — Stayflexi Platform

This document describes the automated pipeline to compile and generate GraphQL schemas directly from code repositories, Prisma models, and Neo4j relationship structures.

---

## 1. Schema Generation Pipeline

```
 [Neo4j Active Metadata] ──────► [Neo4j Schema Exporter]
                                            │
 [Source Code AST (Pothos)] ──► [Local Subgraph Compiler] ──► [Rover Compose CLI] ──► [Supergraph Schema]
                                            │
 [Prisma Schema Configs]   ──► [Prisma-to-GraphQL CLI]
```

---

## 2. Extraction Pipeline Stages

### A. Step 1: Code-First Subgraph Compilation (Pothos)

- Inside each microservice workspace, `@pothos/core` and `@pothos/plugin-prisma` initialize:

  ```typescript
  import SchemaBuilder from '@pothos/core'
  import PrismaPlugin from '@pothos/plugin-prisma'
  import type PrismaTypes from '@pothos/plugin-prisma/generated'

  export const builder = new SchemaBuilder<{
    PrismaTypes: PrismaTypes
  }>({
    plugins: [PrismaPlugin],
    prisma: { client: getPrismaClient() },
  })
  ```

- Feature registries and TypeScript code classes programmatically output schema blocks at compile time.

### B. Step 2: Extracting Graph Metadata from Neo4j

- Static structures that exist only in the graph database (e.g. `Requirement`, `Decision` nodes) are exported to a dedicated `governance-subgraph` using a Node.js export utility querying Neo4j schema definitions:
  ```bash
  npm run schema:export:governance
  ```
- This creates `governance.graphql` representing ADR logs and product specifications.

### C. Step 3: Federated Composition (Rover CLI)

- A CI/CD script combines local subgraphs:
  ```bash
  # Composes the federated Supergraph schema
  rover supergraph compose --config ./supergraph-config.yaml > ./supergraph.graphql
  ```
- **Composition Validation Gate**: Composition halts and warns the development team if federated references are broken or duplicated.
