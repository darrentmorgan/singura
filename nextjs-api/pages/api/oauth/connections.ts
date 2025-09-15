import type { NextApiRequest, NextApiResponse } from 'next';
import { withSecurity } from '../../../middleware/security';
import { 
  PlatformConnection, 
  Platform, 
  ConnectionStatus 
} from '@saas-xray/shared-types';

interface ConnectionsResponse {
  connections: PlatformConnection[];
  total: number;
}

interface ErrorResponse {
  error: string;
  code: string;
  message?: string;
}

/**
 * OAuth Connections API - matches Express /api/connections pattern
 * Provides CRUD operations for OAuth platform connections
 */
async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ConnectionsResponse | ErrorResponse>
) {
  switch (req.method) {
    case 'GET':
      return await getConnections(req, res);
    
    case 'POST':
      return await createConnection(req, res);
    
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({
        error: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED'
      });
  }
}

/**
 * GET /api/oauth/connections
 * Retrieve user's OAuth connections
 */
async function getConnections(
  req: NextApiRequest,
  res: NextApiResponse<ConnectionsResponse | ErrorResponse>
) {
  try {
    const user = (req as any).user;
    
    // Mock data for demonstration (replace with actual database queries)
    const mockConnections: PlatformConnection[] = [
      {
        id: 'conn-1',
        platform: 'google' as Platform,
        status: 'connected' as ConnectionStatus,
        displayName: 'Google Workspace - admin@company.com',
        userId: user.userId,
        organizationId: user.organizationId,
        permissions: ['admin.directory.user.readonly', 'admin.reports.audit.readonly'],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsed: new Date(),
        isActive: true
      },
      {
        id: 'conn-2',
        platform: 'slack' as Platform,
        status: 'connected' as ConnectionStatus,
        displayName: 'Slack - Company Workspace',
        userId: user.userId,
        organizationId: user.organizationId,
        permissions: ['channels:read', 'users:read', 'audit_logs:read'],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsed: new Date(),
        isActive: true
      }
    ];

    res.status(200).json({
      connections: mockConnections,
      total: mockConnections.length
    });

  } catch (error) {
    console.error('Failed to get connections:', error);
    res.status(500).json({
      error: 'Failed to retrieve connections',
      code: 'CONNECTION_RETRIEVAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * POST /api/oauth/connections
 * Create new OAuth connection
 */
async function createConnection(
  req: NextApiRequest,
  res: NextApiResponse<{ success: boolean; connectionId: string } | ErrorResponse>
) {
  try {
    const user = (req as any).user;
    const { platform, authorizationCode } = req.body;

    if (!platform || !authorizationCode) {
      return res.status(400).json({
        error: 'Platform and authorization code are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Mock connection creation (replace with actual OAuth flow)
    const connectionId = `conn-${Date.now()}`;
    
    // In real implementation:
    // 1. Exchange authorization code for tokens
    // 2. Store encrypted tokens in database
    // 3. Create platform connection record
    // 4. Return connection details

    res.status(201).json({
      success: true,
      connectionId
    });

  } catch (error) {
    console.error('Failed to create connection:', error);
    res.status(500).json({
      error: 'Failed to create connection',
      code: 'CONNECTION_CREATION_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Apply enterprise security middleware
export default withSecurity({
  requireAuth: true,
  auditLog: true,
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100
  }
})(handler);