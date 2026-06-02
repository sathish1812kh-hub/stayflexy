# QA Orchestration Workflow

## Test Hierarchy

```
Level 1: Unit Tests (per-service, in-memory mocks)
  └── Owner: domain agent writes, qa-resilience-agent reviews
  └── Location: services/{svc}/src/tests/unit/
  └── Run: jest --testPathPattern=unit
  └── Target: 70–85% coverage per service

Level 2: Platform Validation Tests (multi-validator, no real infrastructure)
  └── Owner: qa-resilience-agent
  └── Location: platform-validation/src/tests/
  └── Run: cd platform-validation && jest
  └── Validates: contracts, resilience, concurrency, security, observability, integration

Level 3: Integration Tests (requires real DB + Redis, no Kafka)
  └── Owner: qa-resilience-agent + integration-governance-agent
  └── Location: platform-validation/src/tests/integration.test.ts
  └── Run: DATABASE_URL=... REDIS_URL=... jest integration

Level 4: End-to-End Tests (full stack: DB + Redis + Kafka)
  └── Owner: integration-governance-agent
  └── Location: platform-validation/ (future)
  └── Run: docker compose up -d && jest e2e
```

---

## QA Agent Spawn Protocol

The `qa-resilience-agent` is spawned for each of these scenarios:

### New Use-Case Test Review
```
Trigger: domain agent completes implementation
Input: {serviceName, useCaseName, filePath}
Responsibility:
  1. Verify test file exists: src/tests/unit/{UseCaseName}.test.ts
  2. Verify tenant isolation test covers ForbiddenError on org mismatch
  3. Verify NotFoundError on missing entity
  4. Verify idempotency test if applicable
  5. Verify distributed lock behavior if use-case uses Redis lock
  6. Verify Kafka event published on success
Output: APPROVED (tests sufficient) or REJECTED (specify missing tests)
```

### Concurrency Scenario Validation
```
Trigger: any change to distributed lock, inventory, or booking logic
Responsibility:
  1. Run ConcurrentBookingValidator tests (platform-validation)
  2. Run DistributedLockValidator tests
  3. Simulate 10 concurrent requests, verify at most N succeed
  4. Verify no race condition in lock acquire/release
Output: PASS or FAIL with specific race condition description
```

### Saga Compensation Validation
```
Trigger: changes to booking or payment saga steps
Responsibility:
  1. Simulate saga step failure at each step
  2. Verify compensation rolls back all previous steps
  3. Verify no orphaned DB records after compensation
  4. Verify Kafka compensation events are published
Output: PASS or compensation gap description
```

---

## Test Data Factories

All test factories follow this pattern:
```typescript
// Standard factory function with defaults + overrides
function makeBooking(overrides: Partial<BookingProps> = {}): Booking {
  return new Booking({
    id: 'booking-test-001',
    organizationId: 'org-test-001',
    hotelId: 'hotel-test-001',
    status: 'CONFIRMED',
    checkIn: new Date('2025-07-01'),
    checkOut: new Date('2025-07-03'),
    // ... all required fields
    ...overrides,
  })
}

// Always use fixed test UUIDs (not Math.random())
// Always use fixed test dates (not new Date())
// Always provide organizationId = 'org-test-001' as default
// Use 'org-EVIL' for cross-tenant attack scenarios
```

---

## Resilience Scenario Matrix

| Scenario | Service | Expected Behavior |
|----------|---------|------------------|
| Kafka down at startup | All | Boot with NoOp publisher, log warning |
| Kafka down mid-operation | All | Event publish fails silently, operation succeeds |
| Redis down during lock | booking, inventory, payment | HTTP 503, operation rejected |
| Redis down during cache | All | Cache miss, DB fallback, operation succeeds |
| DB slow (1s latency) | All | Requests queue, timeout at 30s, 503 |
| Worker crash | notification, workflow, payment | Restart on next health check, pick up missed items |
| Duplicate webhook | payment | Second webhook silently discarded |
| Duplicate Kafka event | All consumers | Idempotency key rejects duplicate, no error |
| OTA provider rate limit | ota-service | Retry with backoff, circuit breaker opens after N failures |
| Analytics aggregation overlap | analytics | Unique constraint prevents duplicate job |

---

## Load Testing Preparation (for infrastructure-devops-agent)

Target throughputs per service:
```
auth-service:         500 req/s (login + token refresh)
booking-service:      50 req/s (create booking is expensive due to locks)
inventory-service:    200 req/s (availability checks are cached)
payment-service:      30 req/s (financial operations are lock-heavy)
hotel-service:        100 req/s (read-heavy, heavily cached)
analytics-service:    200 req/s (heavily cached dashboard)
notification-service: 100 msg/s (async delivery)
workflow-service:     50 exec/s (rule evaluation)
```

Load test scenarios:
1. **Baseline**: 50% of target throughput, measure p50/p95/p99
2. **Sustained load**: target throughput for 10 minutes, measure error rate
3. **Spike**: 3× target for 30 seconds, measure recovery time
4. **Concurrent overbooking**: 100 booking requests for 10 rooms simultaneously
