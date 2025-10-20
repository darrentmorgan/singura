# Frontend Testing Plan - Singura
**Target Coverage:** 80% | **Current Coverage:** <10% | **Target Test Files:** 20+

## Executive Summary

This comprehensive testing plan outlines the strategy to achieve 80% test coverage for the Singura frontend React application. The plan prioritizes critical authentication flows, core business logic (automation discovery), and user interface components. Estimated implementation time: 24-32 hours across 4 phases.

**Key Priorities:**
- P0: Auth flows, API client, Zustand stores (critical business logic)
- P1: Core pages (Dashboard, Automations), primary components
- P2: UI components, landing pages, edge cases

**Tech Stack:**
- Vitest + React Testing Library (unit/integration)
- Playwright (E2E)
- MSW (Mock Service Worker) for API mocking
- @testing-library/user-event for user interactions

---

## Testing Strategy

### Test Type Distribution
| Type | Coverage Target | Purpose |
|------|----------------|---------|
| Unit Tests | 60% | Individual components, utilities, hooks |
| Integration Tests | 25% | Component interactions, store + API |
| E2E Tests | 15% | Critical user flows (OAuth, discovery) |

### Mocking Strategy

**1. Clerk Authentication**
```typescript
// Mock module in test setup
vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: mockClerkUser, isLoaded: true }),
  useOrganization: () => ({ organization: mockOrg, isLoaded: true }),
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue('mock-token') }),
  SignInButton: ({ children }: any) => <button>{children}</button>,
  UserButton: () => <div data-testid="user-button">User</div>,
  OrganizationSwitcher: () => <div data-testid="org-switcher">Org</div>,
}));
```

**2. API Client (MSW)**
```typescript
// Use MSW for API mocking
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer(
  rest.get('/api/automations', (req, res, ctx) => {
    return res(ctx.json({ success: true, automations: mockAutomations }));
  })
);
```

**3. Zustand Stores**
```typescript
// Mock store with custom initial state
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn().mockReturnValue(mockAuthState),
  useAuthActions: vi.fn().mockReturnValue(mockAuthActions),
}));
```

**4. React Router**
```typescript
// Wrap components in MemoryRouter for testing
import { MemoryRouter } from 'react-router-dom';

render(
  <MemoryRouter initialEntries={['/dashboard']}>
    <Component />
  </MemoryRouter>
);
```

---

## Test File List (20+ Files)

### Phase 1: Critical Business Logic (P0) - 8 files
**Priority:** Highest | **Time Estimate:** 10-12 hours

#### 1.1 Store Tests (3 files)
| File | Description | Coverage Target | Time |
|------|-------------|----------------|------|
| `src/stores/__tests__/auth.test.ts` | Auth store actions (login, logout, refresh), state management, localStorage persistence | 90% | 2h |
| `src/stores/__tests__/automations.test.ts` | Automations store (discovery, filtering, sorting, pagination), real-time updates | 85% | 2.5h |
| `src/stores/__tests__/connections.test.ts` | Connections store (platform connections, OAuth state), connection stats | 80% | 1.5h |

**Test Coverage:**
- All store actions (async operations with success/error cases)
- State updates and side effects
- Selectors and computed values
- Persistence middleware (localStorage)
- Real-time update handlers

#### 1.2 API Client Tests (3 files)
| File | Description | Coverage Target | Time |
|------|-------------|----------------|------|
| `src/services/__tests__/api.test.ts` | API client interceptors, token refresh logic, error handling, retry mechanism | 90% | 2h |
| `src/services/__tests__/websocket.test.ts` | WebSocket client (connection, reconnection, message handlers), real-time events | 85% | 2h |
| `src/services/__tests__/feedback-api.test.ts` | Feedback API methods, request/response handling | 75% | 1h |

**Test Coverage:**
- Request/response interceptors
- JWT token refresh flow
- Error handling for all HTTP status codes
- WebSocket connection lifecycle
- Message broadcasting and subscriptions

#### 1.3 Utilities (2 files)
| File | Description | Coverage Target | Time |
|------|-------------|----------------|------|
| `src/utils/__tests__/clerk-headers.test.ts` | Clerk header generation, org context extraction | 90% | 0.5h |
| `src/utils/__tests__/clerk-api.test.ts` | Clerk API utilities, session token handling | 85% | 1h |

---

### Phase 2: Core Pages & Components (P1) - 7 files
**Priority:** High | **Time Estimate:** 8-10 hours

