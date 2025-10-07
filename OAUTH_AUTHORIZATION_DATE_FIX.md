# OAuth Authorization Date Fix - Implementation Guide

**Date**: 2025-10-07  
**Priority**: P1 - Critical  
**Complexity**: Low (4-line change)  
**Estimated Effort**: 3.5 hours total

---

## Quick Summary

We ARE capturing accurate OAuth authorization dates from Google audit logs, but we're throwing them away and using today's date instead. This is a simple 4-line fix.

**Current Bug**:
```typescript
createdAt: new Date(),        // ❌ Shows today
lastTriggered: null,          // ❌ Shows null
```

**Correct Code**:
```typescript
createdAt: app.firstSeen,     // ✅ Shows actual authorization date
lastTriggered: app.lastSeen,  // ✅ Shows last activity
```

---

## Phase 1: Immediate Fix (Required)

### File: `/Users/darrenmorgan/AI_Projects/saas-xray/backend/src/services/google-api-client-service.ts`

#### Change 1: Extend Audit Log Query Window

**Line 600**: Change from 90 days to 180 days (Google's maximum retention)

```diff
- startTime: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // Last 90 days
+ startTime: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), // Last 180 days (max retention)
```

**Line 608**: Make the same change for token events

```diff
- startTime: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
+ startTime: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), // Last 180 days (max retention)
```

**Why**: Maximize historical data capture (6 months instead of 3 months)

---

#### Change 2: Use Captured Timestamps

**Line 970**: Replace hardcoded `new Date()` with captured `app.firstSeen`

```diff
- createdAt: new Date(),
+ createdAt: app.firstSeen,
```

**Why**: Show ACTUAL authorization date instead of discovery date

---

#### Change 3: Add Last Activity Timestamp

**Line 971**: Replace `null` with captured `app.lastSeen`

```diff
- lastTriggered: null,
+ lastTriggered: app.lastSeen,
```

**Why**: Show when the app was last used (from audit logs)

---

#### Change 4: Add Audit Trail Metadata

**Line 979**: Add after `authorizedBy` field

```diff
  metadata: {
    clientId: app.clientId,
    scopes: app.scopes,
    scopeCount: app.scopes.length,
    isAIPlatform: app.isAIPlatform,
    platformName: app.platformName,
    authorizedBy: app.authorizedBy,
+   firstAuthorizedAt: app.firstSeen.toISOString(),
+   lastSeenAt: app.lastSeen.toISOString(),
+   authorizationDateSource: 'google_admin_reports_api',
+   authorizationDateConfidence: 'high',
    description: app.isAIPlatform
      ? `AI Platform Integration: ${app.platformName}`
      : 'Third-party OAuth application',
```

**Why**: Preserve audit trail in JSONB for compliance/forensics

---

## Complete Code Changes

### Full context for Change 2, 3, 4 (Lines 962-991)

**BEFORE**:
```typescript
const automation: AutomationEvent = {
  id: `oauth-app-${app.clientId}`,
  name: app.displayText,
  type: 'integration',
  platform: 'google',
  status: 'active',
  trigger: 'oauth',
  actions: ['api_access', 'data_read'],
  createdAt: new Date(),
  lastTriggered: null,
  riskLevel: app.isAIPlatform ? 'high' : 'medium',
  metadata: {
    clientId: app.clientId,
    scopes: app.scopes,
    scopeCount: app.scopes.length,
    isAIPlatform: app.isAIPlatform,
    platformName: app.platformName,
    authorizedBy: app.authorizedBy,
    description: app.isAIPlatform
      ? `AI Platform Integration: ${app.platformName}`
      : 'Third-party OAuth application',
    detectionMethod: 'oauth_tokens_api',
    riskFactors: [
      ...(app.isAIPlatform ? [`AI platform integration: ${app.platformName}`] : []),
      `${app.scopes.length} OAuth scopes granted`,
      ...(app.scopes.some(s => s.includes('drive')) ? ['Google Drive access'] : []),
      ...(app.scopes.some(s => s.includes('gmail')) ? ['Gmail access'] : [])
    ]
  }
};
```

**AFTER**:
```typescript
const automation: AutomationEvent = {
  id: `oauth-app-${app.clientId}`,
  name: app.displayText,
  type: 'integration',
  platform: 'google',
  status: 'active',
  trigger: 'oauth',
  actions: ['api_access', 'data_read'],
  createdAt: app.firstSeen,  // ✅ CHANGED: Use actual authorization date
  lastTriggered: app.lastSeen,  // ✅ CHANGED: Use last activity date
  riskLevel: app.isAIPlatform ? 'high' : 'medium',
  metadata: {
    clientId: app.clientId,
    scopes: app.scopes,
    scopeCount: app.scopes.length,
    isAIPlatform: app.isAIPlatform,
    platformName: app.platformName,
    authorizedBy: app.authorizedBy,
    firstAuthorizedAt: app.firstSeen.toISOString(),  // ✅ NEW: Audit trail
    lastSeenAt: app.lastSeen.toISOString(),  // ✅ NEW: Audit trail
    authorizationDateSource: 'google_admin_reports_api',  // ✅ NEW: Data provenance
    authorizationDateConfidence: 'high',  // ✅ NEW: Quality indicator
    description: app.isAIPlatform
      ? `AI Platform Integration: ${app.platformName}`
      : 'Third-party OAuth application',
    detectionMethod: 'oauth_tokens_api',
    riskFactors: [
      ...(app.isAIPlatform ? [`AI platform integration: ${app.platformName}`] : []),
      `${app.scopes.length} OAuth scopes granted`,
      ...(app.scopes.some(s => s.includes('drive')) ? ['Google Drive access'] : []),
      ...(app.scopes.some(s => s.includes('gmail')) ? ['Gmail access'] : [])
    ]
  }
};
```

---

## Testing Plan

### Test 1: Verify Timestamp Mapping

**Command**:
```bash
cd /Users/darrenmorgan/AI_Projects/saas-xray/backend
npm test -- google-api-client-service
```

**Expected**: New tests validate `createdAt = app.firstSeen`

---

### Test 2: Manual Verification with Real Data

**Step 1**: Run discovery
```bash
# Start backend
cd /Users/darrenmorgan/AI_Projects/saas-xray/backend
npm run dev

# Trigger discovery via UI or API
curl -X POST http://localhost:3001/api/connections/{connectionId}/discover
```

**Step 2**: Check database
```sql
SELECT 
  name,
  first_discovered_at,
  last_triggered_at,
  platform_metadata->>'firstAuthorizedAt' as first_auth,
  platform_metadata->>'authorizationDateConfidence' as confidence
FROM discovered_automations
WHERE automation_type = 'integration'
ORDER BY first_discovered_at DESC;
```

**Expected**:
- `first_discovered_at` shows dates from last 180 days (not all today)
- `platform_metadata` contains `firstAuthorizedAt` timestamp
- `authorizationDateConfidence` = 'high'

---

### Test 3: Verify 180-Day Window Works

**Check backend logs**:
```bash
tail -100 /tmp/backend.log | grep "OAuth applications"
```

**Expected**:
```
  Discovered 15 unique OAuth applications
  Found 217 total audit events, filtering for OAuth...
```

Apps authorized up to 6 months ago should appear.

---

## Data Migration

### Step 1: Backup Current Data

```sql
-- Create backup table
CREATE TABLE discovered_automations_backup_20251007 AS 
SELECT * FROM discovered_automations 
WHERE automation_type = 'integration';

-- Verify backup
SELECT COUNT(*) FROM discovered_automations_backup_20251007;
```

---

### Step 2: Re-run Discovery to Get Correct Dates

After deploying code changes:

1. Delete existing OAuth app records (they have wrong dates)
```sql
DELETE FROM discovered_automations 
WHERE automation_type = 'integration' 
  AND trigger_type = 'oauth';
```

2. Trigger new discovery via UI or API
```bash
curl -X POST http://localhost:3001/api/connections/{connectionId}/discover
```

3. Verify correct dates populated
```sql
SELECT 
  name,
  first_discovered_at,
  created_at,
  platform_metadata->>'firstAuthorizedAt' as first_auth
FROM discovered_automations
WHERE automation_type = 'integration'
ORDER BY first_discovered_at ASC;
```

---

## Success Criteria

**Before Fix**:
```sql
-- All apps show today's date
SELECT DISTINCT first_discovered_at::date 
FROM discovered_automations 
WHERE automation_type = 'integration';

-- Result: 2025-10-07 (only today)
```

**After Fix**:
```sql
-- Apps show distributed dates over 180-day window
SELECT 
  DATE_TRUNC('day', first_discovered_at) as auth_date,
  COUNT(*) as app_count
FROM discovered_automations
WHERE automation_type = 'integration'
GROUP BY auth_date
ORDER BY auth_date DESC;

-- Expected Result:
-- 2025-10-07 | 2
-- 2025-09-22 | 1
-- 2025-09-15 | 3
-- 2025-08-10 | 1
-- ... (distributed over 6 months)
```

---

## Rollback Plan

If issues occur:

1. **Revert code changes**:
```bash
git checkout HEAD -- backend/src/services/google-api-client-service.ts
```

2. **Restore backup data**:
```sql
DELETE FROM discovered_automations WHERE automation_type = 'integration';

INSERT INTO discovered_automations 
SELECT * FROM discovered_automations_backup_20251007;
```

3. **Verify restore**:
```sql
SELECT COUNT(*) FROM discovered_automations 
WHERE automation_type = 'integration';
```

---

## Deployment Steps

### 1. Pre-Deployment

- ✅ Review this implementation guide
- ✅ Create database backup
- ✅ Verify Docker containers running (PostgreSQL, Redis)

### 2. Code Changes

- ✅ Make 4 code changes in `google-api-client-service.ts`
- ✅ Run TypeScript compiler: `npx tsc --noEmit`
- ✅ Run tests: `npm test`

### 3. Deploy to Dev

- ✅ Restart backend: `npm run dev`
- ✅ Trigger discovery via UI
- ✅ Verify database shows correct dates

### 4. Validation

- ✅ Check logs for audit event timestamps
- ✅ Query database for date distribution
- ✅ Verify UI displays correct authorization dates

### 5. Post-Deployment

- ✅ Monitor for errors
- ✅ Validate compliance requirements met
- ✅ Document results

---

## Expected Results

### Compliance Audit View

**Before**:
```
ChatGPT OAuth App
- Authorized: October 7, 2025 (today)
- ❌ INACCURATE: App was actually authorized months ago
```

**After**:
```
ChatGPT OAuth App
- Authorized: August 15, 2025 (53 days ago)
- ✅ ACCURATE: From Google Admin Reports audit logs
- Confidence: High
- Data Source: google_admin_reports_api
```

---

## Additional Notes

### Why This Bug Existed

The original implementation captured the data correctly but didn't use it:

```typescript
// Lines 670-677: Captured correctly ✅
oauthAppsMap.set(clientId, {
  firstSeen: new Date(event.id.time),  // ✅ Captured
  lastSeen: new Date(event.id.time),   // ✅ Captured
});

// Lines 970-971: Thrown away ❌
createdAt: new Date(),      // ❌ Replaced with today
lastTriggered: null,        // ❌ Replaced with null
```

This was likely an oversight during initial development.

---

### Why 180 Days?

Google Workspace Admin Reports API retention:
- **Default**: 6 months (180 days)
- **Enterprise Plus**: Up to 2 years with BigQuery export

We maximize the default retention period without requiring enterprise features.

---

### Future Enhancements

**Phase 2** (Optional):
- Add confidence scoring for apps >180 days old
- BigQuery integration for enterprise customers (2-year retention)
- UI indicators for estimated vs exact dates

**Phase 3** (Optional):
- Alert when new OAuth apps authorized
- Historical trend analysis (OAuth app adoption over time)
- Anomaly detection (unusual authorization patterns)

---

## Questions?

**Contact**: Detection Algorithm Engineer  
**Documentation**: See `OAUTH_AUTHORIZATION_DATE_RESEARCH.md` for full research report

---

**Status**: Ready for Implementation  
**Approved By**: [Pending]  
**Deployed**: [Pending]
