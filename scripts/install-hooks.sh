#!/usr/bin/env bash

################################################################################
# Git Hooks Installer
#
# Installs pre-push hook to run CI verification before pushing code
#
# Usage:
#   ./scripts/install-hooks.sh
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
HOOKS_DIR="${PROJECT_ROOT}/.git/hooks"
PRE_PUSH_HOOK="${HOOKS_DIR}/pre-push"

echo -e "${BOLD}${BLUE}Installing Git Hooks${NC}\n"

# Check if .git directory exists
if [ ! -d "${PROJECT_ROOT}/.git" ]; then
    echo -e "${RED}Error: Not a git repository${NC}"
    exit 1
fi

# Create hooks directory if it doesn't exist
mkdir -p "$HOOKS_DIR"

# Backup existing hook if present
if [ -f "$PRE_PUSH_HOOK" ]; then
    BACKUP_FILE="${PRE_PUSH_HOOK}.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${YELLOW}Backing up existing pre-push hook to:${NC}"
    echo -e "  $BACKUP_FILE"
    cp "$PRE_PUSH_HOOK" "$BACKUP_FILE"
fi

# Create pre-push hook
cat > "$PRE_PUSH_HOOK" << 'EOF'
#!/usr/bin/env bash

################################################################################
# Pre-Push Hook - CI/CD Verification
#
# Automatically runs CI verification before pushing to prevent pipeline failures
#
# Bypass: git push --no-verify (use only in emergencies!)
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# Get project root
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${HOOK_DIR}/../.." && pwd)"
VERIFY_SCRIPT="${PROJECT_ROOT}/scripts/verify-ci.sh"

echo -e "${BOLD}${BLUE}🔍 Pre-Push Hook: Running CI Verification${NC}\n"

# Check if verification script exists
if [ ! -f "$VERIFY_SCRIPT" ]; then
    echo -e "${YELLOW}⚠️  Warning: CI verification script not found${NC}"
    echo -e "   Expected: $VERIFY_SCRIPT"
    echo -e "\nProceeding with push (verification skipped)..."
    exit 0
fi

# Make script executable if needed
chmod +x "$VERIFY_SCRIPT"

# Run verification
if "$VERIFY_SCRIPT" --skip-e2e; then
    echo -e "\n${GREEN}${BOLD}✅ Pre-push verification passed!${NC}"
    echo -e "Proceeding with push...\n"
    exit 0
else
    echo -e "\n${RED}${BOLD}❌ Pre-push verification failed!${NC}\n"
    echo -e "${YELLOW}Fix the issues above before pushing.${NC}\n"
    echo -e "${BOLD}Options:${NC}"
    echo -e "  1. Fix the issues and try pushing again"
    echo -e "  2. Run full verification: ${BLUE}./scripts/verify-ci.sh${NC}"
    echo -e "  3. ${RED}Bypass hook (NOT recommended):${NC} git push --no-verify"
    echo ""
    exit 1
fi
EOF

# Make hook executable
chmod +x "$PRE_PUSH_HOOK"

echo -e "${GREEN}✅ Pre-push hook installed successfully!${NC}\n"

# Test the hook
echo -e "${BOLD}Testing hook installation...${NC}"

if [ -x "$PRE_PUSH_HOOK" ]; then
    echo -e "${GREEN}✅ Hook is executable${NC}"
else
    echo -e "${RED}❌ Hook is not executable${NC}"
    exit 1
fi

# Print summary
echo -e "\n${BOLD}${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}Hook Installation Summary${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════${NC}\n"

echo -e "${BOLD}Installed:${NC}"
echo -e "  ${GREEN}✓${NC} Pre-push hook: $PRE_PUSH_HOOK"

if [ -f "${PRE_PUSH_HOOK}.backup."* ]; then
    echo -e "\n${BOLD}Backup:${NC}"
    echo -e "  ${YELLOW}⚠${NC} Previous hook backed up"
fi

echo -e "\n${BOLD}What happens now:${NC}"
echo -e "  • Every ${BLUE}git push${NC} will trigger CI verification"
echo -e "  • E2E tests are skipped by default (use --skip-e2e)"
echo -e "  • Failed checks will prevent the push"
echo -e "  • Bypass with ${YELLOW}git push --no-verify${NC} (emergencies only!)"

echo -e "\n${BOLD}Manual verification:${NC}"
echo -e "  • Full check:  ${BLUE}./scripts/verify-ci.sh${NC}"
echo -e "  • Quick check: ${BLUE}./scripts/quick-check.sh${NC}"

echo -e "\n${BOLD}${BLUE}═══════════════════════════════════════════════════════${NC}\n"

echo -e "${GREEN}All set! Your pushes are now protected. 🛡️${NC}\n"
