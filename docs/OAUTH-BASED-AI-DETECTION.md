# OAuth-Based AI Platform Detection Strategy

## Executive Summary

**Revised Approach**: Detect AI platform usage (ChatGPT, Claude, Gemini) through **Google Workspace OAuth audit logs** instead of direct Enterprise API integration. This provides comprehensive detection without requiring Enterprise subscriptions to each AI platform.

---

## Why OAuth-Based Detection?

### Advantages

✅ **No Enterprise Subscriptions Required**
- Detects ChatGPT Free, Plus, Team, and Enterprise
- Detects Claude Free, Pro, and Enterprise
- Detects Gemini (already integrated with Google Workspace)
- Works with any AI platform that uses Google SSO

✅ **Comprehensive Coverage**
- Captures personal AI accounts (user@gmail.com logging into ChatGPT)
- Captures business accounts (user@company.com)
- Detects both browser and API usage
- Real-time detection as OAuth events occur

✅ **Centralized Visibility**
- Single integration point (Google Workspace Admin SDK)
- All AI platform logins in one audit stream
- Easier to correlate cross-platform activity

✅ **Cost Effective**
- No per-platform API costs
- Leverages existing Google Workspace integration
- Scales without additional licenses

### What We Detect

**Via Google Admin SDK `login` Application**:
```
Event: OAuth 2.0 authorization
Application: api.openai.com (ChatGPT)
User: john.doe@company.com
Timestamp: 2025-01-15 10:30:00
Scopes: [email, profile, openid]
Action: oauth2_authorize
```

**Via Google Admin SDK `token` Application**:
```
Event: OAuth token issued
Application: claude.ai
User: jane.smith@company.com
Client ID: anthropic-oauth-client
Scopes: [email, profile]
```

---

## Google Workspace OAuth Audit Log Types

### Login Application Events

**API**: Google Admin SDK Reports API - `login` application

**Event Names**:
- `login_success` - User logged in via OAuth
- `login_failure` - OAuth login failed
- `logout` - User logged out
- `oauth2_authorize` - User authorized third-party app
- `oauth2_approve` - OAuth consent granted

**Parameters to Analyze**:
```typescript
{
  "application_name": "api.openai.com",     // ChatGPT
  "application_name": "claude.ai",          // Claude
  "application_name": "gemini.google.com",  // Gemini
  "oauth_client_id": "...",
  "oauth_scopes": ["email", "profile"],
  "login_type": "google_login",
  "is_third_party_id": true
}
```

### Token Application Events

**API**: Google Admin SDK Reports API - `token` application

**Event Names**:
- `authorize` - OAuth token issued
- `token_revoke` - Token revoked

---

## Detection Patterns for AI Platforms

### ChatGPT Detection

**Domain Patterns**:
- `api.openai.com`
- `auth.openai.com`
- `chat.openai.com`

**OAuth Client ID Patterns**:
- Contains: `openai`

**User Agent Patterns**:
- `ChatGPT`
- `OpenAI`

**Example Audit Log**:
```json
{
  "id": {
    "time": "2025-01-15T10:30:00Z",
    "applicationName": "login"
  },
  "actor": {
    "email": "user@company.com"
  },
  "events": [{
    "type": "login",
    "name": "oauth2_authorize",
    "parameters": [
      { "name": "application_name", "value": "api.openai.com" },
      { "name": "oauth_client_id", "value": "chatgpt-client-id" },
      { "name": "oauth_scopes", "multiValue": ["email", "profile", "openid"] }
    ]
  }]
}
```

### Claude Detection

**Domain Patterns**:
- `claude.ai`
- `anthropic.com`
- `console.anthropic.com`

**OAuth Client ID Patterns**:
- Contains: `anthropic`
- Contains: `claude`

