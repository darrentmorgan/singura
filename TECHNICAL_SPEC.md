# SaaS X-Ray Technical Specification

**Version**: 1.0  
**Date**: January 2025  
**Status**: Draft

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [System Components](#system-components)
- [Data Models](#data-models)
- [API Specifications](#api-specifications)
- [Security Architecture](#security-architecture)
- [Integration Specifications](#integration-specifications)
- [Deployment Architecture](#deployment-architecture)
- [Performance Requirements](#performance-requirements)

## Architecture Overview

### High-Level System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Detection     │
│   Dashboard     │    │   Gateway       │    │   Engine        │
│                 │    │                 │    │                 │
│ • React SPA     │◄───► • Node.js       │◄───► • Pattern ML    │
│ • Real-time UI  │    │ • Express.js    │    │ • Correlation   │
│ • Risk Metrics  │    │ • REST + WS     │    │ • Risk Scoring  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Data Store    │    │   Queue System  │    │   Connector     │
│                 │    │                 │    │   Layer         │
│ • PostgreSQL    │    │ • Redis/Bull    │    │                 │
│ • Time Series   │    │ • Job Queue     │    │ • OAuth 2.0     │
│ • Audit Logs    │    │ • Scheduling    │    │ • Webhook Mgmt  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                         ┌──────────────────────────────┼──────────────────────────────┐
                         │                              │                              │
                         ▼                              ▼                              ▼
              ┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
              │   Slack API     │         │ Google Workspace│         │ Microsoft Graph │
              │                 │         │      API        │         │      API        │
              │ • Bot Detection │         │ • Apps Script   │         │ • Power Platform│
              │ • App Inventory │         │ • Service Acc   │         │ • App Registry  │
              │ • Webhook Mon   │         │ • OAuth Apps    │         │ • API Activity  │
              └─────────────────┘         └─────────────────┘         └─────────────────┘
```

### Technology Stack

**Frontend**:
- React 18.2+ with TypeScript
- Vite for build tooling
- TailwindCSS + shadcn/ui components
- Recharts for data visualization
- Socket.io client for real-time updates

**Backend**:
- Node.js 20+ with Express.js
- TypeScript for type safety
- PostgreSQL 16 for primary storage
- Redis for caching and job queues
- Bull for background job processing

**Infrastructure**:
- Docker containers with multi-stage builds
- nginx reverse proxy
- Docker Compose for local development
- GitHub Actions for CI/CD

## System Components

### 1. Connector Layer

**Purpose**: OAuth authentication and API data collection from SaaS platforms

```typescript
interface PlatformConnector {
  platform: 'slack' | 'google' | 'microsoft';
  authenticate(credentials: OAuthCredentials): Promise<ConnectionResult>;
  discoverAutomations(): Promise<AutomationEvent[]>;
  getAuditLogs(since: Date): Promise<AuditLogEntry[]>;
  validatePermissions(): Promise<PermissionCheck>;
}

class SlackConnector implements PlatformConnector {
  async discoverAutomations(): Promise<AutomationEvent[]> {
    // Discover bots, apps, workflows in Slack workspace
    const bots = await this.slack.bots.list();
    const apps = await this.slack.apps.list();
    const workflows = await this.slack.workflows.list();
    return this.mapToAutomationEvents([...bots, ...apps, ...workflows]);
  }
}
```

**Data Collection Patterns**:
- Slack: Bot list, app installations, webhook configurations, workflow automations
- Google: Service accounts, Apps Script projects, OAuth applications, API usage logs
- Microsoft: Power Platform apps, Graph API activity, automated flows, app registrations

### 2. Detection Engine

**Purpose**: Pattern matching, correlation analysis, and risk assessment

```typescript
interface DetectionRule {
  id: string;
  name: string;
  pattern: RegExp | MLModel;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  category: 'bot' | 'workflow' | 'integration' | 'api_key' | 'data_access';
  enabled: boolean;
}

class DetectionEngine {
  private rules: DetectionRule[] = [
    {
      id: 'slack_bot_high_permissions',
      pattern: /bot.*admin.*permissions/i,
      riskLevel: 'high',
      category: 'bot'
    },
    {
      id: 'google_script_data_export',
      pattern: /apps.script.*export.*drive/i,
      riskLevel: 'critical',
      category: 'data_access'
    }
  ];

  async analyzeEvent(event: AutomationEvent): Promise<DetectionResult> {
    const violations = [];
    for (const rule of this.rules) {
      if (await this.matchesRule(event, rule)) {
        violations.push(new RuleViolation(rule, event));
      }
    }
    return new DetectionResult(event, violations);
  }
}
```

### 3. Risk Scoring Algorithm

**Multi-factor Risk Assessment**:

```typescript
interface RiskFactors {
  permissionLevel: number;    // 0-100 (admin=100, read=20)
  dataAccess: number;         // 0-100 (PII access=100, metadata=30)
  activityVolume: number;     // 0-100 (requests per day normalized)
  crossPlatform: number;      // 0-100 (single=0, multi=100)
  userCount: number;          // 0-100 (affected users normalized)
  dataRetention: number;      // 0-100 (permanent=100, temporary=40)
}

class RiskScorer {
  calculateRiskScore(factors: RiskFactors): number {
    const weights = {
      permissionLevel: 0.25,
      dataAccess: 0.30,
      activityVolume: 0.15,
      crossPlatform: 0.10,
      userCount: 0.10,
      dataRetention: 0.10
    };

    return Object.entries(weights).reduce((score, [factor, weight]) => {
      return score + (factors[factor as keyof RiskFactors] * weight);
    }, 0);
  }

  categorizeRisk(score: number): RiskLevel {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }
}
```

## Data Models

### Core Entities

```typescript
interface Organization {
  id: string;
  name: string;
  domain: string;
  industry: string;
  createdAt: Date;
  settings: OrganizationSettings;
}

interface PlatformConnection {
  id: string;
  organizationId: string;
  platform: 'slack' | 'google' | 'microsoft';
  status: 'connected' | 'disconnected' | 'error';
  credentials: EncryptedCredentials;
  permissions: string[];
  lastSync: Date;
  metadata: Record<string, any>;
}

interface AutomationEvent {
  id: string;
  organizationId: string;
  platformConnectionId: string;
  type: 'bot' | 'workflow' | 'integration' | 'script';
  name: string;
  description?: string;
  permissions: string[];
  activityMetrics: {
    requestCount: number;
    dataVolume: number;
    userInteractions: number;
    errorRate: number;
  };
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: Date;
  lastActivity: Date;
  metadata: Record<string, any>;
}

interface DetectionResult {
  id: string;
  automationEventId: string;
  ruleViolations: RuleViolation[];
  riskAssessment: RiskAssessment;
  recommendations: string[];
  createdAt: Date;
}

interface AuditLog {
  id: string;
  organizationId: string;
  platformConnectionId: string;
  eventType: string;
  eventData: Record<string, any>;
  timestamp: Date;
  correlationId: string;
}
```

### Database Schema (PostgreSQL)

```sql
-- Organizations and connections
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) UNIQUE NOT NULL,
  industry VARCHAR(100),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE platform_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'disconnected',
  credentials TEXT, -- encrypted
  permissions TEXT[],
  last_sync TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automation discovery and analysis
CREATE TABLE automation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  platform_connection_id UUID REFERENCES platform_connections(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  permissions TEXT[],
  activity_metrics JSONB DEFAULT '{}',
  risk_score DECIMAL(5,2),
  risk_level VARCHAR(20),
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE detection_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_event_id UUID REFERENCES automation_events(id) ON DELETE CASCADE,
  rule_violations JSONB DEFAULT '[]',
  risk_assessment JSONB DEFAULT '{}',
  recommendations TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit and compliance
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  platform_connection_id UUID REFERENCES platform_connections(id),
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  correlation_id VARCHAR(100)
);

-- Indexes for performance
CREATE INDEX idx_automation_events_org_risk ON automation_events(organization_id, risk_level, detected_at DESC);
CREATE INDEX idx_audit_logs_org_timestamp ON audit_logs(organization_id, timestamp DESC);
CREATE INDEX idx_platform_connections_org_status ON platform_connections(organization_id, status);
```

## API Specifications

### Authentication & Authorization

**OAuth 2.0 Flow for Platform Connections**:

```typescript
// POST /api/auth/connect/:platform
interface ConnectPlatformRequest {
  platform: 'slack' | 'google' | 'microsoft';
  redirectUri: string;
  scopes?: string[];
}

interface ConnectPlatformResponse {
  authUrl: string;
  state: string;
  expiresIn: number;
}

// GET /api/auth/callback/:platform
interface CallbackRequest {
  code: string;
  state: string;
  error?: string;
}
```

### Core API Endpoints

```typescript
// GET /api/organizations/:id/automations
interface ListAutomationsQuery {
  platform?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  type?: 'bot' | 'workflow' | 'integration' | 'script';
  limit?: number;
  offset?: number;
  sortBy?: 'detected_at' | 'risk_score' | 'last_activity';
  sortOrder?: 'asc' | 'desc';
}

interface ListAutomationsResponse {
  automations: AutomationEvent[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  summary: {
    totalByRiskLevel: Record<string, number>;
    totalByPlatform: Record<string, number>;
    totalByType: Record<string, number>;
  };
}

// POST /api/organizations/:id/scan
interface TriggerScanRequest {
  platforms?: string[];
  fullScan?: boolean;
}

interface TriggerScanResponse {
  jobId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  estimatedDuration: number;
}

// GET /api/organizations/:id/dashboard
interface DashboardResponse {
  summary: {
    totalAutomations: number;
    criticalRisk: number;
    newThisWeek: number;
    platformsConnected: number;
  };
  riskTrend: Array<{
    date: string;
    high: number;
    medium: number;
    low: number;
  }>;
  topViolations: Array<{
    rule: string;
    count: number;
    lastSeen: Date;
  }>;
  platformBreakdown: Array<{
    platform: string;
    automationCount: number;
    riskScore: number;
  }>;
}

// POST /api/organizations/:id/export
interface ExportRequest {
  format: 'csv' | 'json' | 'pdf';
  dateRange: {
    start: Date;
    end: Date;
  };
  includeDetails?: boolean;
  platforms?: string[];
}

interface ExportResponse {
  downloadUrl: string;
  expiresAt: Date;
  fileSize: number;
}
```

## Security Architecture

### Data Protection

**Encryption at Rest**:
- PostgreSQL with transparent data encryption (TDE)
- Encrypted credentials using AES-256-GCM
- Encrypted audit logs with retention controls

**Encryption in Transit**:
- TLS 1.3 for all API communications
- Certificate pinning for platform API connections
- mTLS for internal service communication

### Access Control

```typescript
interface RoleBasedAccess {
  roles: {
    'org_admin': string[];      // Full access to organization data
    'compliance_officer': string[];  // Read access + export capabilities
    'security_analyst': string[];    // Read access to violations only
    'viewer': string[];              // Dashboard view only
  };
  
  permissions: {
    'automation:read': boolean;
    'automation:scan': boolean;
    'platform:connect': boolean;
    'platform:disconnect': boolean;
    'audit:export': boolean;
    'settings:modify': boolean;
  };
}

class AccessControlMiddleware {
  async authorize(req: Request, permission: string): Promise<boolean> {
    const user = await this.getUser(req.headers.authorization);
    const userPermissions = this.getRolePermissions(user.role);
    return userPermissions.includes(permission);
  }
}
```

### OAuth Security

**Secure Token Management**:
- OAuth tokens encrypted at rest
- Token refresh automation with exponential backoff
- Scope validation and minimal permissions principle
- Token revocation handling

```typescript
class SecureTokenManager {
  async storeTokens(connectionId: string, tokens: OAuthTokens): Promise<void> {
    const encrypted = await this.encrypt(JSON.stringify(tokens));
    await this.db.query(
      'UPDATE platform_connections SET credentials = $1 WHERE id = $2',
      [encrypted, connectionId]
    );
  }

  async refreshToken(connectionId: string): Promise<OAuthTokens> {
    const connection = await this.getConnection(connectionId);
    const tokens = await this.decrypt(connection.credentials);
    
    if (this.isTokenExpired(tokens)) {
      const newTokens = await this.platformAPI.refreshTokens(tokens.refreshToken);
      await this.storeTokens(connectionId, newTokens);
      return newTokens;
    }
    
    return tokens;
  }
}
```

## Integration Specifications

### Slack Integration

**Required Scopes**:
- `users:read` - User information
- `bots:read` - Bot detection
- `apps:read` - Installed app inventory
- `team:read` - Workspace information
- `admin.apps:read` - Admin app management (if admin)

**Data Collection**:
```typescript
class SlackConnector {
  async discoverAutomations(): Promise<AutomationEvent[]> {
    const automations = [];
    
    // Discover bots
    const bots = await this.slack.bots.info();
    for (const bot of bots) {
      automations.push({
        type: 'bot',
        name: bot.name,
        permissions: bot.scopes,
        activityMetrics: await this.getBotMetrics(bot.id),
        metadata: { botId: bot.id, appId: bot.app_id }
      });
    }
    
    // Discover workflow automations
    const workflows = await this.slack.workflows.list();
    for (const workflow of workflows) {
      automations.push({
        type: 'workflow',
        name: workflow.name,
        permissions: workflow.permissions,
        activityMetrics: await this.getWorkflowMetrics(workflow.id)
      });
    }
    
    return automations;
  }
}
```

### Google Workspace Integration

**Required Scopes**:
- `https://www.googleapis.com/auth/admin.directory.readonly` - User/group info
- `https://www.googleapis.com/auth/script.projects.readonly` - Apps Script projects
- `https://www.googleapis.com/auth/admin.reports.audit.readonly` - Audit logs
- `https://www.googleapis.com/auth/cloud-platform.read-only` - Service accounts

**Data Collection**:
```typescript
class GoogleConnector {
  async discoverAutomations(): Promise<AutomationEvent[]> {
    const automations = [];
    
    // Apps Script Projects
    const scripts = await this.script.projects.list();
    for (const script of scripts.projects) {
      automations.push({
        type: 'script',
        name: script.title,
        permissions: await this.getScriptPermissions(script.scriptId),
        activityMetrics: await this.getScriptMetrics(script.scriptId)
      });
    }
    
    // Service Accounts
    const serviceAccounts = await this.iam.projects.serviceAccounts.list({
      name: `projects/${this.projectId}`
    });
    
    for (const account of serviceAccounts.accounts) {
      automations.push({
        type: 'integration',
        name: account.displayName,
        permissions: await this.getServiceAccountRoles(account.uniqueId)
      });
    }
    
    return automations;
  }
}
```

### Microsoft 365 Integration

**Required Scopes**:
- `Directory.Read.All` - Organization directory
- `Application.Read.All` - App registrations
- `AuditLog.Read.All` - Audit logs
- `Flow.Read.All` - Power Automate flows (if available)

## Deployment Architecture

### Container Structure

```dockerfile
# Backend API
FROM node:20-alpine AS api-build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS api-runtime
WORKDIR /app
COPY --from=api-build /app/node_modules ./node_modules
COPY src/ ./src/
EXPOSE 3001
CMD ["node", "src/server.js"]

# Frontend Dashboard
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM nginx:alpine AS frontend-runtime
COPY --from=frontend-build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 3000
```

### Docker Compose Configuration

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: saas_xray
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  api:
    build: 
      context: .
      dockerfile: Dockerfile.api
    environment:
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@postgres:5432/saas_xray
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      SLACK_CLIENT_ID: ${SLACK_CLIENT_ID}
      SLACK_CLIENT_SECRET: ${SLACK_CLIENT_SECRET}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
    depends_on:
      - postgres
      - redis
    ports:
      - "3001:3001"

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:3000"
    depends_on:
      - api

  worker:
    build:
      context: .
      dockerfile: Dockerfile.api
    command: ["node", "src/worker.js"]
    environment:
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@postgres:5432/saas_xray
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:
  redis_data:

networks:
  default:
    name: saas_xray
```

## Performance Requirements

### Scalability Targets

**MVP (Months 1-3)**:
- Organizations: 100
- Automations per org: 1,000
- API requests: 1,000/minute
- Data retention: 90 days

**Growth Phase (Months 4-12)**:
- Organizations: 1,000
- Automations per org: 10,000
- API requests: 10,000/minute
- Data retention: 1 year

**Enterprise Phase (Year 2+)**:
- Organizations: 10,000
- Automations per org: 100,000
- API requests: 100,000/minute
- Data retention: 3 years

### Performance Optimization

**Database Optimization**:
```sql
-- Partitioning for audit logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  event_data JSONB NOT NULL
) PARTITION BY RANGE (timestamp);

CREATE TABLE audit_logs_2025_01 PARTITION OF audit_logs
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Indexes for common queries
CREATE INDEX CONCURRENTLY idx_automation_events_composite 
ON automation_events(organization_id, risk_level, detected_at DESC) 
WHERE risk_level IN ('high', 'critical');
```

**Caching Strategy**:
```typescript
class CacheManager {
  private redis: Redis;
  
  async getDashboardData(orgId: string): Promise<DashboardData | null> {
    const cached = await this.redis.get(`dashboard:${orgId}`);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const data = await this.computeDashboardData(orgId);
    await this.redis.setex(`dashboard:${orgId}`, 300, JSON.stringify(data)); // 5min cache
    return data;
  }
}
```

### Monitoring & Observability

**Key Metrics**:
- API response times (p95 < 500ms)
- Platform sync success rate (> 99%)
- Detection accuracy (false positive rate < 5%)
- Database connection pool utilization
- Memory usage per container
- OAuth token refresh success rate

**Alerting Thresholds**:
- API error rate > 1%
- Platform sync failures > 5 consecutive
- Database connection pool > 80%
- Memory usage > 90%
- Disk space < 20%

---

**Implementation Priority**: High-risk automations detection, OAuth security, real-time dashboard updates
**Timeline**: 8-10 weeks for MVP implementation
**Team**: 2-3 backend engineers, 1 frontend engineer, 1 DevOps engineer