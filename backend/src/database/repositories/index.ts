/**
 * Database repositories index
 * Centralized export for all repository classes and instances
 */

export { BaseRepository } from './base';
export { OrganizationRepository, organizationRepository } from './organization';
export { PlatformConnectionRepository, platformConnectionRepository } from './platform-connection';
export { EncryptedCredentialRepository, encryptedCredentialRepository } from './encrypted-credential';
export { AuditLogRepository, auditLogRepository } from './audit-log';

// Re-export repository instances for easy access
export const repositories = {
  organization: organizationRepository,
  platformConnection: platformConnectionRepository,
  encryptedCredential: encryptedCredentialRepository,
  auditLog: auditLogRepository
} as const;

export type Repositories = typeof repositories;