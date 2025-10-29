# Testing Frameworks & API Documentation Research
## Comprehensive Guide for Singura Automation Detection Testing

**Last Updated**: 2025-10-25
**Research Context**: Testing infrastructure for automation/bot detection across Slack, Google Workspace, and Microsoft 365

---

## Table of Contents

1. [Testing Frameworks](#1-testing-frameworks)
2. [Platform APIs - Response Formats](#2-platform-apis---response-formats)
3. [OAuth & API Testing](#3-oauth--api-testing)
4. [Data Generation](#4-data-generation)
5. [CI/CD Testing](#5-cicd-testing)
6. [Performance Testing](#6-performance-testing)
7. [Current Singura Setup](#7-current-singura-setup)
8. [Code Examples](#8-code-examples)

---

## 1. Testing Frameworks

### 1.1 Jest with TypeScript

**Current Version in Singura**: jest@29.7.0, ts-jest@29.4.4

#### Configuration (Current Setup)

```javascript
// backend/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/src/**/*.test.ts',
    '**/__tests__/**/*.ts'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json'
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@singura/shared-types)/)'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 10000,
  maxWorkers: '50%',
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};
```

#### Best Practices (2025)

**Type-Safe Mocking**:
```typescript
// Create type-safe mock helper
function mockFunction<T extends (...args: any[]) => any>(
  fn: T
): jest.MockedFunction<T> {
  return fn as jest.MockedFunction<T>;
}

// Usage
const mockSlackClient = {
  users: {
    list: mockFunction(jest.fn())
  }
};
```

**Mock Cleanup Between Tests**:
```typescript
beforeEach(() => {
  jest.clearAllMocks(); // Clear mock calls
});

afterEach(() => {
  jest.restoreMocks(); // Restore original implementations
});
```

**Choosing the Right Mock Type**:
- **jest.fn()**: Create full mocks with complete control
- **jest.spyOn()**: Create partial mocks keeping original behavior
- **jest.mock()**: Mock entire modules

**Module Mocking Pattern (Current Singura Pattern)**:
```typescript
// Mock Slack Web API
jest.mock('@slack/web-api', () => {
  const MockWebClient = jest.fn().mockImplementation(() => mockSlackClientInstance);
  return { WebClient: MockWebClient };
});

// Mock Google APIs
jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        setCredentials: jest.fn(),
        credentials: { scope: 'https://www.googleapis.com/auth/drive' }
      }))
    },
    oauth2: jest.fn(() => ({
      userinfo: { get: mockUserinfoGet },
      tokeninfo: mockTokeninfo
    })),
    admin: jest.fn(() => ({
      activities: { list: mockActivitiesList }
    }))
  }
}));
```

### 1.2 Supertest

**Current Version**: supertest@6.3.4

Used for HTTP integration testing with Express.

```typescript
import request from 'supertest';
import app from '../src/app';

describe('OAuth API', () => {
  it('should initiate OAuth flow', async () => {
    const response = await request(app)
      .get('/api/oauth/slack/initiate')
      .set('Authorization', `Bearer ${testToken}`)
      .expect(302);

    expect(response.headers.location).toMatch(/slack.com\/oauth/);
  });
});
```

### 1.3 Playwright

**Current Version**: @playwright/test@1.55.0

Used for E2E testing across frontend and backend.

```typescript
// e2e/tests/oauth-flows.spec.ts
import { test, expect } from '@playwright/test';

test('Slack OAuth connection flow', async ({ page }) => {
  await page.goto('http://localhost:3000/dashboard');
  await page.click('button:has-text("Connect Slack")');

  // Wait for OAuth redirect
  await page.waitForURL(/slack.com\/oauth/);

  // Mock Slack authorization (in test environment)
  await page.route('**/oauth/v2/authorize', route => {
    route.fulfill({
      status: 302,
      headers: {
        location: `http://localhost:3000/oauth/callback?code=test-code`
      }
    });
  });
});
```

---

## 2. Platform APIs - Response Formats

### 2.1 Slack Web API

#### Audit Logs API Response Format

**Endpoint**: `https://api.slack.com/audit/v1/logs`

**Response Structure**:
```json
{
  "entries": [
    {
      "id": "0ab123bc-d4ef-5678-g901-23h456i789jk",
      "date_create": 1521214343,
      "action": "user_login",
      "actor": {
        "type": "user",
        "user": {
          "id": "W123ABC456",
          "name": "Charlie Parker",
          "email": "[email protected]"
        }
      },
      "entity": {
        "type": "user",
        "user": {
          "id": "W123ABC456",
          "name": "Charlie Parker",
          "email": "[email protected]"
        }
      },
      "context": {
        "location": {
          "type": "enterprise",
          "id": "E1701MWNMM9",
          "name": "Birdland",
          "domain": "birdland"
        },
        "ua": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6)",
        "ip_address": "1.23.45.678",
        "session_id": "1234"
      },
      "details": {
        "type": "web"
      }
    }
  ],
  "response_metadata": {
    "next_cursor": "d1OhFTRXd3QuRMQSUXppc3FmVmpoOjE6MToxNjg0MTcyNTQzOjowOjoxOjE4NzYxNmE0MzU4Zjk0NDY2NzA4"
  }
}
```

**Key Components**:
- **actor**: Who performed the action (user, bot, app)
- **action**: What happened (user_login, file_downloaded, emoji_removed)
- **entity**: What was acted upon
- **context**: Where and when (IP, location, session)
- **details**: Additional action-specific data

**Common Actions for Bot Detection**:
- `app_installed` - New app added to workspace
- `app_approved` - Admin approved app
- `workflow_created` - Workflow automation created
- `bot_added` - Bot user added to channels
- `api_app_scopes_expanded` - App requested more permissions

#### Users API Response

**Method**: `users.list`

```typescript
const response = await client.users.list();

// Response structure
{
  "ok": true,
  "members": [
    {
      "id": "U123456789",
      "name": "testuser",
      "real_name": "Test User",
      "is_bot": false,
      "is_app_user": false,
      "profile": {
        "email": "[email protected]",
        "display_name": "Test User",
        "api_app_id": "A1234567890" // Present if user is a bot
      }
    },
    {
      "id": "B987654321",
      "name": "slackbot",
      "real_name": "Slackbot",
      "is_bot": true,
      "profile": {
        "api_app_id": "A0000000001",
        "bot_id": "B987654321"
      }
    }
  ],
  "cache_ts": 1498777272,
  "response_metadata": {
    "next_cursor": "dXNlcjpVMEc5V0ZYTlo="
  }
}
```

**Bot Detection Fields**:
- `is_bot: true` - Indicates bot user
- `is_app_user: true` - App-based user
- `profile.api_app_id` - Associated app ID
- `profile.bot_id` - Bot user ID

#### Apps API

**Method**: `admin.apps.approved.list` (requires admin token with `admin.apps:read`)

```json
{
  "ok": true,
  "approved_apps": [
    {
      "app": {
        "id": "A1234567890",
        "name": "Zapier",
        "description": "Workflow automation",
        "help_url": "https://zapier.com/help",
        "privacy_policy_url": "https://zapier.com/privacy"
      },
      "scopes": [
        {
          "name": "channels:read",
          "description": "View basic channel information",
          "is_sensitive": false
        }
      ],
      "date_updated": 1574296707,
      "last_resolved_by": {
        "actor_id": "W123ABC456",
        "actor_type": "user"
      }
    }
  ],
  "response_metadata": {
    "next_cursor": ""
  }
}
```

**IMPORTANT NOTE**: The methods `apps.list()` and `bots.list()` do NOT exist in Slack API. Use:
- `admin.apps.approved.list()` - For approved apps
- `users.list()` with filtering on `is_bot: true` - For bot users

### 2.2 Google Workspace Admin SDK

#### Audit Logs API Response Format

**Endpoint**: `https://admin.googleapis.com/admin/reports/v1/activity/users/{userKey}/applications/{applicationName}`

**Response Structure**:
```json
{
  "kind": "admin#reports#activities",
  "etag": "\"abc123\"",
  "nextPageToken": "xyz789",
  "items": [
    {
      "kind": "admin#reports#activity",
      "id": {
        "time": "2025-10-25T10:30:00.000Z",
        "uniqueQualifier": "1234567890",
        "applicationName": "drive",
        "customerId": "C03abc123"
      },
      "etag": "\"def456\"",
      "actor": {
        "callerType": "USER",
        "email": "[email protected]",
        "profileId": "1234567890123456789"
      },
      "events": [
        {
          "type": "access",
          "name": "download",
          "parameters": [
            {
              "name": "doc_id",
              "value": "1AbC2dEfGhI3jKl4MnO5pQr6StU7vWx8YzA"
            },
            {
              "name": "doc_title",
              "value": "Confidential Report.pdf"
            },
            {
              "name": "owner",
              "value": "[email protected]"
            }
          ]
        }
      ],
      "ipAddress": "192.168.1.100"
    }
  ]
}
```

**Key Components**:
- **id.time**: RFC3339 timestamp
- **id.applicationName**: Google Workspace app (drive, admin, login, token, etc.)
- **actor**: Who performed the action
- **events**: Array of actions performed
- **ipAddress**: Source IP address

#### Apps Script API Response

**Method**: `script.projects.list`

```json
{
  "projects": [
    {
      "scriptId": "1a2b3c4d5e6f7g8h9i0j",
      "title": "Email Automation Script",
      "createTime": "2025-01-15T08:30:00.000Z",
      "updateTime": "2025-10-20T14:22:00.000Z",
      "creator": {
        "name": "John Doe",
        "email": "[email protected]"
      },
      "lastModifyUser": {
        "name": "John Doe",
        "email": "[email protected]"
      }
    }
  ],
  "nextPageToken": "abc123xyz"
}
```

**Method**: `script.projects.get`

```json
{
  "scriptId": "1a2b3c4d5e6f7g8h9i0j",
  "title": "Email Automation Script",
  "createTime": "2025-01-15T08:30:00.000Z",
  "updateTime": "2025-10-20T14:22:00.000Z",
  "files": [
    {
      "name": "Code",
      "type": "SERVER_JS",
      "source": "function sendEmails() { /* script content */ }",
      "createTime": "2025-01-15T08:30:00.000Z",
      "updateTime": "2025-10-20T14:22:00.000Z",
      "functionSet": {
        "values": [
          {
            "name": "sendEmails"
          }
        ]
      }
    }
  ]
}
```

**Bot/Automation Detection Fields**:
- Trigger-based scripts indicate automation
- Frequency of executions in audit logs
- OAuth scopes requested (broader scopes = higher risk)

#### Token API Response

**Method**: `admin.directory.tokens.list` (requires `admin.directory.user.security` scope)

```json
{
  "kind": "admin#directory#tokenList",
  "etag": "\"abc123\"",
  "items": [
    {
      "kind": "admin#directory#token",
      "etag": "\"def456\"",
      "clientId": "1234567890-abc123def456.apps.googleusercontent.com",
      "displayText": "Zapier Automation",
      "scopes": [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/drive.file"
      ],
      "userKey": "[email protected]",
      "nativeApp": false
    }
  ]
}
```

### 2.3 Microsoft Graph API

#### Audit Logs API Response Format

**Endpoint**: `https://graph.microsoft.com/v1.0/auditLogs/directoryAudits`

**Response Structure**:
```json
{
  "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#auditLogs/directoryAudits",
  "value": [
    {
      "id": "Directory_12345678-1234-1234-1234-123456789abc",
      "category": "ApplicationManagement",
      "correlationId": "87654321-4321-4321-4321-abcdef123456",
      "result": "success",
      "resultReason": "",
      "activityDisplayName": "Add service principal",
      "activityDateTime": "2025-10-25T10:30:00.0000000Z",
      "loggedByService": "Core Directory",
      "operationType": "Add",
      "initiatedBy": {
        "user": {
          "id": "user123-4567-89ab-cdef-1234567890ab",
          "displayName": "John Doe",
          "userPrincipalName": "[email protected]",
          "ipAddress": "192.168.1.100"
        },
        "app": null
      },
      "targetResources": [
        {
          "id": "app123-4567-89ab-cdef-1234567890cd",
          "displayName": "Zapier Automation",
          "type": "ServicePrincipal",
          "modifiedProperties": [
            {
              "displayName": "AppAddress",
              "oldValue": null,
              "newValue": "[\"https://zapier.com\"]"
            }
          ]
        }
      ],
      "additionalDetails": [
        {
          "key": "AppId",
          "value": "app-client-id-12345"
        }
      ]
    }
  ]
}
```

**Key Components**:
- **category**: ApplicationManagement, UserManagement, RoleManagement, etc.
- **activityDisplayName**: Human-readable action
- **initiatedBy**: User or app that performed action
- **targetResources**: What was modified
- **additionalDetails**: Extra context

**Sign-in Logs Endpoint**: `https://graph.microsoft.com/v1.0/auditLogs/signIns`

```json
{
  "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#auditLogs/signIns",
  "value": [
    {
      "id": "signin-12345",
      "createdDateTime": "2025-10-25T10:30:00.0000000Z",
      "userDisplayName": "John Doe",
      "userPrincipalName": "[email protected]",
      "userId": "user123",
      "appId": "app-id-12345",
      "appDisplayName": "Power Automate",
      "ipAddress": "192.168.1.100",
      "clientAppUsed": "Browser",
      "userAgent": "Mozilla/5.0...",
      "conditionalAccessStatus": "success",
      "isInteractive": true,
      "riskDetail": "none",
      "riskLevelAggregated": "none",
      "riskLevelDuringSignIn": "none",
      "riskState": "none",
      "resourceDisplayName": "Microsoft Graph",
      "status": {
        "errorCode": 0,
        "failureReason": null,
        "additionalDetails": null
      }
    }
  ]
}
```

---

## 3. OAuth & API Testing

### 3.1 Mocking OAuth Flows

#### Token Generation with mock-jwks

**Not currently in Singura** - Recommended addition for JWT testing.

```bash
pnpm add -D mock-jwks
```

```typescript
import createJWKSMock from 'mock-jwks';

describe('JWT Token Validation', () => {
  let jwksMock: ReturnType<typeof createJWKSMock>;

  beforeAll(() => {
    jwksMock = createJWKSMock('https://auth.singura.com');
    jwksMock.start();
  });

  afterAll(async () => {
    await jwksMock.stop();
  });

  it('should validate valid JWT token', async () => {
    const token = jwksMock.token({
      sub: 'user123',
      email: '[email protected]',
      org_id: 'org_abc123',
      scope: 'read:automations write:automations'
    });

    const result = await validateToken(token);
    expect(result.valid).toBe(true);
  });

  it('should reject expired token', async () => {
    const token = jwksMock.token({
      sub: 'user123',
      exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
    });

    await expect(validateToken(token)).rejects.toThrow('Token expired');
  });
});
```

#### Mocking OAuth Credentials (Current Pattern)

```typescript
// tests/fixtures/oauth-credentials.ts
import { OAuthCredentials } from '@singura/shared-types';

export const mockSlackCredentials: OAuthCredentials = {
  accessToken: 'xoxb-mock-slack-token-12345',
  refreshToken: 'xoxr-mock-refresh-token-67890',
  tokenType: 'Bearer',
  expiresAt: new Date(Date.now() + 3600000), // 1 hour
  scope: 'channels:read,users:read,team:read'
};

export const mockGoogleCredentials: OAuthCredentials = {
  accessToken: 'ya29.mock-google-access-token',
  refreshToken: '1//mock-google-refresh-token',
  tokenType: 'Bearer',
  expiresAt: new Date(Date.now() + 3600000),
  scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/admin.reports.audit.readonly'
};

export const mockMicrosoftCredentials: OAuthCredentials = {
  accessToken: 'EwB4A+mock+microsoft+token',
  refreshToken: 'M.R3_BAY.mock-refresh-token',
  tokenType: 'Bearer',
  expiresAt: new Date(Date.now() + 3600000),
  scope: 'https://graph.microsoft.com/AuditLog.Read.All'
};
```

### 3.2 HTTP Mocking with Nock

**Not currently in Singura** - Recommended for API testing.

```bash
pnpm add -D nock
```

```typescript
import nock from 'nock';

describe('Slack API Client', () => {
  beforeEach(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('should fetch user list', async () => {
    const mockResponse = {
      ok: true,
      members: [
        { id: 'U123', name: 'john', is_bot: false },
        { id: 'B456', name: 'automation-bot', is_bot: true }
      ]
    };

    nock('https://slack.com')
      .get('/api/users.list')
      .query({ limit: 100 })
      .reply(200, mockResponse);

    const result = await slackClient.users.list({ limit: 100 });
    expect(result.members).toHaveLength(2);
  });

  it('should handle rate limiting', async () => {
    nock('https://slack.com')
      .get('/api/users.list')
      .reply(429, {
        ok: false,
        error: 'rate_limited'
      }, {
        'Retry-After': '60'
      });

    await expect(slackClient.users.list()).rejects.toThrow('rate_limited');
  });

  it('should retry on network error', async () => {
    nock('https://slack.com')
      .get('/api/users.list')
      .replyWithError('Network error')
      .get('/api/users.list')
      .reply(200, { ok: true, members: [] });

    const result = await slackClient.users.list();
    expect(result.ok).toBe(true);
  });
});
```

### 3.3 Testing Token Refresh Logic

```typescript
describe('OAuth Token Refresh', () => {
  it('should refresh expired access token', async () => {
    const expiredCredentials: OAuthCredentials = {
      accessToken: 'expired-token',
      refreshToken: 'valid-refresh-token',
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() - 1000), // Expired
      scope: 'read write'
    };

    // Mock token refresh endpoint
    nock('https://oauth.platform.com')
      .post('/token', {
        grant_type: 'refresh_token',
        refresh_token: 'valid-refresh-token'
      })
      .reply(200, {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'read write'
      });

    const newCredentials = await refreshToken(expiredCredentials);

    expect(newCredentials.accessToken).toBe('new-access-token');
    expect(newCredentials.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});
```

---

## 4. Data Generation

### 4.1 Faker.js for Realistic Test Data

**Not currently in Singura** - Recommended addition.

```bash
pnpm add -D @faker-js/faker
```

```typescript
import { faker } from '@faker-js/faker';

// Generate realistic audit log events
export function generateSlackAuditEvent(overrides: Partial<SlackAuditEvent> = {}) {
  return {
    id: faker.string.uuid(),
    date_create: faker.date.recent().getTime() / 1000,
    action: faker.helpers.arrayElement([
      'user_login',
      'file_downloaded',
      'app_installed',
      'workflow_created'
    ]),
    actor: {
      type: 'user',
      user: {
        id: faker.string.alphanumeric(10).toUpperCase(),
        name: faker.person.fullName(),
        email: faker.internet.email()
      }
    },
    entity: {
      type: 'workspace',
      workspace: {
        id: faker.string.alphanumeric(10).toUpperCase(),
        name: faker.company.name(),
        domain: faker.internet.domainName()
      }
    },
    context: {
      ip_address: faker.internet.ipv4(),
      ua: faker.internet.userAgent(),
      session_id: faker.string.numeric(10)
    },
    ...overrides
  };
}

// Generate time series data
export function generateAuditLogTimeSeries(
  count: number,
  startDate: Date,
  endDate: Date
) {
  const events = [];
  const timeSpan = endDate.getTime() - startDate.getTime();

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(
      startDate.getTime() + Math.random() * timeSpan
    );

    events.push(
      generateSlackAuditEvent({
        date_create: timestamp.getTime() / 1000
      })
    );
  }

  return events.sort((a, b) => a.date_create - b.date_create);
}

// Seed for reproducible tests
faker.seed(12345);
const events = generateAuditLogTimeSeries(100, startDate, endDate);
```

### 4.2 Test Fixtures (Current Pattern)

```typescript
// tests/fixtures/platform-responses.ts

export const slackMockResponses = {
  authTest: {
    ok: true,
    url: 'https://testteam.slack.com/',
    team: 'Test Team',
    user: 'testuser',
    team_id: 'T123456789',
    user_id: 'U123456789'
  },

  usersList: {
    ok: true,
    members: [
      {
        id: 'U123456789',
        name: 'john.doe',
        real_name: 'John Doe',
        is_bot: false,
        profile: {
          email: '[email protected]'
        }
      },
      {
        id: 'B987654321',
        name: 'zapier',
        real_name: 'Zapier',
        is_bot: true,
        profile: {
          api_app_id: 'A1234567890',
          bot_id: 'B987654321'
        }
      }
    ]
  },

  auditLogs: {
    entries: [
      {
        id: faker.string.uuid(),
        date_create: 1698345600,
        action: 'app_installed',
        actor: {
          type: 'user',
          user: {
            id: 'U123456789',
            name: 'John Doe',
            email: '[email protected]'
          }
        },
        entity: {
          type: 'app',
          app: {
            id: 'A1234567890',
            name: 'Zapier',
            scopes: ['channels:read', 'chat:write']
          }
        }
      }
    ]
  }
};
```

### 4.3 Synthetic Time Series for Performance Testing

```typescript
// Generate realistic access patterns
export function generateRealisticAccessPattern(
  userId: string,
  days: number
): AuditLogEvent[] {
  const events: AuditLogEvent[] = [];
  const now = new Date();

  for (let day = 0; day < days; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);

    // Business hours: 9am-5pm with higher activity
    const businessHours = [9, 10, 11, 13, 14, 15, 16];

    for (const hour of businessHours) {
      // Random 0-5 events per hour
      const eventCount = Math.floor(Math.random() * 6);

      for (let i = 0; i < eventCount; i++) {
        const eventTime = new Date(date);
        eventTime.setHours(hour, Math.floor(Math.random() * 60));

        events.push({
          userId,
          timestamp: eventTime.toISOString(),
          action: faker.helpers.arrayElement([
            'file_access',
            'email_send',
            'document_edit'
          ])
        });
      }
    }

    // Occasional off-hours activity (potential bot)
    if (Math.random() < 0.3) {
      const offHour = faker.helpers.arrayElement([0, 1, 2, 3, 22, 23]);
      events.push({
        userId,
        timestamp: new Date(date.setHours(offHour)).toISOString(),
        action: 'bulk_operation'
      });
    }
  }

  return events;
}
```

---

## 5. CI/CD Testing

### 5.1 GitHub Actions Configuration

**Current Setup**: Root package.json includes Playwright test scripts.

**Recommended Enhanced Workflow**:

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: password
          POSTGRES_DB: singura_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5433:5432

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run linter
        run: pnpm run lint

      - name: Type check
        run: |
          cd backend && pnpm run verify:types
          cd ../frontend && pnpm run verify:types

      - name: Run unit tests
        run: pnpm run test:backend
        env:
          NODE_ENV: test
          DATABASE_URL: postgresql://postgres:password@localhost:5433/singura_test
          REDIS_URL: redis://localhost:6379

      - name: Run integration tests
        run: cd backend && pnpm run test:integration
        env:
          NODE_ENV: test
          DATABASE_URL: postgresql://postgres:password@localhost:5433/singura_test

      - name: Install Playwright browsers
        run: pnpm run test:e2e:install

      - name: Run E2E tests
        run: pnpm run test:e2e
        env:
          NODE_ENV: test

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage/lcov.info
          flags: backend
          name: backend-coverage

      - name: Jest Coverage Comment
        uses: ArtiomTr/jest-coverage-report-action@v2
        if: github.event_name == 'pull_request'
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          test-script: pnpm run test:coverage
          coverage-file: ./backend/coverage/coverage-summary.json
          base-coverage-file: ./backend/coverage/coverage-summary.json
```

### 5.2 Coverage Reporting

**Codecov Integration**:

```yaml
# codecov.yml
coverage:
  status:
    project:
      default:
        target: 80%
        threshold: 1%
    patch:
      default:
        target: 80%

ignore:
  - "**/*.test.ts"
  - "**/*.spec.ts"
  - "**/tests/**"
  - "**/__tests__/**"
  - "**/node_modules/**"
```

---

## 6. Performance Testing

### 6.1 Artillery for Load Testing

**Not currently in Singura** - Recommended for API load testing.

```bash
pnpm add -D artillery
```

```yaml
# artillery-config.yml
config:
  target: "http://localhost:3001"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100
      name: "Peak load"
  environments:
    staging:
      target: "https://api-staging.singura.com"
    production:
      target: "https://api.singura.com"

scenarios:
  - name: "Discovery API Flow"
    flow:
      - post:
          url: "/api/discovery/slack/trigger"
          headers:
            Authorization: "Bearer {{ $processEnvironment.TEST_TOKEN }}"
          json:
            organizationId: "{{ $randomString() }}"
            connectionId: "{{ $randomString() }}"
      - get:
          url: "/api/automations"
          headers:
            Authorization: "Bearer {{ $processEnvironment.TEST_TOKEN }}"
      - think: 2
```

```bash
# Run performance tests
artillery run artillery-config.yml
artillery run --environment staging artillery-config.yml
```

### 6.2 Autocannon for HTTP Benchmarking

```bash
pnpm add -D autocannon
```

```typescript
// tests/performance/api-benchmark.ts
import autocannon from 'autocannon';

describe('API Performance Benchmarks', () => {
  it('should handle 100 concurrent connections', async () => {
    const result = await autocannon({
      url: 'http://localhost:3001/api/health',
      connections: 100,
      duration: 30,
      pipelining: 1
    });

    expect(result.requests.average).toBeGreaterThan(1000); // > 1000 req/sec
    expect(result.latency.p99).toBeLessThan(100); // < 100ms p99 latency
  });
});
```

### 6.3 Clinic.js for Profiling

**Note**: Clinic.js is not actively maintained as of 2025. Consider alternatives.

**Alternative**: Use Node.js built-in profiler:

```bash
# Generate CPU profile
node --cpu-prof src/server.js

# Analyze with Chrome DevTools
# Open chrome://inspect, load the .cpuprofile file
```

---

## 7. Current Singura Setup

### 7.1 Test Organization

```
backend/
├── src/
│   ├── __tests__/           # Unit tests colocated with source
│   │   ├── connectors/
│   │   ├── database/
│   │   ├── integration/
│   │   └── services/
│   └── services/
│       └── __tests__/       # Service-specific tests
├── tests/                   # Integration & E2E tests
│   ├── api/
│   ├── connectors/
│   ├── database/
│   ├── e2e/
│   ├── integration/
│   ├── security/
│   ├── services/
│   ├── setup.ts            # Global test setup
│   └── env.ts              # Test environment variables
└── jest.config.js

e2e/
└── tests/
    ├── oauth-flows.spec.ts
    ├── automations-discovery.spec.ts
    └── dashboard.spec.ts
```

### 7.2 Test Coverage Requirements

```typescript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  }
}
```

**Current Status**:
- Backend: Unit tests with 80% coverage goal
- OAuth/Security: 100% coverage required
- Integration tests: Key workflows covered
- E2E: OAuth flows, discovery, dashboard

### 7.3 Running Tests

```bash
# Backend tests
cd backend
pnpm test                    # All tests
pnpm test:unit              # Unit only
pnpm test:integration       # Integration only
pnpm test:e2e              # E2E only
pnpm test:security         # Security tests
pnpm test:coverage         # With coverage

