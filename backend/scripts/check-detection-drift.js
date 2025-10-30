#!/usr/bin/env node

/**
 * Detection Algorithm Drift Detection Script
 *
 * Monitors detection algorithm performance metrics (precision, recall, F1)
 * and alerts if drift exceeds acceptable thresholds:
 * - Precision drop ≥5%
 * - Recall drop ≥3%
 *
 * Exit codes:
 * - 0: No drift detected or baseline not found
 * - 1: Drift detected (triggers Slack alert in CI/CD)
 */

const fs = require('fs');
const path = require('path');

// Configuration
const PRECISION_THRESHOLD = 0.05; // 5% drop in precision triggers alert
const RECALL_THRESHOLD = 0.03;    // 3% drop in recall triggers alert
const F1_THRESHOLD = 0.04;         // 4% drop in F1 score triggers alert

const BASELINE_PATH = path.join(__dirname, '../tests/fixtures/baselines/detection-baseline.json');
const CURRENT_PATH = path.join(__dirname, '../current-benchmarks/detection-metrics.json');
const DRIFT_REPORT_PATH = path.join(__dirname, '../drift-report.json');

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
 * Calculate absolute change (not percentage)
 */
function calculateAbsoluteChange(baseline, current) {
  return current - baseline;
}

/**
 * Calculate percentage change
 */
function calculatePercentageChange(baseline, current) {
  if (!baseline || baseline === 0) return 0;
  return ((current - baseline) / baseline) * 100;
}

/**
 * Check for drift in detection metrics
 */
function checkDrift(baseline, current) {
  const driftAlerts = [];
  const metrics = [];

  // Platform-specific metrics to check
  const platforms = ['slack', 'google', 'microsoft'];

  platforms.forEach(platform => {
    const baselinePlatform = baseline[platform];
    const currentPlatform = current[platform];

    if (!baselinePlatform || !currentPlatform) {
      console.log(`⚠️  Missing metrics for platform: ${platform}`);
      return;
    }

    // Check precision drift
    const precisionChange = calculateAbsoluteChange(
      baselinePlatform.precision,
      currentPlatform.precision
    );

    const precisionPct = calculatePercentageChange(
      baselinePlatform.precision,
      currentPlatform.precision
    );

    const precisionDrift = precisionChange < -PRECISION_THRESHOLD;

    // Check recall drift
    const recallChange = calculateAbsoluteChange(
      baselinePlatform.recall,
      currentPlatform.recall
    );

    const recallPct = calculatePercentageChange(
      baselinePlatform.recall,
      currentPlatform.recall
    );

    const recallDrift = recallChange < -RECALL_THRESHOLD;

    // Check F1 score drift
    const f1Change = calculateAbsoluteChange(
      baselinePlatform.f1Score,
      currentPlatform.f1Score
    );

    const f1Pct = calculatePercentageChange(
      baselinePlatform.f1Score,
      currentPlatform.f1Score
    );

    const f1Drift = f1Change < -F1_THRESHOLD;

    // Record metrics
    metrics.push({
      platform,
      precision: {
        baseline: baselinePlatform.precision.toFixed(4),
        current: currentPlatform.precision.toFixed(4),
        change: precisionChange.toFixed(4),
        changePct: precisionPct.toFixed(2) + '%',
        hasDrift: precisionDrift
      },
      recall: {
        baseline: baselinePlatform.recall.toFixed(4),
        current: currentPlatform.recall.toFixed(4),
        change: recallChange.toFixed(4),
        changePct: recallPct.toFixed(2) + '%',
        hasDrift: recallDrift
      },
      f1Score: {
        baseline: baselinePlatform.f1Score.toFixed(4),
        current: currentPlatform.f1Score.toFixed(4),
        change: f1Change.toFixed(4),
        changePct: f1Pct.toFixed(2) + '%',
        hasDrift: f1Drift
      }
    });

    // Add drift alerts
    if (precisionDrift) {
      driftAlerts.push({
        platform,
        metric: 'Precision',
        baseline: baselinePlatform.precision.toFixed(4),
        current: currentPlatform.precision.toFixed(4),
        change: precisionChange.toFixed(4),
        threshold: PRECISION_THRESHOLD,
        severity: 'HIGH'
      });
    }

    if (recallDrift) {
      driftAlerts.push({
        platform,
        metric: 'Recall',
        baseline: baselinePlatform.recall.toFixed(4),
        current: currentPlatform.recall.toFixed(4),
        change: recallChange.toFixed(4),
        threshold: RECALL_THRESHOLD,
        severity: 'CRITICAL'
      });
    }

    if (f1Drift) {
      driftAlerts.push({
        platform,
        metric: 'F1 Score',
        baseline: baselinePlatform.f1Score.toFixed(4),
        current: currentPlatform.f1Score.toFixed(4),
        change: f1Change.toFixed(4),
        threshold: F1_THRESHOLD,
        severity: 'HIGH'
      });
    }
  });

  return { driftAlerts, metrics };
}

