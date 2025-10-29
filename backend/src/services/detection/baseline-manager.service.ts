import { DetectionResult, GroundTruthLabel } from './detection-metrics.service';
import { detectionMetrics } from './detection-metrics.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Baseline Manager Service
 *
 * Tracks detection algorithm performance over time and detects drift.
 * Alerts on significant precision/recall degradation.
 */

export interface BaselineMetrics {
  precision: number;
  recall: number;
  f1Score: number;
  timestamp: Date;
  sampleSize: number;
  detectorVersion: string;
}

export interface DriftAlert {
  metric: 'precision' | 'recall' | 'f1Score';
  currentValue: number;
  baselineValue: number;
  percentageChange: number;
  severity: 'warning' | 'critical';
  message: string;
}

export interface BaselineRecord {
  detectorName: string;
  version: string;
  metrics: BaselineMetrics;
  gitCommit?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Service for managing performance baselines and detecting drift
 */
export class BaselineManagerService {
  private baselinesDir: string;
  private readonly MAX_BASELINE_HISTORY = 10;

  // Drift thresholds
  private readonly PRECISION_WARNING_THRESHOLD = 0.05; // 5% drop
  private readonly PRECISION_CRITICAL_THRESHOLD = 0.07; // 7% drop
  private readonly RECALL_WARNING_THRESHOLD = 0.03; // 3% drop
  private readonly RECALL_CRITICAL_THRESHOLD = 0.05; // 5% drop
  private readonly F1_WARNING_THRESHOLD = 0.04; // 4% drop
  private readonly F1_CRITICAL_THRESHOLD = 0.06; // 6% drop

  constructor(baselinesDir?: string) {
    this.baselinesDir = baselinesDir || path.join(__dirname, '../../../tests/fixtures/baselines');
    this.ensureBaselinesDirectory();
  }

  /**
   * Ensure baselines directory exists
   */
  private ensureBaselinesDirectory(): void {
    if (!fs.existsSync(this.baselinesDir)) {
      fs.mkdirSync(this.baselinesDir, { recursive: true });
    }
  }

  /**
   * Generate baseline filename
   */
  private getBaselineFilename(detectorName: string, version: string, timestamp: Date): string {
    const timestampStr = timestamp.toISOString().replace(/[:.]/g, '-');
    return `baseline-${detectorName}-v${version}-${timestampStr}.json`;
  }

  /**
   * Get all baseline files for a detector, sorted by timestamp (newest first)
   */
  private getBaselineFiles(detectorName: string): string[] {
    if (!fs.existsSync(this.baselinesDir)) {
      return [];
    }

    const files = fs.readdirSync(this.baselinesDir);
    const baselineFiles = files
      .filter(f => f.startsWith(`baseline-${detectorName}-`) && f.endsWith('.json'))
      .map(f => path.join(this.baselinesDir, f))
      .sort((a, b) => {
        // Sort by modification time, newest first
        const statA = fs.statSync(a);
        const statB = fs.statSync(b);
        return statB.mtime.getTime() - statA.mtime.getTime();
      });

    return baselineFiles;
  }

  /**
   * Record a new baseline for detection performance
   *
   * @param detectorName - Name of the detector (e.g., 'ai-provider-detector')
   * @param metrics - Performance metrics to record
   * @returns Baseline ID for future reference
   */
  recordBaseline(detectorName: string, metrics: BaselineMetrics): string {
    if (!detectorName || detectorName.trim() === '') {
      throw new Error('Detector name is required');
    }

    if (!metrics) {
      throw new Error('Metrics are required');
    }

    // Validate metrics
    if (typeof metrics.precision !== 'number' || metrics.precision < 0 || metrics.precision > 1) {
      throw new Error('Precision must be a number between 0 and 1');
    }
    if (typeof metrics.recall !== 'number' || metrics.recall < 0 || metrics.recall > 1) {
      throw new Error('Recall must be a number between 0 and 1');
    }
    if (typeof metrics.f1Score !== 'number' || metrics.f1Score < 0 || metrics.f1Score > 1) {
      throw new Error('F1 score must be a number between 0 and 1');
    }

    const timestamp = metrics.timestamp || new Date();
    const version = metrics.detectorVersion || '1.0';

    const record: BaselineRecord = {
      detectorName,
      version,
      metrics: {
        ...metrics,
        timestamp
      }
    };

    // Try to get git commit
    try {
      const gitCommit = require('child_process')
        .execSync('git rev-parse HEAD')
        .toString()
        .trim();
      record.gitCommit = gitCommit;
    } catch (error) {
      // Ignore git errors
    }

    const filename = this.getBaselineFilename(detectorName, version, timestamp);
    const filepath = path.join(this.baselinesDir, filename);

    // Atomic write using temp file + rename
    const tempFilepath = `${filepath}.tmp`;
    fs.writeFileSync(tempFilepath, JSON.stringify(record, null, 2));
    fs.renameSync(tempFilepath, filepath);

    // Clean up old baselines
    this.cleanupOldBaselines(detectorName);

    return path.basename(filepath, '.json');
  }

