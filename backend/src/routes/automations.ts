/**
 * Automations API Routes
 * Handles automation discovery, retrieval, and management
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { ClerkAuthRequest } from '../middleware/clerk-auth';
import { validateRequest } from '../middleware/validation';
import { riskService } from '../services/risk-service';
import { exportService } from '../services/export.service';
import { db } from '../database/pool';
import {
  DiscoveredAutomation,
  AutomationType,
  AutomationStatus
} from '../types/database';
import { ExportRequest, Automation } from '@singura/shared-types';

// Database query result interfaces for type safety
interface AutomationQueryResult {
  id: string;
  name: string;
  description: string | null;
  automation_type: string;
  platform_type: string;
  status: string;
  risk_level: string | null;
  first_discovered_at: Date;
  last_triggered_at: Date | null;
  permissions_required: string[] | null;
  owner_info: { name?: string; email?: string } | null;
  platform_metadata: Record<string, unknown> | null;
  trigger_type: string | null;
  actions: string[] | null;
  risk_score: number | null;
  risk_factors: string[] | null;
  recommendations: string[] | null;
  data_access_patterns: string[] | null;
  external_id: string | null;
}

interface AutomationStatsQueryResult {
  total_automations: string;
  active_count: string;
  inactive_count: string;
  error_count: string;
  low_risk_count: string;
  medium_risk_count: string;
  high_risk_count: string;
  critical_risk_count: string;
  bot_count: string;
  workflow_count: string;
  integration_count: string;
  webhook_count: string;
  slack_count: string;
  google_count: string;
  microsoft_count: string;
  avg_risk_score: string;
}

interface AutomationDetailQueryResult extends AutomationQueryResult {
  external_id: string;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
  discovery_run_id: string;
  connection_name: string | null;
  permission_risk_score: number | null;
  data_access_risk_score: number | null;
  activity_risk_score: number | null;
  ownership_risk_score: number | null;
  compliance_issues: string[] | null;
  security_concerns: string[] | null;
  assessed_at: Date | null;
}

interface CountQueryResult {
  total: string;
}
import { QueryParameters } from '@singura/shared-types';

const router: Router = Router();

/**
 * Calculate risk level based on platform metadata
 */
function calculateRiskLevel(metadata: any): 'low' | 'medium' | 'high' | 'critical' {
  // AI platforms are automatically HIGH risk
  if (metadata.isAIPlatform === true) {
    return 'high';
  }

  // Calculate from risk factors
  const riskFactors = metadata.riskFactors || [];
  const riskFactorCount = riskFactors.length;

  if (riskFactorCount >= 5) return 'critical';
  if (riskFactorCount >= 3) return 'high';
  if (riskFactorCount >= 1) return 'medium';
  return 'low';
}

/**
 * Calculate numeric risk score (0-100)
 */
function calculateRiskScore(metadata: any): number {
  if (metadata.isAIPlatform === true) {
    return 85; // High risk for AI platforms
  }

  const riskFactors = metadata.riskFactors || [];
  const baseScore = 30;
  const factorScore = riskFactors.length * 15;

  return Math.min(100, baseScore + factorScore);
}

// Validation schemas
const automationFiltersSchema = z.object({
  platform: z.enum(['slack', 'google', 'microsoft', 'hubspot', 'salesforce', 'notion', 'asana', 'jira']).optional(),
  status: z.enum(['active', 'inactive', 'paused', 'error', 'unknown']).optional(),
  type: z.enum(['workflow', 'bot', 'integration', 'webhook', 'scheduled_task', 'trigger', 'script', 'service_account']).optional(),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort_by: z.enum(['name', 'type', 'riskLevel', 'lastTriggered', 'createdAt']).default('name'),
  sort_order: z.enum(['ASC', 'DESC']).default('ASC'),
});

/**
 * GET /automations
 * Get discovered automations with filtering and pagination
 */
