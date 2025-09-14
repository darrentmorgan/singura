#!/bin/bash
# ============================================================================
# SaaS X-Ray Database Migration to Supabase
# Migrates data from local PostgreSQL to Supabase across environments
# Usage: ./scripts/migrate-to-supabase.sh [environment]
# ============================================================================

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=""
BACKUP_EXISTING=true
VALIDATE_MIGRATION=true
SKIP_DATA_MIGRATION=false

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
SaaS X-Ray Database Migration to Supabase

USAGE:
    ./scripts/migrate-to-supabase.sh [ENVIRONMENT] [OPTIONS]

ENVIRONMENTS:
    demo        Migrate to demo Supabase project
    staging     Migrate to staging Supabase project
    production  Migrate to production Supabase project

OPTIONS:
    --skip-backup       Skip backing up existing data
    --skip-validation   Skip migration validation
    --skip-data         Skip data migration (schema only)
    -h, --help         Show this help message

EXAMPLES:
    ./scripts/migrate-to-supabase.sh demo
    ./scripts/migrate-to-supabase.sh staging --skip-data
    ./scripts/migrate-to-supabase.sh production --skip-backup

PREREQUISITES:
    - Local Docker containers running (postgres, redis)
    - Supabase CLI installed and authenticated
    - Environment variables configured

EOF
}

