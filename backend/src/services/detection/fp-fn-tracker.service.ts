/**
 * False Positive / False Negative Tracker Service
 *
 * Tracks and analyzes misclassifications in detection algorithms.
 * Provides detailed breakdowns by detector, platform, and attack type.
 */

import {
  DetectionResult,
  GroundTruthLabel
} from './detection-metrics.service';

export interface FalsePositive {
  automationId: string;
  detectorName: string;
  predictedMalicious: true;
  actualLegitimate: true;
  confidence: number;
  timestamp: Date;
  automationDetails: {
    platform: string;
    type: string;
    features: Record<string, any>;
  };
  analysis: string;
}

export interface FalseNegative {
  automationId: string;
  detectorName: string;
  predictedLegitimate: true;
  actualMalicious: true;
  confidence: number;
  timestamp: Date;
  automationDetails: {
    platform: string;
    type: string;
    features: Record<string, any>;
    attackType?: string;
  };
  analysis: string;
}

export interface DetectorStats {
  fpCount: number;
  fnCount: number;
  totalErrors: number;
  fpRate: number;
  fnRate: number;
}

export interface PlatformStats {
  fpCount: number;
  fnCount: number;
  totalErrors: number;
  fpRate: number;
  fnRate: number;
}

export interface FPFNReport {
  falsePositives: FalsePositive[];
  falseNegatives: FalseNegative[];
  stats: {
    totalFP: number;
    totalFN: number;
    totalTP: number;
    totalTN: number;
    fpRate: number; // FP / (FP + TN)
    fnRate: number; // FN / (FN + TP)
    byDetector: Map<string, DetectorStats>;
    byPlatform: Map<string, PlatformStats>;
    byAttackType: Map<string, { fpCount: number; fnCount: number }>;
  };
  recommendations: string[];
}

/**
 * Service for tracking and analyzing false positives and false negatives
 */
export class FPFNTrackerService {
  /**
   * Validate inputs
   */
  private validateInputs(
    predictions: DetectionResult[],
    groundTruth: GroundTruthLabel[],
    automationDetails: Map<string, any>
  ): void {
    if (!Array.isArray(predictions)) {
      throw new Error('Predictions must be an array');
    }
    if (!Array.isArray(groundTruth)) {
      throw new Error('Ground truth must be an array');
    }
    if (!(automationDetails instanceof Map)) {
      throw new Error('Automation details must be a Map');
    }
  }

  /**
   * Create ground truth lookup map
   */
  private createGroundTruthMap(groundTruth: GroundTruthLabel[]): Map<string, GroundTruthLabel> {
    const map = new Map<string, GroundTruthLabel>();
    for (const label of groundTruth) {
      map.set(label.automationId, label);
    }
    return map;
  }

  /**
   * Generate analysis for why a false positive occurred
   */
  private analyzeFalsePositive(
    prediction: DetectionResult,
    truth: GroundTruthLabel,
    details: any
  ): string {
    const analyses: string[] = [];

    // Check for common false positive patterns
    if (details.features?.hasAIProvider === false && prediction.confidence > 0.7) {
      analyses.push('High confidence despite no AI provider detected');
    }

    if (details.features?.velocityScore && details.features.velocityScore < 0.4) {
      analyses.push(`Low velocity score (${details.features.velocityScore}) should reduce suspicion`);
    }

    if (details.features?.offHoursActivity === false && prediction.predicted === 'malicious') {
      analyses.push('Normal business hours activity pattern flagged incorrectly');
    }

    if (details.features?.batchOperations === true && !details.features?.dataVolumeAnomalous) {
      analyses.push('Batch operations without anomalous data volume may be legitimate automation');
    }

    if (prediction.detectorName.includes('velocity') && details.features?.velocityScore < 0.35) {
      analyses.push('Velocity detector over-sensitive to normal activity patterns');
    }

    if (prediction.detectorName.includes('ai-provider') && details.features?.hasAIProvider === false) {
      analyses.push('AI provider detector triggered despite no AI integration detected');
    }

    // Generic analysis if no specific pattern found
    if (analyses.length === 0) {
      analyses.push(
        `${prediction.detectorName} flagged legitimate ${details.platform} automation (confidence: ${prediction.confidence}). ` +
        `Rationale: ${truth.rationale}`
      );
    }

    return analyses.join('; ');
  }

