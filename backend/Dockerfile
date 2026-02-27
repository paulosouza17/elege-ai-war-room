# ═══════════════════════════════════════════════════════════════
#  Elege.ai WAR ROOM — Production Dockerfile
#  Multi-stage build for minimal image size
# ═══════════════════════════════════════════════════════════════

# ── Stage 1: Build ──
FROM node:20-alpine AS builder

WORKDIR /app

# Install build essentials for native modules (pdf-parse, etc)
RUN apk add --no-cache python3 make g++

# Copy package files first (better layer caching)
COPY package.json package-lock.json* ./

# Install ALL deps (including devDeps for tsc)
RUN npm ci --ignore-scripts 2>/dev/null || npm install
RUN npm rebuild

# Copy source
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npx tsc --skipLibCheck || npx tsc --skipLibCheck --noEmitOnError false

# ── Stage 2: Production ──
FROM node:20-alpine AS production

WORKDIR /app

# Security: non-root user
RUN addgroup -S warroom && adduser -S warroom -G warroom

# Install only runtime native deps
RUN apk add --no-cache curl tini

# Copy package files
COPY package.json package-lock.json* ./

# Install ONLY production deps
RUN npm ci --omit=dev --ignore-scripts 2>/dev/null || npm install --omit=dev
RUN npm rebuild

# Copy built JS from builder
COPY --from=builder /app/dist ./dist

# Copy ecosystem for PM2
COPY ecosystem.config.js ./

# Create log directory
RUN mkdir -p logs && chown -R warroom:warroom /app

# Install PM2 globally
RUN npm install -g pm2

# Switch to non-root user
USER warroom

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3000}/api/v1/health || exit 1

# Use tini as PID 1 (proper signal handling)
ENTRYPOINT ["/sbin/tini", "--"]

# Start via PM2
CMD ["pm2-runtime", "ecosystem.config.js", "--env", "production"]

EXPOSE 3000
