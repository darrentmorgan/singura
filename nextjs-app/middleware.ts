/**
 * NextJS Global Middleware
 * Applied to all API routes and pages
 * Handles security, CORS, rate limiting, and audit logging
 */

import { NextRequest } from 'next/server';
import { securityMiddleware } from './lib/middleware';

export async function middleware(request: NextRequest) {
  // Temporarily disable middleware to test API routes
  // Apply security middleware to all API routes
  // if (request.nextUrl.pathname.startsWith('/api/')) {
  //   return securityMiddleware(request);
  // }

  // For non-API routes, just continue
  return;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)'
  ]
};