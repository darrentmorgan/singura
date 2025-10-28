# Singura Development Pitfalls - All 7 Lessons Learned

**Last Updated**: 2025-10-28

This document contains all critical pitfalls encountered during Singura development, with examples and solutions to prevent recurrence.

---

## Pitfall #1: Service Instance State Loss

### Problem
Creating new service instances inside functions loses state (OAuth tokens, in-memory caches).

### Example (WRONG)
```typescript
export function getOAuthTokens() {
  const storage = new OAuthCredentialStorageService(); // NEW instance each time!
  return storage.get(connectionId); // State lost!
}
```

### Solution (CORRECT)
```typescript
// Export singleton instance
export const oauthCredentialStorage = new OAuthCredentialStorageService();

// Use singleton everywhere
export function getOAuthTokens() {
  return oauthCredentialStorage.get(connectionId); // Same instance, state preserved
}
```

### References
- Pattern: `.claude/PATTERNS.md` - Singleton Services
- Fixed in: `backend/src/services/oauth-credential-storage-service.ts`

---

## Pitfall #2: Slack API Method Validation

### Problem
Assuming Slack API methods exist without verification leads to runtime errors.

### Example (WRONG)
```typescript
// These methods DON'T EXIST in Slack API:
await client.apps.list();   // ❌ No such method
await client.bots.list();   // ❌ No such method
```

### Solution (CORRECT)
```typescript
// Use ACTUAL Slack API methods:
const users = await client.users.list();
const bots = users.members.filter(u => u.is_bot === true);
```

### Prevention
1. Check Slack API docs BEFORE implementing
2. Test with real OAuth tokens
3. Validate all API methods in integration tests

### References
- Slack API: https://api.slack.com/methods
- Validated scopes: `users:read`, `team:read`, `channels:read`

---

## Pitfall #3: Dual Storage Architecture

### Problem
Storing connection metadata and OAuth credentials separately without linking them causes credential loss.

### Architecture
```
Connection Metadata → hybridStorage (DB + memory)
OAuth Credentials   → oauthCredentialStorage (singleton)
```

### Solution
**MUST use SAME connection ID for both storages:**

```typescript
// 1. Store connection metadata
await hybridStorage.set(connectionId, metadata);

// 2. Store OAuth credentials with SAME ID
await oauthCredentialStorage.set(connectionId, {
  access_token,
  refresh_token,
  // ...
});
```

### References
- Pattern: `.claude/PATTERNS.md` - Dual Storage
- Implementation: `backend/src/routes/oauth.ts`

---

## Pitfall #4: Database Persistence Fallback

### Problem
Relying only on Docker containers for PostgreSQL can fail if containers stop.

### Solution
Always implement database persistence fallback:

```typescript
try {
  // Try database first
  const data = await repository.findById(id);
  return data;
} catch (error) {
  console.warn('Database unavailable, using memory cache');
  return memoryCache.get(id);
}
```

### Prevention
1. Run PostgreSQL in Docker with volume mounts
2. Implement memory-based fallback
3. Monitor database connection health

### References
- Docker setup: `docker-compose.yml`
- Repository pattern: `backend/src/database/repositories/base.ts`

---

## Pitfall #5: OAuth Scope Research

### Problem
Implementing OAuth without researching required scopes leads to permission errors.

### Solution
**ALWAYS research scopes BEFORE implementing:**

```typescript
// Google Workspace - Validated Scopes
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/script.projects.readonly',
  'https://www.googleapis.com/auth/admin.directory.user.readonly',
  'https://www.googleapis.com/auth/admin.reports.audit.readonly'
];
```

### Prevention Checklist
- [ ] Check platform OAuth documentation
- [ ] Validate scopes in OAuth playground
- [ ] Test with real OAuth flow
- [ ] Document required scopes in code
- [ ] Add scope validation in tests

### References
- Google OAuth: https://developers.google.com/identity/protocols/oauth2/scopes
- Slack OAuth: https://api.slack.com/scopes
- Implementation: `backend/src/connectors/`

---

## Pitfall #6: Database Migrations Not Applied

### Problem
Database schema changes aren't applied automatically, causing runtime errors.

### Error Example
```
column "timestamp" of relation "audit_logs" does not exist
```

### Solution
**Automated migration runner:**

```typescript
// backend/src/simple-server.ts
async function runMigrations() {
  try {
    const result = await db.query(`
      SELECT migration_name FROM migrations
      ORDER BY created_at DESC LIMIT 1
    `);

    if (!result.rows.length || needsUpdate(result.rows[0])) {
      await applyMigrations();
    }
  } catch (error) {
    console.error('Migration check failed:', error);
  }
}
```

### Prevention
1. Run migrations on server start
2. Track applied migrations in database
3. Add migration validation to CI/CD
4. Document migration process

### References
- Migrations: `backend/src/database/migrations/`
- Runner: `backend/src/simple-server.ts`

---

## Pitfall #7: Incomplete Auth System Migration ⚠️ **NEW**

### Problem
**CRITICAL**: Migrating from one auth system (Zustand) to another (Clerk) without removing ALL old code creates conflicts and unexpected redirects.

### Symptoms
- Redirects to `/login` when clicking components
- API errors trigger navigation
- `localStorage` auth checks fail
- Two auth systems running simultaneously

### Root Cause
**API client had old Zustand auth code that intercepted errors and redirected:**

```typescript
// BAD - Old Zustand auth code (REMOVED)
private async refreshToken() {
  const token = localStorage.getItem('singura-auth'); // OLD!
  // ...
}

private handleAuthFailure() {
  localStorage.removeItem('singura-auth');
  window.location.href = '/login'; // ← REDIRECT BUG!
}
```

