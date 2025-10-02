# Phase 1: Gemini Reporting API Integration

## Workspace Context
- **Branch**: `feature/gemini-reporting-api`
- **Duration**: 2 weeks
- **Dependencies**: Phase 0 (shared-types) ✅
- **Environment**: Local Docker (PostgreSQL + Redis)

---

## Mission

Extend the existing `GoogleConnector` with Gemini Reporting API capabilities to track Gemini usage across Google Workspace applications (Gmail, Docs, Sheets, Slides, Meet, Drive).

---

## Available Types (from @saas-xray/shared-types)

```typescript
import {
  // Gemini-specific
  GeminiAuditEvent,
  GeminiReportingAPIQuery,
  GeminiReportingAPIResponse,
  GeminiEventName,
  GeminiApplication,
  GeminiUsageMetrics,

  // Unified AI platform
  AIplatformAuditLog,
  AIAuditLogQuery,
  AIAuditLogResult,
  UsageAnalytics
} from '@saas-xray/shared-types';
```

---

## Implementation Steps (TDD Approach)

### Step 1: Understand Existing Code

**Read these files first**:
1. `backend/src/connectors/google.ts` - Existing Google Workspace connector
2. `shared-types/src/platforms/gemini-workspace.ts` - Types you'll use
3. `/docs/AI-PLATFORM-DETECTION-IMPLEMENTATION.md` - Complete spec (Phase 1)

**Questions to answer**:
- How does GoogleConnector currently authenticate?
- What Google APIs are already integrated?
- How are audit logs currently retrieved?

---

### Step 2: Write Tests FIRST

Create: `backend/src/connectors/__tests__/google-gemini-extension.test.ts`

```typescript
import { GoogleConnector } from '../google';
import { GeminiReportingAPI } from '../extensions/gemini-reporting-api';
import {
  GeminiAuditEvent,
  AIplatformAuditLog,
  AIAuditLogQuery
} from '@saas-xray/shared-types';

describe('GoogleConnector - Gemini Extension', () => {
  let connector: GoogleConnector;
  let geminiAPI: GeminiReportingAPI;

  beforeEach(async () => {
    connector = new GoogleConnector();

    // Authenticate with test credentials
    const mockCredentials = {
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      expiresAt: new Date(Date.now() + 3600000),
      scope: [
        'https://www.googleapis.com/auth/admin.reports.audit.readonly'
      ]
    };

    await connector.authenticate(mockCredentials);
    geminiAPI = new GeminiReportingAPI(connector.getAuthClient());
  });

  describe('getGeminiAuditLogs', () => {
    it('should fetch Gemini audit logs via Admin SDK', async () => {
      const query: AIAuditLogQuery = {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31')
      };

      const result = await geminiAPI.getGeminiAuditLogs(query);

      expect(result).toBeDefined();
      expect(result.logs).toBeInstanceOf(Array);
      expect(result.metadata.platform).toBe('gemini');
    });

    it('should normalize Gemini events to AIplatformAuditLog format', async () => {
      // Create mock Gemini event
      const mockGeminiEvent: GeminiAuditEvent = {
        kind: 'admin#reports#activity',
        id: {
          time: '2025-01-15T10:30:00Z',
          uniqueQualifier: 'unique-123',
          applicationName: 'gemini',
          customerId: 'customer-456'
        },
        actor: {
          email: 'user@workspace.com',
          profileId: 'profile-789',
          callerType: 'USER'
        },
        events: [{
          type: 'gemini_activity',
          name: 'help_me_write',
          parameters: [{
            name: 'application',
            value: 'gmail'
          }]
        }]
      };

      const normalized = geminiAPI.normalizeGeminiEvent(mockGeminiEvent);

      expect(normalized.platform).toBe('gemini');
      expect(normalized.activityType).toBe('conversation');
      expect(normalized.userEmail).toBe('user@workspace.com');
      expect(normalized.metadata.applicationContext).toBe('gmail');
    });

    it('should handle pagination correctly', async () => {
      const firstPage = await geminiAPI.getGeminiAuditLogs({
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        limit: 100
      });

      if (firstPage.hasMore) {
        const secondPage = await geminiAPI.getGeminiAuditLogs({
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31'),
          cursor: firstPage.nextCursor
        });

        expect(secondPage.logs).toBeInstanceOf(Array);
      }
    });

    it('should filter by event types', async () => {
      const result = await geminiAPI.getGeminiAuditLogs({
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        eventTypes: ['help_me_write', 'summarize']
      });

      result.logs.forEach(log => {
        expect(['help_me_write', 'summarize']).toContain(log.action);
      });
    });
  });

  describe('getGeminiUsageMetrics', () => {
    it('should aggregate usage by application', async () => {
      const metrics = await geminiAPI.getUsageMetrics({
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31')
      });

      expect(metrics.usageByApplication).toBeDefined();
      expect(metrics.usageByApplication.gmail).toBeDefined();
    });

    it('should identify top users', async () => {
      const metrics = await geminiAPI.getUsageMetrics({
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31')
      });

      expect(metrics.topUsers).toBeInstanceOf(Array);
      expect(metrics.topUsers.length).toBeGreaterThan(0);
    });
  });
});
```

