# SaaS X-Ray Code Patterns

This document contains validated code patterns, implementation examples, and best practices for SaaS X-Ray development.

---

## TypeScript Patterns

### 1. Shared-Types Import Pattern

**MANDATORY**: All API contracts, database models, and common types MUST come from `@saas-xray/shared-types`.

```typescript
// ✅ CORRECT: Import from shared-types package
import {
  OAuthCredentials,
  ExtendedTokenResponse,
  ConnectionResult,
  AutomationEvent,
  User,
  PlatformType
} from '@saas-xray/shared-types';

// ❌ INCORRECT: Local type definitions for API contracts
interface OAuthCredentials {
  // This will be rejected in PR review
  accessToken: string;
}
```

**Build Order Requirements**:
1. `@saas-xray/shared-types` MUST build first
2. Backend can then import and compile
3. Frontend imports compiled shared-types
4. All CI/CD pipelines MUST respect this order

### 2. Explicit Return Types

**MANDATORY**: Every function MUST have explicit return types.

```typescript
// ✅ CORRECT: Explicit return type
function createUser(request: CreateUserRequest): Promise<CreateUserResponse> {
  return userRepository.create(request);
}

async function findUserById(id: string): Promise<User | null> {
  const user = await userRepository.findById(id);
  return user;
}

// ❌ INCORRECT: No return type (will fail CI/CD)
function createUser(request: CreateUserRequest) {
  return userRepository.create(request);
}
```

### 3. Type Guards for External Data

**MANDATORY**: Use type guards for all external data (API responses, user input, database results).

```typescript
// Type guard for runtime validation
function isValidOAuthResponse(data: unknown): data is OAuthCredentials {
  const candidate = data as OAuthCredentials;
  return (
    typeof candidate.accessToken === 'string' &&
    typeof candidate.platform === 'string' &&
    (candidate.expiresAt === undefined || candidate.expiresAt instanceof Date)
  );
}

// Usage
async function handleOAuthCallback(response: unknown): Promise<OAuthCredentials> {
  if (!isValidOAuthResponse(response)) {
    throw new Error('Invalid OAuth response format');
  }
  return response; // Type-safe now
}
```

### 4. Discriminated Union Types

**RECOMMENDED**: Use discriminated unions for API results and state management.

```typescript
// API result pattern
type APIResult<T> =
  | { status: 'success'; data: T; timestamp: Date }
  | { status: 'error'; error: string; code: string; timestamp: Date }
  | { status: 'loading'; progress?: number };

// Usage with type narrowing
function handleResult<T>(result: APIResult<T>): void {
  switch (result.status) {
    case 'success':
      console.log(result.data); // TypeScript knows 'data' exists
      break;
    case 'error':
      console.error(result.error); // TypeScript knows 'error' exists
      break;
    case 'loading':
      console.log(result.progress); // TypeScript knows 'progress' may exist
      break;
  }
}
```

---

## Service Singleton Pattern (CRITICAL)

### The Problem: State Loss

**CRITICAL ISSUE**: Creating new service instances in constructors or on each request causes **STATE LOSS**.

```typescript
// ❌ WRONG: Each request creates NEW instance = credentials disappear
export class RealDataProvider {
  private oauthStorage: OAuthCredentialStorageService;

  constructor() {
    this.oauthStorage = new OAuthCredentialStorageService(); // ❌ NEW INSTANCE!
  }
}

// What happens:
// 1. OAuth callback stores credentials in instance A
// 2. Discovery request creates instance B (empty credentials)
// 3. Discovery fails: "No OAuth credentials found"
```

### The Solution: Singleton Export Pattern

**MANDATORY PATTERN**: Export singleton from service file, import everywhere.

