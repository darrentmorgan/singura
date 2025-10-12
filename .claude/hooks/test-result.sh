#!/bin/bash
# Test-result hook: Analyze test results and trigger appropriate responses

# Ensure we have project root for absolute paths
PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
set -e

echo "🧪 Test-result Hook Starting..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get test exit code (0 = pass, non-zero = fail)
TEST_EXIT_CODE="${1:-0}"
TEST_OUTPUT_FILE="${2:-.claude/.last-test-output.log}"

echo -e "${YELLOW}📊 Analyzing test results...${NC}"

# Check if tests passed or failed
if [ "$TEST_EXIT_CODE" -eq 0 ]; then
    echo -e "${GREEN}✅ All tests PASSED${NC}"

    # Log success
    echo "$(date '+%Y-%m-%d %H:%M:%S') | PASS | All tests passed" >> "$PROJECT_ROOT/.claude/.test-history.log"

    # In high autonomy mode, this could trigger deployment gate
    echo -e "${YELLOW}🚀 Tests passed - ready for deployment gate${NC}"
    echo -e "${YELLOW}Note: Would invoke qa-expert agent for E2E validation${NC}"

    # TODO: Invoke QA agent for E2E tests with Chrome DevTools
    # invoke_subagent "qa-expert" "run-e2e-tests"

else
    echo -e "${RED}❌ Tests FAILED (exit code: $TEST_EXIT_CODE)${NC}"

    # Log failure
    echo "$(date '+%Y-%m-%d %H:%M:%S') | FAIL | Exit code: $TEST_EXIT_CODE" >> "$PROJECT_ROOT/.claude/.test-history.log"

    # Parse test output if available
    FAILURE_SUMMARY=""
    if [ -f "$TEST_OUTPUT_FILE" ]; then
        echo -e "${YELLOW}📋 Failed Test Summary:${NC}"

        # Extract failed test names (works for Vitest/Jest output)
        FAILURE_SUMMARY=$(grep -E "✖|FAIL|Error|TypeError|ReferenceError" "$TEST_OUTPUT_FILE" | head -10 || echo "No detailed failure info available")
        echo "$FAILURE_SUMMARY"
    fi

    # Auto-delegation for test failures (if autonomy enabled)
    AUTONOMY_LEVEL="${AUTONOMY_LEVEL:-high}"
    AUTO_DELEGATE_SCRIPT="$PROJECT_ROOT/.claude/scripts/auto-delegate.sh"
    TEST_RETRY_FILE="$PROJECT_ROOT/.claude/.test-retry-count.txt"

    if [ "$AUTONOMY_LEVEL" = "high" ] && [ -f "$AUTO_DELEGATE_SCRIPT" ]; then
        # Check retry count
        RETRY_COUNT=0
        if [ -f "$TEST_RETRY_FILE" ]; then
            RETRY_COUNT=$(cat "$TEST_RETRY_FILE")
        fi

        MAX_RETRIES="${MAX_TEST_RETRIES:-3}"

        if [ "$RETRY_COUNT" -lt "$MAX_RETRIES" ]; then
            echo "" >&2
            echo -e "${YELLOW}🔄 Auto-fix attempt $((RETRY_COUNT + 1))/$MAX_RETRIES${NC}" >&2

            # Determine which agent to use based on error type
            if echo "$FAILURE_SUMMARY" | grep -q "Type.*Error\|type"; then
                FIXING_AGENT="typescript-pro"
                REASON="Fix TypeScript type errors in failing tests"
            elif echo "$FAILURE_SUMMARY" | grep -q "ReferenceError\|is not defined"; then
                FIXING_AGENT="debugger"
                REASON="Fix undefined reference errors in tests"
            elif echo "$FAILURE_SUMMARY" | grep -q "timeout\|async"; then
                FIXING_AGENT="debugger"
                REASON="Fix async/timeout issues in tests"
            else
                FIXING_AGENT="debugger"
                REASON="Analyze and fix test failures"
            fi

            # Queue the delegation
            "$AUTO_DELEGATE_SCRIPT" queue "$FIXING_AGENT" "$TEST_OUTPUT_FILE" "$REASON" 2>&1 >&2

            # Increment retry count
            echo $((RETRY_COUNT + 1)) > "$TEST_RETRY_FILE"

            echo -e "${GREEN}✓ Queued $FIXING_AGENT agent to fix test failures${NC}" >&2
            echo -e "${YELLOW}  On next request, Claude will auto-delegate to fix these issues${NC}" >&2
            echo -e "${YELLOW}  After fixes, re-run tests automatically${NC}" >&2
        else
            echo "" >&2
            echo -e "${RED}⚠ Maximum retry attempts ($MAX_RETRIES) reached${NC}" >&2
            echo -e "${RED}  Manual intervention required${NC}" >&2
            echo -e "${YELLOW}  Reset retry count: rm $TEST_RETRY_FILE${NC}" >&2

            # Reset retry count for next test run
            rm -f "$TEST_RETRY_FILE"
        fi
    else
        echo -e "${YELLOW}🔍 Autonomy mode: $AUTONOMY_LEVEL - manual debugging required${NC}"
        echo -e "${YELLOW}  Would invoke debugger agent to analyze failures${NC}"
    fi

    echo -e "${RED}❌ Deployment blocked due to test failures${NC}"
fi

# Calculate test metrics (if test report available)
if command -v jq &> /dev/null && [ -f "$PROJECT_ROOT/.claude/.test-coverage.json" ]; then
    COVERAGE=$(jq '.total.lines.pct' .claude/.test-coverage.json 2>/dev/null || echo "N/A")
    echo -e "${YELLOW}📈 Code Coverage: ${COVERAGE}%${NC}"
fi

echo -e "${GREEN}✅ Test-result hook completed${NC}"

# Exit with original test exit code
exit "$TEST_EXIT_CODE"
