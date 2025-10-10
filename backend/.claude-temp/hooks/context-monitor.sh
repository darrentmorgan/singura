#!/bin/bash
# Context Monitor Hook
# Runs after tool use to check context percentage and warn users

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

# Thresholds (configurable via .env)
WARN_60=60
WARN_70=70
WARN_80=80

# Load project settings if available
if [ -f ".claude/.env" ]; then
    source .claude/.env
    WARN_60=${CLAUDE_WARN_60:-60}
    WARN_70=${CLAUDE_WARN_70:-70}
    WARN_80=${CLAUDE_WARN_80:-80}
fi

# Try to get context usage from Claude Code
# This is a placeholder - actual implementation depends on Claude Code's API
# For now, we'll estimate based on conversation length and file operations

# Check if we can get actual context percentage
if [ -n "$CLAUDE_CONTEXT_PERCENT" ]; then
    CONTEXT_PCT=$CLAUDE_CONTEXT_PERCENT
else
    # Estimate based on session log size (rough heuristic)
    if [ -f ".claude/.session.log" ]; then
        LOG_LINES=$(wc -l < .claude/.session.log 2>/dev/null || echo 0)
        # Rough estimate: 1 line ≈ 0.05% context (adjust based on observation)
        CONTEXT_PCT=$((LOG_LINES / 20))
    else
        # No data available
        exit 0
    fi
fi

# Warn at thresholds
if [ $CONTEXT_PCT -ge $WARN_80 ]; then
    echo -e "${RED}═══════════════════════════════════════════${NC}" >&2
    echo -e "${RED}⚠️  CRITICAL: Context at ${CONTEXT_PCT}%${NC}" >&2
    echo -e "${RED}═══════════════════════════════════════════${NC}" >&2
    echo -e "${RED}Action required: Start new Claude Code session${NC}" >&2
    echo -e "${RED}Your work is saved in git${NC}" >&2
    echo -e "${RED}═══════════════════════════════════════════${NC}" >&2
    echo "" >&2
elif [ $CONTEXT_PCT -ge $WARN_70 ]; then
    echo -e "${YELLOW}════════════════════════════════════════${NC}" >&2
    echo -e "${YELLOW}⚠️  WARNING: Context at ${CONTEXT_PCT}%${NC}" >&2
    echo -e "${YELLOW}════════════════════════════════════════${NC}" >&2
    echo -e "${YELLOW}Consider restarting session soon${NC}" >&2
    echo -e "${YELLOW}Crashes typically occur above 70%${NC}" >&2
    echo "" >&2
elif [ $CONTEXT_PCT -ge $WARN_60 ]; then
    echo -e "${YELLOW}Context usage: ${CONTEXT_PCT}% - Monitor closely${NC}" >&2
    echo "" >&2
fi

# Always allow execution to continue
exit 0
