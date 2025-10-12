#!/usr/bin/env bash

################################################################################
# Quick CI/CD Verification Script
#
# Fast validation for rapid iteration - runs only critical checks
# Skips E2E tests and coverage for speed (< 30 seconds)
#
# Usage:
#   ./scripts/quick-check.sh         # Run quick checks
#   ./scripts/quick-check.sh --fix   # Auto-fix linting
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
START_TIME=$(date +%s)

# Flags
AUTO_FIX=false

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

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

run_check() {
    local name=$1
    local cmd=$2
    local start=$(date +%s)

    echo -n "  ${name}... "

    if eval "$cmd" > /dev/null 2>&1; then
        local end=$(date +%s)
        local duration=$((end - start))
        echo -e "${GREEN}✓${NC} (${duration}s)"
        return 0
    else
        local end=$(date +%s)
        local duration=$((end - start))
        echo -e "${RED}✗${NC} (${duration}s)"
        return 1
    fi
}

################################################################################
# Main Script
################################################################################

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --fix)
            AUTO_FIX=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

cd "$PROJECT_ROOT"

# Print header
echo -e "${BOLD}${BLUE}"
cat << "EOF"
⚡ Quick Check - Fast CI/CD Validation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
echo -e "${NC}"

FAILED=0

################################################################################
# 1. Linting
################################################################################

print_header "Linting"

LINT_CMD="pnpm run lint"
if [ "$AUTO_FIX" = true ]; then
    LINT_CMD="pnpm run lint:fix"
fi

(cd frontend && run_check "Frontend" "$LINT_CMD") || FAILED=$((FAILED + 1))
(cd backend && run_check "Backend" "$LINT_CMD") || FAILED=$((FAILED + 1))

################################################################################
# 2. Security
################################################################################

print_header "\nSecurity Audit"

(cd frontend && run_check "Frontend" "pnpm audit --audit-level=high") || FAILED=$((FAILED + 1))
(cd backend && run_check "Backend" "pnpm audit --audit-level=high") || FAILED=$((FAILED + 1))

################################################################################
# 3. Fast Tests (no coverage)
################################################################################

print_header "\nUnit Tests (no coverage)"

(cd frontend && run_check "Frontend" "pnpm test -- --run --reporter=basic") || FAILED=$((FAILED + 1))
(cd backend && run_check "Backend" "pnpm test -- --run --reporter=basic") || FAILED=$((FAILED + 1))

################################################################################
# Summary
################################################################################

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo -e "\n${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}${BOLD}✅ Quick check passed!${NC} (${DURATION}s)"
    echo -e "${YELLOW}⚠️  Run full verification before pushing:${NC}"
    echo -e "   ./scripts/verify-ci.sh"
    exit 0
else
    echo -e "${RED}${BOLD}❌ ${FAILED} check(s) failed${NC} (${DURATION}s)"
    echo -e "\nFix issues and try again."
    exit 1
fi
