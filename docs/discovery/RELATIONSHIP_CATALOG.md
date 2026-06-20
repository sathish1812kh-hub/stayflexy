# Relationship Catalog — Neo4j Knowledge Graph

This document defines the relationships (edges) linking the architecture nodes within the Stayflexi Unified Software Intelligence Graph.

---

## 1. Schema & Architecture Relationships

| Relationship           | Source Node     | Target Node     | Meaning                                                                      | Extraction Method                                                                                                          |
| :--------------------- | :-------------- | :-------------- | :--------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------- |
| **`DEFINES`**          | `Requirement`   | `Feature`       | The product requirement scopes and specifies the functional feature.         | NLP matching on design docs and PRD trace anchors.                                                                         |
| **`IMPLEMENTS`**       | `Service`       | `Feature`       | The backend service implements the execution logic of the feature.           | Map scanning of [`SERVICE-OWNERSHIP.md`](file:///C:/Stayflexi/docs/architecture/SERVICE-OWNERSHIP.md) and module catalogs. |
| **`EXPOSES`**          | `Service`       | `Endpoint`      | The microservice exposes a public or internal API route.                     | Static analysis scanning of `routes.ts` file controllers.                                                                  |
| **`DEFINES_CONTRACT`** | `Endpoint`      | `APIContract`   | The API endpoint defines request payload and validation rules.               | Scrapes mapping of Zod parsing middleware inside Express routes.                                                           |
| **`USES`**             | `Endpoint`      | `DTO`           | The endpoint uses a data transfer payload structure.                         | AST parsing of endpoint method parameters.                                                                                 |
| **`VALIDATES_WITH`**   | `DTO`           | `Validator`     | The payload data structure is sanitized by a validator.                      | Zod parsing links scanning.                                                                                                |
| **`CALLS`**            | `Service`       | `Service`       | A service performs synchronous HTTP or async Kafka calls to another service. | Scans of HTTP request clients, HTTP trace spans in OTel logs.                                                              |
| **`READS`**            | `Repository`    | `DatabaseTable` | A database repository queries records from a relational table.               | AST parsing of Prisma client invocation models (`db.booking.findMany`).                                                    |
| **`WRITES`**           | `Repository`    | `DatabaseTable` | A database repository creates, modifies, or deletes table rows.              | AST parsing of Prisma write client calls (`db.booking.create`).                                                            |
| **`DEPENDS_ON`**       | `Package`       | `Package`       | A workspace package depends on another workspace package or NPM dependency.  | Scanning `package.json` configurations.                                                                                    |
| **`DEPENDS_ON`**       | `DatabaseTable` | `DatabaseTable` | A database table references another table via a foreign key relation.        | Prisma schema parser analysis of relationship definitions (`@relation`).                                                   |

---

## 2. Infrastructure & Operations Relationships

| Relationship      | Source Node      | Target Node      | Meaning                                                                | Extraction Method                                                          |
| :---------------- | :--------------- | :--------------- | :--------------------------------------------------------------------- | :------------------------------------------------------------------------- |
| **`BELONGS_TO`**  | `DatabaseColumn` | `DatabaseTable`  | The database column belongs to the schema table.                       | Prisma schema structural parsing.                                          |
| **`APPLIES_TO`**  | `Migration`      | `DatabaseTable`  | Schema migrations alter or create database tables.                     | Analyzes Prisma migration SQL commands for `CREATE TABLE` / `ALTER TABLE`. |
| **`TESTED_BY`**   | `Feature`        | `PlaywrightTest` | The business feature is covered by integration or E2E tests.           | Scanning test comments or tagging rules (`@feature`).                      |
| **`DEPLOYED_IN`** | `Service`        | `Deployment`     | The microservice executes within a Kubernetes Deployment.              | Compiles K8s YAML deployment files matching containers names.              |
| **`RUNS_ON`**     | `Deployment`     | `Environment`    | The deployment runs in a target cluster environment (e.g. production). | Namespace parsing from `kubectl config` and environment profiles.          |
| **`OBSERVED_BY`** | `Service`        | `RuntimeMetric`  | System runtime metrics measure performance variables of the service.   | Scrapes metrics names from Prometheus registry.                            |
| **`LOGGED_BY`**   | `ErrorEvent`     | `Service`        | The microservice logs a stack trace or warning exception.              | Pino log aggregation parser filters.                                       |

---

## 3. Security & Governance Relationships

| Relationship     | Source Node  | Target Node     | Meaning                                                       | Extraction Method                                      |
| :--------------- | :----------- | :-------------- | :------------------------------------------------------------ | :----------------------------------------------------- |
| **`THREATENS`**  | `Threat`     | `Feature`       | A security threat models exploit paths against a feature.     | Dynamic mapping of security architecture logs.         |
| **`EXPOSES_TO`** | `Feature`    | `Vulnerability` | A dependency vulnerability exposes a feature to exploits.     | Merges `npm audit` reports to package mapping trees.   |
| **`AUDITS`**     | `AuditEvent` | `DatabaseTable` | An append-only audit event log records operations on a table. | Extraction parser matching table names to log records. |
