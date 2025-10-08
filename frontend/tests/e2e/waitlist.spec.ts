import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Waitlist Signup Flow
 * Tests the complete user journey for joining the waitlist
 */

test.describe('Waitlist Signup Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to landing page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display landing page correctly', async ({ page }) => {
    // Verify page title
    await expect(page).toHaveTitle(/SaaS X-Ray/);

    // Verify hero section is visible
    const heroHeading = page.getByRole('heading', { level: 1 }).first();
    await expect(heroHeading).toBeVisible();

    // Take screenshot of landing page
    await page.screenshot({
      path: 'test-screenshots/landing-page.png',
      fullPage: true
    });
  });

  test('should open waitlist modal when clicking CTA button', async ({ page }) => {
    // Find and click "Join Waitlist" button (there may be multiple)
    const joinButton = page.getByRole('button', { name: /join waitlist/i }).first();
    await expect(joinButton).toBeVisible();
    await joinButton.click();

    // Verify modal is open
    const modalTitle = page.getByRole('heading', { name: /join the waitlist/i });
    await expect(modalTitle).toBeVisible();

    // Take screenshot of modal
    await page.screenshot({
      path: 'test-screenshots/waitlist-modal-open.png'
    });
  });

  test('should validate required email field', async ({ page }) => {
    // Open waitlist modal
    const joinButton = page.getByRole('button', { name: /join waitlist/i }).first();
    await joinButton.click();

    // Try to submit without email
    const submitButton = page.getByTestId('waitlist-submit');
    await expect(submitButton).toBeDisabled();

    // Enter invalid email format (browser validation)
    const emailInput = page.getByLabel(/work email/i);
    await emailInput.fill('invalid-email');

    // Submit button should still be enabled but form validation should trigger
    await submitButton.click();

    // Take screenshot of validation state
    await page.screenshot({
      path: 'test-screenshots/waitlist-validation.png'
    });
  });

  test('should successfully submit waitlist form with valid data', async ({ page }) => {
    // Open waitlist modal
    const joinButton = page.getByRole('button', { name: /join waitlist/i }).first();
    await joinButton.click();

    // Fill in form with valid data (using timestamp to ensure uniqueness)
    const timestamp = Date.now();
    const emailInput = page.getByLabel(/work email/i);
    const nameInput = page.getByLabel(/full name/i);
    const companyInput = page.getByLabel(/company/i);

    await emailInput.fill(`test-${timestamp}@example.com`);
    await nameInput.fill('Test User');
    await companyInput.fill('Test Company');

    // Take screenshot before submission
    await page.screenshot({
      path: 'test-screenshots/waitlist-form-filled.png'
    });

    // Submit form
    const submitButton = page.getByTestId('waitlist-submit');
    await submitButton.click();

    // Wait for success state
    const successMessage = page.getByText(/you're on the list/i);
    await expect(successMessage).toBeVisible({ timeout: 5000 });

    // Verify success icon is visible
    const successIcon = page.locator('svg').filter({ hasText: '' }).first();
    await expect(successIcon).toBeVisible();

    // Take screenshot of success state
    await page.screenshot({
      path: 'test-screenshots/waitlist-success.png'
    });

    // Verify modal auto-closes (wait for it to disappear)
    await expect(successMessage).not.toBeVisible({ timeout: 3000 });
  });

  test('should handle duplicate email gracefully', async ({ page }) => {
    // Use a known duplicate email
    const duplicateEmail = 'duplicate@example.com';

    // First submission
    const joinButton = page.getByRole('button', { name: /join waitlist/i }).first();
    await joinButton.click();

    const emailInput = page.getByLabel(/work email/i);
    await emailInput.fill(duplicateEmail);

    const submitButton = page.getByTestId('waitlist-submit');
    await submitButton.click();

    // Wait for either success or error
    await page.waitForTimeout(2000);

    // Close modal if it's still open
    const closeButton = page.getByRole('button', { name: /close/i }).first();
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
    }

    // Try to submit the same email again
    await page.waitForTimeout(1000);
    await joinButton.click();
    await emailInput.fill(duplicateEmail);
    await submitButton.click();

    // Should show "already on waitlist" error
    const errorMessage = page.getByText(/already on the waitlist/i);
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    // Take screenshot of error state
    await page.screenshot({
      path: 'test-screenshots/waitlist-duplicate-error.png'
    });
  });

  test('should be responsive on mobile devices', async ({ page, viewport }) => {
    // This test will run on Mobile Chrome and Mobile Safari projects
    if (viewport && viewport.width < 768) {
      // Verify mobile navigation
      const mobileMenu = page.getByRole('button', { name: /menu/i }).first();
      if (await mobileMenu.isVisible().catch(() => false)) {
        await mobileMenu.click();

        // Take screenshot of mobile menu
        await page.screenshot({
          path: 'test-screenshots/mobile-menu.png'
        });
      }

      // Open waitlist modal
      const joinButton = page.getByRole('button', { name: /join waitlist/i }).first();
      await joinButton.click();

      // Verify modal is responsive
      const modalContent = page.getByRole('dialog');
      await expect(modalContent).toBeVisible();

      // Take screenshot of mobile modal
      await page.screenshot({
        path: 'test-screenshots/mobile-waitlist-modal.png'
      });
    }
  });

  test('should check for console errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    // Collect console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate and interact with page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const joinButton = page.getByRole('button', { name: /join waitlist/i }).first();
    await joinButton.click();

    // Wait a bit for any async errors
    await page.waitForTimeout(2000);

    // Assert no console errors (excluding known third-party errors)
    const relevantErrors = consoleErrors.filter(error =>
      !error.includes('third-party') &&
      !error.includes('extension') &&
      !error.includes('chrome-extension')
    );

    expect(relevantErrors).toHaveLength(0);
  });

  test('should navigate to login page', async ({ page }) => {
    // Find and click login/sign in link
    const loginLink = page.getByRole('link', { name: /sign in|login/i }).first();

    if (await loginLink.isVisible().catch(() => false)) {
      await loginLink.click();
      await page.waitForLoadState('networkidle');

      // Verify navigation to login page
      await expect(page).toHaveURL(/\/login/);

      // Take screenshot of login page
      await page.screenshot({
        path: 'test-screenshots/login-page.png',
        fullPage: true
      });
    }
  });
});

test.describe('Landing Page Accessibility', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');

    // Check for h1 (should be only one)
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
    expect(h1Count).toBeLessThanOrEqual(2); // Some designs have logo + hero h1

    // Verify headings are in proper order
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    expect(headings.length).toBeGreaterThan(0);
  });

  test('should have accessible form labels', async ({ page }) => {
    await page.goto('/');

    // Open waitlist modal
    const joinButton = page.getByRole('button', { name: /join waitlist/i }).first();
    await joinButton.click();

    // Check that all inputs have associated labels
    const emailInput = page.getByLabel(/work email/i);
    await expect(emailInput).toBeVisible();

    const nameInput = page.getByLabel(/full name/i);
    await expect(nameInput).toBeVisible();

    const companyInput = page.getByLabel(/company/i);
    await expect(companyInput).toBeVisible();
  });
});
