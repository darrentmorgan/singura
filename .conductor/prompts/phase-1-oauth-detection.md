# Phase 1: Google OAuth AI Platform Detection

## Workspace Context
- **Branch**: `feature/google-oauth-ai-detection`
- **Duration**: 1 week
- **Dependencies**: Phase 0 (shared-types) ✅
- **Environment**: Local Docker (PostgreSQL + Redis)

---

## Mission

Create `GoogleOAuthAIDetectorService` to detect AI platform logins (ChatGPT, Claude, Gemini, Perplexity, etc.) through Google Workspace OAuth audit logs. **No direct Enterprise API integration needed!**

---

## Strategy Overview

**Detection Method**: Monitor Google Workspace Admin SDK audit logs for OAuth authorization events to AI platforms.

**Data Source**: Google Admin SDK Reports API
- Application: `login` (OAuth consent flows)
- Application: `token` (OAuth token issuance)

**Platforms Detected**:
- ChatGPT (api.openai.com, chat.openai.com)
- Claude (claude.ai, anthropic.com)
- Gemini (native Google, already covered)
- Perplexity (perplexity.ai)
- GitHub Copilot (copilot.microsoft.com)
- Any AI platform using Google SSO

---

## Available Types (from @saas-xray/shared-types)

```typescript
import {
  // Output format
  AIplatformAuditLog,
  AIAuditLogResult,
  AIActivityType,
  AIRiskIndicator,

  // Google types (for input)
  // Note: We'll process raw Google Admin SDK events
} from '@saas-xray/shared-types';
```

---

## Implementation Steps (TDD)

### Step 1: Understand Google OAuth Events

**Read Documentation**:
1. `/docs/OAUTH-BASED-AI-DETECTION.md` - OAuth detection strategy
2. `/docs/IMPLEMENTATION-ADDENDUM-OAUTH.md` - Updated approach
3. Google Admin SDK: https://developers.google.com/admin-sdk/reports/reference/rest/v1/activities

**Key Google Admin SDK Applications**:

**Login Application**:
```typescript
// Query for OAuth authorization events
{
  userKey: 'all',
  applicationName: 'login',
  eventName: 'oauth2_authorize',  // OAuth consent
  startTime: '2025-01-01T00:00:00Z'
}
```

**Token Application**:
```typescript
// Query for OAuth token events
{
  userKey: 'all',
  applicationName: 'token',
  eventName: 'authorize',  // Token issued
  startTime: '2025-01-01T00:00:00Z'
}
```

---

### Step 2: Write Tests FIRST

Create: `backend/src/services/detection/__tests__/google-oauth-ai-detector.test.ts`

