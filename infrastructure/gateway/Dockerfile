# =============================================================================
# Stage 1: Install production dependencies
# =============================================================================
FROM node:20-alpine AS deps
WORKDIR /app
COPY infrastructure/gateway/package*.json ./
RUN npm install --only=production

# =============================================================================
# Stage 2: Build TypeScript
# =============================================================================
FROM node:20-alpine AS build
WORKDIR /app
COPY infrastructure/gateway/package*.json ./
RUN npm install
COPY infrastructure/gateway/tsconfig.json ./
COPY infrastructure/gateway/src/ ./src/
RUN npm run build

# =============================================================================
# Stage 3: Production runner
# =============================================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy compiled output from build stage
COPY --from=build /app/dist ./dist
# Copy package.json for metadata
COPY infrastructure/gateway/package.json ./package.json

# Run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S gateway -u 1001 -G nodejs
USER gateway

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:8080/health/live || exit 1

CMD ["node", "dist/index.js"]

# Build from monorepo root:
# docker build -f infrastructure/gateway/Dockerfile -t stayflexi/api-gateway .
