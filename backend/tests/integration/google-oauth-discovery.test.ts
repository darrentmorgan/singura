/**
 * Integration test for Google OAuth credential storage and discovery flow
 * Tests the complete flow from OAuth callback to discovery service credential retrieval
 *
 * CRITICAL FIX VALIDATION:
 * - Verifies credentials stored in BOTH database AND singleton cache
 * - Ensures discovery service can retrieve credentials after OAuth completion
 * - Validates dual storage architecture pattern
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { oauthService } from '../../src/services/oauth-service';
import { oauthCredentialStorage } from '../../src/services/oauth-credential-storage-service';
import { platformConnectionRepository } from '../../src/database/repositories/platform-connection';
import { encryptedCredentialRepository } from '../../src/database/repositories/encrypted-credential';
import { pool } from '../../src/database';
import type { Request } from 'express';

describe('Google OAuth Discovery Integration', () => {
  const testOrganizationId = 'test-org-' + Date.now();
  const testUserId = 'test-user-' + Date.now();
  const testConnectionId = 'test-connection-' + Date.now();

  // Mock OAuth tokens from Google
  const mockTokens = {
    access_token: 'ya29.test_access_token_' + Date.now(),
    refresh_token: 'test_refresh_token_' + Date.now(),
    token_type: 'Bearer',
    expires_in: 3600,
    scope: 'https://www.googleapis.com/auth/admin.directory.user.readonly https://www.googleapis.com/auth/admin.reports.audit.readonly'
  };

  const mockUserInfo = {
    id: 'google-user-' + Date.now(),
    email: 'test@example.com',
    name: 'Test User',
    domain: 'example.com'
  };

  let createdConnectionId: string | null = null;

  beforeAll(async () => {
    // Ensure database connection
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✅ Database connection established for integration test');
  });

  afterAll(async () => {
    // Cleanup: Delete test connection and credentials
    if (createdConnectionId) {
      try {
        await encryptedCredentialRepository.deleteByConnection(createdConnectionId);
        await platformConnectionRepository.delete(createdConnectionId);
        console.log('✅ Test data cleaned up');
      } catch (error) {
        console.warn('⚠️  Cleanup warning:', error);
      }
    }

    // Close database connection
    await pool.end();
    console.log('✅ Database connection closed');
  });

  beforeEach(() => {
    // Clear singleton cache before each test
    const debugInfo = oauthCredentialStorage.getDebugInfo();
    console.log(`🔍 Singleton cache state before test:`, debugInfo);
  });

  afterEach(() => {
    // Log singleton cache state after each test
    const debugInfo = oauthCredentialStorage.getDebugInfo();
    console.log(`🔍 Singleton cache state after test:`, debugInfo);
  });

  describe('OAuth Callback Flow', () => {
    test('should store credentials in both database and singleton cache after OAuth callback', async () => {
      // Mock Request object for OAuth service
      const mockRequest = {
        query: {
          code: 'test_authorization_code',
          state: 'test_state_value'
        },
        headers: {
          'user-agent': 'Test/1.0',
          'x-forwarded-for': '127.0.0.1'
        },
        ip: '127.0.0.1'
      } as unknown as Request;

      // Step 1: Create platform connection manually (simulating OAuth callback)
      const connection = await platformConnectionRepository.create({
        organization_id: testOrganizationId,
        platform_type: 'google',
        platform_user_id: mockUserInfo.id,
        platform_workspace_id: mockUserInfo.domain,
        display_name: `Google - ${mockUserInfo.name} (${mockUserInfo.domain})`,
        status: 'pending',
        permissions_granted: mockTokens.scope.split(' '),
        metadata: {
          email: mockUserInfo.email,
          domain: mockUserInfo.domain,
          tokenType: mockTokens.token_type,
          scope: mockTokens.scope,
          connectedAt: new Date().toISOString()
        }
      });

      createdConnectionId = connection.id;
      console.log(`✅ Created test connection: ${createdConnectionId}`);

      // Step 2: Manually trigger token storage (this is what completeOAuthFlow does)
      // This tests the storeOAuthTokens method directly
      const oauthServicePrivate = oauthService as any;
      await oauthServicePrivate.storeOAuthTokens(connection.id, mockTokens);

      // Step 3: Verify credentials stored in DATABASE
      const dbCredential = await encryptedCredentialRepository.findByConnectionAndType(
        connection.id,
        'access_token'
      );
      expect(dbCredential).toBeDefined();
      expect(dbCredential).not.toBeNull();
      console.log(`✅ Verified credentials in database for: ${connection.id}`);

      // Step 4: CRITICAL - Verify credentials stored in SINGLETON CACHE
      const cachedCredentials = await oauthCredentialStorage.retrieveCredentials(connection.id);
      expect(cachedCredentials).not.toBeNull();
      expect(cachedCredentials?.accessToken).toBe(mockTokens.access_token);
      expect(cachedCredentials?.refreshToken).toBe(mockTokens.refresh_token);
      expect(cachedCredentials?.email).toBe(mockUserInfo.email);
      expect(cachedCredentials?.domain).toBe(mockUserInfo.domain);
      expect(cachedCredentials?.organizationId).toBe(testOrganizationId);
      console.log(`✅ Verified credentials in singleton cache for: ${connection.id}`);

      // Step 5: Verify singleton cache debug info shows the connection
      const debugInfo = oauthCredentialStorage.getDebugInfo();
      expect(debugInfo.storedConnections).toBeGreaterThan(0);
      expect(debugInfo.connectionIds).toContain(connection.id);
      console.log(`✅ Singleton cache contains connection: ${connection.id}`);
    }, 30000);
  });

  describe('Discovery Service Credential Retrieval', () => {
    test('should retrieve credentials from singleton cache for discovery', async () => {
      // Assumes previous test created connection and stored credentials
      expect(createdConnectionId).not.toBeNull();

      if (!createdConnectionId) {
        throw new Error('Test setup failed: no connection created');
      }

      // Step 1: Discovery service retrieves credentials (simulating real discovery flow)
      const credentials = await oauthCredentialStorage.getValidCredentials(createdConnectionId);

      // Step 2: Verify credentials are valid and complete
      expect(credentials).not.toBeNull();
      expect(credentials?.accessToken).toBeTruthy();
      expect(credentials?.refreshToken).toBeTruthy();
      expect(credentials?.email).toBe(mockUserInfo.email);
      expect(credentials?.domain).toBe(mockUserInfo.domain);
      expect(credentials?.organizationId).toBe(testOrganizationId);

      console.log(`✅ Discovery service successfully retrieved credentials for: ${createdConnectionId}`);

      // Step 3: Verify no "Request is missing required authentication credential" error
      // This would be thrown by Google API client if credentials were invalid
      expect(credentials?.accessToken).toMatch(/^ya29\./); // Google access tokens start with ya29.
      console.log(`✅ Credentials have valid format for Google Workspace API`);
    }, 30000);

    test('should load credentials from database into cache if not in memory', async () => {
      expect(createdConnectionId).not.toBeNull();

      if (!createdConnectionId) {
        throw new Error('Test setup failed: no connection created');
      }

      // Step 1: Clear singleton cache to simulate server restart
      await oauthCredentialStorage.revokeCredentials(createdConnectionId);

      const debugInfoBefore = oauthCredentialStorage.getDebugInfo();
      expect(debugInfoBefore.connectionIds).not.toContain(createdConnectionId);
      console.log(`✅ Singleton cache cleared for: ${createdConnectionId}`);

      // Step 2: Retrieve credentials (should load from database into cache)
      const credentials = await oauthCredentialStorage.retrieveCredentials(createdConnectionId);

      // Step 3: Verify credentials loaded from database
      expect(credentials).not.toBeNull();
      expect(credentials?.accessToken).toBeTruthy();
      expect(credentials?.email).toBe(mockUserInfo.email);
      console.log(`✅ Credentials loaded from database into cache: ${createdConnectionId}`);

      // Step 4: Verify now in cache
      const debugInfoAfter = oauthCredentialStorage.getDebugInfo();
      expect(debugInfoAfter.connectionIds).toContain(createdConnectionId);
      console.log(`✅ Singleton cache now contains connection: ${createdConnectionId}`);
    }, 30000);
  });

  describe('Token Refresh Flow', () => {
    test('should update credentials in both database and singleton cache on refresh', async () => {
      expect(createdConnectionId).not.toBeNull();

      if (!createdConnectionId) {
        throw new Error('Test setup failed: no connection created');
      }

      // Step 1: Get current credentials
      const beforeCredentials = await oauthCredentialStorage.retrieveCredentials(createdConnectionId);
      expect(beforeCredentials).not.toBeNull();

      const oldAccessToken = beforeCredentials?.accessToken;
      console.log(`🔍 Old access token prefix: ${oldAccessToken?.substring(0, 10)}...`);

      // Step 2: Simulate token refresh by updating tokens
      const newTokens = {
        access_token: 'ya29.new_refreshed_token_' + Date.now(),
        refresh_token: mockTokens.refresh_token, // Refresh token might not rotate
        token_type: 'Bearer',
        expires_in: 3600,
        scope: mockTokens.scope
      };

      const oauthServicePrivate = oauthService as any;
      const newExpiresAt = new Date(Date.now() + 3600 * 1000);
      await oauthServicePrivate.updateOAuthTokens(createdConnectionId, newTokens, newExpiresAt);

      // Step 3: Verify updated in DATABASE
      const dbCredential = await encryptedCredentialRepository.findByConnectionAndType(
        createdConnectionId,
        'access_token'
      );
      expect(dbCredential).toBeDefined();
      console.log(`✅ Credentials updated in database`);

      // Step 4: CRITICAL - Verify updated in SINGLETON CACHE
      const afterCredentials = await oauthCredentialStorage.retrieveCredentials(createdConnectionId);
      expect(afterCredentials).not.toBeNull();
      expect(afterCredentials?.accessToken).toBe(newTokens.access_token);
      expect(afterCredentials?.accessToken).not.toBe(oldAccessToken);
      console.log(`✅ Credentials updated in singleton cache with new token: ${afterCredentials?.accessToken?.substring(0, 10)}...`);
    }, 30000);
  });

  describe('Dual Storage Architecture Validation', () => {
    test('should maintain consistency between database and singleton cache', async () => {
      expect(createdConnectionId).not.toBeNull();

      if (!createdConnectionId) {
        throw new Error('Test setup failed: no connection created');
      }

      // Step 1: Get credentials from database
      const dbAccessToken = await encryptedCredentialRepository.getDecryptedValue(
        createdConnectionId,
        'access_token'
      );
      expect(dbAccessToken).toBeTruthy();

      // Step 2: Get credentials from singleton cache
      const cacheCredentials = await oauthCredentialStorage.retrieveCredentials(createdConnectionId);
      expect(cacheCredentials).not.toBeNull();

      // Step 3: Parse database credentials (stored as complete object JSON)
      const parsedDbCreds = JSON.parse(dbAccessToken!);

      // Step 4: CRITICAL - Verify both sources have SAME access token
      expect(cacheCredentials?.accessToken).toBe(parsedDbCreds.accessToken);
      console.log(`✅ Database and singleton cache have consistent access tokens`);

      // Step 5: Verify metadata consistency
      expect(cacheCredentials?.email).toBe(parsedDbCreds.email);
      expect(cacheCredentials?.domain).toBe(parsedDbCreds.domain);
      expect(cacheCredentials?.organizationId).toBe(parsedDbCreds.organizationId);
      console.log(`✅ Database and singleton cache have consistent metadata`);
    }, 30000);
  });
});
