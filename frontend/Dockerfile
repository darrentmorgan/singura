# Multi-stage build for React frontend
FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S frontend -u 1001 -G nodejs

# Development dependencies stage
FROM base AS dev-deps
COPY package*.json ./
RUN npm ci

# Production dependencies stage
FROM base AS prod-deps
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Development stage
FROM base AS development
COPY --from=dev-deps /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .
USER nodejs
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build
COPY --from=dev-deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production stage with nginx
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# Default to development stage
FROM development AS default