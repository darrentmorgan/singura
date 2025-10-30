/**
 * Mock OAuth Server for Google Workspace
 *
 * Simulates Google OAuth endpoints for E2E testing without hitting real APIs.
 * Supports token exchange, refresh, revocation, and PKCE.
 *
 * Google OAuth 2.0 Documentation:
 * https://developers.google.com/identity/protocols/oauth2
 */

import { BaseMockOAuthServer, BaseMockServerConfig, TokenData } from './base-mock-oauth-server';

export interface GoogleMockServerConfig {
  port?: number;
  tokenExpiry?: number; // seconds
  codeExpiry?: number; // seconds
  enablePKCE?: boolean;
  enableStateValidation?: boolean;
  enableScopeValidation?: boolean;
}

/**
 * Google-specific token response format
 */
interface GoogleTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token?: string;
  scope: string;
  id_token?: string;
}

/**
 * Google user info response
 */
interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
  hd?: string; // Hosted domain for workspace accounts
}

/**
 * Valid Google OAuth scopes
 * https://developers.google.com/identity/protocols/oauth2/scopes
 */
const VALID_GOOGLE_SCOPES = [
  // User info
  'openid',
  'email',
  'profile',

  // Google Workspace Admin
  'https://www.googleapis.com/auth/admin.directory.user.readonly',
  'https://www.googleapis.com/auth/admin.directory.user',
  'https://www.googleapis.com/auth/admin.directory.group.readonly',
  'https://www.googleapis.com/auth/admin.directory.group',
  'https://www.googleapis.com/auth/admin.directory.orgunit.readonly',
  'https://www.googleapis.com/auth/admin.directory.domain.readonly',

  // Apps Script
  'https://www.googleapis.com/auth/script.projects.readonly',
  'https://www.googleapis.com/auth/script.projects',

  // Audit logs
  'https://www.googleapis.com/auth/admin.reports.audit.readonly',

  // Drive
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
];

/**
 * Mock Google OAuth server for testing
 */
export class GoogleMockOAuthServer extends BaseMockOAuthServer {
  private domain: string;
  private userId: string;
  private userEmail: string;
  private userName: string;

  constructor(config?: GoogleMockServerConfig) {
    const baseConfig: BaseMockServerConfig = {
      port: config?.port || 4002,
      tokenExpiry: config?.tokenExpiry || 3599, // 1 hour (Google default)
      codeExpiry: config?.codeExpiry || 600, // 10 minutes
      enablePKCE: config?.enablePKCE ?? true,
      enableStateValidation: config?.enableStateValidation ?? true,
    };

    super(baseConfig);

    // Mock Google Workspace data
    this.domain = 'example.com';
    this.userId = '1234567890';
    this.userEmail = 'admin@example.com';
    this.userName = 'Test Admin';

    console.log('GoogleMockOAuthServer initialized:', {
      port: baseConfig.port,
      tokenExpiry: baseConfig.tokenExpiry,
      enablePKCE: baseConfig.enablePKCE,
    });
  }

  /**
   * Google authorization URL
   * https://accounts.google.com/o/oauth2/v2/auth
   */
  getAuthorizationUrl(): string {
    return '/o/oauth2/v2/auth';
  }

  /**
   * Google token URL
   * https://oauth2.googleapis.com/token
   */
  getTokenUrl(): string {
    return '/token';
  }

  /**
   * Google token revocation URL
   * https://oauth2.googleapis.com/revoke
   */
  getRevokeUrl(): string {
    return '/revoke';
  }

  /**
   * Validate Google OAuth scopes
   */
  validateScopes(scopes: string[]): boolean {
    if (scopes.length === 0) {
      return false;
    }

    return scopes.every(scope => VALID_GOOGLE_SCOPES.includes(scope));
  }

  /**
   * Generate Google-specific token response
   * Matches Google's OAuth 2.0 response format
   */
  generateTokenResponse(tokenData: TokenData): GoogleTokenResponse {
    const expiresIn = Math.floor((tokenData.expiresAt.getTime() - Date.now()) / 1000);

    const response: GoogleTokenResponse = {
      access_token: tokenData.accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      scope: tokenData.scope.join(' '), // Google uses space-separated scopes
    };

    // Include refresh token if available
    if (tokenData.refreshToken) {
      response.refresh_token = tokenData.refreshToken;
    }

    // Include ID token if openid scope is present
    if (tokenData.scope.includes('openid')) {
      response.id_token = this.generateIdToken(tokenData);
    }

    return response;
  }

