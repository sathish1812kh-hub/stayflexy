# ─── Stayflexi Next.js API Server ────────────────────────────────────────────
# Multi-stage build: deps → builder → runner
# Keeps the final image lean (no devDeps, no source maps in prod).

FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# ─── Stage 1: Install dependencies ───────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install --omit=optional

# ─── Stage 2: Build the application ──────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
# Build-time env stubs — overridden at runtime by docker-compose environment
ENV APP_NAME=stayflexi
ENV APP_VERSION=2.0.0
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV JWT_SECRET=build_time_placeholder_must_be_at_least_64_characters_long_for_validation_abc123
ENV API_BASE_URL=http://localhost:3000
RUN mkdir -p public
RUN npm run build

# ─── Stage 3: Production runner ───────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1/monitoring/status || exit 1

CMD ["node", "server.js"]
