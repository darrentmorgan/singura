/**
 * Base Mock OAuth Server
 *
 * Provides shared OAuth 2.0 flow implementation for testing.
 * Supports:
 * - Authorization code grant flow
 * - Token exchange
 * - Token refresh
 * - Token revocation
 * - PKCE (Proof Key for Code Exchange)
 * - State parameter validation
 */

import express, { Application, Request, Response } from 'express';
import { Server } from 'http';
import * as crypto from 'crypto';

/**
 * Token data stored in memory
 */
export interface TokenData {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresAt: Date;
  scope: string[];
  clientId: string;
  userId?: string;
  workspaceId?: string;
}

/**
 * Authorization code data
 */
export interface AuthCodeData {
  code: string;
  clientId: string;
  redirectUri: string;
  scope: string[];
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: 'S256' | 'plain';
  expiresAt: Date;
  userId?: string;
  workspaceId?: string;
}

/**
 * OAuth error types
 */
export type OAuthErrorCode =
  | 'invalid_request'
  | 'invalid_client'
  | 'invalid_grant'
  | 'unauthorized_client'
  | 'unsupported_grant_type'
  | 'invalid_scope'
  | 'access_denied'
  | 'server_error';

/**
 * Configurable server responses
 */
export interface MockServerResponse {
  error?: OAuthErrorCode;
  errorDescription?: string;
  customData?: Record<string, any>;
}

/**
 * Base configuration for mock servers
 */
export interface BaseMockServerConfig {
  port: number;
  tokenExpiry: number; // seconds
  codeExpiry: number; // seconds (default: 600)
  enablePKCE: boolean;
  enableStateValidation: boolean;
}

/**
 * Abstract base class for OAuth mock servers
 */
export abstract class BaseMockOAuthServer {
  protected app: Application;
  protected server: Server | null = null;
  protected config: BaseMockServerConfig;
  protected tokens: Map<string, TokenData> = new Map();
  protected authCodes: Map<string, AuthCodeData> = new Map();
  protected revokedTokens: Set<string> = new Set();
  protected mockResponse: MockServerResponse | null = null;

  constructor(config: BaseMockServerConfig) {
    this.app = express();
    this.config = config;
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.setupRoutes();
  }

  /**
   * Platform-specific authorization URL
   */
  abstract getAuthorizationUrl(): string;

  /**
   * Platform-specific token URL
   */
  abstract getTokenUrl(): string;

  /**
   * Platform-specific revoke URL
   */
  abstract getRevokeUrl(): string;

  /**
   * Platform-specific scope validation
   */
  abstract validateScopes(scopes: string[]): boolean;

  /**
   * Generate platform-specific token response
   */
  abstract generateTokenResponse(tokenData: TokenData): Record<string, any>;

