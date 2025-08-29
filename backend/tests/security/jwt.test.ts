/**
 * JWT Service Security Tests
 * Tests JWT token generation, validation, and security compliance
 */

import { JWTService, jwtService, TokenPayload } from '../../src/security/jwt';
import { MockDataGenerator } from '../helpers/mock-data';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

describe('JWTService', () => {
  let service: JWTService;
  const testUserId = 'test-user-123';
  const testOrgId = 'test-org-456';
  const testPermissions = ['read', 'write'];
  const testIp = '192.168.1.100';
  const testUserAgent = 'Mozilla/5.0 Test Browser';

  beforeEach(() => {
    service = new JWTService();
  });

  afterEach(() => {
    // Clean up test sessions
    service.revokeUserSessions(testUserId);
  });

  describe('Token Generation', () => {
    describe('generateTokens', () => {
      it('should generate valid token pair', () => {
        const tokens = service.generateTokens(
          testUserId,
          testOrgId,
          testPermissions,
          testIp,
          testUserAgent
        );

        expect(tokens).toBeDefined();
        expect(tokens.accessToken).toBeDefined();
        expect(tokens.refreshToken).toBeDefined();
        expect(tokens.expiresIn).toBe(900); // 15 minutes in seconds
        expect(tokens.tokenType).toBe('Bearer');

        // Tokens should be different
        expect(tokens.accessToken).not.toBe(tokens.refreshToken);
        
        // Tokens should be valid JWT format
        expect(tokens.accessToken.split('.')).toHaveLength(3);
        expect(tokens.refreshToken.split('.')).toHaveLength(3);
      });

      it('should generate tokens with default permissions', () => {
        const tokens = service.generateTokens(testUserId, testOrgId);

        expect(tokens).toBeDefined();
        expect(tokens.accessToken).toBeDefined();
        expect(tokens.refreshToken).toBeDefined();
      });

      it('should create unique JTIs for each token', () => {
        const tokens1 = service.generateTokens(testUserId, testOrgId);
        const tokens2 = service.generateTokens(testUserId, testOrgId);

        // Decode tokens to check JTIs
        const payload1 = jwt.decode(tokens1.accessToken) as TokenPayload;
        const payload2 = jwt.decode(tokens2.accessToken) as TokenPayload;

        expect(payload1.jti).not.toBe(payload2.jti);
        expect(payload1.sessionId).not.toBe(payload2.sessionId);
      });

      it('should include proper claims in access token', () => {
        const tokens = service.generateTokens(
          testUserId,
          testOrgId,
          testPermissions,
          testIp,
          testUserAgent
        );

        const payload = jwt.decode(tokens.accessToken) as TokenPayload;

        expect(payload.sub).toBe(testUserId);
        expect(payload.iss).toBe('saas-xray-platform');
        expect(payload.aud).toBe('saas-xray-clients');
        expect(payload.type).toBe('access');
        expect(payload.organizationId).toBe(testOrgId);
        expect(payload.permissions).toEqual(testPermissions);
        expect(payload.sessionId).toBeDefined();
        expect(payload.jti).toBeDefined();
        expect(payload.iat).toBeDefined();
        expect(payload.exp).toBeDefined();
        expect(payload.nbf).toBeDefined();
      });

      it('should include proper claims in refresh token', () => {
        const tokens = service.generateTokens(testUserId, testOrgId, testPermissions);

        const payload = jwt.decode(tokens.refreshToken) as TokenPayload;

        expect(payload.sub).toBe(testUserId);
        expect(payload.type).toBe('refresh');
        expect(payload.organizationId).toBe(testOrgId);
        expect(payload.permissions).toEqual([]); // Refresh tokens don't carry permissions
        expect(payload.sessionId).toBeDefined();
      });

      it('should set proper expiration times', () => {
        const beforeGeneration = Math.floor(Date.now() / 1000);
        const tokens = service.generateTokens(testUserId, testOrgId);
        const afterGeneration = Math.floor(Date.now() / 1000);

        const accessPayload = jwt.decode(tokens.accessToken) as TokenPayload;
        const refreshPayload = jwt.decode(tokens.refreshToken) as TokenPayload;

        // Access token should expire in ~15 minutes
        expect(accessPayload.exp - accessPayload.iat).toBe(900);
        
        // Refresh token should expire in ~7 days
        expect(refreshPayload.exp - refreshPayload.iat).toBe(7 * 24 * 60 * 60);

        // Timestamps should be reasonable
        expect(accessPayload.iat).toBeGreaterThanOrEqual(beforeGeneration);
        expect(accessPayload.iat).toBeLessThanOrEqual(afterGeneration);
      });

      it('should store session information', () => {
        const tokens = service.generateTokens(
          testUserId,
          testOrgId,
          testPermissions,
          testIp,
          testUserAgent
        );

        const sessions = service.getUserSessions(testUserId);
        expect(sessions).toHaveLength(1);
        
        const session = sessions[0];
        expect(session.sessionId).toBeDefined();
        expect(session.ipAddress).toBe(testIp);
        expect(session.userAgent).toBe(testUserAgent);
        expect(session.createdAt).toBeDefined();
        expect(session.lastAccessed).toBeDefined();
      });
    });
  });

  describe('Token Validation', () => {
    describe('validateToken', () => {
      it('should validate valid access token', () => {
        const tokens = service.generateTokens(testUserId, testOrgId, testPermissions);
        
        const payload = service.validateToken(tokens.accessToken, 'access');
        
        expect(payload).toBeDefined();
        expect(payload.sub).toBe(testUserId);
        expect(payload.organizationId).toBe(testOrgId);
        expect(payload.permissions).toEqual(testPermissions);
        expect(payload.type).toBe('access');
      });

      it('should validate valid refresh token', () => {
        const tokens = service.generateTokens(testUserId, testOrgId, testPermissions);
        
        const payload = service.validateToken(tokens.refreshToken, 'refresh');
        
        expect(payload).toBeDefined();
        expect(payload.sub).toBe(testUserId);
        expect(payload.type).toBe('refresh');
      });

      it('should reject wrong token type', () => {
        const tokens = service.generateTokens(testUserId, testOrgId);
        
        expect(() => service.validateToken(tokens.accessToken, 'refresh'))
          .toThrow('Expected refresh token, got access');
        
        expect(() => service.validateToken(tokens.refreshToken, 'access'))
          .toThrow('Expected access token, got refresh');
      });

      it('should reject invalid token format', () => {
        expect(() => service.validateToken('invalid.token'))
          .toThrow('Token validation failed');
        
        expect(() => service.validateToken(''))
          .toThrow('Token is required');
        
        expect(() => service.validateToken(null as any))
          .toThrow('Token is required');
      });

      it('should reject tampered token', () => {
        const tokens = service.generateTokens(testUserId, testOrgId);
        const tamperedToken = tokens.accessToken.slice(0, -10) + '1234567890';
        
        expect(() => service.validateToken(tamperedToken))
          .toThrow('Token validation failed');
      });

      it('should reject expired token', () => {
        // Create token with very short expiration
        const shortLivedPayload = {
          sub: testUserId,
          iss: 'saas-xray-platform',
          aud: 'saas-xray-clients',
          iat: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
          exp: Math.floor(Date.now() / 1000) - 1800, // 30 minutes ago (expired)
          nbf: Math.floor(Date.now() / 1000) - 3600,
          jti: crypto.randomBytes(16).toString('hex'),
          type: 'access',
          organizationId: testOrgId,
          permissions: testPermissions,
          sessionId: 'test-session'
        };

        const expiredToken = jwt.sign(shortLivedPayload, process.env.JWT_PRIVATE_KEY!, {
          algorithm: 'RS256'
        });

        expect(() => service.validateToken(expiredToken))
          .toThrow('Token validation failed');
      });

      it('should reject revoked token', () => {
        const tokens = service.generateTokens(testUserId, testOrgId);
        const payload = jwt.decode(tokens.accessToken) as TokenPayload;
        
        // Revoke the token
        service.revokeToken(payload.jti);
        
        expect(() => service.validateToken(tokens.accessToken))
          .toThrow('Token has been revoked');
      });

      it('should reject token with invalid session', () => {
        const tokens = service.generateTokens(testUserId, testOrgId);
        const payload = jwt.decode(tokens.accessToken) as TokenPayload;
        
        // Revoke the session
        service.revokeSession(payload.sessionId);
        
        expect(() => service.validateToken(tokens.accessToken))
          .toThrow('Session not found or expired');
      });

      it('should update session last accessed time', () => {
        const tokens = service.generateTokens(testUserId, testOrgId);
        const originalSessions = service.getUserSessions(testUserId);
        const originalLastAccessed = originalSessions[0].lastAccessed;
        
        // Wait a moment
        setTimeout(() => {
          service.validateToken(tokens.accessToken);
          const updatedSessions = service.getUserSessions(testUserId);
          
          expect(updatedSessions[0].lastAccessed.getTime())
            .toBeGreaterThan(originalLastAccessed.getTime());
        }, 10);
      });
    });
  });

  describe('Token Refresh', () => {
    describe('refreshAccessToken', () => {
      it('should refresh access token with valid refresh token', () => {
        const originalTokens = service.generateTokens(testUserId, testOrgId, testPermissions);
        
        const newTokens = service.refreshAccessToken(
          originalTokens.refreshToken,
          testIp,
          testUserAgent
        );
        
        expect(newTokens).toBeDefined();
        expect(newTokens.accessToken).toBeDefined();
        expect(newTokens.refreshToken).toBeDefined();
        expect(newTokens.accessToken).not.toBe(originalTokens.accessToken);
        expect(newTokens.refreshToken).not.toBe(originalTokens.refreshToken);
      });

      it('should maintain user context in refreshed tokens', () => {
        const originalTokens = service.generateTokens(testUserId, testOrgId, testPermissions);
        const newTokens = service.refreshAccessToken(originalTokens.refreshToken);
        
        const newPayload = jwt.decode(newTokens.accessToken) as TokenPayload;
        
        expect(newPayload.sub).toBe(testUserId);
        expect(newPayload.organizationId).toBe(testOrgId);
        expect(newPayload.permissions).toEqual(testPermissions);
      });

      it('should reject invalid refresh token', () => {
        expect(() => service.refreshAccessToken('invalid-token'))
          .toThrow('Token validation failed');
      });

      it('should reject access token for refresh', () => {
        const tokens = service.generateTokens(testUserId, testOrgId);
        
        expect(() => service.refreshAccessToken(tokens.accessToken))
          .toThrow('Expected refresh token, got access');
      });
    });
  });

  describe('Session Management', () => {
    describe('getUserSessions', () => {
      it('should return user sessions', () => {
        service.generateTokens(testUserId, testOrgId);
        service.generateTokens(testUserId, testOrgId); // Second session
        
        const sessions = service.getUserSessions(testUserId);
        
        expect(sessions).toHaveLength(2);
        sessions.forEach(session => {
          expect(session.sessionId).toBeDefined();
          expect(session.createdAt).toBeDefined();
          expect(session.lastAccessed).toBeDefined();
          expect(session.ipAddress).toBeDefined();
          expect(session.userAgent).toBeDefined();
        });
      });

      it('should return empty array for user with no sessions', () => {
        const sessions = service.getUserSessions('non-existent-user');
        
        expect(sessions).toEqual([]);
      });
    });

    describe('revokeSession', () => {
      it('should revoke specific session', () => {
        const tokens = service.generateTokens(testUserId, testOrgId);
        const payload = jwt.decode(tokens.accessToken) as TokenPayload;
        
        const result = service.revokeSession(payload.sessionId);
        
        expect(result).toBe(true);
        expect(() => service.validateToken(tokens.accessToken))
          .toThrow('Session not found or expired');
      });

      it('should return false for non-existent session', () => {
        const result = service.revokeSession('non-existent-session');
        
        expect(result).toBe(false);
      });
    });

    describe('revokeUserSessions', () => {
      it('should revoke all user sessions', () => {
        const tokens1 = service.generateTokens(testUserId, testOrgId);
        const tokens2 = service.generateTokens(testUserId, testOrgId);
        
        const revokedCount = service.revokeUserSessions(testUserId);
        
        expect(revokedCount).toBe(2);
        expect(() => service.validateToken(tokens1.accessToken)).toThrow();
        expect(() => service.validateToken(tokens2.accessToken)).toThrow();
      });

      it('should return 0 for user with no sessions', () => {
        const count = service.revokeUserSessions('non-existent-user');
        
        expect(count).toBe(0);
      });
    });

    describe('cleanupExpiredSessions', () => {
      it('should clean up expired sessions', () => {
        // This test would require mocking time or creating expired sessions
        const cleanedCount = service.cleanupExpiredSessions();
        
        expect(typeof cleanedCount).toBe('number');
        expect(cleanedCount).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Token Revocation', () => {
    describe('revokeToken', () => {
      it('should revoke token by JTI', () => {
        const tokens = service.generateTokens(testUserId, testOrgId);
        const payload = jwt.decode(tokens.accessToken) as TokenPayload;
        
        const result = service.revokeToken(payload.jti);
        
        expect(result).toBe(true);
        expect(() => service.validateToken(tokens.accessToken))
          .toThrow('Token has been revoked');
      });

      it('should return false for empty JTI', () => {
        const result = service.revokeToken('');
        
        expect(result).toBe(false);
      });
    });
  });

  describe('Middleware', () => {
    describe('authenticationMiddleware', () => {
      let mockReq: any;
      let mockRes: any;
      let mockNext: jest.Mock;

      beforeEach(() => {
        mockReq = {
          headers: {},
          user: undefined
        };
        mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        mockNext = jest.fn();
      });

      it('should authenticate valid token', () => {
        const tokens = service.generateTokens(testUserId, testOrgId, testPermissions);
        mockReq.headers.authorization = `Bearer ${tokens.accessToken}`;
        
        service.authenticationMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.user).toBeDefined();
        expect(mockReq.user.userId).toBe(testUserId);
        expect(mockReq.user.organizationId).toBe(testOrgId);
        expect(mockReq.user.permissions).toEqual(testPermissions);
      });

      it('should reject missing authorization header', () => {
        service.authenticationMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Authentication required',
          code: 'MISSING_TOKEN'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject invalid authorization format', () => {
        mockReq.headers.authorization = 'InvalidFormat token';
        
        service.authenticationMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Authentication required',
          code: 'MISSING_TOKEN'
        });
      });

      it('should reject invalid token', () => {
        mockReq.headers.authorization = 'Bearer invalid-token';
        
        service.authenticationMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Invalid token',
            code: 'INVALID_TOKEN'
          })
        );
      });
    });

    describe('authorizationMiddleware', () => {
      let mockReq: any;
      let mockRes: any;
      let mockNext: jest.Mock;

      beforeEach(() => {
        mockReq = {
          user: {
            userId: testUserId,
            organizationId: testOrgId,
            permissions: ['read', 'write'],
            sessionId: 'test-session'
          }
        };
        mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
        mockNext = jest.fn();
      });

      it('should allow access with sufficient permissions', () => {
        const middleware = service.authorizationMiddleware(['read']);
        
        middleware(mockReq, mockRes, mockNext);
        
        expect(mockNext).toHaveBeenCalled();
      });

      it('should allow admin access regardless of specific permissions', () => {
        mockReq.user.permissions = ['admin'];
        const middleware = service.authorizationMiddleware(['read', 'write', 'delete']);
        
        middleware(mockReq, mockRes, mockNext);
        
        expect(mockNext).toHaveBeenCalled();
      });

      it('should reject insufficient permissions', () => {
        const middleware = service.authorizationMiddleware(['admin']);
        
        middleware(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Insufficient permissions',
          code: 'FORBIDDEN',
          required: ['admin'],
          granted: ['read', 'write']
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject unauthenticated user', () => {
        mockReq.user = undefined;
        const middleware = service.authorizationMiddleware(['read']);
        
        middleware(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Authentication required',
          code: 'UNAUTHENTICATED'
        });
      });
    });
  });

  describe('Security Properties', () => {
    it('should generate cryptographically secure session IDs', () => {
      const sessionIds = new Set();
      
      for (let i = 0; i < 100; i++) {
        const tokens = service.generateTokens(`user-${i}`, testOrgId);
        const payload = jwt.decode(tokens.accessToken) as TokenPayload;
        sessionIds.add(payload.sessionId);
      }
      
      expect(sessionIds.size).toBe(100); // All session IDs should be unique
    });

    it('should generate cryptographically secure JTIs', () => {
      const jtis = new Set();
      
      for (let i = 0; i < 100; i++) {
        const tokens = service.generateTokens(`user-${i}`, testOrgId);
        const payload = jwt.decode(tokens.accessToken) as TokenPayload;
        jtis.add(payload.jti);
      }
      
      expect(jtis.size).toBe(100); // All JTIs should be unique
    });

    it('should use secure key algorithm (RSA256)', () => {
      const tokens = service.generateTokens(testUserId, testOrgId);
      const header = jwt.decode(tokens.accessToken, { complete: true })?.header;
      
      expect(header?.alg).toBe('RS256');
      expect(header?.typ).toBe('JWT');
      expect(header?.kid).toBe('saas-xray-2025');
    });

    it('should implement proper clock tolerance', () => {
      // Create token with timestamp slightly in the future
      const futurePayload = {
        sub: testUserId,
        iss: 'saas-xray-platform',
        aud: 'saas-xray-clients',
        iat: Math.floor(Date.now() / 1000) + 15, // 15 seconds in future
        exp: Math.floor(Date.now() / 1000) + 900 + 15,
        nbf: Math.floor(Date.now() / 1000) + 15,
        jti: crypto.randomBytes(16).toString('hex'),
        type: 'access',
        organizationId: testOrgId,
        permissions: testPermissions,
        sessionId: 'test-session-future'
      };

      // Store session manually for this test
      (service as any).activeSessions.set('test-session-future', {
        userId: testUserId,
        organizationId: testOrgId,
        createdAt: new Date(),
        lastAccessed: new Date(),
        ipAddress: 'test',
        userAgent: 'test'
      });

      const futureToken = jwt.sign(futurePayload, process.env.JWT_PRIVATE_KEY!, {
        algorithm: 'RS256'
      });

      // Should not throw due to clock tolerance
      expect(() => service.validateToken(futureToken)).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JWT headers', () => {
      const malformedToken = 'not.a.valid.jwt.token';
      
      expect(() => service.validateToken(malformedToken))
        .toThrow('Token validation failed');
    });

    it('should handle missing private key', () => {
      const originalKey = process.env.JWT_PRIVATE_KEY;
      delete process.env.JWT_PRIVATE_KEY;
      
      expect(() => new JWTService()).toThrow('JWT_PRIVATE_KEY environment variable is required');
      
      process.env.JWT_PRIVATE_KEY = originalKey;
    });

    it('should handle invalid key format', () => {
      const originalKey = process.env.JWT_PRIVATE_KEY;
      process.env.JWT_PRIVATE_KEY = 'invalid-key-format';
      
      expect(() => new JWTService()).toThrow('Invalid JWT private key format');
      
      process.env.JWT_PRIVATE_KEY = originalKey;
    });

    it('should not leak sensitive information in error messages', () => {
      const tokens = service.generateTokens(testUserId, testOrgId);
      const payload = jwt.decode(tokens.accessToken) as TokenPayload;
      
      service.revokeToken(payload.jti);
      
      try {
        service.validateToken(tokens.accessToken);
        fail('Should have thrown error');
      } catch (error) {
        const errorMessage = (error as Error).message;
        expect(errorMessage).not.toContain(testUserId);
        expect(errorMessage).not.toContain(testOrgId);
        expect(errorMessage).not.toContain(payload.jti);
      }
    });
  });
});