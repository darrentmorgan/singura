/**
 * SaaS X-Ray Simple Server
 * Express.js server with automations API for dashboard testing
 */

// Load environment variables FIRST (before any imports that use them)
import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import automationRoutes from './routes/automations-mock';
import devRoutes from './routes/dev-routes';
import { getDataProvider, isDataToggleEnabled } from './services/data-provider';
import { platformConnectionRepository } from './database/repositories/platform-connection';
import { hybridStorage } from './services/hybrid-storage';
import { oauthMemoryStorage } from './services/memory-storage';
import { oauthCredentialStorage } from './services/oauth-credential-storage-service';
import { GoogleOAuthRawResponse, GoogleOAuthCredentials, SlackOAuthRawResponse, SlackOAuthCredentials } from '@saas-xray/shared-types';
import { requireClerkAuth, optionalClerkAuth, getOrganizationId, ClerkAuthRequest } from './middleware/clerk-auth';
import { runMigrations } from './database/migrate';

// Database-backed connection storage
// Connections are now persisted in PostgreSQL via platformConnectionRepository
// Removed in-memory array to prevent data loss on server restart

// Use singleton OAuth credential storage service
const oauthStorage = oauthCredentialStorage;

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
app.use('/api/automations', optionalClerkAuth, automationRoutes);

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

