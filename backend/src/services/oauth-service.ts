/**
 * Enterprise OAuth service integrating all security components
 * Implements secure OAuth flows with comprehensive protection
 * and enterprise-grade token management
 */

import { Request, Response } from 'express';
import {
  OAuthAuthorizationRequest,
  OAuthCallbackRequest,
  OAuthCredentials,
  PlatformConnection,
  Platform,
  GoogleOAuthCredentials
} from '@singura/shared-types';
import { oauthSecurityService, OAuthConfig, TokenResponse } from '../security/oauth';
import { encryptionService, EncryptedData } from '../security/encryption';
import { securityAuditService } from '../security/audit';
import { platformConnectionRepository } from '../database/repositories/platform-connection';
import { encryptedCredentialRepository } from '../database/repositories/encrypted-credential';
import { PlatformType, ConnectionStatus, CredentialType } from '../types/database';
import { oauthCredentialStorage } from './oauth-credential-storage-service';
import axios from 'axios';

export interface OAuthFlowResult {
  connectionId: string;
  platform: PlatformType;
  displayName: string;
  permissions: string[];
  expiresAt?: Date;
}

export interface TokenRefreshResult {
  success: boolean;
  newTokens?: {
    accessToken: string;
    refreshToken?: string;
    expiresAt: Date;
  };
  error?: string;
}

/**
 * Enhanced TokenResponse with index signature for compatibility
 */
interface ExtendedTokenResponse extends TokenResponse {
  [key: string]: unknown;
}

/**
 * Platform user info interface for type safety
 */
interface PlatformUserInfo {
  id: string;
  name?: string;
  email?: string;
  [key: string]: unknown;
}

/**
 * Secure OAuth service with enterprise controls
 */