#### 2.1 Page Tests (4 files)
| File | Description | Coverage Target | Time |
|------|-------------|----------------|------|
| `src/pages/__tests__/DashboardPage.test.tsx` | Dashboard rendering, stats display, connection cards, real-time updates | 80% | 2h |
| `src/pages/__tests__/AutomationsPage.test.tsx` | Automations list, filtering, sorting, pagination, search | 85% | 2.5h |
| `src/pages/__tests__/ConnectionsPage.test.tsx` | Platform connections grid, OAuth initiation, connection stats | 80% | 2h |
| `src/pages/__tests__/LoginPage.test.tsx` | Login page rendering, redirect logic (lightweight - LoginForm already tested) | 70% | 0.5h |

**Test Coverage:**
- Component rendering with loading states
- User interactions (clicks, form inputs)
- Store integration (data fetching, state updates)
- Real-time data updates (WebSocket events)
- Error boundary handling

#### 2.2 Critical Components (3 files)
| File | Description | Coverage Target | Time |
|------|-------------|----------------|------|
| `src/components/automations/__tests__/AutomationsList.test.tsx` | Automations list rendering, empty states, filtering UI, pagination controls | 85% | 1.5h |
| `src/components/automations/__tests__/AutomationCard.test.tsx` | Automation card display, risk badges, action buttons, click handlers | 80% | 1h |
| `src/components/connections/__tests__/ConnectionsGrid.test.tsx` | Connections grid layout, platform cards, OAuth buttons, connection states | 80% | 1.5h |

---

### Phase 3: Layout & Common Components (P1) - 6 files
**Priority:** Medium-High | **Time Estimate:** 5-6 hours

#### 3.1 Layout Components (3 files)
| File | Description | Coverage Target | Time |
|------|-------------|----------------|------|
| `src/components/layout/__tests__/Sidebar.test.tsx` | Sidebar navigation, active link highlighting, user info display | 75% | 1h |
| `src/components/layout/__tests__/DashboardLayout.test.tsx` | Layout composition, sidebar toggle, responsive behavior | 70% | 1h |
| `src/components/layout/__tests__/Header.test.tsx` | Header rendering, Clerk UserButton, OrganizationSwitcher | 70% | 0.5h |

#### 3.2 Common Components (3 files)
| File | Description | Coverage Target | Time |
|------|-------------|----------------|------|
| `src/components/common/__tests__/ErrorBoundary.test.tsx` | Error catching, fallback UI rendering, error logging | 90% | 1.5h |
| `src/components/common/__tests__/GlobalModal.test.tsx` | Modal open/close, backdrop click, ESC key handling | 80% | 1h |
| `src/components/common/__tests__/LoadingStates.test.tsx` | Loading spinner variants, skeleton states | 75% | 0.5h |

---

### Phase 4: Additional Components & Hooks (P2) - 8+ files
**Priority:** Medium | **Time Estimate:** 6-8 hours

#### 4.1 Feature Components (4 files)
| File | Description | Coverage Target | Time |
|------|-------------|----------------|------|
| `src/components/automations/__tests__/AutomationMetrics.test.tsx` | Metrics display, charts rendering, data formatting | 75% | 1h |
| `src/components/automations/__tests__/DiscoveryProgress.test.tsx` | Progress bar, stage display, real-time updates | 80% | 1h |
| `src/components/feedback/__tests__/FeedbackForm.test.tsx` | Form validation, submission, success/error states | 80% | 1.5h |
| `src/components/connections/__tests__/PlatformCard.test.tsx` | Platform card rendering, connect button, status indicators | 75% | 1h |

#### 4.2 Hooks (2 files)
| File | Description | Coverage Target | Time |
|------|-------------|----------------|------|
| `src/hooks/__tests__/useConnectionStats.test.ts` | Connection stats hook, data fetching, error handling | 85% | 1h |
| `src/hooks/__tests__/useAutomationFilters.test.ts` | Filtering logic, search, debouncing (if exists) | 80% | 1h |

#### 4.3 Landing Page Components (2 files - Optional)
| File | Description | Coverage Target | Time |
|------|-------------|----------------|------|
| `src/components/landing/__tests__/Hero.test.tsx` | Hero section rendering, CTA buttons | 60% | 0.5h |
| `src/components/landing/__tests__/WaitlistModal.test.tsx` | Waitlist form, validation, submission | 70% | 1h |

---

## E2E Test Coverage (Existing + New)

