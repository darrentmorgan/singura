#!/bin/bash
# Log Archival Hook
# Automatically archives old session logs to prevent unbounded growth

# Default threshold: 1000 lines
THRESHOLD=1000

# Load project settings if available
if [ -f ".claude/.env" ]; then
    source .claude/.env
    THRESHOLD=${CLAUDE_LOG_ARCHIVE_THRESHOLD:-1000}
    AUTO_ARCHIVE=${CLAUDE_AUTO_ARCHIVE_LOGS:-true}

    # Skip if auto-archive is disabled
    if [ "$AUTO_ARCHIVE" != "true" ]; then
        exit 0
    fi
fi

# Paths
LOG_FILE=".claude/.session.log"
TOOL_USE_LOG=".claude/.tool-use.log"
ARCHIVE_DIR=".claude/logs/archive"

# Function to archive a log file
archive_log() {
    local file=$1
    local name=$(basename "$file")

    if [ ! -f "$file" ]; then
        return
    fi

    local lines=$(wc -l < "$file" 2>/dev/null || echo 0)

    if [ $lines -gt $THRESHOLD ]; then
        mkdir -p "$ARCHIVE_DIR"
        local timestamp=$(date +%Y%m%d-%H%M%S)
        local archive_name="${name%.log}-${timestamp}.log"

        mv "$file" "$ARCHIVE_DIR/$archive_name"
        echo "📦 Archived $name ($lines lines) to $archive_name" >&2

        # Create empty file
        touch "$file"
    fi
}

# Archive both log files
archive_log "$LOG_FILE"
archive_log "$TOOL_USE_LOG"

# Always allow execution to continue
exit 0