```typescript
import { GoogleOAuthAIDetectorService } from '../google-oauth-ai-detector.service';
import { AIplatformAuditLog } from '@saas-xray/shared-types';

describe('GoogleOAuthAIDetectorService', () => {
  let detector: GoogleOAuthAIDetectorService;

  beforeEach(() => {
    detector = new GoogleOAuthAIDetectorService();
  });

  describe('detectAIPlatformLogin', () => {
    it('should detect ChatGPT from api.openai.com domain', () => {
      const mockGoogleEvent = {
        kind: 'admin#reports#activity',
        id: {
          time: '2025-01-15T10:30:00Z',
          uniqueQualifier: 'unique-123',
          applicationName: 'login',
          customerId: 'customer-456'
        },
        actor: {
          email: 'john.doe@company.com',
          profileId: 'profile-789',
          callerType: 'USER'
        },
        ipAddress: '192.168.1.100',
        events: [{
          type: 'login',
          name: 'oauth2_authorize',
          parameters: [
            { name: 'application_name', value: 'api.openai.com' },
            { name: 'oauth_client_id', value: 'openai-client-123' },
            { name: 'oauth_scopes', multiValue: ['email', 'profile', 'openid'] }
          ]
        }]
      };

      const result = detector.detectAIPlatformLogin(mockGoogleEvent);

      expect(result).not.toBeNull();
      expect(result?.platform).toBe('chatgpt');
      expect(result?.userEmail).toBe('john.doe@company.com');
      expect(result?.activityType).toBe('integration_created');
      expect(result?.metadata.applicationName).toBe('api.openai.com');
    });

    it('should detect Claude from claude.ai domain', () => {
      const mockGoogleEvent = {
        kind: 'admin#reports#activity',
        id: {
          time: '2025-01-15T14:20:00Z',
          uniqueQualifier: 'unique-456',
          applicationName: 'token',
          customerId: 'customer-456'
        },
        actor: {
          email: 'jane.smith@company.com',
          profileId: 'profile-321',
          callerType: 'USER'
        },
        events: [{
          type: 'token',
          name: 'authorize',
          parameters: [
            { name: 'client_id', value: 'anthropic-claude-client' },
            { name: 'app_name', value: 'Claude' },
            { name: 'scope', multiValue: ['email', 'profile'] }
          ]
        }]
      };

      const result = detector.detectAIPlatformLogin(mockGoogleEvent);

      expect(result).not.toBeNull();
      expect(result?.platform).toBe('claude');
      expect(result?.userEmail).toBe('jane.smith@company.com');
    });

    it('should detect ChatGPT from client ID pattern', () => {
      const mockGoogleEvent = {
        id: {
          time: '2025-01-15T09:00:00Z',
          uniqueQualifier: 'unique-789',
          applicationName: 'login',
          customerId: 'customer-456'
        },
        actor: {
          email: 'user@company.com',
          profileId: 'profile-111',
          callerType: 'USER'
        },
        events: [{
          type: 'login',
          name: 'oauth2_approve',
          parameters: [
            { name: 'oauth_client_id', value: 'openai-chatgpt-web-app' },
            { name: 'oauth_scopes', multiValue: ['email'] }
          ]
        }]
      };

      const result = detector.detectAIPlatformLogin(mockGoogleEvent);

      expect(result?.platform).toBe('chatgpt');
    });

    it('should return null for non-AI platform OAuth', () => {
      const mockGoogleEvent = {
        id: { time: '2025-01-15T09:00:00Z', applicationName: 'login', customerId: 'c1' },
        actor: { email: 'user@company.com', profileId: 'p1', callerType: 'USER' },
        events: [{
          type: 'login',
          name: 'oauth2_authorize',
          parameters: [
            { name: 'application_name', value: 'zoom.us' }
          ]
        }]
      };

      const result = detector.detectAIPlatformLogin(mockGoogleEvent);

      expect(result).toBeNull();
    });

    it('should detect Perplexity AI', () => {
      const mockGoogleEvent = {
        id: { time: '2025-01-15T09:00:00Z', applicationName: 'login', customerId: 'c1' },
        actor: { email: 'user@company.com', profileId: 'p1', callerType: 'USER' },
        events: [{
          type: 'login',
          name: 'oauth2_authorize',
          parameters: [
            { name: 'application_name', value: 'www.perplexity.ai' }
          ]
        }]
      };

      const result = detector.detectAIPlatformLogin(mockGoogleEvent);

      expect(result?.platform).toBe('chatgpt'); // Map to chatgpt for now
      expect(result?.metadata.applicationName).toContain('perplexity');
    });
  });

  describe('assessOAuthRiskIndicators', () => {
    it('should flag excessive OAuth scopes', () => {
      const parameters = {
        oauth_scopes: ['email', 'profile', 'drive', 'gmail', 'calendar', 'contacts', 'sheets']
      };

      const indicators = detector.assessOAuthRiskIndicators(parameters, 'chatgpt');

      expect(indicators.length).toBeGreaterThan(0);
      expect(indicators.some(i => i.type === 'security_event')).toBe(true);
    });

    it('should flag sensitive data scopes', () => {
      const parameters = {
        oauth_scopes: ['email', 'drive.readonly', 'gmail.readonly']
      };

      const indicators = detector.assessOAuthRiskIndicators(parameters, 'claude');

      expect(indicators.some(i => i.type === 'unauthorized_access')).toBe(true);
      expect(indicators.some(i => i.complianceImpact?.includes('GDPR'))).toBe(true);
    });
  });

  describe('identifyAIPlatform', () => {
    it('should identify platform by domain', () => {
      expect(detector.identifyAIPlatform('api.openai.com', undefined)).toBe('chatgpt');
      expect(detector.identifyAIPlatform('claude.ai', undefined)).toBe('claude');
      expect(detector.identifyAIPlatform('gemini.google.com', undefined)).toBe('gemini');
    });

    it('should identify platform by client ID', () => {
      expect(detector.identifyAIPlatform(undefined, 'openai-client-123')).toBe('chatgpt');
      expect(detector.identifyAIPlatform(undefined, 'anthropic-claude-web')).toBe('claude');
    });

    it('should return null for unknown platforms', () => {
      expect(detector.identifyAIPlatform('example.com', 'unknown-client')).toBeNull();
    });
  });
});
```

