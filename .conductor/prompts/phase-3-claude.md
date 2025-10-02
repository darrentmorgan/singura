# Phase 3: Claude Enterprise Connector

## Workspace Context
- **Branch**: `feature/claude-enterprise`
- **Duration**: 2 weeks
- **Dependencies**: Phase 0 (shared-types) ✅
- **Environment**: Local Docker (PostgreSQL + Redis)

---

## Mission

Build Claude Enterprise audit log connector with export/download workflow to track user activity across Claude Enterprise accounts.

---

## Available Types (from @saas-xray/shared-types)

```typescript
import {
  // Claude-specific
  ClaudeAuditLogEntry,
  ClaudeAuditLogExportRequest,
  ClaudeAuditLogExportResponse,
  ClaudeEnterpriseConfig,
  ClaudeEventType,
  ClaudeUsageAnalytics,

  // Unified AI platform
  AIPlatformConnector,
  AIplatformAuditLog,
  AIAuditLogQuery,
  AIAuditLogResult
} from '@saas-xray/shared-types';
```

---

## Implementation Steps (TDD)

### Step 1: Understand Claude's Export Model

**Key Differences from ChatGPT/Gemini**:
- Claude uses **export-based** audit log retrieval (not real-time API)
- Workflow: Request export → Poll status → Download file
- Retention: 180 days maximum
- Access: Enterprise plan only, Owner/Primary Owner role

---

### Step 2: Write Tests FIRST

Create: `backend/src/connectors/__tests__/claude-enterprise.test.ts`

```typescript
import { ClaudeEnterpriseConnector } from '../claude-enterprise';
import {
  ClaudeEnterpriseConfig,
  ClaudeAuditLogExportRequest
} from '@saas-xray/shared-types';

describe('ClaudeEnterpriseConnector', () => {
  let connector: ClaudeEnterpriseConnector;

  beforeEach(() => {
    const config: ClaudeEnterpriseConfig = {
      apiKey: process.env.CLAUDE_TEST_API_KEY || 'test-key',
      organizationId: process.env.CLAUDE_TEST_ORG_ID || 'org-test'
    };

    connector = new ClaudeEnterpriseConnector(config);
  });

  describe('requestAuditLogExport', () => {
    it('should initiate audit log export', async () => {
      const request: ClaudeAuditLogExportRequest = {
        start_date: '2025-01-01T00:00:00Z',
        end_date: '2025-01-31T23:59:59Z',
        format: 'json'
      };

      const result = await connector.requestAuditLogExport(request);

      expect(result.export_id).toBeDefined();
      expect(result.status).toBe('pending');
    });

    it('should handle date range > 180 days error', async () => {
      const request: ClaudeAuditLogExportRequest = {
        start_date: '2024-01-01T00:00:00Z',
        end_date: '2025-01-31T23:59:59Z'
      };

      await expect(connector.requestAuditLogExport(request)).rejects.toThrow(
        /180 days/
      );
    });
  });

  describe('pollExportStatus', () => {
    it('should check export job status', async () => {
      // First create export
      const exportRequest = await connector.requestAuditLogExport({
        start_date: '2025-01-01T00:00:00Z',
        end_date: '2025-01-31T23:59:59Z'
      });

      // Then poll status
      const status = await connector.pollExportStatus(exportRequest.export_id);

      expect(['pending', 'processing', 'completed']).toContain(status.status);
    });

    it('should wait for completion with timeout', async () => {
      const exportRequest = await connector.requestAuditLogExport({
        start_date: '2025-01-01T00:00:00Z',
        end_date: '2025-01-01T23:59:59Z'
      });

      const completed = await connector.waitForExportCompletion(
        exportRequest.export_id,
        { timeout: 60000, pollInterval: 5000 }
      );

      expect(completed.status).toBe('completed');
      expect(completed.download_url).toBeDefined();
    });
  });

  describe('downloadAndParseLogs', () => {
    it('should download and parse exported logs', async () => {
      const mockDownloadUrl = 'https://example.com/export.json';

      const logs = await connector.downloadAndParseLogs(mockDownloadUrl);

      expect(logs).toBeInstanceOf(Array);
      logs.forEach(log => {
        expect(log.id).toBeDefined();
        expect(log.event_type).toBeDefined();
      });
    });
  });

  describe('getAIAuditLogs', () => {
    it('should orchestrate full export workflow', async () => {
      const result = await connector.getAIAuditLogs({
        startDate: new Date('2025-01-15'),
        endDate: new Date('2025-01-15')
      });

      expect(result.logs).toBeInstanceOf(Array);
      expect(result.metadata.platform).toBe('claude');
    });

    it('should normalize Claude events to AIplatformAuditLog', async () => {
      const result = await connector.getAIAuditLogs({
        startDate: new Date('2025-01-15'),
        endDate: new Date('2025-01-15')
      });

      result.logs.forEach(log => {
        expect(log.platform).toBe('claude');
        expect(log.timestamp).toBeInstanceOf(Date);
        expect(log.activityType).toBeDefined();
      });
    });
  });

  describe('getUsageAnalytics', () => {
    it('should aggregate Claude usage data', async () => {
      const analytics = await connector.getUsageAnalytics({
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31')
      });

      expect(analytics.platform).toBe('claude');
      expect(analytics.totalUsers).toBeGreaterThanOrEqual(0);
    });
  });
});
```

