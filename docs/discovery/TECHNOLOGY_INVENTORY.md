# Technology Inventory — Stayflexi Platform

This document catalogs the complete technology stack of the Stayflexi distributed hospitality platform, covering frontend, backend, database, and infrastructure components.

---

## 1. Frontend Architecture

| Category              | Component                    | Details                                                                                                 |
| :-------------------- | :--------------------------- | :------------------------------------------------------------------------------------------------------ |
| **Framework**         | Next.js 16.2.6               | React 19-based production framework, utilizing App Router layout and pages.                             |
| **Language**          | TypeScript                   | Strictly typed codebase.                                                                                |
| **Build Tool**        | Next.js Compiler / Turborepo | Turbopack is utilized for rapid development compilation; Turborepo orchestrates monorepo builds.        |
| **State Management**  | React State & Context        | Standard React hooks (`useState`, `useEffect`, `useContext`) paired with Next.js server-side hydration. |
| **UI/Icon Libraries** | Lucide React                 | Used for UI iconography.                                                                                |
| **Styling (CSS)**     | Vanilla CSS                  | Responsive layouts styled via standard CSS custom variables and classes in `src/app/globals.css`.       |

---

## 2. Backend Architecture

| Category      | Component                     | Details                                                                                                                                       |
| :------------ | :---------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------- |
| **Framework** | Express.js / Next.js          | Microservices are built using Express.js; the monolith gateway and pages run Next.js server.                                                  |
| **Language**  | TypeScript / Node.js 20+      | Runtime environments run modern LTS Node.js with strict type-safety.                                                                          |
| **API Style** | REST & GraphQL Federation     | Primarily REST API routing. Actively transitioning to GraphQL Subgraphs via Apollo Federation v2 using a Code-First schema approach (Pothos). |
| **Gateway**   | Express Proxy / Apollo Router | Request entry routes via Express API Gateway on port `8080`, proxying down to domain microservices.                                           |

---

## 3. Database & Caching Architecture

| Category               | Component        | Details                                                                                                     |
| :--------------------- | :--------------- | :---------------------------------------------------------------------------------------------------------- |
| **Database Engines**   | PostgreSQL 16    | Primary persistent datastore, segregated logically via schemas.                                             |
| **Cache & Lock Store** | Redis 7          | Handles session data, rate-limiting state, dynamic lock storage (using Lua scripts), and key-value caching. |
| **Event Streaming**    | Apache Kafka 7.5 | Functions as the event bus / event mesh for asynchronous microservice orchestration and event replay.       |
| **ORM**                | Prisma 6.8.2     | Integrates the 16 separate schema files under `src/database/prisma/schema` into a single client.            |
| **Migration Tools**    | Prisma Migrate   | Migration files generated in dev and deployed in staging/production via Kubernetes Migration Jobs.          |

---

## 4. Infrastructure & DevOps

| Category             | Component                                  | Details                                                                                                                                          |
| :------------------- | :----------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Containerization** | Docker                                     | Multi-stage Dockerfiles utilizing non-root users (`appuser:1001`) and custom healthchecks.                                                       |
| **Orchestration**    | Kubernetes                                 | Cluster deployments, ClusterIP services, Ingress-Nginx routing, and Pod Disruption Budgets.                                                      |
| **Autoscaling**      | HPA & KEDA                                 | Horizontal Pod Autoscalers trigger at 70% CPU / 80% Memory; KEDA scales workers based on Kafka event queue lag.                                  |
| **Observability**    | OpenTelemetry, Prometheus, Jaeger, Grafana | OTEL SDK instruments HTTP/DB calls. Metrics exposed at `/metrics` scraped by Prometheus. Traces sent to Jaeger. logs formatted in JSON via Pino. |
| **CI/CD Pipelines**  | GitHub Actions                             | Workflows handle linting, type-checking, Jest tests, Docker image building/pushing to GHCR, and rollbacks.                                       |
