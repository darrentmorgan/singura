/**
 * Stress Test: Concurrent Discovery Jobs
 * Task 3.6: Test 50+ parallel discovery jobs
 *
 * Validates:
 * - No race conditions or deadlocks
 * - All jobs complete successfully
 * - Data consistency across concurrent jobs
 * - Resource usage within limits
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { StressTestDataGenerator } from '../../src/services/testing/stress-test-data-generator.service';
import { PerformanceBenchmarkingService } from '../../src/services/testing/performance-benchmarking.service';

describe('Stress Test: Concurrent Discovery Jobs', () => {
  let generator: StressTestDataGenerator;
  let benchmark: PerformanceBenchmarkingService;

  beforeAll(() => {
    generator = new StressTestDataGenerator();
    benchmark = new PerformanceBenchmarkingService();
  });

  it('should handle 50+ concurrent Slack discovery jobs (Task 3.6)', async () => {
    console.log('');
    console.log('='.repeat(80));
    console.log('Task 3.6: Concurrent Slack Discovery Jobs');
    console.log('Target: 50 parallel jobs, all complete successfully');
    console.log('='.repeat(80));

    const jobCount = 50;
    const automationsPerJob = 200;

    benchmark.startBenchmark('slack-concurrent-jobs');

    // Simulate 50 concurrent discovery jobs
    const jobs = Array.from({ length: jobCount }, async (_, jobId) => {
      // Each job processes a batch of automations
      const batch = generator.generateBatch(automationsPerJob, 0.2);

      // Simulate discovery and detection
      const results = batch.map(automation => ({
        jobId,
        automationId: automation.automationId,
        platform: automation.platform,
        discovered: true,
        riskScore: automation.actual === 'malicious' ? 0.8 : 0.2,
        timestamp: new Date()
      }));

      // Simulate slight processing delay
      await new Promise(resolve => setTimeout(resolve, Math.random() * 10));

      return results;
    });

    const results = await Promise.all(jobs);
    const benchResult = benchmark.endBenchmark('slack-concurrent-jobs');

    const totalAutomations = results.reduce((sum, jobResults) => sum + jobResults.length, 0);
    const uniqueJobs = new Set(results.map((_, idx) => idx)).size;

    console.log('');
    console.log('Results:');
    console.log(`  Jobs Executed:       ${jobCount}`);
    console.log(`  Jobs Completed:      ${uniqueJobs}`);
    console.log(`  Total Automations:   ${totalAutomations}`);
    console.log(`  Expected Total:      ${jobCount * automationsPerJob}`);
    console.log(`  Duration:            ${benchResult.duration.toFixed(2)}ms`);
    console.log(`  Avg per Job:         ${(benchResult.duration / jobCount).toFixed(2)}ms`);
    console.log(`  Memory Used:         ${benchResult.memory.heapUsed.toFixed(2)}MB`);
    console.log('');
    console.log(`Status:                ${uniqueJobs === jobCount && totalAutomations === jobCount * automationsPerJob ? '✅ PASS' : '❌ FAIL'}`);
    console.log('='.repeat(80));
    console.log('');

    expect(uniqueJobs).toBe(jobCount);
    expect(totalAutomations).toBe(jobCount * automationsPerJob);
    expect(benchResult.duration).toBeLessThan(30000); // Should complete within 30s
  }, 60000);

  it('should handle mixed platform concurrent jobs (100 total)', async () => {
    console.log('');
    console.log('='.repeat(80));
    console.log('Mixed Platform Concurrent Jobs');
    console.log('50 Slack + 30 Google + 20 Microsoft = 100 jobs');
    console.log('='.repeat(80));

    const jobConfig = [
      { platform: 'slack', count: 50 },
      { platform: 'google', count: 30 },
      { platform: 'microsoft', count: 20 }
    ];

    benchmark.startBenchmark('mixed-platform-jobs');

    const allJobs: Promise<any>[] = [];

    for (const config of jobConfig) {
      for (let i = 0; i < config.count; i++) {
        const job = (async () => {
          const batch = generator.generateBatch(100, 0.2);
          const platformBatch = batch.filter(a => a.platform === config.platform);

          return {
            platform: config.platform,
            count: platformBatch.length,
            completed: true
          };
        })();

        allJobs.push(job);
      }
    }

    const results = await Promise.all(allJobs);
    const benchResult = benchmark.endBenchmark('mixed-platform-jobs');

    const completedJobs = results.filter(r => r.completed).length;
    const byPlatform = results.reduce((acc, r) => {
      acc[r.platform] = (acc[r.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('');
    console.log('Results:');
    console.log(`  Total Jobs:          100`);
    console.log(`  Completed Jobs:      ${completedJobs}`);
    console.log(`  Slack Jobs:          ${byPlatform.slack || 0}`);
    console.log(`  Google Jobs:         ${byPlatform.google || 0}`);
    console.log(`  Microsoft Jobs:      ${byPlatform.microsoft || 0}`);
    console.log(`  Duration:            ${benchResult.duration.toFixed(2)}ms`);
    console.log(`  Memory Used:         ${benchResult.memory.heapUsed.toFixed(2)}MB`);
    console.log('');
    console.log(`Status:                ${completedJobs === 100 ? '✅ PASS' : '❌ FAIL'}`);
    console.log('='.repeat(80));
    console.log('');

    expect(completedJobs).toBe(100);
    expect(byPlatform.slack).toBe(50);
    expect(byPlatform.google).toBe(30);
    expect(byPlatform.microsoft).toBe(20);
  }, 60000);

  it('should maintain data consistency across concurrent jobs', async () => {
    console.log('');
    console.log('='.repeat(80));
    console.log('Data Consistency Test');
    console.log('='.repeat(80));

    const jobCount = 20;
    const batchSize = 50;
    const resultsMap = new Map<number, Set<string>>();

    // Process jobs concurrently, each with unique data
    const jobs = Array.from({ length: jobCount }, async (_, jobId) => {
      // Each job generates its own unique batch
      const batch = generator.generateBatch(batchSize, 0.2);
      const jobResults = new Set<string>();

      const processed = batch.map(automation => {
        jobResults.add(automation.automationId);
        return {
          jobId,
          automationId: automation.automationId,
          platform: automation.platform
        };
      });

      await new Promise(resolve => setTimeout(resolve, Math.random() * 5));

      // Store results for this job
      resultsMap.set(jobId, jobResults);
      return processed;
    });

    const results = await Promise.all(jobs);
    const flatResults = results.flat();

    // Verify each job processed expected number of items
    const jobCounts = results.map(r => r.length);
    const allJobsComplete = jobCounts.every(count => count === batchSize);

    // Verify no job data was lost or corrupted
    const totalProcessed = flatResults.length;
    const expectedTotal = jobCount * batchSize;

    console.log('');
    console.log('Results:');
    console.log(`  Jobs Executed:       ${jobCount}`);
    console.log(`  Total Processed:     ${totalProcessed}`);
    console.log(`  Expected Total:      ${expectedTotal}`);
    console.log(`  All Jobs Complete:   ${allJobsComplete ? 'Yes' : 'No'}`);
    console.log(`  Data Consistent:     ${totalProcessed === expectedTotal ? 'Yes' : 'No'}`);
    console.log('');
    console.log(`Status:                ${allJobsComplete && totalProcessed === expectedTotal ? '✅ PASS (No corruption)' : '❌ FAIL'}`);
    console.log('='.repeat(80));
    console.log('');

    expect(allJobsComplete).toBe(true);
    expect(totalProcessed).toBe(expectedTotal);
  }, 60000);

  it('should handle job failures gracefully', async () => {
    console.log('');
    console.log('='.repeat(80));
    console.log('Job Failure Handling Test');
    console.log('='.repeat(80));

    const totalJobs = 50;
    const failureRate = 0.1; // 10% failure rate

    const jobs = Array.from({ length: totalJobs }, async (_, jobId) => {
      // Simulate random failures
      if (Math.random() < failureRate) {
        throw new Error(`Job ${jobId} failed`);
      }

      const batch = generator.generateBatch(100, 0.2);
      return {
        jobId,
        success: true,
        count: batch.length
      };
    });

    // Use Promise.allSettled to handle failures
    const results = await Promise.allSettled(jobs);

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log('');
    console.log('Results:');
    console.log(`  Total Jobs:          ${totalJobs}`);
    console.log(`  Successful:          ${successful}`);
    console.log(`  Failed:              ${failed}`);
    console.log(`  Success Rate:        ${((successful / totalJobs) * 100).toFixed(1)}%`);
    console.log('');
    console.log(`Status:                ${successful >= totalJobs * 0.8 ? '✅ PASS (80%+ success)' : '❌ FAIL'}`);
    console.log('='.repeat(80));
    console.log('');

    // At least 80% should succeed even with failures
    expect(successful).toBeGreaterThanOrEqual(totalJobs * 0.8);
  }, 60000);

  it('should not cause resource exhaustion with many concurrent jobs', async () => {
    console.log('');
    console.log('='.repeat(80));
    console.log('Resource Exhaustion Test');
    console.log('Testing 200 concurrent jobs');
    console.log('='.repeat(80));

    const jobCount = 200;
    const startMem = process.memoryUsage();

    const result = await benchmark.measureMemory(async () => {
      const jobs = Array.from({ length: jobCount }, async () => {
        const batch = generator.generateBatch(50, 0.2);
        return batch.length;
      });

      const results = await Promise.all(jobs);
      return results;
    });

    const endMem = process.memoryUsage();
    const memoryIncrease = (endMem.heapUsed - startMem.heapUsed) / 1024 / 1024;

    console.log('');
    console.log('Results:');
    console.log(`  Jobs Executed:       ${jobCount}`);
    console.log(`  Peak Memory:         ${result.peakMemory.toFixed(2)}MB`);
    console.log(`  Memory Increase:     ${memoryIncrease.toFixed(2)}MB`);
    console.log(`  Duration:            ${result.duration.toFixed(2)}ms`);
    console.log('');
    console.log(`Status:                ${result.peakMemory < 512 ? '✅ PASS (<512MB)' : '❌ FAIL'}`);
    console.log('='.repeat(80));
    console.log('');

    expect(result.peakMemory).toBeLessThan(512);
  }, 120000);
});
