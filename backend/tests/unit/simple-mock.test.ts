/**
 * Simple Mock Data Generator Test
 * Basic test to verify test infrastructure
 */

import { MockDataGenerator } from '../helpers/mock-data';

describe('MockDataGenerator Basic Tests', () => {
  describe('createMockOrganization', () => {
    it('should create a mock organization', () => {
      const mockOrg = MockDataGenerator.createMockOrganization();
      
      expect(mockOrg).toBeDefined();
      expect(typeof mockOrg.id).toBe('string');
      expect(typeof mockOrg.name).toBe('string');
      expect(mockOrg.name).toContain('Test Organization');
      expect(mockOrg.is_active).toBe(true);
    });

    it('should accept override values', () => {
      const overrides = {
        name: 'Custom Test Org',
        plan_tier: 'pro'
      };
      
      const mockOrg = MockDataGenerator.createMockOrganization(overrides);
      
      expect(mockOrg.name).toBe('Custom Test Org');
      expect(mockOrg.plan_tier).toBe('pro');
    });
  });

  describe('createMockPlatformConnection', () => {
    it('should create a platform connection', () => {
      const testOrgId = 'test-org-id';
      const connection = MockDataGenerator.createMockPlatformConnection(testOrgId);
      
      expect(connection).toBeDefined();
      expect(connection.organization_id).toBe(testOrgId);
      expect(['slack', 'google', 'microsoft']).toContain(connection.platform_type);
      expect(connection.status).toBe('connected');
    });
  });

  describe('createMockEncryptedCredential', () => {
    it('should create encrypted credential', () => {
      const testConnectionId = 'test-connection-id';
      const credential = MockDataGenerator.createMockEncryptedCredential(
        testConnectionId, 
        'access_token'
      );
      
      expect(credential).toBeDefined();
      expect(credential.platform_connection_id).toBe(testConnectionId);
      expect(credential.credential_type).toBe('access_token');
      expect(credential.encrypted_value).toContain('encrypted_access_token');
    });
  });

  describe('createTestDataSet', () => {
    it('should create related test data', () => {
      const dataSet = MockDataGenerator.createTestDataSet(1, 2);
      
      expect(dataSet.organizations).toHaveLength(1);
      expect(dataSet.connections).toHaveLength(2);
      expect(dataSet.credentials).toHaveLength(4); // 2 connections * 2 creds each
      expect(dataSet.auditLogs).toHaveLength(2); // 1 per connection
    });
  });
});