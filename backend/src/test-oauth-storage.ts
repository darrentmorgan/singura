/**
 * OAuth Storage Integration Test
 * Test storing and retrieving real Google OAuth credentials for live detection
 * Following CLAUDE.md Types-Tests-Code methodology - Step 1 Testing
 */

import { OAuthCredentialStorageService } from './services/oauth-credential-storage-service';
import { GoogleOAuthCredentials } from '@saas-xray/shared-types';

async function testOAuthCredentialStorage(): Promise<void> {
  console.log('🧪 Testing OAuth credential storage for live Google detection...');
  
  try {
    // Create storage service
    console.log('📝 Creating OAuth credential storage service...');
    const storageService = new OAuthCredentialStorageService();
    
    // Create test Google OAuth credentials (simulating real OAuth flow completion)
    const testCredentials: GoogleOAuthCredentials = {
      accessToken: 'ya29.mock-google-access-token-for-testing',
      refreshToken: 'mock-google-refresh-token',
      tokenType: 'Bearer',
      scope: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/admin.reports.audit.readonly'],
      expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      userId: 'test-user-123',
      email: 'test@company.com',
      domain: 'company.com'
    };

    console.log('🔐 Testing credential storage...');
    const stored = await storageService.storeCredentials('conn-google-test-live', testCredentials);
    console.log('✅ Credential storage result:', stored);

    console.log('📥 Testing credential retrieval...');
    const retrieved = await storageService.retrieveCredentials('conn-google-test-live');
    console.log('✅ Credential retrieval result:', !!retrieved);

    console.log('🔍 Testing credential validation...');
    const isValid = await storageService.isCredentialsValid('conn-google-test-live');
    console.log('✅ Credential validation result:', isValid);

    console.log('🌐 Testing connection initialization...');
    try {
      const initialized = await storageService.initializeConnection('conn-google-test-live');
      console.log('✅ Connection initialization result:', initialized);
    } catch (error) {
      console.log('ℹ️ Expected initialization failure with test credentials:', error instanceof Error ? error.message : 'Unknown error');
    }

    console.log('📊 Testing active connections list...');
    const activeConnections = await storageService.listActiveConnections();
    console.log('✅ Active connections:', activeConnections.length);

    console.log('🔧 Debug information:');
    const debugInfo = storageService.getDebugInfo();
    console.log('📋 Storage debug info:', debugInfo);

    console.log('✅ OAuth credential storage test completed successfully');
    console.log('🎯 Ready to connect real Google OAuth tokens for live AI detection');
    
  } catch (error) {
    console.error('❌ OAuth storage test failed:', error);
    throw error;
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testOAuthCredentialStorage()
    .then(() => console.log('🎉 OAuth storage integration test completed'))
    .catch(error => {
      console.error('💥 Test failed:', error);
      process.exit(1);
    });
}

export { testOAuthCredentialStorage };