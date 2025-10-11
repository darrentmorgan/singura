# Phase 2: ChatGPT Enterprise Connector

## Workspace Context
- **Branch**: `feature/chatgpt-enterprise`
- **Duration**: 2 weeks
- **Dependencies**: Phase 0 (shared-types) ✅
- **Environment**: Local Docker (PostgreSQL + Redis)

---

## Mission

Build a complete ChatGPT Enterprise Compliance API connector to track user logins, conversations, file uploads, and GPT creations.

---

## Available Types (from @singura/shared-types)

```typescript
import {
  // ChatGPT-specific
  ChatGPTAuditLogEntry,
  ChatGPTAuditLogQuery,
  ChatGPTAuditLogResponse,
  ChatGPTComplianceAPIConfig,
  ChatGPTEventType,
  ChatGPTUsageStatistics,

  // Unified AI platform
  AIPlatformConnector,
  AIplatformAuditLog,
  AIAuditLogQuery,
  AIAuditLogResult
} from '@singura/shared-types';
```

---

## Implementation Steps (TDD)

### Step 1: Research ChatGPT Compliance API

**Read**:
1. OpenAI API docs: https://platform.openai.com/docs/api-reference/audit-logs
2. `shared-types/src/platforms/chatgpt-enterprise.ts`
3. `/docs/AI-PLATFORM-DETECTION-IMPLEMENTATION.md` (Phase 2)

**Understand**:
- API endpoint: `https://api.openai.com/v1/organization/audit_logs`
- Authentication: Bearer token + Organization header
- Pagination: cursor-based (after/before)
- Rate limits: Check response headers

---

### Step 2: Write Tests FIRST

Create: `backend/src/connectors/__tests__/chatgpt-enterprise.test.ts`

```typescript
import { ChatGPTEnterpriseConnector } from '../chatgpt-enterprise';
import {
  ChatGPTComplianceAPIConfig,
  AIAuditLogQuery
} from '@singura/shared-types';

describe('ChatGPTEnterpriseConnector', () => {
  let connector: ChatGPTEnterpriseConnector;
  let config: ChatGPTComplianceAPIConfig;

  beforeEach(() => {
    config = {
      apiKey: process.env.OPENAI_TEST_API_KEY || 'test-key',
      organizationId: process.env.OPENAI_TEST_ORG_ID || 'org-test'
    };

    connector = new ChatGPTEnterpriseConnector(config);
  });

  describe('authenticate', () => {
    it('should validate API key and organization access', async () => {
      const result = await connector.authenticate({
        accessToken: config.apiKey,
        tokenType: 'bearer',
        scope: ['audit_logs.read']
      });

      expect(result.success).toBe(true);
      expect(result.platformUserId).toBe(config.organizationId);
    });

    it('should fail with invalid API key', async () => {
      const invalidConnector = new ChatGPTEnterpriseConnector({
        apiKey: 'invalid-key',
        organizationId: 'org-test'
      });

      const result = await invalidConnector.authenticate({
        accessToken: 'invalid-key',
        tokenType: 'bearer'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getAIAuditLogs', () => {
    it('should fetch audit logs for date range', async () => {
      const query: AIAuditLogQuery = {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31')
      };

      const result = await connector.getAIAuditLogs(query);

      expect(result.logs).toBeInstanceOf(Array);
      expect(result.metadata.platform).toBe('chatgpt');
    });

    it('should filter by event types', async () => {
      const result = await connector.getAIAuditLogs({
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        eventTypes: ['user.login', 'file.uploaded']
      });

      result.logs.forEach(log => {
        expect(['user.login', 'file.uploaded']).toContain(log.action);
      });
    });

    it('should normalize ChatGPT events to AIplatformAuditLog', async () => {
      const result = await connector.getAIAuditLogs({
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-01')
      });

      if (result.logs.length > 0) {
        const log = result.logs[0];
        expect(log.platform).toBe('chatgpt');
        expect(log.timestamp).toBeInstanceOf(Date);
        expect(log.userEmail).toBeDefined();
      }
    });

    it('should handle pagination', async () => {
      const firstPage = await connector.getAIAuditLogs({
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        limit: 10
      });

      if (firstPage.hasMore) {
        const secondPage = await connector.getAIAuditLogs({
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31'),
          cursor: firstPage.nextCursor
        });

        expect(secondPage.logs).toBeInstanceOf(Array);
        expect(firstPage.logs[0]?.id).not.toBe(secondPage.logs[0]?.id);
      }
    });
  });

  describe('getUsageAnalytics', () => {
    it('should aggregate usage metrics', async () => {
      const analytics = await connector.getUsageAnalytics({
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31')
      });

      expect(analytics.platform).toBe('chatgpt');
      expect(analytics.totalUsers).toBeGreaterThanOrEqual(0);
      expect(analytics.totalEvents).toBeGreaterThanOrEqual(0);
    });

    it('should identify top users by activity', async () => {
      const analytics = await connector.getUsageAnalytics({
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31')
      });

      expect(analytics.topUsers).toBeInstanceOf(Array);
      if (analytics.topUsers.length > 1) {
        expect(analytics.topUsers[0].eventCount).toBeGreaterThanOrEqual(
          analytics.topUsers[1].eventCount
        );
      }
    });
  });

  describe('validateAICredentials', () => {
    it('should validate API key permissions', async () => {
      const validation = await connector.validateAICredentials();

      expect(validation.isValid).toBe(true);
      expect(validation.platform).toBe('chatgpt');
    });
  });
});
```

