/**
 * Enterprise OAuth security service for SaaS X-Ray
 * Implements secure OAuth flows with CSRF protection and state validation
 * Complies with RFC 6749, RFC 6750, OWASP OAuth security guidelines
 */

import * as crypto from 'crypto';
import { URL } from 'url';
import { Request, Response } from 'express';
import axios from 'axios';
import { isObject, isString } from '@singura/shared-types';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authorizationUrl: string;
  tokenUrl: string;
  revokeUrl?: string;
  userInfoUrl?: string;
}

export interface OAuthState {
  state: string;
  codeVerifier: string;
  organizationId: string;
  userId: string;
  platform: string;
  timestamp: number;
  nonce: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export interface AuthorizeUrlResult {
  url: string;
  state: string;
  codeVerifier: string;
}

/**
 * Secure OAuth flow manager with PKCE and state validation
 */
export class OAuthSecurityService {
  private readonly stateStore = new Map<string, OAuthState>();
  private readonly stateExpiry = 10 * 60 * 1000; // 10 minutes
  private readonly allowedRedirectHosts: Set<string>;

  constructor() {
    this.allowedRedirectHosts = new Set([
      'localhost',
      '127.0.0.1',
      process.env.FRONTEND_DOMAIN || 'app.singura.com'
    ].filter(Boolean));
  }

  /**
   * Generate authorization URL with PKCE and state validation
   * Implements RFC 7636 PKCE for OAuth security
   */
  generateAuthorizationUrl(
    config: OAuthConfig,
    organizationId: string,
    userId: string,
    platform: string
  ): AuthorizeUrlResult {
    // Generate PKCE code verifier and challenge
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);
    
    // Generate secure state parameter
    const state = this.generateSecureState();
    const nonce = this.generateNonce();

    // Store state information for validation
    const stateData: OAuthState = {
      state,
      codeVerifier,
      organizationId,
      userId,
      platform,
      timestamp: Date.now(),
      nonce
    };
    this.stateStore.set(state, stateData);

    // Validate redirect URI security
    this.validateRedirectUri(config.redirectUri);