---

### Step 3: Implement GeminiReportingAPI

Create: `backend/src/connectors/extensions/gemini-reporting-api.ts`

```typescript
import { google } from 'googleapis';
import {
  GeminiAuditEvent,
  GeminiReportingAPIQuery,
  GeminiReportingAPIResponse,
  AIplatformAuditLog,
  AIAuditLogQuery,
  AIAuditLogResult,
  AIActivityType,
  AIRiskIndicator,
  GeminiUsageMetrics
} from '@saas-xray/shared-types';

export class GeminiReportingAPI {
  private auth: any; // OAuth2Client

  constructor(auth: any) {
    this.auth = auth;
  }

  async getGeminiAuditLogs(query: AIAuditLogQuery): Promise<AIAuditLogResult> {
    // TODO: Implement API call to Google Admin SDK
    // TODO: Normalize results
    // TODO: Handle pagination
  }

  async getUsageMetrics(period: AIDateRange): Promise<GeminiUsageMetrics> {
    // TODO: Aggregate usage data
  }

  normalizeGeminiEvent(event: GeminiAuditEvent): AIplatformAuditLog {
    // TODO: Map Gemini event to unified format
  }

  // Helper methods
  private mapGeminiActivityType(eventName: string): AIActivityType {
    // TODO: Map event names to activity types
  }

  private extractApplicationContext(parameters: any[]): string | undefined {
    // TODO: Extract application from parameters
  }

  private assessGeminiRiskIndicators(event: GeminiAuditEvent): AIRiskIndicator[] {
    // TODO: Generate risk indicators
  }
}
```

---

### Step 4: Integration with GoogleConnector

Update: `backend/src/connectors/google.ts`

```typescript
import { GeminiReportingAPI } from './extensions/gemini-reporting-api';

export class GoogleConnector implements PlatformConnector {
  // ... existing code ...

  private geminiAPI?: GeminiReportingAPI;

  async authenticate(credentials: OAuthCredentials): Promise<ConnectionResult> {
    // ... existing auth code ...

    // Initialize Gemini API
    this.geminiAPI = new GeminiReportingAPI(this.client);

    return result;
  }

  async getAIAuditLogs(query: AIAuditLogQuery): Promise<AIAuditLogResult> {
    if (!this.geminiAPI) {
      throw new Error('Gemini API not initialized');
    }

    return this.geminiAPI.getGeminiAuditLogs(query);
  }
}
```

---

### Step 5: Run Tests

```bash
# Run unit tests
npm test -- --testPathPattern=gemini

# Run integration tests (requires real Google account)
GOOGLE_TEST_CREDENTIALS=... npm test -- gemini.integration

# Check TypeScript
npm run verify:types

# Check coverage
npm test -- --testPathPattern=gemini --coverage
```

---

### Step 6: Dashboard Integration (Optional for Phase 1)

If time permits, add dashboard widget showing Gemini usage.

---

## Success Criteria

Before marking this phase complete:

- [ ] All unit tests passing (100% coverage for new code)
- [ ] Integration tests passing with real Google Workspace
- [ ] TypeScript compilation clean (0 errors)
- [ ] Gemini audit logs retrieved successfully
- [ ] Events normalized to AIplatformAuditLog correctly
- [ ] Pagination working
- [ ] Usage metrics aggregated
- [ ] Code reviewed and documented
- [ ] No console.log statements in production code
- [ ] Committed with clear messages

---

## Handoff to Week 5

When Phase 1 is complete:
1. **Final commit** with summary
2. **Push branch**: `git push origin feature/gemini-reporting-api`
3. **Document** any issues or learnings
4. **Notify** team that Phase 1 is merge-ready

---

## Resources

- **API Docs**: https://developers.google.com/admin-sdk/reports/reference/rest/v1/activities
- **Type Definitions**: `shared-types/src/platforms/gemini-workspace.ts`
- **Implementation Spec**: `/docs/AI-PLATFORM-DETECTION-IMPLEMENTATION.md`
- **Conductor Docs**: https://docs.conductor.build

---

**Phase**: 1 of 4
**Platform**: Gemini (Google Workspace)
**Status**: Ready to implement
**Assigned Workspace**: Conductor Workspace #1
