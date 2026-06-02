# Event Architecture

## Event Envelope Format

Every event published to Redis Streams follows a flat field structure (Redis Streams store
maps of string key-value pairs). The logical envelope is:

```typescript
interface DomainEvent<T extends Record<string, unknown>> {
  eventId: string;           // UUIDv4, unique per event instance
  eventType: string;         // dot-namespaced e.g. "booking.created"
  aggregateId: string;       // ID of the primary entity e.g. booking ID
  aggregateType: string;     // Entity class e.g. "Booking"
  organizationId: string;    // Multi-tenant scope
  timestamp: string;         // ISO-8601 UTC
  version: string;           // Schema version, currently "1"
  payload: T;                // JSON-serialised domain payload
}
```

Stream key: `stayflexi:events:{eventType}`

Published via:
```typescript
redis.xadd(
  `stayflexi:events:${eventType}`,
  '*',                              // auto-generate stream ID
  'eventId',       eventId,
  'eventType',     eventType,
  'aggregateId',   aggregateId,
  'aggregateType', aggregateType,
  'organizationId', organizationId,
  'timestamp',     new Date().toISOString(),
  'version',       '1',
  'payload',       JSON.stringify(payload)
);
```

---

## Event Catalog

### booking.created

| Field           | Value                                   |
|-----------------|-----------------------------------------|
| Publisher       | booking-service                         |
| Consumers       | inventory-service, notification-service, analytics-service, workflow-service |
| Stream          | `stayflexi:events:booking.created`      |

Payload:
```json
{
  "bookingId": "uuid",
  "hotelId": "uuid",
  "roomId": "uuid",
  "roomTypeId": "uuid",
  "checkInDate": "YYYY-MM-DD",
  "checkOutDate": "YYYY-MM-DD",
  "guestEmail": "string",
  "totalAmount": 0.00,
  "source": "DIRECT | OTA | WALK_IN"
}
```

---

### booking.cancelled

| Field           | Value                                   |
|-----------------|-----------------------------------------|
| Publisher       | booking-service                         |
| Consumers       | inventory-service, notification-service, payment-service |
| Stream          | `stayflexi:events:booking.cancelled`    |

Payload:
```json
{
  "bookingId": "uuid",
  "hotelId": "uuid",
  "roomId": "uuid",
  "cancellationReason": "GUEST_REQUEST | NO_SHOW | HOTEL_REQUEST",
  "cancelledAt": "ISO-8601",
  "refundEligible": true
}
```

---

### booking.checked_in

| Field           | Value                                    |
|-----------------|------------------------------------------|
| Publisher       | booking-service                          |
| Consumers       | notification-service, workflow-service   |
| Stream          | `stayflexi:events:booking.checked_in`    |

Payload:
```json
{
  "bookingId": "uuid",
  "hotelId": "uuid",
  "roomIds": ["uuid"],
  "checkedInAt": "ISO-8601"
}
```

---

### booking.checked_out

| Field           | Value                                     |
|-----------------|-------------------------------------------|
| Publisher       | booking-service                           |
| Consumers       | inventory-service, analytics-service      |
| Stream          | `stayflexi:events:booking.checked_out`    |

Payload:
```json
{
  "bookingId": "uuid",
  "hotelId": "uuid",
  "roomIds": ["uuid"],
  "checkedOutAt": "ISO-8601",
  "finalAmount": 0.00
}
```

---

### payment.completed

| Field           | Value                                    |
|-----------------|------------------------------------------|
| Publisher       | payment-service                          |
| Consumers       | booking-service, notification-service, analytics-service |
| Stream          | `stayflexi:events:payment.completed`     |

Payload:
```json
{
  "paymentId": "uuid",
  "bookingId": "uuid",
  "hotelId": "uuid",
  "amount": 0.00,
  "currency": "USD",
  "paymentMethod": "CREDIT_CARD | CASH | UPI",
  "paidAt": "ISO-8601"
}
```

---

### payment.failed

| Field           | Value                                  |
|-----------------|----------------------------------------|
| Publisher       | payment-service                        |
| Consumers       | notification-service, workflow-service |
| Stream          | `stayflexi:events:payment.failed`      |

