/**
 * Platform Connection repository for managing SaaS platform connections
 */

import { BaseRepository } from './base';
import {
  PlatformConnection,
  CreatePlatformConnectionInput,
  UpdatePlatformConnectionInput,
  PlatformConnectionFilters,
  PlatformType,
  ConnectionStatus,
  ValidationError
} from '../../types/database';

export class PlatformConnectionRepository extends BaseRepository<
  PlatformConnection,
  CreatePlatformConnectionInput,
  UpdatePlatformConnectionInput,
  PlatformConnectionFilters
> {
  constructor() {
    super('platform_connections');
  }

  /**
   * Create a new platform connection with validation
   */
  async create(data: CreatePlatformConnectionInput): Promise<PlatformConnection> {
    // Validate required fields
    const errors = this.validateRequiredFields(data, [
      'organization_id',
      'platform_type',
      'platform_user_id',
      'display_name',
      'permissions_granted'
    ]);

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.map(e => e.message).join(', ')}`);
    }

    // Check for duplicate connection
    const existing = await this.findByPlatformUser(
      data.organization_id,
      data.platform_type,
      data.platform_user_id,
      data.platform_workspace_id
    );

    if (existing) {
      throw new Error(
        `Connection already exists for ${data.platform_type} user ${data.platform_user_id}`
      );
    }

    // Prepare data - BaseRepository.buildInsertClause handles JSONB stringification
    const insertData: any = {
      ...data,
      status: 'pending',
      // Pass objects directly - buildInsertClause will stringify for JSONB columns
      permissions_granted: data.permissions_granted || [],
      metadata: data.metadata || {}
    };

    return super.create(insertData);
  }

  /**
   * Find connection by platform and user identifiers
   */
  async findByPlatformUser(
    organizationId: string,
    platformType: PlatformType,
    platformUserId: string,
    platformWorkspaceId?: string
  ): Promise<PlatformConnection | null> {
    let query = `
      SELECT * FROM platform_connections
      WHERE organization_id = $1
        AND platform_type = $2
        AND platform_user_id = $3
    `;
    const params = [organizationId, platformType, platformUserId];

    if (platformWorkspaceId) {
      query += ' AND platform_workspace_id = $4';
      params.push(platformWorkspaceId);
    } else {
      query += ' AND platform_workspace_id IS NULL';
    }

    const result = await this.executeQuery<PlatformConnection>(query, params);
    const row = result.rows[0];
    return row ? row : null;
  }

  /**
   * Find all connections for an organization
   */
  async findByOrganization(organizationId: string): Promise<PlatformConnection[]> {
    const query = `
      SELECT * FROM platform_connections
      WHERE organization_id = $1
      ORDER BY created_at DESC
    `;
    console.log('🔍 Repository query:', { query: query.trim(), params: [organizationId] });
    const result = await this.executeQuery<PlatformConnection>(query, [organizationId]);
    console.log('📊 Repository result:', { rowCount: result.rowCount, rows: result.rows.length, firstRow: result.rows[0]?.id });
    return result.rows;
  }

  /**
   * Find connections by platform type
   */
  async findByPlatform(
    organizationId: string,
    platformType: PlatformType
  ): Promise<PlatformConnection[]> {
    const query = `
      SELECT * FROM platform_connections
      WHERE organization_id = $1 AND platform_type = $2
      ORDER BY created_at DESC
    `;
    const result = await this.executeQuery<PlatformConnection>(query, [organizationId, platformType]);
    return result.rows;
  }

  /**
   * Update connection status
   */
  async updateStatus(
    id: string,
    status: ConnectionStatus,
    errorMessage?: string
  ): Promise<PlatformConnection | null> {
    const updateData: UpdatePlatformConnectionInput = {
      status,
      last_error: errorMessage || null
    };

    if (status === 'active') {
      updateData.last_sync_at = new Date();
    }

    return this.update(id, updateData);
  }

  /**
   * Update last sync timestamp
   */
  async updateLastSync(id: string): Promise<PlatformConnection | null> {
    return this.update(id, { last_sync_at: new Date() });
  }

  /**
   * Find connections that need token refresh
   */
  async findExpiring(beforeDate?: Date): Promise<PlatformConnection[]> {
    const cutoffDate = beforeDate || new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    const query = `
      SELECT * FROM platform_connections
      WHERE expires_at IS NOT NULL
        AND expires_at <= $1
        AND status IN ('active', 'error')
      ORDER BY expires_at ASC
    `;

    const result = await this.executeQuery<PlatformConnection>(query, [cutoffDate]);
    return result.rows;
  }

  /**
   * Find stale connections (haven't synced recently)
   */
  async findStale(olderThanHours: number = 24): Promise<PlatformConnection[]> {
    const cutoffDate = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    
    const query = `
      SELECT * FROM platform_connections
      WHERE status = 'active'
        AND (last_sync_at IS NULL OR last_sync_at <= $1)
      ORDER BY last_sync_at ASC NULLS FIRST
    `;

    const result = await this.executeQuery<PlatformConnection>(query, [cutoffDate]);
    return result.rows;
  }

  /**
   * Get connection statistics for an organization
   */
  async getConnectionStats(organizationId: string): Promise<{
    total: number;
    by_platform: Record<PlatformType, number>;
    by_status: Record<ConnectionStatus, number>;
    healthy_percentage: number;
    last_sync: Date | null;
  }> {
    const query = `
      SELECT 
        platform_type,
        status,
        COUNT(*) as count,
        MAX(last_sync_at) as latest_sync
      FROM platform_connections
      WHERE organization_id = $1
      GROUP BY platform_type, status
      ORDER BY platform_type, status
    `;

    const result = await this.executeQuery<{
      platform_type: PlatformType;
      status: ConnectionStatus;
      count: string;
      latest_sync: Date | null;
    }>(query, [organizationId]);

    const by_platform: Record<PlatformType, number> = {} as any;
    const by_status: Record<ConnectionStatus, number> = {} as any;
    let total = 0;
    let healthy = 0;
    let last_sync: Date | null = null;

    result.rows.forEach(row => {
      const count = parseInt(row.count, 10);
      total += count;

      by_platform[row.platform_type] = (by_platform[row.platform_type] || 0) + count;
      by_status[row.status] = (by_status[row.status] || 0) + count;

      if (row.status === 'active') {
        healthy += count;
      }

      if (row.latest_sync && (!last_sync || row.latest_sync > last_sync)) {
        last_sync = row.latest_sync;
      }
    });

    const healthy_percentage = total > 0 ? (healthy / total) * 100 : 0;

    return {
      total,
      by_platform,
      by_status,
      healthy_percentage,
      last_sync
    };
  }

  /**
   * Update connection permissions
   */
  async updatePermissions(
    id: string,
    permissions: string[]
  ): Promise<PlatformConnection | null> {
    return this.update(id, {
      permissions_granted: permissions as any
    });
  }

  /**
   * Update connection metadata
   */
  async updateMetadata(
    id: string,
    metadata: Record<string, any>
  ): Promise<PlatformConnection | null> {
    return this.update(id, {
      metadata: metadata as any
    });
  }

  /**
   * Find connections with specific permissions
   */
  async findByPermission(
    organizationId: string,
    permission: string
  ): Promise<PlatformConnection[]> {
    const query = `
      SELECT * FROM platform_connections
      WHERE organization_id = $1
        AND permissions_granted @> $2
        AND status = 'active'
      ORDER BY created_at DESC
    `;

    const result = await this.executeQuery<PlatformConnection>(
      query,
      [organizationId, JSON.stringify([permission])]
    );
    return result.rows;
  }

  /**
   * Bulk update connection statuses
   */
  async bulkUpdateStatus(
    connectionIds: string[],
    status: ConnectionStatus,
    errorMessage?: string
  ): Promise<number> {
    if (connectionIds.length === 0) {
      return 0;
    }

    const placeholders = connectionIds.map((_, index) => `$${index + 1}`).join(', ');
    const params = [...connectionIds];

    let query = `
      UPDATE platform_connections
      SET status = $${params.length + 1}, updated_at = NOW()
    `;
    params.push(status);

    if (errorMessage) {
      query += `, last_error = $${params.length + 1}`;
      params.push(errorMessage);
    }

    if (status === 'active') {
      query += `, last_sync_at = NOW()`;
    }

    query += ` WHERE id IN (${placeholders})`;

    const result = await this.executeQuery(query, params);
    return result.rowCount || 0;
  }

  /**
   * Delete connections for a specific platform
   */
  async deleteByPlatform(
    organizationId: string,
    platformType: PlatformType
  ): Promise<number> {
    const query = `
      DELETE FROM platform_connections
      WHERE organization_id = $1 AND platform_type = $2
    `;

    const result = await this.executeQuery(query, [organizationId, platformType]);
    return result.rowCount || 0;
  }

  /**
   * Get connection with related encrypted credentials
   */
  async findByIdWithCredentials(id: string): Promise<(PlatformConnection & {
    credentials: Array<{
      id: string;
      credential_type: string;
      expires_at: Date | null;
      encryption_key_id: string;
    }>;
  }) | null> {
    const connection = await this.findById(id);
    if (!connection) {
      return null;
    }

    const credentialsQuery = `
      SELECT id, credential_type, expires_at, encryption_key_id
      FROM encrypted_credentials
      WHERE platform_connection_id = $1
      ORDER BY created_at DESC
    `;

    const credentialsResult = await this.executeQuery<{
      id: string;
      credential_type: string;
      expires_at: Date | null;
      encryption_key_id: string;
    }>(credentialsQuery, [id]);

    return {
      ...connection,
      credentials: credentialsResult.rows
    };
  }

  /**
   * Search connections by display name
   */
  async searchByDisplayName(
    organizationId: string,
    searchTerm: string,
    limit: number = 20
  ): Promise<PlatformConnection[]> {
    const query = `
      SELECT * FROM platform_connections
      WHERE organization_id = $1
        AND display_name ILIKE $2
      ORDER BY display_name ASC
      LIMIT $3
    `;

    const result = await this.executeQuery<PlatformConnection>(
      query,
      [organizationId, `%${searchTerm}%`, limit]
    );
    return result.rows;
  }
}

export const platformConnectionRepository = new PlatformConnectionRepository();