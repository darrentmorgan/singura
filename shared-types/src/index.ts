/**
 * SaaS X-Ray Shared Types - Main Export File
 * Exports all shared types for use across frontend and backend
 */

// Common utility types
export * from './utils/common';
export * from './utils/database';
export * from './utils/database-types';
export * from './utils/type-guards';
export * from './utils/job-types';
export * from './utils/socket-types';
export * from './utils/detection-patterns';
export * from './utils/google-api-client';
export * from './utils/cross-platform-correlation';
export * from './utils/admin-logging';
export * from './utils/oauth-credential-storage';
export * from './utils/memory-storage';

// Domain model types (includes AIProvider - 8 providers, most comprehensive)
export * from './models/automation';
export * from './models/feedback';

// Phase 1: AI Provider Detection (explicit exports to avoid conflicts)
export type {
  AIProviderPattern,
  AIProviderDetectionResult,
  DetectionMethod
} from './utils/ai-provider-patterns';
export { AI_PROVIDER_PATTERNS, detectAIProvider, extractModelName } from './utils/ai-provider-patterns';

// Detection metadata types (exported for backend detection services)
export type {
  DetectionMetadata,
  DetectionPattern,
  DetectionPatternType,
  CorrelationType,
  RelatedAutomation,
  CrossPlatformCorrelationData,
  DetectorConfiguration,
  RiskScoreHistoryEntry
} from './models/automation';
export * from './models/connection';
export * from './models/events';
export * from './models/user';

// API types
export * from './api/requests';
export * from './api/responses';
export * from './api/errors';
export * from './api/mock-data-toggle';

// OAuth types
export * from './oauth/credentials';
export * from './oauth/slack';
export * from './oauth/google';

// Platform-specific types
export * from './platforms/google';
export * from './platforms/microsoft';
export * from './platforms/google-workspace';

// AI Platform Detection types (Phase 0)
export * from './platforms/ai-platforms';
export * from './platforms/chatgpt-enterprise';
export * from './platforms/claude-enterprise';
export * from './platforms/gemini-workspace';

// AI Analysis types
export * from './ai-analysis/gpt5-analysis';

// Connector types
export * from './connectors/ai-platform-connector';

// Database adapter types
export * from './database/database-adapter';

// Type aliases for backward compatibility
export type { AutomationEventData as AutomationEvent } from './utils/socket-types';

// Platform-specific activity events
export interface SlackActivityEvent {
  eventId: string;
  platform: 'slack';
  timestamp: Date;
  userId: string;
  userEmail: string;
  eventType: string;
  resourceId: string;
  resourceType: string;
  actionDetails: {
    action: string;
    resourceName: string;
    metadata: Record<string, unknown>;
  };
}

// Chain risk assessment type alias
export type ChainRiskAssessment = {
  dataExposure: import('./utils/cross-platform-correlation').DataExposureRisk;
  complianceImpact: import('./utils/cross-platform-correlation').ComplianceImpact;
  businessImpact: import('./utils/cross-platform-correlation').BusinessImpactAssessment;
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
};