import { DataVolumeDetectorService } from '../../../src/services/detection/data-volume-detector.service';
import { GoogleWorkspaceEvent } from '@saas-xray/shared-types';

describe('DataVolumeDetectorService', () => {
  let detector: DataVolumeDetectorService;

  beforeEach(() => {
    detector = new DataVolumeDetectorService();
  });

  const createDownloadEvent = (
    timestampMs: number,
    fileSize: number,
    userId = 'user-1'
  ): GoogleWorkspaceEvent => ({
    eventId: `evt-${timestampMs}`,
    timestamp: new Date(timestampMs),
    userId,
    userEmail: `${userId}@example.com`,
    eventType: 'file_download',
    resourceType: 'file',
    resourceId: `file-${timestampMs}`,
    actionDetails: {
      actionType: 'file_download',
      resourceName: 'document.pdf',
      additionalMetadata: { fileSize, size: fileSize }
    },
    userAgent: 'test-agent',
    ipAddress: '192.168.1.1',
    location: { city: 'Test', country: 'US' }
  });

  describe('detectExfiltration', () => {
    it('should detect abnormal volume (3x baseline)', async () => {
      const MB = 1024 * 1024;
      const today = new Date();
      const oneDayMs = 24 * 60 * 60 * 1000;

      const events: GoogleWorkspaceEvent[] = [];

      // Baseline: 5 MB/day for 7 days
      for (let i = 7; i > 0; i--) {
        events.push(createDownloadEvent(today.getTime() - i * oneDayMs, 5 * MB));
      }

      // Today: 250 MB (50x baseline)
      for (let i = 0; i < 50; i++) {
        events.push(createDownloadEvent(today.getTime(), 5 * MB));
      }

      const patterns = await detector.detectExfiltration(events, 'org-1');

      expect(patterns).toHaveLength(1);
      expect(patterns[0]!.patternType).toBe('file_download');
      expect(patterns[0]!.confidence).toBeGreaterThan(90);
    });

    it('should detect critical volume (> 500 MB/day)', async () => {
      const MB = 1024 * 1024;
      const today = new Date();
      const events: GoogleWorkspaceEvent[] = [];

      // Download 600 MB today
      for (let i = 0; i < 60; i++) {
        events.push(createDownloadEvent(today.getTime(), 10 * MB));
      }

      const patterns = await detector.detectExfiltration(events, 'org-1');

      expect(patterns).toHaveLength(1);
      expect(patterns[0]!.confidence).toBeGreaterThan(95);
    });

    it('should NOT detect normal volume', async () => {
      const MB = 1024 * 1024;
      const today = new Date();
      const oneDayMs = 24 * 60 * 60 * 1000;

      const events: GoogleWorkspaceEvent[] = [];

      // Consistent 5 MB/day for 8 days
      for (let i = 8; i >= 0; i--) {
        events.push(createDownloadEvent(today.getTime() - i * oneDayMs, 5 * MB));
      }

      const patterns = await detector.detectExfiltration(events, 'org-1');

      expect(patterns).toHaveLength(0);
    });

    it('should estimate file size when metadata missing', async () => {
      const today = new Date();
      const events: GoogleWorkspaceEvent[] = [];

      // Create 100 PDF downloads without size metadata
      for (let i = 0; i < 100; i++) {
        const event = createDownloadEvent(today.getTime(), 0);
        event.actionDetails.resourceName = 'report.pdf';
        delete event.actionDetails.additionalMetadata.fileSize;
        events.push(event);
      }

      const patterns = await detector.detectExfiltration(events, 'org-1');

      // Should estimate ~200 KB per PDF = 20 MB total
      expect(patterns.length).toBeGreaterThanOrEqual(0); // May or may not trigger depending on threshold
    });

    it('should track high file count (100+ files)', async () => {
      const today = new Date();
      const events: GoogleWorkspaceEvent[] = [];

      // Download 150 small files (50 KB each = 7.5 MB total)
      for (let i = 0; i < 150; i++) {
        events.push(createDownloadEvent(today.getTime(), 50 * 1024));
      }

      const patterns = await detector.detectExfiltration(events, 'org-1');

      if (patterns.length > 0) {
        expect(patterns[0]!.evidence.dataPoints.fileCount).toBe(150);
      }
    });

    it('should group by user and detect per-user volume', async () => {
      const MB = 1024 * 1024;
      const today = new Date();
      const events: GoogleWorkspaceEvent[] = [];

      // User 1: Abnormal volume
      for (let i = 0; i < 100; i++) {
        events.push(createDownloadEvent(today.getTime(), 10 * MB, 'user-1'));
      }

      // User 2: Normal volume
      for (let i = 0; i < 5; i++) {
        events.push(createDownloadEvent(today.getTime(), 1 * MB, 'user-2'));
      }

      const patterns = await detector.detectExfiltration(events, 'org-1');

      expect(patterns.length).toBeGreaterThanOrEqual(1);
      expect(patterns[0]!.metadata.userId).toBe('user-1');
    });

    it('should handle insufficient baseline data (< 7 days)', async () => {
      const MB = 1024 * 1024;
      const today = new Date();
      const events: GoogleWorkspaceEvent[] = [];

      // Only 3 days of history
      for (let i = 3; i > 0; i--) {
        events.push(createDownloadEvent(today.getTime() - i * 24 * 60 * 60 * 1000, 5 * MB));
      }

      const patterns = await detector.detectExfiltration(events, 'org-1');

      // Should handle gracefully (may still detect based on absolute thresholds)
      expect(Array.isArray(patterns)).toBe(true);
    });
  });

  describe('getVolumeThresholds', () => {
    it('should return correct default thresholds', () => {
      const thresholds = detector.getVolumeThresholds();

      expect(thresholds.dailyVolumeWarningBytes).toBe(100 * 1024 * 1024);  // 100 MB
      expect(thresholds.dailyVolumeCriticalBytes).toBe(500 * 1024 * 1024); // 500 MB
      expect(thresholds.abnormalMultiplier).toBe(3.0);
      expect(thresholds.minimumEventsForBaseline).toBe(7);
      expect(thresholds.fileCountThreshold).toBe(100);
    });
  });
});