```typescript
// ✅ CORRECT: Service file (oauth-credential-storage-service.ts)
export class OAuthCredentialStorageService {
  private credentialStore = new Map<string, OAuthCredentials>();

  async storeCredentials(
    connectionId: string,
    credentials: OAuthCredentials
  ): Promise<void> {
    this.credentialStore.set(connectionId, credentials);
    // Also persist to database...
  }

  async getCredentials(connectionId: string): Promise<OAuthCredentials | null> {
    return this.credentialStore.get(connectionId) || null;
  }
}

// Export singleton instance at end of file
export const oauthCredentialStorage = new OAuthCredentialStorageService();

// ✅ CORRECT: Consuming files (data-provider.ts, simple-server.ts)
import { oauthCredentialStorage } from './oauth-credential-storage-service';

export class RealDataProvider {
  private oauthStorage = oauthCredentialStorage; // ✅ SHARED SINGLETON!

  async discoverAutomations(connectionId: string) {
    const credentials = await this.oauthStorage.getCredentials(connectionId);
    // Credentials persist across requests!
  }
}
```

### When to Use Singleton Pattern

**MUST use singleton** (state shared across requests):
- ✅ `oauthCredentialStorage` - OAuth credential management
- ✅ `hybridStorage` - Connection metadata storage
- ✅ Any service that caches data between requests
- ✅ Any service that maintains WebSocket connections
- ✅ Any service that manages rate limiting state

**Can use per-request instances** (stateless or request-scoped):
- ✅ Request-specific validators
- ✅ Per-request loggers
- ✅ Temporary data processors

**Validation Checklist**:
- [ ] Does this service store state between requests?
- [ ] Is this service being used by multiple modules?
- [ ] Could creating multiple instances cause data loss?

**If YES to any** → **MUST USE SINGLETON PATTERN**

---

## Repository Pattern (T | null)

### Standardized Repository Interface

**MANDATORY**: All repositories MUST use standardized T | null return pattern.

```typescript
// Standard repository interface
interface Repository<T, CreateInput = Omit<T, 'id'>, UpdateInput = Partial<T>> {
  create(data: CreateInput): Promise<T>;
  findById(id: string): Promise<T | null>;  // Standardized null handling
  update(id: string, data: UpdateInput): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  findAll(filters?: Partial<T>): Promise<T[]>;
}

// Real implementation example
class UserRepository implements Repository<User, CreateUserInput, UpdateUserInput> {
  async findById(id: string): Promise<User | null> {
    const result = await this.db.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;  // Explicit null handling
  }

  async create(data: CreateUserInput): Promise<User> {
    const result = await this.db.query(
      'INSERT INTO users (email, name, organization_id) VALUES ($1, $2, $3) RETURNING *',
      [data.email, data.name, data.organizationId]
    );
    return result.rows[0]; // Type-safe return
  }
}
```

### Benefits of T | null Pattern

1. **Explicit Null Handling**: Callers MUST handle null case
2. **Type Safety**: TypeScript enforces null checks
3. **No Exceptions for Not Found**: Consistent error handling
4. **Better Performance**: No need for try/catch on simple queries

```typescript
// Usage with explicit null handling
const user = await userRepository.findById(userId);
if (!user) {
  return res.status(404).json({ error: 'User not found' });
}
// TypeScript knows 'user' is non-null here
console.log(user.email);
```

---

## OAuth Integration Patterns

### 1. Complete OAuth Flow (Validated Working Pattern)

