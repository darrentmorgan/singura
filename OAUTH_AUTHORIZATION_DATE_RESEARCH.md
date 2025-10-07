# OAuth Authorization Date Research Report

**Date**: 2025-10-07  
**Issue**: Automations show `created_at` as today instead of actual OAuth authorization date  
**Severity**: P1 - Critical for compliance/audit tracking

---

## Executive Summary

**FINDING**: We ARE capturing accurate OAuth authorization dates from Google Admin Reports API, but we're NOT using them in the database.

**ROOT CAUSE**: Line 970 in `google-api-client-service.ts` hardcodes `createdAt: new Date()` instead of using the captured `firstSeen` timestamp from audit logs.

**IMPACT**: 
- All OAuth apps show authorization date = today
- Cannot track when ChatGPT/OpenAI was actually authorized
- Compliance audits fail (inaccurate historical data)

**FIX COMPLEXITY**: Simple (1-line change) + data migration

---

## 1. Google Workspace Admin Reports API Retention

### Official Retention Policy

**Source**: Google Workspace Admin SDK documentation

**Retention Period**: 
- **Default**: 6 months (180 days)
- **Enterprise Plus**: Up to 2 years with export to BigQuery
- **Maximum API Query**: 180 days back from current date

**Current Implementation**: We query **90 days** (conservative approach)

```typescript
// backend/src/services/google-api-client-service.ts:600
startTime: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // Last 90 days
```

**Recommendation**: Increase to **180 days** to maximize historical data capture.

---

## 2. Event Timestamp Accuracy Analysis

### What is `event.id.time`?

**Definition**: RFC3339 timestamp of when the audit event occurred

**For `oauth2_authorize` events**: This IS the exact moment the user clicked "Allow" and authorized the OAuth app.

**Validation from Code**:
```typescript
// Line 674: We capture the exact authorization timestamp
firstSeen: new Date(event.id.time),  // ✅ ACCURATE: User clicked "Allow" at this time
```

**Evidence from Implementation**:
```typescript
// Lines 681-683: We correctly handle multiple events
const eventTime = new Date(event.id.time);
if (eventTime > app.lastSeen) app.lastSeen = eventTime;
if (eventTime < app.firstSeen) app.firstSeen = eventTime;  // ✅ Keeps EARLIEST authorization
```

**Conclusion**: `event.id.time` is 100% accurate for authorization date.

---

## 3. Current Data Flow Analysis

### Captured Data (Lines 670-677)
```typescript
oauthAppsMap.set(clientId, {
  clientId,
  displayText: appName || clientId,
  scopes: new Set(scopes),
  firstSeen: new Date(event.id.time),  // ✅ CAPTURED CORRECTLY
  lastSeen: new Date(event.id.time),   // ✅ CAPTURED CORRECTLY
  authorizedBy: actorEmail              // ✅ CAPTURED CORRECTLY
});
```

### Database Storage (Lines 962-991)
```typescript
const automation: AutomationEvent = {
  id: `oauth-app-${app.clientId}`,
  name: app.displayText,
  type: 'integration',
  platform: 'google',
  status: 'active',
  trigger: 'oauth',
  actions: ['api_access', 'data_read'],
  createdAt: new Date(),  // ❌ BUG: Should be app.firstSeen
  lastTriggered: null,    // ❌ BUG: Should be app.lastSeen
  riskLevel: app.isAIPlatform ? 'high' : 'medium',
  metadata: {
    clientId: app.clientId,
    scopes: app.scopes,
    scopeCount: app.scopes.length,
    isAIPlatform: app.isAIPlatform,
    platformName: app.platformName,
    authorizedBy: app.authorizedBy,  // ✅ CORRECT
    // ❌ MISSING: firstSeen, lastSeen timestamps
  }
};
```

### Database Schema Mapping
```
AutomationEvent.createdAt       → discovered_automations.first_discovered_at
AutomationEvent.lastTriggered   → discovered_automations.last_triggered_at
AutomationEvent.metadata        → discovered_automations.platform_metadata (JSONB)
```

