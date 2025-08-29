#!/bin/bash

# SaaS X-Ray Production Deployment Script
# Handles deployment to production environment with proper checks and rollback capabilities

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1"
}

# Configuration
DOCKER_IMAGE="saas-xray"
DOCKER_TAG=${1:-latest}
ENV_FILE=${2:-.env.production}
COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_DIR="./backups"
DEPLOYMENT_LOG="./logs/deployment.log"

# Ensure log directory exists
mkdir -p "$(dirname "$DEPLOYMENT_LOG")"
mkdir -p "$BACKUP_DIR"

# Redirect all output to log file as well
exec > >(tee -a "$DEPLOYMENT_LOG")
exec 2>&1

log "🚀 Starting SaaS X-Ray production deployment..."
log "Docker Image: $DOCKER_IMAGE:$DOCKER_TAG"
log "Environment File: $ENV_FILE"
log "Compose File: $COMPOSE_FILE"

# Pre-deployment checks
pre_deployment_checks() {
    log "🔍 Running pre-deployment checks..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        error "Docker is not running"
        exit 1
    fi
    
    # Check if docker-compose is installed
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if environment file exists
    if [ ! -f "$ENV_FILE" ]; then
        error "Environment file $ENV_FILE not found"
        exit 1
    fi
    
    # Check if compose file exists
    if [ ! -f "$COMPOSE_FILE" ]; then
        error "Docker Compose file $COMPOSE_FILE not found"
        exit 1
    fi
    
    # Validate required environment variables
    source "$ENV_FILE"
    REQUIRED_VARS=(
        "DATABASE_URL"
        "REDIS_URL"
        "JWT_SECRET"
        "ENCRYPTION_KEY"
    )
    
    for var in "${REQUIRED_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            error "Required environment variable $var is not set in $ENV_FILE"
            exit 1
        fi
    done
    
    success "Pre-deployment checks passed"
}

# Create backup
create_backup() {
    log "💾 Creating backup..."
    
    BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
    BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
    
    # Create backup directory
    mkdir -p "$BACKUP_PATH"
    
    # Export current Docker volumes
    if docker-compose -f "$COMPOSE_FILE" ps -q postgres &> /dev/null; then
        log "Creating database backup..."
        docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_PATH/database.sql" || {
            warn "Failed to create database backup"
        }
    fi
    
    # Save current environment configuration
    if [ -f "$ENV_FILE" ]; then
        cp "$ENV_FILE" "$BACKUP_PATH/env.backup"
    fi
    
    # Save current docker-compose configuration
    cp "$COMPOSE_FILE" "$BACKUP_PATH/"
    
    log "Backup created at: $BACKUP_PATH"
    echo "$BACKUP_PATH" > ".last_backup"
}

# Build application
build_application() {
    log "🔨 Building application..."
    
    # Build Docker image
    docker build -t "$DOCKER_IMAGE:$DOCKER_TAG" .
    
    success "Application built successfully"
}

# Deploy application
deploy_application() {
    log "🚀 Deploying application..."
    
    # Pull latest images for dependencies
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull postgres redis
    
    # Start infrastructure services first
    log "Starting infrastructure services..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d postgres redis
    
    # Wait for infrastructure to be ready
    log "Waiting for infrastructure services..."
    sleep 30
    
    # Deploy application
    log "Starting application services..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d saas-xray
    
    # Wait for application to start
    log "Waiting for application to start..."
    sleep 30
    
    success "Application deployed successfully"
}

# Health check
health_check() {
    log "🏥 Running health checks..."
    
    # Check if services are running
    if ! docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
        error "Some services are not running"
        return 1
    fi
    
    # Check application health endpoint
    MAX_ATTEMPTS=30
    ATTEMPT=1
    
    while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
        if curl -f "http://localhost:${PORT:-3001}/health" &> /dev/null; then
            success "Health check passed"
            return 0
        fi
        
        warn "Health check failed (attempt $ATTEMPT/$MAX_ATTEMPTS). Waiting 10 seconds..."
        sleep 10
        ATTEMPT=$((ATTEMPT + 1))
    done
    
    error "Health check failed after $MAX_ATTEMPTS attempts"
    return 1
}

# Rollback function
rollback() {
    error "🔄 Deployment failed. Starting rollback..."
    
    # Stop current services
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
    
    # Restore from backup if available
    if [ -f ".last_backup" ]; then
        BACKUP_PATH=$(cat .last_backup)
        if [ -d "$BACKUP_PATH" ]; then
            log "Restoring from backup: $BACKUP_PATH"
            
            # Restore database if backup exists
            if [ -f "$BACKUP_PATH/database.sql" ]; then
                log "Restoring database..."
                docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d postgres
                sleep 20
                docker-compose -f "$COMPOSE_FILE" exec -T postgres psql -U "$DB_USER" "$DB_NAME" < "$BACKUP_PATH/database.sql" || {
                    warn "Failed to restore database backup"
                }
            fi
        fi
    fi
    
    error "Rollback completed. Please check logs and fix issues before retrying deployment."
    exit 1
}

# Cleanup old backups
cleanup_backups() {
    log "🧹 Cleaning up old backups..."
    
    # Keep only the last 5 backups
    if [ -d "$BACKUP_DIR" ]; then
        find "$BACKUP_DIR" -maxdepth 1 -type d -name "backup-*" | sort -r | tail -n +6 | xargs rm -rf
    fi
    
    success "Backup cleanup completed"
}

# Main deployment function
main() {
    trap rollback ERR
    
    pre_deployment_checks
    create_backup
    build_application
    deploy_application
    
    if health_check; then
        success "🎉 Deployment completed successfully!"
        cleanup_backups
    else
        rollback
    fi
}

# Help function
show_help() {
    echo "Usage: $0 [DOCKER_TAG] [ENV_FILE]"
    echo ""
    echo "Deploy SaaS X-Ray to production environment"
    echo ""
    echo "Arguments:"
    echo "  DOCKER_TAG    Docker image tag (default: latest)"
    echo "  ENV_FILE      Environment file path (default: .env.production)"
    echo ""
    echo "Examples:"
    echo "  $0                              # Deploy with default settings"
    echo "  $0 v1.0.0                       # Deploy specific version"
    echo "  $0 latest .env.staging          # Deploy to staging environment"
    echo ""
}

# Parse command line arguments
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    *)
        main
        ;;
esac