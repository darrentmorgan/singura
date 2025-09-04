/**
 * Authentication API routes with enterprise security controls
 * Implements secure JWT authentication, OAuth flows, and security monitoring
 */

import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { jwtService } from '../security/jwt';
import { securityMiddleware } from '../security/middleware';
import { auditService } from '../security/audit';
import { oauthService } from '../services/oauth-service';
import { PlatformType } from '../types/database';
import { Platform } from '@saas-xray/shared-types';

const router = Router();

// Apply security middleware to all auth routes
router.use(securityMiddleware.authRateLimitingMiddleware());
router.use(securityMiddleware.requestLoggingMiddleware());
router.use(securityMiddleware.inputValidationMiddleware());

/**
 * POST /auth/login
 * User authentication with JWT token generation
 */
router.post('/login',
  securityMiddleware.validateFields([
    securityMiddleware.validationRules.email,
    securityMiddleware.validationRules.password
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;
      
      // TODO: Implement user authentication logic
      // For now, this is a placeholder that shows the security structure
      
      // Mock user validation (replace with actual authentication)
      if (email === 'admin@example.com' && password === 'SecurePass123!') {
        const userId = 'mock-user-id';
        const organizationId = 'mock-org-id';
        const permissions = ['read', 'write', 'admin'];

        // Generate JWT tokens
        const tokens = jwtService.generateTokens(
          userId,
          organizationId,
          permissions,
          req.ip,
          req.get('User-Agent')
        );

        // Log successful authentication
        await auditService.logAuthenticationEvent(
          'login_success',
          userId,
          organizationId,
          req,
          { email }
        );

        res.json({
          success: true,
          tokens,
          user: {
            id: userId,
            organizationId,
            permissions
          }
        });
      } else {
        // Log failed authentication
        await auditService.logAuthenticationEvent(
          'login_failure',
          'unknown',
          'unknown',
          req,
          { 
            email,
            reason: 'invalid_credentials'
          }
        );

        res.status(401).json({
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        });
      }
    } catch (error) {
      await auditService.logSecurityViolation(
        'authentication_error',
        'unknown',
        'unknown',
        req,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );

      res.status(500).json({
        error: 'Authentication failed',
        code: 'AUTH_ERROR'
      });
    }
  }
);

/**
 * POST /auth/refresh
 * Refresh JWT access token using refresh token
 */
router.post('/refresh',
  securityMiddleware.validateFields([
    // Validate refresh token format
    body('refreshToken')
      .isUUID()
      .withMessage('Valid refresh token required')
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          error: 'Refresh token required',
          code: 'REFRESH_TOKEN_MISSING'
        });
        return;
      }

      // Refresh the access token
      const newTokens = jwtService.refreshAccessToken(
        refreshToken,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        tokens: newTokens
      });
      return;
    } catch (error) {
      await auditService.logAuthenticationEvent(
        'token_refresh',
        'unknown',
        'unknown',
        req,
        { 
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        }
      );

      res.status(401).json({
        error: 'Token refresh failed',
        code: 'REFRESH_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      return;
    }
  }
);

/**
 * POST /auth/logout
 * Logout user and revoke tokens
 */
router.post('/logout',
  securityMiddleware.requireAuthentication(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { sessionId } = req.body;

      // Revoke the session
      if (sessionId) {
        jwtService.revokeSession(sessionId);
      } else {
        // Revoke all sessions for user
        jwtService.revokeUserSessions(user.userId);
      }

      // Log logout
      await auditService.logAuthenticationEvent(
        'logout',
        user.userId,
        user.organizationId,
        req
      );

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      res.status(500).json({
        error: 'Logout failed',
        code: 'LOGOUT_ERROR'
      });
    }
  }
);

/**
 * GET /auth/sessions
 * Get active sessions for user
 */
router.get('/sessions',
  securityMiddleware.requireAuthentication(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const sessions = jwtService.getUserSessions(user.userId);

      res.json({
        success: true,
        sessions
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to retrieve sessions',
        code: 'SESSIONS_ERROR'
      });
    }
  }
);

/**
 * OAuth Routes
 */

/**
 * GET /auth/oauth/:platform/authorize
 * Initiate OAuth flow for a platform
 */
