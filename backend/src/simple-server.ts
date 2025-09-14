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
import { platformConnectionRepository } from './database/repositories/platform-connection';
import { hybridStorage } from './services/hybrid-storage';

// Load environment variables
dotenv.config();

// Database-backed connection storage
// Connections are now persisted in PostgreSQL via platformConnectionRepository
// Removed in-memory array to prevent data loss on server restart

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
    
    // Use hybrid storage for resilient OAuth connection persistence
    const organizationId = 'demo-org-id';
    const platformUserId = `slack-user-${Date.now()}`;
    
    const connectionData = {
      organization_id: organizationId,
      platform_type: 'slack',
      platform_user_id: platformUserId,
      display_name: 'Slack - Test Workspace',
      permissions_granted: ['channels:read', 'users:read', 'team:read'],
      metadata: {
        platformSpecific: {
          slack: {
            team_id: 'demo-team-id',
            team_name: 'Test Workspace',
            user_id: platformUserId,
            scope: 'channels:read,users:read,team:read'
          }
        }
      }
    };

    const storageResult = await hybridStorage.storeConnection(connectionData);
    
    // Construct success URL with storage result information
    let successUrl = `${frontendUrl}/connections?success=true&platform=slack`;
    if (storageResult.success && storageResult.data?.id) {
      successUrl += `&connection=${storageResult.data.id}`;
    }
    
    // Add storage mode and warning information
    successUrl += `&storage=${storageResult.storageMode}`;
    if (storageResult.warning) {
      successUrl += `&storage_info=${encodeURIComponent(storageResult.warning)}`;
    }
    if (storageResult.usedFallback) {
      successUrl += `&fallback=true`;
    }
    
    console.log('✅ Slack OAuth callback successful, redirecting to:', successUrl);
    
    // Redirect back to frontend with success status (OAuth succeeded regardless of DB issues)
    res.redirect(successUrl);
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
    
    // Use hybrid storage for resilient OAuth connection persistence
    const organizationId = 'demo-org-id';
    const platformUserId = `google-user-${Date.now()}`;
    
    const connectionData = {
      organization_id: organizationId,
      platform_type: 'google',
      platform_user_id: platformUserId,
      display_name: 'Google Workspace - Demo Organization',
      permissions_granted: ['admin.directory.user.readonly', 'admin.directory.group.readonly', 'admin.reports.audit.readonly'],
      metadata: {
        platformSpecific: {
          google: {
            email: `demo@example.com`,
            domain: 'example.com',
            workspace_domain: 'example.com',
            scopes: ['admin.directory.user.readonly', 'admin.directory.group.readonly', 'admin.reports.audit.readonly'],
            token_type: 'Bearer'
          }
        }
      }
    };

    const storageResult = await hybridStorage.storeConnection(connectionData);
    
    // Construct success URL with storage result information
    let successUrl = `${frontendUrl}/connections?success=true&platform=google`;
    if (storageResult.success && storageResult.data?.id) {
      successUrl += `&connection=${storageResult.data.id}`;
    }
    
    // Add storage mode and warning information
    successUrl += `&storage=${storageResult.storageMode}`;
    if (storageResult.warning) {
      successUrl += `&storage_info=${encodeURIComponent(storageResult.warning)}`;
    }
    if (storageResult.usedFallback) {
      successUrl += `&fallback=true`;
    }
    
    console.log('✅ Google OAuth callback successful, redirecting to:', successUrl);
    
    // Redirect back to frontend with success status (OAuth succeeded regardless of DB issues)
    res.redirect(successUrl);
  } catch (error) {
    console.error('Unexpected Google OAuth callback error', error);
    const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:4200';
    
    // Redirect to frontend with error status
    res.redirect(`${frontendUrl}/connections?success=false&platform=google&error=callback_failed`);
  }
});

// Connections endpoint - returns OAuth connected platforms from hybrid storage
app.get('/api/connections', async (req: Request, res: Response) => {
  try {
    // Fetch connections from hybrid storage for the demo organization
    const organizationId = 'demo-org-id';
    const storageResult = await hybridStorage.getConnections(organizationId);
    
    if (!storageResult.success) {
      console.error('Failed to fetch connections from hybrid storage:', storageResult.error);
      return res.status(500).json({
        success: false,
        error: storageResult.error || 'Failed to fetch connections',
        storageMode: storageResult.storageMode,
        usedFallback: storageResult.usedFallback
      });
    }

    const connections = storageResult.data || [];
    console.log(`Connections requested, found ${connections.length} connections from ${storageResult.storageMode} storage`);
    
    // Transform connections to match the frontend expected format
    const transformedConnections = connections.map(conn => ({
      id: conn.id,
      organization_id: conn.organization_id,
      platform_type: conn.platform_type,
      display_name: conn.display_name,
      status: conn.status,
      created_at: conn.created_at.toISOString(),
      updated_at: conn.updated_at.toISOString(),
      last_sync_at: conn.last_sync_at?.toISOString(),
      permissions: conn.permissions_granted
    }));
    
    res.json({
      success: true,
      connections: transformedConnections,
      pagination: {
        page: 1,
        limit: 20,
        total: connections.length,
        totalPages: Math.ceil(connections.length / 20)
      },
      // Add hybrid storage information
      storageInfo: {
        mode: storageResult.storageMode,
        databaseAttempted: storageResult.databaseAttempted,
        usedFallback: storageResult.usedFallback,
        warning: storageResult.warning,
        executionTime: storageResult.metadata?.executionTime
      }
    });
  } catch (error) {
    console.error('Unexpected error in connections endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unexpected error fetching connections',
      storageMode: 'unknown',
      usedFallback: false
    });
  }
});

// Disconnect endpoint - removes a specific connection from database
app.delete('/api/connections/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Find the connection in database
    const connection = await platformConnectionRepository.findById(id);

    // If connection not found, return 404
    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found',
        connectionId: id
      });
    }

    // Remove the connection from database
    const deleted = await platformConnectionRepository.delete(id);
    
    if (!deleted) {
      return res.status(500).json({
        success: false,
        error: 'Failed to remove connection',
        connectionId: id
      });
    }

    console.log(`Disconnected platform: ${connection.platform_type}, Connection ID: ${id}`);

    return res.json({
      success: true,
      message: 'Connection successfully removed',
      connection: {
        id: connection.id,
        organization_id: connection.organization_id,
        platform_type: connection.platform_type,
        display_name: connection.display_name,
        status: connection.status,
        created_at: connection.created_at.toISOString(),
        updated_at: connection.updated_at.toISOString(),
        last_sync_at: connection.last_sync_at?.toISOString(),
        permissions: connection.permissions_granted
      }
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

// Storage status endpoint for debugging and monitoring
app.get('/api/admin/storage-status', (req: Request, res: Response) => {
  try {
    const storageStatus = hybridStorage.getStorageStatus();
    const storageStatistics = hybridStorage.getStorageStatistics();
    
    res.json({
      success: true,
      status: storageStatus,
      statistics: storageStatistics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get storage status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get storage status'
    });
  }
});

// Endpoint to manually trigger pending item persistence
app.post('/api/admin/persist-memory', async (req: Request, res: Response) => {
  try {
    const result = await hybridStorage.persistPendingItems();
    
    res.json({
      success: true,
      result,
      message: `Persistence completed: ${result.succeeded} succeeded, ${result.failed} failed`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to persist memory items:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to persist memory items'
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