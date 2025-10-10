#!/bin/bash
#
# User Prompt Submit Hook
#
# Runs before processing user prompts to:
# 1. Check for updates to claude-config-template (once per day, non-blocking)
# 2. Log session activity for analytics
#
# Usage: Called automatically by Claude Code on every user prompt submission
#

USER_REQUEST="$1"

# ============================================
# UPDATE CHECKER (Non-blocking, Daily)
# ============================================

# Check for updates once per day (silently, in background)
if [ -f ".claude/scripts/check-updates.sh" ]; then
    # Only check if .version.json exists (template is installed)
    if [ -f ".claude/.version.json" ]; then
        # Run check in background, suppress all output unless update found
        # The check-updates.sh script handles its own caching (24hr interval)
        UPDATE_OUTPUT=$(.claude/scripts/check-updates.sh 2>&1)
        UPDATE_EXIT_CODE=$?

        # Only show output if update available (exit code 2)
        if [ $UPDATE_EXIT_CODE -eq 2 ]; then
            echo "$UPDATE_OUTPUT" >&2
            echo "" >&2
        fi
    fi
fi

# ============================================
# SESSION LOGGING (Optional)
# ============================================

# Log session activity (lightweight tracking)
if [ -n "$USER_REQUEST" ]; then
    SESSION_LOG=".claude/.session.log"

    # Create log directory if needed
    mkdir -p "$(dirname "$SESSION_LOG")"

    # Append timestamp and truncated request
    TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
    REQUEST_PREVIEW=$(echo "$USER_REQUEST" | head -c 50 | tr '\n' ' ')
    echo "$TIMESTAMP | Request: ${REQUEST_PREVIEW}..." >> "$SESSION_LOG"
fi

# ============================================
# ALWAYS ALLOW REQUEST TO CONTINUE
# ============================================

# This hook is purely informational and should never block execution
exit 0
