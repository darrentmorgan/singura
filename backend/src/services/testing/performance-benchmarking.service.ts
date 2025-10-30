/**
 * Performance Benchmarking Service
 * Comprehensive performance measurement utilities for stress testing
 */

import fs from 'fs';
import { performance } from 'perf_hooks';

export interface BenchmarkResult {
  name: string;
  duration: number; // ms
  startTime: Date;
  endTime: Date;
  memory: {
    heapUsed: number; // MB
    heapTotal: number; // MB
    external: number; // MB
    rss: number; // MB
  };
}

export interface ThroughputResult extends BenchmarkResult {
  itemCount: number;
  itemsPerSecond: number;
  avgTimePerItem: number; // ms
}

export interface MemoryResult extends BenchmarkResult {
  peakMemory: number; // MB
  memoryDelta: number; // MB
}

export interface CPUResult extends BenchmarkResult {
  cpuUser: number; // microseconds
  cpuSystem: number; // microseconds
  cpuPercent: number; // %
}

export interface BenchmarkSuite {
  name: string;
  benchmarks: Array<{
    name: string;
    fn: () => Promise<any>;
  }>;
}

interface ActiveBenchmark {
  name: string;
  startTime: Date;
  startMemory: NodeJS.MemoryUsage;
  startCPU: NodeJS.CpuUsage;
  startPerf: number;
}

export class PerformanceBenchmarkingService {
  private activeBenchmarks: Map<string, ActiveBenchmark> = new Map();

  /**
   * Convert bytes to megabytes
   */
  private bytesToMB(bytes: number): number {
    return Number((bytes / 1024 / 1024).toFixed(2));
  }

  /**
   * Get current memory usage in MB
   */
  private getMemoryUsage(): BenchmarkResult['memory'] {
    const mem = process.memoryUsage();
    return {
      heapUsed: this.bytesToMB(mem.heapUsed),
      heapTotal: this.bytesToMB(mem.heapTotal),
      external: this.bytesToMB(mem.external),
      rss: this.bytesToMB(mem.rss)
    };
  }

  /**
   * Start a benchmark measurement
   */
  startBenchmark(name: string): void {
    if (this.activeBenchmarks.has(name)) {
      throw new Error(`Benchmark "${name}" is already running`);
    }

    this.activeBenchmarks.set(name, {
      name,
      startTime: new Date(),
      startMemory: process.memoryUsage(),
      startCPU: process.cpuUsage(),
      startPerf: performance.now()
    });
  }

  /**
   * End a benchmark and get results
   */
  endBenchmark(name: string): BenchmarkResult {
    const active = this.activeBenchmarks.get(name);
    if (!active) {
      throw new Error(`Benchmark "${name}" was not started`);
    }

    const endTime = new Date();
    const endPerf = performance.now();
    const duration = endPerf - active.startPerf;

    const result: BenchmarkResult = {
      name,
      duration: Number(duration.toFixed(2)),
      startTime: active.startTime,
      endTime,
      memory: this.getMemoryUsage()
    };

    this.activeBenchmarks.delete(name);
    return result;
  }

  /**
   * Measure throughput (items/sec)
   */
  async measureThroughput<T>(
    fn: () => Promise<T[]>,
    itemCount: number
  ): Promise<ThroughputResult> {
    const name = `throughput-${Date.now()}`;

    this.startBenchmark(name);
    await fn();
    const baseResult = this.endBenchmark(name);

    const itemsPerSecond = Number((itemCount / (baseResult.duration / 1000)).toFixed(2));
    const avgTimePerItem = Number((baseResult.duration / itemCount).toFixed(4));

    return {
      ...baseResult,
      itemCount,
      itemsPerSecond,
      avgTimePerItem
    };
  }

  /**
   * Measure memory usage with peak tracking
   */
  async measureMemory<T>(fn: () => Promise<T>): Promise<MemoryResult> {
    const name = `memory-${Date.now()}`;

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const startMem = process.memoryUsage();
    let peakHeapUsed = startMem.heapUsed;

    // Start monitoring peak memory
    const monitorInterval = setInterval(() => {
      const current = process.memoryUsage();
      if (current.heapUsed > peakHeapUsed) {
        peakHeapUsed = current.heapUsed;
      }
    }, 10); // Sample every 10ms

    this.startBenchmark(name);
    await fn();
    const baseResult = this.endBenchmark(name);

    clearInterval(monitorInterval);

    const endMem = process.memoryUsage();
    const peakMemory = this.bytesToMB(peakHeapUsed);
    const memoryDelta = this.bytesToMB(endMem.heapUsed - startMem.heapUsed);

    return {
      ...baseResult,
      peakMemory,
      memoryDelta
    };
  }

  /**
   * Measure CPU usage
   */
  async measureCPU<T>(fn: () => Promise<T>): Promise<CPUResult> {
    const name = `cpu-${Date.now()}`;

    const startCPU = process.cpuUsage();
    this.startBenchmark(name);

    await fn();

    const baseResult = this.endBenchmark(name);
    const endCPU = process.cpuUsage(startCPU);

    // Calculate CPU percentage based on wall clock time
    const totalCPU = endCPU.user + endCPU.system;
    const wallClockMicro = baseResult.duration * 1000;
    const cpuPercent = Number(((totalCPU / wallClockMicro) * 100).toFixed(2));

    return {
      ...baseResult,
      cpuUser: endCPU.user,
      cpuSystem: endCPU.system,
      cpuPercent
    };
  }

