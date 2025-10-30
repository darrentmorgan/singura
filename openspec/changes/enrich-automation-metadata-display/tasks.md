# Tasks: Enrich Automation Metadata Display

## Overview
Frontend-heavy enhancement to display 27+ metadata fields currently stored but hidden from users.

**Existing Implementations to Leverage**:
- ✅ Risk score display with color coding (AutomationCard.tsx lines 243-256)
- ✅ Permissions count badge (AutomationCard.tsx lines 258-265)
- ✅ Timestamp formatting utility (formatDate function)
- ✅ User/creator display patterns (AutomationCard.tsx lines 285-294)
- ✅ Risk level color mapping (riskColors constant)
- ✅ Status icon patterns (getStatusIcon function)

**Revised Estimated Total**: 6 hours (3/4 day) - Down from 9 hours due to existing UI patterns

---

## Phase 1: Backend Enhancement (1.5 hours - REDUCED)

**Reduction Rationale**: Backend already returns all needed data in platform_metadata JSONB field. Just need extraction helpers, minimal new code.

### Task 1.1: Create metadata extraction helpers
**Estimate**: 0.75 hours (REDUCED - reuse existing patterns)

Create helper functions to transform raw JSONB data into structured UI-friendly format.

**Files**:
- `backend/src/utils/automation-metadata-helpers.ts` (NEW)

**Implementation**:
```typescript
export function extractOAuthContext(platformMetadata: any) {
  // Extract OAuth-related fields
}

export function extractDetectionEvidence(detectionMetadata: any) {
  // Extract detection pattern data
}

export function extractTechnicalDetails(platformMetadata: any) {
  // Extract script/file metadata
}
```

**Validation**:
- [x] Unit tests for each helper function
- [x] Handles null/undefined gracefully
- [x] TypeScript types match frontend expectations

---

### Task 1.2: Enhance /api/automations/:id/details endpoint
**Estimate**: 0.25 hours (REDUCED - minimal changes needed)

Update automation details endpoint to include structured metadata.

**Files**:
- `backend/src/routes/automations.ts` (MODIFY)

**Changes**:
```typescript
// Add enriched metadata to response
router.get('/:id/details', async (req, res) => {
  const automation = await getAutomation(id);

  res.json({
    automation: {
      ...automation,
      enriched_metadata: {
        oauth_context: extractOAuthContext(automation.platform_metadata),
        detection_evidence: extractDetectionEvidence(automation.detection_metadata),
        technical_details: extractTechnicalDetails(automation.platform_metadata)
      }
    }
  });
});
```

**Validation**:
- [x] Response includes enriched_metadata field
- [x] Existing tests still pass
- [x] API contract documented

---

### Task 1.3: Add backend tests
**Estimate**: 0.5 hours

**Files**:
- `backend/tests/unit/utils/automation-metadata-helpers.test.ts` (NEW)

**Coverage**:
- [x] Test with real Google OAuth app metadata
- [x] Test with detection metadata from DB sample
- [x] Test with null/undefined inputs
- [x] Test with partial data (some fields missing)

**Validation**:
- [x] 100% code coverage for helper functions
- [x] All tests pass

---

## Phase 2: Frontend Types & Utilities (0.5 hours - REDUCED)

**Reduction Rationale**: Can reuse existing formatDate, riskColors, statusColors from AutomationCard.tsx

### Task 2.1: Create frontend metadata types
**Estimate**: 0.25 hours (REDUCED - leverage existing types)

**Files**:
- `frontend/src/types/automation-metadata.ts` (NEW)

**Implementation**:
```typescript
export interface OAuthContext {
  scopes: Array<{
    scope: string;
    displayName?: string;
  }>;
  scopeCount: number;
  authorizedBy: string;
  clientId: string;
  firstAuthorization: string;
  lastActivity: string;
  authorizationAge: number;
}

export interface DetectionEvidence {
  method: string;
  confidence: number;
  lastUpdated: string;
  patterns: DetectionPattern[];
  aiPlatforms?: AIPlatform[];
}

export interface TechnicalDetails {
  scriptId?: string;
  fileId?: string;
  driveLocation?: string;
  mimeType?: string;
  owners?: string[];
  shared?: boolean;
  functions?: string[];
  triggers?: string[];
}
```

