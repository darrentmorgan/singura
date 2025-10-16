/**
 * Enterprise security audit and monitoring service
 * Production-grade implementation with database persistence and metrics
 */

import { Request } from 'express';
import { CreateAuditLogInput, EventCategory, ActorType } from '../types/database';
import { db } from '../database/pool';
import { logger, logSecurityEvent as logSecurityEventToLogger } from '../utils/logger';
import { createClient } from 'redis';
import { Parser } from 'json2csv';
import { v4 as uuidv4 } from 'uuid';

export interface SecurityEvent {
  type: string;
  eventType?: string; // For backwards compatibility
  category: EventCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  userId?: string;
  organizationId?: string;
  connectionId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export class AuditService {
  private redisClient: ReturnType<typeof createClient> | null = null;

  constructor() {
    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    try {
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      this.redisClient.on('error', (err) => {
        logger.error('Redis client error', { error: err.message });
      });

      await this.redisClient.connect();
      logger.info('Redis client connected for audit service');
    } catch (error) {
      logger.warn('Redis not available for audit caching', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Continue without Redis - we can still function without caching
    }
  }

  /**
   * Log a security event to database and logger
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    const correlationId = uuidv4();

    try {
      // Log to Winston immediately
      logSecurityEventToLogger(event.type, event.severity, {
        ...event,
        correlationId
      });

      // Persist to database
      const query = `
        INSERT INTO audit_logs (
          timestamp, user_id, organization_id, action, resource_type,
          resource_id, ip_address, user_agent, metadata, severity,
          category, correlation_id
        ) VALUES (
          NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
        ) RETURNING id
      `;

      const values = [
        event.userId || 'system',
        event.organizationId || 'system',
        event.type,
        event.metadata?.resourceType || null,
        event.connectionId || event.metadata?.resourceId || null,
        event.ipAddress || null,
        event.userAgent || null,
        JSON.stringify(event.metadata || {}),
        event.severity,
        event.category,
        correlationId
      ];

      const result = await db.query(query, values);

      logger.debug('Security event persisted to database', {
        eventId: result.rows[0].id,
        correlationId
      });

      // Invalidate cache for metrics if critical event
      if (event.severity === 'critical' || event.severity === 'high') {
        await this.invalidateMetricsCache(event.organizationId);
      }
    } catch (error) {
      logger.error('Failed to log security event to database', {
        error: error instanceof Error ? error.message : 'Unknown error',
        event,
        correlationId
      });
      // Don't throw - we've already logged to Winston at least
    }
  }

  /**
   * Log authentication event
   */
  async logAuthEvent(
    type: 'login' | 'logout' | 'token_refresh' | 'oauth_callback',
    req: Request,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logSecurityEvent({
      type,
      category: 'auth',
      severity: 'low',
      description: `Authentication event: ${type}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: details
    });
  }

  /**
   * Log connection event
   */
  async logConnectionEvent(
    type: 'created' | 'updated' | 'deleted' | 'error',
    connectionId: string,
    req: Request,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logSecurityEvent({
      type,
      category: 'connection',
      severity: type === 'error' ? 'medium' : 'low',
      description: `Connection event: ${type}`,
      connectionId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: details
    });
  }

  /**
   * Log OAuth event (alias for OAuth-specific events)
   */
  async logOAuthEvent(
    type: string,
    platform: string,
    userId: string,
    organizationId: string,
    connectionId: string | undefined,
    req: Request,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logSecurityEvent({
      type,
      category: 'auth',
      severity: 'low',
      description: `OAuth event: ${type} for ${platform}`,
      userId,
      organizationId,
      connectionId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: details
    });
  }

  /**
   * Log authentication event (alias for compatibility)
   */
  async logAuthenticationEvent(
    event: string,
    userId: string,
    organizationId: string,
    req: Request,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logSecurityEvent({
      type: event,
      category: 'auth',
      severity: 'low',
      description: `Authentication event: ${event}`,
      userId,
      organizationId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata
    });
  }

  /**
   * Log security violation
   */
  async logSecurityViolation(
    violation: string,
    userId: string,
    organizationId: string,
    req: Request,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logSecurityEvent({
      type: violation,
      category: 'admin',
      severity: 'high',
      description: `Security violation: ${violation}`,
      userId,
      organizationId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata
    });
  }

  /**
   * Invalidate metrics cache for an organization
   */
  private async invalidateMetricsCache(organizationId?: string): Promise<void> {
    if (!this.redisClient || !organizationId) return;

    try {
      const keys = await this.redisClient.keys(`metrics:${organizationId}:*`);
      if (keys.length > 0) {
        await this.redisClient.del(keys);
      }
    } catch (error) {
      logger.warn('Failed to invalidate metrics cache', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get security metrics with caching
   */
  async getSecurityMetrics(organizationId: string, timeRange: string = '24h'): Promise<Record<string, any>> {
    const cacheKey = `metrics:${organizationId}:${timeRange}`;

    try {
      // Try to get from cache first
      if (this.redisClient) {
        const cached = await this.redisClient.get(cacheKey);
        if (cached) {
          logger.debug('Returning cached metrics', { organizationId, timeRange });
          return JSON.parse(cached);
        }
      }

      // Calculate time range
      const intervals: Record<string, string> = {
        '1h': '1 hour',
        '24h': '24 hours',
        '7d': '7 days',
        '30d': '30 days',
        '90d': '90 days'
      };

      const interval = intervals[timeRange] || '24 hours';

      // Query database for metrics
      const metricsQuery = `
        SELECT
          COUNT(*) as total_events,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_events,
          COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_events,
          COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium_events,
          COUNT(CASE WHEN severity = 'low' THEN 1 END) as low_events,
          COUNT(CASE WHEN category = 'auth' THEN 1 END) as auth_events,
          COUNT(CASE WHEN category = 'connection' THEN 1 END) as connection_events,
          COUNT(CASE WHEN category = 'security' THEN 1 END) as security_events,
          COUNT(CASE WHEN category = 'admin' THEN 1 END) as admin_events
        FROM audit_logs
        WHERE organization_id = $1
          AND timestamp > NOW() - INTERVAL '${interval}'
      `;

      const eventsOverTimeQuery = `
        SELECT
          DATE_TRUNC('hour', timestamp) as hour,
          COUNT(*) as count,
          category
        FROM audit_logs
        WHERE organization_id = $1
          AND timestamp > NOW() - INTERVAL '${interval}'
        GROUP BY hour, category
        ORDER BY hour DESC
      `;

      const topUsersQuery = `
        SELECT
          user_id,
          COUNT(*) as event_count,
          COUNT(DISTINCT action) as unique_actions
        FROM audit_logs
        WHERE organization_id = $1
          AND timestamp > NOW() - INTERVAL '${interval}'
        GROUP BY user_id
        ORDER BY event_count DESC
        LIMIT 10
      `;

      const [metricsResult, eventsOverTimeResult, topUsersResult] = await Promise.all([
        db.query(metricsQuery, [organizationId]),
        db.query(eventsOverTimeQuery, [organizationId]),
        db.query(topUsersQuery, [organizationId])
      ]);

      const metrics = {
        organizationId,
        timeRange,
        summary: metricsResult.rows[0],
        eventsOverTime: eventsOverTimeResult.rows,
        topUsers: topUsersResult.rows,
        lastUpdated: new Date().toISOString()
      };

      // Cache the results (5 minute TTL)
      if (this.redisClient) {
        await this.redisClient.setEx(cacheKey, 300, JSON.stringify(metrics));
      }

      logger.info('Security metrics retrieved', {
        organizationId,
        timeRange,
        totalEvents: metrics.summary.total_events
      });

      return metrics;
    } catch (error) {
      logger.error('Failed to retrieve security metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
        timeRange
      });

      // Return empty metrics on error
      return {
        organizationId,
        timeRange,
        summary: {
          total_events: 0,
          unique_users: 0,
          critical_events: 0,
          high_events: 0,
          medium_events: 0,
          low_events: 0,
          auth_events: 0,
          connection_events: 0,
          security_events: 0,
          admin_events: 0
        },
        eventsOverTime: [],
        topUsers: [],
        lastUpdated: new Date().toISOString(),
        error: 'Failed to retrieve metrics'
      };
    }
  }

  /**
   * Generate compliance report as CSV
   */
  async generateComplianceReport(
    organizationId: string,
    reportType: string = 'standard',
    options?: {
      startDate?: Date;
      endDate?: Date;
      userId?: string;
      actionType?: string;
      severity?: string;
    }
  ): Promise<Buffer> {
    try {
      logger.info('Generating compliance report', {
        organizationId,
        reportType,
        options
      });

      // Build query with filters
      let query = `
        SELECT
          timestamp,
          user_id,
          action,
          resource_type,
          resource_id,
          severity,
          category,
          ip_address,
          metadata
        FROM audit_logs
        WHERE organization_id = $1
      `;

      const params: any[] = [organizationId];
      let paramIndex = 2;

      // Add date range filter
      const startDate = options?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
      const endDate = options?.endDate || new Date();

      query += ` AND timestamp BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(startDate, endDate);
      paramIndex += 2;

      // Add optional filters
      if (options?.userId) {
        query += ` AND user_id = $${paramIndex}`;
        params.push(options.userId);
        paramIndex++;
      }

      if (options?.actionType) {
        query += ` AND action = $${paramIndex}`;
        params.push(options.actionType);
        paramIndex++;
      }

      if (options?.severity) {
        query += ` AND severity = $${paramIndex}`;
        params.push(options.severity);
        paramIndex++;
      }

      query += ' ORDER BY timestamp DESC';

      // Execute query
      const result = await db.query(query, params);

      // Get summary statistics
      const statsQuery = `
        SELECT
          COUNT(*) as total_events,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_events,
          COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_events
        FROM audit_logs
        WHERE organization_id = $1
          AND timestamp BETWEEN $2 AND $3
      `;

      const statsResult = await db.query(statsQuery, [organizationId, startDate, endDate]);
      const stats = statsResult.rows[0];

      // Prepare data for CSV
      const csvData = [];

      // Add summary section
      csvData.push({
        timestamp: 'REPORT SUMMARY',
        user_id: '',
        action: '',
        resource_type: '',
        resource_id: '',
        severity: '',
        category: '',
        ip_address: '',
        details: ''
      });

      csvData.push({
        timestamp: `Organization: ${organizationId}`,
        user_id: '',
        action: '',
        resource_type: '',
        resource_id: '',
        severity: '',
        category: '',
        ip_address: '',
        details: ''
      });

      csvData.push({
        timestamp: `Report Period: ${startDate.toISOString()} to ${endDate.toISOString()}`,
        user_id: '',
        action: '',
        resource_type: '',
        resource_id: '',
        severity: '',
        category: '',
        ip_address: '',
        details: ''
      });

      csvData.push({
        timestamp: `Total Events: ${stats.total_events}`,
        user_id: `Unique Users: ${stats.unique_users}`,
        action: `Critical: ${stats.critical_events}`,
        resource_type: `High: ${stats.high_events}`,
        resource_id: '',
        severity: '',
        category: '',
        ip_address: '',
        details: ''
      });

      // Add blank row
      csvData.push({
        timestamp: '',
        user_id: '',
        action: '',
        resource_type: '',
        resource_id: '',
        severity: '',
        category: '',
        ip_address: '',
        details: ''
      });

      // Add header row
      csvData.push({
        timestamp: 'AUDIT LOG DETAILS',
        user_id: '',
        action: '',
        resource_type: '',
        resource_id: '',
        severity: '',
        category: '',
        ip_address: '',
        details: ''
      });

      // Add data rows
      result.rows.forEach(row => {
        csvData.push({
          timestamp: row.timestamp,
          user_id: row.user_id,
          action: row.action,
          resource_type: row.resource_type || '',
          resource_id: row.resource_id || '',
          severity: row.severity,
          category: row.category,
          ip_address: row.ip_address || '',
          details: JSON.stringify(row.metadata || {})
        });
      });

      // Convert to CSV
      const parser = new Parser({
        fields: ['timestamp', 'user_id', 'action', 'resource_type', 'resource_id', 'severity', 'category', 'ip_address', 'details']
      });

      const csv = parser.parse(csvData);

      logger.info('Compliance report generated', {
        organizationId,
        totalRows: result.rows.length,
        reportSize: csv.length
      });

      // Return as buffer for download
      return Buffer.from(csv, 'utf-8');
    } catch (error) {
      logger.error('Failed to generate compliance report', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
        reportType
      });

      throw new Error('Failed to generate compliance report');
    }
  }
}

// Export singleton instance
export const auditService = new AuditService();

// Export alias for backwards compatibility
export const securityAuditService = auditService;