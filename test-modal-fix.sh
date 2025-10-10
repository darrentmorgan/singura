#!/bin/bash

# Test script for AutomationDetailsModal fixes
# Tests all edge cases for the modal crash issues

echo "========================================="
echo "AutomationDetailsModal Comprehensive Test"
echo "========================================="
echo ""

# Check if servers are running
echo "1. Checking if servers are running..."
FRONTEND_PORT=4203
BACKEND_PORT=4201

if ! lsof -ti:$FRONTEND_PORT > /dev/null 2>&1; then
  echo "❌ Frontend server not running on port $FRONTEND_PORT"
  exit 1
fi

if ! lsof -ti:$BACKEND_PORT > /dev/null 2>&1; then
  echo "❌ Backend server not running on port $BACKEND_PORT"
  exit 1
fi

echo "✅ Both servers running"
echo ""

# Test backend endpoint responses
echo "2. Testing backend /api/automations/:id/details endpoint..."
echo ""

# Test case 1: Mock automation with permissions
echo "Test Case 1: Mock automation with permissions"
RESPONSE=$(curl -s "http://localhost:$BACKEND_PORT/api/automations/1/details")
echo "Response structure:"
echo "$RESPONSE" | jq '{
  success,
  automation: {
    name,
    permissions: {
      total,
      hasEnriched: (.automation.permissions.enriched != null),
      enrichedIsArray: (.automation.permissions.enriched | type == "array"),
      enrichedLength: (.automation.permissions.enriched | length),
      hasRiskAnalysis: (.automation.permissions.riskAnalysis != null),
      riskAnalysis: {
        hasBreakdown: (.automation.permissions.riskAnalysis.breakdown != null),
        breakdownIsArray: (.automation.permissions.riskAnalysis.breakdown | type == "array"),
        breakdownLength: (.automation.permissions.riskAnalysis.breakdown | length)
      }
    }
  }
}'
echo ""

# Test case 2: Different mock automation
echo "Test Case 2: Different mock automation"
RESPONSE2=$(curl -s "http://localhost:$BACKEND_PORT/api/automations/2/details")
echo "Response structure:"
echo "$RESPONSE2" | jq '{
  success,
  automation: {
    name,
    permissions: {
      total,
      hasEnriched: (.automation.permissions.enriched != null),
      enrichedIsArray: (.automation.permissions.enriched | type == "array"),
      hasRiskAnalysis: (.automation.permissions.riskAnalysis != null)
    }
  }
}'
echo ""

# Validate all mock automations
echo "3. Validating all mock automations..."
for id in 1 2 3 4 5; do
  RESPONSE=$(curl -s "http://localhost:$BACKEND_PORT/api/automations/$id/details")
  SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
  NAME=$(echo "$RESPONSE" | jq -r '.automation.name')
  HAS_ENRICHED=$(echo "$RESPONSE" | jq -r '.automation.permissions.enriched != null')
  IS_ARRAY=$(echo "$RESPONSE" | jq -r '.automation.permissions.enriched | type == "array"')
  HAS_RISK=$(echo "$RESPONSE" | jq -r '.automation.permissions.riskAnalysis != null')

  if [ "$SUCCESS" = "true" ] && [ "$IS_ARRAY" = "true" ]; then
    echo "✅ Automation $id ($NAME): Valid structure"
  else
    echo "❌ Automation $id ($NAME): Invalid structure"
    echo "   - success: $SUCCESS"
    echo "   - hasEnriched: $HAS_ENRICHED"
    echo "   - isArray: $IS_ARRAY"
    echo "   - hasRiskAnalysis: $HAS_RISK"
  fi
done
echo ""

echo "========================================="
echo "Backend validation complete!"
echo "========================================="
echo ""
echo "Now manually test the frontend:"
echo "1. Open http://localhost:$FRONTEND_PORT"
echo "2. Navigate to Automations page"
echo "3. Click 'View Details' on each automation"
echo "4. Check all tabs (Permissions, Risk Analysis, Details)"
echo "5. Verify no console errors appear"
echo ""
