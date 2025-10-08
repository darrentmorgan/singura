/**
 * RL-Enhanced Velocity Detector
 * Uses reinforcement learning optimized thresholds
 */

import {
  VelocityDetector,
  GoogleWorkspaceEvent,
  TemporalPattern
} from '@saas-xray/shared-types';
import { VelocityDetectorService } from './velocity-detector.service';
import { reinforcementLearningService } from '../reinforcement-learning.service';

/**
 * Velocity detector with RL-optimized thresholds
 */
export class RLVelocityDetectorService extends VelocityDetectorService {
  private organizationId: string;
  private cachedThresholds?: ReturnType<VelocityDetectorService['getVelocityThresholds']>;

  constructor(organizationId: string) {
    super();
    this.organizationId = organizationId;
  }

  /**
   * Initialize with RL-optimized thresholds
   */
  async initialize(): Promise<void> {
    try {
      const optimized = await reinforcementLearningService.getOptimizedThresholds(this.organizationId);
      this.cachedThresholds = optimized.velocityThresholds;
      console.log(`✅ RL thresholds loaded for ${this.organizationId}:`, this.cachedThresholds);
    } catch (error) {
      console.warn(`⚠️ Failed to load RL thresholds for ${this.organizationId}, using defaults`);
      this.cachedThresholds = super.getVelocityThresholds();
    }
  }

  /**
   * Get velocity thresholds (RL-optimized or default)
   */
  getVelocityThresholds() {
    if (this.cachedThresholds) {
      return this.cachedThresholds;
    }

    // Fallback to default if not initialized
    return super.getVelocityThresholds();
  }

  /**
   * Refresh thresholds from RL service
   */
  async refreshThresholds(): Promise<void> {
    await this.initialize();
  }
}

/**
 * Factory function to create RL-enabled velocity detector
 */
export async function createRLVelocityDetector(organizationId: string): Promise<RLVelocityDetectorService> {
  const detector = new RLVelocityDetectorService(organizationId);
  await detector.initialize();
  return detector;
}
