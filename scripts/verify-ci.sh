#!/usr/bin/env bash

################################################################################
# CI/CD Pre-Flight Verification Script
#
# Runs all CI/CD checks locally before pushing code to prevent pipeline failures
# Based on .github/workflows/pr-ci.yml
#
# Usage:
#   ./scripts/verify-ci.sh              # Run all checks
#   ./scripts/verify-ci.sh --skip-e2e   # Skip E2E tests (faster)
#   ./scripts/verify-ci.sh --fix        # Auto-fix linting issues
#   ./scripts/verify-ci.sh --help       # Show usage
################################################################################

set -e  # Exit on error

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
LOG_DIR="${PROJECT_ROOT}/.ci-verification-logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/verify-ci-${TIMESTAMP}.log"

# Flags
SKIP_E2E=false
AUTO_FIX=false
SHOW_HELP=false

# Stats
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0
START_TIME=$(date +%s)

################################################################################
# Helper Functions
################################################################################

print_header() {
    echo -e "${BOLD}${BLUE}$1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_check() {
    local check_num=$1
    local total=$2
    local name=$3
    echo -e "\n${BOLD}[${check_num}/${total}] ${name}${NC}"
}

show_usage() {
    cat << EOF
${BOLD}CI/CD Pre-Flight Verification${NC}

Run all CI/CD checks locally before pushing code.

${BOLD}Usage:${NC}
  ./scripts/verify-ci.sh [OPTIONS]

${BOLD}Options:${NC}
  --skip-e2e    Skip E2E tests (faster, ~40s vs ~70s)
  --fix         Auto-fix linting issues
  --help        Show this help message

${BOLD}Examples:${NC}
  ./scripts/verify-ci.sh              # Full verification
  ./scripts/verify-ci.sh --skip-e2e   # Quick check without E2E
  ./scripts/verify-ci.sh --fix        # Auto-fix linting

${BOLD}Checks performed:${NC}
  1. ESLint (Frontend) - BLOCKING
  2. ESLint (Backend) - BLOCKING
  3. Security Audit - BLOCKING
  4. Frontend Tests - BLOCKING
  5. Backend Tests - BLOCKING
  6. Build Verification - BLOCKING
  7. E2E Tests - BLOCKING (can skip with --skip-e2e)
  8. TypeScript - NON-BLOCKING (warnings only)

${BOLD}Exit Codes:${NC}
  0 - All critical checks passed
  1 - One or more checks failed

For more information, see: docs/CI_VERIFICATION.md
EOF
}

run_check() {
    local check_name=$1
    local check_cmd=$2
    local is_blocking=${3:-true}
    local check_start=$(date +%s)

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    # Create temp log file for this check
    local check_log="${LOG_DIR}/check-${check_name// /-}-${TIMESTAMP}.log"

    if eval "$check_cmd" > "$check_log" 2>&1; then
        local check_end=$(date +%s)
        local duration=$((check_end - check_start))

        if [ "$is_blocking" = true ]; then
            print_success "PASSED (${duration}s)"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
        else
            print_success "PASSED (${duration}s) - non-blocking"
            WARNING_CHECKS=$((WARNING_CHECKS + 1))
        fi

        return 0
    else
        local check_end=$(date +%s)
        local duration=$((check_end - check_start))

        if [ "$is_blocking" = true ]; then
            print_error "FAILED (${duration}s)"
            echo -e "${RED}Last 20 lines of output:${NC}"
            tail -n 20 "$check_log" | sed 's/^/  /'
            echo -e "${YELLOW}Full log: $check_log${NC}"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            return 1
        else
            print_warning "FAILED (${duration}s) - non-blocking"
            echo -e "${YELLOW}Last 10 lines of output:${NC}"
            tail -n 10 "$check_log" | sed 's/^/  /'
            WARNING_CHECKS=$((WARNING_CHECKS + 1))
            return 0
        fi
    fi
}

################################################################################
# Main Script
################################################################################

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-e2e)
            SKIP_E2E=true
            shift
            ;;
        --fix)
            AUTO_FIX=true
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Create log directory
mkdir -p "$LOG_DIR"

# Change to project root
cd "$PROJECT_ROOT"

# Print header
echo -e "${BOLD}${BLUE}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║          🚀 CI/CD Pre-Flight Verification System            ║
║                                                              ║
║      Preventing pipeline failures since 2025                 ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}\n"

print_info "Starting verification at $(date)"
print_info "Project: $PROJECT_ROOT"
print_info "Log file: $LOG_FILE"

