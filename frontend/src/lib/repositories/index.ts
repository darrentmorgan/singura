/**
 * Repository Index - Export all Supabase repositories
 * Maintains shared-types architecture compatibility
 */

export { BaseSupabaseRepository } from './base-supabase';
export { OrganizationRepository } from './organization';
export { PlatformConnectionRepository } from './platform-connection';
export { EncryptedCredentialRepository } from './encrypted-credential';
export { DiscoveredAutomationRepository } from './discovered-automation';

// Import for instances
import { OrganizationRepository } from './organization';
import { PlatformConnectionRepository } from './platform-connection';
import { EncryptedCredentialRepository } from './encrypted-credential';
import { DiscoveredAutomationRepository } from './discovered-automation';

// Repository instances for use throughout the application
export const organizationRepository = new OrganizationRepository();
export const platformConnectionRepository = new PlatformConnectionRepository();
export const encryptedCredentialRepository = new EncryptedCredentialRepository();
export const discoveredAutomationRepository = new DiscoveredAutomationRepository();

// Repository factory for dependency injection
export class RepositoryFactory {
  static createOrganizationRepository(): OrganizationRepository {
    return new OrganizationRepository();
  }

  static createPlatformConnectionRepository(): PlatformConnectionRepository {
    return new PlatformConnectionRepository();
  }

  static createEncryptedCredentialRepository(): EncryptedCredentialRepository {
    return new EncryptedCredentialRepository();
  }

  static createDiscoveredAutomationRepository(): DiscoveredAutomationRepository {
    return new DiscoveredAutomationRepository();
  }
}

// Type exports for repository interfaces
export type {
  Organization,
  PlatformConnection,
  EncryptedCredential,
  DiscoveredAutomation,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  CreatePlatformConnectionInput,
  UpdatePlatformConnectionInput,
  CreateEncryptedCredentialInput,
  UpdateEncryptedCredentialInput,
  OrganizationFilters,
  PlatformConnectionFilters,
  EncryptedCredentialFilters
} from '../../types/database';