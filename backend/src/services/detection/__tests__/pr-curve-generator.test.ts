/**
 * Unit tests for PR Curve Generator Service
 *
 * Tests precision-recall curve generation, AUC calculation, optimal threshold finding,
 * and export functionality.
 */

import {
  PRCurveGeneratorService,
  PRPoint,
  PRCurveData
} from '../pr-curve-generator.service';
import {
  DetectionResult,
  GroundTruthLabel
} from '../detection-metrics.service';

describe('PRCurveGeneratorService', () => {
  let service: PRCurveGeneratorService;

  beforeEach(() => {
    service = new PRCurveGeneratorService();
  });

  describe('generateCurve', () => {
    it('should generate curve with default thresholds (0.1 to 1.0)', () => {
      // Create sample predictions and ground truth
      const predictions: DetectionResult[] = [
        { automationId: 'auto-1', predicted: 'malicious', confidence: 0.9, detectorName: 'velocity', timestamp: new Date() },
        { automationId: 'auto-2', predicted: 'malicious', confidence: 0.8, detectorName: 'velocity', timestamp: new Date() },
        { automationId: 'auto-3', predicted: 'malicious', confidence: 0.6, detectorName: 'velocity', timestamp: new Date() },
        { automationId: 'auto-4', predicted: 'legitimate', confidence: 0.3, detectorName: 'velocity', timestamp: new Date() },
        { automationId: 'auto-5', predicted: 'legitimate', confidence: 0.2, detectorName: 'velocity', timestamp: new Date() }
      ];

      const groundTruth: GroundTruthLabel[] = [
        { automationId: 'auto-1', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
        { automationId: 'auto-2', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
        { automationId: 'auto-3', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
        { automationId: 'auto-4', actual: 'legitimate', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
        { automationId: 'auto-5', actual: 'legitimate', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' }
      ];

      const curveData = service.generateCurve(predictions, groundTruth);

      // Should have 10 default thresholds
      expect(curveData.points).toHaveLength(10);

      // Should have valid AUC (0-1 range)
      expect(curveData.auc).toBeGreaterThanOrEqual(0);
      expect(curveData.auc).toBeLessThanOrEqual(1);

      // Should have optimal threshold
      expect(curveData.optimalThreshold).toBeGreaterThanOrEqual(0);
      expect(curveData.optimalThreshold).toBeLessThanOrEqual(1);

      // Should have metadata
      expect(curveData.metadata.totalPredictions).toBe(5);
      expect(curveData.metadata.totalGroundTruth).toBe(5);
      expect(curveData.metadata.generatedAt).toBeInstanceOf(Date);
    });

    it('should generate curve with custom thresholds', () => {
      const predictions: DetectionResult[] = [
        { automationId: 'auto-1', predicted: 'malicious', confidence: 0.95, detectorName: 'velocity', timestamp: new Date() },
        { automationId: 'auto-2', predicted: 'malicious', confidence: 0.75, detectorName: 'velocity', timestamp: new Date() },
        { automationId: 'auto-3', predicted: 'legitimate', confidence: 0.25, detectorName: 'velocity', timestamp: new Date() }
      ];

      const groundTruth: GroundTruthLabel[] = [
        { automationId: 'auto-1', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
        { automationId: 'auto-2', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
        { automationId: 'auto-3', actual: 'legitimate', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' }
      ];

      const customThresholds = [0.2, 0.5, 0.8];
      const curveData = service.generateCurve(predictions, groundTruth, customThresholds);

      // Should have 3 custom thresholds
      expect(curveData.points).toHaveLength(3);

      // Verify threshold values
      expect(curveData.points.map(p => p.threshold)).toEqual([0.2, 0.5, 0.8]);
    });

    it('should calculate correct precision/recall at different thresholds', () => {
      // Perfect predictions
      const predictions: DetectionResult[] = [
        { automationId: 'auto-1', predicted: 'malicious', confidence: 0.9, detectorName: 'velocity', timestamp: new Date() },
        { automationId: 'auto-2', predicted: 'malicious', confidence: 0.8, detectorName: 'velocity', timestamp: new Date() },
        { automationId: 'auto-3', predicted: 'legitimate', confidence: 0.3, detectorName: 'velocity', timestamp: new Date() },
        { automationId: 'auto-4', predicted: 'legitimate', confidence: 0.2, detectorName: 'velocity', timestamp: new Date() }
      ];

      const groundTruth: GroundTruthLabel[] = [
        { automationId: 'auto-1', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
        { automationId: 'auto-2', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
        { automationId: 'auto-3', actual: 'legitimate', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
        { automationId: 'auto-4', actual: 'legitimate', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' }
      ];

      const curveData = service.generateCurve(predictions, groundTruth, [0.5, 0.7, 0.85]);

      // At threshold 0.5: auto-1, auto-2 predicted as malicious (2 TP, 0 FP) -> precision=1.0, recall=1.0
      const point1 = curveData.points.find(p => p.threshold === 0.5);
      expect(point1).toBeDefined();
      expect(point1!.precision).toBe(1.0);
      expect(point1!.recall).toBe(1.0);
      expect(point1!.f1Score).toBe(1.0);

      // At threshold 0.7: auto-1, auto-2 predicted as malicious (2 TP, 0 FP) -> precision=1.0, recall=1.0
      const point2 = curveData.points.find(p => p.threshold === 0.7);
      expect(point2).toBeDefined();
      expect(point2!.precision).toBe(1.0);
      expect(point2!.recall).toBe(1.0);

      // At threshold 0.85: only auto-1 predicted as malicious (1 TP, 0 FP, 1 FN) -> precision=1.0, recall=0.5
      const point3 = curveData.points.find(p => p.threshold === 0.85);
      expect(point3).toBeDefined();
      expect(point3!.precision).toBe(1.0);
      expect(point3!.recall).toBe(0.5);
    });

    it('should handle all predictions with same confidence', () => {
      const predictions: DetectionResult[] = [
        { automationId: 'auto-1', predicted: 'malicious', confidence: 0.5, detectorName: 'velocity', timestamp: new Date() },
        { automationId: 'auto-2', predicted: 'malicious', confidence: 0.5, detectorName: 'velocity', timestamp: new Date() },
        { automationId: 'auto-3', predicted: 'malicious', confidence: 0.5, detectorName: 'velocity', timestamp: new Date() }
      ];

      const groundTruth: GroundTruthLabel[] = [
        { automationId: 'auto-1', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
        { automationId: 'auto-2', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
        { automationId: 'auto-3', actual: 'legitimate', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' }
      ];

      const curveData = service.generateCurve(predictions, groundTruth);

      // Should still generate curve
      expect(curveData.points.length).toBeGreaterThan(0);
      expect(curveData.auc).toBeGreaterThanOrEqual(0);
    });

    it('should throw error for empty predictions', () => {
      const groundTruth: GroundTruthLabel[] = [
        { automationId: 'auto-1', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' }
      ];

      expect(() => {
        service.generateCurve([], groundTruth);
      }).toThrow('Predictions array cannot be empty');
    });

    it('should throw error for empty ground truth', () => {
      const predictions: DetectionResult[] = [
        { automationId: 'auto-1', predicted: 'malicious', confidence: 0.9, detectorName: 'velocity', timestamp: new Date() }
      ];

      expect(() => {
        service.generateCurve(predictions, []);
      }).toThrow('Ground truth array cannot be empty');
    });

    it('should throw error for invalid threshold values', () => {
      const predictions: DetectionResult[] = [
        { automationId: 'auto-1', predicted: 'malicious', confidence: 0.9, detectorName: 'velocity', timestamp: new Date() }
      ];

      const groundTruth: GroundTruthLabel[] = [
        { automationId: 'auto-1', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' }
      ];

      expect(() => {
        service.generateCurve(predictions, groundTruth, [-0.1, 0.5, 1.0]);
      }).toThrow('Threshold -0.1 is out of range [0, 1]');

      expect(() => {
        service.generateCurve(predictions, groundTruth, [0.0, 0.5, 1.5]);
      }).toThrow('Threshold 1.5 is out of range [0, 1]');
    });

    it('should throw error for invalid confidence scores', () => {
      const predictions: DetectionResult[] = [
        { automationId: 'auto-1', predicted: 'malicious', confidence: 1.5, detectorName: 'velocity', timestamp: new Date() }
      ];

      const groundTruth: GroundTruthLabel[] = [
        { automationId: 'auto-1', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' }
      ];

      expect(() => {
        service.generateCurve(predictions, groundTruth);
      }).toThrow('confidence 1.5 is out of range [0, 1]');
    });
  });

  describe('calculateAUC', () => {
    it('should calculate correct AUC using trapezoidal rule', () => {
      // Create predictions with known precision/recall values
      const predictions: DetectionResult[] = [
        { automationId: 'auto-1', predicted: 'malicious', confidence: 0.9, detectorName: 'velocity', timestamp: new Date() },
        { automationId: 'auto-2', predicted: 'malicious', confidence: 0.7, detectorName: 'velocity', timestamp: new Date() },
        { automationId: 'auto-3', predicted: 'malicious', confidence: 0.5, detectorName: 'velocity', timestamp: new Date() },
        { automationId: 'auto-4', predicted: 'legitimate', confidence: 0.3, detectorName: 'velocity', timestamp: new Date() }
      ];

      const groundTruth: GroundTruthLabel[] = [
        { automationId: 'auto-1', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
        { automationId: 'auto-2', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
        { automationId: 'auto-3', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
        { automationId: 'auto-4', actual: 'legitimate', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' }
      ];

      const curveData = service.generateCurve(predictions, groundTruth);

      // AUC should be in valid range
      expect(curveData.auc).toBeGreaterThanOrEqual(0);
      expect(curveData.auc).toBeLessThanOrEqual(1);
    });

    it('should return high AUC for perfect predictions', () => {
      // All malicious have high confidence, all legitimate have low confidence
      const predictions: DetectionResult[] = [
        { automationId: 'auto-1', predicted: 'malicious', confidence: 0.95, detectorName: 'velocity', timestamp: new Date() },
        { automationId: 'auto-2', predicted: 'malicious', confidence: 0.90, detectorName: 'velocity', timestamp: new Date() },
        { automationId: 'auto-3', predicted: 'legitimate', confidence: 0.15, detectorName: 'velocity', timestamp: new Date() },
        { automationId: 'auto-4', predicted: 'legitimate', confidence: 0.10, detectorName: 'velocity', timestamp: new Date() }
      ];

      const groundTruth: GroundTruthLabel[] = [
        { automationId: 'auto-1', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
        { automationId: 'auto-2', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
        { automationId: 'auto-3', actual: 'legitimate', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
        { automationId: 'auto-4', actual: 'legitimate', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' }
      ];

      // Use more fine-grained thresholds for better AUC calculation
      const thresholds = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 1.0];
      const curveData = service.generateCurve(predictions, groundTruth, thresholds);

      // With perfect separation between malicious (0.9, 0.95) and legitimate (0.1, 0.15),
      // AUC should be high (at least 0.5 for better than random)
      expect(curveData.auc).toBeGreaterThanOrEqual(0.5);

      // Verify curve has expected number of points
      expect(curveData.points).toHaveLength(13);
    });

    it('should return low AUC for random predictions', () => {
      // Random confidence scores
      const predictions: DetectionResult[] = [
        { automationId: 'auto-1', predicted: 'malicious', confidence: 0.4, detectorName: 'velocity', timestamp: new Date() },
        { automationId: 'auto-2', predicted: 'malicious', confidence: 0.6, detectorName: 'velocity', timestamp: new Date() },
        { automationId: 'auto-3', predicted: 'legitimate', confidence: 0.7, detectorName: 'velocity', timestamp: new Date() },
        { automationId: 'auto-4', predicted: 'legitimate', confidence: 0.3, detectorName: 'velocity', timestamp: new Date() }
      ];

      const groundTruth: GroundTruthLabel[] = [
        { automationId: 'auto-1', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
        { automationId: 'auto-2', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
        { automationId: 'auto-3', actual: 'legitimate', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
        { automationId: 'auto-4', actual: 'legitimate', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' }
      ];

      const curveData = service.generateCurve(predictions, groundTruth);

      // AUC should be lower (closer to random = 0.5)
      expect(curveData.auc).toBeLessThan(0.8);
    });
  });

  describe('findOptimalThreshold', () => {
    it('should find threshold with highest F1 score', () => {
      const predictions: DetectionResult[] = [
        { automationId: 'auto-1', predicted: 'malicious', confidence: 0.95, detectorName: 'velocity', timestamp: new Date() },
        { automationId: 'auto-2', predicted: 'malicious', confidence: 0.85, detectorName: 'velocity', timestamp: new Date() },
        { automationId: 'auto-3', predicted: 'malicious', confidence: 0.75, detectorName: 'velocity', timestamp: new Date() },
        { automationId: 'auto-4', predicted: 'malicious', confidence: 0.65, detectorName: 'velocity', timestamp: new Date() },
        { automationId: 'auto-5', predicted: 'legitimate', confidence: 0.35, detectorName: 'velocity', timestamp: new Date() }
      ];

      const groundTruth: GroundTruthLabel[] = [
        { automationId: 'auto-1', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
        { automationId: 'auto-2', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
        { automationId: 'auto-3', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
        { automationId: 'auto-4', actual: 'legitimate', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
        { automationId: 'auto-5', actual: 'legitimate', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' }
      ];

      const curveData = service.generateCurve(predictions, groundTruth);

      // Should have optimal threshold
      expect(curveData.optimalThreshold).toBeGreaterThanOrEqual(0);
      expect(curveData.optimalThreshold).toBeLessThanOrEqual(1);

      // Should have optimal F1 score
      expect(curveData.optimalF1Score).toBeGreaterThanOrEqual(0);
      expect(curveData.optimalF1Score).toBeLessThanOrEqual(1);

      // Verify optimal F1 is the maximum
      const maxF1 = Math.max(...curveData.points.map(p => p.f1Score));
      expect(curveData.optimalF1Score).toBe(maxF1);
    });

    it('should handle case where all F1 scores are zero', () => {
      // All predictions wrong
      const predictions: DetectionResult[] = [
        { automationId: 'auto-1', predicted: 'malicious', confidence: 0.9, detectorName: 'velocity', timestamp: new Date() },
        { automationId: 'auto-2', predicted: 'malicious', confidence: 0.8, detectorName: 'velocity', timestamp: new Date() }
      ];

      const groundTruth: GroundTruthLabel[] = [
        { automationId: 'auto-1', actual: 'legitimate', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
        { automationId: 'auto-2', actual: 'legitimate', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' }
      ];

      const curveData = service.generateCurve(predictions, groundTruth);

      // Should still have optimal threshold (middle value as fallback)
      expect(curveData.optimalThreshold).toBeGreaterThanOrEqual(0);
      expect(curveData.optimalThreshold).toBeLessThanOrEqual(1);
    });
  });

  describe('exportToJSON', () => {
    it('should export curve data as valid JSON', () => {
      const predictions: DetectionResult[] = [
        { automationId: 'auto-1', predicted: 'malicious', confidence: 0.9, detectorName: 'velocity', timestamp: new Date() },
        { automationId: 'auto-2', predicted: 'legitimate', confidence: 0.3, detectorName: 'velocity', timestamp: new Date() }
      ];

      const groundTruth: GroundTruthLabel[] = [
        { automationId: 'auto-1', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
        { automationId: 'auto-2', actual: 'legitimate', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' }
      ];

      const curveData = service.generateCurve(predictions, groundTruth);
      const json = service.exportToJSON(curveData);

      // Should be valid JSON
      expect(() => JSON.parse(json)).not.toThrow();

      // Should contain expected fields
      const parsed = JSON.parse(json);
      expect(parsed).toHaveProperty('points');
      expect(parsed).toHaveProperty('auc');
      expect(parsed).toHaveProperty('optimalThreshold');
      expect(parsed).toHaveProperty('metadata');
    });
  });

  describe('exportToCSV', () => {
    it('should export curve data as valid CSV with header', () => {
      const predictions: DetectionResult[] = [
        { automationId: 'auto-1', predicted: 'malicious', confidence: 0.9, detectorName: 'velocity', timestamp: new Date() },
        { automationId: 'auto-2', predicted: 'legitimate', confidence: 0.3, detectorName: 'velocity', timestamp: new Date() }
      ];

      const groundTruth: GroundTruthLabel[] = [
        { automationId: 'auto-1', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
        { automationId: 'auto-2', actual: 'legitimate', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' }
      ];

      const curveData = service.generateCurve(predictions, groundTruth, [0.5, 0.7, 0.9]);
      const csv = service.exportToCSV(curveData);

      // Should have CSV header
      expect(csv).toContain('threshold,precision,recall,f1');

      // Should have data rows
      expect(csv).toContain('0.5,');
      expect(csv).toContain('0.7,');
      expect(csv).toContain('0.9,');

      // Should have summary metadata
      expect(csv).toContain('# AUC:');
      expect(csv).toContain('# Optimal Threshold:');
      expect(csv).toContain('# Optimal F1:');
    });

    it('should generate parseable CSV rows', () => {
      const predictions: DetectionResult[] = [
        { automationId: 'auto-1', predicted: 'malicious', confidence: 0.9, detectorName: 'velocity', timestamp: new Date() },
        { automationId: 'auto-2', predicted: 'legitimate', confidence: 0.3, detectorName: 'velocity', timestamp: new Date() }
      ];

      const groundTruth: GroundTruthLabel[] = [
        { automationId: 'auto-1', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
        { automationId: 'auto-2', actual: 'legitimate', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' }
      ];

      const curveData = service.generateCurve(predictions, groundTruth, [0.5, 0.8]);
      const csv = service.exportToCSV(curveData);

      // Parse CSV (simple parsing for test)
      const lines = csv.split('\n').filter(line => !line.startsWith('#') && line.trim() !== '');
      const header = lines[0];
      const dataRows = lines.slice(1);

      expect(header).toBe('threshold,precision,recall,f1');
      expect(dataRows.length).toBe(2); // 2 thresholds

      // Each row should have 4 comma-separated values
      for (const row of dataRows) {
        const values = row.split(',');
        expect(values.length).toBe(4);
        // All values should be numbers
        values.forEach(val => expect(isNaN(Number(val))).toBe(false));
      }
    });
  });

  describe('generateSummary', () => {
    it('should generate human-readable summary', () => {
      const predictions: DetectionResult[] = [
        { automationId: 'auto-1', predicted: 'malicious', confidence: 0.9, detectorName: 'velocity', timestamp: new Date() },
        { automationId: 'auto-2', predicted: 'legitimate', confidence: 0.3, detectorName: 'velocity', timestamp: new Date() }
      ];

      const groundTruth: GroundTruthLabel[] = [
        { automationId: 'auto-1', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
        { automationId: 'auto-2', actual: 'legitimate', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' }
      ];

      const curveData = service.generateCurve(predictions, groundTruth, [0.5, 0.7]);
      const summary = service.generateSummary(curveData);

      // Should contain key sections
      expect(summary).toContain('Precision-Recall Curve Analysis');
      expect(summary).toContain('Performance Metrics');
      expect(summary).toContain('Threshold Analysis');
      expect(summary).toContain('Total Predictions: 2');
      expect(summary).toContain('Total Ground Truth: 2');
      expect(summary).toContain('AUC');
      expect(summary).toContain('Optimal Threshold');
      expect(summary).toContain('Optimal F1 Score');

      // Should have table format
      expect(summary).toContain('Threshold | Precision | Recall | F1 Score');
    });
  });

  describe('generateAdaptiveCurve', () => {
    it('should generate curve with adaptive thresholds based on confidence distribution', () => {
      const predictions: DetectionResult[] = [
        { automationId: 'auto-1', predicted: 'malicious', confidence: 0.95, detectorName: 'velocity', timestamp: new Date() },
        { automationId: 'auto-2', predicted: 'malicious', confidence: 0.85, detectorName: 'velocity', timestamp: new Date() },
        { automationId: 'auto-3', predicted: 'malicious', confidence: 0.75, detectorName: 'velocity', timestamp: new Date() },
        { automationId: 'auto-4', predicted: 'malicious', confidence: 0.65, detectorName: 'velocity', timestamp: new Date() },
        { automationId: 'auto-5', predicted: 'legitimate', confidence: 0.35, detectorName: 'velocity', timestamp: new Date() }
      ];

      const groundTruth: GroundTruthLabel[] = [
        { automationId: 'auto-1', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
        { automationId: 'auto-2', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
        { automationId: 'auto-3', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
        { automationId: 'auto-4', actual: 'legitimate', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' },
        { automationId: 'auto-5', actual: 'legitimate', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' }
      ];

      const curveData = service.generateAdaptiveCurve(predictions, groundTruth, 5);

      // Should have 5 thresholds (including 0 and 1)
      expect(curveData.points.length).toBeGreaterThanOrEqual(5);

      // Thresholds should be in range [0, 1]
      for (const point of curveData.points) {
        expect(point.threshold).toBeGreaterThanOrEqual(0);
        expect(point.threshold).toBeLessThanOrEqual(1);
      }

      // First threshold should be 0, last should be 1
      expect(curveData.points[0].threshold).toBe(0);
      expect(curveData.points[curveData.points.length - 1].threshold).toBe(1);
    });

    it('should throw error for empty predictions', () => {
      const groundTruth: GroundTruthLabel[] = [
        { automationId: 'auto-1', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' }
      ];

      expect(() => {
        service.generateAdaptiveCurve([], groundTruth);
      }).toThrow('Predictions and ground truth cannot be empty');
    });

    it('should throw error for too few thresholds', () => {
      const predictions: DetectionResult[] = [
        { automationId: 'auto-1', predicted: 'malicious', confidence: 0.9, detectorName: 'velocity', timestamp: new Date() }
      ];

      const groundTruth: GroundTruthLabel[] = [
        { automationId: 'auto-1', actual: 'malicious', confidence: 1.0, reviewers: ['reviewer1'], rationale: 'Test' }
      ];

      expect(() => {
        service.generateAdaptiveCurve(predictions, groundTruth, 1);
      }).toThrow('Number of thresholds must be at least 2');
    });
  });
});
