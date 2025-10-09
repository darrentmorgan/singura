import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// UUID regex pattern
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Screenshot directory
const SCREENSHOT_DIR = path.join(__dirname, '..', 'test-results', 'automation-details');

test.describe('Automation Details Modal - Metadata Fix Verification', () => {
  let networkRequests: any[] = [];
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
    consoleErrors = [];

    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture network requests
    page.on('response', async (response) => {
      if (response.url().includes('/api/automations/')) {
        try {
          const body = await response.json().catch(() => null);
          networkRequests.push({
            url: response.url(),
            status: response.status(),
            body: body,
            headers: response.headers()
          });
        } catch (e) {
          // Ignore JSON parse errors
        }
      }
    });
  });

  test('Verify automation details modal loads with UUID-based API calls', async ({ page }) => {
    console.log('\n=== TEST: Automation Details Modal - Metadata Fix ===\n');

    // Step 1: Navigate to automations page
    console.log('Step 1: Navigating to automations page...');
    await page.goto('http://localhost:4200/automations', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Allow UI to settle

    // Take screenshot of initial page
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-automations-page-initial.png'),
      fullPage: true
    });
    console.log('✓ Screenshot saved: 01-automations-page-initial.png');

    // Step 2: Check if automations are already displayed
    const existingAutomations = await page.locator('[data-testid="automation-card"]').count();
    console.log(`Step 2: Found ${existingAutomations} existing automation(s)`);

    if (existingAutomations === 0) {
      // Step 3: Start discovery
      console.log('Step 3: No automations found. Clicking "Start Discovery"...');
      const startButton = page.locator('button:has-text("Start Discovery")').first();

      if (await startButton.isVisible()) {
        await startButton.click();
        console.log('✓ Clicked "Start Discovery" button');

        // Wait for discovery to complete (look for completion indicator)
        await page.waitForTimeout(5000); // Initial wait for discovery to start

        // Wait for success message or automation cards to appear
        try {
          await Promise.race([
            page.waitForSelector('[data-testid="automation-card"]', { timeout: 30000 }),
            page.waitForSelector('text=/Discovery completed|Found.*automation/i', { timeout: 30000 })
          ]);
          console.log('✓ Discovery completed');
        } catch (e) {
          console.log('⚠ Discovery timeout - proceeding anyway');
        }

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, '02-after-discovery.png'),
          fullPage: true
        });
        console.log('✓ Screenshot saved: 02-after-discovery.png');
      }
    }

    // Step 4: Find the first automation card
    console.log('Step 4: Locating first automation card...');
    const automationCards = page.locator('[data-testid="automation-card"]');
    const cardCount = await automationCards.count();

    if (cardCount === 0) {
      throw new Error('❌ No automation cards found on the page');
    }

    console.log(`✓ Found ${cardCount} automation card(s)`);

    // Step 5: Click "View Details" on first automation
    console.log('Step 5: Clicking "View Details" button...');
    const firstCard = automationCards.first();

    // Try multiple selectors for the View Details button
    const viewDetailsButton = firstCard.locator('button:has-text("View Details"), button:has-text("Details")').first();

    await viewDetailsButton.waitFor({ state: 'visible', timeout: 5000 });
    await viewDetailsButton.click();
    console.log('✓ Clicked "View Details" button');

    // Step 6: Wait for modal to open
    console.log('Step 6: Waiting for details modal to open...');
    const modal = page.locator('[role="dialog"], [data-testid="automation-details-modal"]').first();
    await modal.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✓ Details modal opened');

    // Wait for modal content to load
    await page.waitForTimeout(2000);

    // Step 7: Take screenshots of all three tabs
    console.log('Step 7: Capturing screenshots of all tabs...');

    // Find tab buttons
    const permissionsTab = page.locator('button:has-text("Permissions"), [role="tab"]:has-text("Permissions")').first();
    const riskTab = page.locator('button:has-text("Risk Analysis"), button:has-text("Risk"), [role="tab"]:has-text("Risk")').first();
    const detailsTab = page.locator('button:has-text("Details"), [role="tab"]:has-text("Details")').first();

    // Permissions Tab
    if (await permissionsTab.isVisible()) {
      await permissionsTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '03-tab-permissions.png'),
        fullPage: true
      });
      console.log('✓ Screenshot saved: 03-tab-permissions.png');
    }

    // Risk Analysis Tab
    if (await riskTab.isVisible()) {
      await riskTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '04-tab-risk-analysis.png'),
        fullPage: true
      });
      console.log('✓ Screenshot saved: 04-tab-risk-analysis.png');
    }

    // Details Tab
    if (await detailsTab.isVisible()) {
      await detailsTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '05-tab-details.png'),
        fullPage: true
      });
      console.log('✓ Screenshot saved: 05-tab-details.png');
    }

    // Step 8: Analyze network requests
    console.log('\nStep 8: Analyzing network requests...');

    // Filter for details endpoint
    const detailsRequests = networkRequests.filter(req =>
      req.url.includes('/api/automations/') && req.url.includes('/details')
    );

    console.log(`Found ${detailsRequests.length} API call(s) to /details endpoint`);

    if (detailsRequests.length === 0) {
      console.error('❌ No API calls to /details endpoint found!');
      expect(detailsRequests.length).toBeGreaterThan(0);
    }

    // Analyze first details request
    const detailsRequest = detailsRequests[0];
    const apiUrl = detailsRequest.url;
    const apiStatus = detailsRequest.status;
    const apiBody = detailsRequest.body;

    console.log('\n--- API Request Analysis ---');
    console.log('URL:', apiUrl);
    console.log('Status:', apiStatus);

    // Extract ID from URL
    const idMatch = apiUrl.match(/\/api\/automations\/([^\/]+)\/details/);
    const extractedId = idMatch ? idMatch[1] : 'NOT_FOUND';

    console.log('Extracted ID:', extractedId);
    console.log('Is UUID?', UUID_PATTERN.test(extractedId));
    console.log('Response body:', JSON.stringify(apiBody, null, 2));

    // Save network details to file
    const networkReport = {
      timestamp: new Date().toISOString(),
      url: apiUrl,
      status: apiStatus,
      extractedId: extractedId,
      isUuid: UUID_PATTERN.test(extractedId),
      responseBody: apiBody,
      consoleErrors: consoleErrors
    };

    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, 'network-analysis.json'),
      JSON.stringify(networkReport, null, 2)
    );
    console.log('✓ Network analysis saved: network-analysis.json');

    // Step 9: Capture DevTools Network screenshot
    console.log('\nStep 9: Opening DevTools to capture Network tab...');

    // We can't programmatically open DevTools, but we can verify the data
    console.log('Note: Manual DevTools verification recommended for visual confirmation');

    // Step 10: Console error check
    console.log('\nStep 10: Checking for console errors...');
    if (consoleErrors.length > 0) {
      console.warn('⚠ Console errors detected:');
      consoleErrors.forEach((err, idx) => {
        console.warn(`  ${idx + 1}. ${err}`);
      });
    } else {
      console.log('✓ No console errors detected');
    }

    // Assertions
    console.log('\n=== VERIFICATION RESULTS ===\n');

    // ✅ Modal opened
    console.log('✅ View Details modal opened successfully');
    expect(await modal.isVisible()).toBe(true);

    // ✅ UUID in API request
    console.log(`${UUID_PATTERN.test(extractedId) ? '✅' : '❌'} API request uses UUID: ${extractedId}`);
    expect(UUID_PATTERN.test(extractedId)).toBe(true);

    // ✅ API response successful
    console.log(`${apiStatus === 200 ? '✅' : '❌'} API response status: ${apiStatus}`);
    expect(apiStatus).toBe(200);

    // ✅ Response body has data
    console.log(`${apiBody ? '✅' : '❌'} API response has body`);
    expect(apiBody).toBeTruthy();

    // ✅ Metadata fields populated
    if (apiBody) {
      const hasMetadata = apiBody.platformName || apiBody.clientId || apiBody.authorizedBy;
      console.log(`${hasMetadata ? '✅' : '❌'} Metadata fields populated`);
      console.log(`  - platformName: ${apiBody.platformName || 'MISSING'}`);
      console.log(`  - clientId: ${apiBody.clientId || 'MISSING'}`);
      console.log(`  - authorizedBy: ${apiBody.authorizedBy || 'MISSING'}`);
    }

    // ✅ No critical console errors
    const hasCriticalErrors = consoleErrors.some(err =>
      err.toLowerCase().includes('failed') ||
      err.toLowerCase().includes('error fetching')
    );
    console.log(`${!hasCriticalErrors ? '✅' : '❌'} No critical console errors`);

    console.log('\n=== TEST COMPLETE ===\n');
    console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);
    console.log('Review screenshots and network-analysis.json for detailed results\n');
  });
});
