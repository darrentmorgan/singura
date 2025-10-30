/**
 * Precision-Recall Curve Generator Service
 *
 * Generates precision-recall curves by varying confidence thresholds to visualize
 * detection performance. Calculates AUC (Area Under Curve) and identifies optimal
 * threshold for best F1 score.
 *
 * Part of Phase 2.5 - Comprehensive Testing Suite
 */

import {
  DetectionResult,
  GroundTruthLabel,
  DetectionMetricsService
} from './detection-metrics.service';

export interface PRPoint {
  threshold: number;
  precision: number;
  recall: number;
  f1Score: number;
}

export interface PRCurveData {
  points: PRPoint[];
  auc: number; // Area under curve
  optimalThreshold: number; // Best F1 score threshold
  optimalF1Score: number; // F1 score at optimal threshold
  metadata: {
    totalPredictions: number;
    totalGroundTruth: number;
    generatedAt: Date;
  };
}

/**
 * Service for generating precision-recall curves for detection algorithm analysis
 */
export class PRCurveGeneratorService {
  private metricsService: DetectionMetricsService;

  constructor() {
    this.metricsService = new DetectionMetricsService();
  }

  /**
   * Generate precision-recall curve data by varying confidence threshold
   *
   * @param predictions - Detection results with confidence scores
   * @param groundTruth - Labeled ground truth data
   * @param thresholds - Array of confidence thresholds to test (default: 0.1 to 1.0 in 0.1 steps)
   * @returns Precision-recall curve data with AUC and optimal threshold
   */
  generateCurve(
    predictions: DetectionResult[],
    groundTruth: GroundTruthLabel[],
    thresholds: number[] = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
  ): PRCurveData {
    // Validate inputs
    this.validateInputs(predictions, groundTruth, thresholds);

    // Generate PR points for each threshold
    const points: PRPoint[] = [];

    for (const threshold of thresholds) {
      // Filter predictions where confidence >= threshold
      const thresholdPredictions = predictions.map(p => ({
        ...p,
        predicted: (p.confidence >= threshold ? 'malicious' : 'legitimate') as 'malicious' | 'legitimate'
      }));

      // Calculate metrics at this threshold
      const precision = this.metricsService.precision(thresholdPredictions, groundTruth);
      const recall = this.metricsService.recall(thresholdPredictions, groundTruth);
      const f1 = this.metricsService.f1Score(thresholdPredictions, groundTruth);

      points.push({
        threshold,
        precision,
        recall,
        f1Score: f1
      });
    }

    // Calculate AUC using trapezoidal rule
    const auc = this.calculateAUC(points);

    // Find optimal threshold (highest F1 score)
    const optimalPoint = this.findOptimalThreshold(points);

    return {
      points,
      auc,
      optimalThreshold: optimalPoint.threshold,
      optimalF1Score: optimalPoint.f1Score,
      metadata: {
        totalPredictions: predictions.length,
        totalGroundTruth: groundTruth.length,
        generatedAt: new Date()
      }
    };
  }

  /**
   * Validate inputs for curve generation
   */
  private validateInputs(
    predictions: DetectionResult[],
    groundTruth: GroundTruthLabel[],
    thresholds: number[]
  ): void {
    if (!Array.isArray(predictions)) {
      throw new Error('Predictions must be an array');
    }
    if (!Array.isArray(groundTruth)) {
      throw new Error('Ground truth must be an array');
    }
    if (!Array.isArray(thresholds)) {
      throw new Error('Thresholds must be an array');
    }
    if (predictions.length === 0) {
      throw new Error('Predictions array cannot be empty');
    }
    if (groundTruth.length === 0) {
      throw new Error('Ground truth array cannot be empty');
    }
    if (thresholds.length === 0) {
      throw new Error('Thresholds array cannot be empty');
    }

    // Validate threshold values are in range [0, 1]
    for (const threshold of thresholds) {
      if (threshold < 0 || threshold > 1) {
        throw new Error(`Threshold ${threshold} is out of range [0, 1]`);
      }
    }

    // Validate predictions have confidence scores
    for (const prediction of predictions) {
      if (typeof prediction.confidence !== 'number') {
        throw new Error(`Prediction ${prediction.automationId} missing confidence score`);
      }
      if (prediction.confidence < 0 || prediction.confidence > 1) {
        throw new Error(`Prediction ${prediction.automationId} confidence ${prediction.confidence} is out of range [0, 1]`);
      }
    }
  }

  /**
   * Calculate Area Under Curve (AUC) using trapezoidal rule
   *
   * AUC represents the overall quality of the classifier across all thresholds.
   * Higher AUC (closer to 1.0) indicates better performance.
   *
   * @param points - Precision-recall data points
   * @returns AUC value (0-1)
   */
  private calculateAUC(points: PRPoint[]): number {
    if (points.length < 2) {
      return 0;
    }

    // Sort points by recall (ascending) for proper area calculation
    const sortedPoints = [...points].sort((a, b) => a.recall - b.recall);

    let auc = 0;

    // Apply trapezoidal rule: area = sum of (width * average_height)
    for (let i = 1; i < sortedPoints.length; i++) {
      const prevPoint = sortedPoints[i - 1];
      const currPoint = sortedPoints[i];

      if (!prevPoint || !currPoint) {
        continue;
      }

      // Width: change in recall
      const width = Math.abs(currPoint.recall - prevPoint.recall);

      // Height: average precision
      const avgHeight = (prevPoint.precision + currPoint.precision) / 2;

      // Add trapezoid area
      auc += width * avgHeight;
    }

    return auc;
  }

