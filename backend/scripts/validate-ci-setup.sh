#!/bin/bash

###############################################################################
# CI/CD Setup Validation Script
#
# Validates that all CI/CD components are properly configured before
# pushing to GitHub and triggering the workflow.
#
# Usage: ./scripts/validate-ci-setup.sh
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0

###############################################################################
# Helper Functions
###############################################################################

print_header() {
    echo -e "${BLUE}"
    echo "========================================================================"
    echo "  $1"
    echo "========================================================================"
    echo -e "${NC}"
}

print_check() {
    echo -e "${BLUE}[CHECK]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
    ((CHECKS_PASSED++))
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
    ((CHECKS_FAILED++))
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
    ((CHECKS_WARNING++))
}

###############################################################################
# Validation Checks
###############################################################################

print_header "CI/CD Setup Validation"

# Check 1: GitHub Actions workflow exists
print_check "Checking GitHub Actions workflow file..."
if [ -f ".github/workflows/test-validation.yml" ]; then
    print_success "test-validation.yml exists"
else
    print_error "test-validation.yml not found"
fi

# Check 2: Codecov configuration exists
print_check "Checking Codecov configuration..."
if [ -f ".codecov.yml" ]; then
    print_success ".codecov.yml exists"
else
    print_error ".codecov.yml not found"
fi

# Check 3: Performance regression script exists
print_check "Checking performance regression script..."
if [ -f "scripts/check-performance-regression.js" ] && [ -x "scripts/check-performance-regression.js" ]; then
    print_success "check-performance-regression.js exists and is executable"
else
    print_error "check-performance-regression.js missing or not executable"
fi

# Check 4: Drift detection script exists
print_check "Checking drift detection script..."
if [ -f "scripts/check-detection-drift.js" ] && [ -x "scripts/check-detection-drift.js" ]; then
    print_success "check-detection-drift.js exists and is executable"
else
    print_error "check-detection-drift.js missing or not executable"
fi

# Check 5: CI/CD documentation exists
print_check "Checking CI/CD documentation..."
if [ -f "docs/CI_CD_GUIDE.md" ]; then
    print_success "CI_CD_GUIDE.md exists"
else
    print_error "CI_CD_GUIDE.md not found"
fi

# Check 6: Jest configuration
print_check "Checking Jest configuration..."
if [ -f "jest.config.js" ]; then
    print_success "jest.config.js exists"

    # Check coverage thresholds
    if grep -q "coverageThreshold" jest.config.js; then
        print_success "Coverage thresholds configured"
    else
        print_warning "Coverage thresholds not found in jest.config.js"
    fi
else
    print_error "jest.config.js not found"
fi

# Check 7: Package.json test scripts
print_check "Checking package.json test scripts..."
if [ -f "package.json" ]; then
    if grep -q "test:unit" package.json && \
       grep -q "test:integration" package.json && \
       grep -q "test:security" package.json && \
       grep -q "test:e2e" package.json && \
       grep -q "test:ci" package.json; then
        print_success "All required test scripts present"
    else
        print_error "Missing required test scripts in package.json"
    fi
else
    print_error "package.json not found"
fi

# Check 8: Test directory structure
print_check "Checking test directory structure..."
TEST_DIRS=("tests/unit" "tests/integration" "tests/security" "tests/e2e" "tests/stress" "tests/fixtures")
MISSING_DIRS=()

for dir in "${TEST_DIRS[@]}"; do
    if [ ! -d "$dir" ]; then
        MISSING_DIRS+=("$dir")
    fi
done

