/**
 * Mock Automations API Routes
 * Returns mock data for frontend development and testing
 */

import { Router, Request, Response } from 'express';

const router = Router();

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
router.get('/', async (req: Request, res: Response) => {
  try {
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

    let filteredAutomations = [...mockAutomations];

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
router.get('/stats', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      stats: mockStats
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
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const automationId = req.params.id;
    const automation = mockAutomations.find(a => a.id === automationId);

    if (!automation) {
      return res.status(404).json({
        success: false,
        error: 'AUTOMATION_NOT_FOUND',
        message: 'Automation not found'
      });
    }

    return res.json({
      success: true,
      data: automation
    });

  } catch (error) {
    console.error('Failed to get automation details:', error);
    return res.status(500).json({
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
router.post('/:id/assess-risk', async (req: Request, res: Response) => {
  try {
    const automationId = req.params.id;
    const automation = mockAutomations.find(a => a.id === automationId);

    if (!automation) {
      return res.status(404).json({
        success: false,
        error: 'AUTOMATION_NOT_FOUND',
        message: 'Automation not found'
      });
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

    return res.json({
      success: true,
      assessment
    });

  } catch (error) {
    console.error('Failed to assess automation risk:', error);
    return res.status(500).json({
      success: false,
      error: 'RISK_ASSESSMENT_FAILED',
      message: 'Failed to assess automation risk'
    });
  }
});

export default router;