#!/usr/bin/env tsx
/**
 * Safe Parallel Executor
 *
 * Implements controlled concurrency with memory safety checks.
 * Uses p-limit to restrict concurrent agent executions to N=2 by default.
 * Monitors memory and falls back to sequential if memory high.
 *
 * Usage:
 *   import { executeSafeParallel } from './safe-parallel-executor';
 *
 *   const results = await executeSafeParallel([agent1, agent2, agent3], {
 *     concurrency: 2,
 *     memoryThreshold: 4096  // 4GB
 *   });
 */

import pLimit from 'p-limit';
import { getMemoryUsage, isMemoryHigh, cleanupBetweenAgents } from './memory-cleanup.js';

export interface SafeParallelOptions {
  /**
   * Maximum number of concurrent operations
   * @default 2
   */
  concurrency?: number;

  /**
   * Memory threshold in MB. If exceeded, falls back to sequential.
   * @default 4096 (4GB)
   */
  memoryThreshold?: number;

  /**
   * Force garbage collection between batches
   * @default true
   */
  forceGC?: boolean;

  /**
   * Verbose logging
   * @default false
   */
  verbose?: boolean;
}

export interface TaskFunction<T> {
  (): Promise<T>;
}

/**
 * Execute tasks with controlled concurrency and memory safety
 *
 * Features:
 * - Limits concurrent executions to N (default: 2)
 * - Checks memory before each batch
 * - Falls back to sequential if memory high
 * - Forces GC between batches
 * - Returns all results in order
 */
export async function executeSafeParallel<T>(
  tasks: TaskFunction<T>[],
  options: SafeParallelOptions = {}
): Promise<T[]> {
  const {
    concurrency = 2,
    memoryThreshold = 4096,
    forceGC = true,
    verbose = false
  } = options;

  if (tasks.length === 0) {
    return [];
  }

  // Check initial memory
  const initialMemory = getMemoryUsage();
  if (verbose) {
    console.error(`[SafeParallel] Starting with ${tasks.length} tasks, concurrency: ${concurrency}`);
    console.error(`[SafeParallel] Initial memory: ${initialMemory.heapUsed}MB`);
  }

  // If memory already high, force sequential
  if (isMemoryHigh(memoryThreshold)) {
    if (verbose) {
      console.error(`[SafeParallel] Memory high (${initialMemory.heapUsed}MB), falling back to sequential`);
    }
    return executeSequential(tasks, { forceGC, verbose });
  }

  // Create concurrency limiter
  const limit = pLimit(concurrency);
  const results: T[] = [];

  // Process in batches to allow GC between batches
  const batchSize = concurrency * 2; // Process 2x concurrency at a time
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);

    if (verbose) {
      console.error(`[SafeParallel] Processing batch ${Math.floor(i / batchSize) + 1}, tasks: ${batch.length}`);
    }

    // Check memory before batch
    const beforeBatch = getMemoryUsage();
    if (isMemoryHigh(memoryThreshold)) {
      if (verbose) {
        console.error(`[SafeParallel] Memory high before batch (${beforeBatch.heapUsed}MB), switching to sequential`);
      }
      // Process remaining tasks sequentially
      const remaining = tasks.slice(i);
      const remainingResults = await executeSequential(remaining, { forceGC, verbose });
      results.push(...remainingResults);
      break;
    }

    // Execute batch with limited concurrency
    const batchResults = await Promise.all(
      batch.map(task => limit(task))
    );

    results.push(...batchResults);

    // Force GC between batches
    if (forceGC && i + batchSize < tasks.length) {
      const cleanup = await cleanupBetweenAgents();
      if (verbose) {
        console.error(`[SafeParallel] Batch complete, freed ${cleanup.freed}MB`);
      }

      // Wait a bit for GC to complete
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  const finalMemory = getMemoryUsage();
  if (verbose) {
    console.error(`[SafeParallel] Complete. Final memory: ${finalMemory.heapUsed}MB (delta: ${finalMemory.heapUsed - initialMemory.heapUsed}MB)`);
  }

  return results;
}

/**
 * Execute tasks sequentially as fallback
 */
async function executeSequential<T>(
  tasks: TaskFunction<T>[],
  options: { forceGC?: boolean; verbose?: boolean }
): Promise<T[]> {
  const { forceGC = true, verbose = false } = options;
  const results: T[] = [];

  for (let i = 0; i < tasks.length; i++) {
    if (verbose) {
      console.error(`[Sequential] Executing task ${i + 1}/${tasks.length}`);
    }

    results.push(await tasks[i]());

    // Force GC between tasks
    if (forceGC && i < tasks.length - 1) {
      await cleanupBetweenAgents();
    }
  }

  return results;
}

/**
 * Create a safe parallel executor with preset options
 */
export function createSafeExecutor(options: SafeParallelOptions = {}) {
  return <T>(tasks: TaskFunction<T>[]) => executeSafeParallel(tasks, options);
}

/**
 * Helper to determine optimal concurrency based on current memory
 */
export function getOptimalConcurrency(): number {
  const memory = getMemoryUsage();
  const heapUsedMB = memory.heapUsed;

  // Conservative concurrency based on current memory usage
  if (heapUsedMB < 1024) {
    return 3; // Low memory: allow 3 concurrent
  } else if (heapUsedMB < 2048) {
    return 2; // Medium memory: allow 2 concurrent
  } else {
    return 1; // High memory: sequential only
  }
}

/**
 * CLI entry point
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Safe Parallel Executor');
  console.log('');
  console.log('This is a library module. Import and use in your code:');
  console.log('');
  console.log('  import { executeSafeParallel } from "./safe-parallel-executor.js";');
  console.log('');
  console.log('  const results = await executeSafeParallel([task1, task2, task3], {');
  console.log('    concurrency: 2,');
  console.log('    memoryThreshold: 4096,');
  console.log('    forceGC: true');
  console.log('  });');
  console.log('');
  console.log('Optimal concurrency for current memory:');
  const optimal = getOptimalConcurrency();
  const memory = getMemoryUsage();
  console.log(`  Current heap: ${memory.heapUsed}MB`);
  console.log(`  Recommended concurrency: ${optimal}`);
}
