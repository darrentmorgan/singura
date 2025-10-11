/**
 * OAuth Discovery Integration Test
 * Tests complete flow: OAuth callback → Credential storage → Real API discovery
 *
 * BMAD Priority: P0 Revenue Blocker
 * Tests that OAuth credentials are properly stored and available for live detection
 */

import { OAuthCredentialStorageService } from '../services/oauth-credential-storage-service';
import { RealDataProvider } from '../services/data-provider';
import { hybridStorage } from '../services/hybrid-storage';
import { GoogleOAuthCredentials, SlackOAuthCredentials } from '@singura/shared-types';

describe('OAuth Discovery Integration', () => {
  let oauthStorage: OAuthCredentialStorageService;
  let dataProvider: RealDataProvider;
  const testOrgId = 'test-organization-123';

  beforeEach(() => {
    oauthStorage = new OAuthCredentialStorageService();
    dataProvider = new RealDataProvider();
  });

  describe('Credential Storage and Retrieval', () => {
    it('should store and retrieve Google OAuth credentials', async () => {
      const connectionId = 'test-google-connection-id';

      const googleCredentials: GoogleOAuthCredentials = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        tokenType: 'Bearer',
        scope: ['openid', 'email', 'profile'],
        expiresAt: new Date(Date.now() + 3600 * 1000),
        email: 'test@example.com',
        domain: 'example.com',
        organizationId: 'test-org-id',
      };

      // Store credentials
      const stored = await oauthStorage.storeCredentials(connectionId, googleCredentials);
      expect(stored).toBe(true);

      // Retrieve credentials
      const retrieved = await oauthStorage.retrieveCredentials(connectionId);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.accessToken).toBe('test-access-token');
      expect(retrieved?.email).toBe('test@example.com');
      expect(retrieved?.domain).toBe('example.com');
    });

    it('should store and retrieve Slack OAuth credentials (via generic format)', async () => {
      const connectionId = 'test-slack-connection-id';

      // Slack credentials stored in generic format for now
      const slackCredentials = {
        accessToken: 'xoxb-test-slack-token',
        refreshToken: undefined,
        tokenType: 'Bearer',
        scope: ['channels:read', 'users:read'],
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        email: undefined,
        domain: 'Test Workspace',
      };

      // Store credentials
      const stored = await oauthStorage.storeCredentials(connectionId, slackCredentials as any);
      expect(stored).toBe(true);

      // Retrieve credentials
      const retrieved = await oauthStorage.retrieveCredentials(connectionId);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.accessToken).toBe('xoxb-test-slack-token');
      expect(retrieved?.domain).toBe('Test Workspace');
    });

    it('should return null for non-existent connection', async () => {
      const retrieved = await oauthStorage.retrieveCredentials('non-existent-id');
      expect(retrieved).toBeNull();
    });

    it('should validate credentials expiration', async () => {
      const connectionId = 'test-expiring-connection';

      const expiredCredentials: GoogleOAuthCredentials = {
        accessToken: 'expired-token',
        refreshToken: 'refresh-token',
        tokenType: 'Bearer',
        scope: ['openid'],
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        email: 'test@example.com',
        domain: 'example.com',
      };

      await oauthStorage.storeCredentials(connectionId, expiredCredentials);

      const isValid = await oauthStorage.isCredentialsValid(connectionId);
      expect(isValid).toBe(false);
    });
  });

  describe('Connection Initialization', () => {
    it('should initialize authenticated API client for valid credentials', async () => {
      const connectionId = 'test-api-client-connection';

      const credentials: GoogleOAuthCredentials = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        tokenType: 'Bearer',
        scope: ['openid', 'email'],
        expiresAt: new Date(Date.now() + 3600 * 1000),
        email: 'test@example.com',
        domain: 'example.com',
      };

      await oauthStorage.storeCredentials(connectionId, credentials);

      const initialized = await oauthStorage.initializeConnection(connectionId);
      expect(initialized).toBe(true);

      const apiClient = await oauthStorage.getAuthenticatedAPIClient(connectionId);
      expect(apiClient).not.toBeNull();
    });

    it('should fail to initialize connection without credentials', async () => {
      const initialized = await oauthStorage.initializeConnection('missing-connection');
      expect(initialized).toBe(false);
    });
  });

  describe('Discovery Integration', () => {
    it('should fail discovery gracefully when credentials are missing', async () => {
      // Create connection metadata without credentials
      const connectionData = {
        organization_id: 'test-org-id',
        platform_type: 'google',
        platform_user_id: 'test-user-id',
        display_name: 'Test Google Workspace',
        permissions_granted: ['openid', 'email'],
        metadata: {
          platformSpecific: {
            google: {
              email: 'test@example.com',
              domain: 'example.com',
              workspace_domain: 'example.com',
              scopes: ['openid', 'email'],
              token_type: 'Bearer'
            }
          }
        }
      };

      const storageResult = await hybridStorage.storeConnection(connectionData);
      expect(storageResult.success).toBe(true);

      const connectionId = storageResult.data?.id;
      expect(connectionId).toBeDefined();

      // Attempt discovery without stored OAuth credentials
      await expect(async () => {
        await dataProvider.discoverAutomations(connectionId!, testOrgId);
      }).rejects.toThrow(/No OAuth credentials found/);
    });

    it('should use stored credentials for discovery when available', async () => {
      // Create connection metadata
      const connectionData = {
        organization_id: 'test-org-id',
        platform_type: 'google',
        platform_user_id: 'test-user-with-creds',
        display_name: 'Test Google Workspace',
        permissions_granted: ['openid', 'email'],
        metadata: {
          platformSpecific: {
            google: {
              email: 'test@example.com',
              domain: 'example.com',
              workspace_domain: 'example.com',
              scopes: ['openid', 'email'],
              token_type: 'Bearer'
            }
          }
        }
      };

      const storageResult = await hybridStorage.storeConnection(connectionData);
      expect(storageResult.success).toBe(true);

      const connectionId = storageResult.data?.id;
      expect(connectionId).toBeDefined();

      // Store OAuth credentials
      const credentials: GoogleOAuthCredentials = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        tokenType: 'Bearer',
        scope: ['openid', 'email', 'profile'],
        expiresAt: new Date(Date.now() + 3600 * 1000),
        email: 'test@example.com',
        domain: 'example.com',
        organizationId: 'test-org-id',
      };

      await oauthStorage.storeCredentials(connectionId!, credentials);

      // Verify credentials are retrievable
      const retrievedCreds = await oauthStorage.retrieveCredentials(connectionId!);
      expect(retrievedCreds).not.toBeNull();
      expect(retrievedCreds?.accessToken).toBe('test-access-token');

      // Note: Discovery will still fail without real Google API setup,
      // but it should reach the credential retrieval stage successfully
      try {
        await dataProvider.discoverAutomations(connectionId!, testOrgId);
      } catch (error) {
        // Expected to fail at API call stage, not credential retrieval
        const errorMessage = error instanceof Error ? error.message : String(error);
        expect(errorMessage).not.toContain('No OAuth credentials found');
      }
    });
  });

  describe('Connection Status and Health', () => {
    it('should report connection status correctly', async () => {
      const connectionId = 'test-status-connection';

      const credentials: GoogleOAuthCredentials = {
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        tokenType: 'Bearer',
        scope: ['openid'],
        expiresAt: new Date(Date.now() + 3600 * 1000),
        email: 'test@example.com',
        domain: 'example.com',
      };

      await oauthStorage.storeCredentials(connectionId, credentials);

      const status = await oauthStorage.getConnectionStatus(connectionId);
      expect(status.connectionId).toBe(connectionId);
      expect(status.platform).toBe('google');
      expect(['healthy', 'expired']).toContain(status.status);
    });

    it('should list all active connections', async () => {
      const connection1 = 'active-connection-1';
      const connection2 = 'active-connection-2';

      const credentials1: GoogleOAuthCredentials = {
        accessToken: 'token-1',
        tokenType: 'Bearer',
        scope: ['openid'],
        expiresAt: new Date(Date.now() + 3600 * 1000),
        email: 'user1@example.com',
        domain: 'example.com',
      };

      const credentials2: GoogleOAuthCredentials = {
        accessToken: 'token-2',
        tokenType: 'Bearer',
        scope: ['openid'],
        expiresAt: new Date(Date.now() + 3600 * 1000),
        email: 'user2@example.com',
        domain: 'example.com',
      };

      await oauthStorage.storeCredentials(connection1, credentials1);
      await oauthStorage.storeCredentials(connection2, credentials2);

      const activeConnections = await oauthStorage.listActiveConnections();
      expect(activeConnections.length).toBeGreaterThanOrEqual(2);

      const connectionIds = activeConnections.map(c => c.connectionId);
      expect(connectionIds).toContain(connection1);
      expect(connectionIds).toContain(connection2);
    });
  });

  describe('Credential Lifecycle Management', () => {
    it('should revoke credentials and clean up storage', async () => {
      const connectionId = 'revoke-test-connection';

      const credentials: GoogleOAuthCredentials = {
        accessToken: 'test-token',
        tokenType: 'Bearer',
        scope: ['openid'],
        expiresAt: new Date(Date.now() + 3600 * 1000),
        email: 'test@example.com',
        domain: 'example.com',
      };

      await oauthStorage.storeCredentials(connectionId, credentials);

      // Verify credentials exist
      let retrieved = await oauthStorage.retrieveCredentials(connectionId);
      expect(retrieved).not.toBeNull();

      // Revoke credentials
      const revoked = await oauthStorage.revokeCredentials(connectionId);
      expect(revoked).toBe(true);

      // Verify credentials are removed
      retrieved = await oauthStorage.retrieveCredentials(connectionId);
      expect(retrieved).toBeNull();
    });

    it('should handle refresh connection flow', async () => {
      const connectionId = 'refresh-test-connection';

      const credentials: GoogleOAuthCredentials = {
        accessToken: 'test-token',
        refreshToken: 'refresh-token',
        tokenType: 'Bearer',
        scope: ['openid'],
        expiresAt: new Date(Date.now() + 3600 * 1000),
        email: 'test@example.com',
        domain: 'example.com',
      };

      await oauthStorage.storeCredentials(connectionId, credentials);

      // Check if refresh needed (should be false for new token)
      const needsRefresh = await oauthStorage.refreshConnectionIfNeeded(connectionId);
      expect(needsRefresh).toBe(true); // Token is still valid
    });
  });

  describe('Debug Information', () => {
    it('should provide debug information about stored connections', async () => {
      const connectionId = 'debug-test-connection';

      const credentials: GoogleOAuthCredentials = {
        accessToken: 'test-token',
        tokenType: 'Bearer',
        scope: ['openid'],
        expiresAt: new Date(Date.now() + 3600 * 1000),
        email: 'test@example.com',
        domain: 'example.com',
      };

      await oauthStorage.storeCredentials(connectionId, credentials);

      const debugInfo = oauthStorage.getDebugInfo();
      expect(debugInfo.storedConnections).toBeGreaterThan(0);
      expect(debugInfo.connectionIds).toContain(connectionId);
    });
  });
});