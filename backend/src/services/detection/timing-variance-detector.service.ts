import {
  GoogleWorkspaceEvent,
  GoogleActivityPattern
} from '@saas-xray/shared-types';

/**
 * Timing Variance Detector Service
 * Detects bot-like behavior through unnaturally consistent timing patterns
 *
 * Problem: Bots evade velocity detection by throttling (e.g., sleeping 1.1s between requests)
 * Solution: Detect low timing variance - humans are irregular, bots are metronomic
 */
export class TimingVarianceDetectorService {
  /**
   * Detect suspicious timing patterns in Google Workspace events
   *
   * Algorithm:
   * 1. Calculate intervals between consecutive events
   * 2. Compute variance = Σ(interval - mean)² / n
   * 3. Compute coefficient of variation (CV) = stdDev / mean
   * 4. Flag if CV < 0.15 (less than 15% variance = suspiciously consistent)
   */
  detectSuspiciousTimingPatterns(events: GoogleWorkspaceEvent[]): GoogleActivityPattern[] {
    const thresholds = this.getTimingThresholds();

    // Need minimum events for statistical analysis
    if (events.length < thresholds.minimumEventsForAnalysis) {
      return [];
    }

    // Sort events by timestamp
    const sortedEvents = [...events].sort((a, b) =>
      a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Group events by user for per-user analysis
    const userGroups = this.groupEventsByUser(sortedEvents);
    const patterns: GoogleActivityPattern[] = [];

    for (const [userId, userEvents] of userGroups.entries()) {
      if (userEvents.length < thresholds.minimumEventsForAnalysis) {
        continue;
      }

      // Analyze timing variance for this user
      const pattern = this.analyzeUserTimingVariance(userEvents, thresholds);
      if (pattern) {
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  /**
   * Get timing analysis thresholds
   */
  getTimingThresholds() {
    return {
      minimumEventsForAnalysis: 5,
      maxIntervalMs: 10000,  // 10 seconds - ignore longer gaps
      suspiciousCVThreshold: 0.15,  // <15% variance = bot-like
      criticalCVThreshold: 0.05     // <5% variance = definitely bot
    };
  }

  /**
   * Group events by user ID for per-user analysis
   */
  private groupEventsByUser(events: GoogleWorkspaceEvent[]): Map<string, GoogleWorkspaceEvent[]> {
    const groups = new Map<string, GoogleWorkspaceEvent[]>();

    for (const event of events) {
      const existing = groups.get(event.userId) || [];
      existing.push(event);
      groups.set(event.userId, existing);
    }

    return groups;
  }

  /**
   * Analyze timing variance for a single user's events
   */
  private analyzeUserTimingVariance(
    events: GoogleWorkspaceEvent[],
    thresholds: ReturnType<typeof this.getTimingThresholds>
  ): GoogleActivityPattern | null {
    // Calculate intervals between consecutive events
    const intervals: number[] = [];

    for (let i = 1; i < events.length; i++) {
      const prevEvent = events[i - 1];
      const currEvent = events[i];

      if (!prevEvent || !currEvent) continue;

      const intervalMs = currEvent.timestamp.getTime() - prevEvent.timestamp.getTime();

      // Only include intervals within the max window (part of same sequence)
      if (intervalMs <= thresholds.maxIntervalMs) {
        intervals.push(intervalMs);
      }
    }

    // Need enough intervals for statistical analysis
    if (intervals.length < thresholds.minimumEventsForAnalysis - 1) {
      return null;
    }

    // Calculate statistical measures
    const stats = this.calculateStatistics(intervals);

    // Calculate coefficient of variation (CV)
    // CV = stdDev / mean (normalized measure of variance)
    const cv = stats.mean > 0 ? stats.stdDev / stats.mean : 0;

    // Determine confidence based on CV thresholds
    let confidence = 0;
    let patternType: GoogleActivityPattern['patternType'] = 'regular_interval';

    if (cv < thresholds.criticalCVThreshold) {
      // <5% variance = definitely bot (95%+ confidence)
      confidence = 95 + (thresholds.criticalCVThreshold - cv) * 100;
      confidence = Math.min(100, confidence);
    } else if (cv < thresholds.suspiciousCVThreshold) {
      // 5-15% variance = bot-like (70-95% confidence)
      const range = thresholds.suspiciousCVThreshold - thresholds.criticalCVThreshold;
      const position = (thresholds.suspiciousCVThreshold - cv) / range;
      confidence = 70 + (position * 25);
    } else {
      // >15% variance = human-like behavior, no pattern
      return null;
    }

    // Weight confidence by action type (file operations more suspicious)
    confidence = this.adjustConfidenceByActionType(confidence, events);

    const firstEvent = events[0];
    if (!firstEvent) return null;

    // Create activity pattern
    return {
      patternId: `timing_variance_${firstEvent.eventId}_${Date.now()}`,
      patternType,
      detectedAt: new Date(),
      confidence: Math.round(confidence),
      metadata: {
        userId: firstEvent.userId,
        userEmail: firstEvent.userEmail,
        resourceType: this.getDominantResourceType(events),
        actionType: this.getDominantActionType(events),
        timestamp: new Date(),
        location: firstEvent.location,
        userAgent: firstEvent.userAgent
      },
      evidence: {
        description: this.generateEvidenceDescription(stats, cv, intervals.length),
        dataPoints: {
          eventCount: events.length,
          intervalCount: intervals.length,
          meanIntervalMs: Math.round(stats.mean),
          varianceMs2: Math.round(stats.variance),
          stdDevMs: Math.round(stats.stdDev),
          coefficientOfVariation: Number(cv.toFixed(4)),
          minIntervalMs: Math.round(stats.min),
          maxIntervalMs: Math.round(stats.max),
          medianIntervalMs: Math.round(stats.median)
        },
        supportingEvents: events.slice(0, 10).map(e => e.eventId)
      }
    };
  }

  /**
   * Calculate statistical measures for intervals
   */
  private calculateStatistics(intervals: number[]) {
    const n = intervals.length;
    const sum = intervals.reduce((acc, val) => acc + val, 0);
    const mean = sum / n;

    // Calculate variance: Σ(interval - mean)² / n
    const variance = intervals.reduce((acc, val) => {
      const diff = val - mean;
      return acc + (diff * diff);
    }, 0) / n;

    const stdDev = Math.sqrt(variance);

    // Calculate median
    const sorted = [...intervals].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0
      ? ((sorted[mid - 1] || 0) + (sorted[mid] || 0)) / 2
      : (sorted[mid] || 0);

    return {
      mean,
      variance,
      stdDev,
      min: Math.min(...intervals),
      max: Math.max(...intervals),
      median
    };
  }

  /**
   * Adjust confidence based on action type
   * File operations are more suspicious than reads
   */
  private adjustConfidenceByActionType(
    baseConfidence: number,
    events: GoogleWorkspaceEvent[]
  ): number {
    const actionTypeWeights: Record<string, number> = {
      'file_create': 1.2,      // Creating files - highly suspicious
      'file_edit': 1.15,       // Editing files - suspicious
      'file_share': 1.15,      // Sharing files - suspicious
      'permission_change': 1.25, // Permission changes - very suspicious
      'email_send': 1.1,       // Sending emails - moderately suspicious
      'script_execution': 1.3  // Script execution - extremely suspicious
    };

    // Calculate weighted average based on event types
    const typeCount: Record<string, number> = {};
    for (const event of events) {
      typeCount[event.eventType] = (typeCount[event.eventType] || 0) + 1;
    }

    let totalWeight = 0;
    let weightCount = 0;

    for (const [type, count] of Object.entries(typeCount)) {
      const weight = actionTypeWeights[type] || 1.0;
      totalWeight += weight * count;
      weightCount += count;
    }

    const avgWeight = weightCount > 0 ? totalWeight / weightCount : 1.0;
    const adjustedConfidence = baseConfidence * avgWeight;

    return Math.min(100, adjustedConfidence);
  }

  /**
   * Get the dominant resource type from events
   */
  private getDominantResourceType(events: GoogleWorkspaceEvent[]): GoogleActivityPattern['metadata']['resourceType'] {
    const counts: Record<string, number> = {};

    for (const event of events) {
      counts[event.resourceType] = (counts[event.resourceType] || 0) + 1;
    }

    const dominant = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)[0];

    return (dominant?.[0] || 'file') as GoogleActivityPattern['metadata']['resourceType'];
  }

  /**
   * Get the dominant action type from events
   */
  private getDominantActionType(events: GoogleWorkspaceEvent[]): string {
    const counts: Record<string, number> = {};

    for (const event of events) {
      counts[event.eventType] = (counts[event.eventType] || 0) + 1;
    }

    const dominant = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)[0];

    return dominant?.[0] || 'unknown';
  }

  /**
   * Generate human-readable evidence description
   */
  private generateEvidenceDescription(
    stats: ReturnType<typeof this.calculateStatistics>,
    cv: number,
    intervalCount: number
  ): string {
    const cvPercent = (cv * 100).toFixed(1);
    const meanSeconds = (stats.mean / 1000).toFixed(2);
    const stdDevSeconds = (stats.stdDev / 1000).toFixed(2);

    if (cv < 0.05) {
      return `Detected metronomic timing pattern with ${intervalCount} intervals. ` +
             `Mean interval: ${meanSeconds}s, Standard deviation: ${stdDevSeconds}s, ` +
             `Coefficient of variation: ${cvPercent}%. This level of consistency (CV < 5%) ` +
             `is characteristic of automated/scripted behavior. Humans typically exhibit ` +
             `25-50% variance in timing.`;
    } else if (cv < 0.15) {
      return `Detected suspiciously consistent timing pattern with ${intervalCount} intervals. ` +
             `Mean interval: ${meanSeconds}s, Standard deviation: ${stdDevSeconds}s, ` +
             `Coefficient of variation: ${cvPercent}%. This low variance (CV < 15%) ` +
             `suggests possible automation. Human behavior typically shows higher variance.`;
    } else {
      return `Timing pattern shows human-like variance (CV: ${cvPercent}%).`;
    }
  }
}

// Singleton export following project pattern
export const timingVarianceDetector = new TimingVarianceDetectorService();
