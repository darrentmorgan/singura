/**
 * Example Usage: PR Curve Generator
 *
 * This file demonstrates how to use the PRCurveGeneratorService to analyze
 * detection algorithm performance by generating precision-recall curves.
 *
 * Run this example with:
 * npx ts-node src/services/detection/__tests__/pr-curve-generator.example.ts
 */

import {
  PRCurveGeneratorService,
  prCurveGenerator
} from '../pr-curve-generator.service';
import {
  DetectionResult,
  GroundTruthLabel
} from '../detection-metrics.service';

// Example 1: Basic PR Curve Generation
function example1_basicCurveGeneration() {
  console.log('\n=== Example 1: Basic PR Curve Generation ===\n');

  // Sample detection results with confidence scores
  const predictions: DetectionResult[] = [
    { automationId: 'slack-bot-1', predicted: 'malicious', confidence: 0.95, detectorName: 'velocity', timestamp: new Date() },
    { automationId: 'slack-bot-2', predicted: 'malicious', confidence: 0.88, detectorName: 'ai-provider', timestamp: new Date() },
    { automationId: 'google-script-1', predicted: 'malicious', confidence: 0.76, detectorName: 'batch-operation', timestamp: new Date() },
    { automationId: 'google-script-2', predicted: 'malicious', confidence: 0.65, detectorName: 'off-hours', timestamp: new Date() },
    { automationId: 'ms-flow-1', predicted: 'malicious', confidence: 0.54, detectorName: 'velocity', timestamp: new Date() },
    { automationId: 'slack-bot-3', predicted: 'legitimate', confidence: 0.42, detectorName: 'velocity', timestamp: new Date() },
    { automationId: 'google-script-3', predicted: 'legitimate', confidence: 0.31, detectorName: 'velocity', timestamp: new Date() },
    { automationId: 'ms-flow-2', predicted: 'legitimate', confidence: 0.18, detectorName: 'velocity', timestamp: new Date() }
  ];

  // Ground truth labels
  const groundTruth: GroundTruthLabel[] = [
    { automationId: 'slack-bot-1', actual: 'malicious', confidence: 1.0, reviewers: ['security-team'], rationale: 'Confirmed data exfiltration' },
    { automationId: 'slack-bot-2', actual: 'malicious', confidence: 0.95, reviewers: ['security-team'], rationale: 'OpenAI integration without approval' },
    { automationId: 'google-script-1', actual: 'malicious', confidence: 0.9, reviewers: ['security-team'], rationale: 'Suspicious batch operations' },
    { automationId: 'google-script-2', actual: 'malicious', confidence: 0.85, reviewers: ['security-team'], rationale: 'Off-hours activity pattern' },
    { automationId: 'ms-flow-1', actual: 'legitimate', confidence: 0.8, reviewers: ['security-team', 'ops-team'], rationale: 'Approved automation workflow' },
    { automationId: 'slack-bot-3', actual: 'legitimate', confidence: 0.9, reviewers: ['security-team'], rationale: 'Official company bot' },
    { automationId: 'google-script-3', actual: 'legitimate', confidence: 0.95, reviewers: ['security-team'], rationale: 'IT admin script' },
    { automationId: 'ms-flow-2', actual: 'legitimate', confidence: 1.0, reviewers: ['security-team'], rationale: 'Standard business process' }
  ];

  // Generate PR curve with default thresholds (0.1 to 1.0)
  const curveData = prCurveGenerator.generateCurve(predictions, groundTruth);

  // Display results
  console.log('Curve Data:');
  console.log(`- Total predictions: ${curveData.metadata.totalPredictions}`);
  console.log(`- Total ground truth: ${curveData.metadata.totalGroundTruth}`);
  console.log(`- Data points: ${curveData.points.length}`);
  console.log(`- AUC (Area Under Curve): ${curveData.auc.toFixed(4)}`);
  console.log(`- Optimal threshold: ${curveData.optimalThreshold.toFixed(2)}`);
  console.log(`- Optimal F1 score: ${curveData.optimalF1Score.toFixed(4)}`);

  // Display some threshold examples
  console.log('\nThreshold Analysis (first 5 points):');
  for (let i = 0; i < Math.min(5, curveData.points.length); i++) {
    const point = curveData.points[i];
    if (point) {
      console.log(
        `  Threshold ${point.threshold.toFixed(1)}: ` +
        `Precision=${point.precision.toFixed(3)}, ` +
        `Recall=${point.recall.toFixed(3)}, ` +
        `F1=${point.f1Score.toFixed(3)}`
      );
    }
  }
}

