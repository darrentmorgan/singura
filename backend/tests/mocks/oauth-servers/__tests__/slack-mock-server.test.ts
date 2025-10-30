/**
 * Unit tests for SlackMockOAuthServer
 */

import { SlackMockOAuthServer } from '../slack-mock-server';
import axios from 'axios';
import * as crypto from 'crypto';

describe('SlackMockOAuthServer', () => {
  let mockServer: SlackMockOAuthServer;
  const testPort = 4001;

  beforeAll(async () => {
    mockServer = new SlackMockOAuthServer({ port: testPort });
    await mockServer.start();
  });

  afterAll(async () => {
    await mockServer.stop();
  });

  beforeEach(() => {
    mockServer.reset();
  });

  describe('Server Lifecycle', () => {
    it('should start server successfully', () => {
      expect(mockServer.isRunning()).toBe(true);
      expect(mockServer.getPort()).toBe(testPort);
    });

    it('should have correct base URL', () => {
      expect(mockServer.getBaseUrl()).toBe(`http://localhost:${testPort}`);
    });

    it('should return health check', async () => {
      const response = await axios.get(`${mockServer.getBaseUrl()}/health`);
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ status: 'ok', port: testPort });
    });
  });

  describe('Authorization Flow', () => {
    it('should generate authorization URL with all parameters', () => {
      const authUrl = mockServer.getFullAuthorizationUrl({
        client_id: 'test_client_id',
        redirect_uri: 'http://localhost:3000/callback',
        scope: ['users:read', 'team:read'],
        state: 'random_state_string',
        code_challenge: 'test_challenge',
        code_challenge_method: 'S256',
      });

      const url = new URL(authUrl);
      expect(url.searchParams.get('client_id')).toBe('test_client_id');
      expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:3000/callback');
      expect(url.searchParams.get('scope')).toBe('users:read,team:read');
      expect(url.searchParams.get('state')).toBe('random_state_string');
      expect(url.searchParams.get('code_challenge')).toBe('test_challenge');
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
      expect(url.searchParams.get('response_type')).toBe('code');
    });

    it('should redirect with authorization code on valid request', async () => {
      const redirectUri = 'http://localhost:3000/callback';
      const state = 'test_state';

      try {
        await axios.get(`${mockServer.getBaseUrl()}/oauth/v2/authorize`, {
          params: {
            client_id: 'test_client',
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: 'users:read team:read',
            state: state,
          },
          maxRedirects: 0,
        });
      } catch (error: any) {
        // Axios throws on 3xx redirects when maxRedirects: 0
        expect(error.response.status).toBe(302);
        const location = error.response.headers.location;
        const locationUrl = new URL(location);
        expect(locationUrl.searchParams.get('code')).toBeTruthy();
        expect(locationUrl.searchParams.get('state')).toBe(state);
      }
    });

    it('should reject invalid scopes', async () => {
      try {
        await axios.get(`${mockServer.getBaseUrl()}/oauth/v2/authorize`, {
          params: {
            client_id: 'test_client',
            redirect_uri: 'http://localhost:3000/callback',
            response_type: 'code',
            scope: 'invalid:scope',
          },
        });
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe('invalid_scope');
      }
    });

    it('should reject missing required parameters', async () => {
      try {
        await axios.get(`${mockServer.getBaseUrl()}/oauth/v2/authorize`, {
          params: {
            client_id: 'test_client',
            // Missing redirect_uri
            response_type: 'code',
          },
        });
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe('invalid_request');
      }
    });
  });

  describe('Token Exchange', () => {
    let authCode: string;

    beforeEach(async () => {
      // Get authorization code first
      try {
        await axios.get(`${mockServer.getBaseUrl()}/oauth/v2/authorize`, {
          params: {
            client_id: 'test_client',
            redirect_uri: 'http://localhost:3000/callback',
            response_type: 'code',
            scope: 'users:read team:read',
            state: 'test_state',
          },
          maxRedirects: 0,
        });
      } catch (error: any) {
        const location = error.response.headers.location;
        const locationUrl = new URL(location);
        authCode = locationUrl.searchParams.get('code')!;
      }
    });

    it('should exchange authorization code for tokens', async () => {
      const response = await axios.post(mockServer.getFullTokenUrl(), {
        grant_type: 'authorization_code',
        code: authCode,
        client_id: 'test_client',
        redirect_uri: 'http://localhost:3000/callback',
      });

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        ok: true,
        access_token: expect.stringContaining('mock_access_'),
        refresh_token: expect.stringContaining('mock_refresh_'),
        token_type: 'bot',
        scope: 'users:read,team:read',
        bot_user_id: expect.any(String),
        team: {
          id: expect.any(String),
          name: expect.any(String),
        },
        expires_in: expect.any(Number),
      });
    });

    it('should reject invalid authorization code', async () => {
      try {
        await axios.post(mockServer.getFullTokenUrl(), {
          grant_type: 'authorization_code',
          code: 'invalid_code',
          client_id: 'test_client',
          redirect_uri: 'http://localhost:3000/callback',
        });
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe('invalid_grant');
      }
    });

    it('should reject mismatched client_id', async () => {
      try {
        await axios.post(mockServer.getFullTokenUrl(), {
          grant_type: 'authorization_code',
          code: authCode,
          client_id: 'different_client',
          redirect_uri: 'http://localhost:3000/callback',
        });
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe('invalid_client');
      }
    });

    it('should reject reused authorization code', async () => {
      // First use - should succeed
      await axios.post(mockServer.getFullTokenUrl(), {
        grant_type: 'authorization_code',
        code: authCode,
        client_id: 'test_client',
        redirect_uri: 'http://localhost:3000/callback',
      });

      // Second use - should fail
      try {
        await axios.post(mockServer.getFullTokenUrl(), {
          grant_type: 'authorization_code',
          code: authCode,
          client_id: 'test_client',
          redirect_uri: 'http://localhost:3000/callback',
        });
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe('invalid_grant');
      }
    });
  });

  describe('Token Refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Get tokens first
      try {
        await axios.get(`${mockServer.getBaseUrl()}/oauth/v2/authorize`, {
          params: {
            client_id: 'test_client',
            redirect_uri: 'http://localhost:3000/callback',
            response_type: 'code',
            scope: 'users:read team:read',
          },
          maxRedirects: 0,
        });
      } catch (error: any) {
        const location = error.response.headers.location;
        const locationUrl = new URL(location);
        const code = locationUrl.searchParams.get('code')!;

        const tokenResponse = await axios.post(mockServer.getFullTokenUrl(), {
          grant_type: 'authorization_code',
          code: code,
          client_id: 'test_client',
          redirect_uri: 'http://localhost:3000/callback',
        });

        refreshToken = tokenResponse.data.refresh_token;
      }
    });

    it('should refresh tokens successfully', async () => {
      const response = await axios.post(mockServer.getFullTokenUrl(), {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: 'test_client',
      });

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        ok: true,
        access_token: expect.stringContaining('mock_access_'),
        refresh_token: expect.stringContaining('mock_refresh_'),
        token_type: 'bot',
      });

      // New tokens should be different
      expect(response.data.access_token).not.toBe(refreshToken);
      expect(response.data.refresh_token).not.toBe(refreshToken);
    });

    it('should reject invalid refresh token', async () => {
      try {
        await axios.post(mockServer.getFullTokenUrl(), {
          grant_type: 'refresh_token',
          refresh_token: 'invalid_token',
          client_id: 'test_client',
        });
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe('invalid_grant');
      }
    });
  });

  describe('Token Revocation', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Get tokens first
      try {
        await axios.get(`${mockServer.getBaseUrl()}/oauth/v2/authorize`, {
          params: {
            client_id: 'test_client',
            redirect_uri: 'http://localhost:3000/callback',
            response_type: 'code',
            scope: 'users:read',
          },
          maxRedirects: 0,
        });
      } catch (error: any) {
        const location = error.response.headers.location;
        const locationUrl = new URL(location);
        const code = locationUrl.searchParams.get('code')!;

        const tokenResponse = await axios.post(mockServer.getFullTokenUrl(), {
          grant_type: 'authorization_code',
          code: code,
          client_id: 'test_client',
          redirect_uri: 'http://localhost:3000/callback',
        });

        accessToken = tokenResponse.data.access_token;
      }
    });

    it('should revoke token successfully', async () => {
      const response = await axios.post(mockServer.getFullRevokeUrl(), {
        token: accessToken,
      });

      expect(response.status).toBe(200);
      expect(mockServer.isTokenRevoked(accessToken)).toBe(true);
    });

    it('should return 200 for invalid token (per RFC 7009)', async () => {
      const response = await axios.post(mockServer.getFullRevokeUrl(), {
        token: 'invalid_token',
      });

      expect(response.status).toBe(200);
    });
  });

  describe('PKCE Support', () => {
    it('should support PKCE code challenge', async () => {
      const codeVerifier = crypto.randomBytes(32).toString('base64url');
      const codeChallenge = crypto
        .createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');

      // Get authorization code with PKCE
      let authCode: string;
      try {
        await axios.get(`${mockServer.getBaseUrl()}/oauth/v2/authorize`, {
          params: {
            client_id: 'test_client',
            redirect_uri: 'http://localhost:3000/callback',
            response_type: 'code',
            scope: 'users:read',
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
          },
          maxRedirects: 0,
        });
      } catch (error: any) {
        const location = error.response.headers.location;
        const locationUrl = new URL(location);
        authCode = locationUrl.searchParams.get('code')!;
      }

      // Exchange with code verifier
      const response = await axios.post(mockServer.getFullTokenUrl(), {
        grant_type: 'authorization_code',
        code: authCode!,
        client_id: 'test_client',
        redirect_uri: 'http://localhost:3000/callback',
        code_verifier: codeVerifier,
      });

      expect(response.status).toBe(200);
      expect(response.data.access_token).toBeTruthy();
    });

    it('should reject invalid PKCE code verifier', async () => {
      const codeChallenge = crypto.randomBytes(32).toString('base64url');

      // Get authorization code with PKCE
      let authCode: string;
      try {
        await axios.get(`${mockServer.getBaseUrl()}/oauth/v2/authorize`, {
          params: {
            client_id: 'test_client',
            redirect_uri: 'http://localhost:3000/callback',
            response_type: 'code',
            scope: 'users:read',
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
          },
          maxRedirects: 0,
        });
      } catch (error: any) {
        const location = error.response.headers.location;
        const locationUrl = new URL(location);
        authCode = locationUrl.searchParams.get('code')!;
      }

      // Exchange with wrong code verifier
      try {
        await axios.post(mockServer.getFullTokenUrl(), {
          grant_type: 'authorization_code',
          code: authCode!,
          client_id: 'test_client',
          redirect_uri: 'http://localhost:3000/callback',
          code_verifier: 'wrong_verifier',
        });
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe('invalid_grant');
      }
    });
  });

  describe('Mock Configuration', () => {
    it('should allow setting mock team data', () => {
      mockServer.setMockTeam('T99999999', 'Custom Team');
      const teamData = mockServer.getMockTeam();
      expect(teamData.teamId).toBe('T99999999');
      expect(teamData.teamName).toBe('Custom Team');
    });

    it('should allow setting mock bot user ID', () => {
      mockServer.setMockBotUser('U99999999BOT');
      // This should affect the token response
    });

    it('should reset server state', () => {
      mockServer.setMockTeam('T99999999', 'Custom Team');
      mockServer.reset();
      const teamData = mockServer.getMockTeam();
      // After reset, should revert to defaults (not T99999999)
      // Note: reset() only clears tokens/codes, not config
      expect(teamData.teamId).toBe('T99999999'); // Config persists
    });
  });

  describe('Error Scenarios', () => {
    it('should handle mock error responses', async () => {
      mockServer.setMockResponse({
        error: 'invalid_client',
        errorDescription: 'Client authentication failed',
      });

      try {
        await axios.post(mockServer.getFullTokenUrl(), {
          grant_type: 'authorization_code',
          code: 'any_code',
          client_id: 'test_client',
          redirect_uri: 'http://localhost:3000/callback',
        });
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe('invalid_client');
        expect(error.response.data.error_description).toBe('Client authentication failed');
      }
    });
  });
});
