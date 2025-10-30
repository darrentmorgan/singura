import { EventEmitter } from 'events';
import {
  GoogleWorkspaceEvent,
  GoogleActivityPattern
} from '@singura/shared-types';

interface PermissionChange {
  timestamp: Date;
  level: number;
  permission: string;
  resourceId: string;
  resourceType: string;
  eventId: string;
}

interface EscalationPattern {
  userId: string;
  userEmail: string;
  escalations: PermissionChange[];
  escalationCount: number;
  maxLevelJump: number;
  escalationVelocity: number; // escalations per day
  timeWindowDays: number;
}

export class PermissionEscalationDetectorService {
  private eventEmitter: EventEmitter;
  private readonly PERMISSION_LEVELS: Record<string, number> = {
    'read': 0,
    'viewer': 0,
    'comment': 1,
    'commenter': 1,
    'write': 2,
    'writer': 2,
    'editor': 2,
    'admin': 3,
    'administrator': 3,
    'owner': 4,
    'organizer': 4
  };

  constructor() {
    this.eventEmitter = new EventEmitter();
  }

  /**
   * Detect permission escalation patterns in Google Workspace events
   */
  async detectEscalation(
    events: GoogleWorkspaceEvent[],
    timeWindowDays: number = 30
  ): Promise<GoogleActivityPattern[]> {
    const thresholds = this.getEscalationThresholds();

    // Filter to permission change events
    const permissionEvents = events.filter(event =>
      event.eventType === 'permission_change' ||
      event.eventType === 'acl_change' ||
      event.eventType === 'sharing'
    );

    // Group by user (minimum events check is done per-user in analyzeUserEscalation)
    const userGroups = this.groupEventsByUser(permissionEvents);
    const patterns: GoogleActivityPattern[] = [];

    for (const [userId, userEvents] of userGroups.entries()) {
      const escalationPattern = this.analyzeUserEscalation(
        userEvents,
        timeWindowDays,
        thresholds
      );

      if (escalationPattern) {
        const pattern = this.convertToActivityPattern(escalationPattern);
        patterns.push(pattern);

        // Emit detection event for metrics tracking
        this.eventEmitter.emit('detection', {
          automationId: pattern.patternId,
          predicted: pattern.confidence > 75 ? 'malicious' : 'legitimate',
          confidence: pattern.confidence,
          detectorName: 'PermissionEscalationDetector',
          timestamp: new Date()
        });
      }
    }

    return patterns;
  }

