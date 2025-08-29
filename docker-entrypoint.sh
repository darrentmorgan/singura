#!/bin/sh
# SaaS X-Ray Docker Entrypoint Script
# Handles initialization, database migrations, and service startup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
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

# Environment validation
validate_environment() {
    log "🔍 Validating environment variables..."
    
    # Required environment variables
    REQUIRED_VARS="DATABASE_URL REDIS_URL JWT_SECRET ENCRYPTION_KEY"
    MISSING_VARS=""
    
    for var in $REQUIRED_VARS; do
        if [ -z "$(eval echo \$$var)" ]; then
            MISSING_VARS="$MISSING_VARS $var"
        fi
    done
    
    if [ -n "$MISSING_VARS" ]; then
        error "Missing required environment variables:$MISSING_VARS"
        error "Please set all required environment variables and restart."
        exit 1
    fi
    
    # Validate DATABASE_URL format
    if ! echo "$DATABASE_URL" | grep -qE '^postgresql://'; then
        error "DATABASE_URL must start with postgresql://"
        exit 1
    fi
    
    # Validate REDIS_URL format
    if ! echo "$REDIS_URL" | grep -qE '^redis://'; then
        error "REDIS_URL must start with redis://"
        exit 1
    fi
    
    success "Environment validation passed"
}

# Database connectivity check
check_database() {
    log "🔌 Checking database connectivity..."
    
    # Extract database connection details
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\).*/\1/p')
    DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    
    if [ -z "$DB_PORT" ]; then
        DB_PORT=5432
    fi
    
    # Wait for database to be ready
    max_attempts=30
    attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
            success "Database is reachable at $DB_HOST:$DB_PORT"
            return 0
        fi
        
        warn "Database not ready (attempt $attempt/$max_attempts). Waiting 2 seconds..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    error "Database is not reachable after $max_attempts attempts"
    exit 1
}

# Redis connectivity check
check_redis() {
    log "📦 Checking Redis connectivity..."
    
    # Extract Redis connection details
    REDIS_HOST=$(echo "$REDIS_URL" | sed -n 's/.*@\([^:]*\).*/\1/p')
    if [ -z "$REDIS_HOST" ]; then
        REDIS_HOST=$(echo "$REDIS_URL" | sed -n 's/redis:\/\/\([^:]*\).*/\1/p')
    fi
    
    REDIS_PORT=$(echo "$REDIS_URL" | sed -n 's/.*:\([0-9]*\).*/\1/p')
    if [ -z "$REDIS_PORT" ]; then
        REDIS_PORT=6379
    fi
    
    # Wait for Redis to be ready
    max_attempts=30
    attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if nc -z "$REDIS_HOST" "$REDIS_PORT" 2>/dev/null; then
            success "Redis is reachable at $REDIS_HOST:$REDIS_PORT"
            return 0
        fi
        
        warn "Redis not ready (attempt $attempt/$max_attempts). Waiting 2 seconds..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    error "Redis is not reachable after $max_attempts attempts"
    exit 1
}

# Run database migrations
run_migrations() {
    log "🗄️  Running database migrations..."
    
    cd backend
    
    if npm run migrate > /tmp/migrate.log 2>&1; then
        success "Database migrations completed successfully"
    else
        error "Database migrations failed. Check logs:"
        cat /tmp/migrate.log >&2
        exit 1
    fi
    
    cd ..
}

# Initialize application data
initialize_data() {
    log "⚡ Initializing application data..."
    
    # Create default organization if none exists
    if [ "$SKIP_INIT" != "true" ]; then
        cd backend
        
        # Check if initialization script exists and run it
        if [ -f "scripts/init-data.js" ]; then
            log "Running data initialization script..."
            if node scripts/init-data.js > /tmp/init.log 2>&1; then
                success "Data initialization completed"
            else
                warn "Data initialization failed (this may be expected if data already exists)"
                cat /tmp/init.log
            fi
        fi
        
        cd ..
    fi
}

# Start background services
start_services() {
    log "🚀 Starting background services..."
    
    # Start worker process in background
    if [ "$SKIP_WORKER" != "true" ]; then
        log "Starting background worker..."
        cd backend && npm run worker > /app/logs/worker.log 2>&1 &
        WORKER_PID=$!
        echo $WORKER_PID > /tmp/worker.pid
        log "Worker started with PID: $WORKER_PID"
        cd ..
    fi
}

# Setup signal handlers for graceful shutdown
setup_signal_handlers() {
    trap 'shutdown_handler' TERM INT
}

# Graceful shutdown handler
shutdown_handler() {
    log "📶 Received shutdown signal, performing graceful shutdown..."
    
    # Stop worker process
    if [ -f /tmp/worker.pid ]; then
        WORKER_PID=$(cat /tmp/worker.pid)
        if kill -0 $WORKER_PID 2>/dev/null; then
            log "Stopping worker process (PID: $WORKER_PID)..."
            kill -TERM $WORKER_PID
            
            # Wait for worker to shut down gracefully
            timeout=10
            while [ $timeout -gt 0 ] && kill -0 $WORKER_PID 2>/dev/null; do
                sleep 1
                timeout=$((timeout - 1))
            done
            
            # Force kill if still running
            if kill -0 $WORKER_PID 2>/dev/null; then
                warn "Force killing worker process..."
                kill -KILL $WORKER_PID
            fi
            
            rm -f /tmp/worker.pid
        fi
    fi
    
    log "Shutdown complete"
    exit 0
}

# Main execution
main() {
    log "🌟 Starting SaaS X-Ray application..."
    
    # Setup signal handlers
    setup_signal_handlers
    
    # Perform startup checks and initialization
    validate_environment
    check_database
    check_redis
    
    # Run migrations if not skipped
    if [ "$SKIP_MIGRATIONS" != "true" ]; then
        run_migrations
    fi
    
    # Initialize data if not skipped
    initialize_data
    
    # Start background services
    start_services
    
    # Start main application
    log "🚀 Starting main application..."
    exec "$@"
}

# Run main function with all arguments
main "$@"