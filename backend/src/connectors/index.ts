/**
 * Platform Connectors Index
 * Exports all available platform connectors
 */

export * from './types';
export { SlackConnector, slackConnector } from './slack';
export { GoogleConnector, googleConnector } from './google';
export { MicrosoftConnector, microsoftConnector } from './microsoft';

// Re-export types for convenience
export type {
  PlatformConnector,
  OAuthCredentials,
  ConnectionResult,
  AutomationEvent,
  AuditLogEntry,
  PermissionCheck,
  DiscoveryResult,
  RiskAssessment,
  IntegrationStatus,
  CrossPlatformIntegration,
  ComplianceMapping,
  AutomationNetwork,
  PlatformMetrics,
  DataLineage
} from './types';