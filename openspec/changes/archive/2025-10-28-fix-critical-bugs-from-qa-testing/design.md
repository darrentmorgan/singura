# Design: Fix Critical Bugs from QA Testing

## Architecture Overview

This change addresses bugs across multiple architectural layers:
- **Database Layer**: Audit log schema and migration verification
- **Backend Services**: OAuth credential storage and retrieval
- **API Layer**: Socket.io message handling
- **Frontend Components**: Accessibility and routing configuration
- **Security Layer**: Content Security Policy updates

## Design Decisions

### 1. Audit Logs Schema Fix

**Problem**: Database schema mismatch causing audit log INSERT failures.

**Analysis**:
- Migration file exists with correct schema (`timestamp` column)
- Potential causes:
  1. Migration not applied to database
  2. Code uses wrong column name (`created_at` instead of `timestamp`)
  3. Both timestamp columns exist causing ambiguity

**Solution**:
```typescript
// Before (hypothetical broken code)
await db.query(`
  INSERT INTO audit_logs (user_id, organization_id, action, created_at)
  VALUES ($1, $2, $3, NOW())
`, [userId, orgId, action]);

// After (correct)
await db.query(`
  INSERT INTO audit_logs (user_id, organization_id, action, timestamp)
  VALUES ($1, $2, $3, NOW())
`, [userId, orgId, action]);
```

**Design Rationale**:
- Follow migration schema exactly (single source of truth)
- Add migration verification to startup to prevent future mismatches
- Use TypeScript types from `@singura/shared-types` to enforce schema at compile time

**Implementation Steps**:
1. Create TypeScript interface matching migration schema
2. Use interface for all audit log operations
3. Add startup check to verify migration applied
4. Update all INSERT/UPDATE queries

---

### 2. OAuth Credential Retrieval Fix

**Problem**: Google OAuth credentials not retrieved during discovery, causing authentication failures.

**Analysis**:
- `OAuthCredentialStorageService` is singleton (correct pattern)
- Possible issues:
  1. Credentials not stored after OAuth callback
  2. Encryption/decryption failure
  3. Wrong connection ID used for lookup
  4. Tokens expired without refresh

**Solution Architecture**:
```typescript
// Current Flow (broken)
OAuth Callback → Store Credentials → Discovery → Retrieve Credentials ❌
                                                   ↑
                                                   Wrong ID or decryption failure

// Fixed Flow
OAuth Callback → Store Credentials → Discovery → Retrieve Credentials ✅
                      ↓                              ↓
                 Verify Storage                Token Refresh if Expired
                 Log Connection ID             Validate Decryption
```

**Design Decisions**:

**a. Add Debug Logging**:
```typescript
export class OAuthCredentialStorageService {
  async storeCredentials(connectionId: string, credentials: OAuthCredentials): Promise<void> {
    console.log(`[OAuth] Storing credentials for connection: ${connectionId}`);
    // Store logic
    console.log(`[OAuth] Successfully stored credentials for: ${connectionId}`);
  }

  async getCredentials(connectionId: string): Promise<OAuthCredentials | null> {
    console.log(`[OAuth] Retrieving credentials for connection: ${connectionId}`);
    const creds = await this.retrieve(connectionId);
    if (!creds) {
      console.error(`[OAuth] No credentials found for connection: ${connectionId}`);
      return null;
    }
    console.log(`[OAuth] Successfully retrieved credentials for: ${connectionId}`);
    return creds;
  }
}
```

**b. Token Refresh Logic**:
```typescript
async getValidCredentials(connectionId: string): Promise<OAuthCredentials | null> {
  const credentials = await this.getCredentials(connectionId);
  if (!credentials) return null;

  // Check expiration
  if (this.isExpired(credentials)) {
    console.log(`[OAuth] Token expired, refreshing for: ${connectionId}`);
    const refreshed = await this.refreshToken(credentials);
    if (refreshed) {
      await this.storeCredentials(connectionId, refreshed);
      return refreshed;
    }
    return null;
  }

  return credentials;
}

private isExpired(credentials: OAuthCredentials): boolean {
  if (!credentials.expiresAt) return false;
  return new Date(credentials.expiresAt) <= new Date();
}

private async refreshToken(credentials: OAuthCredentials): Promise<OAuthCredentials | null> {
  // Platform-specific refresh logic
  switch (credentials.platform) {
    case 'google':
      return this.refreshGoogleToken(credentials);
    case 'slack':
      return this.refreshSlackToken(credentials);
    // ... other platforms
  }
}
```

