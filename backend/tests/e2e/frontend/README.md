# Dashboard Validation E2E Tests

## Overview

Comprehensive end-to-end tests for the Singura dashboard using Chrome DevTools MCP for browser automation.

## Test Coverage

### Test Scenarios

1. **Dashboard Displays Automations Correctly**
   - Loads dashboard and displays automation cards
   - Verifies correct automation count
   - Validates risk badge rendering

2. **Real-Time WebSocket Updates**
   - Receives and displays real-time automation updates via WebSocket

3. **Platform Filtering**
   - Filters by Slack platform
   - Filters by Google platform
   - Filters by Microsoft platform

4. **Risk Score Badge Colors**
   - Verifies correct colors for critical, high, medium, low risk levels

5. **OAuth Context Tooltips**
   - Displays OAuth context information on hover

6. **Detection Evidence Panels**
   - Expands detection evidence panel on click
   - Collapses detection evidence panel

7. **Search Functionality**
   - Filters automations by search query
   - Shows no results message for non-existent searches

8. **Pagination**
   - Paginates for >50 automations
   - Navigates to next page

9. **Export Functionality**
   - Generates CSV export
   - Generates PDF export

10. **Dashboard Performance**
    - Loads dashboard in <2 seconds for 100 automations
    - Has no console errors during navigation
    - Handles rapid filtering without lag

## Prerequisites

### 1. Start Backend Server

```bash
cd backend
npm run dev
```

Backend should be running on `http://localhost:3000`

### 2. Start Frontend Dev Server

```bash
cd frontend
npm run dev
```

Frontend should be running on `http://localhost:5173`

### 3. Setup Database

Ensure PostgreSQL is running:

```bash
docker compose up -d postgres redis
```

Run migrations:

```bash
cd backend
npm run migrate
```

### 4. Start Chrome DevTools MCP (REQUIRED)

```bash
# Kill any existing Chrome instances first
ps aux | grep -i "chrome\|chromium" | grep -v grep | awk '{print $2}' | xargs kill -9

# Start Chrome DevTools MCP in isolated mode
chrome-devtools-mcp --isolated
```

**Why isolated mode?**
- Allows parallel test execution
- Prevents state pollution between tests
- Required for E2E test suite

## Running Tests

### Run All Dashboard E2E Tests

```bash
cd backend
npm run test:e2e -- dashboard-validation
```

### Run Specific Test Suite

```bash
# Test 1: Dashboard display
npm run test:e2e -- -t "Dashboard Displays Automations Correctly"

# Test 3: Platform filtering
npm run test:e2e -- -t "Platform Filtering"

# Test 10: Performance
npm run test:e2e -- -t "Dashboard Performance"
```

### Run with Coverage

```bash
npm run test:e2e -- --coverage dashboard-validation
```

## Test Architecture

### File Structure

```
backend/tests/e2e/frontend/
├── README.md                          # This file
├── dashboard-validation.spec.ts       # Main test file (10 test scenarios)
└── screenshots/                       # Auto-generated screenshots on failure
```

### Chrome DevTools MCP Integration

The tests use Chrome DevTools MCP for browser automation. Key tools:

- `mcp__chrome-devtools__navigate_page`: Navigate to URLs
- `mcp__chrome-devtools__take_snapshot`: Capture accessibility tree (preferred for validation)
- `mcp__chrome-devtools__click`: Click elements
- `mcp__chrome-devtools__fill`: Fill form fields
- `mcp__chrome-devtools__wait_for`: Wait for elements
- `mcp__chrome-devtools__take_screenshot`: Visual capture (failures only)
- `mcp__chrome-devtools__evaluate_script`: Run JavaScript in browser
- `mcp__chrome-devtools__list_console_messages`: Check for errors
- `mcp__chrome-devtools__list_network_requests`: Analyze network activity

### Test Data

Tests seed the database with:
- 40 Slack automations
- 35 Google Workspace automations
- 25 Microsoft 365 automations
- Mix of risk levels (low, medium, high, critical)
- Various statuses (active, inactive, error)