    // Build authorization URL
    const authUrl = new URL(config.authorizationUrl);
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      nonce,
      // Security headers
      access_type: 'offline', // For refresh tokens
      prompt: 'consent', // Force consent screen
      include_granted_scopes: 'true'
    });

    authUrl.search = params.toString();

    return {
      url: authUrl.toString(),
      state,
      codeVerifier
    };
  }

  /**
   * Exchange authorization code for tokens
   * Implements secure token exchange with PKCE verification
   */
  async exchangeCodeForTokens(
    config: OAuthConfig,
    authorizationCode: string,
    state: string,
    receivedState?: string
  ): Promise<{
    tokens: TokenResponse;
    stateData: OAuthState;
  }> {
    // Validate state parameter (CSRF protection)
    const stateData = this.validateState(state, receivedState);
    
    // Validate authorization code format
    if (!authorizationCode || typeof authorizationCode !== 'string') {
      throw new Error('Invalid authorization code');
    }

    // Prepare token request
    const tokenRequest = {
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: authorizationCode,
      redirect_uri: config.redirectUri,
      code_verifier: stateData.codeVerifier
    };

    try {
      // Exchange code for tokens
      const response = await axios.post(config.tokenUrl, tokenRequest, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'SaaS-XRay/1.0'
        },
        timeout: 30000, // 30 second timeout
        validateStatus: (status) => status < 500 // Allow 4xx errors for proper handling
      });

      if (response.status >= 400) {
        throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
      }

      const tokens = this.validateTokenResponse(response.data);
      
      // Clean up used state
      this.stateStore.delete(state);
      
      return { tokens, stateData };
    } catch (error) {
      // Clean up state on error
      this.stateStore.delete(state);
      
      if (axios.isAxiosError(error)) {
        throw new Error(`OAuth token exchange failed: ${error.response?.status || 'Network error'}`);
      }
      throw new Error('Token exchange failed');
    }
  }

  /**
   * Refresh OAuth access token
   * Implements secure token refresh
   */
  async refreshAccessToken(
    config: OAuthConfig,
    refreshToken: string
  ): Promise<TokenResponse> {
    if (!refreshToken || typeof refreshToken !== 'string') {
      throw new Error('Valid refresh token is required');
    }

    const refreshRequest = {
      grant_type: 'refresh_token',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken
    };

    try {
      const response = await axios.post(config.tokenUrl, refreshRequest, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'SaaS-XRay/1.0'
        },
        timeout: 30000,
        validateStatus: (status) => status < 500
      });

      if (response.status >= 400) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      return this.validateTokenResponse(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 400 || status === 401) {
          throw new Error('Refresh token expired or invalid');
        }
        throw new Error(`Token refresh failed: ${status || 'Network error'}`);
      }
      throw new Error('Token refresh failed');
    }
  }

  /**
   * Revoke OAuth tokens
   * Implements secure token revocation
   */
  async revokeTokens(
    config: OAuthConfig,
    accessToken: string,
    refreshToken?: string
  ): Promise<void> {
    if (!config.revokeUrl) {
      return; // Platform doesn't support revocation
    }

    const tokens = [accessToken];
    if (refreshToken) {
      tokens.push(refreshToken);
    }

    const revocationPromises = tokens.map(async (token) => {
      try {
        await axios.post(config.revokeUrl!, {
          token,
          client_id: config.clientId,
          client_secret: config.clientSecret
        }, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'SaaS-XRay/1.0'
          },
          timeout: 10000
        });
      } catch (error) {
        // Log but don't throw - revocation is best effort
        console.warn(`Token revocation failed for ${config.clientId}:`, error);
      }
    });

    await Promise.allSettled(revocationPromises);
  }

  /**
   * Validate OAuth callback request
   * Implements comprehensive callback security validation
   */
  validateOAuthCallback(req: Request): {
    code: string;
    state: string;
    error?: string;
  } {
    const { code, state, error, error_description } = req.query;

    // Check for OAuth errors
    if (error) {
      throw new Error(`OAuth error: ${error}${error_description ? ` - ${error_description}` : ''}`);
    }

    // Validate required parameters
    if (!code || typeof code !== 'string') {
      throw new Error('Authorization code missing from callback');
    }

    if (!state || typeof state !== 'string') {
      throw new Error('State parameter missing from callback');
    }

    // Validate state format
    if (!/^[a-zA-Z0-9_-]{32,}$/.test(state)) {
      throw new Error('Invalid state parameter format');
    }

    return { code, state, error: error as string };
  }

  /**
   * Generate PKCE code verifier
   * Implements RFC 7636 specification
   */
  private generateCodeVerifier(): string {
    // Generate 128 bytes of random data
    const buffer = crypto.randomBytes(128);
    return buffer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Generate PKCE code challenge
   * Uses SHA256 hashing as per RFC 7636
   */
  private generateCodeChallenge(codeVerifier: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(codeVerifier);
    return hash
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Generate secure state parameter
   * Implements cryptographically secure state generation
   */
  private generateSecureState(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(20).toString('hex');
    return `${timestamp}_${random}`;
  }

  /**
   * Generate secure nonce for OpenID Connect
   */
  private generateNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Validate state parameter against CSRF attacks
   */
  private validateState(state: string, receivedState?: string): OAuthState {
    if (!state || typeof state !== 'string') {
      throw new Error('State parameter is required');
    }

    // Check state format
    if (!/^[a-zA-Z0-9_-]{32,}$/.test(state)) {
      throw new Error('Invalid state parameter format');
    }

    // If receivedState is provided, ensure they match (additional CSRF protection)
    if (receivedState && receivedState !== state) {
      throw new Error('State parameter mismatch');
    }

    const stateData = this.stateStore.get(state);
    if (!stateData) {
      throw new Error('Invalid or expired state parameter');
    }

    // Check expiration
    if (Date.now() - stateData.timestamp > this.stateExpiry) {
      this.stateStore.delete(state);
      throw new Error('State parameter expired');
    }

    return stateData;
  }

  /**
   * Validate redirect URI for security
   */
  private validateRedirectUri(redirectUri: string): void {
    try {
      const url = new URL(redirectUri);
      
      // Check protocol
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Redirect URI must use HTTP or HTTPS');
      }

      // Check hostname against allowlist
      if (!this.allowedRedirectHosts.has(url.hostname)) {
        throw new Error(`Redirect URI hostname '${url.hostname}' not allowed`);
      }

      // Prevent open redirects
      if (url.hostname === 'localhost' && url.protocol !== 'http:') {
        throw new Error('Localhost must use HTTP protocol');
      }

      if (url.hostname !== 'localhost' && url.protocol !== 'https:') {
        throw new Error('Non-localhost URIs must use HTTPS');
      }
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error('Invalid redirect URI format');
      }
      throw error;
    }
  }

  /**
   * Validate token response from OAuth provider
   */
  private validateTokenResponse(data: unknown): TokenResponse {
    if (!isObject(data)) {
      throw new Error('Invalid token response format');
    }

    const { access_token, token_type, expires_in } = data as Record<string, unknown>;

    if (!access_token || typeof access_token !== 'string') {
      throw new Error('Missing or invalid access token');
    }

    if (!token_type || typeof token_type !== 'string') {
      throw new Error('Missing or invalid token type');
    }

    if (token_type.toLowerCase() !== 'bearer') {
      throw new Error(`Unsupported token type: ${token_type}`);
    }

    if (expires_in && (typeof expires_in !== 'number' || expires_in <= 0)) {
      throw new Error('Invalid expires_in value');
    }

    // Validate token format (basic validation)
    if (access_token.length < 10) {
      throw new Error('Access token appears to be too short');
    }

    return {
      access_token,
      refresh_token: data.refresh_token as string | undefined,
      token_type,
      expires_in: (typeof expires_in === 'number' ? expires_in : 3600),
      scope: data.scope as string | undefined
    };
  }

  /**
   * Clean up expired state entries
   * Should be called periodically to prevent memory leaks
   */
  cleanupExpiredStates(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [state, stateData] of this.stateStore.entries()) {
      if (now - stateData.timestamp > this.stateExpiry) {
        this.stateStore.delete(state);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Get OAuth configuration for a platform
   * Implements secure configuration loading
   */
  getPlatformConfig(platform: string): OAuthConfig {
    const configs: Record<string, () => OAuthConfig> = {
      slack: () => ({
        clientId: this.getRequiredEnvVar('SLACK_CLIENT_ID'),
        clientSecret: this.getRequiredEnvVar('SLACK_CLIENT_SECRET'),
        redirectUri: this.getRequiredEnvVar('SLACK_REDIRECT_URI'),
        scopes: ['channels:read', 'groups:read', 'users:read', 'team:read', 'bots:read'],
        authorizationUrl: 'https://slack.com/oauth/v2/authorize',
        tokenUrl: 'https://slack.com/api/oauth.v2.access',
        revokeUrl: 'https://slack.com/api/auth.revoke'
      }),
      google: () => ({
        clientId: this.getRequiredEnvVar('GOOGLE_CLIENT_ID'),
        clientSecret: this.getRequiredEnvVar('GOOGLE_CLIENT_SECRET'),
        redirectUri: this.getRequiredEnvVar('GOOGLE_REDIRECT_URI'),
        scopes: [
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/admin.directory.user.readonly',
          'https://www.googleapis.com/auth/script.projects.readonly'
        ],
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        revokeUrl: 'https://oauth2.googleapis.com/revoke',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo'
      }),
      microsoft: () => ({
        clientId: this.getRequiredEnvVar('MICROSOFT_CLIENT_ID'),
        clientSecret: this.getRequiredEnvVar('MICROSOFT_CLIENT_SECRET'),
        redirectUri: this.getRequiredEnvVar('MICROSOFT_REDIRECT_URI'),
        scopes: ['openid', 'profile', 'email', 'Directory.Read.All', 'User.Read.All'],
        authorizationUrl: `https://login.microsoftonline.com/${this.getRequiredEnvVar('MICROSOFT_TENANT_ID')}/oauth2/v2.0/authorize`,
        tokenUrl: `https://login.microsoftonline.com/${this.getRequiredEnvVar('MICROSOFT_TENANT_ID')}/oauth2/v2.0/token`,
        userInfoUrl: 'https://graph.microsoft.com/v1.0/me'
      })
    };

    const configFactory = configs[platform];
    if (!configFactory) {
      throw new Error(`Unsupported OAuth platform: ${platform}`);
    }

    return configFactory();
  }

  /**
   * Get required environment variable with validation
   */
  private getRequiredEnvVar(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Required environment variable ${name} is not set`);
    }
    return value;
  }

  /**
   * Get current state store size (for monitoring)
   */
  getStateStoreSize(): number {
    return this.stateStore.size;
  }
}

// Export singleton instance
export const oauthSecurityService = new OAuthSecurityService();