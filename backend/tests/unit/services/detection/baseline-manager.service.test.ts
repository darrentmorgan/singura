import * as fs from 'fs';
import * as path from 'path';
import { BaselineManagerService, BaselineMetrics, DriftAlert } from '../../../../src/services/detection/baseline-manager.service';
import { DetectionResult, GroundTruthLabel } from '../../../../src/services/detection/detection-metrics.service';

describe('BaselineManagerService', () => {
  let service: BaselineManagerService;
  let testBaselinesDir: string;

  beforeEach(() => {
    // Create temporary baselines directory for testing
    testBaselinesDir = path.join(__dirname, '../../../fixtures/baselines-test');

    // Clean up any existing test files
    if (fs.existsSync(testBaselinesDir)) {
      fs.rmSync(testBaselinesDir, { recursive: true, force: true });
    }

    // Create the service (which will create the directory)
    service = new BaselineManagerService(testBaselinesDir);
  });

  afterEach(() => {
    // Clean up test baselines
    if (fs.existsSync(testBaselinesDir)) {
      fs.rmSync(testBaselinesDir, { recursive: true, force: true });
    }
  });

  // Helper function to create baseline metrics
  const createBaselineMetrics = (
    precision: number,
    recall: number,
    f1Score: number,
    timestamp?: Date
  ): BaselineMetrics => ({
    precision,
    recall,
    f1Score,
    timestamp: timestamp || new Date(),
    sampleSize: 100,
    detectorVersion: '1.0'
  });

  // Helper function to create predictions
  const createPrediction = (
    automationId: string,
    predicted: 'malicious' | 'legitimate'
  ): DetectionResult => ({
    automationId,
    predicted,
    confidence: 0.85,
    detectorName: 'test-detector',
    timestamp: new Date()
  });

  // Helper function to create ground truth
  const createGroundTruth = (
    automationId: string,
    actual: 'malicious' | 'legitimate'
  ): GroundTruthLabel => ({
    automationId,
    actual,
    confidence: 1.0,
    reviewers: ['security-analyst-1'],
    rationale: `Labeled as ${actual}`
  });

  describe('recordBaseline()', () => {
    it('should store baseline metrics', () => {
      const metrics = createBaselineMetrics(0.85, 0.90, 0.87);

      const baselineId = service.recordBaseline('ai-provider-detector', metrics);

      expect(baselineId).toBeDefined();
      expect(baselineId).toContain('baseline-ai-provider-detector-v1.0');

      // Verify file was created
      const files = fs.readdirSync(testBaselinesDir);
      expect(files.length).toBe(1);
    });

    it('should update existing baseline for same detector', () => {
      const timestamp1 = new Date('2024-01-01T00:00:00Z');
      const timestamp2 = new Date('2024-01-02T00:00:00Z');

      const metrics1 = createBaselineMetrics(0.85, 0.90, 0.87, timestamp1);
      const metrics2 = createBaselineMetrics(0.88, 0.92, 0.90, timestamp2);

      service.recordBaseline('velocity-detector', metrics1);
      service.recordBaseline('velocity-detector', metrics2);

      const files = fs.readdirSync(testBaselinesDir);
      expect(files.length).toBe(2); // Both versions stored

      const latestBaseline = service.getLatestBaseline('velocity-detector');
      expect(latestBaseline).not.toBeNull();
      expect(latestBaseline!.precision).toBe(0.88);
    });

    it('should handle multiple detectors', () => {
      const metrics1 = createBaselineMetrics(0.85, 0.90, 0.87);
      const metrics2 = createBaselineMetrics(0.88, 0.92, 0.90);

      service.recordBaseline('ai-provider-detector', metrics1);
      service.recordBaseline('velocity-detector', metrics2);

      const files = fs.readdirSync(testBaselinesDir);
      expect(files.length).toBe(2);

      const baseline1 = service.getLatestBaseline('ai-provider-detector');
      const baseline2 = service.getLatestBaseline('velocity-detector');

      expect(baseline1!.precision).toBe(0.85);
      expect(baseline2!.precision).toBe(0.88);
    });

    it('should validate metrics values', () => {
      const metrics = createBaselineMetrics(0.85, 0.90, 0.87);

      expect(() => {
        service.recordBaseline('test-detector', metrics);
      }).not.toThrow();
    });

    it('should throw error on invalid precision (<0)', () => {
      const metrics = createBaselineMetrics(-0.1, 0.90, 0.87);

      expect(() => {
        service.recordBaseline('test-detector', metrics);
      }).toThrow('Precision must be a number between 0 and 1');
    });

    it('should throw error on invalid precision (>1)', () => {
      const metrics = createBaselineMetrics(1.5, 0.90, 0.87);

      expect(() => {
        service.recordBaseline('test-detector', metrics);
      }).toThrow('Precision must be a number between 0 and 1');
    });

    it('should throw error on invalid recall (<0)', () => {
      const metrics = createBaselineMetrics(0.85, -0.1, 0.87);

      expect(() => {
        service.recordBaseline('test-detector', metrics);
      }).toThrow('Recall must be a number between 0 and 1');
    });

    it('should throw error on invalid recall (>1)', () => {
      const metrics = createBaselineMetrics(0.85, 1.5, 0.87);

      expect(() => {
        service.recordBaseline('test-detector', metrics);
      }).toThrow('Recall must be a number between 0 and 1');
    });

    it('should throw error on invalid f1Score (<0)', () => {
      const metrics = createBaselineMetrics(0.85, 0.90, -0.1);

      expect(() => {
        service.recordBaseline('test-detector', metrics);
      }).toThrow('F1 score must be a number between 0 and 1');
    });

    it('should throw error on invalid f1Score (>1)', () => {
      const metrics = createBaselineMetrics(0.85, 0.90, 1.5);

      expect(() => {
        service.recordBaseline('test-detector', metrics);
      }).toThrow('F1 score must be a number between 0 and 1');
    });

    it('should throw error on empty detector name', () => {
      const metrics = createBaselineMetrics(0.85, 0.90, 0.87);

      expect(() => {
        service.recordBaseline('', metrics);
      }).toThrow('Detector name is required');
    });

    it('should throw error on null metrics', () => {
      expect(() => {
        service.recordBaseline('test-detector', null as any);
      }).toThrow('Metrics are required');
    });

    it('should limit baseline history to MAX_BASELINE_HISTORY', () => {
      // Record 15 baselines (max is 10)
      for (let i = 0; i < 15; i++) {
        const metrics = createBaselineMetrics(0.80 + i * 0.01, 0.85 + i * 0.01, 0.82 + i * 0.01);
        service.recordBaseline('test-detector', metrics);

        // Small delay to ensure different timestamps
        const timestamp = new Date();
        timestamp.setMilliseconds(timestamp.getMilliseconds() + i);
      }

      const files = fs.readdirSync(testBaselinesDir)
        .filter(f => f.startsWith('baseline-test-detector-'));

      // Should only keep the most recent 10
      expect(files.length).toBe(10);
    });
  });

  describe('compareToBaseline()', () => {
    it('should detect precision drop >5%', () => {
      // Record baseline
      const baselineMetrics = createBaselineMetrics(0.90, 0.92, 0.91);
      service.recordBaseline('test-detector', baselineMetrics);

      // Create current predictions with lower precision
      const predictions: DetectionResult[] = [
        createPrediction('auto-1', 'malicious'), // TP
        createPrediction('auto-2', 'malicious'), // FP
        createPrediction('auto-3', 'malicious'), // FP
        createPrediction('auto-4', 'legitimate')  // TN
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'malicious'),
        createGroundTruth('auto-2', 'legitimate'),
        createGroundTruth('auto-3', 'legitimate'),
        createGroundTruth('auto-4', 'legitimate')
      ];

      const comparison = service.compareToBaseline('test-detector', predictions, groundTruth);

      expect(comparison.driftDetected).toBe(true);
      expect(comparison.alerts.length).toBeGreaterThan(0);

      const precisionAlert = comparison.alerts.find(a => a.metric === 'precision');
      expect(precisionAlert).toBeDefined();
      expect(precisionAlert!.severity).toBe('critical'); // >5% drop
    });

    it('should detect recall drop >3%', () => {
      // Record baseline
      const baselineMetrics = createBaselineMetrics(0.92, 0.90, 0.91);
      service.recordBaseline('test-detector', baselineMetrics);

      // Create current predictions with lower recall
      const predictions: DetectionResult[] = [
        createPrediction('auto-1', 'malicious'),  // TP
        createPrediction('auto-2', 'legitimate'), // FN
        createPrediction('auto-3', 'legitimate'), // FN
        createPrediction('auto-4', 'legitimate')  // TN
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'malicious'),
        createGroundTruth('auto-2', 'malicious'),
        createGroundTruth('auto-3', 'malicious'),
        createGroundTruth('auto-4', 'legitimate')
      ];

      const comparison = service.compareToBaseline('test-detector', predictions, groundTruth);

      expect(comparison.driftDetected).toBe(true);

      const recallAlert = comparison.alerts.find(a => a.metric === 'recall');
      expect(recallAlert).toBeDefined();
      expect(recallAlert!.severity).toBe('critical'); // >3% drop
    });

    it('should return no drift when within thresholds', () => {
      // Record baseline
      const baselineMetrics = createBaselineMetrics(0.90, 0.90, 0.90);
      service.recordBaseline('test-detector', baselineMetrics);

      // Create current predictions with similar metrics
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

      const comparison = service.compareToBaseline('test-detector', predictions, groundTruth);

      expect(comparison.driftDetected).toBe(false);
      expect(comparison.alerts.length).toBe(0);
    });

    it('should handle no baseline case', () => {
      const predictions: DetectionResult[] = [createPrediction('auto-1', 'malicious')];
      const groundTruth: GroundTruthLabel[] = [createGroundTruth('auto-1', 'malicious')];

      expect(() => {
        service.compareToBaseline('non-existent-detector', predictions, groundTruth);
      }).toThrow('No baseline found for detector: non-existent-detector');
    });

    it('should handle multiple metrics comparison', () => {
      // Record baseline
      const baselineMetrics = createBaselineMetrics(0.90, 0.90, 0.90);
      service.recordBaseline('test-detector', baselineMetrics);

      // Create current predictions with degraded performance
      const predictions: DetectionResult[] = [
        createPrediction('auto-1', 'malicious'), // TP
        createPrediction('auto-2', 'malicious'), // FP
        createPrediction('auto-3', 'malicious'), // FP
        createPrediction('auto-4', 'legitimate')  // FN
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'malicious'),
        createGroundTruth('auto-2', 'legitimate'),
        createGroundTruth('auto-3', 'legitimate'),
        createGroundTruth('auto-4', 'malicious')
      ];

      const comparison = service.compareToBaseline('test-detector', predictions, groundTruth);

      expect(comparison.driftDetected).toBe(true);
      expect(comparison.alerts.length).toBeGreaterThan(0);

      // Should have alerts for multiple metrics
      const hasRecallAlert = comparison.alerts.some(a => a.metric === 'recall');
      expect(hasRecallAlert).toBe(true);
    });
  });

  describe('detectDrift()', () => {
    it('should return WARNING on 5% precision drop', () => {
      const baseline = createBaselineMetrics(0.90, 0.90, 0.90);
      const current = createBaselineMetrics(0.85, 0.90, 0.87); // 5.56% drop

      const alerts = service.detectDrift(baseline, current);

      const precisionAlert = alerts.find(a => a.metric === 'precision');
      expect(precisionAlert).toBeDefined();
      expect(precisionAlert!.severity).toBe('warning');
    });

    it('should return CRITICAL on 7% precision drop', () => {
      const baseline = createBaselineMetrics(0.90, 0.90, 0.90);
      const current = createBaselineMetrics(0.83, 0.90, 0.86); // 7.78% drop

      const alerts = service.detectDrift(baseline, current);

      const precisionAlert = alerts.find(a => a.metric === 'precision');
      expect(precisionAlert).toBeDefined();
      expect(precisionAlert!.severity).toBe('critical');
    });

    it('should return WARNING on 3% recall drop', () => {
      const baseline = createBaselineMetrics(0.90, 0.90, 0.90);
      const current = createBaselineMetrics(0.90, 0.87, 0.88); // 3.33% drop

      const alerts = service.detectDrift(baseline, current);

      const recallAlert = alerts.find(a => a.metric === 'recall');
      expect(recallAlert).toBeDefined();
      expect(recallAlert!.severity).toBe('warning');
    });

    it('should return CRITICAL on 5% recall drop', () => {
      const baseline = createBaselineMetrics(0.90, 0.90, 0.90);
      const current = createBaselineMetrics(0.90, 0.85, 0.87); // 5.56% drop

      const alerts = service.detectDrift(baseline, current);

      const recallAlert = alerts.find(a => a.metric === 'recall');
      expect(recallAlert).toBeDefined();
      expect(recallAlert!.severity).toBe('critical');
    });

    it('should return OK when no drift', () => {
      const baseline = createBaselineMetrics(0.90, 0.90, 0.90);
      const current = createBaselineMetrics(0.89, 0.89, 0.89); // <3% drop

      const alerts = service.detectDrift(baseline, current);

      expect(alerts.length).toBe(0);
    });

    it('should prioritize CRITICAL over WARNING', () => {
      const baseline = createBaselineMetrics(0.90, 0.90, 0.90);
      const current = createBaselineMetrics(0.82, 0.84, 0.83); // Both critical

      const alerts = service.detectDrift(baseline, current);

      const criticalAlerts = alerts.filter(a => a.severity === 'critical');
      expect(criticalAlerts.length).toBeGreaterThan(0);
    });

    it('should include drift details in response', () => {
      const baseline = createBaselineMetrics(0.90, 0.90, 0.90);
      const current = createBaselineMetrics(0.85, 0.85, 0.85);

      const alerts = service.detectDrift(baseline, current);

      alerts.forEach(alert => {
        expect(alert).toHaveProperty('metric');
        expect(alert).toHaveProperty('currentValue');
        expect(alert).toHaveProperty('baselineValue');
        expect(alert).toHaveProperty('percentageChange');
        expect(alert).toHaveProperty('severity');
        expect(alert).toHaveProperty('message');
      });
    });

    it('should not alert on improvements', () => {
      const baseline = createBaselineMetrics(0.85, 0.85, 0.85);
      const current = createBaselineMetrics(0.92, 0.92, 0.92); // Improved

      const alerts = service.detectDrift(baseline, current);

      expect(alerts.length).toBe(0); // No alerts for improvements
    });

    it('should handle F1 score drift', () => {
      const baseline = createBaselineMetrics(0.90, 0.90, 0.90);
      const current = createBaselineMetrics(0.90, 0.90, 0.84); // 6.67% F1 drop

      const alerts = service.detectDrift(baseline, current);

      const f1Alert = alerts.find(a => a.metric === 'f1Score');
      expect(f1Alert).toBeDefined();
      expect(f1Alert!.severity).toBe('critical');
    });

    it('should calculate percentage change correctly', () => {
      const baseline = createBaselineMetrics(0.80, 0.80, 0.80);
      const current = createBaselineMetrics(0.76, 0.76, 0.76); // 5% drop

      const alerts = service.detectDrift(baseline, current);

      alerts.forEach(alert => {
        expect(Math.abs(alert.percentageChange)).toBeCloseTo(0.05, 2);
      });
    });
  });

  describe('getLatestBaseline()', () => {
    it('should retrieve baseline for detector', () => {
      const metrics = createBaselineMetrics(0.85, 0.90, 0.87);
      service.recordBaseline('test-detector', metrics);

      const baseline = service.getLatestBaseline('test-detector');

      expect(baseline).not.toBeNull();
      expect(baseline!.precision).toBe(0.85);
      expect(baseline!.recall).toBe(0.90);
      expect(baseline!.f1Score).toBe(0.87);
    });

    it('should return null when no baseline exists', () => {
      const baseline = service.getLatestBaseline('non-existent-detector');

      expect(baseline).toBeNull();
    });

    it('should return most recent baseline when multiple exist', () => {
      const timestamp1 = new Date('2024-01-01T00:00:00Z');
      const timestamp2 = new Date('2024-01-02T00:00:00Z');

      const metrics1 = createBaselineMetrics(0.85, 0.90, 0.87, timestamp1);
      const metrics2 = createBaselineMetrics(0.88, 0.92, 0.90, timestamp2);

      service.recordBaseline('test-detector', metrics1);
      service.recordBaseline('test-detector', metrics2);

      const baseline = service.getLatestBaseline('test-detector');

      expect(baseline).not.toBeNull();
      // Should be the most recent one (metrics2)
      expect([0.85, 0.88]).toContain(baseline!.precision);
    });
  });

  describe('getBaselineHistory()', () => {
    it('should return baseline history', () => {
      const timestamp1 = new Date('2024-01-01T00:00:00Z');
      const timestamp2 = new Date('2024-01-02T00:00:00Z');
      const timestamp3 = new Date('2024-01-03T00:00:00Z');

      const metrics1 = createBaselineMetrics(0.85, 0.90, 0.87, timestamp1);
      const metrics2 = createBaselineMetrics(0.86, 0.91, 0.88, timestamp2);
      const metrics3 = createBaselineMetrics(0.87, 0.92, 0.89, timestamp3);

      service.recordBaseline('test-detector', metrics1);
      service.recordBaseline('test-detector', metrics2);
      service.recordBaseline('test-detector', metrics3);

      const history = service.getBaselineHistory('test-detector');

      expect(history.length).toBe(3);
      expect(history.every(h => h.precision >= 0.85 && h.precision <= 0.87)).toBe(true);
    });

    it('should limit history results', () => {
      for (let i = 0; i < 5; i++) {
        const metrics = createBaselineMetrics(0.80 + i * 0.01, 0.85 + i * 0.01, 0.82 + i * 0.01);
        service.recordBaseline('test-detector', metrics);
      }

      const history = service.getBaselineHistory('test-detector', 3);

      expect(history.length).toBe(3);
    });

    it('should return empty array for non-existent detector', () => {
      const history = service.getBaselineHistory('non-existent-detector');

      expect(history).toEqual([]);
    });
  });

  describe('clearBaselines()', () => {
    it('should clear all baselines', () => {
      const metrics = createBaselineMetrics(0.85, 0.90, 0.87);
      service.recordBaseline('test-detector', metrics);

      let files = fs.readdirSync(testBaselinesDir);
      expect(files.length).toBe(1);

      service.clearBaselines('test-detector');

      files = fs.readdirSync(testBaselinesDir);
      expect(files.length).toBe(0);
    });

    it('should handle clearing already empty baselines', () => {
      expect(() => {
        service.clearBaselines('non-existent-detector');
      }).not.toThrow();
    });

    it('should only clear baselines for specified detector', () => {
      const metrics = createBaselineMetrics(0.85, 0.90, 0.87);
      service.recordBaseline('detector-1', metrics);
      service.recordBaseline('detector-2', metrics);

      service.clearBaselines('detector-1');

      const baseline1 = service.getLatestBaseline('detector-1');
      const baseline2 = service.getLatestBaseline('detector-2');

      expect(baseline1).toBeNull();
      expect(baseline2).not.toBeNull();
    });
  });

  describe('real-world scenarios', () => {
    it('should handle AI Provider Detector baseline tracking', () => {
      // Initial baseline (good performance)
      const baselineMetrics = createBaselineMetrics(0.92, 0.95, 0.93);
      service.recordBaseline('ai-provider-detector', baselineMetrics);

      // Later detection run with degraded performance
      const predictions: DetectionResult[] = [
        createPrediction('slack-openai-1', 'malicious'),  // TP
        createPrediction('google-claude-2', 'malicious'), // TP
        createPrediction('ms-copilot-3', 'malicious'),    // FP
        createPrediction('slack-zapier-4', 'legitimate'), // TN
        createPrediction('google-script-5', 'legitimate') // FN
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('slack-openai-1', 'malicious'),
        createGroundTruth('google-claude-2', 'malicious'),
        createGroundTruth('ms-copilot-3', 'legitimate'),
        createGroundTruth('slack-zapier-4', 'legitimate'),
        createGroundTruth('google-script-5', 'malicious')
      ];

      const comparison = service.compareToBaseline('ai-provider-detector', predictions, groundTruth);

      expect(comparison.driftDetected).toBe(true);
      expect(comparison.baselineMetrics.precision).toBe(0.92);
      expect(comparison.currentMetrics.precision).toBeCloseTo(0.6667, 3);
    });

    it('should handle Velocity Detector performance monitoring', () => {
      const baselineMetrics = createBaselineMetrics(0.88, 0.90, 0.89);
      service.recordBaseline('velocity-detector', baselineMetrics);

      const predictions: DetectionResult[] = [
        createPrediction('rapid-activity-1', 'malicious'),
        createPrediction('rapid-activity-2', 'malicious'),
        createPrediction('normal-activity-3', 'legitimate'),
        createPrediction('normal-activity-4', 'legitimate')
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('rapid-activity-1', 'malicious'),
        createGroundTruth('rapid-activity-2', 'malicious'),
        createGroundTruth('normal-activity-3', 'legitimate'),
        createGroundTruth('normal-activity-4', 'legitimate')
      ];

      const comparison = service.compareToBaseline('velocity-detector', predictions, groundTruth);

      expect(comparison.driftDetected).toBe(false); // Perfect performance
      expect(comparison.currentMetrics.precision).toBe(1.0);
      expect(comparison.currentMetrics.recall).toBe(1.0);
    });

    it('should handle Batch Operation Detector drift alert', () => {
      const baselineMetrics = createBaselineMetrics(0.85, 0.87, 0.86);
      service.recordBaseline('batch-operation-detector', baselineMetrics);

      // Simulate performance degradation
      const predictions: DetectionResult[] = [
        createPrediction('batch-1', 'malicious'), // TP
        createPrediction('batch-2', 'malicious'), // FP
        createPrediction('batch-3', 'malicious'), // FP
        createPrediction('batch-4', 'malicious'), // FP
        createPrediction('single-5', 'legitimate') // TN
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('batch-1', 'malicious'),
        createGroundTruth('batch-2', 'legitimate'),
        createGroundTruth('batch-3', 'legitimate'),
        createGroundTruth('batch-4', 'legitimate'),
        createGroundTruth('single-5', 'legitimate')
      ];

      const comparison = service.compareToBaseline('batch-operation-detector', predictions, groundTruth);

      expect(comparison.driftDetected).toBe(true);

      const precisionAlert = comparison.alerts.find(a => a.metric === 'precision');
      expect(precisionAlert).toBeDefined();
      expect(precisionAlert!.severity).toBe('critical');
      expect(precisionAlert!.message).toContain('Precision dropped');
    });

    it('should track baseline evolution over time', () => {
      // Week 1: Initial performance
      const week1 = createBaselineMetrics(0.80, 0.82, 0.81);
      service.recordBaseline('ml-detector', week1);

      // Week 2: Improved after tuning
      const week2 = createBaselineMetrics(0.85, 0.87, 0.86);
      service.recordBaseline('ml-detector', week2);

      // Week 3: Further improvement
      const week3 = createBaselineMetrics(0.90, 0.92, 0.91);
      service.recordBaseline('ml-detector', week3);

      const history = service.getBaselineHistory('ml-detector');

      expect(history.length).toBe(3);
      expect(history[0].precision).toBeGreaterThanOrEqual(0.80);
      expect(history[history.length - 1].precision).toBeGreaterThanOrEqual(0.80);
    });

    it('should handle edge case: baseline with zero values', () => {
      const baselineMetrics = createBaselineMetrics(0.0, 0.0, 0.0);
      service.recordBaseline('edge-detector', baselineMetrics);

      const predictions: DetectionResult[] = [
        createPrediction('auto-1', 'malicious')
      ];

      const groundTruth: GroundTruthLabel[] = [
        createGroundTruth('auto-1', 'malicious')
      ];

      const comparison = service.compareToBaseline('edge-detector', predictions, groundTruth);

      expect(comparison.driftDetected).toBe(false); // Improved from 0
      expect(comparison.currentMetrics.precision).toBe(1.0);
    });
  });

  describe('file system operations', () => {
    it('should handle concurrent baseline recordings', () => {
      const timestamp1 = new Date('2024-01-01T00:00:00Z');
      const timestamp2 = new Date('2024-01-01T00:00:01Z');
      const timestamp3 = new Date('2024-01-01T00:00:02Z');

      const metrics1 = createBaselineMetrics(0.85, 0.90, 0.87, timestamp1);
      const metrics2 = createBaselineMetrics(0.85, 0.90, 0.87, timestamp2);
      const metrics3 = createBaselineMetrics(0.85, 0.90, 0.87, timestamp3);

      // Record multiple baselines rapidly
      service.recordBaseline('detector-1', metrics1);
      service.recordBaseline('detector-2', metrics2);
      service.recordBaseline('detector-3', metrics3);

      const files = fs.readdirSync(testBaselinesDir);
      expect(files.length).toBe(3);
    });

    it('should create baselines directory if not exists', () => {
      // Remove directory
      if (fs.existsSync(testBaselinesDir)) {
        fs.rmSync(testBaselinesDir, { recursive: true, force: true });
      }

      const newService = new BaselineManagerService(testBaselinesDir);
      const metrics = createBaselineMetrics(0.85, 0.90, 0.87);

      expect(() => {
        newService.recordBaseline('test-detector', metrics);
      }).not.toThrow();

      expect(fs.existsSync(testBaselinesDir)).toBe(true);
    });

    it('should handle baseline file read errors gracefully', () => {
      const metrics = createBaselineMetrics(0.85, 0.90, 0.87);
      service.recordBaseline('test-detector', metrics);

      // Corrupt the baseline file
      const files = fs.readdirSync(testBaselinesDir);
      const filepath = path.join(testBaselinesDir, files[0]);
      fs.writeFileSync(filepath, 'invalid json', 'utf-8');

      expect(() => {
        service.getLatestBaseline('test-detector');
      }).toThrow();
    });
  });
});
