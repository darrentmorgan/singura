/**
 * Unit tests for MicrosoftMockOAuthServer
 */

import { MicrosoftMockOAuthServer } from '../microsoft-mock-server';
import axios from 'axios';
import * as crypto from 'crypto';

describe('MicrosoftMockOAuthServer', () => {
  let mockServer: MicrosoftMockOAuthServer;
  const testPort = 4003;

  beforeAll(async () => {
    mockServer = new MicrosoftMockOAuthServer({ port: testPort });
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
        scope: ['openid', 'profile', 'email', 'offline_access'],
        state: 'random_state_string',
        response_mode: 'query',
        prompt: 'consent',
      });

      const url = new URL(authUrl);
      expect(url.searchParams.get('client_id')).toBe('test_client_id');
      expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:3000/callback');
      expect(url.searchParams.get('scope')).toBe('openid profile email offline_access');
      expect(url.searchParams.get('state')).toBe('random_state_string');
      expect(url.searchParams.get('response_mode')).toBe('query');
      expect(url.searchParams.get('prompt')).toBe('consent');
      expect(url.searchParams.get('response_type')).toBe('code');
    });

    it('should redirect with authorization code on valid request', async () => {
      const redirectUri = 'http://localhost:3000/callback';
      const state = 'test_state';

      try {
        await axios.get(`${mockServer.getBaseUrl()}/oauth2/v2.0/authorize`, {
          params: {
            client_id: 'test_client',
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: 'openid User.Read',
            state: state,
          },
          maxRedirects: 0,
        });
      } catch (error: any) {
        expect(error.response.status).toBe(302);
        const location = error.response.headers.location;
        const locationUrl = new URL(location);
        expect(locationUrl.searchParams.get('code')).toBeTruthy();
        expect(locationUrl.searchParams.get('state')).toBe(state);
      }
    });

    it('should reject invalid scopes', async () => {
      try {
        await axios.get(`${mockServer.getBaseUrl()}/oauth2/v2.0/authorize`, {
          params: {
            client_id: 'test_client',
            redirect_uri: 'http://localhost:3000/callback',
            response_type: 'code',
            scope: 'invalid.scope',
          },
        });
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe('invalid_scope');
      }
    });
  });

  describe('Token Exchange', () => {
    let authCode: string;

    beforeEach(async () => {
      try {
        await axios.get(`${mockServer.getBaseUrl()}/oauth2/v2.0/authorize`, {
          params: {
            client_id: 'test_client',
            redirect_uri: 'http://localhost:3000/callback',
            response_type: 'code',
            scope: 'openid User.Read offline_access',
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
        access_token: expect.stringContaining('mock_access_'),
        refresh_token: expect.stringContaining('mock_refresh_'),
        token_type: 'Bearer',
        scope: 'openid User.Read offline_access',
        expires_in: expect.any(Number),
        ext_expires_in: expect.any(Number),
        id_token: expect.any(String), // Should have ID token with openid scope
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
  });

  describe('Token Refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      try {
        await axios.get(`${mockServer.getBaseUrl()}/oauth2/v2.0/authorize`, {
          params: {
            client_id: 'test_client',
            redirect_uri: 'http://localhost:3000/callback',
            response_type: 'code',
            scope: 'User.Read offline_access',
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
        access_token: expect.stringContaining('mock_access_'),
        token_type: 'Bearer',
      });

      // New tokens should be different
      expect(response.data.access_token).not.toBe(refreshToken);
    });
  });

  describe('Microsoft Graph /me Endpoint', () => {
    let accessToken: string;

    beforeEach(async () => {
      try {
        await axios.get(`${mockServer.getBaseUrl()}/oauth2/v2.0/authorize`, {
          params: {
            client_id: 'test_client',
            redirect_uri: 'http://localhost:3000/callback',
            response_type: 'code',
            scope: 'User.Read',
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

    it('should return user info with valid token', async () => {
      const response = await axios.get(mockServer.getFullMeUrl(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        '@odata.context': expect.stringContaining('$metadata#users/$entity'),
        id: expect.any(String),
        userPrincipalName: expect.stringContaining('@'),
        displayName: expect.any(String),
        mail: expect.any(String),
        jobTitle: expect.any(String),
      });
    });

    it('should reject invalid token', async () => {
      try {
        await axios.get(mockServer.getFullMeUrl(), {
          headers: {
            Authorization: 'Bearer invalid_token',
          },
        });
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error.code).toBe('InvalidAuthenticationToken');
      }
    });

    it('should reject missing authorization header', async () => {
      try {
        await axios.get(mockServer.getFullMeUrl());
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('OpenID Connect Discovery', () => {
    it('should return OIDC discovery document', async () => {
      const response = await axios.get(`${mockServer.getBaseUrl()}/.well-known/openid-configuration`);

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        issuer: expect.stringContaining('login.microsoftonline.com'),
        authorization_endpoint: expect.stringContaining('/oauth2/v2.0/authorize'),
        token_endpoint: expect.stringContaining('/oauth2/v2.0/token'),
        jwks_uri: expect.any(String),
        response_types_supported: expect.arrayContaining(['code']),
        scopes_supported: expect.arrayContaining(['openid', 'profile', 'email']),
        id_token_signing_alg_values_supported: expect.arrayContaining(['RS256']),
      });
    });
  });

  describe('Mock Configuration', () => {
    it('should allow setting mock tenant data', () => {
      mockServer.setMockTenant('12345678-1234-1234-1234-123456789012', 'Custom Org');
      const tenantData = mockServer.getMockTenant();
      expect(tenantData.tenantId).toBe('12345678-1234-1234-1234-123456789012');
      expect(tenantData.tenantName).toBe('Custom Org');
    });

    it('should allow setting mock user data', () => {
      mockServer.setMockUser(
        '99999999-9999-9999-9999-999999999999',
        'custom@testorg.onmicrosoft.com',
        'Custom User'
      );
      const userData = mockServer.getMockUser();
      expect(userData.userId).toBe('99999999-9999-9999-9999-999999999999');
      expect(userData.userPrincipalName).toBe('custom@testorg.onmicrosoft.com');
      expect(userData.displayName).toBe('Custom User');
    });
  });

  describe('PKCE Support', () => {
    it('should support PKCE code challenge', async () => {
      const codeVerifier = crypto.randomBytes(32).toString('base64url');
      const codeChallenge = crypto
        .createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');

      let authCode: string;
      try {
        await axios.get(`${mockServer.getBaseUrl()}/oauth2/v2.0/authorize`, {
          params: {
            client_id: 'test_client',
            redirect_uri: 'http://localhost:3000/callback',
            response_type: 'code',
            scope: 'User.Read',
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
  });
});
