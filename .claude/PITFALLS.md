# SaaS X-Ray Critical Pitfalls

This document contains all critical pitfalls discovered during development, complete with symptoms, root causes, and permanent solutions.

**PURPOSE**: Prevent recurring issues by documenting what went wrong and how to avoid it.

---

## Pitfall #1: Service Instance State Loss (CRITICAL)

### Symptom
- OAuth credentials stored successfully in callback
- Discovery request fails with "No OAuth credentials found"
- Credentials appear to vanish between requests
- No database errors, but state doesn't persist

### Root Cause
Creating new service instances in constructors or on each request causes **STATE LOSS**.

```typescript
// ❌ PROBLEM CODE
export class RealDataProvider {
  private oauthStorage: OAuthCredentialStorageService;

  constructor() {
    this.oauthStorage = new OAuthCredentialStorageService(); // ❌ NEW INSTANCE EACH TIME!
  }
}

// What happens:
// 1. OAuth callback creates RealDataProvider instance A
// 2. Instance A creates OAuthCredentialStorageService instance A
// 3. Credentials stored in instance A's Map
// 4. Discovery request creates RealDataProvider instance B
// 5. Instance B creates NEW OAuthCredentialStorageService instance B (empty Map!)
// 6. Discovery fails: "No credentials found"
```

### Solution: Singleton Export Pattern

**MANDATORY FIX**: Export singleton from service file, import everywhere.

```typescript
// ✅ CORRECT: Service file (oauth-credential-storage-service.ts)
export class OAuthCredentialStorageService {
  private credentialStore = new Map<string, OAuthCredentials>();

  async storeCredentials(
    connectionId: string,
    credentials: OAuthCredentials
  ): Promise<void> {
    this.credentialStore.set(connectionId, credentials);
    console.log(`✅ Stored credentials for connection: ${connectionId}`);
  }

  async getCredentials(connectionId: string): Promise<OAuthCredentials | null> {
    const credentials = this.credentialStore.get(connectionId);
    console.log(`🔍 Retrieved credentials for connection: ${connectionId} - ${credentials ? 'Found' : 'Not found'}`);
    return credentials || null;
  }
}

// Export singleton instance at end of file
export const oauthCredentialStorage = new OAuthCredentialStorageService();

// ✅ CORRECT: All consuming files
import { oauthCredentialStorage } from './oauth-credential-storage-service';

export class RealDataProvider {
  private oauthStorage = oauthCredentialStorage; // ✅ SHARED SINGLETON!
}

// simple-server.ts
import { oauthCredentialStorage } from './oauth-credential-storage-service';

app.get('/api/auth/callback/slack', async (req, res) => {
  await oauthCredentialStorage.storeCredentials(connectionId, credentials); // ✅ SHARED SINGLETON!
});
```

### Prevention Checklist

Before deploying any service, ask:
- [ ] Does this service store state between requests?
- [ ] Is this service being used by multiple modules?
- [ ] Could creating multiple instances cause data loss?

**If YES to any** → **MUST USE SINGLETON PATTERN**

### Services That MUST Use Singleton

- ✅ `oauthCredentialStorage` - OAuth credential management
- ✅ `hybridStorage` - Connection metadata storage
- ✅ Any service with in-memory cache
- ✅ Any service with WebSocket connections
- ✅ Any service with rate limiting state

---

## Pitfall #2: Slack API Method Validation (CRITICAL)

### Symptom
- Code calls `client.apps.list()` or `client.bots.list()`
- TypeScript compiles without errors (if not properly typed)
- Runtime API errors: "Method not found" or similar
- Slack Web API returns errors or undefined behavior

### Root Cause
**These methods DON'T EXIST in Slack Web API!**

Many developers assume these methods exist based on API naming conventions, but Slack uses different patterns.

```typescript
// ❌ WRONG: These methods DON'T EXIST
await client.apps.list();    // No such method in Slack Web API
await client.bots.list();    // No such method in Slack Web API
await client.bots.info();    // No such method in Slack Web API

// Result: Runtime errors, API failures, or undefined behavior
```

### Solution: Use Validated Slack API Methods

**VALIDATED WORKING METHODS**:

