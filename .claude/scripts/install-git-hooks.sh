#!/bin/bash
# Git Hook Installer for Claude Code Autonomous Workflow
# Installs quality gate hooks into .git/hooks/

set -euo pipefail

PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
HOOKS_SOURCE="$PROJECT_ROOT/.claude/hooks"
HOOKS_TARGET="$PROJECT_ROOT/.git/hooks"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Claude Code Git Hook Installer${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if we're in a git repository
if [[ ! -d "$PROJECT_ROOT/.git" ]]; then
    echo -e "${RED}✗ Error: Not a git repository${NC}" >&2
    echo "  Run this from your project root directory" >&2
    exit 1
fi

# Create .git/hooks directory if it doesn't exist
mkdir -p "$HOOKS_TARGET"

# Hooks to install (Git hooks, not Claude hooks)
declare -A GIT_HOOKS=(
    ["pre-commit"]="Quality gates: lint, type-check, tests, AI review"
    ["post-commit"]="Commit tracking and push suggestions"
)

echo -e "${YELLOW}Installing Git hooks...${NC}"
echo ""

INSTALLED=0
SKIPPED=0
FAILED=0

for hook_name in "${!GIT_HOOKS[@]}"; do
    SOURCE_FILE="$HOOKS_SOURCE/$hook_name.sh"
    TARGET_FILE="$HOOKS_TARGET/$hook_name"
    DESCRIPTION="${GIT_HOOKS[$hook_name]}"

    # Check if source file exists
    if [[ ! -f "$SOURCE_FILE" ]]; then
        echo -e "${YELLOW}⊘ Skipping $hook_name${NC} - source file not found"
        echo -e "  Expected: $SOURCE_FILE"
        ((SKIPPED++))
        continue
    fi

    # Check if target already exists
    if [[ -f "$TARGET_FILE" ]]; then
        # Check if it's already our hook
        if grep -q "Claude Code" "$TARGET_FILE" 2>/dev/null; then
            echo -e "${GREEN}✓ $hook_name${NC} - already installed"
            ((INSTALLED++))
            continue
        else
            # Backup existing hook
            BACKUP="$TARGET_FILE.backup-$(date +%s)"
            mv "$TARGET_FILE" "$BACKUP"
            echo -e "${YELLOW}⚠ $hook_name${NC} - backed up existing hook to:"
            echo -e "  $BACKUP"
        fi
    fi

    # Copy and make executable
    if cp "$SOURCE_FILE" "$TARGET_FILE" && chmod +x "$TARGET_FILE"; then
        echo -e "${GREEN}✓ $hook_name${NC} - installed"
        echo -e "  ${DESCRIPTION}"
        ((INSTALLED++))
    else
        echo -e "${RED}✗ $hook_name${NC} - installation failed"
        ((FAILED++))
    fi

    echo ""
done

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Installation Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Installed: ${GREEN}$INSTALLED${NC}"
if [[ $SKIPPED -gt 0 ]]; then
    echo -e "  Skipped:   ${YELLOW}$SKIPPED${NC}"
fi
if [[ $FAILED -gt 0 ]]; then
    echo -e "  Failed:    ${RED}$FAILED${NC}"
fi
echo ""

if [[ $INSTALLED -gt 0 ]]; then
    echo -e "${GREEN}✓ Git hooks successfully installed!${NC}"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "  1. Commit some code to trigger pre-commit quality gates"
    echo "  2. Quality gates will run: lint → type-check → tests → AI review"
    echo "  3. Failed checks will auto-delegate to fixing agents (if AUTONOMY_LEVEL=high)"
    echo ""
    echo -e "${YELLOW}To uninstall:${NC}"
    echo "  rm $HOOKS_TARGET/pre-commit"
    echo "  rm $HOOKS_TARGET/post-commit"
else
    echo -e "${YELLOW}⚠ No hooks were installed${NC}"
    exit 1
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
