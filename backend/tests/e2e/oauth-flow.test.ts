/**
 * End-to-End OAuth Flow Tests
 * Tests complete OAuth authentication flows with real-world scenarios
 */

import request from 'supertest';
import express, { Express } from 'express';
import { testDb } from '../helpers/test-database';
import { MockDataGenerator } from '../helpers/mock-data';
import authRoutes from '../../src/routes/auth';
import connectionsRoutes from '../../src/routes/connections';
import { encryptionService } from '../../src/security/encryption';
import { jwtService } from '../../src/security/jwt';
import crypto from 'crypto';

// Mock external OAuth providers
const mockSlackOAuth = {
  authorizeUrl: 'https://slack.com/oauth/authorize',
  tokenUrl: 'https://slack.com/api/oauth.access',
  userInfoUrl: 'https://slack.com/api/users.info',
  
  // Mock responses
  tokenResponse: {
    access_token: 'xoxb-mock-slack-token',
    refresh_token: 'xoxr-mock-refresh-token',
    scope: 'channels:read,users:read,chat:write',
    team_id: 'T123456789',
    team_name: 'Test Team',
    user_id: 'U123456789',
    expires_in: 43200 // 12 hours
  },

  userInfoResponse: {
    ok: true,
    user: {
      id: 'U123456789',
      name: 'testuser',
      real_name: 'Test User',
      email: 'test@testteam.slack.com'
    },
    team: {
      id: 'T123456789',
      name: 'Test Team',
      domain: 'testteam'
    }
  }
};

// Mock HTTP requests to external services
jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn(),
  create: jest.fn(() => ({
    post: jest.fn(),
    get: jest.fn()
  }))
}));

const axios = require('axios');

