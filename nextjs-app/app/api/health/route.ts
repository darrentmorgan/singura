/**
 * Health check endpoint - NextJS API route
 * Provides identical response format to Express backend health endpoint
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '1.0.0'
  };

  return NextResponse.json(healthData, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}