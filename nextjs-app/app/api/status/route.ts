/**
 * Status endpoint - NextJS API route
 * Provides system status information for monitoring and debugging
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const statusData = {
    status: 'operational',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '1.0.0',
    uptime: process.uptime(),
    memory: {
      used: process.memoryUsage().heapUsed,
      total: process.memoryUsage().heapTotal,
      external: process.memoryUsage().external
    },
    platform: process.platform,
    nodeVersion: process.version
  };

  return NextResponse.json(statusData, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}