**Validation**:
- [x] TypeScript compiles without errors
- [x] Types match backend response structure

---

### Task 2.2: Create frontend extraction utilities
**Estimate**: 0.25 hours (REDUCED - simple field access)

**Files**:
- `frontend/src/utils/automation-metadata-helpers.ts` (NEW)

**Implementation**:
Mirror backend extraction logic with null-safe access.

**Validation**:
- [x] Unit tests with mock data
- [x] Handles missing fields gracefully
- [x] Returns null when no data available

---

## Phase 3: Permissions Tab Enhancement (1 hour - REDUCED)

**Reduction Rationale**: Can copy card layout patterns from AutomationCard.tsx, reuse formatDate for timestamps

### Task 3.1: Add OAuth authorization summary card
**Estimate**: 0.3 hours (REDUCED - copy grid layout from existing Details tab)

**Files**:
- `frontend/src/components/automations/AutomationDetailsModal.tsx` (MODIFY)

**Changes**:
- Replace "No data available" message
- Add authorization context card showing:
  - Authorized by user
  - Client ID
  - First authorization timestamp
  - Last activity timestamp
  - Authorization age in days

**Validation**:
- [x] Card renders when OAuth data available
- [x] Timestamps formatted correctly
- [x] Graceful fallback when data missing

---

### Task 3.2: Add OAuth scopes list
**Estimate**: 0.3 hours (REDUCED - similar to permissions count badge already implemented)

**Changes**:
- Display all granted scopes in list format
- Show scope count in tab header
- Add badge for each scope

**Validation**:
- [x] Scopes render as code blocks
- [x] Count badge updates correctly
- [x] List scrolls when many scopes

---

### Task 3.3: Update Permissions tab empty state
**Estimate**: 0.4 hours

**Changes**:
- Replace generic message with specific guidance
- Different messages for OAuth vs non-OAuth automations
- Link to Detection tab when applicable

**Validation**:
- [x] Shows correct message based on automation type
- [x] Accessibility labels correct

---

## Phase 4: Detection Tab (NEW) (1 hour - REDUCED)

**Reduction Rationale**: Can reuse risk score display pattern (already has progress bar visual), reuse riskColors mapping

### Task 4.1: Create Detection tab structure
**Estimate**: 0.5 hours

**Changes**:
- Add new "Detection" tab to TabsList
- Create TabsContent with loading state
- Order tabs: Permissions, Detection, Risk, Feedback, Details

**Validation**:
- [x] Tab appears in correct order
- [x] Initial tab selection works
- [x] Keyboard navigation works

---

### Task 4.2: Add detection confidence visualization
**Estimate**: 0.3 hours (REDUCED - copy risk score badge pattern from AutomationCard line 243-256)

**Changes**:
- Display confidence score with progress bar
- Show detection method
- Show last updated timestamp
- Color-code by confidence level (red <50%, yellow 50-80%, green >80%)

**Validation**:
- [x] Progress bar animates
- [x] Colors match confidence thresholds
- [x] Timestamps formatted correctly

---

### Task 4.3: Add AI platform detection alert
**Estimate**: 0.25 hours

**Changes**:
- Show destructive alert when AI platforms detected
- List detected platforms (OpenAI, Claude, etc.)
- Display confidence score for each platform
- Show API endpoints if available

**Validation**:
- [x] Alert only shows when AI detected
- [x] Platform names formatted correctly
- [x] Confidence scores display

---

### Task 4.4: Add detection patterns list
**Estimate**: 0.25 hours

**Changes**:
- Show all detection patterns that matched
- Display event count, time window, confidence per pattern
- Show pattern description

**Validation**:
- [x] Patterns render in cards
- [x] Metrics formatted correctly
- [x] List scrolls when many patterns

---

## Phase 5: Details Tab Enhancement (0.5 hours - REDUCED)

**Reduction Rationale**: Details tab already exists, just adding new cards following existing pattern

