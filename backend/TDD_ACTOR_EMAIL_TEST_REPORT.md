# TDD Test Suite: OAuth Actor Email Extraction

**Feature:** Extract `event.actor.email` from Google Audit Logs to populate `createdBy` field

**Status:** RED Phase ✅ (All tests written, all failing as expected)

**Date:** 2025-10-06

---

## Test Coverage Summary

### Unit Tests Created

#### 1. **Actor Email Extraction Tests**
**File:** `/Users/darrenmorgan/AI_Projects/singura/backend/src/__tests__/services/google-oauth-actor-extraction.test.ts`

**Test Count:** 18 tests
**Status:** All FAILING (expected)

**Test Coverage:**
- ✅ Basic actor email extraction from audit logs
- ✅ AI platform detection with actor tracking
- ✅ Edge cases (missing email, null, undefined, empty string)
- ✅ Multiple users authorizing same app
- ✅ Different OAuth event types (oauth2_authorize, authorize, token)
- ✅ Multiple apps with different authorizers
- ✅ Email format validation (valid/invalid formats)
- ✅ Integration with AI platform detection (ChatGPT, Claude, Gemini)
- ✅ Timestamp and scopes integration

**Key Test Cases:**
```typescript
describe('Basic Actor Email Extraction', () => {
  it('should extract actor email from audit log event')
  it('should extract actor email for AI platform apps')
});

describe('Edge Cases - Missing/Invalid Actor Data', () => {
  it('should handle missing actor email gracefully')
  it('should handle undefined actor object')
  it('should handle empty string actor email')
  it('should handle null actor email')
});

describe('Multiple Users - Same App Scenarios', () => {
  it('should use first authorizer when multiple users authorize same app')
  it('should update to latest authorizer when firstSeen logic changes')
  it('should handle mixed valid and invalid actor emails for same app')
});
```

---

#### 2. **API Mapping Tests**
**File:** `/Users/darrenmorgan/AI_Projects/singura/backend/src/__tests__/services/google-oauth-api-mapping.test.ts`

**Test Count:** 14 tests
**Status:** All FAILING (expected)

**Test Coverage:**
- ✅ Basic authorizedBy → createdBy mapping
- ✅ JSONB platform_metadata extraction
- ✅ Default values for missing data
- ✅ AI platform specific mappings (ChatGPT, Claude)
- ✅ Backwards compatibility with owner_info fallback
- ✅ Edge cases (empty string, non-string types)
- ✅ Batch mapping for multiple automations

**Key Test Cases:**
```typescript
describe('Basic authorizedBy → createdBy Mapping', () => {
  it('should map authorizedBy to createdBy in API response')
  it('should default to unknown when authorizedBy missing')
  it('should default to unknown when platform_metadata is empty object')
});

describe('Backwards Compatibility - owner_info Fallback', () => {
  it('should prefer authorizedBy over owner_info.email')
  it('should fallback to owner_info.email when authorizedBy missing')
  it('should use unknown when both authorizedBy and owner_info.email missing')
});
```

---

#### 3. **Integration Tests**
**File:** `/Users/darrenmorgan/AI_Projects/singura/backend/src/__tests__/integration/google-oauth-actor-persistence.integration.test.ts`

**Test Count:** 8 integration tests
**Status:** Schema updated, ready to test after implementation

**Test Coverage:**
- ✅ Full discovery flow (Audit Log → Database → API)
- ✅ Database persistence of authorizedBy in platform_metadata
- ✅ API endpoint response mapping
- ✅ Multi-organization data isolation
- ✅ Repository pattern JSONB queries
- ✅ AI platform detection with actor tracking
- ✅ Performance testing (100+ automations)

**Key Test Cases:**
```typescript
describe('Full Discovery Flow - Audit Log → Database → API', () => {
  it('should persist authorizedBy through full discovery flow')
  it('should handle missing actor email throughout flow')
});

describe('Multiple Organizations - Data Isolation', () => {
  it('should isolate authorizedBy data between organizations')
});

describe('AI Platform Detection with Actor Tracking', () => {
  it('should track authorizedBy for ChatGPT detection')
  it('should track multiple AI platforms with different authorizers')
});
```

---

## Test Execution Results

### Unit Tests: Actor Extraction
```bash
npm test -- google-oauth-actor-extraction.test.ts

RESULTS:
  Test Suites: 1 failed, 1 total
  Tests:       18 failed, 18 total

  ✅ ALL TESTS FAILING AS EXPECTED (RED PHASE)

  Error: NOT IMPLEMENTED: extractOAuthAppsFromAuditLogs not yet refactored
```

### Unit Tests: API Mapping
```bash
npm test -- google-oauth-api-mapping.test.ts

RESULTS:
  Test Suites: 1 failed, 1 total
  Tests:       14 failed, 14 total

  ✅ ALL TESTS FAILING AS EXPECTED (RED PHASE)

  Error: NOT IMPLEMENTED: mapAutomationToAPI not yet updated
```

### Integration Tests
```bash
npm test -- google-oauth-actor-persistence.integration.test.ts

STATUS: Schema migration complete
        Tests written with correct database schema
        Ready to run after implementation
```

---

## Implementation Checklist

### Phase 1: Extract Actor Email (google-api-client-service.ts)

