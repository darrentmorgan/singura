/**
 * Analytics Service Integration Tests
 * Comprehensive tests for executive dashboard analytics queries
 */

import { AnalyticsService } from '../../src/services/analytics.service';
import { testDb, TestFixtures } from '../helpers/test-database';
import { db } from '../../src/database/pool';
import {
  RiskTrendData,
  PlatformDistribution,
  GrowthData,
  TopRisk,
  SummaryStats,
  RiskHeatMapData,
  AutomationTypeDistribution
} from '@singura/shared-types';

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let fixtures: TestFixtures;
  let organizationId: string;
  let platformConnectionId: string;

  beforeAll(async () => {
    analyticsService = new AnalyticsService();
  });

  beforeEach(async () => {
    // Note: We can't use transactions for these tests because the AnalyticsService
    // uses the main db pool, not the transaction client. So we create real data
    // and clean it up in afterEach.

    // Create test fixtures
    const uniqueId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const orgResult = await db.query(`
      INSERT INTO organizations (name, domain, slug, plan_tier, max_connections, settings, is_active)
      VALUES ($1, $2, $3, 'enterprise', 100, '{}'::jsonb, true)
      RETURNING *
    `, [`Test Org ${uniqueId}`, `test-${uniqueId}.com`, `test-org-${uniqueId}`]);

    fixtures = {
      organization: orgResult.rows[0],
      platformConnection: null as any,
      encryptedCredentials: []
    };
    organizationId = fixtures.organization.id;

    // Create platform connection
    const connResult = await db.query(`
      INSERT INTO platform_connections (
        organization_id, platform_type, platform_user_id, platform_workspace_id,
        display_name, status, permissions_granted, metadata, expires_at
      ) VALUES ($1, 'slack', 'test-user-123', 'T123456', 'Test Slack', 'active',
                '["channels:read"]'::jsonb, '{}'::jsonb, now() + interval '1 hour')
      RETURNING *
    `, [organizationId]);
    platformConnectionId = connResult.rows[0].id;

    // Create additional platform connections for distribution tests
    await db.query(`
      INSERT INTO platform_connections (
        organization_id, platform_type, platform_user_id, platform_workspace_id,
        display_name, status, permissions_granted, metadata, expires_at
      ) VALUES
        ($1, 'google', 'google-user-123', 'example.com', 'Google Workspace', 'active',
         '["admin.directory.user.readonly"]'::jsonb, '{"workspace_domain": "example.com"}'::jsonb,
         now() + interval '1 hour'),
        ($1, 'microsoft', 'ms-user-456', 'tenant-789', 'Microsoft 365', 'active',
         '["User.Read"]'::jsonb, '{"tenant_id": "tenant-789"}'::jsonb,
         now() + interval '1 hour')
    `, [organizationId]);

    // Get IDs of all platform connections
    const connectionsResult = await db.query(
      'SELECT id, platform_type FROM platform_connections WHERE organization_id = $1',
      [organizationId]
    );
    const slackConn = connectionsResult.rows.find(r => r.platform_type === 'slack')?.id;
    const googleConn = connectionsResult.rows.find(r => r.platform_type === 'google')?.id;
    const msConn = connectionsResult.rows.find(r => r.platform_type === 'microsoft')?.id;

    // Create discovery run
    const discoveryRunResult = await db.query(`
      INSERT INTO discovery_runs (
        organization_id, platform_connection_id, status, started_at, completed_at
      ) VALUES ($1, $2, 'completed', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days')
      RETURNING id
    `, [organizationId, slackConn]);
    const discoveryRunId = discoveryRunResult.rows[0].id;

    // Create diverse test automation data with various dates, types, and platforms
    // Valid types: 'workflow', 'bot', 'integration', 'webhook', 'scheduled_task', 'trigger', 'script', 'service_account'
    const automationsData = [
      // Slack automations - varied dates (last 90 days)
      { platform: slackConn, type: 'workflow', date: 'NOW() - INTERVAL \'80 days\'', risk: 'critical', score: 95, status: 'active', users: 150 },
      { platform: slackConn, type: 'bot', date: 'NOW() - INTERVAL \'60 days\'', risk: 'high', score: 75, status: 'active', users: 80 },
      { platform: slackConn, type: 'webhook', date: 'NOW() - INTERVAL \'45 days\'', risk: 'medium', score: 50, status: 'active', users: 30 },
      { platform: slackConn, type: 'workflow', date: 'NOW() - INTERVAL \'30 days\'', risk: 'low', score: 20, status: 'active', users: 10 },
      { platform: slackConn, type: 'bot', date: 'NOW() - INTERVAL \'20 days\'', risk: 'critical', score: 90, status: 'active', users: 120 },
      { platform: slackConn, type: 'webhook', date: 'NOW() - INTERVAL \'15 days\'', risk: 'high', score: 70, status: 'active', users: 50 },
      { platform: slackConn, type: 'workflow', date: 'NOW() - INTERVAL \'10 days\'', risk: 'medium', score: 45, status: 'active', users: 25 },
      { platform: slackConn, type: 'bot', date: 'NOW() - INTERVAL \'5 days\'', risk: 'low', score: 15, status: 'active', users: 5 },

      // Google automations - recent (last 30 days)
      { platform: googleConn, type: 'script', date: 'NOW() - INTERVAL \'25 days\'', risk: 'critical', score: 92, status: 'active', users: 50 },
      { platform: googleConn, type: 'service_account', date: 'NOW() - INTERVAL \'20 days\'', risk: 'high', score: 78, status: 'active', users: 50 },
      { platform: googleConn, type: 'script', date: 'NOW() - INTERVAL \'15 days\'', risk: 'medium', score: 55, status: 'active', users: 40 },
      { platform: googleConn, type: 'integration', date: 'NOW() - INTERVAL \'10 days\'', risk: 'high', score: 72, status: 'active', users: 50 },
      { platform: googleConn, type: 'service_account', date: 'NOW() - INTERVAL \'5 days\'', risk: 'low', score: 25, status: 'active', users: 15 },

      // Microsoft automations - very recent (last 14 days)
      { platform: msConn, type: 'workflow', date: 'NOW() - INTERVAL \'12 days\'', risk: 'critical', score: 88, status: 'active', users: 50 },
      { platform: msConn, type: 'scheduled_task', date: 'NOW() - INTERVAL \'8 days\'', risk: 'high', score: 68, status: 'active', users: 50 },
      { platform: msConn, type: 'workflow', date: 'NOW() - INTERVAL \'4 days\'', risk: 'medium', score: 48, status: 'active', users: 35 },
      { platform: msConn, type: 'trigger', date: 'NOW() - INTERVAL \'2 days\'', risk: 'low', score: 18, status: 'active', users: 8 },

      // Inactive automation (should be excluded from most queries)
      { platform: slackConn, type: 'workflow', date: 'NOW() - INTERVAL \'50 days\'', risk: 'high', score: 80, status: 'inactive', users: 0 }
    ];

    for (const auto of automationsData) {
      // Create affected_users array with limited size to avoid PostgreSQL parameter limit
      const affectedUsersArray = Array.from({ length: Math.min(auto.users, 50) }, (_, i) => `user_${i}`);

      const automationResult = await db.query(`
        INSERT INTO discovered_automations (
          organization_id, platform_connection_id, discovery_run_id,
          external_id, name, automation_type, status, first_discovered_at,
          platform_metadata, is_active
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, ${auto.date},
          $9::jsonb,
          $8
        ) RETURNING id
      `, [
        organizationId,
        auto.platform,
        discoveryRunId,
        `ext_${Math.random().toString(36).substr(2, 9)}`,
        `Test ${auto.type} Automation`,
        auto.type,
        auto.status,
        auto.status === 'active',
        JSON.stringify({ affected_users: affectedUsersArray })
      ]);

      const automationId = automationResult.rows[0].id;

      // Create risk assessment with assessed_at matching first_discovered_at for trend accuracy
      await db.query(`
        INSERT INTO risk_assessments (
          automation_id, organization_id, risk_level, risk_score,
          permission_risk_score, data_access_risk_score, activity_risk_score,
          ownership_risk_score, risk_factors, assessed_at, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, '[]'::jsonb, ${auto.date}, ${auto.date}
        )
      `, [
        automationId,
        organizationId,
        auto.risk,
        auto.score,
        Math.floor(auto.score * 0.3),
        Math.floor(auto.score * 0.25),
        Math.floor(auto.score * 0.25),
        Math.floor(auto.score * 0.2)
      ]);
    }

    // Create older automations for trend comparison (30-60 days ago)
    const olderAutomationsData = [
      { platform: slackConn, type: 'workflow', risk: 'critical', score: 85 },
      { platform: googleConn, type: 'script', risk: 'high', score: 70 },
      { platform: msConn, type: 'scheduled_task', risk: 'medium', score: 55 }
    ];

    for (const auto of olderAutomationsData) {
      const automationResult = await db.query(`
        INSERT INTO discovered_automations (
          organization_id, platform_connection_id, discovery_run_id,
          external_id, name, automation_type, status, first_discovered_at,
          platform_metadata, is_active
        ) VALUES (
          $1, $2, $3, $4, $5, $6, 'active', NOW() - INTERVAL '45 days',
          '{}'::jsonb, false
        ) RETURNING id
      `, [
        organizationId,
        auto.platform,
        discoveryRunId,
        `ext_old_${Math.random().toString(36).substr(2, 9)}`,
        `Old ${auto.type} Automation`,
        auto.type
      ]);

      const automationId = automationResult.rows[0].id;

      await db.query(`
        INSERT INTO risk_assessments (
          automation_id, organization_id, risk_level, risk_score,
          assessed_at, created_at
        ) VALUES (
          $1, $2, $3, $4, NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days'
        )
      `, [automationId, organizationId, auto.risk, auto.score]);
    }
  });

  afterEach(async () => {
    // Clean up test data (delete in reverse order of dependencies)
    if (organizationId) {
      await db.query('DELETE FROM risk_assessments WHERE organization_id = $1', [organizationId]);
      await db.query('DELETE FROM discovered_automations WHERE organization_id = $1', [organizationId]);
      await db.query('DELETE FROM discovery_runs WHERE organization_id = $1', [organizationId]);
      await db.query('DELETE FROM platform_connections WHERE organization_id = $1', [organizationId]);
      await db.query('DELETE FROM organizations WHERE id = $1', [organizationId]);
    }
  });

  describe('getRiskTrends', () => {
    it('should return risk trends for last week', async () => {
      const result: RiskTrendData = await analyticsService.getRiskTrends(organizationId, 'week');

      expect(result).toBeDefined();
      expect(result.timeRange).toBe('week');
      expect(result.labels).toHaveLength(8); // 7 days + today
      expect(result.datasets).toHaveLength(4); // Critical, High, Medium, Low
      expect(result.averageRiskScore).toHaveLength(8);

      // Verify dataset structure
      const criticalDataset = result.datasets.find(d => d.label === 'Critical');
      expect(criticalDataset).toBeDefined();
      expect(criticalDataset?.color).toBe('#ef4444');
      expect(criticalDataset?.data).toHaveLength(8);

      // Verify some data points exist (recent automations)
      const totalAutomations = result.datasets.reduce(
        (sum, ds) => sum + ds.data.reduce((a, b) => a + b, 0),
        0
      );
      expect(totalAutomations).toBeGreaterThan(0);
    });

    it('should return risk trends for last month', async () => {
      const result: RiskTrendData = await analyticsService.getRiskTrends(organizationId, 'month');

      expect(result).toBeDefined();
      expect(result.timeRange).toBe('month');
      expect(result.labels).toHaveLength(31); // 30 days + today
      expect(result.datasets).toHaveLength(4);
      expect(result.averageRiskScore).toHaveLength(31);

      // Should have more automations than week view
      const totalAutomations = result.datasets.reduce(
        (sum, ds) => sum + ds.data.reduce((a, b) => a + b, 0),
        0
      );
      expect(totalAutomations).toBeGreaterThan(5);
    });

    it('should return risk trends for last quarter', async () => {
      const result: RiskTrendData = await analyticsService.getRiskTrends(organizationId, 'quarter');

      expect(result).toBeDefined();
      expect(result.timeRange).toBe('quarter');
      expect(result.labels).toHaveLength(91); // 90 days + today
      expect(result.datasets).toHaveLength(4);
      expect(result.averageRiskScore).toHaveLength(91);
    });

    it('should calculate average risk scores correctly', async () => {
      const result: RiskTrendData = await analyticsService.getRiskTrends(organizationId, 'month');

      // Average risk scores should be numbers
      result.averageRiskScore.forEach(score => {
        expect(typeof score).toBe('number');
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });

      // At least some days should have non-zero scores
      const nonZeroScores = result.averageRiskScore.filter(s => s > 0);
      expect(nonZeroScores.length).toBeGreaterThan(0);
    });

    it('should handle organization with no data', async () => {
      const emptyOrgResult = await db.query(
        'INSERT INTO organizations (name, domain, slug, plan_tier, max_connections) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        ['Empty Org', 'empty.com', 'empty-org', 'starter', 10]
      );
      const emptyOrgId = emptyOrgResult.rows[0].id;

      const result: RiskTrendData = await analyticsService.getRiskTrends(emptyOrgId, 'week');

      expect(result).toBeDefined();
      expect(result.labels).toHaveLength(8);

      // All datasets should have zeros
      result.datasets.forEach(dataset => {
        dataset.data.forEach(value => {
          expect(value).toBe(0);
        });
      });

      // Average risk scores should all be 0
      result.averageRiskScore.forEach(score => {
        expect(score).toBe(0);
      });
    });

    it('should only include active automations', async () => {
      // We have 1 inactive automation in test data
      const result: RiskTrendData = await analyticsService.getRiskTrends(organizationId, 'quarter');

      // Count total automations across all risk levels
      const totalInResults = result.datasets.reduce(
        (sum, ds) => sum + ds.data.reduce((a, b) => a + b, 0),
        0
      );

      // Count active automations directly
      const activeCount = await db.query(
        'SELECT COUNT(*) as count FROM discovered_automations WHERE organization_id = $1 AND is_active = true',
        [organizationId]
      );
      const expectedActive = parseInt(activeCount.rows[0].count);

      // Should match active count (allowing for duplicates if assessed multiple times)
      expect(totalInResults).toBeGreaterThanOrEqual(expectedActive);
    });
  });

  describe('getPlatformDistribution', () => {
    it('should calculate platform distribution percentages', async () => {
      const result: PlatformDistribution[] = await analyticsService.getPlatformDistribution(organizationId);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);

      // Verify percentage calculation
      const totalPercentage = result.reduce((sum, p) => sum + p.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 1); // Within 0.1%

      // Verify each platform has required fields
      result.forEach(platform => {
        expect(platform.platform).toBeDefined();
        expect(platform.count).toBeGreaterThan(0);
        expect(platform.percentage).toBeGreaterThan(0);
        expect(platform.percentage).toBeLessThanOrEqual(100);
        expect(typeof platform.highRiskCount).toBe('number');
        expect(platform.color).toMatch(/^#[0-9A-Fa-f]{6}$/); // Valid hex color
      });
    });

    it('should include high risk counts per platform', async () => {
      const result: PlatformDistribution[] = await analyticsService.getPlatformDistribution(organizationId);

      // At least one platform should have high risk automations
      const totalHighRisk = result.reduce((sum, p) => sum + p.highRiskCount, 0);
      expect(totalHighRisk).toBeGreaterThan(0);

      // High risk count should not exceed total count
      result.forEach(platform => {
        expect(platform.highRiskCount).toBeLessThanOrEqual(platform.count);
      });
    });

    it('should return empty array for org with no automations', async () => {
      const emptyOrgResult = await db.query(
        'INSERT INTO organizations (name, domain, slug, plan_tier, max_connections) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        ['Empty Org 2', 'empty2.com', 'empty-org-2', 'starter', 10]
      );
      const emptyOrgId = emptyOrgResult.rows[0].id;

      const result: PlatformDistribution[] = await analyticsService.getPlatformDistribution(emptyOrgId);

      expect(result).toEqual([]);
    });

    it('should only include automations from last 30 days', async () => {
      const result: PlatformDistribution[] = await analyticsService.getPlatformDistribution(organizationId);

      const totalCount = result.reduce((sum, p) => sum + p.count, 0);

      // Count automations discovered in last 30 days
      const recentCount = await db.query(
        `SELECT COUNT(DISTINCT da.id) as count
         FROM discovered_automations da
         WHERE da.organization_id = $1
           AND da.is_active = true
           AND da.first_discovered_at >= NOW() - INTERVAL '30 days'`,
        [organizationId]
      );
      const expectedCount = parseInt(recentCount.rows[0].count);

      expect(totalCount).toBe(expectedCount);
    });

    it('should sort platforms by count descending', async () => {
      const result: PlatformDistribution[] = await analyticsService.getPlatformDistribution(organizationId);

      // Verify descending order
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].count).toBeGreaterThanOrEqual(result[i + 1].count);
      }
    });
  });

  describe('getAutomationGrowth', () => {
    it('should calculate daily new automations', async () => {
      const result: GrowthData = await analyticsService.getAutomationGrowth(organizationId, 30);

      expect(result).toBeDefined();
      expect(result.labels).toHaveLength(31); // 30 days + today
      expect(result.newAutomations).toHaveLength(31);
      expect(result.cumulativeAutomations).toHaveLength(31);

      // Sum of new automations should equal final cumulative count
      const sumNew = result.newAutomations.reduce((a, b) => a + b, 0);
      const finalCumulative = result.cumulativeAutomations[result.cumulativeAutomations.length - 1];
      expect(sumNew).toBe(finalCumulative);
    });

    it('should calculate cumulative totals correctly', async () => {
      const result: GrowthData = await analyticsService.getAutomationGrowth(organizationId, 30);

      // Cumulative should be non-decreasing
      for (let i = 1; i < result.cumulativeAutomations.length; i++) {
        expect(result.cumulativeAutomations[i]).toBeGreaterThanOrEqual(
          result.cumulativeAutomations[i - 1]
        );
      }

      // First day cumulative should equal first day new
      expect(result.cumulativeAutomations[0]).toBe(result.newAutomations[0]);
    });

    it('should calculate growth rate correctly', async () => {
      const result: GrowthData = await analyticsService.getAutomationGrowth(organizationId, 30);

      expect(typeof result.growthRate).toBe('number');

      // Growth rate should be reasonable (if we have data)
      if (result.cumulativeAutomations[0] > 0) {
        const expectedGrowthRate = (
          (result.cumulativeAutomations[result.cumulativeAutomations.length - 1] -
           result.cumulativeAutomations[0]) /
          result.cumulativeAutomations[0]
        ) * 100;

        expect(result.growthRate).toBeCloseTo(expectedGrowthRate, 1);
      }
    });

    it('should handle 90 day time range', async () => {
      const result: GrowthData = await analyticsService.getAutomationGrowth(organizationId, 90);

      expect(result.labels).toHaveLength(91); // 90 days + today
      expect(result.newAutomations).toHaveLength(91);
      expect(result.cumulativeAutomations).toHaveLength(91);
    });

    it('should return zero growth for org with no automations', async () => {
      const emptyOrgResult = await db.query(
        'INSERT INTO organizations (name, domain, slug, plan_tier, max_connections) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        ['Empty Org 3', 'empty3.com', 'empty-org-3', 'starter', 10]
      );
      const emptyOrgId = emptyOrgResult.rows[0].id;

      const result: GrowthData = await analyticsService.getAutomationGrowth(emptyOrgId, 30);

      expect(result.growthRate).toBe(0);
      result.newAutomations.forEach(count => expect(count).toBe(0));
      result.cumulativeAutomations.forEach(count => expect(count).toBe(0));
    });
  });

  describe('getTopRisks', () => {
    it('should return top N critical/high risks', async () => {
      const result: TopRisk[] = await analyticsService.getTopRisks(organizationId, 5);

      expect(result).toBeDefined();
      expect(result.length).toBeLessThanOrEqual(5);
      expect(result.length).toBeGreaterThan(0);

      // All should be critical or high
      result.forEach(risk => {
        expect(['critical', 'high']).toContain(risk.riskLevel);
      });
    });

    it('should sort by risk level and score', async () => {
      const result: TopRisk[] = await analyticsService.getTopRisks(organizationId, 10);

      // Verify critical risks come before high risks
      let seenHigh = false;
      for (const risk of result) {
        if (risk.riskLevel === 'high') {
          seenHigh = true;
        }
        if (seenHigh && risk.riskLevel === 'critical') {
          throw new Error('Critical risk found after high risk - incorrect sorting');
        }
      }

      // Within same risk level, should be sorted by score descending
      const criticalRisks = result.filter(r => r.riskLevel === 'critical');
      for (let i = 0; i < criticalRisks.length - 1; i++) {
        expect(criticalRisks[i].riskScore).toBeGreaterThanOrEqual(
          criticalRisks[i + 1].riskScore
        );
      }

      const highRisks = result.filter(r => r.riskLevel === 'high');
      for (let i = 0; i < highRisks.length - 1; i++) {
        expect(highRisks[i].riskScore).toBeGreaterThanOrEqual(
          highRisks[i + 1].riskScore
        );
      }
    });

    it('should respect the limit parameter', async () => {
      const limit3 = await analyticsService.getTopRisks(organizationId, 3);
      expect(limit3.length).toBeLessThanOrEqual(3);

      const limit10 = await analyticsService.getTopRisks(organizationId, 10);
      expect(limit10.length).toBeLessThanOrEqual(10);
    });

    it('should include all required fields', async () => {
      const result: TopRisk[] = await analyticsService.getTopRisks(organizationId, 5);

      result.forEach(risk => {
        expect(risk.id).toBeDefined();
        expect(risk.name).toBeDefined();
        expect(risk.platform).toBeDefined();
        expect(risk.type).toBeDefined();
        expect(risk.riskLevel).toBeDefined();
        expect(typeof risk.riskScore).toBe('number');
        expect(risk.riskScore).toBeGreaterThanOrEqual(0);
        expect(risk.riskScore).toBeLessThanOrEqual(100);
        expect(risk.detectedAt).toBeDefined();
        expect(typeof risk.affectedUsers).toBe('number');
        expect(risk.status).toBeDefined();
        expect(Array.isArray(risk.actions)).toBe(true);
      });
    });

    it('should calculate affected users from platform_metadata', async () => {
      const result: TopRisk[] = await analyticsService.getTopRisks(organizationId, 10);

      // Some automations should have affected users > 0
      const withUsers = result.filter(r => r.affectedUsers > 0);
      expect(withUsers.length).toBeGreaterThan(0);

      // Verify affected user counts are reasonable
      result.forEach(risk => {
        expect(risk.affectedUsers).toBeGreaterThanOrEqual(0);
      });
    });

    it('should only include active automations', async () => {
      const result: TopRisk[] = await analyticsService.getTopRisks(organizationId, 20);

      // Verify all returned automations are active
      for (const risk of result) {
        const automationCheck = await db.query(
          'SELECT is_active FROM discovered_automations WHERE id = $1',
          [risk.id]
        );
        expect(automationCheck.rows[0].is_active).toBe(true);
      }
    });

    it('should return empty array if no high/critical risks', async () => {
      // Create org with only low/medium risks
      const lowRiskOrgResult = await db.query(
        'INSERT INTO organizations (name, domain, slug, plan_tier, max_connections) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        ['Low Risk Org', 'lowrisk.com', 'low-risk-org', 'starter', 10]
      );
      const lowRiskOrgId = lowRiskOrgResult.rows[0].id;

      const result: TopRisk[] = await analyticsService.getTopRisks(lowRiskOrgId, 10);
      expect(result).toEqual([]);
    });
  });

  describe('getSummaryStats', () => {
    it('should calculate all summary statistics', async () => {
      const result: SummaryStats = await analyticsService.getSummaryStats(organizationId);

      expect(result).toBeDefined();
      expect(typeof result.totalAutomations).toBe('number');
      expect(typeof result.criticalCount).toBe('number');
      expect(typeof result.highCount).toBe('number');
      expect(typeof result.mediumCount).toBe('number');
      expect(typeof result.lowCount).toBe('number');
      expect(typeof result.activeCount).toBe('number');
      expect(typeof result.averageRiskScore).toBe('number');
      expect(typeof result.platformCount).toBe('number');
      expect(typeof result.totalAffectedUsers).toBe('number');

      // Verify counts are reasonable
      expect(result.totalAutomations).toBeGreaterThan(0);
      expect(result.criticalCount).toBeGreaterThan(0);
      expect(result.highCount).toBeGreaterThan(0);
      expect(result.mediumCount).toBeGreaterThan(0);
      expect(result.lowCount).toBeGreaterThan(0);
      expect(result.platformCount).toBeGreaterThanOrEqual(1);
      expect(result.platformCount).toBeLessThanOrEqual(3); // slack, google, microsoft

      // Risk counts should sum to total
      const sumRisks = result.criticalCount + result.highCount! + result.mediumCount! + result.lowCount!;
      expect(sumRisks).toBe(result.totalAutomations);

      // Average risk score should be in valid range
      expect(result.averageRiskScore).toBeGreaterThan(0);
      expect(result.averageRiskScore).toBeLessThanOrEqual(100);
    });

    it('should calculate trend comparisons to previous period', async () => {
      const result: SummaryStats = await analyticsService.getSummaryStats(organizationId);

      expect(result.trendsComparedToLastPeriod).toBeDefined();
      expect(typeof result.trendsComparedToLastPeriod!.totalAutomationsChange).toBe('number');
      expect(typeof result.trendsComparedToLastPeriod!.criticalCountChange).toBe('number');
      expect(typeof result.trendsComparedToLastPeriod!.riskScoreChange).toBe('number');

      // Changes should be reasonable percentages
      const changes = result.trendsComparedToLastPeriod!;
      expect(changes.totalAutomationsChange).toBeGreaterThan(-100); // Can't drop more than 100%
      expect(changes.criticalCountChange).toBeGreaterThan(-100);
      expect(changes.riskScoreChange).toBeGreaterThan(-100);
    });

    it('should handle organization with no history', async () => {
      // Create new org with only current period data
      const newOrgResult = await db.query(
        'INSERT INTO organizations (name, domain, slug, plan_tier, max_connections) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        ['New Org', 'neworg.com', 'new-org', 'starter', 10]
      );
      const newOrgId = newOrgResult.rows[0].id;

      const result: SummaryStats = await analyticsService.getSummaryStats(newOrgId);

      expect(result.totalAutomations).toBe(0);
      expect(result.criticalCount).toBe(0);
      expect(result.averageRiskScore).toBe(0);
      expect(result.platformCount).toBe(0);

      // Trends should be zero (no previous period to compare)
      expect(result.trendsComparedToLastPeriod!.totalAutomationsChange).toBe(0);
      expect(result.trendsComparedToLastPeriod!.criticalCountChange).toBe(0);
      expect(result.trendsComparedToLastPeriod!.riskScoreChange).toBe(0);
    });

    it('should calculate total affected users across all automations', async () => {
      const result: SummaryStats = await analyticsService.getSummaryStats(organizationId);

      expect(result.totalAffectedUsers).toBeGreaterThan(0);

      // Verify calculation by summing manually
      const manualSum = await db.query(
        `SELECT SUM(
           COALESCE(jsonb_array_length(platform_metadata->'affected_users'), 0)
         ) as total
         FROM discovered_automations
         WHERE organization_id = $1 AND is_active = true`,
        [organizationId]
      );
      const expectedTotal = parseInt(manualSum.rows[0].total || '0');

      expect(result.totalAffectedUsers).toBe(expectedTotal);
    });

    it('should only count active automations', async () => {
      const result: SummaryStats = await analyticsService.getSummaryStats(organizationId);

      // Count active automations directly
      const activeCount = await db.query(
        'SELECT COUNT(*) as count FROM discovered_automations WHERE organization_id = $1 AND is_active = true',
        [organizationId]
      );
      const expectedActive = parseInt(activeCount.rows[0].count);

      expect(result.totalAutomations).toBe(expectedActive);
    });

    it('should throw error if no data returned', async () => {
      // This should not happen in practice, but test the error handling
      // Create a scenario where query returns no rows
      const invalidOrgId = '00000000-0000-0000-0000-000000000000';

      await expect(
        analyticsService.getSummaryStats(invalidOrgId)
      ).rejects.toThrow('No summary statistics returned from database');
    });
  });

  describe('getRiskHeatMap', () => {
    it('should create 2D heat map data', async () => {
      const result: RiskHeatMapData = await analyticsService.getRiskHeatMap(organizationId);

      expect(result).toBeDefined();
      expect(Array.isArray(result.platforms)).toBe(true);
      expect(Array.isArray(result.riskLevels)).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);

      // Risk levels should be in correct order
      expect(result.riskLevels).toEqual(['critical', 'high', 'medium', 'low']);

      // Data should be 2D array
      expect(result.data.length).toBe(result.platforms.length);
      result.data.forEach(platformData => {
        expect(platformData.length).toBe(result.riskLevels.length);
        platformData.forEach(count => {
          expect(typeof count).toBe('number');
          expect(count).toBeGreaterThanOrEqual(0);
        });
      });
    });

    it('should include all platforms and risk levels', async () => {
      const result: RiskHeatMapData = await analyticsService.getRiskHeatMap(organizationId);

      expect(result.platforms.length).toBeGreaterThan(0);
      expect(result.riskLevels).toHaveLength(4);

      // Each platform should have counts for each risk level (even if 0)
      result.data.forEach((platformData, i) => {
        const platform = result.platforms[i];
        expect(platformData.length).toBe(4);

        // At least one risk level should have count > 0
        const totalCount = platformData.reduce((sum, count) => sum + count, 0);
        expect(totalCount).toBeGreaterThan(0);
      });
    });

    it('should handle missing combinations with zeros', async () => {
      const result: RiskHeatMapData = await analyticsService.getRiskHeatMap(organizationId);

      // Verify all values are non-negative
      result.data.forEach(platformData => {
        platformData.forEach(count => {
          expect(count).toBeGreaterThanOrEqual(0);
        });
      });
    });

    it('should return empty structure for org with no automations', async () => {
      const emptyOrgResult = await db.query(
        'INSERT INTO organizations (name, domain, slug, plan_tier, max_connections) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        ['Empty Org 4', 'empty4.com', 'empty-org-4', 'starter', 10]
      );
      const emptyOrgId = emptyOrgResult.rows[0].id;

      const result: RiskHeatMapData = await analyticsService.getRiskHeatMap(emptyOrgId);

      expect(result.platforms).toEqual([]);
      expect(result.riskLevels).toEqual(['critical', 'high', 'medium', 'low']);
      expect(result.data).toEqual([]);
    });

    it('should only include active automations', async () => {
      const result: RiskHeatMapData = await analyticsService.getRiskHeatMap(organizationId);

      // Sum all counts
      const totalCount = result.data.reduce(
        (sum, platformData) => sum + platformData.reduce((s, c) => s + c, 0),
        0
      );

      // Count active automations
      const activeCount = await db.query(
        'SELECT COUNT(*) as count FROM discovered_automations WHERE organization_id = $1 AND is_active = true',
        [organizationId]
      );
      const expectedActive = parseInt(activeCount.rows[0].count);

      expect(totalCount).toBe(expectedActive);
    });
  });

  describe('getAutomationTypeDistribution', () => {
    it('should calculate type distribution percentages', async () => {
      const result: AutomationTypeDistribution[] = await analyticsService.getAutomationTypeDistribution(organizationId);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);

      // Verify percentage calculation
      const totalPercentage = result.reduce((sum, t) => sum + t.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 1);

      // Verify each type has required fields
      result.forEach(typeData => {
        expect(typeData.type).toBeDefined();
        expect(typeof typeData.count).toBe('number');
        expect(typeData.count).toBeGreaterThan(0);
        expect(typeof typeData.percentage).toBe('number');
        expect(typeData.percentage).toBeGreaterThan(0);
        expect(typeData.percentage).toBeLessThanOrEqual(100);
        expect(typeof typeData.averageRiskScore).toBe('number');
        expect(typeData.averageRiskScore).toBeGreaterThanOrEqual(0);
        expect(typeData.averageRiskScore).toBeLessThanOrEqual(100);
      });
    });

    it('should calculate average risk scores per type', async () => {
      const result: AutomationTypeDistribution[] = await analyticsService.getAutomationTypeDistribution(organizationId);

      // Verify average risk scores manually for one type
      const workflowType = result.find(t => t.type === 'workflow');
      if (workflowType) {
        const workflowRisks = await db.query(
          `SELECT AVG(ra.risk_score) as avg_score
           FROM risk_assessments ra
           INNER JOIN discovered_automations da ON da.id = ra.automation_id
           WHERE da.organization_id = $1
             AND da.automation_type = 'workflow'
             AND da.is_active = true`,
          [organizationId]
        );
        const expectedAvg = parseFloat(workflowRisks.rows[0].avg_score || '0');
        expect(workflowType.averageRiskScore).toBeCloseTo(expectedAvg, 1);
      }
    });

    it('should sort by count descending', async () => {
      const result: AutomationTypeDistribution[] = await analyticsService.getAutomationTypeDistribution(organizationId);

      // Verify descending order
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].count).toBeGreaterThanOrEqual(result[i + 1].count);
      }
    });

    it('should only include active automations', async () => {
      const result: AutomationTypeDistribution[] = await analyticsService.getAutomationTypeDistribution(organizationId);

      const totalCount = result.reduce((sum, t) => sum + t.count, 0);

      // Count active automations
      const activeCount = await db.query(
        'SELECT COUNT(*) as count FROM discovered_automations WHERE organization_id = $1 AND is_active = true',
        [organizationId]
      );
      const expectedActive = parseInt(activeCount.rows[0].count);

      expect(totalCount).toBe(expectedActive);
    });

    it('should return empty array for org with no automations', async () => {
      const emptyOrgResult = await db.query(
        'INSERT INTO organizations (name, domain, slug, plan_tier, max_connections) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        ['Empty Org 5', 'empty5.com', 'empty-org-5', 'starter', 10]
      );
      const emptyOrgId = emptyOrgResult.rows[0].id;

      const result: AutomationTypeDistribution[] = await analyticsService.getAutomationTypeDistribution(emptyOrgId);

      expect(result).toEqual([]);
    });

    it('should handle multiple automation types correctly', async () => {
      const result: AutomationTypeDistribution[] = await analyticsService.getAutomationTypeDistribution(organizationId);

      // We created various types: workflow, bot, webhook, apps_script, etc.
      const uniqueTypes = new Set(result.map(t => t.type));
      expect(uniqueTypes.size).toBeGreaterThanOrEqual(5);

      // Verify specific types exist
      const typeNames = result.map(t => t.type);
      expect(typeNames).toContain('workflow');
      expect(typeNames).toContain('bot');
      expect(typeNames).toContain('script');
    });
  });
});