**c. Connection ID Validation**:
```typescript
// Ensure discovery service uses SAME connection ID as OAuth callback
export class DiscoveryService {
  async discoverAutomations(connectionId: string): Promise<AutomationDiscovery[]> {
    console.log(`[Discovery] Starting for connection: ${connectionId}`);

    // Verify connection exists
    const connection = await hybridStorage.getConnection(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    // Use SAME connection ID for credential lookup
    const credentials = await oauthCredentialStorage.getValidCredentials(connectionId);
    if (!credentials) {
      throw new Error(`No valid credentials for connection: ${connectionId}`);
    }

    // Continue discovery
  }
}
```

**Design Rationale**:
- Logging helps diagnose storage/retrieval issues
- Automatic token refresh improves reliability
- Connection ID validation prevents lookup mismatches
- Follows singleton pattern (project requirement)

---

### 3. CSP WebAssembly Policy Update

**Problem**: CSP policy blocks WebAssembly `data:` URIs.

**Analysis**:
- CSP violation: `script-src 'wasm-unsafe-eval'` required for WebAssembly
- Need to identify if WebAssembly is actually used
- Balance security with functionality

**Solution Options**:

**Option A**: Allow `wasm-unsafe-eval` (if WebAssembly required)
```typescript
// backend/src/simple-server.ts or frontend/vite.config.ts
const cspPolicy = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for Vite/React
    "'wasm-unsafe-eval'" // Required for WebAssembly
  ],
  // ... other directives
};
```

**Option B**: Remove WebAssembly if unused
```typescript
// If no WebAssembly detected, leave CSP strict
const cspPolicy = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'"],
  // No wasm-unsafe-eval needed
};
```

**Option C**: Whitelist specific WebAssembly sources
```typescript
const cspPolicy = {
  'script-src': [
    "'self'",
    "'unsafe-inline'",
    'https://cdn.example.com/wasm' // Specific trusted source
  ]
};
```

**Design Decision**: Investigate first, then choose Option B (remove) or Option C (whitelist). Avoid Option A unless absolutely necessary.

**Design Rationale**:
- Minimize CSP relaxation for security
- Whitelist specific sources > blanket allowance
- Document any policy changes for security audit

---

### 4. Socket.io Message Parsing

**Problem**: Admin dashboard receives malformed Socket.io messages causing parsing errors.

**Solution Architecture**:
```typescript
// Backend: Add message validation
import { z } from 'zod';

const ConnectionUpdateSchema = z.object({
  connectionId: z.string().uuid(),
  status: z.enum(['connected', 'disconnected', 'error']),
  timestamp: z.string().datetime()
});

io.on('connection', (socket) => {
  socket.on('connection:update', (data) => {
    try {
      const validated = ConnectionUpdateSchema.parse(data);
      socket.broadcast.emit('connection:update', validated);
    } catch (error) {
      console.error('[Socket.io] Invalid message:', error);
      socket.emit('error', { message: 'Invalid message format' });
    }
  });
});

// Frontend: Add error handling
useEffect(() => {
  const socket = io(WS_URL);

  socket.on('connection:update', (data) => {
    try {
      // Validate data structure
      if (!data || typeof data !== 'object') {
        console.error('[Socket.io] Invalid message format:', data);
        return;
      }
      // Process valid message
      updateConnectionStatus(data);
    } catch (error) {
      console.error('[Socket.io] Error processing message:', error);
    }
  });

  return () => socket.disconnect();
}, []);
```

