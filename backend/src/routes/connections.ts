/**
 * Platform Connections API Routes
 * Manages OAuth connections, discovery, and platform integrations
 */

import { Router, Request, Response } from 'express';
import { param, query } from 'express-validator';
import {
  PlatformConnection,
  ConnectionStatus
} from '@singura/shared-types';

import { securityMiddleware } from '../security/middleware';
import { auditService } from '../security/audit';
import { platformConnectionRepository } from '../database/repositories/platform-connection';
import { oauthService } from '../services/oauth-service';
import { slackConnector } from '../connectors/slack';
import { AutomationEvent, AuditLogEntry } from '../connectors/types';

const router: Router = Router();

// Apply security middleware to all connection routes
router.use(securityMiddleware.requireAuthentication());
router.use(securityMiddleware.requestLoggingMiddleware());

/**
 * GET /connections
 * List all platform connections for the authenticated user's organization
 */
router.get('/connections',
  securityMiddleware.validateFields([
    query('platform').optional().isIn(['slack', 'google', 'microsoft', 'hubspot', 'salesforce', 'notion', 'asana', 'jira'])
      .withMessage('Invalid platform filter'),
    query('status').optional().isIn(['active', 'inactive', 'error', 'expired', 'pending'])
      .withMessage('Invalid status filter'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { platform, status, page = 1, limit = 20 } = req.query;

      const filters: Record<string, unknown> = {
        organization_id: user.organizationId
      };

      if (platform) {
        filters.platform_type = platform;
      }

      if (status) {
        filters.status = status;
      }

      const connections = await platformConnectionRepository.findMany(
        filters,
        {
          page: parseInt(page as string, 10),
          limit: parseInt(limit as string, 10),
          sort_by: 'created_at',
          sort_order: 'DESC'
        }
      );

      // Log connection list access
      await auditService.logSecurityEvent({
        type: 'connections_list',
        category: 'connection',
        severity: 'low',
        description: 'Connection list accessed',
        userId: user.userId,
        organizationId: user.organizationId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: {
          filters: filters,
          resultCount: connections.data.length
        }
      });

      res.json({
        success: true,
        connections: connections.data,
        pagination: connections.pagination
      });
      return;
    } catch (error) {
      console.error('Error listing connections:', error);
      res.status(500).json({
        error: 'Failed to retrieve connections',
        code: 'CONNECTIONS_LIST_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      return;
    }
  }
);

/**
 * GET /connections/:connectionId
 * Get details for a specific platform connection
 */
router.get('/connections/:connectionId',
  securityMiddleware.validateFields([
    param('connectionId').isUUID().withMessage('Invalid connection ID')
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { connectionId } = req.params;

      const connection = await platformConnectionRepository.findByIdWithCredentials(connectionId!);

      if (!connection) {
        res.status(404).json({
          error: 'Connection not found',
          code: 'CONNECTION_NOT_FOUND'
        });
        return;
      }

      // Verify the connection belongs to the user's organization
      if (connection.organization_id !== user.organizationId) {
        await auditService.logSecurityEvent({
          type: 'unauthorized_access',
          category: 'error',
          severity: 'high',
          description: `Attempt to access connection ${connectionId} from different organization`,
          userId: user.userId,
          organizationId: user.organizationId,
          connectionId,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        });

        res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
        return;
      }

      // Remove sensitive credential data from response
      const sanitizedCredentials = connection.credentials.map(cred => ({
        id: cred.id,
        credential_type: cred.credential_type,
        expires_at: cred.expires_at,
        encryption_key_id: cred.encryption_key_id
      }));

      // Log connection access
      await auditService.logSecurityEvent({
        type: 'data_access',
        category: 'connection',
        severity: 'low',
        description: 'Connection detail accessed',
        userId: user.userId,
        organizationId: user.organizationId,
        connectionId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { connectionId, platform: connection.platform_type }
      });

      res.json({
        success: true,
        connection: {
          ...connection,
          credentials: sanitizedCredentials
        }
      });
    } catch (error) {
      console.error('Error retrieving connection:', error);
      res.status(500).json({
        error: 'Failed to retrieve connection',
        code: 'CONNECTION_DETAIL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /connections/:connectionId/refresh
 * Refresh OAuth tokens for a connection
 */
router.post('/connections/:connectionId/refresh',
  securityMiddleware.validateFields([
    param('connectionId').isUUID().withMessage('Invalid connection ID')
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { connectionId } = req.params;

      // Verify connection exists and belongs to user's organization
      const connection = await platformConnectionRepository.findById(connectionId!);

      if (!connection) {
        res.status(404).json({
          error: 'Connection not found',
          code: 'CONNECTION_NOT_FOUND'
        });
        return;
      }

      if (connection.organization_id !== user.organizationId) {
        res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
        return;
      }

      // Refresh the tokens
      const result = await oauthService.refreshOAuthTokens(connectionId!, user.userId, req);

      if (result.success) {
        res.json({
          success: true,
          tokens: result.newTokens,
          message: 'Tokens refreshed successfully'
        });
      } else {
        res.status(400).json({
          error: 'Token refresh failed',
          code: 'TOKEN_REFRESH_FAILED',
          message: result.error
        });
      }
    } catch (error) {
      console.error('Error refreshing connection tokens:', error);
      res.status(500).json({
        error: 'Failed to refresh tokens',
        code: 'TOKEN_REFRESH_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * DELETE /connections/:connectionId
 * Disconnect and revoke a platform connection
 */
router.delete('/connections/:connectionId',
  securityMiddleware.validateFields([
    param('connectionId').isUUID().withMessage('Invalid connection ID')
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { connectionId } = req.params;

      // Verify connection exists and belongs to user's organization
      const connection = await platformConnectionRepository.findById(connectionId!);

      if (!connection) {
        res.status(404).json({
          error: 'Connection not found',
          code: 'CONNECTION_NOT_FOUND'
        });
        return;
      }

      if (connection.organization_id !== user.organizationId) {
        res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
        return;
      }

      // Revoke OAuth tokens
      await oauthService.revokeOAuthTokens(connectionId!, user.userId, req);

      res.json({
        success: true,
        message: 'Connection disconnected successfully'
      });
    } catch (error) {
      console.error('Error disconnecting connection:', error);
      res.status(500).json({
        error: 'Failed to disconnect connection',
        code: 'CONNECTION_DISCONNECT_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /connections/:connectionId/validate
 * Validate connection permissions and health
 */
router.post('/connections/:connectionId/validate',
  securityMiddleware.validateFields([
    param('connectionId').isUUID().withMessage('Invalid connection ID')
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { connectionId } = req.params;

      // Verify connection exists and belongs to user's organization
      const connection = await platformConnectionRepository.findById(connectionId!);

      if (!connection) {
        res.status(404).json({
          error: 'Connection not found',
          code: 'CONNECTION_NOT_FOUND'
        });
        return;
      }

      if (connection.organization_id !== user.organizationId) {
        res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
        return;
      }

      // Get access token for validation
      const accessToken = await oauthService.getValidAccessToken(connectionId!, user.userId, req);

      // Validate permissions using the appropriate connector
      let validationResult;
      
      switch (connection.platform_type) {
        case 'slack':
          await slackConnector.authenticate({
            accessToken,
            tokenType: 'Bearer'
          });
          validationResult = await slackConnector.validatePermissions();
          break;
        
        default:
          throw new Error(`Platform ${connection.platform_type} validation not implemented`);
      }

      // Update connection status based on validation
      const status: ConnectionStatus = validationResult.isValid ? 'connected' : 'error';
      const errorMessage = validationResult.isValid ? undefined : validationResult.errors.join(', ');

      // Map API status to database status
      const dbStatus = status === 'connected' ? 'active' : 'error';

      await platformConnectionRepository.update(connectionId!, {
        status: dbStatus as any,
        last_error: errorMessage
      });

      // Log validation
      await auditService.logConnectionEvent(
        'updated',
        connectionId!,
        req,
        {
          action: 'validation',
          isValid: validationResult.isValid,
          errors: validationResult.errors,
          missingPermissions: validationResult.missingPermissions
        }
      );

      res.json({
        success: true,
        validation: validationResult,
        message: validationResult.isValid ? 'Connection is healthy' : 'Connection has issues'
      });
    } catch (error) {
      console.error('Error validating connection:', error);
      res.status(500).json({
        error: 'Failed to validate connection',
        code: 'CONNECTION_VALIDATION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /connections/:connectionId/discover
 * Discover automations for a platform connection
 */
router.post('/connections/:connectionId/discover',
  securityMiddleware.validateFields([
    param('connectionId').isUUID().withMessage('Invalid connection ID')
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { connectionId } = req.params;

      // Verify connection exists and belongs to user's organization
      const connection = await platformConnectionRepository.findById(connectionId!);

      if (!connection) {
        res.status(404).json({
          error: 'Connection not found',
          code: 'CONNECTION_NOT_FOUND'
        });
        return;
      }

      if (connection.organization_id !== user.organizationId) {
        res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
        return;
      }

      // Use DiscoveryService to run discovery (handles database persistence)
      const { discoveryService } = await import('../services/discovery-service');

      const result = await discoveryService.discoverPlatformAutomations(
        connection,
        {
          organizationId: user.organizationId,
          platformConnectionIds: [connectionId!],
          updateExisting: true
        }
      );

      // Update connection last sync time
      await platformConnectionRepository.update(connectionId!, {
        last_sync_at: new Date()
      });

      // Log discovery
      await auditService.logConnectionEvent(
        'updated',
        connectionId!,
        req,
        {
          action: 'automation_discovery',
          automationsFound: result.automations.length,
          auditLogsFound: result.auditLogs.length,
          executionTimeMs: result.metadata.executionTimeMs,
          riskScore: result.metadata.riskScore
        }
      );

      res.json({
        success: true,
        discovery: result,
        message: `Discovered ${result.automations.length} automations and ${result.auditLogs.length} audit log entries (persisted to database)`
      });
    } catch (error) {
      console.error('Error discovering automations:', error);
      res.status(500).json({
        error: 'Failed to discover automations',
        code: 'AUTOMATION_DISCOVERY_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /connections/stats
 * Get connection statistics for the organization
 */
router.get('/connections/stats',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user!;

      const stats = await platformConnectionRepository.getConnectionStats(user.organizationId);

      res.json({
        success: true,
        stats
      });
    } catch (error) {
      console.error('Error retrieving connection stats:', error);
      res.status(500).json({
        error: 'Failed to retrieve connection statistics',
        code: 'CONNECTION_STATS_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /connections/:connectionId/stats
 * Get statistics for a specific connection
 */
router.get('/connections/:connectionId/stats',
  securityMiddleware.validateFields([
    param('connectionId').isUUID().withMessage('Invalid connection ID')
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { connectionId } = req.params;

      // Verify connection belongs to organization
      const connection = await platformConnectionRepository.findById(connectionId!);

      if (!connection) {
        res.status(404).json({
          error: 'Connection not found',
          code: 'CONNECTION_NOT_FOUND'
        });
        return;
      }

      if (connection.organization_id !== user.organizationId) {
        res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
        return;
      }

      // Get connection statistics
      const { organizationMetadataService } = await import('../services/organization-metadata.service');
      const stats = await organizationMetadataService.getConnectionStats(connectionId!, user.organizationId);

      res.json({
        success: true,
        stats
      });
    } catch (error) {
      console.error('Error retrieving connection stats:', error);
      res.status(500).json({
        error: 'Failed to retrieve connection statistics',
        code: 'CONNECTION_STATS_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);


/**
 * Calculate risk score for discovered automations
 */
async function calculateRiskScore(automations: AutomationEvent[]): Promise<number> {
  if (!automations || automations.length === 0) {
    return 0;
  }

  let totalRisk = 0;
  let riskCount = 0;

  for (const automation of automations) {
    try {
      // Basic risk scoring for automation types
      let automationRisk = 30; // Base risk
      
      // Adjust based on type
      if (automation.type === 'bot') automationRisk += 20;
      else if (automation.type === 'workflow') automationRisk += 30;
      else if (automation.type === 'integration') automationRisk += 40;
      
      // Status adjustments
      if (automation.status === 'error') automationRisk += 20;

      totalRisk += Math.min(automationRisk, 100);
      riskCount++;
    } catch (error) {
      console.error(`Error calculating risk for automation ${automation.id}:`, error);
      // Assign a medium risk score if calculation fails
      totalRisk += 5;
      riskCount++;
    }
  }

  return riskCount > 0 ? totalRisk / riskCount : 0;
}

/**
 * Assess compliance status based on automations and audit logs
 */
function assessComplianceStatus(automations: AutomationEvent[], auditLogs: AuditLogEntry[]): string {
  const hasActiveAutomations = automations.some(a => a.status === 'active');
  const hasAuditLogs = auditLogs.length > 0;
  
  if (!hasActiveAutomations) {
    return 'no_automations';
  }
  
  if (hasActiveAutomations && hasAuditLogs) {
    return 'compliant';
  }
  
  return 'unknown';
}

export default router;