```typescript
// STEP 1: OAuth Callback Handler (simple-server.ts)
app.get('/api/auth/callback/slack', async (req, res) => {
  const { code } = req.query;

  // Exchange authorization code for access tokens
  const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      code: code as string,
      redirect_uri: redirectUri
    })
  });

  const tokenData = await tokenResponse.json() as ExtendedTokenResponse;

  // STEP 2: Store connection metadata in hybridStorage
  const storageResult = await hybridStorage.storeConnection({
    organization_id: organizationId,
    platform_type: 'slack',
    platform_user_id: tokenData.userId || tokenData.teamId,
    display_name: `Slack - ${tokenData.teamName}`,
    permissions_granted: tokenData.scope.split(',')
  });

  // STEP 3: Store OAuth credentials in singleton (CRITICAL!)
  await oauthCredentialStorage.storeCredentials(storageResult.data.id, {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: new Date(Date.now() + tokenData.expiresIn * 1000),
    platform: 'slack',
    scope: tokenData.scope.split(',')
  });

  res.redirect('http://localhost:4200/connections?status=success');
});

// STEP 4: Discovery Handler (data-provider.ts)
async discoverAutomations(connectionId: string): Promise<AutomationEvent[]> {
  // Get connection metadata
  const connection = await hybridStorage.getConnectionById(connectionId);
  if (!connection) {
    throw new Error('Connection not found');
  }

  // Get OAuth credentials from SINGLETON (shares state with callback!)
  const credentials = await oauthCredentialStorage.getCredentials(connectionId);
  if (!credentials) {
    throw new Error('OAuth credentials not found');
  }

  // Authenticate API client
  const connector = this.getConnector(connection.platform_type);
  await connector.authenticate(credentials);

  // Make real API calls
  const automations = await connector.discoverAutomations();
  return automations; // Real data!
}
```

### 2. Dual Storage Architecture

**CRITICAL PATTERN**: Connection metadata and OAuth credentials stored separately but linked.

```typescript
// Connection metadata → hybridStorage (database + memory)
const connectionResult = await hybridStorage.storeConnection({
  organization_id: 'org-123',
  platform_type: 'slack',
  platform_user_id: 'U12345',
  display_name: 'Slack - ACME Corp',
  permissions_granted: ['users:read', 'team:read']
});

// OAuth credentials → oauthCredentialStorage (singleton, encrypted)
await oauthCredentialStorage.storeCredentials(
  connectionResult.data.id, // SAME connection ID!
  {
    accessToken: 'xoxb-...',
    refreshToken: 'xoxr-...',
    expiresAt: new Date('2025-12-31'),
    platform: 'slack',
    scope: ['users:read', 'team:read']
  }
);

// Retrieval uses SAME connection ID
const connection = await hybridStorage.getConnectionById(connectionId);
const credentials = await oauthCredentialStorage.getCredentials(connectionId);
```

**Why Dual Storage?**
- **Performance**: Memory cache for fast access
- **Persistence**: Database survives restarts
- **Security**: Credentials encrypted separately
- **Scalability**: Can separate credential storage later

### 3. OAuth Scope Validation

**VALIDATED SCOPES** (tested with real APIs):

```typescript
// Slack minimum scopes for bot discovery
const slackScopes = [
  'users:read',              // Required for users.list API
  'team:read',               // Required for team.info API
  'channels:read',           // Channel information
  'usergroups:read',         // User groups
  'workflow.steps:execute',  // Workflow detection
  'commands'                 // Slash command detection
];

// Google Workspace minimum scopes for automation discovery
const googleScopes = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/script.projects.readonly',      // Apps Script
  'https://www.googleapis.com/auth/admin.directory.user.readonly', // Service accounts
  'https://www.googleapis.com/auth/admin.reports.audit.readonly',  // Audit logs
  'https://www.googleapis.com/auth/drive.metadata.readonly'        // Drive metadata
];
```

### 4. Slack API Discovery Methods (Validated)

**CRITICAL**: Some Slack API methods DON'T EXIST. Use these instead:

```typescript
// ❌ WRONG: These methods DON'T EXIST
await client.apps.list();    // No such method in Slack Web API
await client.bots.list();    // No such method in Slack Web API

// ✅ CORRECT: Use these methods instead
const usersResult = await client.users.list();  // Returns all users including bots
const botUsers = usersResult.members?.filter(user => user.is_bot === true) || [];

// Bot information is in user.profile - no need for separate bots.info call
const botInfo = {
  userId: botUser.id,
  name: botUser.profile?.real_name || botUser.name,
  appId: botUser.profile?.app_id,
  botId: botUser.profile?.bot_id,
  isBot: botUser.is_bot,
  deleted: botUser.deleted
};
```

