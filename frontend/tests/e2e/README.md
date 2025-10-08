# E2E Testing Guide

Comprehensive end-to-end testing setup for SaaS X-Ray frontend using Playwright.

---

## Quick Start

### Prerequisites
- Node.js 20+
- Frontend dev server running on `http://localhost:8080`
- Supabase credentials configured in `.env`

### Installation
```bash
# Install Playwright browsers (if not already installed)
npx playwright install

# Or install specific browser
npx playwright install chromium
```

### Running Tests

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run tests with UI (visual test runner)
npm run test:e2e:ui

# Run tests with browser visible
npm run test:e2e:headed

# Debug specific test
npm run test:e2e:debug

# View HTML report
npm run test:e2e:report
```

---

## Project Structure

```
tests/e2e/
├── README.md                    # This file
├── waitlist.spec.ts            # Waitlist flow tests
├── helpers/
│   └── test-helpers.ts         # Reusable test utilities
└── [future test files]
    ├── auth.spec.ts            # Authentication tests
    ├── dashboard.spec.ts       # Dashboard tests
    ├── connections.spec.ts     # Connection management tests
    └── oauth.spec.ts           # OAuth flow tests
```

---

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { waitForPageLoad, takeScreenshot, generateTestEmail } from './helpers/test-helpers';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
  });

  test('should perform action', async ({ page }) => {
    // Arrange
    const email = generateTestEmail();

    // Act
    await page.getByLabel(/email/i).fill(email);
    await page.getByRole('button', { name: /submit/i }).click();

    // Assert
    await expect(page.getByText(/success/i)).toBeVisible();

    // Screenshot
    await takeScreenshot(page, 'feature-success');
  });
});
```

### Using Test Helpers

```typescript
import {
  waitForPageLoad,
  takeScreenshot,
  fillField,
  clickButton,
  verifyModalOpen,
  closeModal,
  generateTestEmail,
  setupConsoleErrorTracking,
  filterConsoleErrors,
} from './helpers/test-helpers';

// Wait for page load
await waitForPageLoad(page);

// Fill form fields
await fillField(page, 'Email', 'test@example.com');
await fillField(page, 'Password', 'SecurePass123!');

// Click buttons
await clickButton(page, 'Submit');

// Verify modals
await verifyModalOpen(page, 'Confirmation');
await closeModal(page);

// Generate test data
const email = generateTestEmail('qa');

// Track console errors
const errors = setupConsoleErrorTracking(page);
// ... perform actions ...
const relevantErrors = filterConsoleErrors(errors);
expect(relevantErrors).toHaveLength(0);
```

### Responsive Testing

```typescript
import { setViewport, BREAKPOINTS } from './helpers/test-helpers';

test('should be responsive', async ({ page }) => {
  // Mobile
  await setViewport(page, 'mobile');
  await takeScreenshot(page, 'feature-mobile');

  // Tablet
  await setViewport(page, 'tablet');
  await takeScreenshot(page, 'feature-tablet');

  // Desktop
  await setViewport(page, 'desktop');
  await takeScreenshot(page, 'feature-desktop');
});
```

---

## Test Patterns

### 1. Page Object Model (Recommended)

```typescript
// pages/WaitlistPage.ts
export class WaitlistPage {
  constructor(private page: Page) {}

  async open() {
    await this.page.goto('/');
    await this.page.getByRole('button', { name: /join waitlist/i }).click();
  }

  async fillForm(data: { email: string; name?: string; company?: string }) {
    if (data.email) await this.page.getByLabel(/email/i).fill(data.email);
    if (data.name) await this.page.getByLabel(/name/i).fill(data.name);
    if (data.company) await this.page.getByLabel(/company/i).fill(data.company);
  }

  async submit() {
    await this.page.getByTestId('waitlist-submit').click();
  }

  async expectSuccess() {
    await expect(this.page.getByText(/you're on the list/i)).toBeVisible();
  }
}

// Usage in tests
test('waitlist signup', async ({ page }) => {
  const waitlistPage = new WaitlistPage(page);
  await waitlistPage.open();
  await waitlistPage.fillForm({ email: generateTestEmail() });
  await waitlistPage.submit();
  await waitlistPage.expectSuccess();
});
```

### 2. API Mocking (for isolated tests)

