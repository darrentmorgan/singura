/**
 * E2E Test Helper Utilities
 * Common functions and utilities for E2E tests
 */

import { Page, expect } from '@playwright/test';

/**
 * Wait for page to be fully loaded with network idle
 */
export async function waitForPageLoad(page: Page, timeout = 30000) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Take a screenshot with a descriptive name
 */
export async function takeScreenshot(page: Page, name: string, fullPage = false) {
  await page.screenshot({
    path: `test-screenshots/${name}.png`,
    fullPage,
  });
}

/**
 * Check if element exists without throwing error
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  return await page.locator(selector).count() > 0;
}

/**
 * Fill form field with validation check
 */
export async function fillField(page: Page, label: string, value: string) {
  const field = page.getByLabel(new RegExp(label, 'i'));
  await expect(field).toBeVisible();
  await field.fill(value);
}

/**
 * Click button by text with retry logic
 */
export async function clickButton(page: Page, text: string, options?: { exact?: boolean }) {
  const button = page.getByRole('button', { name: new RegExp(text, 'i'), exact: options?.exact });
  await expect(button).toBeVisible();
  await button.click();
}

/**
 * Wait for API response with specific URL pattern
 */
export async function waitForApiResponse(page: Page, urlPattern: string | RegExp, timeout = 10000) {
  return await page.waitForResponse(
    response => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout }
  );
}

/**
 * Check for console errors during page interaction
 */
export function setupConsoleErrorTracking(page: Page): string[] {
  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', (error) => {
    errors.push(error.message);
  });

  return errors;
}

/**
 * Filter out known/acceptable console errors
 */
export function filterConsoleErrors(errors: string[]): string[] {
  return errors.filter(error =>
    !error.includes('third-party') &&
    !error.includes('extension') &&
    !error.includes('chrome-extension') &&
    !error.includes('Failed to load resource') && // Common CDN issues
    !error.includes('net::ERR_') // Network errors
  );
}

/**
 * Generate unique email for testing
 */
export function generateTestEmail(prefix = 'test'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `${prefix}-${timestamp}-${random}@example.com`;
}

/**
 * Verify modal is open
 */
export async function verifyModalOpen(page: Page, title?: string) {
  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible();

  if (title) {
    const modalTitle = page.getByRole('heading', { name: new RegExp(title, 'i') });
    await expect(modalTitle).toBeVisible();
  }
}

/**
 * Close modal by clicking outside or close button
 */
export async function closeModal(page: Page) {
  const closeButton = page.getByRole('button', { name: /close/i }).first();

  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click();
  } else {
    // Click outside modal (backdrop)
    await page.keyboard.press('Escape');
  }

  await page.waitForTimeout(500); // Wait for close animation
}

/**
 * Verify element has specific accessibility attributes
 */
export async function verifyAccessibility(page: Page, selector: string) {
  const element = page.locator(selector);

  // Check for ARIA attributes
  const role = await element.getAttribute('role');
  const ariaLabel = await element.getAttribute('aria-label');
  const ariaLabelledBy = await element.getAttribute('aria-labelledby');

  // Element should have either a role, aria-label, or aria-labelledby
  const hasAccessibility = role || ariaLabel || ariaLabelledBy;
  expect(hasAccessibility).toBeTruthy();
}

/**
 * Test responsive design at different breakpoints
 */
export const BREAKPOINTS = {
  mobile: { width: 375, height: 667 }, // iPhone SE
  tablet: { width: 768, height: 1024 }, // iPad
  desktop: { width: 1920, height: 1080 }, // Full HD
};

/**
 * Set viewport to specific breakpoint
 */
export async function setViewport(page: Page, breakpoint: keyof typeof BREAKPOINTS) {
  await page.setViewportSize(BREAKPOINTS[breakpoint]);
}
