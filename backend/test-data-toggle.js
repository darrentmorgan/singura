/**
 * Simple test of data toggle functionality
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 3001;

// Mock AI-focused data
const mockAIData = {
  success: true,
  discovery: {
    platform: 'google',
    connectionId: 'conn-2',
    automations: [
      {
        id: 'chatgpt-processor-001',
        name: 'ChatGPT Data Processor',
        type: 'workflow',
        platform: 'google',
        status: 'active',
        riskLevel: 'high',
        permissions: ['SHEETS', 'EXTERNAL_URL'],
        createdAt: '2024-09-15T10:30:00Z',
        lastTriggered: '2024-12-30T15:45:00Z',
        metadata: {
          description: 'Processes customer spreadsheet data through OpenAI API',
          aiEndpoints: ['https://api.openai.com/v1/chat/completions'],
          riskFactors: [
            'Has access to spreadsheet data (potential PII)',
            'Configured to call OpenAI API endpoints',
            'Automated triggers process data without human oversight'
          ]
        }
      },
      {
        id: 'claude-doc-analyzer-002',
        name: 'Claude Document Analyzer',
        type: 'workflow',
        platform: 'google',
        status: 'active',
        riskLevel: 'high',
        permissions: ['DOCS', 'DRIVE', 'EXTERNAL_URL'],
        createdAt: '2024-08-22T14:20:00Z',
        lastTriggered: '2024-12-29T11:30:00Z',
        metadata: {
          description: 'Analyzes HR documents using Claude API',
          aiEndpoints: ['https://api.anthropic.com/v1/messages'],
          riskFactors: [
            'Processes documents that may contain employee PII',
            'Sends document content to Anthropic Claude API',
            'No data retention policy configured'
          ]
        }
      }
    ],
    auditLogs: [],
    permissionCheck: {
      isValid: true,
      grantedPermissions: ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/script.projects.readonly'],
      missingPermissions: [],
      errors: []
    },
    discoveredAt: new Date().toISOString(),
    errors: [],
    warnings: [],
    metadata: {
      executionTimeMs: 2845,
      automationsFound: 2,
      auditLogsFound: 0,
      riskScore: 71,
      complianceStatus: 'unknown',
      usingMockData: true,
      dataToggleEnabled: true
    }
  }
};

const realDataError = {
  success: false,
  error: 'Real data provider not yet implemented - requires OAuth setup',
  fallbackToMock: true,
  metadata: {
    usingMockData: true,
    dataToggleEnabled: true,
    fallbackReason: 'Google OAuth not configured'
  }
};

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3003'],
  credentials: true
}));
app.use(express.json());

// Mock authentication endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Test credentials from e2e fixtures  
  const validCredentials = [
    { email: 'admin@example.com', password: 'SecurePass123', role: 'admin', name: 'Admin User' },
    { email: 'user@example.com', password: 'TestPass123', role: 'user', name: 'Test User' }
  ];
  
  const user = validCredentials.find(u => u.email === email && u.password === password);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password'
    });
  }
  
  // Mock JWT tokens
  const mockTokens = {
    accessToken: 'mock-jwt-access-token-' + Date.now(),
    refreshToken: 'mock-jwt-refresh-token-' + Date.now()
  };
  
  res.json({
    success: true,
    accessToken: mockTokens.accessToken,
    refreshToken: mockTokens.refreshToken,
    user: {
      id: user.email === 'admin@example.com' ? '1' : '2',
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: true,
      createdAt: new Date().toISOString()
    }
  });
});

// Mock token refresh endpoint  
app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken || !refreshToken.startsWith('mock-jwt-refresh-token')) {
    return res.status(401).json({
      success: false,
      error: 'INVALID_REFRESH_TOKEN',
      message: 'Invalid refresh token'
    });
  }
  
  // Generate new mock tokens
  const newTokens = {
    accessToken: 'mock-jwt-access-token-' + Date.now(),
    refreshToken: 'mock-jwt-refresh-token-' + Date.now()
  };
  
  res.json({
    success: true,
    accessToken: newTokens.accessToken,
    refreshToken: newTokens.refreshToken
  });
});

// Mock logout endpoint
app.post('/api/auth/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Original mock automations from automations-mock.ts
const originalMockAutomations = [
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    dataToggleEnabled: process.env.ENABLE_DATA_TOGGLE === 'true',
    mockDataDefault: process.env.USE_MOCK_DATA === 'true'
  });
});

// Data mode config
app.get('/api/config/data-mode', (req, res) => {
  res.json({
    success: true,
    config: {
      usingMockData: process.env.USE_MOCK_DATA === 'true',
      dataToggleEnabled: process.env.ENABLE_DATA_TOGGLE === 'true',
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

// Automations endpoint - original mock data
app.get('/api/automations', (req, res) => {
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

  let filteredAutomations = [...originalMockAutomations];

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
    const searchLower = search.toLowerCase();
    filteredAutomations = filteredAutomations.filter(a => 
      a.name.toLowerCase().includes(searchLower) ||
      (a.description && a.description.toLowerCase().includes(searchLower))
    );
  }

  // Apply sorting
  filteredAutomations.sort((a, b) => {
    let aVal = a[sort_by];
    let bVal = b[sort_by];
    
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
});

// Automation stats endpoint - for dashboard metrics
app.get('/api/automations/stats', (req, res) => {
  const stats = {
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

  res.json({
    success: true,
    stats
  });
});

// Individual automation details endpoint
app.get('/api/automations/:id', (req, res) => {
  const automationId = req.params.id;
  const automation = originalMockAutomations.find(a => a.id === automationId);

  if (!automation) {
    return res.status(404).json({
      success: false,
      error: 'AUTOMATION_NOT_FOUND',
      message: 'Automation not found'
    });
  }

  res.json({
    success: true,
    data: automation
  });
});

// Risk assessment endpoint
app.post('/api/automations/:id/assess-risk', (req, res) => {
  const automationId = req.params.id;
  const automation = originalMockAutomations.find(a => a.id === automationId);

  if (!automation) {
    return res.status(404).json({
      success: false,
      error: 'AUTOMATION_NOT_FOUND',
      message: 'Automation not found'
    });
  }

  // Simulate risk assessment processing
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
});

// Connections with data toggle
app.get('/api/connections', (req, res) => {
  const useMockData = req.headers['x-use-mock-data'] === 'true' || process.env.USE_MOCK_DATA === 'true';
  
  res.json({
    success: true,
    connections: [
      {
        id: 'conn-2',
        platform: 'google',
        displayName: 'Google Workspace - Demo Org',
        status: 'active',
        permissions: [
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/drive.readonly',
          'https://www.googleapis.com/auth/script.projects.readonly'
        ],
        createdAt: new Date().toISOString(),
        lastSyncAt: new Date().toISOString()
      }
    ],
    metadata: {
      usingMockData: useMockData,
      dataToggleEnabled: process.env.ENABLE_DATA_TOGGLE === 'true'
    }
  });
});

// Discovery with data toggle
app.post('/api/connections/:id/discover', (req, res) => {
  const useMockData = req.headers['x-use-mock-data'] === 'true' || process.env.USE_MOCK_DATA === 'true';
  
  console.log(`Discovery request for ${req.params.id} - using mock data: ${useMockData}`);
  
  if (useMockData) {
    res.json(mockAIData);
  } else {
    // Simulate real data failure and fallback
    setTimeout(() => {
      res.json({
        ...realDataError,
        ...mockAIData,
        discovery: {
          ...mockAIData.discovery,
          metadata: {
            ...mockAIData.discovery.metadata,
            fallbackReason: 'Real Google API not configured, using mock data'
          }
        }
      });
    }, 1000); // Simulate API call delay
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Data Toggle Test Server running on port ${PORT}`);
  console.log(`📊 Using mock data by default: ${process.env.USE_MOCK_DATA === 'true'}`);
  console.log(`🔄 Data toggle enabled: ${process.env.ENABLE_DATA_TOGGLE === 'true'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});