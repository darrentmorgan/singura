/**
 * Database test helpers and utilities
 * Provides isolation and fixtures for database testing
 */

import { Pool, PoolClient } from 'pg';
import { db } from '../../src/database/pool';

export class TestDatabase {
  private static instance: TestDatabase;
  private transactionClient: PoolClient | null = null;

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
  async beginTransaction(): Promise<PoolClient> {
    if (this.transactionClient) {
      throw new Error('Transaction already active');
    }

    this.transactionClient = await db.connect();
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
  async createFixtures() {
    const fixtures = {
      organization: null as any,
      platformConnection: null as any,
      encryptedCredentials: [] as any[]
    };

    // Create test organization
    const orgResult = await this.query(`
      INSERT INTO organizations (name, domain, slug, plan_tier, max_connections, settings)
      VALUES (
        'Test Organization',
        'test.example.com',
        'test-org-' || extract(epoch from now()) || '-' || floor(random() * 1000),
        'enterprise',
        100,
        '{"test": true}'::jsonb
      ) RETURNING *
    `);
    fixtures.organization = orgResult.rows[0];

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
    fixtures.platformConnection = connResult.rows[0];

    // Create test encrypted credentials
    const credentialTypes = ['access_token', 'refresh_token'];
    for (const type of credentialTypes) {
      const credResult = await this.query(`
        INSERT INTO encrypted_credentials (
          platform_connection_id, credential_type, encrypted_value,
          encryption_key_id, expires_at, metadata
        ) VALUES (
          $1, $2, 'encrypted:test:' || $2 || ':' || $1,
          'test-key-id', now() + interval '1 hour',
          '{"test": true}'::jsonb
        ) RETURNING *
      `, [fixtures.platformConnection.id, type]);
      fixtures.encryptedCredentials.push(credResult.rows[0]);
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
export const testDb = TestDatabase.getInstance();