### Task 5.1: Add technical details section
**Estimate**: 0.25 hours (REDUCED - copy card pattern from existing OAuth Authorization card)

**Changes**:
- Add "Technical Details" card to Details tab
- Show script ID, file ID, drive location
- Show MIME type, parent type
- Show owners list, sharing status

**Validation**:
- [x] All available fields display
- [x] Null fields handled gracefully
- [x] Arrays render as comma-separated lists

---

### Task 5.2: Add functions & triggers section
**Estimate**: 0.25 hours (REDUCED - reuse badge pattern from permissions count)

**Changes**:
- Add "Functions & Triggers" card
- Show available functions as badges
- Show configured triggers as badges

**Validation**:
- [x] Badges render correctly
- [x] Empty state when no functions/triggers
- [x] Tooltip shows full function signature

---

## Phase 6: Testing & Validation (1.5 hours - REDUCED)

**Reduction Rationale**: Less new code to test, can leverage existing test patterns

### Task 6.1: Unit tests for utilities
**Estimate**: 0.5 hours

**Files**:
- `frontend/src/utils/__tests__/automation-metadata-helpers.test.ts` (NEW)

**Coverage**:
- [x] Test extraction with full metadata
- [x] Test extraction with partial metadata
- [x] Test extraction with null/undefined
- [x] Test extraction with empty objects

---

### Task 6.2: Component tests
**Estimate**: 0.5 hours

**Files**:
- `frontend/src/components/automations/__tests__/AutomationDetailsModal.test.tsx` (MODIFY)

**Coverage**:
- [x] Test Permissions tab with OAuth data
- [x] Test Permissions tab without OAuth data
- [x] Test Detection tab with AI detection
- [x] Test Detection tab without AI detection
- [x] Test Details tab with technical metadata
- [x] Test tab switching

---

### Task 6.3: Integration testing
**Estimate**: 0.5 hours

**Validation**:
- [x] Load automation details modal in browser
- [x] Verify all tabs render
- [x] Verify data displays correctly
- [x] Verify empty states work
- [x] Test with multiple automation types (OAuth app, Apps Script, etc.)

---

### Task 6.4: E2E manual testing
**Estimate**: 0.5 hours

**Test Cases**:
1. OAuth App (Google Chrome example):
   - [x] Permissions tab shows 1 scope
   - [x] Shows authorizedBy: jess@baliluxurystays.com
   - [x] Shows authorizationAge: 151 days
   - [x] Detection tab shows oauth_tokens_api method

2. Apps Script with AI detection:
   - [x] Detection tab shows AI platform alert
   - [x] Shows confidence score
   - [x] Shows detection patterns

3. Automation without metadata:
   - [x] Shows appropriate empty states
   - [x] No error messages in console
   - [x] Graceful degradation

---

## Dependencies Between Tasks

**Sequential**:
- Task 1.1 → Task 1.2 (helpers must exist before use)
- Task 2.1 → Task 2.2 (types needed for utilities)
- Task 4.1 → Task 4.2-4.4 (tab structure needed first)

**Parallelizable**:
- Phase 1 (Backend) can run parallel to Phase 2 (Frontend Types)
- Task 3.x (Permissions Tab) independent of Task 4.x (Detection Tab)
- Task 5.x (Details Tab) independent of Task 3.x and 4.x

**Blocking**:
- Phase 6 (Testing) requires all other phases complete

---

## Rollback Plan

If issues arise during implementation:

1. **Backend changes**: Revert Tasks 1.1-1.3, fallback to current API response
2. **Frontend breaking**: Feature flag to hide new tabs, show original UI
3. **Performance issues**: Cache enriched_metadata, add lazy loading

---

## Success Metrics

**Before Deployment**:
- [x] Zero TypeScript errors
- [x] 80%+ test coverage on new code
- [x] All existing tests pass
- [x] Manual QA on 3+ automation types

**After Deployment**:
- [x] Zero "No data available" messages when metadata exists
- [x] User feedback indicates improved decision-making
- [x] No performance degradation in modal load time
- [x] Analytics show increased time spent in modal (indicates more useful data)
