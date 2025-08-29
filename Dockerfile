# Multi-stage Dockerfile for SaaS X-Ray Production Deployment
# Optimized for security, performance, and minimal attack surface

# =============================================
# Stage 1: Build Dependencies
# =============================================
FROM node:20-alpine AS dependencies

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache \
  dumb-init \
  curl \
  && rm -rf /var/cache/apk/*

# Create app directory and user
WORKDIR /app
RUN addgroup -g 1001 -S saasxray && \
    adduser -S saasxray -u 1001

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install all dependencies
RUN npm ci --only=production && \
    cd backend && npm ci --only=production && \
    cd ../frontend && npm ci --only=production

# =============================================
# Stage 2: Build Backend
# =============================================
FROM node:20-alpine AS backend-builder

WORKDIR /app

# Copy package files and dependencies
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/backend/node_modules ./backend/node_modules

# Copy backend source
COPY backend ./backend

# Build backend
RUN cd backend && npm run build

# =============================================
# Stage 3: Build Frontend
# =============================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy package files and dependencies
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/frontend/node_modules ./frontend/node_modules

# Copy frontend source
COPY frontend ./frontend

# Build frontend with production optimizations
RUN cd frontend && \
    NODE_ENV=production npm run build

# =============================================
# Stage 4: Production Runtime
# =============================================
FROM node:20-alpine AS production

# Install security updates and minimal runtime dependencies
RUN apk update && apk upgrade && apk add --no-cache \
  dumb-init \
  curl \
  tini \
  && rm -rf /var/cache/apk/*

# Create app directory and non-root user
WORKDIR /app
RUN addgroup -g 1001 -S saasxray && \
    adduser -S saasxray -u 1001

# Copy production dependencies
COPY --from=dependencies --chown=saasxray:saasxray /app/node_modules ./node_modules
COPY --from=dependencies --chown=saasxray:saasxray /app/backend/node_modules ./backend/node_modules

# Copy built backend
COPY --from=backend-builder --chown=saasxray:saasxray /app/backend/dist ./backend/dist
COPY --from=backend-builder --chown=saasxray:saasxray /app/backend/package*.json ./backend/

# Copy built frontend
COPY --from=frontend-builder --chown=saasxray:saasxray /app/frontend/dist ./frontend/dist

# Copy configuration files
COPY --chown=saasxray:saasxray package*.json ./
COPY --chown=saasxray:saasxray docker-entrypoint.sh ./

# Make entrypoint executable
RUN chmod +x docker-entrypoint.sh

# Create necessary directories
RUN mkdir -p /app/logs && \
    mkdir -p /app/uploads && \
    chown -R saasxray:saasxray /app

# Switch to non-root user
USER saasxray

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3001}/health || exit 1

# Expose port
EXPOSE ${PORT:-3001}

# Use tini as entrypoint for proper signal handling
ENTRYPOINT ["tini", "--", "./docker-entrypoint.sh"]

# Default command
CMD ["npm", "run", "start:prod"]