  /**
   * Generate mock ID token (JWT format)
   * In real implementation, this would be a properly signed JWT
   */
  private generateIdToken(tokenData: TokenData): string {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        iss: 'https://accounts.google.com',
        sub: this.userId,
        aud: tokenData.clientId,
        email: this.userEmail,
        email_verified: true,
        name: this.userName,
        hd: this.domain,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(tokenData.expiresAt.getTime() / 1000),
      })
    ).toString('base64url');
    const signature = Buffer.from('mock_signature').toString('base64url');

    return `${header}.${payload}.${signature}`;
  }

  /**
   * Setup Google-specific routes
   */
  protected setupRoutes(): void {
    super.setupRoutes();

    // User info endpoint
    this.app.get('/oauth2/v2/userinfo', (req, res) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          error: {
            code: 401,
            message: 'Invalid Credentials',
            status: 'UNAUTHENTICATED',
          },
        });
        return;
      }

      const token = authHeader.substring(7);
      const tokenData = this.tokens.get(token);

      if (!tokenData || this.revokedTokens.has(token)) {
        res.status(401).json({
          error: {
            code: 401,
            message: 'Invalid Credentials',
            status: 'UNAUTHENTICATED',
          },
        });
        return;
      }

      // Check if token is expired
      if (new Date() > tokenData.expiresAt) {
        res.status(401).json({
          error: {
            code: 401,
            message: 'Token expired',
            status: 'UNAUTHENTICATED',
          },
        });
        return;
      }

      const userInfo: GoogleUserInfo = {
        id: this.userId,
        email: this.userEmail,
        verified_email: true,
        name: this.userName,
        picture: 'https://example.com/photo.jpg',
        locale: 'en',
        hd: this.domain,
      };

      res.json(userInfo);
    });
  }

  /**
   * Set mock domain (for testing different workspaces)
   */
  setMockDomain(domain: string): void {
    this.domain = domain;
  }

  /**
   * Set mock user data (for testing different users)
   */
  setMockUser(userId: string, userEmail: string, userName: string): void {
    this.userId = userId;
    this.userEmail = userEmail;
    this.userName = userName;
  }

  /**
   * Get mock user data (for testing)
   */
  getMockUser(): { userId: string; userEmail: string; userName: string; domain: string } {
    return {
      userId: this.userId,
      userEmail: this.userEmail,
      userName: this.userName,
      domain: this.domain,
    };
  }

  /**
   * Get base URL for mock server
   */
  getBaseUrl(): string {
    return `http://localhost:${this.config.port}`;
  }

  /**
   * Get full authorization URL with parameters
   */
  getFullAuthorizationUrl(params: {
    client_id: string;
    redirect_uri: string;
    scope: string[];
    state?: string;
    access_type?: 'online' | 'offline';
    prompt?: 'none' | 'consent' | 'select_account';
    code_challenge?: string;
    code_challenge_method?: 'S256' | 'plain';
  }): string {
    const url = new URL(this.getAuthorizationUrl(), this.getBaseUrl());
    url.searchParams.set('client_id', params.client_id);
    url.searchParams.set('redirect_uri', params.redirect_uri);
    url.searchParams.set('scope', params.scope.join(' '));
    url.searchParams.set('response_type', 'code');

    if (params.state) {
      url.searchParams.set('state', params.state);
    }

    if (params.access_type) {
      url.searchParams.set('access_type', params.access_type);
    }

    if (params.prompt) {
      url.searchParams.set('prompt', params.prompt);
    }

    if (params.code_challenge) {
      url.searchParams.set('code_challenge', params.code_challenge);
      url.searchParams.set('code_challenge_method', params.code_challenge_method || 'S256');
    }

    return url.toString();
  }

  /**
   * Get full token URL
   */
  getFullTokenUrl(): string {
    return `${this.getBaseUrl()}${this.getTokenUrl()}`;
  }

  /**
   * Get full revoke URL
   */
  getFullRevokeUrl(): string {
    return `${this.getBaseUrl()}${this.getRevokeUrl()}`;
  }

  /**
   * Get full user info URL
   */
  getFullUserInfoUrl(): string {
    return `${this.getBaseUrl()}/oauth2/v2/userinfo`;
  }
}
