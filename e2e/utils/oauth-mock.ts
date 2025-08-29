/**
 * OAuth Mock Utilities for Playwright Tests
 * Provides mock OAuth responses and flow simulation
 */

import { Page, Route } from '@playwright/test';

// Mock OAuth responses for different providers
export const mockOAuthResponses = {
  slack: {
    authorize: {
      url: 'https://slack.com/oauth/v2/authorize',
      params: {
        client_id: 'test-slack-client-id',
        scope: 'channels:read,users:read,chat:write,team:read',
        redirect_uri: 'http://localhost:3001/auth/oauth/slack/callback',
        state: 'mock-state-123',
        code_challenge: 'mock-code-challenge',
        code_challenge_method: 'S256'
      }
    },
    token: {
      access_token: 'xoxb-test-slack-token-123456789',
      refresh_token: 'xoxr-test-refresh-token-987654321',
      scope: 'channels:read,users:read,chat:write,team:read',
      team: {
        id: 'T1234567890',
        name: 'Test Team'
      },
      authed_user: {
        id: 'U1234567890'
      },
      expires_in: 43200
    },
    userInfo: {
      ok: true,
      user: {
        id: 'U1234567890',
        name: 'testuser',
        real_name: 'Test User',
        email: 'test@testteam.slack.com',
        profile: {
          display_name: 'Test User',
          real_name: 'Test User',
          email: 'test@testteam.slack.com'
        }
      },
      team: {
        id: 'T1234567890',
        name: 'Test Team',
        domain: 'testteam'
      }
    },
    teamInfo: {
      ok: true,
      team: {
        id: 'T1234567890',
        name: 'Test Team',
        domain: 'testteam',
        email_domain: 'testteam.com'
      }
    }
  },

  google: {
    authorize: {
      url: 'https://accounts.google.com/o/oauth2/v2/auth',
      params: {
        client_id: 'test-google-client-id.googleusercontent.com',
        scope: 'openid email profile https://www.googleapis.com/auth/drive.readonly',
        redirect_uri: 'http://localhost:3001/auth/oauth/google/callback',
        response_type: 'code',
        state: 'mock-google-state-456',
        access_type: 'offline',
        prompt: 'consent'
      }
    },
    token: {
      access_token: 'ya29.mock-google-access-token-abcdef123456',
      refresh_token: 'mock-google-refresh-token-ghijkl789012',
      scope: 'openid email profile https://www.googleapis.com/auth/drive.readonly',
      expires_in: 3600,
      token_type: 'Bearer',
      id_token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Im1vY2sta2V5LWlkIn0.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhdWQiOiJ0ZXN0LWdvb2dsZS1jbGllbnQtaWQuZ29vZ2xldXNlcmNvbnRlbnQuY29tIiwic3ViIjoiMTIzNDU2Nzg5MCIsImVtYWlsIjoidGVzdEBnbWFpbC5jb20iLCJuYW1lIjoiVGVzdCBVc2VyIn0.mock-signature'
    },
    userInfo: {
      id: '1234567890',
      email: 'test@gmail.com',
      verified_email: true,
      name: 'Test User',
      given_name: 'Test',
      family_name: 'User',
      picture: 'https://lh3.googleusercontent.com/mock-avatar-url'
    }
  },

  microsoft: {
    authorize: {
      url: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      params: {
        client_id: 'test-microsoft-client-id-uuid',
        scope: 'openid email profile User.Read',
        redirect_uri: 'http://localhost:3001/auth/oauth/microsoft/callback',
        response_type: 'code',
        state: 'mock-microsoft-state-789',
        response_mode: 'query',
        access_type: 'offline'
      }
    },
    token: {
      access_token: 'EwBwA8l6BAANMockMicrosoftToken123456789',
      refresh_token: 'OAQABAAIAAADCoMpjMockRefreshTokenABC',
      scope: 'openid email profile User.Read',
      expires_in: 3600,
      token_type: 'Bearer',
      id_token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6Im1vY2sta2V5LWlkIn0.eyJhdWQiOiJ0ZXN0LW1pY3Jvc29mdC1jbGllbnQtaWQtdXVpZCIsImlzcyI6Imh0dHBzOi8vbG9naW4ubWljcm9zb2Z0b25saW5lLmNvbS9tb2NrLXRlbmFudC1pZC92Mi4wIiwic3ViIjoibW9jay11c2VyLWlkLTEyMzQ1NiIsImVtYWlsIjoidGVzdEBjb250b3NvLmNvbSIsIm5hbWUiOiJUZXN0IFVzZXIifQ.mock-signature'
    },
    userInfo: {
      id: '12345678-1234-5678-9012-123456789012',
      userPrincipalName: 'test@contoso.com',
      displayName: 'Test User',
      givenName: 'Test',
      surname: 'User',
      mail: 'test@contoso.com',
      jobTitle: 'Test Engineer',
      officeLocation: 'Seattle'
    }
  }
};

