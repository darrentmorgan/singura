import {
  GoogleWorkspaceEvent,
  GoogleActivityPattern,
  ActionType
} from '@saas-xray/shared-types';

interface VolumeStatistics {
  totalBytes: number;
  fileCount: number;
  averageFileSize: number;
  largestFile: number;
}

interface UserDailyVolume {
  userId: string;
  userEmail: string;
  date: string;
  totalBytes: number;
  fileCount: number;
  events: GoogleWorkspaceEvent[];
}

export class DataVolumeDetectorService {
  private readonly DOWNLOAD_EVENT_TYPES = [
    'file_download',
    'file_export',
    'file_copy',
    'bulk_download'
  ];

  private readonly FILE_TYPE_SIZE_ESTIMATES: Record<string, number> = {
    'doc': 50 * 1024,       // 50 KB
    'docx': 50 * 1024,
    'pdf': 200 * 1024,      // 200 KB
    'xls': 100 * 1024,      // 100 KB
    'xlsx': 100 * 1024,
    'ppt': 500 * 1024,      // 500 KB
    'pptx': 500 * 1024,
    'jpg': 1024 * 1024,     // 1 MB
    'jpeg': 1024 * 1024,
    'png': 1024 * 1024,
    'gif': 500 * 1024,
    'mp4': 10 * 1024 * 1024, // 10 MB
    'mov': 10 * 1024 * 1024,
    'zip': 5 * 1024 * 1024,  // 5 MB
    'default': 100 * 1024    // 100 KB default
  };