  /**
   * Find optimal threshold with highest F1 score
   *
   * @param points - Precision-recall data points
   * @returns Point with highest F1 score
   */
  private findOptimalThreshold(points: PRPoint[]): PRPoint {
    if (points.length === 0) {
      throw new Error('Cannot find optimal threshold with no points');
    }

    // Handle edge case: all F1 scores are 0
    const hasNonZeroF1 = points.some(p => p.f1Score > 0);
    if (!hasNonZeroF1) {
      // Return the middle threshold as default
      const middlePoint = points[Math.floor(points.length / 2)];
      if (!middlePoint) {
        throw new Error('Cannot find middle point in array');
      }
      return middlePoint;
    }

    // Find point with highest F1 score
    let optimalPoint = points[0];
    if (!optimalPoint) {
      throw new Error('Cannot find first point in array');
    }

    for (const point of points) {
      if (point.f1Score > optimalPoint.f1Score) {
        optimalPoint = point;
      }
    }

    return optimalPoint;
  }

  /**
   * Export curve data as JSON for visualization tools
   *
   * @param curveData - Precision-recall curve data
   * @returns JSON string with pretty formatting
   */
  exportToJSON(curveData: PRCurveData): string {
    return JSON.stringify(curveData, null, 2);
  }

  /**
   * Export curve data as CSV for spreadsheet analysis
   *
   * CSV format: threshold,precision,recall,f1
   *
   * @param curveData - Precision-recall curve data
   * @returns CSV string with header row
   */
  exportToCSV(curveData: PRCurveData): string {
    // CSV header
    const header = 'threshold,precision,recall,f1\n';

    // CSV rows
    const rows = curveData.points.map(point =>
      `${point.threshold},${point.precision},${point.recall},${point.f1Score}`
    ).join('\n');

    // Add summary row with metadata
    const summary = `\n# AUC: ${curveData.auc}\n# Optimal Threshold: ${curveData.optimalThreshold}\n# Optimal F1: ${curveData.optimalF1Score}`;

    return header + rows + summary;
  }

  /**
   * Generate summary statistics for curve data
   *
   * @param curveData - Precision-recall curve data
   * @returns Human-readable summary
   */
  generateSummary(curveData: PRCurveData): string {
    const summary = [
      '=== Precision-Recall Curve Analysis ===',
      `Generated: ${curveData.metadata.generatedAt.toISOString()}`,
      `Total Predictions: ${curveData.metadata.totalPredictions}`,
      `Total Ground Truth: ${curveData.metadata.totalGroundTruth}`,
      `Data Points: ${curveData.points.length}`,
      '',
      '=== Performance Metrics ===',
      `AUC (Area Under Curve): ${curveData.auc.toFixed(4)}`,
      `Optimal Threshold: ${curveData.optimalThreshold.toFixed(2)}`,
      `Optimal F1 Score: ${curveData.optimalF1Score.toFixed(4)}`,
      '',
      '=== Threshold Analysis ===',
      'Threshold | Precision | Recall | F1 Score',
      '----------|-----------|--------|----------'
    ];

    // Add each threshold's metrics
    for (const point of curveData.points) {
      summary.push(
        `${point.threshold.toFixed(1).padStart(9)} | ${point.precision.toFixed(4).padStart(9)} | ${point.recall.toFixed(4).padStart(6)} | ${point.f1Score.toFixed(4).padStart(8)}`
      );
    }

    return summary.join('\n');
  }

  /**
   * Generate curve data with adaptive thresholds based on prediction confidence distribution
   *
   * Instead of fixed intervals, this generates thresholds at percentiles of the confidence distribution.
   *
   * @param predictions - Detection results with confidence scores
   * @param groundTruth - Labeled ground truth data
   * @param numThresholds - Number of thresholds to generate (default: 10)
   * @returns Precision-recall curve data
   */
  generateAdaptiveCurve(
    predictions: DetectionResult[],
    groundTruth: GroundTruthLabel[],
    numThresholds: number = 10
  ): PRCurveData {
    // Validate inputs
    if (predictions.length === 0 || groundTruth.length === 0) {
      throw new Error('Predictions and ground truth cannot be empty');
    }
    if (numThresholds < 2) {
      throw new Error('Number of thresholds must be at least 2');
    }

    // Extract confidence scores and sort
    const confidences = predictions
      .map(p => p.confidence)
      .filter(c => c >= 0 && c <= 1)
      .sort((a, b) => a - b);

    if (confidences.length === 0) {
      throw new Error('No valid confidence scores found');
    }

    // Generate adaptive thresholds at percentiles
    const thresholds: number[] = [];

    // Always include 0 and 1
    thresholds.push(0);

    for (let i = 1; i < numThresholds - 1; i++) {
      const percentile = i / (numThresholds - 1);
      const index = Math.floor(percentile * (confidences.length - 1));
      const threshold = confidences[index];
      if (threshold !== undefined) {
        thresholds.push(threshold);
      }
    }

    thresholds.push(1);

    // Remove duplicates and sort
    const uniqueThresholds = Array.from(new Set(thresholds)).sort((a, b) => a - b);

    // Generate curve with adaptive thresholds
    return this.generateCurve(predictions, groundTruth, uniqueThresholds);
  }
}

/**
 * Singleton instance for global PR curve generation
 */
export const prCurveGenerator = new PRCurveGeneratorService();