  /**
   * Clean up old baselines, keeping only the most recent MAX_BASELINE_HISTORY
   */
  private cleanupOldBaselines(detectorName: string): void {
    const files = this.getBaselineFiles(detectorName);

    if (files.length > this.MAX_BASELINE_HISTORY) {
      const filesToDelete = files.slice(this.MAX_BASELINE_HISTORY);
      for (const file of filesToDelete) {
        try {
          fs.unlinkSync(file);
        } catch (error) {
          console.error(`Failed to delete old baseline ${file}:`, error);
        }
      }
    }
  }

  /**
   * Compare current metrics to the most recent baseline
   *
   * @param detectorName - Name of the detector
   * @param currentPredictions - Current detection results
   * @param groundTruth - Ground truth labels
   * @returns Comparison result with drift information
   */
  compareToBaseline(
    detectorName: string,
    currentPredictions: DetectionResult[],
    groundTruth: GroundTruthLabel[]
  ): {
    baselineMetrics: BaselineMetrics;
    currentMetrics: BaselineMetrics;
    driftDetected: boolean;
    alerts: DriftAlert[];
  } {
    const baseline = this.getLatestBaseline(detectorName);

    if (!baseline) {
      throw new Error(`No baseline found for detector: ${detectorName}`);
    }

    // Calculate current metrics
    const report = detectionMetrics.generateReport(currentPredictions, groundTruth);

    const currentMetrics: BaselineMetrics = {
      precision: report.precision,
      recall: report.recall,
      f1Score: report.f1Score,
      timestamp: new Date(),
      sampleSize: currentPredictions.length,
      detectorVersion: baseline.detectorVersion
    };

    // Detect drift
    const alerts = this.detectDrift(baseline, currentMetrics);

    return {
      baselineMetrics: baseline,
      currentMetrics,
      driftDetected: alerts.length > 0,
      alerts
    };
  }

  /**
   * Detect performance drift based on threshold rules
   *
   * Thresholds:
   * - Precision drop ≥5% = warning, ≥7% = critical
   * - Recall drop ≥3% = warning, ≥5% = critical
   * - F1 drop ≥4% = warning, ≥6% = critical
   *
   * @param baseline - Baseline metrics
   * @param current - Current metrics
   * @returns Array of drift alerts
   */
  detectDrift(baseline: BaselineMetrics, current: BaselineMetrics): DriftAlert[] {
    const alerts: DriftAlert[] = [];

    // Check precision drift
    const precisionChange = this.calculatePercentageChange(baseline.precision, current.precision);
    const precisionSeverity = this.determineAlertSeverity('precision', precisionChange);

    if (precisionSeverity) {
      alerts.push({
        metric: 'precision',
        currentValue: current.precision,
        baselineValue: baseline.precision,
        percentageChange: precisionChange,
        severity: precisionSeverity,
        message: `Precision dropped by ${Math.abs(precisionChange * 100).toFixed(2)}% (${(baseline.precision * 100).toFixed(2)}% → ${(current.precision * 100).toFixed(2)}%)`
      });
    }

    // Check recall drift
    const recallChange = this.calculatePercentageChange(baseline.recall, current.recall);
    const recallSeverity = this.determineAlertSeverity('recall', recallChange);

    if (recallSeverity) {
      alerts.push({
        metric: 'recall',
        currentValue: current.recall,
        baselineValue: baseline.recall,
        percentageChange: recallChange,
        severity: recallSeverity,
        message: `Recall dropped by ${Math.abs(recallChange * 100).toFixed(2)}% (${(baseline.recall * 100).toFixed(2)}% → ${(current.recall * 100).toFixed(2)}%)`
      });
    }

    // Check F1 drift
    const f1Change = this.calculatePercentageChange(baseline.f1Score, current.f1Score);
    const f1Severity = this.determineAlertSeverity('f1Score', f1Change);

    if (f1Severity) {
      alerts.push({
        metric: 'f1Score',
        currentValue: current.f1Score,
        baselineValue: baseline.f1Score,
        percentageChange: f1Change,
        severity: f1Severity,
        message: `F1 score dropped by ${Math.abs(f1Change * 100).toFixed(2)}% (${(baseline.f1Score * 100).toFixed(2)}% → ${(current.f1Score * 100).toFixed(2)}%)`
      });
    }

    return alerts;
  }

