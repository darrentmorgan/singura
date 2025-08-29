/**
 * Authentication Fixtures for Playwright Tests
 * Provides reusable authentication helpers for E2E tests
 */

import { test as base, Page, BrowserContext } from '@playwright/test';
import path from 'path';

// Extend the base test with authentication fixtures
export const test = base.extend<{
  authenticatedPage: Page;
  unauthenticatedPage: Page;
  adminUser: { email: string; password: string };
  testUser: { email: string; password: string };
}>({
  // Admin user credentials
  adminUser: [
    {
      email: 'admin@example.com',
      password: 'SecurePass123!',
    },
    { option: true },
  ],

  // Regular test user credentials
  testUser: [
    {
      email: 'user@example.com',
      password: 'TestPass123!',
    },
    { option: true },
  ],

  // Authenticated page - uses pre-saved auth state
  authenticatedPage: async ({ browser }, use) => {
    const authStatePath = path.join(__dirname, '../../test-results/auth-state.json');
    
    let context: BrowserContext;
    try {
      // Try to use saved auth state
      context = await browser.newContext({
        storageState: authStatePath,
      });
    } catch (error) {
      console.warn('Could not load auth state, creating new authenticated context');
      
      // Create new context and authenticate
      context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'admin@example.com');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-button"]');
      
      // Wait for authentication to complete
      await page.waitForURL('/dashboard', { timeout: 10000 });
    }

    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  // Unauthenticated page - clean slate
  unauthenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await use(page);
    await context.close();
  },
});

// Authentication helper functions
export class AuthHelper {
  constructor(private page: Page) {}

  async login(email: string, password: string) {
    await this.page.goto('/login');
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.click('[data-testid="login-button"]');
    
    // Wait for successful login
    await this.page.waitForURL('/dashboard', { timeout: 10000 });
  }

  async logout() {
    // Click user menu
    await this.page.click('[data-testid="user-menu"]');
    
    // Click logout button
    await this.page.click('[data-testid="logout-button"]');
    
    // Wait for redirect to login page
    await this.page.waitForURL('/login', { timeout: 5000 });
  }

  async expectAuthenticated() {
    // Should be able to access dashboard
    await this.page.goto('/dashboard');
    await this.page.waitForSelector('[data-testid="dashboard-content"]', { timeout: 5000 });
  }

  async expectUnauthenticated() {
    // Should be redirected to login when accessing protected routes
    await this.page.goto('/dashboard');
    await this.page.waitForURL('/login', { timeout: 5000 });
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      await this.page.goto('/dashboard');
      await this.page.waitForSelector('[data-testid="dashboard-content"]', { timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  async getAuthToken(): Promise<string | null> {
    // Get auth token from localStorage
    return await this.page.evaluate(() => {
      return localStorage.getItem('auth-token');
    });
  }

  async setAuthToken(token: string) {
    await this.page.evaluate((token) => {
      localStorage.setItem('auth-token', token);
    }, token);
  }

  async clearAuthToken() {
    await this.page.evaluate(() => {
      localStorage.removeItem('auth-token');
      localStorage.removeItem('refresh-token');
      localStorage.removeItem('user');
    });
  }
}

export { expect } from '@playwright/test';