export class OAuthService {
  /**
   * Initiate OAuth authorization flow
   * Implements secure OAuth initiation with state validation
   */
  async initiateOAuthFlow(
    platform: Platform,
    userId: string,
    organizationId: string,
    req: Request
  ): Promise<{ authorizationUrl: string; state: string }> {
    try {
      // Validate platform support
      this.validatePlatformSupport(platform);

      // Get platform OAuth configuration
      const config = oauthSecurityService.getPlatformConfig(platform);

      // Generate secure authorization URL
      const { url, state } = oauthSecurityService.generateAuthorizationUrl(
        config,
        organizationId,
        userId,
        platform
      );

      // Log OAuth initiation
      await securityAuditService.logOAuthEvent(
        'oauth_start',
        platform,
        userId,
        organizationId,
        undefined,
        req,
        {
          authorizationUrl: url.split('?')[0], // Log base URL only for security
          scopes: config.scopes
        }
      );

      return { authorizationUrl: url, state };
    } catch (error) {
      await securityAuditService.logOAuthEvent(
        'oauth_failure',
        platform,
        userId,
        organizationId,
        undefined,
        req,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
      throw error;
    }
  }

  /**
   * Complete OAuth flow with callback handling
   * Implements secure OAuth completion with token storage
   */
  async completeOAuthFlow(
    platform: PlatformType,
    code: string,
    state: string,
    userId: string,
    organizationId: string,
    req: Request
  ): Promise<OAuthFlowResult> {
    try {
      // Validate callback parameters
      const callbackData = oauthSecurityService.validateOAuthCallback(req);
      
      // Get platform configuration
      const config = oauthSecurityService.getPlatformConfig(platform);

      // Exchange code for tokens
      const { tokens, stateData } = await oauthSecurityService.exchangeCodeForTokens(
        config,
        code,
        state
      );

      // Fetch user information from platform
      const platformUserInfo = await this.fetchPlatformUserInfo(platform, tokens.access_token);

      // Create or update platform connection
      const connection = await this.createPlatformConnection(
        organizationId,
        platform,
        platformUserInfo,
        tokens as ExtendedTokenResponse,
        config.scopes
      );

      // Store encrypted credentials
      await this.storeOAuthTokens(connection.id, tokens as ExtendedTokenResponse);

      // Log successful OAuth completion
      await securityAuditService.logOAuthEvent(
        'oauth_success',
        platform,
        userId,
        organizationId,
        connection.id,
        req,
        {
          platformUserId: platformUserInfo.id,
          displayName: connection.display_name,
          scopes: config.scopes,
          tokenType: tokens.token_type
        }
      );

      return {
        connectionId: connection.id,
        platform,
        displayName: connection.display_name,
        permissions: config.scopes,
        expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : undefined
      };
    } catch (error) {
      await securityAuditService.logOAuthEvent(
        'oauth_failure',
        platform,
        userId,
        organizationId,
        undefined,
        req,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
      throw error;
    }
  }

  /**
   * Refresh OAuth tokens
   * Implements secure token refresh with rotation
   */
  async refreshOAuthTokens(
    connectionId: string,
    userId: string,
    req?: Request
  ): Promise<TokenRefreshResult> {
    try {
      // Get platform connection
      const connection = await platformConnectionRepository.findById(connectionId);
      if (!connection) {
        throw new Error('Platform connection not found');
      }

      // Get refresh token
      const refreshToken = await encryptedCredentialRepository.getDecryptedValue(
        connectionId,
        'refresh_token'
      );

      if (!refreshToken) {
        return {
          success: false,
          error: 'No refresh token available'
        };
      }

      // Get platform configuration
      const config = oauthSecurityService.getPlatformConfig(connection.platform_type);

      // Refresh tokens
      const newTokens = await oauthSecurityService.refreshAccessToken(config, refreshToken);

      // Calculate expiration
      const expiresAt = new Date(Date.now() + newTokens.expires_in * 1000);

      // Store new tokens
      await this.updateOAuthTokens(connectionId, newTokens as ExtendedTokenResponse, expiresAt);

      // Update connection status and expiration
      await platformConnectionRepository.update(connectionId, {
        status: 'active',
        expires_at: expiresAt,
        last_error: undefined
      });

      // Log successful token refresh
      await securityAuditService.logOAuthEvent(
        'token_refresh',
        connection.platform_type,
        userId,
        connection.organization_id,
        connectionId,
        req || ({} as Request),
        {
          newExpiresAt: expiresAt,
          tokenType: newTokens.token_type
        }
      );

      return {
        success: true,
        newTokens: {
          accessToken: newTokens.access_token,
          refreshToken: newTokens.refresh_token,
          expiresAt
        }
      };
    } catch (error) {
      const connection = await platformConnectionRepository.findById(connectionId).catch(() => null);
      
      if (connection) {
        // Update connection status on refresh failure
        await platformConnectionRepository.update(connectionId, {
          status: 'error',
          last_error: error instanceof Error ? error.message : 'Token refresh failed'
        });

        await securityAuditService.logOAuthEvent(
          'oauth_failure',
          connection.platform_type,
          userId,
          connection.organization_id,
          connectionId,
          req || ({} as Request),
          { 
            error: error instanceof Error ? error.message : 'Unknown error',
            action: 'token_refresh'
          }
        );
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed'
      };
    }
  }

  /**
   * Revoke OAuth tokens
   * Implements secure token revocation
   */
  async revokeOAuthTokens(
    connectionId: string,
    userId: string,
    req?: Request
  ): Promise<void> {
    try {
      const connection = await platformConnectionRepository.findById(connectionId);
      if (!connection) {
        throw new Error('Platform connection not found');
      }

      // Get stored tokens
      const accessToken = await encryptedCredentialRepository.getDecryptedValue(
        connectionId,
        'access_token'
      );
      const refreshToken = await encryptedCredentialRepository.getDecryptedValue(
        connectionId,
        'refresh_token'
      );

      if (!accessToken) {
        throw new Error('No access token found for revocation');
      }

      // Get platform configuration
      const config = oauthSecurityService.getPlatformConfig(connection.platform_type);

      // Revoke tokens with platform
      await oauthSecurityService.revokeTokens(config, accessToken, refreshToken || undefined);

      // Delete stored credentials
      await encryptedCredentialRepository.deleteByConnection(connectionId);

      // Update connection status
      await platformConnectionRepository.update(connectionId, {
        status: 'inactive',
        last_error: undefined
      });

      // Log token revocation
      await securityAuditService.logOAuthEvent(
        'oauth_success',
        connection.platform_type,
        userId,
        connection.organization_id,
        connectionId,
        req || ({} as Request),
        { action: 'token_revocation' }
      );
    } catch (error) {
      const connection = await platformConnectionRepository.findById(connectionId).catch(() => null);
      
      if (connection) {
        await securityAuditService.logOAuthEvent(
          'oauth_failure',
          connection.platform_type,
          userId,
          connection.organization_id,
          connectionId,
          req || ({} as Request),
          { 
            error: error instanceof Error ? error.message : 'Unknown error',
            action: 'token_revocation'
          }
        );
      }
      
      throw error;
    }
  }

  /**
   * Get OAuth token for API calls
   * Implements secure token retrieval with refresh
   */
  async getValidAccessToken(
    connectionId: string,
    userId: string,
    req?: Request
  ): Promise<string> {
    const connection = await platformConnectionRepository.findById(connectionId);
    if (!connection) {
      throw new Error('Platform connection not found');
    }

    // Check if connection is expired and attempt refresh
    if (connection.expires_at && connection.expires_at < new Date()) {
      const refreshResult = await this.refreshOAuthTokens(connectionId, userId, req);
      
      if (!refreshResult.success) {
        throw new Error(`Token expired and refresh failed: ${refreshResult.error}`);
      }
    }

    // Get access token
    const accessToken = await encryptedCredentialRepository.getDecryptedValue(
      connectionId,
      'access_token'
    );

    if (!accessToken) {
      throw new Error('No access token available');
    }

    return accessToken;
  }

  /**
   * Validate platform support
   */
  private validatePlatformSupport(platform: Platform): void {
    const supportedPlatforms: Platform[] = ['slack', 'google', 'microsoft'];
    
    if (!supportedPlatforms.includes(platform)) {
      throw new Error(`Platform '${platform}' is not supported for OAuth`);
    }
  }

  /**
   * Fetch platform user information
   */
  private async fetchPlatformUserInfo(platform: PlatformType, accessToken: string): Promise<PlatformUserInfo> {
    const config = oauthSecurityService.getPlatformConfig(platform);
    
    if (!config.userInfoUrl) {
      // For platforms without userinfo endpoint, return minimal data
      return { id: 'unknown', name: 'Unknown User' };
    }

    try {
      const response = await axios.get(config.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'SaaS-XRay/1.0'
        },
        timeout: 10000
      });

      return this.normalizePlatformUserInfo(platform, response.data);
    } catch (error) {
      console.error(`Failed to fetch user info from ${platform}:`, error);
      return { id: 'unknown', name: 'Unknown User' };
    }
  }