  /**
   * Generate analysis for why a false negative occurred
   */
  private analyzeFalseNegative(
    prediction: DetectionResult | null,
    truth: GroundTruthLabel,
    details: any
  ): string {
    const analyses: string[] = [];
    const attackType = details.attackType || 'unknown';

    // If no prediction at all
    if (!prediction) {
      analyses.push(`Critical miss: ${attackType} attack not detected by any detector`);

      if (details.features?.hasAIProvider) {
        analyses.push(`AI provider (${details.features.aiProvider}) integration went undetected`);
      }

      if (details.features?.dataVolumeAnomalous) {
        analyses.push('Anomalous data volume pattern missed');
      }

      if (details.features?.permissionEscalation) {
        analyses.push('Permission escalation pattern not flagged');
      }

      return analyses.join('; ');
    }

    // Prediction existed but was wrong
    if (prediction.confidence < 0.5) {
      analyses.push(`Low confidence (${prediction.confidence}) for ${attackType} attack`);
    }

    if (details.features?.velocityScore > 0.7 && prediction.predicted === 'legitimate') {
      analyses.push(`High velocity score (${details.features.velocityScore}) not weighted enough`);
    }

    if (details.features?.hasAIProvider && prediction.detectorName.includes('ai-provider')) {
      analyses.push('AI provider detector failed to flag AI integration');
    }

    if (details.features?.permissionEscalation && !prediction.detectorName.includes('permission')) {
      analyses.push('Permission escalation detector not triggered');
    }

    if (details.features?.dataVolumeAnomalous && !prediction.detectorName.includes('data-volume')) {
      analyses.push('Data volume detector missed anomalous pattern');
    }

    if (details.features?.timingVariance && details.features.timingVariance > 0.75) {
      analyses.push('Rate limit evasion pattern (timing variance) not detected');
    }

    // Attack type specific analysis
    if (attackType === 'data_exfiltration' && details.features?.offHoursActivity) {
      analyses.push('Off-hours data exfiltration pattern missed');
    }

    if (attackType === 'privilege_escalation' && details.features?.permissionEscalation) {
      analyses.push('Privilege escalation indicators not sufficient for detection');
    }

    if (attackType === 'rate_limit_evasion' && details.features?.timingVariance) {
      analyses.push('Timing variance pattern not recognized as evasion tactic');
    }

    if (attackType === 'ai_abuse' && details.features?.hasAIProvider) {
      analyses.push('AI abuse pattern with confirmed AI integration not flagged');
    }

    // Generic analysis if no specific pattern found
    if (analyses.length === 0) {
      analyses.push(
        `${prediction.detectorName} failed to detect ${attackType} attack on ${details.platform}. ` +
        `Rationale: ${truth.rationale}`
      );
    }

    return analyses.join('; ');
  }

  /**
   * Calculate confusion matrix components
   */
  private calculateConfusionMatrix(
    predictions: DetectionResult[],
    groundTruth: GroundTruthLabel[]
  ): { tp: number; tn: number; fp: number; fn: number } {
    const groundTruthMap = this.createGroundTruthMap(groundTruth);
    const seenIds = new Set<string>();

    let tp = 0; // True Positives
    let tn = 0; // True Negatives
    let fp = 0; // False Positives
    let fn = 0; // False Negatives

    // Process predictions
    for (const prediction of predictions) {
      const truth = groundTruthMap.get(prediction.automationId);
      if (!truth) continue;

      seenIds.add(prediction.automationId);

      const predictedMalicious = prediction.predicted === 'malicious';
      const actualMalicious = truth.actual === 'malicious';

      if (predictedMalicious && actualMalicious) {
        tp++;
      } else if (!predictedMalicious && !actualMalicious) {
        tn++;
      } else if (predictedMalicious && !actualMalicious) {
        fp++;
      } else if (!predictedMalicious && actualMalicious) {
        fn++;
      }
    }

    // Count false negatives for unpredicted malicious items
    for (const truth of groundTruth) {
      if (!seenIds.has(truth.automationId) && truth.actual === 'malicious') {
        fn++;
      }
    }

    return { tp, tn, fp, fn };
  }

