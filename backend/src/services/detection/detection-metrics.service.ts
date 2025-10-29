/**
 * Detection Metrics Service
 *
 * Calculates precision, recall, F1 score, and confusion matrix for detection algorithms.
 * Tracks detection accuracy against ground truth dataset.
 */

export interface ConfusionMatrix {
  truePositives: number;
  trueNegatives: number;
  falsePositives: number;
  falseNegatives: number;
}

export interface DetectionResult {
  automationId: string;
  predicted: 'malicious' | 'legitimate';
  confidence: number;
  detectorName: string;
  timestamp: Date;
}

export interface GroundTruthLabel {
  automationId: string;
  actual: 'malicious' | 'legitimate';
  confidence: number;
  reviewers: string[];
  rationale: string;
}

/**
 * Service for calculating detection performance metrics.
 */
export class DetectionMetricsService {
  /**
   * Validate inputs for metrics calculations
   */
  private validateInputs(predictions: DetectionResult[], groundTruth: GroundTruthLabel[]): void {
    if (!Array.isArray(predictions)) {
      throw new Error('Predictions must be an array');
    }
    if (!Array.isArray(groundTruth)) {
      throw new Error('Ground truth must be an array');
    }
    if (predictions.length === 0) {
      throw new Error('Predictions array cannot be empty');
    }
    if (groundTruth.length === 0) {
      throw new Error('Ground truth array cannot be empty');
    }
  }

  /**
   * Create a map of automation ID to ground truth label for fast lookup
   */
  private createGroundTruthMap(groundTruth: GroundTruthLabel[]): Map<string, GroundTruthLabel> {
    const map = new Map<string, GroundTruthLabel>();
    for (const label of groundTruth) {
      map.set(label.automationId, label);
    }
    return map;
  }

  /**
   * Calculate precision (true positives / (true positives + false positives))
   *
   * Target: ≥85%
   *
   * @param predictions - Detection results
   * @param groundTruth - Labeled ground truth data
   * @returns Precision score (0-1)
   */
  precision(predictions: DetectionResult[], groundTruth: GroundTruthLabel[]): number {
    this.validateInputs(predictions, groundTruth);

    const matrix = this.confusionMatrix(predictions, groundTruth);
    const { truePositives, falsePositives } = matrix;

    const denominator = truePositives + falsePositives;
    if (denominator === 0) {
      return 0; // No positive predictions made
    }

    return truePositives / denominator;
  }

  /**
   * Calculate recall (true positives / (true positives + false negatives))
   *
   * Target: ≥90%
   *
   * @param predictions - Detection results
   * @param groundTruth - Labeled ground truth data
   * @returns Recall score (0-1)
   */
  recall(predictions: DetectionResult[], groundTruth: GroundTruthLabel[]): number {
    this.validateInputs(predictions, groundTruth);

    const matrix = this.confusionMatrix(predictions, groundTruth);
    const { truePositives, falseNegatives } = matrix;

    const denominator = truePositives + falseNegatives;
    if (denominator === 0) {
      return 0; // No actual positives in ground truth
    }

    return truePositives / denominator;
  }

  /**
   * Calculate F1 score (harmonic mean of precision and recall)
   *
   * Target: ≥87%
   *
   * @param predictions - Detection results
   * @param groundTruth - Labeled ground truth data
   * @returns F1 score (0-1)
   */
  f1Score(predictions: DetectionResult[], groundTruth: GroundTruthLabel[]): number {
    this.validateInputs(predictions, groundTruth);

    const precisionValue = this.precision(predictions, groundTruth);
    const recallValue = this.recall(predictions, groundTruth);

    const denominator = precisionValue + recallValue;
    if (denominator === 0) {
      return 0;
    }

    return (2 * precisionValue * recallValue) / denominator;
  }

  /**
   * Generate confusion matrix for detection results
   *
   * @param predictions - Detection results
   * @param groundTruth - Labeled ground truth data
   * @returns Confusion matrix
   */
  confusionMatrix(
    predictions: DetectionResult[],
    groundTruth: GroundTruthLabel[]
  ): ConfusionMatrix {
    this.validateInputs(predictions, groundTruth);

    const groundTruthMap = this.createGroundTruthMap(groundTruth);

    let truePositives = 0;
    let trueNegatives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;

    // Track which automation IDs we've seen in predictions
    const seenIds = new Set<string>();

    for (const prediction of predictions) {
      const truth = groundTruthMap.get(prediction.automationId);

      if (!truth) {
        // Skip predictions for automation IDs not in ground truth
        continue;
      }

      seenIds.add(prediction.automationId);

      const predictedMalicious = prediction.predicted === 'malicious';
      const actualMalicious = truth.actual === 'malicious';

      if (predictedMalicious && actualMalicious) {
        truePositives++;
      } else if (!predictedMalicious && !actualMalicious) {
        trueNegatives++;
      } else if (predictedMalicious && !actualMalicious) {
        falsePositives++;
      } else if (!predictedMalicious && actualMalicious) {
        falseNegatives++;
      }
    }

    // Count false negatives for ground truth items not predicted
    for (const truth of groundTruth) {
      if (!seenIds.has(truth.automationId) && truth.actual === 'malicious') {
        falseNegatives++;
      }
    }

    return {
      truePositives,
      trueNegatives,
      falsePositives,
      falseNegatives
    };
  }

  /**
   * Calculate accuracy (correct predictions / total predictions)
   *
   * @param predictions - Detection results
   * @param groundTruth - Labeled ground truth data
   * @returns Accuracy score (0-1)
   */
  accuracy(predictions: DetectionResult[], groundTruth: GroundTruthLabel[]): number {
    this.validateInputs(predictions, groundTruth);

    const matrix = this.confusionMatrix(predictions, groundTruth);
    const { truePositives, trueNegatives, falsePositives, falseNegatives } = matrix;

    const total = truePositives + trueNegatives + falsePositives + falseNegatives;
    if (total === 0) {
      return 0;
    }

    return (truePositives + trueNegatives) / total;
  }

