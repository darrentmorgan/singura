/**
 * SaaS X-Ray Simple Server
 * Express.js server with automations API for dashboard testing
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import automationRoutes from './routes/automations-mock';
import { getDataProvider, isDataToggleEnabled } from './services/data-provider';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Basic middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:4200', 'http://localhost:3000', 'http://localhost:3002', 'http://localhost:3003'],
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
  if (email === 'admin@example.com' && password === 'SecurePass123') {
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

// Connections endpoint with data provider support
app.get('/api/connections', (req: Request, res: Response) => {
  try {
    // Check if client wants to toggle data source
    const useMockData = req.headers['x-use-mock-data'] === 'true';
    const dataProvider = getDataProvider(useMockData);
    
    const connections = dataProvider.getConnections();
    
    res.json({
      success: true,
      connections,
      metadata: {
        usingMockData: useMockData || process.env.USE_MOCK_DATA === 'true',
        dataToggleEnabled: isDataToggleEnabled()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch connections',
      usingMockData: true // Fallback to mock on error
    });
  }
});

// Discovery endpoint with data provider support
app.post('/api/connections/:id/discover', async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    // Check if client wants to toggle data source
    const useMockData = req.headers['x-use-mock-data'] === 'true';
    const dataProvider = getDataProvider(useMockData);
    
    const result = await dataProvider.discoverAutomations(id || '');
    
    // Add metadata about data source
    (result.discovery.metadata as any).usingMockData = useMockData || process.env.USE_MOCK_DATA === 'true';
    (result.discovery.metadata as any).dataToggleEnabled = isDataToggleEnabled();
    
    res.json(result);
  } catch (error) {
    // Fallback to mock data on error
    console.error('Discovery failed, falling back to mock data:', error);
    
    try {
      const mockProvider = getDataProvider(true);
      const mockResult = await mockProvider.discoverAutomations(id || '');
      
      (mockResult.discovery.metadata as any).usingMockData = true;
      (mockResult.discovery.metadata as any).dataToggleEnabled = isDataToggleEnabled();
      (mockResult.discovery.metadata as any).fallbackReason = error instanceof Error ? error.message : 'Unknown error';
      
      res.json(mockResult);
    } catch (fallbackError) {
      res.status(500).json({
        success: false,
        error: 'Discovery failed and fallback to mock data also failed',
        details: {
          originalError: error instanceof Error ? error.message : 'Unknown error',
          fallbackError: fallbackError instanceof Error ? fallbackError.message : 'Unknown fallback error'
        }
      });
    }
  }
});

// Data mode configuration endpoint
app.get('/api/config/data-mode', (req: Request, res: Response) => {
  res.json({
    success: true,
    config: {
      usingMockData: process.env.USE_MOCK_DATA === 'true',
      dataToggleEnabled: isDataToggleEnabled(),
      environment: process.env.NODE_ENV || 'development'
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