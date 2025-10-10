#!/bin/bash
# Manual Memory Check Script
# Users can run this to check current memory usage

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}  Claude Code Memory Status${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""

# Find Claude Code process
CLAUDE_PIDS=$(pgrep -f "claude")

if [ -z "$CLAUDE_PIDS" ]; then
    echo -e "${YELLOW}No Claude Code processes found${NC}"
    exit 0
fi

TOTAL_RSS=0
COUNT=0

for PID in $CLAUDE_PIDS; do
    RSS_KB=$(ps -p $PID -o rss= 2>/dev/null | awk '{print $1}')
    if [ -n "$RSS_KB" ]; then
        RSS_MB=$((RSS_KB / 1024))
        TOTAL_RSS=$((TOTAL_RSS + RSS_MB))
        COUNT=$((COUNT + 1))

        CMD=$(ps -p $PID -o comm= 2>/dev/null)
        echo -e "${BLUE}Process:${NC} $CMD (PID: $PID)"

        # Color based on usage
        if [ $RSS_MB -gt 7168 ]; then
            echo -e "${RED}Memory:${NC} ${RSS_MB}MB ${RED}(⚠️ HIGH)${NC}"
        elif [ $RSS_MB -gt 5120 ]; then
            echo -e "${YELLOW}Memory:${NC} ${RSS_MB}MB ${YELLOW}(WARNING)${NC}"
        else
            echo -e "${GREEN}Memory:${NC} ${RSS_MB}MB ${GREEN}(OK)${NC}"
        fi
        echo ""
    fi
done

if [ $COUNT -gt 0 ]; then
    echo -e "${BLUE}═══════════════════════════════════════════${NC}"
    echo -e "${BLUE}Total:${NC} $COUNT process(es), ${TOTAL_RSS}MB RSS"
    echo -e "${BLUE}═══════════════════════════════════════════${NC}"
    echo ""

    # Recommendations
    if [ $TOTAL_RSS -gt 7168 ]; then
        echo -e "${RED}⚠️  Memory usage is HIGH${NC}"
        echo -e "${RED}Recommendation: Restart Claude Code session${NC}"
    elif [ $TOTAL_RSS -gt 5120 ]; then
        echo -e "${YELLOW}⚠️  Memory usage elevated${NC}"
        echo -e "${YELLOW}Recommendation: Monitor closely, consider restarting soon${NC}"
    else
        echo -e "${GREEN}✅ Memory usage is healthy${NC}"
    fi
fi

# Check log sizes
echo ""
echo -e "${BLUE}Log File Sizes:${NC}"
if [ -f ".claude/.session.log" ]; then
    LINES=$(wc -l < .claude/.session.log)
    SIZE=$(du -h .claude/.session.log | awk '{print $1}')
    echo -e "  Session log: ${LINES} lines (${SIZE})"
fi

if [ -f ".claude/.tool-use.log" ]; then
    LINES=$(wc -l < .claude/.tool-use.log)
    SIZE=$(du -h .claude/.tool-use.log | awk '{print $1}')
    echo -e "  Tool-use log: ${LINES} lines (${SIZE})"
fi

if [ -d ".claude/logs/archive" ]; then
    COUNT=$(ls -1 .claude/logs/archive | wc -l)
    echo -e "  Archived logs: ${COUNT} files"
fi

echo ""
