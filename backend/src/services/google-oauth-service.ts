/**
 * Google OAuth Service
 * Implements OAuth 2.0 authentication flow for Google Workspace
 * Follows patterns established in slack-oauth-service.ts
 *
 * TODO: Add test coverage for actor email extraction when Jest/TypeScript config is refactored
 * See: .claude/TEST_COVERAGE_EXCEPTIONS.md
 */

import { google, Auth } from 'googleapis';
import { 
  GoogleOAuthConfig,
  GoogleOAuthCredentials, 
  GoogleOAuthRawResponse,
  GoogleOAuthError,
  GoogleWorkspaceUserInfo,
  GoogleWorkspaceDomain,
  isValidGoogleOAuthCredentials,
  isValidGoogleOAuthRawResponse
} from '@singura/shared-types';

export class GoogleOAuthService {
  private oAuth2Client: Auth.OAuth2Client;
  private config: GoogleOAuthConfig;

  constructor(config: GoogleOAuthConfig) {
    this.config = config;
    this.oAuth2Client = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret,
      this.config.redirectUri
    );

    console.log('GoogleOAuthService initialized:', {
      clientId: this.config.clientId.substring(0, 10) + '...',
      scopes: this.config.scopes,
      redirectUri: this.config.redirectUri
    });
  }

  /**
   * Generate authorization URL for Google Workspace OAuth
   */
  generateAuthorizationUrl(state: string): string {
    try {
      const authUrl = this.oAuth2Client.generateAuthUrl({
        access_type: this.config.accessType || 'offline',
        scope: [...this.config.scopes], // Convert readonly array to mutable
        state,
        include_granted_scopes: this.config.includeGrantedScopes || true,
        prompt: 'consent' // Force consent for workspace admin approval
      });

      console.log('Google OAuth Authorization URL generated:', {
        scopes: this.config.scopes,
        accessType: this.config.accessType || 'offline',
        state: state.substring(0, 8) + '...',
        includeGrantedScopes: this.config.includeGrantedScopes || true
      });

      return authUrl;
    } catch (error) {
      console.error('Failed to generate Google OAuth authorization URL:', error);
      throw new Error(`Google OAuth URL generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Exchange authorization code for access tokens
   */
  async exchangeCodeForTokens(code: string): Promise<GoogleOAuthCredentials> {
    try {
      console.log('Google OAuth: Exchanging authorization code for tokens');

      const { tokens } = await this.oAuth2Client.getToken(code);
      
      if (!tokens.access_token) {
        throw new Error('No access token received from Google OAuth');
      }

      // Validate raw response structure
      const rawResponse: GoogleOAuthRawResponse = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || undefined,
        token_type: tokens.token_type || 'Bearer',
        expires_in: tokens.expiry_date ? Math.floor((tokens.expiry_date - Date.now()) / 1000) : undefined,
        scope: tokens.scope || '',
        id_token: tokens.id_token || undefined
      };

      if (!isValidGoogleOAuthRawResponse(rawResponse)) {
        throw new Error('Invalid Google OAuth response structure');
      }

      // Transform to standard OAuth credentials format
      const credentials: GoogleOAuthCredentials = {
        accessToken: rawResponse.access_token,
        refreshToken: rawResponse.refresh_token,
        tokenType: rawResponse.token_type,
        scope: rawResponse.scope ? rawResponse.scope.split(' ') : [],
        expiresAt: rawResponse.expires_in ? new Date(Date.now() + rawResponse.expires_in * 1000) : undefined,
        idToken: rawResponse.id_token
      };

      // Get user info for workspace context
      this.oAuth2Client.setCredentials(tokens);
      const userInfo = await this.getUserInfo();
      if (userInfo) {
        credentials.userId = userInfo.id;
        credentials.email = userInfo.email;
        credentials.domain = userInfo.domain;
      }

      // Handle expiresAt for logging (can be Date or string)
      const expiresAtStr = credentials.expiresAt
        ? (credentials.expiresAt instanceof Date
          ? credentials.expiresAt.toISOString()
          : credentials.expiresAt)
        : undefined;

      console.log('Google OAuth tokens exchanged successfully:', {
        hasAccessToken: !!credentials.accessToken,
        hasRefreshToken: !!credentials.refreshToken,
        scopeCount: credentials.scope.length,
        expiresAt: expiresAtStr,
        userEmail: credentials.email ? credentials.email.substring(0, 3) + '...' : 'unknown',
        domain: credentials.domain || 'personal'
      });

      return credentials;
    } catch (error) {
      console.error('Google OAuth token exchange failed:', error);
      throw new Error(`Google OAuth token exchange failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Refresh expired access tokens
   */
  async refreshTokens(refreshToken: string): Promise<GoogleOAuthCredentials> {
    try {
      console.log('Google OAuth: Refreshing expired access tokens');

      this.oAuth2Client.setCredentials({
        refresh_token: refreshToken
      });

      const { credentials } = await this.oAuth2Client.refreshAccessToken();
      
      if (!credentials.access_token) {
        throw new Error('No access token received from Google token refresh');
      }

      const refreshedCredentials: GoogleOAuthCredentials = {
        accessToken: credentials.access_token,
        refreshToken: credentials.refresh_token || refreshToken, // Keep original if new one not provided
        tokenType: credentials.token_type || 'Bearer',
        scope: credentials.scope ? credentials.scope.split(' ') : [],
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined
      };

      // Handle expiresAt for logging (can be Date or string)
      const newExpiresAtStr = refreshedCredentials.expiresAt
        ? (refreshedCredentials.expiresAt instanceof Date
          ? refreshedCredentials.expiresAt.toISOString()
          : refreshedCredentials.expiresAt)
        : undefined;

      console.log('Google OAuth tokens refreshed successfully:', {
        newExpiresAt: newExpiresAtStr,
        hasNewRefreshToken: !!credentials.refresh_token,
        scopeCount: refreshedCredentials.scope.length
      });

      return refreshedCredentials;
    } catch (error) {
      console.error('Google OAuth token refresh failed:', error);
      throw new Error(`Google OAuth token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get authenticated user information from Google
   */
  async getUserInfo(): Promise<GoogleWorkspaceUserInfo | null> {
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oAuth2Client });
      const { data } = await oauth2.userinfo.get();

      if (!data.id || !data.email) {
        console.warn('Incomplete user info received from Google OAuth');
        return null;
      }

      // Extract domain from email for workspace detection
      const domain = data.email.split('@')[1];
      const isWorkspaceDomain = domain && !['gmail.com', 'googlemail.com'].includes(domain);

      const userInfo: GoogleWorkspaceUserInfo = {
        id: data.id,
        email: data.email,
        name: data.name || 'Unknown User',
        domain: domain || 'gmail.com',
        isAdmin: false, // Default - would need admin SDK to check
        orgUnit: isWorkspaceDomain ? '/' : undefined,
        lastLoginTime: new Date()
      };

      console.log('Google user info retrieved:', {
        userId: userInfo.id.substring(0, 8) + '...',
        email: userInfo.email.substring(0, 3) + '...',
        domain: userInfo.domain,
        isWorkspace: isWorkspaceDomain
      });

      return userInfo;
    } catch (error) {
      console.error('Failed to get Google user info:', error);
      return null;
    }
  }

  /**
   * Validate Google OAuth credentials
   */
  async validateCredentials(credentials: GoogleOAuthCredentials): Promise<boolean> {
    try {
      if (!isValidGoogleOAuthCredentials(credentials)) {
        return false;
      }

      // Set credentials and test with a simple API call
      this.oAuth2Client.setCredentials({
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken,
        token_type: credentials.tokenType
      });

      // Test credentials with user info call
      const userInfo = await this.getUserInfo();
      return userInfo !== null;
    } catch (error) {
      console.error('Google OAuth credentials validation failed:', error);
      return false;
    }
  }

  /**
   * Revoke Google OAuth tokens
   */
  async revokeTokens(accessToken: string): Promise<boolean> {
    try {
      console.log('Google OAuth: Revoking access tokens');

      await this.oAuth2Client.revokeToken(accessToken);

      console.log('Google OAuth tokens revoked successfully');
      return true;
    } catch (error) {
      console.error('Google OAuth token revocation failed:', error);
      return false;
    }
  }

  /**
   * Get current OAuth configuration (for debugging)
   */
  getConfig(): Readonly<GoogleOAuthConfig> {
    return Object.freeze({ ...this.config });
  }
}