**Example Audit Log**:
```json
{
  "id": {
    "time": "2025-01-15T14:20:00Z",
    "applicationName": "token"
  },
  "actor": {
    "email": "user@company.com"
  },
  "events": [{
    "type": "token",
    "name": "authorize",
    "parameters": [
      { "name": "client_id", "value": "anthropic-oauth-client" },
      { "name": "app_name", "value": "Claude" },
      { "name": "scope", "multiValue": ["email", "profile"] }
    ]
  }]
}
```

### Gemini Detection

**Domain Patterns**:
- `gemini.google.com`
- Already captured by existing Gemini reporting integration

**Note**: Gemini is native to Google Workspace, so it's tracked via `gemini` application (already implemented in Phase 1).

---

## Revised Implementation Plan

### Phase 1: Google OAuth AI Platform Detector

**File**: `backend/src/services/detection/google-oauth-ai-detector.service.ts`

```typescript
import {
  AIplatformAuditLog,
  AIPlatform,
  AIActivityType,
  AIRiskIndicator
} from '@saas-xray/shared-types';

export class GoogleOAuthAIDetectorService {
  private readonly AI_PLATFORM_PATTERNS = {
    chatgpt: {
      domains: ['api.openai.com', 'auth.openai.com', 'chat.openai.com', 'platform.openai.com'],
      clientIdPatterns: ['openai'],
      displayName: 'ChatGPT'
    },
    claude: {
      domains: ['claude.ai', 'anthropic.com', 'console.anthropic.com'],
      clientIdPatterns: ['anthropic', 'claude'],
      displayName: 'Claude'
    },
    gemini: {
      domains: ['gemini.google.com', 'ai.google.dev'],
      clientIdPatterns: ['gemini'],
      displayName: 'Gemini'
    },
    perplexity: {
      domains: ['perplexity.ai'],
      clientIdPatterns: ['perplexity'],
      displayName: 'Perplexity'
    },
    copilot: {
      domains: ['copilot.microsoft.com', 'github.com/copilot'],
      clientIdPatterns: ['copilot', 'github'],
      displayName: 'GitHub Copilot'
    }
  };

  /**
   * Analyze Google login audit log for AI platform OAuth events
   */
  detectAIPlatformLogin(googleLoginEvent: any): AIplatformAuditLog | null {
    const parameters = this.extractParameters(googleLoginEvent.events);

    const applicationName = parameters.application_name || parameters.app_name;
    const clientId = parameters.oauth_client_id || parameters.client_id;

    // Check against AI platform patterns
    const detectedPlatform = this.identifyAIPlatform(applicationName, clientId);

    if (!detectedPlatform) {
      return null; // Not an AI platform
    }

    return {
      id: googleLoginEvent.id.uniqueQualifier,
      platform: detectedPlatform,
      timestamp: new Date(googleLoginEvent.id.time),
      userId: googleLoginEvent.actor.profileId,
      userEmail: googleLoginEvent.actor.email,
      organizationId: googleLoginEvent.id.customerId,
      activityType: this.mapLoginEventToActivityType(parameters),
      action: googleLoginEvent.events[0].name,
      metadata: {
        applicationName,
        clientId,
        scopes: parameters.oauth_scopes || [],
        loginType: parameters.login_type,
        ipAddress: googleLoginEvent.ipAddress
      },
      ipAddress: googleLoginEvent.ipAddress,
      riskIndicators: this.assessOAuthRiskIndicators(parameters, detectedPlatform)
    };
  }

  private identifyAIPlatform(applicationName?: string, clientId?: string): AIPlatform | null {
    if (!applicationName && !clientId) return null;

    for (const [platform, patterns] of Object.entries(this.AI_PLATFORM_PATTERNS)) {
      // Check domain match
      if (applicationName && patterns.domains.some(domain =>
        applicationName.toLowerCase().includes(domain.toLowerCase())
      )) {
        return platform as AIPlatform;
      }

      // Check client ID match
      if (clientId && patterns.clientIdPatterns.some(pattern =>
        clientId.toLowerCase().includes(pattern.toLowerCase())
      )) {
        return platform as AIPlatform;
      }
    }

    return null;
  }

  private mapLoginEventToActivityType(parameters: any): AIActivityType {
    const eventName = parameters.event_name || '';

    if (eventName.includes('authorize') || eventName.includes('approve')) {
      return 'integration_created'; // OAuth consent = integration
    }

    if (eventName.includes('login')) {
      return 'login';
    }

    if (eventName.includes('logout')) {
      return 'logout';
    }

    return 'login'; // Default
  }

  private assessOAuthRiskIndicators(parameters: any, platform: AIPlatform): AIRiskIndicator[] {
    const indicators: AIRiskIndicator[] = [];

    // Check for excessive scopes
    const scopes = parameters.oauth_scopes || [];
    if (scopes.length > 5) {
      indicators.push({
        type: 'security_event',
        severity: 'medium',
        description: `OAuth authorization with ${scopes.length} scopes to ${platform}`,
        confidence: 70,
        evidence: [`Scopes: ${scopes.join(', ')}`]
      });
    }

    // Check for sensitive scopes
    const sensitiveScopes = ['drive', 'gmail', 'calendar', 'contacts'];
    const hasSensitiveScope = scopes.some((scope: string) =>
      sensitiveScopes.some(sensitive => scope.toLowerCase().includes(sensitive))
    );

    if (hasSensitiveScope) {
      indicators.push({
        type: 'unauthorized_access',
        severity: 'high',
        description: `${platform} authorized with sensitive data access`,
        confidence: 85,
        evidence: [`Sensitive scopes: ${scopes.filter((s: string) =>
          sensitiveScopes.some(sens => s.toLowerCase().includes(sens))
        ).join(', ')}`],
        complianceImpact: ['GDPR', 'SOC2']
      });
    }

    return indicators;
  }

  private extractParameters(events: any[]): any {
    const params: any = {};

    events.forEach(event => {
      if (event.parameters) {
        event.parameters.forEach((param: any) => {
          if (param.multiValue) {
            params[param.name] = param.multiValue;
          } else if (param.value) {
            params[param.name] = param.value;
          }
        });
      }
    });

    return params;
  }
}
```