  /**
   * Track false positives and false negatives with detailed analysis
   */
  track(
    predictions: DetectionResult[],
    groundTruth: GroundTruthLabel[],
    automationDetails: Map<string, any>
  ): FPFNReport {
    this.validateInputs(predictions, groundTruth, automationDetails);

    const groundTruthMap = this.createGroundTruthMap(groundTruth);
    const predictionMap = new Map<string, DetectionResult>();

    // Create prediction lookup map
    for (const prediction of predictions) {
      predictionMap.set(prediction.automationId, prediction);
    }

    const falsePositives: FalsePositive[] = [];
    const falseNegatives: FalseNegative[] = [];
    const seenIds = new Set<string>();

    // Track by detector
    const byDetector = new Map<string, { fps: number; fns: number; tps: number; tns: number }>();

    // Track by platform
    const byPlatform = new Map<string, { fps: number; fns: number; tps: number; tns: number }>();

    // Track by attack type
    const byAttackType = new Map<string, { fpCount: number; fnCount: number }>();

    // Initialize stats tracking helper
    const initStats = () => ({ fps: 0, fns: 0, tps: 0, tns: 0 });

    // Process predictions to find false positives
    for (const prediction of predictions) {
      const truth = groundTruthMap.get(prediction.automationId);
      if (!truth) continue;

      seenIds.add(prediction.automationId);

      const details = automationDetails.get(prediction.automationId) || {
        platform: 'unknown',
        type: 'unknown',
        features: {}
      };

      // Initialize detector stats
      if (!byDetector.has(prediction.detectorName)) {
        byDetector.set(prediction.detectorName, initStats());
      }

      // Initialize platform stats
      if (!byPlatform.has(details.platform)) {
        byPlatform.set(details.platform, initStats());
      }

      const detectorStats = byDetector.get(prediction.detectorName)!;
      const platformStats = byPlatform.get(details.platform)!;

      const predictedMalicious = prediction.predicted === 'malicious';
      const actualMalicious = truth.actual === 'malicious';

      if (predictedMalicious && !actualMalicious) {
        // False Positive
        falsePositives.push({
          automationId: prediction.automationId,
          detectorName: prediction.detectorName,
          predictedMalicious: true,
          actualLegitimate: true,
          confidence: prediction.confidence,
          timestamp: prediction.timestamp,
          automationDetails: {
            platform: details.platform,
            type: details.type || 'unknown',
            features: details.features || {}
          },
          analysis: this.analyzeFalsePositive(prediction, truth, details)
        });

        detectorStats.fps++;
        platformStats.fps++;
      } else if (!predictedMalicious && actualMalicious) {
        // False Negative
        const attackType = details.attackType || 'unknown';

        falseNegatives.push({
          automationId: prediction.automationId,
          detectorName: prediction.detectorName,
          predictedLegitimate: true,
          actualMalicious: true,
          confidence: prediction.confidence,
          timestamp: prediction.timestamp,
          automationDetails: {
            platform: details.platform,
            type: details.type || 'unknown',
            features: details.features || {},
            attackType
          },
          analysis: this.analyzeFalseNegative(prediction, truth, details)
        });

        detectorStats.fns++;
        platformStats.fns++;

        // Track by attack type
        if (!byAttackType.has(attackType)) {
          byAttackType.set(attackType, { fpCount: 0, fnCount: 0 });
        }
        byAttackType.get(attackType)!.fnCount++;
      } else if (predictedMalicious && actualMalicious) {
        detectorStats.tps++;
        platformStats.tps++;
      } else {
        detectorStats.tns++;
        platformStats.tns++;
      }
    }

    // Process unpredicted malicious items (missed detections)
    for (const truth of groundTruth) {
      if (seenIds.has(truth.automationId)) continue;
      if (truth.actual !== 'malicious') continue;

      const details = automationDetails.get(truth.automationId) || {
        platform: 'unknown',
        type: 'unknown',
        features: {},
        attackType: 'unknown'
      };

      const attackType = details.attackType || 'unknown';

      falseNegatives.push({
        automationId: truth.automationId,
        detectorName: 'none',
        predictedLegitimate: true,
        actualMalicious: true,
        confidence: 0,
        timestamp: new Date(),
        automationDetails: {
          platform: details.platform,
          type: details.type || 'unknown',
          features: details.features || {},
          attackType
        },
        analysis: this.analyzeFalseNegative(null, truth, details)
      });

      // Track by attack type
      if (!byAttackType.has(attackType)) {
        byAttackType.set(attackType, { fpCount: 0, fnCount: 0 });
      }
      byAttackType.get(attackType)!.fnCount++;
    }

    // Calculate overall confusion matrix
    const { tp, tn, fp, fn } = this.calculateConfusionMatrix(predictions, groundTruth);

    // Calculate rates
    const fpRate = fp + tn > 0 ? fp / (fp + tn) : 0;
    const fnRate = fn + tp > 0 ? fn / (fn + tp) : 0;

    // Build detector stats map
    const detectorStatsMap = new Map<string, DetectorStats>();
    for (const [detector, stats] of Array.from(byDetector.entries())) {
      const detectorFpRate = stats.fps + stats.tns > 0 ? stats.fps / (stats.fps + stats.tns) : 0;
      const detectorFnRate = stats.fns + stats.tps > 0 ? stats.fns / (stats.fns + stats.tps) : 0;

      detectorStatsMap.set(detector, {
        fpCount: stats.fps,
        fnCount: stats.fns,
        totalErrors: stats.fps + stats.fns,
        fpRate: detectorFpRate,
        fnRate: detectorFnRate
      });
    }

    // Build platform stats map
    const platformStatsMap = new Map<string, PlatformStats>();
    for (const [platform, stats] of Array.from(byPlatform.entries())) {
      const platformFpRate = stats.fps + stats.tns > 0 ? stats.fps / (stats.fps + stats.tns) : 0;
      const platformFnRate = stats.fns + stats.tps > 0 ? stats.fns / (stats.fns + stats.tps) : 0;

      platformStatsMap.set(platform, {
        fpCount: stats.fps,
        fnCount: stats.fns,
        totalErrors: stats.fps + stats.fns,
        fpRate: platformFpRate,
        fnRate: platformFnRate
      });
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      detectorStatsMap,
      platformStatsMap,
      byAttackType,
      falsePositives,
      falseNegatives
    );

    return {
      falsePositives,
      falseNegatives,
      stats: {
        totalFP: fp,
        totalFN: fn,
        totalTP: tp,
        totalTN: tn,
        fpRate,
        fnRate,
        byDetector: detectorStatsMap,
        byPlatform: platformStatsMap,
        byAttackType
      },
      recommendations
    };
  }

