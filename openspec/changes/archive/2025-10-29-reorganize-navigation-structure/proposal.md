# Reorganize Navigation Structure

## Summary
Restructure the application navigation to clearly separate OAuth platform connections from AI-detected automations, and remove non-functional navigation links.

## Context
Currently, the application has a "Connections" tab that shows OAuth platform connections (Slack, Google, Microsoft) and an "Automations" tab that displays discovered automations. The navigation also includes non-functional "Security" and "Analytics" links that should be removed until these features are implemented.

**User Request**:
> "i want the oauth connectors to be displayed in their own tab instead of automations. I want automations to be only automations detected by our algorithm. lets remove the non functional links for security and analysis for now."

### Current Navigation Structure
```
- Dashboard
- Connections (OAuth platform connections)
- Automations (AI-detected automations + connections mixed)
- Security (non-functional)
- Analytics (non-functional)
```

### Proposed Navigation Structure
```
- Dashboard
- Connections (OAuth platform connections only)
- Automations (AI-detected automations only)
```

## Problem
1. **Unclear separation**: The "Automations" page currently shows both OAuth connections and AI-detected automations, causing confusion about what each tab represents
2. **Non-functional links**: "Security" and "Analytics" navigation items are present but don't provide functionality yet
3. **Terminology confusion**: Users expect "Automations" to show only AI-detected automation activities, not OAuth connection setup

## Proposed Solution

### 1. Keep "Connections" Tab Focused on OAuth Integrations
- Display list of OAuth platform connections (Slack, Google Workspace, Microsoft 365)
- Show connection status, organization scope, last synced timestamp
- Provide "Add Connection" functionality
- This tab is already functional and serves its purpose correctly

### 2. Restrict "Automations" Tab to AI-Detected Content Only
- Display ONLY automations discovered by the detection algorithm
- Remove any OAuth connection display logic from this page
- Focus on:
  - Automation risk level (Low, Medium, High, Critical)
  - Automation type (Bot, Script, Workflow, API Integration)
  - Detection metadata (detected date, confidence score)
  - Platform source (which connection detected this automation)

### 3. Remove Non-Functional Navigation Links
- Remove "Security" from navigation
- Remove "Analytics" from navigation
- Remove corresponding routes from routing configuration
- These can be re-added when functionality is implemented

## Technical Implementation

### Frontend Changes Required

#### 1. `frontend/src/components/layout/Sidebar.tsx`
**Current State** (lines 40-70):
```typescript
const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    id: 'connections',
    label: 'Connections',
    href: '/connections',
    icon: <Link2 className="h-5 w-5" />,
    badge: connections.length,
  },
  {
    id: 'automations',
    label: 'Automations',
    href: '/automations',
    icon: <Bot className="h-5 w-5" />,
  },
  {
    id: 'security',
    label: 'Security',
    href: '/security',
    icon: <Shield className="h-5 w-5" />,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    href: '/analytics',
    icon: <BarChart3 className="h-5 w-5" />,
  },
];
```

**Proposed State**:
```typescript
const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    id: 'connections',
    label: 'Connections',
    href: '/connections',
    icon: <Link2 className="h-5 w-5" />,
    badge: connections.length,
  },
  {
    id: 'automations',
    label: 'Automations',
    href: '/automations',
    icon: <Bot className="h-5 w-5" />,
    badge: automations.length, // Show count of detected automations
  },
  // Security and Analytics removed until functionality implemented
];
```

#### 2. `frontend/src/routes.tsx`
**Current State**: Contains routes for `/security` and `/analytics`

**Proposed State**:
- Remove `/security` route definition
- Remove `/analytics` route definition
- Remove imports for `SecurityPage` and `AnalyticsPage` components
- Keep all other routes unchanged

#### 3. `frontend/src/pages/AutomationsPage.tsx`
**Current State**: May include logic that displays OAuth connections alongside automations

**Proposed State**:
- Ensure page ONLY renders automations from the `automations` store (AI-detected content)
- Remove any logic that displays OAuth connections
- Filter to show only `type: 'bot' | 'script' | 'workflow' | 'api_integration'`
- Display clear messaging if no automations detected yet

#### 4. `frontend/src/pages/ConnectionsPage.tsx`
**Current State**: Already focused on OAuth connections

**Proposed State**:
- Verify it ONLY shows OAuth platform connections
- No changes needed if already correct

### Backend Changes Required
**None** - This is purely a frontend navigation/display restructure. The backend APIs already return the correct data:
- `/api/connections` - OAuth connections
- `/api/automations` - AI-detected automations

### Database Changes Required
**None** - No schema changes needed

## Rollback Plan
If this change causes issues:
1. Revert `Sidebar.tsx` navigation items
2. Revert `routes.tsx` route definitions
3. Revert any filtering changes in `AutomationsPage.tsx`
4. Re-add Security and Analytics routes

## Testing Requirements

### Manual Testing
- [ ] Navigate to Connections tab - verify ONLY OAuth connections shown
- [ ] Navigate to Automations tab - verify ONLY AI-detected automations shown
- [ ] Verify Security and Analytics links removed from navigation
- [ ] Verify direct navigation to `/security` and `/analytics` shows 404
- [ ] Verify automation badge count in sidebar matches detected automations count
- [ ] Verify connection badge count in sidebar matches OAuth connections count

### Automated Testing
- [ ] Update navigation tests to verify new structure
- [ ] Update routing tests to confirm Security/Analytics routes removed
- [ ] Update component tests for AutomationsPage to verify filtering
- [ ] Run accessibility tests to ensure navigation still meets WCAG standards

## Success Criteria
- ✅ Connections tab displays only OAuth platform connections
- ✅ Automations tab displays only AI-detected automations
- ✅ Security and Analytics links removed from navigation
- ✅ No functional regressions in existing features
- ✅ Navigation badge counts accurate for both tabs
- ✅ All tests passing
- ✅ TypeScript compilation successful with no new errors

## Dependencies
None - This is an isolated frontend navigation change

## Breaking Changes
None - API contracts unchanged, only frontend display logic modified

## Security Considerations
None - No authentication, authorization, or data access changes

## Performance Impact
Minimal - Potential slight improvement from removing unused route handling

## Documentation Updates Required
- [ ] Update user guide to reflect new navigation structure
- [ ] Update screenshots in documentation showing new sidebar
- [ ] Update API documentation if any endpoint usage patterns change

## Related Issues/PRs
- Related to previous React Router fix (App.tsx refactor)
- Addresses user feedback about unclear automation vs connection distinction

## Implementation Timeline
- **Estimated Effort**: 2-3 hours
- **Phase 1**: Update Sidebar.tsx and routes.tsx (~30 min)
- **Phase 2**: Update AutomationsPage.tsx filtering (~30 min)
- **Phase 3**: Testing and verification (~1-2 hours)

## Open Questions
1. Should we add a visual indicator on Automations page showing which Connection detected each automation?
2. Should we add empty state messaging for Automations page if no automations detected yet?
3. Do we want to add tooltips explaining what each navigation tab contains?

---

**Status**: 📝 Proposal Draft
**Author**: Claude Code
**Date**: 2025-10-29
**OpenSpec Version**: 1.0
