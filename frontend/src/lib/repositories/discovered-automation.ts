/**
 * Discovered Automation Repository - Supabase Implementation
 * Handles automation discovery and risk assessment data
 */

import { BaseSupabaseRepository } from './base-supabase';
import type {
  DiscoveredAutomation,
  CreateAutomationInput,
  UpdateAutomationInput,
  AutomationFilters,
  AutomationType,
  AutomationStatus,
  RiskLevel
} from '../../types/database';

// Define missing types locally (will be replaced with @saas-xray/shared-types)
interface CreateAutomationInput extends Record<string, unknown> {
  organization_id: string;
  platform_connection_id: string;
  discovery_run_id: string;
  external_id: string;
  name: string;
  description?: string;
  automation_type: AutomationType;
  status: AutomationStatus;
  trigger_type?: string;
  actions: string[];
  permissions_required: string[];
  data_access_patterns: string[];
  owner_info: any;
  last_modified_at?: Date;
  last_triggered_at?: Date;
  execution_frequency?: string;
  platform_metadata: any;
  is_active?: boolean;
}

interface UpdateAutomationInput extends Record<string, unknown> {
  name?: string;
  description?: string;
  automation_type?: AutomationType;
  status?: AutomationStatus;
  trigger_type?: string;
  actions?: string[];
  permissions_required?: string[];
  data_access_patterns?: string[];
  owner_info?: any;
  last_modified_at?: Date;
  last_triggered_at?: Date;
  execution_frequency?: string;
  platform_metadata?: any;
  is_active?: boolean;
  last_seen_at?: Date;
}

interface AutomationFilters {
  organization_id?: string;
  platform_connection_id?: string;
  automation_type?: AutomationType;
  status?: AutomationStatus;
  is_active?: boolean;
  risk_level?: RiskLevel;
  owner_info?: any;
  last_seen_after?: Date;
  last_seen_before?: Date;
}

export class DiscoveredAutomationRepository extends BaseSupabaseRepository<
  DiscoveredAutomation,
  CreateAutomationInput,
  UpdateAutomationInput,
  AutomationFilters