### Existing E2E Tests
- ✅ `tests/e2e/waitlist.spec.ts` - Waitlist form submission
- ✅ `tests/e2e/oauth-scope-enrichment.spec.ts` - OAuth flow testing

### New E2E Tests to Add (3-4 files)
| File | Description | Time |
|------|-------------|------|
| `tests/e2e/auth-flow.spec.ts` | Login → Dashboard → Logout flow, session persistence | 1.5h |
| `tests/e2e/automation-discovery.spec.ts` | Connect platform → Start discovery → View results | 2h |
| `tests/e2e/automation-management.spec.ts` | Filter/sort automations → View details → Export | 1.5h |
| `tests/e2e/error-scenarios.spec.ts` | Network errors, 401/403 responses, error boundary | 1h |

---

## Testing Utilities & Fixtures

### Test Setup Files
```
src/test/
├── setup.ts                    # ✅ Existing - Global test configuration
├── mocks/
│   ├── clerk.ts               # NEW - Clerk mock utilities
│   ├── api-handlers.ts        # NEW - MSW request handlers
│   ├── websocket.ts           # NEW - WebSocket mock
│   └── zustand.ts             # NEW - Zustand store mocking utilities
├── fixtures/
│   ├── automations.ts         # NEW - Mock automation data
│   ├── connections.ts         # NEW - Mock connection data
│   ├── users.ts               # NEW - Mock user/org data
│   └── api-responses.ts       # NEW - Typed API response fixtures
└── helpers/
    ├── render.tsx             # NEW - Custom render with providers
    ├── wait-for.ts            # NEW - Custom wait utilities
    └── test-ids.ts            # NEW - Data-testid constants
```

### Custom Test Utilities

#### 1. Custom Render Helper
```typescript
// src/test/helpers/render.tsx
import { render as rtlRender } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';

export function render(ui: React.ReactElement, options = {}) {
  return rtlRender(
    <ClerkProvider publishableKey="mock-key">
      <MemoryRouter>{ui}</MemoryRouter>
    </ClerkProvider>,
    options
  );
}
```

#### 2. MSW Setup
```typescript
// src/test/mocks/api-handlers.ts
import { rest } from 'msw';

export const handlers = [
  rest.get('/api/automations', (req, res, ctx) => {
    return res(ctx.json(mockAutomationsResponse));
  }),
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(ctx.json(mockLoginResponse));
  }),
  // ... more handlers
];
```

---

## Coverage Targets by Module

| Module | Target | Priority | Rationale |
|--------|--------|----------|-----------|
| Stores (auth, automations, connections) | 85%+ | P0 | Critical business logic, state management |
| API Client (services/api.ts) | 90%+ | P0 | All API interactions, error handling |
| Auth Components | 85%+ | P0 | Security-critical, OAuth flows |
| Core Pages (Dashboard, Automations) | 80%+ | P1 | Primary user workflows |
| Layout Components | 70%+ | P1 | Structural, less logic-heavy |
| UI Components | 60%+ | P2 | Mostly presentational |
| Landing Pages | 60%+ | P2 | Marketing content |
| Utilities & Hooks | 80%+ | P1 | Reusable logic |

---

## Implementation Order

### Week 1 (Phase 1 - Critical Logic)
**Days 1-2:** Store tests (auth, automations, connections)
**Days 3-4:** API client tests (api, websocket, feedback)
**Day 5:** Utilities tests + test setup infrastructure

**Deliverable:** 80%+ coverage for all stores and API client

### Week 2 (Phase 2 - Core Pages)
**Days 1-2:** Dashboard and Automations pages
**Days 3-4:** Connections page + critical components
**Day 5:** Code review, refactor, fix flaky tests

**Deliverable:** 75%+ coverage for all pages

### Week 3 (Phase 3-4 - Remaining Components)
**Days 1-2:** Layout and common components
**Days 3-4:** Feature components + hooks
**Day 5:** E2E tests + final coverage audit

**Deliverable:** 80%+ overall coverage

---

## Quality Standards

### Test Requirements
- ✅ All tests must pass `npm run test` (no skipped tests in main branch)
- ✅ All tests must be deterministic (no random failures)
- ✅ Each test file must include clear `describe` blocks and `it` statements
- ✅ Use `data-testid` attributes for complex selectors (avoid brittle CSS selectors)
- ✅ Mock external dependencies (API calls, WebSocket, Clerk)
- ✅ Test error states and edge cases, not just happy paths

