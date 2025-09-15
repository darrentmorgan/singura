import { createMocks } from 'node-mocks-http';
import handler from '../../pages/api/status';

describe('/api/status', () => {
  beforeEach(() => {
    // Reset environment variables
    process.env.NODE_ENV = 'test';
    process.env.APP_VERSION = '1.0.0';
    delete process.env.VERCEL;
  });

  it('should return detailed status on GET request', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const data = JSON.parse(res._getData());
    expect(data).toEqual({
      api: {
        status: 'operational',
        version: '1.0.0',
        uptime: expect.any(String)
      },
      environment: 'test',
      timestamp: expect.any(String),
      features: {
        oauth: true,
        authentication: true,
        edgeFunctions: false
      }
    });

    // Verify timestamp format
    expect(new Date(data.timestamp)).toBeInstanceOf(Date);
    
    // Verify uptime format (should be in format like "0h 0m 0s")
    expect(data.api.uptime).toMatch(/^\d+h \d+m \d+s$/);
  });

  it('should indicate edge functions are available on Vercel', async () => {
    process.env.VERCEL = '1';

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const data = JSON.parse(res._getData());
    expect(data.features.edgeFunctions).toBe(true);
  });

  it('should set security headers', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res.getHeaders()).toMatchObject({
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'x-xss-protection': '1; mode=block'
    });
  });

  it('should return 405 for non-GET methods', async () => {
    const { req, res } = createMocks({
      method: 'PUT',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(res.getHeaders()).toMatchObject({
      'allow': ['GET']
    });
  });

  it('should handle missing environment variables gracefully', async () => {
    delete process.env.NODE_ENV;
    delete process.env.APP_VERSION;

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const data = JSON.parse(res._getData());
    expect(data.environment).toBe('development');
    expect(data.api.version).toBe('1.0.0');
  });
});