import {
  VelocityDetector,
  GoogleWorkspaceEvent,
  TemporalPattern,
  isValidGoogleActivityPattern,
  ActivityTimeframe
} from '@saas-xray/shared-types';

export class VelocityDetectorService implements VelocityDetector {
  private defaultBusinessHours: ActivityTimeframe = {
    timezoneId: 'UTC',
    businessHours: {
      startHour: 9,  // 9 AM
      endHour: 17,   // 5 PM
      daysOfWeek: [1, 2, 3, 4, 5]  // Monday to Friday
    },
    activityPeriod: {
      startTime: new Date(),
      endTime: new Date(),
      isBusinessHours: true,
      isWeekend: false
    },
    humanLikelihood: 100,
    automationIndicators: []
  };

  detectVelocityAnomalies(
    events: GoogleWorkspaceEvent[],
    businessHours?: ActivityTimeframe
  ): TemporalPattern[] {
    const velocityPatterns: TemporalPattern[] = [];
    const thresholds = this.getVelocityThresholds();
    const effectiveBusinessHours = businessHours || this.defaultBusinessHours;

    // Group events by type and time context
    const eventsByType = this.groupEventsByType(events);

    Object.entries(eventsByType).forEach(([type, typeEvents]) => {
      const timeWindow = this.calculateTimeWindow(typeEvents);
      const velocity = this.calculateEventsPerSecond(typeEvents, timeWindow.durationMs);

      const offHoursRatio = this.calculateOffHoursRatio(typeEvents, effectiveBusinessHours);

      if (this.isInhumanVelocity(velocity, type, offHoursRatio)) {
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
          anomalyScore: this.calculateAnomalyScore(
            velocity,
            type,
            offHoursRatio
          ),
          confidence: this.calculateConfidence(
            velocity,
            type,
            offHoursRatio
          )
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

  isInhumanVelocity(
    velocity: number,
    actionType: string,
    offHoursRatio?: number
  ): boolean {
    const thresholds = this.getVelocityThresholds();
    const offHoursMultiplier = offHoursRatio && offHoursRatio > 0.5 ? 0.5 : 1;

    switch (actionType) {
      case 'file_create':
        return velocity > (thresholds.humanMaxFileCreation * offHoursMultiplier);
      case 'permission_change':
        return velocity > (thresholds.humanMaxPermissionChanges * offHoursMultiplier);
      case 'email_send':
        return velocity > (thresholds.humanMaxEmailActions * offHoursMultiplier);
      default:
        return velocity > (thresholds.automationThreshold * offHoursMultiplier);
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

  private calculateAnomalyScore(
    velocity: number,
    actionType: string,
    offHoursRatio?: number
  ): number {
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

    // Adjust score based on off-hours activity
    const offHoursMultiplier = offHoursRatio && offHoursRatio > 0.5 ? 1.5 : 1;

    return Math.min(Math.max(baseScore * multiplier * offHoursMultiplier, 0), 100);
  }

  private calculateConfidence(
    velocity: number,
    actionType: string,
    offHoursRatio?: number
  ): number {
    const anomalyScore = this.calculateAnomalyScore(velocity, actionType, offHoursRatio);
    // Confidence is directly proportional to anomaly score, with off-hours bonus
    const offHoursBonus = offHoursRatio && offHoursRatio > 0.5 ? 1.2 : 1;
    return Math.min(anomalyScore * offHoursBonus, 100);
  }

  private calculateOffHoursRatio(
    events: GoogleWorkspaceEvent[],
    businessHours: ActivityTimeframe
  ): number {
    const totalEvents = events.length;
    if (totalEvents === 0) return 0;

    const offHoursEvents = events.filter(event =>
      !this.isBusinessHours(event.timestamp, businessHours.timezoneId, businessHours.businessHours)
    );

    return offHoursEvents.length / totalEvents;
  }

  private isBusinessHours(
    timestamp: Date,
    timezoneId: string,
    businessConfig: ActivityTimeframe['businessHours']
  ): boolean {
    const localTime = new Date(timestamp.toLocaleString('en-US', { timeZone: timezoneId }));
    const localHour = localTime.getHours();
    const localDay = localTime.getDay();

    // Check if the day is a business day
    const isBusinessDay = businessConfig.daysOfWeek.includes(localDay);

    // Check if the hour is within business hours
    const isBusinessHour = localHour >= businessConfig.startHour &&
                            localHour < businessConfig.endHour;

    return isBusinessDay && isBusinessHour;
  }
}