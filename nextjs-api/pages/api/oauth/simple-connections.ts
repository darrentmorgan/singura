import type { NextApiRequest, NextApiResponse } from 'next';
import { withSecurity } from '../../../middleware/security';

// Simplified interfaces for demo purposes
interface SimpleConnection {
  id: string;
  platform: 'slack' | 'google' | 'microsoft';
  status: 'connected' | 'disconnected' | 'error';
  displayName: string;
  permissions: string[];
  createdAt: string;
  lastUsed?: string;
}

interface ConnectionsResponse {
  connections: SimpleConnection[];
  total: number;
}

interface ErrorResponse {
  error: string;
  code: string;
  message?: string;
}

/**
 * Simple OAuth Connections API - demonstrates NextJS API pattern
 * Matches Express /api/connections pattern with simplified types
 */
async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ConnectionsResponse | ErrorResponse>
) {
  switch (req.method) {
    case 'GET':
      return await getSimpleConnections(req, res);
    
    default:
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({
        error: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED'
      });
  }
}

/**
 * GET /api/oauth/simple-connections
 * Retrieve user's OAuth connections (simplified)
 */
async function getSimpleConnections(
  req: NextApiRequest,
  res: NextApiResponse<ConnectionsResponse | ErrorResponse>
) {
  try {
    const user = (req as any).user;
    
    // Simplified mock data that matches the interface
    const mockConnections: SimpleConnection[] = [
      {
        id: 'conn-1',
        platform: 'google',
        status: 'connected',
        displayName: 'Google Workspace - admin@company.com',
        permissions: ['admin.directory.user.readonly', 'admin.reports.audit.readonly'],
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString()
      },
      {
        id: 'conn-2',
        platform: 'slack',
        status: 'connected',
        displayName: 'Slack - Company Workspace',
        permissions: ['channels:read', 'users:read', 'audit_logs:read'],
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString()
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

// Apply enterprise security middleware
export default withSecurity({
  requireAuth: true,
  auditLog: true,
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100
  }
})(handler);