```typescript
test('should handle API error', async ({ page }) => {
  // Mock API response
  await page.route('**/api/waitlist', route => {
    route.fulfill({
      status: 500,
      body: JSON.stringify({ error: 'Server error' })
    });
  });

  // Proceed with test
  await page.goto('/');
  // ... rest of test
});
```

### 3. Authentication State

```typescript
// Save authenticated state
test('login and save state', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('admin@example.com');
  await page.getByLabel(/password/i).fill('password123');
  await page.getByRole('button', { name: /sign in/i }).click();

  // Save storage state
  await page.context().storageState({ path: 'auth.json' });
});

// Reuse authenticated state
test.use({ storageState: 'auth.json' });

test('protected page access', async ({ page }) => {
  // Already authenticated from saved state
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/dashboard/);
});
```

---

## Configuration

### Playwright Config (`playwright.config.ts`)

Key configurations:
- **Base URL:** `http://localhost:8080`
- **Timeout:** 30s navigation, 10s actions
- **Retries:** 2 retries on CI, 0 locally
- **Screenshots:** On failure only
- **Videos:** Retained on failure
- **Browsers:** Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari

### Environment Variables

```bash
# .env or .env.test
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

---

## CI/CD Integration

### GitHub Actions Workflow

The E2E tests run automatically on:
- Pull requests to `main` or `develop`
- Pushes to `main` or `develop`
- Manual workflow dispatch

**Workflow file:** `.github/workflows/e2e-tests.yml`

**Matrix strategy:**
- Browsers: Chromium, Firefox, WebKit
- Parallel execution for faster results

**Artifacts:**
- Test reports (HTML, JSON)
- Screenshots (on failure)
- Videos (on failure)
- Retention: 30 days

### Viewing CI Results

1. Go to GitHub Actions tab
2. Select "E2E Tests" workflow
3. Click on latest run
4. Download artifacts:
   - `playwright-report-{browser}` - Test results
   - `screenshots-{browser}` - Failure screenshots
   - `videos-{browser}` - Failure videos

---

## Best Practices

### 1. Use Data Test IDs for Critical Elements
```tsx
// Component
<button data-testid="submit-button">Submit</button>

// Test
await page.getByTestId('submit-button').click();
```

### 2. Avoid Hard-coded Waits
```typescript
// ❌ Bad
await page.waitForTimeout(5000);

// ✅ Good
await page.waitForSelector('[data-testid="result"]');
await page.waitForLoadState('networkidle');
```

### 3. Clean Test Data
```typescript
test.afterEach(async ({ page }) => {
  // Clean up test data created during test
  await page.request.delete('/api/test-data');
});
```

### 4. Isolate Tests
Each test should be independent and not rely on previous test state.

### 5. Use Descriptive Test Names
```typescript
// ❌ Bad
test('test 1', async ({ page }) => { ... });

// ✅ Good
test('should display error message when email is invalid', async ({ page }) => { ... });
```

---

## Debugging

### Visual Debugging
```bash
# Open Playwright Inspector
npm run test:e2e:debug

# Or debug specific test
npx playwright test waitlist.spec.ts --debug
```

### Trace Viewer
```bash
# Generate trace
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

### Screenshots & Videos
Automatically captured on failure. Manually capture:
```typescript
await page.screenshot({ path: 'debug.png' });
await page.video()?.saveAs('debug.webm');
```

---

## Common Issues

### Issue: Browser not found
**Solution:** Install Playwright browsers
```bash
npx playwright install
```

### Issue: Port already in use
**Solution:** Frontend dev server must be running on port 8080
```bash
# In frontend directory
npm run dev
```

### Issue: Test timeout
**Solution:** Increase timeout in config or test
```typescript
test('slow test', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // ... test code
});
```

### Issue: Flaky tests
**Solutions:**
- Use `waitForLoadState('networkidle')`
- Add proper wait conditions (`waitForSelector`)
- Avoid `waitForTimeout`
- Check for race conditions

---

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Test Selectors Guide](https://playwright.dev/docs/selectors)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
- [Debugging Guide](https://playwright.dev/docs/debug)

---

## Contributing

When adding new E2E tests:

1. **Follow naming convention:** `{feature}.spec.ts`
2. **Use test helpers** from `helpers/test-helpers.ts`
3. **Add screenshots** for visual verification
4. **Document test purpose** in test description
5. **Update this README** if adding new patterns
6. **Ensure tests pass locally** before PR
7. **Check CI results** after PR submission

---

**Last Updated:** October 8, 2025
**Maintained by:** QA Team
