// ============================================================================
// Main API Handler for Supabase Edge Functions
// Routes all API requests to appropriate handlers
// ============================================================================

import { withCORS } from '../_shared/cors.ts';
import { DatabaseFactory } from '../_shared/database.ts';
import type { APIResponse, EdgeFunctionRequest } from '../_shared/types.ts';

// Import route handlers
import { handleOrganizations } from './routes/organizations.ts';
import { handlePlatformConnections } from './routes/platform-connections.ts';
import { handleAutomations } from './routes/automations.ts';
import { handleDiscovery } from './routes/discovery.ts';
import { handleOAuth } from './routes/oauth.ts';
import { handleWebhooks } from './routes/webhooks.ts';
import { handleHealth } from './routes/health.ts';

// Route mapping
const routes = {
  '/organizations': handleOrganizations,
  '/platform-connections': handlePlatformConnections,
  '/automations': handleAutomations,
  '/discovery': handleDiscovery,
  '/oauth': handleOAuth,
  '/webhooks': handleWebhooks,
  '/health': handleHealth,
};

async function apiHandler(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const path = url.pathname;

    // Initialize database factory
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceKey) {
      return new Response(
        JSON.stringify({
          error: 'Service configuration error',
          code: 'MISSING_SERVICE_KEY',
          timestamp: new Date().toISOString()
        } as APIResponse),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const db = new DatabaseFactory(serviceKey);

    // Extract organization ID from headers for multi-tenancy
    const organizationId = request.headers.get('X-Organization-ID') ||
                          url.searchParams.get('organization_id');

    // Create request context
    const context = {
      request,
      db,
      organizationId,
      url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
    };

    // Route to appropriate handler
    let routeHandler = null;
    let routePath = '';

    // Find matching route
    for (const [route, handler] of Object.entries(routes)) {
      if (path.startsWith(`/api${route}`) || path.startsWith(route)) {
        routeHandler = handler;
        routePath = route;
        break;
      }
    }

    if (!routeHandler) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Route not found',
          code: 'NOT_FOUND',
          timestamp: new Date().toISOString()
        } as APIResponse),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Execute route handler
    const response = await routeHandler(context);

    // Log API access
    if (organizationId) {
      await db.auditLogs.log(
        organizationId,
        'api_access',
        'system',
        {
          method: request.method,
          path: path,
          route: routePath,
          status: response.status,
          user_agent: request.headers.get('User-Agent') || 'unknown'
        }
      );
    }

    return response;

  } catch (error) {
    console.error('API Handler Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        details: error.message
      } as APIResponse),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Export the CORS-wrapped handler
export default withCORS(apiHandler, {
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-API-Key',
    'X-Organization-ID'
  ]
});