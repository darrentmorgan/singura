/**
 * Database repositories index
 * Centralized export for all repository classes and instances
 */

// Import repository instances for internal use
import { organizationRepository } from './organization';
import { platformConnectionRepository } from './platform-connection';
import { encryptedCredentialRepository } from './encrypted-credential';
import { auditLogRepository } from './audit-log';
import { discoveredAutomationRepository } from './discovered-automation';
import { oauthScopeLibraryRepository } from './oauth-scope-library';

export { BaseRepository } from './base';
export { OrganizationRepository, organizationRepository } from './organization';
export { PlatformConnectionRepository, platformConnectionRepository } from './platform-connection';
export { EncryptedCredentialRepository, encryptedCredentialRepository } from './encrypted-credential';
export { AuditLogRepository, auditLogRepository } from './audit-log';
export { DiscoveredAutomationRepository, discoveredAutomationRepository } from './discovered-automation';
export { OAuthScopeLibraryRepository, oauthScopeLibraryRepository } from './oauth-scope-library';
export type { OAuthScopeLibrary } from './oauth-scope-library';

// Legacy exports for backward compatibility
export { discoveredAutomationRepository as discoveredAutomationsRepository } from './discovered-automation';

// Re-export repository instances for easy access
export const repositories = {
  organization: organizationRepository,
  platformConnection: platformConnectionRepository,
  encryptedCredential: encryptedCredentialRepository,
  auditLog: auditLogRepository,
  discoveredAutomation: discoveredAutomationRepository,
  oauthScopeLibrary: oauthScopeLibraryRepository
} as const;

export type Repositories = typeof repositories;