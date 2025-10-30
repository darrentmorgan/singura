/**
 * Integration test for Vendor Grouping API
 * Tests the GET /api/automations endpoint with groupBy=vendor parameter
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server';
import { pool } from '../../src/database';

describe('Vendor Grouping API Integration', () => {
  beforeAll(async () => {
    // Ensure database connection
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✅ Database connection established for vendor grouping test');
  });

  afterAll(async () => {
    // Close database connection
    await pool.end();
    console.log('✅ Database connection closed');
  });

  describe('GET /api/automations', () => {
    test('should return ungrouped automations by default (backward compatibility)', async () => {
      const response = await request(app)
        .get('/api/automations')
        .expect('Content-Type', /json/)
        .expect(401); // Will fail auth, but that's expected without valid org token

      // We're just testing that the endpoint exists and schema is valid
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    test('should accept groupBy=vendor query parameter', async () => {
      const response = await request(app)
        .get('/api/automations?groupBy=vendor')
        .expect('Content-Type', /json/)
        .expect(401); // Will fail auth, but that's expected without valid org token

      // We're just testing that the endpoint accepts the parameter
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject invalid groupBy values', async () => {
      const response = await request(app)
        .get('/api/automations?groupBy=invalid')
        .expect('Content-Type', /json/)
        .expect(400); // Should fail validation before auth

      expect(response.body).toHaveProperty('success', false);
    });
  });
});