  /**
   * Generate actionable recommendations based on FP/FN analysis
   */
  private generateRecommendations(
    byDetector: Map<string, DetectorStats>,
    byPlatform: Map<string, PlatformStats>,
    byAttackType: Map<string, { fpCount: number; fnCount: number }>,
    falsePositives: FalsePositive[],
    falseNegatives: FalseNegative[]
  ): string[] {
    const recommendations: string[] = [];

    // Detector-specific recommendations
    for (const [detector, stats] of Array.from(byDetector.entries())) {
      if (stats.fpRate > 0.2) {
        recommendations.push(
          `CRITICAL: ${detector} has high false positive rate (${(stats.fpRate * 100).toFixed(1)}%). ` +
          `Consider tuning confidence thresholds or feature weights.`
        );
      }

      if (stats.fnRate > 0.15) {
        recommendations.push(
          `CRITICAL: ${detector} has high false negative rate (${(stats.fnRate * 100).toFixed(1)}%). ` +
          `This is a security risk - review detection logic and feature extraction.`
        );
      }

      if (stats.totalErrors > 10) {
        recommendations.push(
          `${detector} has ${stats.totalErrors} total misclassifications. ` +
          `This detector needs comprehensive review and retraining.`
        );
      }
    }

    // Platform-specific recommendations
    for (const [platform, stats] of Array.from(byPlatform.entries())) {
      if (stats.fpRate > 0.2) {
        recommendations.push(
          `${platform} platform has high false positive rate (${(stats.fpRate * 100).toFixed(1)}%). ` +
          `Review platform-specific feature extraction and normalization.`
        );
      }

      if (stats.fnRate > 0.15) {
        recommendations.push(
          `SECURITY RISK: ${platform} platform has high false negative rate (${(stats.fnRate * 100).toFixed(1)}%). ` +
          `Consider adding platform-specific detectors or improving audit log parsing.`
        );
      }
    }

    // Attack type recommendations
    for (const [attackType, stats] of Array.from(byAttackType.entries())) {
      if (stats.fnCount > 5) {
        recommendations.push(
          `CRITICAL: ${stats.fnCount} missed ${attackType} attacks. ` +
          `Create specialized detector or improve feature weights for this attack pattern.`
        );
      }
    }

    // High-confidence false positives
    const highConfidenceFPs = falsePositives.filter(fp => fp.confidence > 0.85);
    if (highConfidenceFPs.length > 3) {
      recommendations.push(
        `${highConfidenceFPs.length} high-confidence false positives detected. ` +
        `Review confidence calibration and add validation layer before alerting.`
      );
    }

    // Low-confidence true threats (missed)
    const lowConfidenceMisses = falseNegatives.filter(fn => fn.confidence < 0.3 && fn.confidence > 0);
    if (lowConfidenceMisses.length > 5) {
      recommendations.push(
        `${lowConfidenceMisses.length} threats detected but with low confidence. ` +
        `Consider lowering confidence threshold or improving feature representation.`
      );
    }

    // Complete misses (no prediction at all)
    const completeMisses = falseNegatives.filter(fn => fn.detectorName === 'none');
    if (completeMisses.length > 0) {
      recommendations.push(
        `CRITICAL: ${completeMisses.length} threats completely missed by all detectors. ` +
        `Urgent review required - possible blind spot in detection coverage.`
      );
    }

    // AI provider false negatives
    const aiProviderMisses = falseNegatives.filter(
      fn => fn.automationDetails.features.hasAIProvider === true
    );
    if (aiProviderMisses.length > 3) {
      recommendations.push(
        `AI provider detector missing ${aiProviderMisses.length} AI-integrated threats. ` +
        `Review AI provider detection patterns and update signature database.`
      );
    }

    return recommendations;
  }