check_prerequisites() {
    log "Checking migration prerequisites..."

    # Check if local containers are running
    if ! docker compose ps | grep -q "postgres.*Up"; then
        error "Local PostgreSQL container not running. Run: docker compose up -d postgres"
    fi

    # Check if Supabase CLI is installed
    if ! command -v supabase &> /dev/null; then
        error "Supabase CLI not found. Install: npm install -g supabase"
    fi

    # Check environment file
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    if [[ ! -f "$env_file" ]]; then
        error "Environment file not found: $env_file"
    fi

    # Load and validate environment variables
    source "$env_file"
    if [[ -z "$SUPABASE_URL" ]] || [[ -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
        error "Supabase configuration missing in $env_file"
    fi

    success "Prerequisites check passed"
}

backup_local_data() {
    if [[ "$BACKUP_EXISTING" != true ]]; then
        warning "Skipping local data backup"
        return 0
    fi

    log "Creating backup of local PostgreSQL data..."

    local backup_file="$PROJECT_ROOT/backups/local-backup-$(date +%Y%m%d_%H%M%S).sql"
    mkdir -p "$PROJECT_ROOT/backups"

    # Create backup using docker exec
    docker exec saas-xray-postgres-1 pg_dump -U postgres -d saas_xray > "$backup_file"

    if [[ -f "$backup_file" ]] && [[ -s "$backup_file" ]]; then
        success "Local data backed up to: $backup_file"
    else
        error "Failed to create backup"
    fi
}

export_local_data() {
    if [[ "$SKIP_DATA_MIGRATION" == true ]]; then
        warning "Skipping data export"
        return 0
    fi

    log "Exporting data from local PostgreSQL..."

    local export_dir="$PROJECT_ROOT/migration/data"
    mkdir -p "$export_dir"

    # Export data table by table
    local tables=(
        "organizations"
        "platform_connections"
        "encrypted_credentials"
        "discovery_runs"
        "discovered_automations"
        "risk_assessments"
        "cross_platform_integrations"
        "automation_activities"
        "compliance_mappings"
        "audit_logs"
        "user_feedback"
    )

    for table in "${tables[@]}"; do
        log "Exporting table: $table"

        docker exec saas-xray-postgres-1 psql -U postgres -d saas_xray -c "\\copy $table TO '/tmp/${table}.csv' WITH CSV HEADER"
        docker cp saas-xray-postgres-1:/tmp/${table}.csv "$export_dir/"

        if [[ -f "$export_dir/${table}.csv" ]]; then
            local row_count=$(tail -n +2 "$export_dir/${table}.csv" | wc -l)
            log "  Exported $row_count rows from $table"
        else
            warning "  Failed to export $table"
        fi
    done

    success "Data export completed"
}

setup_supabase_project() {
    log "Setting up Supabase project for $ENVIRONMENT..."

    cd "$PROJECT_ROOT"

    # Get project reference based on environment
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

    # Link to Supabase project
    supabase link --project-ref "$project_ref"

    # Apply migrations
    log "Applying database migrations..."
    supabase db push

    success "Supabase project setup completed"
}

import_data_to_supabase() {
    if [[ "$SKIP_DATA_MIGRATION" == true ]]; then
        warning "Skipping data import"
        return 0
    fi

    log "Importing data to Supabase..."

    local export_dir="$PROJECT_ROOT/migration/data"

    # Load environment variables
    source "$PROJECT_ROOT/.env.$ENVIRONMENT"

    # Import data using psql (requires direct database connection)
    local db_url="$DATABASE_URL"

    if [[ -z "$db_url" ]]; then
        error "DATABASE_URL not configured for $ENVIRONMENT"
    fi

    # Import data table by table (maintaining foreign key order)
    local import_order=(
        "organizations"
        "platform_connections"
        "encrypted_credentials"
        "discovery_runs"
        "discovered_automations"
        "risk_assessments"
        "cross_platform_integrations"
        "automation_activities"
        "compliance_mappings"
        "audit_logs"
        "user_feedback"
    )

    for table in "${import_order[@]}"; do
        if [[ -f "$export_dir/${table}.csv" ]]; then
            log "Importing table: $table"

            # Import using psql
            psql "$db_url" -c "\\copy $table FROM '$export_dir/${table}.csv' WITH CSV HEADER"

            local imported_count=$(psql "$db_url" -t -c "SELECT COUNT(*) FROM $table")
            log "  Imported $imported_count rows to $table"
        else
            warning "  No data file found for $table, skipping"
        fi
    done

    success "Data import completed"
}

update_sequences() {
    if [[ "$SKIP_DATA_MIGRATION" == true ]]; then
        warning "Skipping sequence updates"
        return 0
    fi

    log "Updating database sequences..."

    # Load environment variables
    source "$PROJECT_ROOT/.env.$ENVIRONMENT"

    # Update sequences for tables with serial/auto-increment columns
    # Note: Our schema uses UUIDs, so this may not be needed
    # But including for completeness

    psql "$DATABASE_URL" -c "
        DO \$\$
        DECLARE
            seq_record RECORD;
        BEGIN
            FOR seq_record IN
                SELECT schemaname, tablename, attname, seq_name
                FROM (
                    SELECT
                        schemaname,
                        tablename,
                        attname,
                        pg_get_serial_sequence(schemaname||'.'||tablename, attname) as seq_name
                    FROM pg_stats
                    WHERE schemaname = 'public'
                ) t
                WHERE seq_name IS NOT NULL
            LOOP
                EXECUTE 'SELECT setval(''' || seq_record.seq_name || ''', COALESCE((SELECT MAX(' || seq_record.attname || ') FROM ' || seq_record.schemaname || '.' || seq_record.tablename || '), 1), false)';
            END LOOP;
        END \$\$;
    "

    success "Database sequences updated"
}

validate_migration() {
    if [[ "$VALIDATE_MIGRATION" != true ]]; then
        warning "Skipping migration validation"
        return 0
    fi

    log "Validating data migration..."

    local export_dir="$PROJECT_ROOT/migration/data"
    source "$PROJECT_ROOT/.env.$ENVIRONMENT"

    # Compare row counts
    local tables=(
        "organizations"
        "platform_connections"
        "discovered_automations"
        "risk_assessments"
        "audit_logs"
    )

    for table in "${tables[@]}"; do
        if [[ -f "$export_dir/${table}.csv" ]]; then
            local local_count=$(tail -n +2 "$export_dir/${table}.csv" | wc -l)
            local supabase_count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM $table" | xargs)

            if [[ "$local_count" -eq "$supabase_count" ]]; then
                success "  $table: $local_count rows (validated)"
            else
                warning "  $table: Local=$local_count, Supabase=$supabase_count (mismatch)"
            fi
        fi
    done

    # Test basic queries
    log "Testing basic queries..."

    local org_count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM organizations" | xargs)
    local conn_count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM platform_connections" | xargs)

    log "  Organizations: $org_count"
    log "  Platform Connections: $conn_count"

    success "Migration validation completed"
}

cleanup_migration_files() {
    log "Cleaning up migration files..."

    local export_dir="$PROJECT_ROOT/migration/data"
    if [[ -d "$export_dir" ]]; then
        rm -rf "$export_dir"
        success "Migration files cleaned up"
    fi
}

# ============================================================================
# Main Migration Process
# ============================================================================

main() {
    log "Starting database migration to Supabase ($ENVIRONMENT environment)"

    # Pre-migration checks
    check_prerequisites

    # Backup and export
    backup_local_data
    export_local_data

    # Setup and import
    setup_supabase_project
    import_data_to_supabase
    update_sequences

    # Validation and cleanup
    validate_migration
    cleanup_migration_files

    success "🎯 Database migration to Supabase completed successfully!"
    log "Environment: $ENVIRONMENT"
    log "Supabase URL: $SUPABASE_URL"
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
        --skip-backup)
            BACKUP_EXISTING=false
            shift
            ;;
        --skip-validation)
            VALIDATE_MIGRATION=false
            shift
            ;;
        --skip-data)
            SKIP_DATA_MIGRATION=true
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

# Run main migration
main