/**
 * Unit Tests for Base Repository
 * Tests JSONB serialization fix and repository patterns
 * Coverage Target: 90%+
 */

import { BaseRepository } from '../../../database/repositories/base';
import { db } from '../../../database/pool';

// Mock the database pool
jest.mock('../../../database/pool', () => ({
  db: {
    query: jest.fn()
  }
}));

// Test entity types
interface TestEntity {
  id: string;
  name: string;
  metadata: Record<string, any>; // JSONB column
  tags: string[]; // JSONB column (array)
  created_at: Date;
}

interface TestCreateInput extends Record<string, unknown> {
  name: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

interface TestUpdateInput extends Record<string, unknown> {
  name?: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

// Test repository implementation
class TestRepository extends BaseRepository<TestEntity, TestCreateInput, TestUpdateInput> {
  constructor() {
    super('test_entities', 'id');
  }
}

describe('BaseRepository', () => {
  let repository: TestRepository;
  const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new TestRepository();
  });

  describe('buildInsertClause - JSONB Serialization', () => {
    it('should serialize objects to JSON strings for JSONB columns', () => {
      const data: TestCreateInput = {
        name: 'Test Entity',
        metadata: { key: 'value', nested: { data: 123 } }
      };

      const result = (repository as any).buildInsertClause(data);

      expect(result.columns).toBe('name, metadata');
      expect(result.values).toHaveLength(2);
      expect(result.values[0]).toBe('Test Entity');
      expect(result.values[1]).toBe(JSON.stringify({ key: 'value', nested: { data: 123 } }));
      expect(result.placeholders).toBe('$1, $2');
    });

    it('should serialize arrays to JSON strings for JSONB columns', () => {
      const data: TestCreateInput = {
        name: 'Test Entity',
        tags: ['tag1', 'tag2', 'tag3']
      };

      const result = (repository as any).buildInsertClause(data);

      expect(result.values[1]).toBe(JSON.stringify(['tag1', 'tag2', 'tag3']));
    });

    it('should handle nested objects correctly', () => {
      const complexMetadata = {
        level1: {
          level2: {
            level3: {
              value: 'deep'
            }
          }
        },
        array: [1, 2, 3],
        mixed: { a: [{ b: 'c' }] }
      };

      const data: TestCreateInput = {
        name: 'Complex Entity',
        metadata: complexMetadata
      };

      const result = (repository as any).buildInsertClause(data);

      expect(result.values[1]).toBe(JSON.stringify(complexMetadata));

      // Verify it can be parsed back
      const parsed = JSON.parse(result.values[1] as string);
      expect(parsed).toEqual(complexMetadata);
    });

    it('should handle null values correctly', () => {
      const data = {
        name: 'Test Entity',
        metadata: null
      };

      const result = (repository as any).buildInsertClause(data);

      expect(result.values).toContain(null);
    });

    it('should preserve primitive types (strings, numbers, booleans)', () => {
      const data = {
        name: 'Test Entity',
        count: 42,
        active: true
      };

      const result = (repository as any).buildInsertClause(data);

      expect(result.values).toContain('Test Entity');
      expect(result.values).toContain(42);
      expect(result.values).toContain(true);
    });

    it('should handle Date objects correctly', () => {
      const now = new Date();
      const data = {
        name: 'Test Entity',
        created_at: now
      };

      const result = (repository as any).buildInsertClause(data);

      // Dates should be serialized to JSON strings for JSONB columns
      expect(result.values[0]).toBe('Test Entity');
      expect(typeof result.values[1]).toBe('string');
      expect(result.values[1]).toContain(now.toISOString());
    });
  });