// Example 2: Custom Thresholds for Fine-Grained Analysis
function example2_customThresholds() {
  console.log('\n=== Example 2: Custom Thresholds ===\n');

  const predictions: DetectionResult[] = [
    { automationId: 'auto-1', predicted: 'malicious', confidence: 0.92, detectorName: 'velocity', timestamp: new Date() },
    { automationId: 'auto-2', predicted: 'malicious', confidence: 0.85, detectorName: 'velocity', timestamp: new Date() },
    { automationId: 'auto-3', predicted: 'malicious', confidence: 0.67, detectorName: 'velocity', timestamp: new Date() },
    { automationId: 'auto-4', predicted: 'legitimate', confidence: 0.34, detectorName: 'velocity', timestamp: new Date() },
    { automationId: 'auto-5', predicted: 'legitimate', confidence: 0.12, detectorName: 'velocity', timestamp: new Date() }
  ];

  const groundTruth: GroundTruthLabel[] = [
    { automationId: 'auto-1', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
    { automationId: 'auto-2', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
    { automationId: 'auto-3', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
    { automationId: 'auto-4', actual: 'legitimate', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
    { automationId: 'auto-5', actual: 'legitimate', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' }
  ];

  // Use custom thresholds focused on high-confidence range
  const customThresholds = [0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95];
  const curveData = prCurveGenerator.generateCurve(predictions, groundTruth, customThresholds);

  console.log(`Generated curve with ${curveData.points.length} custom threshold points`);
  console.log(`Optimal threshold: ${curveData.optimalThreshold.toFixed(2)}`);
  console.log(`AUC: ${curveData.auc.toFixed(4)}`);
}

// Example 3: Adaptive Thresholds Based on Confidence Distribution
function example3_adaptiveThresholds() {
  console.log('\n=== Example 3: Adaptive Thresholds ===\n');

  const predictions: DetectionResult[] = [
    { automationId: 'auto-1', predicted: 'malicious', confidence: 0.98, detectorName: 'velocity', timestamp: new Date() },
    { automationId: 'auto-2', predicted: 'malicious', confidence: 0.94, detectorName: 'velocity', timestamp: new Date() },
    { automationId: 'auto-3', predicted: 'malicious', confidence: 0.87, detectorName: 'velocity', timestamp: new Date() },
    { automationId: 'auto-4', predicted: 'malicious', confidence: 0.79, detectorName: 'velocity', timestamp: new Date() },
    { automationId: 'auto-5', predicted: 'malicious', confidence: 0.68, detectorName: 'velocity', timestamp: new Date() },
    { automationId: 'auto-6', predicted: 'legitimate', confidence: 0.45, detectorName: 'velocity', timestamp: new Date() },
    { automationId: 'auto-7', predicted: 'legitimate', confidence: 0.32, detectorName: 'velocity', timestamp: new Date() },
    { automationId: 'auto-8', predicted: 'legitimate', confidence: 0.21, detectorName: 'velocity', timestamp: new Date() },
    { automationId: 'auto-9', predicted: 'legitimate', confidence: 0.15, detectorName: 'velocity', timestamp: new Date() },
    { automationId: 'auto-10', predicted: 'legitimate', confidence: 0.08, detectorName: 'velocity', timestamp: new Date() }
  ];

  const groundTruth: GroundTruthLabel[] = [
    { automationId: 'auto-1', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
    { automationId: 'auto-2', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
    { automationId: 'auto-3', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
    { automationId: 'auto-4', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
    { automationId: 'auto-5', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
    { automationId: 'auto-6', actual: 'legitimate', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
    { automationId: 'auto-7', actual: 'legitimate', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
    { automationId: 'auto-8', actual: 'legitimate', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
    { automationId: 'auto-9', actual: 'legitimate', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
    { automationId: 'auto-10', actual: 'legitimate', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' }
  ];

  // Generate adaptive curve with 15 thresholds
  const curveData = prCurveGenerator.generateAdaptiveCurve(predictions, groundTruth, 15);

  console.log(`Generated adaptive curve with ${curveData.points.length} threshold points`);
  console.log(`Thresholds based on confidence distribution percentiles`);
  console.log(`AUC: ${curveData.auc.toFixed(4)}`);
  console.log(`Optimal threshold: ${curveData.optimalThreshold.toFixed(2)}`);
}

// Example 4: Export to JSON
function example4_exportJSON() {
  console.log('\n=== Example 4: Export to JSON ===\n');

  const predictions: DetectionResult[] = [
    { automationId: 'auto-1', predicted: 'malicious', confidence: 0.9, detectorName: 'velocity', timestamp: new Date() },
    { automationId: 'auto-2', predicted: 'legitimate', confidence: 0.3, detectorName: 'velocity', timestamp: new Date() }
  ];

  const groundTruth: GroundTruthLabel[] = [
    { automationId: 'auto-1', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
    { automationId: 'auto-2', actual: 'legitimate', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' }
  ];

  const curveData = prCurveGenerator.generateCurve(predictions, groundTruth, [0.5, 0.7, 0.9]);
  const json = prCurveGenerator.exportToJSON(curveData);

  console.log('JSON Export (formatted):');
  console.log(json.substring(0, 500) + '...\n');
}

// Example 5: Export to CSV
function example5_exportCSV() {
  console.log('\n=== Example 5: Export to CSV ===\n');

  const predictions: DetectionResult[] = [
    { automationId: 'auto-1', predicted: 'malicious', confidence: 0.9, detectorName: 'velocity', timestamp: new Date() },
    { automationId: 'auto-2', predicted: 'legitimate', confidence: 0.3, detectorName: 'velocity', timestamp: new Date() }
  ];

  const groundTruth: GroundTruthLabel[] = [
    { automationId: 'auto-1', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
    { automationId: 'auto-2', actual: 'legitimate', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' }
  ];

  const curveData = prCurveGenerator.generateCurve(predictions, groundTruth, [0.5, 0.7, 0.9]);
  const csv = prCurveGenerator.exportToCSV(curveData);

  console.log('CSV Export:');
  console.log(csv);
  console.log('\n');
}

// Example 6: Generate Summary Report
function example6_summaryReport() {
  console.log('\n=== Example 6: Summary Report ===\n');

  const predictions: DetectionResult[] = [
    { automationId: 'auto-1', predicted: 'malicious', confidence: 0.92, detectorName: 'velocity', timestamp: new Date() },
    { automationId: 'auto-2', predicted: 'malicious', confidence: 0.85, detectorName: 'velocity', timestamp: new Date() },
    { automationId: 'auto-3', predicted: 'malicious', confidence: 0.67, detectorName: 'velocity', timestamp: new Date() },
    { automationId: 'auto-4', predicted: 'legitimate', confidence: 0.34, detectorName: 'velocity', timestamp: new Date() },
    { automationId: 'auto-5', predicted: 'legitimate', confidence: 0.12, detectorName: 'velocity', timestamp: new Date() }
  ];

  const groundTruth: GroundTruthLabel[] = [
    { automationId: 'auto-1', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
    { automationId: 'auto-2', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
    { automationId: 'auto-3', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
    { automationId: 'auto-4', actual: 'legitimate', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
    { automationId: 'auto-5', actual: 'legitimate', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' }
  ];

  const curveData = prCurveGenerator.generateCurve(predictions, groundTruth, [0.5, 0.6, 0.7, 0.8, 0.9]);
  const summary = prCurveGenerator.generateSummary(curveData);

  console.log(summary);
}

// Run all examples
function runAllExamples() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  PR Curve Generator - Usage Examples                          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  example1_basicCurveGeneration();
  example2_customThresholds();
  example3_adaptiveThresholds();
  example4_exportJSON();
  example5_exportCSV();
  example6_summaryReport();

  console.log('\n✅ All examples completed successfully!\n');
}

// Execute if run directly
if (require.main === module) {
  runAllExamples();
}

export {
  example1_basicCurveGeneration,
  example2_customThresholds,
  example3_adaptiveThresholds,
  example4_exportJSON,
  example5_exportCSV,
  example6_summaryReport
};
