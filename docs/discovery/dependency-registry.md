# Dependency Registry — Stayflexi Platform

This document catalogs dependencies, service boundaries, and internal monorepo couplings.

---

## 1. Microservice Dependencies

| Service                    | Downstream Connections                                         | DB Engine  | API Type           |
| :------------------------- | :------------------------------------------------------------- | :--------- | :----------------- |
| **booking-service**        | `payment-service`, `inventory-service`, `notification-service` | PostgreSQL | GraphQL Federated  |
| **ota-service**            | `booking-service`, `inventory-service`                         | PostgreSQL | REST API           |
| **payment-service**        | None (Outbound to Stripe Gateway)                              | PostgreSQL | GraphQL Federated  |
| **pricing-engine-service** | `inventory-service`                                            | PostgreSQL | gRPC Inter-service |

---

## 2. Package Usage Matrix

All microservices depend on standard packages located in the `/packages/` directory:

- **[shared-database](file:///C:/Stayflexi/packages/shared-database)**
  - **Imports**: Used by all services to connect Prisma ORM.
  - **Rules**: Direct database writes from UI files are strictly blocked by governance rules.
- **[shared-auth](file:///C:/Stayflexi/packages/shared-auth)**
  - **Imports**: booking-service, payment-service, organization-service, hotel-service.
- **[shared-observability](file:///C:/Stayflexi/packages/shared-observability)**
  - **Imports**: Implemented in all microservices. Includes OpenTelemetry wrappers.
