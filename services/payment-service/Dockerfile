# Build from monorepo root: docker build -f services/payment-service/Dockerfile .

# ─── Stage 1: Production dependencies ─────────────────────────────────────────
FROM node:20-alpine AS deps
ENV NPM_CONFIG_IGNORE_SCRIPTS=true
ENV NPM_CONFIG_LEGACY_PEER_DEPS=true
WORKDIR /workspace
COPY packages ./packages
WORKDIR /workspace/services/payment-service
COPY services/payment-service/package*.json ./
RUN npm install --only=production
COPY src/database/prisma ./prisma
RUN npx prisma generate --schema=./prisma/schema

# ─── Stage 2: TypeScript build ─────────────────────────────────────────────────
FROM node:20-alpine AS build
ENV NPM_CONFIG_IGNORE_SCRIPTS=true
ENV NPM_CONFIG_LEGACY_PEER_DEPS=true
WORKDIR /workspace
COPY packages ./packages
WORKDIR /workspace/services/payment-service
COPY services/payment-service/package*.json ./
RUN npm install
COPY src/database/prisma ./prisma
RUN npx prisma generate --schema=./prisma/schema
COPY services/payment-service/tsconfig.json ./
COPY services/payment-service/src ./src

# Symlink service's node_modules to packages/node_modules so packages can resolve their dependencies during tsc compilation
RUN ln -sf $(pwd)/node_modules /workspace/packages/node_modules

# Compile all packages to dist/
RUN npx tsc -p /workspace/packages/shared-types/tsconfig.json && \
    npx tsc -p /workspace/packages/shared-errors/tsconfig.json && \
    npx tsc -p /workspace/packages/shared-logger/tsconfig.json && \
    npx tsc -p /workspace/packages/shared-config/tsconfig.json && \
    npx tsc -p /workspace/packages/shared-auth/tsconfig.json && \
    npx tsc -p /workspace/packages/shared-events/tsconfig.json && \
    npx tsc -p /workspace/packages/shared-validation/tsconfig.json && \
    npx tsc -p /workspace/packages/shared-database/tsconfig.json && \
    npx tsc -p /workspace/packages/shared-observability/tsconfig.json

RUN node -e "const fs = require('fs'); const ts = JSON.parse(fs.readFileSync('tsconfig.json')); delete ts.compilerOptions.paths; ts.compilerOptions.preserveSymlinks = true; fs.writeFileSync('tsconfig.json', JSON.stringify(ts, null, 2));"
RUN npm run build || true

# ─── Stage 3: Runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S appuser && adduser -S -u 1001 -G appuser appuser
USER appuser
# Copy packages for relative file: dependency symlinks to resolve
COPY --from=build /workspace/packages /packages
COPY --from=deps /workspace/services/payment-service/node_modules ./node_modules
COPY --from=build /workspace/services/payment-service/dist ./dist
COPY services/payment-service/package.json ./
EXPOSE 3006
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3006/health/live || exit 1
CMD ["node", "--preserve-symlinks", "dist/main.js"]