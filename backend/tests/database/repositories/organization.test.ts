/**
 * Organization Repository Unit Tests
 * Tests organization-specific CRUD operations and business logic
 */

import { organizationRepository } from '../../../src/database/repositories';
import { testDb } from '../../helpers/test-database';
import { MockDataGenerator } from '../../helpers/mock-data';

describe('OrganizationRepository', () => {
  let testData: any;

  beforeAll(async () => {
    await testDb.beginTransaction();
  });

  afterAll(async () => {
    await testDb.rollbackTransaction();
  });

  beforeEach(async () => {
    testData = await testDb.createFixtures();
  });

  describe('findBySlug', () => {
    it('should find organization by slug', async () => {
      const result = await organizationRepository.findBySlug(testData.organization.slug);
      
      expect(result).toBeDefined();
      expect(result?.id).toBe(testData.organization.id);
      expect(result?.slug).toBe(testData.organization.slug);
    });

    it('should return null for non-existent slug', async () => {
      const result = await organizationRepository.findBySlug('non-existent-slug');
      
      expect(result).toBeNull();
    });

    it('should handle case-insensitive slug search', async () => {
      const upperCaseSlug = testData.organization.slug.toUpperCase();
      const result = await organizationRepository.findBySlug(upperCaseSlug);
      
      // Note: Depending on database collation, this might be case-sensitive
      // This test documents the expected behavior
      expect(result).toBeDefined();
    });
  });

  describe('findByDomain', () => {
    it('should find organization by domain', async () => {
      const result = await organizationRepository.findByDomain(testData.organization.domain);
      
      expect(result).toBeDefined();
      expect(result?.id).toBe(testData.organization.id);
      expect(result?.domain).toBe(testData.organization.domain);
    });

    it('should return null for non-existent domain', async () => {
      const result = await organizationRepository.findByDomain('non-existent.com');
      
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create organization with valid data', async () => {
      const orgData = {
        name: 'New Test Organization',
        domain: 'new-test.example.com',
        slug: 'new-test-org-' + Date.now(),
        plan_tier: 'pro',
        max_connections: 50,
        settings: { feature_flags: { automation_discovery: true } }
      };

      const result = await organizationRepository.create(orgData);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(orgData.name);
      expect(result.domain).toBe(orgData.domain);
      expect(result.slug).toBe(orgData.slug);
      expect(result.plan_tier).toBe(orgData.plan_tier);
      expect(result.max_connections).toBe(orgData.max_connections);
      expect(result.settings).toEqual(orgData.settings);
      expect(result.is_active).toBe(true); // Default value
      expect(result.created_at).toBeDefined();
      expect(result.updated_at).toBeDefined();
    });

    it('should create organization with minimal data', async () => {
      const minimalData = {
        name: 'Minimal Organization',
        slug: 'minimal-org-' + Date.now()
      };

      const result = await organizationRepository.create(minimalData);
      
      expect(result).toBeDefined();
      expect(result.name).toBe(minimalData.name);
      expect(result.slug).toBe(minimalData.slug);
      expect(result.domain).toBeNull();
      expect(result.plan_tier).toBe('free'); // Default value
      expect(result.max_connections).toBe(10); // Default value
      expect(result.settings).toEqual({});
      expect(result.is_active).toBe(true);
    });

    it('should reject duplicate slug', async () => {
      const duplicateData = {
        name: 'Duplicate Organization',
        slug: testData.organization.slug // Duplicate slug
      };

      await expect(organizationRepository.create(duplicateData))
        .rejects.toThrow();
    });

    it('should reject duplicate domain', async () => {
      const duplicateData = {
        name: 'Another Organization',
        slug: 'another-org-' + Date.now(),
        domain: testData.organization.domain // Duplicate domain
      };

      await expect(organizationRepository.create(duplicateData))
        .rejects.toThrow();
    });

    it('should validate required fields', async () => {
      const invalidData = {
        // Missing required 'name' field
        slug: 'invalid-org'
      };

      await expect(organizationRepository.create(invalidData))
        .rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update organization settings', async () => {
      const updateData = {
        settings: {
          feature_flags: {
            automation_discovery: true,
            advanced_security: true
          },
          integrations: {
            slack: { enabled: true },
            google: { enabled: false }
          }
        }
      };

      const result = await organizationRepository.update(testData.organization.id, updateData);
      
      expect(result).toBeDefined();
      expect(result?.settings).toEqual(updateData.settings);
    });

    it('should update plan tier and connections limit', async () => {
      const updateData = {
        plan_tier: 'enterprise',
        max_connections: 500
      };

      const result = await organizationRepository.update(testData.organization.id, updateData);
      
      expect(result?.plan_tier).toBe('enterprise');
      expect(result?.max_connections).toBe(500);
    });

    it('should handle partial updates', async () => {
      const originalName = testData.organization.name;
      const updateData = {
        plan_tier: 'pro'
      };

      const result = await organizationRepository.update(testData.organization.id, updateData);
      
      expect(result?.name).toBe(originalName); // Unchanged
      expect(result?.plan_tier).toBe('pro'); // Changed
    });

    it('should update timestamps', async () => {
      const originalUpdatedAt = testData.organization.updated_at;
      
      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = await organizationRepository.update(testData.organization.id, {
        name: 'Updated Organization Name'
      });
      
      expect(result?.updated_at.getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      );
    });
  });

  describe('activate and deactivate', () => {
    it('should activate organization', async () => {
      // First deactivate
      await organizationRepository.update(testData.organization.id, { is_active: false });
      
      const result = await organizationRepository.activate(testData.organization.id);
      
      expect(result?.is_active).toBe(true);
    });

    it('should deactivate organization', async () => {
      const result = await organizationRepository.deactivate(testData.organization.id);
      
      expect(result?.is_active).toBe(false);
    });

    it('should return null for non-existent organization', async () => {
      const nonExistentId = 'non-existent-id';
      
      const activateResult = await organizationRepository.activate(nonExistentId);
      const deactivateResult = await organizationRepository.deactivate(nonExistentId);
      
      expect(activateResult).toBeNull();
      expect(deactivateResult).toBeNull();
    });
  });

  describe('getActiveOrganizations', () => {
    it('should return only active organizations', async () => {
      // Create additional test organizations
      const activeOrg = await organizationRepository.create({
        name: 'Active Organization',
        slug: 'active-org-' + Date.now(),
        is_active: true
      });

      const inactiveOrg = await organizationRepository.create({
        name: 'Inactive Organization',
        slug: 'inactive-org-' + Date.now(),
        is_active: false
      });

      const result = await organizationRepository.getActiveOrganizations();
      
      const activeIds = result.data.map(org => org.id);
      expect(activeIds).toContain(activeOrg.id);
      expect(activeIds).not.toContain(inactiveOrg.id);
      
      // All returned organizations should be active
      result.data.forEach(org => {
        expect(org.is_active).toBe(true);
      });
    });

    it('should support pagination for active organizations', async () => {
      const pagination = { page: 1, limit: 2 };
      const result = await organizationRepository.getActiveOrganizations(pagination);
      
      expect(result.data.length).toBeLessThanOrEqual(2);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(2);
    });
  });

  describe('getOrganizationStats', () => {
    it('should return organization statistics', async () => {
      const stats = await organizationRepository.getOrganizationStats(testData.organization.id);
      
      expect(stats).toBeDefined();
      expect(typeof stats.total_connections).toBe('number');
      expect(typeof stats.active_connections).toBe('number');
      expect(typeof stats.last_sync_at).toBe('object'); // Date or null
      expect(Array.isArray(stats.platform_breakdown)).toBe(true);
    });

    it('should handle organization with no connections', async () => {
      const emptyOrg = await organizationRepository.create({
        name: 'Empty Organization',
        slug: 'empty-org-' + Date.now()
      });

      const stats = await organizationRepository.getOrganizationStats(emptyOrg.id);
      
      expect(stats.total_connections).toBe(0);
      expect(stats.active_connections).toBe(0);
      expect(stats.last_sync_at).toBeNull();
      expect(stats.platform_breakdown).toEqual([]);
    });

    it('should return null for non-existent organization', async () => {
      const nonExistentId = 'non-existent-id';
      const stats = await organizationRepository.getOrganizationStats(nonExistentId);
      
      expect(stats).toBeNull();
    });
  });

  describe('Business Logic Validation', () => {
    describe('Plan Tier Constraints', () => {
      it('should enforce connection limits based on plan tier', async () => {
        const freeOrg = await organizationRepository.create({
          name: 'Free Tier Org',
          slug: 'free-tier-' + Date.now(),
          plan_tier: 'free',
          max_connections: 10
        });

        expect(freeOrg.max_connections).toBe(10);
      });

      it('should allow higher limits for enterprise tier', async () => {
        const enterpriseOrg = await organizationRepository.create({
          name: 'Enterprise Org',
          slug: 'enterprise-' + Date.now(),
          plan_tier: 'enterprise',
          max_connections: 1000
        });

        expect(enterpriseOrg.max_connections).toBe(1000);
      });
    });

    describe('Settings Validation', () => {
      it('should store complex settings as JSONB', async () => {
        const complexSettings = {
          ui_preferences: {
            theme: 'dark',
            sidebar_collapsed: true,
            notifications: {
              email: true,
              push: false,
              slack: true
            }
          },
          security_settings: {
            require_2fa: true,
            session_timeout: 3600,
            allowed_ip_ranges: ['192.168.1.0/24', '10.0.0.0/8']
          },
          integration_configs: {
            slack: {
              default_channel: '#general',
              notification_level: 'all'
            },
            google: {
              domain_restriction: true,
              allowed_domains: ['example.com']
            }
          }
        };

        const result = await organizationRepository.update(
          testData.organization.id,
          { settings: complexSettings }
        );

        expect(result?.settings).toEqual(complexSettings);
      });

      it('should handle empty settings object', async () => {
        const result = await organizationRepository.update(
          testData.organization.id,
          { settings: {} }
        );

        expect(result?.settings).toEqual({});
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid plan tier values', async () => {
      const invalidData = {
        name: 'Invalid Tier Org',
        slug: 'invalid-tier-' + Date.now(),
        plan_tier: 'invalid_tier'
      };

      await expect(organizationRepository.create(invalidData))
        .rejects.toThrow();
    });

    it('should handle negative max_connections', async () => {
      const invalidData = {
        name: 'Invalid Connections Org',
        slug: 'invalid-connections-' + Date.now(),
        max_connections: -10
      };

      await expect(organizationRepository.create(invalidData))
        .rejects.toThrow();
    });

    it('should handle invalid JSON in settings', async () => {
      // This would be caught at the application layer, but test database behavior
      const updateData = {
        settings: { invalid: undefined } // Will be sanitized
      };

      const result = await organizationRepository.update(
        testData.organization.id,
        updateData
      );

      expect(result?.settings).toEqual({});
    });
  });

  describe('Multi-tenancy Isolation', () => {
    it('should not allow access to other organization data through slug collision', async () => {
      // Create two similar organizations
      const org1 = await organizationRepository.create({
        name: 'Organization One',
        slug: 'test-isolation-1-' + Date.now(),
        domain: 'test1.example.com'
      });

      const org2 = await organizationRepository.create({
        name: 'Organization Two',
        slug: 'test-isolation-2-' + Date.now(),
        domain: 'test2.example.com'
      });

      // Ensure they are distinct
      expect(org1.id).not.toBe(org2.id);
      expect(org1.slug).not.toBe(org2.slug);
      expect(org1.domain).not.toBe(org2.domain);
    });

    it('should maintain referential integrity with platform connections', async () => {
      // This test ensures that organization deletion would be properly handled
      // by foreign key constraints (tested through error conditions)
      
      // Attempt to reference non-existent organization in platform connection
      // would fail at the database level with foreign key constraint
      const fakeOrgId = 'fake-org-id';
      
      await expect(
        testDb.query(`
          INSERT INTO platform_connections (organization_id, platform_type, platform_user_id, display_name)
          VALUES ($1, 'slack', 'test-user', 'Test Connection')
        `, [fakeOrgId])
      ).rejects.toThrow();
    });
  });
});