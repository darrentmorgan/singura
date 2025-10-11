#!/usr/bin/env ts-node
/**
 * Check if discovered_automations table has valid UUIDs
 */

import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5433/singura';

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('🔍 Checking discovered_automations IDs...\n');

    const result = await pool.query(`
      SELECT
        id,
        external_id,
        name,
        automation_type,
        platform_metadata->>'clientId' as client_id,
        CASE
          WHEN id::text = external_id THEN 'ERROR: ID matches external_id'
          WHEN id::text ~* '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}' THEN 'OK: Valid UUID'
          ELSE 'ERROR: Invalid UUID format'
        END as id_status
      FROM discovered_automations
      LIMIT 10
    `);

    console.log(`Found ${result.rows.length} automations:\n`);

    for (const row of result.rows) {
      console.log(`Name: ${row.name}`);
      console.log(`  ID:          ${row.id}`);
      console.log(`  External ID: ${row.external_id}`);
      console.log(`  Client ID:   ${row.client_id || 'N/A'}`);
      console.log(`  Status:      ${row.id_status}`);
      console.log('');
    }

    // Check for ID conflicts
    const conflictCheck = await pool.query(`
      SELECT COUNT(*) as count
      FROM discovered_automations
      WHERE id::text = external_id
    `);

    const conflicts = parseInt(conflictCheck.rows[0].count);
    if (conflicts > 0) {
      console.log(`\n❌ CRITICAL: Found ${conflicts} automations where id equals external_id!`);
      console.log('   This will cause UUID parsing errors when calling /api/automations/:id/details\n');
    } else {
      console.log('\n✅ No ID conflicts found - all automations have proper UUIDs\n');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

main();
