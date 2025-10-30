/**
 * Example FP/FN Analysis Script
 *
 * Demonstrates how to use the FPFNTrackerService to analyze misclassifications
 * in detection algorithms using the ground truth dataset.
 */

import { fpfnTracker } from '../services/detection/fp-fn-tracker.service';
import { DetectionResult, GroundTruthLabel } from '../services/detection/detection-metrics.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Load ground truth dataset
 */
function loadGroundTruthDataset(): GroundTruthLabel[] {
  const datasetPath = path.join(
    __dirname,
    '../../tests/fixtures/ground-truth-dataset.json'
  );

  const rawData = fs.readFileSync(datasetPath, 'utf-8');
  const dataset = JSON.parse(rawData);

  return dataset.labels.map((label: any) => ({
    automationId: label.automationId,
    actual: label.actual,
    confidence: label.confidence,
    reviewers: label.reviewers,
    rationale: label.rationale
  }));
}

/**
 * Simulate detection predictions with intentional errors
 */
function generateSimulatedPredictions(
  groundTruth: GroundTruthLabel[]
): DetectionResult[] {
  const predictions: DetectionResult[] = [];

  // Simulate detector performance with some errors
  for (const truth of groundTruth) {
    // 90% of the time, predict correctly
    const correctPrediction = Math.random() < 0.90;

    let predicted: 'malicious' | 'legitimate';
    let confidence: number;
    let detectorName: string;

    if (correctPrediction) {
      predicted = truth.actual;
      confidence = 0.75 + Math.random() * 0.2; // 0.75-0.95

      // Assign detector based on actual label
      if (truth.actual === 'malicious') {
        detectorName = 'velocity-detector';
      } else {
        detectorName = 'baseline-detector';
      }
    } else {
      // Intentional error
      predicted = truth.actual === 'malicious' ? 'legitimate' : 'malicious';
      confidence = 0.55 + Math.random() * 0.15; // 0.55-0.70 (lower confidence for errors)

      // Different detector for errors
      detectorName = 'ai-provider-detector';
    }

    predictions.push({
      automationId: truth.automationId,
      predicted,
      confidence,
      detectorName,
      timestamp: new Date()
    });
  }

  // Simulate 5% complete misses (no prediction at all)
  const missRate = 0.05;
  const maliciousItems = groundTruth.filter(t => t.actual === 'malicious');
  const missCount = Math.floor(maliciousItems.length * missRate);

  for (let i = 0; i < missCount; i++) {
    const missedItem = maliciousItems[i];
    const predictionIndex = predictions.findIndex(
      p => p.automationId === missedItem.automationId
    );
    if (predictionIndex >= 0) {
      predictions.splice(predictionIndex, 1);
    }
  }

  return predictions;
}

/**
 * Build automation details map from ground truth dataset
 */
function buildAutomationDetailsMap(
  groundTruthDataset: any
): Map<string, any> {
  const detailsMap = new Map<string, any>();

  for (const label of groundTruthDataset.labels) {
    detailsMap.set(label.automationId, {
      platform: label.platform,
      type: label.platform === 'slack' ? 'bot' :
            label.platform === 'google' ? 'apps-script' :
            'power-automate',
      attackType: label.attackType || 'unknown',
      features: label.features || {}
    });
  }

  return detailsMap;
}

/**
 * Main execution
 */