---

### Step 3: Implement GoogleOAuthAIDetectorService

Create: `backend/src/services/detection/google-oauth-ai-detector.service.ts`

```typescript
import {
  AIplatformAuditLog,
  AIPlatform,
  AIActivityType,
  AIRiskIndicator
} from '@saas-xray/shared-types';

/**
 * Detects AI platform logins via Google Workspace OAuth audit logs
 *
 * This service monitors Google Admin SDK login and token events to identify
 * when users authenticate to AI platforms (ChatGPT, Claude, etc.) using
 * Google SSO or OAuth.
 */
export class GoogleOAuthAIDetectorService {
  private readonly AI_PLATFORM_PATTERNS = {
    chatgpt: {
      domains: [
        'api.openai.com',
        'auth.openai.com',
        'chat.openai.com',
        'platform.openai.com'
      ],
      clientIdPatterns: ['openai', 'chatgpt'],
      displayName: 'ChatGPT',
      riskLevel: 'medium' as const
    },
    claude: {
      domains: [
        'claude.ai',
        'anthropic.com',
        'console.anthropic.com'
      ],
      clientIdPatterns: ['anthropic', 'claude'],
      displayName: 'Claude',
      riskLevel: 'medium' as const
    },
    gemini: {
      domains: [
        'gemini.google.com',
        'ai.google.dev',
        'generativelanguage.googleapis.com'
      ],
      clientIdPatterns: ['gemini'],
      displayName: 'Gemini',
      riskLevel: 'low' as const // Native Google product
    },
    perplexity: {
      domains: ['perplexity.ai', 'www.perplexity.ai'],
      clientIdPatterns: ['perplexity'],
      displayName: 'Perplexity AI',
      riskLevel: 'medium' as const
    },
    copilot: {
      domains: [
        'copilot.microsoft.com',
        'github.com/copilot',
        'api.github.com/copilot'
      ],
      clientIdPatterns: ['copilot', 'github-copilot'],
      displayName: 'GitHub Copilot',
      riskLevel: 'low' as const
    }
  };

  /**
   * Analyze Google login/token audit log for AI platform OAuth events
   *
   * @param googleEvent - Raw Google Admin SDK activity event
   * @returns Normalized AIplatformAuditLog or null if not AI platform
   */
  detectAIPlatformLogin(googleEvent: any): AIplatformAuditLog | null {
    if (!googleEvent || !googleEvent.events || googleEvent.events.length === 0) {
      return null;
    }

    const parameters = this.extractParameters(googleEvent.events);

    // Check if this is an OAuth event
    if (!this.isOAuthEvent(googleEvent)) {
      return null;
    }

    // Extract application/client information
    const applicationName = parameters.application_name ||
                          parameters.app_name ||
                          parameters.client_name;
    const clientId = parameters.oauth_client_id ||
                    parameters.client_id;

    // Identify AI platform
    const detectedPlatform = this.identifyAIPlatform(applicationName, clientId);

    if (!detectedPlatform) {
      return null; // Not an AI platform
    }

    // Normalize to AIplatformAuditLog
    return this.normalizeToAIPlatformLog(googleEvent, detectedPlatform, parameters);
  }

  /**
   * Identify AI platform from OAuth parameters
   */
  identifyAIPlatform(applicationName?: string, clientId?: string): AIPlatform | null {
    if (!applicationName && !clientId) {
      return null;
    }

    for (const [platform, patterns] of Object.entries(this.AI_PLATFORM_PATTERNS)) {
      // Check domain match
      if (applicationName) {
        const matchesDomain = patterns.domains.some(domain =>
          applicationName.toLowerCase().includes(domain.toLowerCase())
        );
        if (matchesDomain) {
          return platform as AIPlatform;
        }
      }

      // Check client ID match
      if (clientId) {
        const matchesClientId = patterns.clientIdPatterns.some(pattern =>
          clientId.toLowerCase().includes(pattern.toLowerCase())
        );
        if (matchesClientId) {
          return platform as AIPlatform;
        }
      }
    }

    return null;
  }

  /**
   * Check if Google event is an OAuth-related event
   */
  private isOAuthEvent(googleEvent: any): boolean {
    const eventName = googleEvent.events[0]?.name?.toLowerCase() || '';

    const oauthEventNames = [
      'oauth2_authorize',
      'oauth2_approve',
      'authorize',
      'token_revoke',
      'login_success'
    ];

    return oauthEventNames.some(name => eventName.includes(name));
  }

  /**
   * Normalize Google OAuth event to AIplatformAuditLog
   */
  private normalizeToAIPlatformLog(
    googleEvent: any,
    platform: AIPlatform,
    parameters: any
  ): AIplatformAuditLog {
    const eventName = googleEvent.events[0]?.name || '';

    return {
      id: googleEvent.id.uniqueQualifier,
      platform,
      timestamp: new Date(googleEvent.id.time),
      userId: googleEvent.actor.profileId,
      userEmail: googleEvent.actor.email,
      organizationId: googleEvent.id.customerId,
      activityType: this.mapOAuthEventToActivityType(eventName),
      action: eventName,
      metadata: {
        applicationName: parameters.application_name || parameters.app_name,
        clientId: parameters.oauth_client_id || parameters.client_id,
        scopes: parameters.oauth_scopes || parameters.scope || [],
        loginType: parameters.login_type,
        isThirdParty: parameters.is_third_party_id || true,
        platformDisplayName: this.AI_PLATFORM_PATTERNS[platform].displayName
      },
      ipAddress: googleEvent.ipAddress,
      userAgent: parameters.user_agent,
      riskIndicators: this.assessOAuthRiskIndicators(parameters, platform)
    };
  }

  /**
   * Map OAuth event name to AI activity type
   */
  private mapOAuthEventToActivityType(eventName: string): AIActivityType {
    const lowerEvent = eventName.toLowerCase();

    if (lowerEvent.includes('authorize') || lowerEvent.includes('approve')) {
      return 'integration_created'; // OAuth consent = new integration
    }

    if (lowerEvent.includes('login')) {
      return 'login';
    }

    if (lowerEvent.includes('logout')) {
      return 'logout';
    }

    if (lowerEvent.includes('revoke')) {
      return 'api_key_deleted'; // Token revoked
    }

    return 'login'; // Default
  }

  /**
   * Assess risk indicators for OAuth authorization
   */
  assessOAuthRiskIndicators(parameters: any, platform: AIPlatform): AIRiskIndicator[] {
    const indicators: AIRiskIndicator[] = [];

    const scopes = parameters.oauth_scopes || parameters.scope || [];

    // Check for excessive scopes
    if (scopes.length > 5) {
      indicators.push({
        type: 'security_event',
        severity: 'medium',
        description: `OAuth authorization with ${scopes.length} scopes to ${platform}`,
        confidence: 70,
        evidence: [`Scopes granted: ${scopes.join(', ')}`]
      });
    }

    // Check for sensitive data scopes
    const sensitiveScopePatterns = [
      'drive',
      'gmail',
      'calendar',
      'contacts',
      'admin',
      'directory'
    ];

    const sensitiveScopes = scopes.filter((scope: string) =>
      sensitiveScopePatterns.some(pattern => scope.toLowerCase().includes(pattern))
    );

    if (sensitiveScopes.length > 0) {
      indicators.push({
        type: 'unauthorized_access',
        severity: 'high',
        description: `${this.AI_PLATFORM_PATTERNS[platform].displayName} authorized with sensitive data access`,
        confidence: 85,
        evidence: [
          `Sensitive scopes: ${sensitiveScopes.join(', ')}`,
          'AI platform can access user data in Google Workspace'
        ],
        complianceImpact: ['GDPR', 'SOC2']
      });
    }

    // Platform-specific risk assessment
    const baseRisk = this.AI_PLATFORM_PATTERNS[platform].riskLevel;
    if (baseRisk === 'medium' && indicators.length === 0) {
      indicators.push({
        type: 'policy_violation',
        severity: 'medium',
        description: `Unauthorized ${this.AI_PLATFORM_PATTERNS[platform].displayName} integration detected`,
        confidence: 75,
        evidence: ['User authorized third-party AI platform without approval']
      });
    }

    return indicators;
  }

  /**
   * Extract parameters from Google event
   */
  private extractParameters(events: any[]): Record<string, any> {
    const params: Record<string, any> = {};

    events.forEach(event => {
      if (event.parameters) {
        event.parameters.forEach((param: any) => {
          if (param.multiValue) {
            params[param.name] = param.multiValue;
          } else if (param.value) {
            params[param.name] = param.value;
          } else if (param.intValue) {
            params[param.name] = parseInt(param.intValue);
          } else if (param.boolValue !== undefined) {
            params[param.name] = param.boolValue;
          }
        });
      }
    });

    return params;
  }

  /**
   * Get list of all supported AI platforms
   */
  getSupportedPlatforms(): Array<{ platform: AIPlatform; displayName: string }> {
    return Object.entries(this.AI_PLATFORM_PATTERNS).map(([key, value]) => ({
      platform: key as AIPlatform,
      displayName: value.displayName
    }));
  }
}

// Export singleton
export const googleOAuthAIDetector = new GoogleOAuthAIDetectorService();
```

