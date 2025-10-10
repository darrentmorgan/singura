#!/bin/bash
# Post-Agent Execution Hook
# Runs after each agent completes to force garbage collection and prevent memory accumulation
#
# This hook is critical for preventing memory crashes when running multiple agents sequentially.
# Forces GC between agents to clear accumulated memory from previous invocations.

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Force garbage collection if available
# Note: Requires node to be run with --expose-gc flag
if command -v node >/dev/null 2>&1; then
    # Run memory cleanup utility
    npx tsx --expose-gc .claude/scripts/memory-cleanup.ts --force 2>/dev/null

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Memory cleanup completed${NC}" >&2
    else
        # Fallback: Just log current memory usage
        echo -e "${YELLOW}⚠ GC not available (run with --expose-gc for better memory management)${NC}" >&2
    fi
fi

# Always allow execution to continue
exit 0