async function main() {
  console.log('='.repeat(80));
  console.log('FALSE POSITIVE / FALSE NEGATIVE ANALYSIS DEMO');
  console.log('='.repeat(80));
  console.log();

  // Load ground truth dataset
  const datasetPath = path.join(
    __dirname,
    '../../tests/fixtures/ground-truth-dataset.json'
  );
  const rawData = fs.readFileSync(datasetPath, 'utf-8');
  const dataset = JSON.parse(rawData);

  console.log(`Loaded ground truth dataset: ${dataset.totalSamples} samples`);
  console.log(`  - Malicious: ${dataset.maliciousCount}`);
  console.log(`  - Legitimate: ${dataset.legitimateCount}`);
  console.log();

  // Generate simulated predictions
  const groundTruth = loadGroundTruthDataset();
  const predictions = generateSimulatedPredictions(groundTruth);

  console.log(`Generated ${predictions.length} simulated predictions`);
  console.log(`  - Expected FP rate: ~5% (5 false positives)`);
  console.log(`  - Expected FN rate: ~10% (5 false negatives + 2-3 complete misses)`);
  console.log();

  // Build automation details
  const automationDetails = buildAutomationDetailsMap(dataset);

  // Track FP/FN
  console.log('Running FP/FN analysis...');
  const report = fpfnTracker.track(predictions, groundTruth, automationDetails);

  // Display summary
  console.log();
  console.log('ANALYSIS RESULTS:');
  console.log('-'.repeat(80));
  console.log(`Total False Positives: ${report.stats.totalFP}`);
  console.log(`Total False Negatives: ${report.stats.totalFN}`);
  console.log(`False Positive Rate: ${(report.stats.fpRate * 100).toFixed(2)}%`);
  console.log(`False Negative Rate: ${(report.stats.fnRate * 100).toFixed(2)}%`);
  console.log();

  // Display breakdown by detector
  console.log('BREAKDOWN BY DETECTOR:');
  console.log('-'.repeat(80));
  for (const [detector, stats] of report.stats.byDetector.entries()) {
    console.log(`${detector}:`);
    console.log(`  FP Count: ${stats.fpCount}`);
    console.log(`  FN Count: ${stats.fnCount}`);
    console.log(`  FP Rate: ${(stats.fpRate * 100).toFixed(2)}%`);
    console.log(`  FN Rate: ${(stats.fnRate * 100).toFixed(2)}%`);
    console.log(`  Total Errors: ${stats.totalErrors}`);
    console.log();
  }

  // Display breakdown by platform
  console.log('BREAKDOWN BY PLATFORM:');
  console.log('-'.repeat(80));
  for (const [platform, stats] of report.stats.byPlatform.entries()) {
    console.log(`${platform}:`);
    console.log(`  FP Count: ${stats.fpCount}`);
    console.log(`  FN Count: ${stats.fnCount}`);
    console.log(`  FP Rate: ${(stats.fpRate * 100).toFixed(2)}%`);
    console.log(`  FN Rate: ${(stats.fnRate * 100).toFixed(2)}%`);
    console.log();
  }

  // Display breakdown by attack type
  if (report.stats.byAttackType.size > 0) {
    console.log('BREAKDOWN BY ATTACK TYPE:');
    console.log('-'.repeat(80));
    for (const [attackType, stats] of report.stats.byAttackType.entries()) {
      console.log(`${attackType}: FP=${stats.fpCount}, FN=${stats.fnCount}`);
    }
    console.log();
  }

  // Display top false positives
  if (report.falsePositives.length > 0) {
    console.log('TOP 3 FALSE POSITIVES (Highest Confidence):');
    console.log('-'.repeat(80));
    const topFPs = [...report.falsePositives]
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);

    topFPs.forEach((fp, index) => {
      console.log(`${index + 1}. ${fp.automationId}`);
      console.log(`   Platform: ${fp.automationDetails.platform}`);
      console.log(`   Detector: ${fp.detectorName}`);
      console.log(`   Confidence: ${(fp.confidence * 100).toFixed(1)}%`);
      console.log(`   Analysis: ${fp.analysis}`);
      console.log();
    });
  }

  // Display top false negatives
  if (report.falseNegatives.length > 0) {
    console.log('TOP 3 FALSE NEGATIVES (Most Critical):');
    console.log('-'.repeat(80));

    // Sort by attack severity
    const severityOrder: Record<string, number> = {
      data_exfiltration: 1,
      privilege_escalation: 2,
      ai_abuse: 3,
      rate_limit_evasion: 4,
      unknown: 5
    };

    const topFNs = [...report.falseNegatives]
      .sort((a, b) => {
        const aSeverity = severityOrder[a.automationDetails.attackType || 'unknown'] || 5;
        const bSeverity = severityOrder[b.automationDetails.attackType || 'unknown'] || 5;
        return aSeverity - bSeverity;
      })
      .slice(0, 3);

    topFNs.forEach((fn, index) => {
      console.log(`${index + 1}. ${fn.automationId}`);
      console.log(`   Platform: ${fn.automationDetails.platform}`);
      console.log(`   Attack Type: ${fn.automationDetails.attackType || 'unknown'}`);
      console.log(`   Detector: ${fn.detectorName}`);
      console.log(`   Confidence: ${(fn.confidence * 100).toFixed(1)}%`);
      console.log(`   Analysis: ${fn.analysis}`);
      console.log();
    });
  }

  // Display recommendations
  if (report.recommendations.length > 0) {
    console.log('RECOMMENDATIONS:');
    console.log('-'.repeat(80));
    report.recommendations.forEach((recommendation, index) => {
      console.log(`${index + 1}. ${recommendation}`);
      console.log();
    });
  }

  // Generate and save markdown report
  const markdownReport = fpfnTracker.generateReport(report);
  const reportPath = path.join(__dirname, '../../fp-fn-analysis-report.md');
  fs.writeFileSync(reportPath, markdownReport);
  console.log(`Full markdown report saved to: ${reportPath}`);

  // Export to JSON
  const jsonReport = fpfnTracker.exportToJSON(report);
  const jsonPath = path.join(__dirname, '../../fp-fn-analysis-report.json');
  fs.writeFileSync(jsonPath, jsonReport);
  console.log(`JSON export saved to: ${jsonPath}`);

  console.log();
  console.log('='.repeat(80));
  console.log('ANALYSIS COMPLETE');
  console.log('='.repeat(80));
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

export { main };
