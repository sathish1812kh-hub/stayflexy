---
name: apollo-federation-harmonizer
description: >
  Validates, harmonizes, and composes Apollo Federation v2 subgraphs across the Stayflexi platform monorepo.
  Use when modifying GraphQL schemas, Pothos builders, federated entities (@key, @shareable, @inaccessible), or executing Rover / supergraph composition validations.
argument-hint: '[validate|compose|subgraph-name]'
license: MIT
---

# Apollo Federation v2 Subgraph Harmonizer

This skill automates Apollo Federation v2 subgraph validation and composition across all 12 Stayflexi microservices.

## Core Responsibilities

1. **Schema Directive Consistency**: Ensures proper application of `@key(fields: "id")`, `@shareable`, `@inaccessible`, `@override`, and `@tag`.
2. **Federated Entity References**: Validates that cross-service entity stubs (e.g. `User`, `Hotel`, `Booking`) declare identical key signatures.
3. **Composition Gate**: Validates supergraph composition against `infrastructure/gateway/supergraph.yaml` and `supergraph.yaml`.

## Key Commands & Verification

- **Validate Supergraph**:
  ```bash
  node scripts/validate-supergraph.mjs
  ```
- **GraphQL Schema Parity Check**:
  ```bash
  npm run test -- services/auth-service/src/tests/unit/GraphQLParity.test.ts
  ```

## Rules

- Never expose unauthenticated mutation fields in subgraphs without central `@auth` directive metadata or BFF gateway middleware.
- Always verify that Pothos schema builders generate valid SDL matching the corresponding REST DTOs.