router.get('/', validateRequest({ query: automationFiltersSchema }), async (req: ClerkAuthRequest, res: Response): Promise<void> => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      res.status(401).json({
        success: false,
        error: 'ORGANIZATION_NOT_FOUND',
        message: 'Organization ID not found in token'
      });
      return;
    }

    const { 
      platform, 
      status, 
      type, 
      riskLevel, 
      search, 
      page, 
      limit, 
      sort_by, 
      sort_order 
    } = req.query as unknown as z.infer<typeof automationFiltersSchema>;

    // Build base query
    let query = `
      SELECT 
        da.id,
        da.external_id,
        da.name,
        da.description,
        da.automation_type,
        da.status,
        da.trigger_type,
        da.actions,
        da.permissions_required,
        da.data_access_patterns,
        da.owner_info,
        da.last_modified_at,
        da.last_triggered_at,
        da.execution_frequency,
        da.platform_metadata,
        da.first_discovered_at,
        da.last_seen_at,
        da.is_active,
        da.created_at,
        da.updated_at,
        pc.platform_type,
        pc.display_name as connection_name,
        ra.risk_level,
        ra.risk_score,
        ra.risk_factors,
        ra.recommendations
      FROM discovered_automations da
      LEFT JOIN platform_connections pc ON da.platform_connection_id = pc.id
      LEFT JOIN risk_assessments ra ON da.id = ra.automation_id
      WHERE da.organization_id = $1
    `;

    const queryParams: QueryParameters = [organizationId];
    let paramIndex = 2;

    // Add filters
    if (platform) {
      query += ` AND pc.platform_type = $${paramIndex}`;
      queryParams.push(platform);
      paramIndex++;
    }

    if (status) {
      query += ` AND da.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (type) {
      query += ` AND da.automation_type = $${paramIndex}`;
      queryParams.push(type);
      paramIndex++;
    }

    if (riskLevel) {
      query += ` AND ra.risk_level = $${paramIndex}`;
      queryParams.push(riskLevel);
      paramIndex++;
    }

    if (search) {
      query += ` AND (da.name ILIKE $${paramIndex} OR da.description ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Add sorting
    const sortField = sort_by === 'riskLevel' ? 'ra.risk_level' : `da.${sort_by}`;
    query += ` ORDER BY ${sortField} ${sort_order}`;

    // Add pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    // Execute query
    const result = await db.query(query, queryParams);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT da.id) as total
      FROM discovered_automations da
      LEFT JOIN platform_connections pc ON da.platform_connection_id = pc.id
      LEFT JOIN risk_assessments ra ON da.id = ra.automation_id
      WHERE da.organization_id = $1
    `;
    const countParams: QueryParameters = [organizationId];
    let countParamIndex = 2;

    // Apply same filters for count
    if (platform) {
      countQuery += ` AND pc.platform_type = $${countParamIndex}`;
      countParams.push(platform);
      countParamIndex++;
    }

    if (status) {
      countQuery += ` AND da.status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }

    if (type) {
      countQuery += ` AND da.automation_type = $${countParamIndex}`;
      countParams.push(type);
      countParamIndex++;
    }

    if (riskLevel) {
      countQuery += ` AND ra.risk_level = $${countParamIndex}`;
      countParams.push(riskLevel);
      countParamIndex++;
    }

    if (search) {
      countQuery += ` AND (da.name ILIKE $${countParamIndex} OR da.description ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }

    const countResult = await db.query(countQuery, countParams) as { rows: CountQueryResult[] };
    const total = parseInt(countResult.rows[0]?.total || '0');
    const totalPages = Math.ceil(total / limit);

    // Transform results to match frontend expectations
    const typedResult = result as { rows: AutomationQueryResult[] };
    const automations = typedResult.rows.map(row => {
      // Extract platform metadata and calculate risk from it
      const platformMetadata = (row.platform_metadata as any) || {};
      const calculatedRiskLevel = calculateRiskLevel(platformMetadata);
      const calculatedRiskScore = calculateRiskScore(platformMetadata);

      return {
        id: row.id,
        name: row.name,
        description: row.description,
        type: row.automation_type,
        platform: row.platform_type,
        status: row.status,
        riskLevel: calculatedRiskLevel, // Use calculated risk from platform metadata
        createdAt: row.first_discovered_at,
        lastTriggered: row.last_triggered_at,
        permissions: row.permissions_required || [],
        createdBy: row.owner_info?.name || row.owner_info?.email,
        metadata: {
          ...platformMetadata,
          isInternal: true,
          triggers: row.trigger_type ? [row.trigger_type] : [],
          actions: row.actions || [],
          riskScore: calculatedRiskScore, // Use calculated score
          riskFactors: platformMetadata.riskFactors || row.risk_factors || [],
          recommendations: row.recommendations || [],
        }
      };
    });

    res.json({
      success: true,
      automations,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      }
    });

  } catch (error) {
    console.error('Failed to get automations:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_AUTOMATIONS_FAILED',
      message: 'Failed to retrieve automations'
    });
  }
});

/**
 * GET /automations/stats
 * Get automation statistics for the dashboard
 */
router.get('/stats', async (req: ClerkAuthRequest, res: Response): Promise<void> => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      res.status(401).json({
        success: false,
        error: 'ORGANIZATION_NOT_FOUND',
        message: 'Organization ID not found in token'
      });
      return;
    }

    const query = `
      SELECT 
        COUNT(*) as total_automations,
        COUNT(*) FILTER (WHERE da.status = 'active') as active_count,
        COUNT(*) FILTER (WHERE da.status = 'inactive') as inactive_count,
        COUNT(*) FILTER (WHERE da.status = 'error') as error_count,
        COUNT(*) FILTER (WHERE ra.risk_level = 'low') as low_risk_count,
        COUNT(*) FILTER (WHERE ra.risk_level = 'medium') as medium_risk_count,
        COUNT(*) FILTER (WHERE ra.risk_level = 'high') as high_risk_count,
        COUNT(*) FILTER (WHERE ra.risk_level = 'critical') as critical_risk_count,
        COUNT(*) FILTER (WHERE da.automation_type = 'bot') as bot_count,
        COUNT(*) FILTER (WHERE da.automation_type = 'workflow') as workflow_count,
        COUNT(*) FILTER (WHERE da.automation_type = 'integration') as integration_count,
        COUNT(*) FILTER (WHERE da.automation_type = 'webhook') as webhook_count,
        COUNT(*) FILTER (WHERE pc.platform_type = 'slack') as slack_count,
        COUNT(*) FILTER (WHERE pc.platform_type = 'google') as google_count,
        COUNT(*) FILTER (WHERE pc.platform_type = 'microsoft') as microsoft_count,
        AVG(ra.risk_score) as avg_risk_score
      FROM discovered_automations da
      LEFT JOIN platform_connections pc ON da.platform_connection_id = pc.id
      LEFT JOIN risk_assessments ra ON da.id = ra.automation_id
      WHERE da.organization_id = $1
    `;

    const result = await db.query(query, [organizationId]) as { rows: AutomationStatsQueryResult[] };
    const stats = result.rows[0];

    if (!stats) {
      res.status(404).json({
        success: false,
        error: 'STATS_NOT_FOUND',
        message: 'No automation statistics found for this organization'
      });
      return;
    }

    const response = {
      totalAutomations: parseInt(stats.total_automations),
      byStatus: {
        active: parseInt(stats.active_count),
        inactive: parseInt(stats.inactive_count),
        error: parseInt(stats.error_count),
        unknown: 0
      },
      byRiskLevel: {
        low: parseInt(stats.low_risk_count),
        medium: parseInt(stats.medium_risk_count),
        high: parseInt(stats.high_risk_count),
        critical: parseInt(stats.critical_risk_count)
      },
      byType: {
        bot: parseInt(stats.bot_count),
        workflow: parseInt(stats.workflow_count),
        integration: parseInt(stats.integration_count),
        webhook: parseInt(stats.webhook_count)
      },
      byPlatform: {
        slack: parseInt(stats.slack_count),
        google: parseInt(stats.google_count),
        microsoft: parseInt(stats.microsoft_count),
        hubspot: 0,
        salesforce: 0,
        notion: 0,
        asana: 0,
        jira: 0
      },
      averageRiskScore: parseFloat(stats.avg_risk_score) || 0
    };

    res.json({
      success: true,
      stats: response
    });

  } catch (error) {
    console.error('Failed to get automation stats:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_STATS_FAILED',
      message: 'Failed to retrieve automation statistics'
    });
  }
});

/**
 * GET /automations/:id
 * Get detailed information about a specific automation
 */
router.get('/:id', async (req: ClerkAuthRequest, res: Response): Promise<void> => {
  try {
    const organizationId = req.user?.organizationId;
    const automationId = req.params.id;

    if (!organizationId) {
      res.status(401).json({
        success: false,
        error: 'ORGANIZATION_NOT_FOUND',
        message: 'Organization ID not found in token'
      });
      return;
    }

    const query = `
      SELECT 
        da.*,
        pc.platform_type,
        pc.display_name as connection_name,
        ra.risk_level,
        ra.risk_score,
        ra.permission_risk_score,
        ra.data_access_risk_score,
        ra.activity_risk_score,
        ra.ownership_risk_score,
        ra.risk_factors,
        ra.compliance_issues,
        ra.security_concerns,
        ra.recommendations,
        ra.assessed_at
      FROM discovered_automations da
      LEFT JOIN platform_connections pc ON da.platform_connection_id = pc.id
      LEFT JOIN risk_assessments ra ON da.id = ra.automation_id
      WHERE da.id = $1 AND da.organization_id = $2
    `;

    const result = await db.query(query, [automationId, organizationId]) as { rows: AutomationDetailQueryResult[] };

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'AUTOMATION_NOT_FOUND',
        message: 'Automation not found'
      });
      return;
    }

    const automation = result.rows[0]!; // Safe because we checked rows.length above

    const response = {
      id: automation.id,
      name: automation.name,
      description: automation.description,
      automation_type: automation.automation_type,
      platform: automation.platform_type,
      status: automation.status,
      riskLevel: automation.risk_level || 'medium',
      createdAt: automation.first_discovered_at,
      lastTriggered: automation.last_triggered_at,
      permissions: automation.permissions_required || [],
      createdBy: automation.owner_info?.name || automation.owner_info?.email,
      metadata: {
        ...automation.platform_metadata,
        isInternal: true,
        triggers: automation.trigger_type ? [automation.trigger_type] : [],
        actions: automation.actions || [],
        riskScore: automation.risk_score,
        riskFactors: automation.risk_factors || [],
        recommendations: automation.recommendations || [],
        complianceIssues: automation.compliance_issues || [],
        securityConcerns: automation.security_concerns || [],
        detailedRiskScores: {
          permission: automation.permission_risk_score,
          dataAccess: automation.data_access_risk_score,
          activity: automation.activity_risk_score,
          ownership: automation.ownership_risk_score
        },
        lastAssessed: automation.assessed_at
      }
    };

    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Failed to get automation details:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_AUTOMATION_FAILED',
      message: 'Failed to retrieve automation details'
    });
  }
});

/**
 * GET /automations/:id/details
 * Get detailed automation information with enriched OAuth permissions
 */
router.get('/:id/details', async (req: ClerkAuthRequest, res: Response): Promise<void> => {
  try {
    const organizationId = req.user?.organizationId;
    const automationId = req.params.id;

    if (!organizationId) {
      res.status(401).json({
        success: false,
        error: 'ORGANIZATION_NOT_FOUND',
        message: 'Organization ID not found in token'
      });
      return;
    }

    // Query automation data with platform connection and risk assessment
    const automationQuery = `
      SELECT
        da.*,
        pc.id as connection_id,
        pc.platform_type,
        pc.display_name as connection_name,
        pc.status as connection_status,
        ra.risk_level,
        ra.risk_score,
        ra.risk_factors
      FROM discovered_automations da
      LEFT JOIN platform_connections pc ON da.platform_connection_id = pc.id
      LEFT JOIN risk_assessments ra ON da.id = ra.automation_id
      WHERE da.id = $1 AND da.organization_id = $2
    `;

    const automationResult = await db.query(automationQuery, [automationId, organizationId]) as {
      rows: Array<AutomationQueryResult & {
        connection_id?: string;
        connection_name?: string;
        connection_status?: string;
      }>
    };

    if (automationResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'AUTOMATION_NOT_FOUND',
        message: 'Automation not found'
      });
      return;
    }

    const automation = automationResult.rows[0]!;

    // Try permissions_required first, then fall back to platform_metadata.scopes
    // Google OAuth apps store scopes in platform_metadata.scopes
    const permissions: string[] = (automation.permissions_required && automation.permissions_required.length > 0)
      ? automation.permissions_required
      : (Array.isArray(automation.platform_metadata?.scopes) ? automation.platform_metadata.scopes : []);

    // Enrich OAuth permissions using oauth_scope_library
    const enrichedPermissions = [];
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    if (permissions.length > 0) {
      // Query oauth_scope_library for all permissions at once
      const scopeQuery = `
        SELECT
          scope_url,
          display_name,
          description,
          risk_level,
          data_types,
          service_name,
          access_level,
          common_use_cases
        FROM oauth_scope_library
        WHERE scope_url = ANY($1::text[])
      `;

      const scopeResult = await db.query(scopeQuery, [permissions as unknown as string]) as {
        rows: Array<{
          scope_url: string;
          display_name: string;
          description: string;
          risk_level: string;
          data_types: string[] | null;
          service_name: string;
          access_level: string;
          common_use_cases: string | null;
        }>
      };

      // Create a map of scope URL to enriched data
      const scopeMap = new Map(
        scopeResult.rows.map(scope => [scope.scope_url, scope])
      );

      // Enrich each permission
      for (const permission of permissions) {
        const scopeData = scopeMap.get(permission);

        if (scopeData) {
          // Calculate numeric risk score from risk level
          let riskScore = 30; // default medium
          switch (scopeData.risk_level.toUpperCase()) {
            case 'CRITICAL':
              riskScore = 95;
              break;
            case 'HIGH':
              riskScore = 75;
              break;
            case 'MEDIUM':
              riskScore = 50;
              break;
            case 'LOW':
              riskScore = 20;
              break;
          }

          // Use library data - map to frontend expected fields
          enrichedPermissions.push({
            scopeUrl: permission,
            displayName: scopeData.display_name,
            serviceName: scopeData.service_name,
            description: scopeData.description,
            accessLevel: scopeData.access_level,
            riskLevel: scopeData.risk_level.toLowerCase(),
            riskScore,
            dataTypes: scopeData.data_types || [],
            userImpact: scopeData.common_use_cases || 'No impact information available',
            // Also include legacy fields for backward compatibility
            scope: permission,
            category: scopeData.service_name,
            dataAccess: scopeData.data_types || []
          });

          // Count by risk level
          switch (scopeData.risk_level.toUpperCase()) {
            case 'CRITICAL':
              criticalCount++;
              break;
            case 'HIGH':
              highCount++;
              break;
            case 'MEDIUM':
              mediumCount++;
              break;
            case 'LOW':
              lowCount++;
              break;
          }
        } else {
          // Fallback for permissions not in library - map to frontend expected fields
          enrichedPermissions.push({
            scopeUrl: permission,
            displayName: permission.split('/').pop() || permission,
            serviceName: 'Unknown Service',
            description: `OAuth permission: ${permission}`,
            accessLevel: 'Unknown Access',
            riskLevel: 'medium',
            riskScore: 50,
            dataTypes: [],
            userImpact: 'Unknown - not in scope library',
            // Also include legacy fields for backward compatibility
            scope: permission,
            category: 'Unknown',
            dataAccess: []
          });
          mediumCount++;
        }
      }
    }

    // Determine overall risk based on highest risk level present
    let overallRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (criticalCount > 0) {
      overallRisk = 'critical';
    } else if (highCount > 0) {
      overallRisk = 'high';
    } else if (mediumCount > 0) {
      overallRisk = 'medium';
    }

    // Build response matching frontend expectations
    // Prioritize platform_metadata fields when available (Google OAuth apps use this)
    const response = {
      success: true,
      automation: {
        id: automation.id,
        name: automation.name,
        description: automation.platform_metadata?.description || automation.description || '',
        authorizedBy: automation.platform_metadata?.authorizedBy || automation.owner_info?.name || automation.owner_info?.email || 'Unknown',
        createdAt: automation.first_discovered_at.toISOString(),
        lastActivity: automation.platform_metadata?.lastActivity || automation.last_triggered_at?.toISOString() || automation.first_discovered_at.toISOString(),
        permissions: {
          total: permissions.length,
          enriched: enrichedPermissions,
          riskAnalysis: {
            overallRisk,
            breakdown: {
              criticalCount,
              highCount,
              mediumCount,
              lowCount
            }
          }
        },
        metadata: {
          isAIPlatform: automation.platform_metadata?.isAIPlatform || false,
          platformName: automation.platform_metadata?.platformName || automation.platform_type || undefined,
          clientId: automation.platform_metadata?.clientId || automation.external_id || undefined,
          authorizedBy: automation.platform_metadata?.authorizedBy || automation.owner_info?.name || automation.owner_info?.email || undefined,
          firstAuthorization: automation.platform_metadata?.firstAuthorization || undefined,
          detectionMethod: automation.platform_metadata?.detectionMethod || automation.automation_type || 'Unknown',
          riskFactors: automation.platform_metadata?.riskFactors || automation.risk_factors || []
        },
        connection: automation.connection_id ? {
          id: automation.connection_id,
          platform: automation.platform_type || 'unknown',
          status: automation.connection_status || 'unknown'
        } : undefined
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Failed to get automation details:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_AUTOMATION_DETAILS_FAILED',
      message: 'Failed to retrieve automation details'
    });
  }
});

/**
 * POST /automations/:id/assess-risk
 * Trigger risk assessment for a specific automation
 */
router.post('/:id/assess-risk', async (req: ClerkAuthRequest, res: Response): Promise<void> => {
  try {
    const organizationId = req.user?.organizationId;
    const automationId = req.params.id;

    if (!organizationId) {
      res.status(401).json({
        success: false,
        error: 'ORGANIZATION_NOT_FOUND',
        message: 'Organization ID not found in token'
      });
      return;
    }

    // Get the automation
    const automationQuery = `
      SELECT da.*, pc.platform_type 
      FROM discovered_automations da
      LEFT JOIN platform_connections pc ON da.platform_connection_id = pc.id
      WHERE da.id = $1 AND da.organization_id = $2
    `;

    const automationResult = await db.query(automationQuery, [automationId, organizationId]) as { rows: AutomationQueryResult[] };

    if (automationResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'AUTOMATION_NOT_FOUND',
        message: 'Automation not found'
      });
      return;
    }

    const automation = automationResult.rows[0]!; // Safe because we checked rows.length above

    // Create a proper DiscoveredAutomation object for risk assessment
    const automationForAssessment: DiscoveredAutomation = {
      id: automation.id,
      organization_id: organizationId,
      platform_connection_id: '', // Will be set by risk service if needed
      discovery_run_id: '', // Will be set by risk service if needed
      external_id: automation.id,
      name: automation.name,
      description: automation.description,
      automation_type: automation.automation_type as AutomationType,
      status: automation.status as AutomationStatus,
      trigger_type: automation.trigger_type,
      actions: automation.actions || [],
      permissions_required: automation.permissions_required || [],
      data_access_patterns: automation.data_access_patterns || [],
      owner_info: automation.owner_info || { name: '', email: '' },
      last_modified_at: null,
      last_triggered_at: automation.last_triggered_at,
      execution_frequency: null,
      platform_metadata: automation.platform_metadata || {},
      first_discovered_at: automation.first_discovered_at,
      last_seen_at: new Date(),
      is_active: automation.status === 'active',
      created_at: new Date(),
      updated_at: new Date()
    };

    // Run risk assessment
    const assessment = await riskService.assessAutomationRisk(automationForAssessment);

    res.json({
      success: true,
      assessment
    });

  } catch (error) {
    console.error('Failed to assess automation risk:', error);
    res.status(500).json({
      success: false,
      error: 'RISK_ASSESSMENT_FAILED',
      message: 'Failed to assess automation risk'
    });
  }
});

/**
 * POST /automations/export/csv
 * Export automations to CSV format
 */
router.post('/export/csv', async (req: ClerkAuthRequest, res: Response): Promise<void> => {
  try {
    const organizationId = req.user?.organizationId;
    const { automationIds } = req.body as ExportRequest;

    if (!organizationId) {
      res.status(401).json({
        success: false,
        error: 'ORGANIZATION_NOT_FOUND',
        message: 'Organization ID not found in token'
      });
      return;
    }

    // Validate request body
    if (!automationIds || !Array.isArray(automationIds) || automationIds.length === 0) {
      res.status(400).json({
        success: false,
        error: 'INVALID_REQUEST',
        message: 'automationIds array is required'
      });
      return;
    }

    // Fetch automations from database
    const query = `
      SELECT
        da.id,
        da.name,
        da.description,
        da.automation_type as type,
        da.status,
        pc.platform_type as platform,
        ra.risk_level,
        ra.risk_score,
        da.first_discovered_at,
        da.last_triggered_at,
        da.owner_info,
        da.platform_metadata
      FROM discovered_automations da
      LEFT JOIN platform_connections pc ON da.platform_connection_id = pc.id
      LEFT JOIN risk_assessments ra ON da.id = ra.automation_id
      WHERE da.id = ANY($1::uuid[]) AND da.organization_id = $2
    `;

    const result = await db.query(query, [automationIds as any, organizationId]) as {
      rows: Array<{
        id: string;
        name: string;
        description: string | null;
        type: string;
        status: string;
        platform: string;
        risk_level: string | null;
        risk_score: number | null;
        first_discovered_at: Date;
        last_triggered_at: Date | null;
        owner_info: any;
        platform_metadata: any;
      }>
    };

    // Transform to Automation type for export service
    const automations: Automation[] = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      type: row.type as any,
      status: row.status as any,
      platform: row.platform || 'unknown',
      platformId: row.id,
      organizationId,
      connectionId: '',
      risk: {
        level: (row.risk_level || 'medium') as any,
        score: row.risk_score || 0,
        factors: []
      },
      permissions: {
        scopes: [],
        roles: []
      },
      metadata: {
        discoveredAt: row.first_discovered_at.toISOString(),
        lastActiveAt: row.last_triggered_at?.toISOString() || row.first_discovered_at.toISOString(),
        ...row.platform_metadata
      },
      affectedUsers: row.owner_info?.email ? [row.owner_info.email] : []
    } as any));

    // Generate CSV
    const csvBuffer = await exportService.exportToCSV(automations);

    // Set response headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="automations-export-${new Date().toISOString().split('T')[0]}.csv"`);
    res.setHeader('Content-Length', csvBuffer.length.toString());

    res.send(csvBuffer);

  } catch (error) {
    console.error('Failed to export automations to CSV:', error);
    res.status(500).json({
      success: false,
      error: 'EXPORT_FAILED',
      message: 'Failed to export automations to CSV'
    });
  }
});

