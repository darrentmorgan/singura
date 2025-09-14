import {
  BatchOperationDetector,
  GoogleWorkspaceEvent,
  GoogleActivityPattern,
  BatchOperationGroup,
  FrequencyPattern
} from '@saas-xray/shared-types';

export class BatchOperationDetectorService implements BatchOperationDetector {
  detectBatchOperations(events: GoogleWorkspaceEvent[]): GoogleActivityPattern[] {
    const batchGroups = this.identifySimilarActions(events);
    const frequencyPatterns = this.analyzeBatchOperationFrequency(batchGroups);

    return batchGroups
      .filter(group =>
        this.calculateBatchLikelihood(group) > 0.7 &&  // High confidence batch
        this.hasSuspiciousFrequencyPattern(frequencyPatterns, group)
      )
      .map(group => this.convertBatchGroupToActivityPattern(group, frequencyPatterns));
  }

  identifySimilarActions(events: GoogleWorkspaceEvent[]): BatchOperationGroup[] {
    const thresholds = this.getBatchThresholds();
    const sortedEvents = events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const batchGroups: BatchOperationGroup[] = [];

    for (let i = 0; i < sortedEvents.length; i++) {
      const currentEvent = sortedEvents[i];
      if (!currentEvent) continue;

      const similarEvents = [currentEvent];

      for (let j = i + 1; j < sortedEvents.length; j++) {
        const candidateEvent = sortedEvents[j];
        if (!candidateEvent) continue;

        // Expanded time window constraint
        if (candidateEvent.timestamp.getTime() - currentEvent.timestamp.getTime() > thresholds.maxTimeWindowMs) {
          break;
        }

        // Enhanced similarity check
        if (this.areEventsSimilar(currentEvent, candidateEvent)) {
          similarEvents.push(candidateEvent);
        }
      }

      // Adjust threshold based on event complexity
      const complexityThreshold = this.calculateComplexityThreshold(similarEvents);
      if (similarEvents.length >= complexityThreshold) {
        const batchGroup = this.createBatchGroup(similarEvents);
        batchGroups.push(batchGroup);
      }
    }

    return batchGroups;
  }

  private calculateComplexityThreshold(events: GoogleWorkspaceEvent[]): number {
    const thresholds = this.getBatchThresholds();

    // Dynamic complexity threshold based on event types
    const eventTypeComplexity: Record<string, number> = {
      'file_create': 3,
      'permission_change': 4,
      'script_execution': 2,
      'default': 1
    };

    const baseEvents = thresholds.minimumSimilarActions;
    const complexityMultiplier = events.reduce((sum, event) => {
      const complexity = eventTypeComplexity[event.eventType] || eventTypeComplexity['default'];
      return sum + complexity;
    }, 0) / events.length;

    return Math.ceil(baseEvents * complexityMultiplier);
  }

  private areEventsSimilar(event1: GoogleWorkspaceEvent, event2: GoogleWorkspaceEvent): boolean {
    const thresholds = this.getBatchThresholds();

    const similarityChecks = {
      actionType: event1.eventType === event2.eventType,
      resourceType: event1.resourceType === event2.resourceType,
      namingPattern: this.checkNamingPattern(event1, event2),
      permissions: this.checkPermissionSimilarity(event1, event2),
      timing: this.checkTimingInterval(event1, event2),
      // New advanced checks
      location: event1.location === event2.location,
      userAgent: event1.userAgent === event2.userAgent
    };

    // Calculate overall similarity score with weighted checks
    const similarityScores = {
      actionType: 0.4,
      resourceType: 0.3,
      namingPattern: 0.1,
      permissions: 0.1,
      timing: 0.05,
      location: 0.025,
      userAgent: 0.025
    };

    const similarityScore = Object.entries(similarityChecks)
      .reduce((score, [key, value]) => score + (value ? similarityScores[key as keyof typeof similarityScores] : 0), 0);

    return similarityScore >= thresholds.similarityThreshold;
  }

