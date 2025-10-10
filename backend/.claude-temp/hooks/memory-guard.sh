#!/bin/bash
# Memory Guard Hook
# Checks Claude Code process memory usage and blocks requests if too high

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

# Default limit: 6GB (75% of 8GB heap) - More aggressive to prevent crashes
# Lowered from 7GB after observing crashes at 7.5GB
LIMIT_MB=6144

# Load project settings if available
if [ -f ".claude/.env" ]; then
    source .claude/.env
    LIMIT_MB=${CLAUDE_MEMORY_LIMIT_MB:-7168}
fi

# Find Claude Code process
CLAUDE_PID=$(pgrep -f "claude" | head -1)

if [ -z "$CLAUDE_PID" ]; then
    # No Claude process found, allow to continue
    exit 0
fi

# Get RSS (Resident Set Size) in KB
RSS_KB=$(ps -p $CLAUDE_PID -o rss= 2>/dev/null | awk '{print $1}')

if [ -z "$RSS_KB" ]; then
    # Could not get memory info, allow to continue
    exit 0
fi

# Convert to MB
RSS_MB=$((RSS_KB / 1024))

# Calculate percentage
PERCENT=$((RSS_MB * 100 / LIMIT_MB))

# Check against limit
if [ $RSS_MB -gt $LIMIT_MB ]; then
    echo -e "${RED}═══════════════════════════════════════════${NC}" >&2
    echo -e "${RED}🚨 MEMORY LIMIT EXCEEDED 🚨${NC}" >&2
    echo -e "${RED}═══════════════════════════════════════════${NC}" >&2
    echo -e "${RED}Current memory: ${RSS_MB}MB / ${LIMIT_MB}MB (${PERCENT}%)${NC}" >&2
    echo "" >&2
    echo -e "${YELLOW}This request has been BLOCKED to prevent crash${NC}" >&2
    echo "" >&2
    echo -e "${YELLOW}⚠️  You experienced this error:${NC}" >&2
    echo -e "${YELLOW}   'FATAL ERROR: Reached heap limit'${NC}" >&2
    echo "" >&2
    echo -e "${YELLOW}Action required:${NC}" >&2
    echo -e "${YELLOW}1. Exit Claude Code (work auto-saved)${NC}" >&2
    echo -e "${YELLOW}2. Restart Claude Code (memory resets to 0%)${NC}" >&2
    echo -e "${YELLOW}3. If not installed, deploy artifact system:${NC}" >&2
    echo -e "${GREEN}   npx degit darrentmorgan/claude-config-template .claude-temp && \\${NC}" >&2
    echo -e "${GREEN}   cd .claude-temp && bash setup.sh && cd .. && rm -rf .claude-temp${NC}" >&2
    echo "" >&2
    echo -e "${YELLOW}4. Artifacts reduce context by 90%+${NC}" >&2
    echo -e "${RED}═══════════════════════════════════════════${NC}" >&2

    # Block the request
    exit 1
fi

# Warn at 80% threshold (4.9GB with new 6GB limit)
WARN_THRESHOLD=$((LIMIT_MB * 80 / 100))
if [ $RSS_MB -gt $WARN_THRESHOLD ]; then
    echo -e "${YELLOW}⚠️  Memory: ${RSS_MB}MB / ${LIMIT_MB}MB (${PERCENT}%) - Consider restarting soon${NC}" >&2
fi

# Memory is okay, allow to continue
exit 0
