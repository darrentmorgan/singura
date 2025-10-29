# Tasks: Reorganize Navigation Structure

## Overview
Implementation tasks for restructuring navigation to separate OAuth connections from AI-detected automations and remove non-functional links.

---

## Task 1: Update Sidebar Navigation

**Status**: ⏳ Not Started
**Assignee**: frontend-developer agent
**Estimated Time**: 30 minutes
**Priority**: High

### Description
Remove Security and Analytics navigation items from Sidebar component and add automation count badge.

### Files to Modify
- `frontend/src/components/layout/Sidebar.tsx` (lines 40-70)

### Implementation Steps
1. Remove `security` navigation item from `navItems` array
2. Remove `analytics` navigation item from `navItems` array
3. Add badge count to `automations` navigation item using `automations.length`
4. Remove unused imports for Security and Analytics icons if not used elsewhere

### Acceptance Criteria
- [ ] Security link removed from navigation
- [ ] Analytics link removed from navigation
- [ ] Automations link displays badge with count of detected automations
- [ ] Connections link still displays badge with count of OAuth connections
- [ ] TypeScript compilation successful
- [ ] No console errors

### Code Changes Required
```typescript
// BEFORE
const navItems: NavItem[] = [
  // ... dashboard, connections, automations
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

// AFTER
const navItems: NavItem[] = [
  // ... dashboard, connections
  {
    id: 'automations',
    label: 'Automations',
    href: '/automations',
    icon: <Bot className="h-5 w-5" />,
    badge: automations.length, // Add automation count
  },
  // Security and Analytics removed
];
```

### Testing
- [ ] Navigate through all remaining navigation items
- [ ] Verify badge counts display correctly
- [ ] Run component tests: `cd frontend && pnpm test -- Sidebar.test`

---

## Task 2: Remove Routes for Non-Functional Pages

**Status**: ⏳ Not Started
**Assignee**: frontend-developer agent
**Estimated Time**: 20 minutes
**Priority**: High

### Description
Remove route definitions for Security and Analytics pages from routing configuration.

### Files to Modify
- `frontend/src/routes.tsx` (lines 80-120)

### Implementation Steps
1. Identify and remove `/security` route definition
2. Identify and remove `/analytics` route definition
3. Remove imports for `SecurityPage` and `AnalyticsPage` components (if they exist)
4. Verify no other files reference these components

### Acceptance Criteria
- [ ] `/security` route removed from routes array
- [ ] `/analytics` route removed from routes array
- [ ] Unused component imports removed
- [ ] Direct navigation to `/security` returns 404
- [ ] Direct navigation to `/analytics` returns 404
- [ ] TypeScript compilation successful
- [ ] React Router does not throw warnings

### Code Changes Required
```typescript
// BEFORE
{
  path: '/security',
  element: (
    <ProtectedRoute>
      <DashboardLayout>
        <SecurityPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
},
{
  path: '/analytics',
  element: (
    <ProtectedRoute>
      <DashboardLayout>
        <AnalyticsPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
},

// AFTER - Remove both route objects entirely
```

### Testing
- [ ] Navigate to `/security` - should show 404
- [ ] Navigate to `/analytics` - should show 404
- [ ] Verify all other routes still work
- [ ] Run routing tests: `cd frontend && pnpm test -- routes.test`

---

## Task 3: Verify AutomationsPage Filtering

**Status**: ⏳ Not Started
**Assignee**: frontend-developer agent
**Estimated Time**: 45 minutes
**Priority**: High

### Description
Ensure AutomationsPage only displays AI-detected automations, not OAuth connections.

### Files to Inspect/Modify
- `frontend/src/pages/AutomationsPage.tsx` (full file)
- `frontend/src/stores/automations.ts` (verify data source)

### Implementation Steps
1. Read `AutomationsPage.tsx` to understand current implementation
2. Verify data source is `automations` store (AI-detected content)
3. Confirm no logic mixing connections with automations
4. Add filtering if needed to ensure only automation types shown:
   - `type: 'bot' | 'script' | 'workflow' | 'api_integration'`
5. Add empty state messaging if no automations detected
6. Verify "Add Connection" buttons removed (those belong in Connections page)

### Acceptance Criteria
- [ ] Page only displays automations from `automations` store
- [ ] No OAuth connection data displayed
- [ ] Empty state shows helpful message if no automations detected
- [ ] Automation cards show: risk level, type, platform source, detection date
- [ ] No "Add Connection" CTAs (belongs in Connections page)
- [ ] TypeScript compilation successful
- [ ] No prop type mismatches

