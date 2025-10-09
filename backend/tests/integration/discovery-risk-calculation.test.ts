/**
 * Integration Test: Discovery Risk Calculation
 *
 * Ensures that the discovery endpoint always returns automations with calculated risk levels.
 * This test prevents regression of the "unknown risk" badge bug.
 *
 * Bug History: Previously, discovery endpoint returned automations without riskLevel field,
 * causing UI to display "unknown risk" badges. Fixed in commit 86e211e.
 */

import request from 'supertest';
import app from '../../src/simple-server';
import { platformConnectionRepository } from '../../src/database/repositories/platform-connection';
import { oauthCredentialStorage } from '../../src/services/oauth-credential-storage-service';

describe('Discovery Risk Calculation', () => {
  const mockConnectionId = 'c14eaefc-d34c-4efc-a6b1-a42bf6faae31';
  const mockOrgId = 'org_33fSYwlyUqkYiSD2kBt7hqBz7dE';
  const mockUserId = 'user_33fSAXNzC0KyRk8KfpXvoQbFpqW';

  describe('POST /api/connections/:id/discover', () => {
    it('should return automations with calculated riskLevel field', async () => {
      const response = await request(app)
        .post(`/api/connections/${mockConnectionId}/discover`)
        .set('x-clerk-organization-id', mockOrgId)
        .set('x-clerk-user-id', mockUserId)
        .expect(200);

      // Verify response structure
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('discovery');
      expect(response.body.discovery).toHaveProperty('automations');
      expect(Array.isArray(response.body.discovery.automations)).toBe(true);

      // If automations exist, verify each has riskLevel
      if (response.body.discovery.automations.length > 0) {
        response.body.discovery.automations.forEach((automation: any, index: number) => {
          // Critical check: riskLevel must exist
          expect(automation).toHaveProperty('riskLevel',
            `Automation at index ${index} (${automation.name}) is missing riskLevel field`);

          // Verify riskLevel is valid
          expect(automation.riskLevel).toMatch(/^(low|medium|high|critical)$/,
            `Automation ${automation.name} has invalid riskLevel: ${automation.riskLevel}`);

          // Verify metadata includes riskScore
          expect(automation.metadata).toHaveProperty('riskScore');
          expect(typeof automation.metadata.riskScore).toBe('number');
          expect(automation.metadata.riskScore).toBeGreaterThanOrEqual(0);
          expect(automation.metadata.riskScore).toBeLessThanOrEqual(100);

          // Verify metadata includes riskFactors
          expect(automation.metadata).toHaveProperty('riskFactors');
          expect(Array.isArray(automation.metadata.riskFactors)).toBe(true);
        });
      }
    });

    it('should calculate risk levels consistently with GET /api/automations', async () => {
      // Run discovery
      const discoveryResponse = await request(app)
        .post(`/api/connections/${mockConnectionId}/discover`)
        .set('x-clerk-organization-id', mockOrgId)
        .set('x-clerk-user-id', mockUserId)
        .expect(200);

      // Get automations list
      const automationsResponse = await request(app)
        .get('/api/automations')
        .set('x-clerk-organization-id', mockOrgId)
        .set('x-clerk-user-id', mockUserId)
        .expect(200);

      // Compare first automation from each endpoint
      if (discoveryResponse.body.discovery.automations.length > 0 &&
          automationsResponse.body.automations.length > 0) {

        const discoveryAuto = discoveryResponse.body.discovery.automations[0];
        const listAuto = automationsResponse.body.automations.find(
          (a: any) => a.id === discoveryAuto.id
        );

        if (listAuto) {
          // Both should have the same risk level
          expect(discoveryAuto.riskLevel).toBe(listAuto.riskLevel);
          expect(discoveryAuto.metadata.riskScore).toBe(listAuto.metadata.riskScore);
        }
      }
    });

    it('should calculate correct risk level for AI platforms', async () => {
      const response = await request(app)
        .post(`/api/connections/${mockConnectionId}/discover`)
        .set('x-clerk-organization-id', mockOrgId)
        .set('x-clerk-user-id', mockUserId)
        .expect(200);

      // Find an AI platform automation
      const aiAutomation = response.body.discovery.automations.find(
        (a: any) => a.metadata.isAIPlatform === true
      );

      if (aiAutomation) {
        // AI platforms should always have 'high' risk level
        expect(aiAutomation.riskLevel).toBe('high');
        expect(aiAutomation.metadata.riskScore).toBe(85);
      }
    });

    it('should calculate correct risk level based on risk factors', async () => {
      const response = await request(app)
        .post(`/api/connections/${mockConnectionId}/discover`)
        .set('x-clerk-organization-id', mockOrgId)
        .set('x-clerk-user-id', mockUserId)
        .expect(200);

      response.body.discovery.automations.forEach((automation: any) => {
        const riskFactorCount = (automation.metadata.riskFactors || []).length;
        const isAIPlatform = automation.metadata.isAIPlatform === true;

        if (isAIPlatform) {
          expect(automation.riskLevel).toBe('high');
        } else if (riskFactorCount >= 5) {
          expect(automation.riskLevel).toBe('critical');
        } else if (riskFactorCount >= 3) {
          expect(automation.riskLevel).toBe('high');
        } else if (riskFactorCount >= 1) {
          expect(automation.riskLevel).toBe('medium');
        } else {
          expect(automation.riskLevel).toBe('low');
        }
      });
    });

    it('should calculate risk score correctly', async () => {
      const response = await request(app)
        .post(`/api/connections/${mockConnectionId}/discover`)
        .set('x-clerk-organization-id', mockOrgId)
        .set('x-clerk-user-id', mockUserId)
        .expect(200);

      response.body.discovery.automations.forEach((automation: any) => {
        const riskFactorCount = (automation.metadata.riskFactors || []).length;
        const isAIPlatform = automation.metadata.isAIPlatform === true;

        if (isAIPlatform) {
          expect(automation.metadata.riskScore).toBe(85);
        } else {
          const expectedScore = Math.min(100, 30 + riskFactorCount * 15);
          expect(automation.metadata.riskScore).toBe(expectedScore);
        }
      });
    });
  });

  describe('Regression Prevention', () => {
    it('should NOT return automations with null or undefined riskLevel', async () => {
      const response = await request(app)
        .post(`/api/connections/${mockConnectionId}/discover`)
        .set('x-clerk-organization-id', mockOrgId)
        .set('x-clerk-user-id', mockUserId)
        .expect(200);

      response.body.discovery.automations.forEach((automation: any) => {
        expect(automation.riskLevel).not.toBeNull();
        expect(automation.riskLevel).not.toBeUndefined();
        expect(automation.riskLevel).not.toBe('');
      });
    });

    it('should include riskLevel even for automations with no risk factors', async () => {
      const response = await request(app)
        .post(`/api/connections/${mockConnectionId}/discover`)
        .set('x-clerk-organization-id', mockOrgId)
        .set('x-clerk-user-id', mockUserId)
        .expect(200);

      // Find automation with 0 risk factors
      const noRiskAuto = response.body.discovery.automations.find(
        (a: any) => (a.metadata.riskFactors || []).length === 0 && !a.metadata.isAIPlatform
      );

      if (noRiskAuto) {
        expect(noRiskAuto.riskLevel).toBe('low');
        expect(noRiskAuto.metadata.riskScore).toBe(30);
      }
    });
  });
});
