/**
 * Stress Test: Extended Memory Stability (Task 3.8)
 *
 * Validates no memory leaks over extended operation:
 * - Continuous processing for extended duration (configurable)
 * - Memory sampling every 10 seconds
 * - Trend analysis for memory growth
 * - Alert on continuous upward trend (leak indicator)
 *
 * Usage:
 * - Default: 5-minute test (practical for CI/CD)
 * - Extended: Set EXTENDED_TEST=true for 1-hour test
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { StressTestDataGenerator } from '../../src/services/testing/stress-test-data-generator.service';
import { PerformanceBenchmarkingService } from '../../src/services/testing/performance-benchmarking.service';

describe('Stress Test: Extended Memory Stability', () => {
  let generator: StressTestDataGenerator;
  let benchmark: PerformanceBenchmarkingService;

  // Configurable test duration
  const EXTENDED_MODE = process.env.EXTENDED_TEST === 'true';
  const TEST_DURATION_MS = EXTENDED_MODE ? 60 * 60 * 1000 : 5 * 60 * 1000; // 1 hour or 5 minutes
  const SAMPLE_INTERVAL_MS = 10 * 1000; // 10 seconds
  const BATCH_SIZE = 1000;
  const MAX_MEMORY_GROWTH_PERCENT = 15; // Max 15% growth is acceptable

  beforeAll(() => {
    generator = new StressTestDataGenerator();
    benchmark = new PerformanceBenchmarkingService();
  });

  it('should maintain stable memory over extended operation (Task 3.8)', async () => {
    console.log('');
    console.log('='.repeat(80));
    console.log('Task 3.8: Extended Memory Stability Test');
    console.log(`Mode: ${EXTENDED_MODE ? '1-HOUR EXTENDED' : '5-MINUTE STANDARD'}`);
    console.log(`Duration: ${TEST_DURATION_MS / 1000}s`);
    console.log(`Sampling Interval: ${SAMPLE_INTERVAL_MS / 1000}s`);
    console.log('='.repeat(80));

    const memoryReadings: Array<{
      timestamp: number;
      heapUsed: number;
      heapTotal: number;
      rss: number;
      external: number;
      batchNumber: number;
    }> = [];

    const startTime = Date.now();
    let batchNumber = 0;
    let lastSampleTime = startTime;

    console.log('');
    console.log('Starting continuous processing...');
    console.log('');

    // Continuous processing loop
    while (Date.now() - startTime < TEST_DURATION_MS) {
      // Process a batch of automations
      const automations = generator.generateAutomations(BATCH_SIZE);

      // Simulate detection processing
      const processed = automations.map(automation => ({
        ...automation,
        processed: true,
        riskScore: automation.actual === 'malicious' ? 0.8 : 0.2,
        detectionResults: {
          velocity: Math.random(),
          aiDetected: automation.features.hasAIProvider,
          timestamp: new Date()
        }
      }));

      batchNumber++;

      // Sample memory at intervals
      const currentTime = Date.now();
      if (currentTime - lastSampleTime >= SAMPLE_INTERVAL_MS) {
        const mem = process.memoryUsage();
        memoryReadings.push({
          timestamp: currentTime - startTime,
          heapUsed: mem.heapUsed / 1024 / 1024,
          heapTotal: mem.heapTotal / 1024 / 1024,
          rss: mem.rss / 1024 / 1024,
          external: mem.external / 1024 / 1024,
          batchNumber
        });

        lastSampleTime = currentTime;

        // Log progress
        const elapsed = Math.floor((currentTime - startTime) / 1000);
        const progress = ((currentTime - startTime) / TEST_DURATION_MS * 100).toFixed(1);
        console.log(`  [${elapsed}s] Progress: ${progress}% | Batch: ${batchNumber} | Heap: ${mem.heapUsed / 1024 / 1024}MB`);
      }

      // Small delay to prevent CPU saturation (realistic operation)
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('');
    console.log('Processing complete. Analyzing memory stability...');
    console.log('');

    // Analyze memory trends
    const analysis = analyzeMemoryTrend(memoryReadings);

    console.log('='.repeat(80));
    console.log('MEMORY STABILITY ANALYSIS');
    console.log('='.repeat(80));
    console.log('');
    console.log('Summary:');
    console.log(`  Total Duration:        ${(TEST_DURATION_MS / 1000).toFixed(0)}s`);
    console.log(`  Batches Processed:     ${batchNumber}`);
    console.log(`  Automations Processed: ${batchNumber * BATCH_SIZE}`);
    console.log(`  Memory Samples:        ${memoryReadings.length}`);
    console.log('');
    console.log('Memory Statistics:');
    console.log(`  Initial Heap:          ${analysis.initialHeap.toFixed(2)}MB`);
    console.log(`  Final Heap:            ${analysis.finalHeap.toFixed(2)}MB`);
    console.log(`  Peak Heap:             ${analysis.peakHeap.toFixed(2)}MB`);
    console.log(`  Average Heap:          ${analysis.avgHeap.toFixed(2)}MB`);
    console.log(`  Memory Growth:         ${analysis.growthPercent.toFixed(2)}%`);
    console.log('');
    console.log('Trend Analysis:');
    console.log(`  Trend Direction:       ${analysis.trendDirection}`);
    console.log(`  Slope (MB/sample):     ${analysis.slope.toFixed(4)}`);
    console.log(`  R² (fit quality):      ${analysis.rSquared.toFixed(4)}`);
    console.log(`  Leak Detected:         ${analysis.leakDetected ? '⚠️  YES' : '✅ NO'}`);
    console.log('');

    if (analysis.leakDetected) {
      console.log('⚠️  WARNING: Potential memory leak detected!');
      console.log('   - Memory shows continuous upward trend');
      console.log('   - Investigate object retention and cleanup');
    } else {
      console.log('✅ PASS: Memory stable, no leak detected');
    }

    console.log('');
    console.log('Memory Samples (First 5 and Last 5):');
    memoryReadings.slice(0, 5).forEach(reading => {
      console.log(`  [${reading.timestamp / 1000}s] Heap: ${reading.heapUsed.toFixed(2)}MB | Batch: ${reading.batchNumber}`);
    });
    if (memoryReadings.length > 10) {
      console.log('  ...');
      memoryReadings.slice(-5).forEach(reading => {
        console.log(`  [${reading.timestamp / 1000}s] Heap: ${reading.heapUsed.toFixed(2)}MB | Batch: ${reading.batchNumber}`);
      });
    }
    console.log('');
    console.log('='.repeat(80));
    console.log('');

    // Assertions
    expect(memoryReadings.length).toBeGreaterThan(0);
    expect(analysis.growthPercent).toBeLessThan(MAX_MEMORY_GROWTH_PERCENT);
    expect(analysis.leakDetected).toBe(false);
    expect(analysis.peakHeap).toBeLessThan(512); // Should stay under 512MB
  }, TEST_DURATION_MS + 30000); // Test timeout = duration + 30s buffer

  it('should handle continuous batch processing without degradation', async () => {
    console.log('');
    console.log('='.repeat(80));
    console.log('Continuous Batch Processing Test');
    console.log('='.repeat(80));

    const BATCH_COUNT = 50;
    const BATCH_SIZE = 500;
    const durations: number[] = [];

    console.log('');
    console.log(`Processing ${BATCH_COUNT} batches of ${BATCH_SIZE} automations each...`);
    console.log('');

    for (let i = 0; i < BATCH_COUNT; i++) {
      const start = Date.now();

      const automations = generator.generateAutomations(BATCH_SIZE);
      const processed = automations.map(a => ({
        ...a,
        processed: true,
        riskScore: Math.random()
      }));

      const duration = Date.now() - start;
      durations.push(duration);

      if ((i + 1) % 10 === 0) {
        const avgDuration = durations.slice(-10).reduce((a, b) => a + b) / 10;
        console.log(`  Batch ${i + 1}/${BATCH_COUNT}: ${duration}ms (avg last 10: ${avgDuration.toFixed(2)}ms)`);
      }
    }

    // Analyze performance degradation
    const firstQuarter = durations.slice(0, Math.floor(BATCH_COUNT / 4));
    const lastQuarter = durations.slice(-Math.floor(BATCH_COUNT / 4));

    const avgFirst = firstQuarter.reduce((a, b) => a + b) / firstQuarter.length;
    const avgLast = lastQuarter.reduce((a, b) => a + b) / lastQuarter.length;
    const degradationPercent = ((avgLast - avgFirst) / avgFirst) * 100;

    console.log('');
    console.log('Performance Analysis:');
    console.log(`  First Quarter Avg:   ${avgFirst.toFixed(2)}ms`);
    console.log(`  Last Quarter Avg:    ${avgLast.toFixed(2)}ms`);

    const changeType = degradationPercent < 0 ? 'Improvement' : 'Degradation';
    console.log(`  ${changeType}:        ${Math.abs(degradationPercent).toFixed(2)}%`);

    // Performance should remain stable (allow improvement or slight degradation)
    const isStable = degradationPercent < 50; // Allow up to 50% degradation, unlimited improvement
    console.log(`  Status:              ${isStable ? '✅ PASS (Stable)' : '❌ FAIL (Degraded > 50%)'}`);
    console.log('='.repeat(80));
    console.log('');

    // Performance should not degrade significantly (but improvement is fine)
    expect(degradationPercent).toBeLessThan(50);
  }, 120000);
});

/**
 * Analyze memory trend using linear regression
 */