---

## Clerk Authentication Patterns

### 1. Organization ID Extraction

**MANDATORY**: All requests MUST extract Clerk organization ID from headers.

```typescript
// Middleware pattern (clerk-auth.ts)
export async function extractClerkOrganizationId(
  req: Request
): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const payload = await clerkClient.verifyToken(token);
    return payload.org_id || null;
  } catch (error) {
    console.error('Failed to verify Clerk token:', error);
    return null;
  }
}

// Usage in route handlers
app.get('/api/connections', async (req, res) => {
  const organizationId = await extractClerkOrganizationId(req);
  if (!organizationId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const connections = await hybridStorage.getConnections(organizationId);
  res.json({ connections });
});
```

### 2. Multi-tenant Data Scoping

**MANDATORY**: All database queries MUST scope to organization ID.

```typescript
// Repository with organization scoping
class PlatformConnectionRepository {
  async findByOrganization(organizationId: string): Promise<PlatformConnection[]> {
    const result = await this.db.query(
      'SELECT * FROM platform_connections WHERE organization_id = $1',
      [organizationId]
    );
    return result.rows;
  }

  async create(
    data: CreateConnectionInput,
    organizationId: string
  ): Promise<PlatformConnection> {
    const result = await this.db.query(
      `INSERT INTO platform_connections
       (organization_id, platform_type, platform_user_id, display_name)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [organizationId, data.platform_type, data.platform_user_id, data.display_name]
    );
    return result.rows[0];
  }
}
```

---

## Database Migration Patterns

### Automated Migration Runner

**MANDATORY**: All migrations MUST go through automated runner (no manual SQL execution).

```typescript
// Migration file naming: XXX_description.sql
// Example: 005_add_audit_logs_table.sql

-- Create audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Create index for performance
CREATE INDEX idx_audit_logs_org_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

**Migration System**:
1. Create migration file in `/backend/migrations/`
2. Use sequential numbering (005_your_change.sql)
3. Automated runner applies on server startup
4. Tracked in `schema_migrations` table
5. Server exits if migrations fail

**Verification**:
```bash
export PGPASSWORD=password
psql -h localhost -p 5433 -U postgres -d saas_xray \
  -c "SELECT * FROM schema_migrations ORDER BY applied_at DESC;"
```

---

## JSONB Column Patterns

### JSONB Storage and Retrieval

**CRITICAL**: JSONB columns accept objects directly (not JSON strings).

```typescript
// ✅ CORRECT: Store object directly
await db.query(
  'INSERT INTO platform_connections (metadata) VALUES ($1)',
  [{ teamName: 'ACME Corp', scopes: ['read', 'write'] }] // Object, not JSON.stringify()
);

// ✅ CORRECT: Retrieve as object
const result = await db.query('SELECT metadata FROM platform_connections WHERE id = $1', [id]);
const metadata = result.rows[0].metadata; // Already an object
console.log(metadata.teamName); // Direct property access

// ❌ INCORRECT: JSON.stringify() causes double-encoding
await db.query(
  'INSERT INTO platform_connections (metadata) VALUES ($1)',
  [JSON.stringify({ teamName: 'ACME Corp' })] // ❌ Results in string, not object
);
```

### JSONB Query Patterns

```typescript
// Query JSONB fields
const connections = await db.query(
  `SELECT * FROM platform_connections
   WHERE metadata->>'teamName' = $1`,
  ['ACME Corp']
);

// Update JSONB fields
await db.query(
  `UPDATE platform_connections
   SET metadata = jsonb_set(metadata, '{lastSync}', $1)
   WHERE id = $2`,
  [JSON.stringify(new Date()), connectionId]
);
```

---

## Testing Patterns

### Type-Safe Mocks

