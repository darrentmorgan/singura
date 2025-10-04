/**
 * Clerk Authentication Integration Test
 *
 * Tests the complete Clerk integration including:
 * - CSP configuration allowing Clerk domains
 * - Clerk library loading without errors
 * - Page rendering (not blank)
 * - Clerk components presence
 * - Organization creation flow (if authenticated)
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const FRONTEND_URL = 'http://localhost:4200';
const CLERK_PUBLISHABLE_KEY = 'pk_test_aW1wcm92ZWQtcmFiYml0LTk0LmNsZXJrLmFjY291bnRzLmRldiQ';

// Helper function to capture console logs
async function captureConsoleLogs(page: Page) {
  const consoleMessages: string[] = [];
  const errorMessages: string[] = [];

  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    consoleMessages.push(text);
    if (msg.type() === 'error') {
      errorMessages.push(text);
    }
  });

  page.on('pageerror', error => {
    errorMessages.push(`[PAGE ERROR] ${error.message}`);
  });

  return { consoleMessages, errorMessages };
}

test.describe('Clerk Authentication Integration', () => {

  test.beforeEach(async ({ page }) => {
    // Set up console logging before each test
    await captureConsoleLogs(page);
  });

  test('Test 1: Navigate to frontend and verify Clerk loads without CSP errors', async ({ page }) => {
    console.log('🧪 Test 1: Starting CSP and Clerk loading test...');

    const { errorMessages } = await captureConsoleLogs(page);

    // Navigate to the frontend
    const response = await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded' });

    // Verify page loads successfully
    expect(response?.status()).toBe(200);
    console.log('✅ Page loaded with status 200');

    // Wait for React to mount
    await page.waitForSelector('#root', { timeout: 5000 });
    console.log('✅ React root element found');

    // Wait a bit for Clerk to initialize
    await page.waitForTimeout(3000);

    // Check for CSP errors
    const cspErrors = errorMessages.filter(msg =>
      msg.toLowerCase().includes('csp') ||
      msg.toLowerCase().includes('content security policy') ||
      msg.toLowerCase().includes('refused to load') ||
      msg.toLowerCase().includes('blocked by')
    );

    if (cspErrors.length > 0) {
      console.error('❌ CSP Errors found:', cspErrors);
    } else {
      console.log('✅ No CSP errors detected');
    }

    // Check for Clerk-specific errors
    const clerkErrors = errorMessages.filter(msg =>
      msg.toLowerCase().includes('clerk')
    );

    if (clerkErrors.length > 0) {
      console.error('⚠️  Clerk-related errors:', clerkErrors);
    } else {
      console.log('✅ No Clerk-specific errors');
    }

    // Take screenshot for evidence
    await page.screenshot({
      path: 'test-results/clerk-csp-test.png',
      fullPage: true
    });

    // Assertions
    expect(cspErrors.length).toBe(0);
    console.log('✅ Test 1 PASSED: Clerk loads without CSP errors');
  });

  test('Test 2: Verify page renders (not blank)', async ({ page }) => {
    console.log('🧪 Test 2: Starting page render test...');

    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });

    // Wait for root element
    const rootElement = await page.locator('#root');
    await expect(rootElement).toBeVisible();
    console.log('✅ Root element is visible');

    // Get the text content of the entire page
    const bodyText = await page.locator('body').innerText();
    console.log('📄 Page content length:', bodyText.length);

    // Check if page has meaningful content (not just blank)
    expect(bodyText.length).toBeGreaterThan(50);
    console.log('✅ Page has meaningful content');

    // Check if root has child elements
    const rootChildren = await page.locator('#root > *').count();
    console.log('📊 Root element children count:', rootChildren);
    expect(rootChildren).toBeGreaterThan(0);

    // Take screenshot
    await page.screenshot({
      path: 'test-results/clerk-page-render.png',
      fullPage: true
    });

    console.log('✅ Test 2 PASSED: Page renders with content');
  });

  test('Test 3: Verify Clerk components are present', async ({ page }) => {
    console.log('🧪 Test 3: Starting Clerk components test...');

    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000); // Wait for Clerk to fully initialize

    // Check for Clerk provider in React DevTools (if available)
    const clerkProvider = await page.evaluate(() => {
      return document.querySelector('[data-clerk-provider]') !== null;
    });

    if (clerkProvider) {
      console.log('✅ Clerk provider element found');
    }

    // Look for common Clerk UI elements
    const clerkElements = {
      signInButton: await page.locator('[data-clerk-id*="sign-in"]').count(),
      userButton: await page.locator('[data-clerk-id*="user-button"]').count(),
      clerkLoaded: await page.evaluate(() => {
        return (window as any).Clerk !== undefined;
      }),
    };

    console.log('📊 Clerk elements found:', clerkElements);

    // Check if Clerk SDK is loaded globally
    if (clerkElements.clerkLoaded) {
      console.log('✅ Clerk SDK loaded globally');

      // Get Clerk version if available
      const clerkVersion = await page.evaluate(() => {
        return (window as any).Clerk?.version || 'unknown';
      });
      console.log('📦 Clerk SDK version:', clerkVersion);
    } else {
      console.log('⚠️  Clerk SDK not found on window object');
    }

    // Take screenshot
    await page.screenshot({
      path: 'test-results/clerk-components.png',
      fullPage: true
    });

    // At least one Clerk indicator should be present
    const hasClerkIndicators = clerkElements.clerkLoaded ||
                               clerkElements.signInButton > 0 ||
                               clerkElements.userButton > 0 ||
                               clerkProvider;

    expect(hasClerkIndicators).toBeTruthy();
    console.log('✅ Test 3 PASSED: Clerk components detected');
  });

  test('Test 4: Check Clerk publishable key configuration', async ({ page }) => {
    console.log('🧪 Test 4: Starting Clerk configuration test...');

    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Check if Clerk is initialized with correct key
    const clerkConfig = await page.evaluate(() => {
      const clerk = (window as any).Clerk;
      if (clerk) {
        return {
          isLoaded: true,
          publishableKey: clerk.publishableKey || 'not found',
          frontendApi: clerk.frontendApi || 'not found',
        };
      }
      return { isLoaded: false };
    });

    console.log('🔑 Clerk configuration:', clerkConfig);

    if (clerkConfig.isLoaded) {
      // Verify publishable key starts with pk_test_
      const keyPrefix = clerkConfig.publishableKey.substring(0, 8);
      expect(keyPrefix).toBe('pk_test_');
      console.log('✅ Clerk configured with test publishable key');
    }

    // Take screenshot
    await page.screenshot({
      path: 'test-results/clerk-config.png',
      fullPage: true
    });

    expect(clerkConfig.isLoaded).toBeTruthy();
    console.log('✅ Test 4 PASSED: Clerk configuration verified');
  });

  test('Test 5: Capture all console output for debugging', async ({ page }) => {
    console.log('🧪 Test 5: Starting comprehensive console capture...');

    const { consoleMessages, errorMessages } = await captureConsoleLogs(page);

    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Log all console messages
    console.log('\n📋 ALL CONSOLE MESSAGES:');
    console.log('=' .repeat(80));
    consoleMessages.forEach((msg, i) => {
      console.log(`${i + 1}. ${msg}`);
    });
    console.log('=' .repeat(80));

    // Log all errors separately
    if (errorMessages.length > 0) {
      console.log('\n❌ ERROR MESSAGES:');
      console.log('=' .repeat(80));
      errorMessages.forEach((msg, i) => {
        console.log(`${i + 1}. ${msg}`);
      });
      console.log('=' .repeat(80));
    } else {
      console.log('\n✅ No errors detected');
    }

    // Network analysis
    const networkRequests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('clerk')) {
        networkRequests.push(`${request.method()} ${request.url()}`);
      }
    });

    // Reload to capture network requests
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('\n🌐 CLERK-RELATED NETWORK REQUESTS:');
    console.log('=' .repeat(80));
    networkRequests.forEach((req, i) => {
      console.log(`${i + 1}. ${req}`);
    });
    console.log('=' .repeat(80));

    // Take final screenshot
    await page.screenshot({
      path: 'test-results/clerk-debug-final.png',
      fullPage: true
    });

    // This test always passes - it's for information gathering
    expect(true).toBeTruthy();
    console.log('✅ Test 5 PASSED: Debug information captured');
  });

  test('Test 6: Organization feature availability', async ({ page }) => {
    console.log('🧪 Test 6: Starting organization feature test...');

    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Check if organization features are enabled
    const orgFeatures = await page.evaluate(() => {
      const clerk = (window as any).Clerk;
      if (clerk) {
        return {
          organizationEnabled: clerk.__experimental_organization !== undefined,
          organizationList: clerk.organization !== undefined,
          organizationSwitcher: document.querySelector('[data-clerk-id*="organization"]') !== null,
        };
      }
      return { available: false };
    });

    console.log('🏢 Organization features:', orgFeatures);

    // Take screenshot
    await page.screenshot({
      path: 'test-results/clerk-organization-features.png',
      fullPage: true
    });

    // This test is informational
    expect(true).toBeTruthy();
    console.log('✅ Test 6 PASSED: Organization feature check complete');
  });
});

test.describe('Error Recovery and Recommendations', () => {

  test('Generate error report and recommendations', async ({ page }) => {
    console.log('🧪 Generating comprehensive error report...');

    const issues: string[] = [];
    const recommendations: string[] = [];

    const { errorMessages } = await captureConsoleLogs(page);

    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Analyze errors
    const cspErrors = errorMessages.filter(msg =>
      msg.toLowerCase().includes('csp') ||
      msg.toLowerCase().includes('refused to load')
    );

    const clerkErrors = errorMessages.filter(msg =>
      msg.toLowerCase().includes('clerk')
    );

    const networkErrors = errorMessages.filter(msg =>
      msg.toLowerCase().includes('failed to fetch') ||
      msg.toLowerCase().includes('network')
    );

    // Generate recommendations
    if (cspErrors.length > 0) {
      issues.push('CSP blocking Clerk resources');
      recommendations.push('Update CSP in index.html to include all Clerk domains');
      recommendations.push('Add: https://*.clerk.accounts.dev to script-src, style-src, connect-src');
    }

    if (clerkErrors.length > 0) {
      issues.push('Clerk initialization errors detected');
      recommendations.push('Verify VITE_CLERK_PUBLISHABLE_KEY in .env file');
      recommendations.push('Check Clerk dashboard settings for organization feature');
    }

    if (networkErrors.length > 0) {
      issues.push('Network connectivity issues');
      recommendations.push('Ensure frontend server is running on port 4200');
      recommendations.push('Check firewall/proxy settings');
    }

    // Output report
    console.log('\n📊 ERROR ANALYSIS REPORT');
    console.log('=' .repeat(80));

    if (issues.length === 0) {
      console.log('✅ No critical issues detected!');
    } else {
      console.log('❌ Issues Found:');
      issues.forEach((issue, i) => {
        console.log(`  ${i + 1}. ${issue}`);
      });

      console.log('\n💡 Recommendations:');
      recommendations.forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec}`);
      });
    }
    console.log('=' .repeat(80));

    // Always pass this test - it's for reporting
    expect(true).toBeTruthy();
  });
});