**Design Rationale**:
- Validate messages on both sides (defense in depth)
- Use schema validation library (zod) for type safety
- Graceful error handling prevents UI crashes
- Logging helps diagnose message format issues

---

### 5. Accessibility Improvements

**Problem**: Dialog components missing `aria-describedby` attributes.

**Solution Pattern**:
```typescript
// Before
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Connection Details</DialogTitle>
    </DialogHeader>
    <p>View and manage your connection.</p>
  </DialogContent>
</Dialog>

// After
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent aria-describedby="dialog-description">
    <DialogHeader>
      <DialogTitle>Connection Details</DialogTitle>
    </DialogHeader>
    <p id="dialog-description">
      View and manage your connection. You can refresh credentials or disconnect.
    </p>
  </DialogContent>
</Dialog>
```

**Design Rationale**:
- Follow WCAG 2.1 Level AA guidelines
- Each dialog has unique description ID
- Descriptions are meaningful and concise
- Test with screen readers to verify

---

### 6. React Router Future Flags

**Problem**: Console warnings about deprecated React Router behavior.

**Solution**:
```typescript
// frontend/src/main.tsx
const router = createBrowserRouter(routes, {
  future: {
    v7_startTransition: true,      // Use React.startTransition for navigation
    v7_relativeSplatPath: true     // Update relative path behavior
  }
});
```

**Design Rationale**:
- Prepare for React Router v7 upgrade
- No breaking changes (just removes warnings)
- Opt into future behavior early

---

## Data Flow Diagrams

### OAuth Credential Flow (Fixed)
```
┌─────────────┐
│ User clicks │
│ "Connect"   │
└──────┬──────┘
       │
       v
┌──────────────────┐
│ OAuth Callback   │
│ Receives tokens  │
└──────┬───────────┘
       │
       v
┌────────────────────────────┐
│ OAuthCredentialStorage     │
│ .storeCredentials(connId)  │
│ • Encrypt tokens           │
│ • Store with connection ID │
│ • Log success              │
└──────┬─────────────────────┘
       │
       v
┌──────────────────┐
│ hybridStorage    │
│ .updateStatus()  │
│ Mark connected   │
└──────┬───────────┘
       │
       v
┌──────────────────┐
│ User starts      │
│ Discovery        │
└──────┬───────────┘
       │
       v
┌────────────────────────────┐
│ DiscoveryService           │
│ .discoverAutomations()     │
└──────┬─────────────────────┘
       │
       v
┌────────────────────────────┐
│ OAuthCredentialStorage     │
│ .getValidCredentials()     │
│ • Retrieve credentials     │
│ • Check expiration         │
│ • Refresh if needed        │
│ • Return valid tokens      │
└──────┬─────────────────────┘
       │
       v
┌──────────────────┐
│ Google Connector │
│ Uses tokens ✅   │
└──────────────────┘
```

### Audit Log Flow (Fixed)
```
┌──────────────────┐
│ User action      │
│ (OAuth, login)   │
└──────┬───────────┘
       │
       v
┌──────────────────────────┐
│ AuditLogService          │
│ .logAction()             │
└──────┬───────────────────┘
       │
       v
┌──────────────────────────┐
│ Check TypeScript types   │
│ from @singura/shared     │
│ AuditLogEntry interface  │
└──────┬───────────────────┘
       │
       v
┌──────────────────────────┐
│ INSERT INTO audit_logs   │
│ (timestamp, ...)         │ ← Uses correct column name
│ VALUES (NOW(), ...)      │
└──────┬───────────────────┘
       │
       v
┌──────────────────┐
│ PostgreSQL       │
│ Success ✅       │
└──────────────────┘
```

---

## Testing Strategy

### Unit Tests

**Audit Logs**:
- Test INSERT queries with correct column names
- Test migration verification logic
- Mock database responses

**OAuth Credentials**:
- Test storage/retrieval with various connection IDs
- Test token refresh logic
- Test expiration detection
- Test encryption/decryption
- Mock OAuth provider responses

