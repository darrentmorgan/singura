import { 
  VelocityDetector, 
  GoogleWorkspaceEvent, 
  TemporalPattern, 
  isValidGoogleActivityPattern 
} from '@saas-xray/shared-types';

export class VelocityDetectorService implements VelocityDetector {
  detectVelocityAnomalies(events: GoogleWorkspaceEvent[]): TemporalPattern[] {
    const velocityPatterns: TemporalPattern[] = [];
    const thresholds = this.getVelocityThresholds();
    
    // Group events by type
    const eventsByType = this.groupEventsByType(events);

    Object.entries(eventsByType).forEach(([type, typeEvents]) => {
      const timeWindow = this.calculateTimeWindow(typeEvents);
      const velocity = this.calculateEventsPerSecond(typeEvents, timeWindow.durationMs);
      
      if (this.isInhumanVelocity(velocity, type)) {
        const pattern: TemporalPattern = {
          patternId: `velocity_anomaly_${type}_${Date.now()}`,
          analysisType: 'velocity',
          timeWindow,
          eventCount: typeEvents.length,
          velocity: {
            eventsPerSecond: velocity,
            eventsPerMinute: velocity * 60,
            eventsPerHour: velocity * 3600
          },
          thresholds: {
            humanMaxVelocity: thresholds.humanMaxFileCreation,
            automationThreshold: thresholds.automationThreshold,
            criticalThreshold: thresholds.criticalThreshold
          },
          anomalyScore: this.calculateAnomalyScore(velocity, type),
          confidence: this.calculateConfidence(velocity, type)
        };

        velocityPatterns.push(pattern);
      }
    });

    return velocityPatterns;
  }

  private groupEventsByType(events: GoogleWorkspaceEvent[]): Record<string, GoogleWorkspaceEvent[]> {
    return events.reduce((groups, event) => {
      const key = event.eventType;
      if (!groups[key]) groups[key] = [];
      groups[key].push(event);
      return groups;
    }, {} as Record<string, GoogleWorkspaceEvent[]>);
  }

  private calculateTimeWindow(events: GoogleWorkspaceEvent[]): TemporalPattern['timeWindow'] {
    if (events.length === 0) {
      const now = new Date();
      return {
        startTime: now,
        endTime: now,
        durationMs: 0
      };
    }
    
    const sortedEvents = events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const firstEvent = sortedEvents[0]!;
    const lastEvent = sortedEvents[sortedEvents.length - 1]!;
    
    return {
      startTime: firstEvent.timestamp,
      endTime: lastEvent.timestamp,
      durationMs: lastEvent.timestamp.getTime() - firstEvent.timestamp.getTime()
    };
  }

  calculateEventsPerSecond(events: GoogleWorkspaceEvent[], timeWindow: number): number {
    // Prevent division by zero
    if (timeWindow <= 0 || events.length === 0) return 0;
    return events.length / (timeWindow / 1000);
  }

  isInhumanVelocity(velocity: number, actionType: string): boolean {
    const thresholds = this.getVelocityThresholds();
    
    switch (actionType) {
      case 'file_create':
        return velocity > thresholds.humanMaxFileCreation;
      case 'permission_change':
        return velocity > thresholds.humanMaxPermissionChanges;
      case 'email_send':
        return velocity > thresholds.humanMaxEmailActions;
      default:
        return velocity > thresholds.automationThreshold;
    }
  }

  getVelocityThresholds() {
    return {
      humanMaxFileCreation: 1,      // 1 file per second
      humanMaxPermissionChanges: 2, // 2 permission changes per second
      humanMaxEmailActions: 3,      // 3 emails per second
      automationThreshold: 5,       // 5 actions per second
      criticalThreshold: 10         // 10 actions per second
    };
  }

  private calculateAnomalyScore(velocity: number, actionType: string): number {
    const thresholds = this.getVelocityThresholds();
    const criticalThreshold = thresholds.criticalThreshold;
    
    // Linear scaling between automation threshold and critical threshold
    const baseScore = ((velocity - thresholds.automationThreshold) / 
                       (criticalThreshold - thresholds.automationThreshold)) * 100;
    
    // Add action type specific weighting
    const actionMultipliers: Record<string, number> = {
      'file_create': 1.2,
      'permission_change': 1.5,
      'script_execution': 1.3,
      'default': 1
    };

    const multiplier = actionMultipliers[actionType] ?? actionMultipliers['default']!;
    
    return Math.min(Math.max(baseScore * multiplier, 0), 100);
  }

  private calculateConfidence(velocity: number, actionType: string): number {
    const anomalyScore = this.calculateAnomalyScore(velocity, actionType);
    // Confidence is directly proportional to anomaly score
    return Math.min(anomalyScore * 1.2, 100);
  }
}