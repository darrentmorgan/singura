/**
 * Database Migration Tests
 * Tests schema creation, constraints, indexes, and data integrity
 */

import { testDb } from '../helpers/test-database';
import fs from 'fs';
import path from 'path';
import { MockDataGenerator } from '../helpers/mock-data';

describe('Database Migrations', () => {
  let migrationSql: string;

  beforeAll(async () => {
    await testDb.beginTransaction();
    
    // Load migration SQL
    const migrationPath = path.join(__dirname, '../../migrations/001_initial_schema.sql');
    migrationSql = fs.readFileSync(migrationPath, 'utf8');
  });

  afterAll(async () => {
    await testDb.rollbackTransaction();
  });

  describe('Schema Creation', () => {
    it('should create all required tables', async () => {
      await testDb.executeMigration(migrationSql);

      const tables = await testDb.query(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
      `);

      const tableNames = tables.rows.map(row => row.tablename);
      
      expect(tableNames).toContain('organizations');
      expect(tableNames).toContain('platform_connections');
      expect(tableNames).toContain('encrypted_credentials');
      expect(tableNames).toContain('audit_logs');
    });

    it('should create required extensions', async () => {
      await testDb.executeMigration(migrationSql);

      const extensions = await testDb.query(`
        SELECT extname 
        FROM pg_extension 
        WHERE extname IN ('uuid-ossp', 'pgcrypto')
      `);

      const extensionNames = extensions.rows.map(row => row.extname);
      expect(extensionNames).toContain('uuid-ossp');
      expect(extensionNames).toContain('pgcrypto');
    });

    it('should create required enums', async () => {
      await testDb.executeMigration(migrationSql);

      const enums = await testDb.query(`
        SELECT typname 
        FROM pg_type 
        WHERE typcategory = 'E'
        ORDER BY typname
      `);

      const enumNames = enums.rows.map(row => row.typname);
      expect(enumNames).toContain('platform_type_enum');
      expect(enumNames).toContain('connection_status_enum');
      expect(enumNames).toContain('credential_type_enum');
    });
  });

  describe('Table Structure', () => {
    beforeEach(async () => {
      await testDb.executeMigration(migrationSql);
    });

    describe('organizations table', () => {
      it('should have correct columns and types', async () => {
        const columns = await testDb.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = 'organizations'
          ORDER BY ordinal_position
        `);

        const columnInfo = columns.rows.reduce((acc, row) => {
          acc[row.column_name] = {
            type: row.data_type,
            nullable: row.is_nullable === 'YES',
            default: row.column_default
          };
          return acc;
        }, {});

        expect(columnInfo.id.type).toBe('uuid');
        expect(columnInfo.id.nullable).toBe(false);
        expect(columnInfo.name.type).toBe('character varying');
        expect(columnInfo.name.nullable).toBe(false);
        expect(columnInfo.slug.nullable).toBe(false);
        expect(columnInfo.settings.type).toBe('jsonb');
        expect(columnInfo.is_active.default).toContain('true');
        expect(columnInfo.plan_tier.default).toContain('free');
        expect(columnInfo.max_connections.default).toContain('10');
      });

      it('should enforce unique constraints', async () => {
        const org1 = MockDataGenerator.createMockOrganization({
          slug: 'test-unique-slug',
          domain: 'test-unique.com'
        });

        await testDb.query(`
          INSERT INTO organizations (name, slug, domain)
          VALUES ($1, $2, $3)
        `, [org1.name, org1.slug, org1.domain]);

        // Attempt to insert duplicate slug
        await expect(
          testDb.query(`
            INSERT INTO organizations (name, slug, domain)
            VALUES ($1, $2, $3)
          `, ['Another Org', org1.slug, 'different.com'])
        ).rejects.toThrow();

        // Attempt to insert duplicate domain
        await expect(
          testDb.query(`
            INSERT INTO organizations (name, slug, domain)
            VALUES ($1, $2, $3)
          `, ['Another Org', 'different-slug', org1.domain])
        ).rejects.toThrow();
      });

      it('should have proper indexes', async () => {
        const indexes = await testDb.query(`
          SELECT indexname, indexdef
          FROM pg_indexes
          WHERE tablename = 'organizations'
          ORDER BY indexname
        `);

        const indexNames = indexes.rows.map(row => row.indexname);
        expect(indexNames).toContain('idx_organizations_domain');
        expect(indexNames).toContain('idx_organizations_slug');
        expect(indexNames).toContain('idx_organizations_active');
      });
    });

    describe('platform_connections table', () => {
      it('should have correct foreign key relationship', async () => {
        const orgData = MockDataGenerator.createMockOrganization();
        const orgResult = await testDb.query(`
          INSERT INTO organizations (name, slug)
          VALUES ($1, $2) RETURNING id
        `, [orgData.name, orgData.slug]);
        
        const orgId = orgResult.rows[0].id;

        // Should allow valid foreign key
        await testDb.query(`
          INSERT INTO platform_connections (organization_id, platform_type, platform_user_id, display_name)
          VALUES ($1, 'slack', 'test-user-123', 'Test Connection')
        `, [orgId]);

        // Should reject invalid foreign key
        await expect(
          testDb.query(`
            INSERT INTO platform_connections (organization_id, platform_type, platform_user_id, display_name)
            VALUES ($1, 'slack', 'test-user-456', 'Invalid Connection')
          `, ['invalid-org-id'])
        ).rejects.toThrow();
      });

      it('should enforce unique platform connection constraint', async () => {
        const orgData = MockDataGenerator.createMockOrganization();
        const orgResult = await testDb.query(`
          INSERT INTO organizations (name, slug)
          VALUES ($1, $2) RETURNING id
        `, [orgData.name, orgData.slug]);
        
        const orgId = orgResult.rows[0].id;

        // First connection should succeed
        await testDb.query(`
          INSERT INTO platform_connections 
          (organization_id, platform_type, platform_user_id, platform_workspace_id, display_name)
          VALUES ($1, 'slack', 'test-user-123', 'T123456789', 'Test Connection 1')
        `, [orgId]);

        // Duplicate connection should fail
        await expect(
          testDb.query(`
            INSERT INTO platform_connections 
            (organization_id, platform_type, platform_user_id, platform_workspace_id, display_name)
            VALUES ($1, 'slack', 'test-user-123', 'T123456789', 'Test Connection 2')
          `, [orgId])
        ).rejects.toThrow();
      });

      it('should validate enum values', async () => {
        const orgData = MockDataGenerator.createMockOrganization();
        const orgResult = await testDb.query(`
          INSERT INTO organizations (name, slug)
          VALUES ($1, $2) RETURNING id
        `, [orgData.name, orgData.slug]);
        
        const orgId = orgResult.rows[0].id;

        // Valid enum value should work
        await testDb.query(`
          INSERT INTO platform_connections (organization_id, platform_type, platform_user_id, display_name, status)
          VALUES ($1, 'slack', 'test-user', 'Test Connection', 'active')
        `, [orgId]);

        // Invalid enum value should fail
        await expect(
          testDb.query(`
            INSERT INTO platform_connections (organization_id, platform_type, platform_user_id, display_name, status)
            VALUES ($1, 'invalid_platform', 'test-user', 'Invalid Connection', 'active')
          `, [orgId])
        ).rejects.toThrow();
      });
    });

    describe('encrypted_credentials table', () => {
      it('should cascade delete with platform connections', async () => {
        const fixtures = await testDb.createFixtures();
        
        // Verify credentials exist
        const credentialsBefore = await testDb.query(`
          SELECT COUNT(*) as count 
          FROM encrypted_credentials 
          WHERE platform_connection_id = $1
        `, [fixtures.platformConnection.id]);
        
        expect(parseInt(credentialsBefore.rows[0].count)).toBeGreaterThan(0);

        // Delete platform connection
        await testDb.query(`
          DELETE FROM platform_connections WHERE id = $1
        `, [fixtures.platformConnection.id]);

        // Verify credentials are deleted
        const credentialsAfter = await testDb.query(`
          SELECT COUNT(*) as count 
          FROM encrypted_credentials 
          WHERE platform_connection_id = $1
        `, [fixtures.platformConnection.id]);
        
        expect(parseInt(credentialsAfter.rows[0].count)).toBe(0);
      });

      it('should enforce unique credential per connection constraint', async () => {
        const fixtures = await testDb.createFixtures();

        // First access_token should work
        await testDb.query(`
          INSERT INTO encrypted_credentials (platform_connection_id, credential_type, encrypted_value)
          VALUES ($1, 'api_key', 'encrypted-api-key')
        `, [fixtures.platformConnection.id]);

        // Duplicate credential type should fail
        await expect(
          testDb.query(`
            INSERT INTO encrypted_credentials (platform_connection_id, credential_type, encrypted_value)
            VALUES ($1, 'api_key', 'another-encrypted-api-key')
          `, [fixtures.platformConnection.id])
        ).rejects.toThrow();
      });
    });

    describe('audit_logs table', () => {
      it('should allow NULL foreign key references', async () => {
        // Audit log without organization reference
        await testDb.query(`
          INSERT INTO audit_logs (event_type, event_category, actor_type, resource_type)
          VALUES ('system_startup', 'admin', 'system', 'system')
        `);

        // Should succeed without foreign key constraints
        const result = await testDb.query(`
          SELECT COUNT(*) as count FROM audit_logs WHERE organization_id IS NULL
        `);
        
        expect(parseInt(result.rows[0].count)).toBeGreaterThan(0);
      });

      it('should handle SET NULL on organization deletion', async () => {
        const fixtures = await testDb.createFixtures();

        // Create audit log with organization reference
        await testDb.query(`
          INSERT INTO audit_logs (organization_id, event_type, event_category, actor_type, resource_type)
          VALUES ($1, 'test_event', 'admin', 'user', 'organization')
        `, [fixtures.organization.id]);

        // Delete organization
        await testDb.query(`
          DELETE FROM organizations WHERE id = $1
        `, [fixtures.organization.id]);

        // Audit log should still exist but with NULL organization_id
        const result = await testDb.query(`
          SELECT organization_id FROM audit_logs WHERE event_type = 'test_event'
        `);
        
        expect(result.rows[0].organization_id).toBeNull();
      });
    });
  });

  describe('Triggers and Functions', () => {
    beforeEach(async () => {
      await testDb.executeMigration(migrationSql);
    });

    it('should update timestamps on record updates', async () => {
      const fixtures = await testDb.createFixtures();
      const originalUpdatedAt = fixtures.organization.updated_at;

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Update organization
      await testDb.query(`
        UPDATE organizations 
        SET name = 'Updated Organization Name'
        WHERE id = $1
      `, [fixtures.organization.id]);

      // Check updated timestamp
      const result = await testDb.query(`
        SELECT updated_at FROM organizations WHERE id = $1
      `, [fixtures.organization.id]);

      const newUpdatedAt = result.rows[0].updated_at;
      expect(new Date(newUpdatedAt).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      );
    });

    it('should automatically log platform connection changes', async () => {
      const fixtures = await testDb.createFixtures();

      // Update connection status
      await testDb.query(`
        UPDATE platform_connections 
        SET status = 'inactive'
        WHERE id = $1
      `, [fixtures.platformConnection.id]);

      // Check audit log
      const auditResult = await testDb.query(`
        SELECT event_type, event_data 
        FROM audit_logs 
        WHERE platform_connection_id = $1 
        AND event_type = 'platform_connection_status_changed'
        ORDER BY created_at DESC
        LIMIT 1
      `, [fixtures.platformConnection.id]);

      expect(auditResult.rows.length).toBe(1);
      const auditLog = auditResult.rows[0];
      expect(auditLog.event_type).toBe('platform_connection_status_changed');
      expect(auditLog.event_data.old_status).toBe('active');
      expect(auditLog.event_data.new_status).toBe('inactive');
    });

    it('should log platform connection creation', async () => {
      const fixtures = await testDb.createFixtures();

      // Check that creation was logged
      const auditResult = await testDb.query(`
        SELECT event_type, event_data 
        FROM audit_logs 
        WHERE platform_connection_id = $1 
        AND event_type = 'platform_connection_created'
      `, [fixtures.platformConnection.id]);

      expect(auditResult.rows.length).toBeGreaterThan(0);
      const auditLog = auditResult.rows[0];
      expect(auditLog.event_type).toBe('platform_connection_created');
      expect(auditLog.event_data.platform_type).toBe('slack');
      expect(auditLog.event_data.status).toBe('active');
    });

    it('should log platform connection deletion', async () => {
      const fixtures = await testDb.createFixtures();
      const connectionId = fixtures.platformConnection.id;

      // Delete connection
      await testDb.query(`
        DELETE FROM platform_connections WHERE id = $1
      `, [connectionId]);

      // Check deletion was logged
      const auditResult = await testDb.query(`
        SELECT event_type, event_data 
        FROM audit_logs 
        WHERE platform_connection_id = $1 
        AND event_type = 'platform_connection_deleted'
      `, [connectionId]);

      expect(auditResult.rows.length).toBe(1);
      const auditLog = auditResult.rows[0];
      expect(auditLog.event_type).toBe('platform_connection_deleted');
      expect(auditLog.event_data.platform_type).toBe('slack');
    });
  });

  describe('Row Level Security', () => {
    beforeEach(async () => {
      await testDb.executeMigration(migrationSql);
    });

    it('should enable RLS on all sensitive tables', async () => {
      const rlsPolicies = await testDb.verifyRLSPolicies();
      
      const rlsEnabledTables = rlsPolicies
        .filter(policy => policy.enabled)
        .map(policy => policy.table);

      expect(rlsEnabledTables).toContain('organizations');
      expect(rlsEnabledTables).toContain('platform_connections');
      expect(rlsEnabledTables).toContain('encrypted_credentials');
      expect(rlsEnabledTables).toContain('audit_logs');
    });

    it('should have isolation policies created', async () => {
      const policies = await testDb.query(`
        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
        FROM pg_policies
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname
      `);

      const policyNames = policies.rows.map(row => row.policyname);
      expect(policyNames).toContain('organizations_isolation');
      expect(policyNames).toContain('platform_connections_isolation');
      expect(policyNames).toContain('encrypted_credentials_isolation');
      expect(policyNames).toContain('audit_logs_isolation');
    });
  });

  describe('Indexes and Performance', () => {
    beforeEach(async () => {
      await testDb.executeMigration(migrationSql);
    });

    it('should create all required indexes', async () => {
      const indexes = await testDb.query(`
        SELECT schemaname, tablename, indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND indexname LIKE 'idx_%'
        ORDER BY tablename, indexname
      `);

      const indexNames = indexes.rows.map(row => row.indexname);
      
      // Organizations indexes
      expect(indexNames).toContain('idx_organizations_domain');
      expect(indexNames).toContain('idx_organizations_slug');
      expect(indexNames).toContain('idx_organizations_active');

      // Platform connections indexes
      expect(indexNames).toContain('idx_platform_connections_org_id');
      expect(indexNames).toContain('idx_platform_connections_platform_type');
      expect(indexNames).toContain('idx_platform_connections_status');
      expect(indexNames).toContain('idx_platform_connections_org_platform');
      expect(indexNames).toContain('idx_platform_connections_last_sync');
      expect(indexNames).toContain('idx_platform_connections_expires');

      // Encrypted credentials indexes
      expect(indexNames).toContain('idx_encrypted_credentials_connection_id');
      expect(indexNames).toContain('idx_encrypted_credentials_type');
      expect(indexNames).toContain('idx_encrypted_credentials_expires');
      expect(indexNames).toContain('idx_encrypted_credentials_key_id');

      // Audit logs indexes
      expect(indexNames).toContain('idx_audit_logs_org_id');
      expect(indexNames).toContain('idx_audit_logs_platform_connection_id');
      expect(indexNames).toContain('idx_audit_logs_event_type');
      expect(indexNames).toContain('idx_audit_logs_event_category');
      expect(indexNames).toContain('idx_audit_logs_created_at');
      expect(indexNames).toContain('idx_audit_logs_actor_id');
      expect(indexNames).toContain('idx_audit_logs_resource');
    });

    it('should optimize common query patterns', async () => {
      const fixtures = await testDb.createFixtures();

      // Test common queries that should use indexes
      const queries = [
        // Organization lookups
        {
          query: `SELECT * FROM organizations WHERE slug = $1`,
          params: [fixtures.organization.slug],
          description: 'Organization lookup by slug'
        },
        {
          query: `SELECT * FROM organizations WHERE domain = $1`,
          params: [fixtures.organization.domain],
          description: 'Organization lookup by domain'
        },
        // Platform connection queries
        {
          query: `SELECT * FROM platform_connections WHERE organization_id = $1`,
          params: [fixtures.organization.id],
          description: 'Connections by organization'
        },
        {
          query: `SELECT * FROM platform_connections WHERE organization_id = $1 AND platform_type = $2`,
          params: [fixtures.organization.id, 'slack'],
          description: 'Connections by organization and platform'
        },
        // Audit log queries
        {
          query: `SELECT * FROM audit_logs WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 10`,
          params: [fixtures.organization.id],
          description: 'Recent audit logs for organization'
        }
      ];

      for (const queryTest of queries) {
        const result = await testDb.query(queryTest.query, queryTest.params);
        expect(result.rows).toBeDefined();
      }
    });
  });

  describe('Data Integrity', () => {
    beforeEach(async () => {
      await testDb.executeMigration(migrationSql);
    });

    it('should maintain referential integrity', async () => {
      const constraints = await testDb.query(`
        SELECT conname, contype, confupdtype, confdeltype
        FROM pg_constraint
        WHERE contype = 'f'
        ORDER BY conname
      `);

      expect(constraints.rows.length).toBeGreaterThan(0);

      // Verify cascade delete behavior
      const fixtures = await testDb.createFixtures();

      // Delete organization should cascade to connections and credentials
      await testDb.query(`DELETE FROM organizations WHERE id = $1`, [fixtures.organization.id]);

      const connectionsCount = await testDb.query(`
        SELECT COUNT(*) as count FROM platform_connections WHERE organization_id = $1
      `, [fixtures.organization.id]);

      expect(parseInt(connectionsCount.rows[0].count)).toBe(0);
    });

    it('should validate JSONB data integrity', async () => {
      const fixtures = await testDb.createFixtures();

      // Valid JSON should work
      await testDb.query(`
        UPDATE organizations 
        SET settings = $1 
        WHERE id = $2
      `, [JSON.stringify({ valid: true, nested: { data: 123 } }), fixtures.organization.id]);

      // Invalid JSON should be rejected at application level
      // The database will accept any valid JSONB
      const complexSettings = {
        features: ['automation', 'security'],
        limits: { connections: 100, users: 50 },
        metadata: { version: '1.0', updated: new Date().toISOString() }
      };

      await testDb.query(`
        UPDATE organizations 
        SET settings = $1 
        WHERE id = $2
      `, [JSON.stringify(complexSettings), fixtures.organization.id]);

      // Verify data was stored correctly
      const result = await testDb.query(`
        SELECT settings FROM organizations WHERE id = $1
      `, [fixtures.organization.id]);

      expect(result.rows[0].settings).toEqual(complexSettings);
    });
  });

  describe('Migration Rollback', () => {
    it('should handle constraint violations gracefully', async () => {
      await testDb.executeMigration(migrationSql);

      // Verify constraint violations are properly handled
      const fixtures = await testDb.createFixtures();

      // Attempt operations that should fail
      const violations = [
        // Duplicate slug
        {
          query: `INSERT INTO organizations (name, slug) VALUES ('Test', $1)`,
          params: [fixtures.organization.slug]
        },
        // Invalid foreign key
        {
          query: `INSERT INTO platform_connections (organization_id, platform_type, platform_user_id, display_name) VALUES ($1, 'slack', 'user', 'test')`,
          params: ['invalid-org-id']
        },
        // Invalid enum value
        {
          query: `INSERT INTO platform_connections (organization_id, platform_type, platform_user_id, display_name) VALUES ($1, $2, 'user', 'test')`,
          params: [fixtures.organization.id, 'invalid_platform']
        }
      ];

      for (const violation of violations) {
        await expect(
          testDb.query(violation.query, violation.params)
        ).rejects.toThrow();
      }
    });

    it('should maintain data consistency during rollback', async () => {
      // This test would verify that partial migrations can be rolled back
      // For now, verify that constraints prevent inconsistent states
      await testDb.executeMigration(migrationSql);
      
      expect(await testDb.verifyConstraints()).toBe(true);
    });
  });

  describe('Comments and Documentation', () => {
    beforeEach(async () => {
      await testDb.executeMigration(migrationSql);
    });

    it('should include table comments', async () => {
      const comments = await testDb.query(`
        SELECT obj_description(oid) as comment, relname as table_name
        FROM pg_class
        WHERE relkind = 'r'
        AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND obj_description(oid) IS NOT NULL
        ORDER BY relname
      `);

      const commentedTables = comments.rows.map(row => row.table_name);
      expect(commentedTables).toContain('organizations');
      expect(commentedTables).toContain('platform_connections');
      expect(commentedTables).toContain('encrypted_credentials');
      expect(commentedTables).toContain('audit_logs');

      // Verify comment content
      const orgComment = comments.rows.find(row => row.table_name === 'organizations');
      expect(orgComment.comment).toContain('Multi-tenant organizations');
    });

    it('should include column comments', async () => {
      const comments = await testDb.query(`
        SELECT col_description(pgc.oid, pgc.attnum) as comment, pgc.attname as column_name, pgt.relname as table_name
        FROM pg_attribute pgc
        JOIN pg_class pgt ON pgc.attrelid = pgt.oid
        WHERE pgt.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND col_description(pgc.oid, pgc.attnum) IS NOT NULL
        AND pgt.relkind = 'r'
        ORDER BY pgt.relname, pgc.attname
      `);

      expect(comments.rows.length).toBeGreaterThan(0);

      // Check specific column comments
      const slugComment = comments.rows.find(row => 
        row.table_name === 'organizations' && row.column_name === 'slug'
      );
      expect(slugComment?.comment).toContain('URL-friendly identifier');
    });
  });
});