---

## Revised Phase Implementation

### Phase 1: OAuth Detection in Google Connector
**Objective**: Detect AI platform logins via Google Workspace OAuth events

**Implementation**:
1. Extend `GoogleConnector.getAuditLogs()` to query `login` and `token` applications
2. Filter for AI platform domains (ChatGPT, Claude, etc.)
3. Normalize to `AIplatformAuditLog`
4. No Enterprise API calls needed!

### Phase 2: ChatGPT OAuth Pattern Recognition
**Objective**: Enhance ChatGPT detection with advanced pattern matching

**Implementation**:
1. Refine ChatGPT OAuth detection patterns
2. Detect ChatGPT API usage (OAuth tokens making API calls)
3. Track token lifecycle (issued → used → revoked)

### Phase 3: Claude OAuth Pattern Recognition
**Objective**: Enhanced Claude detection

**Implementation**:
1. Refine Claude OAuth detection patterns
2. Detect Claude SSO usage
3. Track session patterns

### Phase 4: GPT-5 Analysis (Unchanged)
**Objective**: Intelligent filtering and prioritization

**Implementation**: As originally planned

---

## Simplified Pull Request Strategy

Since implementation hasn't started yet, here's the streamlined approach:

### Option A: Use Conductor as Planned
1. Open Conductor app
2. Create 4 workspaces with revised OAuth-focused prompts
3. Let agents implement in parallel (Weeks 2-4)
4. Merge in Week 5
5. Create PR to production

### Option B: Single PR Approach
1. Implement OAuth detection on feature branch
2. Test thoroughly
3. Create PR immediately
4. Deploy to staging/production

## Recommendation

**Use Option A (Conductor)** - The parallel development setup is ready, just with simplified OAuth-based implementation instead of Enterprise APIs. This still benefits from TDD and isolation.