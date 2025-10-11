#!/bin/bash
# Auto-delegation queue manager
# Manages autonomous agent delegation requests from hooks

set -euo pipefail

PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
QUEUE_FILE="$PROJECT_ROOT/.claude/.auto-delegation-queue.json"
CHAIN_TRACKING_FILE="$PROJECT_ROOT/.claude/.agent-chain-depth.json"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Default configuration
MAX_CHAIN_DEPTH="${MAX_AGENT_CHAIN_DEPTH:-3}"
AUTONOMY_LEVEL="${AUTONOMY_LEVEL:-high}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Initialize queue file if it doesn't exist
init_queue() {
    if [[ ! -f "$QUEUE_FILE" ]]; then
        echo '{"pending":[],"in_progress":[],"completed":[]}' > "$QUEUE_FILE"
    fi
}

# Initialize chain tracking
init_chain_tracking() {
    if [[ ! -f "$CHAIN_TRACKING_FILE" ]]; then
        echo '{"current_depth":0,"chain_history":[],"max_depth_reached":false}' > "$CHAIN_TRACKING_FILE"
    fi
}

# Add delegation task to queue
queue_delegation() {
    local agent="$1"
    local file_path="$2"
    local reason="${3:-Code review}"

    init_queue

    # Create delegation task
    local task=$(cat <<EOF
{
  "id": "$(uuidgen 2>/dev/null || echo "task_$(date +%s)")",
  "agent": "$agent",
  "file_path": "$file_path",
  "reason": "$reason",
  "queued_at": "$TIMESTAMP",
  "priority": "normal"
}
EOF
)

    # Add to pending queue
    local temp_file=$(mktemp)
    jq --argjson task "$task" '.pending += [$task]' "$QUEUE_FILE" > "$temp_file"
    mv "$temp_file" "$QUEUE_FILE"

    echo -e "${GREEN}✓ Queued delegation to $agent${NC}" >&2
    echo -e "  File: $file_path" >&2
    echo -e "  Reason: $reason" >&2
}

# Get next pending delegation
get_next() {
    init_queue

    local next=$(jq -r '.pending[0]' "$QUEUE_FILE")
    if [[ "$next" == "null" ]]; then
        echo "null"
        return 1
    fi

    echo "$next"
}

# Mark delegation as in progress
mark_in_progress() {
    local task_id="$1"

    local temp_file=$(mktemp)
    jq --arg id "$task_id" '
        .in_progress += [(.pending[] | select(.id == $id) | . + {"started_at": "'$TIMESTAMP'"})] |
        .pending = [.pending[] | select(.id != $id)]
    ' "$QUEUE_FILE" > "$temp_file"
    mv "$temp_file" "$QUEUE_FILE"
}

# Mark delegation as completed
mark_completed() {
    local task_id="$1"
    local result="${2:-success}"

    local temp_file=$(mktemp)
    jq --arg id "$task_id" --arg result "$result" '
        .completed += [(.in_progress[] | select(.id == $id) | . + {"completed_at": "'$TIMESTAMP'", "result": $result})] |
        .in_progress = [.in_progress[] | select(.id != $id)]
    ' "$QUEUE_FILE" > "$temp_file"
    mv "$temp_file" "$QUEUE_FILE"
}

# Clear completed tasks older than 1 hour
cleanup_old_tasks() {
    local temp_file=$(mktemp)
    local one_hour_ago=$(date -u -v-1H +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -d '1 hour ago' +"%Y-%m-%dT%H:%M:%SZ")

    jq --arg cutoff "$one_hour_ago" '
        .completed = [.completed[] | select(.completed_at > $cutoff)]
    ' "$QUEUE_FILE" > "$temp_file"
    mv "$temp_file" "$QUEUE_FILE"
}

# Increment chain depth
increment_chain_depth() {
    init_chain_tracking

    local temp_file=$(mktemp)
    jq --arg agent "$1" --arg ts "$TIMESTAMP" '
        .current_depth += 1 |
        .chain_history += [{"agent": $agent, "timestamp": $ts, "depth": .current_depth}] |
        if .current_depth >= '$MAX_CHAIN_DEPTH' then .max_depth_reached = true else . end
    ' "$CHAIN_TRACKING_FILE" > "$temp_file"
    mv "$temp_file" "$CHAIN_TRACKING_FILE"

    local current_depth=$(jq -r '.current_depth' "$CHAIN_TRACKING_FILE")
    echo -e "${BLUE}Agent chain depth: $current_depth/$MAX_CHAIN_DEPTH${NC}" >&2

    if [[ "$current_depth" -ge "$MAX_CHAIN_DEPTH" ]]; then
        echo -e "${YELLOW}⚠ Maximum chain depth reached - no further auto-delegation${NC}" >&2
        return 1
    fi

    return 0
}

