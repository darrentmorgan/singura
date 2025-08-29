/**
 * Authentication Middleware
 * Provides JWT token validation and user context
 */

import { Request, Response, NextFunction } from 'express';
import { verifyJWT } from '../security/jwt';

/**
 * Middleware to authenticate and validate JWT tokens
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'ACCESS_TOKEN_REQUIRED',
        message: 'Access token is required'
      });
    }

    // Verify and decode the token
    const decoded = await verifyJWT(token);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      });
    }

    // Add user context to request
    req.user = {
      id: decoded.sub,
      organizationId: decoded.organizationId,
      permissions: decoded.permissions || []
    };

    next();
  } catch (error) {
    console.error('Token authentication failed:', error);
    
    return res.status(401).json({
      success: false,
      error: 'AUTHENTICATION_FAILED',
      message: 'Authentication failed'
    });
  }
};

/**
 * Middleware to check if user has specific permissions
 */
export const requirePermissions = (requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userPermissions = req.user?.permissions || [];
    
    const hasPermission = requiredPermissions.every(permission => 
      userPermissions.includes(permission) || userPermissions.includes('admin')
    );
    
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'Insufficient permissions to access this resource',
        required: requiredPermissions,
        granted: userPermissions
      });
    }
    
    next();
  };
};

/**
 * Middleware to ensure user belongs to the correct organization
 */
export const requireOrganization = (req: Request, res: Response, next: NextFunction) => {
  const userOrgId = req.user?.organizationId;
  const requestedOrgId = req.params.organizationId || req.body.organizationId || req.query.organizationId;
  
  if (requestedOrgId && userOrgId !== requestedOrgId) {
    return res.status(403).json({
      success: false,
      error: 'ORGANIZATION_MISMATCH',
      message: 'Access denied: organization mismatch'
    });
  }
  
  next();
};