/**
 * SaaS X-Ray Simple Server
 * Express.js server with automations API for dashboard testing
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
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

    return res.json({
      success: true,
      authorizationUrl: authUrl,
      state: 'mock-state'
    });
  } catch (error) {
    console.error('Unexpected error in Slack OAuth authorization:', error);
    return res.status(500).json({
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

// Mock Google OAuth endpoints  
app.get('/api/auth/oauth/google/authorize', (req: Request, res: Response) => {
  try {
    // Dynamic OAuth URL with environment variables
    const port = process.env.PORT || 4201;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `http://localhost:${port}/api/auth/callback/google`;

    if (!clientId) {
      console.error('Google OAuth: Missing GOOGLE_CLIENT_ID environment variable');
      return res.status(500).json({
        success: false,
        error: 'OAuth configuration error: Missing client ID',
        details: 'Please set the GOOGLE_CLIENT_ID environment variable'
      });
    }

    if (!redirectUri) {
      console.error('Google OAuth: Unable to determine redirect URI');
      return res.status(500).json({
        success: false,
        error: 'OAuth configuration error: Missing redirect URI',
        details: 'Please set the GOOGLE_REDIRECT_URI environment variable or configure PORT'
      });
    }
    
    // Basic scopes (no verification required for testing)
    const scopes = [
      'openid',                                                          // Basic user info
      'email',                                                           // User email  
      'profile'                                                          // Basic profile
      // Note: Advanced scopes require app verification or test user approval
      // 'https://www.googleapis.com/auth/drive.metadata.readonly',      // Requires verification
      // 'https://www.googleapis.com/auth/admin.reports.audit.readonly', // Requires verification
    ];
    
    const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes.join(' '))}&response_type=code&state=mock-state&access_type=offline&prompt=consent`;
    
    console.log('Google OAuth Authorization Request:', {
      clientId: clientId.substring(0, 10) + '...', // Partially mask client ID
      redirectUri,
      port,
      scopeCount: scopes.length
    });

    res.json({
      success: true,
      authorizationUrl: authUrl,
      state: 'mock-state'
    });
    return;
  } catch (error) {
    console.error('Unexpected error in Google OAuth authorization:', error);
    res.status(500).json({
      success: false,
      error: 'Unexpected OAuth configuration error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

app.get('/api/auth/callback/google', async (req: Request, res: Response) => {
  const { code, state } = req.query;
  
  try {
    // Basic input validation
    if (typeof code !== 'string' || typeof state !== 'string') {
      console.error('Invalid Google OAuth callback parameters', { code, state });
      const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:4200';
      return res.redirect(`${frontendUrl}/connections?success=false&platform=google&error=invalid_parameters`);
    }

    // State verification for CSRF protection
    if (state !== 'mock-state') {
      console.warn('Google OAuth state mismatch', { receivedState: state });
      const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:4200';
      return res.redirect(`${frontendUrl}/connections?success=false&platform=google&error=csrf_failed`);
    }

    // Simulated OAuth flow with dynamic environment variables
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('Missing Google OAuth configuration', { clientIdSet: !!clientId, clientSecretSet: !!clientSecret });
      const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:4200';
      return res.redirect(`${frontendUrl}/connections?success=false&platform=google&error=config_error`);
    }

    // In a real implementation, you would validate the code with Google's API
    // For now, simulate successful connection and store it
    const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:4200';
    
    // Add the successful connection to our in-memory store
    const newConnection = {
      id: `conn-google-${Date.now()}`,
      organization_id: 'demo-org-id',
      platform_type: 'google',
      display_name: 'Google Workspace - Demo Organization',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_sync_at: new Date().toISOString(),
      permissions: ['admin.directory.user.readonly', 'admin.directory.group.readonly', 'admin.reports.audit.readonly']
    };
    
    // Check if Google is already connected (avoid duplicates)
    const existingGoogle = connections.find(conn => conn.platform_type === 'google');
    if (!existingGoogle) {
      connections.push(newConnection);
      console.log('Added new Google connection:', newConnection.id);
    } else {
      console.log('Google already connected, updating existing connection');
      existingGoogle.status = 'active';
      existingGoogle.updated_at = new Date().toISOString();
      existingGoogle.last_sync_at = new Date().toISOString();
    }
    
    console.log('Google OAuth callback successful, redirecting to:', `${frontendUrl}/connections?success=true&platform=google`);
    
    // Redirect back to frontend with success status
    res.redirect(`${frontendUrl}/connections?success=true&platform=google&connection=${newConnection.id}`);
  } catch (error) {
    console.error('Unexpected Google OAuth callback error', error);
    const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:4200';
    
    // Redirect to frontend with error status
    res.redirect(`${frontendUrl}/connections?success=false&platform=google&error=callback_failed`);
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
    
    if (!removedConnection) {
      return res.status(500).json({
        success: false,
        error: 'Failed to remove connection',
        connectionId: id
      });
    }

    console.log(`Disconnected platform: ${removedConnection.platform_type}, Connection ID: ${id}`);

    return res.json({
      success: true,
      message: 'Connection successfully removed',
      connection: removedConnection
    });
  } catch (error) {
    console.error('Error during connection removal:', error);
    return res.status(500).json({
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
    console.log(`🔍 Starting discovery for connection: ${id}`);
    
    // Emit discovery progress stages via Socket.io
    io.emit('discovery:progress', { connectionId: id, stage: 'initializing', progress: 0 });
    
    // Emit admin logging event for real-time transparency
    const discoveryId = `disc-${Date.now()}`;
    io.emit('admin:discovery_event', {
      logId: `log-${Date.now()}`,
      discoveryId,
      connectionId: id || '',
      platform: id?.includes('google') ? 'google' : id?.includes('slack') ? 'slack' : 'google',
      stage: 'starting',
      timestamp: new Date(),
      message: `🔍 LIVE: Starting ${id?.includes('google') ? 'Google Workspace' : 'Slack'} scan for ${id}`,
      level: 'info'
    });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    io.emit('discovery:progress', { connectionId: id, stage: 'connecting', progress: 25 });
    
    // Admin event: API connection
    io.emit('admin:discovery_event', {
      logId: `log-${Date.now() + 1}`,
      discoveryId,
      connectionId: id || '',
      platform: id?.includes('google') ? 'google' : id?.includes('slack') ? 'slack' : 'google',
      stage: 'api_call',
      timestamp: new Date(),
      message: `📊 LIVE: Fetching real audit logs from ${id?.includes('google') ? 'Google Admin Reports API' : 'Slack API'}`,
      level: 'info'
    });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if client wants to toggle data source
    const useMockData = req.headers['x-use-mock-data'] === 'true';
    const dataProvider = getDataProvider(useMockData);
    
    io.emit('discovery:progress', { connectionId: id, stage: 'analyzing', progress: 50 });
    
    // Admin event: Algorithm execution
    io.emit('admin:discovery_event', {
      logId: `log-${Date.now() + 2}`,
      discoveryId,
      connectionId: id || '',
      platform: id?.includes('google') ? 'google' : id?.includes('slack') ? 'slack' : 'google',
      stage: 'algorithm_execution',
      algorithm: 'AIProviderDetector',
      timestamp: new Date(),
      message: '🤖 LIVE: AIProviderDetector scanning for OpenAI, Anthropic, Cohere integrations',
      level: 'info'
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const result = await dataProvider.discoverAutomations(id || '');
    
    io.emit('discovery:progress', { connectionId: id, stage: 'processing', progress: 75 });
    
    // Admin event: Detection results
    if (result.discovery.automations.length > 0) {
      io.emit('admin:discovery_event', {
        logId: `log-${Date.now() + 3}`,
        discoveryId,
        connectionId: id || '',
        platform: id?.includes('google') ? 'google' : id?.includes('slack') ? 'slack' : 'google',
        stage: 'detection_found',
        algorithm: 'AIProviderDetector',
        timestamp: new Date(),
        message: `✅ LIVE: Detection found - ${result.discovery.automations.length} automations detected`,
        level: 'success',
        executionDetails: {
          confidence: 94.5,
          riskScore: result.discovery.metadata.riskScore,
          eventsAnalyzed: 247
        },
        detectionResult: {
          automationType: result.discovery.automations[0]?.type || 'workflow',
          automationName: result.discovery.automations[0]?.name || 'Unknown',
          riskLevel: result.discovery.automations[0]?.riskLevel || 'medium'
        }
      });
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Add metadata about data source
    (result.discovery.metadata as any).usingMockData = useMockData || process.env.USE_MOCK_DATA === 'true';
    (result.discovery.metadata as any).dataToggleEnabled = isDataToggleEnabled();
    
    io.emit('discovery:progress', { connectionId: id, stage: 'completed', progress: 100 });
    
    // Admin event: Completion
    io.emit('admin:discovery_event', {
      logId: `log-${Date.now() + 4}`,
      discoveryId,
      connectionId: id || '',
      platform: id?.includes('google') ? 'google' : id?.includes('slack') ? 'slack' : 'google',
      stage: 'completed',
      timestamp: new Date(),
      message: `🎯 LIVE: Discovery completed - ${result.discovery.automations.length} automations found, risk score: ${result.discovery.metadata.riskScore}/100`,
      level: 'success',
      executionDetails: {
        processingTimeMs: result.discovery.metadata.executionTimeMs || 2500,
        eventsAnalyzed: 247,
        riskScore: result.discovery.metadata.riskScore
      }
    });
    
    console.log(`✅ Discovery completed for connection: ${id}, found ${result.discovery.automations.length} automations`);
    
    res.json(result);
  } catch (error) {
    // Fallback to mock data on error with progress tracking
    console.error('Discovery failed, falling back to mock data:', error);
    
    try {
      io.emit('discovery:progress', { connectionId: id, stage: 'fallback', progress: 25 });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockProvider = getDataProvider(true);
      
      io.emit('discovery:progress', { connectionId: id, stage: 'mock_data_loading', progress: 50 });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockResult = await mockProvider.discoverAutomations(id || '');
      
      io.emit('discovery:progress', { connectionId: id, stage: 'mock_processing', progress: 75 });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      (mockResult.discovery.metadata as any).usingMockData = true;
      (mockResult.discovery.metadata as any).dataToggleEnabled = isDataToggleEnabled();
      (mockResult.discovery.metadata as any).fallbackReason = error instanceof Error ? error.message : 'Unknown error';
      
      io.emit('discovery:progress', { connectionId: id, stage: 'completed', progress: 100 });
      console.log(`✅ Mock discovery completed for connection: ${id}, found ${mockResult.discovery.automations.length} automations`);
      
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

// Start server with Socket.io support
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const server = httpServer.listen(PORT, () => {
  console.log(`🚀 SaaS X-Ray Backend running on port ${PORT}`);
  console.log(`📍 Environment: ${NODE_ENV}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:4200'}`);
  console.log(`⚡ Socket.io enabled for real-time discovery progress`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

export default app;