# Clerk OAuth Integration - Current Debug Context

**Date:** 2025-10-04
**Status:** Clerk authentication working, OAuth flow has bug
**Critical Issue:** organizationId parameter not being forwarded from store to API service

---

## ✅ What's Working

### Clerk Authentication (100% Complete)
- ✅ Clerk SignIn/SignUp components working
- ✅ Google OAuth sign-in functional
- ✅ User authenticated and session active
- ✅ Organization created: "Test Org" (`org_33aku5ITMpEIFi3PTxFXTew8jMb`)
- ✅ OrganizationSwitcher in header showing correct org
- ✅ CSP configured for Clerk domains
- ✅ Protected routes working
- ✅ User profile and settings pages using Clerk components

### Environment
- Frontend: http://localhost:4200 (React + Vite + Clerk)
- Backend: http://localhost:4201 (Express + Clerk middleware)
- Database: PostgreSQL on port 5433 (Docker)
- Redis: Port 6379 (Docker)

### Commits (6 total)
1. `2121eda` - Initial Clerk integration
2. `08f5cd7` - TypeScript fixes
3. `a5c6d18` - Clerk type fix
4. `f43f092` - Complete UI integration
5. `5a3ecae` - Wildcard routing fix
6. `89d9b99` - Settings page enhancement

---

## ❌ Current Bug: OAuth Flow Returns 400

### Problem
When user tries to connect Google Workspace:
- Frontend has organization context: `org_33aku5ITMpEIFi3PTxFXTew8jMb`
- Backend returns: `400 Bad Request` on `/api/auth/oauth/google/authorize`
- Error: "Invalid organization ID"

### Root Cause (IDENTIFIED)

**File:** `frontend/src/services/api.ts` line 371

```typescript
// ❌ WRONG: Missing organizationId parameter
initiate: (platform: PlatformType) => apiService.initiateOAuth(platform),

// ✅ SHOULD BE:
initiate: (platform: PlatformType, organizationId?: string) =>
  apiService.initiateOAuth(platform, organizationId),
```

**Flow Breakdown:**
1. ✅ PlatformCard gets org ID from `useOrganization()`: `"org_33aku5ITMpEIFi3PTxFXTew8jMb"`
2. ✅ Calls `initiateOAuth(platform, orgId)` with orgId
3. ✅ Store action receives both parameters
4. ✅ Store calls `oauthApi.initiate(platform, organizationId)`
5. ❌ **BUG:** `oauthApi.initiate` wrapper drops `organizationId` parameter
6. ❌ API service receives `undefined` for organizationId
7. ❌ Backend receives no `?orgId=` query parameter
8. ❌ Backend validation fails: "Invalid organization ID"

---

## 🔧 Solution

### Fix 1: Update api.ts OAuth Wrapper (CRITICAL)

**File:** `frontend/src/services/api.ts:371`

```typescript
export const oauthApi = {
  initiate: (platform: PlatformType, organizationId?: string) =>
    apiService.initiateOAuth(platform, organizationId),
  callback: (platform: PlatformType, code: string, state: string) =>
    apiService.handleOAuthCallback(platform, code, state),
};
```

### Verification After Fix

**Expected Backend Log:**
```
🔍 Google OAuth authorize request: {
  orgId: 'org_33aku5ITMpEIFi3PTxFXTew8jMb',
  query: { orgId: 'org_33aku5ITMpEIFi3PTxFXTew8jMb' },
  startsWithOrg: true
}
```

**Expected Flow:**
1. User clicks "Connect Google Workspace"
2. Frontend passes `org_33aku5ITMpEIFi3PTxFXTew8jMb`
3. Backend accepts and creates OAuth URL with state parameter
4. User authorizes Google
5. Callback stores connection with Clerk org ID
6. Database has `organization_id = 'org_33aku5ITMpEIFi3PTxFXTew8jMb'`

---

## 📊 Debug Logs Added

### Frontend (PlatformCard.tsx:121)
```typescript
console.log('🔍 Organization context:', { organization, orgId });
console.log('✅ Initiating OAuth with orgId:', orgId);
```

### Backend (simple-server.ts:323)
```typescript
console.log('🔍 Google OAuth authorize request:', {
  orgId: clerkOrgId,
  query: req.query,
  startsWithOrg: clerkOrgId?.startsWith('org_')
});
```

---

## 🧪 Testing After Fix

### Manual Test:
1. Refresh http://localhost:4200/connections
2. Click "Connect Google Workspace"
3. Check browser console for: `✅ Initiating OAuth with orgId: org_33aku5ITMpEIFi3PTxFXTew8jMb`
4. Check backend logs for: `🔍 Google OAuth authorize request`
5. Should redirect to Google OAuth (no 400 error)

### Automated Test (Playwright):
```bash
npx playwright test e2e/tests/clerk-oauth-flow.spec.ts
```

### Database Verification:
```sql
SELECT organization_id, platform_type, display_name
FROM platform_connections
WHERE organization_id LIKE 'org_%';
```

Expected result: Row with `org_33aku5ITMpEIFi3PTxFXTew8jMb`

---

## 📁 Key Files Reference

### Frontend
- `src/services/api.ts:371` - **BUG LOCATION** (oauth wrapper)
- `src/services/api.ts:302-306` - initiateOAuth implementation (correct)
- `src/stores/connections.ts: