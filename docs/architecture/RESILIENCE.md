# Resilience Strategy

## Circuit Breaker

Inter-service HTTP calls are wrapped in a `CircuitBreaker` to prevent cascading failures.

### States

```
         ┌─────────────────────────────────────────────────────────┐
         │                                                         │
  CLOSED ──── (3-5 consecutive failures) ──> OPEN ──── (30s) ──> HALF_OPEN
    ▲                                                         │
    │                          success                        │
    └─────────────────────────────────────────────────────────┘
                               failure
                         HALF_OPEN ──────────> OPEN (reset timer)
```

### Thresholds

| Parameter             | Value        |
|-----------------------|--------------|
| Failure threshold     | 5 requests   |
| Time window           | 60 seconds   |
| Open → Half-open      | 30 seconds   |
| Half-open probe count | 1 request    |
| Reset on success      | immediate    |

### Implementation (`services/resilience/CircuitBreaker.ts`)

```typescript
class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failures = 0;
  private lastFailureTime?: number;

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - (this.lastFailureTime ?? 0) > 30_000) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit OPEN');
      }
    }
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }
}
```

---

## Retry Strategy

### `withRetry` Utility

Non-idempotent operations are NOT retried. Idempotent operations use exponential backoff
with full jitter:

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 200
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt >= maxAttempts) throw err;
      const jitter = Math.random() * baseDelayMs;
      const delay = Math.pow(2, attempt) * baseDelayMs + jitter;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}
```

Backoff schedule (approximate, with jitter):
- Attempt 1 → wait ~400ms
- Attempt 2 → wait ~800ms
- Attempt 3 → fail permanently

### Idempotency Classification

| Operation                          | Safe to Retry | Reason                                         |
|------------------------------------|---------------|------------------------------------------------|
| GET any resource                   | Yes           | Read-only                                      |
| PUT /ota/providers/:id             | Yes           | Full replacement, same input = same result     |
| POST /ota/sync/inventory           | Yes           | idempotencyKey guard prevents duplicate jobs   |
| POST /ota/sync/rates               | Yes           | idempotencyKey guard                           |
| POST /ota/sync/reservations        | Yes           | idempotencyKey guard                           |
| POST /automation/executions        | Yes           | UUIDv4 idempotencyKey assigned at creation     |
| POST /bookings                     | No            | Creates new booking each call                  |
| POST /payments                     | No            | Charges customer                               |
| POST /notifications                | No            | Sends message; use idempotency header instead  |
| DELETE /automation/rules/:id       | Yes           | Deleting a deleted resource = 404 (not error)  |
| POST /compliance/export            | Yes           | Duplicate check before create                  |

---

## Bulkhead Pattern

Each service runs as an independent process (container) with its own:
- Node.js event loop
- Database connection pool (Prisma connection limit per service)
- Redis connection

An outage or memory leak in `booking-service` does not affect `analytics-service`.
There is no shared in-process state between services.

Resource limits are set at the Kubernetes pod level:

| Service              | CPU Request | CPU Limit | Memory Request | Memory Limit |
|----------------------|-------------|-----------|----------------|--------------|
| auth-service         | 100m        | 500m      | 128Mi          | 512Mi        |
| booking-service      | 200m        | 1000m     | 256Mi          | 1Gi          |
| payment-service      | 200m        | 1000m     | 256Mi          | 1Gi          |
| ota-service          | 150m        | 750m      | 128Mi          | 512Mi        |
| analytics-service    | 200m        | 1000m     | 256Mi          | 1Gi          |
| notification-service | 100m        | 500m      | 128Mi          | 512Mi        |
| workflow-service     | 150m        | 750m      | 256Mi          | 1Gi          |

---

## Timeout Configuration

| Layer                        | Timeout   | Notes                                              |
|------------------------------|-----------|----------------------------------------------------|
| API Gateway proxy            | 30s       | Hard limit; 504 returned to client on breach       |
| Service-to-service HTTP      | 10s       | Set via `http.request` timeout or axios config     |
| Database statement timeout   | 30s       | Prisma `queryTimeout` / PostgreSQL `statement_timeout` |
| Redis command timeout        | 5s        | ioredis `commandTimeout`                           |
| Redis stream XREADGROUP BLOCK| 2000ms    | Consumer poll interval; non-blocking               |
| Health check readiness probe | 5s        | K8s `timeoutSeconds` on readinessProbe             |

Timeouts are propagated in the `x-request-deadline` header so downstream services can
honour the remaining budget.

---

## Health Check Strategy

Every service exposes three endpoints:

### GET /health/live

Returns `200 { "status": "ok" }` immediately. Used by Kubernetes `livenessProbe`.
If this endpoint returns 5xx or times out, Kubernetes restarts the pod.

### GET /health/ready

Checks database connectivity (`SELECT 1`) and Redis connectivity (`PING`).
Returns:
- `200 { "status": "ready", "checks": { "database": "ok", "redis": "ok" } }` when healthy
- `503 { "status": "not ready", "checks": { ... } }` when degraded

Used by Kubernetes `readinessProbe`. A not-ready pod is removed from the load balancer
but NOT restarted. Traffic is not sent to it until it becomes ready again.

### GET /health/status

Detailed component health including latency measurements. Used by monitoring dashboards
and the API Gateway health aggregator. Not used by Kubernetes probes.

```json
{
  "service": "booking-service",
  "version": "2.0.0",
  "status": "healthy",
  "timestamp": "2026-05-18T00:00:00.000Z",
  "checks": {
    "database": { "status": "ok", "latencyMs": 4 },
    "redis": { "status": "ok", "latencyMs": 1 }
  }
}
```

---

## Regional Failover

Stayflexi uses `RecoveryExecution` and `BackupSnapshot` models to track DR state.

### Backup Schedule

| Backup Type     | Frequency    | Retention | Model Field      |
|-----------------|-------------|-----------|------------------|
| DATABASE        | Every 6h    | 30 days   | BackupSnapshot   |
| REDIS_SNAPSHOT  | Every 1h    | 7 days    | BackupSnapshot   |
| FULL            | Daily       | 90 days   | BackupSnapshot   |

### Failover Steps

1. **Detect**: Monitoring alerts on primary region failure (latency > 10s, error rate > 20%)
2. **Initiate**: `POST /api/resilience/failover` with `recoveryType: FULL_RECOVERY`
   and the latest `backupSnapshotId`
3. **Prevent Duplicate**: `RecoveryExecution.findFirst({ where: { recoveryStatus: 'RUNNING' } })`
   returns 409 if already in progress
4. **Execute**: `RecoveryExecution` created with `recoveryStatus: PENDING`
   → automation updates it through `RUNNING` → `COMPLETED`
5. **DNS Cutover**: Update DNS A records to point to secondary region IP
6. **Validate**: Run smoke tests against secondary region endpoints
7. **Monitor**: Track `GET /api/disaster-recovery/status` until `recoveryStatus: COMPLETED`

### RTO / RPO Targets

| Metric | Target |
|--------|--------|
| RPO (Recovery Point Objective) | < 1 hour (Redis snapshot interval) |
| RTO (Recovery Time Objective)  | < 30 minutes                       |