```typescript
// ✅ CORRECT: Use users.list() to get all users including bots
const usersResult = await client.users.list();

// Filter for bots
const botUsers = usersResult.members?.filter(user => user.is_bot === true) || [];

// Bot information is in user.profile - no need for separate bots.info call
const botInfo = {
  userId: botUser.id,
  name: botUser.profile?.real_name || botUser.name,
  displayName: botUser.profile?.display_name,
  appId: botUser.profile?.app_id,
  botId: botUser.profile?.bot_id,
  isBot: botUser.is_bot,
  deleted: botUser.deleted,
  avatar: botUser.profile?.image_72
};

console.log(`Found bot: ${botInfo.name} (App ID: ${botInfo.appId})`);
```

### Validated Slack API Methods

**For Bot Discovery**:
- ✅ `users.list()` - Returns all users including bots
- ✅ `team.info()` - Returns workspace information
- ✅ `conversations.list()` - Returns channels
- ✅ `usergroups.list()` - Returns user groups

**For User Information**:
- ✅ `users.info({ user: 'U12345' })` - Get specific user (including bots)
- ✅ `users.list()` - Get all users

**For Conversations**:
- ✅ `conversations.list()` - List channels
- ✅ `conversations.info({ channel: 'C12345' })` - Get channel details
- ✅ `conversations.history({ channel: 'C12345' })` - Get messages

### Prevention

**BEFORE implementing ANY Slack API method**:
1. Check official Slack API documentation
2. Verify method exists in `@slack/web-api` TypeScript definitions
3. Test method with real Slack workspace
4. Document validated method in this file

**Resources**:
- Official Slack API: https://api.slack.com/methods
- TypeScript definitions: `node_modules/@slack/web-api/dist/types/methods.d.ts`

---

## Pitfall #3: OAuth Dual Storage Architecture (CRITICAL)

### Symptom
- Connection shows up in UI (metadata exists)
- Discovery request fails with "No OAuth credentials found"
- Database has connection record but no credentials
- OAuth callback completes successfully but credentials missing

### Root Cause
Connection metadata and OAuth credentials stored in **DIFFERENT SYSTEMS** with **DIFFERENT IDs**.

```typescript
// ❌ PROBLEM CODE
// OAuth callback stores connection metadata
const connectionResult = await hybridStorage.storeConnection({
  organization_id: orgId,
  platform_type: 'slack',
  platform_user_id: userId,
  display_name: 'Slack - ACME Corp'
});
// connectionResult.data.id = "conn-12345"

// But OAuth credentials stored with DIFFERENT ID!
await oauthCredentialStorage.storeCredentials(
  'some-other-id', // ❌ WRONG ID!
  credentials
);

// Discovery tries to retrieve credentials
const credentials = await oauthCredentialStorage.getCredentials('conn-12345');
// Result: null (credentials stored under different ID)
```

### Solution: Dual Storage with Linked IDs

**MANDATORY PATTERN**: Use SAME connection ID for both storage systems.

```typescript
// ✅ CORRECT: OAuth callback handler
app.get('/api/auth/callback/slack', async (req, res) => {
  // Exchange code for tokens
  const tokenData = await exchangeCodeForTokens(code);

  // STEP 1: Store connection metadata
  const connectionResult = await hybridStorage.storeConnection({
    organization_id: organizationId,
    platform_type: 'slack',
    platform_user_id: tokenData.userId,
    display_name: `Slack - ${tokenData.teamName}`,
    permissions_granted: tokenData.scope.split(',')
  });

  const connectionId = connectionResult.data.id; // Get connection ID

  // STEP 2: Store OAuth credentials with SAME connection ID
  await oauthCredentialStorage.storeCredentials(connectionId, {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: new Date(Date.now() + tokenData.expiresIn * 1000),
    platform: 'slack',
    scope: tokenData.scope.split(',')
  });

  console.log(`✅ Stored connection and credentials for ID: ${connectionId}`);
});

// ✅ CORRECT: Discovery handler
async function discoverAutomations(connectionId: string) {
  // Retrieve with SAME connection ID
  const connection = await hybridStorage.getConnectionById(connectionId);
  const credentials = await oauthCredentialStorage.getCredentials(connectionId);

  if (!connection || !credentials) {
    throw new Error('Connection or credentials not found');
  }

  // Both exist and are linked!
  console.log(`✅ Found connection and credentials for ID: ${connectionId}`);
}
```

