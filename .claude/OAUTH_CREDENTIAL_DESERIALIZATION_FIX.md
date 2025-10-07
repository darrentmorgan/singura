# OAuth Credential Deserialization Fix

## Problem Summary
**Error**: `TypeError: credentials.expiresAt?.toISOString is not a function`
**Root Cause**: When OAuth credentials are stored in the database and retrieved via `JSON.parse()`, the `expiresAt` field becomes a string instead of a Date object.

## Technical Details

### JSON Deserialization Issue
```typescript
// In oauth-credential-storage-service.ts line 131
credentials = JSON.parse(decryptedValue) as GoogleOAuthCredentials;
// Result: expiresAt is now a STRING (ISO 8601 format), not a Date object
```

### Why This Breaks
```typescript
// FAILS when expiresAt is a string
credentials.expiresAt?.toISOString()  // TypeError: toISOString is not a function

// FAILS when comparing string with Date
if (expiresAt && expiresAt < new Date())  // String vs Date comparison
```

## Files Fixed

### 1. `/backend/src/services/google-api-client-service.ts`

**Line 70-83** (initialize method logging):
```typescript
// Handle expiresAt for logging (can be Date or string from database)
const expiresAtStr = credentials.expiresAt
  ? (credentials.expiresAt instanceof Date
    ? credentials.expiresAt.toISOString()
    : credentials.expiresAt)
  : undefined;

console.log('Google API Client initialized with OAuth credentials:', {
  hasAccessToken: !!credentials.accessToken,
  hasRefreshToken: !!credentials.refreshToken,
  scopes: credentials.scope,
  domain: credentials.domain,
  expiresAt: expiresAtStr
});
```

**Line 135-146** (refreshTokensIfNeeded method):
```typescript
// Handle expiresAt as either Date or string (from database deserialization)
const expiresAt = this.credentials.expiresAt
  ? (this.credentials.expiresAt instanceof Date
    ? this.credentials.expiresAt
    : new Date(this.credentials.expiresAt))
  : null;
const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

if (expiresAt && expiresAt > fiveMinutesFromNow) {
  return true; // Token still valid
}
```

### 2. `/backend/src/services/oauth-credential-storage-service.ts`

**Line 87-101** (storeCredentials logging):
```typescript
// Handle expiresAt for logging (can be Date or string)
const expiresAtStr = credentials.expiresAt
  ? (credentials.expiresAt instanceof Date
    ? credentials.expiresAt.toISOString()
    : credentials.expiresAt)
  : undefined;

console.log('OAuth credentials stored for live detection:', {
  connectionId,
  userEmail: credentials.email?.substring(0, 3) + '...',
  domain: credentials.domain,
  scopes: credentials.scope,
  expiresAt: expiresAtStr,
  persisted: this.useDatabase
});
```

**Line 238-248** (isCredentialsValid method):
```typescript
// Check expiration (handle both Date and string from database)
if (credentials.expiresAt) {
  const expiryDate = credentials.expiresAt instanceof Date
    ? credentials.expiresAt
    : new Date(credentials.expiresAt);

  if (expiryDate < new Date()) {
    console.log(`Credentials expired for ${connectionId}`);
    return false;
  }
}
```

**Line 413-424** (refreshConnectionIfNeeded method):
```typescript
// Check if refresh needed
// Handle expiresAt as either Date or string (from database deserialization)
const expiresAt = credentials.expiresAt
  ? (credentials.expiresAt instanceof Date
    ? credentials.expiresAt
    : new Date(credentials.expiresAt))
  : null;
const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

if (!expiresAt || expiresAt > fiveMinutesFromNow) {
  return true; // Still valid
}
```

### 3. `/backend/src/services/google-oauth-service.ts`

**Line 111-125** (exchangeCodeForTokens logging):
```typescript
// Handle expiresAt for logging (can be Date or string)
const expiresAtStr = credentials.expiresAt
  ? (credentials.expiresAt instanceof Date
    ? credentials.expiresAt.toISOString()
    : credentials.expiresAt)
  : undefined;

console.log('Google OAuth tokens exchanged successfully:', {
  hasAccessToken: !!credentials.accessToken,
  hasRefreshToken: !!credentials.refreshToken,
  scopeCount: credentials.scope.length,
  expiresAt: expiresAtStr,
  userEmail: credentials.email ? credentials.email.substring(0, 3) + '...' : 'unknown',
  domain: credentials.domain || 'personal'
});
```

**Line 159-170** (refreshTokens logging):
```typescript
// Handle expiresAt for logging (can be Date or string)
const newExpiresAtStr = refreshedCredentials.expiresAt
  ? (refreshedCredentials.expiresAt instanceof Date
    ? refreshedCredentials.expiresAt.toISOString()
    : refreshedCredentials.expiresAt)
  : undefined;

console.log('Google OAuth tokens refreshed successfully:', {
  newExpiresAt: newExpiresAtStr,
  hasNewRefreshToken: !!credentials.refresh_token,
  scopeCount: refreshedCredentials.scope.length
});
```

## Pattern Used

### Safe Deserialization Pattern
```typescript
// For logging (convert to string)
const expiresAtStr = credentials.expiresAt
  ? (credentials.expiresAt instanceof Date
    ? credentials.expiresAt.toISOString()
    : credentials.expiresAt)
  : undefined;

// For comparisons (convert to Date)
const expiresAtDate = credentials.expiresAt
  ? (credentials.expiresAt instanceof Date
    ? credentials.expiresAt
    : new Date(credentials.expiresAt))
  : null;
```

## Testing Verification

### Expected Results After Fix
1. ✅ No more `.toISOString is not a function` errors
2. ✅ Google API client initialization succeeds
3. ✅ Discovery can load credentials from database
4. ✅ Token expiration checks work correctly
5. ✅ Token refresh logic functions properly

### Test Commands
```bash
# Restart backend
cd /Users/darrenmorgan/AI_Projects/saas-xray/backend
npm start

# Check logs for successful initialization
# Look for: "Google API Client initialized with OAuth credentials"
# Should NOT see: "TypeError: credentials.expiresAt?.toISOString is not a function"
```

## Root Cause Analysis

### Why This Happened
1. OAuth credentials stored in database as encrypted JSON
2. Database stores `expiresAt` as `timestamp` or `text`
3. When retrieved, PostgreSQL returns timestamps as strings
4. `JSON.parse()` deserializes as string, NOT Date object
5. Code assumed `expiresAt` would always be Date object

### Prevention
- Always handle Date fields from database deserialization
- Use type guards: `instanceof Date` checks
- Add deserialization layer between database and business logic

## Related Files
- `/backend/src/database/repositories/encrypted-credential.ts` - Stores encrypted credentials
- `/backend/src/services/oauth-credential-storage-service.ts` - Manages credential lifecycle
- `/backend/src/services/google-api-client-service.ts` - Uses credentials for API calls

## PITFALL LEARNED
**PITFALL #7**: OAuth Credential Date Deserialization
- **Problem**: `expiresAt` becomes string after `JSON.parse()` from database
- **Symptom**: `TypeError: toISOString is not a function`
- **Solution**: Always use `instanceof Date` checks before calling Date methods
- **Pattern**: Convert to Date for comparisons, handle both Date and string for logging