  /**
   * Generate precision-recall curve data points
   *
   * @param predictions - Detection results with confidence scores
   * @param groundTruth - Labeled ground truth data
   * @returns Array of {threshold, precision, recall} points
   */
  precisionRecallCurve(
    predictions: DetectionResult[],
    groundTruth: GroundTruthLabel[]
  ): Array<{ threshold: number; precision: number; recall: number }> {
    this.validateInputs(predictions, groundTruth);

    const groundTruthMap = this.createGroundTruthMap(groundTruth);

    // Sort predictions by confidence descending
    const sortedPredictions = [...predictions]
      .filter(p => groundTruthMap.has(p.automationId))
      .sort((a, b) => b.confidence - a.confidence);

    if (sortedPredictions.length === 0) {
      return [];
    }

    // Generate thresholds from unique confidence values
    const uniqueConfidences = [...new Set(sortedPredictions.map(p => p.confidence))];
    const thresholds = [0, ...uniqueConfidences.sort((a, b) => b - a), 1];

    const curve: Array<{ threshold: number; precision: number; recall: number }> = [];

    for (const threshold of thresholds) {
      // Create binary predictions at this threshold
      const thresholdPredictions = sortedPredictions.map(p => ({
        ...p,
        predicted: (p.confidence >= threshold ? 'malicious' : 'legitimate') as 'malicious' | 'legitimate'
      }));

      const precisionValue = this.precision(thresholdPredictions, groundTruth);
      const recallValue = this.recall(thresholdPredictions, groundTruth);

      curve.push({
        threshold,
        precision: precisionValue,
        recall: recallValue
      });
    }

    return curve;
  }

  /**
   * Track false positive automations for analysis
   *
   * @param predictions - Detection results
   * @param groundTruth - Labeled ground truth data
   * @returns Array of false positive automation IDs with details
   */
  falsePositives(
    predictions: DetectionResult[],
    groundTruth: GroundTruthLabel[]
  ): Array<{ automationId: string; predicted: string; actual: string }> {
    this.validateInputs(predictions, groundTruth);

    const groundTruthMap = this.createGroundTruthMap(groundTruth);
    const falsePositiveList: Array<{ automationId: string; predicted: string; actual: string }> = [];

    for (const prediction of predictions) {
      const truth = groundTruthMap.get(prediction.automationId);

      if (!truth) {
        continue;
      }

      if (prediction.predicted === 'malicious' && truth.actual === 'legitimate') {
        falsePositiveList.push({
          automationId: prediction.automationId,
          predicted: prediction.predicted,
          actual: truth.actual
        });
      }
    }

    return falsePositiveList;
  }

  /**
   * Track false negative automations for analysis
   *
   * @param predictions - Detection results
   * @param groundTruth - Labeled ground truth data
   * @returns Array of false negative automation IDs with details
   */
  falseNegatives(
    predictions: DetectionResult[],
    groundTruth: GroundTruthLabel[]
  ): Array<{ automationId: string; predicted: string; actual: string }> {
    this.validateInputs(predictions, groundTruth);

    const groundTruthMap = this.createGroundTruthMap(groundTruth);
    const falseNegativeList: Array<{ automationId: string; predicted: string; actual: string }> = [];

    // Track predicted IDs
    const predictedIds = new Set(predictions.map(p => p.automationId));

    for (const prediction of predictions) {
      const truth = groundTruthMap.get(prediction.automationId);

      if (!truth) {
        continue;
      }

      if (prediction.predicted === 'legitimate' && truth.actual === 'malicious') {
        falseNegativeList.push({
          automationId: prediction.automationId,
          predicted: prediction.predicted,
          actual: truth.actual
        });
      }
    }

    // Add missing malicious items (not predicted at all)
    for (const truth of groundTruth) {
      if (truth.actual === 'malicious' && !predictedIds.has(truth.automationId)) {
        falseNegativeList.push({
          automationId: truth.automationId,
          predicted: 'not_predicted',
          actual: truth.actual
        });
      }
    }

    return falseNegativeList;
  }

  /**
   * Generate a comprehensive metrics report
   *
   * @param predictions - Detection results
   * @param groundTruth - Labeled ground truth data
   * @returns Complete metrics report
   */
  generateReport(predictions: DetectionResult[], groundTruth: GroundTruthLabel[]): {
    precision: number;
    recall: number;
    f1Score: number;
    accuracy: number;
    confusionMatrix: ConfusionMatrix;
    falsePositiveCount: number;
    falseNegativeCount: number;
  } {
    this.validateInputs(predictions, groundTruth);

    const precisionValue = this.precision(predictions, groundTruth);
    const recallValue = this.recall(predictions, groundTruth);
    const f1ScoreValue = this.f1Score(predictions, groundTruth);
    const accuracyValue = this.accuracy(predictions, groundTruth);
    const matrix = this.confusionMatrix(predictions, groundTruth);
    const fps = this.falsePositives(predictions, groundTruth);
    const fns = this.falseNegatives(predictions, groundTruth);

    return {
      precision: precisionValue,
      recall: recallValue,
      f1Score: f1ScoreValue,
      accuracy: accuracyValue,
      confusionMatrix: matrix,
      falsePositiveCount: fps.length,
      falseNegativeCount: fns.length
    };
  }
}

/**
 * Singleton instance for global metrics calculation
 */
export const detectionMetrics = new DetectionMetricsService();
