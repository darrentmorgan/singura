/**
 * Organization Metadata Repository
 * Manages organization-level metadata storage and retrieval
 */

import { pool } from '../index';
import { OrganizationMetadata } from '@singura/shared-types';

export class OrganizationMetadataRepository {
  /**
   * Get organization metadata by organization ID
   */
  async findByOrganizationId(organizationId: string): Promise<OrganizationMetadata | null> {
    try {
      const query = `
        SELECT
          id,
          organization_id,
          organization_size,
          industry_vertical,
          employee_count,
          company_name,
          company_website,
          timezone,
          country,
          state_province,
          metadata,
          created_at,
          updated_at
        FROM organization_metadata
        WHERE organization_id = $1
      `;

      const result = await pool.query(query, [organizationId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0] as any;
      return {
        id: row.id,
        organizationId: row.organization_id,
        organizationSize: row.organization_size || 'unknown',
        industryVertical: row.industry_vertical,
        employeeCount: row.employee_count,
        companyName: row.company_name,
        companyWebsite: row.company_website,
        timezone: row.timezone,
        country: row.country,
        stateProvince: row.state_province,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      console.error('Error fetching organization metadata:', error);
      throw error;
    }
  }

  /**
   * Create or update organization metadata
   */
  async upsert(organizationId: string, metadata: Partial<OrganizationMetadata>): Promise<OrganizationMetadata> {
    try {
      const query = `
        INSERT INTO organization_metadata (
          organization_id,
          organization_size,
          industry_vertical,
          employee_count,
          company_name,
          company_website,
          timezone,
          country,
          state_province,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (organization_id) DO UPDATE SET
          organization_size = COALESCE(EXCLUDED.organization_size, organization_metadata.organization_size),
          industry_vertical = COALESCE(EXCLUDED.industry_vertical, organization_metadata.industry_vertical),
          employee_count = COALESCE(EXCLUDED.employee_count, organization_metadata.employee_count),
          company_name = COALESCE(EXCLUDED.company_name, organization_metadata.company_name),
          company_website = COALESCE(EXCLUDED.company_website, organization_metadata.company_website),
          timezone = COALESCE(EXCLUDED.timezone, organization_metadata.timezone),
          country = COALESCE(EXCLUDED.country, organization_metadata.country),
          state_province = COALESCE(EXCLUDED.state_province, organization_metadata.state_province),
          metadata = COALESCE(EXCLUDED.metadata, organization_metadata.metadata),
          updated_at = NOW()
        RETURNING *
      `;

      const values = [
        organizationId,
        metadata.organizationSize || null,
        metadata.industryVertical || null,
        metadata.employeeCount || null,
        metadata.companyName || null,
        metadata.companyWebsite || null,
        metadata.timezone || null,
        metadata.country || null,
        metadata.stateProvince || null,
        JSON.stringify(metadata.metadata || {})
      ];

      const result = await pool.query(query, values);
      const row = result.rows[0] as any;

      return {
        id: row.id,
        organizationId: row.organization_id,
        organizationSize: row.organization_size || 'unknown',
        industryVertical: row.industry_vertical,
        employeeCount: row.employee_count,
        companyName: row.company_name,
        companyWebsite: row.company_website,
        timezone: row.timezone,
        country: row.country,
        stateProvince: row.state_province,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      console.error('Error upserting organization metadata:', error);
      throw error;
    }
  }

  /**
   * Update specific fields in organization metadata
   */
  async update(organizationId: string, updates: Partial<OrganizationMetadata>): Promise<void> {
    try {
      const allowedFields = [
        'organization_size',
        'industry_vertical',
        'employee_count',
        'company_name',
        'company_website',
        'timezone',
        'country',
        'state_province',
        'metadata'
      ];

      const setClause: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      // Build dynamic SET clause
      Object.entries(updates).forEach(([key, value]) => {
        const dbField = this.camelToSnake(key);
        if (allowedFields.includes(dbField)) {
          setClause.push(`${dbField} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      if (setClause.length === 0) {
        return; // Nothing to update
      }

      // Add updated_at
      setClause.push(`updated_at = NOW()`);

      // Add organization_id as last parameter
      values.push(organizationId);

      const query = `
        UPDATE organization_metadata
        SET ${setClause.join(', ')}
        WHERE organization_id = $${paramCount}
      `;

      await pool.query(query, values);
    } catch (error) {
      console.error('Error updating organization metadata:', error);
      throw error;
    }
  }

  /**
   * Delete organization metadata
   */
  async delete(organizationId: string): Promise<void> {
    try {
      const query = 'DELETE FROM organization_metadata WHERE organization_id = $1';
      await pool.query(query, [organizationId]);
    } catch (error) {
      console.error('Error deleting organization metadata:', error);
      throw error;
    }
  }

  /**
   * Get connection statistics for an organization
   */
  async getConnectionStats(connectionId: string, organizationId: string): Promise<{
    automationCount: number;
    lastScanAt: Date | null;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  }> {
    try {
      // Get automation count and risk levels
      const statsQuery = `
        SELECT
          COUNT(*) as automation_count,
          MAX(dr.completed_at) as last_scan_at,
          COALESCE(
            CASE
              WHEN COUNT(CASE WHEN da.risk_score >= 70 THEN 1 END) > 0 THEN 'critical'
              WHEN COUNT(CASE WHEN da.risk_score >= 50 THEN 1 END) > 0 THEN 'high'
              WHEN COUNT(CASE WHEN da.risk_score >= 30 THEN 1 END) > 0 THEN 'medium'
              ELSE 'low'
            END, 'low'
          ) as risk_level
        FROM discovered_automations da
        LEFT JOIN discovery_runs dr ON da.discovery_run_id = dr.id
        WHERE da.platform_connection_id = $1
          AND da.organization_id = $2
      `;

      const result = await pool.query(statsQuery, [connectionId, organizationId]);
      const row = result.rows[0] as any;

      return {
        automationCount: parseInt(row.automation_count) || 0,
        lastScanAt: row.last_scan_at ? new Date(row.last_scan_at) : null,
        riskLevel: row.risk_level || 'low'
      };
    } catch (error) {
      console.error('Error fetching connection stats:', error);
      return {
        automationCount: 0,
        lastScanAt: null,
        riskLevel: 'low'
      };
    }
  }

  /**
   * Convert camelCase to snake_case
   */
  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

// Export singleton instance
export const organizationMetadataRepository = new OrganizationMetadataRepository();