  /**
   * Normalize user info across platforms
   */
  private normalizePlatformUserInfo(platform: PlatformType, userInfo: Record<string, unknown>): PlatformUserInfo {
    switch (platform) {
      case 'google':
        return {
          id: String(userInfo.id || userInfo.sub || 'unknown'),
          name: String(userInfo.name || 'Unknown User'),
          email: String(userInfo.email || ''),
          domain: userInfo.hd // Google Workspace domain
        };
      case 'microsoft':
        return {
          id: String(userInfo.id || userInfo.sub || 'unknown'),
          name: String(userInfo.displayName || userInfo.name || 'Unknown User'),
          email: String(userInfo.mail || userInfo.userPrincipalName || ''),
          tenantId: userInfo.tid
        };
      case 'slack': {
        const slackUser = (userInfo.user as Record<string, unknown>) || {};
        const slackTeam = (userInfo.team as Record<string, unknown>) || {};
        return {
          id: String(slackUser.id || 'unknown'),
          name: String(slackUser.name || 'Unknown User'),
          teamId: slackTeam.id,
          teamName: slackTeam.name
        };
      }
      default:
        return {
          id: String(userInfo.id || 'unknown'),
          name: String(userInfo.name || 'Unknown User'),
          ...userInfo
        };
    }
  }

