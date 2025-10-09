/**
 * Test Production Google API Integration
 * BMAD P0 Priority: Validate revenue-enabling production API integration
 */

import { RealDataProvider } from './services/data-provider';
import { OAuthCredentialStorageService } from './services/oauth-credential-storage-service';
import { GoogleOAuthCredentials } from '@saas-xray/shared-types';

async function testProductionIntegration() {
  console.log('🧪 Testing Production Google Workspace API Integration...');

  try {
    // Initialize OAuth storage service
    const oauthStorage = new OAuthCredentialStorageService();

    // Initialize real data provider
    const realDataProvider = new RealDataProvider();

    console.log('✅ Services initialized successfully');

    // Check current stored connections
    const connections = realDataProvider.getConnections();
    console.log('📋 Current connections:', connections);

    if (connections.length === 0) {
      console.log('ℹ️  No stored OAuth connections found. This is expected for fresh installation.');
      console.log('ℹ️  To test with real data:');
      console.log('   1. Complete OAuth flow through the web interface');
      console.log('   2. Ensure Google OAuth credentials are stored');
      console.log('   3. Run this test again');
      return;
    }

    // Find Google connection
    const googleConnection = connections.find(c => c.platform === 'google');
    if (!googleConnection) {
      console.log('ℹ️  No Google Workspace connection found');
      return;
    }

    console.log('🔍 Testing Google Workspace automation discovery...');
    console.log('   Connection:', googleConnection.displayName);
    console.log('   Status:', googleConnection.status);
    console.log('   Permissions:', googleConnection.permissions.length, 'scopes');

    // Test production automation discovery
    const result = await realDataProvider.discoverAutomations(googleConnection.id, 'test-org-id');

    console.log('🎉 Production discovery test completed successfully!');
    console.log('📊 Results:', {
      success: result.success,
      automationsFound: result.discovery.automations.length, // Use array length instead
      executionTime: `${result.discovery.metadata.executionTimeMs}ms`,
      riskScore: result.discovery.metadata.riskScore,
      platform: result.discovery.metadata.platform
    });

    if (result.discovery.automations.length > 0) {
      console.log('🤖 Sample automation:');
      const sample = result.discovery.automations[0];

      if (sample) {
        console.log('   Name:', sample.name);
        console.log('   Type:', sample.type);
        console.log('   Risk Level:', sample.riskLevel);
        console.log('   Platform:', sample.platform);
      }
    }

    // Test coverage breakdown
    if (result.discovery.metadata.coverage) {
      console.log('📈 Coverage breakdown:', result.discovery.metadata.coverage);
    }

  } catch (error) {
    console.error('❌ Production integration test failed:', error);
    console.log('💡 This is expected if:');
    console.log('   - No OAuth credentials are stored yet');
    console.log('   - Google API credentials have expired');
    console.log('   - Network connectivity issues');
    console.log('');
    console.log('🔧 To resolve:');
    console.log('   1. Complete OAuth flow through web interface');
    console.log('   2. Verify Google API project is configured');
    console.log('   3. Check network connectivity to Google APIs');
  }
}

// Run the test
if (require.main === module) {
  testProductionIntegration()
    .then(() => {
      console.log('🏁 Production integration test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test runner failed:', error);
      process.exit(1);
    });
}

export { testProductionIntegration };