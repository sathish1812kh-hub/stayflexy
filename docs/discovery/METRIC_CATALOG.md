# Observability Metric Catalog — Stayflexi Platform

This document catalogs the standard Prometheus metrics scraped from Next.js, Express microservices, Prisma connection pools, and runtime processes.

---

## 1. Application Process Metrics (Node.js & V8)

Application metrics audit the memory and event-loop health of our JS services.

| Metric Name                    | Metric Type | Labels    | Threshold Target | Description                                             |
| :----------------------------- | :---------- | :-------- | :--------------- | :------------------------------------------------------ |
| `nodejs_eventloop_lag_seconds` | Gauge       | `service` | < 0.05s          | Tracks event loop blocks which delay query resolutions. |
| `js_heap_size_bytes`           | Gauge       | `service` | < 1.2 GB         | Monitors JS execution memory footprints.                |
| `nodejs_active_handles`        | Gauge       | `service` | N/A              | Monitors active sockets, timers, and file descriptors.  |

---

## 2. Web API Metrics (REST & GraphQL)

API metrics monitor request velocities, latency percentiles, and request failures.

| Metric Name                         | Metric Type | Labels                       | Threshold Target | Description                                     |
| :---------------------------------- | :---------- | :--------------------------- | :--------------- | :---------------------------------------------- |
| `http_requests_total`               | Counter     | `service`, `route`, `status` | N/A              | Rate of incoming requests (e.g. 2xx, 4xx, 5xx). |
| `http_request_duration_seconds`     | Histogram   | `service`, `route`, `method` | p95 < 0.25s      | Measures endpoint round-trip latencies.         |
| `graphql_resolver_duration_seconds` | Histogram   | `service`, `field`, `type`   | p95 < 0.15s      | Profiles Apollo subgraph resolver speed.        |

---

## 3. Database Layer Metrics (Prisma & PostgreSQL)

Database metrics inspect query durations and connection utilization profiles.

| Metric Name                      | Metric Type | Labels                       | Threshold Target | Description                               |
| :------------------------------- | :---------- | :--------------------------- | :--------------- | :---------------------------------------- |
| `prisma_pool_connections_active` | Gauge       | `service`, `db`              | < 80% capacity   | Active connections in Prisma pools.       |
| `prisma_query_duration_seconds`  | Histogram   | `service`, `model`, `action` | p95 < 0.05s      | Latency of Prisma client DB interactions. |
| `prisma_client_queries_total`    | Counter     | `service`, `model`, `status` | N/A              | Total queries dispatched to Postgres.     |

---

## 4. Business Operations Metrics

Business metrics map technical interactions to operational success.

| Metric Name                      | Metric Type | Labels             | Threshold Target | Description                                            |
| :------------------------------- | :---------- | :----------------- | :--------------- | :----------------------------------------------------- |
| `booking_creation_total`         | Counter     | `orgId`, `channel` | N/A              | Total reservations completed (direct vs OTA).          |
| `checkout_revenue_charged_cents` | Counter     | `orgId`, `gateway` | N/A              | Aggregated checkout invoice payments.                  |
| `ota_sync_events_failed_total`   | Counter     | `orgId`, `channel` | 0 failures       | Failed synchronization loops with Expedia/Booking.com. |

---

## 5. Infrastructure Metrics

Infrastructure metrics profile resource allocation for Kubernetes nodes.

| Metric Name                          | Metric Type | Labels             | Threshold Target | Description                                 |
| :----------------------------------- | :---------- | :----------------- | :--------------- | :------------------------------------------ |
| `container_cpu_usage_seconds_total`  | Counter     | `pod`, `namespace` | < 85% limit      | CPU core seconds consumed by pods.          |
| `container_memory_working_set_bytes` | Gauge       | `pod`, `namespace` | < 90% limit      | Resident set size (RSS) memory consumption. |
