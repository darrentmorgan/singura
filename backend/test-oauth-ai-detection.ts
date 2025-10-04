/**
 * Test script for OAuth AI Platform Detection
 *
 * This script tests the Google OAuth AI detector service to verify it can
 * detect AI platform logins (ChatGPT, Claude, Gemini) from Google Workspace
 * OAuth audit logs.
 */

import { googleOAuthAIDetector } from './src/services/detection/google-oauth-ai-detector.service';
import { GoogleConnector } from './src/connectors/google';

async function testOAuthAIDetection() {
  console.log('🧪 Testing OAuth AI Platform Detection\n');

  try {
    // Test 1: Pattern Recognition
    console.log('📋 Test 1: Pattern Recognition');
    console.log('=====================================');

    const testPlatforms = [
      { domain: 'api.openai.com', expected: 'chatgpt' },
      { domain: 'chat.openai.com', expected: 'chatgpt' },
      { domain: 'claude.ai', expected: 'claude' },
      { domain: 'anthropic.com', expected: 'claude' },
      { domain: 'gemini.google.com', expected: 'gemini' },
      { domain: 'perplexity.ai', expected: 'perplexity' },
      { domain: 'copilot.microsoft.com', expected: 'copilot' }
    ];

    testPlatforms.forEach(({ domain, expected }) => {
      const detected = googleOAuthAIDetector.identifyAIPlatform(domain, undefined);
      const status = detected === expected ? '✅' : '❌';
      console.log(`${status} ${domain} → ${detected || 'null'} (expected: ${expected})`);
    });

    console.log('\n📋 Test 2: Mock OAuth Event Detection');
    console.log('=====================================');

    // Test 2: ChatGPT OAuth Detection
    const mockChatGPTEvent = {
      kind: 'admin#reports#activity',
      id: {
        time: '2025-01-15T10:30:00Z',
        uniqueQualifier: 'test-123',
        applicationName: 'login',
        customerId: 'test-customer'
      },
      actor: {
        email: 'test.user@company.com',
        profileId: 'profile-456',
        callerType: 'USER'
      },
      ipAddress: '192.168.1.100',
      events: [{
        type: 'login',
        name: 'oauth2_authorize',
        parameters: [
          { name: 'application_name', value: 'api.openai.com' },
          { name: 'oauth_client_id', value: 'openai-chatgpt-client' },
          { name: 'oauth_scopes', multiValue: ['email', 'profile', 'openid'] }
        ]
      }]
    };

    const chatgptResult = googleOAuthAIDetector.detectAIPlatformLogin(mockChatGPTEvent);

    if (chatgptResult) {
      console.log('✅ ChatGPT Detection:');
      console.log('   Platform:', chatgptResult.platform);
      console.log('   User:', chatgptResult.userEmail);
      console.log('   Activity:', chatgptResult.activityType);
      console.log('   Scopes:', chatgptResult.metadata.scopes);
      console.log('   Risk Indicators:', chatgptResult.riskIndicators.length);
      if (chatgptResult.riskIndicators.length > 0) {
        chatgptResult.riskIndicators.forEach(risk => {
          console.log(`   - ${risk.severity.toUpperCase()}: ${risk.description}`);
        });
      }
    } else {
      console.log('❌ ChatGPT not detected');
    }

    // Test 3: Claude OAuth Detection
    console.log('\n');
    const mockClaudeEvent = {
      kind: 'admin#reports#activity',
      id: {
        time: '2025-01-15T14:20:00Z',
        uniqueQualifier: 'test-456',
        applicationName: 'token',
        customerId: 'test-customer'
      },
      actor: {
        email: 'jane.smith@company.com',
        profileId: 'profile-789',
        callerType: 'USER'
      },
      events: [{
        type: 'token',
        name: 'authorize',
        parameters: [
          { name: 'client_id', value: 'anthropic-claude-client' },
          { name: 'app_name', value: 'Claude' },
          { name: 'scope', multiValue: ['email', 'profile', 'drive.readonly', 'gmail.readonly'] }
        ]
      }]
    };

    const claudeResult = googleOAuthAIDetector.detectAIPlatformLogin(mockClaudeEvent);

    if (claudeResult) {
      console.log('✅ Claude Detection:');
      console.log('   Platform:', claudeResult.platform);
      console.log('   User:', claudeResult.userEmail);
      console.log('   Activity:', claudeResult.activityType);
      console.log('   Scopes:', claudeResult.metadata.scopes);
      console.log('   Risk Indicators:', claudeResult.riskIndicators.length);
      if (claudeResult.riskIndicators.length > 0) {
        claudeResult.riskIndicators.forEach(risk => {
          console.log(`   - ${risk.severity.toUpperCase()}: ${risk.description}`);
          if (risk.evidence) {
            risk.evidence.forEach(evidence => console.log(`     • ${evidence}`));
          }
        });
      }
    } else {
      console.log('❌ Claude not detected');
    }

    // Test 3: Non-AI Platform (should not detect)
    console.log('\n📋 Test 3: Non-AI Platform Filtering');
    console.log('=====================================');

    const mockZoomEvent = {
      kind: 'admin#reports#activity',
      id: {
        time: '2025-01-15T09:00:00Z',
        uniqueQualifier: 'test-zoom',
        applicationName: 'login',
        customerId: 'test-customer'
      },
      actor: {
        email: 'user@company.com',
        profileId: 'profile-111',
        callerType: 'USER'
      },
      events: [{
        type: 'login',
        name: 'oauth2_authorize',
        parameters: [
          { name: 'application_name', value: 'zoom.us' }
        ]
      }]
    };

    const zoomResult = googleOAuthAIDetector.detectAIPlatformLogin(mockZoomEvent);
    console.log(zoomResult === null ? '✅ Zoom correctly filtered out (null)' : '❌ False positive detected');

    // Test 4: Supported Platforms List
    console.log('\n📋 Test 4: Supported Platforms');
    console.log('=====================================');

    const supportedPlatforms = googleOAuthAIDetector.getSupportedPlatforms();
    console.log(`Total AI platforms supported: ${supportedPlatforms.length}`);
    supportedPlatforms.forEach(p => {
      console.log(`   - ${p.displayName} (${p.platform})`);
    });

    console.log('\n✅ All tests completed successfully!');
    console.log('\n📝 Next Steps:');
    console.log('1. Connect your Google Workspace account via OAuth');
    console.log('2. Log into ChatGPT or Claude using Google SSO');
    console.log('3. Wait 5-10 minutes for Google audit logs to populate');
    console.log('4. Query /api/ai-platforms/audit-logs endpoint to see detected logins');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testOAuthAIDetection();