Data is cleaned up after each test run.

## Debugging Failed Tests

### 1. Check Screenshots

Failed tests automatically capture screenshots to `/tmp/`:

```bash
ls -la /tmp/dashboard-*.png
```

### 2. Check Console Logs

Tests capture browser console messages. Look for:

```
✓ Console: 0 errors (0 critical), 2 warnings
```

### 3. Check Network Requests

Tests validate API calls:

```bash
# Look for failed network requests in test output
npm run test:e2e -- -t "Dashboard Performance" --verbose
```

### 4. Run Tests in Debug Mode

```bash
# Enable verbose Jest output
npm run test:e2e -- --verbose --detectOpenHandles dashboard-validation
```

### 5. Check Backend Logs

If API calls are failing:

```bash
cd backend
tail -f logs/combined.log
```

## Performance Benchmarks

### Expected Load Times

- Dashboard initial load: <2 seconds (100 automations)
- Filter application: <500ms
- Search results: <300ms
- Pagination: <400ms
- Export generation: <3 seconds

### Browser Performance

- No console errors
- <100MB memory usage
- <50ms paint time
- >60 FPS during interactions

## Common Issues

### Issue: Chrome DevTools MCP Not Running

**Error**: `ECONNREFUSED` or timeout errors

**Solution**:
```bash
ps aux | grep -i chrome | grep -v grep | awk '{print $2}' | xargs kill -9
chrome-devtools-mcp --isolated
```

### Issue: Frontend Not Running

**Error**: Tests fail to navigate to `http://localhost:5173`

**Solution**:
```bash
cd frontend
npm run dev
```

### Issue: Database Connection Failed

**Error**: `connect ECONNREFUSED 127.0.0.1:5433`

**Solution**:
```bash
docker compose up -d postgres
cd backend
npm run migrate
```

### Issue: Stale Test Data

**Error**: Tests see old automation data

**Solution**:
```bash
# Clean test database
cd backend
npm run migrate:test
```

### Issue: Port Already in Use

**Error**: `Port 5173 already in use`

**Solution**:
```bash
lsof -ti:5173 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

## Test Results Format

### Success Output

```
✓ Dashboard loaded successfully
✓ Displayed 50 automations on first page
✓ Risk badges: 12 high, 18 medium, 20 low
✓ Filtered 40 Slack automations
✓ Dashboard loaded in 1847ms
✓ Console: 0 errors (0 critical), 1 warnings

Test Suites: 1 passed, 1 total
Tests:       24 passed, 24 total
Time:        18.532s
```

### Failure Output

```
✗ Dashboard loaded in 2453ms
  Expected: loadTime < 2000ms
  Received: 2453ms

Screenshot saved: /tmp/dashboard-performance-fail.png

Test Suites: 1 failed, 1 total
Tests:       1 failed, 23 passed, 24 total
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run Dashboard E2E Tests
  run: |
    npm run test:e2e -- dashboard-validation --ci
```

### Required Environment Variables

```bash
VITE_API_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:password@localhost:5433/singura_test
REDIS_URL=redis://localhost:6379
```

## Maintenance

### Updating Test Data

Edit `/backend/tests/helpers/mock-data.ts`:

```typescript
static generateAutomations(count: number, platform: Platform, organizationId: string): any[]
```

### Adding New Test Scenarios

1. Add test to `dashboard-validation.spec.ts`
2. Update this README with test description
3. Run locally to verify
4. Create PR with test results

### Updating Expected Behavior

If dashboard UI changes:

1. Update selectors in test file
2. Update expected values (e.g., load times)
3. Re-run all tests
4. Document changes in PR

## Resources

- [Chrome DevTools MCP Documentation](https://github.com/model-context-protocol/servers/tree/main/src/chrome-devtools)
- [Jest E2E Testing Guide](https://jestjs.io/docs/e2e-testing)
- [Singura Testing Strategy](../../docs/TESTING.md)

## Support

For questions or issues:
1. Check this README
2. Review test output and screenshots
3. Check backend/frontend logs
4. Open an issue with test failure details