Payload:
```json
{
  "paymentId": "uuid",
  "bookingId": "uuid",
  "hotelId": "uuid",
  "amount": 0.00,
  "failureReason": "string",
  "attemptedAt": "ISO-8601"
}
```

---

### payment.refunded

| Field           | Value                                  |
|-----------------|----------------------------------------|
| Publisher       | payment-service                        |
| Consumers       | notification-service, analytics-service |
| Stream          | `stayflexi:events:payment.refunded`    |

Payload:
```json
{
  "refundId": "uuid",
  "paymentId": "uuid",
  "bookingId": "uuid",
  "refundAmount": 0.00,
  "reason": "string",
  "refundedAt": "ISO-8601"
}
```

---

### ota.sync.completed

| Field           | Value                                     |
|-----------------|-------------------------------------------|
| Publisher       | ota-service                               |
| Consumers       | analytics-service, workflow-service       |
| Stream          | `stayflexi:events:ota.sync.completed`     |

Payload:
```json
{
  "syncJobId": "uuid",
  "hotelId": "uuid",
  "providerId": "uuid",
  "syncType": "INVENTORY_PUSH | RATE_PUSH | RESERVATION_PULL",
  "recordsProcessed": 0,
  "recordsFailed": 0,
  "durationMs": 0
}
```

---

### ota.sync.failed

| Field           | Value                                 |
|-----------------|---------------------------------------|
| Publisher       | ota-service                           |
| Consumers       | workflow-service, notification-service |
| Stream          | `stayflexi:events:ota.sync.failed`    |

Payload:
```json
{
  "syncJobId": "uuid",
  "hotelId": "uuid",
  "providerId": "uuid",
  "syncType": "string",
  "errorMessage": "string",
  "retryCount": 0
}
```

---

### notification.sent

| Field           | Value                                  |
|-----------------|----------------------------------------|
| Publisher       | notification-service                   |
| Consumers       | analytics-service (metrics only)       |
| Stream          | `stayflexi:events:notification.sent`   |

Payload:
```json
{
  "notificationId": "uuid",
  "recipientId": "string",
  "channel": "EMAIL | SMS | WHATSAPP | IN_APP | PUSH",
  "subject": "string",
  "sentAt": "ISO-8601"
}
```

---

### workflow.executed

| Field           | Value                                   |
|-----------------|-----------------------------------------|
| Publisher       | workflow-service                        |
| Consumers       | analytics-service                       |
| Stream          | `stayflexi:events:workflow.executed`    |

Payload:
```json
{
  "executionId": "uuid",
  "ruleId": "uuid | null",
  "workflowName": "string",
  "triggerSource": "string",
  "executionStatus": "COMPLETED | FAILED",
  "durationMs": 0
}
```

---

### inventory.reserved

| Field           | Value                                    |
|-----------------|------------------------------------------|
| Publisher       | inventory-service                        |
| Consumers       | ota-service (availability push)          |
| Stream          | `stayflexi:events:inventory.reserved`    |

Payload:
```json
{
  "roomId": "uuid",
  "roomTypeId": "uuid",
  "hotelId": "uuid",
  "checkInDate": "YYYY-MM-DD",
  "checkOutDate": "YYYY-MM-DD",
  "bookingId": "uuid"
}
```

---

### inventory.released

| Field           | Value                                    |
|-----------------|------------------------------------------|
| Publisher       | inventory-service                        |
| Consumers       | ota-service (availability push)          |
| Stream          | `stayflexi:events:inventory.released`    |

Payload:
```json
{
  "roomId": "uuid",
  "hotelId": "uuid",
  "checkInDate": "YYYY-MM-DD",
  "checkOutDate": "YYYY-MM-DD",
  "reason": "CANCELLATION | CHECKOUT"
}
```

---

## Event Flows

### 1. Booking Creation

```
Client
  │
  ▼ POST /api/bookings
booking-service
  │── db.booking.create()
  │── db.roomInventory.update() (mark occupied)
  │── XADD booking.created ──────────────────────────────────┐
  │                                                          │
  │                               inventory-service <────────┤ consume booking.created
  │                                 └── update availability  │
  │                                                          │
  │                               notification-service <─────┤ consume booking.created
  │                                 └── send confirmation    │
  │                                                          │
  │                               workflow-service <─────────┘ evaluate automation rules
  │
  └── 201 { booking }
```

