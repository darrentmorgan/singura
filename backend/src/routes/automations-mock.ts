/**
 * Automations API Routes
 * Returns automation data based on toggle state (mock vs real data)
 */

import { Router, Request, Response } from 'express';
import { getDataProvider } from '../services/data-provider';
import { isMockDataEnabledRuntime } from './dev-routes';
import { discoveredAutomationRepository } from '../database/repositories/discovered-automation';
import { DiscoveredAutomation } from '../types/database';
import { oauthScopeEnrichmentService } from '../services/oauth-scope-enrichment.service';
import { optionalClerkAuth, ClerkAuthRequest } from '../middleware/clerk-auth';
import { platformConnectionRepository } from '../database/repositories/platform-connection';

interface UserPayload {
  userId: string;
  organizationId: string;
}

const router = Router();

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

// Mock automation data
const mockAutomations = [
  {
    id: '1',
    name: 'Customer Onboarding Bot',
    description: 'Automated workflow that guides new customers through the onboarding process',
    type: 'bot',
    platform: 'slack',
    status: 'active',
    riskLevel: 'high',
    createdAt: '2024-08-15T10:30:00Z',
    lastTriggered: '2024-08-27T08:15:00Z',
    permissions: ['channels:read', 'chat:write', 'users:read', 'im:write'],
    createdBy: 'john.doe@company.com',
    metadata: {
      riskScore: 85,
      riskFactors: [
        'Has elevated permissions including direct message access',
        'Processes sensitive customer data during onboarding',
        'No regular security review documented'
      ],
      recommendations: [
        'Implement regular permission audit',
        'Add data encryption for customer information',
        'Set up monitoring alerts for unusual activity'
      ]
    }
  },
  {
    id: '2',
    name: 'Google Sheets Data Sync',
    description: 'Synchronizes sales data between CRM and Google Sheets',
    type: 'integration',
    platform: 'google',
    status: 'active',
    riskLevel: 'medium',
    createdAt: '2024-08-20T14:22:00Z',
    lastTriggered: '2024-08-27T12:00:00Z',
    permissions: ['spreadsheets.read', 'spreadsheets.write'],
    createdBy: 'jane.smith@company.com',
    metadata: {
      riskScore: 45,
      riskFactors: [
        'Accesses financial data',
        'No data validation on sync operations'
      ],
      recommendations: [
        'Add data validation before sync',
        'Implement backup mechanism'
      ]
    }
  },
  {
    id: '3',
    name: 'Teams Meeting Recorder',
    description: 'Automatically records and transcribes important meetings',
    type: 'bot',
    platform: 'microsoft',
    status: 'active',
    riskLevel: 'critical',
    createdAt: '2024-08-10T09:15:00Z',
    lastTriggered: '2024-08-27T10:30:00Z',
    permissions: ['online_meetings', 'calendar.read', 'mail.send'],
    createdBy: 'admin@company.com',
    metadata: {
      riskScore: 95,
      riskFactors: [
        'Records and stores confidential meeting content',
        'Has broad calendar access across organization',
        'Can send emails on behalf of users',
        'No encryption configured for stored recordings'
      ],
      recommendations: [
        'Enable end-to-end encryption for recordings',
        'Limit calendar access to specific meeting types',
        'Implement automatic deletion of recordings after 90 days',
        'Add user consent verification before recording'
      ]
    }
  },
  {
    id: '4',
    name: 'Expense Report Processor',
    description: 'Processes expense reports and integrates with accounting system',
    type: 'workflow',
    platform: 'google',
    status: 'inactive',
    riskLevel: 'low',
    createdAt: '2024-07-30T16:45:00Z',
    lastTriggered: '2024-08-25T14:20:00Z',
    permissions: ['drive.file', 'gmail.readonly'],
    createdBy: 'finance@company.com',
    metadata: {
      riskScore: 25,
      riskFactors: [
        'Currently inactive - minimal risk'
      ],
      recommendations: [
        'Reactivate with updated security controls',
        'Review and update permissions before reactivation'
      ]
    }
  },
  {
    id: '5',
    name: 'Slack Alert Webhook',
    description: 'Sends system alerts to operations channel',
    type: 'webhook',
    platform: 'slack',
    status: 'active',
    riskLevel: 'medium',
    createdAt: '2024-08-22T11:30:00Z',
    lastTriggered: '2024-08-27T13:45:00Z',
    permissions: ['incoming-webhook'],
    createdBy: 'ops-team@company.com',
    metadata: {
      riskScore: 35,
      riskFactors: [
        'Public webhook URL could be exposed',
        'No rate limiting configured'
      ],
      recommendations: [
        'Add authentication to webhook',
        'Implement rate limiting',
        'Monitor for unusual webhook usage'
      ]
    }
  }
];