  /**
   * Run a suite of benchmarks
   */
  async runBenchmarkSuite(suite: BenchmarkSuite): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    for (const benchmark of suite.benchmarks) {
      this.startBenchmark(benchmark.name);
      await benchmark.fn();
      const result = this.endBenchmark(benchmark.name);
      results.push(result);
    }

    return results;
  }

  /**
   * Export results to JSON
   */
  exportToJSON(result: BenchmarkResult | BenchmarkResult[], filepath: string): void {
    const data = JSON.stringify(result, null, 2);
    fs.writeFileSync(filepath, data, 'utf-8');
  }

  /**
   * Export results to CSV
   */
  exportToCSV(results: BenchmarkResult[], filepath: string): void {
    const headers = [
      'Name',
      'Duration (ms)',
      'Start Time',
      'End Time',
      'Heap Used (MB)',
      'Heap Total (MB)',
      'External (MB)',
      'RSS (MB)'
    ];

    const rows = results.map(r => [
      r.name,
      r.duration.toString(),
      r.startTime.toISOString(),
      r.endTime.toISOString(),
      r.memory.heapUsed.toString(),
      r.memory.heapTotal.toString(),
      r.memory.external.toString(),
      r.memory.rss.toString()
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    fs.writeFileSync(filepath, csv, 'utf-8');
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport(results: BenchmarkResult[]): string {
    const lines: string[] = [];

    lines.push('# Performance Benchmark Report');
    lines.push('');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');
    lines.push('## Results');
    lines.push('');
    lines.push('| Name | Duration (ms) | Heap Used (MB) | Heap Total (MB) | RSS (MB) |');
    lines.push('|------|---------------|----------------|-----------------|----------|');

    for (const result of results) {
      lines.push(
        `| ${result.name} | ${result.duration} | ${result.memory.heapUsed} | ${result.memory.heapTotal} | ${result.memory.rss} |`
      );
    }

    lines.push('');

    // Summary statistics
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    const maxDuration = Math.max(...results.map(r => r.duration));
    const minDuration = Math.min(...results.map(r => r.duration));

    lines.push('## Summary Statistics');
    lines.push('');
    lines.push(`- **Total Benchmarks**: ${results.length}`);
    lines.push(`- **Average Duration**: ${avgDuration.toFixed(2)}ms`);
    lines.push(`- **Max Duration**: ${maxDuration.toFixed(2)}ms`);
    lines.push(`- **Min Duration**: ${minDuration.toFixed(2)}ms`);

    return lines.join('\n');
  }

  /**
   * Log results to console with formatting
   */
  logResults(result: BenchmarkResult): void {
    console.log('');
    console.log('='.repeat(60));
    console.log(`Benchmark: ${result.name}`);
    console.log('='.repeat(60));
    console.log(`Duration:      ${result.duration.toFixed(2)}ms`);
    console.log(`Start Time:    ${result.startTime.toISOString()}`);
    console.log(`End Time:      ${result.endTime.toISOString()}`);
    console.log('');
    console.log('Memory Usage:');
    console.log(`  Heap Used:   ${result.memory.heapUsed}MB`);
    console.log(`  Heap Total:  ${result.memory.heapTotal}MB`);
    console.log(`  External:    ${result.memory.external}MB`);
    console.log(`  RSS:         ${result.memory.rss}MB`);

    // Additional metrics for specialized results
    if ('itemsPerSecond' in result) {
      const throughput = result as ThroughputResult;
      console.log('');
      console.log('Throughput:');
      console.log(`  Items:       ${throughput.itemCount}`);
      console.log(`  Items/sec:   ${throughput.itemsPerSecond}`);
      console.log(`  Avg/item:    ${throughput.avgTimePerItem}ms`);
    }

    if ('peakMemory' in result) {
      const memory = result as MemoryResult;
      console.log('');
      console.log('Memory Analysis:');
      console.log(`  Peak Memory: ${memory.peakMemory}MB`);
      console.log(`  Delta:       ${memory.memoryDelta}MB`);
    }

    if ('cpuPercent' in result) {
      const cpu = result as CPUResult;
      console.log('');
      console.log('CPU Usage:');
      console.log(`  User:        ${cpu.cpuUser}μs`);
      console.log(`  System:      ${cpu.cpuSystem}μs`);
      console.log(`  Percent:     ${cpu.cpuPercent}%`);
    }

    console.log('='.repeat(60));
    console.log('');
  }

  /**
   * Get all active benchmarks
   */
  getActiveBenchmarks(): string[] {
    return Array.from(this.activeBenchmarks.keys());
  }

  /**
   * Clear all active benchmarks
   */
  clearAllBenchmarks(): void {
    this.activeBenchmarks.clear();
  }
}
