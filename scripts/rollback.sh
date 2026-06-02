#!/usr/bin/env bash
# rollback.sh — Emergency rollback for all or individual services
# Usage:
#   bash scripts/rollback.sh                    # rollback all services
#   bash scripts/rollback.sh booking-service    # rollback single service
set -euo pipefail

NAMESPACE="${KUBE_NAMESPACE:-stayflexi}"
SERVICE="${1:-}"

RESET='\033[0m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'

ALL_SERVICES=(
  api-gateway
  auth-service
  organization-service
  hotel-service
  inventory-service
  booking-service
  payment-service
  ota-service
  analytics-service
  notification-service
  workflow-service
)

do_rollback() {
  local svc=$1
  echo -n "  Rolling back $svc... "
  if kubectl rollout undo deployment/"$svc" -n "$NAMESPACE" 2>/dev/null; then
    echo -e "${GREEN}done${RESET}"
    return 0
  else
    echo -e "${RED}failed${RESET}"
    return 1
  fi
}

wait_for_rollback() {
  local svc=$1
  echo -n "  Waiting for $svc... "
  if kubectl rollout status deployment/"$svc" -n "$NAMESPACE" --timeout=120s 2>/dev/null; then
    echo -e "${GREEN}ready${RESET}"
  else
    echo -e "${YELLOW}timeout — check manually${RESET}"
  fi
}

echo ""
echo -e "${YELLOW}⚠ ROLLBACK INITIATED${RESET}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Namespace: $NAMESPACE"
echo ""

if [[ -n "$SERVICE" ]]; then
  echo "Issuing rollback for: $SERVICE"
  do_rollback "$SERVICE"
  wait_for_rollback "$SERVICE"
else
  echo "Issuing rollback for ALL services..."
  FAILED=()
  for svc in "${ALL_SERVICES[@]}"; do
    do_rollback "$svc" || FAILED+=("$svc")
  done

  echo ""
  echo "Waiting for rollouts to complete..."
  for svc in "${ALL_SERVICES[@]}"; do
    wait_for_rollback "$svc"
  done

  echo ""
  if [[ ${#FAILED[@]} -gt 0 ]]; then
    echo -e "${RED}Rollback failed for: ${FAILED[*]}${RESET}"
    echo "Check manually: kubectl describe deployment <name> -n $NAMESPACE"
    exit 1
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}Rollback complete${RESET}"
echo ""
echo "Verify status:"
echo "  kubectl get deployments -n $NAMESPACE"
echo "  bash scripts/verify-deployment.sh $NAMESPACE"
echo ""
echo "Check revision history:"
echo "  kubectl rollout history deployment/booking-service -n $NAMESPACE"
