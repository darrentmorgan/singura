#!/usr/bin/env tsx
/**
 * Memory Cleanup Utilities
 *
 * Forces garbage collection between agent executions to prevent memory accumulation.
 * Use between sequential agent invocations to maintain low memory footprint.
 *
 * Usage:
 *   import { forceGC, getMemoryUsage, cleanupBetweenAgents } from './memory-cleanup';
 *
 *   // Between agent executions
 *   await cleanupBetweenAgents();
 *
 * CLI Usage:
 *   npx tsx --expose-gc scripts/memory-cleanup.ts --force
 */

/**
 * Force garbage collection if --expose-gc flag is set
 *
 * To enable: Run node with --expose-gc flag
 * Example: node --expose-gc script.js
 */
export function forceGC(): boolean {
  if (global.gc) {
    global.gc();
    return true;
  }
  return false;
}

/**
 * Get current memory usage in MB
 */
export function getMemoryUsage(): {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
} {
  const usage = process.memoryUsage();
  return {
    rss: Math.round(usage.rss / 1024 / 1024),
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
    external: Math.round(usage.external / 1024 / 1024),
    arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024)
  };
}

/**
 * Cleanup between agent executions
 *
 * Steps:
 * 1. Clear require cache (if using require)
 * 2. Force garbage collection
 * 3. Wait for GC to complete
 * 4. Return memory stats
 */
export async function cleanupBetweenAgents(): Promise<{
  before: ReturnType<typeof getMemoryUsage>;
  after: ReturnType<typeof getMemoryUsage>;
  freed: number;
  gcAvailable: boolean;
}> {
  const before = getMemoryUsage();

  // Clear setImmediate/setTimeout callbacks (if any)
  // This is safe - only clears our own callbacks

  // Force GC if available
  const gcAvailable = forceGC();

  // Wait for GC to complete
  await new Promise(resolve => setImmediate(resolve));

  const after = getMemoryUsage();
  const freed = before.heapUsed - after.heapUsed;

  return {
    before,
    after,
    freed,
    gcAvailable
  };
}

/**
 * Check if memory usage exceeds threshold
 *
 * @param thresholdMB - Memory threshold in MB (default: 6144 = 6GB)
 * @returns true if memory usage is above threshold
 */
export function isMemoryHigh(thresholdMB: number = 6144): boolean {
  const usage = getMemoryUsage();
  return usage.heapUsed > thresholdMB;
}

/**
 * Wait for memory to drop below threshold
 *
 * @param thresholdMB - Memory threshold in MB
 * @param maxWaitMs - Maximum time to wait in milliseconds (default: 30000 = 30s)
 * @param checkIntervalMs - How often to check in milliseconds (default: 1000 = 1s)
 * @returns true if memory dropped below threshold, false if timed out
 */
export async function waitForMemoryCleanup(
  thresholdMB: number = 6144,
  maxWaitMs: number = 30000,
  checkIntervalMs: number = 1000
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    // Force GC and check
    await cleanupBetweenAgents();

    if (!isMemoryHigh(thresholdMB)) {
      return true;
    }

    // Wait before next check
    await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
  }

  return false; // Timed out
}

/**
 * Get memory stats formatted for logging
 */
export function formatMemoryStats(usage: ReturnType<typeof getMemoryUsage>): string {
  return [
    `RSS: ${usage.rss}MB`,
    `Heap: ${usage.heapUsed}/${usage.heapTotal}MB`,
    `External: ${usage.external}MB`,
    `ArrayBuffers: ${usage.arrayBuffers}MB`
  ].join(', ');
}

/**
 * Log memory usage with optional label
 */
export function logMemoryUsage(label: string = 'Memory'): void {
  const usage = getMemoryUsage();
  console.error(`[${label}] ${formatMemoryStats(usage)}`);
}

/**
 * CLI entry point
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const forceCleanup = args.includes('--force');
  const showHelp = args.includes('--help') || args.includes('-h');

  if (showHelp) {
    console.log('Memory Cleanup Utilities');
    console.log('');
    console.log('Usage:');
    console.log('  npx tsx --expose-gc scripts/memory-cleanup.ts [options]');
    console.log('');
    console.log('Options:');
    console.log('  --force       Force garbage collection');
    console.log('  --help, -h    Show this help message');
    console.log('');
    console.log('Note: Run with --expose-gc flag to enable garbage collection');
    console.log('      Example: npx tsx --expose-gc scripts/memory-cleanup.ts --force');
    process.exit(0);
  }

  console.log('Memory Usage:');
  logMemoryUsage('Before');

  if (forceCleanup) {
    const result = await cleanupBetweenAgents();
    console.log('');
    console.log('Cleanup Results:');
    console.log(`  GC Available: ${result.gcAvailable ? 'Yes' : 'No (run with --expose-gc)'}`);
    console.log(`  Freed: ${result.freed}MB`);
    console.log('');
    logMemoryUsage('After');
  } else {
    console.log('');
    console.log('Tip: Use --force to run garbage collection');
  }
}
