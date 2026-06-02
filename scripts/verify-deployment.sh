#!/usr/bin/env bash
# verify-deployment.sh — Verify all services are healthy after deployment
# Usage: bash scripts/verify-deployment.sh [namespace]
set -euo pipefail

NAMESPACE="${1:-stayflexi}"
RESET='\033[0m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'

PASS=0
FAIL=0

check() {
  local svc=$1
  local desired
  local available
  desired=$(kubectl get deployment "$svc" -n "$NAMESPACE" \
    -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
  available=$(kubectl get deployment "$svc" -n "$NAMESPACE" \
    -o jsonpath='{.status.availableReplicas}' 2>/dev/null || echo "0")

  if [[ "$available" -ge "$desired" && "$desired" -gt "0" ]]; then
    echo -e "  ${GREEN}✓${RESET} $svc ($available/$desired replicas)"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✗${RESET} $svc ($available/$desired replicas)"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "Verifying deployments in namespace: $NAMESPACE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for svc in api-gateway auth-service organization-service hotel-service \
           inventory-service booking-service payment-service ota-service \
           analytics-service notification-service workflow-service; do
  check "$svc"
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [[ "$FAIL" -gt 0 ]]; then
  echo -e "${RED}FAIL: $FAIL service(s) not healthy ($PASS passed)${RESET}"
  echo ""
  echo "Troubleshoot with:"
  echo "  kubectl get pods -n $NAMESPACE"
  echo "  kubectl describe deployment <name> -n $NAMESPACE"
  echo "  kubectl logs -l app=<name> -n $NAMESPACE --tail=50"
  exit 1
else
  echo -e "${GREEN}All $PASS services healthy${RESET}"
fi

# Check HPA status
echo ""
echo "HPA status:"
kubectl get hpa -n "$NAMESPACE" 2>/dev/null | head -20 || \
  echo -e "  ${YELLOW}HPA not available or not configured${RESET}"

# Check recent events
echo ""
echo "Recent warning events:"
kubectl get events -n "$NAMESPACE" \
  --field-selector type=Warning \
  --sort-by='.lastTimestamp' 2>/dev/null | tail -10 || true
