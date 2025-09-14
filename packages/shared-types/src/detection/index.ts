import { User } from '../user';
import { Organization } from '../organization';

export type ShadowNetworkDetectionAction =
  | 'approve'
  | 'ignore'
  | 'flag';

export interface ShadowNetworkDetection {
  id: string;
  detectedAt: Date;
  platform: string;
  automationType: string;
  riskScore: number;
  details: Record<string, unknown>;
}

export interface UserFeedback {
  id: string;
  detectionId: string;
  userId: string;
  organizationId: string;
  action: ShadowNetworkDetectionAction;
  comment?: string;
  timestamp: Date;
}

export interface LearningFeedbackMetrics {
  totalDetections: number;
  truePositives: number;
  falsePositives: number;
  accuracyRate: number;
  sensitivityScore: number;
}

export interface OrganizationDetectionConfig {
  organizationId: string;
  baseRiskThreshold: number;
  customSensitivityFactors: Record<string, number>;
  learningEnabled: boolean;
}

export interface FeedbackEffectivenessReport {
  organizationId: string;
  metrics: LearningFeedbackMetrics;
  trends: {
    accuracyOverTime: Array<{ timestamp: Date; accuracy: number }>;
    falsePositiveReduction: Array<{ timestamp: Date; reductionRate: number }>;
  };
}

export interface FeedbackRepository {
  submitFeedback(feedback: UserFeedback): Promise<UserFeedback>;
  getFeedbackForDetection(detectionId: string): Promise<UserFeedback[]>;
  getOrganizationFeedbackMetrics(organizationId: string): Promise<FeedbackEffectivenessReport>;
  updateOrganizationDetectionConfig(config: OrganizationDetectionConfig): Promise<OrganizationDetectionConfig>;
}