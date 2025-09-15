import type { NextApiRequest, NextApiResponse } from 'next';

interface StatusResponse {
  api: {
    status: string;
    version: string;
    uptime: string;
  };
  environment: string;
  timestamp: string;
  features: {
    oauth: boolean;
    authentication: boolean;
    edgeFunctions: boolean;
  };
}

/**
 * Status endpoint - provides detailed API status information
 * Extends basic health check with feature availability
 */
export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<StatusResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const uptime = process.uptime();
  const uptimeFormatted = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`;

  const statusResponse: StatusResponse = {
    api: {
      status: 'operational',
      version: process.env.APP_VERSION || '1.0.0',
      uptime: uptimeFormatted
    },
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    features: {
      oauth: true, // Will be implemented with NextAuth.js
      authentication: true, // NextAuth.js ready
      edgeFunctions: process.env.VERCEL === '1' // True when deployed to Vercel
    }
  };

  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  res.status(200).json(statusResponse);
}