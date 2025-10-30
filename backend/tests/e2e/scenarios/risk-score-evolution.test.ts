/**
 * E2E Test: Risk Score Evolution Over Time
 *
 * Tests how risk scores change over time based on behavioral changes,
 * manual reviews, and detection updates.
 *
 * Scenarios:
 * 1. Risk score increases when automation exhibits suspicious behavior
 * 2. Risk score decreases when false positive is confirmed
 * 3. Risk score evolution tracking in database
 * 4. Risk score recalculation triggers
 * 5. Historical risk analysis and trends
 */

import { testDb, TestFixtures } from '../../helpers/test-database';
import crypto from 'crypto';

describe('E2E: Risk Score Evolution Over Time', () => {
  let fixtures: TestFixtures;

  beforeAll(async () => {
    await testDb.beginTransaction();
    fixtures = await testDb.createFixtures();
  });

  afterAll(async () => {
    await testDb.rollbackTransaction();
  });

  describe('Risk Score Increases', () => {
    it('should increase risk score when automation exhibits suspicious behavior', async () => {
      // Create automation with initial moderate risk
      const automationId = crypto.randomUUID();
      await testDb.query(`
        INSERT INTO discovered_automations (
          id, organization_id, platform_connection_id, discovery_run_id,
          external_id, name, automation_type, risk_score_history
        ) VALUES (
          $1, $2, $3, $4, -- discovery_run_id
          'bot-evolving-123', 'Data Sync Bot', 'bot',
          $5::jsonb
        )
      `, [
        automationId,
        fixtures.organization.id,
        fixtures.platformConnection.id,
        fixtures.discoveryRun.id,
        JSON.stringify([{
          timestamp: new Date(Date.now() - 7 * 24 * 3600000).toISOString(), // 7 days ago
          score: 45,
          level: 'medium',
          factors: [
            { type: 'data_access', score: 25, description: 'Standard data access' },
            { type: 'activity', score: 20, description: 'Normal activity pattern' }
          ],
          trigger: 'initial_discovery'
        }])
      ]);

      // Simulate suspicious activity detected (velocity spike)
      await testDb.query(`
        SELECT append_risk_score_history(
          $1::uuid,
          72,
          'high',
          $2::jsonb,
          'activity_spike'
        )
      `, [
        automationId,
        JSON.stringify([
          { type: 'data_access', score: 25, description: 'Standard data access' },
          { type: 'activity', score: 47, description: 'Activity spike detected - 300% increase' }
        ])
      ]);

      // Verify risk score increased
      const automation = await testDb.query(`
        SELECT id, name,
               jsonb_array_length(risk_score_history) as history_length,
               risk_score_history->0->>'score' as initial_score,
               risk_score_history->-1->>'score' as current_score,
               risk_score_history->-1->>'trigger' as trigger_reason
        FROM discovered_automations
        WHERE id = $1
      `, [automationId]);

      expect(automation.rows[0].history_length).toBe(2);
      expect(parseInt(automation.rows[0].initial_score)).toBe(45);
      expect(parseInt(automation.rows[0].current_score)).toBe(72);
      expect(automation.rows[0].trigger_reason).toBe('activity_spike');

      // Verify score increased by at least 20 points
      const scoreIncrease = parseInt(automation.rows[0].current_score) -
                           parseInt(automation.rows[0].initial_score);
      expect(scoreIncrease).toBeGreaterThanOrEqual(20);
    });

    it('should increase risk score on permission escalation', async () => {
      const automationId = crypto.randomUUID();
      await testDb.query(`
        INSERT INTO discovered_automations (
          id, organization_id, platform_connection_id, discovery_run_id,
          external_id, name, automation_type, risk_score_history
        ) VALUES (
          $1, $2, $3, $4, -- discovery_run_id
          'script-perm-change', 'Report Generator', 'script',
          $5::jsonb
        )
      `, [
        automationId,
        fixtures.organization.id,
        fixtures.platformConnection.id,
        fixtures.discoveryRun.id,
        JSON.stringify([{
          timestamp: new Date(Date.now() - 3 * 24 * 3600000).toISOString(), // 3 days ago
          score: 35,
          level: 'low',
          factors: [
            { type: 'permissions', score: 15, description: 'Read-only access' },
            { type: 'data_access', score: 20, description: 'Limited data scope' }
          ],
          trigger: 'initial_discovery'
        }])
      ]);

      // Simulate permission escalation (read-only → read-write + delete)
      await testDb.query(`
        SELECT append_risk_score_history(
          $1::uuid,
          68,
          'medium',
          $2::jsonb,
          'permission_change'
        )
      `, [
        automationId,
        JSON.stringify([
          { type: 'permissions', score: 48, description: 'Permission escalation: added write + delete' },
          { type: 'data_access', score: 20, description: 'Limited data scope' }
        ])
      ]);

      const automation = await testDb.query(`
        SELECT risk_score_history->0->>'score' as initial_score,
               risk_score_history->-1->>'score' as current_score,
               risk_score_history->-1->'factors'->0->>'description' as permission_change
        FROM discovered_automations
        WHERE id = $1
      `, [automationId]);

      expect(parseInt(automation.rows[0].current_score)).toBe(68);
      expect(automation.rows[0].permission_change).toContain('Permission escalation');
    });

    it('should increase risk score on external connection detection', async () => {
      const automationId = crypto.randomUUID();
      await testDb.query(`
        INSERT INTO discovered_automations (
          id, organization_id, platform_connection_id, discovery_run_id,
          external_id, name, automation_type, risk_score_history
        ) VALUES (
          $1, $2, $3, $4, -- discovery_run_id
          'bot-external', 'Notification Bot', 'bot',
          $5::jsonb
        )
      `, [
        automationId,
        fixtures.organization.id,
        fixtures.platformConnection.id,
        fixtures.discoveryRun.id,
        JSON.stringify([{
          timestamp: new Date(Date.now() - 1 * 24 * 3600000).toISOString(), // 1 day ago
          score: 28,
          level: 'low',
          factors: [
            { type: 'external_api', score: 0, description: 'No external connections' },
            { type: 'activity', score: 28, description: 'Standard notifications' }
          ],
          trigger: 'initial_discovery'
        }])
      ]);

      // External connection detected
      await testDb.query(`
        SELECT append_risk_score_history(
          $1::uuid,
          61,
          'medium',
          $2::jsonb,
          'detector_update'
        )
      `, [
        automationId,
        JSON.stringify([
          { type: 'external_api', score: 33, description: 'External connection to unknown-service.com' },
          { type: 'activity', score: 28, description: 'Standard notifications' }
        ])
      ]);

      const automation = await testDb.query(`
        SELECT risk_score_history->-1->>'score' as current_score
        FROM discovered_automations
        WHERE id = $1
      `, [automationId]);

      expect(parseInt(automation.rows[0].current_score)).toBe(61);
    });
  });

  describe('Risk Score Decreases', () => {
    it('should decrease risk score when false positive is confirmed', async () => {
      // Create automation flagged as high risk
      const automationId = crypto.randomUUID();
      await testDb.query(`
        INSERT INTO discovered_automations (
          id, organization_id, platform_connection_id, discovery_run_id,
          external_id, name, automation_type, risk_score_history
        ) VALUES (
          $1, $2, $3, $4, -- discovery_run_id
          'bot-false-positive', 'CI/CD Bot', 'bot',
          $5::jsonb
        )
      `, [
        automationId,
        fixtures.organization.id,
        fixtures.platformConnection.id,
        fixtures.discoveryRun.id,
        JSON.stringify([{
          timestamp: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
          score: 78,
          level: 'high',
          factors: [
            { type: 'ai_provider', score: 40, description: 'OpenAI integration detected' },
            { type: 'velocity', score: 38, description: 'High velocity pattern' }
          ],
          trigger: 'initial_discovery'
        }])
      ]);

      // Manual review confirms it's legitimate CI/CD integration
      await testDb.query(`
        SELECT append_risk_score_history(
          $1::uuid,
          22,
          'low',
          $2::jsonb,
          'manual_reassessment'
        )
      `, [
        automationId,
        JSON.stringify([
          { type: 'verified_integration', score: -30, description: 'Confirmed legitimate CI/CD bot' },
          { type: 'ai_provider', score: 20, description: 'OpenAI used for code review (legitimate)' },
          { type: 'velocity', score: 10, description: 'High velocity expected for CI/CD' }
        ])
      ]);

      const automation = await testDb.query(`
        SELECT risk_score_history->0->>'score' as initial_score,
               risk_score_history->-1->>'score' as current_score,
               risk_score_history->-1->>'level' as current_level,
               risk_score_history->-1->>'trigger' as trigger_reason
        FROM discovered_automations
        WHERE id = $1
      `, [automationId]);

      expect(parseInt(automation.rows[0].initial_score)).toBe(78);
      expect(parseInt(automation.rows[0].current_score)).toBe(22);
      expect(automation.rows[0].current_level).toBe('low');
      expect(automation.rows[0].trigger_reason).toBe('manual_reassessment');

      // Score decreased by more than 50 points
      const scoreDecrease = parseInt(automation.rows[0].initial_score) -
                           parseInt(automation.rows[0].current_score);
      expect(scoreDecrease).toBeGreaterThan(50);
    });

    it('should decrease risk score when automation is whitelisted', async () => {
      const automationId = crypto.randomUUID();
      await testDb.query(`
        INSERT INTO discovered_automations (
          id, organization_id, platform_connection_id, discovery_run_id,
          external_id, name, automation_type, risk_score_history
        ) VALUES (
          $1, $2, $3, $4, -- discovery_run_id
          'bot-whitelist', 'Monitoring Bot', 'bot',
          $5::jsonb
        )
      `, [
        automationId,
        fixtures.organization.id,
        fixtures.platformConnection.id,
        fixtures.discoveryRun.id,
        JSON.stringify([{
          timestamp: new Date(Date.now() - 5 * 24 * 3600000).toISOString(),
          score: 54,
          level: 'medium',
          factors: [
            { type: 'data_access', score: 30 },
            { type: 'activity', score: 24 }
          ],
          trigger: 'initial_discovery'
        }])
      ]);

      // Whitelisted by security team
      await testDb.query(`
        SELECT append_risk_score_history(
          $1::uuid,
          15,
          'low',
          $2::jsonb,
          'manual_reassessment'
        )
      `, [
        automationId,
        JSON.stringify([
          { type: 'whitelisted', score: -40, description: 'Approved by security team' },
          { type: 'data_access', score: 30 },
          { type: 'activity', score: 24 }
        ])
      ]);

      const automation = await testDb.query(`
        SELECT risk_score_history->-1->>'score' as current_score,
               risk_score_history->-1->'factors'->0->>'type' as whitelist_factor
        FROM discovered_automations
        WHERE id = $1
      `, [automationId]);

      expect(parseInt(automation.rows[0].current_score)).toBe(15);
      expect(automation.rows[0].whitelist_factor).toBe('whitelisted');
    });
  });

  describe('Risk Score History Tracking', () => {
    it('should track complete risk score history', async () => {
      const automationId = crypto.randomUUID();
      const now = Date.now();

      // Create automation with 5 risk score changes over time
      const riskHistory = [
        {
          timestamp: new Date(now - 30 * 24 * 3600000).toISOString(), // 30 days ago
          score: 35,
          level: 'low',
          factors: [{ type: 'data_access', score: 35 }],
          trigger: 'initial_discovery'
        },
        {
          timestamp: new Date(now - 20 * 24 * 3600000).toISOString(),
          score: 52,
          level: 'medium',
          factors: [
            { type: 'data_access', score: 35 },
            { type: 'activity', score: 17 }
          ],
          trigger: 'activity_spike'
        },
        {
          timestamp: new Date(now - 10 * 24 * 3600000).toISOString(),
          score: 71,
          level: 'high',
          factors: [
            { type: 'data_access', score: 35 },
            { type: 'activity', score: 17 },
            { type: 'external_api', score: 19 }
          ],
          trigger: 'detector_update'
        },
        {
          timestamp: new Date(now - 5 * 24 * 3600000).toISOString(),
          score: 68,
          level: 'medium',
          factors: [
            { type: 'data_access', score: 32 },
            { type: 'activity', score: 17 },
            { type: 'external_api', score: 19 }
          ],
          trigger: 'permission_change'
        },
        {
          timestamp: new Date(now).toISOString(),
          score: 28,
          level: 'low',
          factors: [
            { type: 'verified_integration', score: -20 },
            { type: 'data_access', score: 32 },
            { type: 'activity', score: 16 }
          ],
          trigger: 'manual_reassessment'
        }
      ];

      await testDb.query(`
        INSERT INTO discovered_automations (
          id, organization_id, platform_connection_id, discovery_run_id,
          external_id, name, automation_type, risk_score_history
        ) VALUES (
          $1, $2, $3, $4, -- discovery_run_id
          'bot-history-tracking', 'Evolution Bot', 'bot',
          $5::jsonb
        )
      `, [
        automationId,
        fixtures.organization.id,
        fixtures.platformConnection.id,
        fixtures.discoveryRun.id,
        JSON.stringify(riskHistory)
      ]);

      // Query full history
      const automation = await testDb.query(`
        SELECT risk_score_history
        FROM discovered_automations
        WHERE id = $1
      `, [automationId]);

      const history = automation.rows[0].risk_score_history;

      expect(history).toHaveLength(5);
      expect(history[0].score).toBe(35);
      expect(history[1].score).toBe(52);
      expect(history[2].score).toBe(71);
      expect(history[3].score).toBe(68);
      expect(history[4].score).toBe(28);

      // Verify chronological order
      for (let i = 1; i < history.length; i++) {
        const prevTimestamp = new Date(history[i - 1].timestamp).getTime();
        const currTimestamp = new Date(history[i].timestamp).getTime();
        expect(currTimestamp).toBeGreaterThanOrEqual(prevTimestamp);
      }
    });

    it('should query risk score trends', async () => {
      const automationId = crypto.randomUUID();

      const riskHistory = Array.from({ length: 10 }, (_, i) => ({
        timestamp: new Date(Date.now() - (10 - i) * 24 * 3600000).toISOString(),
        score: 40 + i * 5, // Gradually increasing: 40, 45, 50, ... 85
        level: i < 4 ? 'low' : i < 7 ? 'medium' : 'high',
        factors: [{ type: 'trend_test', score: 40 + i * 5 }],
        trigger: 'activity_spike'
      }));

      await testDb.query(`
        INSERT INTO discovered_automations (
          id, organization_id, platform_connection_id, discovery_run_id,
          external_id, name, automation_type, risk_score_history
        ) VALUES (
          $1, $2, $3, $4, -- discovery_run_id
          'bot-trend-analysis', 'Trend Bot', 'bot',
          $5::jsonb
        )
      `, [
        automationId,
        fixtures.organization.id,
        fixtures.platformConnection.id,
        fixtures.discoveryRun.id,
        JSON.stringify(riskHistory)
      ]);

      // Calculate risk trend (increasing/decreasing/stable)
      const trendAnalysis = await testDb.query(`
        SELECT
          (risk_score_history->0->>'score')::integer as first_score,
          (risk_score_history->-1->>'score')::integer as last_score,
          CASE
            WHEN (risk_score_history->-1->>'score')::integer >
                 (risk_score_history->0->>'score')::integer + 10 THEN 'increasing'
            WHEN (risk_score_history->-1->>'score')::integer <
                 (risk_score_history->0->>'score')::integer - 10 THEN 'decreasing'
            ELSE 'stable'
          END as trend
        FROM discovered_automations
        WHERE id = $1
      `, [automationId]);

      expect(trendAnalysis.rows[0].first_score).toBe(40);
      expect(trendAnalysis.rows[0].last_score).toBe(85);
      expect(trendAnalysis.rows[0].trend).toBe('increasing');
    });

    it('should identify rapid risk score changes', async () => {
      const automationId = crypto.randomUUID();

      // Create automation with sudden spike
      const riskHistory = [
        {
          timestamp: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
          score: 32,
          level: 'low',
          factors: [{ type: 'normal', score: 32 }],
          trigger: 'initial_discovery'
        },
        {
          timestamp: new Date(Date.now() - 1 * 24 * 3600000).toISOString(),
          score: 88, // Sudden spike!
          level: 'critical',
          factors: [
            { type: 'data_exfiltration', score: 50 },
            { type: 'external_api', score: 38 }
          ],
          trigger: 'activity_spike'
        }
      ];

      await testDb.query(`
        INSERT INTO discovered_automations (
          id, organization_id, platform_connection_id, discovery_run_id,
          external_id, name, automation_type, risk_score_history
        ) VALUES (
          $1, $2, $3, $4, -- discovery_run_id
          'bot-rapid-change', 'Spike Bot', 'bot',
          $5::jsonb
        )
      `, [
        automationId,
        fixtures.organization.id,
        fixtures.platformConnection.id,
        fixtures.discoveryRun.id,
        JSON.stringify(riskHistory)
      ]);

      // Detect rapid changes
      const rapidChanges = await testDb.query(`
        SELECT
          (risk_score_history->0->>'score')::integer as prev_score,
          (risk_score_history->1->>'score')::integer as curr_score,
          (risk_score_history->1->>'score')::integer -
          (risk_score_history->0->>'score')::integer as score_delta,
          risk_score_history->1->>'trigger' as trigger_reason
        FROM discovered_automations
        WHERE id = $1
      `, [automationId]);

      const scoreDelta = rapidChanges.rows[0].score_delta;
      expect(scoreDelta).toBe(56); // 88 - 32
      expect(Math.abs(scoreDelta)).toBeGreaterThan(50); // Rapid change threshold
      expect(rapidChanges.rows[0].trigger_reason).toBe('activity_spike');
    });
  });

  describe('Risk Score Recalculation Triggers', () => {
    it('should recalculate risk score on new detection pattern', async () => {
      const automationId = crypto.randomUUID();
      await testDb.query(`
        INSERT INTO discovered_automations (
          id, organization_id, platform_connection_id, discovery_run_id,
          external_id, name, automation_type, detection_metadata, risk_score_history
        ) VALUES (
          $1, $2, $3, $4, -- discovery_run_id
          'bot-recalc', 'Recalc Bot', 'bot',
          $5::jsonb, $6::jsonb
        )
      `, [
        automationId,
        fixtures.organization.id,
        fixtures.platformConnection.id,
        fixtures.discoveryRun.id,
        JSON.stringify({
          detectionPatterns: []
        }),
        JSON.stringify([{
          timestamp: new Date().toISOString(),
          score: 40,
          level: 'medium',
          factors: [{ type: 'baseline', score: 40 }],
          trigger: 'initial_discovery'
        }])
      ]);

      // Add new detection pattern
      await testDb.query(`
        SELECT add_detection_pattern(
          $1::uuid,
          $2::jsonb
        )
      `, [
        automationId,
        JSON.stringify({
          patternType: 'velocity',
          confidence: 87,
          severity: 'high',
          evidence: { eventsPerSecond: 3.2 },
          detectedAt: new Date().toISOString()
        })
      ]);

      // Recalculate risk score based on new pattern
      await testDb.query(`
        SELECT append_risk_score_history(
          $1::uuid,
          63,
          'medium',
          $2::jsonb,
          'detector_update'
        )
      `, [
        automationId,
        JSON.stringify([
          { type: 'baseline', score: 40 },
          { type: 'velocity', score: 23, description: 'High velocity pattern detected' }
        ])
      ]);

      const automation = await testDb.query(`
        SELECT
          jsonb_array_length(detection_metadata->'detectionPatterns') as pattern_count,
          (risk_score_history->-1->>'score')::integer as current_score
        FROM discovered_automations
        WHERE id = $1
      `, [automationId]);

      expect(automation.rows[0].pattern_count).toBe(1);
      expect(automation.rows[0].current_score).toBe(63);
    });
  });

  describe('Historical Risk Analysis', () => {
    it('should calculate average risk score over time', async () => {
      const automationId = crypto.randomUUID();

      const riskHistory = [
        { timestamp: new Date().toISOString(), score: 45, level: 'medium', factors: [], trigger: 'initial_discovery' },
        { timestamp: new Date().toISOString(), score: 52, level: 'medium', factors: [], trigger: 'activity_spike' },
        { timestamp: new Date().toISOString(), score: 48, level: 'medium', factors: [], trigger: 'detector_update' },
        { timestamp: new Date().toISOString(), score: 55, level: 'medium', factors: [], trigger: 'activity_spike' },
        { timestamp: new Date().toISOString(), score: 50, level: 'medium', factors: [], trigger: 'manual_reassessment' }
      ];

      await testDb.query(`
        INSERT INTO discovered_automations (
          id, organization_id, platform_connection_id, discovery_run_id,
          external_id, name, automation_type, risk_score_history
        ) VALUES (
          $1, $2, $3, $4, -- discovery_run_id
          'bot-avg-risk', 'Average Bot', 'bot',
          $5::jsonb
        )
      `, [
        automationId,
        fixtures.organization.id,
        fixtures.platformConnection.id,
        fixtures.discoveryRun.id,
        JSON.stringify(riskHistory)
      ]);

      // Calculate average risk score
      const avgRisk = await testDb.query(`
        SELECT
          (
            SELECT AVG((value->>'score')::integer)
            FROM jsonb_array_elements(risk_score_history) AS value
          ) as average_risk_score
        FROM discovered_automations
        WHERE id = $1
      `, [automationId]);

      const averageScore = parseFloat(avgRisk.rows[0].average_risk_score);
      expect(averageScore).toBe(50); // (45 + 52 + 48 + 55 + 50) / 5 = 50
    });

    it('should identify peak risk score in history', async () => {
      const automationId = crypto.randomUUID();

      const riskHistory = [
        { timestamp: new Date().toISOString(), score: 45, level: 'medium', factors: [], trigger: 'initial_discovery' },
        { timestamp: new Date().toISOString(), score: 82, level: 'high', factors: [], trigger: 'activity_spike' },
        { timestamp: new Date().toISOString(), score: 65, level: 'medium', factors: [], trigger: 'detector_update' },
        { timestamp: new Date().toISOString(), score: 38, level: 'low', factors: [], trigger: 'manual_reassessment' }
      ];

      await testDb.query(`
        INSERT INTO discovered_automations (
          id, organization_id, platform_connection_id, discovery_run_id,
          external_id, name, automation_type, risk_score_history
        ) VALUES (
          $1, $2, $3, $4, -- discovery_run_id
          'bot-peak-risk', 'Peak Bot', 'bot',
          $5::jsonb
        )
      `, [
        automationId,
        fixtures.organization.id,
        fixtures.platformConnection.id,
        fixtures.discoveryRun.id,
        JSON.stringify(riskHistory)
      ]);

      // Find peak risk score
      const peakRisk = await testDb.query(`
        SELECT
          (
            SELECT MAX((value->>'score')::integer)
            FROM jsonb_array_elements(risk_score_history) AS value
          ) as peak_risk_score
        FROM discovered_automations
        WHERE id = $1
      `, [automationId]);

      expect(parseInt(peakRisk.rows[0].peak_risk_score)).toBe(82);
    });
  });
});
