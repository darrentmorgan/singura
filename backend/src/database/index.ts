/**
 * Database module index
 * Centralized export for all database functionality
 */

// Core database connection
export { db, DatabasePool, ensureInitialized } from './pool';

// Migration utilities
export { MigrationRunner, migrationRunner } from './migrate';

// Repository classes and instances
export * from './repositories';

// Type definitions
export * from '../types/database';

// Helper function to initialize the entire database system
export async function initializeDatabase(): Promise<void> {
  // Initialize connection pool
  await ensureInitialized();
  
  // Run any pending migrations
  await migrationRunner.migrate();
  
  console.log('Database system initialized successfully');
}

// Health check function
export async function getDatabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  details: any;
  migrations: {
    applied: number;
    pending: number;
    valid: boolean;
  };
}> {
  try {
    const poolHealth = await db.healthCheck();
    const migrationStatus = await migrationRunner.status();
    const migrationValidation = await migrationRunner.validate();
    
    return {
      status: poolHealth.status,
      details: poolHealth.details,
      migrations: {
        applied: migrationStatus.applied.length,
        pending: migrationStatus.pending.length,
        valid: migrationValidation.valid
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      migrations: {
        applied: 0,
        pending: 0,
        valid: false
      }
    };
  }
}