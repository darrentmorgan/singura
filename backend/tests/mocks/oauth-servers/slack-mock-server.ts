/**
 * Mock OAuth Server for Slack
 *
 * Simulates Slack OAuth endpoints for E2E testing without hitting real APIs.
 * Supports token exchange, refresh, revocation, and PKCE.
 *
 * Slack OAuth 2.0 Documentation:
 * https://api.slack.com/authentication/oauth-v2
 */

import { BaseMockOAuthServer, BaseMockServerConfig, TokenData } from './base-mock-oauth-server';

export interface SlackMockServerConfig {
  port?: number;
  tokenExpiry?: number; // seconds
  codeExpiry?: number; // seconds
  enablePKCE?: boolean;
  enableStateValidation?: boolean;
}

/**
 * Slack-specific token response format
 */
interface SlackTokenResponse {
  ok: boolean;
  access_token: string;
  token_type: 'bot' | 'user';
  scope: string;
  bot_user_id?: string;
  app_id?: string;
  team?: {
    id: string;
    name: string;
  };
  enterprise?: {
    id: string;
    name: string;
  };
  authed_user?: {
    id: string;
    scope?: string;
    access_token?: string;
    token_type?: string;
  };
  refresh_token?: string;
  expires_in?: number;
}

/**
 * Valid Slack OAuth scopes
 * https://api.slack.com/scopes
 */
const VALID_SLACK_SCOPES = [
  // Bot scopes
  'users:read',
  'team:read',
  'channels:read',
  'channels:history',
  'groups:read',
  'groups:history',
  'im:read',
  'im:history',
  'mpim:read',
  'mpim:history',
  'chat:write',
  'files:read',
  'users:read.email',
  'app_mentions:read',
  'commands',

  // User scopes
  'identify',
  'channels:write',
  'chat:write:user',
  'chat:write:bot',
];

/**
 * Mock Slack OAuth server for testing
 */
export class SlackMockOAuthServer extends BaseMockOAuthServer {
  private teamId: string;
  private teamName: string;
  private botUserId: string;
  private appId: string;

  constructor(config?: SlackMockServerConfig) {
    const baseConfig: BaseMockServerConfig = {
      port: config?.port || 4001,
      tokenExpiry: config?.tokenExpiry || 43200, // 12 hours (Slack default)
      codeExpiry: config?.codeExpiry || 600, // 10 minutes
      enablePKCE: config?.enablePKCE ?? true,
      enableStateValidation: config?.enableStateValidation ?? true,
    };

    super(baseConfig);

    // Mock Slack workspace/team data
    this.teamId = 'T12345678';
    this.teamName = 'Test Workspace';
    this.botUserId = 'U12345678BOT';
    this.appId = 'A12345678';

    console.log('SlackMockOAuthServer initialized:', {
      port: baseConfig.port,
      tokenExpiry: baseConfig.tokenExpiry,
      enablePKCE: baseConfig.enablePKCE,
    });
  }

  /**
   * Slack authorization URL
   * https://slack.com/oauth/v2/authorize
   */
  getAuthorizationUrl(): string {
    return '/oauth/v2/authorize';
  }

  /**
   * Slack token URL
   * https://slack.com/api/oauth.v2.access
   */
  getTokenUrl(): string {
    return '/api/oauth.v2.access';
  }

  /**
   * Slack token revocation URL
   * https://slack.com/api/auth.revoke
   */
  getRevokeUrl(): string {
    return '/api/auth.revoke';
  }

  /**
   * Validate Slack OAuth scopes
   */
  validateScopes(scopes: string[]): boolean {
    if (scopes.length === 0) {
      return false;
    }

    return scopes.every(scope => VALID_SLACK_SCOPES.includes(scope));
  }

  /**
   * Generate Slack-specific token response
   * Matches Slack's OAuth v2 response format
   */
  generateTokenResponse(tokenData: TokenData): SlackTokenResponse {
    const expiresIn = Math.floor((tokenData.expiresAt.getTime() - Date.now()) / 1000);

    const response: SlackTokenResponse = {
      ok: true,
      access_token: tokenData.accessToken,
      token_type: 'bot', // Default to bot token
      scope: tokenData.scope.join(','), // Slack uses comma-separated scopes
      bot_user_id: this.botUserId,
      app_id: this.appId,
      team: {
        id: this.teamId,
        name: this.teamName,
      },
      authed_user: {
        id: tokenData.userId || 'U12345678USER',
      },
      expires_in: expiresIn,
    };

    // Include refresh token if available
    if (tokenData.refreshToken) {
      response.refresh_token = tokenData.refreshToken;
    }

    return response;
  }

  /**
   * Set mock team/workspace data (for testing different workspaces)
   */
  setMockTeam(teamId: string, teamName: string): void {
    this.teamId = teamId;
    this.teamName = teamName;
  }

  /**
   * Set mock bot user ID (for testing different bots)
   */
  setMockBotUser(botUserId: string): void {
    this.botUserId = botUserId;
  }

  /**
   * Set mock app ID (for testing different apps)
   */
  setMockAppId(appId: string): void {
    this.appId = appId;
  }

  /**
   * Get mock team data (for testing)
   */
  getMockTeam(): { teamId: string; teamName: string } {
    return {
      teamId: this.teamId,
      teamName: this.teamName,
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
    code_challenge?: string;
    code_challenge_method?: 'S256' | 'plain';
  }): string {
    const url = new URL(this.getAuthorizationUrl(), this.getBaseUrl());
    url.searchParams.set('client_id', params.client_id);
    url.searchParams.set('redirect_uri', params.redirect_uri);
    url.searchParams.set('scope', params.scope.join(','));
    url.searchParams.set('response_type', 'code');

    if (params.state) {
      url.searchParams.set('state', params.state);
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
}