if [ "$SKIP_E2E" = true ]; then
    print_warning "E2E tests will be skipped"
fi

if [ "$AUTO_FIX" = true ]; then
    print_info "Auto-fix mode enabled for linting"
fi

echo ""

################################################################################
# Check 1 & 2: ESLint (parallel)
################################################################################

LINT_CMD_FRONTEND="pnpm run lint"
LINT_CMD_BACKEND="pnpm run lint"

if [ "$AUTO_FIX" = true ]; then
    LINT_CMD_FRONTEND="pnpm run lint:fix"
    LINT_CMD_BACKEND="pnpm run lint:fix"
fi

print_check 1 7 "ESLint (Frontend)"
(cd frontend && run_check "ESLint Frontend" "$LINT_CMD_FRONTEND" true) &
PID_LINT_FRONTEND=$!

print_check 2 7 "ESLint (Backend)"
(cd backend && run_check "ESLint Backend" "$LINT_CMD_BACKEND" true) &
PID_LINT_BACKEND=$!

# Wait for both linting checks
wait $PID_LINT_FRONTEND
RESULT_LINT_FRONTEND=$?

wait $PID_LINT_BACKEND
RESULT_LINT_BACKEND=$?

if [ $RESULT_LINT_FRONTEND -ne 0 ] || [ $RESULT_LINT_BACKEND -ne 0 ]; then
    print_error "Linting failed. Fix issues and try again."
    print_info "Tip: Run with --fix to auto-fix some issues"
    exit 1
fi

################################################################################
# Check 3: Security Audit (parallel for frontend and backend)
################################################################################

print_check 3 7 "Security Audit (Frontend & Backend)"

# Run security audits in parallel
(cd frontend && run_check "Security Audit Frontend" "pnpm audit --audit-level=high" true) &
PID_AUDIT_FRONTEND=$!

(cd backend && run_check "Security Audit Backend" "pnpm audit --audit-level=high" true) &
PID_AUDIT_BACKEND=$!

wait $PID_AUDIT_FRONTEND
RESULT_AUDIT_FRONTEND=$?

wait $PID_AUDIT_BACKEND
RESULT_AUDIT_BACKEND=$?

if [ $RESULT_AUDIT_FRONTEND -ne 0 ] || [ $RESULT_AUDIT_BACKEND -ne 0 ]; then
    print_error "Security audit failed. High-severity vulnerabilities detected."
    print_info "Run: pnpm audit in frontend/ or backend/ to see details"
    print_info "Fix: pnpm audit fix --audit-level=high"
    exit 1
fi

################################################################################
# Check 4: Frontend Tests
################################################################################

print_check 4 7 "Frontend Tests"
(cd frontend && run_check "Frontend Tests" "pnpm test -- --run --coverage" true)

if [ $? -ne 0 ]; then
    print_error "Frontend tests failed."
    print_info "Run: cd frontend && pnpm test -- --run"
    exit 1
fi

################################################################################
# Check 5: Backend Tests
################################################################################

print_check 5 7 "Backend Tests"

# Check if Docker services are running
if ! docker ps | grep -q postgres; then
    print_warning "PostgreSQL not detected. Starting Docker services..."
    docker compose up -d postgres redis
    sleep 5
fi

# Run migrations
print_info "Running database migrations..."
(cd backend && pnpm run migrate:test > /dev/null 2>&1) || true

# Run tests
(cd backend && run_check "Backend Tests" "pnpm test -- --run --coverage" true)

if [ $? -ne 0 ]; then
    print_error "Backend tests failed."
    print_info "Run: cd backend && pnpm test -- --run"
    exit 1
fi

################################################################################
# Check 6: Build Verification
################################################################################

print_check 6 7 "Build Verification (Shared Types, Frontend, Backend)"

# Build shared types first
print_info "Building shared-types..."
(cd shared-types && run_check "Build Shared Types" "pnpm run build" true)

if [ $? -ne 0 ]; then
    print_error "Shared types build failed."
    exit 1
fi

# Build frontend and backend in parallel
(cd frontend && run_check "Build Frontend" "pnpm run build" true) &
PID_BUILD_FRONTEND=$!

(cd backend && run_check "Build Backend" "pnpm run build" true) &
PID_BUILD_BACKEND=$!

wait $PID_BUILD_FRONTEND
RESULT_BUILD_FRONTEND=$?

wait $PID_BUILD_BACKEND
RESULT_BUILD_BACKEND=$?

