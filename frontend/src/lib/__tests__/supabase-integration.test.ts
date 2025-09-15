/**
 * Supabase Integration Tests
 * Validates database connectivity and CRUD operations
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { databaseService } from '../database-service';
import { supabase, healthCheck } from '../supabase';
import type { Organization, PlatformConnection } from '../../types/database';

describe('Supabase Integration', () => {
  let testOrganizationId: string;
  let testConnectionId: string;

  beforeAll(async () => {
    // Wait for database to be ready
    const health = await healthCheck();
    if (health.status !== 'healthy') {
      throw new Error(`Database not healthy: ${health.message}`);
    }
  });

  afterAll(async () => {
    // Clean up test data
    if (testConnectionId) {
      await databaseService.platformConnections.delete(testConnectionId);
    }
    if (testOrganizationId) {
      await databaseService.organizations.delete(testOrganizationId);
    }
  });

  describe('Database Connectivity', () => {
    it('should connect to Supabase successfully', async () => {
      const health = await healthCheck();
      expect(health.status).toBe('healthy');
    });

    it('should test all repository connectivity', async () => {
      const results = await databaseService.testConnectivity();
      expect(results.overall).toBe(true);
      expect(results.errors).toHaveLength(0);
    });

    it('should retrieve database statistics', async () => {
      const stats = await databaseService.getStatistics();
      expect(stats).toHaveProperty('organizations');
      expect(stats).toHaveProperty('connections');
      expect(stats).toHaveProperty('credentials');
      expect(stats).toHaveProperty('automations');
      expect(stats.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('Organization Repository', () => {
    it('should create a new organization', async () => {
      const testSlug = `test-org-${Date.now()}`;
      const organization = await databaseService.organizations.create({
        name: 'Test Organization',
        slug: testSlug,
        domain: 'test.com',
        settings: {
          default_timezone: 'UTC',
          notification_preferences: {
            email: true,
            slack: false
          }
        }
      });

      expect(organization).toBeDefined();
      expect(organization.name).toBe('Test Organization');
      expect(organization.slug).toBe(testSlug);
      expect(organization.is_active).toBe(true);
      
      testOrganizationId = organization.id;
    });

    it('should find organization by ID', async () => {
      const organization = await databaseService.organizations.findById(testOrganizationId);
      expect(organization).toBeDefined();
      expect(organization?.id).toBe(testOrganizationId);
    });

    it('should find organization by slug', async () => {
      const organization = await databaseService.organizations.findById(testOrganizationId);
      if (!organization) throw new Error('Test organization not found');

      const foundBySlug = await databaseService.organizations.findBySlug(organization.slug);
      expect(foundBySlug).toBeDefined();
      expect(foundBySlug?.id).toBe(testOrganizationId);
    });

    it('should update organization settings', async () => {
      const updatedSettings = {
        default_timezone: 'America/New_York',
        notification_preferences: {
          email: false,
          slack: true
        }
      };

      const updated = await databaseService.organizations.updateSettings(
        testOrganizationId,
        updatedSettings
      );

      expect(updated).toBeDefined();
      expect(updated?.settings.default_timezone).toBe('America/New_York');
      expect(updated?.settings.notification_preferences?.slack).toBe(true);
    });

    it('should validate active organization', async () => {
      const isActive = await databaseService.organizations.validateActiveOrganization(testOrganizationId);
      expect(isActive).toBe(true);
    });
  });

  describe('Platform Connection Repository', () => {
    it('should create a new platform connection', async () => {
      const connection = await databaseService.platformConnections.create({
        organization_id: testOrganizationId,
        platform_type: 'slack',
        platform_user_id: 'U123456789',
        platform_workspace_id: 'T123456789',
        display_name: 'Test Slack Workspace',
        status: 'active',
        permissions_granted: ['channels:read', 'users:read'],
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        metadata: {
          platformSpecific: {
            slack: {
              team_id: 'T123456789',
              team_name: 'Test Team',
              user_id: 'U123456789',
              scope: 'channels:read,users:read'
            }
          }
        }
      });

      expect(connection).toBeDefined();
      expect(connection.platform_type).toBe('slack');
      expect(connection.status).toBe('active');
      expect(connection.permissions_granted).toContain('channels:read');
      
      testConnectionId = connection.id;
    });

    it('should find connections by organization', async () => {
      const connections = await databaseService.platformConnections.findByOrganizationId(testOrganizationId);
      expect(connections).toHaveLength(1);
      expect(connections[0].id).toBe(testConnectionId);
    });

    it('should find connection by platform user', async () => {
      const connection = await databaseService.platformConnections.findByPlatformUser(
        testOrganizationId,
        'slack',
        'U123456789'
      );
      expect(connection).toBeDefined();
      expect(connection?.id).toBe(testConnectionId);
    });

    it('should update connection sync status', async () => {
      const updated = await databaseService.platformConnections.updateSyncStatus(
        testConnectionId,
        'active',
        new Date(),
        null
      );

      expect(updated).toBeDefined();
      expect(updated?.status).toBe('active');
      expect(updated?.last_error).toBeNull();
    });

    it('should validate connection permissions', async () => {
      const validation = await databaseService.platformConnections.validatePermissions(
        testConnectionId,
        ['channels:read', 'users:read']
      );

      expect(validation.valid).toBe(true);
      expect(validation.missing).toHaveLength(0);

      const invalidValidation = await databaseService.platformConnections.validatePermissions(
        testConnectionId,
        ['channels:write', 'admin']
      );

      expect(invalidValidation.valid).toBe(false);
      expect(invalidValidation.missing).toContain('channels:write');
      expect(invalidValidation.missing).toContain('admin');
    });
  });

  describe('Encrypted Credentials Repository', () => {
    it('should store OAuth tokens securely', async () => {
      const result = await databaseService.encryptedCredentials.storeOAuthTokens(
        testConnectionId,
        'test-access-token',
        'test-refresh-token',
        new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      );

      expect(result.accessTokenRecord).toBeDefined();
      expect(result.refreshTokenRecord).toBeDefined();
      expect(result.accessTokenRecord.credential_type).toBe('access_token');
      expect(result.refreshTokenRecord?.credential_type).toBe('refresh_token');
    });

    it('should find credentials by connection', async () => {
      const credentials = await databaseService.encryptedCredentials.findByConnection(testConnectionId);
      expect(credentials.length).toBeGreaterThanOrEqual(2); // access + refresh tokens
    });

    it('should get access token for connection', async () => {
      const accessToken = await databaseService.encryptedCredentials.getAccessToken(testConnectionId);
      expect(accessToken).toBeDefined();
      expect(accessToken?.credential_type).toBe('access_token');
    });

    it('should update usage statistics', async () => {
      const accessToken = await databaseService.encryptedCredentials.getAccessToken(testConnectionId);
      if (!accessToken) throw new Error('Access token not found');

      const updated = await databaseService.encryptedCredentials.updateUsageStats(accessToken.id);
      expect(updated).toBeDefined();
      expect(updated?.metadata?.usage?.requestCount).toBeGreaterThan(0);
    });
  });

  describe('Data Integrity', () => {
    it('should validate data integrity', async () => {
      const validation = await databaseService.validateDataIntegrity(testOrganizationId);
      expect(validation).toHaveProperty('valid');
      expect(validation).toHaveProperty('issues');
      expect(validation).toHaveProperty('recommendations');
    });

    it('should get organization dashboard data', async () => {
      const dashboard = await databaseService.getOrganizationDashboard(testOrganizationId);
      expect(dashboard).toHaveProperty('organization');
      expect(dashboard).toHaveProperty('statistics');
      expect(dashboard).toHaveProperty('connections');
      expect(dashboard.connections).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent organization gracefully', async () => {
      const nonExistent = await databaseService.organizations.findById('non-existent-id');
      expect(nonExistent).toBeNull();
    });

    it('should handle validation errors properly', async () => {
      await expect(
        databaseService.organizations.create({
          name: '',
          slug: ''
        } as any)
      ).rejects.toThrow();
    });

    it('should handle update of non-existent record gracefully', async () => {
      const result = await databaseService.organizations.update('non-existent-id', {
        name: 'Updated Name'
      });
      expect(result).toBeNull();
    });
  });
});