  describe('buildUpdateClause - JSONB Serialization', () => {
    it('should serialize objects to JSON strings for JSONB columns', () => {
      const timestamp = Date.now();
      const data: TestUpdateInput = {
        metadata: { updated: true, timestamp }
      };

      const result = (repository as any).buildUpdateClause(data);

      expect(result.setClause).toBe('metadata = $1');
      expect(result.params).toHaveLength(1);

      const parsedMetadata = JSON.parse(result.params[0] as string);
      expect(parsedMetadata.updated).toBe(true);
      expect(parsedMetadata.timestamp).toBe(timestamp);
    });

    it('should serialize arrays to JSON strings for JSONB columns', () => {
      const data: TestUpdateInput = {
        tags: ['updated', 'tags']
      };

      const result = (repository as any).buildUpdateClause(data);

      expect(result.params[0]).toBe(JSON.stringify(['updated', 'tags']));
    });

    it('should handle multiple fields with mixed types', () => {
      const data: TestUpdateInput = {
        name: 'Updated Name',
        metadata: { status: 'updated' },
        tags: ['new-tag']
      };

      const result = (repository as any).buildUpdateClause(data);

      expect(result.setClause).toBe('name = $1, metadata = $2, tags = $3');
      expect(result.params[0]).toBe('Updated Name'); // String preserved
      expect(result.params[1]).toBe(JSON.stringify({ status: 'updated' })); // Object stringified
      expect(result.params[2]).toBe(JSON.stringify(['new-tag'])); // Array stringified
    });

    it('should return empty clause for undefined values', () => {
      const data: TestUpdateInput = {
        name: undefined,
        metadata: undefined
      };

      const result = (repository as any).buildUpdateClause(data);

      expect(result.setClause).toBe('');
      expect(result.params).toEqual([]);
    });
  });

  describe('create - Integration with JSONB', () => {
    it('should create entity with JSONB columns correctly', async () => {
      const mockEntity: TestEntity = {
        id: 'test-123',
        name: 'Test Entity',
        metadata: { key: 'value' },
        tags: ['tag1'],
        created_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockEntity],
        rowCount: 1,
        command: 'INSERT'
      });

      const data: TestCreateInput = {
        name: 'Test Entity',
        metadata: { key: 'value' },
        tags: ['tag1']
      };

      const result = await repository.create(data);

      expect(result).toEqual(mockEntity);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO test_entities'),
        expect.arrayContaining([
          'Test Entity',
          JSON.stringify({ key: 'value' }),
          JSON.stringify(['tag1'])
        ])
      );
    });

