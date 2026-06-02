# Kafka Dead-Letter Queue (DLQ) Runbook

## DLQ Architecture

Every business event topic has a corresponding DLQ topic with 30-day retention:

| Primary Topic       | DLQ Topic               |
|---------------------|-------------------------|
| booking.events      | booking.events.dlq      |
| payment.events      | payment.events.dlq      |
| inventory.events    | inventory.events.dlq    |
| notification.events | notification.events.dlq |
| workflow.events     | workflow.events.dlq     |
| ota.events          | ota.events.dlq          |

Messages are routed to DLQ after **3 failed processing attempts** with exponential backoff (200ms, 400ms, 800ms).

---

## Monitoring DLQ Lag

```bash
# List all DLQ topics
kubectl exec -n stayflexi kafka-0 -- kafka-topics.sh \
  --bootstrap-server localhost:9092 \
  --list | grep ".dlq"

# Check message count in each DLQ
for topic in booking.events.dlq payment.events.dlq inventory.events.dlq notification.events.dlq workflow.events.dlq ota.events.dlq; do
  count=$(kubectl exec -n stayflexi kafka-0 -- kafka-run-class.sh kafka.tools.GetOffsetShell \
    --bootstrap-server localhost:9092 \
    --topic $topic --time -1 2>/dev/null | awk -F: '{sum += $3} END {print sum}')
  echo "$topic: $count messages"
done
```

---

## Inspecting DLQ Messages

```bash
# Read last 10 messages from booking DLQ
kubectl exec -n stayflexi kafka-0 -- kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic booking.events.dlq \
  --from-beginning \
  --max-messages 10 \
  --property print.headers=true | python3 -c "import sys,json; [print(json.dumps(json.loads(l), indent=2)) for l in sys.stdin if l.strip().startswith('{')]"
```

---

## Replaying DLQ Messages

**Only replay after fixing the root cause of failure.**

```bash
# Replay DLQ messages to the original topic
kubectl exec -n stayflexi kafka-0 -- kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic booking.events.dlq \
  --from-beginning \
  --timeout-ms 5000 | \
kubectl exec -i -n stayflexi kafka-0 -- kafka-console-producer.sh \
  --bootstrap-server localhost:9092 \
  --topic booking.events
```

---

## DLQ Alert Thresholds

| Condition | Action |
|-----------|--------|
| DLQ lag > 100 messages | Page on-call engineer |
| DLQ lag > 1,000 messages | Declare incident, pause writes |
| DLQ lag > 10,000 messages | Emergency freeze, rollback |

---

## Root Cause Classification

| DLQ Message Pattern | Root Cause | Fix |
|--------------------|-----------|-----|
| `failureReason: "DB connection reset"` | PostgreSQL transient failure | Wait for recovery, replay |
| `failureReason: "Downstream unavailable"` | Dependent service down | Fix service, replay |
| `failureReason: "Schema validation failed"` | Producer sent invalid payload | Fix producer, discard |
| `failureReason: "Unique constraint violation"` | Duplicate event already processed | Safe to discard |
| `failureReason: "Foreign key constraint"` | Event out-of-order | Replay after dependent event |
