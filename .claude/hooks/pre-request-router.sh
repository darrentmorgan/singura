#!/bin/bash
#
# Pre-Request Delegation Router Hook
#
# Analyzes incoming user requests and suggests appropriate agent delegation
# based on keyword matching and routing rules in delegation-map.json
#
# This hook runs on UserPromptSubmit and injects delegation suggestions
# into the LLM's context to encourage proper delegation.
#
# Usage: Called automatically by Claude Code on every user prompt submission
#

USER_REQUEST="$1"

# Only process if request is non-empty
if [ -z "$USER_REQUEST" ]; then
    exit 0
fi

# Call delegation router script if it exists
if [ -f ".claude/scripts/delegation-router.ts" ]; then
    # Run router and capture output (agent name or "none")
    AGENT=$(npx tsx .claude/scripts/delegation-router.ts "$USER_REQUEST" 2>/dev/null)

    # If agent match found, inject delegation instruction
    if [ "$AGENT" != "none" ] && [ -n "$AGENT" ]; then
        echo "========================================" >&2
        echo "🤖 AUTO-DELEGATION TRIGGERED" >&2
        echo "========================================" >&2
        echo "Request matched routing rules:" >&2
        echo "  Query: \"$USER_REQUEST\"" >&2
        echo "  Agent: $AGENT" >&2
        echo "" >&2
        echo "⚠️  ENFORCEMENT REMINDER:" >&2
        echo "  You MUST use Task tool with:" >&2
        echo "  subagent_type: \"$AGENT\"" >&2
        echo "" >&2
        echo "  Do NOT:" >&2
        echo "  - Read files directly" >&2
        echo "  - Implement code yourself" >&2
        echo "  - Skip delegation" >&2
        echo "" >&2
        echo "  See .claude/agents/delegation-map.json for routing rules" >&2
        echo "========================================" >&2
    fi
fi

# Always allow request to continue (non-blocking)
exit 0
