import { NextResponse } from 'next/server';

interface HealthResponse {
  status: string;
  timestamp: string;
  environment: string;
  version: string;
}

/**
 * Health check endpoint - App Router format
 * Provides identical response format to current Express endpoints
 */
export async function GET() {
  const healthResponse: HealthResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '1.0.0'
  };

  return NextResponse.json(healthResponse, {
    status: 200,
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
    },
  });
}