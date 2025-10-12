#!/bin/bash
# Post-commit hook: Trigger CI/CD and notifications after successful commit

set -e

# Ensure we have project root for absolute paths
PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"

echo "🚀 Post-commit Hook Starting..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
COMMIT_HASH=$(git rev-parse --short HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B)

echo -e "${BLUE}📦 Commit Details:${NC}"
echo "  Branch: $CURRENT_BRANCH"
echo "  Hash: $COMMIT_HASH"
echo "  Message: $COMMIT_MSG"

# Check if commit was auto-generated
if [[ "$COMMIT_MSG" == *"🤖 Generated with [Claude Code]"* ]]; then
    echo -e "${GREEN}✓ Auto-generated commit detected${NC}"
fi

# Trigger CI/CD for main or development branches
if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "claude-continual-development" ]; then
    echo -e "${YELLOW}🔄 Branch $CURRENT_BRANCH - CI/CD will be triggered on push${NC}"

    # In high autonomy mode, this would auto-push:
    # echo "⬆️  Auto-pushing to origin..."
    # git push origin $CURRENT_BRANCH

    echo -e "${YELLOW}Note: Auto-push disabled for manual control${NC}"
    echo -e "${YELLOW}Run 'git push' to trigger CI/CD pipeline${NC}"
else
    echo -e "${BLUE}ℹ️  Feature branch detected - no auto-push${NC}"
fi

# Log commit for agent tracking
COMMIT_LOG="$PROJECT_ROOT/.claude/.commit-history.log"
echo "$(date '+%Y-%m-%d %H:%M:%S') | $CURRENT_BRANCH | $COMMIT_HASH | $COMMIT_MSG" >> "$COMMIT_LOG"

echo -e "${GREEN}✅ Post-commit hook completed${NC}"