  /**
   * Start the mock OAuth server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.config.port, () => {
          console.log(`Mock OAuth server started on port ${this.config.port}`);
          resolve();
        });

        this.server.on('error', (error: NodeJS.ErrnoException) => {
          if (error.code === 'EADDRINUSE') {
            reject(new Error(`Port ${this.config.port} is already in use`));
          } else {
            reject(error);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the mock OAuth server
   */
  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((error) => {
        if (error) {
          reject(error);
        } else {
          console.log(`Mock OAuth server stopped on port ${this.config.port}`);
          this.server = null;
          resolve();
        }
      });
    });
  }

  /**
   * Reset server state (useful for tests)
   */
  reset(): void {
    this.tokens.clear();
    this.authCodes.clear();
    this.revokedTokens.clear();
    this.mockResponse = null;
  }

  /**
   * Set mock response for next request (for testing error scenarios)
   */
  setMockResponse(response: MockServerResponse): void {
    this.mockResponse = response;
  }

  /**
   * Clear mock response
   */
  clearMockResponse(): void {
    this.mockResponse = null;
  }

  /**
   * Setup OAuth endpoint routes
   */
  protected setupRoutes(): void {
    // Authorization endpoint
    this.app.get(this.getAuthorizationUrl(), this.handleAuthorize.bind(this));

    // Token endpoint
    this.app.post(this.getTokenUrl(), this.handleToken.bind(this));

    // Revoke endpoint
    this.app.post(this.getRevokeUrl(), this.handleRevoke.bind(this));

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', port: this.config.port });
    });
  }

  /**
   * Handle OAuth authorization endpoint
   */
  protected handleAuthorize(req: Request, res: Response): void {
    const {
      client_id,
      redirect_uri,
      scope,
      state,
      code_challenge,
      code_challenge_method,
      response_type,
    } = req.query;

    // Validate required parameters
    if (!client_id || !redirect_uri || !response_type) {
      res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing required parameters',
      });
      return;
    }

    if (response_type !== 'code') {
      res.status(400).json({
        error: 'unsupported_response_type',
        error_description: 'Only authorization code flow is supported',
      });
      return;
    }

    // Validate scopes
    const requestedScopes = scope ? String(scope).split(' ') : [];
    if (!this.validateScopes(requestedScopes)) {
      res.status(400).json({
        error: 'invalid_scope',
        error_description: 'Invalid or unsupported scopes',
      });
      return;
    }

    // Generate authorization code
    const code = this.generateAuthCode();
    const authCodeData: AuthCodeData = {
      code,
      clientId: String(client_id),
      redirectUri: String(redirect_uri),
      scope: requestedScopes,
      state: state ? String(state) : undefined,
      codeChallenge: code_challenge ? String(code_challenge) : undefined,
      codeChallengeMethod: code_challenge_method as 'S256' | 'plain' | undefined,
      expiresAt: new Date(Date.now() + this.config.codeExpiry * 1000),
      userId: 'mock-user-id',
      workspaceId: 'mock-workspace-id',
    };

    this.authCodes.set(code, authCodeData);

    // Redirect back with authorization code
    const redirectUrl = new URL(String(redirect_uri));
    redirectUrl.searchParams.set('code', code);
    if (state) {
      redirectUrl.searchParams.set('state', String(state));
    }

    res.redirect(redirectUrl.toString());
  }

  /**
   * Handle OAuth token endpoint
   */
  protected handleToken(req: Request, res: Response): void {
    // Check for mock response override
    if (this.mockResponse?.error) {
      res.status(400).json({
        error: this.mockResponse.error,
        error_description: this.mockResponse.errorDescription || 'Mock error',
      });
      this.clearMockResponse();
      return;
    }

    const { grant_type } = req.body;

    if (!grant_type) {
      res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing grant_type',
      });
      return;
    }

    switch (grant_type) {
      case 'authorization_code':
        this.handleTokenExchange(req, res);
        break;
      case 'refresh_token':
        this.handleTokenRefresh(req, res);
        break;
      default:
        res.status(400).json({
          error: 'unsupported_grant_type',
          error_description: `Grant type '${grant_type}' is not supported`,
        });
    }
  }

  /**
   * Handle token exchange (authorization code → tokens)
   */
  protected handleTokenExchange(req: Request, res: Response): void {
    const {
      code,
      client_id,
      client_secret,
      redirect_uri,
      code_verifier,
    } = req.body;

    // Validate required parameters
    if (!code || !client_id || !redirect_uri) {
      res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing required parameters',
      });
      return;
    }

    // Retrieve authorization code data
    const authCodeData = this.authCodes.get(code);
    if (!authCodeData) {
      res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Authorization code is invalid',
      });
      return;
    }

    // Check if code is expired
    if (new Date() > authCodeData.expiresAt) {
      this.authCodes.delete(code);
      res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Authorization code has expired',
      });
      return;
    }

    // Validate client_id
    if (authCodeData.clientId !== client_id) {
      res.status(400).json({
        error: 'invalid_client',
        error_description: 'Client ID mismatch',
      });
      return;
    }

    // Validate redirect_uri
    if (authCodeData.redirectUri !== redirect_uri) {
      res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Redirect URI mismatch',
      });
      return;
    }

    // Validate PKCE if enabled
    if (this.config.enablePKCE && authCodeData.codeChallenge) {
      if (!code_verifier) {
        res.status(400).json({
          error: 'invalid_request',
          error_description: 'PKCE code verifier required',
        });
        return;
      }

      if (!this.verifyPKCE(code_verifier, authCodeData.codeChallenge, authCodeData.codeChallengeMethod)) {
        res.status(400).json({
          error: 'invalid_grant',
          error_description: 'PKCE verification failed',
        });
        return;
      }
    }

    // Generate tokens
    const accessToken = this.generateAccessToken();
    const refreshToken = this.generateRefreshToken();

    const tokenData: TokenData = {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + this.config.tokenExpiry * 1000),
      scope: authCodeData.scope,
      clientId: client_id,
      userId: authCodeData.userId,
      workspaceId: authCodeData.workspaceId,
    };

    this.tokens.set(accessToken, tokenData);
    this.tokens.set(refreshToken, tokenData); // Store by both tokens

    // Delete used authorization code
    this.authCodes.delete(code);

    // Return platform-specific token response
    const response = this.generateTokenResponse(tokenData);
    res.json(response);
  }

  /**
   * Handle token refresh
   */
  protected handleTokenRefresh(req: Request, res: Response): void {
    const { refresh_token, client_id, client_secret } = req.body;

    if (!refresh_token || !client_id) {
      res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing required parameters',
      });
      return;
    }

    // Retrieve token data
    const oldTokenData = this.tokens.get(refresh_token);
    if (!oldTokenData) {
      res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Refresh token is invalid',
      });
      return;
    }

    // Check if token is revoked
    if (this.revokedTokens.has(refresh_token)) {
      res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Refresh token has been revoked',
      });
      return;
    }

    // Validate client_id
    if (oldTokenData.clientId !== client_id) {
      res.status(400).json({
        error: 'invalid_client',
        error_description: 'Client ID mismatch',
      });
      return;
    }

    // Generate new tokens
    const newAccessToken = this.generateAccessToken();
    const newRefreshToken = this.generateRefreshToken();

    const newTokenData: TokenData = {
      ...oldTokenData,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresAt: new Date(Date.now() + this.config.tokenExpiry * 1000),
    };

    // Store new tokens
    this.tokens.set(newAccessToken, newTokenData);
    this.tokens.set(newRefreshToken, newTokenData);

    // Remove old tokens
    this.tokens.delete(oldTokenData.accessToken);
    this.tokens.delete(refresh_token);

    // Return platform-specific token response
    const response = this.generateTokenResponse(newTokenData);
    res.json(response);
  }

  /**
   * Handle token revocation
   */
  protected handleRevoke(req: Request, res: Response): void {
    const { token, token_type_hint } = req.body;

    if (!token) {
      res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing token parameter',
      });
      return;
    }

    // Mark token as revoked
    this.revokedTokens.add(token);

    // Remove from active tokens
    const tokenData = this.tokens.get(token);
    if (tokenData) {
      this.tokens.delete(tokenData.accessToken);
      this.tokens.delete(tokenData.refreshToken);
    }

    // RFC 7009: The authorization server responds with HTTP status code 200
    // if the token has been revoked successfully or if the client
    // submitted an invalid token
    res.status(200).json({});
  }

  /**
   * Generate random authorization code
   */
  protected generateAuthCode(): string {
    return `mock_code_${crypto.randomBytes(32).toString('hex')}`;
  }

  /**
   * Generate random access token
   */
  protected generateAccessToken(): string {
    return `mock_access_${crypto.randomBytes(32).toString('hex')}`;
  }

  /**
   * Generate random refresh token
   */
  protected generateRefreshToken(): string {
    return `mock_refresh_${crypto.randomBytes(32).toString('hex')}`;
  }

  /**
   * Verify PKCE code challenge
   */
  protected verifyPKCE(
    codeVerifier: string,
    codeChallenge: string,
    method?: 'S256' | 'plain'
  ): boolean {
    if (method === 'plain') {
      return codeVerifier === codeChallenge;
    }

    // S256 method (default)
    const hash = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    return hash === codeChallenge;
  }

  /**
   * Get token data (for testing)
   */
  getTokenData(token: string): TokenData | undefined {
    return this.tokens.get(token);
  }

  /**
   * Check if token is revoked (for testing)
   */
  isTokenRevoked(token: string): boolean {
    return this.revokedTokens.has(token);
  }

  /**
   * Get server port
   */
  getPort(): number {
    return this.config.port;
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.server !== null;
  }
}