**Current Code (Lines 622-678):**
```typescript
const oauthAppsMap = new Map<string, {
  clientId: string;
  displayText: string;
  scopes: Set<string>;
  firstSeen: Date;
  lastSeen: Date;
  // ❌ Missing: authorizedBy
}>();

for (const event of allEvents) {
  // ❌ Never captures event.actor.email
  for (const ev of event.events) {
    // Only extracts from ev.parameters
  }
}
```

**Required Changes:**
```typescript
const oauthAppsMap = new Map<string, {
  clientId: string;
  displayText: string;
  scopes: Set<string>;
  firstSeen: Date;
  lastSeen: Date;
  authorizedBy: string;  // ✅ ADD THIS
}>();

for (const event of allEvents) {
  const actorEmail = event.actor?.email || 'unknown';  // ✅ CAPTURE THIS

  for (const ev of event.events) {
    if (clientId) {
      if (!oauthAppsMap.has(clientId)) {
        oauthAppsMap.set(clientId, {
          // ... existing fields
          authorizedBy: actorEmail  // ✅ STORE THIS
        });
      }
    }
  }
}
```

**Files to Modify:**
- ✅ `/Users/darrenmorgan/AI_Projects/singura/backend/src/services/google-api-client-service.ts` (lines 622-678)

**Tests to Pass:** 18 tests in `google-oauth-actor-extraction.test.ts`

---

### Phase 2: Store in Database (discovery-service.ts)

**Required Changes:**
```typescript
// When storing OAuth apps in database
const platformMetadata = {
  clientId: app.clientId,
  scopes: app.scopes,
  isAIPlatform: app.isAIPlatform,
  platformName: app.platformName,
  authorizedBy: app.authorizedBy  // ✅ ADD THIS
};

await db.query(
  `INSERT INTO discovered_automations (
    organization_id,
    external_id,
    platform_metadata,
    ...
  ) VALUES ($1, $2, $3, ...)`,
  [orgId, externalId, JSON.stringify(platformMetadata), ...]
);
```

**Files to Modify:**
- ✅ `/Users/darrenmorgan/AI_Projects/singura/backend/src/services/discovery-service.ts`

---

### Phase 3: Map to API Response (automations-mock.ts)

**Current Code (Line 287):**
```typescript
createdBy: da.owner_info && typeof da.owner_info === 'object' && 'email' in da.owner_info
  ? String((da.owner_info as any).email)
  : 'unknown',
```

**Required Changes:**
```typescript
createdBy:
  // 1. Try platform_metadata.authorizedBy (NEW)
  da.platform_metadata?.authorizedBy ||
  // 2. Fallback to owner_info.email (OLD)
  (da.owner_info && typeof da.owner_info === 'object' && 'email' in da.owner_info
    ? String((da.owner_info as any).email)
    : 'unknown'),
```

**Files to Modify:**
- ✅ `/Users/darrenmorgan/AI_Projects/singura/backend/src/routes/automations-mock.ts` (line 287)
- ✅ `/Users/darrenmorgan/AI_Projects/singura/backend/src/routes/automations.ts` (similar logic)

**Tests to Pass:** 14 tests in `google-oauth-api-mapping.test.ts`

---

### Phase 4: Integration Verification

**Run Integration Tests:**
```bash
npm test -- google-oauth-actor-persistence.integration.test.ts
```

**Expected After Implementation:**
- ✅ All 8 integration tests PASS
- ✅ Actor email flows from audit logs → database → API
- ✅ Multi-org isolation works correctly
- ✅ AI platform detection preserves authorizedBy
- ✅ Performance acceptable for 100+ automations

**Tests to Pass:** 8 integration tests

---

## Success Criteria

### GREEN Phase Complete When:
1. ✅ All 18 actor extraction tests PASS
2. ✅ All 14 API mapping tests PASS
3. ✅ All 8 integration tests PASS
4. ✅ **Total:** 40/40 tests passing

### Production Verification:
```bash
# Run discovery for real workspace
npm run test:google-discovery-manual

# Expected output:
✓ ChatGPT (authorized by: darren@baliluxurystays.com)
✓ API response includes createdBy field
✓ No "unknown" for valid OAuth apps
```

---

## Test File Locations

```
backend/
└── src/
    └── __tests__/
        ├── services/
        │   ├── google-oauth-actor-extraction.test.ts    (18 tests)
        │   └── google-oauth-api-mapping.test.ts         (14 tests)
        └── integration/
            └── google-oauth-actor-persistence.integration.test.ts  (8 tests)
```

---

## Next Steps

1. **Review Test Cases** - Validate test expectations with team
2. **Implement Phase 1** - Extract actor email from audit logs
3. **Run Unit Tests** - Verify extraction logic
4. **Implement Phase 2** - Store in database
5. **Implement Phase 3** - Map to API response
6. **Run Integration Tests** - End-to-end validation
7. **Manual Testing** - Real workspace verification
8. **Commit** - GREEN phase complete

---

## Notes

- **TDD Protocol Followed:** Tests written BEFORE implementation
- **All Tests Currently RED:** As expected in TDD
- **Database Schema:** Already supports JSONB platform_metadata
- **Backwards Compatibility:** Fallback to owner_info.email maintained
- **Type Safety:** All tests use proper TypeScript types

**Status:** Ready for implementation ✅
