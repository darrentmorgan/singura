/**
 * Mock OAuth Server for Microsoft 365
 *
 * Simulates Microsoft OAuth endpoints for E2E testing without hitting real APIs.
 * Supports token exchange, refresh, revocation, and tenant validation.
 *
 * Microsoft OAuth 2.0 Documentation:
 * https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow
 */

import { BaseMockOAuthServer, BaseMockServerConfig, TokenData } from './base-mock-oauth-server';

export interface MicrosoftMockServerConfig {
  port?: number;
  tokenExpiry?: number; // seconds
  codeExpiry?: number; // seconds
  enablePKCE?: boolean;
  enableStateValidation?: boolean;
  enableTenantValidation?: boolean;
}

/**
 * Microsoft-specific token response format
 */
interface MicrosoftTokenResponse {
  token_type: 'Bearer';
  scope: string;
  expires_in: number;
  ext_expires_in: number;
  access_token: string;
  refresh_token?: string;
  id_token?: string;
}

/**
 * Microsoft user info response (from /me endpoint)
 */
interface MicrosoftUserInfo {
  '@odata.context': string;
  id: string;
  userPrincipalName: string;
  displayName: string;
  mail?: string;
  jobTitle?: string;
  officeLocation?: string;
  mobilePhone?: string;
  businessPhones?: string[];
}

/**
 * Valid Microsoft Graph API scopes
 * https://docs.microsoft.com/en-us/graph/permissions-reference
 */
const VALID_MICROSOFT_SCOPES = [
  // User scopes
  'offline_access',
  'openid',
  'profile',
  'email',
  'User.Read',
  'User.ReadWrite',
  'User.ReadBasic.All',
  'User.Read.All',
  'User.ReadWrite.All',

  // Directory scopes
  'Directory.Read.All',
  'Directory.ReadWrite.All',
  'Directory.AccessAsUser.All',

  // Application scopes
  'Application.Read.All',
  'Application.ReadWrite.All',

  // Mail scopes
  'Mail.Read',
  'Mail.ReadWrite',
  'Mail.Send',

  // Calendar scopes
  'Calendars.Read',
  'Calendars.ReadWrite',

  // Files scopes
  'Files.Read',
  'Files.ReadWrite',
  'Files.Read.All',
  'Files.ReadWrite.All',

  // Sites scopes
  'Sites.Read.All',
  'Sites.ReadWrite.All',

  // Teams scopes
  'Team.ReadBasic.All',
  'TeamSettings.Read.All',
  'TeamSettings.ReadWrite.All',

  // Microsoft Graph base scope
  'https://graph.microsoft.com/.default',
  'https://graph.microsoft.com/User.Read',
  'https://graph.microsoft.com/Directory.Read.All',
];

/**
 * Mock Microsoft OAuth server for testing
 */
export class MicrosoftMockOAuthServer extends BaseMockOAuthServer {
  private tenantId: string;
  private tenantName: string;
  private userId: string;
  private userPrincipalName: string;
  private displayName: string;

  constructor(config?: MicrosoftMockServerConfig) {
    const baseConfig: BaseMockServerConfig = {
      port: config?.port || 4003,
      tokenExpiry: config?.tokenExpiry || 3599, // 1 hour (Microsoft default)
      codeExpiry: config?.codeExpiry || 600, // 10 minutes
      enablePKCE: config?.enablePKCE ?? true,
      enableStateValidation: config?.enableStateValidation ?? true,
    };

    super(baseConfig);

    // Mock Microsoft 365 tenant data
    this.tenantId = 'common'; // or specific tenant ID like '12345678-1234-1234-1234-123456789012'
    this.tenantName = 'Test Organization';
    this.userId = '12345678-1234-1234-1234-123456789012';
    this.userPrincipalName = 'admin@testorg.onmicrosoft.com';
    this.displayName = 'Test Admin';

    console.log('MicrosoftMockOAuthServer initialized:', {
      port: baseConfig.port,
      tokenExpiry: baseConfig.tokenExpiry,
      enablePKCE: baseConfig.enablePKCE,
    });
  }

  /**
   * Microsoft authorization URL
   * https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize
   */
  getAuthorizationUrl(): string {
    return `/oauth2/v2.0/authorize`;
  }

  /**
   * Microsoft token URL
   * https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
   */
  getTokenUrl(): string {
    return `/oauth2/v2.0/token`;
  }

  /**
   * Microsoft token revocation URL
   * https://login.microsoftonline.com/{tenant}/oauth2/v2.0/logout
   */
  getRevokeUrl(): string {
    return `/oauth2/v2.0/logout`;
  }

  /**
   * Validate Microsoft OAuth scopes
   */
  validateScopes(scopes: string[]): boolean {
    if (scopes.length === 0) {
      return false;
    }

    return scopes.every(scope => VALID_MICROSOFT_SCOPES.includes(scope));
  }

