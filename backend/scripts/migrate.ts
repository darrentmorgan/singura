#!/usr/bin/env ts-node

/**
 * Migration CLI Tool
 * Standalone script for managing database migrations
 *
 * Usage:
 *   pnpm run migrate up       - Apply pending migrations
 *   pnpm run migrate status   - Show migration status
 *   pnpm run migrate validate - Verify migration checksums
 */

import { MigrationRunner } from '../src/database/migrate';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  const command = process.argv[2] || 'status';
  const runner = new MigrationRunner();

  try {
    // Initialize migration pool
    console.log('🔌 Connecting to database...');
    await runner.initialize();
    console.log('✅ Connected\n');

    switch (command) {
      case 'up':
      case 'migrate': {
        console.log('🔄 Applying pending migrations...\n');
        const result = await runner.migrate();
        console.log(`\n✅ Migration complete:`);
        console.log(`   - Applied: ${result.applied} migrations`);
        console.log(`   - Skipped: ${result.skipped} migrations`);
        break;
      }

      case 'status': {
        const status = await runner.status();

        console.log('📊 Migration Status:\n');

        if (status.applied.length > 0) {
          console.log(`Applied Migrations (${status.applied.length}):`);
          status.applied.forEach(m => {
            const statusIcon = m.success ? '✅' : '❌';
            const date = new Date(m.applied_at).toLocaleString();
            console.log(`  ${statusIcon} ${m.migration_name} (${date})`);
          });
        } else {
          console.log('Applied Migrations: None');
        }

        console.log('');

        if (status.pending.length > 0) {
          console.log(`Pending Migrations (${status.pending.length}):`);
          status.pending.forEach(m => {
            console.log(`  ⏳ ${m.name}`);
          });
        } else {
          console.log('Pending Migrations: None');
        }
        break;
      }

      case 'validate':
      case 'verify': {
        console.log('🔍 Validating migration checksums...\n');
        const result = await runner.validate();

        if (result.valid) {
          console.log('✅ All migrations are valid');
        } else {
          console.error('❌ Migration validation failed:\n');
          result.errors.forEach(err => {
            console.error(`   - ${err}`);
          });
          process.exit(1);
        }
        break;
      }

      default:
        console.error(`❌ Unknown command: ${command}\n`);
        console.log('Usage:');
        console.log('  pnpm run migrate up       - Apply pending migrations');
        console.log('  pnpm run migrate status   - Show migration status');
        console.log('  pnpm run migrate validate - Verify migration checksums');
        process.exit(1);
    }

    // Cleanup
    await runner.cleanup();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Migration failed:', error instanceof Error ? error.message : error);

    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    await runner.cleanup();
    process.exit(1);
  }
}

// Run main function
main();