// Mock statistics
const mockStats = {
  totalAutomations: 5,
  byStatus: {
    active: 4,
    inactive: 1,
    error: 0,
    unknown: 0
  },
  byRiskLevel: {
    low: 1,
    medium: 2,
    high: 1,
    critical: 1
  },
  byType: {
    bot: 2,
    workflow: 1,
    integration: 1,
    webhook: 1
  },
  byPlatform: {
    slack: 2,
    google: 2,
    microsoft: 1,
    hubspot: 0,
    salesforce: 0,
    notion: 0,
    asana: 0,
    jira: 0
  },
  averageRiskScore: 57
};

/**
 * GET /automations
 * Get discovered automations with filtering and pagination
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // Check runtime toggle state for data provider selection
    const useMockData = (() => {
      try {
        // In development, check runtime toggle state
        if (process.env.NODE_ENV === 'development') {
          return isMockDataEnabledRuntime();
        }
        // In production, never use mock data
        return false;
      } catch (error) {
        // Fallback to environment variable
        console.warn('Runtime toggle check failed, using environment variable:', error);
        return process.env.USE_MOCK_DATA === 'true';
      }
    })();

    console.log('Automations API - Data Provider Selection:', {
      environment: process.env.NODE_ENV,
      runtimeToggle: process.env.NODE_ENV === 'development' ? 'checked' : 'disabled',
      useMockData,
      endpoint: '/api/automations'
    });

    // Use data provider based on toggle state
    const dataProvider = getDataProvider(useMockData);

    // Get automations from selected data provider
    let automations: any[];
    if (useMockData) {
      automations = mockAutomations;
      console.log('Using MockDataProvider - 5 mock automations returned');
    } else {
      // Get real automations from database
      const user = req.user as UserPayload | undefined;
      if (!user?.organizationId) {
        res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Organization ID required'
        });
        return;
      }

      const dbResult = await discoveredAutomationRepository.findManyCustom({
        organization_id: user.organizationId,
        is_active: true
      });

      // Map database automations to API format
      automations = dbResult.data.map((da: DiscoveredAutomation & { platform_type?: string | null; platform_metadata?: any }) => {
        // Extract platform_metadata JSONB
        const platformMetadata = da.platform_metadata || {};

        return {
          id: da.id,
          name: da.name,
          description: da.description || '',
          type: da.automation_type,
          platform: da.platform_type || 'unknown', // Enriched from platform_connection JOIN
          status: da.status || 'unknown',
          riskLevel: calculateRiskLevel(platformMetadata),
          createdAt: platformMetadata.firstAuthorization || da.first_discovered_at?.toISOString() || da.created_at.toISOString(),
          lastTriggered: platformMetadata.lastActivity || da.last_triggered_at?.toISOString() || '',
          permissions: platformMetadata.scopes || [],
          createdBy: platformMetadata.authorizedBy ||
            (da.owner_info && typeof da.owner_info === 'object' && 'email' in da.owner_info
              ? String(da.owner_info.email)
              : 'unknown'),
          metadata: {
            riskScore: calculateRiskScore(platformMetadata),
            riskFactors: platformMetadata.riskFactors || [],
            recommendations: [],
            platformName: platformMetadata.platformName,
            isAIPlatform: platformMetadata.isAIPlatform || false,
            clientId: platformMetadata.clientId,
            detectionMethod: platformMetadata.detectionMethod,
            authorizationAge: platformMetadata.authorizationAge,
            firstAuthorization: platformMetadata.firstAuthorization,
            lastActivity: platformMetadata.lastActivity
          }
        };
      });

      console.log(`Using RealDataProvider - ${automations.length} automations from database`);
    }

    const { 
      platform, 
      status, 
      type, 
      riskLevel, 
      search, 
      page = 1, 
      limit = 20, 
      sort_by = 'name', 
      sort_order = 'ASC' 
    } = req.query;

    let filteredAutomations = [...automations];

    // Apply filters
    if (platform) {
      filteredAutomations = filteredAutomations.filter(a => a.platform === platform);
    }
    if (status) {
      filteredAutomations = filteredAutomations.filter(a => a.status === status);
    }
    if (type) {
      filteredAutomations = filteredAutomations.filter(a => a.type === type);
    }
    if (riskLevel) {
      filteredAutomations = filteredAutomations.filter(a => a.riskLevel === riskLevel);
    }
    if (search) {
      const searchLower = (search as string).toLowerCase();
      filteredAutomations = filteredAutomations.filter(a => 
        a.name.toLowerCase().includes(searchLower) ||
        (a.description && a.description.toLowerCase().includes(searchLower))
      );
    }

    // Apply sorting
    filteredAutomations.sort((a, b) => {
      let aVal = a[sort_by as keyof typeof a] as any;
      let bVal = b[sort_by as keyof typeof b] as any;
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal?.toLowerCase() || '';
      }
      
      if (aVal < bVal) return sort_order === 'ASC' ? -1 : 1;
      if (aVal > bVal) return sort_order === 'ASC' ? 1 : -1;
      return 0;
    });

    // Apply pagination
    const total = filteredAutomations.length;
    const totalPages = Math.ceil(total / Number(limit));
    const offset = (Number(page) - 1) * Number(limit);
    const paginatedResults = filteredAutomations.slice(offset, offset + Number(limit));

    res.json({
      success: true,
      automations: paginatedResults,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrevious: Number(page) > 1,
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
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    // Determine data source based on runtime toggle
    const useMockData = await (async () => {
      try {
        if (process.env.NODE_ENV !== 'development') {
          return false;
        }
        return await isMockDataEnabledRuntime();
      } catch (error) {
        // Fallback to environment variable
        console.warn('Runtime toggle check failed, using environment variable:', error);
        return process.env.USE_MOCK_DATA === 'true';
      }
    })();

    console.log('Automations Stats API - Data Provider Selection:', {
      environment: process.env.NODE_ENV,
      runtimeToggle: process.env.NODE_ENV === 'development' ? 'checked' : 'disabled',
      useMockData,
      endpoint: '/api/automations/stats'
    });

    // Use appropriate stats based on toggle state
    let stats;
    if (useMockData) {
      stats = mockStats;
      console.log('Using MockDataProvider - mock stats returned');
    } else {
      // Get real stats from database
      const user = req.user as UserPayload | undefined;
      if (!user?.organizationId) {
        res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Organization ID required'
        });
        return;
      }

      const dbStats = await discoveredAutomationRepository.getStatsByOrganization(user.organizationId);
      const platformStats = await discoveredAutomationRepository.getByPlatformForOrganization(user.organizationId);

      // Map platform stats to object
      const byPlatform = platformStats.reduce((acc: Record<string, number>, p: any) => {
        acc[p.platform_type] = parseInt(p.count);
        return acc;
      }, {
        slack: 0,
        google: 0,
        microsoft: 0,
        hubspot: 0,
        salesforce: 0,
        notion: 0,
        asana: 0,
        jira: 0
      } as Record<string, number>);

      stats = {
        totalAutomations: parseInt(dbStats.total_automations) || 0,
        byStatus: {
          active: parseInt(dbStats.active) || 0,
          inactive: parseInt(dbStats.inactive) || 0,
          error: parseInt(dbStats.error) || 0,
          unknown: parseInt(dbStats.unknown) || 0
        },
        byRiskLevel: {
          low: 0,
          medium: 0,
          high: 0,
          critical: 0
        },
        byType: {
          bot: parseInt(dbStats.bots) || 0,
          workflow: parseInt(dbStats.workflows) || 0,
          integration: parseInt(dbStats.integrations) || 0,
          webhook: parseInt(dbStats.webhooks) || 0
        },
        byPlatform
      };
      console.log(`Using RealDataProvider - stats from database: ${stats.totalAutomations} total automations`);
    }

    res.json({
      success: true,
      stats
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
 * GET /automations/:id/details
 * Get detailed information about a specific automation with enriched OAuth scopes
 */