  private checkNamingPattern(event1: GoogleWorkspaceEvent, event2: GoogleWorkspaceEvent): boolean {
    const name1 = event1.actionDetails.resourceName;
    const name2 = event2.actionDetails.resourceName;

    // Advanced pattern detection
    const numberExtractRegex = /^(.*?)(\d+)$/;
    const match1 = name1.match(numberExtractRegex);
    const match2 = name2.match(numberExtractRegex);

    if (match1 && match2) {
      return (
        match1[1] === match2[1] &&  // Same base name
        Math.abs(Number(match1[2]) - Number(match2[2])) === 1  // Consecutive numbers
      );
    }

    // Check for UUID or timestamp-like patterns
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const timestampRegex = /^\d{13}$/;  // Unix timestamp in milliseconds

    const isUUID1 = uuidRegex.test(name1);
    const isUUID2 = uuidRegex.test(name2);
    const isTimestamp1 = timestampRegex.test(name1);
    const isTimestamp2 = timestampRegex.test(name2);

    return (isUUID1 && isUUID2) || (isTimestamp1 && isTimestamp2);
  }

  private checkPermissionSimilarity(event1: GoogleWorkspaceEvent, event2: GoogleWorkspaceEvent): boolean {
    // Advanced permission similarity check
    const metadata1 = event1.actionDetails.additionalMetadata;
    const metadata2 = event2.actionDetails.additionalMetadata;

    const permissionKeys = ['role', 'type', 'scope', 'domain'];
    return permissionKeys.every(key =>
      metadata1[key] === metadata2[key]
    );
  }

  private checkTimingInterval(event1: GoogleWorkspaceEvent, event2: GoogleWorkspaceEvent): boolean {
    const timeDiff = Math.abs(event1.timestamp.getTime() - event2.timestamp.getTime());
    const intervalThresholdMs = 5000; // 5 seconds
    return timeDiff <= intervalThresholdMs;
  }

  calculateBatchLikelihood(group: BatchOperationGroup): number {
    const similarityScore = Object.values(group.similarity)
      .filter(Boolean).length / Object.keys(group.similarity).length;

    // More sophisticated timing score
    const timingScore = group.events.length > 1
      ? 1 - (group.timeWindow.totalDurationMs / (1000 * 60 * 60)) // Shorter duration = higher score
      : 0;

    // Add complexity factor
    const complexityFactor = this.calculateComplexityFactor(group);

    return Math.min(similarityScore * timingScore * complexityFactor * 1.2, 1);
  }

  private calculateComplexityFactor(group: BatchOperationGroup): number {
    const eventTypeComplexity: Record<string, number> = {
      'file_create': 1.2,
      'permission_change': 1.5,
      'script_execution': 1.3,
      'default': 1
    };

    const complexityScores = group.events.map(
      event => eventTypeComplexity[event.eventType] || eventTypeComplexity['default']
    );

    const averageComplexity = complexityScores.reduce((a, b) => a + b, 0) / complexityScores.length;
    return Math.min(averageComplexity, 1.5);
  }

  analyzeBatchOperationFrequency(groups: BatchOperationGroup[]): FrequencyPattern[] {
    return groups.map(group => {
      const timestamps = group.events.map(e => e.timestamp.getTime());
      const intervals = timestamps
        .slice(1)
        .map((ts, i) => ts - timestamps[i]);

      const averageInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const standardDeviation = Math.sqrt(
        intervals.reduce((a, b) => a + Math.pow(b - averageInterval, 2), 0) / intervals.length
      );

      return {
        patternId: group.groupId,
        intervalType: this.determineIntervalType(intervals),
        detectedInterval: {
          value: Math.round(averageInterval / 1000),
          unit: 'seconds'
        },
        regularity: {
          standardDeviation,
          variance: Math.pow(standardDeviation, 2),
          perfectRegularity: standardDeviation < 100 // Very low standard deviation
        },
        occurrences: {
          total: intervals.length + 1,
          withinThreshold: intervals.filter(
            i => Math.abs(i - averageInterval) / averageInterval < 0.1
          ).length,
          percentageRegular: 0
        },
        humanLikelihood: 0,
        automationConfidence: 0
      };
    });
  }

  private determineIntervalType(intervals: number[]): FrequencyPattern['intervalType'] {
    const threshold = 0.1; // 10% variation
    const averageInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    const isApproximatelyRegular = intervals.every(
      interval => Math.abs(interval - averageInterval) / averageInterval < threshold
    );

    return isApproximatelyRegular ? 'approximate' : 'irregular';
  }

