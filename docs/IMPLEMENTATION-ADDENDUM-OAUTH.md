# Implementation Addendum: OAuth-Based Detection

## IMPORTANT: Revised Strategy

**Date**: 2025-01-02
**Status**: **Use this approach instead of Enterprise API integration**

This document supersedes sections of `AI-PLATFORM-DETECTION-IMPLEMENTATION.md` that describe Enterprise API integration. The core types and architecture remain valid, but implementation focuses on OAuth detection via Google Workspace audit logs.

---

## What Changed

### ❌ **NOT Implementing** (Too Complex, Requires Enterprise Subscriptions)
- ChatGPT Enterprise Compliance API direct integration
- Claude Enterprise audit log export API
- Direct API connections to AI platforms

### ✅ **NOW Implementing** (Simpler, More Comprehensive)
- Google Workspace `login` application audit logs
- Google Workspace `token` application audit logs
- OAuth flow detection for AI platforms
- Pattern matching for ChatGPT, Claude, Gemini, Perplexity, Copilot

---

## Simplified Architecture

```
┌──────────────────────────────────────────────────────────────┐
│              Google Workspace Admin SDK                      │
│                                                              │
│  ┌────────────────┐        ┌──────────────────┐            │
│  │ login app logs │        │ token app logs   │            │
│  │                │        │                  │            │
│  │ • oauth2_auth  │        │ • authorize      │            │
│  │ • login_success│        │ • token_revoke   │            │
│  └────────────────┘        └──────────────────┘            │
└──────────────────────────────────────────────────────────────┘
           │                           │
           │      OAuth Event          │
           │      Detection            │
           ▼                           ▼
┌──────────────────────────────────────────────────────────────┐
│         GoogleOAuthAIDetectorService                         │
│                                                              │
│  Pattern Matching:                                          │
│  ├─ Domain: api.openai.com → ChatGPT                       │
│  ├─ Domain: claude.ai → Claude                             │
│  ├─ Domain: gemini.google.com → Gemini                     │
│  ├─ Client ID contains "anthropic" → Claude                │
│  └─ Client ID contains "openai" → ChatGPT                  │
└──────────────────────────────────────────────────────────────┘
           │
           │ Normalized
           │ Events
           ▼
┌──────────────────────────────────────────────────────────────┐
│              AIplatformAuditLog                              │
│  (Unified format for all platforms)                         │
└──────────────────────────────────────────────────────────────┘
           │
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│           GPT-5 Analysis Service                             │
│  (Unchanged - still provides intelligent filtering)          │
└──────────────────────────────────────────────────────────────┘
```

---

## Phase Implementation Updates

### Phase 1: Google OAuth AI Detector (NEW)

**Branch**: `feature/google-oauth-ai-detection`
**Duration**: 1 week (simplified from 2 weeks)

**Objective**: Detect AI platform logins through Google Workspace OAuth audit logs

**Implementation**:
1. Create `GoogleOAuthAIDetectorService`
2. Query Google Admin SDK for `login` and `token` applications
3. Pattern match for AI platforms
4. Normalize to `AIplatformAuditLog`

**No External APIs Required** - Everything via Google Admin SDK!

**Test Data**: Real Google Workspace with users logging into ChatGPT/Claude

---

### Phase 2: Enhanced ChatGPT Detection (REVISED)

**Branch**: `feature/chatgpt-oauth-enhancement`
**Duration**: 1 week

**Objective**: Refine ChatGPT OAuth detection with advanced patterns

**Implementation**:
1. Multi-domain detection (api.openai.com, chat.openai.com, platform.openai.com)
2. Detect ChatGPT Plus vs Enterprise (via OAuth scopes)
3. Track API usage patterns (OAuth token → API calls)

**Data Source**: Google Workspace audit logs only

---

### Phase 3: Enhanced Claude Detection (REVISED)

**Branch**: `feature/claude-oauth-enhancement`
**Duration**: 1 week

**Objective**: Refine Claude OAuth detection

**Implementation**:
1. Multi-domain detection (claude.ai, anthropic.com, console.anthropic.com)
2. Detect Claude Pro vs Enterprise
3. Track session patterns

**Data Source**: Google Workspace audit logs only

---

### Phase 4: GPT-5 Analysis (UNCHANGED)

**Branch**: `feature/gpt5-analysis`
**Duration**: 3 weeks

**Objective**: Intelligent filtering and risk assessment

**Implementation**: As originally planned
**Inputs**: AIplatformAuditLog events from Phases 1-3

---

## Updated Timeline

| Week | Phase | Simplified Scope |
|------|-------|------------------|
| **Week 1** | Phase 0 | ✅ Complete (shared-types) |
| **Week 2** | Phase 1 | OAuth AI detector (Google Admin SDK) |
| **Week 3** | Phase 2 + 3 | ChatGPT + Claude pattern refinements (parallel) |
| **Week 4** | Phase 4 | GPT-5 analysis |
| **Week 5** | Integration | Merge all + cloud deployment |

**Total**: Still 5 weeks, but simpler implementation

---

## Testing Strategy (Simplified)

### Unit Tests
```typescript
describe('GoogleOAuthAIDetectorService', () => {
  it('should detect ChatGPT OAuth from domain', () => {
    const event = createMockGoogleLoginEvent({
      applicationName: 'api.openai.com'
    });

    const result = detector.detectAIPlatformLogin(event);

    expect(result?.platform).toBe('chatgpt');
  });

  it('should detect Claude from client ID', () => {
    const event = createMockTokenEvent({
      clientId: 'anthropic-oauth-client-123'
    });

    const result = detector.detectAIPlatformLogin(event);

    expect(result?.platform).toBe('claude');
  });
});
```

