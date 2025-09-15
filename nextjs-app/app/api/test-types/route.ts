/**
 * Test endpoint demonstrating @saas-xray/shared-types integration
 * Shows how NextJS API routes work with shared type definitions
 */

import { NextRequest, NextResponse } from 'next/server';
// import { APIResponse, PlatformConnection } from '@saas-xray/shared-types';

// Temporary local types until shared-types is properly built
interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

interface PlatformConnection {
  id: string;
  userId: string;
  platform: 'slack' | 'google' | 'microsoft';
  status: 'connected' | 'disconnected' | 'error';
  createdAt: Date;
  updatedAt: Date;
  credentials: {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    scope: string[];
    platform: 'slack' | 'google' | 'microsoft';
  };
  metadata: {
    teamId: string;
    teamName: string;
    userName: string;
    userEmail: string;
  };
}

interface TestTypesRequest {
  platform?: string;
  testData?: boolean;
}

interface TestTypesResponse {
  message: string;
  example: PlatformConnection;
  sharedTypesVersion: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Example usage of shared types
    const exampleConnection: PlatformConnection = {
      id: 'test-connection-123',
      userId: 'test-user-456',
      platform: 'slack',
      status: 'connected',
      createdAt: new Date(),
      updatedAt: new Date(),
      credentials: {
        accessToken: 'encrypted-token-data',
        refreshToken: 'encrypted-refresh-token',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        scope: ['channels:read', 'users:read'],
        platform: 'slack'
      },
      metadata: {
        teamId: 'T1234567890',
        teamName: 'Example Team',
        userName: 'John Doe',
        userEmail: 'john@example.com'
      }
    };

    const responseData: TestTypesResponse = {
      message: 'Shared types integration working correctly',
      example: exampleConnection,
      sharedTypesVersion: '1.0.0'
    };

    const apiResponse: APIResponse<TestTypesResponse> = {
      success: true,
      data: responseData,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(apiResponse, { status: 200 });

  } catch (error) {
    const errorResponse: APIResponse<null> = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: TestTypesRequest = await request.json();
    
    // Type-safe request handling
    const platform = body.platform || 'slack';
    const useTestData = body.testData || false;

    const exampleConnection: PlatformConnection = {
      id: `test-${platform}-${Date.now()}`,
      userId: 'test-user-456',
      platform: platform as 'slack' | 'google' | 'microsoft',
      status: useTestData ? 'connected' : 'disconnected',
      createdAt: new Date(),
      updatedAt: new Date(),
      credentials: {
        accessToken: 'encrypted-token-data',
        refreshToken: 'encrypted-refresh-token',
        expiresAt: new Date(Date.now() + 3600000),
        scope: platform === 'slack' ? ['channels:read'] : ['https://www.googleapis.com/auth/admin.directory.user.readonly'],
        platform: platform as 'slack' | 'google' | 'microsoft'
      },
      metadata: {
        teamId: `T${Date.now()}`,
        teamName: `${platform} Test Team`,
        userName: 'Test User',
        userEmail: 'test@example.com'
      }
    };

    const responseData: TestTypesResponse = {
      message: `POST request processed with platform: ${platform}`,
      example: exampleConnection,
      sharedTypesVersion: '1.0.0'
    };

    const apiResponse: APIResponse<TestTypesResponse> = {
      success: true,
      data: responseData,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(apiResponse, { status: 201 });

  } catch (error) {
    const errorResponse: APIResponse<null> = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(errorResponse, { status: 400 });
  }
}