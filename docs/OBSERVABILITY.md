# Stayflexi Platform Observability & Telemetry Standard

## 1. W3C Distributed Trace Propagation

All incoming HTTP requests parse `traceparent` and inject correlation headers:

- `traceparent`: `00-{traceId}-{spanId}-{flags}`
- `x-correlation-id`: Unique per-request UUID

## 2. Structured Logging with Pino & PII Redaction

Sensitive fields are strictly redacted at serializer boundaries:

- `password`, `token`, `accessToken`, `refreshToken`, `creditCard`, `cvv`

## 3. Prometheus Metrics & Health Endpoints

- `GET /health`: Service liveness
- `GET /health/ready`: Database, Cache, and Event Bus readiness probe
- `GET /metrics`: Prometheus operational metrics