# E2E tests (root)
pnpm test:e2e              # Headless
pnpm test:e2e:headed       # With browser UI
pnpm test:e2e:debug        # Debug mode
pnpm test:e2e:ui           # Playwright UI mode
```

---

## 8. Code Examples

### 8.1 Complete Test Suite Example

```typescript
// backend/src/__tests__/services/slack-bot-detector.test.ts
import { SlackBotDetector } from '../../services/detection/slack-bot-detector';
import { SlackConnector } from '../../connectors/slack';
import { faker } from '@faker-js/faker';

// Mock Slack connector
jest.mock('../../connectors/slack');

describe('SlackBotDetector', () => {
  let detector: SlackBotDetector;
  let mockSlackConnector: jest.Mocked<SlackConnector>;

  beforeEach(() => {
    mockSlackConnector = new SlackConnector() as jest.Mocked<SlackConnector>;
    detector = new SlackBotDetector(mockSlackConnector);
    jest.clearAllMocks();
  });

  describe('detectBots', () => {
    it('should identify bot users from user list', async () => {
      const mockUsers = [
        {
          id: 'U123',
          name: 'john',
          is_bot: false
        },
        {
          id: 'B456',
          name: 'zapier',
          is_bot: true,
          profile: {
            api_app_id: 'A789',
            bot_id: 'B456'
          }
        }
      ];

      mockSlackConnector.getUsers.mockResolvedValue(mockUsers);

      const result = await detector.detectBots('org123', 'conn456');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('zapier');
      expect(result[0].platform).toBe('slack');
      expect(result[0].detectionMethod).toBe('is_bot_flag');
    });

    it('should detect bots from audit logs', async () => {
      const mockAuditLogs = [
        {
          action: 'app_installed',
          entity: {
            app: {
              id: 'A789',
              name: 'Zapier',
              scopes: ['channels:read', 'chat:write']
            }
          },
          date_create: Date.now() / 1000
        }
      ];

      mockSlackConnector.getAuditLogs.mockResolvedValue(mockAuditLogs);

      const result = await detector.detectBotsFromAuditLogs('org123', 'conn456');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Zapier');
      expect(result[0].detectionMethod).toBe('audit_log_app_installed');
    });
  });

  describe('calculateRiskScore', () => {
    it('should assign high risk to bots with sensitive scopes', () => {
      const bot = {
        id: 'B123',
        name: 'automation-bot',
        scopes: [
          'admin',
          'files:write',
          'users:write'
        ]
      };

      const riskScore = detector.calculateRiskScore(bot);

      expect(riskScore).toBeGreaterThanOrEqual(70);
    });

    it('should assign low risk to read-only bots', () => {
      const bot = {
        id: 'B456',
        name: 'status-checker',
        scopes: [
          'channels:read',
          'users:read'
        ]
      };

      const riskScore = detector.calculateRiskScore(bot);

      expect(riskScore).toBeLessThanOrEqual(30);
    });
  });
});
```

### 8.2 Integration Test with Database

```typescript
// backend/tests/integration/discovery-flow.test.ts
import { db } from '../../src/database/pool';
import { discoveryService } from '../../src/services/discovery';
import { slackConnector } from '../../src/connectors/slack';

