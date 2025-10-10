#!/bin/bash
# OAuth Scope Enrichment Testing Helper Script
# Usage: ./scripts/test-oauth-enrichment.sh [CLERK_TOKEN]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="${BACKEND_URL:-http://localhost:4201}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:4200}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}OAuth Scope Enrichment Test Suite${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Step 1: Check if servers are running
echo -e "${YELLOW}[1/5] Checking server status...${NC}"

if curl -s "${BACKEND_URL}/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend running at ${BACKEND_URL}${NC}"
else
    echo -e "${RED}✗ Backend not responding at ${BACKEND_URL}${NC}"
    exit 1
fi

if curl -s "${FRONTEND_URL}" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend running at ${FRONTEND_URL}${NC}"
else
    echo -e "${RED}✗ Frontend not responding at ${FRONTEND_URL}${NC}"
    exit 1
fi

echo ""

# Step 2: Test backend API (with or without auth)
echo -e "${YELLOW}[2/5] Testing backend API...${NC}"

CLERK_TOKEN="${1:-}"

if [ -z "$CLERK_TOKEN" ]; then
    echo -e "${RED}⚠ No Clerk token provided${NC}"
    echo -e "${YELLOW}Testing without authentication (will likely fail)...${NC}"
    RESPONSE=$(curl -s "${BACKEND_URL}/api/automations")
else
    echo -e "${GREEN}✓ Using provided Clerk token${NC}"
    RESPONSE=$(curl -s -H "Authorization: Bearer ${CLERK_TOKEN}" "${BACKEND_URL}/api/automations")
fi

echo -e "\n${BLUE}API Response:${NC}"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

# Check if response contains error
if echo "$RESPONSE" | grep -q "ORGANIZATION_NOT_FOUND\|UNAUTHORIZED"; then
    echo -e "\n${RED}✗ Authentication required${NC}"
    echo -e "${YELLOW}Please provide a valid Clerk token:${NC}"
    echo -e "  ./scripts/test-oauth-enrichment.sh <YOUR_CLERK_TOKEN>"
    echo -e "\n${YELLOW}To get a Clerk token:${NC}"
    echo -e "  1. Sign in to ${FRONTEND_URL}"
    echo -e "  2. Open DevTools → Application → Local Storage"
    echo -e "  3. Find '__session' cookie or Clerk token"
    exit 1
fi

echo ""

# Step 3: Verify risk level data
echo -e "${YELLOW}[3/5] Verifying risk level enrichment...${NC}"

# Check if response has automations array
if echo "$RESPONSE" | jq -e '.automations' > /dev/null 2>&1; then
    AUTOMATIONS=$(echo "$RESPONSE" | jq '.automations')
    COUNT=$(echo "$AUTOMATIONS" | jq 'length')

    echo -e "${GREEN}✓ Found ${COUNT} automations${NC}"

    # Check for risk levels
    HIGH_RISK=$(echo "$AUTOMATIONS" | jq '[.[] | select(.riskLevel == "high")] | length')
    MEDIUM_RISK=$(echo "$AUTOMATIONS" | jq '[.[] | select(.riskLevel == "medium")] | length')
    LOW_RISK=$(echo "$AUTOMATIONS" | jq '[.[] | select(.riskLevel == "low")] | length')
    UNKNOWN_RISK=$(echo "$AUTOMATIONS" | jq '[.[] | select(.riskLevel == null or .riskLevel == "unknown")] | length')

    echo -e "  ${RED}High Risk:${NC} ${HIGH_RISK}"
    echo -e "  ${YELLOW}Medium Risk:${NC} ${MEDIUM_RISK}"
    echo -e "  ${GREEN}Low Risk:${NC} ${LOW_RISK}"
    echo -e "  ${BLUE}Unknown Risk:${NC} ${UNKNOWN_RISK}"

    # Check for ChatGPT specifically
    CHATGPT=$(echo "$AUTOMATIONS" | jq '.[] | select(.name | contains("ChatGPT") or contains("GPT"))')

    if [ -n "$CHATGPT" ]; then
        echo -e "\n${BLUE}ChatGPT Automation:${NC}"
        echo "$CHATGPT" | jq '{name, riskLevel, "isAIPlatform": .metadata.isAIPlatform, "riskScore": .metadata.riskScore}'

        CHATGPT_RISK=$(echo "$CHATGPT" | jq -r '.riskLevel')
        CHATGPT_AI=$(echo "$CHATGPT" | jq -r '.metadata.isAIPlatform')

        if [ "$CHATGPT_RISK" = "high" ] && [ "$CHATGPT_AI" = "true" ]; then
            echo -e "${GREEN}✓ ChatGPT correctly marked as HIGH risk AI platform${NC}"
        else
            echo -e "${RED}✗ ChatGPT risk level incorrect${NC}"
            echo -e "  Expected: riskLevel='high', isAIPlatform=true"
            echo -e "  Got: riskLevel='${CHATGPT_RISK}', isAIPlatform='${CHATGPT_AI}'"
        fi
    else
        echo -e "${YELLOW}⚠ No ChatGPT automation found${NC}"
    fi

    # Warn if all are unknown
    if [ "$UNKNOWN_RISK" -eq "$COUNT" ] && [ "$COUNT" -gt 0 ]; then
        echo -e "\n${RED}⚠ WARNING: All automations have Unknown risk level${NC}"
        echo -e "${YELLOW}This indicates risk enrichment is not working${NC}"
    fi
