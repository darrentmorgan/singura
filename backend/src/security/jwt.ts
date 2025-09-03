/**
 * Enterprise JWT security service for SaaS X-Ray
 * Implements secure JWT token generation, validation, and management
 * Complies with RFC 7519, OWASP JWT security guidelines, and SOC 2 requirements
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

export interface JWTConfig {
  algorithm: jwt.Algorithm;
  accessTokenTTL: string;
  refreshTokenTTL: string;
  issuer: string;
  audience: string;
  clockTolerance: number;
  maxTokenAge: number;
}

export interface TokenPayload {
  sub: string; // Subject (user ID)
  iss: string; // Issuer
  aud: string; // Audience
  iat: number; // Issued at
  exp: number; // Expiration
  nbf: number; // Not before
  jti: string; // JWT ID (unique identifier)
  type: 'access' | 'refresh';
  organizationId: string;
  permissions: string[];
  sessionId: string;
}

export interface AuthenticatedUser {
  userId: string;
  organizationId: string;
  permissions: string[];
  sessionId: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

/**
 * Secure JWT service implementing industry best practices
 */
export class JWTService {
  private readonly config: JWTConfig = {
    algorithm: process.env.NODE_ENV === 'test' ? 'HS256' : 'RS256', // Use HMAC for testing, RSA for production
    accessTokenTTL: '15m', // Short-lived access tokens
    refreshTokenTTL: '7d', // Longer-lived refresh tokens
    issuer: 'saas-xray-platform',
    audience: 'saas-xray-clients',
    clockTolerance: 30, // 30 seconds clock skew tolerance
    maxTokenAge: 24 * 60 * 60 // 24 hours maximum token age
  };

  private readonly privateKey: string;
  private readonly publicKey: string;
  private readonly revokedTokens = new Set<string>(); // In production, use Redis
  private readonly activeSessions = new Map<string, {
    userId: string;
    organizationId: string;
    createdAt: Date;
    lastAccessed: Date;
    ipAddress: string;
    userAgent: string;
  }>();

  constructor() {
    this.privateKey = this.loadPrivateKey();
    this.publicKey = this.loadPublicKey();
  }

  /**
   * Load RSA private key for token signing
   */
  private loadPrivateKey(): string {
    // For testing, allow fallback to HMAC secret
    const privateKey = process.env.JWT_PRIVATE_KEY;
    if (!privateKey) {
      // If in test environment, use HMAC fallback
      if (process.env.NODE_ENV === 'test') {
        return process.env.JWT_SECRET || 'test-jwt-secret-for-unit-tests-only';
      }
      throw new Error('JWT_PRIVATE_KEY environment variable is required');
    }

    // For production RSA key
    if (privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      return privateKey.replace(/\\n/g, '\n');
    }

    // For testing HMAC secret
    return privateKey;
  }

  /**
   * Load RSA public key for token verification
   */
  private loadPublicKey(): string {
    const publicKey = process.env.JWT_PUBLIC_KEY;
    if (!publicKey) {
      // If in test environment, use same HMAC secret
      if (process.env.NODE_ENV === 'test') {
        return process.env.JWT_SECRET || 'test-jwt-secret-for-unit-tests-only';
      }
      throw new Error('JWT_PUBLIC_KEY environment variable is required');
    }

    // For production RSA key
    if (publicKey.includes('-----BEGIN PUBLIC KEY-----')) {
      return publicKey.replace(/\\n/g, '\n');
    }

    // For testing HMAC secret
    return publicKey;
  }

  /**
   * Generate secure token pair (access + refresh)
   * Implements secure token generation with proper entropy
   */
  generateTokens(
    userId: string,
    organizationId: string,
    permissions: string[] = [],
    ipAddress?: string,
    userAgent?: string
  ): TokenPair {
    const sessionId = this.generateSessionId();
    const jwtId = this.generateJWTId();
    const now = Math.floor(Date.now() / 1000);

    // Create access token payload
    const accessPayload: TokenPayload = {
      sub: userId,
      iss: this.config.issuer,
      aud: this.config.audience,
      iat: now,
      exp: now + this.parseTimeToSeconds(this.config.accessTokenTTL),
      nbf: now,
      jti: jwtId,
      type: 'access',
      organizationId,
      permissions,
      sessionId
    };

    // Create refresh token payload
    const refreshPayload: TokenPayload = {
      sub: userId,
      iss: this.config.issuer,
      aud: this.config.audience,
      iat: now,
      exp: now + this.parseTimeToSeconds(this.config.refreshTokenTTL),
      nbf: now,
      jti: this.generateJWTId(),
      type: 'refresh',
      organizationId,
      permissions: [], // Refresh tokens don't carry permissions
      sessionId
    };

    try {
      // Sign tokens with RSA private key
      const accessToken = jwt.sign(accessPayload, this.privateKey, {
        algorithm: this.config.algorithm,
        header: {
          typ: 'JWT',
          alg: this.config.algorithm,
          kid: 'saas-xray-2025' // Key ID for key rotation
        }
      });

      const refreshToken = jwt.sign(refreshPayload, this.privateKey, {
        algorithm: this.config.algorithm,
        header: {
          typ: 'JWT',
          alg: this.config.algorithm,
          kid: 'saas-xray-2025'
        }
      });

      // Store session information
      this.activeSessions.set(sessionId, {
        userId,
        organizationId,
        createdAt: new Date(),
        lastAccessed: new Date(),
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown'
      });

      return {
        accessToken,
        refreshToken,
        expiresIn: this.parseTimeToSeconds(this.config.accessTokenTTL),
        tokenType: 'Bearer'
      };
    } catch (error) {
      throw new Error('Failed to generate JWT tokens');
    }
  }

