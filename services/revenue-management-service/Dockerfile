# Build from monorepo root: docker build -f services/revenue-management-service/Dockerfile .

# ─── Stage 1: Production dependencies ─────────────────────────────────────────
FROM node:20-alpine AS deps
ENV NPM_CONFIG_IGNORE_SCRIPTS=true
ENV NPM_CONFIG_LEGACY_PEER_DEPS=true
RUN apk add --no-cache libc6-compat
WORKDIR /workspace
COPY packages ./packages
WORKDIR /workspace/services/revenue-management-service
COPY services/revenue-management-service/package*.json ./
RUN npm install --only=production

# ─── Stage 2: TypeScript build ─────────────────────────────────────────────────
FROM node:20-alpine AS build
ENV NPM_CONFIG_IGNORE_SCRIPTS=true
ENV NPM_CONFIG_LEGACY_PEER_DEPS=true
RUN apk add --no-cache libc6-compat
WORKDIR /workspace
COPY packages ./packages
WORKDIR /workspace/services/revenue-management-service
COPY services/revenue-management-service/package*.json ./
RUN npm install
COPY services/revenue-management-service/tsconfig.json ./
COPY services/revenue-management-service/src ./src
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
COPY --from=deps /workspace/services/revenue-management-service/node_modules ./node_modules
COPY --from=build /workspace/services/revenue-management-service/dist ./dist
COPY services/revenue-management-service/package.json ./

EXPOSE 3012

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3012/health/live || exit 1

CMD ["node", "dist/main.js"]
