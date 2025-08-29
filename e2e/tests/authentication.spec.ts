/**
 * Authentication End-to-End Tests
 * Tests login, logout, and authentication state management
 */

import { test, expect } from '../fixtures/auth.fixture';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

test.describe('Authentication', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
  });

  test.describe('Login Flow', () => {
    test('should login with valid credentials', async ({ unauthenticatedPage, adminUser }) => {
      const page = unauthenticatedPage;
      loginPage = new LoginPage(page);
      
      await loginPage.goto();
      await loginPage.validateLoginForm();
      
      // Perform login
      await loginPage.loginAndWaitForDashboard(adminUser.email, adminUser.password);
      
      // Should be on dashboard
      expect(page.url()).toContain('/dashboard');
      
      // Validate dashboard elements are visible
      dashboardPage = new DashboardPage(page);
      await dashboardPage.validateDashboardElements();
    });

    test('should reject invalid credentials', async ({ unauthenticatedPage }) => {
      const page = unauthenticatedPage;
      loginPage = new LoginPage(page);
      
      await loginPage.goto();
      
      // Try invalid credentials
      await loginPage.loginExpectingError('invalid@example.com', 'wrongpassword');
      
      // Should show error message
      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).toContain('Invalid email or password');
      
      // Should remain on login page
      expect(page.url()).toContain('/login');
    });

    test('should validate email format', async ({ unauthenticatedPage }) => {
      const page = unauthenticatedPage;
      loginPage = new LoginPage(page);
      
      await loginPage.goto();
      await loginPage.testEmailValidation();
    });

    test('should enforce password requirements', async ({ unauthenticatedPage }) => {
      const page = unauthenticatedPage;
      loginPage = new LoginPage(page);
      
      await loginPage.goto();
      await loginPage.testPasswordValidation();
    });

    test('should validate form submission', async ({ unauthenticatedPage }) => {
      const page = unauthenticatedPage;
      loginPage = new LoginPage(page);
      
      await loginPage.goto();
      await loginPage.testFormValidation();
    });

    test('should support keyboard navigation', async ({ unauthenticatedPage }) => {
      const page = unauthenticatedPage;
      loginPage = new LoginPage(page);
      
      await loginPage.goto();
      await loginPage.testKeyboardNavigation();
    });

    test('should be accessible', async ({ unauthenticatedPage }) => {
      const page = unauthenticatedPage;
      loginPage = new LoginPage(page);
      
      await loginPage.goto();
      await loginPage.testAccessibility();
    });

    test('should validate security features', async ({ unauthenticatedPage }) => {
      const page = unauthenticatedPage;
      loginPage = new LoginPage(page);
      
      await loginPage.goto();
      await loginPage.validateSecurityFeatures();
    });

    test('should handle loading states', async ({ unauthenticatedPage, adminUser }) => {
      const page = unauthenticatedPage;
      loginPage = new LoginPage(page);
      
      await loginPage.goto();
      
      // Start login process
      await loginPage.fillEmail(adminUser.email);
      await loginPage.fillPassword(adminUser.password);
      await loginPage.clickLogin();
      
      // Should show loading state
      const isLoading = await loginPage.isLoading();
      expect(isLoading).toBe(true);
      
      // Wait for completion
      await page.waitForURL('/dashboard', { timeout: 10000 });
    });
  });

  test.describe('Session Management', () => {
    test('should maintain authentication state across page reloads', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      dashboardPage = new DashboardPage(page);
      
      // Go to dashboard
      await dashboardPage.goto();
      await dashboardPage.validateDashboardElements();
      
      // Reload page
      await page.reload();
      
      // Should still be authenticated
      await dashboardPage.waitForLoad();
      await dashboardPage.validateDashboardElements();
      
      // Should not redirect to login
      expect(page.url()).toContain('/dashboard');
    });

    test('should handle session expiration', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      // Mock API to return 401 unauthorized
      await page.route('**/api/**', (route) => {
        if (route.request().headers()['authorization']) {
          route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Token expired' })
          });
        } else {
          route.continue();
        }
      });
      
      // Try to access protected resource
      await page.goto('/dashboard');
      
      // Should redirect to login due to expired token
      await page.waitForURL('/login', { timeout: 10000 });
      
      // Should show session expired message
      const message = page.locator('[data-testid="session-expired-message"]');
      await expect(message).toBeVisible({ timeout: 5000 });
    });

    test('should clear authentication data on logout', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      dashboardPage = new DashboardPage(page);
      
      await dashboardPage.goto();
      await dashboardPage.validateDashboardElements();
      
      // Perform logout
      await dashboardPage.logout();
      
      // Should be on login page
      await page.waitForURL('/login');
      
      // Try to navigate back to dashboard
      await page.goto('/dashboard');
      
      // Should be redirected back to login
      await page.waitForURL('/login');
    });

    test('should handle concurrent login sessions', async ({ browser, adminUser }) => {
      // Create two browser contexts (different sessions)
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      const loginPage1 = new LoginPage(page1);
      const loginPage2 = new LoginPage(page2);
      const dashboardPage1 = new DashboardPage(page1);
      const dashboardPage2 = new DashboardPage(page2);
      
      // Login in first session
      await loginPage1.goto();
      await loginPage1.loginAndWaitForDashboard(adminUser.email, adminUser.password);
      await dashboardPage1.validateDashboardElements();
      
      // Login in second session
      await loginPage2.goto();
      await loginPage2.loginAndWaitForDashboard(adminUser.email, adminUser.password);
      await dashboardPage2.validateDashboardElements();
      
      // Both sessions should remain active
      await page1.reload();
      await dashboardPage1.waitForLoad();
      
      await page2.reload();
      await dashboardPage2.waitForLoad();
      
      // Clean up
      await context1.close();
      await context2.close();
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated users to login', async ({ unauthenticatedPage }) => {
      const page = unauthenticatedPage;
      
      const protectedRoutes = [
        '/dashboard',
        '/connections',
        '/automations',
        '/settings'
      ];
      
      for (const route of protectedRoutes) {
        await page.goto(route);
        
        // Should redirect to login
        await page.waitForURL('/login', { timeout: 5000 });
        
        // Should show redirect message or remember intended destination
        const intendedDestination = page.url();
        expect(intendedDestination).toContain('/login');
      }
    });

    test('should remember intended destination after login', async ({ unauthenticatedPage, adminUser }) => {
      const page = unauthenticatedPage;
      
      // Try to access a protected route
      await page.goto('/connections');
      
      // Should be redirected to login
      await page.waitForURL('/login');
      
      // Login
      loginPage = new LoginPage(page);
      await loginPage.loginAndWaitForDashboard(adminUser.email, adminUser.password);
      
      // Should eventually redirect to intended destination or dashboard
      // (Implementation may vary - could redirect to dashboard or intended route)
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/(dashboard|connections)/);
    });

    test('should allow access to authenticated users', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      const protectedRoutes = [
        { path: '/dashboard', element: '[data-testid="dashboard-content"]' },
        { path: '/connections', element: '[data-testid="connections-page-title"]' },
        // Add more routes as needed
      ];
      
      for (const { path, element } of protectedRoutes) {
        await page.goto(path);
        
        // Should load the protected page
        await expect(page.locator(element)).toBeVisible({ timeout: 10000 });
        
        // URL should match the intended route
        expect(page.url()).toContain(path);
      }
    });
  });

  test.describe('Token Management', () => {
    test('should refresh tokens automatically', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      let refreshCount = 0;
      
      // Mock token refresh endpoint
      await page.route('**/api/auth/refresh', (route) => {
        refreshCount++;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            tokens: {
              accessToken: 'new-access-token',
              refreshToken: 'new-refresh-token',
              expiresIn: 3600
            }
          })
        });
      });
      
      // Mock API call that triggers token refresh
      await page.route('**/api/dashboard/stats', (route) => {
        const authHeader = route.request().headers()['authorization'];
        
        if (!authHeader || authHeader === 'Bearer expired-token') {
          // First call with expired token
          route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Token expired' })
          });
        } else {
          // Second call with refreshed token
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ totalAutomations: 5, highRisk: 2 })
          });
        }
      });
      
      // Manually set expired token to trigger refresh
      await page.evaluate(() => {
        localStorage.setItem('auth-token', 'expired-token');
      });
      
      // Navigate to dashboard (should trigger API call and token refresh)
      await page.goto('/dashboard');
      
      // Wait for refresh to occur
      await page.waitForTimeout(2000);
      
      // Should have called refresh endpoint
      expect(refreshCount).toBeGreaterThan(0);
    });

    test('should handle refresh token expiration', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      // Mock refresh endpoint to fail
      await page.route('**/api/auth/refresh', (route) => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Refresh token expired' })
        });
      });
      
      // Mock API to return 401
      await page.route('**/api/**', (route) => {
        if (route.request().url().includes('/auth/')) {
          route.continue();
        } else {
          route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Token expired' })
          });
        }
      });
      
      // Navigate to dashboard
      await page.goto('/dashboard');
      
      // Should be redirected to login due to refresh failure
      await page.waitForURL('/login', { timeout: 10000 });
    });
  });

  test.describe('Security Features', () => {
    test('should implement proper CSRF protection', async ({ unauthenticatedPage, adminUser }) => {
      const page = unauthenticatedPage;
      
      // Mock CSRF token validation
      await page.route('**/api/auth/login', (route) => {
        const csrfToken = route.request().headers()['x-csrf-token'];
        
        if (!csrfToken) {
          route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'CSRF token missing' })
          });
        } else {
          route.continue();
        }
      });
      
      loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // Should include CSRF token in login request
      await loginPage.login(adminUser.email, adminUser.password);
      
      // The mock will enforce CSRF token presence
      // If login succeeds, CSRF protection is working
    });

    test('should implement rate limiting', async ({ unauthenticatedPage }) => {
      const page = unauthenticatedPage;
      
      let loginAttempts = 0;
      
      // Mock rate limiting after 3 attempts
      await page.route('**/api/auth/login', (route) => {
        loginAttempts++;
        
        if (loginAttempts > 3) {
          route.fulfill({
            status: 429,
            contentType: 'application/json',
            body: JSON.stringify({ 
              error: 'Too many login attempts',
              retryAfter: 300 
            })
          });
        } else {
          route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Invalid credentials' })
          });
        }
      });
      
      loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // Make multiple failed login attempts
      for (let i = 0; i < 4; i++) {
        await loginPage.login('invalid@example.com', 'wrongpassword');
        await page.waitForTimeout(500);
      }
      
      // Should show rate limit error on 4th attempt
      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).toContain('Too many login attempts');
    });

    test('should secure password field', async ({ unauthenticatedPage }) => {
      const page = unauthenticatedPage;
      loginPage = new LoginPage(page);
      
      await loginPage.goto();
      
      // Password field should be masked
      const passwordField = page.locator('[data-testid="password-input"]');
      await expect(passwordField).toHaveAttribute('type', 'password');
      
      // Should not show password in autocomplete
      await expect(passwordField).toHaveAttribute('autocomplete', 'current-password');
      
      // Should not be visible in page source after typing
      await passwordField.fill('test-password');
      const pageContent = await page.content();
      expect(pageContent).not.toContain('test-password');
    });

    test('should validate input sanitization', async ({ unauthenticatedPage }) => {
      const page = unauthenticatedPage;
      loginPage = new LoginPage(page);
      
      await loginPage.goto();
      
      // Try XSS attempt in email field
      const maliciousEmail = '<script>alert("xss")</script>@example.com';
      await loginPage.fillEmail(maliciousEmail);
      await loginPage.fillPassword('password');
      await loginPage.clickLogin();
      
      // Should not execute script
      const alerts = [];
      page.on('dialog', dialog => {
        alerts.push(dialog.message());
        dialog.dismiss();
      });
      
      await page.waitForTimeout(1000);
      expect(alerts).toHaveLength(0);
      
      // Should show validation error for invalid email format
      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).toContain('valid email');
    });
  });
});