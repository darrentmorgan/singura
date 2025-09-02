/**
 * Platform Connections API Routes
 * Manages OAuth connections, discovery, and platform integrations
 */

import { Router, Request, Response } from 'express';
import { param, query } from 'express-validator';
import { securityMiddleware } from '../security/middleware';
import { securityAuditService } from '../security/audit';
import { platformConnectionRepository } from '../database/repositories/platform-connection';
import { oauthService } from '../services/oauth-service';
import { riskService } from '../services/risk-service';
import { slackConnector } from '../connectors/slack';
import { PlatformType, ConnectionStatus } from '../types/database';
import { AutomationEvent, AuditLogEntry } from '../connectors/types';

const router = Router();

// Apply security middleware to all connection routes
router.use(securityMiddleware.requireAuthentication());
router.use(securityMiddleware.requestLoggingMiddleware());

/**
 * GET /connections
 * List all platform connections for the authenticated user's organization
 */
router.get('/connections',
  securityMiddleware.validateInput([
    query('platform').optional().isIn(['slack', 'google', 'microsoft', 'hubspot', 'salesforce', 'notion', 'asana', 'jira'])
      .withMessage('Invalid platform filter'),
    query('status').optional().isIn(['active', 'inactive', 'error', 'expired', 'pending'])
      .withMessage('Invalid status filter'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ]),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { platform, status, page = 1, limit = 20 } = req.query;

      const filters: any = {
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
      await securityAuditService.logDataAccessEvent(
        'connections_list',
        user.userId,
        user.organizationId,
        req,
        {
          filters: filters,
          resultCount: connections.data.length
        }
      );

      res.json({
        success: true,
        connections: connections.data,
        pagination: connections.pagination
      });
    } catch (error) {
      console.error('Error listing connections:', error);
      res.status(500).json({
        error: 'Failed to retrieve connections',
        code: 'CONNECTIONS_LIST_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /connections/:connectionId
 * Get details for a specific platform connection
 */
router.get('/connections/:connectionId',
  securityMiddleware.validateInput([
    param('connectionId').isUUID().withMessage('Invalid connection ID')
  ]),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { connectionId } = req.params;

      const connection = await platformConnectionRepository.findByIdWithCredentials(connectionId);

      if (!connection) {
        return res.status(404).json({
          error: 'Connection not found',
          code: 'CONNECTION_NOT_FOUND'
        });
      }

      // Verify the connection belongs to the user's organization
      if (connection.organization_id !== user.organizationId) {
        await securityAuditService.logSecurityViolation(
          'unauthorized_connection_access',
          `Attempt to access connection ${connectionId} from different organization`,
          user.userId,
          user.organizationId,
          req
        );

        return res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }

      // Remove sensitive credential data from response
      const sanitizedCredentials = connection.credentials.map(cred => ({
        id: cred.id,
        credential_type: cred.credential_type,
        expires_at: cred.expires_at,
        encryption_key_id: cred.encryption_key_id
      }));

      // Log connection access
      await securityAuditService.logDataAccessEvent(
        'connection_detail',
        user.userId,
        user.organizationId,
        req,
        { connectionId, platform: connection.platform_type }
      );

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
  securityMiddleware.validateInput([
    param('connectionId').isUUID().withMessage('Invalid connection ID')
  ]),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { connectionId } = req.params;

      // Verify connection exists and belongs to user's organization
      const connection = await platformConnectionRepository.findById(connectionId);

      if (!connection) {
        return res.status(404).json({
          error: 'Connection not found',
          code: 'CONNECTION_NOT_FOUND'
        });
      }

      if (connection.organization_id !== user.organizationId) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }

      // Refresh the tokens
      const result = await oauthService.refreshOAuthTokens(connectionId, user.userId, req);

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
  securityMiddleware.validateInput([
    param('connectionId').isUUID().withMessage('Invalid connection ID')
  ]),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { connectionId } = req.params;

      // Verify connection exists and belongs to user's organization
      const connection = await platformConnectionRepository.findById(connectionId);

      if (!connection) {
        return res.status(404).json({
          error: 'Connection not found',
          code: 'CONNECTION_NOT_FOUND'
        });
      }

      if (connection.organization_id !== user.organizationId) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }

      // Revoke OAuth tokens
      await oauthService.revokeOAuthTokens(connectionId, user.userId, req);

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
  securityMiddleware.validateInput([
    param('connectionId').isUUID().withMessage('Invalid connection ID')
  ]),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { connectionId } = req.params;

      // Verify connection exists and belongs to user's organization
      const connection = await platformConnectionRepository.findById(connectionId);

      if (!connection) {
        return res.status(404).json({
          error: 'Connection not found',
          code: 'CONNECTION_NOT_FOUND'
        });
      }

      if (connection.organization_id !== user.organizationId) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }

      // Get access token for validation
      const accessToken = await oauthService.getValidAccessToken(connectionId, user.userId, req);

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
      const status: ConnectionStatus = validationResult.isValid ? 'active' : 'error';
      const errorMessage = validationResult.isValid ? null : validationResult.errors.join(', ');

      await platformConnectionRepository.updateStatus(connectionId, status, errorMessage);

      // Log validation
      await securityAuditService.logConnectionEvent(
        'connection_validate',
        connection.platform_type,
        user.userId,
        user.organizationId,
        connectionId,
        req,
        {
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
  securityMiddleware.validateInput([
    param('connectionId').isUUID().withMessage('Invalid connection ID')
  ]),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { connectionId } = req.params;

      // Verify connection exists and belongs to user's organization
      const connection = await platformConnectionRepository.findById(connectionId);

      if (!connection) {
        return res.status(404).json({
          error: 'Connection not found',
          code: 'CONNECTION_NOT_FOUND'
        });
      }

      if (connection.organization_id !== user.organizationId) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
      }

      const startTime = Date.now();
      
      // Get access token for discovery
      const accessToken = await oauthService.getValidAccessToken(connectionId, user.userId, req);

      // Perform discovery using the appropriate connector
      let automations, auditLogs, permissionCheck;
      
      switch (connection.platform_type) {
        case 'slack':
          await slackConnector.authenticate({
            accessToken,
            tokenType: 'Bearer'
          });
          
          [automations, auditLogs, permissionCheck] = await Promise.all([
            slackConnector.discoverAutomations(),
            slackConnector.getAuditLogs(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)), // Last 30 days
            slackConnector.validatePermissions()
          ]);
          break;
        
        default:
          throw new Error(`Platform ${connection.platform_type} discovery not implemented`);
      }

      const executionTimeMs = Date.now() - startTime;

      // Calculate risk score for the discovered automations
      const riskScore = await calculateRiskScore(automations);

      // Update connection last sync time
      await platformConnectionRepository.updateLastSync(connectionId);

      // Log discovery
      await securityAuditService.logConnectionEvent(
        'automation_discovery',
        connection.platform_type,
        user.userId,
        user.organizationId,
        connectionId,
        req,
        {
          automationsFound: automations.length,
          auditLogsFound: auditLogs.length,
          executionTimeMs,
          riskScore
        }
      );

      const discoveryResult = {
        platform: connection.platform_type,
        connectionId,
        automations,
        auditLogs,
        permissionCheck,
        discoveredAt: new Date(),
        errors: [],
        warnings: [],
        metadata: {
          executionTimeMs,
          automationsFound: automations.length,
          auditLogsFound: auditLogs.length,
          riskScore,
          complianceStatus: assessComplianceStatus(automations, auditLogs)
        }
      };

      res.json({
        success: true,
        discovery: discoveryResult,
        message: `Discovered ${automations.length} automations and ${auditLogs.length} audit log entries`
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
  async (req: Request, res: Response) => {
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
 * Calculate risk score for discovered automations
 */
function calculateRiskScore(automations: any[]): number {
  if (automations.length === 0) return 0;

  let totalRisk = 0;
  let riskFactors = 0;

  for (const automation of automations) {
    let automationRisk = 0;

    // Base risk by type
    switch (automation.type) {
      case 'bot':
        automationRisk += 30;
        break;
      case 'workflow':
        automationRisk += 40;
        break;
      case 'integration':
        automationRisk += 50;
        break;
      case 'webhook':
        automationRisk += 60;
        break;
      default:
        automationRisk += 25;
    }

    // Risk factors
    if (automation.permissions && automation.permissions.length > 5) {
      automationRisk += 20; // Many permissions
    }

    if (automation.status === 'error') {
      automationRisk += 30; // Error state
    }

    if (!automation.lastTriggered) {
      automationRisk += 10; // Never triggered (suspicious)
    }

    if (automation.metadata?.isInternal === false) {
      automationRisk += 25; // External/third-party
    }

    totalRisk += Math.min(automationRisk, 100);
    riskFactors++;
  }

  return Math.min(Math.round(totalRisk / riskFactors), 100);
}

/**
 * Assess compliance status based on automations and audit logs
 */
function assessComplianceStatus(automations: any[], auditLogs: any[]): 'compliant' | 'non_compliant' | 'unknown' {
  // Basic compliance assessment
  const hasAuditLogs = auditLogs.length > 0;
  const hasActiveAutomations = automations.some(a => a.status === 'active');
  const hasExternalIntegrations = automations.some(a => a.metadata?.isInternal === false);
  
  if (!hasAuditLogs && hasExternalIntegrations) {
    return 'non_compliant';
  }
  
  if (hasActiveAutomations && hasAuditLogs) {
    return 'compliant';
  }
  
  return 'unknown';
}

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
      // Use the risk service to assess each automation
      const riskAssessment = await riskService.assessAutomationRisk({
        id: automation.id,
        name: automation.name,
        type: automation.type,
        platform: automation.platform,
        status: automation.status,
        permissions: [],
        actions: automation.actions,
        dataAccessPatterns: [],
        ownerInfo: {},
        lastTriggered: automation.lastTriggered,
        metadata: automation.metadata || {}
      });

      totalRisk += riskAssessment.overallScore;
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