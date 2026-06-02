#!/usr/bin/env bash
# setup-local.sh — Bootstrap local development environment
# Usage: bash scripts/setup-local.sh
set -euo pipefail

RESET='\033[0m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'

info()    { echo -e "${BLUE}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; exit 1; }

check_command() {
  command -v "$1" &>/dev/null || error "Required command not found: $1"
}

# ── Prerequisites check ────────────────────────────────────────────────────────
info "Checking prerequisites..."
check_command node
check_command npm
check_command docker

NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
[[ "$NODE_VERSION" -ge 20 ]] || error "Node.js 20+ required (found: $(node --version))"
success "Node.js $(node --version)"

DOCKER_RUNNING=$(docker info &>/dev/null && echo "yes" || echo "no")
[[ "$DOCKER_RUNNING" == "yes" ]] || error "Docker is not running"
success "Docker running"

# ── Start infrastructure ────────────────────────────────────────────────────────
info "Starting infrastructure (Postgres, Redis)..."
docker compose -f docker-compose.yml up -d postgres redis

info "Waiting for Postgres to be ready..."
for i in $(seq 1 30); do
  docker compose -f docker-compose.yml exec -T postgres \
    pg_isready -U stayflexi -d stayflexi > /dev/null 2>&1 && break
  [[ "$i" -eq 30 ]] && error "Postgres did not become ready in time"
  sleep 2
done
success "Postgres ready"

info "Waiting for Redis to be ready..."
for i in $(seq 1 15); do
  docker compose -f docker-compose.yml exec -T redis redis-cli ping > /dev/null 2>&1 && break
  [[ "$i" -eq 15 ]] && error "Redis did not become ready in time"
  sleep 1
done
success "Redis ready"

# ── Install dependencies ────────────────────────────────────────────────────────
info "Installing shared package dependencies..."
for pkg in shared-types shared-errors shared-logger shared-config shared-auth \
           shared-events shared-validation shared-database; do
  (cd "packages/$pkg" && npm install --silent) && success "  packages/$pkg"
done

info "Installing service dependencies..."
for svc in auth-service organization-service hotel-service inventory-service \
           booking-service payment-service ota-service analytics-service \
           notification-service workflow-service; do
  (cd "services/$svc" && npm install --silent) && success "  services/$svc"
done

# ── Run migrations ─────────────────────────────────────────────────────────────
info "Running Prisma migrations..."
# Use auth-service as migration runner since it has Prisma installed
DATABASE_URL="postgresql://stayflexi:stayflexi_dev@localhost:5432/stayflexi" \
  npx prisma migrate deploy \
  --schema=src/database/prisma/schema.prisma 2>/dev/null || \
  warn "Migration failed — database may not yet be fully configured. Run manually: npx prisma migrate deploy"

# ── Create .env files for each service ────────────────────────────────────────
info "Creating .env files for services (from .env.example)..."
for svc in auth-service organization-service hotel-service inventory-service \
           booking-service payment-service ota-service analytics-service \
           notification-service workflow-service; do
  ENV_FILE="services/$svc/.env"
  EXAMPLE_FILE="services/$svc/.env.example"
  if [[ -f "$EXAMPLE_FILE" && ! -f "$ENV_FILE" ]]; then
    cp "$EXAMPLE_FILE" "$ENV_FILE"
    success "  services/$svc/.env created from .env.example"
  elif [[ -f "$ENV_FILE" ]]; then
    warn "  services/$svc/.env already exists — skipping"
  fi
done

# ── Summary ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${GREEN}  Local development environment ready${RESET}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""
echo "  Infrastructure: docker compose -f docker-compose.yml up -d"
echo "  Run a service:  cd services/<name> && npm run dev"
echo ""
echo "  Service ports:"
echo "    API Gateway     http://localhost:8080"
echo "    Auth Service    http://localhost:3001"
echo "    Hotel Service   http://localhost:3003"
echo "    Booking Service http://localhost:3005"
echo "    Payment Service http://localhost:3006"
echo ""
echo "  Run all tests:  cd services/<name> && npm test"
echo "  Type check:     cd services/<name> && npm run type-check"
echo ""
