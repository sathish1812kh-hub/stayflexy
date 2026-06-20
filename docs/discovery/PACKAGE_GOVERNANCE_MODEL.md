# Package Governance Model — Stayflexi Platform

This document describes the external library compliance policies, approved package registries, and pre-commit checks governing npm dependencies.

---

## 1. External Library Whitelist Registry

To prevent vulnerability imports and size bloat, the compliance engine checks every dependency addition against this registry.

| Package Name    | Approved Version | Purpose / Reason                            | Package Owner     | Approval Status |
| :-------------- | :--------------- | :------------------------------------------ | :---------------- | :-------------- |
| `pothos/core`   | `^3.30.0`        | Code-first GraphQL subgraph creation.       | GraphQL Architect | `APPROVED`      |
| `prisma/client` | `^5.10.0`        | Database ORM repository layers access.      | DBA Lead          | `APPROVED`      |
| `zod`           | `^3.22.0`        | API payload schema validation middleware.   | Security Lead     | `APPROVED`      |
| `playwright`    | `^1.42.0`        | E2E browser integration testing.            | Testing Lead      | `APPROVED`      |
| `puppeteer`     | `^22.4.0`        | Interactive DOM discovery and scraping.     | SRE Architect     | `APPROVED`      |
| `ioredis`       | `^5.3.0`         | Redis caching timelines and lock handlers.  | Platform Lead     | `APPROVED`      |
| `express`       | `^4.18.0`        | API routing framework in microservices.     | SRE Architect     | `APPROVED`      |
| `madge`         | `^6.1.0`         | Circular dependency detection validations.  | Platform Lead     | `APPROVED`      |
| `lodash`        | `*`              | Utilities library (Deprecated due to size). | Platform Lead     | `DEPRECATED`    |
| `node-sass`     | `*`              | Native style sheet compilers.               | UI Lead           | `BLOCKED`       |

---

## 2. Dependency Compliance Audits

### 1. Ingress Check Rules

Every time `package.json` is modified:

1. Diff the list of dependencies in the commit.
2. For each added library, query the whitelisted packages catalog.
3. If the library status is `BLOCKED` or not present, reject the build:
   > _"[PACKAGE BLOCK] Library 'node-sass' is BLOCKED. Compile aborted."_

### 2. Vulnerability Audits

- **Command**: `npm audit --audit-level=high`
- **Policy**: If the audit outputs high or critical vulnerabilities for any library in the tree, fail the CI validation gate.

### 3. Registry Node Schema

In Neo4j, whitelisted libraries are modeled using [Package](file:///C:/Stayflexi/docs/discovery/NODE_CATALOG.md#L106) nodes:

- Properties: `name: String`, `version: String`, `reason: String`, `owner: String`, `status: String`, `approvedDate: DateTime`.
