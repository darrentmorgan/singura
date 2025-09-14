# Mock Data Toggle System - Brownfield Addition

## User Story

As a **Sales Engineer demonstrating SaaS X-Ray to enterprise customers**,
I want **the ability to seamlessly toggle between mock demo data and live customer automation discovery**,
So that **I can show professional demos without exposing customer data, then switch to real data for validation and testing**.

## Story Context

**Existing System Integration:**

- **Integrates with**: DataProvider abstraction layer (MockDataProvider/RealDataProvider in data-provider.ts)
- **Technology**: TypeScript backend with React frontend, Socket.io real-time updates
- **Follows pattern**: Existing environment variable control system (USE_MOCK_DATA, ENABLE_DATA_TOGGLE)
- **Touch points**: Backend API endpoints, frontend dashboard display, admin controls

## Acceptance Criteria

### Functional Requirements

**1**: Admin dashboard includes toggle control to switch between "Demo Mode" (mock data) and "Live Mode" (real OAuth discovery) with immediate effect

**2**: Data source toggle persists across user sessions and provides visual indicator showing current mode (Demo/Live) in dashboard header

**3**: Mock data mode displays realistic enterprise automation scenarios (current 5 automation cards) while Live mode shows actual customer OAuth discovery results

### Integration Requirements

**4**: Existing automation discovery endpoints continue to work unchanged with proper data source routing based on toggle state

**5**: New toggle functionality follows existing admin control patterns and integrates with current dashboard design system

**6**: Integration with OAuth connection system maintains current behavior while respecting data source selection

### Quality Requirements

**7**: Toggle change is covered by integration tests validating both mock and live data flows

**8**: Documentation is updated to include toggle usage for sales demos and customer testing

**9**: No regression in existing automation discovery, OAuth connections, or dashboard functionality verified

## Technical Notes

- **Integration Approach**: Enhance existing data provider abstraction with runtime toggle control accessible through admin dashboard
- **Existing Pattern Reference**: Current environment variable system (USE_MOCK_DATA, ENABLE_DATA_TOGGLE) and admin dashboard controls
- **Key Constraints**: Must never allow mock data in production environments, toggle state must be clearly visible to users

## Definition of Done

- [ ] Admin toggle control functional in dashboard header
- [ ] Data source switching works immediately without page refresh
- [ ] Visual indicator clearly shows Demo vs Live mode
- [ ] Mock data displays professional automation scenarios
- [ ] Live mode shows real OAuth discovery results
- [ ] Integration tests cover both data source flows
- [ ] Security prevents mock data in production
- [ ] Documentation updated for sales and testing teams
- [ ] No regression in existing functionality verified

## Risk and Compatibility Check

### Minimal Risk Assessment

- **Primary Risk**: Confusion between demo and live data could mislead customers or sales team
- **Mitigation**: Clear visual indicators and confirmation dialogs for mode switching
- **Rollback**: Simple removal of toggle UI element returns to environment variable control

### Compatibility Verification

- [ ] No breaking changes to existing APIs (toggle affects data source selection only)
- [ ] Database changes are additive only (toggle state storage if needed)
- [ ] UI changes follow existing design patterns (admin controls in dashboard header)
- [ ] Performance impact is negligible (toggle affects data source routing only)

## Validation Checklist

### Scope Validation

- [x] Story can be completed in one development session (estimated 2-4 hours)
- [x] Integration approach is straightforward (enhance existing data provider abstraction)
- [x] Follows existing patterns exactly (admin controls and environment variable patterns)
- [x] No design or architecture work required (uses existing UI components)

### Clarity Check

- [x] Story requirements are unambiguous (clear toggle between mock and live data)
- [x] Integration points are clearly specified (data provider, dashboard, admin controls)
- [x] Success criteria are testable (visible toggle, functional data switching)
- [x] Rollback approach is simple (remove toggle UI, revert to environment variables)

---

## 📋 **Product Manager Assessment**

### **Business Impact** 💰
- **Critical for Customer Success**: Enables proper customer validation vs professional demos
- **Sales Enablement**: Professional demo mode without exposing sensitive customer data
- **Testing Efficiency**: Rapid switching between demo and validation modes
- **Customer Confidence**: Clear separation between demo and real data builds trust

### **Strategic Value** 🎯
- **Customer Beta Readiness**: Essential for enterprise customer testing
- **Sales Process**: Professional demo capabilities without data exposure concerns
- **Quality Assurance**: Enables controlled testing in different data scenarios
- **Enterprise Deployment**: Clear production vs demo mode separation

**This story is scoped appropriately for focused development and addresses a critical customer launch requirement.**

---

**Story saved to**: `docs/stories/mock-data-toggle-story.md`

**Ready for development team to implement this critical customer testing capability!** 🚀