/**
 * Global test setup configuration
 * Initializes test environment and utilities
 */

import { db } from '../src/database/pool';
import { auditLogRepository } from '../src/database/repositories';

// Global test timeout
jest.setTimeout(30000);

// Global setup - runs before all tests
beforeAll(async () => {
  // Wait for database connection
  try {
    await db.query('SELECT NOW()');
    console.log('✅ Test database connection established');
  } catch (error) {
    console.error('❌ Failed to connect to test database:', error);
    throw error;
  }
});

// Global teardown - runs after all tests
afterAll(async () => {
  try {
    // Clean up database connections
    await db.end();
    console.log('✅ Test database connections closed');
  } catch (error) {
    console.error('❌ Error closing database connections:', error);
  }
});

// Clean database between test suites
beforeEach(async () => {
  // Start a transaction that will be rolled back after each test
  await db.query('BEGIN');
});

afterEach(async () => {
  // Rollback transaction to clean state
  try {
    await db.query('ROLLBACK');
  } catch (error) {
    // If rollback fails, try to end any hanging transaction
    await db.query('END');
  }
});

// Global test utilities
declare global {
  namespace NodeJS {
    interface Global {
      testUtils: {
        createTestOrganization: () => Promise<any>;
        createTestUser: () => Promise<any>;
        createTestPlatformConnection: (orgId: string) => Promise<any>;
        cleanupTestData: () => Promise<void>;
      }
    }
  }
}

// Test utility functions
const testUtils = {
  /**
   * Create a test organization
   */
  async createTestOrganization() {
    const result = await db.query(`
      INSERT INTO organizations (name, domain, slug, plan_tier, max_connections)
      VALUES ('Test Org', 'test.example.com', 'test-org-' || extract(epoch from now()), 'enterprise', 100)
      RETURNING *
    `);
    return result.rows[0];
  },

  /**
   * Create a test user (placeholder - will be implemented with user system)
   */
  async createTestUser() {
    return {
      id: 'test-user-id',
      email: 'test@example.com',
      organizationId: 'test-org-id'
    };
  },

  /**
   * Create a test platform connection
   */
  async createTestPlatformConnection(organizationId: string) {
    const result = await db.query(`
      INSERT INTO platform_connections (
        organization_id, platform_type, platform_user_id, platform_workspace_id,
        display_name, status, permissions_granted, metadata
      ) VALUES (
        $1, 'slack', 'test-slack-user-id', 'test-workspace-id',
        'Test Slack Connection', 'active', '["read", "write"]'::jsonb, '{}'::jsonb
      ) RETURNING *
    `, [organizationId]);
    return result.rows[0];
  },

  /**
   * Clean up test data
   */
  async cleanupTestData() {
    await db.query('DELETE FROM audit_logs WHERE event_data ? \'test\'');
    await db.query('DELETE FROM encrypted_credentials WHERE platform_connection_id IN (SELECT id FROM platform_connections WHERE display_name LIKE \'Test%\')');
    await db.query('DELETE FROM platform_connections WHERE display_name LIKE \'Test%\'');
    await db.query('DELETE FROM organizations WHERE name LIKE \'Test%\'');
  }
};

// Make test utils globally available
(global as any).testUtils = testUtils;