if [ $RESULT_BUILD_FRONTEND -ne 0 ] || [ $RESULT_BUILD_BACKEND -ne 0 ]; then
    print_error "Build verification failed."
    exit 1
fi

################################################################################
# Check 7: E2E Tests (optional)
################################################################################

if [ "$SKIP_E2E" = false ]; then
    print_check 7 7 "E2E Tests"

    # Check if Playwright is installed
    if ! (cd frontend && pnpm exec playwright --version > /dev/null 2>&1); then
        print_warning "Playwright not installed. Installing..."
        (cd frontend && pnpm exec playwright install --with-deps chromium)
    fi

    # Check if servers are running (required for E2E)
    if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
        print_warning "Backend server not running on :3000"
        print_warning "E2E tests require running servers. Start with: pnpm dev"
        print_warning "Skipping E2E tests..."
    elif ! curl -s http://localhost:4200 > /dev/null 2>&1; then
        print_warning "Frontend server not running on :4200"
        print_warning "E2E tests require running servers. Start with: pnpm dev"
        print_warning "Skipping E2E tests..."
    else
        (cd frontend && run_check "E2E Tests" "pnpm run test:e2e" true)

        if [ $? -ne 0 ]; then
            print_error "E2E tests failed."
            print_info "Run: cd frontend && pnpm run test:e2e"
            print_info "Debug: cd frontend && pnpm run test:e2e:ui"
            exit 1
        fi
    fi
else
    print_warning "Skipping E2E tests (--skip-e2e flag)"
fi

################################################################################
# Check 8: TypeScript (non-blocking)
################################################################################

print_check 8 8 "TypeScript Type Check (non-blocking)"

TS_ERRORS=0

# Check shared-types
(cd shared-types && pnpm exec tsc --noEmit > /dev/null 2>&1) || TS_ERRORS=$((TS_ERRORS + 1))

# Check frontend
(cd frontend && pnpm exec tsc --noEmit > /dev/null 2>&1) || TS_ERRORS=$((TS_ERRORS + 1))

# Check backend
(cd backend && pnpm exec tsc --noEmit > /dev/null 2>&1) || TS_ERRORS=$((TS_ERRORS + 1))

if [ $TS_ERRORS -gt 0 ]; then
    print_warning "TypeScript errors detected (non-blocking)"
    print_info "Run: pnpm run type-check in each workspace"
    WARNING_CHECKS=$((WARNING_CHECKS + 1))
else
    print_success "No TypeScript errors"
fi

################################################################################
# Final Summary
################################################################################

END_TIME=$(date +%s)
TOTAL_DURATION=$((END_TIME - START_TIME))

echo -e "\n${BOLD}${BLUE}════════════════════════════════════════════════════════════${NC}"

if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${BOLD}${GREEN}"
    cat << "EOF"
    ✅  ALL CRITICAL CHECKS PASSED

    ┌─────────────────────────────────────┐
    │  Ready to push to remote! 🚀        │
    └─────────────────────────────────────┘
EOF
    echo -e "${NC}"
else
    echo -e "${BOLD}${RED}"
    cat << "EOF"
    ❌  VERIFICATION FAILED

    ┌─────────────────────────────────────┐
    │  Fix issues before pushing          │
    └─────────────────────────────────────┘
EOF
    echo -e "${NC}"
fi

echo -e "${BOLD}Summary:${NC}"
echo -e "  Total Checks:    ${TOTAL_CHECKS}"
echo -e "  ${GREEN}Passed:          ${PASSED_CHECKS}${NC}"
echo -e "  ${RED}Failed:          ${FAILED_CHECKS}${NC}"

if [ $WARNING_CHECKS -gt 0 ]; then
    echo -e "  ${YELLOW}Warnings:        ${WARNING_CHECKS}${NC}"
fi

echo -e "  Total Duration:  ${TOTAL_DURATION}s"
echo -e "\n${BOLD}Log file: ${NC}${LOG_FILE}"

echo -e "${BOLD}${BLUE}════════════════════════════════════════════════════════════${NC}\n"

# Save summary to log
{
    echo "===== CI/CD Verification Summary ====="
    echo "Timestamp: $(date)"
    echo "Total Checks: $TOTAL_CHECKS"
    echo "Passed: $PASSED_CHECKS"
    echo "Failed: $FAILED_CHECKS"
    echo "Warnings: $WARNING_CHECKS"
    echo "Duration: ${TOTAL_DURATION}s"
} > "$LOG_FILE"

# Exit with appropriate code
if [ $FAILED_CHECKS -gt 0 ]; then
    exit 1
else
    exit 0
fi
