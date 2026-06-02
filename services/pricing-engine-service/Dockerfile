# Build from monorepo root: docker build -f services/pricing-engine-service/Dockerfile .

# ─── Stage 1: Production dependencies ─────────────────────────────────────────
FROM node:20-alpine AS deps
ENV NPM_CONFIG_IGNORE_SCRIPTS=true
ENV NPM_CONFIG_LEGACY_PEER_DEPS=true
RUN apk add --no-cache libc6-compat
WORKDIR /workspace
COPY packages ./packages
WORKDIR /workspace/services/pricing-engine-service
COPY services/pricing-engine-service/package*.json ./
RUN npm install --only=production

# ─── Stage 2: TypeScript build ─────────────────────────────────────────────────
FROM node:20-alpine AS build
ENV NPM_CONFIG_IGNORE_SCRIPTS=true
ENV NPM_CONFIG_LEGACY_PEER_DEPS=true
RUN apk add --no-cache libc6-compat
WORKDIR /workspace
COPY packages ./packages
WORKDIR /workspace/services/pricing-engine-service
COPY services/pricing-engine-service/package*.json ./
RUN npm install
COPY services/pricing-engine-service/tsconfig.json ./
COPY services/pricing-engine-service/src ./src
RUN npm run build || true

# ─── Stage 3: Runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S appuser && adduser -S -u 1001 -G appuser appuser
USER appuser

# Copy shared packages for potential runtime resolution
COPY --from=build /workspace/packages /packages
COPY --from=deps /workspace/services/pricing-engine-service/node_modules ./node_modules
COPY --from=build /workspace/services/pricing-engine-service/dist ./dist
COPY services/pricing-engine-service/package.json ./

EXPOSE 3011

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3011/health/live || exit 1

CMD ["node", "dist/main.js"]