function analyzeMemoryTrend(readings: Array<{ timestamp: number; heapUsed: number }>) {
  if (readings.length < 2) {
    return {
      initialHeap: 0,
      finalHeap: 0,
      peakHeap: 0,
      avgHeap: 0,
      growthPercent: 0,
      trendDirection: 'unknown' as const,
      slope: 0,
      rSquared: 0,
      leakDetected: false
    };
  }

  const initialHeap = readings[0].heapUsed;
  const finalHeap = readings[readings.length - 1].heapUsed;
  const peakHeap = Math.max(...readings.map(r => r.heapUsed));
  const avgHeap = readings.reduce((sum, r) => sum + r.heapUsed, 0) / readings.length;
  const growthPercent = ((finalHeap - initialHeap) / initialHeap) * 100;

  // Linear regression to detect trend
  const n = readings.length;
  const x = readings.map((_, i) => i); // Sample indices
  const y = readings.map(r => r.heapUsed);

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  // Slope (MB per sample)
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  // R² (coefficient of determination)
  const yMean = sumY / n;
  const ssTotal = y.reduce((sum, yi) => sum + (yi - yMean) ** 2, 0);
  const ssResidual = y.reduce((sum, yi, i) => {
    const predicted = slope * i + (sumY - slope * sumX) / n;
    return sum + (yi - predicted) ** 2;
  }, 0);
  const rSquared = 1 - ssResidual / ssTotal;

  // Determine trend direction
  let trendDirection: 'upward' | 'downward' | 'stable';
  if (slope > 0.1 && rSquared > 0.5) {
    trendDirection = 'upward';
  } else if (slope < -0.1 && rSquared > 0.5) {
    trendDirection = 'downward';
  } else {
    trendDirection = 'stable';
  }

  // Leak detection: strong upward trend with significant growth
  const leakDetected = trendDirection === 'upward' && rSquared > 0.7 && growthPercent > 15;

  return {
    initialHeap,
    finalHeap,
    peakHeap,
    avgHeap,
    growthPercent,
    trendDirection,
    slope,
    rSquared,
    leakDetected
  };
}
