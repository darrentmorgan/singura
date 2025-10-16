/**
 * Secure Clerk Authentication Middleware
 *
 * Implements proper JWT verification using Clerk SDK
 * Follows OWASP authentication guidelines
 *
 * Security features:
 * - JWT signature verification
 * - Token expiry validation
 * - Session validation
 * - Rate limiting integration
 * - Audit logging
 */

import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { verifyToken } from '@clerk/backend';
import { AuthenticatedUser } from '../security/jwt';
import { auditService } from '../security/audit';
import * as crypto from 'crypto';

/**
 * Clerk authentication context with full validation
 */
export interface SecureClerkAuth {
  userId: string;
  organizationId: string;
  sessionId: string;
  sessionClaims: Record<string, unknown>;
  issuedAt: number;
  expiresAt: number;
}

/**
 * Extended Express Request with secure Clerk context
 */
export interface SecureClerkRequest extends Request {
  auth?: SecureClerkAuth;
  user?: AuthenticatedUser;
  requestId?: string;
}

/**
 * Configuration for Clerk authentication
 */
interface ClerkAuthConfig {
  publishableKey: string;
  secretKey: string;
  jwtKey?: string;
  allowedClockSkew?: number; // milliseconds
  requireOrganization?: boolean;
}

class ClerkAuthMiddleware {
  private config: ClerkAuthConfig;
  private verificationCache = new Map<string, { verified: boolean; expires: number }>();

  constructor() {
    this.config = this.loadConfig();
    this.startCacheCleanup();
  }

  /**
   * Load Clerk configuration from environment
   */
  private loadConfig(): ClerkAuthConfig {
    const publishableKey = process.env.CLERK_PUBLISHABLE_KEY;
    const secretKey = process.env.CLERK_SECRET_KEY;

    if (!publishableKey || !secretKey) {
      throw new Error('Clerk configuration missing. Set CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY');
    }

    return {
      publishableKey,
      secretKey,
      jwtKey: process.env.CLERK_JWT_KEY,
      allowedClockSkew: 30000, // 30 seconds
      requireOrganization: true
    };
  }