router.get('/:id/details', optionalClerkAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const authRequest = req as ClerkAuthRequest;
    const user = authRequest.user;

    // Check runtime toggle state for data provider selection
    const useMockData = (() => {
      try {
        // In development, check runtime toggle state
        if (process.env.NODE_ENV === 'development') {
          return isMockDataEnabledRuntime();
        }
        // In production, never use mock data
        return false;
      } catch (error) {
        // Fallback to environment variable
        console.warn('Runtime toggle check failed, using environment variable:', error);
        return process.env.USE_MOCK_DATA === 'true';
      }
    })();

    console.log('Automation Details API - Data Provider Selection:', {
      environment: process.env.NODE_ENV,
      runtimeToggle: process.env.NODE_ENV === 'development' ? 'checked' : 'disabled',
      useMockData,
      automationId: id,
      endpoint: '/api/automations/:id/details'
    });

    // Return mock data if enabled
    if (useMockData) {
      const mockAutomation = mockAutomations.find(a => a.id === id);

      if (!mockAutomation) {
        res.status(404).json({
          success: false,
          error: 'Mock automation not found'
        });
        return;
      }

      // Return mock data in the same format as real data
      res.json({
        success: true,
        automation: {
          id: mockAutomation.id,
          name: mockAutomation.name,
          description: mockAutomation.description,
          type: mockAutomation.type,
          platform: mockAutomation.platform,
          status: mockAutomation.status,
          createdAt: mockAutomation.createdAt,
          authorizedBy: mockAutomation.createdBy,
          lastActivity: mockAutomation.lastTriggered,
          authorizationAge: 'N/A (Mock Data)',
          connection: null,
          permissions: {
            total: mockAutomation.permissions.length,
            enriched: mockAutomation.permissions.map(permission => ({
              scopeUrl: permission,
              serviceName: 'Mock Service',
              displayName: permission,
              description: `Mock permission: ${permission}`,
              accessLevel: 'read_write',
              riskScore: mockAutomation.metadata.riskScore,
              riskLevel: mockAutomation.riskLevel,
              dataTypes: ['Mock Data'],
              alternatives: 'N/A - Mock Data',
              gdprImpact: 'N/A - Mock Data'
            })),
            riskAnalysis: {
              overallRisk: mockAutomation.metadata.riskScore,
              riskLevel: mockAutomation.riskLevel,
              highestRisk: mockAutomation.permissions.length > 0 ? {
                scope: mockAutomation.permissions[0],
                score: mockAutomation.metadata.riskScore
              } : null,
              breakdown: mockAutomation.permissions.map(permission => ({
                scope: permission,
                riskScore: mockAutomation.metadata.riskScore,
                contribution: Math.floor(100 / mockAutomation.permissions.length)
              }))
            }
          },
          metadata: {
            isAIPlatform: false,
            platformName: mockAutomation.platform,
            clientId: `mock-client-${mockAutomation.id}`,
            detectionMethod: 'Mock Detection',
            riskFactors: mockAutomation.metadata.riskFactors
          }
        }
      });
      return;
    }

    // Real data path: Check for valid user and organization
    if (!user?.organizationId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized - Organization ID required'
      });
      return;
    }

    // Get automation from database with platform_type via JOIN
    const automationResult = await discoveredAutomationRepository.findManyCustom({
      organization_id: user.organizationId
    });

    const automation = automationResult.data.find(a => a.id === id);

    if (!automation) {
      res.status(404).json({
        success: false,
        error: 'Automation not found'
      });
      return;
    }

    // Extract platform metadata
    const platformMetadata = (automation.platform_metadata as any) || {};
    const scopes: string[] = Array.isArray(platformMetadata.scopes) ? platformMetadata.scopes : [];

    // Enrich OAuth scopes with library metadata
    let enrichedScopes: any[] = [];
    let permissionRisk: any = null;

    if (scopes.length > 0) {
      const platform = automation.platform_type || 'google';
      enrichedScopes = await oauthScopeEnrichmentService.enrichScopes(scopes, platform);

      if (enrichedScopes.length > 0) {
        permissionRisk = oauthScopeEnrichmentService.calculatePermissionRisk(enrichedScopes);
      }
    }

    // Get platform connection info for additional context
    const connection = await platformConnectionRepository.findById(automation.platform_connection_id);

    // Build enhanced response
    const response = {
      success: true,
      automation: {
        id: automation.id,
        name: automation.name,
        description: automation.description,
        type: automation.automation_type,
        platform: automation.platform_type || 'unknown',
        status: automation.status,
        createdAt: platformMetadata.firstAuthorization || automation.first_discovered_at?.toISOString(),
        authorizedBy: platformMetadata.authorizedBy || 'unknown',
        lastActivity: platformMetadata.lastActivity,
        authorizationAge: platformMetadata.authorizationAge,

        // Connection info
        connection: connection ? {
          id: connection.id,
          displayName: connection.display_name,
          platform: connection.platform_type,
          status: connection.status
        } : null,

        // Enriched permissions with risk analysis
        permissions: {
          total: enrichedScopes.length,
          enriched: enrichedScopes.map(scope => ({
            scopeUrl: scope.scopeUrl,
            serviceName: scope.serviceName,
            displayName: scope.displayName,
            description: scope.description,
            accessLevel: scope.accessLevel,
            riskScore: scope.riskScore,
            riskLevel: scope.riskLevel,
            dataTypes: scope.dataTypes,
            alternatives: scope.alternatives,
            gdprImpact: scope.gdprImpact
          })),
          riskAnalysis: permissionRisk ? {
            overallRisk: permissionRisk.totalScore,
            riskLevel: permissionRisk.riskLevel,
            highestRisk: permissionRisk.highestRiskScope ? {
              scope: permissionRisk.highestRiskScope.displayName,
              score: permissionRisk.highestRiskScope.riskScore
            } : null,
            breakdown: permissionRisk.scopeBreakdown.map((item: any) => ({
              scope: item.scope.displayName,
              riskScore: item.scope.riskScore,
              contribution: item.contribution
            }))
          } : null
        },

        // Metadata
        metadata: {
          isAIPlatform: platformMetadata.isAIPlatform || false,
          platformName: platformMetadata.platformName,
          clientId: platformMetadata.clientId,
          detectionMethod: platformMetadata.detectionMethod,
          riskFactors: platformMetadata.riskFactors || []
        }
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Error fetching automation details:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch automation details'
    });
  }
});