  /**
   * Generate Microsoft-specific token response
   * Matches Microsoft's OAuth 2.0 response format
   */
  generateTokenResponse(tokenData: TokenData): MicrosoftTokenResponse {
    const expiresIn = Math.floor((tokenData.expiresAt.getTime() - Date.now()) / 1000);

    const response: MicrosoftTokenResponse = {
      token_type: 'Bearer',
      scope: tokenData.scope.join(' '), // Microsoft uses space-separated scopes
      expires_in: expiresIn,
      ext_expires_in: expiresIn + 3600, // Extended expiry for mobile apps
      access_token: tokenData.accessToken,
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
    const header = Buffer.from(
      JSON.stringify({
        typ: 'JWT',
        alg: 'RS256',
        kid: 'mock_key_id',
      })
    ).toString('base64url');

    const payload = Buffer.from(
      JSON.stringify({
        aud: tokenData.clientId,
        iss: `https://login.microsoftonline.com/${this.tenantId}/v2.0`,
        iat: Math.floor(Date.now() / 1000),
        nbf: Math.floor(Date.now() / 1000),
        exp: Math.floor(tokenData.expiresAt.getTime() / 1000),
        name: this.displayName,
        oid: this.userId,
        preferred_username: this.userPrincipalName,
        sub: this.userId,
        tid: this.tenantId,
        ver: '2.0',
      })
    ).toString('base64url');

    const signature = Buffer.from('mock_signature').toString('base64url');

    return `${header}.${payload}.${signature}`;
  }

  /**
   * Setup Microsoft-specific routes
   */
  protected setupRoutes(): void {
    super.setupRoutes();

    // Microsoft Graph /me endpoint
    this.app.get('/v1.0/me', (req, res) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          error: {
            code: 'InvalidAuthenticationToken',
            message: 'Access token is missing or invalid.',
          },
        });
        return;
      }

      const token = authHeader.substring(7);
      const tokenData = this.tokens.get(token);

      if (!tokenData || this.revokedTokens.has(token)) {
        res.status(401).json({
          error: {
            code: 'InvalidAuthenticationToken',
            message: 'Access token is missing or invalid.',
          },
        });
        return;
      }

      // Check if token is expired
      if (new Date() > tokenData.expiresAt) {
        res.status(401).json({
          error: {
            code: 'InvalidAuthenticationToken',
            message: 'Access token has expired.',
          },
        });
        return;
      }

      const userInfo: MicrosoftUserInfo = {
        '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users/$entity',
        id: this.userId,
        userPrincipalName: this.userPrincipalName,
        displayName: this.displayName,
        mail: this.userPrincipalName.split('@')[0] + '@testorg.com',
        jobTitle: 'Administrator',
        officeLocation: 'Building 1',
        mobilePhone: '+1 555-0100',
        businessPhones: ['+1 555-0101'],
      };

      res.json(userInfo);
    });

    // OpenID Connect discovery endpoint
    this.app.get('/.well-known/openid-configuration', (req, res) => {
      res.json({
        issuer: `https://login.microsoftonline.com/${this.tenantId}/v2.0`,
        authorization_endpoint: `${this.getBaseUrl()}${this.getAuthorizationUrl()}`,
        token_endpoint: `${this.getBaseUrl()}${this.getTokenUrl()}`,
        token_endpoint_auth_methods_supported: ['client_secret_post', 'private_key_jwt'],
        jwks_uri: `${this.getBaseUrl()}/discovery/v2.0/keys`,
        response_modes_supported: ['query', 'fragment', 'form_post'],
        response_types_supported: ['code', 'id_token', 'code id_token', 'id_token token'],
        scopes_supported: ['openid', 'profile', 'email', 'offline_access'],
        subject_types_supported: ['pairwise'],
        id_token_signing_alg_values_supported: ['RS256'],
        claims_supported: ['sub', 'iss', 'aud', 'exp', 'iat', 'auth_time', 'name', 'email'],
      });
    });
  }

  /**
   * Set mock tenant data (for testing different tenants)
   */
  setMockTenant(tenantId: string, tenantName: string): void {
    this.tenantId = tenantId;
    this.tenantName = tenantName;
  }

  /**
   * Set mock user data (for testing different users)
   */
  setMockUser(userId: string, userPrincipalName: string, displayName: string): void {
    this.userId = userId;
    this.userPrincipalName = userPrincipalName;
    this.displayName = displayName;
  }

  /**
   * Get mock tenant data (for testing)
   */
  getMockTenant(): { tenantId: string; tenantName: string } {
    return {
      tenantId: this.tenantId,
      tenantName: this.tenantName,
    };
  }

  /**
   * Get mock user data (for testing)
   */
  getMockUser(): { userId: string; userPrincipalName: string; displayName: string } {
    return {
      userId: this.userId,
      userPrincipalName: this.userPrincipalName,
      displayName: this.displayName,
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
    response_mode?: 'query' | 'fragment' | 'form_post';
    prompt?: 'none' | 'login' | 'consent' | 'select_account';
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

    if (params.response_mode) {
      url.searchParams.set('response_mode', params.response_mode);
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
   * Get full Microsoft Graph /me endpoint URL
   */
  getFullMeUrl(): string {
    return `${this.getBaseUrl()}/v1.0/me`;
  }
}