```typescript
// ✅ CORRECT: Type-safe mocks with proper interfaces
const mockSlackAPI = {
  oauth: {
    v2: {
      access: jest.fn().mockResolvedValue({
        ok: true,
        access_token: 'mock-token',
        scope: 'channels:read,users:read',
        team: { id: 'T12345', name: 'ACME Corp' }
      } as SlackOAuthResponse)
    }
  }
} as jest.Mocked<WebClient>;

// ❌ INCORRECT: Untyped mocks (no type safety)
const mockSlackAPI = {
  oauth: { v2: { access: jest.fn() } }
};
```

### Centralized Test Fixtures

```typescript
// test-fixtures.ts
export const TEST_USER: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  organizationId: 'test-org-id',
  createdAt: new Date('2025-01-01')
};

export const TEST_OAUTH_CREDENTIALS: OAuthCredentials = {
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token',
  expiresAt: new Date('2025-12-31'),
  scope: ['channels:read', 'users:read'],
  platform: 'slack'
};

// Usage in tests
import { TEST_USER, TEST_OAUTH_CREDENTIALS } from './test-fixtures';

describe('UserService', () => {
  it('should create user with valid data', async () => {
    const result = await userService.create(TEST_USER);
    expect(result).toMatchObject(TEST_USER);
  });
});
```

---

## Browser Testing MCP Patterns

### Tool Selection: Chrome DevTools MCP vs Playwright MCP

**DEFAULT TOOL**: Chrome DevTools MCP (`mcp__chrome-devtools`)

**RULE**: Use Chrome DevTools MCP for all browser interactions unless you need Playwright's specific E2E capabilities.

### Chrome DevTools MCP (Primary Tool)

**Use for:**
- Screenshots and visual verification
- UI debugging and development
- Form interactions and testing
- Console log inspection
- Network request monitoring
- Live DOM inspection
- Navigation and page state verification

**Key Features:**
```typescript
// Screenshot capture
await mcp__chrome-devtools__take_screenshot({
  filename: 'landing-page.png',
  fullPage: true
});

// Form filling
await mcp__chrome-devtools__fill_form({
  fields: [
    { name: 'email', value: 'test@example.com', type: 'textbox' },
    { name: 'password', value: 'test123', type: 'textbox' }
  ]
});

// Console monitoring
const messages = await mcp__chrome-devtools__list_console_messages({
  onlyErrors: true
});

// Network inspection
const requests = await mcp__chrome-devtools__list_network_requests();
```

**CRITICAL: Isolated Mode Requirement**

Always run Chrome DevTools MCP in isolated mode to enable multiple browser instances:

```bash
# Kill existing Chrome processes first
ps aux | grep -i "chrome\|chromium" | grep -v grep | awk '{print $2}' | xargs kill -9

# Run with --isolated flag
chrome-devtools-mcp --isolated
```

**Why Isolated Mode:**
- Prevents "browser already running" errors
- Enables parallel test execution
- Allows concurrent UI testing across different pages
- Required for automated E2E workflows

**Common Error Without --isolated:**
```
Error: The browser is already running for /Users/username/.cache/chrome-devtools-mcp/chrome-profile.
Use --isolated to run multiple browser instances.
```

### Playwright MCP (Specialized Tool)

**ONLY use for:**
- Complex E2E test suites with multiple scenarios
- Accessibility tree-based element selection (when Chrome DevTools snapshot fails)
- Multi-browser testing (Chrome, Firefox, Safari)
- CI/CD automated testing pipelines
- Advanced test automation features (fixtures, test isolation)

**Example: When Playwright is appropriate**
```typescript
// Complex E2E flow requiring Playwright's advanced features
await mcp__playwright__browser_navigate({ url: 'http://localhost:4200' });
await mcp__playwright__browser_fill_form({
  fields: [
    { name: 'Search', ref: 'input[role="searchbox"]', value: 'automation', type: 'textbox' }
  ]
});
await mcp__playwright__browser_click({
  element: 'Submit button',
  ref: 'button[type="submit"]'
});
await mcp__playwright__browser_wait_for({ text: 'Results loaded' });
```

### Decision Tree