router.get('/oauth/:platform/authorize',
  securityMiddleware.requireAuthentication(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { platform } = req.params;
      const user = req.user!;

      // Validate platform
      if (!platform || !['slack', 'google', 'microsoft'].includes(platform)) {
        res.status(400).json({
          error: 'Unsupported platform',
          code: 'UNSUPPORTED_PLATFORM'
        });
        return;
      }

      // Generate OAuth authorization URL
      const result = await oauthService.initiateOAuthFlow(
        platform as Platform,
        user.userId,
        user.organizationId,
        req
      );

      res.json({
        success: true,
        authorizationUrl: result.authorizationUrl,
        state: result.state
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to initiate OAuth flow',
        code: 'OAUTH_INITIATION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /auth/oauth/:platform/callback
 * Handle OAuth callback
 */
router.get('/oauth/:platform/callback',
  securityMiddleware.requireAuthentication(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { platform } = req.params;
      const { code, state } = req.query;
      const user = req.user!;

      if (!code || !state) {
        res.status(400).json({
          error: 'Missing OAuth callback parameters',
          code: 'MISSING_OAUTH_PARAMS'
        });
        return;
      }

      // Complete OAuth flow
      const result = await oauthService.completeOAuthFlow(
        platform as PlatformType,
        code as string,
        state as string,
        user.userId,
        user.organizationId,
        req
      );

      res.json({
        success: true,
        connection: result
      });
    } catch (error) {
      res.status(400).json({
        error: 'OAuth callback failed',
        code: 'OAUTH_CALLBACK_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /auth/oauth/connections/:connectionId/refresh
 * Refresh OAuth tokens for a connection
 */
router.post('/oauth/connections/:connectionId/refresh',
  securityMiddleware.requireAuthentication(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { connectionId } = req.params;
      const user = req.user!;

      if (!connectionId) {
        res.status(400).json({
          error: 'Connection ID is required',
          code: 'MISSING_CONNECTION_ID'
        });
        return;
      }

      const result = await oauthService.refreshOAuthTokens(
        connectionId,
        user.userId,
        req
      );

      if (result.success) {
        res.json({
          success: true,
          tokens: result.newTokens
        });
      } else {
        res.status(400).json({
          error: 'Token refresh failed',
          code: 'TOKEN_REFRESH_FAILED',
          message: result.error
        });
      }
    } catch (error) {
      res.status(500).json({
        error: 'Token refresh error',
        code: 'TOKEN_REFRESH_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * DELETE /auth/oauth/connections/:connectionId
 * Revoke OAuth connection and tokens
 */
router.delete('/oauth/connections/:connectionId',
  securityMiddleware.requireAuthentication(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { connectionId } = req.params;
      const user = req.user!;

      if (!connectionId) {
        res.status(400).json({
          error: 'Connection ID is required',
          code: 'MISSING_CONNECTION_ID'
        });
        return;
      }

      await oauthService.revokeOAuthTokens(connectionId, user.userId, req);

      res.json({
        success: true,
        message: 'OAuth connection revoked successfully'
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to revoke OAuth connection',
        code: 'OAUTH_REVOCATION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Security monitoring endpoints
 */

/**
 * GET /auth/security/metrics
 * Get security metrics (admin only)
 */
router.get('/security/metrics',
  securityMiddleware.requireAuthentication(),
  securityMiddleware.requirePermissions(['admin']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { timeframe = '24h' } = req.query;
      const user = req.user!;

      const metrics = await auditService.getSecurityMetrics(
        user.organizationId,
        timeframe as '1h' | '24h' | '7d' | '30d'
      );

      res.json({
        success: true,
        metrics
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to retrieve security metrics',
        code: 'METRICS_ERROR'
      });
    }
  }
);

/**
 * GET /auth/security/compliance-report
 * Generate compliance report (admin only)
 */
router.get('/security/compliance-report',
  securityMiddleware.requireAuthentication(),
  securityMiddleware.requirePermissions(['admin']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { 
        reportType = 'soc2',
        startDate,
        endDate 
      } = req.query;
      const user = req.user!;

      if (!startDate || !endDate) {
        res.status(400).json({
          error: 'Start date and end date are required',
          code: 'MISSING_DATE_RANGE'
        });
        return;
      }

      const report = await auditService.generateComplianceReport(
        user.organizationId,
        reportType as string
      );

      res.json({
        success: true,
        report
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to generate compliance report',
        code: 'REPORT_ERROR'
      });
    }
  }
);

export default router;