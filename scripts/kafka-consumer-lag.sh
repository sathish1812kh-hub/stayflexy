#!/usr/bin/env bash
# kafka-consumer-lag.sh — Check Kafka consumer group lag
# Usage: bash scripts/kafka-consumer-lag.sh [kafka-broker]
set -euo pipefail

KAFKA="${1:-kafka:9092}"

CONSUMER_GROUPS=(
  "workflow-service-consumer"
  "notification-service-booking-consumer"
)

echo ""
echo "Kafka Consumer Lag Report"
echo "Broker: $KAFKA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for group in "${CONSUMER_GROUPS[@]}"; do
  echo ""
  echo "Group: $group"
  kafka-consumer-groups \
    --bootstrap-server "$KAFKA" \
    --describe \
    --group "$group" 2>/dev/null || echo "  (not yet active)"
done

echo ""
echo "All consumer groups:"
kafka-consumer-groups \
  --bootstrap-server "$KAFKA" \
  --list 2>/dev/null

echo ""
echo "Topic list:"
kafka-topics \
  --bootstrap-server "$KAFKA" \
  --list 2>/dev/null