### Code Review Checklist
```typescript
// VERIFY: Data source is automations, not connections
const automations = useAutomations(); // ✅ Correct
const connections = useConnections(); // ❌ Should not be used here

// VERIFY: No connection rendering logic
{connections.map(conn => ...)} // ❌ Should not exist

// VERIFY: Empty state exists
{automations.length === 0 && (
  <EmptyState
    title="No Automations Detected"
    description="Connect your platforms to start discovering automations"
  />
)}
```

### Testing
- [ ] View page with 0 automations - verify empty state
- [ ] View page with automations - verify only automations shown
- [ ] Verify automation risk badges display correctly
- [ ] Run page tests: `cd frontend && pnpm test -- AutomationsPage.test`

---

## Task 4: Verify ConnectionsPage Isolation

**Status**: ⏳ Not Started
**Assignee**: frontend-developer agent
**Estimated Time**: 20 minutes
**Priority**: Medium

### Description
Confirm ConnectionsPage only displays OAuth connections and related functionality.

### Files to Inspect
- `frontend/src/pages/ConnectionsPage.tsx` (full file)
- `frontend/src/stores/connections.ts` (verify data source)

### Implementation Steps
1. Read `ConnectionsPage.tsx` to understand current implementation
2. Verify data source is `connections` store (OAuth integrations)
3. Confirm no automation detection data displayed
4. Verify "Add Connection" functionality present
5. Verify connection status, sync time, organization scope displayed

### Acceptance Criteria
- [ ] Page only displays OAuth platform connections
- [ ] No automation detection data mixed in
- [ ] "Add Connection" button present
- [ ] Connection cards show: platform, status, org scope, last synced
- [ ] TypeScript compilation successful

### Code Review Checklist
```typescript
// VERIFY: Data source is connections
const connections = useConnections(); // ✅ Correct

// VERIFY: Platform connections displayed
{connections.map(conn => (
  <ConnectionCard
    platform={conn.platform} // Slack, Google, Microsoft
    status={conn.status}
    organizationId={conn.organizationId}
    lastSyncedAt={conn.lastSyncedAt}
  />
))}

// VERIFY: No automation data
const automations = useAutomations(); // ❌ Should not exist
```

### Testing
- [ ] View page with connections - verify only OAuth connections shown
- [ ] Verify "Add Connection" flow works
- [ ] Verify connection status badges accurate
- [ ] Run page tests: `cd frontend && pnpm test -- ConnectionsPage.test`

---

## Task 5: Update Navigation Tests

**Status**: ⏳ Not Started
**Assignee**: test-engineer agent
**Estimated Time**: 30 minutes
**Priority**: High

### Description
Update automated tests to reflect new navigation structure.

### Files to Modify/Create
- `frontend/src/tests/navigation.test.tsx` (may need creation)
- `frontend/src/components/layout/Sidebar.test.tsx` (update)
- `frontend/src/tests/routing.test.tsx` (update)

### Implementation Steps
1. Update Sidebar tests to verify Security/Analytics removed
2. Add tests for automation badge count
3. Update routing tests to confirm `/security` and `/analytics` return 404
4. Add integration test navigating between Connections and Automations

### Acceptance Criteria
- [ ] Tests verify Security link not in navigation
- [ ] Tests verify Analytics link not in navigation
- [ ] Tests verify automation badge shows correct count
- [ ] Tests verify `/security` returns 404
- [ ] Tests verify `/analytics` returns 404
- [ ] All existing navigation tests still passing
- [ ] Test coverage maintained at 80%+

### Test Cases Required
```typescript
describe('Sidebar Navigation', () => {
  it('should not render Security link', () => {
    const { queryByText } = render(<Sidebar />);
    expect(queryByText('Security')).not.toBeInTheDocument();
  });

  it('should not render Analytics link', () => {
    const { queryByText } = render(<Sidebar />);
    expect(queryByText('Analytics')).not.toBeInTheDocument();
  });

  it('should display automation count badge', () => {
    const { getByText } = render(<Sidebar />);
    const badge = getByText(/automations/i).closest('a')?.querySelector('[data-badge]');
    expect(badge).toBeInTheDocument();
  });
});

describe('Routing', () => {
  it('should return 404 for /security route', () => {
    render(<RouterProvider router={router} />);
    window.history.pushState({}, '', '/security');
    expect(screen.getByText(/404|Not Found/i)).toBeInTheDocument();
  });

  it('should return 404 for /analytics route', () => {
    render(<RouterProvider router={router} />);
    window.history.pushState({}, '', '/analytics');
    expect(screen.getByText(/404|Not Found/i)).toBeInTheDocument();
  });
});
```

### Testing
- [ ] Run all navigation tests: `cd frontend && pnpm test -- navigation`
- [ ] Run all routing tests: `cd frontend && pnpm test -- routing`
- [ ] Verify test coverage: `cd frontend && pnpm test -- --coverage`