**Socket.io**:
- Test message validation with valid/invalid payloads
- Test error handling
- Mock socket connections

### Integration Tests

**OAuth Flow**:
- Test full OAuth callback → storage → retrieval → discovery flow
- Test with expired tokens
- Test with invalid credentials

**Database**:
- Test audit log creation in real database
- Verify migration applied

### E2E Tests

**Google Workspace Discovery**:
- Connect to Google Workspace
- Start discovery
- Verify automations discovered
- Check no console errors

**Admin Dashboard**:
- Open admin dashboard
- Verify Socket.io connection
- Check for parsing errors

---

## Security Considerations

### OAuth Credentials
- Credentials remain encrypted at rest (no change)
- Logging does NOT include tokens (only connection IDs)
- Token refresh uses secure HTTPS endpoints

### CSP Policy
- Minimize relaxation of CSP rules
- Document all policy changes
- Security audit before/after changes
- Prefer whitelisting over blanket allowances

### Audit Logs
- Maintain immutability (no UPDATE/DELETE operations)
- Retain 90 days per existing migration
- Include correlation IDs for tracing

---

## Performance Considerations

### OAuth Token Refresh
- Cache valid tokens to avoid unnecessary refreshes
- Use token expiration timestamps
- Lazy refresh (only when needed, not proactively)

### Audit Logs
- Batch inserts if high volume (future optimization)
- Indexes on timestamp, user_id, organization_id (already in migration)
- Consider materialized view for metrics (already in migration)

### Socket.io
- Validate messages on server side to reduce client load
- Use binary encoding for large payloads (future optimization)

---

## Rollback Strategy

Each fix is independently reversible:
1. **Audit Logs**: Revert query changes, migration stays
2. **OAuth**: Revert to previous credential service version
3. **CSP**: Revert to previous policy
4. **Socket.io**: Revert validation logic
5. **Accessibility**: Revert ARIA attributes (no functional impact)
6. **Router**: Disable future flags

All changes committed separately for easy cherry-pick revert.

---

## Future Enhancements

### Post-Fix Improvements
1. **OAuth**: Add monitoring/alerting for credential failures
2. **Audit Logs**: Add real-time streaming to SIEM
3. **Socket.io**: Add message rate limiting
4. **Accessibility**: Full WCAG 2.1 AAA compliance audit
5. **Performance**: Add caching layer for frequent queries

### Technical Debt Addressed
- Audit log schema standardization ✅
- OAuth credential reliability ✅
- Security policy documentation ✅
- Accessibility baseline ✅

---

## Dependencies

### External Libraries
- `zod`: Message validation (may need to add)
- `pg`: PostgreSQL client (existing)
- `@slack/web-api`, `googleapis`: OAuth clients (existing)

### Internal Dependencies
- `@singura/shared-types`: Type definitions
- `backend/src/services/oauth-credential-storage-service.ts`
- `backend/src/services/discovery-service.ts`
- `backend/migrations/*.sql`

### Configuration Files
- `backend/.env`: Database connection
- `frontend/vite.config.ts`: CSP policy (if applicable)
- `backend/src/simple-server.ts`: Server config, CSP headers

---

## Open Design Questions

1. **CSP**: Is WebAssembly actually used? Need codebase scan.
2. **OAuth**: Should we add proactive token refresh or lazy refresh? (Recommendation: lazy)
3. **Audit Logs**: Should we add more columns for future needs? (Recommendation: no, use JSONB metadata)
4. **Socket.io**: Should we add message rate limiting? (Recommendation: yes, future enhancement)
5. **Testing**: Should we add E2E tests for all OAuth providers? (Recommendation: yes, Google first)

---

## Success Metrics

Post-deployment verification:
- **Audit Logs**: 0 INSERT failures over 24 hours
- **OAuth**: 100% Google discovery success rate
- **CSP**: 0 violations in console
- **Socket.io**: 0 parsing errors over 24 hours
- **Accessibility**: Lighthouse score 90+ for accessibility
- **Performance**: No degradation in response times