    it('should handle complex nested JSONB structures', async () => {
      const complexMetadata = {
        ai_detection: {
          platforms: ['openai', 'claude'],
          confidence: 95,
          indicators: [
            { type: 'api_call', severity: 'high' },
            { type: 'scope_access', severity: 'medium' }
          ]
        },
        risk_assessment: {
          score: 85,
          factors: ['sensitive_data', 'external_api']
        }
      };

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'complex-123',
          name: 'Complex Entity',
          metadata: complexMetadata,
          tags: [],
          created_at: new Date()
        }],
        rowCount: 1,
        command: 'INSERT'
      });

      const data: TestCreateInput = {
        name: 'Complex Entity',
        metadata: complexMetadata
      };

      await repository.create(data);

      const callArgs = mockQuery.mock.calls[0];
      const serializedMetadata = callArgs[1]![1] as string;

      // Verify it's a JSON string
      expect(typeof serializedMetadata).toBe('string');

      // Verify it can be parsed back to original structure
      const parsed = JSON.parse(serializedMetadata);
      expect(parsed).toEqual(complexMetadata);
    });
  });

  describe('update - Integration with JSONB', () => {
    it('should update entity with JSONB columns correctly', async () => {
      const mockUpdatedEntity: TestEntity = {
        id: 'test-123',
        name: 'Updated Entity',
        metadata: { updated: true },
        tags: ['updated-tag'],
        created_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockUpdatedEntity],
        rowCount: 1,
        command: 'UPDATE'
      });

      const data: TestUpdateInput = {
        metadata: { updated: true },
        tags: ['updated-tag']
      };

      const result = await repository.update('test-123', data);

      expect(result).toEqual(mockUpdatedEntity);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE test_entities'),
        expect.arrayContaining([
          JSON.stringify({ updated: true }),
          JSON.stringify(['updated-tag']),
          'test-123'
        ])
      );
    });

    it('should handle partial updates with JSONB', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'test-123',
          name: 'Existing Name',
          metadata: { partial: 'update' },
          tags: ['tag1'],
          created_at: new Date()
        }],
        rowCount: 1,
        command: 'UPDATE'
      });

      const data: TestUpdateInput = {
        metadata: { partial: 'update' }
        // name and tags not updated
      };

      await repository.update('test-123', data);

      const callArgs = mockQuery.mock.calls[0];
      const query = callArgs[0];

      expect(query).toContain('SET metadata = $1');
      expect(query).not.toContain('name');
      expect(query).not.toContain('tags');
    });
  });

  describe('findById', () => {
    it('should retrieve entity with JSONB columns', async () => {
      const mockEntity: TestEntity = {
        id: 'test-123',
        name: 'Test Entity',
        metadata: { key: 'value' },
        tags: ['tag1', 'tag2'],
        created_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockEntity],
        rowCount: 1,
        command: 'SELECT'
      });

      const result = await repository.findById('test-123');

      expect(result).toEqual(mockEntity);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM test_entities WHERE id = $1',
        ['test-123']
      );
    });

    it('should return null if entity not found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT'
      });

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('buildWhereClause', () => {
    it('should handle simple equality filters', () => {
      const filters = { name: 'Test' };

      const result = (repository as any).buildWhereClause(filters);

      expect(result.whereClause).toBe(' WHERE name = $1');
      expect(result.params).toEqual(['Test']);
    });

    it('should handle array filters (IN clause)', () => {
      const filters = { id: ['id1', 'id2', 'id3'] };

      const result = (repository as any).buildWhereClause(filters);

      expect(result.whereClause).toBe(' WHERE id IN ($1, $2, $3)');
      expect(result.params).toEqual(['id1', 'id2', 'id3']);
    });

    it('should handle empty filters', () => {
      const result = (repository as any).buildWhereClause({});

      expect(result.whereClause).toBe('');
      expect(result.params).toEqual([]);
    });

    it('should handle undefined filters', () => {
      const result = (repository as any).buildWhereClause(undefined);

      expect(result.whereClause).toBe('');
      expect(result.params).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should throw error if create fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const data: TestCreateInput = { name: 'Test' };

      await expect(repository.create(data)).rejects.toThrow('Database error');
    });

    it('should throw error if update has no fields', async () => {
      const data: TestUpdateInput = {};

      await expect(repository.update('test-123', data)).rejects.toThrow('No fields to update');
    });

    it('should throw error if create returns no rows', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'INSERT'
      });

      const data: TestCreateInput = { name: 'Test' };

      await expect(repository.create(data)).rejects.toThrow('Failed to create record');
    });
  });

  describe('JSONB Edge Cases', () => {
    it('should handle empty objects', () => {
      const data = { name: 'Test', metadata: {} };

      const result = (repository as any).buildInsertClause(data);

      expect(result.values[1]).toBe(JSON.stringify({}));
    });

    it('should handle empty arrays', () => {
      const data = { name: 'Test', tags: [] };

      const result = (repository as any).buildInsertClause(data);

      expect(result.values[1]).toBe(JSON.stringify([]));
    });

    it('should handle objects with null values', () => {
      const data = { name: 'Test', metadata: { key: null, other: 'value' } };

      const result = (repository as any).buildInsertClause(data);

      const parsed = JSON.parse(result.values[1] as string);
      expect(parsed.key).toBeNull();
      expect(parsed.other).toBe('value');
    });

    it('should handle special characters in JSONB', () => {
      const data = {
        name: 'Test',
        metadata: {
          special: 'Value with "quotes" and \'apostrophes\'',
          unicode: '🚀 Unicode emoji',
          newlines: 'Line 1\nLine 2'
        }
      };

      const result = (repository as any).buildInsertClause(data);

      const parsed = JSON.parse(result.values[1] as string);
      expect(parsed.special).toBe('Value with "quotes" and \'apostrophes\'');
      expect(parsed.unicode).toBe('🚀 Unicode emoji');
      expect(parsed.newlines).toBe('Line 1\nLine 2');
    });
  });
});
