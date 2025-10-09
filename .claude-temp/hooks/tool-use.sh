#!/bin/bash
# Tool-use hook: Triggered after Edit/Write operations for automated code review

set -e

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
PKG_MANAGER="{{PKG_MANAGER}}"
if [[ "$MODIFIED_FILE" == *".ts"* ]] || [[ "$MODIFIED_FILE" == *".tsx"* ]]; then
    echo "🔤 Quick type check..."
    $PKG_MANAGER exec tsc --noEmit --skipLibCheck "$MODIFIED_FILE" 2>/dev/null && \
        echo -e "${GREEN}✓ Type check passed${NC}" || \
        echo -e "${YELLOW}⚠ Type issues detected - consider running full type check${NC}"
fi

# Log the tool use for agent coordination
TOOL_USE_LOG=".claude/.tool-use.log"
echo "$(date '+%Y-%m-%d %H:%M:%S') | $FILE_TYPE | $MODIFIED_FILE | $SUGGESTED_AGENT" >> "$TOOL_USE_LOG"

# In full autonomy mode, this would invoke the sub-agent:
echo -e "${YELLOW}Note: Sub-agent invocation would happen here in full autonomy mode${NC}"
echo -e "${YELLOW}Agent $SUGGESTED_AGENT would review $MODIFIED_FILE${NC}"

# TODO: Invoke appropriate sub-agent via Claude Code Task tool
# Example:
# if [ "$AUTONOMY_LEVEL" = "high" ]; then
#     invoke_subagent "$SUGGESTED_AGENT" "$MODIFIED_FILE"
# fi

echo -e "${GREEN}✅ Tool-use hook completed${NC}"
