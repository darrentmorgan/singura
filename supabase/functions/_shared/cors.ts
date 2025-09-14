// ============================================================================
// CORS Configuration for Supabase Edge Functions
// Multi-environment CORS handling for demo, staging, and production
// ============================================================================

export interface CORSOptions {
  origin?: string | string[] | boolean;
  methods?: string[];
  allowedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

// Environment-specific CORS origins
const CORS_ORIGINS = {
  development: [
    'http://localhost:3000',
    'http://localhost:4200',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:4200'
  ],
  demo: [
    'https://demo.saasxray.com',
    'https://*.vercel.app',
    'https://*.netlify.app'
  ],
  staging: [
    'https://staging.saasxray.com',
    'https://*.vercel.app',
    'https://*.netlify.app'
  ],
  production: [
    'https://app.saasxray.com',
    'https://saasxray.com',
    'https://www.saasxray.com'
  ]
};

export function getCORSOrigins(environment?: string): string[] {
  const env = environment || Deno.env.get('ENVIRONMENT') || 'development';

  switch (env) {
    case 'demo':
      return CORS_ORIGINS.demo;
    case 'staging':
      return CORS_ORIGINS.staging;
    case 'production':
      return CORS_ORIGINS.production;
    default:
      return CORS_ORIGINS.development;
  }
}

export function isOriginAllowed(origin: string, environment?: string): boolean {
  const allowedOrigins = getCORSOrigins(environment);

  // Check for exact match
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // Check for wildcard patterns
  for (const allowedOrigin of allowedOrigins) {
    if (allowedOrigin.includes('*')) {
      const pattern = allowedOrigin.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(origin)) {
        return true;
      }
    }
  }

  return false;
}

export function setCORSHeaders(
  response: Response,
  request: Request,
  options: CORSOptions = {}
): Response {
  const origin = request.headers.get('Origin') || '';
  const environment = Deno.env.get('ENVIRONMENT');

  const headers = new Headers(response.headers);

  // Set Access-Control-Allow-Origin
  if (options.origin === true || isOriginAllowed(origin, environment)) {
    headers.set('Access-Control-Allow-Origin', origin || '*');
  } else if (typeof options.origin === 'string') {
    headers.set('Access-Control-Allow-Origin', options.origin);
  } else if (Array.isArray(options.origin) && options.origin.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
  }

  // Set other CORS headers
  headers.set('Access-Control-Allow-Methods', (options.methods || [
    'GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'
  ]).join(', '));

  headers.set('Access-Control-Allow-Headers', (options.allowedHeaders || [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-API-Key',
    'X-Organization-ID'
  ]).join(', '));

  if (options.credentials !== undefined) {
    headers.set('Access-Control-Allow-Credentials', options.credentials.toString());
  }

  if (options.maxAge !== undefined) {
    headers.set('Access-Control-Max-Age', options.maxAge.toString());
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function handleCORSPreflight(request: Request): Response {
  const origin = request.headers.get('Origin') || '';
  const environment = Deno.env.get('ENVIRONMENT');

  if (!isOriginAllowed(origin, environment)) {
    return new Response('CORS: Origin not allowed', { status: 403 });
  }

  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  headers.set('Access-Control-Allow-Headers', [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-API-Key',
    'X-Organization-ID'
  ].join(', '));
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Access-Control-Max-Age', '86400'); // 24 hours

  return new Response(null, {
    status: 200,
    headers,
  });
}

export function withCORS(
  handler: (request: Request) => Promise<Response> | Response,
  options: CORSOptions = {}
) {
  return async (request: Request): Promise<Response> => {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return handleCORSPreflight(request);
    }

    // Process the actual request
    try {
      const response = await handler(request);
      return setCORSHeaders(response, request, options);
    } catch (error) {
      // Ensure CORS headers are set even for error responses
      const errorResponse = new Response(
        JSON.stringify({
          error: error.message || 'Internal server error',
          timestamp: new Date().toISOString()
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return setCORSHeaders(errorResponse, request, options);
    }
  };
}