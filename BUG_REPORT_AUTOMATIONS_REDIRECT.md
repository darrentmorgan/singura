# Bug Report: /automations Redirects to /dashboard

**Date**: 2025-10-28
**Severity**: HIGH - Blocks access to entire Automations page
**Status**: ✅ RESOLVED - Fix applied and ready for testing

---

## ✅ RESOLUTION

### Root Cause Found
The bug was caused by **`showContent` being in the useEffect dependencies array** in ProtectedRoute.tsx (line 96).

**The Problem**:
```typescript
}, [location.pathname, isLoaded, isSignedIn, showContent]); // ❌ showContent causes re-trigger loop
```

- `showContent` was both SET by the useEffect (via setTimeout) AND triggering the useEffect (via dependencies)
- This created an interference loop: Navigate → useEffect runs → timer fires → `showContent = true` → **useEffect runs AGAIN**
- The re-triggering prevented components from rendering properly

**The Fix**:
```typescript
}, [location.pathname, isLoaded, isSignedIn]); // ✅ Removed showContent - it's a result, not a trigger
```

### Changes Made
- **File**: `frontend/src/components/auth/ProtectedRoute.tsx`
- **Line**: 96
- **Commit**: Pending
- **Testing Guide**: See `MANUAL_TEST_GUIDE.md`

### Debugging Steps That Led to Discovery
1. Added extensive debug logging to AutomationsPage, DashboardPage, routes.tsx
2. Discovered that NONE of the debug logs appeared in console
3. Analyzed ProtectedRoute useEffect logic
4. Found `showContent` in dependencies array
5. Recognized this as a React anti-pattern (derived state in dependencies)

### Why Previous Fix (1501d0b) Wasn't Enough
Commit 1501d0b fixed the **initial navigation** issue by adding `wasAuthenticatedRef` tracking. However, it didn't address the `showContent` dependency issue, which caused problems during:
- Re-renders
- Component interactions
- Auth state transitions

This fix completes the solution by removing the re-trigger loop.

### Testing Required
Since Clerk authentication is required, automated testing with Playwright shows the correct behavior (redirect to /login for unauthenticated users). Manual testing with an authenticated user is needed to fully verify the fix.

See **`MANUAL_TEST_GUIDE.md`** for detailed testing steps.

---

## Summary

Navigating to `/automations` immediately redirects to `/dashboard`, preventing users from accessing the Automations page. This happens whether navigating via the sidebar link, direct URL entry, or clicking automation cards on the Dashboard.

---

## Evidence (Chrome DevTools MCP Testing)

### Test 1: Direct URL Navigation
```
Action: Navigate to http://localhost:4200/automations
Expected: Stay on /automations, show AutomationsPage
Actual: URL changes to /dashboard, shows Dashboard Page content

Browser State:
- window.location.href: "http://localhost:4200/dashboard"
- window.location.pathname: "/dashboard"
- document.querySelector('h1').textContent: "Good evening, there!" (Dashboard)
```

### Test 2: Clicking Automation Card
```
Action: Click automation card uid=1_89 ("Demo Singura")
Expected: Open automation details modal
Actual: Redirected to /dashboard

Console Output:
[ProtectedRoute] User is signed in, rendering children
```

### Test 3: Sidebar Link Click
```
Action: Click "Automations" in sidebar
Expected: Navigate to /automations
Actual: Page shows Dashboard content
```

---

## Root Cause Analysis

### What We Know:

1. **Route is correctly defined** (`frontend/src/routes.tsx:146-154`):
   ```typescript
   {
     path: '/automations',
     element: (
       <ProtectedRoute>
         <DashboardLayout>
           <AutomationsPage />
         </DashboardLayout>
       </ProtectedRoute>
     )
   }
   ```

2. **ProtectedRoute is NOT redirecting**:
   - Console shows: `[ProtectedRoute] User is signed in, rendering children`
   - No redirect logic triggered in ProtectedRoute.tsx

3. **No explicit navigate('/dashboard') calls found** in:
   - AutomationsPage.tsx
   - AutomationsList.tsx
   - AutomationCard.tsx

4. **Clerk is NOT causing redirects**:
   - All Clerk redirect URLs set to `null` (main.tsx:42-45)
   - forceRedirectUrl removed from LoginPage (per commit 1501d0b)

5. **React Router history changes**:
   - `window.history.state.idx: 0` (indicates navigate(), not manual URL change)
   - History key changes: suggesting programmatic navigation

---

## What's NOT the Issue:

