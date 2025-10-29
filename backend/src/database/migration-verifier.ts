/**
 * Database Migration Verifier
 * Verifies critical schema elements at startup to fail fast on mismatches
 */

import { db } from './pool';
import { logger } from '../utils/logger';

export interface SchemaVerificationResult {
  table: string;
  exists: boolean;
  columns: {
    name: string;
    exists: boolean;
    type?: string;
  }[];
  indexes: {
    name: string;
    exists: boolean;
  }[];
  errors: string[];
}

/**
 * Verify audit_logs table schema matches requirements
 */
export async function verifyAuditLogsSchema(): Promise<SchemaVerificationResult> {
  const result: SchemaVerificationResult = {
    table: 'audit_logs',
    exists: false,
    columns: [],
    indexes: [],
    errors: []
  };

  try {
    // Check if table exists
    const tableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'audit_logs'
      ) as exists;
    `;
    const tableResult = await db.query<{ exists: boolean }>(tableQuery);
    result.exists = tableResult.rows[0].exists;

    if (!result.exists) {
      result.errors.push('audit_logs table does not exist');
      logger.error('Schema verification failed: audit_logs table does not exist');
      return result;
    }

    // Check required columns
    const requiredColumns = [
      { name: 'id', type: 'uuid' },
      { name: 'timestamp', type: 'timestamp with time zone' },
      { name: 'created_at', type: 'timestamp with time zone' },
      { name: 'event_type', type: 'character varying' },
      { name: 'event_category', type: 'character varying' },
      { name: 'organization_id', type: 'character varying' },
      { name: 'user_id', type: 'character varying' },
      { name: 'actor_id', type: 'character varying' },
      { name: 'actor_type', type: 'character varying' },
      { name: 'action', type: 'character varying' },
      { name: 'severity', type: 'character varying' },
      { name: 'category', type: 'character varying' },
      { name: 'correlation_id', type: 'uuid' },
      { name: 'metadata', type: 'jsonb' },
      { name: 'event_data', type: 'jsonb' }
    ];

    for (const col of requiredColumns) {
      const columnQuery = `
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'audit_logs'
        AND column_name = $1;
      `;
      const columnResult = await db.query<{ column_name: string; data_type: string }>(columnQuery, [col.name]);
      const exists = columnResult.rows.length > 0;

      result.columns.push({
        name: col.name,
        exists,
        type: exists ? columnResult.rows[0].data_type : undefined
      });

      if (!exists) {
        result.errors.push(`Column '${col.name}' does not exist in audit_logs table`);
      }
    }

    // Check required indexes
    const requiredIndexes = [
      'idx_audit_logs_timestamp',
      'idx_audit_logs_created_at',
      'idx_audit_logs_org_id',
      'idx_audit_logs_user_id'
    ];

    for (const indexName of requiredIndexes) {
      const indexQuery = `
        SELECT EXISTS (
          SELECT FROM pg_indexes
          WHERE schemaname = 'public'
          AND tablename = 'audit_logs'
          AND indexname = $1
        ) as exists;
      `;
      const indexResult = await db.query<{ exists: boolean }>(indexQuery, [indexName]);
      const exists = indexResult.rows[0].exists;

      result.indexes.push({
        name: indexName,
        exists
      });

      if (!exists) {
        result.errors.push(`Index '${indexName}' does not exist on audit_logs table`);
      }
    }

    // Log verification results
    if (result.errors.length === 0) {
      logger.info('audit_logs schema verified successfully', {
        columns: result.columns.length,
        indexes: result.indexes.length
      });
    } else {
      logger.error('audit_logs schema verification failed', {
        errors: result.errors
      });
    }

    return result;
  } catch (error) {
    result.errors.push(`Schema verification error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    logger.error('Schema verification exception', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return result;
  }
}

/**
 * Verify all critical schemas at startup
 */
export async function verifyAllSchemas(): Promise<{
  success: boolean;
  results: SchemaVerificationResult[];
  errors: string[];
}> {
  logger.info('Starting database schema verification');

  const results: SchemaVerificationResult[] = [];
  const allErrors: string[] = [];

  // Verify audit_logs
  const auditLogsResult = await verifyAuditLogsSchema();
  results.push(auditLogsResult);
  allErrors.push(...auditLogsResult.errors);

  // Add more schema verifications here as needed
  // const otherTableResult = await verifyOtherTableSchema();
  // results.push(otherTableResult);
  // allErrors.push(...otherTableResult.errors);

  const success = allErrors.length === 0;

  if (success) {
    logger.info('All schema verifications passed', {
      tablesVerified: results.length
    });
  } else {
    logger.error('Schema verification failed', {
      totalErrors: allErrors.length,
      errors: allErrors
    });
  }

  return {
    success,
    results,
    errors: allErrors
  };
}

/**
 * Run schema verification and fail fast if critical issues found
 */
export async function runStartupVerification(): Promise<void> {
  try {
    const verification = await verifyAllSchemas();

    if (!verification.success) {
      const errorMessage = `
╔════════════════════════════════════════════════════════════════╗
║                DATABASE SCHEMA VERIFICATION FAILED              ║
╚════════════════════════════════════════════════════════════════╝

Critical schema mismatches detected. Please apply missing migrations:

${verification.errors.map(err => `  ❌ ${err}`).join('\n')}

To apply missing migrations:
  cd backend && npm run migrate

Application cannot start until schema is correct.
      `.trim();

      logger.error(errorMessage);
      throw new Error('Database schema verification failed. See logs above for details.');
    }

    logger.info('✅ Database schema verification passed');
  } catch (error) {
    logger.error('Startup verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}
