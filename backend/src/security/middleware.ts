/**
 * Enterprise security middleware for SaaS X-Ray
 * Implements comprehensive security controls including rate limiting,
 * CORS, CSP, input validation, and security headers
 * Complies with OWASP security guidelines and SOC 2 requirements
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import * as cors from 'cors';
import { body, validationResult, ValidationError, ValidationChain } from 'express-validator';
import * as crypto from 'crypto';
import { jwtService } from './jwt';

export interface SecurityConfig {
  cors: {
    origins: string[];
    credentials: boolean;
    maxAge: number;
  };
  csp: {
    directives: Record<string, string[]>;
  };
  rateLimiting: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
  };
}

export interface SecurityMetrics {
  requestCount: number;
  blockedRequests: number;
  rateLimitHits: number;
  validationErrors: number;
  suspiciousActivity: number;
}

/**
 * Security middleware manager with comprehensive protection
 */
export class SecurityMiddleware {
  private config: SecurityConfig;
  private metrics: SecurityMetrics = {
    requestCount: 0,
    blockedRequests: 0,
    rateLimitHits: 0,
    validationErrors: 0,
    suspiciousActivity: 0
  };
  
  private suspiciousIPs = new Map<string, {
    count: number;
    firstSeen: Date;
    lastSeen: Date;
    reasons: string[];
  }>();

  constructor() {
    this.config = this.loadSecurityConfig();
  }

