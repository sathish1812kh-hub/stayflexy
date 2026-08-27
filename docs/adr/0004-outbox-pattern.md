# ADR-0004: Transactional Outbox for Kafka Publishing

- **Status**: Accepted
- **Date**: 2026-08-28
- **Scope**: All twelve services that publish domain events to Kafka
- **Deciders**: Platform Architecture Group
- **Related**: Checklist items 3.x (event bus), `packages/shared-events/src/outbox.ts`, `packages/shared-events/src/dlq.ts`, `infrastructure/kubernetes/jobs/kafka-topic-setup.yaml`, ADR-003 (redis-streams-event-bus), ADR-009 (booking-correctness-entities)

## Context

Stayflexi services publish domain events to Kafka when state changes
(bookings created, payments captured, cancellations processed, etc.).
Until this ADR, every service published events by calling the Kafka
producer inside the request handler, after the database write
committed. This produced three classes of bug:

1. **Lost events on partial failure.** If the DB write succeeded but
   the Kafka publish threw (broker outage, network partition, producer
   rebalance), the system state moved forward without notifying the
   rest of the platform. Downstream services (analytics, notification,
   workflow) missed the event and the platform's behaviour diverged
   from its model.
2. **Phantom events on partial failure.** If the Kafka publish succeeded
   and the DB write subsequently failed (a transaction rolled back
   after the publish), consumers saw an event for a state that never
   existed. This caused double-notifications and incorrect analytics
   counts.
3. **Inconsistent retry behaviour.** Some services retried the publish
   on failure, some surfaced the error to the user, some dropped the
   event silently. There was no DLQ and no per-event audit trail.

We need a publishing pattern that:

- makes the database write and the intent-to-publish atomic,
- guarantees at-least-once delivery to Kafka even if the broker is
  briefly unavailable,
- does not couple the publishing path to the request lifecycle, and
- provides a single, reviewable retry/DLQ policy.

## Decision

1. **Use the transactional outbox pattern for every domain event.**
   - The event row is written to an `OutboxEvent` table **inside the same
     database transaction** as the business state change.
   - A background relay polls `OutboxEvent` rows in `PENDING` status and
     publishes them to Kafka. After a successful publish the row is
     marked `PUBLISHED`.
   - The implementation lives in `@stayflexi/shared-events/outbox` and
     is used uniformly across services (no per-service outbox tables).

2. **OutboxEvent row shape.**
   - `id` (UUID), `aggregateId`, `aggregateType`, `eventType`, `topic`,
     `payload` (JSON), `status` (`PENDING` | `PUBLISHED` | `FAILED`),
     `retryCount`, `nextRetryAt`, `createdAt`, `updatedAt`.
   - `topic` is the Kafka topic; the relay publishes to whatever topic
     the row says — services do not push topic choice into the
     publisher.

3. **Two publishing modes.**
   - **`publishWithOutbox(topic, envelope)`** — for non-transactional
     paths (fire-and-forget). Writes the outbox row, then attempts an
     immediate publish. If the publish fails the row is left
     `PENDING` and the relay retries.
   - **`publishWithOutboxTx(tx, topic, envelope)`** — called inside a
     `prisma.$transaction(async (tx) => { … })` block. The row is
     written as part of the business transaction; if the transaction
     rolls back, the outbox row is rolled back too, so we never publish
     a phantom event.

4. **The relay is a background interval in each service.**
   - `OutboxService.startRelay(intervalMs = 5000)` polls every 5 s.
   - The interval is `unref`-ed so the relay never blocks process
     exit.
   - In production the relay runs inside each service's process; we do
     not run a separate relay deployment, to avoid a second failure
     domain and to keep ownership co-located with the data.

5. **Retry policy: exponential backoff with bounded attempts.**
   - `MAX_RETRIES = 3`, exponential backoff (1 s, 2 s, 4 s, 8 s, …),
     capped at 30 s.
   - On exhaustion the row is marked `FAILED` and the original payload
     is published to `stayflexi.<topic>.dlq` (and the legacy
     `<topic>.dlq` for back-compat) with reason + attempt count.
   - `stayflexi.<topic>.dlq` has 30-day retention; the legacy `<topic>.dlq`
     retains per topic defaults.

6. **Kafka producer remains idempotent.**
   - `KafkaEventPublisher` uses kafkajs's idempotent producer with
     internal retries (3 attempts, exponential factor 2, 100 ms
     initial). This protects against transient broker errors that the
     outbox relay would otherwise have to absorb.
   - The outbox is the second line of defence, not a replacement for
     idempotent producers.

7. **Consumers continue to use their own retry/DLQ helpers.**
   - The outbox is producer-side only. Consumer-side retries live in
     `@stayflexi/shared-events/dlq` and are unchanged by this ADR.
   - Consumers must be idempotent: the same `eventId` may be delivered
     twice if the publish succeeded but the mark-PUBLISHED update did
     not.

8. **Observability.**
   - Each publish and each relay batch logs a structured event with
     `outboxId`, `topic`, `eventType`, `retryCount`.
   - Metrics: `outbox_pending_count` (gauge), `outbox_published_total`,
     `outbox_dlq_total` (counter), `outbox_publish_latency_ms` (histogram).
   - Alert when `outbox_pending_count` exceeds a per-service threshold
     for more than 5 minutes — a stuck relay is a publish outage.

