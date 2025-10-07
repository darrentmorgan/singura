/**
 * Database Migration Runner
 * Automatically applies pending migrations on application startup
 */

import { db } from './pool';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface Migration {
  filename: string;
  name: string;
  checksum: string;
  content: string;
}

interface MigrationRecord {
  migration_name: string;
  applied_at: Date;
  checksum: string | null;
  success: boolean;
}

/**
 * Calculate SHA-256 checksum of migration file
 */
function calculateChecksum(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Get list of all migration files
 */
function getMigrationFiles(migrationsDir: string): Migration[] {
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort(); // Ensures migrations run in order (001, 002, 003, etc.)

  return files.map(filename => {
    const filePath = path.join(migrationsDir, filename);
    const content = fs.readFileSync(filePath, 'utf-8');
    const name = filename.replace('.sql', '');
    
    return {
      filename,
      name,
      checksum: calculateChecksum(content),
      content
    };
  });
}

/**
 * Get list of already-applied migrations
 */
async function getAppliedMigrations(): Promise<MigrationRecord[]> {
  try {
    const result = await db.query<MigrationRecord>(
      'SELECT migration_name, applied_at, checksum, success FROM schema_migrations ORDER BY id'
    );
    return result.rows;
  } catch (error) {
    // Table doesn't exist yet, no migrations applied
    return [];
  }
}

/**
 * Apply a single migration
 */
async function applyMigration(migration: Migration): Promise<void> {
  const startTime = Date.now();

  try {
    console.log(`🔄 Applying migration: ${migration.name}`);

    // Execute the migration
    await db.query(migration.content);

    const executionTime = Date.now() - startTime;

    // Record successful migration
    await db.query(
      `INSERT INTO schema_migrations (migration_name, checksum, execution_time_ms, success)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (migration_name) DO NOTHING`,
      [migration.name, migration.checksum, executionTime]
    );

    console.log(`✅ Migration applied successfully: ${migration.name} (${executionTime}ms)`);

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Record failed migration
    await db.query(
      `INSERT INTO schema_migrations (migration_name, checksum, execution_time_ms, success, error_message)
       VALUES ($1, $2, $3, false, $4)
       ON CONFLICT (migration_name) DO NOTHING`,
      [migration.name, migration.checksum, executionTime, errorMessage]
    );

    console.error(`❌ Migration failed: ${migration.name}`);
    console.error(`Error: ${errorMessage}`);

    throw new Error(`Migration ${migration.name} failed: ${errorMessage}`);
  }
}

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<void> {
  const migrationsDir = path.join(__dirname, '../../migrations');
  
  console.log('🔍 Checking for pending migrations...');
  
  try {
    // Get all migration files
    const migrations = getMigrationFiles(migrationsDir);
    console.log(`📁 Found ${migrations.length} migration files`);
    
    // Get already-applied migrations
    const appliedMigrations = await getAppliedMigrations();
    const appliedNames = new Set(appliedMigrations.map(m => m.migration_name));
    console.log(`✅ Already applied: ${appliedMigrations.length} migrations`);
    
    // Find pending migrations
    const pendingMigrations = migrations.filter(m => !appliedNames.has(m.name));
    
    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }
    
    console.log(`🔄 Applying ${pendingMigrations.length} pending migrations...`);
    
    // Apply each pending migration in order
    for (const migration of pendingMigrations) {
      await applyMigration(migration);
    }
    
    console.log('✅ All migrations applied successfully');
    
  } catch (error) {
    console.error('❌ Migration process failed:', error);
    throw error;
  }
}

/**
 * Verify migration checksums (detect manual changes)
 */
export async function verifyMigrations(): Promise<boolean> {
  const migrationsDir = path.join(__dirname, '../../migrations');
  
  try {
    const migrations = getMigrationFiles(migrationsDir);
    const appliedMigrations = await getAppliedMigrations();
    
    let allValid = true;
    
    for (const applied of appliedMigrations) {
      const migration = migrations.find(m => m.name === applied.migration_name);
      
      if (!migration) {
        console.warn(`⚠️  Applied migration not found in files: ${applied.migration_name}`);
        allValid = false;
        continue;
      }
      
      if (applied.checksum && migration.checksum !== applied.checksum) {
        console.warn(`⚠️  Checksum mismatch for ${applied.migration_name}`);
        console.warn(`   Expected: ${applied.checksum}`);
        console.warn(`   Actual:   ${migration.checksum}`);
        allValid = false;
      }
    }
    
    return allValid;
    
  } catch (error) {
    console.error('❌ Migration verification failed:', error);
    return false;
  }
}

/**
 * CLI handler
 */
if (require.main === module) {
  const command = process.argv[2] || 'migrate';

  (async () => {
    try {
      // Initialize database connection
      await db.initialize();

      if (command === 'migrate') {
        await runMigrations();
      } else if (command === 'verify') {
        const isValid = await verifyMigrations();
        process.exit(isValid ? 0 : 1);
      } else {
        console.error(`Unknown command: ${command}`);
        console.log('Usage: ts-node migrate.ts [migrate|verify]');
        process.exit(1);
      }

      // Close database connection
      await db.close();
      process.exit(0);
    } catch (error) {
      console.error('Migration error:', error);
      process.exit(1);
    }
  })();
}