---

## Task 6: Update Accessibility Tests

**Status**: ⏳ Not Started
**Assignee**: qa-expert agent
**Estimated Time**: 30 minutes
**Priority**: Medium

### Description
Ensure accessibility compliance maintained with navigation changes.

### Files to Modify
- `frontend/src/tests/accessibility.test.tsx` (update existing tests)

### Implementation Steps
1. Update accessibility tests for Sidebar component
2. Verify ARIA labels correct for remaining navigation items
3. Verify keyboard navigation still works for all tabs
4. Run axe-core accessibility audit on updated navigation
5. Ensure screen reader announcements work for navigation changes

### Acceptance Criteria
- [ ] All navigation items have proper ARIA labels
- [ ] Keyboard navigation works (Tab, Enter, Arrow keys)
- [ ] Screen reader announces current page correctly
- [ ] No accessibility violations from axe-core
- [ ] Focus management works when navigating between pages
- [ ] Badge counts announced by screen readers

### Accessibility Checklist
```typescript
describe('Navigation Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<Sidebar />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should announce automation badge count to screen readers', () => {
    const { getByLabelText } = render(<Sidebar />);
    const automationsLink = getByLabelText(/automations/i);
    expect(automationsLink).toHaveAttribute('aria-label', expect.stringContaining('automations'));
  });

  it('should support keyboard navigation', () => {
    const { getAllByRole } = render(<Sidebar />);
    const navLinks = getAllByRole('link');

    navLinks.forEach(link => {
      expect(link).toHaveAttribute('tabindex');
    });
  });
});
```

### Testing
- [ ] Run accessibility tests: `cd frontend && pnpm test -- accessibility.test`
- [ ] Manual screen reader testing (VoiceOver/NVDA)
- [ ] Manual keyboard navigation testing

---

## Task 7: End-to-End Verification

**Status**: ⏳ Not Started
**Assignee**: qa-expert agent
**Estimated Time**: 45 minutes
**Priority**: High

### Description
Comprehensive testing of navigation changes in running application.

### Testing Environment
- Local dev environment (Frontend: 4200, Backend: 4201)
- Chrome DevTools MCP for automated verification
- Multiple user scenarios

### Test Scenarios

#### Scenario 1: Navigation Structure
- [ ] Open application
- [ ] Verify navigation shows: Dashboard, Connections, Automations (3 items only)
- [ ] Verify Security and Analytics links not visible
- [ ] Verify badge counts display on Connections and Automations

#### Scenario 2: Connections Page
- [ ] Navigate to Connections tab
- [ ] Verify only OAuth connections displayed
- [ ] Verify connection cards show platform, status, org scope
- [ ] Verify "Add Connection" button present
- [ ] Verify no automation data visible

#### Scenario 3: Automations Page
- [ ] Navigate to Automations tab
- [ ] Verify only AI-detected automations displayed
- [ ] Verify automation cards show risk level, type, platform
- [ ] Verify no OAuth connection data visible
- [ ] Verify empty state if no automations

#### Scenario 4: Removed Routes
- [ ] Navigate directly to `/security`
- [ ] Verify 404 page displayed
- [ ] Navigate directly to `/analytics`
- [ ] Verify 404 page displayed

#### Scenario 5: Badge Counts
- [ ] Add new OAuth connection
- [ ] Verify Connections badge increments
- [ ] Trigger automation detection
- [ ] Verify Automations badge increments

### Chrome DevTools MCP Commands
```bash
# Navigate and verify structure
mcp__chrome-devtools__navigate_page --url http://localhost:4200/dashboard
mcp__chrome-devtools__take_snapshot
# Verify navigation items in snapshot

# Test removed routes
mcp__chrome-devtools__navigate_page --url http://localhost:4200/security
# Verify 404 response

# Check console for errors
mcp__chrome-devtools__list_console_messages
```

### Acceptance Criteria
- [ ] All test scenarios pass
- [ ] No console errors during navigation
- [ ] No network request failures
- [ ] Badge counts accurate
- [ ] Page load times acceptable (<2s)
- [ ] WebSocket connection maintained during navigation

---

## Task 8: Documentation Updates

**Status**: ⏳ Not Started
**Assignee**: documentation-sync agent
**Estimated Time**: 30 minutes
**Priority**: Low

### Description
Update project documentation to reflect navigation changes.

### Files to Update
- `README.md` (update screenshots if present)
- `docs/USER_GUIDE.md` (update navigation section)
- `docs/ARCHITECTURE.md` (update routing section)
- `CHANGELOG.md` (add entry for this change)