  /**
   * Load security configuration from environment
   */
  private loadSecurityConfig(): SecurityConfig {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    
    return {
      cors: {
        origins: [
          frontendUrl,
          'https://app.saas-xray.com',
          'https://saas-xray.com',
          ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://127.0.0.1:3000'] : [])
        ].filter(Boolean),
        credentials: true,
        maxAge: 86400 // 24 hours
      },
      csp: {
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'", "'unsafe-inline'", 'https://apis.google.com'],
          'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          'font-src': ["'self'", 'https://fonts.gstatic.com'],
          'img-src': ["'self'", 'data:', 'https:'],
          'connect-src': ["'self'", apiUrl, 'https://api.slack.com', 'https://graph.microsoft.com'],
          'frame-ancestors': ["'none'"],
          'form-action': ["'self'"]
        }
      },
      rateLimiting: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100,
        skipSuccessfulRequests: false
      }
    };
  }

  /**
   * Configure CORS with secure defaults
   */
  corsMiddleware() {
    return cors.default({
      origin: (origin: string | undefined, callback: (err: Error | null, allowed?: boolean) => void) => {
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) {
          return callback(null, true);
        }

        // Check if origin is in allowed list
        if (this.config.cors.origins.includes(origin)) {
          return callback(null, true);
        }

        // Block unauthorized origins
        this.recordSuspiciousActivity(origin, 'unauthorized_cors_origin');
        callback(new Error('Not allowed by CORS'));
      },
      credentials: this.config.cors.credentials,
      maxAge: this.config.cors.maxAge,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-CSRF-Token',
        'X-Request-ID'
      ]
    });
  }

  /**
   * Configure security headers with Helmet
   */
  securityHeadersMiddleware() {
    return helmet({
      contentSecurityPolicy: {
        directives: this.config.csp.directives
      },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      },
      crossOriginEmbedderPolicy: { policy: 'credentialless' },
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
      referrerPolicy: { policy: 'no-referrer' },
      xssFilter: true
    });
  }

  /**
   * Rate limiting middleware with adaptive controls
   */
  rateLimitingMiddleware() {
    return rateLimit({
      windowMs: this.config.rateLimiting.windowMs,
      max: this.config.rateLimiting.maxRequests,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req: Request) => {
        // Use user ID for authenticated requests, IP for anonymous
        const user = req.user;
        return user ? `user:${user.userId}` : `ip:${req.ip}`;
      },
      handler: (req: Request, res: Response) => {
        this.metrics.rateLimitHits++;
        this.recordSuspiciousActivity(req.ip || 'unknown', 'rate_limit_exceeded');
        
        res.status(429).json({
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(this.config.rateLimiting.windowMs / 1000)
        });
      },
      skip: (req: Request) => {
        // Skip rate limiting for health checks
        return req.path === '/health' || req.path === '/ping';
      }
    });
  }

  /**
   * Strict rate limiting for authentication endpoints
   */
  authRateLimitingMiddleware() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // Very strict for auth endpoints
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req: Request) => `auth:${req.ip}`,
      handler: (req: Request, res: Response) => {
        this.recordSuspiciousActivity(req.ip || 'unknown', 'auth_rate_limit_exceeded');
        
        res.status(429).json({
          error: 'Too many authentication attempts',
          code: 'AUTH_RATE_LIMIT_EXCEEDED',
          retryAfter: 900 // 15 minutes
        });
      }
    });
  }

  /**
   * Request logging and monitoring middleware
   */
  requestLoggingMiddleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      this.metrics.requestCount++;
      
      // Generate request ID for tracing
      req.requestId = crypto.randomBytes(16).toString('hex');
      res.setHeader('X-Request-ID', req.requestId);

      // Log security-relevant information
      const startTime = Date.now();
      const originalSend = res.send;
      
      res.send = function(body: unknown) {
        const responseTime = Date.now() - startTime;
        const logData = {
          requestId: req.requestId,
          method: req.method,
          url: req.url,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          statusCode: res.statusCode,
          responseTime,
          user: req.user?.userId || 'anonymous'
        };

        // Log suspicious patterns
        if (res.statusCode >= 400 || responseTime > 5000) {
          console.warn('Security Alert:', logData);
        }

        return originalSend.call(this, body);
      };

      next();
    };
  }

  /**
   * Input validation and sanitization middleware
   */
  inputValidationMiddleware() {
    return (req: Request, res: Response, next: NextFunction): void | Response => {
      // Validate common injection patterns
      const suspiciousPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /union\s+select/gi,
        /drop\s+table/gi,
        /delete\s+from/gi,
        /insert\s+into/gi,
        /update\s+.*\s+set/gi,
        /<iframe/gi,
        /<embed/gi,
        /<object/gi
      ];

      const checkForInjection = (value: unknown): boolean => {
        if (typeof value === 'string') {
          return suspiciousPatterns.some(pattern => pattern.test(value));
        }
        if (typeof value === 'object' && value !== null) {
          return Object.values(value).some(checkForInjection);
        }
        return false;
      };

      // Check request body
      if (req.body && checkForInjection(req.body)) {
        this.recordSuspiciousActivity(req.ip || 'unknown', 'injection_attempt');
        return res.status(400).json({
          error: 'Invalid input detected',
          code: 'INVALID_INPUT'
        });
      }

      // Check query parameters
      if (req.query && checkForInjection(req.query)) {
        this.recordSuspiciousActivity(req.ip || 'unknown', 'injection_attempt');
        return res.status(400).json({
          error: 'Invalid query parameters',
          code: 'INVALID_QUERY'
        });
      }

      next();
    };
  }

  /**
   * CSRF protection middleware
   */
  csrfProtectionMiddleware() {
    return (req: Request, res: Response, next: NextFunction): void | Response => {
      // Skip CSRF for GET, HEAD, OPTIONS
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }

      // Skip CSRF for API endpoints with Bearer token
      if (req.headers.authorization?.startsWith('Bearer ')) {
        return next();
      }

      const csrfToken = req.headers['x-csrf-token'] as string;
      const sessionToken = req.headers['x-session-token'] as string;

      if (!csrfToken || !sessionToken) {
        return res.status(403).json({
          error: 'CSRF token required',
          code: 'CSRF_TOKEN_MISSING'
        });
      }

      // Validate CSRF token format
      if (!/^[a-f0-9]{64}$/.test(csrfToken)) {
        this.recordSuspiciousActivity(req.ip || 'unknown', 'invalid_csrf_token');
        return res.status(403).json({
          error: 'Invalid CSRF token',
          code: 'CSRF_TOKEN_INVALID'
        });
      }

      next();
    };
  }

  /**
   * Authentication middleware wrapper
   */
  requireAuthentication() {
    return jwtService.authenticationMiddleware;
  }

  /**
   * Authorization middleware wrapper
   */
  requirePermissions(permissions: string[]) {
    return jwtService.authorizationMiddleware(permissions);
  }

  /**
   * Validation middleware factory
   */
  validateInput(validations: Array<{ field: string; rules: string[]; message?: string }>) {
    return [
      ...validations,
      (req: Request, res: Response, next: NextFunction): void | Response => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          this.metrics.validationErrors++;
          return res.status(400).json({
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors.array()
          });
        }
        next();
      }
    ];
  }

  /**
   * Validation middleware for ValidationChain objects (express-validator)
   */
  validateFields(validations: ValidationChain[]) {
    return [
      ...validations,
      (req: Request, res: Response, next: NextFunction): void | Response => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          this.metrics.validationErrors++;
          return res.status(400).json({
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors.array()
          });
        }
        next();
      }
    ];
  }

  /**
   * Common validation rules
   */
  validationRules = {
    email: body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    
    password: body('password')
      .isLength({ min: 8, max: 128 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must be 8-128 chars with uppercase, lowercase, number, and special char'),
    
    organizationName: body('name')
      .isLength({ min: 2, max: 100 })
      .matches(/^[a-zA-Z0-9\s\-_.]+$/)
      .withMessage('Organization name must be 2-100 chars, alphanumeric with spaces, hyphens, dots, underscores'),
    
    platformType: body('platform_type')
      .isIn(['slack', 'google', 'microsoft', 'hubspot', 'salesforce', 'notion', 'asana', 'jira'])
      .withMessage('Invalid platform type'),
    
    uuid: body('id')
      .isUUID()
      .withMessage('Valid UUID required')
  };

  /**
   * IP blocking middleware for suspicious activity
   */
  ipBlockingMiddleware() {
    return (req: Request, res: Response, next: NextFunction): void | Response => {
      const clientIP = req.ip || 'unknown';
      const suspicious = this.suspiciousIPs.get(clientIP);

      if (suspicious && suspicious.count >= 10) {
        this.metrics.blockedRequests++;
        return res.status(403).json({
          error: 'IP address blocked due to suspicious activity',
          code: 'IP_BLOCKED'
        });
      }

      next();
    };
  }

  /**
   * Record suspicious activity for monitoring
   */
  private recordSuspiciousActivity(identifier: string, reason: string): void {
    this.metrics.suspiciousActivity++;
    
    const existing = this.suspiciousIPs.get(identifier);
    const now = new Date();

    if (existing) {
      existing.count++;
      existing.lastSeen = now;
      existing.reasons.push(reason);
    } else {
      this.suspiciousIPs.set(identifier, {
        count: 1,
        firstSeen: now,
        lastSeen: now,
        reasons: [reason]
      });
    }

    // Alert on high-risk activities
    if (['injection_attempt', 'auth_rate_limit_exceeded'].includes(reason)) {
      console.error(`SECURITY ALERT: ${reason} from ${identifier}`, {
        timestamp: now,
        reason,
        identifier
      });
    }
  }

  /**
   * Get security metrics
   */
  getMetrics(): SecurityMetrics & { suspiciousIPs: number } {
    return {
      ...this.metrics,
      suspiciousIPs: this.suspiciousIPs.size
    };
  }

  /**
   * Clean up old suspicious IP records
   */
  cleanupSuspiciousIPs(): number {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    let cleanedCount = 0;

    for (const [ip, data] of Array.from(this.suspiciousIPs.entries())) {
      if (data.lastSeen.getTime() < oneDayAgo && data.count < 5) {
        this.suspiciousIPs.delete(ip);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Emergency shutdown middleware (kill switch)
   */
  emergencyShutdownMiddleware() {
    return (req: Request, res: Response, next: NextFunction): void | Response => {
      if (process.env.EMERGENCY_SHUTDOWN === 'true') {
        return res.status(503).json({
          error: 'Service temporarily unavailable',
          code: 'EMERGENCY_SHUTDOWN'
        });
      }
      next();
    };
  }
}

// Extend Request interface for custom properties
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

// Export singleton instance
export const securityMiddleware = new SecurityMiddleware();