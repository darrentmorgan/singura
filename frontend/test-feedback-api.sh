#!/bin/bash

# Test Feedback API Endpoints
# This script tests the feedback API integration

API_URL="http://localhost:4201/api"
FEEDBACK_URL="$API_URL/feedback"

echo "Testing Feedback API Endpoints"
echo "================================"
echo ""

# Test 1: Health Check
echo "1. Testing Health Check..."
curl -s "$API_URL/health" | jq .
echo ""

# Test 2: Create Feedback (will fail without auth, but tests endpoint)
echo "2. Testing Create Feedback endpoint..."
curl -s -X POST "$FEEDBACK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "automationId": "test-automation-1",
    "organizationId": "test-org",
    "userId": "test-user",
    "userEmail": "test@example.com",
    "feedbackType": "correct_detection",
    "sentiment": "positive",
    "comment": "This detection looks accurate!"
  }' | jq .
echo ""

# Test 3: Get Feedback List
echo "3. Testing Get Feedback List..."
curl -s "$FEEDBACK_URL" | jq .
echo ""

# Test 4: Get Statistics
echo "4. Testing Get Statistics for organization..."
curl -s "$FEEDBACK_URL/statistics/test-org" | jq .
echo ""

# Test 5: Get Trends
echo "5. Testing Get Trends..."
curl -s "$FEEDBACK_URL/trends/test-org?days=30" | jq .
echo ""

echo "================================"
echo "Feedback API Test Complete"
echo ""
echo "Note: Some endpoints may return 401 without proper authentication."
echo "This is expected behavior."
