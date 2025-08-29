# Multi-stage build for Node.js backend
FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    curl \
    dumb-init

# Set working directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S backend -u 1001 -G nodejs

# Development stage
FROM base AS dev-deps
COPY package*.json ./
RUN npm ci --include=dev

# Production dependencies stage
FROM base AS prod-deps
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Development stage
FROM base AS development
COPY --from=dev-deps /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .
USER nodejs
EXPOSE 3001
CMD ["dumb-init", "npm", "run", "dev"]

# Build stage (if needed for compiled assets)
FROM base AS build
COPY --from=dev-deps /app/node_modules ./node_modules
COPY . .
RUN npm run build 2>/dev/null || echo "No build step defined"

# Production stage
FROM base AS production
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

EXPOSE 3001
CMD ["dumb-init", "node", "src/server.js"]

# Default to development stage
FROM development AS default