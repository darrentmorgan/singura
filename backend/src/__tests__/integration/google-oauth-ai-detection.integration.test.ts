import { GoogleConnector } from '../../connectors/google';
import { googleOAuthAIDetector } from '../../services/detection/google-oauth-ai-detector.service';
import { AIAuditLogQuery } from '@saas-xray/shared-types';

describe('Google OAuth AI Detection Integration', () => {
  let connector: GoogleConnector;

  beforeAll(async () => {
    connector = new GoogleConnector();

    // Skip if test credentials are not configured
    if (!process.env.GOOGLE_TEST_ACCESS_TOKEN || !process.env.GOOGLE_TEST_REFRESH_TOKEN) {
      console.warn('Skipping integration tests: Google test credentials not configured');
      return;
    }

    // Authenticate with real Google Workspace
    await connector.authenticate({
      accessToken: process.env.GOOGLE_TEST_ACCESS_TOKEN!,
      refreshToken: process.env.GOOGLE_TEST_REFRESH_TOKEN!,
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + 3600000),
      scope: 'https://www.googleapis.com/auth/admin.reports.audit.readonly'
    });
  });

  it('should detect real AI platform logins in Google Workspace', async () => {
    // Skip if no test credentials
    if (!process.env.GOOGLE_TEST_ACCESS_TOKEN) {
      return;
    }

    const query: AIAuditLogQuery = {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      endDate: new Date()
    };

    const result = await connector.getAIAuditLogs(query);

    console.log(`Detected ${result.logs.length} AI platform logins`);

    result.logs.forEach(log => {
      console.log(`- ${log.platform}: ${log.userEmail} at ${log.timestamp}`);
    });

    expect(result.logs).toBeInstanceOf(Array);
    expect(result).toHaveProperty('totalCount');
    expect(result).toHaveProperty('hasMore');
    expect(result.metadata).toHaveProperty('detectedPlatforms');
  });

  it('should detect ChatGPT logins specifically', async () => {
    // Skip if no test credentials
    if (!process.env.GOOGLE_TEST_ACCESS_TOKEN) {
      return;
    }

    const query: AIAuditLogQuery = {
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      endDate: new Date(),
      platforms: ['chatgpt']
    };

    const result = await connector.getAIAuditLogs(query);

    const chatgptLogins = result.logs.filter(log => log.platform === 'chatgpt');
    console.log(`ChatGPT logins detected: ${chatgptLogins.length}`);

    chatgptLogins.forEach(login => {
      expect(login.platform).toBe('chatgpt');
      expect(login.userEmail).toBeDefined();
      expect(login.metadata.applicationName).toBeDefined();
      expect(login.riskIndicators).toBeInstanceOf(Array);
    });

    // All logs should be ChatGPT since we filtered
    result.logs.forEach(log => {
      expect(log.platform).toBe('chatgpt');
    });
  });

  it('should detect Claude logins specifically', async () => {
    // Skip if no test credentials
    if (!process.env.GOOGLE_TEST_ACCESS_TOKEN) {
      return;
    }

    const query: AIAuditLogQuery = {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      endDate: new Date(),
      platforms: ['claude']
    };

    const result = await connector.getAIAuditLogs(query);

    const claudeLogins = result.logs.filter(log => log.platform === 'claude');
    console.log(`Claude logins detected: ${claudeLogins.length}`);

    claudeLogins.forEach(login => {
      expect(login.platform).toBe('claude');
      expect(login.userEmail).toBeDefined();
      expect(login.activityType).toBeDefined();
    });
  });

  it('should include risk indicators for detected AI platforms', async () => {
    // Skip if no test credentials
    if (!process.env.GOOGLE_TEST_ACCESS_TOKEN) {
      return;
    }

    const query: AIAuditLogQuery = {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      endDate: new Date()
    };

    const result = await connector.getAIAuditLogs(query);

    result.logs.forEach(log => {
      expect(log.riskIndicators).toBeInstanceOf(Array);

      // Check risk indicator structure
      log.riskIndicators.forEach(indicator => {
        expect(indicator).toHaveProperty('type');
        expect(indicator).toHaveProperty('severity');
        expect(indicator).toHaveProperty('description');
        expect(indicator).toHaveProperty('confidence');
        expect(indicator.evidence).toBeInstanceOf(Array);
      });
    });
  });

  it('should handle date range queries correctly', async () => {
    // Skip if no test credentials
    if (!process.env.GOOGLE_TEST_ACCESS_TOKEN) {
      return;
    }

    const query: AIAuditLogQuery = {
      startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Last 2 days
      endDate: new Date()
    };

    const result = await connector.getAIAuditLogs(query);

    // All logs should be within the date range
    result.logs.forEach(log => {
      expect(log.timestamp.getTime()).toBeGreaterThanOrEqual(query.startDate.getTime());
      expect(log.timestamp.getTime()).toBeLessThanOrEqual(query.endDate!.getTime());
    });
  });

  it('should return supported platforms in metadata', async () => {
    // Skip if no test credentials
    if (!process.env.GOOGLE_TEST_ACCESS_TOKEN) {
      return;
    }

    const query: AIAuditLogQuery = {
      startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Last 1 day
      endDate: new Date()
    };

    const result = await connector.getAIAuditLogs(query);

    expect(result.metadata.detectedPlatforms).toBeInstanceOf(Array);
    expect(result.metadata.detectedPlatforms?.length).toBeGreaterThan(0);

    const platformNames = result.metadata.detectedPlatforms?.map(p => p.platform);
    expect(platformNames).toContain('chatgpt');
    expect(platformNames).toContain('claude');
    expect(platformNames).toContain('gemini');
    expect(platformNames).toContain('perplexity');
    expect(platformNames).toContain('copilot');
  });

  it('should handle errors gracefully and return warnings', async () => {
    const connector = new GoogleConnector();

    // Try to call without authentication
    const query: AIAuditLogQuery = {
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date()
    };

    await expect(connector.getAIAuditLogs(query)).rejects.toThrow('Google client not authenticated');
  });

  describe('Mock Data Testing (for CI/CD without real credentials)', () => {
    it('should process mock Google OAuth events correctly', () => {
      const mockEvent = {
        id: {
          time: '2025-01-15T10:30:00Z',
          uniqueQualifier: 'mock-unique-id',
          applicationName: 'login',
          customerId: 'mock-customer-id'
        },
        actor: {
          email: 'test@company.com',
          profileId: 'mock-profile-id',
          callerType: 'USER'
        },
        ipAddress: '10.0.0.1',
        events: [{
          type: 'login',
          name: 'oauth2_authorize',
          parameters: [
            { name: 'application_name', value: 'api.openai.com' },
            { name: 'oauth_client_id', value: 'openai-web-client' },
            { name: 'oauth_scopes', multiValue: ['email', 'profile', 'openid'] }
          ]
        }]
      };

      const result = googleOAuthAIDetector.detectAIPlatformLogin(mockEvent);

      expect(result).not.toBeNull();
      expect(result?.platform).toBe('chatgpt');
      expect(result?.userEmail).toBe('test@company.com');
      expect(result?.activityType).toBe('integration_created');
    });

    it('should generate correct risk indicators for sensitive scopes', () => {
      const mockEvent = {
        id: {
          time: '2025-01-15T10:30:00Z',
          uniqueQualifier: 'mock-unique-id',
          applicationName: 'login',
          customerId: 'mock-customer-id'
        },
        actor: {
          email: 'test@company.com',
          profileId: 'mock-profile-id',
          callerType: 'USER'
        },
        events: [{
          type: 'login',
          name: 'oauth2_authorize',
          parameters: [
            { name: 'application_name', value: 'claude.ai' },
            { name: 'oauth_scopes', multiValue: ['email', 'drive.readonly', 'gmail.readonly', 'calendar'] }
          ]
        }]
      };

      const result = googleOAuthAIDetector.detectAIPlatformLogin(mockEvent);

      expect(result?.platform).toBe('claude');
      expect(result?.riskIndicators).toBeDefined();
      expect(result?.riskIndicators.length).toBeGreaterThan(0);

      const highRiskIndicator = result?.riskIndicators.find(i => i.severity === 'high');
      expect(highRiskIndicator).toBeDefined();
      expect(highRiskIndicator?.type).toBe('unauthorized_access');
      expect(highRiskIndicator?.complianceImpact).toContain('GDPR');
      expect(highRiskIndicator?.complianceImpact).toContain('SOC2');
    });
  });
});

// Test data generation helper
export function generateTestAILoginEvents() {
  console.log(`
  ===============================================
  TO GENERATE TEST DATA FOR INTEGRATION TESTING:
  ===============================================

  1. In your Google Workspace test account:
     - Visit https://chat.openai.com
     - Click "Continue with Google"
     - Authorize with your @workspace.com account

  2. For Claude:
     - Visit https://claude.ai
     - Click "Continue with Google"
     - Authorize with your @workspace.com account

  3. For Perplexity:
     - Visit https://perplexity.ai
     - Click "Continue with Google"
     - Authorize with your @workspace.com account

  4. Wait 5-10 minutes for Google audit logs to populate

  5. Run integration tests:
     npm test -- --testPathPattern=google-oauth-ai-detection.integration

  ===============================================
  `);
}