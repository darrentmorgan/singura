#!/bin/bash
# Test-result hook: Analyze test results and trigger appropriate responses

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
    echo "$(date '+%Y-%m-%d %H:%M:%S') | PASS | All tests passed" >> ".claude/.test-history.log"

    # In high autonomy mode, this could trigger deployment gate
    echo -e "${YELLOW}🚀 Tests passed - ready for deployment gate${NC}"
    echo -e "${YELLOW}Note: Would invoke qa-expert agent for E2E validation${NC}"

    # TODO: Invoke QA agent for E2E tests with Chrome DevTools
    # invoke_subagent "qa-expert" "run-e2e-tests"

else
    echo -e "${RED}❌ Tests FAILED (exit code: $TEST_EXIT_CODE)${NC}"

    # Log failure
    echo "$(date '+%Y-%m-d %H:%M:%S') | FAIL | Exit code: $TEST_EXIT_CODE" >> ".claude/.test-history.log"

    # Parse test output if available
    if [ -f "$TEST_OUTPUT_FILE" ]; then
        echo -e "${YELLOW}📋 Failed Test Summary:${NC}"

        # Extract failed test names (works for Vitest output)
        grep -E "✖|FAIL|Error" "$TEST_OUTPUT_FILE" | head -10 || echo "No detailed failure info available"
    fi

    # In high autonomy mode, invoke debugger agent
    echo -e "${YELLOW}🔍 Would invoke debugger agent to analyze failures${NC}"

    # TODO: Invoke debugger sub-agent with test output
    # invoke_subagent "debugger" "$TEST_OUTPUT_FILE"

    echo -e "${RED}❌ Deployment blocked due to test failures${NC}"
fi

# Calculate test metrics (if test report available)
if command -v jq &> /dev/null && [ -f ".claude/.test-coverage.json" ]; then
    COVERAGE=$(jq '.total.lines.pct' .claude/.test-coverage.json 2>/dev/null || echo "N/A")
    echo -e "${YELLOW}📈 Code Coverage: ${COVERAGE}%${NC}"
fi

echo -e "${GREEN}✅ Test-result hook completed${NC}"

# Exit with original test exit code
exit "$TEST_EXIT_CODE"
