/**
 * Database repositories index
 * Centralized export for all repository classes and instances
 */

// Import repository instances for internal use
import { organizationRepository } from './organization';
import { platformConnectionRepository } from './platform-connection';
import { encryptedCredentialRepository } from './encrypted-credential';
import { auditLogRepository } from './audit-log';

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