### Architecture Benefits

**Why Dual Storage?**
1. **Performance**: Memory cache in `hybridStorage` for fast access
2. **Persistence**: Database in `hybridStorage` survives restarts
3. **Security**: OAuth credentials in separate singleton with encryption
4. **Scalability**: Can move credential storage to separate service later

**Storage Responsibilities**:
- `hybridStorage`: Connection metadata, display names, platform info, org ID
- `oauthCredentialStorage`: OAuth tokens (access, refresh), expiration, scopes

### Prevention

**ALWAYS verify in OAuth callback**:
```typescript
const connectionId = connectionResult.data.id;
await oauthCredentialStorage.storeCredentials(connectionId, credentials);

// Immediate verification
const retrievedCredentials = await oauthCredentialStorage.getCredentials(connectionId);
if (!retrievedCredentials) {
  console.error(`❌ CRITICAL: Failed to store credentials for ${connectionId}`);
  throw new Error('Credential storage verification failed');
}
console.log(`✅ Verified credentials stored for ${connectionId}`);
```

---

## Pitfall #4: Database Persistence Fallback (CRITICAL)

### Symptom
- OAuth credentials lost on backend restart
- Database code exists but doesn't persist
- Memory cache works during session but doesn't survive restart
- No error messages about database failures

### Root Cause
PostgreSQL Docker container not running, but code silently falls back to memory-only storage.

```typescript
// ❌ PROBLEM CODE (Silent Failure)
async storeCredentials(connectionId: string, credentials: OAuthCredentials): Promise<void> {
  // Store in memory (always works)
  this.credentialStore.set(connectionId, credentials);

  // Try to persist to database
  try {
    await db.saveCredentials(connectionId, credentials);
  } catch (error) {
    // Silent failure - no one knows database didn't work!
    console.log('Database save failed, using memory cache only');
  }
}

// What happens:
// 1. Developer forgets to start Docker containers
// 2. Code stores in memory successfully
// 3. Database save fails silently
// 4. Backend restarts → all credentials lost
// 5. Discovery fails with "No credentials found"
```

### Solution: Hybrid Pattern with Graceful Degradation

**RECOMMENDED PATTERN**: Log warnings but allow graceful degradation.

```typescript
// ✅ CORRECT: Hybrid storage with clear warnings
async storeCredentials(
  connectionId: string,
  credentials: OAuthCredentials
): Promise<void> {
  // Always store in memory first (fast, reliable)
  this.credentialStore.set(connectionId, credentials);
  console.log(`✅ Stored credentials in memory for ${connectionId}`);

  // Attempt database persistence with clear feedback
  try {
    await db.saveCredentials(connectionId, credentials);
    console.log(`✅ Persisted credentials to database for ${connectionId}`);
  } catch (dbError) {
    console.warn(`⚠️  Database unavailable for ${connectionId}, using memory cache only`);
    console.warn('⚠️  Credentials will be lost on server restart!');
    console.warn('⚠️  Run: docker compose up -d postgres');
    // Don't throw - allow system to continue with memory cache
  }
}

// Load from database on startup
async loadCredentialsFromDatabase(): Promise<void> {
  try {
    const allCredentials = await db.getAllCredentials();
    for (const [connectionId, credentials] of Object.entries(allCredentials)) {
      this.credentialStore.set(connectionId, credentials);
    }
    console.log(`✅ Loaded ${Object.keys(allCredentials).length} credentials from database`);
  } catch (dbError) {
    console.warn('⚠️  Database unavailable, starting with empty credential store');
    console.warn('⚠️  Run: docker compose up -d postgres');
  }
}
```

### Prevention

**ALWAYS verify Docker containers running**:
```bash
# Before starting backend
docker compose ps

# Expected output:
# NAME                IMAGE               STATUS
# postgres            postgres:16         Up
# redis               redis:7             Up

# If containers not running:
docker compose up -d postgres redis
```

**Startup verification in server**:
```typescript
async function startServer() {
  // Verify database connection
  try {
    await db.query('SELECT 1');
    console.log('✅ Database connection verified');
  } catch (error) {
    console.error('❌ Database connection failed');
    console.error('❌ Run: docker compose up -d postgres');
    process.exit(1); // Fail fast in production
  }

  // Continue with server startup
  const server = httpServer.listen(PORT);
  console.log(`✅ Server listening on port ${PORT}`);
}
```

