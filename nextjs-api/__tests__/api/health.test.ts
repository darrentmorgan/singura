import { createMocks } from 'node-mocks-http';
import handler from '../../pages/api/health';

describe('/api/health', () => {
  beforeEach(() => {
    // Reset environment variables
    process.env.NODE_ENV = 'test';
    process.env.APP_VERSION = '1.0.0';
  });

  it('should return health status on GET request', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const data = JSON.parse(res._getData());
    expect(data).toEqual({
      status: 'healthy',
      timestamp: expect.any(String),
      environment: 'test',
      version: '1.0.0'
    });

    // Verify timestamp format
    expect(new Date(data.timestamp)).toBeInstanceOf(Date);
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
      method: 'POST',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(res.getHeaders()).toMatchObject({
      'allow': ['GET']
    });
  });

  it('should use default values when env vars are missing', async () => {
    delete process.env.NODE_ENV;
    delete process.env.APP_VERSION;

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const data = JSON.parse(res._getData());
    expect(data.environment).toBe('development');
    expect(data.version).toBe('1.0.0');
  });
});