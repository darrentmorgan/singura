/**
 * Organization Repository - Supabase Implementation
 * Maintains identical API to backend repository
 */

import { BaseSupabaseRepository } from './base-supabase';
import type {
  Organization,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  OrganizationFilters
} from '../../types/database';

export class OrganizationRepository extends BaseSupabaseRepository<
  Organization,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  OrganizationFilters
> {
  constructor() {
    super('organizations', 'id');
  }

  /**
   * Find organization by slug
   * Returns Organization | null to maintain pattern
   */
  async findBySlug(slug: string): Promise<Organization | null> {
    return this.findOne({ slug } as OrganizationFilters);
  }

  /**
   * Find organization by domain
   * Returns Organization | null to maintain pattern
   */
  async findByDomain(domain: string): Promise<Organization | null> {
    return this.findOne({ domain } as OrganizationFilters);
  }

  /**
   * Get active organizations with connection counts
   */
  async getActiveWithConnectionCounts(): Promise<Array<Organization & { connection_count: number }>> {
    return this.executeRPC('get_active_organizations_with_connections');
  }

  /**
   * Validate organization exists and is active
   */
  async validateActiveOrganization(organizationId: string): Promise<boolean> {
    const org = await this.findById(organizationId);
    return org !== null && org.is_active;
  }

  /**
   * Get organizations approaching connection limits
   */
  async getApproachingLimits(threshold: number = 0.8): Promise<Organization[]> {
    return this.executeRPC('get_organizations_approaching_limits', { threshold });
  }

  /**
   * Update organization settings
   */
  async updateSettings(
    organizationId: string, 
    settings: Partial<Organization['settings']>
  ): Promise<Organization | null> {
    const existing = await this.findById(organizationId);
    if (!existing) return null;

    const updatedSettings = {
      ...existing.settings,
      ...settings
    };

    return this.update(organizationId, { settings: updatedSettings } as UpdateOrganizationInput);
  }

  /**
   * Deactivate organization and related resources
   */
  async deactivate(organizationId: string): Promise<boolean> {
    const result = await this.executeRPC('deactivate_organization', { 
      organization_id: organizationId 
    });
    return Array.isArray(result) && result.length > 0;
  }

  /**
   * Get organization statistics
   */
  async getStatistics(organizationId: string): Promise<{
    total_connections: number;
    active_connections: number;
    total_automations: number;
    high_risk_automations: number;
    last_discovery_run: Date | null;
  } | null> {
    const result = await this.executeRPC('get_organization_statistics', {
      organization_id: organizationId
    });
    return Array.isArray(result) && result.length > 0 ? result[0] : null;
  }
}