  hasSuspiciousFrequencyPattern(
    frequencyPatterns: FrequencyPattern[],
    group: BatchOperationGroup
  ): boolean {
    const frequencyPattern = frequencyPatterns.find(p => p.patternId === group.groupId);

    if (!frequencyPattern) return false;

    // Criteria for suspicious frequency
    const suspiciousCriteria =
      frequencyPattern.regularity.perfectRegularity ||  // Too perfect timing
      frequencyPattern.detectedInterval.value < 2;      // Ultra-rapid events

    return suspiciousCriteria;
  }

  private createBatchGroup(events: GoogleWorkspaceEvent[]): BatchOperationGroup {
    if (events.length === 0) {
      throw new Error('Cannot create batch group from empty events array');
    }

    const firstEvent = events[0]!;
    const lastEvent = events[events.length - 1]!;

    const similarityChecks = {
      actionType: events.every(e => e.eventType === firstEvent.eventType),
      resourceType: events.every(e => e.resourceType === firstEvent.resourceType),
      namingPattern: this.checkNamingPattern(firstEvent, lastEvent),
      permissions: events.every(e =>
        this.checkPermissionSimilarity(firstEvent, e)
      ),
      timing: events.every((e, i) =>
        i === 0 || this.checkTimingInterval(events[i-1]!, e)
      )
    };

    return {
      groupId: `batch_${firstEvent.eventId}_${Date.now()}`,
      events,
      similarity: similarityChecks,
      timeWindow: {
        startTime: firstEvent.timestamp,
        endTime: lastEvent.timestamp,
        totalDurationMs: lastEvent.timestamp.getTime() - firstEvent.timestamp.getTime()
      },
      automationConfidence: this.calculateBatchLikelihood({
        groupId: '',
        events,
        similarity: similarityChecks,
        timeWindow: {
          startTime: firstEvent.timestamp,
          endTime: lastEvent.timestamp,
          totalDurationMs: lastEvent.timestamp.getTime() - firstEvent.timestamp.getTime()
        },
        automationConfidence: 0,
        riskLevel: 'low'
      }) * 100,
      riskLevel: this.determineBatchRiskLevel(events.length)
    };
  }

  getBatchThresholds() {
    return {
      minimumSimilarActions: 3,    // Minimum actions to consider a batch
      maxTimeWindowMs: 30000,       // 30 seconds max time window
      similarityThreshold: 0.7      // 70% similarity needed
    };
  }

  private determineBatchRiskLevel(eventCount: number): BatchOperationGroup['riskLevel'] {
    if (eventCount <= 3) return 'low';
    if (eventCount <= 10) return 'medium';
    if (eventCount <= 20) return 'high';
    return 'critical';
  }

  private convertBatchGroupToActivityPattern(
    group: BatchOperationGroup,
    frequencyPatterns: FrequencyPattern[]
  ): GoogleActivityPattern {
    if (group.events.length === 0) {
      throw new Error('Cannot convert empty batch group to activity pattern');
    }

    const representativeEvent = group.events[0]!;
    const frequencyPattern = frequencyPatterns.find(p => p.patternId === group.groupId);

    return {
      patternId: group.groupId,
      patternType: 'batch_operation',
      detectedAt: new Date(),
      confidence: group.automationConfidence,
      metadata: {
        userId: representativeEvent.userId,
        userEmail: representativeEvent.userEmail,
        resourceType: representativeEvent.resourceType as 'file' | 'email' | 'calendar' | 'script' | 'permission',
        actionType: representativeEvent.eventType,
        timestamp: representativeEvent.timestamp,
        userAgent: representativeEvent.userAgent,
        location: representativeEvent.location
      },
      evidence: {
        description: `Batch operation detected: ${group.events.length} similar events`,
        dataPoints: {
          eventCount: group.events.length,
          timeWindowMs: group.timeWindow.totalDurationMs,
          automationConfidence: group.automationConfidence,
          frequencyInfo: frequencyPattern ? {
            intervalType: frequencyPattern.intervalType,
            avgInterval: frequencyPattern.detectedInterval,
            regularityScore: frequencyPattern.regularity.standardDeviation
          } : null
        },
        supportingEvents: group.events.map(e => e.eventId)
      }
    };
  }
}