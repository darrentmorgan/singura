#!/bin/bash

# Manual test script for OAuth Scope Enrichment Service
# Usage: ./test-scope-enrichment.sh

set -e

echo "=========================================="
echo "OAuth Scope Enrichment Service Test"
echo "=========================================="
echo ""

# Ensure we're in the backend directory
cd "$(dirname "$0")"

# Check if database is running
if ! pg_isready -h localhost -p 5433 > /dev/null 2>&1; then
  echo "❌ PostgreSQL is not running on port 5433"
  echo "Please start the database with: docker compose up -d postgres"
  exit 1
fi

echo "✅ PostgreSQL is running"
echo ""

# Set database URL for test
export DATABASE_URL="postgresql://postgres:password@localhost:5433/singura"

# Run ts-node with the test script
echo "Running enrichment tests..."
echo ""

npx ts-node << 'EOF'
import { oauthScopeEnrichmentService } from './src/services/oauth-scope-enrichment.service';
import { db } from './src/database/pool';

async function test() {
  try {
    // Initialize database connection
    await db.initialize();

    console.log('========================================');
    console.log('Test 1: Enrich ChatGPT Drive Scope');
    console.log('========================================');
    const driveScope = await oauthScopeEnrichmentService.enrichScope(
      'https://www.googleapis.com/auth/drive.readonly',
      'google'
    );
    console.log(JSON.stringify(driveScope, null, 2));
    console.log('');

    console.log('========================================');
    console.log('Test 2: Enrich All ChatGPT Scopes');
    console.log('========================================');
    const chatgptScopes = [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'openid'
    ];
    const enriched = await oauthScopeEnrichmentService.enrichScopes(chatgptScopes, 'google');
    console.log(`Enriched ${enriched.length} scopes:`);
    enriched.forEach(scope => {
      console.log(`  - ${scope.displayName} (Risk: ${scope.riskScore}/100 - ${scope.riskLevel})`);
    });
    console.log('');

    console.log('========================================');
    console.log('Test 3: Calculate Permission Risk');
    console.log('========================================');
    const risk = oauthScopeEnrichmentService.calculatePermissionRisk(enriched);
    console.log(JSON.stringify(risk, null, 2));
    console.log('');

    console.log('========================================');
    console.log('Test 4: Get Enrichment Coverage');
    console.log('========================================');
    const coverage = await oauthScopeEnrichmentService.getEnrichmentCoverage(chatgptScopes, 'google');
    console.log(JSON.stringify(coverage, null, 2));
    console.log('');

    console.log('========================================');
    console.log('Test 5: Search Scopes');
    console.log('========================================');
    const searchResults = await oauthScopeEnrichmentService.searchScopes('google', 'drive', 5);
    console.log(`Found ${searchResults.length} scopes matching "drive":`);
    searchResults.forEach(scope => {
      console.log(`  - ${scope.displayName} (${scope.serviceName})`);
    });
    console.log('');

    console.log('========================================');
    console.log('Test 6: Get High-Risk Scopes');
    console.log('========================================');
    const highRisk = await oauthScopeEnrichmentService.getScopesByRiskLevel('google', 'HIGH');
    console.log(`Found ${highRisk.length} HIGH risk scopes:`);
    highRisk.slice(0, 5).forEach(scope => {
      console.log(`  - ${scope.displayName} (Risk: ${scope.riskScore}/100)`);
    });
    console.log('');

    console.log('========================================');
    console.log('Test 7: Cache Statistics');
    console.log('========================================');
    const cacheStats = oauthScopeEnrichmentService.getCacheStats();
    console.log(JSON.stringify(cacheStats, null, 2));
    console.log('');

    console.log('✅ All tests passed!');
    console.log('');

    // Close database connection
    await db.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    await db.close();
    process.exit(1);
  }
}

test();
EOF

echo ""
echo "=========================================="
echo "Test completed successfully!"
echo "=========================================="
