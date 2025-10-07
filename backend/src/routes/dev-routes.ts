/**
 * Development-Only API Routes
 * These endpoints are ONLY available in development environment
 * All endpoints return 404 in production for security
 */

import { Router, Request, Response } from 'express';
import { 
  MockDataToggleState, 
  MockDataToggleResponse, 
  MockDataToggleRequest,
  MockDataAuditEntry,
  isValidMockDataToggleState
} from '@saas-xray/shared-types';

const router = Router();

// In-memory toggle state storage (development only)
// Default to FALSE (use real database data) unless explicitly enabled
let currentToggleState: MockDataToggleState = {
  enabled: process.env.USE_MOCK_DATA === 'true', // Will be false if not set or set to anything other than 'true'
  environment: (process.env.NODE_ENV as any) || 'development',
  lastModified: new Date(),
  modifiedBy: 'environment-variable',
  initialSource: 'environment'
};

// Audit log for toggle changes (development only)
const auditLog: MockDataAuditEntry[] = [];

/**
 * Environment validation middleware - blocks all dev routes in production
 */
const requireDevelopmentEnvironment = (req: Request, res: Response, next: () => void): void => {
  const environment = process.env.NODE_ENV;
  
  // SECURITY: Block all dev routes in production
  if (environment === 'production') {
    res.status(404).json({
      error: 'Not Found',
      message: 'The requested resource was not found'
    });
    return;
  }

  // Log access attempt for audit purposes
  console.log('Dev API Access:', {
    endpoint: req.path,
    method: req.method,
    environment,
    timestamp: new Date().toISOString(),
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  next();
};

// Apply development environment middleware to all routes
router.use(requireDevelopmentEnvironment);

/**
 * GET /api/dev/mock-data-toggle
 * Get current mock data toggle state (development only)
 */
router.get('/mock-data-toggle', (req: Request, res: Response): void => {
  try {
    const response: MockDataToggleResponse = {
      success: true,
      state: currentToggleState,
      message: 'Mock data toggle state retrieved successfully',
      securityCheck: {
        isDevelopment: process.env.NODE_ENV !== 'production',
        toggleAllowed: true,
        productionModeBlocked: process.env.NODE_ENV === 'production'
      }
    };

    // Add audit log entry
    const auditEntry: MockDataAuditEntry = {
      timestamp: new Date(),
      action: 'toggle_accessed',
      previousState: currentToggleState.enabled,
      newState: currentToggleState.enabled,
      triggeredBy: req.ip || 'unknown',
      environment: process.env.NODE_ENV || 'development',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };
    auditLog.push(auditEntry);

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve mock data toggle state',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/dev/mock-data-toggle
 * Update mock data toggle state (development only)
 */
router.post('/mock-data-toggle', (req: Request, res: Response): void => {
  try {
    const toggleRequest: MockDataToggleRequest = req.body;

    // Validate request body
    if (typeof toggleRequest.enabled !== 'boolean') {
      res.status(400).json({
        success: false,
        error: 'Invalid request: enabled must be boolean',
        message: 'The enabled field is required and must be a boolean value'
      });
      return;
    }

    // Store previous state for audit
    const previousState = currentToggleState.enabled;

    // Update toggle state
    currentToggleState = {
      enabled: toggleRequest.enabled,
      environment: (process.env.NODE_ENV as any) || 'development',
      lastModified: new Date(),
      modifiedBy: toggleRequest.requestedBy || req.ip || 'unknown',
      initialSource: 'runtime'
    };

    // Add comprehensive audit log entry
    const auditEntry: MockDataAuditEntry = {
      timestamp: new Date(),
      action: toggleRequest.enabled ? 'toggle_enabled' : 'toggle_disabled',
      previousState,
      newState: toggleRequest.enabled,
      triggeredBy: toggleRequest.requestedBy || req.ip || 'unknown',
      environment: process.env.NODE_ENV || 'development',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };
    auditLog.push(auditEntry);

    // Log toggle change for monitoring
    console.log('Mock Data Toggle Changed:', {
      previousState,
      newState: toggleRequest.enabled,
      triggeredBy: toggleRequest.requestedBy || req.ip,
      reason: toggleRequest.reason,
      timestamp: new Date().toISOString()
    });

    const response: MockDataToggleResponse = {
      success: true,
      state: currentToggleState,
      message: `Mock data toggle ${toggleRequest.enabled ? 'enabled' : 'disabled'} successfully`,
      securityCheck: {
        isDevelopment: process.env.NODE_ENV !== 'production',
        toggleAllowed: true,
        productionModeBlocked: false
      }
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update mock data toggle state',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/dev/mock-data-toggle/audit
 * Get audit log for mock data toggle changes (development only)
 */
router.get('/mock-data-toggle/audit', (req: Request, res: Response): void => {
  try {
    res.json({
      success: true,
      auditLog,
      totalEntries: auditLog.length,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit log',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Export function to get current toggle state for internal use
 */
export function getCurrentMockDataToggleState(): MockDataToggleState {
  return { ...currentToggleState };
}

/**
 * Export function to check if mock data is currently enabled
 */
export function isMockDataEnabledRuntime(): boolean {
  return currentToggleState.enabled;
}

export default router;