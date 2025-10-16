/**
 * Clerk Authentication Middleware
 *
 * Provides authentication and organization context for all API routes
 * Extracts Clerk user ID and organization ID from requests
 */

import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '@clerk/express';
import { AuthenticatedUser } from '../security/jwt';

/**
 * Clerk authentication context
 */
export interface ClerkAuth {
  userId: string;
  organizationId: string;
  sessionId?: string;
}

/**
 * Extended Express Request with Clerk authentication context
 */
export interface ClerkAuthRequest extends Request {
  auth?: ClerkAuth;
  user?: AuthenticatedUser;
}

/**
 * Clerk authentication middleware
 *
 * Validates Clerk session and extracts user/organization information
 * Attaches auth context to request object
 *
 * @throws 401 if no valid Clerk session found
 */
export async function requireClerkAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get Clerk session from request headers
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');

    if (!sessionToken) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'No session token provided. Please sign in with Clerk.'
      });
      return;
    }

    // Implement proper Clerk token verification using Clerk SDK
    const { verifyToken } = await import('@clerk/backend');
    const { clerkClient } = await import('@clerk/clerk-sdk-node');

    try {
      // Verify JWT token with Clerk SDK
      const tokenPayload = await verifyToken(sessionToken, {
        secretKey: process.env.CLERK_SECRET_KEY || '',
        authorizedParties: [process.env.CLERK_PUBLISHABLE_KEY || '']
      });

      if (!tokenPayload || !tokenPayload.sub) {
        throw new Error('Invalid token payload');
      }

      // Extract verified user information from token
      const userId = tokenPayload.sub;
      const organizationId = tokenPayload.org_id || userId;
      const sessionId = tokenPayload.sid || crypto.randomUUID();

      // Optionally fetch additional user details from Clerk
      let userEmail = '';
      try {
        const user = await clerkClient.users.getUser(userId);
        const primaryEmail = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId);
        userEmail = primaryEmail?.emailAddress || '';
      } catch (userError) {
        console.warn('Failed to fetch user details:', userError);
      }

      // Attach auth context to request
      const authRequest = req as ClerkAuthRequest;
      authRequest.auth = {
        userId,
        organizationId: organizationId || userId, // Fallback to userId if no org
        sessionId
      };

      console.log('🔐 Clerk Auth Success:', {
        userId,
        organizationId: organizationId || userId,
        path: req.path
      });

      next();
    } catch (verifyError) {
      // Inner catch - Clerk verification failed
      console.error('Clerk token verification failed:', verifyError);
      throw verifyError; // Re-throw to outer catch
    }
  } catch (error) {
    // Outer catch - Final error handling
    console.error('Clerk authentication error:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
      message: error instanceof Error ? error.message : 'Invalid or expired session'
    });
  }
}

/**
 * Optional Clerk authentication middleware
 *
 * Attempts to authenticate but doesn't fail if no session found
 * Useful for routes that work with or without authentication
 */
export async function optionalClerkAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Try to get auth from headers even without Authorization header
    const userId = req.headers['x-clerk-user-id'] as string;
    const organizationId = req.headers['x-clerk-organization-id'] as string;
    const sessionId = req.headers['x-clerk-session-id'] as string;

    // If we have Clerk headers, use them regardless of Authorization header
    if (userId || organizationId) {
      const authRequest = req as ClerkAuthRequest;
      authRequest.auth = {
        userId: userId || '',
        organizationId: organizationId || userId || '',
        sessionId
      };

      authRequest.user = {
        userId: userId || '',
        email: '',
        organizationId: organizationId || userId || '',
        permissions: [],
        sessionId: sessionId || ''
      };

      console.log('✅ Clerk auth from headers:', {
        userId,
        organizationId,
        path: req.path
      });
    }

    next();
  } catch (error) {
    // Silent failure for optional auth
    console.warn('Optional Clerk auth failed:', error);
    next();
  }
}

/**
 * Middleware to ensure user has an organization
 *
 * @throws 403 if user doesn't belong to an organization
 */
export function requireOrganization(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authRequest = req as ClerkAuthRequest;

  if (!authRequest.auth?.organizationId) {
    res.status(403).json({
      success: false,
      error: 'Organization required',
      message: 'This action requires you to be part of an organization. Please create or join an organization in your account settings.'
    });
    return;
  }

  next();
}

/**
 * Helper function to get organization ID from request
 *
 * @param req Express request object
 * @returns Organization ID or null if not authenticated
 */
export function getOrganizationId(req: Request): string | null {
  const authRequest = req as ClerkAuthRequest;
  return authRequest.auth?.organizationId || null;
}

/**
 * Helper function to get user ID from request
 *
 * @param req Express request object
 * @returns User ID or null if not authenticated
 */
export function getUserId(req: Request): string | null {
  const authRequest = req as ClerkAuthRequest;
  return authRequest.auth?.userId || null;
}