  async detectExfiltration(
    events: GoogleWorkspaceEvent[],
    organizationId: string
  ): Promise<GoogleActivityPattern[]> {
    const patterns: GoogleActivityPattern[] = [];
    const thresholds = this.getVolumeThresholds();

    const downloadEvents = this.filterDownloadEvents(events);
    if (downloadEvents.length === 0) {
      return patterns;
    }

    const dailyVolumes = this.groupByUserAndDate(downloadEvents);
    const userBaselines = this.calculateUserBaselines(dailyVolumes);

    for (const dailyVolume of dailyVolumes) {
      const baseline = userBaselines.get(dailyVolume.userId);
      const isAbnormal = this.isAbnormalVolume(dailyVolume, baseline, thresholds);

      if (isAbnormal) {
        const pattern = this.createExfiltrationPattern(
          dailyVolume,
          baseline,
          thresholds
        );
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  private filterDownloadEvents(events: GoogleWorkspaceEvent[]): GoogleWorkspaceEvent[] {
    return events.filter(event =>
      this.DOWNLOAD_EVENT_TYPES.includes(event.eventType)
    );
  }

  private groupByUserAndDate(events: GoogleWorkspaceEvent[]): UserDailyVolume[] {
    const groups = new Map<string, UserDailyVolume>();

    for (const event of events) {
      const dateKey = this.getDateKey(event.timestamp);
      const groupKey = `${event.userId}_${dateKey}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          userId: event.userId,
          userEmail: event.userEmail,
          date: dateKey,
          totalBytes: 0,
          fileCount: 0,
          events: []
        });
      }

      const group = groups.get(groupKey)!;
      const fileSize = this.extractFileSize(event);

      group.totalBytes += fileSize;
      group.fileCount++;
      group.events.push(event);
    }

    return Array.from(groups.values());
  }

  private getDateKey(timestamp: Date): string {
    return timestamp.toISOString().split('T')[0]!;
  }

  private extractFileSize(event: GoogleWorkspaceEvent): number {
    const fileSize = event.actionDetails.additionalMetadata?.fileSize as number | undefined;

    if (fileSize && typeof fileSize === 'number' && fileSize > 0) {
      return fileSize;
    }

    return this.estimateFileSizeFromType(event);
  }

  private estimateFileSizeFromType(event: GoogleWorkspaceEvent): number {
    const resourceName = event.actionDetails.resourceName?.toLowerCase() || '';
    const extension = resourceName.split('.').pop() || 'default';

    return this.FILE_TYPE_SIZE_ESTIMATES[extension] || this.FILE_TYPE_SIZE_ESTIMATES['default']!;
  }

  private calculateUserBaselines(dailyVolumes: UserDailyVolume[]): Map<string, number> {
    const userBaselines = new Map<string, number>();
    const userVolumes = new Map<string, number[]>();

    for (const volume of dailyVolumes) {
      if (!userVolumes.has(volume.userId)) {
        userVolumes.set(volume.userId, []);
      }
      userVolumes.get(volume.userId)!.push(volume.totalBytes);
    }

    for (const [userId, volumes] of userVolumes.entries()) {
      if (volumes.length >= this.getVolumeThresholds().minimumEventsForBaseline) {
        const average = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
        userBaselines.set(userId, average);
      } else {
        userBaselines.set(userId, 0);
      }
    }

    return userBaselines;
  }

  private isAbnormalVolume(
    dailyVolume: UserDailyVolume,
    baseline: number | undefined,
    thresholds: ReturnType<typeof this.getVolumeThresholds>
  ): boolean {
    if (dailyVolume.totalBytes >= thresholds.dailyVolumeCriticalBytes) {
      return true;
    }

    if (dailyVolume.totalBytes >= thresholds.dailyVolumeWarningBytes) {
      return true;
    }

    if (baseline && baseline > 0) {
      const multiplier = dailyVolume.totalBytes / baseline;
      if (multiplier >= thresholds.abnormalMultiplier) {
        return true;
      }
    }

    if (dailyVolume.fileCount >= thresholds.fileCountThreshold) {
      return true;
    }

    return false;
  }

  private createExfiltrationPattern(
    dailyVolume: UserDailyVolume,
    baseline: number | undefined,
    thresholds: ReturnType<typeof this.getVolumeThresholds>
  ): GoogleActivityPattern {
    const volumeStats = this.calculateVolume(dailyVolume.events);
    const confidence = this.calculateConfidence(dailyVolume, baseline, thresholds);
    const multiplier = baseline && baseline > 0 ? dailyVolume.totalBytes / baseline : 0;

    return {
      patternId: `data_volume_${dailyVolume.userId}_${dailyVolume.date}_${Date.now()}`,
      patternType: 'api_usage',
      detectedAt: new Date(),
      confidence,
      metadata: {
        userId: dailyVolume.userId,
        userEmail: dailyVolume.userEmail,
        resourceType: 'file',
        actionType: 'file_share' as ActionType, // Data exfiltration detected via file sharing
        timestamp: new Date(dailyVolume.date),
        location: undefined,
        userAgent: undefined
      },
      evidence: {
        description: this.buildEvidenceDescription(dailyVolume, baseline, multiplier),
        dataPoints: {
          totalBytes: dailyVolume.totalBytes,
          totalBytesMB: (dailyVolume.totalBytes / (1024 * 1024)).toFixed(2),
          fileCount: dailyVolume.fileCount,
          averageFileSize: volumeStats.averageFileSize,
          largestFile: volumeStats.largestFile,
          baselineBytes: baseline || 0,
          baselineBytesMB: baseline ? (baseline / (1024 * 1024)).toFixed(2) : '0',
          multiplier: multiplier.toFixed(2),
          date: dailyVolume.date,
          warningThresholdMB: thresholds.dailyVolumeWarningBytes / (1024 * 1024),
          criticalThresholdMB: thresholds.dailyVolumeCriticalBytes / (1024 * 1024)
        },
        supportingEvents: dailyVolume.events.map(e => e.eventId)
      }
    };
  }

  private buildEvidenceDescription(
    dailyVolume: UserDailyVolume,
    baseline: number | undefined,
    multiplier: number
  ): string {
    const volumeMB = (dailyVolume.totalBytes / (1024 * 1024)).toFixed(2);
    const baselineMB = baseline ? (baseline / (1024 * 1024)).toFixed(2) : '0';

    if (multiplier > 1 && baseline) {
      return `User ${dailyVolume.userEmail} downloaded ${volumeMB} MB on ${dailyVolume.date}, which is ${multiplier.toFixed(1)}x their baseline of ${baselineMB} MB/day. Total files: ${dailyVolume.fileCount}. Possible data exfiltration detected.`;
    }

    return `User ${dailyVolume.userEmail} downloaded ${volumeMB} MB on ${dailyVolume.date} across ${dailyVolume.fileCount} files. Volume exceeds normal thresholds. Possible data exfiltration detected.`;
  }

  calculateVolume(events: GoogleWorkspaceEvent[]): VolumeStatistics {
    let totalBytes = 0;
    let largestFile = 0;
    const fileCount = events.length;

    for (const event of events) {
      const fileSize = this.extractFileSize(event);
      totalBytes += fileSize;
      largestFile = Math.max(largestFile, fileSize);
    }

    const averageFileSize = fileCount > 0 ? totalBytes / fileCount : 0;

    return {
      totalBytes,
      fileCount,
      averageFileSize,
      largestFile
    };
  }

  private calculateConfidence(
    dailyVolume: UserDailyVolume,
    baseline: number | undefined,
    thresholds: ReturnType<typeof this.getVolumeThresholds>
  ): number {
    let confidence = 0;

    if (dailyVolume.totalBytes >= thresholds.dailyVolumeCriticalBytes) {
      confidence += 40;
    } else if (dailyVolume.totalBytes >= thresholds.dailyVolumeWarningBytes) {
      confidence += 20;
    }

    if (baseline && baseline > 0) {
      const multiplier = dailyVolume.totalBytes / baseline;
      if (multiplier >= 10) {
        confidence += 40;
      } else if (multiplier >= 5) {
        confidence += 30;
      } else if (multiplier >= thresholds.abnormalMultiplier) {
        confidence += 20;
      }
    }

    if (dailyVolume.fileCount >= thresholds.fileCountThreshold * 2) {
      confidence += 20;
    } else if (dailyVolume.fileCount >= thresholds.fileCountThreshold) {
      confidence += 10;
    }

    return Math.min(confidence, 100);
  }

  getVolumeThresholds() {
    return {
      dailyVolumeWarningBytes: 100 * 1024 * 1024,    // 100 MB/day
      dailyVolumeCriticalBytes: 500 * 1024 * 1024,   // 500 MB/day
      abnormalMultiplier: 3.0,                        // 3x average
      minimumEventsForBaseline: 7,                    // 7 days history
      fileCountThreshold: 100                         // 100+ files/day
    };
  }
}

export const dataVolumeDetector = new DataVolumeDetectorService();
