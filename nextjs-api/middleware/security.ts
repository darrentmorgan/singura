import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../pages/api/auth/[...nextauth]';

export interface SecurityConfig {
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  requireAuth?: boolean;
  auditLog?: boolean;
  validateInput?: boolean;
}

/**
 * Rate limiting store (in-memory for development, use Redis for production)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Enterprise security middleware for NextJS API routes
 * Matches Express security patterns with rate limiting, auth, and audit logging
 */
export function withSecurity(config: SecurityConfig = {}) {
  return function securityMiddleware(
    handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
  ) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      try {
        // Apply security headers
        applySecurityHeaders(res);

        // Rate limiting
        if (config.rateLimit) {
          const rateLimitResult = await checkRateLimit(req, config.rateLimit);
          if (!rateLimitResult.allowed) {
            return res.status(429).json({
              error: 'Too many requests',
              code: 'RATE_LIMIT_EXCEEDED',
              retryAfter: rateLimitResult.retryAfter
            });
          }
        }

        // Authentication check
        if (config.requireAuth) {
          const session = await getServerSession(req, res, authOptions);
          if (!session) {
            return res.status(401).json({
              error: 'Authentication required',
              code: 'AUTHENTICATION_REQUIRED'
            });
          }
          
          // Attach user to request (similar to Express pattern)
          (req as any).user = {
            userId: (session.user as any)?.id || session.user?.email || 'anonymous',
            email: session.user?.email || 'unknown@example.com',
            organizationId: (session as any).organizationId || 'default-org',
            permissions: (session as any).permissions || []
          };
        }

        // Input validation
        if (config.validateInput) {
          const validationResult = validateInput(req);
          if (!validationResult.valid) {
            return res.status(400).json({
              error: 'Invalid input',
              code: 'VALIDATION_ERROR',
              details: validationResult.errors
            });
          }
        }

        // Audit logging
        if (config.auditLog) {
          await logApiRequest(req);
        }

        // Call the actual handler
        return await handler(req, res);

      } catch (error) {
        console.error('Security middleware error:', error);
        
        // Log security errors for monitoring
        await logSecurityEvent(req, 'MIDDLEWARE_ERROR', error);
        
        return res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_ERROR'
        });
      }
    };
  };
}

/**
 * Apply enterprise security headers
 */
function applySecurityHeaders(res: NextApiResponse) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

/**
 * Rate limiting implementation
 */
async function checkRateLimit(
  req: NextApiRequest,
  config: { windowMs: number; maxRequests: number }
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const identifier = getClientIdentifier(req);
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Clean old entries
  for (const [key, value] of rateLimitStore) {
    if (value.resetTime < windowStart) {
      rateLimitStore.delete(key);
    }
  }

  const current = rateLimitStore.get(identifier) || { count: 0, resetTime: now + config.windowMs };

  if (current.count >= config.maxRequests && current.resetTime > now) {
    return {
      allowed: false,
      retryAfter: Math.ceil((current.resetTime - now) / 1000)
    };
  }

  // Update count
  if (current.resetTime <= now) {
    current.count = 1;
    current.resetTime = now + config.windowMs;
  } else {
    current.count++;
  }

  rateLimitStore.set(identifier, current);

  return { allowed: true };
}

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' 
    ? forwarded.split(',')[0]
    : req.socket.remoteAddress;
  
  return `${ip}:${req.url}`;
}

/**
 * Input validation
 */
function validateInput(req: NextApiRequest): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];

  // Basic validation rules
  if (req.method === 'POST' || req.method === 'PUT') {
    if (!req.body) {
      errors.push('Request body is required');
    }
  }

  // Check for common injection patterns
  const suspiciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi
  ];

  const bodyStr = JSON.stringify(req.body || {});
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(bodyStr)) {
      errors.push('Potentially malicious content detected');
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Audit logging for API requests
 */
async function logApiRequest(req: NextApiRequest) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: getClientIdentifier(req).split(':')[0],
    userId: (req as any).user?.userId,
    organizationId: (req as any).user?.organizationId
  };

  // In production, this should write to a proper audit log system
  console.log('API Request:', JSON.stringify(logEntry));
}

/**
 * Log security events for monitoring
 */
async function logSecurityEvent(req: NextApiRequest, eventType: string, details: any) {
  const securityEvent = {
    timestamp: new Date().toISOString(),
    type: eventType,
    method: req.method,
    url: req.url,
    ip: getClientIdentifier(req).split(':')[0],
    details: details instanceof Error ? details.message : details,
    severity: 'HIGH'
  };

  // In production, this should trigger security alerts
  console.error('Security Event:', JSON.stringify(securityEvent));
}