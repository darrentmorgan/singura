/**
 * Database test helpers and utilities
 * Provides isolation and fixtures for database testing
 */

import { Pool, PoolClient } from 'pg';
import { db } from '../../src/database/pool';
import { DatabaseConnection } from '../../src/types/database';
import {
  OrganizationRecord,
  ConnectionRecord,
  UUID
} from '@singura/shared-types';
import { MockDataGenerator } from './mock-data';

export class TestDatabase {
  private static instance: TestDatabase;
  private transactionClient: DatabaseConnection | null = null;

  private constructor() {}

  static getInstance(): TestDatabase {
    if (!TestDatabase.instance) {
      TestDatabase.instance = new TestDatabase();
    }
    return TestDatabase.instance;
  }

  /**
   * Start a transaction for test isolation
   */
  async beginTransaction(): Promise<DatabaseConnection> {
    if (this.transactionClient) {
      throw new Error('Transaction already active');
    }

    const client = await db.getClient();
    this.transactionClient = client;
    await this.transactionClient.query('BEGIN');
    return this.transactionClient;
  }

  /**
   * Rollback and end transaction
   */
  async rollbackTransaction(): Promise<void> {
    if (!this.transactionClient) {
      return;
    }

    try {
      await this.transactionClient.query('ROLLBACK');
    } finally {
      this.transactionClient.release();
      this.transactionClient = null;
    }
  }

  /**
   * Execute query within transaction
   */
  async query(text: string, params?: any[]): Promise<any> {
    if (!this.transactionClient) {
      throw new Error('No active transaction');
    }
    return this.transactionClient.query(text, params);
  }

  /**
   * Create test fixtures
   */
  async createFixtures(): Promise<TestFixtures> {
    const fixtures: TestFixtures = {
      organization: null as any,
      platformConnection: null as any,
      encryptedCredentials: [],
      discoveryRun: null as any
    };

    // Create test organization with unique values
    const uniqueId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const orgResult = await this.query(`
      INSERT INTO organizations (name, domain, slug, plan_tier, max_connections, settings, is_active)
      VALUES (
        'Test Organization ' || $1,
        'test-' || $1 || '.example.com',
        'test-org-' || $1,
        'enterprise',
        100,
        '{"test": true}'::jsonb,
        true
      ) RETURNING *
    `, [uniqueId]);
    fixtures.organization = orgResult.rows[0] as OrganizationRecord;

    // Create test platform connection
    const connResult = await this.query(`
      INSERT INTO platform_connections (
        organization_id, platform_type, platform_user_id, platform_workspace_id,
        display_name, status, permissions_granted, metadata, expires_at
      ) VALUES (
        $1, 'slack', 'test-slack-user-123', 'T123456789',
        'Test Slack Integration', 'active',
        '["channels:read", "users:read", "chat:write"]'::jsonb,
        '{"team_name": "Test Team", "test": true}'::jsonb,
        now() + interval '1 hour'
      ) RETURNING *
    `, [fixtures.organization.id]);
    fixtures.platformConnection = connResult.rows[0] as ConnectionRecord;

    // Create test discovery run
    const discoveryRunResult = await this.query(`
      INSERT INTO discovery_runs (
        organization_id, platform_connection_id, status,
        started_at, completed_at, automations_found
      ) VALUES (
        $1, $2, 'completed',
        NOW(), NOW(), 0
      ) RETURNING *
    `, [fixtures.organization.id, fixtures.platformConnection.id]);
    fixtures.discoveryRun = discoveryRunResult.rows[0];

    // Note: No users table in current schema - authentication is mocked in tests

    // Create test encrypted credentials
    const credentialTypes = ['access_token', 'refresh_token'] as const;
    for (const type of credentialTypes) {
      const mockCredential = MockDataGenerator.createMockEncryptedCredential(
        fixtures.platformConnection.id,
        type
      );
      fixtures.encryptedCredentials.push(mockCredential);
    }

    return fixtures;
  }

  /**
   * Clean specific test data
   */
  async cleanupTestData(): Promise<void> {
    const tables = [
      'audit_logs',
      'encrypted_credentials', 
      'platform_connections',
      'organizations'
    ];

    for (const table of tables) {
      await this.query(`DELETE FROM ${table} WHERE created_at > now() - interval '1 hour'`);
    }
  }

  /**
   * Verify database constraints and relationships
   */
  async verifyConstraints(): Promise<boolean> {
    try {
      // Test foreign key constraints
      const violations = await this.query(`
        SELECT 
          conrelid::regclass AS table_name,
          conname AS constraint_name,
          pg_get_constraintdef(oid) AS constraint_definition
        FROM pg_constraint 
        WHERE contype = 'f' 
        AND NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          WHERE tc.constraint_name = pg_constraint.conname
          AND tc.constraint_type = 'FOREIGN KEY'
        )
      `);

      return violations.rows.length === 0;
    } catch (error) {
      console.error('Constraint verification failed:', error);
      return false;
    }
  }

  /**
   * Get table row counts for verification
   */
  async getTableCounts(): Promise<Record<string, number>> {
    const tables = ['organizations', 'platform_connections', 'encrypted_credentials', 'audit_logs'];
    const counts: Record<string, number> = {};

    for (const table of tables) {
      const result = await this.query(`SELECT COUNT(*) as count FROM ${table}`);
      counts[table] = parseInt(result.rows[0].count, 10);
    }

    return counts;
  }

  /**
   * Execute migration for testing
   */
  async executeMigration(migrationSql: string): Promise<void> {
    try {
      await this.query(migrationSql);
    } catch (error) {
      console.error('Migration execution failed:', error);
      throw error;
    }
  }

  /**
   * Verify Row Level Security policies
   */
  async verifyRLSPolicies(): Promise<{ table: string; enabled: boolean }[]> {
    const result = await this.query(`
      SELECT 
        tablename as table,
        rowsecurity as enabled
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('organizations', 'platform_connections', 'encrypted_credentials', 'audit_logs')
    `);

    return result.rows;
  }
}

// Export singleton instance
/**
 * Test fixtures type definition
 */
export interface TestFixtures {
  organization: OrganizationRecord;
  platformConnection: ConnectionRecord;
  encryptedCredentials: Record<string, unknown>[];
  discoveryRun: any;
}

// Export singleton instance
export const testDb = TestDatabase.getInstance();