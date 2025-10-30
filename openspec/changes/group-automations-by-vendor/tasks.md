# Implementation Tasks: Vendor-Level Grouping

## Phase 1: Backend Foundation (Week 1)

### 1.1 Database Migration
- [x] Create `013_add_vendor_grouping.sql` migration
  - Add `vendor_name VARCHAR(255)` column to `discovered_automations`
  - Add `vendor_group VARCHAR(255)` column to `discovered_automations`
  - Create index: `idx_discovered_automations_vendor_name`
  - Create index: `idx_discovered_automations_vendor_group`
  - Create composite index: `idx_discovered_automations_platform_vendor`
- [x] Test migration up/down on local database
- [x] Verify indexes are created with `EXPLAIN ANALYZE`

**Validation**:
- Migration applies cleanly with `npm run migrate:up`
- Migration reverts cleanly with `npm run migrate:down`
- Query performance test: `SELECT * FROM discovered_automations WHERE vendor_name = 'Attio'` uses index

---

### 1.2 Vendor Extraction Utility
- [x] Create `backend/src/utils/vendor-extraction.ts`
  - Implement `extractVendorName(displayText: string): string | null`
  - Remove common suffixes (OAuth, API, App, for Google Workspace)
  - Remove domain extensions (.com, .io, .ai, .net, .org)
  - Return first word from cleaned text
  - Return null if length < 3 characters
- [x] Create unit tests in `backend/tests/unit/utils/vendor-extraction.test.ts`
  - Test case: `"Attio"` → `"Attio"`
  - Test case: `"Attio CRM"` → `"Attio"`
  - Test case: `"attio.com"` → `"attio"`
  - Test case: `"OAuth App: 12345"` → `null`
  - Test case: `"Slack for Google Workspace"` → `"Slack"`
  - Test case: `"slack.com"` → `"slack"`
  - Test case: `""` → `null`
  - Test case: `"AB"` → `null` (too short)

**Validation**:
- All 8 unit tests pass
- Test coverage: 100% for vendor-extraction.ts
- TypeScript compilation passes with strict mode

---

### 1.3 Update Google Connector
- [x] Update `backend/src/connectors/google.ts` (lines 890-970)
  - Import `extractVendorName` utility
  - Extract vendor name from `token.displayText`
  - Add `vendorName` to automation metadata
  - Calculate `vendorGroup` as `${vendorName}-${platform}` (e.g., "Attio-google")
- [x] Update `AutomationEvent` type in `@singura/shared-types`
  - Add optional `vendorName?: string` to metadata
  - Add optional `vendorGroup?: string` to metadata
- [ ] Update integration tests in `backend/tests/integration/connectors/google.test.ts`
  - Verify vendor fields populated in discovered automations
  - Test with mock OAuth tokens containing various display texts

**Validation**:
- OAuth discovery populates vendor fields correctly
- Integration tests pass
- Shared-types build succeeds

---

### 1.4 Update Discovery Service
- [x] Update `backend/src/services/discovery-service.ts`
  - Modify `storeDiscoveredAutomations()` to persist vendor fields
  - Update database INSERT/UPDATE statements to include `vendor_name`, `vendor_group`
- [ ] Add repository method `findByVendorName(vendorName: string)`
- [ ] Add unit tests for vendor field persistence

**Validation**:
- Database rows contain vendor_name and vendor_group
- Repository queries work correctly
- Unit tests pass

---

### 1.5 Backfill Existing Automations
- [x] Create migration script `scripts/backfill-vendor-names.ts`
  - Fetch all automations with `vendor_name = NULL`
  - Extract vendor name from `name` field
  - Update records with extracted vendor data
  - Log success/failure counts
- [ ] Test script on staging database
- [ ] Document rollback procedure

**Validation**:
- Script completes without errors
- 90%+ of existing automations have vendor_name populated
- Script is idempotent (safe to run multiple times)

---

### 1.6 API Grouping Endpoint
- [x] Update `backend/src/routes/automations.ts` (lines 143-347)
  - Add `groupBy` query parameter parsing (enum: 'vendor' | undefined)
  - Create `groupAutomationsByVendor()` function
    - Query: `GROUP BY vendor_name, platform_type`
    - Aggregates: `COUNT(*)`, `MAX(risk_level)`, `MAX(last_seen_at)`
  - Fetch individual apps per vendor
  - Return grouped response format
- [x] Update API response type
  - Add `grouped: boolean` field
  - Add `groupBy?: string` field
  - Add `vendorGroups?: VendorGroup[]` array