/**
 * GET /automations/:id
 * Get detailed information about a specific automation
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const automationId = req.params.id;
    const automation = mockAutomations.find(a => a.id === automationId);

    if (!automation) {
      res.status(404).json({
        success: false,
        error: 'AUTOMATION_NOT_FOUND',
        message: 'Automation not found'
      });
      return;
    }

    res.json({
      success: true,
      data: automation
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
 * POST /automations/:id/assess-risk
 * Trigger risk assessment for a specific automation
 */
router.post('/:id/assess-risk', async (req: Request, res: Response): Promise<void> => {
  try {
    const automationId = req.params.id;
    const automation = mockAutomations.find(a => a.id === automationId);

    if (!automation) {
      res.status(404).json({
        success: false,
        error: 'AUTOMATION_NOT_FOUND',
        message: 'Automation not found'
      });
      return;
    }

    // Simulate risk assessment
    setTimeout(() => {
      console.log(`Risk assessment completed for automation ${automationId}`);
    }, 2000);

    const assessment = {
      automationId,
      riskLevel: automation.riskLevel,
      riskScore: automation.metadata.riskScore,
      riskFactors: automation.metadata.riskFactors,
      recommendations: automation.metadata.recommendations,
      assessedAt: new Date().toISOString(),
      assessorType: 'system'
    };

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

export default router;