---

### Step 3: Implement ChatGPTEnterpriseConnector

Create: `backend/src/connectors/chatgpt-enterprise.ts`

**Starter template** (TDD - implement to pass tests):

```typescript
import {
  AIPlatformConnector,
  ChatGPTComplianceAPIConfig,
  ChatGPTAuditLogEntry,
  ChatGPTAuditLogQuery,
  ChatGPTAuditLogResponse,
  AIplatformAuditLog,
  AIAuditLogQuery,
  AIAuditLogResult,
  UsageAnalytics,
  AIDateRange,
  ConnectionResult,
  OAuthCredentials,
  AutomationEvent,
  AuditLogEntry,
  PermissionCheck,
  AICredentialValidation
} from '@singura/shared-types';

export class ChatGPTEnterpriseConnector implements AIPlatformConnector {
  platform: 'chatgpt' = 'chatgpt';
  private config: ChatGPTComplianceAPIConfig;
  private baseUrl: string;

  constructor(config: ChatGPTComplianceAPIConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  }

  async authenticate(credentials: OAuthCredentials): Promise<ConnectionResult> {
    // TODO: Validate API key with test request
    throw new Error('Not implemented');
  }

  async getAIAuditLogs(query: AIAuditLogQuery): Promise<AIAuditLogResult> {
    // TODO: Convert AIAuditLogQuery to ChatGPTAuditLogQuery
    // TODO: Call OpenAI Compliance API
    // TODO: Normalize results
    throw new Error('Not implemented');
  }

  async getUsageAnalytics(period: AIDateRange): Promise<UsageAnalytics> {
    // TODO: Aggregate audit logs into usage metrics
    throw new Error('Not implemented');
  }

  async validateAICredentials(): Promise<AICredentialValidation> {
    // TODO: Test API key validity
    throw new Error('Not implemented');
  }

  // Stubs for base PlatformConnector interface
  async discoverAutomations(): Promise<AutomationEvent[]> {
    return [];
  }

  async getAuditLogs(since: Date): Promise<AuditLogEntry[]> {
    return [];
  }

  async validatePermissions(): Promise<PermissionCheck> {
    return {
      isValid: true,
      permissions: [],
      missingPermissions: [],
      errors: [],
      lastChecked: new Date()
    };
  }
}

// Export singleton
export const chatgptEnterpriseConnector = new ChatGPTEnterpriseConnector({
  apiKey: process.env.OPENAI_ENTERPRISE_API_KEY || '',
  organizationId: process.env.OPENAI_ORGANIZATION_ID || ''
});
```

---

### Step 4: Implement Methods (Make Tests Pass)

Work through each method until all tests pass:

1. `authenticate()` - Validate API key
2. `getAIAuditLogs()` - Fetch and normalize logs
3. `getUsageAnalytics()` - Aggregate metrics
4. `validateAICredentials()` - Check permissions

**TDD Cycle**:
1. Run tests → See failures
2. Implement minimal code → Tests pass
3. Refactor → Tests still pass
4. Commit → Move to next test

---

### Step 5: Integration Testing

Create: `backend/src/__tests__/integration/chatgpt-enterprise.integration.test.ts`

Test with REAL OpenAI Enterprise account:
```typescript
describe('ChatGPT Enterprise Integration', () => {
  it('should fetch real audit logs', async () => {
    // Uses real API credentials from env
  });
});
```

---

## Environment Variables

Create: `.env` (in workspace)

```bash
# ChatGPT Enterprise (test account)
OPENAI_ENTERPRISE_API_KEY=sk-proj-your-test-key
OPENAI_ORGANIZATION_ID=org-your-test-org

# Database (Docker local)
DATABASE_URL=postgresql://postgres:password@localhost:5433/singura

# Redis (Docker local)
REDIS_URL=redis://localhost:6379

# Backend
PORT=4201
```

---

## Validation Checklist

Before considering Phase 2 complete:

### Code Quality
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] All tests passing
- [ ] 100% coverage for new code
- [ ] No console.log in production code

### Functionality
- [ ] API authentication working
- [ ] Audit logs fetched successfully
- [ ] Event normalization correct
- [ ] Pagination functional
- [ ] Usage analytics accurate

### Documentation
- [ ] Code comments comprehensive
- [ ] Types properly documented
- [ ] README updated (if needed)

### Git Hygiene
- [ ] Commits are atomic
- [ ] Commit messages descriptive
- [ ] Branch up to date with main
- [ ] No merge conflicts

---

## Troubleshooting

### Issue: Cannot find @singura/shared-types

**Solution**:
```bash
cd shared-types
npm run build
cd ../backend
npm link @singura/shared-types
```

### Issue: OpenAI API Rate Limits

**Solution**:
- Implement exponential backoff
- Use pagination wisely (limit: 100)
- Cache results during testing

### Issue: Test Account Access

**Solution**:
- ChatGPT Enterprise requires subscription ($25/user minimum)
- Alternative: Use mock responses for unit tests
- Integration tests: Skip if no credentials available

---

**Phase**: 2 of 4
**Platform**: ChatGPT (OpenAI)
**Status**: Ready to implement
**Assigned Workspace**: Conductor Workspace #2
