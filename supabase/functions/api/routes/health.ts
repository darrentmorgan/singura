// ============================================================================
// Health Check Route for Supabase Edge Functions
// Provides health status and environment information
// ============================================================================

import type { DatabaseFactory } from '../../_shared/database.ts';
import type { APIResponse } from '../../_shared/types.ts';

export interface HealthCheckContext {
  request: Request;
  db: DatabaseFactory;
  organizationId?: string | null;
  url: URL;
  method: string;
  headers: Record<string, string>;
}

export async function handleHealth(context: HealthCheckContext): Promise<Response> {
  const { db, url, method } = context;

  if (method !== 'GET') {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED',
        timestamp: new Date().toISOString()
      } as APIResponse),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // Test database connectivity
    const dbHealthy = await testDatabaseHealth(db);

    // Get environment information
    const environment = Deno.env.get('ENVIRONMENT') || 'development';
    const version = Deno.env.get('APP_VERSION') || '1.0.0';

    // Check if this is a detailed health check
    const detailed = url.searchParams.get('detailed') === 'true';

    const healthData: any = {
      status: dbHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      environment,
      version,
      database: dbHealthy ? 'connected' : 'error'
    };

    if (detailed) {
      // Add more detailed health information
      healthData.details = {
        supabase_url: Deno.env.get('SUPABASE_URL') ? 'configured' : 'missing',
        service_key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? 'configured' : 'missing',
        frontend_url: Deno.env.get('FRONTEND_URL') || 'not_configured',
        uptime: `${Math.floor(Date.now() / 1000)}s`,
        checks: {
          database: dbHealthy,
          environment_vars: checkEnvironmentVars(),
          cors_config: checkCORSConfig()
        }
      };

      // Add system information (non-sensitive)
      healthData.system = {
        platform: 'Supabase Edge Functions',
        runtime: 'Deno',
        timestamp_utc: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    }

    const status = dbHealthy ? 200 : 503;

    return new Response(
      JSON.stringify({
        success: true,
        data: healthData,
        timestamp: new Date().toISOString()
      } as APIResponse),
      {
        status,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Health check error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Health check failed',
        code: 'HEALTH_CHECK_ERROR',
        timestamp: new Date().toISOString(),
        details: error.message
      } as APIResponse),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

async function testDatabaseHealth(db: DatabaseFactory): Promise<boolean> {
  try {
    // Test basic database connectivity by querying organizations
    const { data, error } = await db.client
      .from('organizations')
      .select('id')
      .limit(1);

    return !error;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

function checkEnvironmentVars(): boolean {
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  return requiredVars.every(varName => Deno.env.get(varName));
}

function checkCORSConfig(): boolean {
  const environment = Deno.env.get('ENVIRONMENT');
  const frontendUrl = Deno.env.get('FRONTEND_URL');

  // Basic CORS configuration check
  return !!(environment && frontendUrl);
}