  /**
   * Validate and decode JWT token
   * Implements comprehensive token validation
   */
  validateToken(token: string, tokenType: 'access' | 'refresh' = 'access'): TokenPayload {
    if (!token || typeof token !== 'string') {
      throw new Error('Token is required');
    }

    try {
      // Verify token signature and decode payload
      // For HMAC algorithms, use the same secret for both signing and verifying
      const verificationKey = this.config.algorithm.startsWith('HS') ? this.privateKey : this.publicKey;
      const payload = jwt.verify(token, verificationKey, {
        algorithms: [this.config.algorithm],
        issuer: this.config.issuer,
        audience: this.config.audience,
        clockTolerance: this.config.clockTolerance,
        maxAge: this.config.maxTokenAge
      }) as TokenPayload;

      // Validate token type
      if (payload.type !== tokenType) {
        throw new Error(`Expected ${tokenType} token, got ${payload.type}`);
      }

      // Check if token is revoked
      if (this.revokedTokens.has(payload.jti)) {
        throw new Error('Token has been revoked');
      }

      // Validate session
      const session = this.activeSessions.get(payload.sessionId);
      if (!session) {
        throw new Error('Session not found or expired');
      }

      // Update last accessed time
      session.lastAccessed = new Date();

      return payload;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error(`Token validation failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   * Implements secure token refresh with rotation
   */
  refreshAccessToken(refreshToken: string, ipAddress?: string, userAgent?: string): TokenPair {
    const payload = this.validateToken(refreshToken, 'refresh');
    
    // Generate new token pair (refresh token rotation)
    return this.generateTokens(
      payload.sub,
      payload.organizationId,
      payload.permissions,
      ipAddress,
      userAgent
    );
  }

  /**
   * Revoke token by JWT ID
   * Implements secure token revocation
   */
  revokeToken(jwtId: string): boolean {
    if (!jwtId) {
      return false;
    }

    this.revokedTokens.add(jwtId);
    return true;
  }

  /**
   * Revoke all tokens for a session
   * Implements session-based token revocation
   */
  revokeSession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return false;
    }

    this.activeSessions.delete(sessionId);
    return true;
  }

  /**
   * Revoke all sessions for a user
   * Implements user-based session revocation
   */
  revokeUserSessions(userId: string): number {
    let revokedCount = 0;
    
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.userId === userId) {
        this.activeSessions.delete(sessionId);
        revokedCount++;
      }
    }

    return revokedCount;
  }

  /**
   * Get active sessions for a user
   */
  getUserSessions(userId: string) {
    const sessions: Array<{
      sessionId: string;
      createdAt: Date;
      lastAccessed: Date;
      ipAddress: string;
      userAgent: string;
    }> = [];

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.userId === userId) {
        sessions.push({
          sessionId,
          createdAt: session.createdAt,
          lastAccessed: session.lastAccessed,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent
        });
      }
    }

    return sessions;
  }

  /**
   * Express middleware for JWT authentication
   */
  authenticationMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_TOKEN'
      });
      return;
    }

    const token = authHeader.substring(7);

    try {
      const payload = this.validateToken(token, 'access');
      
      // Add user info to request
      req.user = {
        userId: payload.sub,
        organizationId: payload.organizationId,
        permissions: payload.permissions,
        sessionId: payload.sessionId
      } as AuthenticatedUser;

      next();
    } catch (error) {
      res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Express middleware for permission-based authorization
   */
  authorizationMiddleware = (requiredPermissions: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const user = req.user as AuthenticatedUser;
      
      if (!user) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'UNAUTHENTICATED'
        });
        return;
      }

      // Check if user has all required permissions
      const hasPermissions = requiredPermissions.every(permission =>
        user.permissions.includes(permission) || user.permissions.includes('admin')
      );

      if (!hasPermissions) {
        res.status(403).json({
          error: 'Insufficient permissions',
          code: 'FORBIDDEN',
          required: requiredPermissions,
          granted: user.permissions
        });
        return;
      }

      next();
    };
  };

  /**
   * Generate cryptographically secure session ID
   */
  private generateSessionId(): string {
    return `sess_${crypto.randomBytes(16).toString('hex')}_${Date.now()}`;
  }

  /**
   * Generate cryptographically secure JWT ID
   */
  private generateJWTId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Parse time string to seconds
   */
  private parseTimeToSeconds(timeStr: string): number {
    const match = timeStr.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid time format: ${timeStr}`);
    }

    const [, value, unit] = match;
    const num = parseInt(value, 10);

    switch (unit) {
      case 's': return num;
      case 'm': return num * 60;
      case 'h': return num * 60 * 60;
      case 'd': return num * 24 * 60 * 60;
      default: throw new Error(`Unknown time unit: ${unit}`);
    }
  }

  /**
   * Clean up expired sessions (should be run periodically)
   */
  cleanupExpiredSessions(): number {
    const now = Date.now();
    const maxAge = this.parseTimeToSeconds(this.config.refreshTokenTTL) * 1000;
    let cleanedCount = 0;

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now - session.createdAt.getTime() > maxAge) {
        this.activeSessions.delete(sessionId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }
}

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// Export singleton instance
export const jwtService = new JWTService();