  /**
   * Generate human-readable markdown report
   */
  generateReport(report: FPFNReport): string {
    const lines: string[] = [];

    lines.push('# False Positive / False Negative Analysis Report');
    lines.push('');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');

    // Summary statistics
    lines.push('## Summary Statistics');
    lines.push('');
    lines.push(`- **Total False Positives**: ${report.stats.totalFP}`);
    lines.push(`- **Total False Negatives**: ${report.stats.totalFN}`);
    lines.push(`- **False Positive Rate**: ${(report.stats.fpRate * 100).toFixed(2)}%`);
    lines.push(`- **False Negative Rate**: ${(report.stats.fnRate * 100).toFixed(2)}%`);
    lines.push(`- **True Positives**: ${report.stats.totalTP}`);
    lines.push(`- **True Negatives**: ${report.stats.totalTN}`);
    lines.push('');

    // Top false positives
    if (report.falsePositives.length > 0) {
      lines.push('## Top 5 False Positives (Highest Confidence)');
      lines.push('');

      const topFPs = [...report.falsePositives]
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5);

      for (const fp of topFPs) {
        lines.push(`### ${fp.automationId}`);
        lines.push(`- **Platform**: ${fp.automationDetails.platform}`);
        lines.push(`- **Detector**: ${fp.detectorName}`);
        lines.push(`- **Confidence**: ${(fp.confidence * 100).toFixed(1)}%`);
        lines.push(`- **Analysis**: ${fp.analysis}`);
        lines.push('');
      }
    }

    // Top false negatives
    if (report.falseNegatives.length > 0) {
      lines.push('## Top 5 False Negatives (Most Dangerous Misses)');
      lines.push('');

      // Sort by attack severity (data exfiltration > privilege escalation > others)
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
        .slice(0, 5);

      for (const fn of topFNs) {
        lines.push(`### ${fn.automationId}`);
        lines.push(`- **Platform**: ${fn.automationDetails.platform}`);
        lines.push(`- **Attack Type**: ${fn.automationDetails.attackType || 'unknown'}`);
        lines.push(`- **Detector**: ${fn.detectorName}`);
        lines.push(`- **Confidence**: ${(fn.confidence * 100).toFixed(1)}%`);
        lines.push(`- **Analysis**: ${fn.analysis}`);
        lines.push('');
      }
    }

