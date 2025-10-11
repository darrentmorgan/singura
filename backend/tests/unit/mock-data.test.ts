/**
 * Mock Data Generator Unit Tests
 * Tests the test data generation utilities
 * This test doesn't require database connectivity
 */

import { MockDataGenerator } from '../helpers/mock-data';
import { Platform, ConnectionStatus } from '@singura/shared-types';

describe('MockDataGenerator', () => {
  describe('createMockOrganization', () => {
    it('should create a valid mock organization', () => {
      const mockOrg = MockDataGenerator.createMockOrganization();
      
      expect(mockOrg).toBeDefined();
      expect(mockOrg.id).toBeDefined();
      expect(typeof mockOrg.id).toBe('string');
      expect(mockOrg.name).toContain('Test Organization');
      expect(mockOrg.domain).toContain('example.com');
      expect(mockOrg.slug).toContain('test-org');
      expect(mockOrg.is_active).toBe(true);
      expect(mockOrg.plan_tier).toBe('enterprise');
      expect(mockOrg.max_connections).toBe(100);
      expect(mockOrg.created_at).toBeInstanceOf(Date);
      expect(mockOrg.updated_at).toBeInstanceOf(Date);
    });

    it('should accept override values', () => {
      const overrides = {
        name: 'Custom Test Org',
        plan_tier: 'pro',
        max_connections: 50
      };
      
      const mockOrg = MockDataGenerator.createMockOrganization(overrides);
      
      expect(mockOrg.name).toBe('Custom Test Org');
      expect(mockOrg.plan_tier).toBe('pro');
      expect(mockOrg.max_connections).toBe(50);
    });

    it('should generate unique organization data', () => {
      const org1 = MockDataGenerator.createMockOrganization();
      const org2 = MockDataGenerator.createMockOrganization();
      
      expect(org1.id).not.toBe(org2.id);
      expect(org1.slug).not.toBe(org2.slug);
      expect(org1.domain).not.toBe(org2.domain);
    });
  });

  describe('createMockPlatformConnection', () => {
    const testOrgId = 'test-org-id';

    it('should create a valid platform connection', () => {
      const connection = MockDataGenerator.createMockPlatformConnection(testOrgId);
      
      expect(connection).toBeDefined();
      expect(connection.id).toBeDefined();
      expect(connection.organization_id).toBe(testOrgId);
      expect(['slack', 'google', 'microsoft']).toContain(connection.platform_type);
      expect(connection.status).toBe('connected');
      expect(connection.display_name).toContain('Test');
      expect(Array.isArray(connection.permissions_granted)).toBe(true);
      expect(connection.permissions_granted.length).toBeGreaterThan(0);
      expect(connection.created_at).toBeInstanceOf(Date);
      expect(connection.updated_at).toBeInstanceOf(Date);
    });

    it('should generate proper Slack workspace ID format', () => {
      const slackConnections = Array(10).fill(0).map(() => 
        MockDataGenerator.createMockPlatformConnection(testOrgId)
      ).filter(conn => conn.platform_type === 'slack');
      
      if (slackConnections.length > 0) {
        slackConnections.forEach(conn => {
          expect(conn.platform_workspace_id).toMatch(/^T\d+$/);
        });
      }
    });

    it('should accept override values', () => {
      const overrides = {
        platform_type: 'slack',
        status: 'error'
      };
      
      const connection = MockDataGenerator.createMockPlatformConnection(testOrgId, overrides);
      
      expect(connection.platform_type).toBe('slack');
      expect(connection.status).toBe('error');
    });
  });

  describe('createMockEncryptedCredential', () => {
    const testConnectionId = 'test-connection-id';

    it('should create valid access token credential', () => {
      const credential = MockDataGenerator.createMockEncryptedCredential(
        testConnectionId, 
        'access_token'
      );
      
      expect(credential).toBeDefined();
      expect(credential.id).toBeDefined();
      expect(credential.platform_connection_id).toBe(testConnectionId);
      expect(credential.credential_type).toBe('access_token');
      expect(credential.encrypted_value).toContain('encrypted_access_token');
      expect(credential.encryption_key_id).toBe('test-key-id');
      expect(credential.expires_at).toBeInstanceOf(Date);
      expect(credential.metadata.test).toBe(true);
      expect(credential.created_at).toBeInstanceOf(Date);
    });

    it('should create valid refresh token with longer expiry', () => {
      const credential = MockDataGenerator.createMockEncryptedCredential(
        testConnectionId, 
        'refresh_token'
      );
      
      expect(credential.credential_type).toBe('refresh_token');
      expect(credential.expires_at.getTime()).toBeGreaterThan(
        new Date(Date.now() + 24 * 60 * 60 * 1000).getTime() // More than 1 day
      );
    });

    it('should generate unique encrypted values', () => {
      const cred1 = MockDataGenerator.createMockEncryptedCredential(testConnectionId, 'access_token');
      const cred2 = MockDataGenerator.createMockEncryptedCredential(testConnectionId, 'access_token');
      
      expect(cred1.encrypted_value).not.toBe(cred2.encrypted_value);
      expect(cred1.id).not.toBe(cred2.id);
    });
  });

  describe('createMockAuditLog', () => {
    const testOrgId = 'test-org-id';
    const testConnectionId = 'test-connection-id';

    it('should create a valid audit log entry', () => {
      const auditLog = MockDataGenerator.createMockAuditLog(testOrgId, testConnectionId);
      
      expect(auditLog).toBeDefined();
      expect(auditLog.id).toBeDefined();
      expect(auditLog.organization_id).toBe(testOrgId);
      expect(auditLog.platform_connection_id).toBe(testConnectionId);
      expect(auditLog.event_type).toBeDefined();
      expect(['auth', 'connection', 'sync', 'error', 'admin']).toContain(auditLog.event_category);
      expect(auditLog.actor_id).toContain('user-');
      expect(auditLog.actor_type).toBe('user');
      expect(auditLog.resource_type).toBe('platform_connection');
      expect(auditLog.event_data).toBeDefined();
      expect(auditLog.event_data.test).toBe(true);
      expect(auditLog.created_at).toBeInstanceOf(Date);
    });

    it('should generate valid IP address format', () => {
      const auditLog = MockDataGenerator.createMockAuditLog(testOrgId);
      
      expect(auditLog.ip_address).toMatch(/^192\.168\.\d{1,3}\.\d{1,3}$/);
    });

    it('should generate valid user agent', () => {
      const auditLog = MockDataGenerator.createMockAuditLog(testOrgId);
      
      expect(auditLog.user_agent).toContain('Mozilla/5.0');
    });
  });

  describe('createMockOAuthState', () => {
    const testUserId = 'test-user-id';

    it('should create valid OAuth state for each platform', () => {
      const platforms: Platform[] = ['slack', 'google', 'microsoft'];
      
      platforms.forEach(platform => {
        const oauthState = MockDataGenerator.createMockOAuthState(testUserId, platform);
        
        expect(oauthState.state).toBeDefined();
        expect(oauthState.state.length).toBeGreaterThan(0);
        expect(oauthState.userId).toBe(testUserId);
        expect(oauthState.platform).toBe(platform);
        expect(oauthState.timestamp).toBeDefined();
        expect(oauthState.codeVerifier).toBeDefined();
        expect(oauthState.codeChallenge).toBeDefined();
        expect(oauthState.nonce).toBeDefined();
      });
    });

    it('should generate unique states', () => {
      const state1 = MockDataGenerator.createMockOAuthState(testUserId, 'slack');
      const state2 = MockDataGenerator.createMockOAuthState(testUserId, 'slack');
      
      expect(state1.state).not.toBe(state2.state);
      expect(state1.codeVerifier).not.toBe(state2.codeVerifier);
      expect(state1.nonce).not.toBe(state2.nonce);
    });
  });

  describe('createTestDataSet', () => {
    it('should create related test data set', () => {
      const dataSet = MockDataGenerator.createTestDataSet(2, 3);
      
      expect(dataSet.organizations).toHaveLength(2);
      expect(dataSet.connections).toHaveLength(6); // 2 orgs * 3 connections each
      expect(dataSet.credentials).toHaveLength(12); // 6 connections * 2 credentials each
      expect(dataSet.auditLogs).toHaveLength(6); // 1 per connection
      
      // Verify relationships
      dataSet.connections.forEach(conn => {
        const org = dataSet.organizations.find(o => o.id === conn.organization_id);
        expect(org).toBeDefined();
        
        const connCredentials = dataSet.credentials.filter(c => c.platform_connection_id === conn.id);
        expect(connCredentials).toHaveLength(2);
        
        const connAuditLog = dataSet.auditLogs.find(a => a.platform_connection_id === conn.id);
        expect(connAuditLog).toBeDefined();
      });
    });

    it('should use default values when no parameters provided', () => {
      const dataSet = MockDataGenerator.createTestDataSet();
      
      expect(dataSet.organizations).toHaveLength(1);
      expect(dataSet.connections).toHaveLength(2);
      expect(dataSet.credentials).toHaveLength(4);
      expect(dataSet.auditLogs).toHaveLength(2);
    });
  });

  describe('createSecurityTestScenarios', () => {
    it('should create comprehensive security test scenarios', () => {
      const scenarios = MockDataGenerator.createSecurityTestScenarios();
      
      expect(scenarios.sqlInjectionAttempts).toBeDefined();
      expect(scenarios.sqlInjectionAttempts.length).toBeGreaterThan(0);
      
      expect(scenarios.xssAttempts).toBeDefined();
      expect(scenarios.xssAttempts.length).toBeGreaterThan(0);
      
      expect(scenarios.invalidTokens).toBeDefined();
      expect(scenarios.invalidTokens.length).toBeGreaterThan(0);
      
      expect(scenarios.maliciousInputs).toBeDefined();
      expect(scenarios.maliciousInputs.length).toBeGreaterThan(0);
    });

    it('should include common SQL injection patterns', () => {
      const scenarios = MockDataGenerator.createSecurityTestScenarios();
      
      expect(scenarios.sqlInjectionAttempts.some(attempt => attempt.includes('DROP TABLE'))).toBe(true);
      expect(scenarios.sqlInjectionAttempts.some(attempt => attempt.includes('OR \'1\'=\'1'))).toBe(true);
      expect(scenarios.sqlInjectionAttempts.some(attempt => attempt.includes('UNION SELECT'))).toBe(true);
    });

    it('should include common XSS patterns', () => {
      const scenarios = MockDataGenerator.createSecurityTestScenarios();
      
      expect(scenarios.xssAttempts.some(attempt => attempt.includes('<script>'))).toBe(true);
      expect(scenarios.xssAttempts.some(attempt => attempt.includes('javascript:'))).toBe(true);
      expect(scenarios.xssAttempts.some(attempt => attempt.includes('onerror='))).toBe(true);
    });
  });
});