---

### Step 4: Integrate with GoogleConnector

Update: `backend/src/connectors/google.ts`

```typescript
import { googleOAuthAIDetector } from '../services/detection/google-oauth-ai-detector.service';
import { AIAuditLogQuery, AIAuditLogResult } from '@saas-xray/shared-types';

export class GoogleConnector implements PlatformConnector {
  // ... existing code ...

  /**
   * Get AI platform audit logs (OAuth-based detection)
   */
  async getAIAuditLogs(query: AIAuditLogQuery): Promise<AIAuditLogResult> {
    if (!this.client) {
      throw new Error('Google client not authenticated');
    }

    const admin = google.admin({ version: 'reports_v1', auth: this.client });

    // Query login application for OAuth events
    const loginLogs = await admin.activities.list({
      userKey: 'all',
      applicationName: 'login',
      startTime: query.startDate.toISOString(),
      endTime: query.endDate.toISOString(),
      maxResults: 1000,
      eventName: 'oauth2_authorize,oauth2_approve'
    });

    // Query token application for OAuth token events
    const tokenLogs = await admin.activities.list({
      userKey: 'all',
      applicationName: 'token',
      startTime: query.startDate.toISOString(),
      endTime: query.endDate.toISOString(),
      maxResults: 1000,
      eventName: 'authorize'
    });

    // Combine and detect AI platforms
    const allEvents = [
      ...(loginLogs.data.items || []),
      ...(tokenLogs.data.items || [])
    ];

    const aiPlatformLogs = allEvents
      .map(event => googleOAuthAIDetector.detectAIPlatformLogin(event))
      .filter((log): log is AIplatformAuditLog => log !== null);

    return {
      logs: aiPlatformLogs,
      totalCount: aiPlatformLogs.length,
      hasMore: !!(loginLogs.data.nextPageToken || tokenLogs.data.nextPageToken),
      nextCursor: loginLogs.data.nextPageToken || tokenLogs.data.nextPageToken,
      metadata: {
        queryTime: Date.now(),
        platform: 'gemini', // Primary platform, but includes all AI platforms
        warnings: []
      }
    };
  }
}
```

