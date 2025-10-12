#!/bin/bash
# Pre-commit hook: Quality gate before committing code
# Runs linting, type checking, fast tests, and AI code review

set -e  # Exit on error

echo "🔍 Pre-commit Quality Gate Starting..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Detect package manager
PKG_MANAGER="npm"

# Track overall status
QUALITY_GATE_PASSED=true

# 1. Auto-fix linting issues (if lint script exists)
echo "📝 Running linter..."
if grep -q '"lint"' package.json 2>/dev/null; then
    if $PKG_MANAGER run lint --fix 2>/dev/null || $PKG_MANAGER run lint 2>/dev/null; then
        echo -e "${GREEN}✓ Linting passed${NC}"
    else
        echo -e "${RED}✗ Linting failed${NC}"
        QUALITY_GATE_PASSED=false
    fi
else
    echo -e "${YELLOW}⚠ No lint script found - skipping${NC}"
fi

# 2. Type check (if tsconfig.json exists)
echo "🔤 Running TypeScript type check..."
if [ -f "tsconfig.json" ]; then
    if npx tsc --noEmit; then
        echo -e "${GREEN}✓ Type check passed${NC}"
    else
        echo -e "${RED}✗ Type check failed${NC}"
        QUALITY_GATE_PASSED=false
    fi
else
    echo -e "${YELLOW}⚠ No tsconfig.json found - skipping${NC}"
fi

# 3. Run fast unit tests (if test script exists)
echo "🧪 Running fast unit tests..."
if grep -q '"test"' package.json 2>/dev/null; then
    if $PKG_MANAGER run test; then
        echo -e "${GREEN}✓ Tests passed${NC}"
    else
        echo -e "${RED}✗ Tests failed${NC}"
        QUALITY_GATE_PASSED=false
    fi
else
    echo -e "${YELLOW}⚠ No test script found - skipping${NC}"
fi

# 4. Get list of changed files
CHANGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

if [ -z "$CHANGED_FILES" ]; then
    echo -e "${YELLOW}⚠ No files staged for commit${NC}"
    exit 1
fi

echo "📋 Changed files:"
echo "$CHANGED_FILES"

# 5. AI Quality Judge Review (optional - comment out if not using)
echo "🤖 Invoking AI Code Quality Judge..."

# Call AI judge script with changed files
if npx tsx .claude/scripts/invoke-ai-judge.ts $CHANGED_FILES 2>/dev/null; then
    echo -e "${GREEN}✓ AI Quality Judge APPROVED${NC}"
else
    # AI judge is optional - warn but don't fail
    echo -e "${YELLOW}⚠ AI Quality Judge not available (skipping)${NC}"
fi

# Final decision
if [ "$QUALITY_GATE_PASSED" = true ]; then
    echo -e "${GREEN}✅ Quality gate PASSED - proceeding with commit${NC}"
    exit 0
else
    echo -e "${RED}❌ Quality gate FAILED - commit blocked${NC}"
    echo "Please fix the issues above and try again"
    exit 1
fi
