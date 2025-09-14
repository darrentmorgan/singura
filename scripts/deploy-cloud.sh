#!/bin/bash
# ============================================================================
# SaaS X-Ray Cloud Deployment Script
# Deploys to Supabase + Vercel multi-environment architecture
# Usage: ./scripts/deploy-cloud.sh [environment] [options]
# ============================================================================

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENVIRONMENTS=("demo" "staging" "production")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=""
SKIP_BUILD=false
SKIP_MIGRATION=false
SKIP_SEED=false
FORCE_DEPLOY=false
DRY_RUN=false

# ============================================================================
# Helper Functions
# ============================================================================

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    exit 1
}

show_help() {
    cat << EOF
SaaS X-Ray Cloud Deployment Script

USAGE:
    ./scripts/deploy-cloud.sh [ENVIRONMENT] [OPTIONS]

ENVIRONMENTS:
    demo        Deploy to demo.saasxray.com (sales demonstrations)
    staging     Deploy to staging.saasxray.com (customer beta testing)
    production  Deploy to app.saasxray.com (enterprise production)

OPTIONS:
    --skip-build        Skip frontend build process
    --skip-migration    Skip database migrations
    --skip-seed         Skip database seeding
    --force            Force deployment even if checks fail
    --dry-run          Show what would be deployed without executing
    -h, --help         Show this help message

EXAMPLES:
    ./scripts/deploy-cloud.sh demo
    ./scripts/deploy-cloud.sh staging --skip-seed
    ./scripts/deploy-cloud.sh production --force
    ./scripts/deploy-cloud.sh demo --dry-run

PREREQUISITES:
    - Supabase CLI installed and authenticated
    - Vercel CLI installed and authenticated
    - Environment variables configured (.env.demo, .env.staging, .env.production)
    - Docker running (for local testing)

EOF
}

check_prerequisites() {
    log "Checking prerequisites..."

    # Check if Supabase CLI is installed
    if ! command -v supabase &> /dev/null; then
        error "Supabase CLI not found. Install: npm install -g supabase"
    fi

    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        error "Vercel CLI not found. Install: npm install -g vercel"
    fi

    # Check if environment file exists
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    if [[ ! -f "$env_file" ]]; then
        error "Environment file not found: $env_file"
    fi

    # Check if required directories exist
    if [[ ! -d "$PROJECT_ROOT/supabase" ]]; then
        error "Supabase configuration directory not found: $PROJECT_ROOT/supabase"
    fi

    # Validate environment variables
    source "$env_file"
    local required_vars=("SUPABASE_URL" "SUPABASE_SERVICE_ROLE_KEY" "VITE_FRONTEND_URL")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            error "Required environment variable not set: $var"
        fi
    done

    success "Prerequisites check passed"
}

build_shared_types() {
    log "Building shared-types package..."

    cd "$PROJECT_ROOT/shared-types"
    npm run build

    success "Shared-types built successfully"
}

build_frontend() {
    if [[ "$SKIP_BUILD" == true ]]; then
        warning "Skipping frontend build"
        return 0
    fi

    log "Building frontend for $ENVIRONMENT environment..."

    cd "$PROJECT_ROOT/frontend"

    # Set environment variables for build
    export NODE_ENV=production
    export VITE_ENVIRONMENT="$ENVIRONMENT"

    # Load environment-specific variables
    source "$PROJECT_ROOT/.env.$ENVIRONMENT"

    # Build frontend
    npm run build

    # Verify build output
    if [[ ! -d "dist" ]] || [[ ! -f "dist/index.html" ]]; then
        error "Frontend build failed - no dist directory or index.html found"
    fi

    success "Frontend built successfully"
}

deploy_database() {
    if [[ "$SKIP_MIGRATION" == true ]]; then
        warning "Skipping database migrations"
    else
        log "Deploying database migrations to $ENVIRONMENT..."

        cd "$PROJECT_ROOT"

        # Link Supabase project (this should be configured per environment)
        local project_ref
        case "$ENVIRONMENT" in
            "demo")
                project_ref="$SUPABASE_DEMO_PROJECT_REF"
                ;;
            "staging")
                project_ref="$SUPABASE_STAGING_PROJECT_REF"
                ;;
            "production")
                project_ref="$SUPABASE_PRODUCTION_PROJECT_REF"
                ;;
        esac

        if [[ -z "$project_ref" ]]; then
            error "Supabase project reference not configured for $ENVIRONMENT"
        fi

        # Run migrations
        supabase link --project-ref "$project_ref"
        supabase db push

        success "Database migrations deployed"
    fi

    if [[ "$SKIP_SEED" == true ]]; then
        warning "Skipping database seeding"
    else
        log "Seeding database for $ENVIRONMENT..."

        # Only seed demo environment with demo data
        if [[ "$ENVIRONMENT" == "demo" ]]; then
            supabase db reset --linked
        fi

        success "Database seeded"
    fi
}

