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
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
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
      }
    ]
  });
});

// Mock discovery endpoint
app.post('/api/connections/:id/discover', (req: Request, res: Response) => {
  const { id } = req.params;
  
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