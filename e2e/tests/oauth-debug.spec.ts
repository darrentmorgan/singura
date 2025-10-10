import { test, expect } from '@playwright/test';

test.describe('OAuth Scope Enrichment Debug', () => {
  test('should capture API responses and UI state', async ({ page }) => {
    console.log('\n🔍 Starting OAuth scope enrichment test...\n');

    // Capture all API responses
    const apiResponses: any[] = [];

    page.on('response', async (response) => {
      if (response.url().includes('/api/automations')) {
        try {
          const data = await response.json();
          apiResponses.push({
            url: response.url(),
            status: response.status(),
            data: data
          });
          console.log(`\n📡 API Response from ${response.url()}`);
          console.log(JSON.stringify(data, null, 2));
        } catch (e) {
          // Ignore non-JSON responses
        }
      }
    });

    // Navigate to the frontend
    console.log('🌐 Navigating to http://localhost:4200...');
    await page.goto('http://localhost:4200');

    // Wait for page to load
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Take screenshot of initial state
    await page.screenshot({ path: '/tmp/oauth-test-home.png', fullPage: true });
    console.log('📸 Screenshot saved: /tmp/oauth-test-home.png');

    // Try to navigate to automations page
    console.log('\n🔄 Looking for automations navigation...');

    // Look for any automation-related links
    const automationsLink = page.locator('a[href*="automation"], button:has-text("Automation")').first();

    if (await automationsLink.count() > 0) {
      console.log('✅ Found automations link, clicking...');
      await automationsLink.click();
      await page.waitForLoadState('networkidle', { timeout: 10000 });
    } else {
      console.log('⚠️  No automations link found, trying direct navigation...');
      await page.goto('http://localhost:4200/automations');
      await page.waitForLoadState('networkidle', { timeout: 10000 });
    }

    // Wait a bit for API calls to complete
    await page.waitForTimeout(2000);

    // Take screenshot of automations page
    await page.screenshot({ path: '/tmp/oauth-test-automations.png', fullPage: true });
    console.log('📸 Screenshot saved: /tmp/oauth-test-automations.png');

    // Log all API responses
    console.log('\n\n📊 === ALL API RESPONSES ===');
    console.log(JSON.stringify(apiResponses, null, 2));

    // Try to find automation cards
    const automationCards = page.locator('[class*="automation"]');
    const cardCount = await automationCards.count();
    console.log(`\n🎴 Found ${cardCount} automation-related elements`);

    // Look for risk level badges
    const riskBadges = page.locator('[class*="risk"], [class*="badge"]');
    const badgeCount = await riskBadges.count();
    console.log(`🏷️  Found ${badgeCount} risk/badge elements`);

    if (badgeCount > 0) {
      for (let i = 0; i < Math.min(badgeCount, 5); i++) {
        const text = await riskBadges.nth(i).textContent();
        console.log(`  Badge ${i + 1}: "${text}"`);
      }
    }

    // Check console errors
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleMessages.push(msg.text());
      }
    });

    if (consoleMessages.length > 0) {
      console.log('\n❌ Console Errors:');
      consoleMessages.forEach(msg => console.log(`  - ${msg}`));
    }

    console.log('\n✅ Test completed!\n');
  });
});