---

### Step 5: Integration Testing

Create: `backend/src/__tests__/integration/google-oauth-ai-detection.integration.test.ts`

```typescript
import { GoogleConnector } from '../../connectors/google';
import { googleOAuthAIDetector } from '../../services/detection/google-oauth-ai-detector.service';

describe('Google OAuth AI Detection Integration', () => {
  let connector: GoogleConnector;

  beforeAll(async () => {
    connector = new GoogleConnector();

    // Authenticate with real Google Workspace
    await connector.authenticate({
      accessToken: process.env.GOOGLE_TEST_ACCESS_TOKEN!,
      refreshToken: process.env.GOOGLE_TEST_REFRESH_TOKEN!,
      expiresAt: new Date(Date.now() + 3600000),
      scope: ['https://www.googleapis.com/auth/admin.reports.audit.readonly']
    });
  });

  it('should detect real AI platform logins in Google Workspace', async () => {
    const result = await connector.getAIAuditLogs({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      endDate: new Date()
    });

    console.log(`Detected ${result.logs.length} AI platform logins`);

    result.logs.forEach(log => {
      console.log(`- ${log.platform}: ${log.userEmail} at ${log.timestamp}`);
    });

    expect(result.logs).toBeInstanceOf(Array);
    // Expect at least some AI platform usage in test workspace
  });

  it('should detect ChatGPT logins', async () => {
    const result = await connector.getAIAuditLogs({
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      endDate: new Date()
    });

    const chatgptLogins = result.logs.filter(log => log.platform === 'chatgpt');
    console.log(`ChatGPT logins detected: ${chatgptLogins.length}`);

    chatgptLogins.forEach(login => {
      expect(login.platform).toBe('chatgpt');
      expect(login.userEmail).toBeDefined();
      expect(login.metadata.applicationName).toBeDefined();
    });
  });
});
```

