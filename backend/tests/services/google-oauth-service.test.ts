/**
 * Google OAuth Service Tests
 * Comprehensive testing for Google Workspace OAuth integration
 * Following Types-Tests-Code protocol from CLAUDE.md
 */

import { jest } from '@jest/globals';
import { GoogleOAuthService } from '../../src/services/google-oauth-service';
import { 
  GoogleOAuthConfig,
  GoogleOAuthCredentials,
  GoogleOAuthRawResponse,
  GoogleWorkspaceUserInfo,
  isValidGoogleOAuthCredentials
} from '@saas-xray/shared-types';

// Mock googleapis
jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        generateAuthUrl: jest.fn(),
        getToken: jest.fn(),
        setCredentials: jest.fn(),
        refreshAccessToken: jest.fn(),
        revokeToken: jest.fn()
      }))
    },
    oauth2: jest.fn().mockReturnValue({
      userinfo: {
        get: jest.fn()
      }
    })
  }
}));

describe('GoogleOAuthService', () => {
  let googleOAuthService: GoogleOAuthService;
  let mockOAuth2Client: any;
  
  const mockConfig: GoogleOAuthConfig = {
    clientId: 'test-google-client-id.apps.googleusercontent.com',
    clientSecret: 'test-google-client-secret',
    redirectUri: 'http://localhost:4201/api/auth/callback/google',
    scopes: [
      'https://www.googleapis.com/auth/admin.directory.user.readonly',
      'https://www.googleapis.com/auth/admin.directory.group.readonly',
      'https://www.googleapis.com/auth/admin.reports.audit.readonly'
    ],
    accessType: 'offline',
    includeGrantedScopes: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock OAuth2 client
    const { google } = require('googleapis');
    mockOAuth2Client = new google.auth.OAuth2();
    
    googleOAuthService = new GoogleOAuthService(mockConfig);
  });

  describe('Constructor', () => {
    it('should initialize with correct Google OAuth configuration', () => {
      expect(googleOAuthService).toBeInstanceOf(GoogleOAuthService);
      expect(googleOAuthService.getConfig()).toEqual(mockConfig);
    });

    it('should create OAuth2 client with proper credentials', () => {
      const { google } = require('googleapis');
      expect(google.auth.OAuth2).toHaveBeenCalledWith(
        mockConfig.clientId,
        mockConfig.clientSecret,
        mockConfig.redirectUri
      );
    });
  });

  describe('generateAuthorizationUrl', () => {
    it('should generate valid authorization URL with all required parameters', () => {
      const mockAuthUrl = 'https://accounts.google.com/oauth/authorize?client_id=test&scope=admin&state=test-state';
      mockOAuth2Client.generateAuthUrl.mockReturnValue(mockAuthUrl);
      
      const state = 'test-oauth-state';
      const result = googleOAuthService.generateAuthorizationUrl(state);
      
      expect(mockOAuth2Client.generateAuthUrl).toHaveBeenCalledWith({
        access_type: 'offline',
        scope: mockConfig.scopes,
        state,
        include_granted_scopes: true,
        prompt: 'consent'
      });
      expect(result).toBe(mockAuthUrl);
    });

    it('should handle authorization URL generation errors', () => {
      mockOAuth2Client.generateAuthUrl.mockImplementation(() => {
        throw new Error('Google OAuth API error');
      });
      
      expect(() => {
        googleOAuthService.generateAuthorizationUrl('test-state');
      }).toThrow('Google OAuth URL generation failed: Google OAuth API error');
    });
  });

  describe('exchangeCodeForTokens', () => {
    const mockTokens = {
      access_token: 'ya29.mock-google-access-token',
      refresh_token: 'mock-google-refresh-token',
      token_type: 'Bearer',
      expiry_date: Date.now() + 3600000, // 1 hour from now
      scope: 'https://www.googleapis.com/auth/admin.directory.user.readonly https://www.googleapis.com/auth/admin.directory.group.readonly',
      id_token: 'mock-google-id-token'
    };

    const mockUserInfo = {
      data: {
        id: '123456789012345678',
        email: 'admin@testcompany.com',
        name: 'Test Admin User',
        verified_email: true
      }
    };

    beforeEach(() => {
      mockOAuth2Client.getToken.mockResolvedValue({ tokens: mockTokens });
      
      const { google } = require('googleapis');
      const mockOAuth2Api = google.oauth2();
      mockOAuth2Api.userinfo.get.mockResolvedValue(mockUserInfo);
    });

    it('should exchange authorization code for tokens successfully', async () => {
      const code = 'mock-authorization-code';
      const result = await googleOAuthService.exchangeCodeForTokens(code);
      
      expect(mockOAuth2Client.getToken).toHaveBeenCalledWith(code);
      expect(result).toEqual({
        accessToken: mockTokens.access_token,
        refreshToken: mockTokens.refresh_token,
        tokenType: mockTokens.token_type,
        scope: mockTokens.scope.split(' '),
        expiresAt: new Date(mockTokens.expiry_date),
        idToken: mockTokens.id_token,
        userId: mockUserInfo.data.id,
        email: mockUserInfo.data.email,
        domain: 'testcompany.com'
      });
    });

    it('should handle missing access token error', async () => {
      mockOAuth2Client.getToken.mockResolvedValue({ 
        tokens: { ...mockTokens, access_token: undefined } 
      });
      
      await expect(googleOAuthService.exchangeCodeForTokens('test-code'))
        .rejects.toThrow('No access token received from Google OAuth');
    });

    it('should handle Google API errors during token exchange', async () => {
      mockOAuth2Client.getToken.mockRejectedValue(new Error('Google API error'));
      
      await expect(googleOAuthService.exchangeCodeForTokens('invalid-code'))
        .rejects.toThrow('Google OAuth token exchange failed: Google API error');
    });
  });

  describe('refreshTokens', () => {
    const mockRefreshResponse = {
      credentials: {
        access_token: 'ya29.new-google-access-token',
        token_type: 'Bearer',
        expiry_date: Date.now() + 3600000,
        scope: 'https://www.googleapis.com/auth/admin.directory.user.readonly'
      }
    };

    beforeEach(() => {
      mockOAuth2Client.refreshAccessToken.mockResolvedValue(mockRefreshResponse);
    });

    it('should refresh tokens successfully', async () => {
      const refreshToken = 'mock-refresh-token';
      const result = await googleOAuthService.refreshTokens(refreshToken);
      
      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
        refresh_token: refreshToken
      });
      expect(mockOAuth2Client.refreshAccessToken).toHaveBeenCalled();
      
      expect(result).toEqual({
        accessToken: mockRefreshResponse.credentials.access_token,
        refreshToken: refreshToken, // Should preserve original refresh token
        tokenType: 'Bearer',
        scope: ['https://www.googleapis.com/auth/admin.directory.user.readonly'],
        expiresAt: new Date(mockRefreshResponse.credentials.expiry_date)
      });
    });

    it('should handle refresh token errors', async () => {
      mockOAuth2Client.refreshAccessToken.mockRejectedValue(new Error('Invalid refresh token'));
      
      await expect(googleOAuthService.refreshTokens('invalid-refresh-token'))
        .rejects.toThrow('Google OAuth token refresh failed: Invalid refresh token');
    });
  });

  describe('getUserInfo', () => {
    it('should get workspace user information successfully', async () => {
      const mockUserData = {
        data: {
          id: '123456789012345678',
          email: 'admin@testcompany.com',
          name: 'Test Admin User'
        }
      };

      const { google } = require('googleapis');
      const mockOAuth2Api = google.oauth2();
      mockOAuth2Api.userinfo.get.mockResolvedValue(mockUserData);
      
      const result = await googleOAuthService.getUserInfo();
      
      expect(result).toEqual({
        id: '123456789012345678',
        email: 'admin@testcompany.com',
        name: 'Test Admin User',
        domain: 'testcompany.com',
        isAdmin: false,
        orgUnit: '/',
        lastLoginTime: expect.any(Date)
      });
    });

    it('should handle personal Gmail accounts correctly', async () => {
      const mockGmailUser = {
        data: {
          id: '987654321098765432',
          email: 'user@gmail.com',
          name: 'Personal User'
        }
      };

      const { google } = require('googleapis');
      const mockOAuth2Api = google.oauth2();
      mockOAuth2Api.userinfo.get.mockResolvedValue(mockGmailUser);
      
      const result = await googleOAuthService.getUserInfo();
      
      expect(result).toEqual({
        id: '987654321098765432',
        email: 'user@gmail.com',
        name: 'Personal User',
        domain: 'gmail.com',
        isAdmin: false,
        orgUnit: undefined, // No org unit for personal accounts
        lastLoginTime: expect.any(Date)
      });
    });

    it('should return null for API errors', async () => {
      const { google } = require('googleapis');
      const mockOAuth2Api = google.oauth2();
      mockOAuth2Api.userinfo.get.mockRejectedValue(new Error('API error'));
      
      const result = await googleOAuthService.getUserInfo();
      
      expect(result).toBeNull();
    });
  });

  describe('validateCredentials', () => {
    it('should validate correct Google OAuth credentials', async () => {
      const validCredentials: GoogleOAuthCredentials = {
        accessToken: 'ya29.valid-access-token',
        refreshToken: 'valid-refresh-token',
        tokenType: 'Bearer',
        scope: ['https://www.googleapis.com/auth/admin.directory.user.readonly'],
        expiresAt: new Date(Date.now() + 3600000),
        userId: '123456789012345678',
        email: 'admin@testcompany.com',
        domain: 'testcompany.com'
      };

      const mockUserData = {
        data: {
          id: '123456789012345678',
          email: 'admin@testcompany.com',
          name: 'Test Admin'
        }
      };

      const { google } = require('googleapis');
      const mockOAuth2Api = google.oauth2();
      mockOAuth2Api.userinfo.get.mockResolvedValue(mockUserData);
      
      const result = await googleOAuthService.validateCredentials(validCredentials);
      
      expect(result).toBe(true);
      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
        access_token: validCredentials.accessToken,
        refresh_token: validCredentials.refreshToken,
        token_type: validCredentials.tokenType
      });
    });

    it('should reject invalid credentials structure', async () => {
      const invalidCredentials = {
        accessToken: 'token',
        // Missing required fields
      } as any;
      
      const result = await googleOAuthService.validateCredentials(invalidCredentials);
      
      expect(result).toBe(false);
    });
  });

  describe('revokeTokens', () => {
    it('should revoke Google OAuth tokens successfully', async () => {
      mockOAuth2Client.revokeToken.mockResolvedValue(true);
      
      const result = await googleOAuthService.revokeTokens('test-access-token');
      
      expect(mockOAuth2Client.revokeToken).toHaveBeenCalledWith('test-access-token');
      expect(result).toBe(true);
    });

    it('should handle token revocation errors', async () => {
      mockOAuth2Client.revokeToken.mockRejectedValue(new Error('Revocation failed'));
      
      const result = await googleOAuthService.revokeTokens('invalid-token');
      
      expect(result).toBe(false);
    });
  });

  describe('Type Guards and Validation', () => {
    it('should validate Google OAuth credentials with type guard', () => {
      const validCredentials: GoogleOAuthCredentials = {
        accessToken: 'test-token',
        tokenType: 'Bearer',
        scope: ['test-scope']
      };
      
      expect(isValidGoogleOAuthCredentials(validCredentials)).toBe(true);
    });

    it('should reject invalid credentials with type guard', () => {
      const invalidCredentials = {
        accessToken: 'test-token',
        // Missing required tokenType and scope
      };
      
      expect(isValidGoogleOAuthCredentials(invalidCredentials)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should provide detailed error messages for OAuth failures', async () => {
      mockOAuth2Client.getToken.mockRejectedValue(new Error('invalid_grant'));
      
      await expect(googleOAuthService.exchangeCodeForTokens('expired-code'))
        .rejects.toThrow('Google OAuth token exchange failed: invalid_grant');
    });

    it('should handle network connectivity issues gracefully', async () => {
      mockOAuth2Client.getToken.mockRejectedValue(new Error('Network error'));
      
      await expect(googleOAuthService.exchangeCodeForTokens('test-code'))
        .rejects.toThrow('Google OAuth token exchange failed: Network error');
    });
  });

  describe('Security Validation', () => {
    it('should properly mask sensitive information in logs', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      googleOAuthService.generateAuthorizationUrl('sensitive-state-value');
      
      const logCalls = consoleSpy.mock.calls.find(call => 
        call[0] === 'Google OAuth Authorization URL generated:'
      );
      
      expect(logCalls).toBeDefined();
      if (logCalls) {
        expect(logCalls[1]).toEqual({
          scopes: mockConfig.scopes,
          accessType: 'offline',
          state: 'sensitiv...', // Should be masked
          includeGrantedScopes: true
        });
      }
      
      consoleSpy.mockRestore();
    });

    it('should validate workspace vs personal account detection', async () => {
      const workspaceUser = {
        data: {
          id: '123456789012345678',
          email: 'admin@company.com',
          name: 'Workspace Admin'
        }
      };

      const { google } = require('googleapis');
      const mockOAuth2Api = google.oauth2();
      mockOAuth2Api.userinfo.get.mockResolvedValue(workspaceUser);
      
      const result = await googleOAuthService.getUserInfo();
      
      expect(result?.domain).toBe('company.com');
      expect(result?.orgUnit).toBe('/'); // Should have org unit for workspace
    });
  });

  describe('Integration with Existing Architecture', () => {
    it('should follow same patterns as Slack OAuth service', () => {
      // Verify method signatures match established patterns
      expect(typeof googleOAuthService.generateAuthorizationUrl).toBe('function');
      expect(typeof googleOAuthService.exchangeCodeForTokens).toBe('function');
      expect(typeof googleOAuthService.refreshTokens).toBe('function');
      expect(typeof googleOAuthService.validateCredentials).toBe('function');
      expect(typeof googleOAuthService.revokeTokens).toBe('function');
    });

    it('should use shared-types interfaces consistently', () => {
      const config = googleOAuthService.getConfig();
      
      // Verify config structure matches GoogleOAuthConfig interface
      expect(config).toHaveProperty('clientId');
      expect(config).toHaveProperty('clientSecret');
      expect(config).toHaveProperty('redirectUri');
      expect(config).toHaveProperty('scopes');
      expect(Array.isArray(config.scopes)).toBe(true);
    });
  });
});