# Stayflexi Deployment Runbook

## Pre-Deployment Checklist

### Secrets validation
```bash
# Verify all base64 placeholders are replaced
kubectl get secret stayflexi-app-secrets -n stayflexi -o json | jq '.data | to_entries[] | select(.value | @base64d | test("placeholder|CHANGE_ME|base64"))'
# Should return empty — no placeholder values
```

### Database migration
```bash
# Run migration job before deploying services
kubectl apply -f infrastructure/kubernetes/jobs/prisma-migrate.yaml
kubectl wait --for=condition=complete job/prisma-migrate -n stayflexi --timeout=300s
```

### Kafka topic setup
```bash
# Create/verify topics with correct retention (run once after Kafka cluster is ready)
kubectl apply -f infrastructure/kubernetes/jobs/kafka-topic-setup.yaml
kubectl wait --for=condition=complete job/kafka-topic-setup -n stayflexi --timeout=120s
```

---

## Rolling Deployment (Production)

Services deploy in dependency order. Each must reach Ready before the next tier starts.

**Tier 1 (foundation):**
```bash
kubectl set image deployment/auth-service auth-service=ghcr.io/stayflexi/auth-service:$TAG -n stayflexi
kubectl set image deployment/organization-service organization-service=ghcr.io/stayflexi/organization-service:$TAG -n stayflexi
kubectl rollout status deployment/auth-service -n stayflexi --timeout=120s
kubectl rollout status deployment/organization-service -n stayflexi --timeout=120s
```

**Tier 2 (domain services):**
```bash
for svc in hotel-service inventory-service; do
  kubectl set image deployment/$svc $svc=ghcr.io/stayflexi/$svc:$TAG -n stayflexi
  kubectl rollout status deployment/$svc -n stayflexi --timeout=120s
done
```

**Tier 3 (transaction services):**
```bash
for svc in booking-service payment-service; do
  kubectl set image deployment/$svc $svc=ghcr.io/stayflexi/$svc:$TAG -n stayflexi
  kubectl rollout status deployment/$svc -n stayflexi --timeout=120s
done
```

**Tier 4 (integration services):**
```bash
for svc in ota-service analytics-service notification-service workflow-service; do
  kubectl set image deployment/$svc $svc=ghcr.io/stayflexi/$svc:$TAG -n stayflexi
done
kubectl rollout status deployment/ota-service deployment/analytics-service deployment/notification-service deployment/workflow-service -n stayflexi --timeout=120s
```

---

## Rollback Procedure

```bash
# Roll back all services atomically on failure
for svc in auth-service organization-service hotel-service inventory-service booking-service payment-service ota-service analytics-service notification-service workflow-service; do
  kubectl rollout undo deployment/$svc -n stayflexi
done

# Verify rollback complete
for svc in auth-service organization-service hotel-service inventory-service booking-service payment-service; do
  kubectl rollout status deployment/$svc -n stayflexi
done
```

---

## Health Validation Post-Deployment

```bash
# Check all service health endpoints
SERVICES=(
  "auth-service:3001"
  "organization-service:3002"
  "hotel-service:3003"
  "inventory-service:3004"
  "booking-service:3005"
  "payment-service:3006"
  "ota-service:3007"
  "analytics-service:3008"
  "notification-service:3009"
  "workflow-service:3010"
)

for entry in "${SERVICES[@]}"; do
  svc="${entry%%:*}"
  port="${entry##*:}"
  kubectl exec -n stayflexi deploy/$svc -- wget -qO- http://localhost:$port/health/live
done
```

---

## Kafka Consumer Lag Monitoring

```bash
# Check consumer group lag for all service groups
for group in booking-service payment-service notification-service workflow-service analytics-service ota-service; do
  kubectl exec -n stayflexi kafka-0 -- kafka-consumer-groups.sh \
    --bootstrap-server localhost:9092 \
    --group $group \
    --describe
done
```

**Alert threshold:** LAG > 10,000 messages — investigate consumer health immediately.

---

## Redis Health Check

```bash
# Verify Redis connectivity and memory usage
kubectl exec -n stayflexi deploy/auth-service -- sh -c \
  'redis-cli -u $REDIS_URL info memory | grep used_memory_human'

# Check for stale locks (locks older than 5 minutes)
kubectl exec -n stayflexi deploy/booking-service -- sh -c \
  'redis-cli -u $REDIS_URL keys "stayflexi:lock:*" | wc -l'
```

---

## Observability Validation

```bash
# Verify Prometheus scraping is working
curl -s http://prometheus.observability:9090/api/v1/targets | \
  jq '.data.activeTargets[] | select(.labels.job == "stayflexi-services") | {job: .labels.job, instance: .labels.instance, health: .health}'

# Check Jaeger traces are arriving
curl -s "http://jaeger.observability:16686/api/services" | jq '.data[]'

# Verify /metrics endpoints are responding
for port in 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010; do
  kubectl exec -n stayflexi deploy/api-gateway -- wget -qO- http://localhost:$port/metrics | head -5
done
```