---

## Pitfall #5: OAuth Scope Research Before Implementation (CRITICAL)

### Symptom
- OAuth flow completes successfully
- API calls return 0 results or empty arrays
- API returns permission errors (403, insufficient_scope)
- Discovery finds no automations despite them existing

### Root Cause
**Insufficient OAuth scopes requested** during authorization flow.

```typescript
// ❌ PROBLEM CODE
const slackScopes = ['users:read']; // Only 1 scope!

// OAuth flow succeeds with this limited scope
// But API calls fail or return empty results:
await client.team.info(); // ❌ Error: missing 'team:read' scope
await client.conversations.list(); // ❌ Error: missing 'channels:read' scope
```

### Solution: Research Minimum Scopes BEFORE Implementation

**VALIDATED SCOPES** (tested with real APIs):

```typescript
// ✅ CORRECT: Slack minimum scopes for bot discovery
const slackScopes = [
  'users:read',              // Required for users.list API
  'team:read',               // Required for team.info API
  'channels:read',           // Channel information
  'usergroups:read',         // User groups
  'workflow.steps:execute',  // Workflow detection
  'commands'                 // Slash command detection
];

// ✅ CORRECT: Google Workspace minimum scopes
const googleScopes = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/script.projects.readonly',      // Apps Script projects
  'https://www.googleapis.com/auth/admin.directory.user.readonly', // Service accounts
  'https://www.googleapis.com/auth/admin.reports.audit.readonly',  // Audit logs
  'https://www.googleapis.com/auth/drive.metadata.readonly'        // Drive metadata
];
```

### Research Process (MANDATORY)

**BEFORE implementing OAuth for ANY platform**:

1. **List Required APIs**
   ```
   What APIs do we need to call?
   - Slack: users.list, team.info, conversations.list
   - Google: script.projects.list, admin.directory.users.list
   ```

2. **Check API Documentation**
   ```
   For each API, what scopes are required?
   - users.list → requires 'users:read' scope
   - team.info → requires 'team:read' scope
   ```

3. **Aggregate All Scopes**
   ```
   Combine all required scopes into single array
   const scopes = ['users:read', 'team:read', 'channels:read'];
   ```

4. **Test with Real OAuth Flow**
   ```
   1. Authorize with aggregated scopes
   2. Test EACH API call
   3. Verify results are non-empty
   4. Document validated scopes in this file
   ```

### Scope Documentation Template

```typescript
/**
 * VALIDATED SCOPES for [Platform] [Feature]
 * Tested: [Date]
 * By: [Developer]
 *
 * Required APIs:
 * - API1 (scope1, scope2)
 * - API2 (scope3)
 *
 * Minimum scopes:
 */
const platformScopes = [
  'scope1',  // Required for API1
  'scope2',  // Required for API1
  'scope3'   // Required for API2
];
```

### Prevention

**Add to PR checklist**:
- [ ] All required APIs identified
- [ ] Minimum scopes documented
- [ ] OAuth flow tested with real account
- [ ] Each API call returns expected data
- [ ] Scopes added to this pitfall documentation

---

## Pitfall #6: Database Migrations Not Applied (CRITICAL - RECURRING ISSUE)

### Symptom
- 500 errors on DELETE endpoints
- UUID format errors: "invalid input syntax for type uuid: 'clerk-org-123'"
- Errors keep recurring after "fixes"
- Database schema doesn't match application code
- Migrations created but never applied

### Root Cause
**Migration files created but NEVER APPLIED to database.**

**Why It Recurs**:
- No migration tracking system
- No automated migration runner
- Database can be recreated from old schema
- Manual `psql -f migration.sql` easily forgotten

```typescript
// ❌ PROBLEM WORKFLOW
// 1. Developer creates migration file: 003_clerk_complete_migration.sql
// 2. Developer forgets to apply migration manually
// 3. Backend starts with old schema
// 4. Application uses Clerk string IDs ("clerk-org-123")
// 5. Database still has UUID columns
// 6. Error: invalid input syntax for type uuid: "clerk-org-123"
// 7. Developer "fixes" by converting to UUID in code
// 8. Docker container recreated → old schema returns
// 9. Error recurs!
```

