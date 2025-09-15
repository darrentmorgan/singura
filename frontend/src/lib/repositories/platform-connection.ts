/**
 * Platform Connection Repository - Supabase Implementation
 * Handles OAuth connections and platform integrations
 */

import { BaseSupabaseRepository } from './base-supabase';
import type {
  PlatformConnection,
  CreatePlatformConnectionInput,
  UpdatePlatformConnectionInput,
  PlatformConnectionFilters,
  PlatformType,
  ConnectionStatus
} from '../../types/database';

export class PlatformConnectionRepository extends BaseSupabaseRepository<
  PlatformConnection,
  CreatePlatformConnectionInput,
  UpdatePlatformConnectionInput,
  PlatformConnectionFilters
> {
  constructor() {
    super('platform_connections', 'id');
  }

  /**
   * Find connections by organization ID
   */
  async findByOrganizationId(organizationId: string): Promise<PlatformConnection[]> {
    const result = await this.findMany({ organization_id: organizationId } as PlatformConnectionFilters);
    return result.data;
  }

  /**
   * Find connection by platform and user
   */
  async findByPlatformUser(
    organizationId: string,
    platformType: PlatformType,
    platformUserId: string
  ): Promise<PlatformConnection | null> {
    return this.findOne({
      organization_id: organizationId,
      platform_type: platformType,
      platform_user_id: platformUserId
    } as PlatformConnectionFilters);
  }

  /**
   * Get active connections for organization
   */
  async getActiveConnections(organizationId: string): Promise<PlatformConnection[]> {
    const result = await this.findMany({
      organization_id: organizationId,
      status: 'active'
    } as PlatformConnectionFilters);
    return result.data;
  }

  /**
   * Get connections that need token refresh
   */
  async getConnectionsNeedingRefresh(): Promise<PlatformConnection[]> {
    const result = await this.findMany({
      expires_before: new Date(Date.now() + 24 * 60 * 60 * 1000) // Expiring within 24 hours
    } as PlatformConnectionFilters);
    return result.data;
  }

  /**
   * Update connection status and last sync
   */
  async updateSyncStatus(
    connectionId: string,
    status: ConnectionStatus,
    lastSyncAt?: Date,
    error?: string
  ): Promise<PlatformConnection | null> {
    return this.update(connectionId, {
      status,
      last_sync_at: lastSyncAt || new Date(),
      last_error: error || null
    } as UpdatePlatformConnectionInput);
  }

  /**
   * Update connection metadata
   */
  async updateMetadata(
    connectionId: string,
    metadata: PlatformConnection['metadata']
  ): Promise<PlatformConnection | null> {
    return this.update(connectionId, { metadata } as UpdatePlatformConnectionInput);
  }

  /**
   * Get platform statistics for organization
   */
  async getPlatformStatistics(organizationId: string): Promise<Array<{
    platform_type: PlatformType;
    total_connections: number;
    active_connections: number;
    error_connections: number;
    last_sync: Date | null;
  }>> {
    return this.executeRPC('get_platform_statistics', {
      organization_id: organizationId
    });
  }

  /**
   * Validate connection permissions
   */
  async validatePermissions(
    connectionId: string,
    requiredPermissions: string[]
  ): Promise<{ valid: boolean; missing: string[] }> {
    const connection = await this.findById(connectionId);
    if (!connection) {
      return { valid: false, missing: requiredPermissions };
    }

    const granted = connection.permissions_granted || [];
    const missing = requiredPermissions.filter(perm => !granted.includes(perm));
    
    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Get connections with expired or expiring tokens
   */
  async getExpiringConnections(hoursAhead: number = 24): Promise<PlatformConnection[]> {
    const expiryThreshold = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
    const result = await this.findMany({
      expires_before: expiryThreshold,
      status: 'active'
    } as PlatformConnectionFilters);
    return result.data;
  }

  /**
   * Set connection as expired
   */
  async markAsExpired(connectionId: string): Promise<PlatformConnection | null> {
    return this.update(connectionId, {
      status: 'expired',
      last_error: 'Token expired'
    } as UpdatePlatformConnectionInput);
  }

  /**
   * Reactivate connection after successful token refresh
   */
  async reactivateConnection(
    connectionId: string,
    expiresAt: Date,
    newPermissions?: string[]
  ): Promise<PlatformConnection | null> {
    const updateData: UpdatePlatformConnectionInput = {
      status: 'active',
      expires_at: expiresAt,
      last_error: null,
      last_sync_at: new Date()
    };

    if (newPermissions) {
      updateData.permissions_granted = newPermissions;
    }

    return this.update(connectionId, updateData);
  }
}