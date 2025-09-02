/**
 * SaaS X-Ray Simple Server
 * Express.js server with automations API for dashboard testing
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import automationRoutes from './routes/automations-mock';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Basic middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:3003'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api/automations', automationRoutes);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    version: process.env.APP_VERSION || '1.0.0'
  });
});

// Mock auth endpoint
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  // Simple mock authentication
  if (email === 'admin@example.com' && password === 'SecurePass123!') {
    res.json({
      success: true,
      user: {
        id: '1',
        email: 'admin@example.com',
        name: 'Admin User',
        organizationId: 'org-1'
      },
      accessToken: 'mock-jwt-token',
      refreshToken: 'mock-refresh-token'
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

// Mock Slack OAuth endpoints
app.get('/api/auth/oauth/slack/authorize', (req: Request, res: Response) => {
  // Mock OAuth URL
  const authUrl = `https://slack.com/oauth/v2/authorize?client_id=mock&scope=channels:read,users:read&redirect_uri=${encodeURIComponent('http://localhost:3001/api/auth/callback/slack')}&state=mock-state`;
  
  res.json({
    success: true,
    authorizationUrl: authUrl,
    state: 'mock-state'
  });
});

app.get('/api/auth/callback/slack', (req: Request, res: Response) => {
  const { code, state } = req.query;
  
  if (code && state === 'mock-state') {
    res.json({
      success: true,
      connection: {
        id: 'conn-1',
        platform: 'slack',
        displayName: 'Slack - Test Workspace',
        status: 'active',
        permissions: ['channels:read', 'users:read', 'team:read']
      }
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'OAuth callback failed'
    });
  }
});

// Mock connections endpoint
app.get('/api/connections', (req: Request, res: Response) => {
  res.json({
    success: true,
    connections: [
      {
        id: 'conn-1',
        platform: 'slack',
        displayName: 'Slack - Test Workspace',
        status: 'active',
        permissions: ['channels:read', 'users:read', 'team:read'],
        createdAt: new Date().toISOString(),
        lastSyncAt: new Date().toISOString()
      },
      {
        id: 'conn-2',
        platform: 'google',
        displayName: 'Google Workspace - Demo Org',
        status: 'active',
        permissions: [
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile', 
          'https://www.googleapis.com/auth/drive.readonly',
          'https://www.googleapis.com/auth/script.projects.readonly'
        ],
        createdAt: new Date().toISOString(),
        lastSyncAt: new Date().toISOString()
      }
    ]
  });
});

// Mock discovery endpoint
app.post('/api/connections/:id/discover', (req: Request, res: Response) => {
  const { id } = req.params;
  
  // Different discovery results based on platform
  if (id === 'conn-2') {
    // Google Workspace discovery results
    res.json({
      success: true,
      discovery: {
        automations: [
          {
            id: 'google-script-AKfycbwHq8_123abc',
            name: 'Sales Lead Automation',
            type: 'workflow',
            platform: 'google',
            status: 'active',
            riskLevel: 'high',
            riskScore: 60,
            permissions: ['SHEETS', 'GMAIL', 'EXTERNAL_URL'],
            createdAt: '2024-07-10T09:15:00Z',
            lastTriggered: '2024-12-28T14:30:00Z',
            metadata: {
              scriptId: 'AKfycbwHq8_123abc',
              description: 'Automatically processes form submissions and sends to CRM',
              parentType: 'SHEETS',
              triggers: ['ON_FORM_SUBMIT', 'TIME_DRIVEN'],
              functions: ['onFormSubmit', 'dailyCleanup', 'sendToCRM'],
              riskFactors: ['High-risk permissions (external URLs, admin access)', 'Automated time-based triggers', 'Processes form submissions (potential PII)', 'Integrates with external systems']
            }
          },
          {
            id: 'google-script-AKfycbwMn7_456def',
            name: 'Email Report Generator',
            type: 'workflow',
            platform: 'google',
            status: 'active',
            riskLevel: 'medium',
            riskScore: 35,
            permissions: ['ANALYTICS', 'GMAIL', 'DOCS', 'DRIVE'],
            createdAt: '2024-05-22T16:45:00Z',
            lastTriggered: '2024-12-30T08:22:00Z',
            metadata: {
              scriptId: 'AKfycbwMn7_456def',
              description: 'Weekly automated reports from Google Analytics data',
              parentType: 'DOCS',
              triggers: ['TIME_DRIVEN'],
              functions: ['generateWeeklyReport', 'fetchAnalyticsData', 'emailReport'],
              riskFactors: ['Medium-risk permissions (email, drive access)', 'Automated time-based triggers', 'Recently active automation']
            }
          },
          {
            id: 'google-sa-zapier-integration-sa',
            name: 'Zapier Integration Service Account',
            type: 'service_account',
            platform: 'google',
            status: 'active',
            riskLevel: 'high',
            riskScore: 55,
            permissions: ['roles/sheets.editor', 'roles/drive.file'],
            createdAt: '2024-06-15T10:30:00Z',
            lastTriggered: '2025-01-01T15:45:00Z',
            metadata: {
              email: 'zapier-integration-sa@project-12345.iam.gserviceaccount.com',
              description: 'Service account used by Zapier for Google Sheets automation',
              keyCount: 2,
              roles: ['roles/sheets.editor', 'roles/drive.file'],
              projectId: 'project-12345'
            }
          },
          {
            id: 'google-script-AKfycbwPq9_789ghi',
            name: 'Meeting Room Scheduler',
            type: 'workflow',
            platform: 'google',
            status: 'active',
            riskLevel: 'medium',
            riskScore: 25,
            permissions: ['CALENDAR', 'GMAIL', 'SHEETS'],
            createdAt: '2024-09-03T11:20:00Z',
            lastTriggered: '2025-01-01T16:10:00Z',
            metadata: {
              scriptId: 'AKfycbwPq9_789ghi',
              description: 'Automated meeting room booking and conflict resolution',
              parentType: 'SHEETS',
              triggers: ['ON_EDIT', 'ON_CHANGE'],
              functions: ['checkAvailability', 'bookRoom', 'sendConfirmation'],
              riskFactors: ['Medium-risk permissions (email, drive access)', 'Recently active automation']
            }
          },
          {
            id: 'google-sa-data-pipeline-bot',
            name: 'Data Pipeline Automation',
            type: 'service_account',
            platform: 'google',
            status: 'active',
            riskLevel: 'medium',
            riskScore: 35,
            permissions: ['roles/analytics.viewer', 'roles/bigquery.dataEditor'],
            createdAt: '2024-08-20T14:20:00Z',
            lastTriggered: '2025-01-01T23:15:00Z',
            metadata: {
              email: 'data-pipeline-bot@project-12345.iam.gserviceaccount.com',
              description: 'Automated data extraction from Google Analytics to BigQuery',
              keyCount: 1,
              roles: ['roles/analytics.viewer', 'roles/bigquery.dataEditor'],
              projectId: 'project-12345'
            }
          }
        ],
        metadata: {
          executionTimeMs: 2845,
          automationsFound: 5,
          riskScore: 42,
          platform: 'google',
          discoveryMethods: ['Apps Script API', 'Drive API', 'Service Account Detection'],
          coverage: {
            appsScriptProjects: 3,
            serviceAccounts: 2,
            oauthApplications: 0
          }
        }
      }
    });
  } else {
    // Default Slack discovery results
    res.json({
      success: true,
      discovery: {
        automations: [
          {
            id: 'slack-bot-1',
            name: 'Support Bot',
            type: 'bot',
            platform: 'slack',
            status: 'active',
            riskLevel: 'medium',
            permissions: ['channels:read', 'chat:write'],
            createdAt: '2025-01-01T00:00:00Z'
          },
          {
            id: 'slack-workflow-1',
            name: 'Onboarding Workflow',
            type: 'workflow',
            platform: 'slack',
            status: 'active', 
            riskLevel: 'low',
            permissions: ['users:read'],
            createdAt: '2025-01-02T00:00:00Z'
          }
        ],
        metadata: {
          executionTimeMs: 1234,
          automationsFound: 2,
          riskScore: 35
        }
      }
    });
  }
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 SaaS X-Ray Backend running on port ${PORT}`);
  console.log(`📍 Environment: ${NODE_ENV}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

export default app;