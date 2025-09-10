/**
 * SaaS X-Ray Simple Server
 * Express.js server with automations API for dashboard testing
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import automationRoutes from './routes/automations-mock';
import devRoutes from './routes/dev-routes';
import { getDataProvider, isDataToggleEnabled } from './services/data-provider';

// Load environment variables
dotenv.config();

// In-memory connection store (for demo purposes)
const connections: Array<{
  id: string;
  organization_id: string;
  platform_type: string;
  display_name: string;
  status: string;
  created_at: string;
  updated_at: string;
  last_sync_at?: string;
  permissions: string[];
}> = [];

const app = express();
const PORT = process.env.PORT || 4201;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Basic middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:4200', 'http://localhost:4201', 'http://localhost:4202', 'http://localhost:4203'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api/automations', automationRoutes);

// Development-only routes (blocked in production)
app.use('/api/dev', devRoutes);

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
  try {
    // Dynamic OAuth URL with environment variables
    const port = process.env.PORT || 4201;
    const clientId = process.env.SLACK_CLIENT_ID;
    const redirectUri = process.env.SLACK_REDIRECT_URI || `http://localhost:${port}/api/auth/callback/slack`;

    if (!clientId) {
      console.error('Slack OAuth: Missing SLACK_CLIENT_ID environment variable');
      return res.status(500).json({
        success: false,
        error: 'OAuth configuration error: Missing client ID',
        details: 'Please set the SLACK_CLIENT_ID environment variable'
      });
    }

    if (!redirectUri) {
      console.error('Slack OAuth: Unable to determine redirect URI');
      return res.status(500).json({
        success: false,
        error: 'OAuth configuration error: Missing redirect URI',
        details: 'Please set the SLACK_REDIRECT_URI environment variable or configure PORT'
      });
    }
    
    const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=channels:read,users:read&redirect_uri=${encodeURIComponent(redirectUri)}&state=mock-state`;
    
    console.log('Slack OAuth Authorization Request:', {
      clientId: clientId.substring(0, 5) + '...' + clientId.slice(-5), // Partially mask client ID
      redirectUri,
      port
    });

    res.json({
      success: true,
      authorizationUrl: authUrl,
      state: 'mock-state'
    });
  } catch (error) {
    console.error('Unexpected error in Slack OAuth authorization:', error);
    res.status(500).json({
      success: false,
      error: 'Unexpected OAuth configuration error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/auth/callback/slack', async (req: Request, res: Response) => {
  const { code, state } = req.query;
  
  try {
    // Basic input validation
    if (typeof code !== 'string' || typeof state !== 'string') {
      console.error('Invalid OAuth callback parameters', { code, state });
      const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:4200';
      return res.redirect(`${frontendUrl}/connections?success=false&platform=slack&error=invalid_parameters`);
    }

    // State verification for CSRF protection
    if (state !== 'mock-state') {
      console.warn('OAuth state mismatch', { receivedState: state });
      const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:4200';
      return res.redirect(`${frontendUrl}/connections?success=false&platform=slack&error=csrf_failed`);
    }

    // Simulated OAuth flow with dynamic environment variables
    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('Missing OAuth configuration', { clientIdSet: !!clientId, clientSecretSet: !!clientSecret });
      const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:4200';
      return res.redirect(`${frontendUrl}/connections?success=false&platform=slack&error=config_error`);
    }

    // In a real implementation, you would validate the code with Slack's API
    // For now, simulate successful connection and store it
    const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:4200';
    
    // Add the successful connection to our in-memory store
    const newConnection = {
      id: `conn-slack-${Date.now()}`,
      organization_id: 'demo-org-id',
      platform_type: 'slack',
      display_name: 'Slack - Test Workspace',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_sync_at: new Date().toISOString(),
      permissions: ['channels:read', 'users:read', 'team:read']
    };
    
    // Check if Slack is already connected (avoid duplicates)
    const existingSlack = connections.find(conn => conn.platform_type === 'slack');
    if (!existingSlack) {
      connections.push(newConnection);
      console.log('Added new Slack connection:', newConnection.id);
    } else {
      console.log('Slack already connected, updating existing connection');
      existingSlack.status = 'active';
      existingSlack.updated_at = new Date().toISOString();
      existingSlack.last_sync_at = new Date().toISOString();
    }
    
    console.log('Slack OAuth callback successful, redirecting to:', `${frontendUrl}/connections?success=true&platform=slack`);
    
    // Redirect back to frontend with success status
    res.redirect(`${frontendUrl}/connections?success=true&platform=slack&connection=${newConnection.id}`);
  } catch (error) {
    console.error('Unexpected OAuth callback error', error);
    const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:4200';
    
    // Redirect to frontend with error status
    res.redirect(`${frontendUrl}/connections?success=false&platform=slack&error=callback_failed`);
  }
});

// Connections endpoint - returns OAuth connected platforms
app.get('/api/connections', (req: Request, res: Response) => {
  try {
    console.log(`Connections requested, found ${connections.length} connections`);
    
    res.json({
      success: true,
      connections,
      pagination: {
        page: 1,
        limit: 20,
        total: connections.length,
        totalPages: Math.ceil(connections.length / 20)
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

// Disconnect endpoint - removes a specific connection
app.delete('/api/connections/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Find the connection index
    const connectionIndex = connections.findIndex(conn => conn.id === id);

    // If connection not found, return 404
    if (connectionIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found',
        connectionId: id
      });
    }

    // Remove the connection
    const removedConnection = connections.splice(connectionIndex, 1)[0];

    console.log(`Disconnected platform: ${removedConnection.platform_type}, Connection ID: ${id}`);

    res.json({
      success: true,
      message: 'Connection successfully removed',
      connection: removedConnection
    });
  } catch (error) {
    console.error('Error during connection removal:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove connection',
      connectionId: id
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
  console.log(`🔗 CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:4200'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

export default app;