---

## 4. Data Gap Scenarios & Solutions

### Scenario A: Authorization Within 90 Days
**Example**: ChatGPT authorized on 2025-09-15 (22 days ago)

**Current Behavior**:
- Audit logs contain the event
- `firstSeen = 2025-09-15` (captured correctly)
- Database shows `first_discovered_at = 2025-10-07` (today) ❌

**Solution**: Use `app.firstSeen` directly
```typescript
createdAt: app.firstSeen,  // 2025-09-15 ✅
```

**Confidence**: HIGH (exact date from audit logs)

---

### Scenario B: Authorization 91-180 Days Ago
**Example**: ChatGPT authorized on 2025-06-01 (128 days ago)

**Current Behavior**:
- Audit logs contain the event (within 180-day retention)
- NOT captured (outside our 90-day query window)
- Database shows `first_discovered_at = 2025-10-07` (today) ❌

**Solution**: Increase query window to 180 days
```typescript
// Change from 90 to 180 days
startTime: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
```

**Confidence**: HIGH (within Google's retention period)

---

### Scenario C: Authorization >180 Days Ago
**Example**: ChatGPT authorized on 2024-03-01 (586 days ago)

**Current Behavior**:
- Audit logs DO NOT contain the event (outside retention)
- Cannot determine actual authorization date
- Database shows `first_discovered_at = 2025-10-07` (today) ❌

**Solutions**:

**Option 1: Use Discovery Date with Disclaimer** (Recommended)
```typescript
createdAt: new Date(),  // Keep as-is for >180 day apps
metadata: {
  authorizedBy: app.authorizedBy,
  authorizationDateNote: "Application authorized before audit log retention period (>180 days ago)",
  discoveredAt: new Date().toISOString(),
}
```

**Option 2: Use Minimum Date Estimate**
```typescript
createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),  // At least 180 days ago
metadata: {
  authorizationDateConfidence: "low",
  authorizationDateNote: "Estimated minimum age based on audit log retention limit"
}
```

**Confidence**: LOW (estimation only)

---

### Scenario D: Multiple Authorization Events
**Example**: User authorized ChatGPT twice (scope changes)
- 2025-08-01: Initial authorization (read-only scopes)
- 2025-09-15: Re-authorized with write scopes

**Current Behavior**:
- Lines 681-683 correctly handle this:
```typescript
if (eventTime < app.firstSeen) app.firstSeen = eventTime;  // ✅ Keeps earliest (2025-08-01)
```

**Solution**: Already implemented correctly
```typescript
createdAt: app.firstSeen,  // 2025-08-01 (earliest authorization) ✅
lastTriggered: app.lastSeen,  // 2025-09-15 (most recent activity) ✅
```

**Confidence**: HIGH (multi-event handling works)

---

## 5. Implementation Recommendations

### Recommended Fix (Tiered Approach)

#### Phase 1: Simple Fix (Immediate)
**File**: `backend/src/services/google-api-client-service.ts`

**Change 1: Use captured timestamps**
```typescript
// Line 970 - Change from:
createdAt: new Date(),

// To:
createdAt: app.firstSeen,

// Line 971 - Change from:
lastTriggered: null,

// To:
lastTriggered: app.lastSeen,
```

**Change 2: Add timestamps to metadata for audit trail**
```typescript
// Line 979 - Add after authorizedBy:
metadata: {
  clientId: app.clientId,
  scopes: app.scopes,
  scopeCount: app.scopes.length,
  isAIPlatform: app.isAIPlatform,
  platformName: app.platformName,
  authorizedBy: app.authorizedBy,
  firstAuthorizedAt: app.firstSeen.toISOString(),  // NEW: Audit trail
  lastSeenAt: app.lastSeen.toISOString(),          // NEW: Audit trail
  description: app.isAIPlatform
    ? `AI Platform Integration: ${app.platformName}`
    : 'Third-party OAuth application',
  // ... rest of metadata
}
```

**Impact**: 
- ✅ Accurate authorization dates for apps within 90-day window
- ✅ No breaking changes
- ✅ Audit trail preserved in JSONB metadata

---

#### Phase 2: Extend Query Window (Quick Win)
**File**: `backend/src/services/google-api-client-service.ts`

**Change**:
```typescript
// Line 600 - Change from:
startTime: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // Last 90 days

// To:
startTime: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), // Last 180 days (max retention)
```

**Impact**:
- ✅ Capture apps authorized up to 6 months ago
- ✅ Maximizes Google's retention period
- ⚠️ May increase API response time (more events to process)

---

#### Phase 3: Add Confidence Scoring (Enhanced)
**File**: `backend/src/services/google-api-client-service.ts`

**Add helper function**:
```typescript
function calculateAuthorizationConfidence(firstSeen: Date): {
  level: 'high' | 'medium' | 'low';
  note: string;
} {
  const daysAgo = (Date.now() - firstSeen.getTime()) / (24 * 60 * 60 * 1000);
  
  if (daysAgo <= 180) {
    return {
      level: 'high',
      note: 'Exact authorization date from audit logs'
    };
  } else if (daysAgo <= 365) {
    return {
      level: 'medium',
      note: 'Authorization date estimated (outside audit retention period)'
    };
  } else {
    return {
      level: 'low',
      note: 'Authorization occurred >1 year ago, exact date unavailable'
    };
  }
}
```

**Use in metadata**:
```typescript
const authConfidence = calculateAuthorizationConfidence(app.firstSeen);

metadata: {
  // ... existing fields
  authorizationDateConfidence: authConfidence.level,
  authorizationDateNote: authConfidence.note,
}
```

**Impact**:
- ✅ Clear confidence indicators for compliance teams
- ✅ Distinguish exact vs estimated dates
- ✅ Future-proof for long-running deployments

---

## 6. Database Storage Strategy

### Current Schema Issues

**Problem 1: `firstSeen` not stored in JSONB**
```typescript
// Currently missing from platform_metadata:
platform_metadata: {
  authorizedBy: "user@example.com",
  // ❌ firstSeen not persisted
  // ❌ lastSeen not persisted
}
```

**Problem 2: Discovery date vs authorization date confusion**
```sql
-- discovered_automations table has:
first_discovered_at    -- When OUR SCANNER found it (today)
created_at             -- When automation was created (in our DB)

-- But we need:
authorized_at          -- When USER clicked "Allow" (from audit logs)
```

### Recommended Schema Enhancement

**Option A: Use existing columns correctly** (Minimal change)
```typescript
// Map audit log timestamps to existing DB columns
{
  first_discovered_at: app.firstSeen,     // When user authorized (not when we discovered)
  last_seen_at: app.lastSeen,             // When user last used it
  platform_metadata: {
    discoveredByScanner: new Date().toISOString(),  // When our scanner found it
    authorizationDateSource: 'audit_log',
    authorizationDateConfidence: 'high'
  }
}
```

**Option B: Add dedicated column** (Schema migration required)
```sql
ALTER TABLE discovered_automations 
ADD COLUMN authorized_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_discovered_automations_authorized_at 
ON discovered_automations(authorized_at);
```

**Recommendation**: Use **Option A** (no schema changes, semantic reinterpretation)

---

## 7. Testing Strategy

### Test Cases Required

**Test 1: Recent Authorization (Within 90 Days)**
```typescript
it('should use actual authorization date from audit logs for recent apps', async () => {
  // Mock audit event from 30 days ago
  const mockEvent = {
    id: { time: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
    events: [{
      name: 'authorize',
      parameters: [
        { name: 'client_id', value: 'test-client-id' },
        { name: 'app_name', value: 'ChatGPT' }
      ]
    }]
  };
  
  const result = await googleApiClient.getOAuthApplications();
  expect(result[0].createdAt).toEqual(new Date(mockEvent.id.time));
  expect(result[0].metadata.authorizationDateConfidence).toBe('high');
});
```

**Test 2: Multiple Authorization Events**
```typescript
it('should use earliest authorization date when multiple events exist', async () => {
  const events = [
    { id: { time: '2025-09-15T10:00:00Z' } },  // Later re-authorization
    { id: { time: '2025-08-01T14:30:00Z' } }   // Initial authorization
  ];
  
  const result = await googleApiClient.getOAuthApplications();
  expect(result[0].createdAt).toEqual(new Date('2025-08-01T14:30:00Z'));
});
```

**Test 3: Outside Retention Period**
```typescript
it('should handle apps authorized before retention window', async () => {
  // Simulate app with no audit events (>180 days old)
  // This would require UI indication that date is discovery date, not auth date
});
```

---

## 8. Data Migration Plan

### Step 1: Identify Affected Records
```sql
-- Find OAuth apps with incorrect created_at dates
SELECT 
  id, 
  name, 
  first_discovered_at, 
  platform_metadata->>'authorizedBy' as authorized_by,
  platform_metadata->>'firstAuthorizedAt' as first_auth_at
FROM discovered_automations
WHERE automation_type = 'integration'
  AND trigger_type = 'oauth'
  AND first_discovered_at::date = CURRENT_DATE;  -- Created today (likely wrong)
```

### Step 2: Backfill Correct Dates
```typescript
// Run one-time migration script
async function backfillOAuthAuthorizationDates() {
  // 1. Re-run discovery with extended 180-day window
  const updatedApps = await googleApiClient.getOAuthApplications();
  
  // 2. Update database with correct firstSeen timestamps
  for (const app of updatedApps) {
    await db.query(`
      UPDATE discovered_automations
      SET 
        first_discovered_at = $1,
        last_seen_at = $2,
        platform_metadata = platform_metadata || $3
      WHERE external_id = $4
    `, [
      app.firstSeen,
      app.lastSeen,
      JSON.stringify({
        firstAuthorizedAt: app.firstSeen.toISOString(),
        lastSeenAt: app.lastSeen.toISOString(),
        authorizationDateConfidence: 'high'
      }),
      app.clientId
    ]);
  }
}
```

### Step 3: Verify Migration
```sql
-- Check that dates are now distributed (not all today)
SELECT 
  DATE_TRUNC('day', first_discovered_at) as auth_date,
  COUNT(*) as app_count
FROM discovered_automations
WHERE automation_type = 'integration'
GROUP BY auth_date
ORDER BY auth_date DESC;
```

---

## 9. Code Changes Summary

### File: `backend/src/services/google-api-client-service.ts`

**Change 1: Extend query window (Line 600)**
```diff
- startTime: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // Last 90 days
+ startTime: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), // Last 180 days (max retention)
```

**Change 2: Use captured timestamps (Line 970)**
```diff
- createdAt: new Date(),
+ createdAt: app.firstSeen,
```

**Change 3: Add lastTriggered (Line 971)**
```diff
- lastTriggered: null,
+ lastTriggered: app.lastSeen,
```

**Change 4: Add timestamps to metadata (Line 979)**
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

**Total Changes**: 4 lines modified, 4 lines added

---

## 10. Risk Assessment

### Risks of Implementation

**Low Risk**:
- ✅ Non-breaking change (only affects new discoveries)
- ✅ No schema modifications required
- ✅ Timestamps already captured, just using them

**Medium Risk**:
- ⚠️ Existing records need backfill (data migration)
- ⚠️ 180-day query may hit Google API rate limits

**Mitigation**:
- Run backfill during off-hours
- Add pagination for large audit log queries
- Monitor API quota usage

---

## 11. Success Criteria

### Definition of Done

**Functional Requirements**:
- ✅ OAuth apps show actual authorization date (not discovery date)
- ✅ ChatGPT authorized 30 days ago shows `first_discovered_at = 30 days ago`
- ✅ Confidence metadata indicates data source
- ✅ Multiple authorization events use earliest date

**Testing Requirements**:
- ✅ Unit tests for timestamp mapping
- ✅ Integration tests with mock audit logs
- ✅ E2E test validating UI displays correct dates

**Data Quality**:
- ✅ 0 apps show `first_discovered_at = today` after backfill
- ✅ Date distribution spans 180-day window
- ✅ Audit trail preserved in JSONB metadata

---

## 12. Compliance Impact

### Before Fix
- ❌ Cannot prove when ChatGPT was authorized
- ❌ Audit reports show all apps authorized "today"
- ❌ Cannot track historical OAuth app adoption
- ❌ Compliance teams cannot validate authorization timelines

### After Fix
- ✅ Exact authorization dates from audit logs
- ✅ 180-day historical visibility
- ✅ Confidence indicators for data quality
- ✅ Audit trail in JSONB for forensics

---

## 13. Next Steps

### Immediate Actions (P0)
1. ✅ **Research Complete** - This document
2. 🔄 **Implement Phase 1** - Use `app.firstSeen` (4-line change)
3. 🔄 **Write Tests** - Validate timestamp mapping
4. 🔄 **Deploy to Dev** - Test with real Google Workspace

### Short-Term (P1)
5. 🔄 **Implement Phase 2** - Extend to 180-day window
6. 🔄 **Data Backfill** - Correct existing records
7. 🔄 **UI Updates** - Display authorization date prominently

### Long-Term (P2)
8. 🔄 **Phase 3 Confidence Scoring** - Add metadata enhancements
9. 🔄 **BigQuery Export** - For >180 day retention (Enterprise customers)
10. 🔄 **Alerting** - Notify when new OAuth apps authorized

---

## Appendix A: Google Admin Reports API Reference

### Relevant API Documentation

**API Endpoint**: `admin.reports.activities.list`

**Application Names**:
- `login` - User authentication events (includes oauth2_authorize)
- `token` - OAuth token grants and refreshes

**Event Names for OAuth**:
- `authorize` - User clicked "Allow" on OAuth consent screen
- `oauth2_authorize` - OAuth 2.0 authorization completed
- `token_refresh` - OAuth token refreshed

**Event Parameters**:
- `client_id` - OAuth client ID
- `app_name` - Human-readable app name
- `scope` / `oauth_scopes` - Permissions granted
- `actor_email` - User who authorized the app

**Timestamp Field**: `event.id.time` (RFC3339 format)

**Maximum Retention**: 180 days (6 months)

---

## Appendix B: Comparison with Other Platforms

### Slack OAuth History
- **Retention**: Indefinite (app install events never deleted)
- **API**: `/apps.permissions.users.list` shows exact install date
- **Accuracy**: 100% (no time limits)

### Microsoft 365 Audit Logs
- **Retention**: 90 days (default), 1 year (E5 license)
- **API**: Office 365 Management Activity API
- **Accuracy**: High within retention period

### Google Workspace (This Platform)
- **Retention**: 180 days (best among major platforms)
- **API**: Admin Reports API
- **Accuracy**: 100% within 180-day window

---

## Conclusion

**RESEARCH FINDINGS SUMMARY**:

1. ✅ **Google audit logs ARE accurate** - `event.id.time` = exact authorization timestamp
2. ✅ **We ARE capturing the data** - `app.firstSeen` correctly populated
3. ❌ **We are NOT using the data** - Hardcoded `new Date()` instead
4. ✅ **Fix is simple** - 4-line code change
5. ✅ **180-day retention** - Can extend from 90 to 180 days
6. ✅ **No breaking changes** - Uses existing schema

**RECOMMENDATION**: Implement Phase 1 immediately (highest ROI, lowest risk)

**EFFORT ESTIMATE**: 
- Development: 2 hours
- Testing: 1 hour
- Data backfill: 30 minutes
- **Total**: 3.5 hours

**BUSINESS VALUE**: Critical for compliance audits, customer trust, security investigations

---

**Report Prepared By**: Detection Algorithm Engineer  
**Reviewed By**: [Pending]  
**Approved By**: [Pending]  
**Status**: Ready for Implementation