/**
 * Generate drift report
 */
function generateReport(driftResult) {
  const report = {
    timestamp: new Date().toISOString(),
    hasDrift: driftResult.driftAlerts.length > 0,
    summary: {
      totalAlerts: driftResult.driftAlerts.length,
      criticalAlerts: driftResult.driftAlerts.filter(a => a.severity === 'CRITICAL').length,
      highAlerts: driftResult.driftAlerts.filter(a => a.severity === 'HIGH').length
    },
    alerts: driftResult.driftAlerts,
    metrics: driftResult.metrics,
    thresholds: {
      precision: `${PRECISION_THRESHOLD * 100}% absolute drop`,
      recall: `${RECALL_THRESHOLD * 100}% absolute drop`,
      f1Score: `${F1_THRESHOLD * 100}% absolute drop`
    }
  };

  // Save report
  fs.writeFileSync(DRIFT_REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`📊 Drift report saved to: ${DRIFT_REPORT_PATH}`);

  return report;
}

/**
 * Print results
 */
function printResults(report) {
  console.log('\n' + '='.repeat(70));
  console.log('  DETECTION ALGORITHM DRIFT CHECK');
  console.log('='.repeat(70));

  if (report.hasDrift) {
    console.log('\n🚨 DRIFT DETECTED:');
    console.log('-'.repeat(70));

    report.alerts.forEach(alert => {
      const emoji = alert.severity === 'CRITICAL' ? '🔴' : '⚠️';
      console.log(`\n${emoji} ${alert.platform.toUpperCase()} - ${alert.metric}`);
      console.log(`    Baseline: ${alert.baseline}`);
      console.log(`    Current:  ${alert.current}`);
      console.log(`    Change:   ${alert.change} (threshold: ${alert.threshold})`);
      console.log(`    Severity: ${alert.severity}`);
    });

    console.log('\n' + '-'.repeat(70));
    console.log('⚠️  Action Required: Investigate algorithm changes immediately');
  } else {
    console.log('\n✅ NO DRIFT DETECTED');
  }

  console.log('\n📊 Current Metrics:');
  console.log('-'.repeat(70));

  report.metrics.forEach(m => {
    console.log(`\n  ${m.platform.toUpperCase()}:`);
    console.log(`    Precision: ${m.precision.current} (${m.precision.changePct}) ${m.precision.hasDrift ? '❌' : '✅'}`);
    console.log(`    Recall:    ${m.recall.current} (${m.recall.changePct}) ${m.recall.hasDrift ? '❌' : '✅'}`);
    console.log(`    F1 Score:  ${m.f1Score.current} (${m.f1Score.changePct}) ${m.f1Score.hasDrift ? '❌' : '✅'}`);
  });

  console.log('\n' + '='.repeat(70));
  console.log(`  Summary: ${report.summary.totalAlerts} alerts (${report.summary.criticalAlerts} critical, ${report.summary.highAlerts} high)`);
  console.log('='.repeat(70) + '\n');
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Checking for detection algorithm drift...\n');

  // Load baseline
  const baseline = loadJSON(BASELINE_PATH);
  if (!baseline) {
    console.log('⚠️  Baseline not found. Skipping drift check.');
    console.log('   This is expected for the first run or new detection algorithms.');
    process.exit(0);
  }

  // Load current metrics
  const current = loadJSON(CURRENT_PATH);
  if (!current) {
    console.log('⚠️  Current metrics not found. Skipping drift check.');
    console.log('   Run stress tests to generate detection metrics.');
    process.exit(0);
  }

  // Check for drift
  const driftResult = checkDrift(baseline, current);

  // Generate report
  const report = generateReport(driftResult);

  // Print results
  printResults(report);

  // Exit with appropriate code
  if (report.hasDrift) {
    console.log('❌ Detection drift detected - Slack notification will be sent');
    process.exit(1);
  } else {
    console.log('✅ No detection drift - Algorithm performing within thresholds');
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { checkDrift, calculateAbsoluteChange, calculatePercentageChange };
