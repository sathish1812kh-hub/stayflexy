# Dependency Registry — Stayflexi Platform

This document catalogs the direct and development dependencies of the Stayflexi monorepo at the root, shared packages, and microservice layers.

---

## 1. Monorepo Root Dependencies

These libraries are defined in the root `package.json` and are shared or hoisted across the workspaces.

### Production Dependencies (`dependencies`)

| Name             | Version    | Purpose                                     | Usage Location                | Status      |
| :--------------- | :--------- | :------------------------------------------ | :---------------------------- | :---------- |
| `next`           | `^16.2.6`  | Web frontend and gateway platform framework | Root / Monolith UI app        | 🟢 **Used** |
| `react`          | `^19.0.0`  | UI component library                        | Frontend pages, hooks         | 🟢 **Used** |
| `react-dom`      | `^19.0.0`  | DOM rendering adapter for React             | Frontend client entry         | 🟢 **Used** |
| `lucide-react`   | `^1.16.0`  | SVG icons set                               | Reusable dashboard views      | 🟢 **Used** |
| `@prisma/client` | `^6.8.2`   | Database client connection                  | `shared-database`, services   | 🟢 **Used** |
| `bcryptjs`       | `^3.0.3`   | Hashing passwords                           | `auth-service`                | 🟢 **Used** |
| `jsonwebtoken`   | `^9.0.3`   | JWT issuance & decode operations            | `auth-service`, `shared-auth` | 🟢 **Used** |
| `zod`            | `^3.25.23` | Runtime layout schemas and parsing          | `shared-validation`, services | 🟢 **Used** |

### Development Dependencies (`devDependencies`)

| Name               | Version   | Purpose                                  | Usage Location                | Status      |
| :----------------- | :-------- | :--------------------------------------- | :---------------------------- | :---------- |
| `typescript`       | `^5`      | Typed JavaScript programming compilation | Code compilation, type checks | 🟢 **Used** |
| `turbo`            | `^2.3.0`  | High-performance monorepo orchestration  | Builds, linting, tests        | 🟢 **Used** |
| `prisma`           | `^6.8.2`  | Prisma ORM tooling, CLI, schema compile  | Database schema management    | 🟢 **Used** |
| `@playwright/test` | `^1.60.0` | End-to-end and integration verification  | `platform-validation`, tests  | 🟢 **Used** |
| `jest`             | `^29.7.0` | Unit test execution runner               | Microservices unit tests      | 🟢 **Used** |
| `prettier`         | `^3.4.2`  | Code formatting checks                   | Code quality git hooks        | 🟢 **Used** |
| `eslint`           | `^9`      | Code quality static analysis checking    | Git hooks, build checks       | 🟢 **Used** |
| `husky`            | `^9.1.7`  | Git hooks execution runner               | Commit and push gates         | 🟢 **Used** |
| `ts-node`          | `^10.9.2` | Executing TypeScript directly            | Seeders, migrations scripts   | 🟢 **Used** |
| `tsx`              | `^4.7.0`  | Watch execution runner for dev           | Services dev watch running    | 🟢 **Used** |

---

## 2. Microservice Layer Dependencies (`services/*`)

Individual Express.js microservices declare local dependencies specific to their processing needs.

| Dependency Name              | Sample Version | Purpose                                  | Usage Service(s)                   | Status      |
| :--------------------------- | :------------- | :--------------------------------------- | :--------------------------------- | :---------- |
| **`express`**                | `^4.18.3`      | Router routing mapping.                  | All microservices                  | 🟢 **Used** |
| **`helmet`**                 | `^7.1.0`       | Hardens HTTP response headers.           | All microservices                  | 🟢 **Used** |
| **`express-rate-limit`**     | `^7.1.5`       | Request limit window controls.           | All microservices                  | 🟢 **Used** |
| **`ioredis`**                | `^5.3.2`       | Connection client to Redis.              | All microservices                  | 🟢 **Used** |
| **`kafkajs`**                | `^2.2.4`       | Message publishing and subscriptions.    | Services utilizing event bus       | 🟢 **Used** |
| **`pino`** / **`pino-http`** | `^8.17.2`      | Output structured logs in JSON format.   | All microservices                  | 🟢 **Used** |
| **`@apollo/server`**         | `^4.10.2`      | Standalone GraphQL subgraphs.            | `hotel-service` (extending others) | 🟢 **Used** |
| **`@apollo/subgraph`**       | `^2.7.2`       | Federation hookups for GraphQL.          | `hotel-service` (extending others) | 🟢 **Used** |
| **`@pothos/core`**           | `^3.41.0`      | Programmatic code-first GraphQL schemas. | `hotel-service`                    | 🟢 **Used** |
| **`dataloader`**             | `^2.2.2`       | Resolves database query batching.        | GraphQL subgraph resolvers         | 🟢 **Used** |
| **`@opentelemetry/api`**     | `^1.7.0`       | OpenTelemetry monitoring SDK.            | All microservices                  | 🟢 **Used** |
