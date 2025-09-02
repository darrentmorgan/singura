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
    metadata: {
      executionTimeMs: 2845,
      automationsFound: 2,
      riskScore: 71,
      platform: 'google',
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
      usingMockData,
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