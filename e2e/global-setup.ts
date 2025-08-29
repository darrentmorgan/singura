/**
 * Global Setup for Playwright Tests
 * Prepares the testing environment before running any tests
 */

import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs/promises';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for Playwright tests...');

  // Create necessary directories
  const directories = [
    'test-results',
    'playwright-report',
    'e2e/data/screenshots',
    'e2e/data/downloads',
  ];

  for (const dir of directories) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      console.warn(`Directory ${dir} already exists or could not be created`);
    }
  }

  // Set up authentication state for tests
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to login page
    const baseURL = config.projects[0].use?.baseURL || 'http://localhost:3000';
    await page.goto(`${baseURL}/login`);
    
    // Perform login to create authenticated state
    await page.fill('[data-testid="email-input"]', 'admin@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePass123!');
    await page.click('[data-testid="login-button"]');
    
    // Wait for successful login (dashboard should load)
    await page.waitForURL(`${baseURL}/dashboard`, { timeout: 10000 });
    
    // Save authenticated state
    await context.storageState({ 
      path: path.join(__dirname, '../test-results/auth-state.json') 
    });
    
    console.log('✅ Authentication state saved successfully');
    
  } catch (error) {
    console.warn('⚠️  Could not create authenticated state:', error);
    // Continue with tests - some tests may need to handle unauthenticated state
  }

  await context.close();
  await browser.close();

  // Set up test environment variables
  process.env.PLAYWRIGHT_TEST_BASE_URL = config.projects[0].use?.baseURL || 'http://localhost:3000';
  process.env.PLAYWRIGHT_TEST_API_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

  console.log('✅ Global setup completed');
}

export default globalSetup;