  /**
   * Create or update platform connection
   */
  private async createPlatformConnection(
    organizationId: string,
    platform: PlatformType,
    platformUserInfo: PlatformUserInfo,
    tokens: ExtendedTokenResponse,
    scopes: string[]
  ): Promise<{ id: string; display_name: string; platform_type: PlatformType; organization_id: string }> {
    // Check for existing connection
    const existingConnections = await platformConnectionRepository.findMany({
      organization_id: organizationId,
      platform_type: platform
    });

    const existingConnection = existingConnections.data.find(
      conn => conn.platform_user_id === platformUserInfo.id
    );

    const connectionData = {
      platform_user_id: platformUserInfo.id,
      platform_workspace_id: this.extractWorkspaceId(platform, platformUserInfo),
      display_name: this.createDisplayName(platform, platformUserInfo),
      status: 'active' as ConnectionStatus,
      permissions_granted: scopes,
      expires_at: tokens.expires_in && typeof tokens.expires_in === 'number' ? new Date(Date.now() + tokens.expires_in * 1000) : undefined,
      metadata: this.createConnectionMetadata(platform, platformUserInfo, tokens),
      last_error: undefined
    };

    if (existingConnection) {
      // Update existing connection
      const updated = await platformConnectionRepository.update(existingConnection.id, connectionData);
      if (!updated) {
        throw new Error('Failed to update platform connection');
      }
      return updated;
    } else {
      // Create new connection
      return await platformConnectionRepository.create({
        organization_id: organizationId,
        platform_type: platform,
        ...connectionData,
        platform_workspace_id: connectionData.platform_workspace_id ?? undefined
      });
    }
  }

  /**
   * Store OAuth tokens securely
   * FIXED: Stores in both database (persistence) AND singleton cache (performance)
   */
  private async storeOAuthTokens(connectionId: string, tokens: ExtendedTokenResponse): Promise<void> {
    console.log(`🔍 [OAuth Service] Storing tokens for connection: ${connectionId}`);

    // Get connection metadata to populate complete credential object
    const connection = await platformConnectionRepository.findById(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found when storing tokens`);
    }

    // Store access token in database (existing behavior)
    const accessTokenData: EncryptedData = encryptionService.encrypt(tokens.access_token);
    await encryptedCredentialRepository.replaceCredential(
      connectionId,
      'access_token',
      JSON.stringify(accessTokenData),
      tokens.expires_in && typeof tokens.expires_in === 'number' ? new Date(Date.now() + tokens.expires_in * 1000) : undefined
    );

    // Store refresh token if available (existing behavior)
    if (tokens.refresh_token && typeof tokens.refresh_token === 'string') {
      const refreshTokenData: EncryptedData = encryptionService.encrypt(tokens.refresh_token);
      await encryptedCredentialRepository.replaceCredential(
        connectionId,
        'refresh_token',
        JSON.stringify(refreshTokenData)
      );
    }

    // CRITICAL FIX: ALSO store in singleton cache for discovery service
    // This bridges the architectural gap between database persistence and memory cache
    if (connection.platform_type === 'google') {
      try {
        // Build complete GoogleOAuthCredentials object from connection metadata
        const metadata = connection.metadata as unknown as Record<string, unknown>;
        const expiresAt = tokens.expires_in && typeof tokens.expires_in === 'number'
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : undefined;

        const googleCredentials: GoogleOAuthCredentials = {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token && typeof tokens.refresh_token === 'string'
            ? tokens.refresh_token
            : undefined,
          tokenType: tokens.token_type || 'Bearer',
          scope: typeof tokens.scope === 'string' ? tokens.scope.split(' ') : [],
          expiresAt,
          userId: connection.platform_user_id,
          email: metadata?.email as string | undefined,
          domain: metadata?.domain as string | undefined,
          organizationId: connection.organization_id
        };

        // Store in singleton cache for discovery service
        const stored = await oauthCredentialStorage.storeCredentials(connectionId, googleCredentials);

        if (stored) {
          console.log(`✅ [OAuth Service] Credentials stored in BOTH database and singleton cache: ${connectionId}`);
        } else {
          console.warn(`⚠️  [OAuth Service] Failed to store credentials in singleton cache (database still persisted): ${connectionId}`);
        }
      } catch (cacheError) {
        // Log error but don't fail - database persistence is critical, cache is performance optimization
        console.error(`❌ [OAuth Service] Error storing credentials in singleton cache (database still persisted):`, cacheError);
      }
    }

    console.log(`✅ [OAuth Service] Token storage complete for: ${connectionId}`);
  }

  /**
   * Update OAuth tokens
   * FIXED: Updates in both database (persistence) AND singleton cache (performance)
   */
  private async updateOAuthTokens(
    connectionId: string,
    tokens: ExtendedTokenResponse,
    expiresAt: Date
  ): Promise<void> {
    console.log(`🔍 [OAuth Service] Updating tokens for connection: ${connectionId}`);

    // Get connection metadata
    const connection = await platformConnectionRepository.findById(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found when updating tokens`);
    }

