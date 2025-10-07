/**
 * Discovered Automation Repository
 * Handles CRUD operations for discovered_automations table
 */

import { BaseRepository } from './base';
import { DiscoveredAutomation } from '../../types/database';
import { db } from '../pool';

export interface CreateDiscoveredAutomationInput extends Record<string, unknown> {
  organization_id: string;
  platform_connection_id: string;
  discovery_run_id: string;
  external_id: string;
  name: string;
  description?: string;
  automation_type: string;
  status?: string;
  trigger_type?: string;
  actions?: any[];
  permissions_required?: string[];
  data_access_patterns?: any[];
  owner_info?: any;
  last_modified_at?: Date;
  last_triggered_at?: Date;
  execution_frequency?: string;
  platform_metadata?: any;
  is_active?: boolean;
}

export interface UpdateDiscoveredAutomationInput extends Record<string, unknown> {
  name?: string;
  description?: string;
  status?: string;
  last_seen_at?: Date;
  platform_metadata?: any;
  is_active?: boolean;
}

export interface DiscoveredAutomationFilters {
  organization_id?: string;
  platform_connection_id?: string;
  automation_type?: string;
  status?: string;
  is_active?: boolean;
}

export class DiscoveredAutomationRepository extends BaseRepository<
  DiscoveredAutomation,
  CreateDiscoveredAutomationInput,
  UpdateDiscoveredAutomationInput,
  DiscoveredAutomationFilters
> {
  protected db = db;

  constructor() {
    super('discovered_automations');
  }

  /**
   * Find automations with filters (custom implementation)
   * Includes platform_type via LEFT JOIN with platform_connections
   */
  async findManyCustom(filters: DiscoveredAutomationFilters = {}): Promise<{
    success: boolean;
    data: (DiscoveredAutomation & { platform_type?: string | null })[];
    total: number;
  }> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.organization_id) {
      conditions.push('da.organization_id = $' + paramIndex++);
      values.push(filters.organization_id);
    }

    if (filters.platform_connection_id) {
      conditions.push('da.platform_connection_id = $' + paramIndex++);
      values.push(filters.platform_connection_id);
    }

    if (filters.automation_type) {
      conditions.push('da.automation_type = $' + paramIndex++);
      values.push(filters.automation_type);
    }

    if (filters.status) {
      conditions.push('da.status = $' + paramIndex++);
      values.push(filters.status);
    }

    if (filters.is_active !== undefined) {
      conditions.push('da.is_active = $' + paramIndex++);
      values.push(filters.is_active);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT
        da.*,
        pc.platform_type
      FROM ${this.tableName} da
      LEFT JOIN platform_connections pc ON pc.id = da.platform_connection_id
      ${whereClause}
      ORDER BY da.last_seen_at DESC, da.created_at DESC
    `;

    const result = await db.query<DiscoveredAutomation & { platform_type?: string | null }>(query, values);
    return {
      success: true,
      data: result.rows,
      total: result.rows.length
    };
  }

  /**
   * Get statistics for automations by organization
   */
  async getStatsByOrganization(organizationId: string): Promise<{
    total_automations: string;
    active: string;
    inactive: string;
    error: string;
    unknown: string;
    bots: string;
    workflows: string;
    integrations: string;
    webhooks: string;
  }> {
    const query = `
      SELECT
        COUNT(*) as total_automations,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'inactive') as inactive,
        COUNT(*) FILTER (WHERE status = 'error') as error,
        COUNT(*) FILTER (WHERE status = 'unknown') as unknown,
        COUNT(*) FILTER (WHERE automation_type = 'bot') as bots,
        COUNT(*) FILTER (WHERE automation_type = 'workflow') as workflows,
        COUNT(*) FILTER (WHERE automation_type = 'integration') as integrations,
        COUNT(*) FILTER (WHERE automation_type = 'webhook') as webhooks
      FROM ${this.tableName}
      WHERE organization_id = $1 AND is_active = true
    `;

    const result = await db.query<{
      total_automations: string;
      active: string;
      inactive: string;
      error: string;
      unknown: string;
      bots: string;
      workflows: string;
      integrations: string;
      webhooks: string;
    }>(query, [organizationId]);

    return result.rows[0] || {
      total_automations: '0',
      active: '0',
      inactive: '0',
      error: '0',
      unknown: '0',
      bots: '0',
      workflows: '0',
      integrations: '0',
      webhooks: '0'
    };
  }

  /**
   * Get automations by platform for an organization
   */
  async getByPlatformForOrganization(organizationId: string): Promise<Array<{
    platform_type: string;
    count: string;
  }>> {
    const query = `
      SELECT
        pc.platform_type,
        COUNT(da.id) as count
      FROM ${this.tableName} da
      JOIN platform_connections pc ON da.platform_connection_id = pc.id
      WHERE da.organization_id = $1 AND da.is_active = true
      GROUP BY pc.platform_type
    `;

    const result = await db.query<{
      platform_type: string;
      count: string;
    }>(query, [organizationId]);

    return result.rows;
  }
}

// Export singleton instance
export const discoveredAutomationRepository = new DiscoveredAutomationRepository();
