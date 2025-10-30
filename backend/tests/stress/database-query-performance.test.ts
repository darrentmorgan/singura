/**
 * Stress Test: Database Query Performance
 * Task 3.7: Validate all queries complete in <100ms
 *
 * Tests:
 * - Single queries: <100ms
 * - Batch queries: <500ms
 * - Complex joins: <200ms
 * - Aggregations: <150ms
 * - Connection pool efficiency
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { StressTestDataGenerator } from '../../src/services/testing/stress-test-data-generator.service';
import { PerformanceBenchmarkingService } from '../../src/services/testing/performance-benchmarking.service';
import { db } from '../../src/database/pool';

describe('Stress Test: Database Query Performance', () => {
  let generator: StressTestDataGenerator;
  let benchmark: PerformanceBenchmarkingService;
  const testOrgId = 'test-org-query-perf';
  let testAutomationIds: string[] = [];

  beforeAll(async () => {
    generator = new StressTestDataGenerator();
    benchmark = new PerformanceBenchmarkingService();

    // Create test organization
    await db.query(`
      INSERT INTO organizations (id, name, slug, domain)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO NOTHING
    `, [testOrgId, 'Test Org Query Perf', 'test-org-query-perf', 'test-query-perf.com']);

    console.log('');
    console.log('='.repeat(80));
    console.log('Setting up test data (10K automations)...');
    console.log('='.repeat(80));

    // Generate and insert 10K test automations
    const automations = generator.generateAutomations(10000);

    const insertStart = Date.now();
    for (const automation of automations) {
      const result = await db.query(`
        INSERT INTO automations (
          org_id, platform, automation_id, actual, confidence,
          platform_metadata, features, attack_type, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        testOrgId,
        automation.platform,
        automation.automationId,
        automation.actual,
        automation.confidence,
        JSON.stringify(automation.features),
        JSON.stringify(automation.features),
        automation.attackType || null,
        automation.timestamp
      ]);

      testAutomationIds.push(result.rows[0].id);
    }

    const insertDuration = Date.now() - insertStart;
    console.log(`✓ Inserted 10,000 automations in ${insertDuration}ms`);
    console.log('='.repeat(80));
    console.log('');
  }, 120000);

  afterAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM automations WHERE org_id = $1', [testOrgId]);
    await db.query('DELETE FROM organizations WHERE id = $1', [testOrgId]);
  });

  it('should execute single SELECT query in <100ms (Task 3.7)', async () => {
    console.log('');
    console.log('='.repeat(80));
    console.log('Task 3.7: Single SELECT Query Performance');
    console.log('Target: <100ms');
    console.log('='.repeat(80));

    const iterations = 10;
    const durations: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      const result = await db.query(
        'SELECT * FROM automations WHERE org_id = $1 LIMIT 100',
        [testOrgId]
      );
      const duration = Date.now() - start;
      durations.push(duration);
    }

    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);

    console.log('');
    console.log('Results:');
    console.log(`  Iterations:          ${iterations}`);
    console.log(`  Avg Duration:        ${avgDuration.toFixed(2)}ms`);
    console.log(`  Min Duration:        ${minDuration.toFixed(2)}ms`);
    console.log(`  Max Duration:        ${maxDuration.toFixed(2)}ms`);
    console.log('');
    console.log(`Target:                <100ms`);
    console.log(`Status:                ${avgDuration < 100 ? '✅ PASS' : '❌ FAIL'}`);
    console.log('='.repeat(80));
    console.log('');

    expect(avgDuration).toBeLessThan(100);
    expect(maxDuration).toBeLessThan(150); // Even worst case should be reasonable
  });

  it('should execute filtered SELECT by platform in <100ms', async () => {
    console.log('');
    console.log('='.repeat(80));
    console.log('Filtered SELECT Query (Platform Filter)');
    console.log('='.repeat(80));

    const start = Date.now();
    const result = await db.query(
      'SELECT * FROM automations WHERE platform = $1 AND org_id = $2 LIMIT 100',
      ['slack', testOrgId]
    );
    const duration = Date.now() - start;

    console.log('');
    console.log('Results:');
    console.log(`  Rows Returned:       ${result.rows.length}`);
    console.log(`  Duration:            ${duration}ms`);
    console.log(`  Status:              ${duration < 100 ? '✅ PASS (<100ms)' : '❌ FAIL'}`);
    console.log('='.repeat(80));
    console.log('');

    expect(duration).toBeLessThan(100);
    expect(result.rows.length).toBeGreaterThan(0);
  });

  it('should execute malicious automations query in <100ms', async () => {
    console.log('');
    console.log('='.repeat(80));
    console.log('Malicious Automations Query');
    console.log('='.repeat(80));

    const start = Date.now();
    const result = await db.query(
      `SELECT * FROM automations
       WHERE actual = $1 AND org_id = $2
       ORDER BY confidence DESC
       LIMIT 100`,
      ['malicious', testOrgId]
    );
    const duration = Date.now() - start;

    console.log('');
    console.log('Results:');
    console.log(`  Malicious Found:     ${result.rows.length}`);
    console.log(`  Duration:            ${duration}ms`);
    console.log(`  Status:              ${duration < 100 ? '✅ PASS (<100ms)' : '❌ FAIL'}`);
    console.log('='.repeat(80));
    console.log('');

    expect(duration).toBeLessThan(100);
    expect(result.rows.length).toBeGreaterThan(0);
  });

  it('should execute batch INSERT in <500ms', async () => {
    console.log('');
    console.log('='.repeat(80));
    console.log('Batch INSERT Performance (100 records)');
    console.log('Target: <500ms');
    console.log('='.repeat(80));

    const batchSize = 100;
    const batch = generator.generateBatch(batchSize, 0.2);

    const start = Date.now();

    for (const automation of batch) {
      await db.query(`
        INSERT INTO automations (
          org_id, platform, automation_id, actual, confidence,
          platform_metadata, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        testOrgId,
        automation.platform,
        `batch-${automation.automationId}`,
        automation.actual,
        automation.confidence,
        JSON.stringify(automation.features),
        automation.timestamp
      ]);
    }

    const duration = Date.now() - start;

    // Clean up batch
    await db.query(
      `DELETE FROM automations WHERE automation_id LIKE 'batch-%' AND org_id = $1`,
      [testOrgId]
    );

    console.log('');
    console.log('Results:');
    console.log(`  Records Inserted:    ${batchSize}`);
    console.log(`  Duration:            ${duration}ms`);
    console.log(`  Avg per Record:      ${(duration / batchSize).toFixed(2)}ms`);
    console.log('');
    console.log(`Target:                <500ms`);
    console.log(`Status:                ${duration < 500 ? '✅ PASS' : '❌ FAIL'}`);
    console.log('='.repeat(80));
    console.log('');

    expect(duration).toBeLessThan(500);
  });

  it('should execute UPDATE query in <100ms', async () => {
    console.log('');
    console.log('='.repeat(80));
    console.log('UPDATE Query Performance');
    console.log('='.repeat(80));

    if (testAutomationIds.length === 0) {
      throw new Error('No test automation IDs available');
    }

    const testId = testAutomationIds[0];

    const start = Date.now();
    await db.query(
      'UPDATE automations SET confidence = $1 WHERE id = $2',
      [0.95, testId]
    );
    const duration = Date.now() - start;

    console.log('');
    console.log('Results:');
    console.log(`  Duration:            ${duration}ms`);
    console.log(`  Status:              ${duration < 100 ? '✅ PASS (<100ms)' : '❌ FAIL'}`);
    console.log('='.repeat(80));
    console.log('');

    expect(duration).toBeLessThan(100);
  });

  it('should execute aggregation query in <150ms', async () => {
    console.log('');
    console.log('='.repeat(80));
    console.log('Aggregation Query Performance');
    console.log('Target: <150ms');
    console.log('='.repeat(80));

    const start = Date.now();
    const result = await db.query(`
      SELECT
        platform,
        COUNT(*) as total,
        COUNT(CASE WHEN actual = 'malicious' THEN 1 END) as malicious_count,
        AVG(confidence) as avg_confidence
      FROM automations
      WHERE org_id = $1
      GROUP BY platform
    `, [testOrgId]);
    const duration = Date.now() - start;

    console.log('');
    console.log('Results:');
    console.log(`  Platforms:           ${result.rows.length}`);
    console.log(`  Duration:            ${duration}ms`);

    result.rows.forEach(row => {
      console.log(`    ${row.platform}: ${row.total} total, ${row.malicious_count} malicious`);
    });

    console.log('');
    console.log(`Target:                <150ms`);
    console.log(`Status:                ${duration < 150 ? '✅ PASS' : '❌ FAIL'}`);
    console.log('='.repeat(80));
    console.log('');

    expect(duration).toBeLessThan(150);
    expect(result.rows.length).toBeGreaterThan(0);
  });

  it('should handle concurrent queries efficiently', async () => {
    console.log('');
    console.log('='.repeat(80));
    console.log('Concurrent Query Test (50 simultaneous queries)');
    console.log('='.repeat(80));

    const concurrentQueries = 50;

    const start = Date.now();

    const queries = Array.from({ length: concurrentQueries }, async (_, idx) => {
      const result = await db.query(
        'SELECT * FROM automations WHERE org_id = $1 LIMIT 10 OFFSET $2',
        [testOrgId, idx * 10]
      );
      return result.rows.length;
    });

    const results = await Promise.all(queries);
    const duration = Date.now() - start;

    const totalRows = results.reduce((sum, count) => sum + count, 0);

    console.log('');
    console.log('Results:');
    console.log(`  Concurrent Queries:  ${concurrentQueries}`);
    console.log(`  Total Rows:          ${totalRows}`);
    console.log(`  Duration:            ${duration}ms`);
    console.log(`  Avg per Query:       ${(duration / concurrentQueries).toFixed(2)}ms`);
    console.log('');
    console.log(`Status:                ${duration < 1000 ? '✅ PASS (<1s total)' : '❌ FAIL'}`);
    console.log('='.repeat(80));
    console.log('');

    expect(duration).toBeLessThan(1000);
    expect(totalRows).toBeGreaterThan(0);
  });

  it('should generate query performance report', async () => {
    console.log('');
    console.log('='.repeat(80));
    console.log('QUERY PERFORMANCE SUMMARY');
    console.log('='.repeat(80));

    const queries = [
      { name: 'Simple SELECT', query: 'SELECT * FROM automations WHERE org_id = $1 LIMIT 100', params: [testOrgId] },
      { name: 'Platform Filter', query: 'SELECT * FROM automations WHERE platform = $1 AND org_id = $2', params: ['slack', testOrgId] },
      { name: 'Malicious Filter', query: 'SELECT * FROM automations WHERE actual = $1 AND org_id = $2', params: ['malicious', testOrgId] },
      { name: 'COUNT Aggregation', query: 'SELECT COUNT(*) FROM automations WHERE org_id = $1', params: [testOrgId] },
      { name: 'AVG Aggregation', query: 'SELECT AVG(confidence) FROM automations WHERE org_id = $1', params: [testOrgId] }
    ];

    console.log('');
    console.log('| Query Type | Duration | Status |');
    console.log('|------------|----------|--------|');

    const slowQueries: string[] = [];

    for (const { name, query, params } of queries) {
      const start = Date.now();
      await db.query(query, params);
      const duration = Date.now() - start;

      const status = duration < 100 ? '✅ PASS' : '❌ SLOW';
      console.log(`| ${name.padEnd(26)} | ${duration.toString().padEnd(8)}ms | ${status.padEnd(6)} |`);

      if (duration >= 100) {
        slowQueries.push(`${name}: ${duration}ms`);
      }
    }

    console.log('');
    if (slowQueries.length > 0) {
      console.log('⚠️  Slow Queries Detected:');
      slowQueries.forEach(q => console.log(`   - ${q}`));
    } else {
      console.log('✅ All queries meet performance targets (<100ms)');
    }

    console.log('');
    console.log('Recommendations:');
    console.log('  - Add index on (org_id, platform) for faster filtering');
    console.log('  - Add index on (org_id, actual) for malicious queries');
    console.log('  - Consider partial index for confidence > 0.8');
    console.log('='.repeat(80));
    console.log('');

    expect(slowQueries.length).toBeLessThan(queries.length * 0.2); // Max 20% slow queries
  });
});