```
User wants to interact with browser
  │
  ├─ Taking screenshots? → Chrome DevTools MCP
  ├─ Debugging UI issues? → Chrome DevTools MCP
  ├─ Filling forms? → Chrome DevTools MCP
  ├─ Checking console logs? → Chrome DevTools MCP
  ├─ Monitoring network? → Chrome DevTools MCP
  ├─ Simple navigation? → Chrome DevTools MCP
  │
  └─ Complex E2E test suite with multiple scenarios? → Playwright MCP
     └─ Multi-browser testing? → Playwright MCP
        └─ CI/CD pipeline automation? → Playwright MCP
```

### Examples: Common Tasks

**Taking Screenshots (Chrome DevTools)**
```typescript
// ✅ CORRECT: Use Chrome DevTools for screenshots
await mcp__chrome-devtools__take_screenshot({
  filename: 'dashboard-view.png',
  fullPage: true
});

// Element-specific screenshot
await mcp__chrome-devtools__take_screenshot({
  filename: 'hero-section.png',
  element: 'Hero section',
  fullPage: false
});
```

**Form Testing (Chrome DevTools)**
```typescript
// ✅ CORRECT: Use Chrome DevTools for form interactions
await mcp__chrome-devtools__navigate_page({
  url: 'http://localhost:4200/login'
});

await mcp__chrome-devtools__fill_form({
  fields: [
    { name: 'email', value: 'test@example.com', type: 'textbox' },
    { name: 'password', value: 'test123', type: 'textbox' }
  ]
});

await mcp__chrome-devtools__click({
  selector: 'button[type="submit"]'
});
```

**Debugging Console Errors (Chrome DevTools)**
```typescript
// ✅ CORRECT: Use Chrome DevTools for console inspection
const errors = await mcp__chrome-devtools__list_console_messages({
  onlyErrors: true
});

console.log('Found console errors:', errors);
```

**Network Request Monitoring (Chrome DevTools)**
```typescript
// ✅ CORRECT: Use Chrome DevTools for network monitoring
await mcp__chrome-devtools__navigate_page({
  url: 'http://localhost:4200/dashboard'
});

const requests = await mcp__chrome-devtools__list_network_requests();
const apiCalls = requests.filter(r => r.url.includes('/api/'));
console.log('API calls made:', apiCalls.length);
```

### Anti-Patterns

**❌ INCORRECT: Using Playwright for simple screenshots**
```typescript
// Don't do this - overhead is unnecessary
await mcp__playwright__browser_navigate({ url: 'http://localhost:4200' });
await mcp__playwright__browser_take_screenshot({ filename: 'page.png' });
```

**✅ CORRECT: Use Chrome DevTools instead**
```typescript
await mcp__chrome-devtools__navigate_page({ url: 'http://localhost:4200' });
await mcp__chrome-devtools__take_screenshot({ filename: 'page.png' });
```

---

## Performance Optimization Patterns

### Database Query Optimization

```typescript
// ✅ CORRECT: Use indexes for frequent queries
CREATE INDEX idx_platform_connections_org_id ON platform_connections(organization_id);
CREATE INDEX idx_automations_connection_id ON automations(connection_id);

// ✅ CORRECT: Use LIMIT and OFFSET for pagination
const automations = await db.query(
  `SELECT * FROM automations
   WHERE organization_id = $1
   ORDER BY created_at DESC
   LIMIT $2 OFFSET $3`,
  [organizationId, limit, offset]
);

// ❌ INCORRECT: Fetching all rows (performance killer)
const allAutomations = await db.query('SELECT * FROM automations');
```

### Memory Cache Pattern

```typescript
// Hybrid storage with memory cache + database persistence
class HybridStorage {
  private cache = new Map<string, PlatformConnection>();

  async getConnection(id: string): Promise<PlatformConnection | null> {
    // Check cache first
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    // Fallback to database
    const connection = await this.repository.findById(id);
    if (connection) {
      this.cache.set(id, connection); // Cache for next time
    }
    return connection;
  }
}
```