  private analyzeUserEscalation(
    events: GoogleWorkspaceEvent[],
    timeWindowDays: number,
    thresholds: ReturnType<typeof this.getEscalationThresholds>
  ): EscalationPattern | null {
    if (events.length === 0) return null;

    const representative = events[0]!;
    const userId = representative.userId;
    const userEmail = representative.userEmail;

    // Extract permission changes
    const changes = this.extractPermissionChanges(events);

    // Check for critical level jumps early (before minimum events check)
    // A big level jump (e.g., read → owner) is critical even with only 2 events
    const hasCriticalJump = this.hasCriticalLevelJump(changes, thresholds);

    if (!hasCriticalJump && changes.length < thresholds.minimumEventsForAnalysis) {
      return null;
    }

    // Sort by timestamp
    const sortedChanges = changes.sort((a, b) =>
      a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Detect escalations
    const escalations: PermissionChange[] = [];
    let maxLevelJump = 0;
    let previousLevel = 0;

    for (let i = 0; i < sortedChanges.length; i++) {
      const current = sortedChanges[i]!;

      if (current.level > previousLevel) {
        const jump = current.level - previousLevel;
        maxLevelJump = Math.max(maxLevelJump, jump);
        escalations.push(current);
      }

      previousLevel = Math.max(previousLevel, current.level);
    }

    // Calculate escalation velocity
    const timeSpanMs = sortedChanges[sortedChanges.length - 1]!.timestamp.getTime() -
                       sortedChanges[0]!.timestamp.getTime();
    const timeSpanDays = timeSpanMs / (24 * 60 * 60 * 1000);
    const escalationVelocity = escalations.length / Math.max(timeSpanDays, 1);

    // Check if suspicious
    const isSuspicious =
      escalations.length >= thresholds.maxEscalationsPerMonth ||
      maxLevelJump >= thresholds.maxLevelJump ||
      escalationVelocity >= thresholds.suspiciousVelocity;

    if (!isSuspicious) {
      return null;
    }

    return {
      userId,
      userEmail,
      escalations,
      escalationCount: escalations.length,
      maxLevelJump,
      escalationVelocity,
      timeWindowDays
    };
  }

  private extractPermissionChanges(events: GoogleWorkspaceEvent[]): PermissionChange[] {
    return events.map(event => {
      const permission = this.extractPermissionFromEvent(event);
      const level = this.getPermissionLevel(permission);

      return {
        timestamp: event.timestamp,
        level,
        permission,
        resourceId: event.resourceId,
        resourceType: event.resourceType,
        eventId: event.eventId
      };
    }).filter(change => change.permission !== 'unknown'); // Keep level 0 (read) permissions, just filter truly unknown
  }

  private extractPermissionFromEvent(event: GoogleWorkspaceEvent): string {
    const metadata = event.actionDetails?.additionalMetadata;

    if (!metadata || typeof metadata !== 'object') {
      return 'unknown';
    }

    // Try various metadata fields with type checking
    const permission =
      (typeof metadata.role === 'string' ? metadata.role : null) ||
      (typeof metadata.permission === 'string' ? metadata.permission : null) ||
      (typeof metadata.access_level === 'string' ? metadata.access_level : null) ||
      (typeof metadata.new_value === 'string' ? metadata.new_value : null) ||
      'unknown';

    return permission.toLowerCase();
  }

  private getPermissionLevel(permission: string): number {
    // Try exact match first
    const exactMatch = this.PERMISSION_LEVELS[permission];
    if (exactMatch !== undefined) {
      return exactMatch;
    }

    // Try partial matches
    for (const [key, level] of Object.entries(this.PERMISSION_LEVELS)) {
      if (permission.includes(key)) {
        return level;
      }
    }

    return 0; // Unknown/default to lowest level
  }

  private groupEventsByUser(events: GoogleWorkspaceEvent[]): Map<string, GoogleWorkspaceEvent[]> {
    const groups = new Map<string, GoogleWorkspaceEvent[]>();

    for (const event of events) {
      const userId = event.userId;
      if (!groups.has(userId)) {
        groups.set(userId, []);
      }
      groups.get(userId)!.push(event);
    }

    return groups;
  }

  private convertToActivityPattern(escalationPattern: EscalationPattern): GoogleActivityPattern {
    const confidence = this.calculateConfidence(escalationPattern);
    const riskLevel = this.determineRiskLevel(escalationPattern);

    return {
      patternId: `permission_escalation_${escalationPattern.userId}_${Date.now()}`,
      patternType: 'permission_change',
      detectedAt: new Date(),
      confidence,
      metadata: {
        userId: escalationPattern.userId,
        userEmail: escalationPattern.userEmail,
        resourceType: 'permission' as const,
        actionType: 'permission_change',
        timestamp: escalationPattern.escalations[escalationPattern.escalations.length - 1]!.timestamp
      },
      evidence: {
        description: `Permission escalation detected: ${escalationPattern.escalationCount} escalations over ${Math.round(escalationPattern.timeWindowDays)} days`,
        dataPoints: {
          escalationCount: escalationPattern.escalationCount,
          maxLevelJump: escalationPattern.maxLevelJump,
          escalationVelocity: escalationPattern.escalationVelocity,
          timeWindowDays: escalationPattern.timeWindowDays,
          escalationTimeline: escalationPattern.escalations.map(e => ({
            timestamp: e.timestamp.toISOString(),
            level: e.level,
            permission: e.permission,
            resourceId: e.resourceId
          }))
        },
        supportingEvents: escalationPattern.escalations.map(e => e.eventId)
      }
    };
  }

  private calculateConfidence(pattern: EscalationPattern): number {
    const thresholds = this.getEscalationThresholds();

    let confidence = 0;

    // Factor 1: Number of escalations (40% weight)
    const escalationScore = Math.min(
      (pattern.escalationCount / thresholds.maxEscalationsPerMonth) * 40,
      40
    );
    confidence += escalationScore;

    // Factor 2: Level jump magnitude (40% weight - increased for critical jumps)
    const jumpScore = Math.min(
      (pattern.maxLevelJump / thresholds.maxLevelJump) * 40,
      40
    );
    confidence += jumpScore;

    // Bonus for extreme jumps (> 3 levels)
    if (pattern.maxLevelJump > 3) {
      confidence += 10; // Extra confidence for extreme privilege escalation
    }

    // Factor 3: Escalation velocity (20% weight - reduced)
    const velocityScore = Math.min(
      (pattern.escalationVelocity / thresholds.suspiciousVelocity) * 20,
      20
    );
    confidence += velocityScore;

    return Math.min(confidence, 100);
  }

  private hasCriticalLevelJump(
    changes: PermissionChange[],
    thresholds: ReturnType<typeof this.getEscalationThresholds>
  ): boolean {
    if (changes.length < 2) return false;

    // Don't mutate the original array
    const sortedChanges = [...changes].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    let previousLevel = sortedChanges[0]!.level;

    for (let i = 1; i < sortedChanges.length; i++) {
      const current = sortedChanges[i]!;
      const jump = current.level - previousLevel;

      // Critical jump is GREATER than threshold (e.g., > 2 means 3+ levels)
      // This bypasses the minimum 3-event requirement
      if (jump > thresholds.maxLevelJump) {
        return true; // Extreme jump detected (e.g., read → admin/owner)
      }

      previousLevel = Math.max(previousLevel, current.level);
    }

    return false;
  }

  private determineRiskLevel(pattern: EscalationPattern): 'low' | 'medium' | 'high' | 'critical' {
    const thresholds = this.getEscalationThresholds();

    if (pattern.maxLevelJump >= thresholds.maxLevelJump) {
      return 'critical'; // Direct jump to admin/owner
    }

    if (pattern.escalationCount >= thresholds.maxEscalationsPerMonth * 2) {
      return 'high'; // Frequent escalations
    }

    if (pattern.escalationVelocity >= thresholds.suspiciousVelocity * 2) {
      return 'high'; // Rapid escalation
    }

    if (pattern.escalationCount >= thresholds.maxEscalationsPerMonth) {
      return 'medium';
    }

    return 'low';
  }

  getEscalationThresholds() {
    return {
      maxEscalationsPerMonth: 2,        // 2+ escalations in 30 days = suspicious
      maxLevelJump: 2,                   // Jumping 2+ levels = critical
      suspiciousVelocity: 0.1,          // 0.1 escalations/day = ~3/month
      minimumEventsForAnalysis: 3        // Need at least 3 permission events (unless critical jump)
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

export const permissionEscalationDetector = new PermissionEscalationDetectorService();