  /**
   * Get the most recent baseline for a detector
   *
   * @param detectorName - Name of the detector
   * @returns Most recent baseline metrics or null if none exists
   */
  getLatestBaseline(detectorName: string): BaselineMetrics | null {
    const files = this.getBaselineFiles(detectorName);

    if (files.length === 0) {
      return null;
    }

    const latestFile = files[0];
    const record: BaselineRecord = JSON.parse(fs.readFileSync(latestFile, 'utf-8'));

    // Convert timestamp string back to Date
    return {
      ...record.metrics,
      timestamp: new Date(record.metrics.timestamp)
    };
  }

  /**
   * Get baseline history for a detector
   *
   * @param detectorName - Name of the detector
   * @param limit - Maximum number of baselines to return
   * @returns Array of historical baseline metrics
   */
  getBaselineHistory(detectorName: string, limit?: number): BaselineMetrics[] {
    const files = this.getBaselineFiles(detectorName);
    const limitedFiles = limit ? files.slice(0, limit) : files;

    return limitedFiles.map(file => {
      const record: BaselineRecord = JSON.parse(fs.readFileSync(file, 'utf-8'));
      return {
        ...record.metrics,
        timestamp: new Date(record.metrics.timestamp)
      };
    });
  }

  /**
   * Clear all baselines for a detector (useful for testing)
   *
   * @param detectorName - Name of the detector
   */
  clearBaselines(detectorName: string): void {
    const files = this.getBaselineFiles(detectorName);

    for (const file of files) {
      try {
        fs.unlinkSync(file);
      } catch (error) {
        console.error(`Failed to delete baseline ${file}:`, error);
      }
    }
  }

  /**
   * Calculate percentage change between two values
   *
   * @param baseline - Baseline value
   * @param current - Current value
   * @returns Percentage change (positive = improvement, negative = degradation)
   */
  private calculatePercentageChange(baseline: number, current: number): number {
    if (baseline === 0) {
      return current === 0 ? 0 : 1; // 100% change if baseline was 0
    }

    return (current - baseline) / baseline;
  }

  /**
   * Determine alert severity based on metric and change
   *
   * @param metric - Metric name
   * @param percentageChange - Percentage change (negative = degradation)
   * @returns Severity level or null if no alert needed
   */
  private determineAlertSeverity(
    metric: 'precision' | 'recall' | 'f1Score',
    percentageChange: number
  ): 'warning' | 'critical' | null {
    // Only alert on degradation (negative change)
    if (percentageChange >= 0) {
      return null;
    }

    const absChange = Math.abs(percentageChange);

    switch (metric) {
      case 'precision':
        if (absChange >= this.PRECISION_CRITICAL_THRESHOLD) {
          return 'critical';
        } else if (absChange >= this.PRECISION_WARNING_THRESHOLD) {
          return 'warning';
        }
        break;

      case 'recall':
        if (absChange >= this.RECALL_CRITICAL_THRESHOLD) {
          return 'critical';
        } else if (absChange >= this.RECALL_WARNING_THRESHOLD) {
          return 'warning';
        }
        break;

      case 'f1Score':
        if (absChange >= this.F1_CRITICAL_THRESHOLD) {
          return 'critical';
        } else if (absChange >= this.F1_WARNING_THRESHOLD) {
          return 'warning';
        }
        break;
    }

    return null;
  }
}

/**
 * Singleton instance for global baseline management
 */
export const baselineManager = new BaselineManagerService();