- [x] Add integration tests for grouped endpoint
  - Test `GET /api/automations?groupBy=vendor`
  - Verify grouped response structure
  - Verify backward compatibility (no groupBy parameter)

**Validation**:
- API returns grouped response when `?groupBy=vendor`
- API returns ungrouped response by default
- Response time overhead < 10ms
- Integration tests pass

---

## Phase 2: Frontend Grouping (Week 1-2)

### 2.1 API Client Updates
- [x] Update `frontend/src/services/api/automation-api.ts`
  - Add `groupBy?: 'vendor'` parameter to `getAutomations()`
  - Update response type to handle grouped/ungrouped formats
  - Add TypeScript types for `VendorGroup`
- [x] Update Zustand store `frontend/src/stores/automation-store.ts`
  - Add `groupByVendor: boolean` state
  - Add `setGroupByVendor(enabled: boolean)` action
  - Modify API call to include groupBy parameter

**Validation**:
- API client compiles with strict TypeScript
- Store state updates correctly
- No type errors

---

### 2.2 Vendor Group Card Component
- [x] Create `frontend/src/components/VendorGroupCard.tsx`
  - Accept `VendorGroup` props
  - Render vendor name + application count
  - Show highest risk level badge
  - Expandable/collapsible (default: collapsed)
  - Display individual apps when expanded
  - Show client ID and scope count for each app
- [ ] Create unit tests for component
  - Test collapsed state rendering
  - Test expand/collapse behavior
  - Test risk level badge colors

**Validation**:
- Component renders correctly in Storybook (if available)
- Unit tests pass
- Accessibility: keyboard navigation works

---

### 2.3 Update Automation List View
- [x] Update `frontend/src/components/AutomationList.tsx`
  - Add "Group by Vendor" toggle switch in header
  - Bind toggle to Zustand store state
  - Conditionally render `VendorGroupedView` or `AutomationCard` list
- [x] Create `VendorGroupedView.tsx` component
  - Accept `vendorGroups` array
  - Render list of `VendorGroupCard` components
  - Handle empty state

**Validation**:
- Toggle switches views instantly (<200ms)
- No UI flickering during switch
- Empty state displays correctly

---

### 2.4 Frontend Testing
- [ ] Add E2E tests for vendor grouping
  - Test toggle interaction
  - Test vendor card expand/collapse
  - Verify grouped API call is made
  - Verify individual apps displayed in expanded view
- [ ] Add component tests for VendorGroupCard
- [ ] Update visual regression tests (if applicable)

**Validation**:
- All E2E tests pass
- Test coverage ≥ 80% for new components
- Visual tests pass

---

## Phase 3: Optimization & Polish (Week 2+)

### 3.1 Performance Optimization
- [ ] Add caching for grouped responses
  - Implement Redis cache with 5-minute TTL
  - Cache key: `vendor-groups:${orgId}:${platformId}`
  - Invalidate cache on new discovery or automation deletion
- [ ] Add pagination for vendor groups
  - Limit vendor groups per page
  - Fetch individual apps on-demand when expanded
- [ ] Optimize database queries
  - Review query plans with `EXPLAIN ANALYZE`
  - Add additional indexes if needed

**Validation**:
- Grouped API response time < 60ms (with cache)
- Cache hit rate > 80%
- Database query uses indexes

---

### 3.2 Analytics & Monitoring
- [ ] Add analytics events
  - Track "vendor_grouping_toggle_enabled"
  - Track "vendor_group_expanded"
  - Track grouped vs ungrouped view usage
- [ ] Add performance metrics
  - Monitor grouped API response times
  - Track vendor extraction success rate
- [ ] Create dashboard for vendor grouping metrics

**Validation**:
- Analytics events firing correctly
- Metrics visible in monitoring dashboard

---

### 3.3 Documentation
- [ ] Update API documentation
  - Document `?groupBy=vendor` parameter
  - Add example grouped response
  - Document backward compatibility
- [ ] Update user guide
  - Add "Group by Vendor" feature documentation
  - Add screenshots of grouped view
  - Explain vendor extraction logic
- [ ] Update CHANGELOG.md
  - Document new feature in appropriate version

**Validation**:
- API docs generated successfully
- User guide reviewed by product team

---

## Validation & Deployment

### V.1 OpenSpec Validation
- [ ] Run `openspec validate group-automations-by-vendor --strict`
- [ ] Fix any validation errors
- [ ] Ensure all specs pass

**Validation**: OpenSpec validation passes with no errors

---

### V.2 Integration Testing
- [ ] Test full flow: Discovery → API → Frontend
  - Run Google OAuth discovery
  - Verify vendor fields populated
  - Toggle grouped view in UI
  - Expand vendor group
  - Verify individual apps displayed