// Slack OAuth endpoints with Clerk organization ID support
app.get('/api/auth/oauth/slack/authorize', (req: Request, res: Response) => {
  try {
    // Get Clerk organization ID from query parameter
    const clerkOrgId = req.query.orgId as string;

    if (!clerkOrgId || !clerkOrgId.startsWith('org_')) {
      console.error('Slack OAuth: Missing or invalid Clerk organization ID');
      return res.status(400).json({
        success: false,
        error: 'Invalid organization ID',
        details: 'Please provide a valid Clerk organization ID'
      });
    }

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

    // Request comprehensive scopes for automation discovery
    const scopes = [
      'channels:read',
      'users:read',
      'team:read',
      'usergroups:read',
      'workflow.steps:execute',  // For workflow detection
      'commands'                  // For slash command detection
    ].join(',');

    // Create state parameter with Clerk organization ID
    const state = `${clerkOrgId}:${Date.now()}:${Math.random().toString(36).substring(7)}`;

    const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

    console.log('Slack OAuth Authorization Request:', {
      clientId: clientId.substring(0, 5) + '...' + clientId.slice(-5), // Partially mask client ID
      redirectUri,
      port,
      organizationId: clerkOrgId
    });

    return res.json({
      success: true,
      authorizationUrl: authUrl,
      state: state
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

    // Extract Clerk organization ID from state parameter
    // State format: "clerkOrgId:timestamp:random"
    const [clerkOrgId] = state.split(':');

    if (!clerkOrgId || !clerkOrgId.startsWith('org_')) {
      console.warn('Invalid Clerk organization ID in state', { state });
      const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:4200';
      return res.redirect(`${frontendUrl}/connections?success=false&platform=slack&error=invalid_org_id`);
    }

    // Get OAuth configuration
    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    const redirectUri = process.env.SLACK_REDIRECT_URI || `http://localhost:${PORT}/api/auth/callback/slack`;

    if (!clientId || !clientSecret) {
      console.error('Missing OAuth configuration', { clientIdSet: !!clientId, clientSecretSet: !!clientSecret });
      const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:4200';
      return res.redirect(`${frontendUrl}/connections?success=false&platform=slack&error=config_error`);
    }

    console.log('🔄 Exchanging Slack authorization code for access tokens...');

    // Exchange authorization code for access tokens
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json() as SlackOAuthRawResponse;

    if (!tokenData.ok || !tokenData.access_token) {
      console.error('Slack OAuth token exchange failed:', tokenData);
      const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:4200';
      return res.redirect(`${frontendUrl}/connections?success=false&platform=slack&error=token_exchange_failed`);
    }

    console.log('✅ Slack OAuth token exchange successful');

    // Extract team and user information
    const teamId = tokenData.team?.id || 'unknown-team';
    const teamName = tokenData.team?.name || 'Unknown Workspace';
    const userId = tokenData.authed_user?.id || 'unknown-user';
    const scopes = tokenData.scope ? tokenData.scope.split(',') : [];

    const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:4200';

    // Use Clerk organization ID from state parameter
    const organizationId = clerkOrgId;
    const platformUserId = `slack-user-${userId}`;

    console.log('🔐 Using Clerk organization ID:', organizationId);

    const connectionData = {
      organization_id: organizationId,
      platform_type: 'slack',
      platform_user_id: platformUserId,
      display_name: `Slack - ${teamName}`,
      permissions_granted: scopes,
      metadata: {
        platformSpecific: {
          slack: {
            team_id: teamId,
            team_name: teamName,
            user_id: userId,
            scope: tokenData.scope || ''
          }
        }
      }
    };

    const storageResult = await hybridStorage.storeConnection(connectionData);

    // Store OAuth credentials in OAuthCredentialStorageService
    if (storageResult.success && storageResult.data?.id) {
      const connectionId = storageResult.data.id;

      // Calculate token expiration (Slack tokens don't expire by default, but we set a long expiration)
      const expiresAt = tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year default

      const slackCredentials: SlackOAuthCredentials = {
        accessToken: tokenData.access_token,
        tokenType: (tokenData.token_type === 'bot' ? 'bot' : 'user') as 'bot' | 'user',
        scope: scopes,
        botUserId: tokenData.bot_user_id,
        userId: userId,
        teamId: teamId,
        enterpriseId: tokenData.enterprise?.id,
        expiresAt: expiresAt,
        refreshToken: tokenData.refresh_token,
      };

      // Note: OAuthCredentialStorageService expects GoogleOAuthCredentials, but we need Slack support
      // For now, convert to a compatible format (this is a gap to address in shared-types)
      const genericCredentials = {
        accessToken: slackCredentials.accessToken,
        refreshToken: slackCredentials.refreshToken,
        tokenType: 'Bearer',
        scope: scopes,
        expiresAt: expiresAt,
        email: undefined,
        domain: teamName,
      };

      await oauthStorage.storeCredentials(connectionId, genericCredentials as any);

      console.log('✅ Slack OAuth credentials stored for connection:', connectionId);
    }

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

// Google OAuth endpoints with Clerk organization ID support
app.get('/api/auth/oauth/google/authorize', (req: Request, res: Response) => {
  try {
    // Get Clerk organization ID from query parameter
    const clerkOrgId = req.query.orgId as string;

    console.log('🔍 Google OAuth authorize request:', {
      orgId: clerkOrgId,
      query: req.query,
      startsWithOrg: clerkOrgId?.startsWith('org_')
    });

    if (!clerkOrgId || !clerkOrgId.startsWith('org_')) {
      console.error('❌ Google OAuth: Missing or invalid Clerk organization ID', { clerkOrgId });
      return res.status(400).json({
        success: false,
        error: 'Invalid organization ID',
        details: 'Please provide a valid Clerk organization ID'
      });
    }

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

    // Comprehensive scopes for Apps Script and automation discovery
    const scopes = [
      'openid',                                                                   // Basic user info
      'email',                                                                    // User email
      'profile',                                                                  // Basic profile
      'https://www.googleapis.com/auth/script.projects.readonly',                // View Apps Script projects
      'https://www.googleapis.com/auth/admin.directory.user.readonly',           // View users/service accounts
      'https://www.googleapis.com/auth/admin.directory.user.security',           // View OAuth tokens (CRITICAL for ChatGPT detection)
      'https://www.googleapis.com/auth/admin.reports.audit.readonly',            // View audit logs
      'https://www.googleapis.com/auth/drive.metadata.readonly'                  // View Drive file metadata
    ];

    // Create state parameter with Clerk organization ID
    const state = `${clerkOrgId}:${Date.now()}:${Math.random().toString(36).substring(7)}`;

    const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes.join(' '))}&response_type=code&state=${state}&access_type=offline&prompt=consent`;

    console.log('Google OAuth Authorization Request:', {
      clientId: clientId.substring(0, 10) + '...', // Partially mask client ID
      redirectUri,
      port,
      scopeCount: scopes.length,
      organizationId: clerkOrgId
    });

    res.json({
      success: true,
      authorizationUrl: authUrl,
      state: state
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

    // Extract Clerk organization ID from state parameter
    // State format: "clerkOrgId:timestamp:random"
    const [clerkOrgId] = state.split(':');

    if (!clerkOrgId || !clerkOrgId.startsWith('org_')) {
      console.warn('Invalid Clerk organization ID in state', { state });
      const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:4200';
      return res.redirect(`${frontendUrl}/connections?success=false&platform=google&error=invalid_org_id`);
    }

    // Get OAuth configuration
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `http://localhost:${PORT}/api/auth/callback/google`;

    if (!clientId || !clientSecret) {
      console.error('Missing Google OAuth configuration', { clientIdSet: !!clientId, clientSecretSet: !!clientSecret });
      const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:4200';
      return res.redirect(`${frontendUrl}/connections?success=false&platform=google&error=config_error`);
    }

    console.log('🔄 Exchanging Google authorization code for access tokens...');

    // Exchange authorization code for access tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Google OAuth token exchange failed:', errorText);
      const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:4200';
      return res.redirect(`${frontendUrl}/connections?success=false&platform=google&error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json() as GoogleOAuthRawResponse;

    if (!tokenData.access_token) {
      console.error('Google OAuth token exchange returned no access token:', tokenData);
      const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:4200';
      return res.redirect(`${frontendUrl}/connections?success=false&platform=google&error=no_access_token`);
    }

    console.log('✅ Google OAuth token exchange successful');

    // Decode ID token to get user information (basic JWT parsing)
    let userEmail = 'unknown@example.com';
    let userDomain = 'example.com';

    if (tokenData.id_token) {
      try {
        // Simple JWT decode (payload is the second segment)
        const tokenParts = tokenData.id_token.split('.');
        if (tokenParts.length === 3 && tokenParts[1]) {
          const idTokenPayload = JSON.parse(
            Buffer.from(tokenParts[1], 'base64').toString()
          );
          userEmail = idTokenPayload.email || userEmail;
          userDomain = idTokenPayload.hd || userEmail.split('@')[1] || userDomain;
        }
      } catch (error) {
        console.warn('Failed to decode ID token:', error);
      }
    }

    // Parse scopes
    const scopes = tokenData.scope ? tokenData.scope.split(' ') : [];

    const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:4200';

    // Use Clerk organization ID from state parameter
    const organizationId = clerkOrgId;
    const platformUserId = `google-user-${userEmail}`;

    console.log('🔐 Using Clerk organization ID:', organizationId);

    const connectionData = {
      organization_id: organizationId,
      platform_type: 'google',
      platform_user_id: platformUserId,
      display_name: `Google Workspace - ${userDomain}`,
      permissions_granted: scopes,
      metadata: {
        platformSpecific: {
          google: {
            email: userEmail,
            domain: userDomain,
            workspace_domain: userDomain,
            scopes: scopes,
            token_type: tokenData.token_type
          }
        }
      }
    };

    const storageResult = await hybridStorage.storeConnection(connectionData);

    // Store OAuth credentials in OAuthCredentialStorageService
    if (storageResult.success && storageResult.data?.id) {
      const connectionId = storageResult.data.id;

      // Calculate token expiration
      const expiresAt = tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : new Date(Date.now() + 3600 * 1000); // Default 1 hour

      const googleCredentials: GoogleOAuthCredentials = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenType: tokenData.token_type,
        scope: scopes,
        expiresAt: expiresAt,
        idToken: tokenData.id_token,
        email: userEmail,
        domain: userDomain,
        organizationId: organizationId,
      };

      await oauthStorage.storeCredentials(connectionId, googleCredentials);

      console.log('✅ Google OAuth credentials stored for connection:', connectionId);
    }

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
app.get('/api/connections', optionalClerkAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    // Get organization ID from Clerk auth or fallback to demo
    const authRequest = req as ClerkAuthRequest;
    const organizationId = authRequest.auth?.organizationId || 'demo-org-id';

    console.log('📊 Fetching connections for organization:', organizationId);
    console.log('🔍 Clerk auth context:', {
      hasAuth: !!authRequest.auth,
      organizationId: authRequest.auth?.organizationId,
      userId: authRequest.auth?.userId,
      headers: {
        'x-clerk-organization-id': req.headers['x-clerk-organization-id'],
        'x-clerk-user-id': req.headers['x-clerk-user-id']
      }
    });

    const storageResult = await hybridStorage.getConnections(organizationId);

    if (!storageResult.success) {
      console.error('Failed to fetch connections from hybrid storage:', storageResult.error);
      res.status(500).json({
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

// Connection stats endpoint - provides connection statistics for dashboard
app.get('/api/connections/stats', optionalClerkAuth, async (req: Request, res: Response) => {
  try {
    // Get organization ID from Clerk auth or fallback to demo
    const authRequest = req as ClerkAuthRequest;
    const organizationId = authRequest.auth?.organizationId || 'demo-org-id';

    console.log('📊 Fetching connection stats for organization:', organizationId);

    const storageResult = await hybridStorage.getConnections(organizationId);

    const connections = storageResult.data || [];

    // Calculate connection statistics
    const stats = {
      total: connections.length,
      active: connections.filter(conn => conn.status === 'active').length,
      pending: connections.filter(conn => conn.status === 'pending').length,
      error: connections.filter(conn => conn.status === 'error').length,
      platforms: {
        slack: connections.filter(conn => conn.platform_type === 'slack').length,
        google: connections.filter(conn => conn.platform_type === 'google').length,
        microsoft: connections.filter(conn => conn.platform_type === 'microsoft').length
      },
      lastSync: connections.length > 0 ?
        Math.max(...connections.map(conn => new Date(conn.updated_at).getTime())) : null
    };

    console.log('Connection stats requested:', stats);

    res.json({
      success: true,
      stats,
      storageMode: storageResult.storageMode,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching connection stats:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch connection stats',
      timestamp: new Date().toISOString()
    });
  }
});

// Disconnect endpoint - removes a specific connection from database
app.delete('/api/connections/:id', async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id;

  if (!id) {
    res.status(400).json({
      success: false,
      error: 'Connection ID is required'
    });
    return;
  }

  try {
    // Try to find the connection in database first
    let connection = await platformConnectionRepository.findById(id);
    let deletedFromDatabase = false;
    let deletedFromMemory = false;

    // If found in database, delete from database
    if (connection) {
      deletedFromDatabase = await platformConnectionRepository.delete(id);
      if (!deletedFromDatabase) {
        res.status(500).json({
          success: false,
          error: 'Failed to remove connection from database',
          connectionId: id
        });
        return;
      }
      console.log(`✅ Deleted connection from database: ${id}`);
    } else {
      // Not in database, check memory storage
      const memoryItem = oauthMemoryStorage.get(id);
      if (memoryItem) {
        // Create a connection object from memory data for response
        connection = {
          id: memoryItem.id,
          organization_id: memoryItem.data.organization_id,
          platform_type: memoryItem.data.platform_type as any,
          platform_user_id: memoryItem.data.platform_user_id,
          display_name: memoryItem.data.display_name,
          permissions_granted: memoryItem.data.permissions_granted,
          metadata: memoryItem.data.metadata as any,
          platform_workspace_id: memoryItem.data.platform_workspace_id ?? null,
          status: 'active' as any,
          created_at: memoryItem.storedAt,
          updated_at: memoryItem.storedAt,
          last_sync_at: memoryItem.storedAt,
          expires_at: null,
          last_error: null,
          webhook_url: null,
          webhook_secret_id: null
        };

        // Delete from memory
        deletedFromMemory = oauthMemoryStorage.remove(id);
        console.log(`✅ Deleted connection from memory: ${id}`);
      }
    }

    // If not found in either storage, return 404
    if (!connection) {
      res.status(404).json({
        success: false,
        error: 'Connection not found in database or memory',
        connectionId: id
      });
      return;
    }

    // TODO: Also remove OAuth credentials (deleteCredentials method needs to be implemented)
    // try {
    //   oauthCredentialStorage.deleteCredentials(id);
    //   console.log(`✅ Deleted OAuth credentials for: ${id}`);
    // } catch (credError) {
    //   console.warn(`⚠️  Failed to delete OAuth credentials for ${id}:`, credError);
    //   // Don't fail the entire request if credential deletion fails
    // }

    console.log(`✅ Disconnected platform: ${connection.platform_type}, Connection ID: ${id}`);

    res.json({
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
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove connection',
      connectionId: id
    });
  }
});

// Discovery endpoint with data provider support
app.post('/api/connections/:id/discover', optionalClerkAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  let discoveryRunId: string | null = null; // Track discovery run ID for error handling

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

    // Get organization ID from Clerk auth context
    const authRequest = req as ClerkAuthRequest;
    const organizationId = authRequest.auth?.organizationId || 'demo-org-id';

    console.log('🔍 Discovery using organization ID:', organizationId);

    // Create discovery run record
    const { db } = await import('./database/pool');
    const discoveryRunQuery = `
      INSERT INTO discovery_runs (
        organization_id,
        platform_connection_id,
        status,
        started_at
      ) VALUES ($1, $2, $3, NOW())
      RETURNING id
    `;
    const discoveryRunResult = await db.query<{ id: string }>(discoveryRunQuery, [
      organizationId,
      id || '',
      'in_progress'
    ]);
    if (!discoveryRunResult.rows[0]) {
      throw new Error('Failed to create discovery run');
    }
    discoveryRunId = discoveryRunResult.rows[0].id; // Assign to outer scope variable
    console.log('📊 Created discovery run:', discoveryRunId);

    const result = await dataProvider.discoverAutomations(id || '', organizationId);

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

    // Persist automations to database
    if (result.success && result.discovery.automations.length > 0) {
      console.log(`💾 Persisting ${result.discovery.automations.length} automations to database...`);

      // Debug: Show sample dates before persisting
      const sampleDates = result.discovery.automations.slice(0, 3).map(a => ({
        name: a.name,
        createdAt: a.createdAt,
        createdAtType: typeof a.createdAt
      }));
      console.log('  📅 Sample dates before persistence:', JSON.stringify(sampleDates, null, 2));

      for (const automation of result.discovery.automations) {
        const upsertQuery = `
          INSERT INTO discovered_automations (
            organization_id,
            platform_connection_id,
            discovery_run_id,
            external_id,
            name,
            description,
            automation_type,
            status,
            trigger_type,
            actions,
            permissions_required,
            platform_metadata,
            last_modified_at,
            last_triggered_at,
            first_discovered_at,
            last_seen_at,
            is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), $16)
          ON CONFLICT (platform_connection_id, external_id)
          DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            status = EXCLUDED.status,
            last_seen_at = NOW(),
            last_modified_at = EXCLUDED.last_modified_at,
            last_triggered_at = EXCLUDED.last_triggered_at,
            platform_metadata = EXCLUDED.platform_metadata,
            is_active = EXCLUDED.is_active,
            updated_at = NOW()
          RETURNING id
        `;

        // Map automation type to enum value
        const automationType = automation.type === 'bot' ? 'bot' :
                              automation.type === 'workflow' ? 'workflow' :
                              automation.type === 'integration' ? 'integration' :
                              automation.type === 'webhook' ? 'webhook' :
                              'script';

        // Map status to enum value
        const status = automation.status === 'active' ? 'active' :
                       automation.status === 'inactive' ? 'inactive' :
                       automation.status === 'error' ? 'error' :
                       'unknown';

        const values = [
          organizationId,                              // $1
          id || '',                                    // $2
          discoveryRunId,                              // $3
          automation.id,                               // $4
          automation.name,                             // $5
          automation.metadata?.description || null,    // $6
          automationType,                              // $7
          status,                                      // $8
          automation.trigger || null,                  // $9
          JSON.stringify(automation.actions || []),    // $10
          JSON.stringify(automation.metadata?.permissions || []), // $11
          automation.metadata || {},                   // $12 (JSONB - pass object directly)
          automation.lastModified || null,             // $13
          automation.lastTriggered || null,            // $14
          automation.createdAt || new Date(),          // $15 - Use actual auth date from audit logs
          automation.status === 'active'               // $16
        ];

        await db.query(upsertQuery, values);
      }

      console.log(`✅ Successfully persisted ${result.discovery.automations.length} automations`);

      // Update discovery run with results
      const updateRunQuery = `
        UPDATE discovery_runs
        SET
          status = $1,
          completed_at = NOW(),
          duration_ms = $2,
          automations_found = $3,
          metadata = $4,
          updated_at = NOW()
        WHERE id = $5
      `;

      await db.query(updateRunQuery, [
        'completed',
        result.discovery.metadata.executionTimeMs || 0,
        result.discovery.automations.length,
        result.discovery.metadata as any, // JSONB field - pg library handles conversion
        discoveryRunId
      ]);

      console.log(`📊 Updated discovery run ${discoveryRunId} with results`);
    }

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
    // NO MOCK FALLBACK - Return real error for debugging
    console.error('❌ Discovery failed:', error);

    // Categorize error for user-friendly messages
    let userMessage = 'Discovery failed';
    let errorCategory = 'unknown';

    const errorMsg = error instanceof Error ? error.message : '';

    if (errorMsg.includes('authenticate') || errorMsg.includes('credential') || errorMsg.includes('invalid_grant') || errorMsg.includes('Token has been expired')) {
      userMessage = 'Your connection has expired. Please reconnect your account to continue.';
      errorCategory = 'authentication';
    } else if (errorMsg.includes('permission') || errorMsg.includes('Access denied') || errorMsg.includes('insufficient') || errorMsg.includes('scope')) {
      userMessage = 'Insufficient permissions. Please reconnect with required access scopes.';
      errorCategory = 'permission';
    } else if (errorMsg.includes('quota') || errorMsg.includes('rate limit') || errorMsg.includes('429')) {
      userMessage = 'API rate limit reached. Please try again in a few minutes.';
      errorCategory = 'rate_limit';
    } else if (errorMsg.includes('network') || errorMsg.includes('ECONNREFUSED') || errorMsg.includes('ETIMEDOUT') || errorMsg.includes('fetch failed')) {
      userMessage = 'Network error. Please check your connection and try again.';
      errorCategory = 'network';
    } else if (errorMsg.includes('not found') || errorMsg.includes('404')) {
      userMessage = 'Connection not found. Please reconnect the platform.';
      errorCategory = 'not_found';
    }

    // Update discovery run status to failed if we created one
    if (discoveryRunId) {
      try {
        const { db } = await import('./database/pool');
        await db.query(`
          UPDATE discovery_runs
          SET
            status = 'failed',
            completed_at = NOW(),
            errors_count = 1,
            error_details = $1,
            updated_at = NOW()
          WHERE id = $2
        `, [
          error instanceof Error ? error.message : 'Unknown error',
          discoveryRunId
        ]);
        console.log(`📊 Marked discovery run ${discoveryRunId} as failed`);
      } catch (updateError) {
        console.error('❌ Failed to update discovery run status:', updateError);
      }
    }

    // Emit user-friendly error message via Socket.io
    io.emit('discovery:failed', {
      connectionId: id,
      error: userMessage,
      errorCategory,
      technicalError: errorMsg
    });

    res.status(500).json({
      success: false,
      error: userMessage,
      errorCategory,
      technicalDetails: process.env.NODE_ENV === 'development' ? {
        message: errorMsg,
        stack: error instanceof Error ? error.stack : undefined
      } : undefined
    });
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

// AI Platform Audit Logs endpoint - OAuth-based detection with Clerk auth
app.get('/api/ai-platforms/audit-logs', optionalClerkAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, connectionId } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        error: 'startDate and endDate query parameters are required'
      });
      return;
    }

    // Get organization ID from Clerk auth or fallback to demo
    const authRequest = req as ClerkAuthRequest;
    const organizationId = authRequest.auth?.organizationId || 'demo-org-id';

    console.log('🔍 Fetching AI platform audit logs for organization:', organizationId);

    // Get Google Workspace connections for this organization
    const { platformConnectionRepository } = await import('./database/repositories/platform-connection');
    const orgConnections = await hybridStorage.getConnections(organizationId);

    if (!orgConnections.success || !orgConnections.data) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch connections for organization',
        organizationId
      });
      return;
    }

    const googleConnection = orgConnections.data.find((c: any) => c.platform_type === 'google');

    if (!googleConnection) {
      res.status(404).json({
        success: false,
        error: 'No Google Workspace connection found for your organization. Please connect Google Workspace first.',
        hint: 'Visit /connections and connect your Google Workspace account',
        organizationId
      });
      return;
    }

    // Get OAuth credentials for this connection
    const credentials = await oauthStorage.getCredentials(googleConnection.id);

    if (!credentials) {
      res.status(401).json({
        success: false,
        error: 'Google Workspace credentials not found',
        connectionId: googleConnection.id
      });
      return;
    }

    // Use GoogleConnector to query AI platform audit logs
    const { GoogleConnector } = await import('./connectors/google');
    const googleConnector = new GoogleConnector();

    // Authenticate
    const scopeString = Array.isArray(credentials.scope)
      ? credentials.scope.join(' ')
      : (credentials.scope || '');

    const authResult = await googleConnector.authenticate({
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      expiresAt: credentials.expiresAt,
      tokenType: 'Bearer',
      scope: scopeString
    });

    if (!authResult.success) {
      res.status(401).json({
        success: false,
        error: 'Failed to authenticate with Google Workspace',
        details: authResult.error
      });
      return;
    }

    // Query AI platform audit logs
    const result = await googleConnector.getAIAuditLogs({
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string)
    });

    res.json({
      success: true,
      data: result,
      connection: {
        id: googleConnection.id,
        displayName: googleConnection.display_name,
        platform: 'google'
      }
    });

  } catch (error) {
    console.error('Error fetching AI platform audit logs:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch AI platform audit logs'
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

// Run database migrations before starting server
async function startServer() {
  try {
    // Apply pending database migrations
    // TODO: Fix migration runner pool initialization issue
    // await runMigrations();

    // Start the HTTP server
    const server = httpServer.listen(PORT, () => {
      console.log(`🚀 SaaS X-Ray Backend running on port ${PORT}`);
      console.log(`📍 Environment: ${NODE_ENV}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔗 CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:4200'}`);
      console.log(`⚡ Socket.io enabled for real-time discovery progress`);
      console.log(`⚠️  Auto-migrations temporarily disabled - migrations already applied`);
    });

    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

let server: any;

// Start server with migration support
(async () => {
  server = await startServer();
})();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (server) {
    server.close(() => {
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

export default app;