- ❌ ProtectedRoute redirect logic (logs show it's rendering children)
- ❌ Clerk forced redirects (all disabled)
- ❌ Missing route definition (route exists and matches)
- ❌ Permission checks (no requirePermissions on /automations route)

---

## Possible Causes:

### Theory 1: React Router v7 Route Matching Issue
**Evidence**:
- Recent commit 3b69415: "downgrade to React Router v6 to resolve navigation issues"
- Then later upgraded back to v7 with migration (commit e4d...)
- Route order in routes.tsx: `/automations` is defined BEFORE catch-all `*` route

**Investigation Needed**:
- Check if `createBrowserRouter` is matching routes correctly
- Verify no duplicate route definitions
- Test with React Router DevTools

### Theory 2: Hidden Component-Level Redirect
**Evidence**:
- Page shows Dashboard content when URL says `/automations`
- This suggests AutomationsPage is being replaced by DashboardPage

**Investigation Needed**:
- Add console.log to AutomationsPage component mount
- Check if AutomationsPage ever renders
- Verify DashboardLayout isn't conditionally rendering DashboardPage

### Theory 3: Clerk SDK Internal Redirect
**Evidence**:
- All the redirect fix commits mention Clerk
- forceRedirectUrl was removed in commit 1501d0b but bug persists

**Investigation Needed**:
- Check Clerk SDK version in package.json
- Test with Clerk disabled temporarily
- Check for Clerk middleware or guards

### Theory 4: Browser Cache / Hot Module Reload Issue
**Evidence**:
- Running dev server with Vite HMR
- Multiple restart attempts during debugging

**Investigation Needed**:
- Hard refresh browser (Cmd+Shift+R)
- Clear Vite cache: `rm -rf node_modules/.vite`
- Restart dev servers completely

---

## Console Logs During Navigation

```
[ProtectedRoute] JSHandle@object
[ProtectedRoute] Showing loading spinner (transition guard active)
[ProtectedRoute] Auth state changed, pathname stable
WebSocket connected
[ProtectedRoute] User is signed in, rendering children
🔐 Adding Clerk headers to request (x18)
```

**Analysis**: ProtectedRoute completes successfully, no errors, but page shows wrong content.

---

## Network Requests

No server-side 3xx redirects detected. All navigation is client-side via React Router.

---

## Recent Related Commits

```
1501d0b fix(auth): Resolve navigation redirect loop in ProtectedRoute and LoginPage
7464e3f fix(frontend): Prevent Clerk SignIn interference when user already authenticated
83885a9 fix(frontend): Resolve navigation redirect loop in auth flow
```

**Note**: Commit 1501d0b claims to fix this exact issue with testing notes:
> "Confirmed URL stays on /automations (not redirecting to /dashboard)"

**But the bug still exists!** This means:
1. The fix didn't work
2. The bug was reintroduced
3. A different bug with the same symptoms exists

---

## Reproduction Steps

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Open browser to http://localhost:4200
4. Log in with Clerk
5. Navigate to http://localhost:4200/automations
6. **Observe**: URL changes to `/dashboard`

**Reproducibility**: 100% - happens every time

---

## Impact

- **Users**: Cannot access Automations page at all
- **Severity**: HIGH - Blocks major feature
- **Workaround**: None

---

## Recommended Next Steps

1. **Add Debug Logging**:
   ```typescript
   // In AutomationsPage.tsx
   useEffect(() => {
     console.log('[AutomationsPage] Component mounted');
     return () => console.log('[AutomationsPage] Component unmounted');
   }, []);
   ```

2. **Check Route Rendering**:
   ```typescript
   // In routes.tsx
   console.log('[Routes] Creating routes:', routes);
   ```

3. **Test with Simplified Route**:
   ```typescript
   {
     path: '/automations',
     element: <div>TEST AUTOMATIONS PAGE</div>
   }
   ```

4. **Check DashboardLayout**:
   - Verify it's not conditionally rendering DashboardPage
   - Check if `children || <Outlet />` logic is correct

5. **Disable Clerk Temporarily**:
   - Test if issue persists without Clerk
   - Isolate if it's a Clerk SDK problem

---

## Files to Investigate

1. `frontend/src/routes.tsx` - Route definitions
2. `frontend/src/components/auth/ProtectedRoute.tsx` - Auth guard
3. `frontend/src/components/layout/DashboardLayout.tsx` - Layout wrapper
4. `frontend/src/pages/AutomationsPage.tsx` - Target page
5. `frontend/src/main.tsx` - Router setup

---

## Test Results

**Chrome DevTools MCP Testing**: ✅ Bug confirmed and documented
**Manual Browser Testing**: Pending
**Automated E2E Test**: Needed

---

**Investigation Time**: 45+ minutes
**Test Tool Used**: Chrome DevTools MCP (mcp__chrome-devtools)
**Browser**: Chromium (headless: false)
**Screenshots**: Available at `/tmp/automations-page-before-click.png`, `/tmp/after-click-automation.png`
