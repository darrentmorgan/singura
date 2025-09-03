/**
 * Database migration runner
 * Handles applying and rolling back database migrations
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { db } from './pool';

interface Migration {
  id: number;
  filename: string;
  applied_at: Date;
}

export class MigrationRunner {
  private migrationsDir: string;

  constructor(migrationsDir?: string) {
    this.migrationsDir = migrationsDir || path.join(__dirname, '../../migrations');
  }

  /**
   * Initialize migration tracking table
   */
  private async initializeMigrationsTable(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await db.query(createTableQuery);
  }

  /**
   * Get list of applied migrations
   */
  private async getAppliedMigrations(): Promise<Migration[]> {
    try {
      const result = await db.query<Migration>(
        'SELECT * FROM schema_migrations ORDER BY id ASC'
      );
      return result.rows;
    } catch (error) {
      // Table doesn't exist yet
      return [];
    }
  }

  /**
   * Get list of migration files from filesystem
   */
  private async getMigrationFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.migrationsDir);
      return files
        .filter(file => file.endsWith('.sql') && /^\d+_/.test(file))
        .sort();
    } catch (error) {
      console.error('Failed to read migrations directory:', error);
      return [];
    }
  }

  /**
   * Parse migration ID from filename
   */
  private parseMigrationId(filename: string): number {
    const match = filename.match(/^(\d+)_/);
    return match && match[1] ? parseInt(match[1], 10) : 0;
  }

  /**
   * Execute SQL file
   */
  private async executeSqlFile(filePath: string): Promise<void> {
    const sql = await fs.readFile(filePath, 'utf-8');
    
    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        await db.query(statement);
      }
    }
  }

  /**
   * Run pending migrations
   */
  async migrate(): Promise<void> {
    console.log('Starting database migration...');

    await this.initializeMigrationsTable();
    
    const appliedMigrations = await this.getAppliedMigrations();
    const migrationFiles = await this.getMigrationFiles();
    
    const appliedIds = new Set(appliedMigrations.map(m => m.id));

    let migrationsRun = 0;

    for (const filename of migrationFiles) {
      const migrationId = this.parseMigrationId(filename);
      
      if (!appliedIds.has(migrationId)) {
        console.log(`Applying migration: ${filename}`);
        
        const filePath = path.join(this.migrationsDir, filename);
        
        try {
          await db.transaction(async (client) => {
            // Execute the migration
            const sql = await fs.readFile(filePath, 'utf-8');
            await client.query(sql);
            
            // Record the migration as applied
            await client.query(
              'INSERT INTO schema_migrations (id, filename) VALUES ($1, $2)',
              [migrationId, filename]
            );
          });
          
          console.log(`✓ Successfully applied migration: ${filename}`);
          migrationsRun++;
        } catch (error) {
          console.error(`✗ Failed to apply migration: ${filename}`, error);
          throw error;
        }
      }
    }

    if (migrationsRun === 0) {
      console.log('No pending migrations to apply.');
    } else {
      console.log(`Successfully applied ${migrationsRun} migration(s).`);
    }
  }

  /**
   * Get migration status
   */
  async status(): Promise<{
    applied: Migration[];
    pending: string[];
    total: number;
  }> {
    await this.initializeMigrationsTable();
    
    const applied = await this.getAppliedMigrations();
    const allFiles = await this.getMigrationFiles();
    const appliedIds = new Set(applied.map(m => m.id));
    
    const pending = allFiles.filter(filename => {
      const id = this.parseMigrationId(filename);
      return !appliedIds.has(id);
    });

    return {
      applied,
      pending,
      total: allFiles.length
    };
  }

  /**
   * Create a new migration file
   */
  async createMigration(name: string): Promise<string> {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const migrationFiles = await this.getMigrationFiles();
    
    // Get next migration number
    const lastMigration = migrationFiles[migrationFiles.length - 1];
    const lastId = lastMigration ? this.parseMigrationId(lastMigration) : 0;
    const nextId = String(lastId + 1).padStart(3, '0');
    
    const filename = `${nextId}_${name.replace(/\s+/g, '_').toLowerCase()}.sql`;
    const filePath = path.join(this.migrationsDir, filename);
    
    const template = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}
-- Description: [Add description here]

-- UP Migration
BEGIN;

-- Add your migration SQL here


COMMIT;

-- Note: This migration runner does not support automatic rollbacks.
-- Create a separate rollback migration if needed.
`;

    await fs.writeFile(filePath, template);
    console.log(`Created migration file: ${filename}`);
    
    return filePath;
  }

  /**
   * Validate migration files
   */
  async validate(): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    const files = await this.getMigrationFiles();
    const ids = new Set<number>();

    for (const filename of files) {
      const id = this.parseMigrationId(filename);
      
      if (id === 0) {
        issues.push(`Invalid migration filename format: ${filename}`);
        continue;
      }

      if (ids.has(id)) {
        issues.push(`Duplicate migration ID ${id}: ${filename}`);
        continue;
      }

      ids.add(id);

      // Check if file exists and is readable
      try {
        const filePath = path.join(this.migrationsDir, filename);
        await fs.access(filePath, fs.constants.R_OK);
        
        // Basic SQL syntax check
        const content = await fs.readFile(filePath, 'utf-8');
        if (content.trim().length === 0) {
          issues.push(`Empty migration file: ${filename}`);
        }
      } catch (error) {
        issues.push(`Cannot read migration file: ${filename}`);
      }
    }

    // Check for gaps in sequence
    const sortedIds = Array.from(ids).sort((a, b) => a - b);
    for (let i = 1; i < sortedIds.length; i++) {
      const current = sortedIds[i];
      const previous = sortedIds[i - 1];
      if (current !== undefined && previous !== undefined && current !== previous + 1) {
        issues.push(`Gap in migration sequence between ${previous} and ${current}`);
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}

// Default migration runner instance
export const migrationRunner = new MigrationRunner();

// CLI interface when run directly
if (require.main === module) {
  const command = process.argv[2];
  
  (async () => {
    try {
      await db.initialize();
      
      switch (command) {
        case 'migrate':
          await migrationRunner.migrate();
          break;
          
        case 'status':
          const status = await migrationRunner.status();
          console.log('Migration Status:');
          console.log(`Applied: ${status.applied.length}`);
          console.log(`Pending: ${status.pending.length}`);
          console.log(`Total: ${status.total}`);
          
          if (status.pending.length > 0) {
            console.log('\nPending migrations:');
            status.pending.forEach(file => console.log(`  - ${file}`));
          }
          break;
          
        case 'create':
          const migrationName = process.argv[3];
          if (!migrationName) {
            console.error('Please provide a migration name');
            process.exit(1);
          }
          await migrationRunner.createMigration(migrationName);
          break;
          
        case 'validate':
          const validation = await migrationRunner.validate();
          if (validation.valid) {
            console.log('All migrations are valid ✓');
          } else {
            console.log('Migration validation failed ✗');
            validation.issues.forEach(issue => console.log(`  - ${issue}`));
            process.exit(1);
          }
          break;
          
        default:
          console.log('Usage: node migrate.js <command>');
          console.log('Commands:');
          console.log('  migrate   - Run pending migrations');
          console.log('  status    - Show migration status');
          console.log('  create    - Create a new migration file');
          console.log('  validate  - Validate migration files');
          break;
      }
      
      await db.close();
    } catch (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }
  })();
}