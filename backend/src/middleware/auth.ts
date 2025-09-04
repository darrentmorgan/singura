/**
 * Authentication Middleware
 * Provides JWT token validation and user context
 */

import { Request, Response, NextFunction } from 'express';
import { verifyJWT } from '../security/jwt';

/**
 * Middleware to authenticate and validate JWT tokens
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'ACCESS_TOKEN_REQUIRED',
        message: 'Access token is required'
      });
      return;
    }

    // Verify and decode the token
    const decoded = await verifyJWT(token);
    
    if (!decoded) {
      res.status(401).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      });
      return;
    }

    // Add user context to request
    req.user = {
      userId: decoded.sub,
      organizationId: decoded.organizationId,
      permissions: decoded.permissions || [],
      sessionId: decoded.sessionId
    };

    next();
  } catch (error) {
    console.error('Token authentication failed:', error);
    
    res.status(401).json({
      success: false,
      error: 'AUTHENTICATION_FAILED',
      message: 'Authentication failed'
    });
    return;
  }
};

/**
 * Middleware to check if user has specific permissions
 */
export const requirePermissions = (requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userPermissions = req.user?.permissions || [];
    
    const hasPermission = requiredPermissions.every(permission => 
      userPermissions.includes(permission) || userPermissions.includes('admin')
    );
    
    if (!hasPermission) {
      res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'Insufficient permissions to access this resource',
        required: requiredPermissions,
        granted: userPermissions
      });
      return;
    }
    
    next();
  };
};

/**
 * Middleware to ensure user belongs to the correct organization
 */
export const requireOrganization = (req: Request, res: Response, next: NextFunction): void => {
  const userOrgId = req.user?.organizationId;
  const requestedOrgId = req.params.organizationId || req.body.organizationId || req.query.organizationId;
  
  if (requestedOrgId && userOrgId !== requestedOrgId) {
    res.status(403).json({
      success: false,
      error: 'ORGANIZATION_MISMATCH',
      message: 'Access denied: organization mismatch'
    });
    return;
  }
  
  next();
};