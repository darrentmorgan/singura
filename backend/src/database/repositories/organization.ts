/**
 * Organization repository for managing multi-tenant organizations
 */

import { BaseRepository } from './base';
import {
  Organization,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  OrganizationFilters,
  ValidationError
} from '../../types/database';
import { db } from '../pool';

export class OrganizationRepository extends BaseRepository<
  Organization,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  OrganizationFilters
> {
  constructor() {
    super('organizations');
  }

  /**
   * Create a new organization with validation
   */
  async create(data: CreateOrganizationInput): Promise<Organization> {
    // Validate required fields
    const errors = this.validateRequiredFields(data, ['name', 'slug']);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.map(e => e.message).join(', ')}`);
    }

    // Check for duplicate slug
    const existingBySlug = await this.findBySlug(data.slug);
    if (existingBySlug) {
      throw new Error(`Organization with slug '${data.slug}' already exists`);
    }

    // Check for duplicate domain if provided
    if (data.domain) {
      const existingByDomain = await this.findByDomain(data.domain);
      if (existingByDomain) {
        throw new Error(`Organization with domain '${data.domain}' already exists`);
      }
    }

    return super.create({
      ...data,
      settings: data.settings || {},
      plan_tier: data.plan_tier || 'free',
      max_connections: data.max_connections || 10
    });
  }

  /**
   * Find organization by slug
   */
  async findBySlug(slug: string): Promise<Organization | null> {
    const query = 'SELECT * FROM organizations WHERE slug = $1';
    const result = await this.executeQuery<Organization>(query, [slug]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Find organization by domain
   */
  async findByDomain(domain: string): Promise<Organization | null> {
    const query = 'SELECT * FROM organizations WHERE domain = $1';
    const result = await this.executeQuery<Organization>(query, [domain]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Update organization settings
   */
  async updateSettings(id: string, settings: Record<string, any>): Promise<Organization | null> {
    const query = `
      UPDATE organizations 
      SET settings = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    const result = await this.executeQuery<Organization>(query, [JSON.stringify(settings), id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Get organization statistics
   */
  async getStats(organizationId: string): Promise<{
    total_connections: number;
    active_connections: number;
    inactive_connections: number;
    error_connections: number;
    platforms_connected: number;
    last_sync_at: Date | null;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total_connections,
        COUNT(*) FILTER (WHERE status = 'active') as active_connections,
        COUNT(*) FILTER (WHERE status = 'inactive') as inactive_connections,
        COUNT(*) FILTER (WHERE status = 'error') as error_connections,
        COUNT(DISTINCT platform_type) as platforms_connected,
        MAX(last_sync_at) as last_sync_at
      FROM platform_connections
      WHERE organization_id = $1
    `;
    
    const result = await this.executeQuery<{
      total_connections: string;
      active_connections: string;
      inactive_connections: string;
      error_connections: string;
      platforms_connected: string;
      last_sync_at: Date | null;
    }>(query, [organizationId]);

    const row = result.rows[0];
    return {
      total_connections: parseInt(row.total_connections, 10),
      active_connections: parseInt(row.active_connections, 10),
      inactive_connections: parseInt(row.inactive_connections, 10),
      error_connections: parseInt(row.error_connections, 10),
      platforms_connected: parseInt(row.platforms_connected, 10),
      last_sync_at: row.last_sync_at
    };
  }

  /**
   * Check if organization can add more connections
   */
  async canAddConnection(organizationId: string): Promise<{
    canAdd: boolean;
    current: number;
    maximum: number;
    remaining: number;
  }> {
    const org = await this.findById(organizationId);
    if (!org) {
      throw new Error('Organization not found');
    }

    const stats = await this.getStats(organizationId);
    const remaining = org.max_connections - stats.total_connections;

    return {
      canAdd: remaining > 0,
      current: stats.total_connections,
      maximum: org.max_connections,
      remaining: Math.max(0, remaining)
    };
  }

  /**
   * Soft delete organization (mark as inactive)
   */
  async softDelete(id: string): Promise<boolean> {
    const result = await this.update(id, { is_active: false });
    return result !== null;
  }

  /**
   * Reactivate organization
   */
  async reactivate(id: string): Promise<Organization | null> {
    return this.update(id, { is_active: true });
  }

  /**
   * Get organizations that are close to their connection limit
   */
  async findNearLimit(threshold: number = 0.8): Promise<Organization[]> {
    const query = `
      SELECT o.*, 
             COUNT(pc.id) as current_connections,
             o.max_connections,
             (COUNT(pc.id)::float / o.max_connections) as usage_ratio
      FROM organizations o
      LEFT JOIN platform_connections pc ON o.id = pc.organization_id
      WHERE o.is_active = true
      GROUP BY o.id
      HAVING (COUNT(pc.id)::float / o.max_connections) >= $1
      ORDER BY usage_ratio DESC
    `;

    const result = await this.executeQuery<Organization>(query, [threshold]);
    return result.rows;
  }

  /**
   * Search organizations by name or domain
   */
  async search(searchTerm: string, limit: number = 20): Promise<Organization[]> {
    const query = `
      SELECT * FROM organizations
      WHERE is_active = true
        AND (name ILIKE $1 OR domain ILIKE $1 OR slug ILIKE $1)
      ORDER BY name ASC
      LIMIT $2
    `;

    const result = await this.executeQuery<Organization>(query, [`%${searchTerm}%`, limit]);
    return result.rows;
  }

  /**
   * Get organization with connection summary
   */
  async findByIdWithSummary(id: string): Promise<(Organization & {
    connection_summary: {
      total: number;
      by_platform: Record<string, number>;
      by_status: Record<string, number>;
    };
  }) | null> {
    const org = await this.findById(id);
    if (!org) {
      return null;
    }

    const query = `
      SELECT 
        platform_type,
        status,
        COUNT(*) as count
      FROM platform_connections
      WHERE organization_id = $1
      GROUP BY platform_type, status
    `;

    const result = await this.executeQuery<{
      platform_type: string;
      status: string;
      count: string;
    }>(query, [id]);

    const by_platform: Record<string, number> = {};
    const by_status: Record<string, number> = {};
    let total = 0;

    result.rows.forEach(row => {
      const count = parseInt(row.count, 10);
      total += count;
      
      by_platform[row.platform_type] = (by_platform[row.platform_type] || 0) + count;
      by_status[row.status] = (by_status[row.status] || 0) + count;
    });

    return {
      ...org,
      connection_summary: {
        total,
        by_platform,
        by_status
      }
    };
  }
}

export const organizationRepository = new OrganizationRepository();