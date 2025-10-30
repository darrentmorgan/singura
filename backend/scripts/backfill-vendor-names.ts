/**
 * Backfill Vendor Names Script
 *
 * Backfills vendor_name and vendor_group columns for existing discovered_automations.
 * Extracts vendor names from the 'name' field and generates platform-scoped vendor groups.
 *
 * Usage:
 *   npx ts-node scripts/backfill-vendor-names.ts [--dry-run]
 *
 * Options:
 *   --dry-run    Preview changes without modifying the database
 */

import { db } from '../src/database/pool';
import { extractVendorName, generateVendorGroup } from '../src/utils/vendor-extraction';

interface AutomationRecord {
  id: string;
  name: string;
  platform_type: string;
  vendor_name: string | null;
  vendor_group: string | null;
}

interface BackfillStats {
  total: number;
  skipped: number;
  updated: number;
  failed: number;
  nullVendor: number;
}

async function backfillVendorNames(dryRun: boolean = false): Promise<BackfillStats> {
  const stats: BackfillStats = {
    total: 0,
    skipped: 0,
    updated: 0,
    failed: 0,
    nullVendor: 0
  };

  console.log(`🔄 Starting vendor name backfill (${dryRun ? 'DRY RUN' : 'LIVE MODE'})...`);
  console.log('');

  try {
    // Fetch all automations with vendor_name = NULL
    const query = `
      SELECT
        da.id,
        da.name,
        pc.platform_type,
        da.vendor_name,
        da.vendor_group
      FROM discovered_automations da
      LEFT JOIN platform_connections pc ON da.platform_connection_id = pc.id
      WHERE da.vendor_name IS NULL
      ORDER BY da.created_at ASC
    `;

    const result = await db.query<AutomationRecord>(query);
    stats.total = result.rows.length;

    console.log(`📊 Found ${stats.total} automations to process`);
    console.log('');

    if (stats.total === 0) {
      console.log('✅ No automations need backfilling. All done!');
      return stats;
    }

    // Process each automation
    for (const automation of result.rows) {
      try {
        // Extract vendor from name field
        const vendorName = extractVendorName(automation.name);
        const vendorGroup = generateVendorGroup(vendorName, automation.platform_type);

        if (!vendorName) {
          stats.nullVendor++;
          console.log(`⚠️  [${automation.id}] No vendor extracted from: "${automation.name}"`);
          continue;
        }

        if (dryRun) {
          console.log(`✓  [${automation.id}] Would update: "${automation.name}" → vendor="${vendorName}", group="${vendorGroup}"`);
          stats.updated++;
        } else {
          // Update the record
          const updateQuery = `
            UPDATE discovered_automations
            SET
              vendor_name = $1,
              vendor_group = $2,
              updated_at = NOW()
            WHERE id = $3
          `;

          await db.query(updateQuery, [vendorName, vendorGroup, automation.id]);
          stats.updated++;

          if (stats.updated % 10 === 0) {
            console.log(`✓  Updated ${stats.updated}/${stats.total} automations...`);
          }
        }

      } catch (error) {
        stats.failed++;
        console.error(`❌ [${automation.id}] Failed to process:`, error instanceof Error ? error.message : error);
      }
    }

    console.log('');
    console.log('📈 Backfill Summary:');
    console.log(`   Total automations processed:     ${stats.total}`);
    console.log(`   Successfully updated:            ${stats.updated}`);
    console.log(`   No vendor extracted (null):      ${stats.nullVendor}`);
    console.log(`   Failed:                          ${stats.failed}`);
    console.log('');

    if (dryRun) {
      console.log('ℹ️  This was a dry run. No changes were made to the database.');
      console.log('   Run without --dry-run to apply changes.');
    } else {
      console.log('✅ Backfill complete!');
    }

    return stats;

  } catch (error) {
    console.error('❌ Backfill failed:', error);
    throw error;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// Run the backfill
backfillVendorNames(dryRun)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