if [ ${#MISSING_DIRS[@]} -eq 0 ]; then
    print_success "All test directories exist"
else
    print_error "Missing test directories: ${MISSING_DIRS[*]}"
fi

# Check 9: Baseline fixtures
print_check "Checking baseline fixtures..."
if [ -d "tests/fixtures/baselines" ]; then
    print_success "Baselines directory exists"

    if [ -f "tests/fixtures/baselines/performance-baseline.json" ]; then
        print_success "Performance baseline exists"
    else
        print_warning "Performance baseline not found (will be created on first run)"
    fi

    if [ -f "tests/fixtures/baselines/detection-baseline.json" ]; then
        print_success "Detection baseline exists"
    else
        print_warning "Detection baseline not found (will be created on first run)"
    fi
else
    print_error "Baselines directory not found"
fi

# Check 10: Node.js version
print_check "Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 20 ]; then
    print_success "Node.js version $NODE_VERSION is compatible (requires ≥20)"
else
    print_error "Node.js version $NODE_VERSION is too old (requires ≥20)"
fi

# Check 11: Dependencies installed
print_check "Checking dependencies..."
if [ -d "node_modules" ]; then
    print_success "node_modules directory exists"

    # Check key dependencies
    if [ -d "node_modules/jest" ] && \
       [ -d "node_modules/ts-jest" ] && \
       [ -d "node_modules/supertest" ]; then
        print_success "Key test dependencies installed"
    else
        print_warning "Some test dependencies may be missing (run npm install)"
    fi
else
    print_error "node_modules not found (run npm install)"
fi

# Check 12: TypeScript configuration
print_check "Checking TypeScript configuration..."
if [ -f "tsconfig.json" ]; then
    print_success "tsconfig.json exists"
else
    print_error "tsconfig.json not found"
fi

# Check 13: Docker services (optional)
print_check "Checking Docker services (local testing)..."
if command -v docker &> /dev/null; then
    print_success "Docker is installed"

    # Check if Docker daemon is running
    if docker ps &> /dev/null; then
        print_success "Docker daemon is running"

        # Check for PostgreSQL container
        if docker ps | grep -q postgres; then
            print_success "PostgreSQL container is running"
        else
            print_warning "PostgreSQL container not running (may need docker compose up)"
        fi

        # Check for Redis container
        if docker ps | grep -q redis; then
            print_success "Redis container is running"
        else
            print_warning "Redis container not running (may need docker compose up)"
        fi
    else
        print_warning "Docker daemon is not running"
    fi
else
    print_warning "Docker not installed (not required for CI/CD, but useful for local testing)"
fi

# Check 14: Git status
print_check "Checking Git status..."
if git rev-parse --git-dir > /dev/null 2>&1; then
    print_success "Git repository detected"

    # Check for uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        print_warning "Uncommitted changes detected"
    else
        print_success "No uncommitted changes"
    fi
else
    print_error "Not a Git repository"
fi

# Check 15: GitHub remote configured
print_check "Checking GitHub remote..."
if git remote -v | grep -q github.com; then
    print_success "GitHub remote configured"
else
    print_error "GitHub remote not configured"
fi

###############################################################################
# Summary
###############################################################################

echo ""
print_header "Validation Summary"

echo -e "${GREEN}Passed:${NC}  $CHECKS_PASSED"
echo -e "${YELLOW}Warnings:${NC} $CHECKS_WARNING"
echo -e "${RED}Failed:${NC}  $CHECKS_FAILED"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    if [ $CHECKS_WARNING -eq 0 ]; then
        echo -e "${GREEN}✓ CI/CD setup is complete and ready!${NC}"
        echo ""
        echo "Next steps:"
        echo "  1. Commit and push your changes"
        echo "  2. Create a pull request"
        echo "  3. Verify the workflow runs successfully"
        echo ""
        exit 0
    else
        echo -e "${YELLOW}⚠ CI/CD setup is mostly ready, but has some warnings.${NC}"
        echo ""
        echo "Review the warnings above. The workflow should still run,"
        echo "but you may want to address these issues."
        echo ""
        exit 0
    fi
else
    echo -e "${RED}✗ CI/CD setup has issues that need to be resolved.${NC}"
    echo ""
    echo "Please fix the errors above before pushing to GitHub."
    echo ""
    exit 1
fi
