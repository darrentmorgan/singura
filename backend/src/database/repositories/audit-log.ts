/**
 * Audit Log repository for comprehensive system event tracking
 */

import { BaseRepository } from './base';
import {
  AuditLog,
  CreateAuditLogInput,
  AuditLogFilters,
  EventCategory,
  ActorType,
  PaginatedResult,
  PaginationOptions
} from '../../types/database';

export class AuditLogRepository extends BaseRepository<
  AuditLog,
  CreateAuditLogInput,
  never, // Audit logs are immutable
  AuditLogFilters
> {
  constructor() {
    super('audit_logs');
  }

  /**
   * Create a new audit log entry
   */
  async create(data: CreateAuditLogInput): Promise<AuditLog> {
    // Validate required fields
    const errors = this.validateRequiredFields(data, [
      'event_type',
      'event_category',
      'actor_type'
    ]);

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.map(e => e.message).join(', ')}`);
    }

    return super.create({
      ...data,
      event_data: data.event_data || {}
    });
  }

  /**
   * Log a system event (convenience method)
   */
  async logSystemEvent(
    eventType: string,
    eventCategory: EventCategory,
    eventData?: Record<string, any>,
    organizationId?: string,
    platformConnectionId?: string
  ): Promise<AuditLog> {
    return this.create({
      organization_id: organizationId,
      platform_connection_id: platformConnectionId,
      event_type: eventType,
      event_category: eventCategory,
      actor_type: 'system',
      event_data: eventData || {}
    });
  }

  /**
   * Log a user action
   */
  async logUserAction(
    userId: string,
    eventType: string,
    eventCategory: EventCategory,
    eventData?: Record<string, any>,
    organizationId?: string,
    platformConnectionId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuditLog> {
    return this.create({
      organization_id: organizationId,
      platform_connection_id: platformConnectionId,
      event_type: eventType,
      event_category: eventCategory,
      actor_id: userId,
      actor_type: 'user',
      event_data: eventData || {},
      ip_address: ipAddress,
      user_agent: userAgent
    });
  }

  /**
   * Find audit logs for an organization with filters
   */
  async findByOrganization(
    organizationId: string,
    filters?: Partial<AuditLogFilters>,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<AuditLog>> {
    const combinedFilters: AuditLogFilters = {
      ...filters,
      organization_id: organizationId
    };

    return this.findMany(combinedFilters, pagination);
  }

  /**
   * Find audit logs for a platform connection
   */
  async findByPlatformConnection(
    platformConnectionId: string,
    filters?: Partial<AuditLogFilters>,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<AuditLog>> {
    const combinedFilters: AuditLogFilters = {
      ...filters,
      platform_connection_id: platformConnectionId
    };

    return this.findMany(combinedFilters, pagination);
  }

  /**
   * Find audit logs by event type
   */
  async findByEventType(
    eventType: string,
    organizationId?: string,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<AuditLog>> {
    const filters: AuditLogFilters = {
      event_type: eventType,
      organization_id: organizationId
    };

    return this.findMany(filters, pagination);
  }

  /**
   * Find audit logs by actor
   */
  async findByActor(
    actorId: string,
    actorType: ActorType,
    organizationId?: string,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<AuditLog>> {
    const filters: AuditLogFilters = {
      actor_id: actorId,
      actor_type: actorType,
      organization_id: organizationId
    };

    return this.findMany(filters, pagination);
  }

  /**
   * Find recent audit logs
   */
  async findRecent(
    organizationId?: string,
    limit: number = 50,
    categories?: EventCategory[]
  ): Promise<AuditLog[]> {
    let query = `
      SELECT * FROM audit_logs
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (organizationId) {
      query += ` AND organization_id = $${paramIndex++}`;
      params.push(organizationId);
    }

    if (categories && categories.length > 0) {
      const categoryPlaceholders = categories.map(() => `$${paramIndex++}`).join(', ');
      query += ` AND event_category IN (${categoryPlaceholders})`;
      params.push(...categories);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await this.executeQuery<AuditLog>(query, params);
    return result.rows;
  }

  /**
   * Get audit statistics for an organization
   */
  async getAuditStats(
    organizationId: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<{
    total_events: number;
    by_category: Record<EventCategory, number>;
    by_actor_type: Record<ActorType, number>;
    by_event_type: Record<string, number>;
    unique_actors: number;
    most_active_day: { date: string; count: number } | null;
  }> {
    let whereClause = 'WHERE organization_id = $1';
    const params = [organizationId];
    let paramIndex = 2;

    if (fromDate) {
      whereClause += ` AND created_at >= $${paramIndex++}`;
      params.push(fromDate.toISOString());
    }

    if (toDate) {
      whereClause += ` AND created_at <= $${paramIndex++}`;
      params.push(toDate.toISOString());
    }

    const query = `
      SELECT 
        COUNT(*) as total_events,
        COUNT(DISTINCT actor_id) as unique_actors,
        event_category,
        actor_type,
        event_type,
        DATE(created_at) as event_date
      FROM audit_logs
      ${whereClause}
      GROUP BY event_category, actor_type, event_type, DATE(created_at)
      ORDER BY total_events DESC
    `;

    const result = await this.executeQuery<{
      total_events: string;
      unique_actors: string;
      event_category: EventCategory;
      actor_type: ActorType;
      event_type: string;
      event_date: string;
    }>(query, params);

    const by_category: Record<EventCategory, number> = {} as any;
    const by_actor_type: Record<ActorType, number> = {} as any;
    const by_event_type: Record<string, number> = {};
    const daily_counts: Record<string, number> = {};

    let total_events = 0;
    let unique_actors = 0;

    result.rows.forEach(row => {
      const count = parseInt(row.total_events, 10);
      total_events += count;
      unique_actors = Math.max(unique_actors, parseInt(row.unique_actors, 10));

      by_category[row.event_category] = (by_category[row.event_category] || 0) + count;
      by_actor_type[row.actor_type] = (by_actor_type[row.actor_type] || 0) + count;
      by_event_type[row.event_type] = (by_event_type[row.event_type] || 0) + count;

      daily_counts[row.event_date] = (daily_counts[row.event_date] || 0) + count;
    });

    // Find most active day
    const most_active_day = Object.entries(daily_counts)
      .sort(([, a], [, b]) => b - a)
      .map(([date, count]) => ({ date, count }))[0] || null;

    return {
      total_events,
      by_category,
      by_actor_type,
      by_event_type,
      unique_actors,
      most_active_day
    };
  }

  /**
   * Find security-related events
   */
  async findSecurityEvents(
    organizationId: string,
    fromDate?: Date,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<AuditLog>> {
    const securityEventTypes = [
      'login_failed',
      'login_success',
      'logout',
      'password_changed',
      'permission_changed',
      'credential_created',
      'credential_deleted',
      'platform_connection_created',
      'platform_connection_deleted',
      'organization_settings_changed'
    ];

    const filters: AuditLogFilters = {
      organization_id: organizationId,
      created_after: fromDate
    };

    // Use raw query for better performance with IN clause
    const { whereClause, params } = this.buildWhereClause(filters);
    const eventTypePlaceholders = securityEventTypes.map((_, i) => `$${params.length + i + 1}`).join(', ');
    const allParams = [...params, ...securityEventTypes];

    const { limit, offset, orderBy } = this.buildPaginationClause(pagination);

    // Count query
    const countQuery = `
      SELECT COUNT(*) as count 
      FROM audit_logs 
      ${whereClause} AND event_type IN (${eventTypePlaceholders})
    `;
    const countResult = await this.executeQuery<{ count: string }>(countQuery, allParams);
    const total = parseInt(countResult.rows[0].count, 10);

    // Data query
    const dataQuery = `
      SELECT * FROM audit_logs 
      ${whereClause} AND event_type IN (${eventTypePlaceholders})
      ${orderBy} LIMIT $${allParams.length + 1} OFFSET $${allParams.length + 2}
    `;
    const dataResult = await this.executeQuery<AuditLog>(dataQuery, [...allParams, limit, offset]);

    const page = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(total / limit);

    return {
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_previous: page > 1
      }
    };
  }

  /**
   * Clean up old audit logs (data retention)
   */
  async cleanupOldLogs(
    olderThanDays: number,
    batchSize: number = 1000
  ): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    let totalDeleted = 0;

    while (true) {
      const query = `
        DELETE FROM audit_logs
        WHERE id IN (
          SELECT id FROM audit_logs
          WHERE created_at < $1
          ORDER BY created_at ASC
          LIMIT $2
        )
      `;

      const result = await this.executeQuery(query, [cutoffDate, batchSize]);
      const deleted = result.rowCount || 0;
      totalDeleted += deleted;

      if (deleted < batchSize) {
        break; // No more records to delete
      }

      // Small delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return totalDeleted;
  }

  /**
   * Export audit logs for compliance
   */
  async exportLogs(
    organizationId: string,
    fromDate: Date,
    toDate: Date,
    eventCategories?: EventCategory[]
  ): Promise<AuditLog[]> {
    let query = `
      SELECT * FROM audit_logs
      WHERE organization_id = $1
        AND created_at >= $2
        AND created_at <= $3
    `;
    const params = [organizationId, fromDate, toDate];

    if (eventCategories && eventCategories.length > 0) {
      const categoryPlaceholders = eventCategories.map((_, i) => `$${params.length + i + 1}`).join(', ');
      query += ` AND event_category IN (${categoryPlaceholders})`;
      params.push(...eventCategories);
    }

    query += ' ORDER BY created_at ASC';

    const result = await this.executeQuery<AuditLog>(query, params);
    return result.rows;
  }

  /**
   * Prevent updates and deletes - audit logs are immutable
   */
  async update(): Promise<never> {
    throw new Error('Audit logs are immutable and cannot be updated');
  }

  async delete(): Promise<never> {
    throw new Error('Individual audit logs cannot be deleted. Use cleanupOldLogs() for data retention.');
  }
}

export const auditLogRepository = new AuditLogRepository();