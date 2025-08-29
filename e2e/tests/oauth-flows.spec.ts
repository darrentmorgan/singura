/**
 * OAuth Flows End-to-End Tests
 * Comprehensive testing of OAuth authentication flows for all supported platforms
 */

import { test, expect } from '../fixtures/auth.fixture';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ConnectionsPage } from '../pages/ConnectionsPage';
import { OAuthMockHandler } from '../utils/oauth-mock';

test.describe('OAuth Flows', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let connectionsPage: ConnectionsPage;
  let oauthMock: OAuthMockHandler;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    connectionsPage = new ConnectionsPage(page);
    oauthMock = new OAuthMockHandler(page);
    
    // Set up OAuth mocking
    await oauthMock.setupOAuthMocking();
  });

  test.afterEach(async ({ page }) => {
    // Clean up OAuth mocks
    await oauthMock.clearOAuthMocks();
  });

  test.describe('Slack OAuth Flow', () => {
    test('should complete full Slack OAuth flow successfully', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      connectionsPage = new ConnectionsPage(page);
      
      // Navigate to connections page
      await connectionsPage.goto();
      await connectionsPage.validatePageElements();
      
      // Get initial connection count
      const initialCount = await connectionsPage.getConnectionCount();
      
      // Start Slack OAuth flow
      await connectionsPage.connectToSlack();
      
      // Should redirect to OAuth authorization
      await page.waitForURL(/oauth.*slack/, { timeout: 10000 });
      
      // Mock OAuth provider will automatically redirect back
      await connectionsPage.handleOAuthCallback('slack');
      
      // Verify new connection was created
      const finalCount = await connectionsPage.getConnectionCount();
      expect(finalCount).toBe(initialCount + 1);
      
      // Validate the new Slack connection
      const slackConnection = page.locator('[data-testid="connection-item"][data-platform="slack"]');
      await expect(slackConnection).toBeVisible();
      
      // Check connection status
      const statusBadge = slackConnection.locator('[data-testid="connection-status-badge"]');
      await expect(statusBadge).toContainText('active');
      
      // Verify connection details
      const connectionName = slackConnection.locator('[data-testid="connection-name"]');
      await expect(connectionName).toContainText('Test Team');
      
      // Test the connection
      const connectionId = await slackConnection.getAttribute('data-connection-id');
      if (connectionId) {
        const testStatus = await connectionsPage.testConnection(connectionId);
        expect(testStatus).toBe('healthy');
      }
    });

    test('should handle Slack OAuth errors gracefully', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      connectionsPage = new ConnectionsPage(page);
      
      // Simulate access denied error
      await oauthMock.simulateOAuthError('slack', 'accessDenied');
      
      await connectionsPage.goto();
      await connectionsPage.connectToSlack();
      
      // Should handle error and return to connections page
      await page.waitForURL('/connections', { timeout: 15000 });
      
      // Should show error message
      const errorMessage = page.locator('[data-testid="oauth-error-message"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText('access_denied');
    });

    test('should validate Slack OAuth security parameters', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      connectionsPage = new ConnectionsPage(page);
      
      // Intercept OAuth authorization request
      const authRequest = page.waitForRequest(/slack\.com\/oauth\/v2\/authorize/);
      
      await connectionsPage.goto();
      await connectionsPage.connectToSlack();
      
      const request = await authRequest;
      await oauthMock.verifyOAuthSecurity('slack', request);
    });

    test('should handle Slack token refresh', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      connectionsPage = new ConnectionsPage(page);
      
      // First establish a Slack connection
      await connectionsPage.goto();
      await connectionsPage.connectToSlack();
      await connectionsPage.handleOAuthCallback('slack');
      
      // Get the connection ID
      const slackConnection = page.locator('[data-testid="connection-item"][data-platform="slack"]').first();
      const connectionId = await slackConnection.getAttribute('data-connection-id');
      
      if (connectionId) {
        // Refresh the token
        await connectionsPage.refreshToken(connectionId);
        
        // Verify the connection is still active
        const statusBadge = slackConnection.locator('[data-testid="connection-status-badge"]');
        await expect(statusBadge).toContainText('active');
      }
    });
  });

  test.describe('Google OAuth Flow', () => {
    test('should complete full Google OAuth flow successfully', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      connectionsPage = new ConnectionsPage(page);
      
      await connectionsPage.goto();
      
      const initialCount = await connectionsPage.getConnectionCount();
      
      // Start Google OAuth flow
      await connectionsPage.connectToGoogle();
      
      // Should redirect to Google OAuth
      await page.waitForURL(/accounts\.google\.com/, { timeout: 10000 });
      
      // Handle OAuth callback
      await connectionsPage.handleOAuthCallback('google');
      
      // Verify new connection
      const finalCount = await connectionsPage.getConnectionCount();
      expect(finalCount).toBe(initialCount + 1);
      
      const googleConnection = page.locator('[data-testid="connection-item"][data-platform="google"]');
      await expect(googleConnection).toBeVisible();
      
      const statusBadge = googleConnection.locator('[data-testid="connection-status-badge"]');
      await expect(statusBadge).toContainText('active');
    });

    test('should handle Google OAuth token expiration', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      connectionsPage = new ConnectionsPage(page);
      
      // Set up token refresh mock
      await page.route('**/oauth2.googleapis.com/token', (route) => {
        if (route.request().postData()?.includes('refresh_token')) {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              access_token: 'ya29.new-refreshed-token',
              expires_in: 3600,
              token_type: 'Bearer'
            })
          });
        } else {
          route.continue();
        }
      });
      
      // Establish connection and test refresh
      await connectionsPage.goto();
      await connectionsPage.connectToGoogle();
      await connectionsPage.handleOAuthCallback('google');
      
      const googleConnection = page.locator('[data-testid="connection-item"][data-platform="google"]').first();
      const connectionId = await googleConnection.getAttribute('data-connection-id');
      
      if (connectionId) {
        await connectionsPage.refreshToken(connectionId);
        
        // Should remain active after refresh
        const statusBadge = googleConnection.locator('[data-testid="connection-status-badge"]');
        await expect(statusBadge).toContainText('active');
      }
    });

    test('should validate Google OAuth security parameters', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      connectionsPage = new ConnectionsPage(page);
      
      const authRequest = page.waitForRequest(/accounts\.google\.com\/o\/oauth2\/v2\/auth/);
      
      await connectionsPage.goto();
      await connectionsPage.connectToGoogle();
      
      const request = await authRequest;
      await oauthMock.verifyOAuthSecurity('google', request);
      
      // Additional Google-specific checks
      const url = new URL(request.url());
      expect(url.searchParams.get('access_type')).toBe('offline');
      expect(url.searchParams.get('prompt')).toBe('consent');
    });
  });

  test.describe('Microsoft OAuth Flow', () => {
    test('should complete full Microsoft OAuth flow successfully', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      connectionsPage = new ConnectionsPage(page);
      
      await connectionsPage.goto();
      
      const initialCount = await connectionsPage.getConnectionCount();
      
      // Start Microsoft OAuth flow
      await connectionsPage.connectToMicrosoft();
      
      // Should redirect to Microsoft OAuth
      await page.waitForURL(/login\.microsoftonline\.com/, { timeout: 10000 });
      
      // Handle OAuth callback
      await connectionsPage.handleOAuthCallback('microsoft');
      
      // Verify new connection
      const finalCount = await connectionsPage.getConnectionCount();
      expect(finalCount).toBe(initialCount + 1);
      
      const microsoftConnection = page.locator('[data-testid="connection-item"][data-platform="microsoft"]');
      await expect(microsoftConnection).toBeVisible();
      
      const statusBadge = microsoftConnection.locator('[data-testid="connection-status-badge"]');
      await expect(statusBadge).toContainText('active');
    });

    test('should handle Microsoft tenant-specific flows', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      connectionsPage = new ConnectionsPage(page);
      
      // Mock tenant-specific endpoint
      await page.route('**/login.microsoftonline.com/*/oauth2/v2.0/authorize**', (route) => {
        const url = new URL(route.request().url());
        
        // Verify tenant ID is in the URL path
        expect(route.request().url()).toMatch(/\/[a-f0-9-]{36}\/oauth2\/v2.0\/authorize/);
        
        const state = url.searchParams.get('state');
        const redirectUri = url.searchParams.get('redirect_uri');
        
        const callbackUrl = new URL(redirectUri!);
        callbackUrl.searchParams.set('code', 'mock-tenant-auth-code');
        callbackUrl.searchParams.set('state', state!);
        
        route.fulfill({
          status: 302,
          headers: { 'Location': callbackUrl.toString() }
        });
      });
      
      await connectionsPage.goto();
      await connectionsPage.connectToMicrosoft();
      await connectionsPage.handleOAuthCallback('microsoft');
      
      const microsoftConnection = page.locator('[data-testid="connection-item"][data-platform="microsoft"]');
      await expect(microsoftConnection).toBeVisible();
    });

    test('should validate Microsoft OAuth security parameters', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      connectionsPage = new ConnectionsPage(page);
      
      const authRequest = page.waitForRequest(/login\.microsoftonline\.com.*\/oauth2\/v2.0\/authorize/);
      
      await connectionsPage.goto();
      await connectionsPage.connectToMicrosoft();
      
      const request = await authRequest;
      await oauthMock.verifyOAuthSecurity('microsoft', request);
      
      // Microsoft-specific checks
      const url = new URL(request.url());
      expect(url.searchParams.get('response_mode')).toBe('query');
    });
  });

  test.describe('Multi-Platform OAuth Management', () => {
    test('should support multiple simultaneous connections', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      connectionsPage = new ConnectionsPage(page);
      
      await connectionsPage.goto();
      const initialCount = await connectionsPage.getConnectionCount();
      
      // Connect to all three platforms
      await connectionsPage.connectToSlack();
      await connectionsPage.handleOAuthCallback('slack');
      
      await connectionsPage.connectToGoogle();
      await connectionsPage.handleOAuthCallback('google');
      
      await connectionsPage.connectToMicrosoft();
      await connectionsPage.handleOAuthCallback('microsoft');
      
      // Should have 3 new connections
      const finalCount = await connectionsPage.getConnectionCount();
      expect(finalCount).toBe(initialCount + 3);
      
      // Verify all platforms are connected
      await expect(page.locator('[data-testid="connection-item"][data-platform="slack"]')).toBeVisible();
      await expect(page.locator('[data-testid="connection-item"][data-platform="google"]')).toBeVisible();
      await expect(page.locator('[data-testid="connection-item"][data-platform="microsoft"]')).toBeVisible();
    });

    test('should handle connection disconnection', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      connectionsPage = new ConnectionsPage(page);
      
      // Establish a connection first
      await connectionsPage.goto();
      await connectionsPage.connectToSlack();
      await connectionsPage.handleOAuthCallback('slack');
      
      const slackConnection = page.locator('[data-testid="connection-item"][data-platform="slack"]').first();
      const connectionId = await slackConnection.getAttribute('data-connection-id');
      
      if (connectionId) {
        // Disconnect the connection
        await connectionsPage.disconnectConnection(connectionId);
        
        // Verify status changed to inactive
        const statusBadge = slackConnection.locator('[data-testid="connection-status-badge"]');
        await expect(statusBadge).toContainText('inactive');
      }
    });

    test('should filter connections by platform', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      connectionsPage = new ConnectionsPage(page);
      
      // Set up connections for multiple platforms
      await connectionsPage.goto();
      await connectionsPage.connectToSlack();
      await connectionsPage.handleOAuthCallback('slack');
      
      await connectionsPage.connectToGoogle();
      await connectionsPage.handleOAuthCallback('google');
      
      // Test filtering by platform
      const slackCount = await connectionsPage.filterByStatus('active');
      expect(slackCount).toBeGreaterThanOrEqual(2);
      
      // Test search functionality
      const searchResults = await connectionsPage.searchConnections('slack');
      expect(searchResults).toBeGreaterThanOrEqual(1);
      
      // Clear search
      await connectionsPage.searchConnections('');
    });

    test('should validate connection health monitoring', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      connectionsPage = new ConnectionsPage(page);
      
      await connectionsPage.goto();
      await connectionsPage.connectToSlack();
      await connectionsPage.handleOAuthCallback('slack');
      
      // Validate health indicators
      const healthStatus = await connectionsPage.validateHealthIndicators();
      expect(healthStatus.healthy).toBeGreaterThanOrEqual(1);
      
      // Validate sync timestamps
      await connectionsPage.validateSyncTimestamps();
    });

    test('should handle OAuth state validation', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      connectionsPage = new ConnectionsPage(page);
      
      // Mock invalid state parameter attack
      await page.route('**/auth/oauth/slack/callback**', (route) => {
        if (route.request().url().includes('state=invalid-state')) {
          route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Invalid state parameter',
              code: 'OAUTH_CALLBACK_ERROR'
            })
          });
        } else {
          route.continue();
        }
      });
      
      // Try to navigate directly to callback with invalid state
      await page.goto('/auth/oauth/slack/callback?code=test&state=invalid-state');
      
      // Should show error or redirect to connections with error
      await page.waitForURL('/connections', { timeout: 10000 });
      const errorMessage = page.locator('[data-testid="oauth-error-message"]');
      await expect(errorMessage).toBeVisible();
    });
  });

  test.describe('OAuth Security Features', () => {
    test('should implement PKCE security extension', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      connectionsPage = new ConnectionsPage(page);
      
      let codeChallenge: string | null = null;
      let codeChallengeMethod: string | null = null;
      
      // Intercept authorization request to verify PKCE
      await page.route('**/slack.com/oauth/v2/authorize**', (route) => {
        const url = new URL(route.request().url());
        codeChallenge = url.searchParams.get('code_challenge');
        codeChallengeMethod = url.searchParams.get('code_challenge_method');
        
        // Continue with normal mock flow
        const state = url.searchParams.get('state');
        const redirectUri = url.searchParams.get('redirect_uri');
        
        const callbackUrl = new URL(redirectUri!);
        callbackUrl.searchParams.set('code', 'mock-slack-auth-code');
        callbackUrl.searchParams.set('state', state!);
        
        route.fulfill({
          status: 302,
          headers: { 'Location': callbackUrl.toString() }
        });
      });
      
      await connectionsPage.goto();
      await connectionsPage.connectToSlack();
      
      // Verify PKCE parameters were included
      expect(codeChallenge).toBeTruthy();
      expect(codeChallenge?.length).toBeGreaterThan(40);
      expect(codeChallengeMethod).toBe('S256');
    });

    test('should protect against CSRF attacks', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      connectionsPage = new ConnectionsPage(page);
      
      let stateParameter: string | null = null;
      
      // Capture state parameter from authorization request
      await page.route('**/slack.com/oauth/v2/authorize**', (route) => {
        const url = new URL(route.request().url());
        stateParameter = url.searchParams.get('state');
        
        // Don't redirect - we'll test with wrong state
        route.abort();
      });
      
      await connectionsPage.goto();
      
      // Try to initiate OAuth
      try {
        await connectionsPage.connectToSlack();
      } catch (e) {
        // Route was aborted, that's expected
      }
      
      // Verify state parameter exists and has good entropy
      expect(stateParameter).toBeTruthy();
      expect(stateParameter?.length).toBeGreaterThan(20);
      
      // Test with tampered state
      await page.goto(`/auth/oauth/slack/callback?code=test&state=tampered-state`);
      
      // Should reject the request
      const errorMessage = page.locator('[data-testid="oauth-error-message"]');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
    });

    test('should validate redirect URI security', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      connectionsPage = new ConnectionsPage(page);
      
      let redirectUri: string | null = null;
      
      // Capture redirect URI from authorization request
      await page.route('**/slack.com/oauth/v2/authorize**', (route) => {
        const url = new URL(route.request().url());
        redirectUri = url.searchParams.get('redirect_uri');
        route.abort();
      });
      
      await connectionsPage.goto();
      
      try {
        await connectionsPage.connectToSlack();
      } catch (e) {
        // Route was aborted
      }
      
      // Verify redirect URI is to our domain
      expect(redirectUri).toBeTruthy();
      expect(redirectUri).toMatch(/^https?:\/\/localhost:3001/);
      expect(redirectUri).toContain('/auth/oauth/slack/callback');
    });

    test('should not expose sensitive tokens in UI', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      connectionsPage = new ConnectionsPage(page);
      
      await connectionsPage.goto();
      await connectionsPage.connectToSlack();
      await connectionsPage.handleOAuthCallback('slack');
      
      // Check that no OAuth tokens are visible in the page
      const pageContent = await page.content();
      
      // Should not contain token patterns
      expect(pageContent).not.toMatch(/xox[abp]-[\w-]+/); // Slack tokens
      expect(pageContent).not.toMatch(/ya29\.[\w-]+/); // Google tokens  
      expect(pageContent).not.toMatch(/EwBwA8l6[\w-]+/); // Microsoft tokens
      
      // Validate security features are displayed
      await connectionsPage.validateSecurityFeatures();
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('should handle network failures gracefully', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      connectionsPage = new ConnectionsPage(page);
      
      // Simulate network timeout
      await oauthMock.simulateNetworkTimeout('slack');
      
      await connectionsPage.goto();
      await connectionsPage.connectToSlack();
      
      // Should handle timeout and show error message
      await page.waitForURL('/connections', { timeout: 20000 });
      const errorMessage = page.locator('[data-testid="oauth-error-message"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/timeout|network|failed/i);
    });

    test('should retry failed OAuth operations', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      connectionsPage = new ConnectionsPage(page);
      
      let attemptCount = 0;
      
      // Mock first attempt to fail, second to succeed
      await page.route('**/slack.com/api/oauth.v2.access', (route) => {
        attemptCount++;
        
        if (attemptCount === 1) {
          route.fulfill({
            status: 500,
            body: JSON.stringify({ error: 'server_error' })
          });
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ok: true,
              ...mockOAuthResponses.slack.token
            })
          });
        }
      });
      
      await connectionsPage.goto();
      await connectionsPage.connectToSlack();
      
      // Should eventually succeed after retry
      await connectionsPage.handleOAuthCallback('slack');
      
      const slackConnection = page.locator('[data-testid="connection-item"][data-platform="slack"]');
      await expect(slackConnection).toBeVisible();
    });

    test('should clean up partial connections on failure', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      connectionsPage = new ConnectionsPage(page);
      
      // Mock token exchange success but user info failure
      await page.route('**/slack.com/api/oauth.v2.access', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            ...mockOAuthResponses.slack.token
          })
        });
      });
      
      await page.route('**/slack.com/api/users.info**', (route) => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ ok: false, error: 'user_not_found' })
        });
      });
      
      await connectionsPage.goto();
      const initialCount = await connectionsPage.getConnectionCount();
      
      await connectionsPage.connectToSlack();
      
      // Should fail and not create partial connection
      await page.waitForURL('/connections', { timeout: 15000 });
      
      const finalCount = await connectionsPage.getConnectionCount();
      expect(finalCount).toBe(initialCount); // No partial connection should remain
    });
  });
});