## Consequences

### Positive

- The "DB and event in one transaction" guarantee eliminates both the
  lost-event and phantom-event classes of bug.
- At-least-once delivery is automatic; transient Kafka outages are
  absorbed by the relay and the system continues to make progress.
- A single retry/DLQ policy is reviewable in one place
  (`packages/shared-events/src/outbox.ts`); per-service drift is
  prevented because every service uses the same code path.
- Replays become trivial: re-enqueue a `FAILED` row by resetting
  `status = PENDING` and the relay re-publishes it. Useful for
  post-incident recovery.
- Per-event audit: the `OutboxEvent` row persists for as long as the
  database retains it, providing a natural trail for compliance.

### Negative

- Every domain event adds one row to the `OutboxEvent` table; at high
  write rates this becomes a hot table. Mitigated by a daily
  partition-and-archive job that moves `PUBLISHED` rows older than 7
  days to cold storage.
- The relay adds 5 s of latency on the failure path (next tick after a
  publish fails); acceptable for at-least-once but not for hot
  real-time flows. Hot flows should still attempt a synchronous publish
  (`publishWithOutbox`) and rely on the relay only on failure.
- The outbox table is a coupling point between the application schema
  and the event bus; per-service schema extraction (a future ADR)
  will need to keep the outbox table in the same database as the
  business state.
- Consumers must be idempotent. This is a stronger contract than "best
  effort" but is the correct one for a financial system.

### Neutral

- The outbox table is provisioned per database (not per service), so
  the relay has to know which database to poll. Each service's relay
  is configured against its own Prisma client; no shared state.
- The outbox row is the canonical "intent to publish" — services must
  not call the Kafka producer directly for domain events. Direct
  publishing is reserved for operational events (e.g. health,
  deployment).

## Alternatives Considered

| Alternative                                                            | Why rejected                                                                                                                                                                                 |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Synchronous publish inside the request handler**                     | Subject to lost/phantom events on partial failure; no at-least-once guarantee; inconsistent retry behaviour across services.                                                                 |
| **Two-phase commit between Postgres and Kafka**                        | Kafka is not XA-capable; a 2PC coordinator would be a single point of failure and a perf cliff.                                                                                              |
| **Change Data Capture (Debezium → Kafka Connect)**                     | Strong but operationally heavy; requires a connector deployment, schema registry discipline, and a separate platform team. Re-evaluate when the outbox hot-path cost becomes a real problem. |
| **Per-service bespoke outbox tables**                                  | Duplicates the implementation, fragments the retry policy, and makes operational tooling (replay, metrics) harder.                                                                           |
| **Redis Streams as the outbox** (ADR-003)                              | Redis Streams is the consumer side's read model. The outbox needs transactional semantics with the application database; Postgres is the right place.                                        |
| **Publish-after-commit with a local "unpublished" file and a sidecar** | Two failure domains; harder to test; loses atomicity if the file is on ephemeral storage.                                                                                                    |

## Migration Plan

1. **Land the shared library.**
   - `packages/shared-events/src/outbox.ts` ships as part of the
     event-bus checklist work. This ADR formalises it as the canonical
     publishing pattern.

2. **Add the `OutboxEvent` table.**
   - Migration creates the table and indexes:
     - Unique on `id`.
     - Index on `(status, nextRetryAt)` for the relay scan.
     - Index on `(aggregateId, aggregateType)` for per-aggregate
       debugging.
   - Reversible: drop indexes and table.

3. **Replace direct Kafka calls in services.**
   - For each event-producing service:
     - Replace `kafkaProducer.send(...)` with
       `outbox.publishWithOutbox(...)` (non-transactional) or
       `outbox.publishWithOutboxTx(tx, ...)` (transactional).
     - Inside `prisma.$transaction` blocks, always use the `tx`
       variant.
     - Start the relay with `outbox.startRelay(5000)` in the service
       bootstrap.
   - One commit per service, with typecheck + unit tests.

4. **Backfill & observability.**
   - Add a Grafana panel for `outbox_pending_count`,
     `outbox_dlq_total`, and `outbox_publish_latency_ms`.
   - Configure the 5-minute pending-count alert per service.
   - Add a `scripts/replay-outbox.ts` helper that resets `FAILED` rows
     to `PENDING` for replay.

5. **Documentation.**
   - Add `docs/outbox.md` with usage examples for both variants.
   - Update the developer onboarding doc to point at this ADR.

6. **Deprecation.**
   - Once all twelve services are on the outbox, the direct producer
     access path is removed from the public API of
     `@stayflexi/shared-events`. Lint rule blocks `KafkaEventPublisher`
     imports outside the relay.

## References

- `packages/shared-events/src/outbox.ts` — `OutboxService`,
  `OutboxRepository`, `withRetry`
- `packages/shared-events/src/dlq.ts` — DLQ helpers
- `packages/shared-events/src/index.ts` — `IEventPublisher` interface
- `infrastructure/kubernetes/jobs/kafka-topic-setup.yaml` — DLQ and
  retry topic provisioning
- ADR-003 (redis-streams-event-bus) — consumer-side companion
- ADR-009 (booking-correctness-entities) — concrete consumer of the
  outbox pattern in the booking flow