> {
  constructor() {
    super('discovered_automations', 'id');
  }

  /**
   * Find automations by organization
   */
  async findByOrganizationId(organizationId: string): Promise<DiscoveredAutomation[]> {
    const result = await this.findMany({
      organization_id: organizationId,
      is_active: true
    } as AutomationFilters);
    return result.data;
  }

  /**
   * Find automations by platform connection
   */
  async findByConnection(connectionId: string): Promise<DiscoveredAutomation[]> {
    const result = await this.findMany({
      platform_connection_id: connectionId,
      is_active: true
    } as AutomationFilters);
    return result.data;
  }

  /**
   * Find automation by external ID
   */
  async findByExternalId(
    connectionId: string,
    externalId: string
  ): Promise<DiscoveredAutomation | null> {
    return this.findOne({
      platform_connection_id: connectionId,
      external_id: externalId
    } as AutomationFilters);
  }

  /**
   * Get automations by risk level
   */
  async getByRiskLevel(
    organizationId: string,
    riskLevel: RiskLevel
  ): Promise<DiscoveredAutomation[]> {
    return this.executeRPC('get_automations_by_risk_level', {
      organization_id: organizationId,
      risk_level: riskLevel
    });
  }

  /**
   * Get high-risk automations for organization
   */
  async getHighRiskAutomations(organizationId: string): Promise<DiscoveredAutomation[]> {
    return this.getByRiskLevel(organizationId, 'high');
  }

  /**
   * Get automation statistics by type
   */
  async getStatisticsByType(organizationId: string): Promise<Array<{
    automation_type: AutomationType;
    total_count: number;
    active_count: number;
    high_risk_count: number;
    last_discovered: Date | null;
  }>> {
    return this.executeRPC('get_automation_statistics_by_type', {
      organization_id: organizationId
    });
  }

  /**
   * Get automation timeline for organization
   */
  async getDiscoveryTimeline(
    organizationId: string,
    days: number = 30
  ): Promise<Array<{
    date: Date;
    total_discovered: number;
    new_automations: number;
    updated_automations: number;
  }>> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.executeRPC('get_automation_discovery_timeline', {
      organization_id: organizationId,
      start_date: startDate.toISOString()
    });
  }

  /**
   * Update automation last seen timestamp
   */
  async updateLastSeen(automationId: string): Promise<DiscoveredAutomation | null> {
    return this.update(automationId, {
      last_seen_at: new Date()
    } as UpdateAutomationInput);
  }

  /**
   * Mark automation as inactive
   */
  async markInactive(automationId: string): Promise<DiscoveredAutomation | null> {
    return this.update(automationId, {
      is_active: false,
      status: 'inactive'
    } as UpdateAutomationInput);
  }

  /**
   * Get automations with stale data (not seen recently)
   */
  async getStaleAutomations(
    organizationId: string,
    daysStale: number = 7
  ): Promise<DiscoveredAutomation[]> {
    const staleThreshold = new Date(Date.now() - daysStale * 24 * 60 * 60 * 1000);
    const result = await this.findMany({
      organization_id: organizationId,
      is_active: true,
      last_seen_before: staleThreshold
    } as AutomationFilters);
    return result.data;
  }

  /**
   * Get automations by owner
   */
  async getByOwner(
    organizationId: string,
    ownerEmail: string
  ): Promise<DiscoveredAutomation[]> {
    return this.executeRPC('get_automations_by_owner', {
      organization_id: organizationId,
      owner_email: ownerEmail
    });
  }

  /**
   * Get orphaned automations (no clear owner)
   */
  async getOrphanedAutomations(organizationId: string): Promise<DiscoveredAutomation[]> {
    return this.executeRPC('get_orphaned_automations', {
      organization_id: organizationId
    });
  }

  /**
   * Get automation summary for dashboard
   */
  async getDashboardSummary(organizationId: string): Promise<{
    total_automations: number;
    active_automations: number;
    high_risk_count: number;
    critical_risk_count: number;
    recent_discoveries: number;
    platforms_connected: number;
    last_discovery_run: Date | null;
  }> {
    const result = await this.executeRPC('get_automation_dashboard_summary', {
      organization_id: organizationId
    });

    return Array.isArray(result) && result.length > 0 && typeof result[0] === 'object'
      ? (result[0] as any)
      : {
          total_automations: 0,
          active_automations: 0,
          high_risk_count: 0,
          critical_risk_count: 0,
          recent_discoveries: 0,
          platforms_connected: 0,
          last_discovery_run: null
        };
  }

  /**
   * Search automations by name or description
   */
  async searchAutomations(
    organizationId: string,
    searchTerm: string,
    filters?: Partial<AutomationFilters>
  ): Promise<DiscoveredAutomation[]> {
    return this.executeRPC('search_automations', {
      organization_id: organizationId,
      search_term: searchTerm,
      filters: filters || {}
    });
  }

  /**
   * Get automation compliance status
   */
  async getComplianceStatus(
    organizationId: string,
    framework: string = 'SOC2'
  ): Promise<Array<{
    automation_id: string;
    automation_name: string;
    compliance_status: string;
    issues: string[];
    last_assessed: Date | null;
  }>> {
    return this.executeRPC('get_automation_compliance_status', {
      organization_id: organizationId,
      framework
    });
  }

  /**
   * Update automation platform metadata
   */
  async updatePlatformMetadata(
    automationId: string,
    metadata: Record<string, unknown>
  ): Promise<DiscoveredAutomation | null> {
    const existing = await this.findById(automationId);
    if (!existing) return null;

    const updatedMetadata = {
      ...existing.platform_metadata,
      ...metadata
    };

    return this.update(automationId, {
      platform_metadata: updatedMetadata
    } as UpdateAutomationInput);
  }
}