// OAuth error responses
export const mockOAuthErrors = {
  accessDenied: {
    error: 'access_denied',
    error_description: 'The user denied the request'
  },
  invalidClient: {
    error: 'invalid_client',
    error_description: 'Invalid client credentials'
  },
  invalidGrant: {
    error: 'invalid_grant',
    error_description: 'The authorization code is invalid or expired'
  },
  serverError: {
    error: 'server_error',
    error_description: 'The authorization server encountered an unexpected condition'
  }
};

/**
 * OAuth Mock Handler class for controlling OAuth flows during tests
 */
export class OAuthMockHandler {
  private page: Page;
  private interceptedRoutes: Map<string, Route> = new Map();

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Set up OAuth mocking for all providers
   */
  async setupOAuthMocking() {
    // Mock Slack OAuth endpoints
    await this.mockSlackOAuth();
    
    // Mock Google OAuth endpoints
    await this.mockGoogleOAuth();
    
    // Mock Microsoft OAuth endpoints
    await this.mockMicrosoftOAuth();
  }

  /**
   * Mock Slack OAuth flow
   */
  async mockSlackOAuth() {
    // Mock authorization endpoint
    await this.page.route('**/slack.com/oauth/v2/authorize**', (route) => {
      const url = new URL(route.request().url());
      const state = url.searchParams.get('state');
      const redirectUri = url.searchParams.get('redirect_uri');
      
      // Simulate user authorization - redirect back with code
      const callbackUrl = new URL(redirectUri!);
      callbackUrl.searchParams.set('code', 'mock-slack-auth-code');
      callbackUrl.searchParams.set('state', state!);
      
      route.fulfill({
        status: 302,
        headers: {
          'Location': callbackUrl.toString()
        }
      });
    });

    // Mock token exchange endpoint
    await this.page.route('**/slack.com/api/oauth.v2.access', (route) => {
      if (route.request().method() === 'POST') {
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

    // Mock user info endpoint
    await this.page.route('**/slack.com/api/users.info**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOAuthResponses.slack.userInfo)
      });
    });

    // Mock team info endpoint
    await this.page.route('**/slack.com/api/team.info**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOAuthResponses.slack.teamInfo)
      });
    });
  }

  /**
   * Mock Google OAuth flow
   */
  async mockGoogleOAuth() {
    // Mock authorization endpoint
    await this.page.route('**/accounts.google.com/o/oauth2/v2/auth**', (route) => {
      const url = new URL(route.request().url());
      const state = url.searchParams.get('state');
      const redirectUri = url.searchParams.get('redirect_uri');
      
      const callbackUrl = new URL(redirectUri!);
      callbackUrl.searchParams.set('code', 'mock-google-auth-code');
      callbackUrl.searchParams.set('state', state!);
      
      route.fulfill({
        status: 302,
        headers: {
          'Location': callbackUrl.toString()
        }
      });
    });

    // Mock token exchange endpoint
    await this.page.route('**/oauth2.googleapis.com/token', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockOAuthResponses.google.token)
        });
      }
    });

    // Mock user info endpoint
    await this.page.route('**/www.googleapis.com/oauth2/v2/userinfo**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOAuthResponses.google.userInfo)
      });
    });
  }

  /**
   * Mock Microsoft OAuth flow
   */
  async mockMicrosoftOAuth() {
    // Mock authorization endpoint
    await this.page.route('**/login.microsoftonline.com/**/oauth2/v2.0/authorize**', (route) => {
      const url = new URL(route.request().url());
      const state = url.searchParams.get('state');
      const redirectUri = url.searchParams.get('redirect_uri');
      
      const callbackUrl = new URL(redirectUri!);
      callbackUrl.searchParams.set('code', 'mock-microsoft-auth-code');
      callbackUrl.searchParams.set('state', state!);
      
      route.fulfill({
        status: 302,
        headers: {
          'Location': callbackUrl.toString()
        }
      });
    });

    // Mock token exchange endpoint
    await this.page.route('**/login.microsoftonline.com/**/oauth2/v2.0/token', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockOAuthResponses.microsoft.token)
        });
      }
    });

    // Mock user info endpoint
    await this.page.route('**/graph.microsoft.com/v1.0/me', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOAuthResponses.microsoft.userInfo)
      });
    });
  }

  /**
   * Simulate OAuth error for testing error handling
   */
  async simulateOAuthError(provider: 'slack' | 'google' | 'microsoft', errorType: keyof typeof mockOAuthErrors) {
    const error = mockOAuthErrors[errorType];
    
    const tokenEndpoints = {
      slack: '**/slack.com/api/oauth.v2.access',
      google: '**/oauth2.googleapis.com/token',
      microsoft: '**/login.microsoftonline.com/**/oauth2/v2.0/token'
    };

    await this.page.route(tokenEndpoints[provider], (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify(error)
      });
    });
  }

  /**
   * Simulate network timeout for testing resilience
   */
  async simulateNetworkTimeout(provider: 'slack' | 'google' | 'microsoft') {
    const tokenEndpoints = {
      slack: '**/slack.com/api/oauth.v2.access',
      google: '**/oauth2.googleapis.com/token',
      microsoft: '**/login.microsoftonline.com/**/oauth2/v2.0/token'
    };

    await this.page.route(tokenEndpoints[provider], (route) => {
      // Simulate timeout by not responding
      setTimeout(() => {
        route.abort('timeout');
      }, 5000);
    });
  }

  /**
   * Clear all OAuth mocks
   */
  async clearOAuthMocks() {
    await this.page.unrouteAll();
    this.interceptedRoutes.clear();
  }

  /**
   * Get intercepted OAuth requests for validation
   */
  getInterceptedRequests(): Map<string, Route> {
    return this.interceptedRoutes;
  }

  /**
   * Verify OAuth security parameters
   */
  async verifyOAuthSecurity(provider: 'slack' | 'google' | 'microsoft', request: any) {
    const url = new URL(request.url());
    
    // Check for required security parameters
    expect(url.searchParams.get('state')).toBeTruthy();
    expect(url.searchParams.get('state')?.length).toBeGreaterThan(16);
    
    // Check PKCE for Slack and Google
    if (provider === 'slack' || provider === 'google') {
      expect(url.searchParams.get('code_challenge')).toBeTruthy();
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    }
    
    // Check redirect URI is to our domain
    const redirectUri = url.searchParams.get('redirect_uri');
    expect(redirectUri).toContain('localhost:3001');
    
    // Check scopes are appropriate
    const scope = url.searchParams.get('scope');
    expect(scope).toBeTruthy();
    expect(scope).not.toContain('admin'); // Should not request admin scopes
  }
}