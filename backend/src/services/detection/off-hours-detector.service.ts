import {
  OffHoursDetector,
  GoogleWorkspaceEvent,
  ActivityTimeframe,
  GoogleActivityPattern
} from '@saas-xray/shared-types';

import { DateTime } from 'luxon';

export class OffHoursDetectorService implements OffHoursDetector {
  detectOffHoursActivity(
    events: GoogleWorkspaceEvent[], 
    businessHours: ActivityTimeframe
  ): GoogleActivityPattern[] {
    if (events.length < this.getOffHoursThresholds().minimumEventsForAnalysis) {
      return [];
    }

    const offHoursEvents = events.filter(event => 
      !this.isBusinessHours(event.timestamp, 'UTC', businessHours.businessHours)
    );

    const totalActivityPercentage = this.calculateOffHoursRisk(offHoursEvents, events);

    if (totalActivityPercentage >= this.getOffHoursThresholds().suspiciousActivityThreshold) {
      return this.generateOffHoursActivityPatterns(offHoursEvents, totalActivityPercentage);
    }

    return [];
  }

  isBusinessHours(
    timestamp: Date, 
    timezone: string, 
    businessConfig: ActivityTimeframe['businessHours']
  ): boolean {
    const dt = DateTime.fromJSDate(timestamp).setZone(timezone);
    
    // Check if day of week is within business days
    const dayOfWeek = dt.weekday % 7; // Adjust to 0-6 range (Sun = 0, Sat = 6)
    const isBusinessDay = businessConfig.daysOfWeek.includes(dayOfWeek);

    // Check if time is within business hours
    const hour = dt.hour;
    const isBusinessTime = 
      hour >= businessConfig.startHour && 
      hour < businessConfig.endHour;

    return isBusinessDay && isBusinessTime;
  }

  calculateOffHoursRisk(
    offHoursEvents: GoogleWorkspaceEvent[], 
    totalActivity: GoogleWorkspaceEvent[]
  ): number {
    if (totalActivity.length === 0) return 0;
    
    return (offHoursEvents.length / totalActivity.length) * 100;
  }

  getOffHoursThresholds() {
    return {
      suspiciousActivityThreshold: 30,    // 30% off-hours activity is suspicious
      criticalActivityThreshold: 60,      // 60% off-hours activity indicates likely automation
      minimumEventsForAnalysis: 10        // Minimum events to perform analysis
    };
  }

  private generateOffHoursActivityPatterns(
    offHoursEvents: GoogleWorkspaceEvent[], 
    offHoursPercentage: number
  ): GoogleActivityPattern[] {
    // Group off-hours events by user and action type
    const eventsByUser = this.groupEventsByUser(offHoursEvents);

    return Object.entries(eventsByUser).map(([userId, userEvents]) => {
      if (userEvents.length === 0) {
        throw new Error(`No events found for user ${userId}`);
      }
      
      const representativeEvent = userEvents[0]!;
      const riskLevel = this.determineRiskLevel(offHoursPercentage);

      return {
        patternId: `off_hours_${userId}_${Date.now()}`,
        patternType: 'off_hours',
        detectedAt: new Date(),
        confidence: this.calculateConfidence(offHoursPercentage),
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
          description: `High off-hours activity detected: ${offHoursPercentage.toFixed(2)}% outside business hours`,
          dataPoints: {
            totalEvents: offHoursEvents.length,
            offHoursPercentage,
            eventTypes: [...new Set(userEvents.map(e => e.eventType))]
          },
          supportingEvents: userEvents.map(e => e.eventId)
        }
      };
    });
  }

  private groupEventsByUser(events: GoogleWorkspaceEvent[]): Record<string, GoogleWorkspaceEvent[]> {
    return events.reduce((groups, event) => {
      const key = event.userId;
      if (!groups[key]) groups[key] = [];
      groups[key].push(event);
      return groups;
    }, {} as Record<string, GoogleWorkspaceEvent[]>);
  }

  private calculateConfidence(offHoursPercentage: number): number {
    const thresholds = this.getOffHoursThresholds();
    
    // Linear scaling between suspicious and critical thresholds
    const baseConfidence = ((offHoursPercentage - thresholds.suspiciousActivityThreshold) / 
                            (thresholds.criticalActivityThreshold - thresholds.suspiciousActivityThreshold)) * 100;
    
    return Math.min(Math.max(baseConfidence, 0), 100);
  }

  private determineRiskLevel(offHoursPercentage: number): GoogleActivityPattern['metadata']['actionType'] {
    const thresholds = this.getOffHoursThresholds();
    
    if (offHoursPercentage < thresholds.suspiciousActivityThreshold) return 'file_edit';
    if (offHoursPercentage < thresholds.criticalActivityThreshold) return 'file_share';
    return 'script_execution';
  }
}