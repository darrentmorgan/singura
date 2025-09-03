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

// AI-Enhanced Mock Automations - Focused on AI/ML service integrations
const originalMockAutomations = [
  {
    id: '1',
    name: 'AI Customer Support Bot',
    description: 'GPT-4 powered customer support bot that processes support tickets and customer inquiries with direct access to customer data',
    type: 'bot',
    platform: 'slack',
    status: 'active',
    riskLevel: 'critical',
    createdAt: '2024-08-15T10:30:00Z',
    lastTriggered: '2024-12-30T08:15:00Z',
    permissions: ['channels:read', 'chat:write', 'users:read', 'im:write', 'files:read'],
    createdBy: 'john.doe@company.com',
    metadata: {
      riskScore: 92,
      aiEndpoints: ['https://api.openai.com/v1/chat/completions'],
      aiProvider: 'OpenAI GPT-4',
      riskFactors: [
        'Processes customer PII and support history through AI models',
        'Has access to file uploads which may contain sensitive documents',
        'AI responses could leak confidential company information',
        'No data retention controls configured for AI interactions',
        'Prompt injection vulnerabilities not addressed'
      ],
      recommendations: [
        'Implement data anonymization before sending to AI services',
        'Configure strict data retention policies for AI interactions',
        'Add prompt injection detection and filtering',
        'Enable audit logging for all AI API calls',
        'Implement human review for sensitive customer interactions'
      ],
      aiRiskIndicators: [
        'Customer PII exposure to third-party AI',
        'Uncontrolled AI-generated responses to customers',
        'No AI model output filtering or validation'
      ]
    }
  },
  {
    id: '2',
    name: 'Claude Financial Data Analyzer',
    description: 'Anthropic Claude integration that analyzes financial spreadsheets and generates reports using sensitive company financial data',
    type: 'integration',
    platform: 'google',
    status: 'active',
    riskLevel: 'critical',
    createdAt: '2024-08-20T14:22:00Z',
    lastTriggered: '2024-12-30T12:00:00Z',
    permissions: ['spreadsheets.read', 'spreadsheets.write', 'drive.file'],
    createdBy: 'jane.smith@company.com',
    metadata: {
      riskScore: 88,
      aiEndpoints: ['https://api.anthropic.com/v1/messages'],
      aiProvider: 'Anthropic Claude',
      riskFactors: [
        'Sends complete financial spreadsheets to external AI service',
        'Processes revenue, profit margins, and strategic financial data',
        'Generated reports may contain inaccurate AI-derived insights',
        'No encryption in transit to AI provider',
        'Financial data retained by AI service with unknown policies'
      ],
      recommendations: [
        'Implement data masking for sensitive financial figures',
        'Add encryption for all AI API communications',
        'Configure zero data retention with AI provider',
        'Enable real-time monitoring of financial data transfers',
        'Require CFO approval for financial AI integrations'
      ],
      aiRiskIndicators: [
        'Financial data exposure to third-party AI systems',
        'Potential AI model training on proprietary financial information',
        'Regulatory compliance risks with financial data processing'
      ]
    }
  },
  {
    id: '3',
    name: 'AI Meeting Intelligence System',
    description: 'Multi-AI system using Whisper for transcription and GPT-4 for meeting summaries, processing confidential executive discussions',
    type: 'bot',
    platform: 'microsoft',
    status: 'active',
    riskLevel: 'critical',
    createdAt: '2024-08-10T09:15:00Z',
    lastTriggered: '2024-12-30T10:30:00Z',
    permissions: ['online_meetings', 'calendar.read', 'mail.send', 'files.readwrite'],
    createdBy: 'admin@company.com',
    metadata: {
      riskScore: 96,
      aiEndpoints: [
        'https://api.openai.com/v1/audio/transcriptions',
        'https://api.openai.com/v1/chat/completions'
      ],
      aiProvider: 'OpenAI Whisper + GPT-4',
      riskFactors: [
        'Records and processes confidential C-suite meeting audio through AI',
        'AI transcription and summarization of strategic business discussions',
        'Meeting recordings stored on third-party AI infrastructure',
        'No consent mechanism for meeting participants regarding AI processing',
        'AI-generated summaries could misrepresent critical business decisions',
        'Executive calendar patterns exposed to AI systems'
      ],
      recommendations: [
        'Implement explicit participant consent for AI processing',
        'Use on-premises AI models for sensitive meeting processing',
        'Enable automatic deletion of AI-processed meeting data after 30 days',
        'Add executive override controls for AI meeting processing',
        'Implement meeting classification (public/confidential) filtering'
      ],
      aiRiskIndicators: [
        'C-suite confidential discussions processed by external AI',
        'Strategic business intelligence exposed to AI providers',
        'Meeting participant privacy violated through AI analysis'
      ]
    }
  },
  {
    id: '4',
    name: 'AI Document Intelligence Pipeline',
    description: 'Automated document processing using multiple AI services to extract and analyze data from contracts, HR documents, and legal files',
    type: 'workflow',
    platform: 'google',
    status: 'active',
    riskLevel: 'critical',
    createdAt: '2024-07-30T16:45:00Z',
    lastTriggered: '2024-12-30T14:20:00Z',
    permissions: ['drive.file', 'docs.readonly', 'gmail.send'],
    createdBy: 'ai-ops@company.com',
    metadata: {
      riskScore: 94,
      aiEndpoints: [
        'https://api.openai.com/v1/chat/completions',
        'https://api.anthropic.com/v1/messages',
        'https://api.cohere.ai/v1/generate'
      ],
      aiProvider: 'Multi-AI: OpenAI + Anthropic + Cohere',
      riskFactors: [
        'Processes HR documents containing employee PII through multiple AI services',
        'Legal contracts and agreements analyzed by external AI systems',
        'Sensitive document content replicated across multiple AI providers',
        'No data classification system for AI processing decisions',
        'Cross-AI service data correlation creates amplified privacy risks'
      ],
      recommendations: [
        'Implement document classification before AI processing',
        'Use single, privacy-focused AI provider instead of multiple services',
        'Add PII detection and redaction before AI analysis',
        'Enable document-level consent controls for AI processing',
        'Implement audit trail for all AI-processed documents'
      ],
      aiRiskIndicators: [
        'Employee PII exposed to multiple external AI systems',
        'Legal document confidentiality compromised through AI analysis',
        'Multi-provider AI processing increases data breach surface area'
      ]
    }
  },
  {
    id: '5',
    name: 'AI Content Generation Bot',
    description: 'GPT-3.5 powered Slack bot that generates marketing content, social media posts, and internal communications using company data and brand guidelines',
    type: 'bot',
    platform: 'slack',
    status: 'active',
    riskLevel: 'high',
    createdAt: '2024-08-22T11:30:00Z',
    lastTriggered: '2024-12-30T13:45:00Z',
    permissions: ['channels:read', 'chat:write', 'files:read', 'users:read'],
    createdBy: 'marketing@company.com',
    metadata: {
      riskScore: 76,
      aiEndpoints: ['https://api.openai.com/v1/chat/completions'],
      aiProvider: 'OpenAI GPT-3.5',
      riskFactors: [
        'Generates public-facing content using AI without human review process',
        'Has access to internal marketing discussions and strategy documents',
        'AI-generated content could contain factual errors or inappropriate messaging',
        'Brand reputation risk from unvetted AI-generated communications',
        'Potential copyright infringement in AI-generated content'
      ],
      recommendations: [
        'Implement mandatory human review for all AI-generated public content',
        'Add content filtering to prevent inappropriate AI responses',
        'Configure AI model parameters to reduce hallucination risks',
        'Enable content approval workflows before publication',
        'Add brand guidelines validation to AI content generation'
      ],
      aiRiskIndicators: [
        'Unvetted AI content published to public channels',
        'Company marketing strategy exposed to external AI service',
        'Brand reputation risk from AI-generated communications'
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

// Automation stats endpoint - AI-focused dashboard metrics
app.get('/api/automations/stats', (req, res) => {
  const stats = {
    totalAutomations: 5,
    byStatus: {
      active: 5,
      inactive: 0,
      error: 0,
      unknown: 0
    },
    byRiskLevel: {
      low: 0,
      medium: 0,
      high: 1,
      critical: 4
    },
    byType: {
      bot: 3,
      workflow: 1,
      integration: 1,
      webhook: 0
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
    averageRiskScore: 89,
    aiMetrics: {
      totalAIIntegrations: 5,
      aiProviders: {
        'OpenAI': 4,
        'Anthropic': 2,
        'Cohere': 1
      },
      highRiskAIAutomations: 4,
      automationsWithPIIAccess: 4,
      automationsWithFinancialAccess: 1
    }
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