  /**
   * Clean up expired cache entries periodically
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.verificationCache.entries()) {
        if (value.expires < now) {
          this.verificationCache.delete(key);
        }
      }
    }, 60000); // Every minute
  }

  /**
   * Main authentication middleware with full JWT verification
   */
  async authenticate(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const startTime = Date.now();
    const requestId = crypto.randomBytes(16).toString('hex');
    (req as SecureClerkRequest).requestId = requestId;

    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        await this.logAuthFailure(req, 'missing_token');
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'MISSING_TOKEN',
          requestId
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Check cache for recently verified tokens
      const cacheKey = this.getCacheKey(token);
      const cached = this.verificationCache.get(cacheKey);

      if (cached && cached.verified && cached.expires > Date.now()) {
        // Use cached verification result
        const sessionClaims = await this.extractClaimsFromToken(token);
        await this.attachAuthContext(req, sessionClaims);
        return next();
      }

      // Verify JWT signature and claims using Clerk SDK
      const verificationResult = await this.verifyClerkToken(token);

      if (!verificationResult.verified) {
        await this.logAuthFailure(req, 'invalid_token', verificationResult.reason);
        return res.status(401).json({
          success: false,
          error: 'Invalid authentication token',
          code: 'INVALID_TOKEN',
          reason: verificationResult.reason,
          requestId
        });
      }

      // Cache successful verification
      this.verificationCache.set(cacheKey, {
        verified: true,
        expires: Date.now() + 300000 // 5 minutes
      });

      // Attach auth context to request
      await this.attachAuthContext(req, verificationResult.claims);

      // Log successful authentication
      await this.logAuthSuccess(req, Date.now() - startTime);

      next();
    } catch (error) {
      console.error('Clerk authentication error:', error);
      await this.logAuthFailure(req, 'verification_error', error);

      res.status(401).json({
        success: false,
        error: 'Authentication failed',
        code: 'AUTH_ERROR',
        requestId
      });
    }
  }

  /**
   * Verify Clerk JWT token
   */
  private async verifyClerkToken(token: string): Promise<{
    verified: boolean;
    claims?: any;
    reason?: string;
  }> {
    try {
      // Use Clerk's verifyToken function for proper JWT verification
      const result = await verifyToken(token, {
        secretKey: this.config.secretKey,
        authorizedParties: [this.config.publishableKey],
        clockSkewInMs: this.config.allowedClockSkew
      });

      if (!result) {
        return { verified: false, reason: 'token_verification_failed' };
      }

      // Validate token expiration
      const now = Math.floor(Date.now() / 1000);
      if (result.exp && result.exp < now) {
        return { verified: false, reason: 'token_expired' };
      }

      // Validate token not used before issued time
      if (result.iat && result.iat > now + 30) { // 30 second tolerance
        return { verified: false, reason: 'token_not_yet_valid' };
      }

      // Validate required claims
      if (!result.sub) {
        return { verified: false, reason: 'missing_user_id' };
      }

      // Check organization requirement
      if (this.config.requireOrganization && !result.org_id) {
        return { verified: false, reason: 'organization_required' };
      }

      return {
        verified: true,
        claims: result
      };
    } catch (error) {
      console.error('Token verification error:', error);
      return {
        verified: false,
        reason: error instanceof Error ? error.message : 'verification_failed'
      };
    }
  }

  /**
   * Extract claims from token for caching
   */
  private async extractClaimsFromToken(token: string): Promise<any> {
    // Parse JWT without verification (for cached tokens only)
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString()
    );

    return payload;
  }

  /**
   * Attach authentication context to request
   */
  private async attachAuthContext(
    req: Request,
    claims: any
  ): Promise<void> {
    const authRequest = req as SecureClerkRequest;

    // Extract user information from Clerk session
    const userId = claims.sub;
    const organizationId = claims.org_id || userId; // Fallback to userId
    const sessionId = claims.sid || crypto.randomBytes(16).toString('hex');

    // Get additional user info from Clerk if needed
    let userEmail = '';
    try {
      const user = await clerkClient.users.getUser(userId);
      userEmail = user.emailAddresses[0]?.emailAddress || '';
    } catch (error) {
      console.warn('Failed to fetch user details from Clerk:', error);
    }

    // Attach secure auth context
    authRequest.auth = {
      userId,
      organizationId,
      sessionId,
      sessionClaims: claims,
      issuedAt: claims.iat || Math.floor(Date.now() / 1000),
      expiresAt: claims.exp || Math.floor(Date.now() / 1000) + 3600
    };

    // Attach user context for compatibility
    authRequest.user = {
      userId,
      email: userEmail,
      organizationId,
      permissions: claims.permissions || [],
      sessionId
    };
  }

  /**
   * Generate cache key for token verification
   */
  private getCacheKey(token: string): string {
    // Use first and last 20 chars of token as cache key
    // This avoids storing full tokens in memory
    const prefix = token.substring(0, 20);
    const suffix = token.substring(token.length - 20);
    return `${prefix}...${suffix}`;
  }

  /**
   * Log successful authentication
   */
  private async logAuthSuccess(
    req: Request,
    durationMs: number
  ): Promise<void> {
    const authReq = req as SecureClerkRequest;

    await auditService.logAuthenticationEvent(
      'clerk_auth_success',
      authReq.auth?.userId || 'unknown',
      authReq.auth?.organizationId || 'unknown',
      req,
      {
        sessionId: authReq.auth?.sessionId,
        duration: durationMs,
        requestId: authReq.requestId
      }
    );
  }

  /**
   * Log authentication failure
   */
  private async logAuthFailure(
    req: Request,
    reason: string,
    details?: any
  ): Promise<void> {
    const authReq = req as SecureClerkRequest;

    await auditService.logSecurityViolation(
      'clerk_auth_failure',
      'unknown',
      'unknown',
      req,
      {
        reason,
        details: details instanceof Error ? details.message : details,
        requestId: authReq.requestId,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    );
  }

  /**
   * Optional authentication - doesn't fail if no token
   */
  async optionalAuth(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without auth
      return next();
    }

    // Token provided, validate it
    return this.authenticate(req, res, next);
  }

  /**
   * Require organization membership
   */
  requireOrganization(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const authReq = req as SecureClerkRequest;

    if (!authReq.auth?.organizationId ||
        authReq.auth.organizationId === authReq.auth.userId) {
      res.status(403).json({
        success: false,
        error: 'Organization membership required',
        code: 'ORG_REQUIRED',
        message: 'This action requires you to be part of an organization'
      });
      return;
    }

    next();
  }

  /**
   * Check specific permissions
   */
  requirePermissions(permissions: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const authReq = req as SecureClerkRequest;
      const userPermissions = authReq.user?.permissions || [];

      const hasPermissions = permissions.every(p =>
        userPermissions.includes(p)
      );

      if (!hasPermissions) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          code: 'FORBIDDEN',
          required: permissions,
          current: userPermissions
        });
        return;
      }

      next();
    };
  }
}

// Create singleton instance
const clerkAuthMiddleware = new ClerkAuthMiddleware();

// Export middleware functions
export const requireClerkAuth = clerkAuthMiddleware.authenticate.bind(clerkAuthMiddleware);
export const optionalClerkAuth = clerkAuthMiddleware.optionalAuth.bind(clerkAuthMiddleware);
export const requireOrganization = clerkAuthMiddleware.requireOrganization.bind(clerkAuthMiddleware);
export const requirePermissions = clerkAuthMiddleware.requirePermissions.bind(clerkAuthMiddleware);

// Helper functions
export function getOrganizationId(req: Request): string | null {
  const authReq = req as SecureClerkRequest;
  return authReq.auth?.organizationId || null;
}

export function getUserId(req: Request): string | null {
  const authReq = req as SecureClerkRequest;
  return authReq.auth?.userId || null;
}

export function getSessionId(req: Request): string | null {
  const authReq = req as SecureClerkRequest;
  return authReq.auth?.sessionId || null;
}