    // Breakdown by detector
    lines.push('## Breakdown by Detector');
    lines.push('');
    lines.push('| Detector | FP Count | FN Count | FP Rate | FN Rate | Total Errors |');
    lines.push('|----------|----------|----------|---------|---------|--------------|');

    for (const [detector, stats] of Array.from(report.stats.byDetector.entries())) {
      lines.push(
        `| ${detector} | ${stats.fpCount} | ${stats.fnCount} | ` +
        `${(stats.fpRate * 100).toFixed(1)}% | ${(stats.fnRate * 100).toFixed(1)}% | ${stats.totalErrors} |`
      );
    }
    lines.push('');

    // Breakdown by platform
    lines.push('## Breakdown by Platform');
    lines.push('');
    lines.push('| Platform | FP Count | FN Count | FP Rate | FN Rate | Total Errors |');
    lines.push('|----------|----------|----------|---------|---------|--------------|');

    for (const [platform, stats] of Array.from(report.stats.byPlatform.entries())) {
      lines.push(
        `| ${platform} | ${stats.fpCount} | ${stats.fnCount} | ` +
        `${(stats.fpRate * 100).toFixed(1)}% | ${(stats.fnRate * 100).toFixed(1)}% | ${stats.totalErrors} |`
      );
    }
    lines.push('');

    // Breakdown by attack type
    if (report.stats.byAttackType.size > 0) {
      lines.push('## Breakdown by Attack Type');
      lines.push('');
      lines.push('| Attack Type | FP Count | FN Count | Total |');
      lines.push('|-------------|----------|----------|-------|');

      for (const [attackType, stats] of Array.from(report.stats.byAttackType.entries())) {
        lines.push(
          `| ${attackType} | ${stats.fpCount} | ${stats.fnCount} | ${stats.fpCount + stats.fnCount} |`
        );
      }
      lines.push('');
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      lines.push('## Recommendations for Improvement');
      lines.push('');

      for (let i = 0; i < report.recommendations.length; i++) {
        lines.push(`${i + 1}. ${report.recommendations[i]}`);
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Export to JSON for downstream analysis
   */
  exportToJSON(report: FPFNReport): string {
    // Convert Maps to objects for JSON serialization
    const exportData = {
      falsePositives: report.falsePositives,
      falseNegatives: report.falseNegatives,
      stats: {
        totalFP: report.stats.totalFP,
        totalFN: report.stats.totalFN,
        totalTP: report.stats.totalTP,
        totalTN: report.stats.totalTN,
        fpRate: report.stats.fpRate,
        fnRate: report.stats.fnRate,
        byDetector: Array.from(report.stats.byDetector.entries()).map(([name, stats]) => ({
          detector: name,
          ...stats
        })),
        byPlatform: Array.from(report.stats.byPlatform.entries()).map(([name, stats]) => ({
          platform: name,
          ...stats
        })),
        byAttackType: Array.from(report.stats.byAttackType.entries()).map(([type, stats]) => ({
          attackType: type,
          ...stats
        }))
      },
      recommendations: report.recommendations
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Get detailed analysis for specific automation
   */
  getAutomationAnalysis(
    automationId: string,
    report: FPFNReport
  ): { type: 'fp' | 'fn' | 'none'; details: FalsePositive | FalseNegative | null } {
    // Check false positives
    const fp = report.falsePositives.find(item => item.automationId === automationId);
    if (fp) {
      return { type: 'fp', details: fp };
    }

    // Check false negatives
    const fn = report.falseNegatives.find(item => item.automationId === automationId);
    if (fn) {
      return { type: 'fn', details: fn };
    }

    return { type: 'none', details: null };
  }
}

/**
 * Singleton instance for global FP/FN tracking
 */
export const fpfnTracker = new FPFNTrackerService();
