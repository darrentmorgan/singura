/**
 * Base Repository Unit Tests
 * Tests the core CRUD operations and query building functionality
 */

import { BaseRepository } from '../../../src/database/repositories/base';
import { testDb } from '../../helpers/test-database';
import { MockDataGenerator } from '../../helpers/mock-data';

// Test implementation of BaseRepository
class TestRepository extends BaseRepository<any, any, any, any> {
  constructor() {
    super('organizations', 'id');
  }

  // Expose protected methods for testing
  public testBuildWhereClause(filters: any) {
    return this.buildWhereClause(filters);
  }

  public testBuildPaginationClause(pagination: any) {
    return this.buildPaginationClause(pagination);
  }

  public testBuildInsertClause(data: any) {
    return this.buildInsertClause(data);
  }

  public testBuildUpdateClause(data: any) {
    return this.buildUpdateClause(data);
  }

  public testValidateRequiredFields(data: any, requiredFields: string[]) {
    return this.validateRequiredFields(data, requiredFields);
  }

  public testSanitizeInput(data: any) {
    return this.sanitizeInput(data);
  }
}

describe('BaseRepository', () => {
  let repository: TestRepository;
  let testData: any;

  beforeAll(async () => {
    await testDb.beginTransaction();
  });

  afterAll(async () => {
    await testDb.rollbackTransaction();
  });

  beforeEach(async () => {
    repository = new TestRepository();
    testData = await testDb.createFixtures();
  });

  describe('CRUD Operations', () => {
    describe('findById', () => {
      it('should find existing record by ID', async () => {
        const result = await repository.findById(testData.organization.id);
        
        expect(result).toBeDefined();
        expect(result.id).toBe(testData.organization.id);
        expect(result.name).toBe(testData.organization.name);
      });

      it('should return null for non-existent ID', async () => {
        const nonExistentId = 'non-existent-id';
        const result = await repository.findById(nonExistentId);
        
        expect(result).toBeNull();
      });

      it('should handle invalid UUID format', async () => {
        const invalidId = 'invalid-uuid';
        
        await expect(repository.findById(invalidId)).rejects.toThrow();
      });
    });

    describe('create', () => {
      it('should create new record with valid data', async () => {
        const mockOrg = MockDataGenerator.createMockOrganization({
          name: 'New Test Org',
          slug: 'new-test-org-' + Date.now()
        });

        const result = await repository.create(mockOrg);
        
        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(result.name).toBe(mockOrg.name);
        expect(result.slug).toBe(mockOrg.slug);
        expect(result.created_at).toBeDefined();
      });

      it('should handle unique constraint violations', async () => {
        const duplicateOrg = {
          name: 'Duplicate Org',
          slug: testData.organization.slug // Duplicate slug
        };

        await expect(repository.create(duplicateOrg)).rejects.toThrow();
      });

      it('should reject creation with missing required fields', async () => {
        const invalidData = {
          // Missing required 'name' field
          slug: 'incomplete-org'
        };

        await expect(repository.create(invalidData)).rejects.toThrow();
      });
    });

    describe('update', () => {
      it('should update existing record', async () => {
        const updateData = {
          name: 'Updated Organization Name',
          plan_tier: 'pro'
        };

        const result = await repository.update(testData.organization.id, updateData);
        
        expect(result).toBeDefined();
        expect(result.id).toBe(testData.organization.id);
        expect(result.name).toBe(updateData.name);
        expect(result.plan_tier).toBe(updateData.plan_tier);
        expect(result.updated_at).toBeDefined();
      });

      it('should return null for non-existent record', async () => {
        const nonExistentId = 'non-existent-id';
        const updateData = { name: 'Updated Name' };

        const result = await repository.update(nonExistentId, updateData);
        
        expect(result).toBeNull();
      });

      it('should throw error when no fields to update', async () => {
        const emptyData = {};

        await expect(
          repository.update(testData.organization.id, emptyData)
        ).rejects.toThrow('No fields to update');
      });

      it('should ignore undefined values in update', async () => {
        const updateData = {
          name: 'Updated Name',
          undefined_field: undefined,
          plan_tier: 'enterprise'
        };

        const result = await repository.update(testData.organization.id, updateData);
        
        expect(result.name).toBe('Updated Name');
        expect(result.plan_tier).toBe('enterprise');
      });
    });

    describe('delete', () => {
      it('should delete existing record', async () => {
        const result = await repository.delete(testData.organization.id);
        
        expect(result).toBe(true);
        
        // Verify record is deleted
        const deletedRecord = await repository.findById(testData.organization.id);
        expect(deletedRecord).toBeNull();
      });

      it('should return false for non-existent record', async () => {
        const nonExistentId = 'non-existent-id';
        const result = await repository.delete(nonExistentId);
        
        expect(result).toBe(false);
      });
    });

    describe('exists', () => {
      it('should return true for existing record', async () => {
        const result = await repository.exists(testData.organization.id);
        
        expect(result).toBe(true);
      });

      it('should return false for non-existent record', async () => {
        const nonExistentId = 'non-existent-id';
        const result = await repository.exists(nonExistentId);
        
        expect(result).toBe(false);
      });
    });

    describe('count', () => {
      it('should return correct count without filters', async () => {
        const result = await repository.count();
        
        expect(typeof result).toBe('number');
        expect(result).toBeGreaterThan(0);
      });

      it('should return filtered count', async () => {
        const filters = { plan_tier: 'enterprise' };
        const result = await repository.count(filters);
        
        expect(typeof result).toBe('number');
      });
    });
  });

  describe('Query Building', () => {
    describe('buildWhereClause', () => {
      it('should build empty clause for no filters', () => {
        const result = repository.testBuildWhereClause(null);
        
        expect(result.whereClause).toBe('');
        expect(result.params).toEqual([]);
      });

      it('should build simple equality clause', () => {
        const filters = { name: 'Test Org' };
        const result = repository.testBuildWhereClause(filters);
        
        expect(result.whereClause).toBe(' WHERE name = $1');
        expect(result.params).toEqual(['Test Org']);
      });

      it('should build multiple conditions', () => {
        const filters = { 
          name: 'Test Org',
          is_active: true,
          plan_tier: 'enterprise'
        };
        const result = repository.testBuildWhereClause(filters);
        
        expect(result.whereClause).toBe(' WHERE name = $1 AND is_active = $2 AND plan_tier = $3');
        expect(result.params).toEqual(['Test Org', true, 'enterprise']);
      });

      it('should handle array values with IN clause', () => {
        const filters = { 
          plan_tier: ['free', 'pro', 'enterprise']
        };
        const result = repository.testBuildWhereClause(filters);
        
        expect(result.whereClause).toBe(' WHERE plan_tier IN ($1, $2, $3)');
        expect(result.params).toEqual(['free', 'pro', 'enterprise']);
      });

      it('should handle operator objects', () => {
        const filters = {
          max_connections: { gte: 10, lt: 100 },
          name: { like: 'Test' }
        };
        const result = repository.testBuildWhereClause(filters);
        
        expect(result.whereClause).toContain('max_connections >= $1');
        expect(result.whereClause).toContain('max_connections < $2');
        expect(result.whereClause).toContain('name ILIKE $3');
        expect(result.params).toEqual([10, 100, '%Test%']);
      });

      it('should ignore null and undefined values', () => {
        const filters = {
          name: 'Test',
          null_field: null,
          undefined_field: undefined
        };
        const result = repository.testBuildWhereClause(filters);
        
        expect(result.whereClause).toBe(' WHERE name = $1');
        expect(result.params).toEqual(['Test']);
      });
    });

    describe('buildPaginationClause', () => {
      it('should use default pagination values', () => {
        const result = repository.testBuildPaginationClause({});
        
        expect(result.limit).toBe(20);
        expect(result.offset).toBe(0);
        expect(result.orderBy).toBe(' ORDER BY id DESC');
      });

      it('should apply custom pagination', () => {
        const pagination = {
          page: 3,
          limit: 10,
          sort_by: 'name',
          sort_order: 'ASC' as const
        };
        const result = repository.testBuildPaginationClause(pagination);
        
        expect(result.limit).toBe(10);
        expect(result.offset).toBe(20); // (page 3 - 1) * 10
        expect(result.orderBy).toBe(' ORDER BY name ASC');
      });

      it('should enforce maximum limit', () => {
        const pagination = { limit: 200 }; // Exceeds max of 100
        const result = repository.testBuildPaginationClause(pagination);
        
        expect(result.limit).toBe(100);
      });

      it('should enforce minimum page number', () => {
        const pagination = { page: 0 };
        const result = repository.testBuildPaginationClause(pagination);
        
        expect(result.offset).toBe(0); // Should be treated as page 1
      });
    });

    describe('buildInsertClause', () => {
      it('should build insert clause for valid data', () => {
        const data = {
          name: 'Test Org',
          slug: 'test-org',
          is_active: true
        };
        const result = repository.testBuildInsertClause(data);
        
        expect(result.columns).toBe('name, slug, is_active');
        expect(result.placeholders).toBe('$1, $2, $3');
        expect(result.values).toEqual(['Test Org', 'test-org', true]);
      });

      it('should filter out undefined values', () => {
        const data = {
          name: 'Test Org',
          undefined_field: undefined,
          slug: 'test-org'
        };
        const result = repository.testBuildInsertClause(data);
        
        expect(result.columns).toBe('name, slug');
        expect(result.values).toEqual(['Test Org', 'test-org']);
      });
    });

    describe('buildUpdateClause', () => {
      it('should build update clause for valid data', () => {
        const data = {
          name: 'Updated Name',
          is_active: false
        };
        const result = repository.testBuildUpdateClause(data);
        
        expect(result.setClause).toBe('name = $1, is_active = $2');
        expect(result.params).toEqual(['Updated Name', false]);
      });

      it('should return empty for no valid fields', () => {
        const data = { undefined_field: undefined };
        const result = repository.testBuildUpdateClause(data);
        
        expect(result.setClause).toBe('');
        expect(result.params).toEqual([]);
      });
    });
  });

  describe('Validation and Sanitization', () => {
    describe('validateRequiredFields', () => {
      it('should return no errors for valid data', () => {
        const data = { name: 'Test', slug: 'test', count: 0 };
        const required = ['name', 'slug', 'count'];
        const errors = repository.testValidateRequiredFields(data, required);
        
        expect(errors).toEqual([]);
      });

      it('should return errors for missing fields', () => {
        const data = { name: 'Test' };
        const required = ['name', 'slug', 'email'];
        const errors = repository.testValidateRequiredFields(data, required);
        
        expect(errors).toHaveLength(2);
        expect(errors[0].field).toBe('slug');
        expect(errors[1].field).toBe('email');
      });

      it('should handle zero values correctly', () => {
        const data = { name: 'Test', count: 0 };
        const required = ['name', 'count'];
        const errors = repository.testValidateRequiredFields(data, required);
        
        expect(errors).toEqual([]);
      });
    });

    describe('sanitizeInput', () => {
      it('should remove undefined values', () => {
        const data = {
          name: 'Test',
          undefined_field: undefined,
          null_field: null,
          empty_string: '',
          zero_value: 0
        };
        const sanitized = repository.testSanitizeInput(data);
        
        expect(sanitized).toEqual({
          name: 'Test',
          null_field: null,
          empty_string: '',
          zero_value: 0
        });
        expect(sanitized).not.toHaveProperty('undefined_field');
      });
    });
  });

  describe('Pagination', () => {
    it('should return paginated results with metadata', async () => {
      // Create additional test data for pagination
      for (let i = 0; i < 5; i++) {
        const mockOrg = MockDataGenerator.createMockOrganization({
          name: `Pagination Test Org ${i}`,
          slug: `pagination-test-${i}-${Date.now()}`
        });
        await repository.create(mockOrg);
      }

      const pagination = { page: 1, limit: 3 };
      const result = await repository.findMany({}, pagination);
      
      expect(result.data).toHaveLength(3);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(3);
      expect(result.pagination.total).toBeGreaterThanOrEqual(3);
      expect(typeof result.pagination.has_next).toBe('boolean');
      expect(typeof result.pagination.has_previous).toBe('boolean');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Simulate connection error by using invalid query
      const invalidRepository = new (class extends BaseRepository<any, any, any> {
        constructor() { super('non_existent_table'); }
      })();

      await expect(invalidRepository.findById('test-id')).rejects.toThrow();
    });
  });
});