### Integration Tests
```typescript
describe('Google OAuth AI Detection Integration', () => {
  it('should detect real ChatGPT logins in Google Workspace', async () => {
    // Query actual Google Workspace audit logs
    const logs = await googleConnector.getAuditLogs(since);

    // Filter for AI platforms
    const aiLogins = logs
      .map(log => detector.detectAIPlatformLogin(log))
      .filter(log => log !== null);

    expect(aiLogins.length).toBeGreaterThan(0);
    expect(aiLogins.some(l => l.platform === 'chatgpt')).toBe(true);
  });
});
```

**No mock APIs needed** - Just real Google Workspace account!

---

## Conductor Workspace Updates

### Revised Prompts

**Phase 1 Prompt** (Updated):
```markdown
## Mission
Implement GoogleOAuthAIDetectorService to detect AI platform logins via
Google Workspace OAuth audit logs.

## Key Points
- NO direct ChatGPT/Claude API calls
- Query Google Admin SDK: login + token applications
- Pattern match: domains + client IDs
- Detect: ChatGPT, Claude, Gemini, Perplexity, Copilot

## Implementation
1. Create GoogleOAuthAIDetectorService
2. Write tests with mock Google login events
3. Implement pattern matching
4. Integration test with real Workspace
```

**Phase 2-3 Prompts** (Simplified):
Focus on enhancing pattern detection, not Enterprise API integration.

**Phase 4 Prompt** (Unchanged):
GPT-5 analysis still provides the intelligent filtering layer.

---

## Migration from Original Plan

### Types: Keep All ✅
- ChatGPT Enterprise types: Still useful for understanding event structure
- Claude Enterprise types: Still useful for future enhancement
- Gemini types: Actively used
- GPT-5 types: Actively used

### Implementation: Simplify 🔄
- Remove Enterprise API client code
- Focus on Google Admin SDK queries
- Pattern matching instead of direct integration

### Benefits: Enhanced 🎯
- Faster implementation (fewer external dependencies)
- Broader detection (catches personal + business accounts)
- Lower cost (no Enterprise subscriptions)
- Easier testing (just need Google Workspace)

---

## Success Criteria (Updated)

### Phase 1
- [ ] Detect ChatGPT logins via OAuth
- [ ] Detect Claude logins via OAuth
- [ ] Detect Gemini usage (existing integration)
- [ ] Normalize all to AIplatformAuditLog
- [ ] Tests passing

### Phase 2-3
- [ ] Enhanced pattern matching
- [ ] Multi-domain support
- [ ] Risk assessment for OAuth scopes

### Phase 4
- [ ] GPT-5 analysis working
- [ ] Accurate risk scoring
- [ ] Cost optimized

---

## API Queries Needed

### Google Admin SDK - Login Application

```typescript
const loginLogs = await admin.activities.list({
  userKey: 'all',
  applicationName: 'login',
  startTime: since.toISOString(),
  maxResults: 1000,
  eventName: 'oauth2_authorize' // Filter for OAuth events
});
```

### Google Admin SDK - Token Application

```typescript
const tokenLogs = await admin.activities.list({
  userKey: 'all',
  applicationName: 'token',
  startTime: since.toISOString(),
  maxResults: 1000,
  eventName: 'authorize'
});
```

### Filter and Process

```typescript
const aiPlatformLogins = loginLogs.data.items
  .map(event => detector.detectAIPlatformLogin(event))
  .filter(log => log !== null);
```

---

## Example Detection Output

**Input** (Google Workspace login event):
```json
{
  "id": { "time": "2025-01-15T10:30:00Z", "applicationName": "login" },
  "actor": { "email": "john.doe@company.com" },
  "events": [{
    "name": "oauth2_authorize",
    "parameters": [
      { "name": "application_name", "value": "api.openai.com" },
      { "name": "oauth_client_id", "value": "openai-chatgpt-client" },
      { "name": "oauth_scopes", "multiValue": ["email", "profile"] }
    ]
  }]
}
```

**Output** (Normalized AIplatformAuditLog):
```json
{
  "id": "unique-123",
  "platform": "chatgpt",
  "timestamp": "2025-01-15T10:30:00Z",
  "userId": "profile-456",
  "userEmail": "john.doe@company.com",
  "organizationId": "customer-789",
  "activityType": "integration_created",
  "action": "oauth2_authorize",
  "metadata": {
    "applicationName": "api.openai.com",
    "clientId": "openai-chatgpt-client",
    "scopes": ["email", "profile"]
  },
  "riskIndicators": [{
    "type": "unauthorized_access",
    "severity": "medium",
    "description": "ChatGPT OAuth authorization detected",
    "confidence": 80
  }]
}
```

---

## Next Actions

1. **Review this addendum** - Confirm OAuth approach is correct
2. **Update Conductor prompts** - Revise for OAuth focus
3. **Open Conductor** - Create 4 workspaces with revised prompts
4. **Start Parallel Development** - Let agents implement
5. **Merge in Week 5** - Sequential integration
6. **Create PR** - Deploy to production

---

**Document Version**: 1.0 (Addendum)
**Supersedes**: AI-PLATFORM-DETECTION-IMPLEMENTATION.md (Phases 1-3 Enterprise API sections)
**Effective**: Immediately
**Status**: OAuth-based detection is the official approach
