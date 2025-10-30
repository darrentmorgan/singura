/**
 * Performance Benchmarking Service Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PerformanceBenchmarkingService } from '../../../../src/services/testing/performance-benchmarking.service';
import fs from 'fs';
import path from 'path';

describe('PerformanceBenchmarkingService', () => {
  let service: PerformanceBenchmarkingService;
  const outputDir = path.join(__dirname, '../../../output/benchmarks');

  beforeEach(() => {
    service = new PerformanceBenchmarkingService();

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });

  afterEach(() => {
    service.clearAllBenchmarks();
  });

  describe('startBenchmark / endBenchmark', () => {
    it('should start and end a benchmark successfully', async () => {
      const benchmarkName = 'test-benchmark';

      service.startBenchmark(benchmarkName);

      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 10));

      const result = service.endBenchmark(benchmarkName);

      expect(result.name).toBe(benchmarkName);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.startTime).toBeInstanceOf(Date);
      expect(result.endTime).toBeInstanceOf(Date);
      expect(result.memory).toBeDefined();
      expect(result.memory.heapUsed).toBeGreaterThan(0);
      expect(result.memory.heapTotal).toBeGreaterThan(0);
    });

    it('should throw error when starting duplicate benchmark', () => {
      service.startBenchmark('test');

      expect(() => {
        service.startBenchmark('test');
      }).toThrow('Benchmark "test" is already running');
    });

    it('should throw error when ending non-existent benchmark', () => {
      expect(() => {
        service.endBenchmark('non-existent');
      }).toThrow('Benchmark "non-existent" was not started');
    });

    it('should track multiple concurrent benchmarks', async () => {
      service.startBenchmark('bench1');
      service.startBenchmark('bench2');

      expect(service.getActiveBenchmarks()).toHaveLength(2);
      expect(service.getActiveBenchmarks()).toContain('bench1');
      expect(service.getActiveBenchmarks()).toContain('bench2');

      await new Promise(resolve => setTimeout(resolve, 10));

      const result1 = service.endBenchmark('bench1');
      const result2 = service.endBenchmark('bench2');

      expect(result1.name).toBe('bench1');
      expect(result2.name).toBe('bench2');
      expect(service.getActiveBenchmarks()).toHaveLength(0);
    });

    it('should measure duration accurately', async () => {
      service.startBenchmark('duration-test');
      await new Promise(resolve => setTimeout(resolve, 50));
      const result = service.endBenchmark('duration-test');

      // Duration should be at least 50ms (may be slightly more due to overhead)
      expect(result.duration).toBeGreaterThanOrEqual(45);
      expect(result.duration).toBeLessThan(100);
    });
  });

  describe('measureThroughput', () => {
    it('should measure throughput accurately', async () => {
      const itemCount = 1000;
      const processItems = async () => {
        const items: number[] = [];
        for (let i = 0; i < itemCount; i++) {
          items.push(i * 2);
        }
        return items;
      };

      const result = await service.measureThroughput(processItems, itemCount);

      expect(result.itemCount).toBe(itemCount);
      expect(result.itemsPerSecond).toBeGreaterThan(0);
      expect(result.avgTimePerItem).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThan(0);

      // Verify calculation
      const expectedItemsPerSec = itemCount / (result.duration / 1000);
      expect(result.itemsPerSecond).toBeCloseTo(expectedItemsPerSec, 1);

      const expectedAvgTime = result.duration / itemCount;
      expect(result.avgTimePerItem).toBeCloseTo(expectedAvgTime, 3);
    });

    it('should handle high-throughput operations', async () => {
      const itemCount = 100000;
      const fastProcess = async () => {
        return new Array(itemCount).fill(0).map((_, i) => i);
      };

      const result = await service.measureThroughput(fastProcess, itemCount);

      expect(result.itemCount).toBe(itemCount);
      expect(result.itemsPerSecond).toBeGreaterThan(10000); // Should be very fast
    });

    it('should include all BenchmarkResult properties', async () => {
      const result = await service.measureThroughput(
        async () => [1, 2, 3],
        3
      );

      expect(result.name).toContain('throughput-');
      expect(result.duration).toBeDefined();
      expect(result.startTime).toBeInstanceOf(Date);
      expect(result.endTime).toBeInstanceOf(Date);
      expect(result.memory).toBeDefined();
      expect(result.itemCount).toBe(3);
      expect(result.itemsPerSecond).toBeDefined();
      expect(result.avgTimePerItem).toBeDefined();
    });
  });

  describe('measureMemory', () => {
    it('should measure memory usage', async () => {
      const allocateMemory = async () => {
        // Allocate ~10MB of memory
        const largeArray = new Array(1000000).fill({
          data: 'test data string',
          value: 123456
        });
        return largeArray;
      };

      const result = await service.measureMemory(allocateMemory);

      expect(result.peakMemory).toBeGreaterThan(0);
      expect(result.memoryDelta).toBeDefined();
      expect(result.memory.heapUsed).toBeGreaterThan(0);
    });

    it('should track peak memory usage', async () => {
      const allocateAndRelease = async () => {
        // Allocate large memory temporarily
        const large = new Array(500000).fill('x'.repeat(100));
        // Simulate some processing
        await new Promise(resolve => setTimeout(resolve, 50));
        // Memory might be released here
        return large.length;
      };

      const result = await service.measureMemory(allocateAndRelease);

      expect(result.peakMemory).toBeGreaterThan(0);
      // Peak should be at least as much as final memory
      expect(result.peakMemory).toBeGreaterThanOrEqual(result.memory.heapUsed);
    });

    it('should calculate memory delta', async () => {
      const result = await service.measureMemory(async () => {
        return new Array(100000).fill('test');
      });

      // Memory delta should be positive (memory was allocated)
      expect(result.memoryDelta).toBeDefined();
    });
  });

  describe('measureCPU', () => {
    it('should measure CPU usage', async () => {
      const cpuIntensiveTask = async () => {
        // CPU-intensive calculation
        let result = 0;
        for (let i = 0; i < 1000000; i++) {
          result += Math.sqrt(i) * Math.sin(i);
        }
        return result;
      };

      const result = await service.measureCPU(cpuIntensiveTask);

      expect(result.cpuUser).toBeGreaterThan(0);
      expect(result.cpuSystem).toBeGreaterThanOrEqual(0);
      expect(result.cpuPercent).toBeGreaterThan(0);
      expect(result.cpuPercent).toBeLessThanOrEqual(100);
    });

    it('should include all result properties', async () => {
      const result = await service.measureCPU(async () => {
        return 42;
      });

      expect(result.name).toContain('cpu-');
      expect(result.duration).toBeDefined();
      expect(result.cpuUser).toBeDefined();
      expect(result.cpuSystem).toBeDefined();
      expect(result.cpuPercent).toBeDefined();
    });
  });

  describe('runBenchmarkSuite', () => {
    it('should run multiple benchmarks in a suite', async () => {
      const suite = {
        name: 'test-suite',
        benchmarks: [
          {
            name: 'benchmark-1',
            fn: async () => {
              await new Promise(resolve => setTimeout(resolve, 10));
              return 'result1';
            }
          },
          {
            name: 'benchmark-2',
            fn: async () => {
              await new Promise(resolve => setTimeout(resolve, 20));
              return 'result2';
            }
          },
          {
            name: 'benchmark-3',
            fn: async () => {
              await new Promise(resolve => setTimeout(resolve, 5));
              return 'result3';
            }
          }
        ]
      };

      const results = await service.runBenchmarkSuite(suite);

      expect(results).toHaveLength(3);
      expect(results[0].name).toBe('benchmark-1');
      expect(results[1].name).toBe('benchmark-2');
      expect(results[2].name).toBe('benchmark-3');

      // Verify each has valid duration
      results.forEach(result => {
        expect(result.duration).toBeGreaterThan(0);
        expect(result.memory).toBeDefined();
      });
    });

    it('should run benchmarks sequentially', async () => {
      let executionOrder: string[] = [];

      const suite = {
        name: 'sequential-test',
        benchmarks: [
          {
            name: 'first',
            fn: async () => {
              executionOrder.push('first');
            }
          },
          {
            name: 'second',
            fn: async () => {
              executionOrder.push('second');
            }
          }
        ]
      };

      await service.runBenchmarkSuite(suite);

      expect(executionOrder).toEqual(['first', 'second']);
    });
  });

  describe('exportToJSON', () => {
    it('should export single result to JSON', () => {
      const result = {
        name: 'test',
        duration: 100,
        startTime: new Date(),
        endTime: new Date(),
        memory: {
          heapUsed: 50,
          heapTotal: 100,
          external: 5,
          rss: 120
        }
      };

      const filepath = path.join(outputDir, 'test-export.json');
      service.exportToJSON(result, filepath);

      expect(fs.existsSync(filepath)).toBe(true);

      const content = fs.readFileSync(filepath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.name).toBe('test');
      expect(parsed.duration).toBe(100);
      expect(parsed.memory.heapUsed).toBe(50);

      // Cleanup
      fs.unlinkSync(filepath);
    });

    it('should export array of results to JSON', () => {
      const results = [
        {
          name: 'test1',
          duration: 100,
          startTime: new Date(),
          endTime: new Date(),
          memory: { heapUsed: 50, heapTotal: 100, external: 5, rss: 120 }
        },
        {
          name: 'test2',
          duration: 200,
          startTime: new Date(),
          endTime: new Date(),
          memory: { heapUsed: 60, heapTotal: 110, external: 6, rss: 130 }
        }
      ];

      const filepath = path.join(outputDir, 'test-array-export.json');
      service.exportToJSON(results, filepath);

      expect(fs.existsSync(filepath)).toBe(true);

      const content = fs.readFileSync(filepath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].name).toBe('test1');
      expect(parsed[1].name).toBe('test2');

      // Cleanup
      fs.unlinkSync(filepath);
    });
  });

  describe('exportToCSV', () => {
    it('should export results to CSV format', () => {
      const results = [
        {
          name: 'benchmark1',
          duration: 100.5,
          startTime: new Date('2024-01-01T00:00:00Z'),
          endTime: new Date('2024-01-01T00:00:01Z'),
          memory: { heapUsed: 50.2, heapTotal: 100.5, external: 5.1, rss: 120.3 }
        },
        {
          name: 'benchmark2',
          duration: 200.3,
          startTime: new Date('2024-01-01T00:01:00Z'),
          endTime: new Date('2024-01-01T00:01:02Z'),
          memory: { heapUsed: 60.8, heapTotal: 110.2, external: 6.5, rss: 130.1 }
        }
      ];

      const filepath = path.join(outputDir, 'test-export.csv');
      service.exportToCSV(results, filepath);

      expect(fs.existsSync(filepath)).toBe(true);

      const content = fs.readFileSync(filepath, 'utf-8');
      const lines = content.split('\n');

      // Check header
      expect(lines[0]).toContain('Name');
      expect(lines[0]).toContain('Duration (ms)');
      expect(lines[0]).toContain('Heap Used (MB)');

      // Check data rows
      expect(lines[1]).toContain('benchmark1');
      expect(lines[1]).toContain('100.5');
      expect(lines[2]).toContain('benchmark2');
      expect(lines[2]).toContain('200.3');

      // Cleanup
      fs.unlinkSync(filepath);
    });
  });

  describe('generateMarkdownReport', () => {
    it('should generate markdown report', () => {
      const results = [
        {
          name: 'test1',
          duration: 100,
          startTime: new Date(),
          endTime: new Date(),
          memory: { heapUsed: 50, heapTotal: 100, external: 5, rss: 120 }
        },
        {
          name: 'test2',
          duration: 200,
          startTime: new Date(),
          endTime: new Date(),
          memory: { heapUsed: 60, heapTotal: 110, external: 6, rss: 130 }
        }
      ];

      const markdown = service.generateMarkdownReport(results);

      expect(markdown).toContain('# Performance Benchmark Report');
      expect(markdown).toContain('## Results');
      expect(markdown).toContain('test1');
      expect(markdown).toContain('test2');
      expect(markdown).toContain('100');
      expect(markdown).toContain('200');
      expect(markdown).toContain('Summary Statistics');
      expect(markdown).toContain('Average Duration');
      expect(markdown).toContain('Max Duration');
      expect(markdown).toContain('Min Duration');
    });

    it('should calculate summary statistics correctly', () => {
      const results = [
        {
          name: 't1',
          duration: 100,
          startTime: new Date(),
          endTime: new Date(),
          memory: { heapUsed: 50, heapTotal: 100, external: 5, rss: 120 }
        },
        {
          name: 't2',
          duration: 200,
          startTime: new Date(),
          endTime: new Date(),
          memory: { heapUsed: 60, heapTotal: 110, external: 6, rss: 130 }
        },
        {
          name: 't3',
          duration: 300,
          startTime: new Date(),
          endTime: new Date(),
          memory: { heapUsed: 70, heapTotal: 120, external: 7, rss: 140 }
        }
      ];

      const markdown = service.generateMarkdownReport(results);

      expect(markdown).toContain('**Total Benchmarks**: 3');
      expect(markdown).toContain('**Average Duration**: 200.00ms');
      expect(markdown).toContain('**Max Duration**: 300.00ms');
      expect(markdown).toContain('**Min Duration**: 100.00ms');
    });
  });

  describe('getActiveBenchmarks / clearAllBenchmarks', () => {
    it('should track active benchmarks', () => {
      expect(service.getActiveBenchmarks()).toHaveLength(0);

      service.startBenchmark('test1');
      expect(service.getActiveBenchmarks()).toHaveLength(1);
      expect(service.getActiveBenchmarks()).toContain('test1');

      service.startBenchmark('test2');
      expect(service.getActiveBenchmarks()).toHaveLength(2);
    });

    it('should clear all benchmarks', () => {
      service.startBenchmark('test1');
      service.startBenchmark('test2');

      expect(service.getActiveBenchmarks()).toHaveLength(2);

      service.clearAllBenchmarks();

      expect(service.getActiveBenchmarks()).toHaveLength(0);
    });
  });

  describe('integration scenarios', () => {
    it('should handle realistic stress test scenario', async () => {
      const throughputResult = await service.measureThroughput(
        async () => {
          const items: number[] = [];
          for (let i = 0; i < 10000; i++) {
            items.push(i * 2);
          }
          return items;
        },
        10000
      );

      expect(throughputResult.itemCount).toBe(10000);
      expect(throughputResult.itemsPerSecond).toBeGreaterThan(1000);
      expect(throughputResult.avgTimePerItem).toBeLessThan(10);
    });

    it('should handle complete benchmark workflow', async () => {
      // 1. Measure throughput
      const throughput = await service.measureThroughput(
        async () => new Array(1000).fill(0).map((_, i) => i),
        1000
      );

      // 2. Measure memory
      const memory = await service.measureMemory(
        async () => new Array(10000).fill('test')
      );

      // 3. Measure CPU
      const cpu = await service.measureCPU(async () => {
        let sum = 0;
        for (let i = 0; i < 100000; i++) {
          sum += i;
        }
        return sum;
      });

      // Verify all measurements succeeded
      expect(throughput.itemsPerSecond).toBeGreaterThan(0);
      expect(memory.peakMemory).toBeGreaterThan(0);
      expect(cpu.cpuPercent).toBeGreaterThan(0);

      // Export results
      const filepath = path.join(outputDir, 'workflow-test.json');
      service.exportToJSON([throughput, memory, cpu], filepath);

      expect(fs.existsSync(filepath)).toBe(true);

      // Cleanup
      fs.unlinkSync(filepath);
    });
  });
});
