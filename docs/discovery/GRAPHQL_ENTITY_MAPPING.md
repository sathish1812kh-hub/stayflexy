# GraphQL Entity Mapping — Stayflexi Platform

This document describes the schema mappings translating Neo4j nodes and Graphiti memories into federated GraphQL types.

---

## 1. GraphQL Federated Types Catalog

### A. Core Software Models

```graphql
type Service @key(fields: "name") {
  name: String!
  port: Int!
  language: String!
  framework: String!
  endpoints: [Endpoint!]!
  repositories: [Repository!]!
}

type Feature @key(fields: "featureId") {
  featureId: ID!
  name: String!
  status: FeatureStatus!
  description: String
  version: String!
  requirements: [Requirement!]!
  endpoints: [Endpoint!]!
  playwrightTests: [PlaywrightTest!]!
}

type Endpoint @key(fields: "routeId") {
  routeId: ID!
  method: String!
  route: String!
  isAuthRequired: Boolean!
  contract: APIContract
}
```

---

### B. Relational Schema Models

```graphql
type DatabaseTable @key(fields: "tableName") {
  tableName: String!
  schemaOwner: String!
  columns: [DatabaseColumn!]!
  repositoriesQuerying: [Repository!]!
}

type DatabaseColumn {
  name: String!
  dataType: String!
  isPrimaryKey: Boolean!
  isForeignKey: Boolean!
  isNullable: Boolean!
}
```

---

### C. Governance & Specification Models

```graphql
type Requirement @key(fields: "id") {
  id: ID!
  title: String!
  description: String!
  priority: String!
  featuresScope: [Feature!]!
}

type Decision @key(fields: "decisionId") {
  decisionId: ID!
  title: String!
  reason: String!
  alternatives: [String!]!
  approver: String!
  status: DecisionStatus!
  affectedFeatures: [Feature!]!
}

type Package @key(fields: "name") {
  name: String!
  version: String!
  isInternal: Boolean!
  dependencies: [Package!]!
}
```

---

## 2. Shared Enums Definitions

```graphql
enum FeatureStatus {
  ACTIVE
  PARTIAL
  DEPRECATED
}

enum DecisionStatus {
  PROPOSED
  APPROVED
  REJECTED
}
```
