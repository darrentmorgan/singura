import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';

// Screenshot directory (relative to project root)
const SCREENSHOT_DIR = 'test-results/oauth-scope-enrichment';

test.describe('OAuth Scope Enrichment - Google Workspace Discovery', () => {
  let networkRequests: any[] = [];
  let consoleMessages: string[] = [];
  let consoleErrors: string[] = [];

  test.beforeAll(() => {
    // Create screenshot directory
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Reset tracking arrays
    networkRequests = [];
    consoleMessages = [];
    consoleErrors = [];

    // Capture all console messages
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(text);
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    // Capture network requests
    page.on('response', async (response) => {
      if (response.url().includes('/api/')) {
        try {
          const body = await response.json().catch(() => null);
          networkRequests.push({
            url: response.url(),
            status: response.status(),
            method: response.request().method(),
            body: body,
            timestamp: new Date().toISOString()
          });
        } catch (e) {
          // Ignore JSON parse errors
        }
      }
    });
  });

  test('Verify OAuth scopes show enriched metadata instead of Unknown fallbacks', async ({ page }) => {
    console.log('\n=== TEST: OAuth Scope Enrichment Verification ===\n');

    // Step 1: Navigate to the application
    console.log('Step 1: Navigating to http://localhost:4200...');
    await page.goto('http://localhost:4200', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Take screenshot of landing page
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-landing-page.png`,
      fullPage: true
    });
    console.log('✓ Screenshot saved: 01-landing-page.png');

    // Step 2: Check if we need to log in (Clerk auth)
    const isLoginPage = await page.locator('text=/sign in|log in/i').count() > 0;

    if (isLoginPage) {
      console.log('Step 2: Login page detected. Attempting to find auth controls...');

      // Look for email/password inputs
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();

      if (await emailInput.isVisible({ timeout: 5000 })) {
        console.log('⚠ Login required. Please configure Clerk test credentials or use existing session.');
        console.log('Note: This test requires an authenticated session with Google Workspace connection.');

        await page.screenshot({
          path: `${SCREENSHOT_DIR}/02-login-required.png`,
          fullPage: true
        });

        // For now, skip the test if login is required
        test.skip();
        return;
      }
    }

    // Step 3: Navigate to connections/dashboard
    console.log('Step 3: Looking for connections/dashboard navigation...');

    // Try multiple navigation patterns
    const navLinks = [
      page.locator('a:has-text("Connections")'),
      page.locator('a:has-text("Dashboard")'),
      page.locator('a[href*="connections"]'),
      page.locator('a[href*="dashboard"]')
    ];

    let navigated = false;
    for (const link of navLinks) {
      if (await link.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await link.first().click();
        console.log(`✓ Clicked navigation link: ${await link.first().textContent()}`);
        navigated = true;
        await page.waitForTimeout(2000);
        break;
      }
    }

    if (!navigated) {
      console.log('⚠ No navigation link found. Trying direct URL navigation...');
      await page.goto('http://localhost:4200/dashboard', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-connections-page.png`,
      fullPage: true
    });
    console.log('✓ Screenshot saved: 03-connections-page.png');

    // Step 4: Find Google Workspace connection
    console.log('Step 4: Looking for Google Workspace connection...');

    const connectionCards = page.locator('[data-testid*="connection"], .connection-card, div:has-text("Google Workspace")');
    const cardCount = await connectionCards.count();

    console.log(`Found ${cardCount} potential connection card(s)`);

    if (cardCount === 0) {
      console.log('⚠ No connection cards found. Checking page content...');
      const pageContent = await page.content();

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/04-no-connections.png`,
        fullPage: true
      });

      throw new Error('❌ No Google Workspace connection found on the page');
    }

    // Step 5: Trigger discovery
    console.log('Step 5: Looking for Discover/Scan button...');

    const discoverButtons = [
      page.locator('button:has-text("Discover")'),
      page.locator('button:has-text("Scan")'),
      page.locator('button:has-text("Start Discovery")'),
      page.locator('[data-testid*="discover"]')
    ];

    let discoveryTriggered = false;
    for (const button of discoverButtons) {
      if (await button.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`Found button: ${await button.first().textContent()}`);
        await button.first().click();
        console.log('✓ Clicked discovery button');
        discoveryTriggered = true;
        break;
      }
    }

    if (!discoveryTriggered) {
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/05-no-discover-button.png`,
        fullPage: true
      });
      throw new Error('❌ Could not find Discover/Scan button');
    }

    // Wait for discovery to complete
    console.log('Step 6: Waiting for discovery to complete...');
    await page.waitForTimeout(3000);

    // Look for completion indicators
    const completionIndicators = [
      page.locator('text=/discovery completed|found.*automation/i'),
      page.locator('[data-testid="automation-card"]'),
      page.locator('text=/41.*automation/i') // Expected 41 automations
    ];

    let discoveryComplete = false;
    for (const indicator of completionIndicators) {
      if (await indicator.first().isVisible({ timeout: 30000 }).catch(() => false)) {
        console.log(`✓ Discovery complete indicator found: ${await indicator.first().textContent()}`);
        discoveryComplete = true;
        break;
      }
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06-after-discovery.png`,
      fullPage: true
    });
    console.log('✓ Screenshot saved: 06-after-discovery.png');

    // Step 7: Find and click on an automation with OAuth scopes
    console.log('Step 7: Looking for ChatGPT or Claude automation...');

    const automationCards = page.locator('[data-testid="automation-card"], .automation-card');
    const automationCount = await automationCards.count();

    console.log(`Found ${automationCount} automation card(s)`);

    if (automationCount === 0) {
      throw new Error('❌ No automation cards found after discovery');
    }

    // Look for ChatGPT or Claude automations
    const targetAutomations = [
      page.locator('text=/chatgpt/i'),
      page.locator('text=/claude/i'),
      page.locator('text=/openai/i')
    ];

    let targetFound = false;
    let targetElement = null;

    for (const target of targetAutomations) {
      if (await target.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        targetElement = target.first();
        targetFound = true;
        console.log(`✓ Found target automation: ${await targetElement.textContent()}`);
        break;
      }
    }

    // If no specific target found, use the first automation
    if (!targetFound) {
      console.log('⚠ ChatGPT/Claude not found, using first automation');
      targetElement = automationCards.first();
    }

    // Find View Details button within the automation card
    const viewDetailsButton = targetElement.locator('button:has-text("View Details"), button:has-text("Details")').first();

    if (!await viewDetailsButton.isVisible({ timeout: 5000 })) {
      // Try finding View Details button in parent/sibling context
      const viewDetailsButtonGlobal = page.locator('button:has-text("View Details")').first();
      await viewDetailsButtonGlobal.click();
      console.log('✓ Clicked View Details button (global)');
    } else {
      await viewDetailsButton.click();
      console.log('✓ Clicked View Details button');
    }

    // Step 8: Wait for modal to open
    console.log('Step 8: Waiting for automation details modal...');

    const modal = page.locator('[role="dialog"], [data-testid*="modal"], .modal').first();
    await modal.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✓ Details modal opened');

    await page.waitForTimeout(2000);

    // Step 9: Navigate to Permissions tab
    console.log('Step 9: Looking for Permissions tab...');

    const permissionsTab = page.locator('button:has-text("Permissions"), [role="tab"]:has-text("Permissions")').first();

    if (await permissionsTab.isVisible({ timeout: 5000 })) {
      await permissionsTab.click();
      console.log('✓ Clicked Permissions tab');
      await page.waitForTimeout(1500);
    } else {
      console.log('⚠ Permissions tab not found, assuming already on permissions view');
    }

    // Step 10: CRITICAL - Take screenshot of permissions section
    console.log('Step 10: Capturing permissions section screenshot...');

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07-permissions-section.png`,
      fullPage: true
    });
    console.log('✓ Screenshot saved: 07-permissions-section.png');

    // Also take a focused screenshot of just the modal
    const modalElement = await modal.boundingBox();
    if (modalElement) {
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/08-permissions-modal-focused.png`,
        clip: modalElement
      });
      console.log('✓ Screenshot saved: 08-permissions-modal-focused.png');
    }

    // Step 11: Extract permission text from the page
    console.log('Step 11: Extracting permission text...');

    const permissionElements = page.locator('text=/permission|scope|access/i');
    const permissionCount = await permissionElements.count();

    const permissionTexts: string[] = [];
    for (let i = 0; i < Math.min(permissionCount, 20); i++) {
      const text = await permissionElements.nth(i).textContent();
      if (text) {
        permissionTexts.push(text.trim());
      }
    }

    console.log(`Found ${permissionTexts.length} permission-related text elements`);

    // Step 12: Check for enrichment vs fallback values
    console.log('Step 12: Checking for enrichment...');

    const pageText = await modal.textContent();

    const enrichmentChecks = {
      hasUnknownPermission: pageText?.includes('Unknown Permission') || false,
      hasUnknownService: pageText?.includes('Unknown Service') || false,
      hasUnknownAccess: pageText?.includes('Unknown Access') || false,
      hasRealPermissions: (
        pageText?.includes('Drive Access') ||
        pageText?.includes('Email Address') ||
        pageText?.includes('Profile Information') ||
        pageText?.includes('Read-Only') ||
        false
      )
    };

    console.log('\n--- Enrichment Status ---');
    console.log(`Unknown Permission found: ${enrichmentChecks.hasUnknownPermission ? '❌ YES' : '✅ NO'}`);
    console.log(`Unknown Service found: ${enrichmentChecks.hasUnknownService ? '❌ YES' : '✅ NO'}`);
    console.log(`Unknown Access found: ${enrichmentChecks.hasUnknownAccess ? '❌ YES' : '✅ NO'}`);
    console.log(`Real permission names found: ${enrichmentChecks.hasRealPermissions ? '✅ YES' : '❌ NO'}`);

    // Step 13: Analyze network requests
    console.log('\nStep 13: Analyzing network requests...');

    const discoveryRequests = networkRequests.filter(req =>
      req.url.includes('/api/discovery') || req.url.includes('/api/automations')
    );

    console.log(`Found ${discoveryRequests.length} discovery/automation API calls`);

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      testName: 'OAuth Scope Enrichment Verification',
      enrichmentChecks,
      permissionTexts,
      networkRequests: discoveryRequests,
      consoleErrors,
      consoleMessages: consoleMessages.filter(msg =>
        msg.includes('scope') ||
        msg.includes('permission') ||
        msg.includes('enrichment')
      )
    };

    fs.writeFileSync(
      `${SCREENSHOT_DIR}/enrichment-report.json`,
      JSON.stringify(report, null, 2)
    );
    console.log('✓ Enrichment report saved: enrichment-report.json');

    // Assertions
    console.log('\n=== VERIFICATION RESULTS ===\n');

    // ✅ Modal opened
    expect(await modal.isVisible()).toBe(true);
    console.log('✅ Automation details modal opened successfully');

    // ✅ No "Unknown" fallback values (enrichment is working)
    expect(enrichmentChecks.hasUnknownPermission).toBe(false);
    console.log(`${!enrichmentChecks.hasUnknownPermission ? '✅' : '❌'} No "Unknown Permission" fallback values`);

    expect(enrichmentChecks.hasUnknownService).toBe(false);
    console.log(`${!enrichmentChecks.hasUnknownService ? '✅' : '❌'} No "Unknown Service" fallback values`);

    expect(enrichmentChecks.hasUnknownAccess).toBe(false);
    console.log(`${!enrichmentChecks.hasUnknownAccess ? '✅' : '❌'} No "Unknown Access" fallback values`);

    // ✅ Real permission names are displayed
    expect(enrichmentChecks.hasRealPermissions).toBe(true);
    console.log(`${enrichmentChecks.hasRealPermissions ? '✅' : '❌'} Real permission names displayed`);

    // ✅ No critical errors
    const hasCriticalErrors = consoleErrors.some(err =>
      err.toLowerCase().includes('failed') ||
      err.toLowerCase().includes('error fetching')
    );
    expect(hasCriticalErrors).toBe(false);
    console.log(`${!hasCriticalErrors ? '✅' : '❌'} No critical console errors`);

    console.log('\n=== TEST COMPLETE ===\n');
    console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);
    console.log('Review screenshots and enrichment-report.json for detailed results\n');

    console.log('\n=== ENRICHMENT SUMMARY ===');
    if (!enrichmentChecks.hasUnknownPermission &&
        !enrichmentChecks.hasUnknownService &&
        !enrichmentChecks.hasUnknownAccess &&
        enrichmentChecks.hasRealPermissions) {
      console.log('✅ ✅ ✅ ENRICHMENT IS WORKING! OAuth scopes show proper metadata.');
    } else {
      console.log('❌ ❌ ❌ ENRICHMENT NOT WORKING. Showing "Unknown" fallback values.');
    }
  });
});