### Solution (COMPLETE Migration)

**1. Remove ALL old auth code from API client:**

```typescript
// BEFORE (WRONG) - Mixed auth systems
class ApiService {
  setupInterceptors() {
    // Zustand: Check localStorage
    const token = this.getAccessToken();
    config.headers.Authorization = `Bearer ${token}`;

    // Clerk: Add headers
    const clerkHeaders = getClerkAuthHeaders();
    Object.assign(config.headers, clerkHeaders);
  }
}

// AFTER (CORRECT) - Clerk only
class ApiService {
  setupInterceptors() {
    // ONLY Clerk headers
    const clerkHeaders = getClerkAuthHeaders();
    if (clerkHeaders && config.headers) {
      Object.assign(config.headers, clerkHeaders);
    }
  }
}
```

**2. Remove token refresh interceptors:**

```typescript
// REMOVED - No manual 401 retry with localStorage
this.client.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Just handle error - Clerk handles auth
    return Promise.reject(this.handleError(error));
  }
);
```

**3. Update all pages to use new auth:**

```typescript
// BEFORE (WRONG)
import { useAuthUser } from '@/stores/auth';
const user = useAuthUser();

// AFTER (CORRECT)
import { useUser } from '@clerk/clerk-react';
const { user } = useUser();
```

### Migration Checklist

When migrating auth systems, **MUST complete ALL steps:**

- [ ] **Search entire codebase for old auth:**
  ```bash
  grep -r "useAuthUser\|authStore\|localStorage.getItem('.*-auth')" src/
  ```

- [ ] **Remove from API client:**
  - [ ] Token refresh logic
  - [ ] `window.location.href` redirects
  - [ ] localStorage auth checks
  - [ ] 401 retry interceptors

- [ ] **Update all pages/components:**
  - [ ] Dashboard
  - [ ] Automations
  - [ ] Connections
  - [ ] Settings
  - [ ] Any protected routes

- [ ] **Remove old auth store:**
  - [ ] Delete `stores/auth.ts`
  - [ ] Remove from package.json if unused

- [ ] **Clear browser storage:**
  ```javascript
  localStorage.clear();
  sessionStorage.clear();
  ```

- [ ] **Test error scenarios:**
  - [ ] API errors (500, 404, etc.)
  - [ ] Network failures
  - [ ] OAuth failures
  - [ ] Verify NO redirects on non-auth errors

### Red Flags 🚨

**These patterns indicate incomplete migration:**

1. `localStorage.getItem('singura-auth')` or similar
2. `window.location.href = '/login'` in API code
3. Manual token refresh logic in interceptors
4. Axios 401 retry interceptors
5. `useAuthUser()` imports from old store
6. Both Clerk AND Zustand imports in same file

### Example: The Redirect Bug

**What happened:**
1. User clicked "Start Discovery" on `/automations`
2. API call made → backend returned error
3. Axios interceptor caught error → tried localStorage token refresh
4. Refresh failed → called `handleAuthFailure()`
5. **Hard redirect**: `window.location.href = '/login'`
6. LoginPage saw Clerk auth → redirected to `/dashboard`
7. **User stuck in redirect loop, can't use automations page**

**The fix:**
- Removed ~130 lines of Zustand auth code from `frontend/src/services/api.ts`
- Now uses ONLY Clerk headers
- Errors are just errors (no redirects)
- Page stays stable during API failures

### Prevention

**Add linting rules:**
```json
{
  "rules": {
    "no-restricted-syntax": [
      "error",
      {
        "selector": "CallExpression[callee.object.name='window'][callee.property.name='location']",
        "message": "Avoid window.location redirects in API code. Use React Router navigation."
      }
    ]
  }
}
```

**Add E2E tests:**
```typescript
test('API errors should not redirect', async () => {
  await page.goto('/automations');

  // Mock API error
  await page.route('**/api/connections/*/discover', route => {
    route.fulfill({ status: 500, body: 'Error' });
  });

  await page.click('button:has-text("Start Discovery")');

  // Should stay on /automations (not redirect)
  expect(page.url()).toContain('/automations');
});
```

### References
- **Complete fix documentation**: `docs/fixes/AUTH_REDIRECT_BUG_FIX.md`
- **Files changed**: `frontend/src/services/api.ts` (130 lines removed)
- **Git commit**: Commit `3b69415` introduced bug (incomplete migration)
- **Testing tool**: Chrome DevTools MCP (captured redirect flow)

### Lessons Learned

1. **Complete migration or don't start** - Partial migrations create conflicts
2. **API clients need extra attention** - Easy to miss during UI-focused migrations
3. **Test error paths, not just happy paths** - This bug only appeared on API errors
4. **Browser storage is persistent** - Old localStorage data can linger
5. **Use Chrome DevTools MCP for debugging** - Real-time inspection crucial for finding root cause

---

## Summary

All 7 pitfalls share common themes:
- ✅ **Complete what you start** - Don't leave partial implementations
- ✅ **Research before implementing** - Validate APIs, scopes, patterns
- ✅ **Test failure scenarios** - Errors reveal hidden bugs
- ✅ **Use singleton patterns** - Prevent state loss
- ✅ **Link related data** - Same IDs across storages
- ✅ **Plan for failures** - Database, network, OAuth
- ✅ **Automate critical processes** - Migrations, validations

**When in doubt, check this file FIRST before coding.**

---

**Document Status**: ✅ Active
**Next Review**: After each major architectural change
**Maintainer**: Development team