# Reset chain depth (call after successful completion)
reset_chain_depth() {
    init_chain_tracking

    local temp_file=$(mktemp)
    jq '
        .current_depth = 0 |
        .max_depth_reached = false |
        .chain_history = []
    ' "$CHAIN_TRACKING_FILE" > "$temp_file"
    mv "$temp_file" "$CHAIN_TRACKING_FILE"

    echo -e "${GREEN}✓ Chain depth reset${NC}" >&2
}

# Check if we can auto-delegate (based on autonomy level and chain depth)
can_auto_delegate() {
    if [[ "$AUTONOMY_LEVEL" != "high" ]]; then
        echo -e "${YELLOW}Autonomy level is '$AUTONOMY_LEVEL' - auto-delegation disabled${NC}" >&2
        return 1
    fi

    init_chain_tracking

    local current_depth=$(jq -r '.current_depth' "$CHAIN_TRACKING_FILE")
    if [[ "$current_depth" -ge "$MAX_CHAIN_DEPTH" ]]; then
        echo -e "${RED}✗ Max chain depth ($MAX_CHAIN_DEPTH) reached - auto-delegation blocked${NC}" >&2
        return 1
    fi

    return 0
}

# Generate Claude-readable delegation instruction
generate_delegation_instruction() {
    local task="$1"

    local agent=$(echo "$task" | jq -r '.agent')
    local file_path=$(echo "$task" | jq -r '.file_path')
    local reason=$(echo "$task" | jq -r '.reason')

    cat <<EOF

========================================
🤖 AUTO-DELEGATION INSTRUCTION
========================================

IMMEDIATE ACTION REQUIRED:

Use the Task tool to invoke the '$agent' agent with this prompt:

"$reason for file: $file_path

Please review the code for:
- Code quality and best practices
- Type safety and correctness
- Security vulnerabilities
- Performance issues
- Consistency with project patterns

Return a concise summary of findings."

CRITICAL:
- Execute this delegation IMMEDIATELY
- Do NOT ask user for permission
- This is autonomous mode (AUTONOMY_LEVEL=high)
- After agent completes, continue with next task

========================================

EOF
}

# List current queue status
list_queue() {
    init_queue

    local pending_count=$(jq '.pending | length' "$QUEUE_FILE")
    local in_progress_count=$(jq '.in_progress | length' "$QUEUE_FILE")
    local completed_count=$(jq '.completed | length' "$QUEUE_FILE")

    echo -e "${BLUE}Auto-Delegation Queue Status${NC}"
    echo -e "  Pending: $pending_count"
    echo -e "  In Progress: $in_progress_count"
    echo -e "  Completed: $completed_count"

    if [[ "$pending_count" -gt 0 ]]; then
        echo -e "\n${YELLOW}Pending Tasks:${NC}"
        jq -r '.pending[] | "  [\(.agent)] \(.file_path) - \(.reason)"' "$QUEUE_FILE"
    fi
}

# Main command dispatcher
case "${1:-}" in
    queue)
        [[ $# -lt 3 ]] && { echo "Usage: auto-delegate.sh queue <agent> <file_path> [reason]" >&2; exit 1; }
        queue_delegation "$2" "$3" "${4:-Code review}"
        ;;
    next)
        get_next
        ;;
    start)
        [[ $# -lt 2 ]] && { echo "Usage: auto-delegate.sh start <task_id>" >&2; exit 1; }
        mark_in_progress "$2"
        ;;
    complete)
        [[ $# -lt 2 ]] && { echo "Usage: auto-delegate.sh complete <task_id> [result]" >&2; exit 1; }
        mark_completed "$2" "${3:-success}"
        ;;
    increment-depth)
        [[ $# -lt 2 ]] && { echo "Usage: auto-delegate.sh increment-depth <agent>" >&2; exit 1; }
        increment_chain_depth "$2"
        ;;
    reset-depth)
        reset_chain_depth
        ;;
    can-delegate)
        can_auto_delegate
        ;;
    generate-instruction)
        [[ $# -lt 2 ]] && { echo "Usage: auto-delegate.sh generate-instruction <task_json>" >&2; exit 1; }
        generate_delegation_instruction "$2"
        ;;
    list)
        list_queue
        ;;
    cleanup)
        cleanup_old_tasks
        ;;
    *)
        echo "Usage: auto-delegate.sh <command> [args]"
        echo ""
        echo "Commands:"
        echo "  queue <agent> <file> [reason]  - Add delegation to queue"
        echo "  next                            - Get next pending task"
        echo "  start <task_id>                 - Mark task as in progress"
        echo "  complete <task_id> [result]     - Mark task as completed"
        echo "  increment-depth <agent>         - Increment chain depth"
        echo "  reset-depth                     - Reset chain depth to 0"
        echo "  can-delegate                    - Check if auto-delegation allowed"
        echo "  generate-instruction <task_json> - Generate Claude instruction"
        echo "  list                            - Show queue status"
        echo "  cleanup                         - Remove old completed tasks"
        exit 1
        ;;
esac
