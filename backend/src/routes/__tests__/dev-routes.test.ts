/**
 * Development Routes Integration Tests
 * Tests for mock data toggle endpoints
 */

import request from 'supertest';
import express from 'express';
import devRoutes from '../dev-routes';

describe('Development Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/dev', devRoutes);
  });

  describe('Environment Security', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should block all dev routes in production', async () => {
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/api/dev/mock-data-toggle')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Not Found',
        message: 'The requested resource was not found'
      });
    });

    it('should allow dev routes in development', async () => {
      process.env.NODE_ENV = 'development';

      const response = await request(app)
        .get('/api/dev/mock-data-toggle')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.state).toBeDefined();
      expect(response.body.securityCheck).toBeDefined();
    });

    it('should allow dev routes in test environment', async () => {
      process.env.NODE_ENV = 'test';

      const response = await request(app)
        .get('/api/dev/mock-data-toggle')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/dev/mock-data-toggle', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should return current toggle state', async () => {
      const response = await request(app)
        .get('/api/dev/mock-data-toggle')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        state: {
          enabled: expect.any(Boolean),
          environment: expect.any(String),
          lastModified: expect.any(String),
          initialSource: expect.any(String)
        },
        message: 'Mock data toggle state retrieved successfully',
        securityCheck: {
          isDevelopment: true,
          toggleAllowed: true,
          productionModeBlocked: false
        }
      });
    });

    it('should include security check information', async () => {
      const response = await request(app)
        .get('/api/dev/mock-data-toggle')
        .expect(200);

      expect(response.body.securityCheck.isDevelopment).toBe(true);
      expect(response.body.securityCheck.toggleAllowed).toBe(true);
      expect(response.body.securityCheck.productionModeBlocked).toBe(false);
    });
  });

  describe('POST /api/dev/mock-data-toggle', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should enable mock data toggle', async () => {
      const response = await request(app)
        .post('/api/dev/mock-data-toggle')
        .send({
          enabled: true,
          requestedBy: 'test-user',
          reason: 'Integration test'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.state.enabled).toBe(true);
      expect(response.body.state.modifiedBy).toBe('test-user');
      expect(response.body.message).toContain('enabled');
    });

    it('should disable mock data toggle', async () => {
      const response = await request(app)
        .post('/api/dev/mock-data-toggle')
        .send({
          enabled: false,
          requestedBy: 'test-user',
          reason: 'Integration test'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.state.enabled).toBe(false);
      expect(response.body.state.modifiedBy).toBe('test-user');
      expect(response.body.message).toContain('disabled');
    });

    it('should validate request body - missing enabled field', async () => {
      const response = await request(app)
        .post('/api/dev/mock-data-toggle')
        .send({
          requestedBy: 'test-user'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('enabled must be boolean');
    });

    it('should validate request body - invalid enabled type', async () => {
      const response = await request(app)
        .post('/api/dev/mock-data-toggle')
        .send({
          enabled: 'true',
          requestedBy: 'test-user'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('enabled must be boolean');
    });

    it('should handle optional fields', async () => {
      const response = await request(app)
        .post('/api/dev/mock-data-toggle')
        .send({
          enabled: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.state.enabled).toBe(true);
      expect(response.body.state.modifiedBy).toBeDefined();
    });
  });

  describe('GET /api/dev/mock-data-toggle/audit', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should return audit log', async () => {
      // First, make some changes to create audit entries
      await request(app)
        .post('/api/dev/mock-data-toggle')
        .send({ enabled: true, requestedBy: 'test-audit' });

      await request(app)
        .post('/api/dev/mock-data-toggle')
        .send({ enabled: false, requestedBy: 'test-audit' });

      const response = await request(app)
        .get('/api/dev/mock-data-toggle/audit')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.auditLog).toBeInstanceOf(Array);
      expect(response.body.totalEntries).toBeGreaterThan(0);
      expect(response.body.environment).toBeDefined();
    });

    it('should include audit entry details', async () => {
      // Create an audit entry
      await request(app)
        .post('/api/dev/mock-data-toggle')
        .send({ enabled: true, requestedBy: 'audit-test' });

      const response = await request(app)
        .get('/api/dev/mock-data-toggle/audit')
        .expect(200);

      const latestEntry = response.body.auditLog[response.body.auditLog.length - 1];
      expect(latestEntry).toMatchObject({
        timestamp: expect.any(String),
        action: expect.stringMatching(/toggle_enabled|toggle_disabled|toggle_accessed/),
        previousState: expect.any(Boolean),
        newState: expect.any(Boolean),
        triggeredBy: expect.any(String),
        environment: expect.any(String)
      });
    });
  });

  describe('Data Flow Integration', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should maintain state consistency across requests', async () => {
      // Enable toggle
      const enableResponse = await request(app)
        .post('/api/dev/mock-data-toggle')
        .send({ enabled: true, requestedBy: 'consistency-test' })
        .expect(200);

      // Get current state
      const getResponse = await request(app)
        .get('/api/dev/mock-data-toggle')
        .expect(200);

      expect(getResponse.body.state.enabled).toBe(true);
      expect(getResponse.body.state.modifiedBy).toBe('consistency-test');

      // Disable toggle
      await request(app)
        .post('/api/dev/mock-data-toggle')
        .send({ enabled: false, requestedBy: 'consistency-test' })
        .expect(200);

      // Verify state changed
      const finalResponse = await request(app)
        .get('/api/dev/mock-data-toggle')
        .expect(200);

      expect(finalResponse.body.state.enabled).toBe(false);
    });

    it('should track all state changes in audit log', async () => {
      const testId = 'audit-flow-test';

      // Clear existing audit by getting baseline
      const baselineAudit = await request(app)
        .get('/api/dev/mock-data-toggle/audit')
        .expect(200);

      const baselineCount = baselineAudit.body.totalEntries;

      // Make state changes
      await request(app)
        .post('/api/dev/mock-data-toggle')
        .send({ enabled: true, requestedBy: testId });

      await request(app)
        .post('/api/dev/mock-data-toggle')
        .send({ enabled: false, requestedBy: testId });

      // Check audit log
      const auditResponse = await request(app)
        .get('/api/dev/mock-data-toggle/audit')
        .expect(200);

      expect(auditResponse.body.totalEntries).toBeGreaterThan(baselineCount);
      
      // Find our test entries
      const testEntries = auditResponse.body.auditLog.filter(
        (entry: any) => entry.triggeredBy === testId
      );
      
      expect(testEntries.length).toBeGreaterThanOrEqual(2);
    });
  });
});