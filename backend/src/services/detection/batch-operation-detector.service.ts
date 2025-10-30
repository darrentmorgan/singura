import { EventEmitter } from 'events';
import {
  BatchOperationDetector,
  GoogleWorkspaceEvent,
  GoogleActivityPattern,
  BatchOperationGroup
} from '@singura/shared-types';

export class BatchOperationDetectorService implements BatchOperationDetector {
  private eventEmitter: EventEmitter;

  constructor() {
    this.eventEmitter = new EventEmitter();
  }

  detectBatchOperations(events: GoogleWorkspaceEvent[]): GoogleActivityPattern[] {
    const batchGroups = this.identifySimilarActions(events);

    const patterns = batchGroups
      .filter(group => this.calculateBatchLikelihood(group) > 0.7) // High confidence batch
      .map(group => this.convertBatchGroupToActivityPattern(group));

    // Emit detection events for metrics tracking
    for (const pattern of patterns) {
      this.eventEmitter.emit('detection', {
        automationId: pattern.patternId,
        predicted: pattern.confidence > 80 ? 'malicious' : 'legitimate',
        confidence: pattern.confidence,
        detectorName: 'BatchOperationDetector',
        timestamp: new Date()
      });
    }

    return patterns;
  }

  identifySimilarActions(events: GoogleWorkspaceEvent[]): BatchOperationGroup[] {
    const thresholds = this.getBatchThresholds();
    const sortedEvents = events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const batchGroups: BatchOperationGroup[] = [];

    // Sliding window batch detection
    for (let i = 0; i < sortedEvents.length; i++) {
      const currentEvent = sortedEvents[i];
      if (!currentEvent) continue;
      
      const similarEvents = [currentEvent];

      // Look for similar events within time window
      for (let j = i + 1; j < sortedEvents.length; j++) {
        const candidateEvent = sortedEvents[j];
        if (!candidateEvent) continue;
        
        // Check time window constraint
        if (candidateEvent.timestamp.getTime() - currentEvent.timestamp.getTime() > thresholds.maxTimeWindowMs) {
          break;
        }

        // Check similarity
        if (this.areEventsSimilar(currentEvent, candidateEvent)) {
          similarEvents.push(candidateEvent);
        }
      }

      // If enough similar events, create batch group
      if (similarEvents.length >= thresholds.minimumSimilarActions) {
        const batchGroup = this.createBatchGroup(similarEvents);
        batchGroups.push(batchGroup);
      }
    }

    return batchGroups;
  }

  private areEventsSimilar(event1: GoogleWorkspaceEvent, event2: GoogleWorkspaceEvent): boolean {
    const thresholds = this.getBatchThresholds();
    
    const similarityChecks = {
      actionType: event1.eventType === event2.eventType,
      resourceType: event1.resourceType === event2.resourceType,
      namingPattern: this.checkNamingPattern(event1, event2),
      permissions: this.checkPermissionSimilarity(event1, event2),
      timing: this.checkTimingInterval(event1, event2)
    };

    // Calculate overall similarity score
    const similarityScore = Object.values(similarityChecks)
      .filter(Boolean).length / Object.keys(similarityChecks).length;

    return similarityScore >= thresholds.similarityThreshold;
  }

  private checkNamingPattern(event1: GoogleWorkspaceEvent, event2: GoogleWorkspaceEvent): boolean {
    const name1 = event1.actionDetails.resourceName;
    const name2 = event2.actionDetails.resourceName;

    // Check for sequential/numbered naming (handles extensions like .pdf, .docx)
    // Matches: base + digits + extension
    // Example: "report_001.pdf" -> ["report_", "001", ".pdf"]
    const numberExtractRegex = /^(.+?)(\d+)(.*)$/;
    const match1 = name1.match(numberExtractRegex);
    const match2 = name2.match(numberExtractRegex);

    if (match1 && match2) {
      return (
        match1[1] === match2[1] &&  // Same base name
        match1[3] === match2[3] &&  // Same extension
        Math.abs(Number(match1[2]) - Number(match2[2])) <= 1  // Consecutive or same numbers
      );
    }

    return false;
  }

  private checkSequentialNamingPattern(events: GoogleWorkspaceEvent[]): boolean {
    if (events.length < 2) return false;

    const numberExtractRegex = /^(.+?)(\d+)(.*)$/;

    // Extract parts from all events
    const matches = events.map(e => e.actionDetails.resourceName.match(numberExtractRegex));

    // Check if all events have the numbered naming pattern
    if (!matches.every(m => m !== null)) return false;

    const baseName = matches[0]![1];
    const extension = matches[0]![3];

    // Check if all events have same base name and extension
    const sameBase = matches.every(m => m![1] === baseName && m![3] === extension);
    if (!sameBase) return false;

    // Check if numbers form a sequence (each is consecutive)
    const numbers = matches.map(m => Number(m![2]));
    for (let i = 1; i < numbers.length; i++) {
      if (numbers[i]! - numbers[i-1]! !== 1) {
        return false; // Not consecutive
      }
    }

    return true;
  }

  private checkPermissionSimilarity(event1: GoogleWorkspaceEvent, event2: GoogleWorkspaceEvent): boolean {
    // Deep check of permission changes similarity
    const metadata1 = event1.actionDetails.additionalMetadata;
    const metadata2 = event2.actionDetails.additionalMetadata;

    const permissionKeys = ['role', 'type', 'scope'];
    return permissionKeys.every(key => 
      metadata1[key] === metadata2[key]
    );
  }

  private checkTimingInterval(event1: GoogleWorkspaceEvent, event2: GoogleWorkspaceEvent): boolean {
    const timeDiff = Math.abs(event1.timestamp.getTime() - event2.timestamp.getTime());
    const intervalThresholdMs = 5000; // 5 seconds
    return timeDiff <= intervalThresholdMs;
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
      namingPattern: this.checkSequentialNamingPattern(events),
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

  calculateBatchLikelihood(group: BatchOperationGroup): number {
    const similarityScore = Object.values(group.similarity)
      .filter(Boolean).length / Object.keys(group.similarity).length;
    
    const timingScore = group.events.length > 1 
      ? 1 - (group.timeWindow.totalDurationMs / (1000 * 60 * 60)) // Shorter duration = higher score
      : 0;

    return Math.min(similarityScore * timingScore * 1.2, 1);
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

  private convertBatchGroupToActivityPattern(group: BatchOperationGroup): GoogleActivityPattern {
    if (group.events.length === 0) {
      throw new Error('Cannot convert empty batch group to activity pattern');
    }

    const representativeEvent = group.events[0]!;

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
          automationConfidence: group.automationConfidence
        },
        supportingEvents: group.events.map(e => e.eventId)
      }
    };
  }

  /**
   * Subscribe to detection events for metrics tracking
   *
   * @param event - Event name (e.g., 'detection')
   * @param listener - Event handler function
   */
  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }
}