describe('OAuth Flow End-to-End Tests', () => {
  let app: Express;
  let testData: any;
  let userTokens: any;
  let authHeader: string;

  beforeAll(async () => {
    await testDb.beginTransaction();
    
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);
    app.use('/api/connections', connectionsRoutes);
    
    // Setup test data
    testData = await testDb.createFixtures();

    // Setup authenticated user
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'SecurePass123!'
      });
    
    userTokens = loginResponse.body.tokens;
    authHeader = `Bearer ${userTokens.accessToken}`;
  });

  afterAll(async () => {
    await testDb.rollbackTransaction();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock responses
    axios.post.mockImplementation((url: string, data: any) => {
      if (url.includes('slack.com/api/oauth.access')) {
        return Promise.resolve({ data: mockSlackOAuth.tokenResponse });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    axios.get.mockImplementation((url: string) => {
      if (url.includes('slack.com/api/users.info')) {
        return Promise.resolve({ data: mockSlackOAuth.userInfoResponse });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  describe('Complete Slack OAuth Flow', () => {
    let oauthState: string;
    let codeVerifier: string;

    it('should initiate OAuth authorization flow', async () => {
      const response = await request(app)
        .get('/auth/oauth/slack/authorize')
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        authorizationUrl: expect.stringContaining('slack.com/oauth/authorize'),
        state: expect.any(String)
      });

      oauthState = response.body.state;
      
      // Verify authorization URL contains required parameters
      const authUrl = new URL(response.body.authorizationUrl);
      expect(authUrl.searchParams.get('client_id')).toBeDefined();
      expect(authUrl.searchParams.get('scope')).toBeDefined();
      expect(authUrl.searchParams.get('state')).toBe(oauthState);
      expect(authUrl.searchParams.get('redirect_uri')).toBeDefined();
      
      // PKCE parameters for enhanced security
      expect(authUrl.searchParams.get('code_challenge')).toBeDefined();
      expect(authUrl.searchParams.get('code_challenge_method')).toBe('S256');
    });

    it('should handle OAuth callback and create connection', async () => {
      // First initiate OAuth to get state
      const initResponse = await request(app)
        .get('/auth/oauth/slack/authorize')
        .set('Authorization', authHeader);
      
      const state = initResponse.body.state;
      const mockAuthCode = 'mock-auth-code-123';

      // Handle OAuth callback
      const callbackResponse = await request(app)
        .get('/auth/oauth/slack/callback')
        .query({
          code: mockAuthCode,
          state: state
        })
        .set('Authorization', authHeader)
        .expect(200);

      expect(callbackResponse.body).toMatchObject({
        success: true,
        connection: expect.objectContaining({
          id: expect.any(String),
          platform_type: 'slack',
          status: 'active',
          display_name: expect.stringContaining('Test Team')
        })
      });

      // Verify token exchange was called
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('oauth.access'),
        expect.objectContaining({
          code: mockAuthCode,
          client_id: expect.any(String),
          client_secret: expect.any(String),
          redirect_uri: expect.any(String)
        })
      );

      // Verify connection was created in database
      const connection = callbackResponse.body.connection;
      const dbConnection = await testDb.query(
        'SELECT * FROM platform_connections WHERE id = $1',
        [connection.id]
      );
      
      expect(dbConnection.rows[0]).toBeDefined();
      expect(dbConnection.rows[0].platform_type).toBe('slack');
      expect(dbConnection.rows[0].platform_workspace_id).toBe('T123456789');
      expect(dbConnection.rows[0].status).toBe('active');
    });

    it('should securely store OAuth credentials', async () => {
      // Complete OAuth flow
      const initResponse = await request(app)
        .get('/auth/oauth/slack/authorize')
        .set('Authorization', authHeader);
      
      const callbackResponse = await request(app)
        .get('/auth/oauth/slack/callback')
        .query({
          code: 'mock-auth-code-456',
          state: initResponse.body.state
        })
        .set('Authorization', authHeader);

      const connectionId = callbackResponse.body.connection.id;

      // Verify encrypted credentials were stored
      const credentials = await testDb.query(`
        SELECT * FROM encrypted_credentials 
        WHERE platform_connection_id = $1
        ORDER BY credential_type
      `, [connectionId]);

      expect(credentials.rows.length).toBeGreaterThan(0);

      // Check access token credential
      const accessTokenCred = credentials.rows.find(
        cred => cred.credential_type === 'access_token'
      );
      expect(accessTokenCred).toBeDefined();
      expect(accessTokenCred.encrypted_value).toBeDefined();
      expect(accessTokenCred.encryption_key_id).toBe('default');

      // Verify encryption/decryption works
      const encryptedData = {
        ciphertext: accessTokenCred.encrypted_value.split(':')[2],
        iv: accessTokenCred.encrypted_value.split(':')[0],
        authTag: accessTokenCred.encrypted_value.split(':')[1],
        salt: '',
        keyId: accessTokenCred.encryption_key_id,
        algorithm: 'aes-256-gcm',
        version: '1.0'
      };

      const decryptedToken = encryptionService.decryptLegacy(
        accessTokenCred.encrypted_value,
        accessTokenCred.encryption_key_id
      );
      
      expect(decryptedToken).toBe(mockSlackOAuth.tokenResponse.access_token);
    });

    it('should handle OAuth callback errors', async () => {
      const response = await request(app)
        .get('/auth/oauth/slack/callback')
        .query({
          error: 'access_denied',
          error_description: 'User denied access',
          state: 'invalid-state'
        })
        .set('Authorization', authHeader)
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'OAuth callback failed',
        code: 'OAUTH_CALLBACK_ERROR'
      });
    });

    it('should validate OAuth state parameter', async () => {
      const response = await request(app)
        .get('/auth/oauth/slack/callback')
        .query({
          code: 'valid-code',
          state: 'invalid-state-123'
        })
        .set('Authorization', authHeader)
        .expect(400);

      expect(response.body.code).toBe('OAUTH_CALLBACK_ERROR');
    });

    it('should handle token exchange failures', async () => {
      // Mock OAuth token exchange failure
      axios.post.mockRejectedValueOnce(new Error('Token exchange failed'));

      const initResponse = await request(app)
        .get('/auth/oauth/slack/authorize')
        .set('Authorization', authHeader);

      const response = await request(app)
        .get('/auth/oauth/slack/callback')
        .query({
          code: 'failing-code',
          state: initResponse.body.state
        })
        .set('Authorization', authHeader)
        .expect(400);

      expect(response.body.code).toBe('OAUTH_CALLBACK_ERROR');
    });
  });

  describe('OAuth Token Management', () => {
    let connectionId: string;

    beforeEach(async () => {
      // Create a test connection with OAuth tokens
      const initResponse = await request(app)
        .get('/auth/oauth/slack/authorize')
        .set('Authorization', authHeader);

      const callbackResponse = await request(app)
        .get('/auth/oauth/slack/callback')
        .query({
          code: 'token-management-code',
          state: initResponse.body.state
        })
        .set('Authorization', authHeader);

      connectionId = callbackResponse.body.connection.id;
    });

    it('should refresh OAuth tokens', async () => {
      // Mock refresh token response
      axios.post.mockImplementation((url: string) => {
        if (url.includes('oauth.access')) {
          return Promise.resolve({
            data: {
              access_token: 'xoxb-new-access-token',
              refresh_token: 'xoxr-new-refresh-token',
              expires_in: 43200
            }
          });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      const response = await request(app)
        .post(`/auth/oauth/connections/${connectionId}/refresh`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        tokens: expect.objectContaining({
          access_token: 'xoxb-new-access-token',
          refresh_token: 'xoxr-new-refresh-token'
        })
      });

      // Verify new tokens are encrypted and stored
      const credentials = await testDb.query(`
        SELECT encrypted_value FROM encrypted_credentials
        WHERE platform_connection_id = $1 AND credential_type = 'access_token'
      `, [connectionId]);

      const decryptedToken = encryptionService.decryptLegacy(
        credentials.rows[0].encrypted_value,
        'default'
      );
      expect(decryptedToken).toBe('xoxb-new-access-token');
    });

    it('should handle refresh token expiration', async () => {
      axios.post.mockRejectedValueOnce({
        response: {
          status: 401,
          data: { error: 'invalid_grant' }
        }
      });

      const response = await request(app)
        .post(`/auth/oauth/connections/${connectionId}/refresh`)
        .set('Authorization', authHeader)
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Token refresh failed',
        code: 'TOKEN_REFRESH_FAILED'
      });

      // Connection status should be updated to indicate token issues
      const connection = await testDb.query(
        'SELECT status, last_error FROM platform_connections WHERE id = $1',
        [connectionId]
      );
      
      expect(connection.rows[0].status).toBe('error');
      expect(connection.rows[0].last_error).toContain('Token refresh failed');
    });

    it('should revoke OAuth tokens and connection', async () => {
      // Mock successful revocation
      axios.post.mockResolvedValueOnce({ data: { revoked: true } });

      const response = await request(app)
        .delete(`/auth/oauth/connections/${connectionId}`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'OAuth connection revoked successfully'
      });

      // Verify connection is marked as inactive
      const connection = await testDb.query(
        'SELECT status FROM platform_connections WHERE id = $1',
        [connectionId]
      );
      
      expect(connection.rows[0].status).toBe('inactive');

      // Verify credentials are deleted
      const credentials = await testDb.query(
        'SELECT COUNT(*) as count FROM encrypted_credentials WHERE platform_connection_id = $1',
        [connectionId]
      );
      
      expect(parseInt(credentials.rows[0].count)).toBe(0);
    });
  });

  describe('Multi-Platform OAuth Support', () => {
    it('should support Google OAuth flow', async () => {
      // Mock Google OAuth responses
      const mockGoogleToken = {
        access_token: 'ya29.mock-google-token',
        refresh_token: 'mock-google-refresh',
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        expires_in: 3600
      };

      const mockGoogleUserInfo = {
        id: '123456789',
        email: 'test@gmail.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg'
      };

      axios.post.mockImplementation((url: string) => {
        if (url.includes('oauth2.googleapis.com/token')) {
          return Promise.resolve({ data: mockGoogleToken });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      axios.get.mockImplementation((url: string) => {
        if (url.includes('www.googleapis.com/oauth2/v2/userinfo')) {
          return Promise.resolve({ data: mockGoogleUserInfo });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      // Initiate Google OAuth
      const initResponse = await request(app)
        .get('/auth/oauth/google/authorize')
        .set('Authorization', authHeader)
        .expect(200);

      expect(initResponse.body.authorizationUrl).toContain('accounts.google.com');

      // Complete OAuth flow
      const callbackResponse = await request(app)
        .get('/auth/oauth/google/callback')
        .query({
          code: 'google-auth-code',
          state: initResponse.body.state
        })
        .set('Authorization', authHeader)
        .expect(200);

      expect(callbackResponse.body.connection.platform_type).toBe('google');
    });

    it('should support Microsoft OAuth flow', async () => {
      // Mock Microsoft OAuth responses
      const mockMicrosoftToken = {
        access_token: 'EwBwA8l6BAANAMock-microsoft-token',
        refresh_token: 'OAQABAAIAAADCoMpjJXrxTq9Mock-refresh',
        scope: 'https://graph.microsoft.com/User.Read',
        expires_in: 3600
      };

      const mockMicrosoftUserInfo = {
        id: '12345678-1234-1234-1234-123456789012',
        userPrincipalName: 'test@contoso.com',
        displayName: 'Test User'
      };

      axios.post.mockImplementation((url: string) => {
        if (url.includes('login.microsoftonline.com')) {
          return Promise.resolve({ data: mockMicrosoftToken });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      axios.get.mockImplementation((url: string) => {
        if (url.includes('graph.microsoft.com/v1.0/me')) {
          return Promise.resolve({ data: mockMicrosoftUserInfo });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      // Initiate Microsoft OAuth
      const initResponse = await request(app)
        .get('/auth/oauth/microsoft/authorize')
        .set('Authorization', authHeader)
        .expect(200);

      expect(initResponse.body.authorizationUrl).toContain('login.microsoftonline.com');

      // Complete OAuth flow
      const callbackResponse = await request(app)
        .get('/auth/oauth/microsoft/callback')
        .query({
          code: 'microsoft-auth-code',
          state: initResponse.body.state
        })
        .set('Authorization', authHeader)
        .expect(200);

      expect(callbackResponse.body.connection.platform_type).toBe('microsoft');
    });
  });

  describe('OAuth Security Features', () => {
    it('should implement PKCE for enhanced security', async () => {
      const initResponse = await request(app)
        .get('/auth/oauth/slack/authorize')
        .set('Authorization', authHeader);

      const authUrl = new URL(initResponse.body.authorizationUrl);
      const codeChallenge = authUrl.searchParams.get('code_challenge');
      const codeChallengeMethod = authUrl.searchParams.get('code_challenge_method');

      expect(codeChallenge).toBeDefined();
      expect(codeChallengeMethod).toBe('S256');
      expect(codeChallenge?.length).toBeGreaterThan(40); // Base64URL encoded SHA256
    });

    it('should prevent CSRF attacks with state parameter', async () => {
      const initResponse = await request(app)
        .get('/auth/oauth/slack/authorize')
        .set('Authorization', authHeader);

      const state = initResponse.body.state;
      expect(state).toBeDefined();
      expect(state.length).toBeGreaterThan(16); // Should be cryptographically secure

      // State should be tied to user session
      const maliciousResponse = await request(app)
        .get('/auth/oauth/slack/callback')
        .query({
          code: 'malicious-code',
          state: 'malicious-state'
        })
        .set('Authorization', authHeader)
        .expect(400);

      expect(maliciousResponse.body.code).toBe('OAUTH_CALLBACK_ERROR');
    });

    it('should validate redirect URI to prevent open redirect attacks', async () => {
      // This would be tested at the OAuth service level
      // The redirect URI should be validated against configured allowed URIs
      const initResponse = await request(app)
        .get('/auth/oauth/slack/authorize')
        .set('Authorization', authHeader);

      const authUrl = new URL(initResponse.body.authorizationUrl);
      const redirectUri = authUrl.searchParams.get('redirect_uri');

      expect(redirectUri).toBeDefined();
      expect(redirectUri).toContain('localhost:3001'); // Should match configured URI
    });

    it('should implement token expiration and refresh', async () => {
      // Complete OAuth flow
      const initResponse = await request(app)
        .get('/auth/oauth/slack/authorize')
        .set('Authorization', authHeader);

      const callbackResponse = await request(app)
        .get('/auth/oauth/slack/callback')
        .query({
          code: 'expiration-test-code',
          state: initResponse.body.state
        })
        .set('Authorization', authHeader);

      const connectionId = callbackResponse.body.connection.id;

      // Check that token expiration is stored
      const credentials = await testDb.query(`
        SELECT expires_at FROM encrypted_credentials
        WHERE platform_connection_id = $1 AND credential_type = 'access_token'
      `, [connectionId]);

      expect(credentials.rows[0].expires_at).toBeDefined();
      
      const expirationTime = new Date(credentials.rows[0].expires_at);
      const now = new Date();
      expect(expirationTime.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should audit OAuth events for security monitoring', async () => {
      // Complete OAuth flow
      const initResponse = await request(app)
        .get('/auth/oauth/slack/authorize')
        .set('Authorization', authHeader);

      const callbackResponse = await request(app)
        .get('/auth/oauth/slack/callback')
        .query({
          code: 'audit-test-code',
          state: initResponse.body.state
        })
        .set('Authorization', authHeader);

      const connectionId = callbackResponse.body.connection.id;

      // Check audit logs were created
      const auditLogs = await testDb.query(`
        SELECT event_type, event_category, event_data
        FROM audit_logs
        WHERE platform_connection_id = $1
        ORDER BY created_at
      `, [connectionId]);

      expect(auditLogs.rows.length).toBeGreaterThan(0);
      
      // Should log OAuth initiation
      const oauthEvents = auditLogs.rows.filter(
        log => log.event_type.includes('oauth') || log.event_type.includes('connection')
      );
      expect(oauthEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network failures gracefully', async () => {
      axios.post.mockRejectedValueOnce(new Error('Network timeout'));

      const initResponse = await request(app)
        .get('/auth/oauth/slack/authorize')
        .set('Authorization', authHeader);

      const response = await request(app)
        .get('/auth/oauth/slack/callback')
        .query({
          code: 'network-failure-code',
          state: initResponse.body.state
        })
        .set('Authorization', authHeader)
        .expect(400);

      expect(response.body.code).toBe('OAUTH_CALLBACK_ERROR');
      expect(response.body.message).toContain('failed');
    });

    it('should handle provider-specific errors', async () => {
      // Mock Slack-specific error response
      axios.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            ok: false,
            error: 'invalid_client_id'
          }
        }
      });

      const initResponse = await request(app)
        .get('/auth/oauth/slack/authorize')
        .set('Authorization', authHeader);

      const response = await request(app)
        .get('/auth/oauth/slack/callback')
        .query({
          code: 'provider-error-code',
          state: initResponse.body.state
        })
        .set('Authorization', authHeader)
        .expect(400);

      expect(response.body.code).toBe('OAUTH_CALLBACK_ERROR');
    });

    it('should cleanup partial connections on failure', async () => {
      // Mock failure after token exchange but before user info
      axios.post.mockResolvedValueOnce({ data: mockSlackOAuth.tokenResponse });
      axios.get.mockRejectedValueOnce(new Error('User info fetch failed'));

      const initResponse = await request(app)
        .get('/auth/oauth/slack/authorize')
        .set('Authorization', authHeader);

      const response = await request(app)
        .get('/auth/oauth/slack/callback')
        .query({
          code: 'cleanup-test-code',
          state: initResponse.body.state
        })
        .set('Authorization', authHeader)
        .expect(400);

      // Verify no orphaned connections remain
      const orphanedConnections = await testDb.query(`
        SELECT COUNT(*) as count FROM platform_connections
        WHERE platform_user_id LIKE '%cleanup%' AND status != 'error'
      `);

      expect(parseInt(orphanedConnections.rows[0].count)).toBe(0);
    });
  });

  describe('Connection Management', () => {
    let connections: any[] = [];

    beforeEach(async () => {
      // Create multiple test connections
      const platforms = ['slack', 'google', 'microsoft'];
      connections = [];

      for (const platform of platforms) {
        const initResponse = await request(app)
          .get(`/auth/oauth/${platform}/authorize`)
          .set('Authorization', authHeader);

        // Mock platform-specific responses
        if (platform === 'slack') {
          axios.post.mockResolvedValueOnce({ data: mockSlackOAuth.tokenResponse });
          axios.get.mockResolvedValueOnce({ data: mockSlackOAuth.userInfoResponse });
        } else {
          axios.post.mockResolvedValueOnce({ data: { access_token: `${platform}-token` } });
          axios.get.mockResolvedValueOnce({ data: { id: `${platform}-user` } });
        }

        const callbackResponse = await request(app)
          .get(`/auth/oauth/${platform}/callback`)
          .query({
            code: `${platform}-code`,
            state: initResponse.body.state
          })
          .set('Authorization', authHeader);

        connections.push(callbackResponse.body.connection);
      }
    });

    it('should list all user connections', async () => {
      const response = await request(app)
        .get('/api/connections')
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.connections.length).toBeGreaterThanOrEqual(3);
      
      const platforms = response.body.connections.map((c: any) => c.platform_type);
      expect(platforms).toContain('slack');
      expect(platforms).toContain('google');
      expect(platforms).toContain('microsoft');
    });

    it('should get specific connection details', async () => {
      const connectionId = connections[0].id;

      const response = await request(app)
        .get(`/api/connections/${connectionId}`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.connection.id).toBe(connectionId);
      expect(response.body.connection.platform_type).toBe('slack');
      
      // Sensitive data should not be exposed
      expect(response.body.connection.access_token).toBeUndefined();
      expect(response.body.connection.refresh_token).toBeUndefined();
    });

    it('should test connection health', async () => {
      const connectionId = connections[0].id;
      
      // Mock successful API call
      axios.get.mockResolvedValueOnce({ 
        data: { ok: true, team: { name: 'Test Team' } }
      });

      const response = await request(app)
        .post(`/api/connections/${connectionId}/test`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.health.status).toBe('healthy');
    });

    it('should disconnect and cleanup connection', async () => {
      const connectionId = connections[0].id;

      const response = await request(app)
        .delete(`/api/connections/${connectionId}`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify connection is marked as inactive
      const connection = await testDb.query(
        'SELECT status FROM platform_connections WHERE id = $1',
        [connectionId]
      );
      expect(connection.rows[0].status).toBe('inactive');
    });
  });
});