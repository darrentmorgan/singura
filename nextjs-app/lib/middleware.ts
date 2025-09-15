/**
 * NextJS Enterprise Security Middleware
 * Implements comprehensive security controls equivalent to Express middleware
 * Includes CORS, rate limiting, security headers, and audit logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export interface SecurityConfig {
  cors: {
    origins: (string | RegExp)[];
    credentials: boolean;
    maxAge: number;
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
 * Rate limiting store (in-memory for development, should use Redis in production)
 */
class RateLimitStore {
  private store = new Map<string, { count: number; resetTime: number }>();

  increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now();
    const existing = this.store.get(key);
    
    if (existing && existing.resetTime > now) {
      existing.count++;
      return existing;
    }
    
    const newEntry = { count: 1, resetTime: now + windowMs };
    this.store.set(key, newEntry);
    return newEntry;
  }

  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (value.resetTime <= now) {
        this.store.delete(key);
      }
    }
  }
}

const rateLimitStore = new RateLimitStore();

// Cleanup expired entries every 5 minutes
setInterval(() => rateLimitStore.cleanup(), 5 * 60 * 1000);

const defaultConfig: SecurityConfig = {
  cors: {
    origins: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      process.env.BACKEND_URL || 'http://localhost:3001',
      /^https:\/\/.*\.vercel\.app$/,
      /^https:\/\/.*\.ngrok\.io$/
    ],
    credentials: true,
    maxAge: 86400 // 24 hours
  },
  rateLimiting: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    skipSuccessfulRequests: false
  }
};

/**
 * Security headers middleware
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Strict Transport Security (HTTPS only)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }

  return response;
}

/**
 * CORS middleware
 */
export function applyCORS(request: NextRequest, response: NextResponse, config: SecurityConfig = defaultConfig): NextResponse {
  const origin = request.headers.get('origin');
  const allowedOrigins = config.cors.origins;

  // Check if origin is allowed
  const isAllowed = origin && allowedOrigins.some(allowedOrigin => {
    if (typeof allowedOrigin === 'string') {
      return allowedOrigin === origin;
    }
    return allowedOrigin.test(origin);
  });

  if (isAllowed) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  if (config.cors.credentials) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  response.headers.set('Access-Control-Max-Age', config.cors.maxAge.toString());

  return response;
}

/**
 * Rate limiting middleware
 */
export function applyRateLimit(request: NextRequest, config: SecurityConfig = defaultConfig): { allowed: boolean; remaining: number; resetTime: number } {
  const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const key = `rate_limit:${clientIP}`;
  
  const result = rateLimitStore.increment(key, config.rateLimiting.windowMs);
  
  return {
    allowed: result.count <= config.rateLimiting.maxRequests,
    remaining: Math.max(0, config.rateLimiting.maxRequests - result.count),
    resetTime: result.resetTime
  };
}

/**
 * Audit logging for enterprise compliance
 */
export function logRequest(request: NextRequest, response: NextResponse, metadata: any = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent'),
    ip: request.ip || request.headers.get('x-forwarded-for'),
    statusCode: response.status,
    requestId: crypto.randomUUID(),
    ...metadata
  };

  // In development, log to console. In production, send to monitoring service
  if (process.env.NODE_ENV === 'development') {
    console.log('API Request:', JSON.stringify(logEntry, null, 2));
  } else {
    // Send to your logging service (Datadog, New Relic, etc.)
    console.log(JSON.stringify(logEntry));
  }

  return logEntry.requestId;
}

/**
 * Main security middleware function
 */
export async function securityMiddleware(request: NextRequest): Promise<NextResponse> {
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 });
    return applyCORS(request, addSecurityHeaders(response));
  }

  // Apply rate limiting
  const rateLimitResult = applyRateLimit(request);
  if (!rateLimitResult.allowed) {
    const response = NextResponse.json(
      { 
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
      },
      { status: 429 }
    );
    
    response.headers.set('X-RateLimit-Limit', defaultConfig.rateLimiting.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString());
    
    return addSecurityHeaders(response);
  }

  // Continue to next middleware/handler
  const response = NextResponse.next();
  
  // Apply security headers and CORS
  const securedResponse = applyCORS(request, addSecurityHeaders(response));
  
  // Log request for audit trail
  const requestId = logRequest(request, securedResponse);
  securedResponse.headers.set('X-Request-ID', requestId);

  return securedResponse;
}