### Implementation Steps
1. Update any screenshots showing old navigation
2. Update user guide navigation section
3. Update architecture docs if routing patterns documented
4. Add CHANGELOG entry describing changes
5. Update any API documentation referencing removed pages

### Acceptance Criteria
- [ ] All documentation reflects new 3-tab navigation
- [ ] Screenshots updated (if present)
- [ ] CHANGELOG entry added
- [ ] No broken links to removed pages
- [ ] Navigation terminology consistent across docs

### CHANGELOG Entry
```markdown
## [Unreleased]

### Changed
- Reorganized navigation to clearly separate OAuth Connections from AI-detected Automations
- Removed non-functional Security and Analytics navigation links (will be re-added when implemented)

### Improved
- Added automation count badge to Automations navigation item
- Clearer distinction between platform integration setup (Connections) and detection results (Automations)
```

---

## Task 9: TypeScript Compilation & Linting

**Status**: ⏳ Not Started
**Assignee**: typescript-guardian agent
**Estimated Time**: 15 minutes
**Priority**: High

### Description
Ensure all TypeScript compilation and linting passes after changes.

### Commands to Run
```bash
# Frontend TypeScript check
cd frontend && npx tsc --noEmit

# Frontend linting
cd frontend && pnpm lint

# Backend TypeScript check (shouldn't be affected but verify)
cd backend && npx tsc --noEmit

# Backend linting
cd backend && pnpm lint
```

### Acceptance Criteria
- [ ] Frontend TypeScript compiles without errors
- [ ] Backend TypeScript compiles without errors
- [ ] No new ESLint warnings or errors
- [ ] No unused imports remaining
- [ ] No type assertion violations

### Common Issues to Check
- [ ] Removed imports still referenced elsewhere
- [ ] Route type definitions match new structure
- [ ] Navigation item types correct
- [ ] Badge count types correct (number | undefined)

---

## Task 10: Git Commit & PR Creation

**Status**: ⏳ Not Started
**Assignee**: Main orchestrator
**Estimated Time**: 15 minutes
**Priority**: High

### Description
Commit changes and create pull request for review.

### Implementation Steps
1. Stage all modified files
2. Create commit with descriptive message
3. Push to feature branch
4. Create pull request with detailed description
5. Link to OpenSpec proposal in PR

### Git Commands
```bash
# Stage changes
git add frontend/src/components/layout/Sidebar.tsx
git add frontend/src/routes.tsx
git add frontend/src/pages/AutomationsPage.tsx
git add frontend/src/tests/*.test.tsx
git add openspec/changes/reorganize-navigation-structure/

# Commit
git commit -m "feat(frontend): reorganize navigation structure

- Separate OAuth connections from AI-detected automations
- Remove non-functional Security and Analytics navigation links
- Add automation count badge to Automations tab
- Update routing to return 404 for removed pages
- Update tests to reflect new navigation structure

Closes: reorganize-navigation-structure
OpenSpec: openspec/changes/reorganize-navigation-structure/proposal.md"

# Push and create PR
git push origin feature/reorganize-navigation
gh pr create --title "Reorganize Navigation Structure" --body "$(cat openspec/changes/reorganize-navigation-structure/proposal.md)"
```

### Acceptance Criteria
- [ ] All changes committed
- [ ] Commit message follows conventional commits format
- [ ] Pull request created
- [ ] PR description references OpenSpec proposal
- [ ] CI/CD pipeline passing

---

## Summary

**Total Tasks**: 10
**Total Estimated Time**: 4-5 hours
**Priority Breakdown**:
- High: 6 tasks
- Medium: 2 tasks
- Low: 2 tasks

**Dependency Chain**:
1. Tasks 1-4 can run in parallel (frontend changes)
2. Task 5-6 depend on Tasks 1-4 (test updates)
3. Task 7 depends on Tasks 1-6 (E2E verification)
4. Task 8 can run anytime after Task 1 (documentation)
5. Task 9 depends on Tasks 1-4 (TypeScript check)
6. Task 10 depends on all tasks (final commit)

**Recommended Execution Order**:
1. Task 1, 2, 3, 4 (parallel - frontend changes)
2. Task 9 (TypeScript verification)
3. Task 5, 6 (parallel - test updates)
4. Task 7 (E2E verification)
5. Task 8 (documentation)
6. Task 10 (commit and PR)

**Rollback Strategy**:
If any task fails critically:
1. Revert all changes: `git checkout -- frontend/src`
2. Identify failure cause
3. Fix issue
4. Resume from failed task

---

**Status**: 📝 Tasks Defined
**Last Updated**: 2025-10-29
**OpenSpec Change**: reorganize-navigation-structure
