/**
 * Unit tests for audit log timestamp column fix
 * Verifies migration 012 requirements
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { db } from '../../database/pool';
import { verifyAuditLogsSchema } from '../../database/migration-verifier';
import { v4 as uuidv4 } from 'uuid';

describe('Audit Logs Timestamp Column', () => {
  beforeAll(async () => {
    // Clean up test data
    await db.query("DELETE FROM audit_logs WHERE user_id LIKE 'test_%'");
  });

  afterAll(async () => {
    // Clean up test data
    await db.query("DELETE FROM audit_logs WHERE user_id LIKE 'test_%'");
  });

  it('should verify audit_logs table schema', async () => {
    const result = await verifyAuditLogsSchema();

    expect(result.exists).toBe(true);
    expect(result.errors).toHaveLength(0);

    // Check critical columns
    const timestampCol = result.columns.find(c => c.name === 'timestamp');
    expect(timestampCol?.exists).toBe(true);

    const createdAtCol = result.columns.find(c => c.name === 'created_at');
    expect(createdAtCol?.exists).toBe(true);

    const userIdCol = result.columns.find(c => c.name === 'user_id');
    expect(userIdCol?.exists).toBe(true);

    const actionCol = result.columns.find(c => c.name === 'action');
    expect(actionCol?.exists).toBe(true);
  });

  it('should insert audit log with timestamp column', async () => {
    const testUserId = `test_user_${Date.now()}`;
    const correlationId = uuidv4();

    const query = `
      INSERT INTO audit_logs (
        timestamp, user_id, organization_id, event_type, event_category,
        actor_type, resource_type, resource_id, ip_address, user_agent,
        metadata, severity, category, correlation_id, action
      ) VALUES (
        NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      ) RETURNING id, timestamp, created_at;
    `;

    const values = [
      testUserId,
      null, // organization_id (nullable)
      'user_login',
      'auth',
      'user',
      'user_account',
      testUserId,
      '127.0.0.1',
      'test-agent',
      JSON.stringify({ test: true }),
      'low',
      'auth',
      correlationId,
      'user_login'
    ];

    const result = await db.query<{
      id: string;
      timestamp: Date;
      created_at: Date;
    }>(query, values);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].id).toBeDefined();
    expect(result.rows[0].timestamp).toBeInstanceOf(Date);
    expect(result.rows[0].created_at).toBeInstanceOf(Date);
  });

  it('should differentiate between timestamp and created_at', async () => {
    const testUserId = `test_user_diff_${Date.now()}`;
    const correlationId = uuidv4();

    // Insert with specific timestamp (1 hour ago)
    const eventTime = new Date(Date.now() - 3600000); // 1 hour ago

    const query = `
      INSERT INTO audit_logs (
        timestamp, user_id, organization_id, event_type, event_category,
        actor_type, resource_type, resource_id, metadata, severity,
        category, correlation_id, action
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      ) RETURNING id, timestamp, created_at;
    `;

    const values = [
      eventTime,
      testUserId,
      null,
      'delayed_event',
      'admin',
      'system',
      'batch_job',
      'job_123',
      JSON.stringify({ delayed: true }),
      'medium',
      'admin',
      correlationId,
      'delayed_event'
    ];

    const result = await db.query<{
      id: string;
      timestamp: Date;
      created_at: Date;
    }>(query, values);

    const row = result.rows[0];

    // timestamp should be ~1 hour ago
    const timestampMs = new Date(row.timestamp).getTime();
    const eventTimeMs = eventTime.getTime();
    expect(Math.abs(timestampMs - eventTimeMs)).toBeLessThan(1000); // Within 1 second

    // created_at should be recent (within last 10 seconds)
    const createdAtMs = new Date(row.created_at).getTime();
    const nowMs = Date.now();
    expect(Math.abs(nowMs - createdAtMs)).toBeLessThan(10000); // Within 10 seconds
  });

  it('should query by timestamp column', async () => {
    const testUserId = `test_user_query_${Date.now()}`;
    const correlationId = uuidv4();

    // Insert test record
    await db.query(`
      INSERT INTO audit_logs (
        timestamp, user_id, organization_id, event_type, event_category,
        actor_type, severity, category, correlation_id, action
      ) VALUES (
        NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9
      )
    `, [testUserId, null, 'test_query', 'admin', 'user', 'low', 'admin', correlationId, 'test_query']);

    // Query by timestamp
    const query = `
      SELECT * FROM audit_logs
      WHERE timestamp > NOW() - INTERVAL '1 hour'
      AND user_id = $1
      ORDER BY timestamp DESC
    `;

    const result = await db.query(query, [testUserId]);

    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows[0].user_id).toBe(testUserId);
  });

  it('should verify required indexes exist', async () => {
    const result = await verifyAuditLogsSchema();

    const timestampIdx = result.indexes.find(i => i.name === 'idx_audit_logs_timestamp');
    expect(timestampIdx?.exists).toBe(true);

    const createdAtIdx = result.indexes.find(i => i.name === 'idx_audit_logs_created_at');
    expect(createdAtIdx?.exists).toBe(true);

    const userIdIdx = result.indexes.find(i => i.name === 'idx_audit_logs_user_id');
    expect(userIdIdx?.exists).toBe(true);
  });

  it('should support both event_type and action columns', async () => {
    const testUserId = `test_user_compat_${Date.now()}`;
    const correlationId = uuidv4();

    const query = `
      INSERT INTO audit_logs (
        timestamp, user_id, event_type, event_category, actor_type,
        action, severity, category, correlation_id
      ) VALUES (
        NOW(), $1, $2, $3, $4, $5, $6, $7, $8
      ) RETURNING event_type, action;
    `;

    const result = await db.query<{
      event_type: string;
      action: string;
    }>(query, [
      testUserId,
      'oauth_callback',
      'auth',
      'user',
      'oauth_callback',
      'low',
      'auth',
      correlationId
    ]);

    expect(result.rows[0].event_type).toBe('oauth_callback');
    expect(result.rows[0].action).toBe('oauth_callback');
  });
});
