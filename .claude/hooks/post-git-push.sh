#!/bin/bash
# Post-push checkpoint hook
# Creates workflow checkpoint after successful git push

set -euo pipefail

STATE_FILE=".claude/.workflow-state.json"
WORKFLOW_MANAGER=".claude/scripts/workflow-manager.sh"

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if workflow exists
if [[ ! -f "$STATE_FILE" ]]; then
    # No workflow active, exit silently
    exit 0
fi

# Get current workflow status
current_phase=$(jq -r '.currentPhaseId' "$STATE_FILE" 2>/dev/null || echo "null")

if [[ "$current_phase" == "null" || -z "$current_phase" ]]; then
    # No active phase, exit silently
    exit 0
fi

# Get phase details
phase_name=$(jq -r ".phases[] | select(.id == \"$current_phase\") | .name" "$STATE_FILE")
phase_status=$(jq -r ".phases[] | select(.id == \"$current_phase\") | .status" "$STATE_FILE")

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Git push successful - Workflow checkpoint reached${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Current Phase: ${YELLOW}$phase_name${NC} ($current_phase)"
echo -e "  Status: $phase_status"
echo ""

# Check if phase is in progress
if [[ "$phase_status" == "in_progress" ]]; then
    # Add checkpoint event
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    temp_file=$(mktemp)
    jq --arg ts "$timestamp" \
       --arg id "$current_phase" \
       '.history += [{
          "timestamp": $ts,
          "event": "checkpoint",
          "phaseId": $id,
          "notes": "Git push checkpoint - code committed and pushed"
        }]' "$STATE_FILE" > "$temp_file"
    mv "$temp_file" "$STATE_FILE"

    echo -e "${YELLOW}Checkpoint Options:${NC}"
    echo ""
    echo "  1. Continue working in this conversation"
    echo "  2. Start fresh conversation with: /resume"
    echo "  3. Mark phase complete if all success criteria met"
    echo ""

    # Show next phase if available
    next_phase=$(jq -r '.phases[] | select(.status == "pending") | .id' "$STATE_FILE" 2>/dev/null | head -n 1)
    if [[ -n "$next_phase" && "$next_phase" != "null" ]]; then
        next_name=$(jq -r ".phases[] | select(.id == \"$next_phase\") | .name" "$STATE_FILE")
        echo -e "  ${BLUE}Next Phase:${NC} $next_name ($next_phase)"
        echo ""
    fi

    # Show progress
    total_phases=$(jq '.phases | length' "$STATE_FILE")
    completed_phases=$(jq '.completedPhases | length' "$STATE_FILE")
    echo -e "  ${BLUE}Progress:${NC} $completed_phases/$total_phases phases completed"
    echo ""
fi

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

exit 0
