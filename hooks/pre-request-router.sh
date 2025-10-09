#!/bin/bash
#
# Pre-Request Delegation Router Hook
#
# Analyzes incoming user requests and suggests appropriate agent delegation
# based on keyword matching and routing rules in delegation-map.json
#
# Now supports PARALLEL EXECUTION suggestions when multiple agents can run concurrently.
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
    # Run router with --plan flag to get full delegation plan
    PLAN_JSON=$(npx tsx .claude/scripts/delegation-router.ts "$USER_REQUEST" --plan 2>/dev/null)

    # If plan found (not "none"), inject delegation instruction
    if [ "$PLAN_JSON" != "none" ] && [ -n "$PLAN_JSON" ]; then
        # Parse JSON (requires jq)
        PRIMARY=$(echo "$PLAN_JSON" | jq -r '.primary_agent')
        SECONDARIES=$(echo "$PLAN_JSON" | jq -r '.secondary_agents[]' 2>/dev/null)
        MODE=$(echo "$PLAN_JSON" | jq -r '.execution_mode')
        RATIONALE=$(echo "$PLAN_JSON" | jq -r '.rationale')

        echo "========================================" >&2
        echo "🤖 AUTO-DELEGATION TRIGGERED" >&2
        echo "========================================" >&2
        echo "Request matched routing rules:" >&2
        echo "  Query: \"$USER_REQUEST\"" >&2
        echo "  Primary Agent: $PRIMARY" >&2

        if [ -n "$SECONDARIES" ]; then
            echo "  Secondary Agents:" >&2
            echo "$SECONDARIES" | while IFS= read -r agent; do
                echo "    - $agent" >&2
            done
        fi

        echo "  Execution Mode: $MODE" >&2
        echo "  Rationale: $RATIONALE" >&2
        echo "" >&2

        if [ "$MODE" = "parallel" ]; then
            echo "✅ PARALLEL EXECUTION ENABLED" >&2
            echo "" >&2
            echo "⚠️  ENFORCEMENT REMINDER:" >&2
            echo "  You MUST use SINGLE MESSAGE with MULTIPLE Task calls:" >&2
            echo "" >&2
            echo "  Example (run in PARALLEL):" >&2
            echo "    Task(frontend-developer) + Task(code-reviewer-pro) + Task(test-automator)" >&2
            echo "" >&2
            echo "  Do NOT run sequentially. Use one message with multiple Task blocks." >&2
        else
            echo "⚙️  SEQUENTIAL EXECUTION REQUIRED" >&2
            echo "" >&2
            echo "  Run agents one at a time:" >&2
            echo "  1. Task($PRIMARY)" >&2
            if [ -n "$SECONDARIES" ]; then
                echo "$SECONDARIES" | nl | while IFS= read -r line; do
                    agent=$(echo "$line" | awk '{print $2}')
                    num=$(($(echo "$line" | awk '{print $1}') + 1))
                    echo "  $num. Task($agent) - after primary completes" >&2
                done
            fi
        fi

        echo "" >&2
        echo "  See .claude/agents/delegation-map.json for routing rules" >&2
        echo "========================================" >&2
    fi
fi

# Always allow request to continue (non-blocking)
exit 0