### 2. Booking Cancellation

```
Client
  │
  ▼ POST /api/bookings/:id/cancel
booking-service
  │── db.booking.update(status: CANCELLED)
  │── XADD booking.cancelled ──────────────────────┐
  │                                                │
  │                 inventory-service <────────────┤ consume booking.cancelled
  │                   └── XADD inventory.released  │
  │                                                │
  │                 notification-service <─────────┤ consume booking.cancelled
  │                   └── send cancellation email  │
  │                                                │
  │                 payment-service <──────────────┘ consume booking.cancelled
  │                   └── process refund if eligible
  │
  └── 200 { booking }
```

### 3. Payment Flow

```
Client
  │
  ▼ POST /api/payments
payment-service
  │── db.payment.create()
  │── XADD payment.completed ──────────────────────┐
  │                                                │
  │                 booking-service <──────────────┤ consume payment.completed
  │                   └── update paymentStatus     │
  │                                                │
  │                 notification-service <─────────┤ consume payment.completed
  │                   └── send receipt             │
  │                                                │
  │                 analytics-service <────────────┘ update revenue metrics
  │
  └── 201 { payment }
```

### 4. OTA Sync

```
Client (or scheduler)
  │
  ▼ POST /api/ota/sync/inventory
ota-service
  │── db.syncJob.create()
  │── db.syncEvent.create(SYNC_STARTED)
  │── [simulate sync with OTA API]
  │── db.syncJob.update(SUCCESS)
  │── db.syncEvent.create(SYNC_COMPLETED)
  │── db.oTAMapping.updateMany(lastSyncedAt)
  │── XADD ota.sync.completed ──────────────┐
  │                                         │
  │              analytics-service <────────┤ consume ota.sync.completed
  │                └── update OTA metrics   │
  │                                         │
  │              workflow-service <──────────┘ evaluate OTA_SYNC automation rules
  │
  └── 201 { syncJob }
```

---

## Consumer Groups and Idempotency

### Redis XREADGROUP

Consumers use named consumer groups to ensure each event is processed exactly once per group:

```bash
# Create group (idempotent)
XGROUP CREATE stayflexi:events:booking.created notification-service $ MKSTREAM

# Consume
XREADGROUP GROUP notification-service consumer-1 COUNT 10 BLOCK 2000
  STREAMS stayflexi:events:booking.created >

# Acknowledge after successful processing
XACK stayflexi:events:booking.created notification-service <stream-id>
```

Multiple services consuming the same stream each have their own consumer group, so
`booking.created` is independently delivered to `notification-service`,
`inventory-service`, and `workflow-service`.

### Idempotency Keys

Business-level deduplication uses idempotency keys stored in PostgreSQL:

- `SyncJob.idempotencyKey` — format: `{hotelId}:{providerId}:{syncType}:{startDate}:{endDate}`
- `WorkflowExecution.idempotencyKey` — UUIDv4 per manual trigger; event-driven executions
  use `{eventId}:{ruleId}` to prevent replay duplicates
- `BackgroundJob.idempotencyKey` — prevents duplicate job submission

If a duplicate key is detected, the service returns the existing record with HTTP 200 rather
than creating a duplicate.

---

## Dead Letter Queue

Failed events (after `maxRetries` attempts) are moved to a dead-letter stream:

Stream: `stayflexi:events:dlq`

The DLQ entry preserves the original event plus failure metadata:

```json
{
  "originalStream": "stayflexi:events:booking.created",
  "originalId": "<stream-id>",
  "originalEvent": { "...original fields..." },
  "failureReason": "string",
  "failedAt": "ISO-8601",
  "attemptCount": 3,
  "consumerGroup": "notification-service"
}
```

A dedicated `dlq-monitor` process reads from `stayflexi:events:dlq` and:
1. Alerts on-call via PagerDuty
2. Stores a `BackgroundJob` record with `jobStatus: DEAD_LETTER` for audit
3. Provides a manual replay UI in the admin dashboard
