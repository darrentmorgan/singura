import { test, expect } from '@playwright/test';

test.describe('OAuth Scope Enrichment and Risk Level Display', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:4200');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display correct risk levels for automations', async ({ page }) => {
    // Navigate to automations page
    await page.goto('http://localhost:4200/automations');

    // Wait for automations to load
    await page.waitForSelector('[data-testid="automation-card"]', { timeout: 10000 });

    // Capture API response
    const apiResponse = await page.waitForResponse(
      response => response.url().includes('/api/automations') && response.status() === 200
    );

    const automationsData = await apiResponse.json();
    console.log('API Response:', JSON.stringify(automationsData, null, 2));

    // Take screenshot of automations page
    await page.screenshot({ path: '/tmp/automations-page.png', fullPage: true });

    // Find ChatGPT automation
    const chatGPTCard = page.locator('[data-testid="automation-card"]').filter({ hasText: 'ChatGPT' }).first();

    if (await chatGPTCard.count() > 0) {
      // Check risk level badge
      const riskBadge = chatGPTCard.locator('[class*="risk"]');
      const riskText = await riskBadge.textContent();
      console.log('ChatGPT Risk Badge:', riskText);

      // Take screenshot of ChatGPT card
      await chatGPTCard.screenshot({ path: '/tmp/chatgpt-card.png' });
    }
  });

  test('should display enriched OAuth scopes in details modal', async ({ page, context }) => {
    // Navigate to automations page
    await page.goto('http://localhost:4200/automations');
    await page.waitForLoadState('networkidle');

    // Listen for API calls
    const apiCalls: any[] = [];
    page.on('response', async (response) => {
      if (response.url().includes('/api/automations')) {
        const data = await response.json();
        apiCalls.push({
          url: response.url(),
          status: response.status(),
          data: data
        });
      }
    });

    // Find and click "View Details" button
    const viewDetailsButton = page.locator('button:has-text("View Details")').first();

    if (await viewDetailsButton.count() > 0) {
      // Click to open modal
      await viewDetailsButton.click();

      // Wait for modal to appear
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

      // Take screenshot of modal
      await page.screenshot({ path: '/tmp/details-modal.png', fullPage: true });

      // Check for OAuth scopes
      const scopesList = page.locator('[data-testid="oauth-scopes"]');
      if (await scopesList.count() > 0) {
        const scopesText = await scopesList.textContent();
        console.log('OAuth Scopes:', scopesText);
      }
    }

    console.log('All API Calls:', JSON.stringify(apiCalls, null, 2));
  });

  test('should capture network traffic for debugging', async ({ page }) => {
    // Listen to all network requests
    const requests: any[] = [];
    const responses: any[] = [];

    page.on('request', request => {
      if (request.url().includes('/api/')) {
        requests.push({
          method: request.method(),
          url: request.url(),
          headers: request.headers()
        });
      }
    });

    page.on('response', async response => {
      if (response.url().includes('/api/automations')) {
        try {
          const body = await response.json();
          responses.push({
            url: response.url(),
            status: response.status(),
            headers: response.headers(),
            body: body
          });
        } catch (e) {
          console.error('Failed to parse response:', e);
        }
      }
    });

    // Navigate to automations
    await page.goto('http://localhost:4200/automations');
    await page.waitForLoadState('networkidle');

    // Wait a bit for all requests to complete
    await page.waitForTimeout(2000);

    console.log('\n=== NETWORK REQUESTS ===');
    console.log(JSON.stringify(requests, null, 2));

    console.log('\n=== NETWORK RESPONSES ===');
    console.log(JSON.stringify(responses, null, 2));

    // Take final screenshot
    await page.screenshot({ path: '/tmp/final-state.png', fullPage: true });
  });
});