describe('Discovery Flow Integration', () => {
  let testOrganizationId: string;
  let testConnectionId: string;

  beforeAll(async () => {
    // Create test organization
    const orgResult = await db.query(`
      INSERT INTO organizations (name, domain, slug)
      VALUES ('Test Org', 'test.example.com', 'test-org-${Date.now()}')
      RETURNING id
    `);
    testOrganizationId = orgResult.rows[0].id;

    // Create test connection
    const connResult = await db.query(`
      INSERT INTO platform_connections (
        organization_id, platform_type, status
      ) VALUES ($1, 'slack', 'active')
      RETURNING id
    `, [testOrganizationId]);
    testConnectionId = connResult.rows[0].id;
  });

  afterAll(async () => {
    // Cleanup
    await db.query('DELETE FROM platform_connections WHERE id = $1', [testConnectionId]);
    await db.query('DELETE FROM organizations WHERE id = $1', [testOrganizationId]);
  });

  it('should complete full discovery flow', async () => {
    // Trigger discovery
    const result = await discoveryService.triggerDiscovery(
      testOrganizationId,
      testConnectionId
    );

    expect(result.status).toBe('completed');

    // Verify automations were stored
    const automationsResult = await db.query(`
      SELECT * FROM discovered_automations
      WHERE organization_id = $1
    `, [testOrganizationId]);

    expect(automationsResult.rows.length).toBeGreaterThan(0);
  });
});
```

### 8.3 E2E Test with Playwright

```typescript
// e2e/tests/oauth-flows.spec.ts
import { test, expect } from '@playwright/test';