    // Update access token in database (existing behavior)
    const accessTokenData: EncryptedData = encryptionService.encrypt(tokens.access_token);
    await encryptedCredentialRepository.replaceCredential(
      connectionId,
      'access_token',
      JSON.stringify(accessTokenData),
      expiresAt
    );

    // Update refresh token if provided (token rotation)
    if (tokens.refresh_token && typeof tokens.refresh_token === 'string') {
      const refreshTokenData: EncryptedData = encryptionService.encrypt(tokens.refresh_token);
      await encryptedCredentialRepository.replaceCredential(
        connectionId,
        'refresh_token',
        JSON.stringify(refreshTokenData)
      );
    }

    // CRITICAL FIX: ALSO update in singleton cache for discovery service
    if (connection.platform_type === 'google') {
      try {
        // Build complete GoogleOAuthCredentials object from connection metadata
        const metadata = connection.metadata as unknown as Record<string, unknown>;

        const googleCredentials: GoogleOAuthCredentials = {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token && typeof tokens.refresh_token === 'string'
            ? tokens.refresh_token
            : undefined,
          tokenType: tokens.token_type || 'Bearer',
          scope: typeof tokens.scope === 'string' ? tokens.scope.split(' ') : [],
          expiresAt,
          userId: connection.platform_user_id,
          email: metadata?.email as string | undefined,
          domain: metadata?.domain as string | undefined,
          organizationId: connection.organization_id
        };

        // Update in singleton cache for discovery service
        await oauthCredentialStorage.storeCredentials(connectionId, googleCredentials);

        console.log(`✅ [OAuth Service] Credentials updated in BOTH database and singleton cache: ${connectionId}`);
      } catch (cacheError) {
        // Log error but don't fail - database persistence is critical
        console.error(`❌ [OAuth Service] Error updating credentials in singleton cache (database still persisted):`, cacheError);
      }
    }

    console.log(`✅ [OAuth Service] Token update complete for: ${connectionId}`);
  }

  /**
   * Extract workspace ID from platform user info
   */
  private extractWorkspaceId(platform: PlatformType, userInfo: PlatformUserInfo): string | null {
    switch (platform) {
      case 'slack':
        return (userInfo.teamId as string) || null;
      case 'google':
        return (userInfo.domain as string) || null;
      case 'microsoft':
        return (userInfo.tenantId as string) || null;
      default:
        return null;
    }
  }

  /**
   * Create display name for connection
   */
  private createDisplayName(platform: PlatformType, userInfo: PlatformUserInfo): string {
    const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
    const userName = userInfo.name || userInfo.email || 'Unknown User';
    
    const workspaceName = this.getWorkspaceName(platform, userInfo);
    
    return workspaceName ? `${platformName} - ${userName} (${workspaceName})` : `${platformName} - ${userName}`;
  }

  /**
   * Get workspace name from platform user info
   */
  private getWorkspaceName(platform: PlatformType, userInfo: PlatformUserInfo): string | null {
    switch (platform) {
      case 'slack':
        return (userInfo.teamName as string) || null;
      case 'google':
        return (userInfo.domain as string) || null;
      case 'microsoft':
        return (userInfo.tenantId as string) || null;
      default:
        return null;
    }
  }

  /**
   * Create connection metadata
   */
  private createConnectionMetadata(platform: PlatformType, userInfo: PlatformUserInfo, tokens: ExtendedTokenResponse): Record<string, unknown> {
    const baseMetadata = {
      tokenType: tokens.token_type,
      scope: tokens.scope,
      connectedAt: new Date().toISOString()
    };

    switch (platform) {
      case 'slack':
        return {
          ...baseMetadata,
          teamId: userInfo.teamId,
          teamName: userInfo.teamName,
          userId: userInfo.id
        };
      case 'google':
        return {
          ...baseMetadata,
          email: userInfo.email,
          domain: userInfo.domain
        };
      case 'microsoft':
        return {
          ...baseMetadata,
          tenantId: userInfo.tenantId,
          userPrincipalName: userInfo.email,
          displayName: userInfo.name
        };
      default:
        return baseMetadata;
    }
  }
}

// Export singleton instance
export const oauthService = new OAuthService();