#!/bin/bash
# Tool-use hook: Triggered after Edit/Write operations for automated code review

set -e

# Ensure we have project root for absolute paths
PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"

echo "🛠️  Tool-use Hook Starting..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get modified file from argument (if provided by Claude Code)
MODIFIED_FILE="${1:-unknown}"

echo -e "${BLUE}📝 File Modified: $MODIFIED_FILE${NC}"

# Determine file type and appropriate sub-agent
if [[ "$MODIFIED_FILE" == *".tsx" ]] || [[ "$MODIFIED_FILE" == *".jsx" ]]; then
    FILE_TYPE="react-component"
    SUGGESTED_AGENT="frontend-developer"
elif [[ "$MODIFIED_FILE" == *"/src/server/"* ]]; then
    FILE_TYPE="backend-api"
    SUGGESTED_AGENT="backend-architect"
elif [[ "$MODIFIED_FILE" == *".ts" ]] && [[ "$MODIFIED_FILE" != *".test.ts" ]]; then
    FILE_TYPE="typescript"
    SUGGESTED_AGENT="typescript-pro"
elif [[ "$MODIFIED_FILE" == *".test.ts"* ]]; then
    FILE_TYPE="test"
    SUGGESTED_AGENT="test-automator"
else
    FILE_TYPE="general"
    SUGGESTED_AGENT="code-reviewer-pro"
fi

echo -e "${BLUE}🎯 File Type: $FILE_TYPE${NC}"
echo -e "${YELLOW}🤖 Suggested Agent: $SUGGESTED_AGENT${NC}"

# Auto-format the file if it's a code file
if [[ "$MODIFIED_FILE" == *".ts"* ]] || [[ "$MODIFIED_FILE" == *".tsx"* ]] || [[ "$MODIFIED_FILE" == *".js"* ]] || [[ "$MODIFIED_FILE" == *".jsx"* ]]; then
    echo "✨ Auto-formatting file..."
    if command -v prettier &> /dev/null; then
        prettier --write "$MODIFIED_FILE" 2>/dev/null || echo "Note: Prettier not configured"
    fi
fi

# Quick type check if TypeScript file
PKG_MANAGER="npm"
if [[ "$MODIFIED_FILE" == *".ts"* ]] || [[ "$MODIFIED_FILE" == *".tsx"* ]]; then
    echo "🔤 Quick type check..."
    $PKG_MANAGER exec tsc --noEmit --skipLibCheck "$MODIFIED_FILE" 2>/dev/null && \
        echo -e "${GREEN}✓ Type check passed${NC}" || \
        echo -e "${YELLOW}⚠ Type issues detected - consider running full type check${NC}"
fi

# Log the tool use for agent coordination
TOOL_USE_LOG="$PROJECT_ROOT/.claude/.tool-use.log"
echo "$(date '+%Y-%m-%d %H:%M:%S') | $FILE_TYPE | $MODIFIED_FILE | $SUGGESTED_AGENT" >> "$TOOL_USE_LOG"

# Auto-delegation system for autonomous agent chaining
AUTONOMY_LEVEL="${AUTONOMY_LEVEL:-high}"
AUTO_DELEGATE_SCRIPT="$PROJECT_ROOT/.claude/scripts/auto-delegate.sh"

if [ "$AUTONOMY_LEVEL" = "high" ] && [ -f "$AUTO_DELEGATE_SCRIPT" ]; then
    # Check if we can auto-delegate (chain depth limit)
    if "$AUTO_DELEGATE_SCRIPT" can-delegate 2>/dev/null; then
        # Queue the delegation task
        "$AUTO_DELEGATE_SCRIPT" queue "$SUGGESTED_AGENT" "$MODIFIED_FILE" "Review and validate code quality" 2>&1 >&2

        # Get next pending task and generate instruction for Claude
        NEXT_TASK=$("$AUTO_DELEGATE_SCRIPT" next 2>/dev/null)

        if [ "$NEXT_TASK" != "null" ] && [ -n "$NEXT_TASK" ]; then
            # Mark as in progress
            TASK_ID=$(echo "$NEXT_TASK" | jq -r '.id' 2>/dev/null)
            "$AUTO_DELEGATE_SCRIPT" start "$TASK_ID" 2>/dev/null

            # Increment chain depth
            "$AUTO_DELEGATE_SCRIPT" increment-depth "$SUGGESTED_AGENT" 2>&1 >&2

            # Output delegation instruction for Claude to read
            echo "" >&2
            "$AUTO_DELEGATE_SCRIPT" generate-instruction "$NEXT_TASK" >&2
            echo "" >&2
            echo -e "${GREEN}Note: Task queued - Claude should auto-delegate immediately${NC}" >&2
        fi
    else
        echo -e "${YELLOW}Auto-delegation blocked (check autonomy level or chain depth limit)${NC}" >&2
        echo -e "${YELLOW}Agent $SUGGESTED_AGENT would review $MODIFIED_FILE in autonomous mode${NC}" >&2
    fi
elif [ "$AUTONOMY_LEVEL" = "high" ]; then
    # Fallback to old behavior if script not found
    echo "" >&2
    echo "========================================" >&2
    echo "🤖 AUTO-REVIEW SUGGESTED" >&2
    echo "========================================" >&2
    echo "Task: Use Task tool to invoke '$SUGGESTED_AGENT' agent" >&2
    echo "File: $MODIFIED_FILE" >&2
    echo "⚠️  AUTONOMOUS MODE: Execute immediately" >&2
    echo "========================================" >&2
else
    echo -e "${YELLOW}Note: Autonomy mode is '$AUTONOMY_LEVEL' - manual review recommended${NC}" >&2
    echo -e "${YELLOW}Agent $SUGGESTED_AGENT would review $MODIFIED_FILE in high autonomy mode${NC}" >&2
fi

echo -e "${GREEN}✅ Tool-use hook completed${NC}"