- [ ] Test with multiple platforms (Slack, Google, Microsoft)
- [ ] Test with edge cases (null vendor names, single app vendors)

**Validation**: All integration test scenarios pass

---

### V.3 Performance Testing
- [ ] Benchmark grouped vs ungrouped API performance
  - Test with 10, 50, 100, 500 automations
  - Measure response times
  - Verify < 10ms overhead
- [ ] Load test grouped endpoint
  - 100 concurrent requests
  - Monitor database load
  - Verify no performance degradation

**Validation**: Performance meets success criteria (< 10ms overhead)

---

### V.4 Security Review
- [ ] Verify vendor grouping doesn't leak data across orgs
- [ ] Test RLS policies still enforced
- [ ] Audit trail preserved for individual apps
- [ ] Verify OAuth tokens not exposed in grouped view

**Validation**: Security audit passes, no vulnerabilities found

---

### V.5 Compliance Verification
- [ ] Confirm individual OAuth apps still tracked separately
- [ ] Verify audit logs show actions per automation ID (not vendor)
- [ ] Test ungrouped view still available
- [ ] Document compliance preservation in security docs

**Validation**: Compliance requirements met (SOC 2, GDPR, ISO 27001)

---

### V.6 Deployment
- [ ] Deploy database migration to staging
- [ ] Deploy backend changes to staging
- [ ] Deploy frontend changes to staging
- [ ] Test on staging environment
- [ ] Create deployment runbook
- [ ] Deploy to production (gradual rollout)
  - Week 1: 10% of users
  - Week 2: 50% of users
  - Week 3: 100% of users
- [ ] Monitor metrics and error rates

**Validation**:
- Staging deployment successful
- Production rollout completes with < 0.1% error rate
- No performance degradation in production

---

## Rollback Plan

### If Issues Arise
- [ ] **Immediate**: Toggle feature flag to disable grouped view (frontend)
- [ ] **If needed**: Revert backend changes (API remains backward compatible)
- [ ] **Last resort**: Rollback database migration (data loss for vendor fields)

**Rollback Time**: < 5 minutes for frontend, < 15 minutes for full rollback

---

## Success Metrics

Track these metrics after deployment:

1. **Vendor Extraction Accuracy**: ≥ 90% of OAuth apps correctly extract vendor name
2. **API Performance**: Grouped API adds < 10ms overhead
3. **UI Performance**: Toggle switches views in < 200ms
4. **Adoption**: ≥ 30% of users enable grouped view within 2 weeks
5. **User Feedback**: ≥ 80% positive feedback on grouped view
6. **Testing Coverage**: ≥ 80% test coverage for vendor grouping logic
7. **Compliance**: 100% of individual OAuth apps still tracked

---

## Dependencies

- **Shared-types updates** (Phase 1.3)
- **Database migration** (Phase 1.1) - Must complete before any code changes
- **Vendor extraction utility** (Phase 1.2) - Used by all other backend tasks
- **API changes** (Phase 1.6) - Must complete before frontend work
- **Backend deployment** - Must complete before frontend deployment

---

## Risk Mitigation

### Risk 1: Inaccurate Vendor Extraction
**Mitigation**:
- Comprehensive unit tests with edge cases
- Manual vendor assignment (future enhancement)
- Fallback to original display name

### Risk 2: Performance Degradation
**Mitigation**:
- Database indexes (Phase 1.1)
- Redis caching (Phase 3.1)
- Performance testing before production (V.3)

### Risk 3: Hidden Risk Differentiation
**Mitigation**:
- Show highest risk level in group badge
- Individual apps visible when expanded
- Ungrouped view always available

---

## Estimated Timeline

- **Phase 1 (Backend)**: 4-5 days
- **Phase 2 (Frontend)**: 3-4 days
- **Phase 3 (Optimization)**: 2-3 days
- **Validation & Deployment**: 2-3 days

**Total**: 11-15 days (~2.5 weeks)

---

## Next Steps After Implementation

1. **Phase 4: Vendor Analytics** (Future)
   - Vendor-level risk trends over time
   - Permission comparison across vendor apps
   - Vendor access heatmap

2. **Phase 5: Vendor Management** (Future)
   - Manual vendor assignment/correction
   - Vendor allowlist/blocklist
   - Vendor-level policies

3. **Phase 6: Multi-Platform Grouping** (Future)
   - Group "Slack" from Google + Microsoft + Slack platforms
   - Cross-platform vendor risk assessment