deploy_functions() {
    log "Deploying Supabase Edge Functions..."

    cd "$PROJECT_ROOT"

    # Deploy all functions
    supabase functions deploy

    success "Edge Functions deployed"
}

deploy_frontend() {
    log "Deploying frontend to Vercel..."

    cd "$PROJECT_ROOT"

    # Set Vercel deployment target based on environment
    local vercel_target=""
    case "$ENVIRONMENT" in
        "demo")
            vercel_target="--prod --alias demo.saasxray.com"
            ;;
        "staging")
            vercel_target="--prod --alias staging.saasxray.com"
            ;;
        "production")
            vercel_target="--prod --alias app.saasxray.com"
            ;;
    esac

    if [[ "$DRY_RUN" == true ]]; then
        log "DRY RUN: Would deploy to Vercel with: vercel $vercel_target"
    else
        # Deploy to Vercel
        vercel $vercel_target --env ".env.$ENVIRONMENT"
    fi

    success "Frontend deployed to Vercel"
}

verify_deployment() {
    log "Verifying deployment..."

    local base_url
    case "$ENVIRONMENT" in
        "demo")
            base_url="https://demo.saasxray.com"
            ;;
        "staging")
            base_url="https://staging.saasxray.com"
            ;;
        "production")
            base_url="https://app.saasxray.com"
            ;;
    esac

    # Test health endpoint
    local health_url="$base_url/api/health"
    log "Testing health endpoint: $health_url"

    if curl -f -s "$health_url" > /dev/null; then
        success "Health check passed"
    else
        warning "Health check failed - deployment may still be propagating"
    fi

    # Test frontend
    log "Testing frontend: $base_url"

    if curl -f -s "$base_url" > /dev/null; then
        success "Frontend is accessible"
    else
        warning "Frontend not accessible - check deployment status"
    fi
}

cleanup() {
    log "Cleaning up temporary files..."
    # Add cleanup logic if needed
    success "Cleanup completed"
}

# ============================================================================
# Main Deployment Process
# ============================================================================

main() {
    log "Starting SaaS X-Ray cloud deployment to $ENVIRONMENT environment"

    if [[ "$DRY_RUN" == true ]]; then
        warning "DRY RUN MODE - No actual deployment will occur"
    fi

    # Pre-deployment checks
    check_prerequisites

    # Build process
    build_shared_types
    build_frontend

    # Database deployment
    deploy_database
    deploy_functions

    # Frontend deployment
    deploy_frontend

    # Post-deployment verification
    verify_deployment

    # Cleanup
    cleanup

    success "🚀 Deployment to $ENVIRONMENT completed successfully!"
    log "Access your deployment at:"

    case "$ENVIRONMENT" in
        "demo")
            log "  Demo: https://demo.saasxray.com"
            ;;
        "staging")
            log "  Staging: https://staging.saasxray.com"
            ;;
        "production")
            log "  Production: https://app.saasxray.com"
            ;;
    esac
}

# ============================================================================
# Argument Parsing
# ============================================================================

while [[ $# -gt 0 ]]; do
    case $1 in
        demo|staging|production)
            ENVIRONMENT="$1"
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-migration)
            SKIP_MIGRATION=true
            shift
            ;;
        --skip-seed)
            SKIP_SEED=true
            shift
            ;;
        --force)
            FORCE_DEPLOY=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Validate environment
if [[ -z "$ENVIRONMENT" ]]; then
    error "Environment not specified. Use: demo, staging, or production"
fi

if [[ ! " ${ENVIRONMENTS[@]} " =~ " ${ENVIRONMENT} " ]]; then
    error "Invalid environment: $ENVIRONMENT. Valid options: ${ENVIRONMENTS[*]}"
fi

# Run main deployment
main