test.describe('OAuth Flows', () => {
  test('should complete Slack OAuth flow', async ({ page, context }) => {
    // Login to Singura
    await page.goto('http://localhost:3000');
    await page.click('text=Sign In');

    // Clerk authentication (mocked in test)
    await page.fill('[name="identifier"]', '[email protected]');
    await page.click('button:has-text("Continue")');

    // Navigate to connections
    await page.click('text=Connections');

    // Initiate Slack OAuth
    await page.click('button:has-text("Connect Slack")');

    // Should redirect to Slack OAuth
    await page.waitForURL(/slack.com\/oauth\/v2\/authorize/);

    // Mock Slack authorization
    await context.route('**/oauth/v2/authorize', async route => {
      await route.fulfill({
        status: 302,
        headers: {
          location: `http://localhost:3000/oauth/slack/callback?code=test-code-${Date.now()}`
        }
      });
    });

    // Click authorize
    await page.click('button:has-text("Authorize")');

    // Should return to dashboard with new connection
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('text=Slack connected successfully')).toBeVisible();
  });
});
```

---

## 9. Recommendations

### 9.1 Immediate Actions

1. **Add Faker.js** for realistic test data generation
   ```bash
   pnpm add -D @faker-js/faker
   ```

2. **Add Nock** for HTTP mocking in integration tests
   ```bash
   pnpm add -D nock @types/node
   ```

3. **Add mock-jwks** for JWT testing
   ```bash
   pnpm add -D mock-jwks
   ```

4. **Create test fixtures directory**
   ```bash
   mkdir -p backend/tests/fixtures
   ```

### 9.2 Medium-Term Improvements

1. **Add Artillery** for load testing
2. **Set up Codecov** for coverage tracking
3. **Implement test data factories** using Faker.js
4. **Add performance benchmarks** with Autocannon

### 9.3 Testing Strategy Enhancements

1. **Contract Testing**: Add Pact or similar for API contract tests
2. **Snapshot Testing**: Use Jest snapshots for API response validation
3. **Visual Regression**: Add Percy or Chromatic for UI testing
4. **Mutation Testing**: Add Stryker for test quality validation

---

## 10. References

### Official Documentation

- **Jest**: https://jestjs.io/docs/getting-started
- **Playwright**: https://playwright.dev/docs/intro
- **Faker.js**: https://fakerjs.dev/guide/
- **Nock**: https://github.com/nock/nock
- **Artillery**: https://www.artillery.io/docs
- **Slack API**: https://api.slack.com/
- **Google Admin SDK**: https://developers.google.com/admin-sdk
- **Microsoft Graph**: https://learn.microsoft.com/en-us/graph/

### API References

- **Slack Audit Logs**: https://api.slack.com/admins/audit-logs-api
- **Slack Web API**: https://api.slack.com/web
- **Google Reports API**: https://developers.google.com/admin-sdk/reports/reference/rest
- **Google Apps Script API**: https://developers.google.com/apps-script/api/reference/rest
- **Microsoft Graph Audit**: https://learn.microsoft.com/en-us/graph/api/resources/azure-ad-auditlog-overview

### Best Practices

- **TypeScript Testing**: https://www.typescriptlang.org/docs/handbook/testing.html
- **Jest Best Practices**: https://github.com/goldbergyoni/javascript-testing-best-practices
- **OAuth Testing**: https://oauth.net/2/testing/

---

## Appendix A: Quick Reference

### Mock Platform Credentials

```typescript
// Slack
accessToken: 'xoxb-mock-slack-token'
scopes: 'channels:read,users:read,team:read'

// Google
accessToken: 'ya29.mock-google-token'
scopes: 'https://www.googleapis.com/auth/drive.readonly'

// Microsoft
accessToken: 'EwB4A+mock+microsoft+token'
scopes: 'https://graph.microsoft.com/AuditLog.Read.All'
```

### Common Test Commands

```bash
# Backend
pnpm test                      # All tests
pnpm test:unit                # Unit only
pnpm test:integration         # Integration only
pnpm test:coverage            # With coverage
pnpm test:watch               # Watch mode

# E2E
pnpm test:e2e                 # All E2E
pnpm test:e2e:headed          # With UI
pnpm test:e2e:debug           # Debug mode

# CI
pnpm run verify               # Full verification
```

### Coverage Thresholds

- **Global**: 80% (branches, functions, lines, statements)
- **OAuth/Security**: 100% required
- **New code**: 80% minimum

---

**End of Documentation**
