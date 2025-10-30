#!/usr/bin/env node

/**
 * Performance Regression Detection Script
 *
 * Compares current performance benchmarks against baseline metrics
 * to detect regressions exceeding 10% threshold.
 *
 * Exit codes:
 * - 0: No regression or baseline not found
 * - 1: Performance regression detected (>10% slower)
 */

const fs = require('fs');
const path = require('path');

// Configuration
const REGRESSION_THRESHOLD = 0.10; // 10% slower is considered a regression
const BASELINE_PATH = path.join(__dirname, '../tests/fixtures/baselines/performance-baseline.json');
const CURRENT_PATH = path.join(__dirname, '../current-benchmarks/performance-results.json');
const REPORT_PATH = path.join(__dirname, '../performance-report.json');

/**
 * Load JSON file safely
 */
function loadJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Error reading ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Calculate percentage change
 */
function calculateChange(baseline, current) {
  if (!baseline || baseline === 0) return 0;
  return ((current - baseline) / baseline) * 100;
}

/**
 * Format duration for display
 */
function formatDuration(ms) {
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Compare performance metrics
 */
function compareMetrics(baseline, current) {
  const regressions = [];
  const improvements = [];
  const unchanged = [];

  // Metrics to compare
  const metrics = [
    { key: 'apiResponseTime', name: 'API Response Time', unit: 'ms', lowerIsBetter: true },
    { key: 'databaseQueryTime', name: 'Database Query Time', unit: 'ms', lowerIsBetter: true },
    { key: 'detectionAlgorithmTime', name: 'Detection Algorithm Time', unit: 'ms', lowerIsBetter: true },
    { key: 'throughput', name: 'Throughput', unit: 'req/s', lowerIsBetter: false },
    { key: 'memoryUsage', name: 'Memory Usage', unit: 'MB', lowerIsBetter: true }
  ];

  metrics.forEach(metric => {
    const baselineValue = baseline[metric.key];
    const currentValue = current[metric.key];

    if (baselineValue === undefined || currentValue === undefined) {
      console.log(`⚠️  Missing metric: ${metric.name}`);
      return;
    }

    const change = calculateChange(baselineValue, currentValue);
    const isRegression = metric.lowerIsBetter
      ? change > REGRESSION_THRESHOLD * 100
      : change < -REGRESSION_THRESHOLD * 100;

    const isImprovement = metric.lowerIsBetter
      ? change < -5  // 5% improvement threshold
      : change > 5;

    const result = {
      metric: metric.name,
      baseline: `${baselineValue}${metric.unit}`,
      current: `${currentValue}${metric.unit}`,
      change: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
      changeValue: change,
      isRegression,
      isImprovement
    };

    if (isRegression) {
      regressions.push(result);
    } else if (isImprovement) {
      improvements.push(result);
    } else {
      unchanged.push(result);
    }
  });

  return { regressions, improvements, unchanged };
}

/**
 * Generate report
 */
function generateReport(comparison) {
  const report = {
    timestamp: new Date().toISOString(),
    hasRegression: comparison.regressions.length > 0,
    summary: {
      regressions: comparison.regressions.length,
      improvements: comparison.improvements.length,
      unchanged: comparison.unchanged.length
    },
    regressions: comparison.regressions,
    improvements: comparison.improvements,
    unchanged: comparison.unchanged
  };

  // Save report
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`📊 Report saved to: ${REPORT_PATH}`);

  return report;
}

/**
 * Print results
 */
function printResults(report) {
  console.log('\n' + '='.repeat(70));
  console.log('  PERFORMANCE REGRESSION CHECK');
  console.log('='.repeat(70));

  if (report.regressions.length > 0) {
    console.log('\n⚠️  REGRESSIONS DETECTED:');
    console.log('-'.repeat(70));
    report.regressions.forEach(r => {
      console.log(`  ${r.metric}`);
      console.log(`    Baseline: ${r.baseline}`);
      console.log(`    Current:  ${r.current}`);
      console.log(`    Change:   ${r.change} ❌`);
    });
  }

  if (report.improvements.length > 0) {
    console.log('\n✅ IMPROVEMENTS:');
    console.log('-'.repeat(70));
    report.improvements.forEach(i => {
      console.log(`  ${i.metric}`);
      console.log(`    Baseline: ${i.baseline}`);
      console.log(`    Current:  ${i.current}`);
      console.log(`    Change:   ${i.change} 🚀`);
    });
  }

  if (report.unchanged.length > 0) {
    console.log('\n→ UNCHANGED (within 5% threshold):');
    console.log('-'.repeat(70));
    report.unchanged.forEach(u => {
      console.log(`  ${u.metric}: ${u.current} (${u.change})`);
    });
  }

  console.log('\n' + '='.repeat(70));
  console.log(`  Summary: ${report.summary.regressions} regressions, ${report.summary.improvements} improvements, ${report.summary.unchanged} unchanged`);
  console.log('='.repeat(70) + '\n');
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Checking for performance regressions...\n');

  // Load baseline
  const baseline = loadJSON(BASELINE_PATH);
  if (!baseline) {
    console.log('⚠️  Baseline not found. Skipping regression check.');
    console.log('   This is expected for the first run or new features.');
    process.exit(0);
  }

  // Load current benchmarks
  const current = loadJSON(CURRENT_PATH);
  if (!current) {
    console.log('⚠️  Current benchmarks not found. Skipping regression check.');
    process.exit(0);
  }

  // Compare metrics
  const comparison = compareMetrics(baseline, current);

  // Generate report
  const report = generateReport(comparison);

  // Print results
  printResults(report);

  // Exit with appropriate code
  if (report.hasRegression) {
    console.log('❌ Performance regression detected (>10% threshold)');
    process.exit(1);
  } else {
    console.log('✅ No performance regressions detected');
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { compareMetrics, calculateChange };