else
    echo -e "${RED}✗ No automations in response${NC}"
fi

echo ""

# Step 4: Test OAuth scope enrichment
echo -e "${YELLOW}[4/5] Testing OAuth scope enrichment...${NC}"

if [ -n "$CLERK_TOKEN" ]; then
    # Get first automation ID
    FIRST_ID=$(echo "$AUTOMATIONS" | jq -r '.[0].id' 2>/dev/null)

    if [ -n "$FIRST_ID" ] && [ "$FIRST_ID" != "null" ]; then
        DETAILS=$(curl -s -H "Authorization: Bearer ${CLERK_TOKEN}" \
            "${BACKEND_URL}/api/automations/${FIRST_ID}/details")

        echo -e "${BLUE}Automation Details:${NC}"
        echo "$DETAILS" | jq '.'

        # Check for enriched scopes
        SCOPES=$(echo "$DETAILS" | jq -r '.automation.enrichedScopes // .automation.permissions' 2>/dev/null)

        if [ -n "$SCOPES" ]; then
            UNKNOWN_COUNT=$(echo "$SCOPES" | jq '[.[] | select(.displayName == "Unknown Permission")] | length' 2>/dev/null || echo "0")

            if [ "$UNKNOWN_COUNT" -gt 0 ]; then
                echo -e "${RED}✗ Found ${UNKNOWN_COUNT} scopes with 'Unknown Permission'${NC}"
                echo -e "${YELLOW}OAuth scope enrichment may not be working${NC}"
            else
                echo -e "${GREEN}✓ All scopes have proper display names${NC}"
            fi
        fi
    fi
else
    echo -e "${YELLOW}⚠ Skipping (no auth token)${NC}"
fi

echo ""

# Step 5: Summary and recommendations
echo -e "${YELLOW}[5/5] Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"

if [ "$UNKNOWN_RISK" -gt 0 ]; then
    echo -e "${RED}FAILED: Risk level enrichment issues detected${NC}\n"
    echo -e "${YELLOW}Recommendations:${NC}"
    echo -e "  1. Check backend enrichment service is running"
    echo -e "  2. Verify database has risk_level column populated"
    echo -e "  3. Check backend logs for enrichment errors"
    echo -e "  4. Run: ${BLUE}npm run backend:logs | grep enrichment${NC}"
else
    echo -e "${GREEN}PASSED: All automations have risk levels assigned${NC}\n"
fi

echo -e "${BLUE}Next Steps:${NC}"
echo -e "  - Run E2E tests: ${BLUE}npm run test:e2e${NC}"
echo -e "  - Check frontend display at: ${BLUE}${FRONTEND_URL}/automations${NC}"
echo -e "  - View detailed report: ${BLUE}./TEST_REPORT_OAUTH_SCOPE_ENRICHMENT.md${NC}"

echo ""
