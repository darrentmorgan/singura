import { FeedbackRepositoryPostgres } from '../repositories/FeedbackRepository';
import { DetectionService } from './DetectionService';
import {
  UserFeedback,
  OrganizationDetectionConfig
} from '@saas-xray/shared-types/detection';

export class FeedbackLearningService {
  private feedbackRepo: FeedbackRepositoryPostgres;
  private detectionService: DetectionService;

  constructor() {
    this.feedbackRepo = new FeedbackRepositoryPostgres();
    this.detectionService = new DetectionService();
  }

  async processFeedbackForLearning(feedback: UserFeedback) {
    const organizationConfig = await this.getOrUpdateOrganizationConfig(feedback.organizationId);

    if (!organizationConfig.learningEnabled) return;

    const sensitivityAdjustment = this.calculateSensitivityAdjustment(feedback);
    await this.updateDetectionSensitivity(feedback.organizationId, sensitivityAdjustment);
  }

  private calculateSensitivityAdjustment(feedback: UserFeedback): number {
    switch (feedback.action) {
      case 'approve':
        return -0.05; // Reduce sensitivity slightly
      case 'flag':
        return 0.1;   // Increase sensitivity
      case 'ignore':
        return 0.05;  // Moderate sensitivity increase
      default:
        return 0;
    }
  }

  private async getOrUpdateOrganizationConfig(
    organizationId: string
  ): Promise<OrganizationDetectionConfig> {
    // Retrieve or create default config if not exists
    const defaultConfig: OrganizationDetectionConfig = {
      organizationId,
      baseRiskThreshold: 0.5,
      learningEnabled: true,
      customSensitivityFactors: {}
    };

    return this.feedbackRepo.updateOrganizationDetectionConfig(defaultConfig);
  }

  private async updateDetectionSensitivity(
    organizationId: string,
    adjustment: number
  ) {
    const config = await this.getOrUpdateOrganizationConfig(organizationId);

    const newBaseRiskThreshold = Math.max(
      0.1,
      Math.min(0.9, config.baseRiskThreshold + adjustment)
    );

    await this.feedbackRepo.updateOrganizationDetectionConfig({
      ...config,
      baseRiskThreshold: newBaseRiskThreshold
    });
  }
}