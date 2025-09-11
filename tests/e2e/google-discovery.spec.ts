/**
 * Google Discovery End-to-End Tests
 * Comprehensive Playwright testing for Google Workspace automation discovery
 * Automatically tests discovery functionality and identifies UI issues
 */

import { test, expect } from '@playwright/test';

// Test configuration
const APP_URL = 'http://localhost:4200';
const API_URL = 'http://localhost:4201/api';
const TEST_CREDENTIALS = {
  email: 'admin@example.com',
  password: 'SecurePass123!'
};

test.describe('Google Discovery System Testing', () => {
  
  test.beforeEach(async ({ page }) => {
    // Enable verbose logging for debugging
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warn') {
        console.log(`[FRONTEND ${msg.type().toUpperCase()}]:`, msg.text());
      }
    });
    
    // Monitor network requests
    page.on('request', request => {
      if (request.url().includes('/discover')) {
        console.log(`[REQUEST]: ${request.method()} ${request.url()}`);
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/discover')) {
        console.log(`[RESPONSE]: ${response.status()} ${response.url()}`);
      }
    });
  });

  test('1. Google Discovery API Endpoint Validation', async ({ page }) => {
    console.log('🧪 Testing Google discovery API endpoint directly...');
    
    // Test Google discovery API directly
    const response = await page.request.post(`${API_URL}/connections/conn-google-test/discover`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    console.log('API Response:', JSON.stringify(data, null, 2));
    
    // Validate response structure
    expect(data.success).toBe(true);
    expect(data.discovery).toBeDefined();
    expect(data.discovery.automations).toBeDefined();
    expect(Array.isArray(data.discovery.automations)).toBe(true);
    
    // Validate Google-specific scenarios
    expect(data.discovery.automations.length).toBeGreaterThan(0);
    
    // Check for Google automation scenarios
    const automationNames = data.discovery.automations.map((a: any) => a.name);
    expect(automationNames).toContain('ChatGPT Data Processor');
    expect(automationNames).toContain('Claude Document Analyzer');
    expect(automationNames).toContain('AI Integration Service Account');
    
    // Validate risk assessment
    expect(data.discovery.metadata.riskScore).toBeDefined();
    expect(data.discovery.metadata.platform).toBe('google');
    expect(data.discovery.metadata.automationsFound).toBe(data.discovery.automations.length);
    
    console.log('✅ API endpoint validation passed');
  });

  test('2. Complete Google Discovery UI Workflow', async ({ page }) => {
    console.log('🧪 Testing complete UI discovery workflow...');
    
    // Login to application
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    
    console.log('📝 Logging in...');
    await page.fill('input[name="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[name="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of login completion
    await page.screenshot({ path: 'test-results/01-login-complete.png' });
    
    // Navigate to connections page
    console.log('🔗 Navigating to connections...');
    await page.goto(`${APP_URL}/connections`);
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of connections page
    await page.screenshot({ path: 'test-results/02-connections-page.png' });
    
    // Look for Google platform and connect if needed
    const googlePlatform = page.locator('text=Google Workspace');
    await expect(googlePlatform).toBeVisible();
    
    // Check if Google is already connected
    const connectButton = page.locator('button:has-text("Connect")').filter({ has: page.locator('text=Google Workspace') });
    const discoverButton = page.locator('button:has-text("Discover")').filter({ has: page.locator('text=Google Workspace') });
    
    if (await connectButton.isVisible()) {
      console.log('🔗 Connecting to Google Workspace...');
      await connectButton.click();
      await page.waitForLoadState('networkidle');
      // Note: In real testing, this would go through OAuth flow
    }
    
    // Wait for discover button to be available
    await expect(discoverButton).toBeVisible({ timeout: 10000 });
    
    console.log('🔍 Starting Google discovery process...');
    await page.screenshot({ path: 'test-results/03-before-discovery.png' });
    
    // Click discover and monitor progress
    await discoverButton.click();
    
    // Monitor discovery progress
    const discoverySection = page.locator('text=Active Discoveries').locator('..');
    await expect(discoverySection).toBeVisible({ timeout: 5000 });
    
    // Take screenshot of discovery initiation
    await page.screenshot({ path: 'test-results/04-discovery-started.png' });
    
    // Monitor progress changes
    const progressIndicator = page.locator('text=0%').or(page.locator('text=25%')).or(page.locator('text=50%')).or(page.locator('text=100%'));
    
    console.log('⏱️ Monitoring discovery progress...');
    let progressUpdated = false;
    
    // Wait and check for progress updates multiple times
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(1000);
      
      const currentProgress = await page.textContent('.text-blue-600:has-text("%")') || '0%';
      console.log(`Progress check ${i + 1}: ${currentProgress}`);
      
      if (currentProgress !== '0%') {
        progressUpdated = true;
        console.log(`✅ Progress updated to: ${currentProgress}`);
        await page.screenshot({ path: `test-results/05-progress-${i}.png` });
        break;
      }
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'test-results/06-discovery-final.png' });
    
    console.log('📊 Discovery progress updated:', progressUpdated);
    console.log('🧪 UI workflow test completed');
  });

  test('3. Discovery Progress and State Management', async ({ page }) => {
    console.log('🧪 Testing discovery progress and state management...');
    
    // Setup monitoring for state changes
    await page.goto(`${APP_URL}/connections`);
    await page.waitForLoadState('networkidle');
    
    // Login first
    await page.fill('input[name="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[name="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    await page.goto(`${APP_URL}/connections`);
    
    // Monitor network traffic during discovery
    const networkLogs: any[] = [];
    page.on('response', response => {
      if (response.url().includes('/discover')) {
        networkLogs.push({
          url: response.url(),
          status: response.status(),
          headers: response.headers()
        });
      }
    });
    
    // Start discovery and monitor
    const discoverButton = page.locator('button:has-text("Discover")').first();
    if (await discoverButton.isVisible()) {
      await discoverButton.click();
      
      // Wait for discovery to initiate
      await page.waitForTimeout(2000);
      
      // Check for any JavaScript errors
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      // Monitor for 10 seconds and capture state changes
      for (let i = 0; i < 10; i++) {
        await page.waitForTimeout(1000);
        const progressText = await page.textContent('text=Initializing') || '';
        console.log(`State ${i + 1}: ${progressText}`);
      }
      
      console.log('Network logs:', networkLogs);
      console.log('Console errors:', consoleErrors);
    }
  });

  test('4. Google vs Slack Discovery Comparison', async ({ page }) => {
    console.log('🧪 Testing Google vs Slack discovery differences...');
    
    // Test both Slack and Google discovery to compare behavior
    await page.goto(`${APP_URL}/connections`);
    
    // Test Slack discovery (if available)
    const slackDiscoverButton = page.locator('button:has-text("Discover")').filter({ has: page.locator('text=Slack') });
    if (await slackDiscoverButton.isVisible()) {
      console.log('🔍 Testing Slack discovery...');
      await slackDiscoverButton.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'test-results/slack-discovery.png' });
    }
    
    // Test Google discovery
    const googleDiscoverButton = page.locator('button:has-text("Discover")').filter({ has: page.locator('text=Google') });
    if (await googleDiscoverButton.isVisible()) {
      console.log('🔍 Testing Google discovery...');
      await googleDiscoverButton.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'test-results/google-discovery.png' });
    }
    
    // Compare discovery behaviors and document differences
  });

  test('5. Network Request Analysis', async ({ page }) => {
    console.log('🧪 Analyzing network requests during Google discovery...');
    
    await page.goto(`${APP_URL}/connections`);
    
    // Capture detailed network information
    const requests: any[] = [];
    const responses: any[] = [];
    
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        timestamp: new Date().toISOString()
      });
    });
    
    page.on('response', async response => {
      if (response.url().includes('/discover') || response.url().includes('/connections')) {
        try {
          const text = await response.text();
          responses.push({
            url: response.url(),
            status: response.status(),
            headers: response.headers(),
            body: text.substring(0, 500), // First 500 chars
            timestamp: new Date().toISOString()
          });
        } catch (e) {
          responses.push({
            url: response.url(),
            status: response.status(),
            error: 'Could not read response body'
          });
        }
      }
    });
    
    // Trigger discovery and analyze network traffic
    const discoverButton = page.locator('button:has-text("Discover")').first();
    if (await discoverButton.isVisible()) {
      await discoverButton.click();
      await page.waitForTimeout(5000);
      
      console.log('📡 Network Requests:', JSON.stringify(requests, null, 2));
      console.log('📥 Network Responses:', JSON.stringify(responses, null, 2));
    }
  });
});

test.afterAll(async () => {
  console.log('✅ Google discovery testing complete');
  console.log('📂 Screenshots saved to test-results/');
  console.log('📊 Check console logs for detailed analysis');
});