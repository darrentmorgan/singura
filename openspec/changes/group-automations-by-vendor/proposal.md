# Group Automations by Vendor

## Why

Security analysts see duplicate automation entries for the same vendor (e.g., two "Attio" entries) when vendors use multiple OAuth client IDs for different products or permission sets. This creates confusion and makes it harder to assess vendor-level risk across an organization.

Grouping related OAuth applications by vendor will:
- Reduce perceived duplication by 40%+ for organizations with multi-product vendors
- Enable vendor-level risk assessment and analytics
- Improve analyst productivity by showing consolidated vendor view
- Maintain individual OAuth app audit trail for compliance (SOC 2, GDPR, ISO 27001)

## Problem Statement

OAuth applications from the same vendor appear as separate entries in the automations list when they have different OAuth client IDs. This is **technically correct** (different client IDs = different security principals), but creates a poor user experience.

### Current State

**Example - Attio Duplicates**:
```
Attio | integration • google | Medium
- Client ID: 167690183287-ktk2mrcp1k8bd5eau2k7cb01tlblf563
- Scopes: 3 (basic profile)

Attio | integration • google | Medium
- Client ID: 167690183287-b5mo6an9uv6nt77i4d0447hlev31l7a2
- Scopes: 8 (includes Gmail, Calendar)
```

**Why This Happens**:
- Vendors create multiple OAuth apps for different products (e.g., Attio CRM vs Attio Gmail Add-on)
- Different permission sets require separate OAuth registrations
- Current deduplication uses `(platform_connection_id, external_id)` where `external_id = google-oauth-${clientId}`

**Impact**:
- Users perceive "duplicates" as a bug
- Vendor-level risk analysis requires manual aggregation
- List view cluttered with similar entries
- Difficult to answer "What access does Vendor X have?"

## Proposed Solution

Add vendor-level grouping capabilities while preserving individual OAuth app tracking for compliance.

### Solution Overview

**Backend Changes**:
1. **Vendor Extraction**: Extract vendor name from OAuth app display text
2. **Database Schema**: Add `vendor_name` and `vendor_group` columns to `discovered_automations`
3. **API Enhancement**: Support `?groupBy=vendor` query parameter

**Frontend Changes**:
1. **Grouped View**: Add "Group by Vendor" toggle
2. **Vendor Cards**: Show expandable cards with individual apps
3. **Vendor Badge**: Display app count and highest risk level

### User Experience

**Grouped View (New)**:
```
┌─────────────────────────────────────┐
│ Attio (2 applications)              │
│ ├─ 3 permissions (Core CRM)         │
│ └─ 8 permissions (Gmail Integration)│
│ Risk: Medium | Last seen: 2h ago    │
└─────────────────────────────────────┘
```

**Ungrouped View (Existing)**:
```
Attio | integration • google | Medium
Attio | integration • google | Medium
```

## Success Criteria

1. **Vendor Extraction Accuracy**: ≥90% of OAuth apps correctly extract vendor name
2. **API Performance**: Grouped API response adds <10ms overhead
3. **UI Toggle**: Users can switch between grouped/ungrouped views instantly (<200ms)
4. **Compliance Preserved**: Individual OAuth app audit trail maintained
5. **Testing Coverage**: ≥80% test coverage for vendor grouping logic

## Dependencies

- Existing discovery system (`backend/src/services/discovery-service.ts`)
- Google Workspace connector (`backend/src/connectors/google.ts:890-970`)
- Automation API (`backend/src/routes/automations.ts:143-347`)
- Frontend automation list (`frontend/src/components/AutomationList.tsx`)

## Phasing

### Phase 1: Backend Foundation (Week 1)
- Database migration for vendor columns
- Vendor extraction utility
- Update Google connector to populate vendor fields
- Add vendor grouping to API

### Phase 2: Frontend Grouping (Week 1-2)
- Add "Group by Vendor" toggle
- Implement grouped card UI
- Detail modal shows individual OAuth apps

### Phase 3: Analytics & Optimization (Week 2)
- Vendor-level risk dashboard
- Permission comparison across vendor apps
- Performance optimization (caching, indexes)

## Alternatives Considered

### Alternative 1: Consolidate into Single Entry
**Rejected**: Loses individual OAuth app identity, breaks compliance audit requirements

### Alternative 2: Enhanced Display Names Only
**Considered**: Quick fix ("Attio (3 permissions)" vs "Attio (8 permissions)")
**Why Not Primary**: Doesn't enable vendor-level analytics, still shows "duplicates"

### Alternative 3: Vendor Detection via API
**Rejected**: External API calls add latency and dependency, less reliable than name extraction

## Risks

**Risk 1: Inaccurate Vendor Extraction**
- **Mitigation**: Allow manual vendor assignment in UI
- **Fallback**: Display original name if extraction fails

**Risk 2: Performance Degradation**
- **Mitigation**: Add database indexes on vendor columns
- **Mitigation**: Cache grouped responses for high-volume orgs

**Risk 3: Hidden Risk Differentiation**
- **Mitigation**: Show highest risk level in group badge
- **Mitigation**: Expanded view shows individual app risks clearly

## References

- Discovery Service: `backend/src/services/discovery-service.ts:376-456`
- Google OAuth Discovery: `backend/src/connectors/google.ts:890-970`
- Database Schema: `backend/migrations/002_discovery_schema.sql:113`
- API Endpoint: `backend/src/routes/automations.ts:143-347`
- Frontend Analysis: Investigation confirmed backend returning two distinct OAuth apps