### Code Review Checklist
- [ ] Tests cover happy path + error cases
- [ ] Mocks are properly cleaned up (vi.clearAllMocks in beforeEach)
- [ ] Async operations use proper waitFor/await patterns
- [ ] User interactions use @testing-library/user-event (not fireEvent)
- [ ] Accessibility tested (screen reader support, keyboard navigation)
- [ ] No hardcoded timeouts (use waitFor with proper conditions)

---

## Success Metrics

### Coverage Goals
- **Overall:** 80%+ code coverage
- **Critical Paths:** 90%+ (auth, API, stores)
- **Test Reliability:** <5% flaky test rate
- **Test Speed:** <2 minutes for full unit/integration suite

### Test Suite Health
- ✅ All tests passing on main branch
- ✅ CI/CD integration (tests run on PR + merge)
- ✅ Coverage reports generated and tracked
- ✅ No skipped or disabled tests without GitHub issues

---

## Dependencies to Install

```json
{
  "devDependencies": {
    "@vitest/coverage-v8": "^1.0.4",        // ✅ Already installed
    "@testing-library/react": "^14.1.2",     // ✅ Already installed
    "@testing-library/user-event": "^14.5.1", // ✅ Already installed
    "@testing-library/jest-dom": "^6.1.5",   // ✅ Already installed
    "msw": "^2.0.0",                         // ❌ NEW - API mocking
    "vitest-canvas-mock": "^0.3.3",          // ❌ NEW - Canvas mocking (for charts)
    "happy-dom": "^12.10.3"                  // ❌ OPTIONAL - Faster than jsdom
  }
}
```

**Installation Command:**
```bash
pnpm add -D msw@^2.0.0 vitest-canvas-mock@^0.3.3
```

---

## Risk Mitigation

### Potential Blockers
| Risk | Impact | Mitigation |
|------|--------|------------|
| Clerk mocking complexity | Medium | Use vi.mock with minimal mock implementation |
| WebSocket testing difficulty | Medium | Use ws mock library or custom mock implementation |
| Flaky async tests | High | Use waitFor with specific conditions, avoid arbitrary timeouts |
| Chart/PDF rendering in tests | Low | Mock Recharts and @react-pdf/renderer components |

### Contingency Plans
- If coverage target cannot be met: Prioritize P0/P1 files to 90%+ coverage
- If tests are too slow: Use happy-dom instead of jsdom, parallelize test execution
- If E2E tests are flaky: Reduce browser matrix, increase timeouts, add retry logic

---

## Next Steps

1. **Review and approve this plan** with team stakeholders
2. **Set up test infrastructure:**
   - Install MSW and configure request handlers
   - Create test fixtures and mock utilities
   - Update vitest.config.ts with coverage thresholds
3. **Start Phase 1 implementation:**
   - Begin with auth store tests (highest priority)
   - Implement MSW handlers for API mocking
   - Create reusable test utilities
4. **Weekly progress reviews:**
   - Track coverage metrics
   - Identify and fix flaky tests
   - Adjust timeline as needed

---

## Appendix: Example Test Structure

### Store Test Example (auth.test.ts)
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '@/stores/auth';
import { authApi } from '@/services/api';

vi.mock('@/services/api');

describe('Auth Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clearAuth();
  });

  describe('login', () => {
    it('should successfully log in user', async () => {
      vi.mocked(authApi.login).mockResolvedValueOnce(mockLoginResponse);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.login({ email: 'test@example.com', password: 'password' });
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockLoginResponse.user);
    });

    it('should handle login failure', async () => {
      vi.mocked(authApi.login).mockRejectedValueOnce(new Error('Invalid credentials'));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        const success = await result.current.login({ email: 'test@example.com', password: 'wrong' });
        expect(success).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe('Invalid credentials');
    });
  });
});
```

### Component Test Example (DashboardPage.test.tsx)
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { DashboardPage } from '@/pages/DashboardPage';
import { server } from '@/test/mocks/server';
import { rest } from 'msw';

describe('DashboardPage', () => {
  it('should display connection stats', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('3 Active Connections')).toBeInTheDocument();
    });
  });

  it('should handle API error gracefully', async () => {
    server.use(
      rest.get('/api/connections/stats', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Server error' }));
      })
    );

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load stats/i)).toBeInTheDocument();
    });
  });
});
```

---

**Document Version:** 1.0
**Last Updated:** 2025-10-20
**Owner:** QA Team
**Reviewers:** Frontend Team, Test Engineer
