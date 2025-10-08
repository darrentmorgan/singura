import { PermissionEscalationDetectorService } from '../../../src/services/detection/permission-escalation-detector.service';
import { GoogleWorkspaceEvent } from '@saas-xray/shared-types';

describe('PermissionEscalationDetectorService', () => {
  let detector: PermissionEscalationDetectorService;

  beforeEach(() => {
    detector = new PermissionEscalationDetectorService();
  });

  const createPermissionEvent = (
    timestampMs: number,
    permission: string,
    userId = 'user-1'
  ): GoogleWorkspaceEvent => ({
    eventId: `evt-${timestampMs}`,
    timestamp: new Date(timestampMs),
    userId,
    userEmail: `${userId}@example.com`,
    eventType: 'permission_change',
    resourceType: 'file',
    resourceId: 'file-123',
    actionDetails: {
      actionType: 'permission_change',
      resourceName: 'sensitive_folder',
      additionalMetadata: { role: permission }
    },
    userAgent: 'test-agent',
    ipAddress: '192.168.1.1',
    location: { city: 'Test', country: 'US' }
  });

  describe('detectEscalation', () => {
    it('should detect gradual privilege escalation (read → write → admin)', async () => {
      const baseTime = Date.now();
      const events = [
        createPermissionEvent(baseTime, 'read'),
        createPermissionEvent(baseTime + 10 * 24 * 60 * 60 * 1000, 'write'),  // 10 days later
        createPermissionEvent(baseTime + 20 * 24 * 60 * 60 * 1000, 'admin')   // 20 days later
      ];

      const patterns = await detector.detectEscalation(events);

      expect(patterns).toHaveLength(1);
      expect(patterns[0]!.patternType).toBe('permission_change');
      expect(patterns[0]!.evidence.dataPoints.escalationCount).toBe(2);
    });

    it('should detect level jumping (read → owner)', async () => {
      const baseTime = Date.now();
      const events = [
        createPermissionEvent(baseTime, 'read'),
        createPermissionEvent(baseTime + 1000, 'owner')  // Jump from 0 to 4
      ];

      const patterns = await detector.detectEscalation(events);

      expect(patterns).toHaveLength(1);
      expect(patterns[0]!.evidence.dataPoints.maxLevelJump).toBe(4);
      expect(patterns[0]!.confidence).toBeGreaterThan(85);
    });

    it('should NOT detect single permission grant', async () => {
      const events = [
        createPermissionEvent(Date.now(), 'write')
      ];

      const patterns = await detector.detectEscalation(events);

      expect(patterns).toHaveLength(0);
    });

    it('should require minimum 3 events for analysis', async () => {
      const events = [
        createPermissionEvent(Date.now(), 'read'),
        createPermissionEvent(Date.now() + 1000, 'write')
      ];

      const patterns = await detector.detectEscalation(events);

      expect(patterns).toHaveLength(0);
    });

    it('should group by user and detect per-user escalation', async () => {
      const baseTime = Date.now();
      const events = [
        // User 1: Escalation
        createPermissionEvent(baseTime, 'read', 'user-1'),
        createPermissionEvent(baseTime + 1000, 'write', 'user-1'),
        createPermissionEvent(baseTime + 2000, 'admin', 'user-1'),

        // User 2: No escalation
        createPermissionEvent(baseTime, 'read', 'user-2'),
        createPermissionEvent(baseTime + 1000, 'read', 'user-2'),
        createPermissionEvent(baseTime + 2000, 'read', 'user-2')
      ];

      const patterns = await detector.detectEscalation(events);

      expect(patterns).toHaveLength(1);
      expect(patterns[0]!.metadata.userId).toBe('user-1');
    });

    it('should calculate escalation velocity correctly', async () => {
      const baseTime = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;

      const events = [
        createPermissionEvent(baseTime, 'read'),
        createPermissionEvent(baseTime + 5 * oneDayMs, 'write'),
        createPermissionEvent(baseTime + 10 * oneDayMs, 'admin')
      ];

      const patterns = await detector.detectEscalation(events);

      expect(patterns).toHaveLength(1);
      expect(patterns[0]!.evidence.dataPoints.escalationVelocity).toBeCloseTo(0.2, 1); // 2 escalations / 10 days
    });
  });

  describe('getEscalationThresholds', () => {
    it('should return correct default thresholds', () => {
      const thresholds = detector.getEscalationThresholds();

      expect(thresholds.maxEscalationsPerMonth).toBe(2);
      expect(thresholds.maxLevelJump).toBe(2);
      expect(thresholds.suspiciousVelocity).toBe(0.1);
      expect(thresholds.minimumEventsForAnalysis).toBe(3);
    });
  });
});
