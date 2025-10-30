import { DetectionMetricsService, DetectionResult, GroundTruthLabel, ConfusionMatrix } from '../../../../src/services/detection/detection-metrics.service';

describe('DetectionMetricsService', () => {
  let service: DetectionMetricsService;

  beforeEach(() => {
    service = new DetectionMetricsService();
  });

  // Helper function to create realistic predictions
  const createPrediction = (
    automationId: string,
    predicted: 'malicious' | 'legitimate',
    confidence: number = 0.85
  ): DetectionResult => ({
    automationId,
    predicted,
    confidence,
    detectorName: 'test-detector',
    timestamp: new Date()
  });

  // Helper function to create ground truth labels
  const createGroundTruth = (
    automationId: string,
    actual: 'malicious' | 'legitimate',
    confidence: number = 1.0
  ): GroundTruthLabel => ({
    automationId,
    actual,
    confidence,
    reviewers: ['security-analyst-1'],
    rationale: `Labeled as ${actual} based on security analysis`
  });

  describe('precision()', () => {
    it('should calculate precision correctly with perfect predictions', () => {
      const predictions: DetectionResult[] = [
        createPrediction('auto-1', 'malicious'),
        createPrediction('auto-2', 'malicious'),
        createPrediction('auto-3', 'legitimate'),
        createPrediction('auto-4', 'legitimate')
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'malicious'),
        createGroundTruth('auto-2', 'malicious'),
        createGroundTruth('auto-3', 'legitimate'),
        createGroundTruth('auto-4', 'legitimate')
      ];

      const precision = service.precision(predictions, groundTruth);

      expect(precision).toBe(1.0); // Perfect precision (100%)
    });

    it('should calculate precision with some false positives', () => {
      const predictions: DetectionResult[] = [
        createPrediction('auto-1', 'malicious'), // TP
        createPrediction('auto-2', 'malicious'), // TP
        createPrediction('auto-3', 'malicious'), // FP
        createPrediction('auto-4', 'legitimate')  // TN
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'malicious'),
        createGroundTruth('auto-2', 'malicious'),
        createGroundTruth('auto-3', 'legitimate'), // False positive
        createGroundTruth('auto-4', 'legitimate')
      ];

      const precision = service.precision(predictions, groundTruth);

      // precision = TP / (TP + FP) = 2 / (2 + 1) = 0.6667
      expect(precision).toBeCloseTo(0.6667, 3);
    });

    it('should return 0 when no positive predictions made', () => {
      const predictions: DetectionResult[] = [
        createPrediction('auto-1', 'legitimate'),
        createPrediction('auto-2', 'legitimate')
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'legitimate'),
        createGroundTruth('auto-2', 'malicious')
      ];

      const precision = service.precision(predictions, groundTruth);

      expect(precision).toBe(0); // No positive predictions = 0 precision
    });

    it('should handle edge case: all false positives', () => {
      const predictions: DetectionResult[] = [
        createPrediction('auto-1', 'malicious'),
        createPrediction('auto-2', 'malicious'),
        createPrediction('auto-3', 'malicious')
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'legitimate'),
        createGroundTruth('auto-2', 'legitimate'),
        createGroundTruth('auto-3', 'legitimate')
      ];

      const precision = service.precision(predictions, groundTruth);

      // precision = 0 / (0 + 3) = 0
      expect(precision).toBe(0);
    });

    it('should validate input arrays', () => {
      const predictions: DetectionResult[] = [];
      const groundTruth: GroundTruthLabel[] = [];

      expect(() => service.precision(predictions, groundTruth)).toThrow('Predictions array cannot be empty');
    });

    it('should throw error on empty predictions', () => {
      const predictions: DetectionResult[] = [];
      const groundTruth: GroundTruthLabel[] = [createGroundTruth('auto-1', 'malicious')];

      expect(() => service.precision(predictions, groundTruth)).toThrow('Predictions array cannot be empty');
    });

    it('should throw error on empty ground truth', () => {
      const predictions: DetectionResult[] = [createPrediction('auto-1', 'malicious')];
      const groundTruth: GroundTruthLabel[] = [];

      expect(() => service.precision(predictions, groundTruth)).toThrow('Ground truth array cannot be empty');
    });

    it('should throw error on invalid predictions type', () => {
      expect(() => service.precision({} as any, [] as any)).toThrow('Predictions must be an array');
    });

    it('should throw error on invalid ground truth type', () => {
      const predictions: DetectionResult[] = [createPrediction('auto-1', 'malicious')];

      expect(() => service.precision(predictions, {} as any)).toThrow('Ground truth must be an array');
    });
  });

  describe('recall()', () => {
    it('should calculate recall correctly with perfect predictions', () => {
      const predictions: DetectionResult[] = [
        createPrediction('auto-1', 'malicious'),
        createPrediction('auto-2', 'malicious'),
        createPrediction('auto-3', 'legitimate'),
        createPrediction('auto-4', 'legitimate')
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'malicious'),
        createGroundTruth('auto-2', 'malicious'),
        createGroundTruth('auto-3', 'legitimate'),
        createGroundTruth('auto-4', 'legitimate')
      ];

      const recall = service.recall(predictions, groundTruth);

      expect(recall).toBe(1.0); // Perfect recall (100%)
    });

    it('should calculate recall with some false negatives', () => {
      const predictions: DetectionResult[] = [
        createPrediction('auto-1', 'malicious'),  // TP
        createPrediction('auto-2', 'legitimate'), // FN
        createPrediction('auto-3', 'legitimate'), // FN
        createPrediction('auto-4', 'legitimate')  // TN
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'malicious'),
        createGroundTruth('auto-2', 'malicious'), // Missed
        createGroundTruth('auto-3', 'malicious'), // Missed
        createGroundTruth('auto-4', 'legitimate')
      ];

      const recall = service.recall(predictions, groundTruth);

      // recall = TP / (TP + FN) = 1 / (1 + 2) = 0.3333
      expect(recall).toBeCloseTo(0.3333, 3);
    });

    it('should return 0 when no true positives', () => {
      const predictions: DetectionResult[] = [
        createPrediction('auto-1', 'legitimate'),
        createPrediction('auto-2', 'legitimate')
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'malicious'),
        createGroundTruth('auto-2', 'malicious')
      ];

      const recall = service.recall(predictions, groundTruth);

      expect(recall).toBe(0); // All malicious missed = 0 recall
    });

    it('should handle edge case: all false negatives', () => {
      const predictions: DetectionResult[] = [
        createPrediction('auto-1', 'legitimate'),
        createPrediction('auto-2', 'legitimate'),
        createPrediction('auto-3', 'legitimate')
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'malicious'),
        createGroundTruth('auto-2', 'malicious'),
        createGroundTruth('auto-3', 'malicious')
      ];

      const recall = service.recall(predictions, groundTruth);

      // recall = 0 / (0 + 3) = 0
      expect(recall).toBe(0);
    });

    it('should validate input arrays', () => {
      const predictions: DetectionResult[] = [];
      const groundTruth: GroundTruthLabel[] = [];

      expect(() => service.recall(predictions, groundTruth)).toThrow('Predictions array cannot be empty');
    });

    it('should handle missing predictions (false negatives)', () => {
      const predictions: DetectionResult[] = [
        createPrediction('auto-1', 'malicious')  // TP
        // auto-2 not predicted at all (implicit FN)
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'malicious'),
        createGroundTruth('auto-2', 'malicious')
      ];

      const recall = service.recall(predictions, groundTruth);

      // recall = 1 / (1 + 1) = 0.5
      expect(recall).toBe(0.5);
    });
  });

  describe('f1Score()', () => {
    it('should calculate F1 score correctly', () => {
      const predictions: DetectionResult[] = [
        createPrediction('auto-1', 'malicious'), // TP
        createPrediction('auto-2', 'malicious'), // TP
        createPrediction('auto-3', 'malicious'), // FP
        createPrediction('auto-4', 'legitimate')  // TN
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'malicious'),
        createGroundTruth('auto-2', 'malicious'),
        createGroundTruth('auto-3', 'legitimate'),
        createGroundTruth('auto-4', 'legitimate'),
        createGroundTruth('auto-5', 'malicious') // FN (not predicted)
      ];

      const f1Score = service.f1Score(predictions, groundTruth);

      // precision = 2 / 3 = 0.6667
      // recall = 2 / 3 = 0.6667
      // f1 = 2 * (0.6667 * 0.6667) / (0.6667 + 0.6667) = 0.6667
      expect(f1Score).toBeCloseTo(0.6667, 3);
    });

    it('should return 0 when precision and recall are 0', () => {
      const predictions: DetectionResult[] = [
        createPrediction('auto-1', 'legitimate'),
        createPrediction('auto-2', 'legitimate')
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'malicious'),
        createGroundTruth('auto-2', 'malicious')
      ];

      const f1Score = service.f1Score(predictions, groundTruth);

      expect(f1Score).toBe(0);
    });

    it('should handle harmonic mean calculation', () => {
      const predictions: DetectionResult[] = [
        createPrediction('auto-1', 'malicious'), // TP
        createPrediction('auto-2', 'malicious'), // FP
        createPrediction('auto-3', 'legitimate')  // TN
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'malicious'),
        createGroundTruth('auto-2', 'legitimate'),
        createGroundTruth('auto-3', 'legitimate'),
        createGroundTruth('auto-4', 'malicious'), // FN
        createGroundTruth('auto-5', 'malicious')  // FN
      ];

      const f1Score = service.f1Score(predictions, groundTruth);

      // precision = 1 / 2 = 0.5
      // recall = 1 / 3 = 0.3333
      // f1 = 2 * (0.5 * 0.3333) / (0.5 + 0.3333) = 0.4
      expect(f1Score).toBeCloseTo(0.4, 3);
    });

    it('should handle perfect score', () => {
      const predictions: DetectionResult[] = [
        createPrediction('auto-1', 'malicious'),
        createPrediction('auto-2', 'legitimate')
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'malicious'),
        createGroundTruth('auto-2', 'legitimate')
      ];

      const f1Score = service.f1Score(predictions, groundTruth);

      expect(f1Score).toBe(1.0); // Perfect score
    });
  });

  describe('confusionMatrix()', () => {
    it('should calculate TP, TN, FP, FN correctly', () => {
      const predictions: DetectionResult[] = [
        createPrediction('auto-1', 'malicious'),  // TP
        createPrediction('auto-2', 'malicious'),  // FP
        createPrediction('auto-3', 'legitimate'), // TN
        createPrediction('auto-4', 'legitimate')  // FN
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'malicious'),
        createGroundTruth('auto-2', 'legitimate'),
        createGroundTruth('auto-3', 'legitimate'),
        createGroundTruth('auto-4', 'malicious')
      ];

      const matrix = service.confusionMatrix(predictions, groundTruth);

      expect(matrix.truePositives).toBe(1);
      expect(matrix.trueNegatives).toBe(1);
      expect(matrix.falsePositives).toBe(1);
      expect(matrix.falseNegatives).toBe(1);
    });

    it('should handle all correct predictions', () => {
      const predictions: DetectionResult[] = [
        createPrediction('auto-1', 'malicious'),
        createPrediction('auto-2', 'malicious'),
        createPrediction('auto-3', 'legitimate'),
        createPrediction('auto-4', 'legitimate')
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'malicious'),
        createGroundTruth('auto-2', 'malicious'),
        createGroundTruth('auto-3', 'legitimate'),
        createGroundTruth('auto-4', 'legitimate')
      ];

      const matrix = service.confusionMatrix(predictions, groundTruth);

      expect(matrix.truePositives).toBe(2);
      expect(matrix.trueNegatives).toBe(2);
      expect(matrix.falsePositives).toBe(0);
      expect(matrix.falseNegatives).toBe(0);
    });

    it('should handle all incorrect predictions', () => {
      const predictions: DetectionResult[] = [
        createPrediction('auto-1', 'legitimate'), // FN
        createPrediction('auto-2', 'legitimate'), // FN
        createPrediction('auto-3', 'malicious'),  // FP
        createPrediction('auto-4', 'malicious')   // FP
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'malicious'),
        createGroundTruth('auto-2', 'malicious'),
        createGroundTruth('auto-3', 'legitimate'),
        createGroundTruth('auto-4', 'legitimate')
      ];

      const matrix = service.confusionMatrix(predictions, groundTruth);

      expect(matrix.truePositives).toBe(0);
      expect(matrix.trueNegatives).toBe(0);
      expect(matrix.falsePositives).toBe(2);
      expect(matrix.falseNegatives).toBe(2);
    });

    it('should handle mixed results', () => {
      const predictions: DetectionResult[] = [
        createPrediction('auto-1', 'malicious'),  // TP
        createPrediction('auto-2', 'malicious'),  // TP
        createPrediction('auto-3', 'malicious'),  // TP
        createPrediction('auto-4', 'malicious'),  // FP
        createPrediction('auto-5', 'malicious'),  // FP
        createPrediction('auto-6', 'legitimate'), // TN
        createPrediction('auto-7', 'legitimate'), // TN
        createPrediction('auto-8', 'legitimate')  // FN
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'malicious'),
        createGroundTruth('auto-2', 'malicious'),
        createGroundTruth('auto-3', 'malicious'),
        createGroundTruth('auto-4', 'legitimate'),
        createGroundTruth('auto-5', 'legitimate'),
        createGroundTruth('auto-6', 'legitimate'),
        createGroundTruth('auto-7', 'legitimate'),
        createGroundTruth('auto-8', 'malicious')
      ];

      const matrix = service.confusionMatrix(predictions, groundTruth);

      expect(matrix.truePositives).toBe(3);
      expect(matrix.trueNegatives).toBe(2);
      expect(matrix.falsePositives).toBe(2);
      expect(matrix.falseNegatives).toBe(1);
    });

    it('should map automation IDs correctly', () => {
      const predictions: DetectionResult[] = [
        createPrediction('slack-bot-123', 'malicious'),
        createPrediction('google-script-456', 'legitimate')
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('slack-bot-123', 'malicious'),
        createGroundTruth('google-script-456', 'legitimate')
      ];

      const matrix = service.confusionMatrix(predictions, groundTruth);

      expect(matrix.truePositives).toBe(1);
      expect(matrix.trueNegatives).toBe(1);
    });

    it('should handle predictions not in ground truth', () => {
      const predictions: DetectionResult[] = [
        createPrediction('auto-1', 'malicious'),
        createPrediction('auto-2', 'malicious'),
        createPrediction('auto-3', 'malicious') // Not in ground truth
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'malicious'),
        createGroundTruth('auto-2', 'malicious')
      ];

      const matrix = service.confusionMatrix(predictions, groundTruth);

      // auto-3 should be ignored since it's not in ground truth
      expect(matrix.truePositives).toBe(2);
      expect(matrix.falsePositives).toBe(0);
    });

    it('should count false negatives for unpredicted malicious items', () => {
      const predictions: DetectionResult[] = [
        createPrediction('auto-1', 'malicious')
        // auto-2 and auto-3 not predicted
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'malicious'),
        createGroundTruth('auto-2', 'malicious'), // FN
        createGroundTruth('auto-3', 'malicious')  // FN
      ];

      const matrix = service.confusionMatrix(predictions, groundTruth);

      expect(matrix.truePositives).toBe(1);
      expect(matrix.falseNegatives).toBe(2); // Unpredicted malicious items
    });
  });

  describe('accuracy()', () => {
    it('should calculate accuracy correctly', () => {
      const predictions: DetectionResult[] = [
        createPrediction('auto-1', 'malicious'),  // TP
        createPrediction('auto-2', 'malicious'),  // FP
        createPrediction('auto-3', 'legitimate'), // TN
        createPrediction('auto-4', 'legitimate')  // FN
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'malicious'),
        createGroundTruth('auto-2', 'legitimate'),
        createGroundTruth('auto-3', 'legitimate'),
        createGroundTruth('auto-4', 'malicious')
      ];

      const accuracy = service.accuracy(predictions, groundTruth);

      // accuracy = (TP + TN) / (TP + TN + FP + FN) = (1 + 1) / 4 = 0.5
      expect(accuracy).toBe(0.5);
    });

    it('should return 1.0 for perfect accuracy', () => {
      const predictions: DetectionResult[] = [
        createPrediction('auto-1', 'malicious'),
        createPrediction('auto-2', 'malicious'),
        createPrediction('auto-3', 'legitimate'),
        createPrediction('auto-4', 'legitimate')
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'malicious'),
        createGroundTruth('auto-2', 'malicious'),
        createGroundTruth('auto-3', 'legitimate'),
        createGroundTruth('auto-4', 'legitimate')
      ];

      const accuracy = service.accuracy(predictions, groundTruth);

      expect(accuracy).toBe(1.0);
    });

    it('should return 0.0 for no correct predictions', () => {
      const predictions: DetectionResult[] = [
        createPrediction('auto-1', 'legitimate'),
        createPrediction('auto-2', 'legitimate'),
        createPrediction('auto-3', 'malicious'),
        createPrediction('auto-4', 'malicious')
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'malicious'),
        createGroundTruth('auto-2', 'malicious'),
        createGroundTruth('auto-3', 'legitimate'),
        createGroundTruth('auto-4', 'legitimate')
      ];

      const accuracy = service.accuracy(predictions, groundTruth);

      expect(accuracy).toBe(0.0);
    });
  });

  describe('precisionRecallCurve()', () => {
    it('should generate curve with multiple thresholds', () => {
      const predictions: DetectionResult[] = [
        createPrediction('auto-1', 'malicious', 0.95),
        createPrediction('auto-2', 'malicious', 0.85),
        createPrediction('auto-3', 'malicious', 0.70),
        createPrediction('auto-4', 'malicious', 0.55)
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'malicious'),
        createGroundTruth('auto-2', 'malicious'),
        createGroundTruth('auto-3', 'legitimate'),
        createGroundTruth('auto-4', 'legitimate')
      ];

      const curve = service.precisionRecallCurve(predictions, groundTruth);

      expect(curve.length).toBeGreaterThan(0);
      expect(curve[0]).toHaveProperty('threshold');
      expect(curve[0]).toHaveProperty('precision');
      expect(curve[0]).toHaveProperty('recall');
    });

    it('should handle empty predictions not in ground truth', () => {
      const predictions: DetectionResult[] = [
        createPrediction('auto-1', 'malicious', 0.95),
        createPrediction('auto-999', 'malicious', 0.85) // Not in ground truth
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'malicious')
      ];

      const curve = service.precisionRecallCurve(predictions, groundTruth);

      expect(curve.length).toBeGreaterThan(0);
    });

    it('should return empty array when no predictions match ground truth', () => {
      const predictions: DetectionResult[] = [
        createPrediction('auto-999', 'malicious', 0.95)
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'malicious')
      ];

      const curve = service.precisionRecallCurve(predictions, groundTruth);

      expect(curve).toEqual([]);
    });
  });

  describe('falsePositives()', () => {
    it('should track false positive automations', () => {
      const predictions: DetectionResult[] = [
        createPrediction('auto-1', 'malicious'), // TP
        createPrediction('auto-2', 'malicious'), // FP
        createPrediction('auto-3', 'malicious')  // FP
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'malicious'),
        createGroundTruth('auto-2', 'legitimate'),
        createGroundTruth('auto-3', 'legitimate')
      ];

      const fps = service.falsePositives(predictions, groundTruth);

      expect(fps.length).toBe(2);
      expect(fps[0]).toEqual({
        automationId: 'auto-2',
        predicted: 'malicious',
        actual: 'legitimate'
      });
      expect(fps[1]).toEqual({
        automationId: 'auto-3',
        predicted: 'malicious',
        actual: 'legitimate'
      });
    });

    it('should return empty array when no false positives', () => {
      const predictions: DetectionResult[] = [
        createPrediction('auto-1', 'malicious'),
        createPrediction('auto-2', 'legitimate')
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'malicious'),
        createGroundTruth('auto-2', 'legitimate')
      ];

      const fps = service.falsePositives(predictions, groundTruth);

      expect(fps).toEqual([]);
    });
  });

  describe('falseNegatives()', () => {
    it('should track false negative automations', () => {
      const predictions: DetectionResult[] = [
        createPrediction('auto-1', 'malicious'),  // TP
        createPrediction('auto-2', 'legitimate'), // FN
        createPrediction('auto-3', 'legitimate')  // FN
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'malicious'),
        createGroundTruth('auto-2', 'malicious'),
        createGroundTruth('auto-3', 'malicious')
      ];

      const fns = service.falseNegatives(predictions, groundTruth);

      expect(fns.length).toBe(2);
      expect(fns[0]).toEqual({
        automationId: 'auto-2',
        predicted: 'legitimate',
        actual: 'malicious'
      });
      expect(fns[1]).toEqual({
        automationId: 'auto-3',
        predicted: 'legitimate',
        actual: 'malicious'
      });
    });

    it('should track unpredicted malicious automations', () => {
      const predictions: DetectionResult[] = [
        createPrediction('auto-1', 'malicious')
        // auto-2 not predicted at all
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'malicious'),
        createGroundTruth('auto-2', 'malicious')
      ];

      const fns = service.falseNegatives(predictions, groundTruth);

      expect(fns.length).toBe(1);
      expect(fns[0]).toEqual({
        automationId: 'auto-2',
        predicted: 'not_predicted',
        actual: 'malicious'
      });
    });

    it('should return empty array when no false negatives', () => {
      const predictions: DetectionResult[] = [
        createPrediction('auto-1', 'malicious'),
        createPrediction('auto-2', 'malicious')
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'malicious'),
        createGroundTruth('auto-2', 'malicious')
      ];

      const fns = service.falseNegatives(predictions, groundTruth);

      expect(fns).toEqual([]);
    });
  });

  describe('generateReport()', () => {
    it('should generate comprehensive metrics report', () => {
      const predictions: DetectionResult[] = [
        createPrediction('auto-1', 'malicious'),  // TP
        createPrediction('auto-2', 'malicious'),  // TP
        createPrediction('auto-3', 'malicious'),  // FP
        createPrediction('auto-4', 'legitimate'), // TN
        createPrediction('auto-5', 'legitimate')  // FN
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'malicious'),
        createGroundTruth('auto-2', 'malicious'),
        createGroundTruth('auto-3', 'legitimate'),
        createGroundTruth('auto-4', 'legitimate'),
        createGroundTruth('auto-5', 'malicious')
      ];

      const report = service.generateReport(predictions, groundTruth);

      expect(report).toHaveProperty('precision');
      expect(report).toHaveProperty('recall');
      expect(report).toHaveProperty('f1Score');
      expect(report).toHaveProperty('accuracy');
      expect(report).toHaveProperty('confusionMatrix');
      expect(report).toHaveProperty('falsePositiveCount');
      expect(report).toHaveProperty('falseNegativeCount');

      expect(report.precision).toBeCloseTo(0.6667, 3); // 2 / 3
      expect(report.recall).toBeCloseTo(0.6667, 3);    // 2 / 3
      expect(report.f1Score).toBeCloseTo(0.6667, 3);
      expect(report.accuracy).toBe(0.6); // 3 / 5

      expect(report.confusionMatrix.truePositives).toBe(2);
      expect(report.confusionMatrix.trueNegatives).toBe(1);
      expect(report.confusionMatrix.falsePositives).toBe(1);
      expect(report.confusionMatrix.falseNegatives).toBe(1);

      expect(report.falsePositiveCount).toBe(1);
      expect(report.falseNegativeCount).toBe(1);
    });

    it('should handle perfect detection scenario', () => {
      const predictions: DetectionResult[] = [
        createPrediction('auto-1', 'malicious'),
        createPrediction('auto-2', 'malicious'),
        createPrediction('auto-3', 'legitimate'),
        createPrediction('auto-4', 'legitimate')
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'malicious'),
        createGroundTruth('auto-2', 'malicious'),
        createGroundTruth('auto-3', 'legitimate'),
        createGroundTruth('auto-4', 'legitimate')
      ];

      const report = service.generateReport(predictions, groundTruth);

      expect(report.precision).toBe(1.0);
      expect(report.recall).toBe(1.0);
      expect(report.f1Score).toBe(1.0);
      expect(report.accuracy).toBe(1.0);
      expect(report.falsePositiveCount).toBe(0);
      expect(report.falseNegativeCount).toBe(0);
    });

    it('should handle worst case scenario', () => {
      const predictions: DetectionResult[] = [
        createPrediction('auto-1', 'legitimate'),
        createPrediction('auto-2', 'malicious')
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'malicious'),
        createGroundTruth('auto-2', 'legitimate')
      ];

      const report = service.generateReport(predictions, groundTruth);

      expect(report.precision).toBe(0);
      expect(report.recall).toBe(0);
      expect(report.f1Score).toBe(0);
      expect(report.accuracy).toBe(0);
      expect(report.falsePositiveCount).toBe(1);
      expect(report.falseNegativeCount).toBe(1);
    });
  });

  describe('real-world scenarios', () => {
    it('should handle Slack bot detection scenario', () => {
      const predictions: DetectionResult[] = [
        createPrediction('slack-bot-openai-1', 'malicious', 0.95),
        createPrediction('slack-bot-zapier-2', 'malicious', 0.88),
        createPrediction('slack-bot-legitapp-3', 'legitimate', 0.60),
        createPrediction('slack-bot-custom-4', 'malicious', 0.75)
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('slack-bot-openai-1', 'malicious'),
        createGroundTruth('slack-bot-zapier-2', 'malicious'),
        createGroundTruth('slack-bot-legitapp-3', 'legitimate'),
        createGroundTruth('slack-bot-custom-4', 'legitimate') // False positive
      ];

      const report = service.generateReport(predictions, groundTruth);

      expect(report.precision).toBeCloseTo(0.6667, 3);
      expect(report.recall).toBe(1.0); // All malicious caught
      expect(report.falsePositiveCount).toBe(1);
      expect(report.falseNegativeCount).toBe(0);
    });

    it('should handle Google Apps Script detection scenario', () => {
      const predictions: DetectionResult[] = [
        createPrediction('google-script-ai-gen-1', 'malicious', 0.92),
        createPrediction('google-script-sheet-auto-2', 'legitimate', 0.45),
        createPrediction('google-script-form-3', 'legitimate', 0.30),
        createPrediction('google-script-data-export-4', 'malicious', 0.88)
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('google-script-ai-gen-1', 'malicious'),
        createGroundTruth('google-script-sheet-auto-2', 'malicious'), // Missed
        createGroundTruth('google-script-form-3', 'legitimate'),
        createGroundTruth('google-script-data-export-4', 'malicious')
      ];

      const report = service.generateReport(predictions, groundTruth);

      expect(report.precision).toBe(1.0); // No false positives
      expect(report.recall).toBeCloseTo(0.6667, 3); // Missed one malicious
      expect(report.falsePositiveCount).toBe(0);
      expect(report.falseNegativeCount).toBe(1);
    });

    it('should handle Microsoft Power Automate detection scenario', () => {
      const predictions: DetectionResult[] = [
        createPrediction('ms-flow-data-sync-1', 'legitimate', 0.40),
        createPrediction('ms-flow-ai-bot-2', 'malicious', 0.90),
        createPrediction('ms-flow-approval-3', 'legitimate', 0.35),
        createPrediction('ms-flow-suspicious-4', 'malicious', 0.85)
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('ms-flow-data-sync-1', 'legitimate'),
        createGroundTruth('ms-flow-ai-bot-2', 'malicious'),
        createGroundTruth('ms-flow-approval-3', 'legitimate'),
        createGroundTruth('ms-flow-suspicious-4', 'malicious')
      ];

      const report = service.generateReport(predictions, groundTruth);

      expect(report.precision).toBe(1.0);
      expect(report.recall).toBe(1.0);
      expect(report.f1Score).toBe(1.0);
      expect(report.accuracy).toBe(1.0);
    });
  });
});
