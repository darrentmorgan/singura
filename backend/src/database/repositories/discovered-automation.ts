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

  /**
   * Update detection metadata for an automation
   * Uses helper function from migration 006
   *
   * @param automationId - Automation ID
   * @param detectionMetadata - Detection metadata object
   */
  async updateDetectionMetadata(
    automationId: string,
    detectionMetadata: any
  ): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET detection_metadata = $2,
          updated_at = NOW()
      WHERE id = $1
    `;

    await db.query(query, [automationId, JSON.stringify(detectionMetadata)]);
  }

  /**
   * Append risk score to history
   * Uses helper function from migration 006
   *
   * @param automationId - Automation ID
   * @param riskScore - Risk score (0-100)
   * @param riskLevel - Risk level classification
   * @param riskFactors - Risk factors array
   * @param trigger - What triggered this assessment
   */
  async appendRiskScoreHistory(
    automationId: string,
    riskScore: number,
    riskLevel: string,
    riskFactors: any[],
    trigger: string
  ): Promise<void> {
    const query = `
      SELECT append_risk_score_history($1, $2, $3, $4, $5)
    `;

    await db.query(query, [
      automationId,
      riskScore,
      riskLevel,
      JSON.stringify(riskFactors),
      trigger
    ]);
  }

  /**
   * Find automations by AI provider
   *
   * @param organizationId - Organization ID
   * @param aiProvider - AI provider name
   * @param minConfidence - Minimum confidence threshold (optional)
   * @returns Automations with matching AI provider
   */
  async findByAIProvider(
    organizationId: string,
    aiProvider: string,
    minConfidence?: number
  ): Promise<DiscoveredAutomation[]> {
    let query = `
      SELECT *
      FROM ${this.tableName}
      WHERE organization_id = $1
        AND detection_metadata->>'aiProvider' IS NOT NULL
        AND detection_metadata->'aiProvider'->>'provider' = $2
    `;

    const values: any[] = [organizationId, aiProvider];

    if (minConfidence !== undefined) {
      query += ` AND (detection_metadata->'aiProvider'->>'confidence')::numeric >= $3`;
      values.push(minConfidence);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await db.query<DiscoveredAutomation>(query, values);
    return result.rows;
  }

  /**
   * Find automations with high-confidence AI detection
   *
   * @param organizationId - Organization ID
   * @param minConfidence - Minimum confidence threshold (default: 80)
   * @returns Automations with high-confidence AI detection
   */
  async findHighConfidenceAIDetections(
    organizationId: string,
    minConfidence: number = 80
  ): Promise<DiscoveredAutomation[]> {
    const query = `
      SELECT *
      FROM ${this.tableName}
      WHERE organization_id = $1
        AND detection_metadata->>'aiProvider' IS NOT NULL
        AND (detection_metadata->'aiProvider'->>'confidence')::numeric >= $2
      ORDER BY (detection_metadata->'aiProvider'->>'confidence')::numeric DESC,
               created_at DESC
    `;

    const result = await db.query<DiscoveredAutomation>(query, [organizationId, minConfidence]);
    return result.rows;
  }

  /**
   * Get detection statistics for an organization
   *
   * @param organizationId - Organization ID
   * @returns Detection statistics summary
   */
  async getDetectionStatistics(organizationId: string): Promise<{
    totalWithDetection: number;
    byProvider: Record<string, number>;
    averageConfidence: number;
    highConfidenceCount: number;
  }> {
    // Count automations by AI provider
    const providerQuery = `
      SELECT
        detection_metadata->'aiProvider'->>'provider' as provider,
        COUNT(*) as count,
        AVG((detection_metadata->'aiProvider'->>'confidence')::numeric) as avg_confidence
      FROM ${this.tableName}
      WHERE organization_id = $1
        AND detection_metadata->>'aiProvider' IS NOT NULL
      GROUP BY detection_metadata->'aiProvider'->>'provider'
    `;

    const providerResult = await db.query<{
      provider: string;
      count: string;
      avg_confidence: string;
    }>(providerQuery, [organizationId]);

    // Count high confidence detections (>= 80)
    const highConfidenceQuery = `
      SELECT COUNT(*) as count
      FROM ${this.tableName}
      WHERE organization_id = $1
        AND detection_metadata->>'aiProvider' IS NOT NULL
        AND (detection_metadata->'aiProvider'->>'confidence')::numeric >= 80
    `;

    const highConfidenceResult = await db.query<{ count: string }>(highConfidenceQuery, [organizationId]);

    const byProvider: Record<string, number> = {};
    let totalCount = 0;
    let totalConfidence = 0;

    for (const row of providerResult.rows) {
      const count = parseInt(row.count, 10);
      byProvider[row.provider] = count;
      totalCount += count;
      totalConfidence += parseFloat(row.avg_confidence) * count;
    }

    return {
      totalWithDetection: totalCount,
      byProvider,
      averageConfidence: totalCount > 0 ? Math.round(totalConfidence / totalCount) : 0,
      highConfidenceCount: parseInt(highConfidenceResult.rows[0]?.count || '0', 10)
    };
  }

  /**
   * Find automations with specific detection patterns
   *
   * @param organizationId - Organization ID
   * @param patternType - Pattern type to filter by
   * @param minConfidence - Minimum confidence threshold (optional)
   * @returns Automations with matching detection patterns
   */
  async findByDetectionPattern(
    organizationId: string,
    patternType: string,
    minConfidence?: number
  ): Promise<DiscoveredAutomation[]> {
    let query = `
      SELECT da.*
      FROM ${this.tableName} da,
           jsonb_array_elements(da.detection_metadata->'detectionPatterns') AS pattern
      WHERE da.organization_id = $1
        AND pattern->>'patternType' = $2
    `;

    const values: any[] = [organizationId, patternType];

    if (minConfidence !== undefined) {
      query += ` AND (pattern->>'confidence')::numeric >= $3`;
      values.push(minConfidence);
    }

    query += ` ORDER BY da.created_at DESC`;

    const result = await db.query<DiscoveredAutomation>(query, values);
    return result.rows;
  }

  /**
   * Get recent automations for an organization (for ML training)
   *
   * @param organizationId - Organization ID
   * @param days - Number of days to look back (default: 7)
   * @returns Recent automations as AutomationEvents
   */
  async getRecentByOrganization(
    organizationId: string,
    days: number = 7
  ): Promise<any[]> {
    const query = `
      SELECT
        id,
        organization_id as "organizationId",
        platform_connection_id as "platformConnectionId",
        external_id as "externalId",
        name,
        description,
        automation_type as type,
        status,
        trigger_type as "triggerType",
        actions,
        permissions_required as permissions,
        data_access_patterns as "dataAccessPatterns",
        owner_info as "ownerInfo",
        last_modified_at as "lastModifiedAt",
        last_triggered_at as "lastTriggered",
        execution_frequency as "executionFrequency",
        platform_metadata as metadata,
        created_at as "createdAt",
        updated_at as "updatedAt",
        pc.platform_type as platform
      FROM ${this.tableName} da
      LEFT JOIN platform_connections pc ON da.platform_connection_id = pc.id
      WHERE da.organization_id = $1
        AND da.created_at >= NOW() - INTERVAL '${days} days'
        AND da.is_active = true
      ORDER BY da.created_at DESC
    `;

    const result = await db.query(query, [organizationId]);
    return result.rows;
  }
}

// Export singleton instance
export const discoveredAutomationRepository = new DiscoveredAutomationRepository();