### Solution: Automated Migration Runner (IMPLEMENTED 2025-10-06)

**PERMANENT FIX**: Migrations run automatically on server startup.

```typescript
// ✅ CORRECT: Server startup sequence (simple-server.ts)
import { runMigrations } from './database/migrate';

async function startServer() {
  console.log('🔄 Running database migrations...');

  // REQUIRED: Migrations run BEFORE accepting traffic
  try {
    await runMigrations();
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    process.exit(1); // Server MUST NOT start with failed migrations
  }

  // Only start server after migrations succeed
  const server = httpServer.listen(PORT);
  console.log(`✅ Server listening on port ${PORT}`);
  return server;
}

startServer();
```

**Migration Tracking System**:

```sql
-- 000_create_migration_table.sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  checksum VARCHAR(64),
  execution_time_ms INTEGER
);

-- Tracks which migrations have been applied
-- Prevents re-running migrations
-- Checksums prevent tampering
```

**Migration File Structure**:
```
backend/migrations/
├── 000_create_migration_table.sql   # Migration tracking system
├── 003_clerk_complete_migration.sql # UUID → VARCHAR(255) for Clerk IDs
└── 004_fix_audit_trigger_for_deletes.sql # Fix FK constraint on DELETE
```

### How to Create New Migration

**STEP 1: Create Migration File**
```bash
cd backend/migrations
touch 005_your_change_description.sql
```

**STEP 2: Write Migration SQL**
```sql
-- 005_add_automation_risk_scores.sql

-- Add risk_score column
ALTER TABLE automations
ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_automations_risk_score
ON automations(risk_score DESC);

-- Update existing records
UPDATE automations
SET risk_score = 50
WHERE risk_score = 0;
```

**STEP 3: Restart Server (Migration Runs Automatically)**
```bash
npm run dev
# Output:
# 🔄 Running database migrations...
# ✅ Applied migration: 005_add_automation_risk_scores.sql
# ✅ Database migrations completed successfully
```

**STEP 4: Verify Migration Applied**
```bash
export PGPASSWORD=password
psql -h localhost -p 5433 -U postgres -d saas_xray \
  -c "SELECT * FROM schema_migrations ORDER BY applied_at DESC;"

# Expected output:
# version | name                             | applied_at
# --------|----------------------------------|-------------------
# 005     | add_automation_risk_scores       | 2025-10-06 10:30:00
# 004     | fix_audit_trigger_for_deletes    | 2025-10-06 10:00:00
# 003     | clerk_complete_migration         | 2025-10-06 09:00:00
```

### Prevention (MANDATORY)

**NEVER DO THIS AGAIN**:
- ❌ Create migration file without applying it
- ❌ Assume Docker container persisted schema changes
- ❌ Fix database issues without updating migration files
- ❌ Skip migration verification after "fixing" errors
- ❌ Manually run `psql -f migration.sql` (use automated runner)

**ALWAYS DO THIS**:
- ✅ Create migration file in `/backend/migrations/`
- ✅ Use sequential numbering (005_your_change.sql)
- ✅ Let automated runner apply migrations on startup
- ✅ Verify migrations in `schema_migrations` table
- ✅ Test migrations in test database first

**Documentation**: See `/docs/DATABASE_MIGRATION_ISSUE_ROOT_CAUSE.md` for full details.

---

## Summary of Critical Pitfalls

| # | Pitfall | Impact | Prevention |
|---|---------|--------|------------|
| 1 | Service Instance State Loss | OAuth credentials vanish | Use singleton export pattern |
| 2 | Slack API Method Validation | API calls fail at runtime | Validate methods in Slack docs |
| 3 | Dual Storage Architecture | Credentials not found | Use same connection ID for both |
| 4 | Database Persistence Fallback | Data lost on restart | Verify Docker containers running |
| 5 | OAuth Scope Research | Empty API results | Research scopes BEFORE implementation |
| 6 | Migrations Not Applied | Recurring schema errors | Use automated migration runner |

**When ANY of these symptoms occur**:
1. Check this file FIRST
2. Follow the documented solution
3. Update this file if new details discovered
4. Add to PR checklist to prevent recurrence