---

### Step 6: Run Tests

```bash
# Unit tests
npm test -- --testPathPattern=google-oauth-ai-detector

# Integration tests (requires real Google Workspace)
npm test -- --testPathPattern=google-oauth-ai-detection.integration
```

---

## Success Criteria

- [ ] GoogleOAuthAIDetectorService implemented
- [ ] All unit tests passing (100% coverage)
- [ ] Pattern matching works for all platforms
- [ ] Integration with GoogleConnector complete
- [ ] Real Google Workspace integration tests passing
- [ ] Detects ChatGPT, Claude, and other AI platform logins
- [ ] Risk indicators accurately assessed
- [ ] TypeScript compilation clean
- [ ] No Enterprise API dependencies

---

## Environment Setup

**Required**:
```bash
# Google Workspace Admin SDK access (already have this)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=...

# Test account with AI platform usage
# (Someone in your Google Workspace should log into ChatGPT/Claude with Google SSO)
```

**NOT Required**:
- ❌ ChatGPT Enterprise subscription
- ❌ Claude Enterprise subscription
- ❌ Direct API keys to AI platforms

---

## Test Data Setup

**To generate test data**:
1. In your Google Workspace test account
2. Visit https://chat.openai.com
3. Click "Continue with Google"
4. Authorize with your @workspace.com account
5. Wait 5-10 minutes for Google audit logs to populate
6. Run integration test - should detect ChatGPT login!

Repeat for Claude (https://claude.ai → "Continue with Google")

---

## Key Files

**New Files to Create**:
- `backend/src/services/detection/google-oauth-ai-detector.service.ts`
- `backend/src/services/detection/__tests__/google-oauth-ai-detector.test.ts`
- `backend/src/__tests__/integration/google-oauth-ai-detection.integration.test.ts`

**Files to Update**:
- `backend/src/connectors/google.ts` (add getAIAuditLogs method)

**Reference Documentation**:
- `/docs/OAUTH-BASED-AI-DETECTION.md`
- `/docs/IMPLEMENTATION-ADDENDUM-OAUTH.md`

---

## Important Notes

1. **OAuth Detection Window**: Google audit logs may have 5-30 minute delay
2. **Historical Data**: Can query up to 180 days of OAuth events
3. **Rate Limits**: Google Admin SDK has quotas (typically 2,400 requests/day)
4. **Scopes Required**: `admin.reports.audit.readonly`
5. **No Additional Costs**: Uses existing Google Workspace integration

---

**Phase**: 1 of 4 (Revised)
**Approach**: OAuth-based detection via Google Workspace
**Status**: Ready to implement
**Complexity**: Low (no Enterprise APIs needed)
**Assigned Workspace**: Conductor Workspace #1
