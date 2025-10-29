# Enrich Automation Metadata Display

## Why

Security analysts currently see "No enriched permission data available" in automation details modals despite 27+ metadata fields being stored in the database. This creates a poor user experience and forces analysts to query the database directly or make uninformed decisions about automation risks.

Displaying this existing metadata will:
- Enable informed risk assessment without database access
- Improve analyst productivity by 50%+ (estimated)
- Reduce support requests for "missing data"
- Increase user confidence in the platform's detection capabilities

## Problem Statement

Currently, the automation details modal (Permissions tab) displays "No enriched permission data available" even though **27 distinct metadata fields** are available in the database (`platform_metadata` JSONB column). This creates a poor user experience and prevents security teams from making informed decisions about automation risk.

### Current State Analysis

**Database Reality** (discovered_automations table):
- **27 metadata keys** stored in `platform_metadata` JSONB field
- **Detection metadata** with confidence scores, patterns, and evidence
- **Risk factors** array with human-readable security concerns
- **OAuth scopes** with detailed permission information
- **Owner information** (authorizedBy, email addresses)
- **Activity timestamps** (lastActivity, firstAuthorization, authorizationAge)
- **AI platform detection** (aiPlatforms, aiEndpoints, confidence scores)
- **Drive/file metadata** (scriptId, fileId, driveLocation, parentType)

**UI Reality** (AutomationDetailsModal.tsx):
- Shows "No enriched permission data available" for most automations
- Only displays data if backend returns enriched scope objects
- Missing display of 27+ available metadata fields
- Permissions tab largely empty despite rich data availability

### Data Gap Summary

**Available but NOT displayed** (27 fields):
```
✅ Available in DB          ❌ NOT displayed in UI
-------------------         ---------------------
- scopes (array)           → No scope list shown
- scopeCount               → No count badge
- authorizedBy             → Only in Details tab
- clientId                 → Only in Details tab
- firstAuthorization       → Only in Details tab
- lastActivity             → Only in Details tab
- authorizationAge (days)  → Only in Details tab
- riskFactors (array)      → Only in Risk tab
- isAIPlatform (boolean)   → Only in Risk tab
- aiPlatforms (array)      → Not shown
- aiEndpoints (array)      → Not shown
- aiPlatformConfidence     → Not shown
- detectionMethod          → Only in Details tab
- scriptId                 → Not shown
- fileId / driveFileId     → Not shown
- driveLocation            → Not shown
- parentType               → Not shown
- mimeType                 → Not shown
- owners (array)           → Not shown
- shared (boolean)         → Not shown
- functions (array)        → Not shown
- triggers (array)         → Not shown
- permissions (array)      → Not shown
- description              → Only in Details tab
```

**Detection Metadata** (not displayed at all):
- `lastUpdated` - When detection was last run
- `detectionPatterns` - Array of pattern matches with evidence
  - `eventCount` - Number of correlated events
  - `timeWindowMs` - Time window for detection
  - `automationConfidence` - ML confidence score (0-100)
  - `supportingEvents` - Event IDs that contributed to detection
  - `description` - Human-readable pattern description

## Proposed Solution

Enhance the automation details modal to display **maximum available metadata** across three areas:

### 1. Permissions Tab Enhancement
Display ALL OAuth-related metadata that's currently stored but hidden:
- **Scope List**: Show all granted scopes (from `platform_metadata.scopes` array)
- **Scope Count Badge**: Display count in tab header
- **Authorization Context**: User who authorized, when, how long ago
- **Client Information**: Client ID, platform name
- **Access Patterns**: What data the automation can access

### 2. Detection Evidence Tab (NEW)
Create new tab to show AI detection metadata:
- **Detection Confidence**: ML confidence score with visual indicator
- **Detection Method**: How automation was discovered
- **Pattern Evidence**: Event counts, time windows, supporting events
- **AI Platform Detection**: Specific AI platforms detected (OpenAI, Claude, etc.)
- **Detection History**: Last updated timestamp

### 3. Technical Details Expansion
Enhance existing Details tab with:
- **Script/File Information**: Drive location, script ID, file ID, MIME type
- **Ownership**: All owners, sharing status
- **Functions & Triggers**: Available functions, configured triggers
- **Activity Timeline**: First seen, last seen, last activity

## User Impact

**Before**: Security analyst sees "No enriched permission data available" and must query database directly or make assumptions.

**After**: Security analyst sees:
- 15 OAuth scopes granted with descriptions
- Authorized by jess@company.com 151 days ago
- AI platform detected: OpenAI (95% confidence)
- Detection via oauth_tokens_api method
- 263 correlated events in 4-second window
- Risk factors: "1 OAuth scopes granted", "Active automation"

## Success Criteria

1. **Zero "No data available" messages** when metadata exists in database
2. **27+ metadata fields displayed** across modal tabs
3. **Detection metadata visible** in new Evidence tab
4. **Scope list rendered** with human-readable names
5. **AI detection results** prominently displayed
6. **User can make risk assessment** without leaving modal

## Out of Scope

- OAuth scope enrichment API (separate feature)
- Real-time scope validation
- Historical scope change tracking
- Automated remediation actions

## Dependencies

- None (uses existing database schema)
- No API changes required (data already stored)
- No schema migrations needed

## Risks & Mitigations

**Risk**: Too much information overwhelming users
**Mitigation**: Organize into collapsible sections, prioritize high-risk items

**Risk**: Performance impact from large JSONB queries
**Mitigation**: Already fetched via getAutomationDetails API, no additional query overhead

**Risk**: Inconsistent data structure across platforms
**Mitigation**: Type guards and optional chaining for safe access

## Timeline Estimate

**Original Estimate**: 9 hours
**Revised Estimate**: 6 hours (33% reduction)

**Breakdown**:
- **Investigation**: ✅ Complete (2 hours)
- **Spec Writing**: ✅ Complete (1 hour)
- **Backend Enhancement**: 1.5 hours (down from 2h - data already available)
- **Frontend Implementation**: 2.5 hours (down from 4h - leverage existing card patterns)
- **Testing**: 1.5 hours (down from 2h - less new code)
- **Total**: ~6 hours (3/4 day)

**Time Savings From**:
- Reusing AutomationCard.tsx UI patterns (risk scores, timestamps, badges)
- Copying existing formatDate utility (lines 84-98)
- Leveraging existing riskColors mapping (lines 38-44)
- Following established card layout patterns
- Data already in database (no schema changes)