---

### Step 3: Implement ClaudeEnterpriseConnector

Create: `backend/src/connectors/claude-enterprise.ts`

```typescript
import {
  AIPlatformConnector,
  ClaudeEnterpriseConfig,
  ClaudeAuditLogExportRequest,
  ClaudeAuditLogExportResponse,
  ClaudeAuditLogEntry,
  AIplatformAuditLog,
  AIAuditLogQuery,
  AIAuditLogResult,
  UsageAnalytics,
  AIDateRange
} from '@saas-xray/shared-types';

export class ClaudeEnterpriseConnector implements AIPlatformConnector {
  platform: 'claude' = 'claude';
  private config: ClaudeEnterpriseConfig;

  constructor(config: ClaudeEnterpriseConfig) {
    this.config = config;
  }

  async requestAuditLogExport(
    request: ClaudeAuditLogExportRequest
  ): Promise<ClaudeAuditLogExportResponse> {
    // TODO: Call Anthropic export API
  }

  async pollExportStatus(
    exportId: string
  ): Promise<ClaudeAuditLogExportResponse> {
    // TODO: Check export status
  }

  async waitForExportCompletion(
    exportId: string,
    options: { timeout: number; pollInterval: number }
  ): Promise<ClaudeAuditLogExportResponse> {
    // TODO: Poll until completed or timeout
  }

  async downloadAndParseLogs(
    downloadUrl: string
  ): Promise<ClaudeAuditLogEntry[]> {
    // TODO: Download and parse JSON/CSV
  }

  async getAIAuditLogs(query: AIAuditLogQuery): Promise<AIAuditLogResult> {
    // TODO: Orchestrate: request → poll → download → normalize
  }

  async getUsageAnalytics(period: AIDateRange): Promise<UsageAnalytics> {
    // TODO: Aggregate usage from logs
  }

  async validateAICredentials(): Promise<AICredentialValidation> {
    // TODO: Validate API key
  }

  // Helper methods
  private normalizeClaudeEvent(
    entry: ClaudeAuditLogEntry
  ): AIplatformAuditLog {
    // TODO: Map to unified format
  }

  private validateDateRange(startDate: Date, endDate: Date): void {
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 180) {
      throw new Error('Date range cannot exceed 180 days for Claude audit logs');
    }
  }

  // Stubs
  async discoverAutomations(): Promise<AutomationEvent[]> { return []; }
  async getAuditLogs(since: Date): Promise<AuditLogEntry[]> { return []; }
  async validatePermissions(): Promise<PermissionCheck> {
    return { isValid: true, permissions: [], missingPermissions: [], errors: [], lastChecked: new Date() };
  }
}

// Export singleton
export const claudeEnterpriseConnector = new ClaudeEnterpriseConnector({
  apiKey: process.env.CLAUDE_ENTERPRISE_API_KEY || '',
  organizationId: process.env.CLAUDE_ORGANIZATION_ID || ''
});
```

---

### Step 4: Run Tests

```bash
npm test -- --testPathPattern=claude
```

---

## Success Criteria

- [ ] Export workflow functional
- [ ] Poll/wait mechanism working
- [ ] Download and parse successful
- [ ] Events normalized correctly
- [ ] All tests passing
- [ ] TypeScript clean

---

**Phase**: 3 of 4
**Platform**: Claude (Anthropic)
**Status**: Ready to implement
**Assigned Workspace**: Conductor Workspace #3
