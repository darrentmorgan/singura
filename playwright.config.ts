/**
 * Playwright Configuration for SaaS X-Ray E2E Testing
 * Comprehensive end-to-end testing setup for OAuth flows and automation discovery
 */

import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Test environment configuration
const isCI = !!process.env.CI;
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const apiURL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

export default defineConfig({
  // Test directory and file patterns
  testDir: './e2e/tests',
  
  // Global test timeout (30 seconds)
  timeout: 30000,
  
  // Timeout for each expect() assertion (5 seconds)
  expect: {
    timeout: 5000,
  },
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: isCI,
  
  // Retry on CI only
  retries: isCI ? 2 : 0,
  
  // Opt out of parallel tests in CI for stability
  workers: isCI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['html', { outputDir: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ...(isCI ? [['github' as const]] : [['list' as const]]),
  ],
  
  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL,
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Record video only when retrying
    video: 'retain-on-failure',
    
    // Take screenshot only when retrying the failed test
    screenshot: 'only-on-failure',
    
    // Browser context options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    // Global test context
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Channel for consistent testing
        channel: 'chrome',
      },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // Mobile viewports for responsive testing
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    // Branded browsers for OAuth testing
    {
      name: 'Microsoft Edge',
      use: { 
        ...devices['Desktop Edge'], 
        channel: 'msedge' 
      },
    },
  ],

  // Global setup and teardown
  globalSetup: require.resolve('./e2e/global-setup'),
  globalTeardown: require.resolve('./e2e/global-teardown'),

  // Test output directory
  outputDir: 'test-results/',
  
  // Web Server configuration - commented out since servers are already running
  // webServer: [
  //   {
  //     command: 'npm run dev:backend',
  //     url: apiURL,
  //     reuseExistingServer: !isCI,
  //     timeout: 120000,
  //     stdout: 'ignore',
  //     stderr: 'pipe',
  //   },
  //   {
  //     command: 'npm run dev:frontend',
  //     url: baseURL,
  //     reuseExistingServer: !isCI,
  //     timeout: 120000,
  //     stdout: 'ignore',
  //     stderr: 'pipe',
  //   },
  // ],

  // Test metadata
  metadata: {
    testType: 'e2e',
    framework: 'playwright',
    application: 'saas-xray',
    environment: process.env.NODE_ENV || 'test',
  },
});