/**
 * POST /automations/export/pdf
 * Export automations to PDF format
 */
router.post('/export/pdf', async (req: ClerkAuthRequest, res: Response): Promise<void> => {
  try {
    const organizationId = req.user?.organizationId;
    const { automationIds } = req.body as ExportRequest;

    if (!organizationId) {
      res.status(401).json({
        success: false,
        error: 'ORGANIZATION_NOT_FOUND',
        message: 'Organization ID not found in token'
      });
      return;
    }

    // Validate request body
    if (!automationIds || !Array.isArray(automationIds) || automationIds.length === 0) {
      res.status(400).json({
        success: false,
        error: 'INVALID_REQUEST',
        message: 'automationIds array is required'
      });
      return;
    }

    // Fetch automations from database
    const query = `
      SELECT
        da.id,
        da.name,
        da.description,
        da.automation_type as type,
        da.status,
        pc.platform_type as platform,
        ra.risk_level,
        ra.risk_score,
        da.first_discovered_at,
        da.last_triggered_at,
        da.owner_info,
        da.platform_metadata
      FROM discovered_automations da
      LEFT JOIN platform_connections pc ON da.platform_connection_id = pc.id
      LEFT JOIN risk_assessments ra ON da.id = ra.automation_id
      WHERE da.id = ANY($1::uuid[]) AND da.organization_id = $2
    `;

    const result = await db.query(query, [automationIds as any, organizationId]) as {
      rows: Array<{
        id: string;
        name: string;
        description: string | null;
        type: string;
        status: string;
        platform: string;
        risk_level: string | null;
        risk_score: number | null;
        first_discovered_at: Date;
        last_triggered_at: Date | null;
        owner_info: any;
        platform_metadata: any;
      }>
    };

    // Transform to Automation type for export service
    const automations: Automation[] = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      type: row.type as any,
      status: row.status as any,
      platform: row.platform || 'unknown',
      platformId: row.id,
      organizationId,
      connectionId: '',
      risk: {
        level: (row.risk_level || 'medium') as any,
        score: row.risk_score || 0,
        factors: []
      },
      permissions: {
        scopes: [],
        roles: []
      },
      metadata: {
        discoveredAt: row.first_discovered_at.toISOString(),
        lastActiveAt: row.last_triggered_at?.toISOString() || row.first_discovered_at.toISOString(),
        ...row.platform_metadata
      },
      affectedUsers: row.owner_info?.email ? [row.owner_info.email] : []
    } as any));

    // Generate PDF
    const pdfBuffer = await exportService.exportToPDF(automations);

    // Set response headers for file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="automations-export-${new Date().toISOString().split('T')[0]}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length.toString());

    res.send(pdfBuffer);

  } catch (error) {
    console.error('Failed to export automations to PDF:', error);
    res.status(500).json({
      success: false,
      error: 'EXPORT_FAILED',
      message: 'Failed to export automations to PDF'
    });
  }
});

export default router;