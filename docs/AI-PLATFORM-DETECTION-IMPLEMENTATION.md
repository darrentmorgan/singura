# AI Platform Login Detection - Implementation Guide

## Executive Summary

This document provides a comprehensive, test-driven implementation guide for adding native AI platform login detection (ChatGPT, Claude, Gemini) with GPT-5 intelligent filtering to SaaS X-Ray.

**Development Approach**: Types-First TDD with Parallel Git Worktree Execution

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Development Strategy](#development-strategy)
3. [Phase 0: Shared Types Foundation](#phase-0-shared-types-foundation)
4. [Git Worktree Strategy](#git-worktree-strategy)
5. [Phase Implementations](#phase-implementations)
6. [Testing Strategy](#testing-strategy)
7. [Conductor Integration](#conductor-integration)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    SaaS X-Ray Platform                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         @saas-xray/shared-types (Phase 0)                │  │
│  │  • AI Platform Types (ChatGPT, Claude, Gemini)           │  │
│  │  • GPT-5 Analysis Types                                  │  │
│  │  • Audit Log Normalization Types                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           ▲                                     │
│                           │ (import types)                      │
│                           │                                     │
│  ┌────────────┬──────────┴───────┬──────────────┬────────────┐ │
│  │  Phase 1   │    Phase 2       │   Phase 3    │  Phase 4   │ │
│  │  Gemini    │    ChatGPT       │   Claude     │   GPT-5    │ │
│  │  Connector │    Connector     │   Connector  │  Analysis  │ │
│  └────────────┴──────────────────┴──────────────┴────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Types-First Development**: All shared types created before implementation
2. **Test-Driven Development**: Tests written before implementation code
3. **Parallel Execution**: Independent worktrees for simultaneous development
4. **Zero Breaking Changes**: All changes additive to existing codebase

---

## Development Strategy

### Execution Model

```
Phase 0: Shared Types (SEQUENTIAL - Foundation)
    ↓
├─── Phase 1: Gemini ────┐
├─── Phase 2: ChatGPT ───┤ (PARALLEL - Git Worktrees)
├─── Phase 3: Claude ────┤
└─── Phase 4: GPT-5 ─────┘
    ↓
Integration & Testing (SEQUENTIAL - Merge & Validate)
```

### Development Workflow

1. **Phase 0**: Create all shared types in `@saas-xray/shared-types` package
2. **Worktree Setup**: Create separate worktrees for each phase
3. **Parallel Development**: Implement phases 1-4 simultaneously
4. **Type Safety**: All phases import from compiled shared-types
5. **Integration**: Merge phases sequentially, validate at each step

---

## Phase 0: Shared Types Foundation

### Objective

Create comprehensive TypeScript type definitions for all AI platform detection components in the `@saas-xray/shared-types` package.

### Deliverables

#### 1. AI Platform Audit Log Types

**File**: `shared-types/src/platforms/ai-platforms.ts`

```typescript
/**
 * Unified AI Platform Audit Log Entry
 * Normalizes events from ChatGPT, Claude, and Gemini into common format
 */
export interface AIplatformAuditLog {
  // Core identification
  id: string;
  platform: 'chatgpt' | 'claude' | 'gemini';
  timestamp: Date;

  // User information
  userId: string;
  userEmail: string;
  organizationId: string;

  // Activity details
  activityType: AIActivityType;
  action: string;
  metadata: AIActivityMetadata;

  // Security context
  ipAddress?: string;
  userAgent?: string;
  location?: GeoLocation;

  // Risk indicators
  riskIndicators: AIRiskIndicator[];
}

export type AIActivityType =
  | 'login'
  | 'conversation'
  | 'file_upload'
  | 'file_download'
  | 'model_usage'
  | 'prompt_injection'
  | 'data_export'
  | 'settings_change'
  | 'integration_created';

export interface AIActivityMetadata {
  conversationId?: string;
  messageCount?: number;
  tokensUsed?: number;
  model?: string;
  files?: FileReference[];
  duration?: number;
  applicationContext?: string; // For Gemini: 'gmail', 'docs', etc.
}

export interface AIRiskIndicator {
  type: 'sensitive_data' | 'unusual_activity' | 'policy_violation' | 'security_event';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  confidence: number; // 0-100
}

export interface GeoLocation {
  country?: string;
  region?: string;
  city?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface FileReference {
  fileId: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
  uploadedAt: Date;
}
```

#### 2. Platform-Specific Types

**File**: `shared-types/src/platforms/chatgpt-enterprise.ts`

```typescript
/**
 * ChatGPT Enterprise Compliance API Types
 * Based on: https://platform.openai.com/docs/api-reference/audit-logs
 */

export interface ChatGPTAuditLogEntry {
  id: string;
  type: ChatGPTEventType;
  effective_at: number; // Unix timestamp
  actor: ChatGPTActor;
  api_key?: ChatGPTAPIKey;
  project?: ChatGPTProject;
  organization?: ChatGPTOrganization;
}

export type ChatGPTEventType =
  | 'user.login'
  | 'user.logout'
  | 'conversation.created'
  | 'conversation.message'
  | 'file.uploaded'
  | 'file.downloaded'
  | 'gpt.created'
  | 'gpt.updated'
  | 'api_key.created'
  | 'api_key.deleted'
  | 'project.created';

export interface ChatGPTActor {
  type: 'user' | 'api_key' | 'system';
  user?: {
    id: string;
    email: string;
  };
  session?: {
    id: string;
    ip_address?: string;
    user_agent?: string;
  };
}

export interface ChatGPTAPIKey {
  id: string;
  type: 'user' | 'service_account';
  user?: {
    id: string;
    email: string;
  };
  service_account?: {
    id: string;
  };
}

export interface ChatGPTProject {
  id: string;
  name: string;
}

export interface ChatGPTOrganization {
  id: string;
  name: string;
}

export interface ChatGPTConversationMetadata {
  id: string;
  title?: string;
  model: string;
  message_count: number;
  created_at: number;
  updated_at: number;
  parent_message_id?: string;
}

export interface ChatGPTComplianceAPIConfig {
  apiKey: string;
  organizationId: string;
  baseUrl?: string; // Default: https://api.openai.com/v1
}

export interface ChatGPTAuditLogQuery {
  effective_at?: {
    gt?: number;  // Greater than timestamp
    gte?: number; // Greater than or equal
    lt?: number;  // Less than
    lte?: number; // Less than or equal
  };
  project_ids?: string[];
  actor_ids?: string[];
  actor_emails?: string[];
  event_types?: ChatGPTEventType[];
  limit?: number; // Max 100
  after?: string; // Cursor for pagination
  before?: string;
}

export interface ChatGPTAuditLogResponse {
  object: 'list';
  data: ChatGPTAuditLogEntry[];
  first_id: string;
  last_id: string;
  has_more: boolean;
}
```

**File**: `shared-types/src/platforms/claude-enterprise.ts`

```typescript
/**
 * Claude Enterprise Audit Log Types
 * Based on: Anthropic Enterprise Documentation (2025)
 */

export interface ClaudeAuditLogEntry {
  id: string;
  timestamp: string; // ISO 8601
  organization_id: string;
  user_id: string;
  user_email: string;
  event_type: ClaudeEventType;
  event_data: ClaudeEventData;
  metadata: ClaudeEventMetadata;
}

export type ClaudeEventType =
  | 'user.login'
  | 'user.logout'
  | 'conversation.started'
  | 'message.sent'
  | 'message.received'
  | 'artifact.created'
  | 'artifact.updated'
  | 'file.uploaded'
  | 'project.created'
  | 'settings.updated'
  | 'api.key_created';

export interface ClaudeEventData {
  conversation_id?: string;
  message_id?: string;
  artifact_id?: string;
  model?: string;
  tokens?: {
    input: number;
    output: number;
  };
  file_ids?: string[];
  content_type?: string;
}

export interface ClaudeEventMetadata {
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  location?: {
    country?: string;
    region?: string;
  };
  client?: {
    name: string;
    version: string;
  };
}

export interface ClaudeAuditLogExportRequest {
  start_date: string; // ISO 8601 (max 180 days ago)
  end_date: string;   // ISO 8601
  user_ids?: string[];
  event_types?: ClaudeEventType[];
  format?: 'json' | 'csv';
}

export interface ClaudeAuditLogExportResponse {
  export_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  download_url?: string;
  expires_at?: string;
  total_events: number;
}

export interface ClaudeEnterpriseConfig {
  apiKey: string;
  organizationId: string;
  baseUrl?: string; // Default: https://api.anthropic.com
}

export interface ClaudeUsageAnalytics {
  period: {
    start: string;
    end: string;
  };
  users: ClaudeUserUsage[];
  aggregates: ClaudeUsageAggregates;
}

export interface ClaudeUserUsage {
  user_id: string;
  user_email: string;
  total_conversations: number;
  total_messages: number;
  total_tokens: {
    input: number;
    output: number;
  };
  active_days: number;
  last_activity: string;
}

export interface ClaudeUsageAggregates {
  total_users: number;
  active_users: number;
  total_conversations: number;
  total_messages: number;
  total_tokens: {
    input: number;
    output: number;
  };
  average_messages_per_user: number;
}
```

**File**: `shared-types/src/platforms/gemini-workspace.ts`

```typescript
/**
 * Google Gemini Workspace Reporting API Types
 * Based on: Google Admin SDK Reports API - Gemini Activities (2025)
 */

export interface GeminiAuditEvent {
  kind: 'admin#reports#activity';
  id: {
    time: string; // RFC 3339 timestamp
    uniqueQualifier: string;
    applicationName: 'gemini';
    customerId: string;
  };
  actor: GeminiActor;
  ownerDomain?: string;
  ipAddress?: string;
  events: GeminiEvent[];
}

export interface GeminiActor {
  email: string;
  profileId: string;
  callerType: 'USER' | 'APPLICATION' | 'SERVICE_ACCOUNT';
}

export interface GeminiEvent {
  type: 'gemini_activity';
  name: GeminiEventName;
  parameters: GeminiEventParameter[];
}

export type GeminiEventName =
  | 'gemini_used'
  | 'help_me_write'
  | 'help_me_organize'
  | 'summarize'
  | 'generate_image'
  | 'analyze_data'
  | 'code_generation'
  | 'remove_background'
  | 'create_presentation'
  | 'smart_reply';

export interface GeminiEventParameter {
  name: string;
  value?: string;
  intValue?: string;
  boolValue?: boolean;
  multiValue?: string[];
  messageValue?: {
    parameter: GeminiEventParameter[];
  };
}

export interface GeminiActivityDetails {
  application: GeminiApplication;
  feature: string;
  action: string;
  timestamp: Date;
  userId: string;
  userEmail: string;
}

export type GeminiApplication =
  | 'gmail'
  | 'docs'
  | 'sheets'
  | 'slides'
  | 'drive'
  | 'meet'
  | 'gemini_app';

export interface GeminiReportingAPIQuery {
  userKey: 'all' | string; // 'all' or specific user email
  applicationName: 'gemini';
  startTime: string; // RFC 3339
  endTime?: string;   // RFC 3339
  maxResults?: number; // Max 1000
  pageToken?: string;
  filters?: string; // Event filter expression
  eventName?: GeminiEventName;
}

export interface GeminiReportingAPIResponse {
  kind: 'admin#reports#activities';
  etag: string;
  nextPageToken?: string;
  items: GeminiAuditEvent[];
}

export interface GeminiUsageMetrics {
  period: {
    start: Date;
    end: Date;
  };
  totalUsers: number;
  activeUsers: number;
  usageByApplication: {
    [key in GeminiApplication]: {
      totalActions: number;
      uniqueUsers: number;
      topFeatures: {
        feature: string;
        count: number;
      }[];
    };
  };
  topUsers: {
    email: string;
    totalActions: number;
    applications: GeminiApplication[];
  }[];
}
```

#### 3. GPT-5 Analysis Types

**File**: `shared-types/src/ai-analysis/gpt5-analysis.ts`

```typescript
/**
 * GPT-5 Intelligent Analysis Service Types
 */

export interface GPT5AnalysisRequest {
  requestId: string;
  timestamp: Date;
  context: AnalysisContext;
  events: AIplatformAuditLog[];
  options: GPT5AnalysisOptions;
}

export interface AnalysisContext {
  organizationId: string;
  userId?: string; // If analyzing specific user
  userProfile?: UserBehaviorProfile;
  organizationPolicies?: OrganizationPolicies;
  historicalBaseline?: BehaviorBaseline;
  timeWindow: {
    start: Date;
    end: Date;
  };
}

export interface UserBehaviorProfile {
  userId: string;
  email: string;
  department?: string;
  role?: string;
  seniority?: string;
  normalWorkHours?: {
    timezone: string;
    startHour: number; // 0-23
    endHour: number;   // 0-23
  };
  typicalAIUsage?: {
    averageConversationsPerDay: number;
    preferredModels: string[];
    commonUseCase: string[];
  };
}

export interface OrganizationPolicies {
  allowedAIPlatforms: ('chatgpt' | 'claude' | 'gemini')[];
  dataClassificationRules: DataClassificationRule[];
  complianceFrameworks: ('GDPR' | 'SOX' | 'HIPAA' | 'PCI' | 'SOC2')[];
  approvedUseCases: string[];
  bannedUseCases: string[];
}

export interface DataClassificationRule {
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  keywords: string[];
  patterns: string[]; // Regex patterns
  actions: ('block' | 'alert' | 'log')[];
}

export interface BehaviorBaseline {
  computed_at: Date;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    averageDailyLogins: number;
    peakUsageHours: number[];
    typicalSessionDuration: number; // minutes
    averageMessagesPerSession: number;
  };
  anomalyThresholds: {
    loginFrequency: number; // Z-score threshold
    sessionDuration: number;
    messageVolume: number;
  };
}

export interface GPT5AnalysisOptions {
  analysisType: ('risk_assessment' | 'content_analysis' | 'pattern_detection' | 'compliance_check')[];
  includeRecommendations: boolean;
  detailLevel: 'summary' | 'detailed' | 'comprehensive';
  prioritizeAlerts: boolean;
  contextualInsights: boolean;
}

export interface GPT5AnalysisResponse {
  requestId: string;
  analyzedAt: Date;
  processingTime: number; // milliseconds
  results: AnalysisResult;
  summary: AnalysisSummary;
  alerts: Alert[];
  insights: ContextualInsight[];
  recommendations: Recommendation[];
  metadata: AnalysisMetadata;
}

export interface AnalysisResult {
  overallRiskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-100
  categories: {
    dataExfiltration: CategoryAnalysis;
    policyViolation: CategoryAnalysis;
    anomalousActivity: CategoryAnalysis;
    sensitiveContent: CategoryAnalysis;
    complianceRisk: CategoryAnalysis;
  };
}

export interface CategoryAnalysis {
  score: number; // 0-100
  detected: boolean;
  confidence: number;
  evidence: string[];
  affectedEvents: string[]; // Event IDs
}

export interface AnalysisSummary {
  totalEventsAnalyzed: number;
  timeSpanCovered: {
    start: Date;
    end: Date;
  };
  platformBreakdown: {
    chatgpt: number;
    claude: number;
    gemini: number;
  };
  keyFindings: string[];
  criticalIssues: number;
  highPriorityIssues: number;
}

export interface Alert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  category: 'security' | 'compliance' | 'policy' | 'anomaly';
  affectedEvents: string[];
  affectedUsers: string[];
  detectedAt: Date;
  requiresAction: boolean;
  suggestedActions: string[];
  relatedAlerts?: string[]; // IDs of related alerts
}

export interface ContextualInsight {
  type: 'pattern' | 'correlation' | 'trend' | 'anomaly' | 'comparison';
  title: string;
  description: string;
  significance: 'low' | 'medium' | 'high';
  evidence: string[];
  visualization?: {
    type: 'chart' | 'graph' | 'heatmap' | 'timeline';
    data: any; // Chart.js compatible data structure
  };
}

export interface Recommendation {
  id: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'immediate_action' | 'policy_update' | 'monitoring' | 'training' | 'technical';
  title: string;
  description: string;
  rationale: string;
  estimatedImpact: 'low' | 'medium' | 'high';
  implementationComplexity: 'low' | 'medium' | 'high';
  steps: string[];
  relatedAlerts?: string[];
}

export interface AnalysisMetadata {
  modelUsed: string; // e.g., "gpt-5-turbo"
  tokensUsed: {
    input: number;
    output: number;
  };
  costEstimate?: number; // USD
  analysisVersion: string;
  correlationIds: string[]; // For tracking related analyses
}

export interface GPT5PromptTemplate {
  name: string;
  version: string;
  systemPrompt: string;
  userPromptTemplate: string;
  variables: string[];
  examples?: {
    input: any;
    output: any;
  }[];
}
```

#### 4. Integration Types

**File**: `shared-types/src/connectors/ai-platform-connector.ts`

```typescript
import { PlatformConnector } from './platform-connector';
import { AIplatformAuditLog } from '../platforms/ai-platforms';

/**
 * Extended Platform Connector for AI Platforms
 */
export interface AIPlatformConnector extends PlatformConnector {
  /**
   * Get audit logs specific to AI platform usage
   */
  getAIAuditLogs(query: AIAuditLogQuery): Promise<AIAuditLogResult>;

  /**
   * Get usage analytics/metrics
   */
  getUsageAnalytics(period: DateRange): Promise<UsageAnalytics>;

  /**
   * Validate API credentials and permissions
   */
  validateAICredentials(): Promise<AICredentialValidation>;
}

export interface AIAuditLogQuery {
  startDate: Date;
  endDate: Date;
  userIds?: string[];
  eventTypes?: string[];
  limit?: number;
  cursor?: string; // For pagination
}

export interface AIAuditLogResult {
  logs: AIplatformAuditLog[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
  metadata: {
    queryTime: number; // milliseconds
    platform: 'chatgpt' | 'claude' | 'gemini';
  };
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface UsageAnalytics {
  platform: 'chatgpt' | 'claude' | 'gemini';
  period: DateRange;
  totalUsers: number;
  activeUsers: number;
  totalEvents: number;
  topUsers: {
    userId: string;
    email: string;
    eventCount: number;
  }[];
  eventsByType: {
    [eventType: string]: number;
  };
  dailyBreakdown: {
    date: string;
    activeUsers: number;
    totalEvents: number;
  }[];
}

export interface AICredentialValidation {
  isValid: boolean;
  platform: 'chatgpt' | 'claude' | 'gemini';
  hasRequiredPermissions: boolean;
  missingPermissions: string[];
  expiresAt?: Date;
  lastChecked: Date;
  errors?: string[];
}
```

### Testing Specifications for Phase 0

**File**: `shared-types/src/__tests__/ai-platforms.test.ts`

```typescript
import { AIplatformAuditLog, AIActivityType } from '../platforms/ai-platforms';
import { ChatGPTAuditLogEntry } from '../platforms/chatgpt-enterprise';
import { ClaudeAuditLogEntry } from '../platforms/claude-enterprise';
import { GeminiAuditEvent } from '../platforms/gemini-workspace';

describe('AI Platform Type Definitions', () => {
  describe('AIplatformAuditLog', () => {
    it('should accept valid audit log entries', () => {
      const validLog: AIplatformAuditLog = {
        id: 'log-123',
        platform: 'chatgpt',
        timestamp: new Date(),
        userId: 'user-456',
        userEmail: 'user@example.com',
        organizationId: 'org-789',
        activityType: 'conversation',
        action: 'message_sent',
        metadata: {
          conversationId: 'conv-001',
          messageCount: 5,
          tokensUsed: 1500,
          model: 'gpt-4'
        },
        riskIndicators: []
      };

      expect(validLog.platform).toBe('chatgpt');
    });

    it('should enforce platform type constraints', () => {
      const platforms: Array<'chatgpt' | 'claude' | 'gemini'> = [
        'chatgpt',
        'claude',
        'gemini'
      ];

      platforms.forEach(platform => {
        const log: AIplatformAuditLog = {
          id: 'test',
          platform,
          timestamp: new Date(),
          userId: 'user',
          userEmail: 'test@example.com',
          organizationId: 'org',
          activityType: 'login',
          action: 'user_login',
          metadata: {},
          riskIndicators: []
        };

        expect(log.platform).toBe(platform);
      });
    });
  });

  describe('ChatGPT Enterprise Types', () => {
    it('should structure ChatGPT audit log entries correctly', () => {
      const entry: ChatGPTAuditLogEntry = {
        id: 'evt_123',
        type: 'user.login',
        effective_at: Date.now() / 1000,
        actor: {
          type: 'user',
          user: {
            id: 'user-123',
            email: 'user@company.com'
          }
        }
      };

      expect(entry.type).toBe('user.login');
    });
  });

  describe('Claude Enterprise Types', () => {
    it('should structure Claude audit log entries correctly', () => {
      const entry: ClaudeAuditLogEntry = {
        id: 'audit-456',
        timestamp: new Date().toISOString(),
        organization_id: 'org-789',
        user_id: 'user-123',
        user_email: 'user@company.com',
        event_type: 'message.sent',
        event_data: {
          conversation_id: 'conv-001',
          model: 'claude-3-opus',
          tokens: {
            input: 500,
            output: 1000
          }
        },
        metadata: {
          ip_address: '192.168.1.1'
        }
      };

      expect(entry.event_type).toBe('message.sent');
    });
  });

  describe('Gemini Workspace Types', () => {
    it('should structure Gemini audit events correctly', () => {
      const event: GeminiAuditEvent = {
        kind: 'admin#reports#activity',
        id: {
          time: new Date().toISOString(),
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

      expect(event.id.applicationName).toBe('gemini');
    });
  });
});
```

### Phase 0 Deliverables Checklist

- [ ] Create `shared-types/src/platforms/ai-platforms.ts`
- [ ] Create `shared-types/src/platforms/chatgpt-enterprise.ts`
- [ ] Create `shared-types/src/platforms/claude-enterprise.ts`
- [ ] Create `shared-types/src/platforms/gemini-workspace.ts`
- [ ] Create `shared-types/src/ai-analysis/gpt5-analysis.ts`
- [ ] Create `shared-types/src/connectors/ai-platform-connector.ts`
- [ ] Write comprehensive type tests
- [ ] Build shared-types package (`npm run build`)
- [ ] Validate TypeScript compilation with 0 errors
- [ ] Export all types from `shared-types/src/index.ts`

---

## Git Worktree Strategy

### Overview

Git worktrees allow multiple working directories from a single repository, enabling parallel development of independent features without branch switching.

### Worktree Structure

```
saas-xray/                          # Main worktree (main branch)
├── .git/
├── backend/
├── frontend/
└── shared-types/

../saas-xray-worktrees/
├── phase-1-gemini/                 # Worktree for Gemini integration
│   ├── backend/
│   └── shared-types/ (symlink or reference)
├── phase-2-chatgpt/                # Worktree for ChatGPT connector
│   ├── backend/
│   └── shared-types/ (symlink or reference)
├── phase-3-claude/                 # Worktree for Claude connector
│   ├── backend/
│   └── shared-types/ (symlink or reference)
└── phase-4-gpt5/                   # Worktree for GPT-5 analysis
    ├── backend/
    └── shared-types/ (symlink or reference)
```

### Branching Model

```
main
 ├─ feature/ai-detection-shared-types (Phase 0 - merged first)
 ├─ feature/gemini-reporting-api      (Phase 1)
 ├─ feature/chatgpt-enterprise        (Phase 2)
 ├─ feature/claude-enterprise         (Phase 3)
 └─ feature/gpt5-analysis             (Phase 4)
```

### Worktree Setup Commands

```bash
# Navigate to project root
cd /Users/darrenmorgan/AI_Projects/saas-xray

# Create worktree directory
mkdir -p ../saas-xray-worktrees

# Phase 1: Gemini
git worktree add ../saas-xray-worktrees/phase-1-gemini -b feature/gemini-reporting-api

# Phase 2: ChatGPT
git worktree add ../saas-xray-worktrees/phase-2-chatgpt -b feature/chatgpt-enterprise

# Phase 3: Claude
git worktree add ../saas-xray-worktrees/phase-3-claude -b feature/claude-enterprise

# Phase 4: GPT-5
git worktree add ../saas-xray-worktrees/phase-4-gpt5 -b feature/gpt5-analysis

# List all worktrees
git worktree list
```

### Shared-Types Dependency Management

**Critical**: All worktrees must reference the SAME compiled `shared-types` package.

**Option 1: Workspace Symlink** (Recommended)
```bash
# In each worktree, after creation
cd ../saas-xray-worktrees/phase-1-gemini
npm install
cd shared-types
npm link

cd ../backend
npm link @saas-xray/shared-types

# Repeat for each worktree
```

**Option 2: npm Workspace Reference**
```json
// Each worktree's package.json
{
  "dependencies": {
    "@saas-xray/shared-types": "file:../../saas-xray/shared-types"
  }
}
```

### Merge Strategy

```bash
# Merge order (sequential, after each phase completes)

# 1. Merge shared-types
git checkout main
git merge feature/ai-detection-shared-types
npm run build  # Rebuild shared-types

# 2. Merge Phase 1 (Gemini)
git merge feature/gemini-reporting-api
npm test

# 3. Merge Phase 2 (ChatGPT)
git merge feature/chatgpt-enterprise
npm test

# 4. Merge Phase 3 (Claude)
git merge feature/claude-enterprise
npm test

# 5. Merge Phase 4 (GPT-5)
git merge feature/gpt5-analysis
npm test

# 6. Final integration test
npm run test:e2e
```

---

## Phase Implementations

### Phase 1: Gemini Reporting API Integration

**Branch**: `feature/gemini-reporting-api`
**Worktree**: `../saas-xray-worktrees/phase-1-gemini`
**Duration**: 2 weeks
**Dependencies**: Phase 0 (shared-types)

#### Objectives

1. Extend existing `GoogleConnector` with Gemini-specific audit log collection
2. Normalize Gemini events into `AIplatformAuditLog` format
3. Implement real-time Gemini usage tracking
4. Create dashboard visualization for Gemini activity

#### Test-Driven Development Steps

##### 1. Write Tests First

**File**: `backend/src/connectors/__tests__/google-gemini-extension.test.ts`

```typescript
import { GoogleConnector } from '../google';
import { GeminiAuditEvent } from '@saas-xray/shared-types';

describe('GoogleConnector - Gemini Extension', () => {
  let connector: GoogleConnector;

  beforeEach(() => {
    connector = new GoogleConnector();
  });

  describe('getGeminiAuditLogs', () => {
    it('should fetch Gemini audit logs via Admin SDK', async () => {
      // Arrange
      const mockCredentials = {
        accessToken: 'mock-token',
        refreshToken: 'mock-refresh',
        expiresAt: new Date(Date.now() + 3600000),
        scope: ['https://www.googleapis.com/auth/admin.reports.audit.readonly']
      };

      await connector.authenticate(mockCredentials);

      // Act
      const result = await connector.getGeminiAuditLogs({
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        eventTypes: ['gemini_used', 'help_me_write']
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.logs).toBeInstanceOf(Array);
      expect(result.platform).toBe('gemini');
    });

    it('should normalize Gemini events to AIplatformAuditLog format', async () => {
      // Test normalization logic
    });

    it('should handle pagination correctly', async () => {
      // Test cursor-based pagination
    });

    it('should filter by event types', async () => {
      // Test event type filtering
    });
  });

  describe('getGeminiUsageMetrics', () => {
    it('should aggregate usage by application', async () => {
      // Test usage aggregation
    });

    it('should identify top users', async () => {
      // Test top user identification
    });
  });
});
```

##### 2. Implement Connector Extension

**File**: `backend/src/connectors/google-gemini-extension.ts`

```typescript
import { google } from 'googleapis';
import {
  GeminiAuditEvent,
  GeminiReportingAPIQuery,
  AIplatformAuditLog,
  AIAuditLogQuery,
  AIAuditLogResult
} from '@saas-xray/shared-types';

/**
 * Gemini-specific extension for GoogleConnector
 */
export class GeminiReportingAPI {
  private auth: any; // OAuth2Client

  constructor(auth: any) {
    this.auth = auth;
  }

  async getGeminiAuditLogs(query: AIAuditLogQuery): Promise<AIAuditLogResult> {
    const admin = google.admin({ version: 'reports_v1', auth: this.auth });

    const reportQuery: GeminiReportingAPIQuery = {
      userKey: 'all',
      applicationName: 'gemini',
      startTime: query.startDate.toISOString(),
      endTime: query.endDate.toISOString(),
      maxResults: query.limit || 1000,
      pageToken: query.cursor
    };

    const response = await admin.activities.list(reportQuery);

    const normalizedLogs = this.normalizeGeminiEvents(
      response.data.items || []
    );

    return {
      logs: normalizedLogs,
      totalCount: normalizedLogs.length,
      hasMore: !!response.data.nextPageToken,
      nextCursor: response.data.nextPageToken,
      metadata: {
        queryTime: Date.now(),
        platform: 'gemini'
      }
    };
  }

  private normalizeGeminiEvents(
    events: GeminiAuditEvent[]
  ): AIplatformAuditLog[] {
    return events.map(event => this.normalizeGeminiEvent(event));
  }

  private normalizeGeminiEvent(event: GeminiAuditEvent): AIplatformAuditLog {
    const primaryEvent = event.events[0];

    return {
      id: event.id.uniqueQualifier,
      platform: 'gemini',
      timestamp: new Date(event.id.time),
      userId: event.actor.profileId,
      userEmail: event.actor.email,
      organizationId: event.id.customerId,
      activityType: this.mapGeminiActivityType(primaryEvent.name),
      action: primaryEvent.name,
      metadata: {
        applicationContext: this.extractApplicationContext(primaryEvent.parameters),
        ...this.extractAdditionalMetadata(primaryEvent.parameters)
      },
      ipAddress: event.ipAddress,
      riskIndicators: this.assessGeminiRiskIndicators(event)
    };
  }

  private mapGeminiActivityType(eventName: string): AIActivityType {
    const mapping: { [key: string]: AIActivityType } = {
      'gemini_used': 'model_usage',
      'help_me_write': 'conversation',
      'help_me_organize': 'conversation',
      'summarize': 'conversation',
      'generate_image': 'conversation'
    };

    return mapping[eventName] || 'conversation';
  }

  private extractApplicationContext(
    parameters: any[]
  ): string | undefined {
    const appParam = parameters.find(p => p.name === 'application');
    return appParam?.value;
  }

  private extractAdditionalMetadata(parameters: any[]): any {
    const metadata: any = {};

    parameters.forEach(param => {
      if (param.name !== 'application') {
        metadata[param.name] = param.value || param.intValue || param.boolValue;
      }
    });

    return metadata;
  }

  private assessGeminiRiskIndicators(
    event: GeminiAuditEvent
  ): AIRiskIndicator[] {
    const indicators: AIRiskIndicator[] = [];

    // Check for off-hours activity
    const eventHour = new Date(event.id.time).getHours();
    if (eventHour < 6 || eventHour > 22) {
      indicators.push({
        type: 'unusual_activity',
        severity: 'medium',
        description: 'Gemini usage during off-hours',
        confidence: 75
      });
    }

    return indicators;
  }
}
```

##### 3. Integration Tests

**File**: `backend/src/__tests__/integration/gemini-reporting.integration.test.ts`

```typescript
describe('Gemini Reporting API Integration', () => {
  it('should fetch real Gemini audit logs with valid credentials', async () => {
    // Integration test with real Google Workspace account
  });
});
```

#### Phase 1 Deliverables

- [ ] `GeminiReportingAPI` class implementation
- [ ] Unit tests (100% coverage)
- [ ] Integration tests with mock Google API
- [ ] E2E tests with test Google Workspace account
- [ ] Dashboard widget for Gemini usage
- [ ] Documentation update

---

### Phase 2: ChatGPT Enterprise Connector

**Branch**: `feature/chatgpt-enterprise`
**Worktree**: `../saas-xray-worktrees/phase-2-chatgpt`
**Duration**: 2 weeks
**Dependencies**: Phase 0 (shared-types)

#### Objectives

1. Create new `ChatGPTEnterpriseConnector` implementing `AIPlatformConnector`
2. Integrate OpenAI Compliance API
3. Track ChatGPT user logins, conversations, and file uploads
4. Normalize to `AIplatformAuditLog` format

#### Test-Driven Development Steps

##### 1. Write Tests First

**File**: `backend/src/connectors/__tests__/chatgpt-enterprise.test.ts`

```typescript
import { ChatGPTEnterpriseConnector } from '../chatgpt-enterprise';
import { ChatGPTComplianceAPIConfig } from '@saas-xray/shared-types';

describe('ChatGPTEnterpriseConnector', () => {
  let connector: ChatGPTEnterpriseConnector;

  beforeEach(() => {
    const config: ChatGPTComplianceAPIConfig = {
      apiKey: process.env.OPENAI_TEST_API_KEY!,
      organizationId: process.env.OPENAI_TEST_ORG_ID!
    };

    connector = new ChatGPTEnterpriseConnector(config);
  });

  describe('authenticate', () => {
    it('should validate API key and organization access', async () => {
      const result = await connector.authenticate({
        accessToken: 'test-api-key',
        tokenType: 'bearer',
        scope: ['audit_logs.read']
      });

      expect(result.success).toBe(true);
    });
  });

  describe('getAIAuditLogs', () => {
    it('should fetch audit logs for specified date range', async () => {
      const result = await connector.getAIAuditLogs({
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31')
      });

      expect(result.logs).toBeDefined();
      expect(result.platform).toBe('chatgpt');
    });

    it('should filter by event types', async () => {
      const result = await connector.getAIAuditLogs({
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        eventTypes: ['user.login', 'conversation.created']
      });

      expect(result.logs.every(log =>
        ['user.login', 'conversation.created'].includes(log.action)
      )).toBe(true);
    });

    it('should handle pagination', async () => {
      // Test pagination logic
    });
  });

  describe('getUsageAnalytics', () => {
    it('should aggregate usage metrics', async () => {
      const analytics = await connector.getUsageAnalytics({
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31')
      });

      expect(analytics.totalUsers).toBeGreaterThan(0);
      expect(analytics.platform).toBe('chatgpt');
    });
  });
});
```

##### 2. Implement Connector

**File**: `backend/src/connectors/chatgpt-enterprise.ts`

```typescript
import {
  AIPlatformConnector,
  ChatGPTComplianceAPIConfig,
  ChatGPTAuditLogQuery,
  ChatGPTAuditLogResponse,
  AIplatformAuditLog,
  AIAuditLogQuery,
  AIAuditLogResult,
  OAuthCredentials,
  ConnectionResult
} from '@saas-xray/shared-types';

export class ChatGPTEnterpriseConnector implements AIPlatformConnector {
  platform: 'chatgpt' = 'chatgpt';
  private config: ChatGPTComplianceAPIConfig;
  private baseUrl: string;

  constructor(config: ChatGPTComplianceAPIConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  }

  async authenticate(credentials: OAuthCredentials): Promise<ConnectionResult> {
    try {
      // Validate API key by making a test request
      const response = await fetch(`${this.baseUrl}/organization/audit_logs`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
          'OpenAI-Organization': this.config.organizationId,
          'Content-Type': 'application/json'
        },
        // Test with minimal query
        body: JSON.stringify({ limit: 1 })
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`);
      }

      return {
        success: true,
        platformUserId: this.config.organizationId,
        platformWorkspaceId: this.config.organizationId,
        displayName: `ChatGPT Enterprise - ${this.config.organizationId}`,
        permissions: ['audit_logs.read']
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'CHATGPT_AUTH_ERROR'
      };
    }
  }

  async getAIAuditLogs(query: AIAuditLogQuery): Promise<AIAuditLogResult> {
    const chatgptQuery: ChatGPTAuditLogQuery = {
      effective_at: {
        gte: Math.floor(query.startDate.getTime() / 1000),
        lte: Math.floor(query.endDate.getTime() / 1000)
      },
      limit: query.limit || 100,
      after: query.cursor
    };

    if (query.eventTypes) {
      chatgptQuery.event_types = query.eventTypes as any;
    }

    const response = await this.fetchAuditLogs(chatgptQuery);
    const normalizedLogs = this.normalizeAuditLogs(response.data);

    return {
      logs: normalizedLogs,
      totalCount: response.data.length,
      hasMore: response.has_more,
      nextCursor: response.last_id,
      metadata: {
        queryTime: Date.now(),
        platform: 'chatgpt'
      }
    };
  }

  private async fetchAuditLogs(
    query: ChatGPTAuditLogQuery
  ): Promise<ChatGPTAuditLogResponse> {
    const response = await fetch(`${this.baseUrl}/organization/audit_logs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'OpenAI-Organization': this.config.organizationId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(query)
    });

    if (!response.ok) {
      throw new Error(`ChatGPT API error: ${response.statusText}`);
    }

    return response.json();
  }

  private normalizeAuditLogs(
    entries: ChatGPTAuditLogEntry[]
  ): AIplatformAuditLog[] {
    return entries.map(entry => this.normalizeEntry(entry));
  }

  private normalizeEntry(
    entry: ChatGPTAuditLogEntry
  ): AIplatformAuditLog {
    return {
      id: entry.id,
      platform: 'chatgpt',
      timestamp: new Date(entry.effective_at * 1000),
      userId: entry.actor.user?.id || 'unknown',
      userEmail: entry.actor.user?.email || 'unknown',
      organizationId: entry.organization?.id || this.config.organizationId,
      activityType: this.mapActivityType(entry.type),
      action: entry.type,
      metadata: {
        conversationId: entry.type.startsWith('conversation.')
          ? entry.id
          : undefined,
        ...this.extractMetadata(entry)
      },
      ipAddress: entry.actor.session?.ip_address,
      userAgent: entry.actor.session?.user_agent,
      riskIndicators: this.assessRiskIndicators(entry)
    };
  }

  private mapActivityType(eventType: ChatGPTEventType): AIActivityType {
    const mapping: { [key: string]: AIActivityType } = {
      'user.login': 'login',
      'conversation.created': 'conversation',
      'conversation.message': 'conversation',
      'file.uploaded': 'file_upload',
      'file.downloaded': 'file_download',
      'gpt.created': 'integration_created'
    };

    return mapping[eventType] || 'conversation';
  }

  private extractMetadata(entry: ChatGPTAuditLogEntry): any {
    return {
      projectId: entry.project?.id,
      projectName: entry.project?.name,
      apiKeyType: entry.api_key?.type
    };
  }

  private assessRiskIndicators(
    entry: ChatGPTAuditLogEntry
  ): AIRiskIndicator[] {
    const indicators: AIRiskIndicator[] = [];

    // File upload detection
    if (entry.type === 'file.uploaded') {
      indicators.push({
        type: 'sensitive_data',
        severity: 'medium',
        description: 'File uploaded to ChatGPT',
        confidence: 80
      });
    }

    return indicators;
  }

  async getUsageAnalytics(period: DateRange): Promise<UsageAnalytics> {
    // Implementation for usage analytics aggregation
    const logs = await this.getAIAuditLogs({
      startDate: period.start,
      endDate: period.end
    });

    return this.aggregateUsageMetrics(logs.logs, period);
  }

  private aggregateUsageMetrics(
    logs: AIplatformAuditLog[],
    period: DateRange
  ): UsageAnalytics {
    const userActivity = new Map<string, number>();
    const eventCounts = new Map<string, number>();

    logs.forEach(log => {
      // Count per user
      const currentCount = userActivity.get(log.userEmail) || 0;
      userActivity.set(log.userEmail, currentCount + 1);

      // Count per event type
      const eventCount = eventCounts.get(log.action) || 0;
      eventCounts.set(log.action, eventCount + 1);
    });

    const topUsers = Array.from(userActivity.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([email, count]) => ({
        userId: email,
        email,
        eventCount: count
      }));

    return {
      platform: 'chatgpt',
      period,
      totalUsers: userActivity.size,
      activeUsers: userActivity.size,
      totalEvents: logs.length,
      topUsers,
      eventsByType: Object.fromEntries(eventCounts),
      dailyBreakdown: this.calculateDailyBreakdown(logs, period)
    };
  }

  private calculateDailyBreakdown(
    logs: AIplatformAuditLog[],
    period: DateRange
  ): any[] {
    // Daily aggregation logic
    return [];
  }

  async validateAICredentials(): Promise<AICredentialValidation> {
    try {
      await this.fetchAuditLogs({ limit: 1 });

      return {
        isValid: true,
        platform: 'chatgpt',
        hasRequiredPermissions: true,
        missingPermissions: [],
        lastChecked: new Date()
      };
    } catch (error) {
      return {
        isValid: false,
        platform: 'chatgpt',
        hasRequiredPermissions: false,
        missingPermissions: ['audit_logs.read'],
        lastChecked: new Date(),
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  // Other required PlatformConnector methods
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

  async refreshToken(refreshToken: string): Promise<OAuthCredentials | null> {
    return null;
  }
}
```

#### Phase 2 Deliverables

- [ ] `ChatGPTEnterpriseConnector` implementation
- [ ] Unit tests (100% coverage)
- [ ] Integration tests with OpenAI API
- [ ] E2E tests with test organization
- [ ] Dashboard integration
- [ ] Documentation

---

### Phase 3: Claude Enterprise Connector

**Branch**: `feature/claude-enterprise`
**Worktree**: `../saas-xray-worktrees/phase-3-claude`
**Duration**: 2 weeks
**Dependencies**: Phase 0 (shared-types)

#### Implementation

Similar structure to Phase 2, but for Claude Enterprise API.

**Key Differences**:
- Claude uses export-based audit log retrieval (not real-time streaming)
- 180-day retention limit
- Requires Enterprise plan ownership role

#### Phase 3 Deliverables

- [ ] `ClaudeEnterpriseConnector` implementation
- [ ] Unit tests (100% coverage)
- [ ] Integration tests
- [ ] E2E tests
- [ ] Dashboard integration
- [ ] Documentation

---

### Phase 4: GPT-5 Analysis Service

**Branch**: `feature/gpt5-analysis`
**Worktree**: `../saas-xray-worktrees/phase-4-gpt5`
**Duration**: 3 weeks
**Dependencies**: Phase 0 (shared-types), Phases 1-3 (optional but enhanced with data)

#### Objectives

1. Create `GPT5AnalysisService` for intelligent filtering
2. Design prompt templates for different analysis types
3. Implement risk scoring with GPT-5 context
4. Build cross-platform correlation engine
5. Create natural language insight generation

#### Test-Driven Development Steps

##### 1. Write Tests First

**File**: `backend/src/services/__tests__/gpt5-analysis.test.ts`

```typescript
import { GPT5AnalysisService } from '../gpt5-analysis.service';
import { GPT5AnalysisRequest } from '@saas-xray/shared-types';

describe('GPT5AnalysisService', () => {
  let service: GPT5AnalysisService;

  beforeEach(() => {
    service = new GPT5AnalysisService({
      apiKey: process.env.OPENAI_GPT5_API_KEY!,
      model: 'gpt-5-turbo'
    });
  });

  describe('analyzeEvents', () => {
    it('should analyze AI platform events and return risk assessment', async () => {
      const request: GPT5AnalysisRequest = {
        requestId: 'test-123',
        timestamp: new Date(),
        context: {
          organizationId: 'org-456',
          timeWindow: {
            start: new Date('2025-01-01'),
            end: new Date('2025-01-31')
          }
        },
        events: [
          // Sample events
        ],
        options: {
          analysisType: ['risk_assessment', 'content_analysis'],
          includeRecommendations: true,
          detailLevel: 'comprehensive',
          prioritizeAlerts: true,
          contextualInsights: true
        }
      };

      const result = await service.analyzeEvents(request);

      expect(result.results.overallRiskScore).toBeGreaterThanOrEqual(0);
      expect(result.results.overallRiskScore).toBeLessThanOrEqual(100);
      expect(result.alerts).toBeInstanceOf(Array);
      expect(result.insights).toBeInstanceOf(Array);
    });

    it('should detect sensitive data exposure', async () => {
      // Test sensitive data detection
    });

    it('should identify policy violations', async () => {
      // Test policy violation detection
    });

    it('should generate actionable recommendations', async () => {
      // Test recommendation generation
    });
  });

  describe('crossPlatformCorrelation', () => {
    it('should correlate events across ChatGPT, Claude, and Gemini', async () => {
      // Test cross-platform correlation
    });
  });
});
```

##### 2. Implement Service

**File**: `backend/src/services/gpt5-analysis.service.ts`

```typescript
import OpenAI from 'openai';
import {
  GPT5AnalysisRequest,
  GPT5AnalysisResponse,
  GPT5PromptTemplate,
  Alert,
  ContextualInsight,
  Recommendation
} from '@saas-xray/shared-types';

export class GPT5AnalysisService {
  private openai: OpenAI;
  private model: string;

  constructor(config: { apiKey: string; model: string }) {
    this.openai = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model;
  }

  async analyzeEvents(
    request: GPT5AnalysisRequest
  ): Promise<GPT5AnalysisResponse> {
    const startTime = Date.now();

    // Run parallel analyses
    const [
      riskAssessment,
      contentAnalysis,
      patternDetection,
      complianceCheck
    ] = await Promise.all([
      this.performRiskAssessment(request),
      this.performContentAnalysis(request),
      this.performPatternDetection(request),
      this.performComplianceCheck(request)
    ]);

    // Synthesize results
    const synthesizedResults = this.synthesizeAnalyses({
      riskAssessment,
      contentAnalysis,
      patternDetection,
      complianceCheck
    });

    // Generate alerts
    const alerts = this.generateAlerts(synthesizedResults, request);

    // Generate insights
    const insights = await this.generateInsights(synthesizedResults, request);

    // Generate recommendations
    const recommendations = await this.generateRecommendations(
      alerts,
      insights,
      request
    );

    return {
      requestId: request.requestId,
      analyzedAt: new Date(),
      processingTime: Date.now() - startTime,
      results: synthesizedResults,
      summary: this.generateSummary(request, synthesizedResults),
      alerts,
      insights,
      recommendations,
      metadata: {
        modelUsed: this.model,
        tokensUsed: { input: 0, output: 0 }, // Track actual usage
        analysisVersion: '1.0.0',
        correlationIds: [request.requestId]
      }
    };
  }

  private async performRiskAssessment(
    request: GPT5AnalysisRequest
  ): Promise<any> {
    const prompt = this.buildRiskAssessmentPrompt(request);

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: this.getRiskAssessmentSystemPrompt()
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3 // Lower temperature for more consistent analysis
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  private getRiskAssessmentSystemPrompt(): string {
    return `You are an enterprise security analyst specializing in AI platform risk assessment.

Your task is to analyze user activity across ChatGPT, Claude, and Gemini to identify:
1. Data exfiltration risks
2. Policy violations
3. Anomalous behavior patterns
4. Sensitive content exposure
5. Compliance risks

Provide structured JSON output with risk scores (0-100) and confidence levels.`;
  }

  private buildRiskAssessmentPrompt(request: GPT5AnalysisRequest): string {
    return `Analyze the following AI platform usage events:

ORGANIZATION CONTEXT:
${JSON.stringify(request.context, null, 2)}

EVENTS TO ANALYZE:
${JSON.stringify(request.events, null, 2)}

Provide a comprehensive risk assessment in the following JSON format:
{
  "overallRiskScore": <0-100>,
  "riskLevel": "low|medium|high|critical",
  "confidence": <0-100>,
  "categories": {
    "dataExfiltration": {
      "score": <0-100>,
      "detected": <boolean>,
      "confidence": <0-100>,
      "evidence": [<strings>],
      "affectedEvents": [<event IDs>]
    },
    ... (repeat for other categories)
  }
}`;
  }

  private async performContentAnalysis(
    request: GPT5AnalysisRequest
  ): Promise<any> {
    // Similar implementation for content analysis
    return {};
  }

  private async performPatternDetection(
    request: GPT5AnalysisRequest
  ): Promise<any> {
    // Pattern detection implementation
    return {};
  }

  private async performComplianceCheck(
    request: GPT5AnalysisRequest
  ): Promise<any> {
    // Compliance checking implementation
    return {};
  }

  private synthesizeAnalyses(analyses: any): AnalysisResult {
    // Combine multiple analysis results into unified assessment
    return {
      overallRiskScore: 0,
      riskLevel: 'low',
      confidence: 0,
      categories: {
        dataExfiltration: {
          score: 0,
          detected: false,
          confidence: 0,
          evidence: [],
          affectedEvents: []
        },
        policyViolation: {
          score: 0,
          detected: false,
          confidence: 0,
          evidence: [],
          affectedEvents: []
        },
        anomalousActivity: {
          score: 0,
          detected: false,
          confidence: 0,
          evidence: [],
          affectedEvents: []
        },
        sensitiveContent: {
          score: 0,
          detected: false,
          confidence: 0,
          evidence: [],
          affectedEvents: []
        },
        complianceRisk: {
          score: 0,
          detected: false,
          confidence: 0,
          evidence: [],
          affectedEvents: []
        }
      }
    };
  }

  private generateAlerts(
    results: AnalysisResult,
    request: GPT5AnalysisRequest
  ): Alert[] {
    const alerts: Alert[] = [];

    // Generate alerts based on detected risks
    Object.entries(results.categories).forEach(([category, analysis]) => {
      if (analysis.detected && analysis.confidence > 70) {
        alerts.push({
          id: `alert-${category}-${Date.now()}`,
          severity: this.mapScoreToSeverity(analysis.score),
          title: `${category} detected`,
          description: analysis.evidence.join('; '),
          category: 'security',
          affectedEvents: analysis.affectedEvents,
          affectedUsers: [], // Extract from events
          detectedAt: new Date(),
          requiresAction: analysis.score > 70,
          suggestedActions: this.getSuggestedActions(category)
        });
      }
    });

    return alerts;
  }

  private async generateInsights(
    results: AnalysisResult,
    request: GPT5AnalysisRequest
  ): Promise<ContextualInsight[]> {
    // Use GPT-5 to generate human-readable insights
    const prompt = `Based on this risk analysis:
${JSON.stringify(results, null, 2)}

Generate 3-5 key contextual insights that would be valuable for a CISO.`;

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: 'You are a security analyst.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content || '{}').insights || [];
  }

  private async generateRecommendations(
    alerts: Alert[],
    insights: ContextualInsight[],
    request: GPT5AnalysisRequest
  ): Promise<Recommendation[]> {
    // Generate actionable recommendations
    return [];
  }

  private generateSummary(
    request: GPT5AnalysisRequest,
    results: AnalysisResult
  ): AnalysisSummary {
    const platformCounts = {
      chatgpt: 0,
      claude: 0,
      gemini: 0
    };

    request.events.forEach(event => {
      platformCounts[event.platform]++;
    });

    return {
      totalEventsAnalyzed: request.events.length,
      timeSpanCovered: request.context.timeWindow,
      platformBreakdown: platformCounts,
      keyFindings: [], // Extract from analysis
      criticalIssues: 0,
      highPriorityIssues: 0
    };
  }

  private mapScoreToSeverity(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score < 30) return 'low';
    if (score < 60) return 'medium';
    if (score < 90) return 'high';
    return 'critical';
  }

  private getSuggestedActions(category: string): string[] {
    // Category-specific action recommendations
    return [];
  }
}
```

#### Phase 4 Deliverables

- [ ] `GPT5AnalysisService` implementation
- [ ] Prompt template library
- [ ] Unit tests (100% coverage)
- [ ] Integration tests with OpenAI GPT-5
- [ ] Cost optimization (caching, batching)
- [ ] Dashboard integration
- [ ] Documentation

---

## Testing Strategy

### Test Pyramid

```
         ┌─────────────┐
         │  E2E Tests  │  ← 10% (Full platform integration)
         └─────────────┘
       ┌───────────────────┐
       │ Integration Tests │  ← 30% (API + Database)
       └───────────────────┘
   ┌─────────────────────────┐
   │      Unit Tests         │  ← 60% (Pure functions, components)
   └─────────────────────────┘
```

### Testing Standards

1. **Unit Tests**: Jest + TypeScript
   - 100% coverage for pure functions
   - Mock external dependencies
   - Test edge cases and error paths

2. **Integration Tests**: Jest + Real APIs (test credentials)
   - Test actual API interactions
   - Validate data normalization
   - Test error handling

3. **E2E Tests**: Playwright
   - Full OAuth flows
   - Dashboard interactions
   - Alert generation

### Test Execution

```bash
# Run all tests
npm test

# Run tests for specific phase
npm test -- --testPathPattern=gemini
npm test -- --testPathPattern=chatgpt
npm test -- --testPathPattern=claude
npm test -- --testPathPattern=gpt5

# Run tests with coverage
npm test -- --coverage

# Run E2E tests
npm run test:e2e
```

---

## Conductor Integration

### Conductor Configuration

**File**: `.conductor/ai-platform-detection.yaml`

```yaml
project:
  name: AI Platform Detection
  version: 1.0.0

phases:
  - id: phase-0
    name: Shared Types Foundation
    worktree: main
    branch: feature/ai-detection-shared-types
    dependencies: []
    tasks:
      - name: Create AI platform types
        command: npm run create-types
      - name: Build shared-types package
        command: cd shared-types && npm run build
      - name: Validate TypeScript compilation
        command: npm run type-check

  - id: phase-1
    name: Gemini Reporting API
    worktree: ../saas-xray-worktrees/phase-1-gemini
    branch: feature/gemini-reporting-api
    dependencies: [phase-0]
    tasks:
      - name: Write Gemini tests
        command: npm run test:write -- gemini
      - name: Implement Gemini connector
        command: npm run dev:gemini
      - name: Run Gemini tests
        command: npm test -- gemini

  - id: phase-2
    name: ChatGPT Enterprise Connector
    worktree: ../saas-xray-worktrees/phase-2-chatgpt
    branch: feature/chatgpt-enterprise
    dependencies: [phase-0]
    parallel: phase-1
    tasks:
      - name: Write ChatGPT tests
        command: npm run test:write -- chatgpt
      - name: Implement ChatGPT connector
        command: npm run dev:chatgpt
      - name: Run ChatGPT tests
        command: npm test -- chatgpt

  - id: phase-3
    name: Claude Enterprise Connector
    worktree: ../saas-xray-worktrees/phase-3-claude
    branch: feature/claude-enterprise
    dependencies: [phase-0]
    parallel: [phase-1, phase-2]
    tasks:
      - name: Write Claude tests
        command: npm run test:write -- claude
      - name: Implement Claude connector
        command: npm run dev:claude
      - name: Run Claude tests
        command: npm test -- claude

  - id: phase-4
    name: GPT-5 Analysis Service
    worktree: ../saas-xray-worktrees/phase-4-gpt5
    branch: feature/gpt5-analysis
    dependencies: [phase-0]
    parallel: [phase-1, phase-2, phase-3]
    tasks:
      - name: Write GPT-5 analysis tests
        command: npm run test:write -- gpt5
      - name: Implement GPT-5 service
        command: npm run dev:gpt5
      - name: Run GPT-5 tests
        command: npm test -- gpt5

  - id: integration
    name: Integration & Merge
    worktree: main
    branch: main
    dependencies: [phase-1, phase-2, phase-3, phase-4]
    tasks:
      - name: Merge Phase 1
        command: git merge feature/gemini-reporting-api
      - name: Merge Phase 2
        command: git merge feature/chatgpt-enterprise
      - name: Merge Phase 3
        command: git merge feature/claude-enterprise
      - name: Merge Phase 4
        command: git merge feature/gpt5-analysis
      - name: Run full test suite
        command: npm test
      - name: Run E2E tests
        command: npm run test:e2e
```

### Conductor Usage

```bash
# Initialize conductor
conductor init

# Execute all phases
conductor run

# Execute specific phase
conductor run phase-1

# Monitor progress
conductor status

# Rollback phase
conductor rollback phase-2
```

---

## Success Criteria

### Phase 0 (Shared Types)
- [ ] All type definitions created
- [ ] 0 TypeScript compilation errors
- [ ] 100% type test coverage
- [ ] Documentation complete

### Phase 1 (Gemini)
- [ ] Gemini audit logs retrievable via API
- [ ] Events normalized to AIplatformAuditLog
- [ ] 100% unit test coverage
- [ ] Integration tests passing
- [ ] Dashboard widget functional

### Phase 2 (ChatGPT)
- [ ] ChatGPT Enterprise connector functional
- [ ] Audit logs retrieved and normalized
- [ ] 100% unit test coverage
- [ ] Integration tests passing
- [ ] Dashboard integration complete

### Phase 3 (Claude)
- [ ] Claude Enterprise connector functional
- [ ] Audit logs exported and processed
- [ ] 100% unit test coverage
- [ ] Integration tests passing
- [ ] Dashboard integration complete

### Phase 4 (GPT-5)
- [ ] GPT-5 analysis service operational
- [ ] Risk scoring accurate and tested
- [ ] Insights generation functional
- [ ] Cross-platform correlation working
- [ ] Dashboard insights panel complete

### Integration
- [ ] All phases merged to main
- [ ] Full test suite passing
- [ ] E2E tests passing
- [ ] Documentation updated
- [ ] Performance benchmarks met

---

## Timeline

| Phase | Duration | Dependencies | Start | End |
|-------|----------|--------------|-------|-----|
| Phase 0 | 1 week | None | Week 1 | Week 1 |
| Phase 1 | 2 weeks | Phase 0 | Week 2 | Week 3 |
| Phase 2 | 2 weeks | Phase 0 | Week 2 | Week 3 |
| Phase 3 | 2 weeks | Phase 0 | Week 2 | Week 3 |
| Phase 4 | 3 weeks | Phase 0 | Week 2 | Week 4 |
| Integration | 1 week | All phases | Week 5 | Week 5 |

**Total Duration**: 5 weeks (with parallel execution)

---

## Next Steps

1. **Immediate**: Execute Phase 0 (Shared Types)
2. **Week 2**: Set up git worktrees and begin parallel development
3. **Week 5**: Integration and final testing
4. **Week 6**: Production deployment

---

**Document Version**: 1.0
**Last Updated**: 2025-01-02
**Author**: SaaS X-Ray Development Team
