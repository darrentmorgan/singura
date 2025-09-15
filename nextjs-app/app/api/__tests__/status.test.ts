/**
 * Tests for /api/status endpoint
 * Ensures status endpoint returns comprehensive system information
 */

import { NextRequest } from 'next/server';
import { GET } from '../status/route';

const mockEnv = {
  NODE_ENV: 'test' as const,
  APP_VERSION: '1.0.0'
};

describe('/api/status', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    Object.assign(process.env, mockEnv);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return comprehensive status information', async () => {
    const request = new NextRequest('http://localhost:3000/api/status');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('status', 'operational');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('environment', 'test');
    expect(data).toHaveProperty('version', '1.0.0');
    expect(data).toHaveProperty('uptime');
    expect(data).toHaveProperty('memory');
    expect(data).toHaveProperty('platform');
    expect(data).toHaveProperty('nodeVersion');
  });

  it('should include memory usage information', async () => {
    const request = new NextRequest('http://localhost:3000/api/status');
    const response = await GET(request);
    const data = await response.json();

    expect(data.memory).toHaveProperty('used');
    expect(data.memory).toHaveProperty('total');
    expect(data.memory).toHaveProperty('external');
    
    expect(typeof data.memory.used).toBe('number');
    expect(typeof data.memory.total).toBe('number');
    expect(typeof data.memory.external).toBe('number');
    
    expect(data.memory.used).toBeGreaterThan(0);
    expect(data.memory.total).toBeGreaterThan(0);
  });

  it('should include uptime as a number', async () => {
    const request = new NextRequest('http://localhost:3000/api/status');
    const response = await GET(request);
    const data = await response.json();

    expect(typeof data.uptime).toBe('number');
    expect(data.uptime).toBeGreaterThanOrEqual(0);
  });

  it('should include platform and node version', async () => {
    const request = new NextRequest('http://localhost:3000/api/status');
    const response = await GET(request);
    const data = await response.json();

    expect(typeof data.platform).toBe('string');
    expect(typeof data.nodeVersion).toBe('string');
    expect(data.nodeVersion).toMatch(/^v\d+\.\d+\.\d+/);
  });

  it('should include cache control headers', async () => {
    const request = new NextRequest('http://localhost:3000/api/status');
    const response = await GET(request);

    expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
    expect(response.headers.get('Pragma')).toBe('no-cache');
    expect(response.headers.get('Expires')).toBe('0');
  });

  it('should validate timestamp format', async () => {
    const request = new NextRequest('http://localhost:3000/api/status');
    const response = await GET(request);
    const data = await response.json();

    expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);
  });
});