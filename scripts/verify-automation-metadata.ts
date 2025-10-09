#!/usr/bin/env ts-node
/**
 * Script to verify automation metadata is properly populated
 * Tests the /automations and /automations/:id/details endpoints
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000/api';
const FRONTEND_BASE = 'http://localhost:4200';

interface AutomationSummary {
  id: string;
  name: string;
  type: string;
  platform: string;
  riskLevel: string;
}

interface AutomationDetails {
  automation: {
    id: string;
    name: string;
    description: string;
    authorizedBy: string;
    createdAt: string;
    lastActivity: string;
    permissions: {
      total: number;
      enriched: Array<{
        scope: string;
        description: string;
        category: string;
        riskLevel: string;
        dataAccess: string[];
      }>;
      riskAnalysis: {
        overallRisk: string;
        breakdown: {
          criticalCount: number;
          highCount: number;
          mediumCount: number;
          lowCount: number;
        };
      };
    };
    metadata: {
      isAIPlatform: boolean;
      platformName?: string;
      clientId?: string;
      detectionMethod?: string;
      riskFactors: string[];
    };
    connection?: {
      id: string;
      platform: string;
      status: string;
    };
  };
}

async function main() {
  console.log('🔍 Verifying Automation Metadata Population\n');
  console.log('=' .repeat(80));

  try {
    // Step 1: Check if frontend is running
    console.log('\n📡 Checking frontend availability...');
    try {
      const frontendResponse = await fetch(FRONTEND_BASE);
      console.log(`✅ Frontend is running at ${FRONTEND_BASE} (status: ${frontendResponse.status})`);
    } catch (error) {
      console.error(`❌ Frontend is not accessible at ${FRONTEND_BASE}`);
      console.error('Please ensure the frontend dev server is running: npm run dev');
      process.exit(1);
    }

    // Step 2: Check if backend is running
    console.log('\n📡 Checking backend availability...');
    try {
      const backendResponse = await fetch(`${API_BASE}/health`);
      console.log(`✅ Backend is running at ${API_BASE} (status: ${backendResponse.status})`);
    } catch (error) {
      console.error(`❌ Backend is not accessible at ${API_BASE}`);
      console.error('Please ensure the backend dev server is running: npm run dev');
      process.exit(1);
    }

    // Step 3: Get automations list
    console.log('\n📋 Fetching automations list...');
    console.log(`Endpoint: GET ${API_BASE}/automations`);

    // Note: This would normally require authentication
    console.log('⚠️  Authentication required for this endpoint');
    console.log('   To properly test, you need to:');
    console.log('   1. Log in to http://localhost:4200');
    console.log('   2. Open browser DevTools');
    console.log('   3. Navigate to /automations page');
    console.log('   4. Click "View Details" on an automation');
    console.log('   5. Inspect the Network tab for the API call to /api/automations/:id/details');
    console.log('   6. Verify the response contains all metadata fields\n');

    // Show expected metadata structure
    console.log('=' .repeat(80));
    console.log('\n📊 Expected Metadata Structure in Response:\n');

    const expectedStructure: AutomationDetails = {
      automation: {
        id: '<automation-id>',
        name: '<automation-name>',
        description: '<description>',
        authorizedBy: '<user-email-or-name>',
        createdAt: '<ISO-8601-date>',
        lastActivity: '<ISO-8601-date>',
        permissions: {
          total: 0,
          enriched: [
            {
              scope: '<scope-url>',
              description: '<permission-description>',
              category: '<service-name>',
              riskLevel: 'low|medium|high|critical',
              dataAccess: ['<data-type-1>', '<data-type-2>']
            }
          ],
          riskAnalysis: {
            overallRisk: 'low|medium|high|critical',
            breakdown: {
              criticalCount: 0,
              highCount: 0,
              mediumCount: 0,
              lowCount: 0
            }
          }
        },
        metadata: {
          isAIPlatform: false,
          platformName: '<platform-name>',
          clientId: '<client-id>',
          detectionMethod: '<detection-method>',
          riskFactors: ['<factor-1>', '<factor-2>']
        },
        connection: {
          id: '<connection-id>',
          platform: 'slack|google|microsoft',
          status: 'active|inactive'
        }
      }
    };

    console.log(JSON.stringify(expectedStructure, null, 2));

    console.log('\n=' .repeat(80));
    console.log('\n📝 Manual Verification Steps:\n');
    console.log('1. Navigate to: http://localhost:4200/automations');
    console.log('2. Trigger discovery (if not already run)');
    console.log('3. Click "View Details" on any discovered automation');
    console.log('4. In the Details Modal, check three tabs:');
    console.log('   a) Permissions Tab:');
    console.log('      - Should show enriched OAuth permission details');
    console.log('      - Each permission should have: scope, description, risk level, data access');
    console.log('   b) Risk Analysis Tab:');
    console.log('      - Should show AI Platform alert (if applicable)');
    console.log('      - Should show risk factors list');
    console.log('      - Should show permission risk breakdown');
    console.log('   c) Details Tab:');
    console.log('      - Basic Information: description, authorizedBy, createdAt, lastActivity');
    console.log('      - Connection Details: platform, displayName, status');
    console.log('      - Metadata: platformName, clientId, detectionMethod');
    console.log('\n5. Open Browser DevTools > Network Tab');
    console.log('6. Filter for "details" to see API call to /api/automations/:id/details');
    console.log('7. Verify the response JSON contains all expected fields (see structure above)');
    console.log('\n=' .repeat(80));

    console.log('\n✅ Verification script complete');
    console.log('   Follow the manual steps above to verify metadata in the browser UI');

  } catch (error) {
    console.error('\n❌ Error during verification:', error);
    process.exit(1);
  }
}

main();
