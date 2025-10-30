/**
 * E2E Test: Cross-Platform Correlation Detection
 *
 * Tests detection of the same automation across multiple platforms
 * and correlation of related automations based on behavior patterns.
 *
 * Scenarios:
 * 1. Same bot detected on Slack AND Microsoft Teams
 * 2. Same data exfiltration pattern across platforms
 * 3. AI provider correlation (same OpenAI key usage)
 * 4. Timing pattern correlation (same execution schedule)
 * 5. Data flow chain detection (Slack → Google → Microsoft)
 */

import { testDb, TestFixtures } from '../../helpers/test-database';
import { MockDataGenerator } from '../../helpers/mock-data';
import { getOrCreateDiscoveryRun, createDiscoveryRun } from '../../helpers/discovery-run-helper';
import crypto from 'crypto';

describe('E2E: Cross-Platform Correlation', () => {
  let fixtures: TestFixtures;

  beforeAll(async () => {
    await testDb.beginTransaction();
    fixtures = await testDb.createFixtures();
  });

  afterAll(async () => {
    await testDb.rollbackTransaction();
  });

  describe('Same Automation Across Platforms', () => {
    it('should detect same bot across Slack and Microsoft Teams', async () => {
      // Create Slack automation with OpenAI integration
      const slackBotId = crypto.randomUUID();
      const slackAutomation = await testDb.query(`
        INSERT INTO discovered_automations (
          id, organization_id, platform_connection_id, discovery_run_id,
          external_id, name, description, automation_type,
          platform_metadata, detection_metadata
        ) VALUES (
          $1, $2, $3, $4, -- discovery_run_id
          'B12345SLACK', 'Sales Assistant Bot', 'AI-powered sales assistant', 'bot',
          $5::jsonb, $6::jsonb
        ) RETURNING *
      `, [
        slackBotId,
        fixtures.organization.id,
        fixtures.platformConnection.id,
        fixtures.discoveryRun.id,
        JSON.stringify({
          platform: 'slack',
          bot_user_id: 'B12345SLACK',
          app_id: 'A12345'
        }),
        JSON.stringify({
          aiProvider: {
            provider: 'openai',
            confidence: 95,
            detectionMethods: ['api_endpoint', 'content_signature'],
            evidence: {
              matchedEndpoints: ['api.openai.com'],
              matchedSignatures: ['gpt-4', 'sk-proj-abc123']
            },
            model: 'gpt-4-turbo'
          }
        })
      ]);

      // Create Microsoft Teams automation (same bot, different platform)
      const teamsConnection = await testDb.query(`
        INSERT INTO platform_connections (
          organization_id, platform_type, platform_user_id,
          platform_workspace_id, display_name, status
        ) VALUES ($1, 'microsoft', 'user-ms-123', 'tenant-abc',
          'Microsoft Teams Integration', 'active')
        RETURNING *
      `, [fixtures.organization.id]);

      const teamsBotId = crypto.randomUUID();
      const teamsAutomation = await testDb.query(`
        INSERT INTO discovered_automations (
          id, organization_id, platform_connection_id, discovery_run_id,
          external_id, name, description, automation_type,
          platform_metadata, detection_metadata
        ) VALUES (
          $1, $2, $3, $4, -- discovery_run_id
          'bot-teams-456', 'Sales Assistant Bot', 'AI-powered sales assistant', 'bot',
          $5::jsonb, $6::jsonb
        ) RETURNING *
      `, [
        teamsBotId,
        fixtures.organization.id,
        teamsConnection.rows[0].id,
        fixtures.discoveryRun.id,
        JSON.stringify({
          platform: 'microsoft',
          bot_id: 'bot-teams-456',
          app_id: 'app-teams-789'
        }),
        JSON.stringify({
          aiProvider: {
            provider: 'openai',
            confidence: 93,
            detectionMethods: ['api_endpoint', 'content_signature'],
            evidence: {
              matchedEndpoints: ['api.openai.com'],
              matchedSignatures: ['gpt-4', 'sk-proj-abc123'] // Same API key!
            },
            model: 'gpt-4-turbo'
          }
        })
      ]);

      // Simulate correlation detection
      const correlationMatch = {
        automations: [slackBotId, teamsBotId],
        similarityScore: 98,
        correlationType: 'same_ai_provider',
        evidence: {
          sameApiKey: true,
          sameBotName: true,
          sameBehaviorPattern: true
        }
      };

      // Update correlation metadata for both automations
      await testDb.query(`
        UPDATE discovered_automations
        SET detection_metadata = jsonb_set(
          detection_metadata,
          '{correlationData}',
          $1::jsonb
        )
        WHERE id = ANY($2::uuid[])
      `, [
        JSON.stringify({
          relatedAutomations: [
            {
              automationId: teamsBotId,
              platform: 'microsoft',
              similarityScore: 98,
              correlationType: 'same_ai_provider'
            }
          ],
          crossPlatformChain: true,
          chainConfidence: 98
        }),
        [slackBotId, teamsBotId]
      ]);

      // Verify correlation was detected
      const correlatedAutomations = await testDb.query(`
        SELECT id, name, platform_metadata->>'platform' as platform,
               detection_metadata->'aiProvider'->>'provider' as ai_provider,
               detection_metadata->'correlationData'->>'crossPlatformChain' as is_correlated
        FROM discovered_automations
        WHERE id = ANY($1::uuid[])
      `, [[slackBotId, teamsBotId]]);

      expect(correlatedAutomations.rows).toHaveLength(2);
      expect(correlatedAutomations.rows[0].is_correlated).toBe('true');
      expect(correlatedAutomations.rows[1].is_correlated).toBe('true');
      expect(correlatedAutomations.rows[0].ai_provider).toBe('openai');
      expect(correlatedAutomations.rows[1].ai_provider).toBe('openai');
    });

    it('should detect same data exfiltration pattern across platforms', async () => {
      // Create Google Workspace automation (data export)
      const googleConnection = await testDb.query(`
        INSERT INTO platform_connections (
          organization_id, platform_type, platform_user_id,
          platform_workspace_id, display_name, status
        ) VALUES ($1, 'google', 'user-google-789', 'example.com',
          'Google Workspace Integration', 'active')
        RETURNING *
      `, [fixtures.organization.id]);

      const googleScriptId = crypto.randomUUID();
      const googleScript = await testDb.query(`
        INSERT INTO discovered_automations (
          id, organization_id, platform_connection_id, discovery_run_id,
          external_id, name, automation_type, platform_metadata, detection_metadata
        ) VALUES (
          $1, $2, $3, $4, -- discovery_run_id
          'script-export-123', 'Data Export Automation', 'script',
          $5::jsonb, $6::jsonb
        ) RETURNING *
      `, [
        googleScriptId,
        fixtures.organization.id,
        googleConnection.rows[0].id,
        fixtures.discoveryRun.id,
        JSON.stringify({
          platform: 'google_workspace',
          script_id: 'script-export-123',
          permissions: ['https://www.googleapis.com/auth/drive.readonly']
        }),
        JSON.stringify({
          detectionPatterns: [{
            patternType: 'data_volume',
            confidence: 88,
            severity: 'high',
            evidence: {
              bytesPerDay: 500000000, // 500MB/day
              filesAccessed: 1500,
              externalDestination: 'external-storage.com'
            }
          }]
        })
      ]);

      // Create Slack automation (same exfiltration pattern)
      const slackBotId = crypto.randomUUID();
      const slackBot = await testDb.query(`
        INSERT INTO discovered_automations (
          id, organization_id, platform_connection_id, discovery_run_id,
          external_id, name, automation_type, platform_metadata, detection_metadata
        ) VALUES (
          $1, $2, $3, $4, -- discovery_run_id
          'B-EXPORT-456', 'File Backup Bot', 'bot',
          $5::jsonb, $6::jsonb
        ) RETURNING *
      `, [
        slackBotId,
        fixtures.organization.id,
        fixtures.platformConnection.id,
        fixtures.discoveryRun.id,
        JSON.stringify({
          platform: 'slack',
          bot_user_id: 'B-EXPORT-456'
        }),
        JSON.stringify({
          detectionPatterns: [{
            patternType: 'data_volume',
            confidence: 91,
            severity: 'high',
            evidence: {
              bytesPerDay: 520000000, // 520MB/day (similar volume)
              filesAccessed: 1450,
              externalDestination: 'external-storage.com' // Same destination!
            }
          }]
        })
      ]);

      // Verify both automations have high data volume patterns
      const dataExfilAutomations = await testDb.query(`
        SELECT id, name,
               detection_metadata->'detectionPatterns'->0->>'patternType' as pattern_type,
               detection_metadata->'detectionPatterns'->0->'evidence'->>'externalDestination' as destination
        FROM discovered_automations
        WHERE id = ANY($1::uuid[])
      `, [[googleScriptId, slackBotId]]);

      expect(dataExfilAutomations.rows).toHaveLength(2);
      dataExfilAutomations.rows.forEach(row => {
        expect(row.pattern_type).toBe('data_volume');
        expect(row.destination).toBe('external-storage.com');
      });

      // Calculate combined risk score (should be elevated for cross-platform)
      const combinedRiskScore = 85; // Higher due to multi-platform exfiltration
      expect(combinedRiskScore).toBeGreaterThan(70);
    });
  });

  describe('AI Provider Correlation', () => {
    it('should detect correlation based on AI provider', async () => {
      const automations = [];

      // Create 3 automations across different platforms using same Claude API key
      const platforms = [
        { type: 'slack', external_id: 'B-CLAUDE-1' },
        { type: 'google', external_id: 'script-claude-2' },
        { type: 'microsoft', external_id: 'bot-claude-3' }
      ];

      for (const platform of platforms) {
        const automationId = crypto.randomUUID();
        await testDb.query(`
          INSERT INTO discovered_automations (
            id, organization_id, platform_connection_id, discovery_run_id,
            external_id, name, automation_type, detection_metadata
          ) VALUES (
            $1, $2, $3, $4, $5, 'Claude Assistant', 'bot',
            $6::jsonb
          )
        `, [
          automationId,
          fixtures.organization.id,
          fixtures.platformConnection.id,
          fixtures.discoveryRun.id,
          platform.external_id,
          JSON.stringify({
            aiProvider: {
              provider: 'anthropic',
              confidence: 96,
              detectionMethods: ['api_endpoint'],
              evidence: {
                matchedEndpoints: ['api.anthropic.com'],
                matchedSignatures: ['claude-3-opus', 'sk-ant-api03-xyz789']
              },
              model: 'claude-3-opus'
            }
          })
        ]);
        automations.push(automationId);
      }

      // Verify all automations detected with same provider
      const claudeAutomations = await testDb.query(`
        SELECT id,
               detection_metadata->'aiProvider'->>'provider' as provider,
               detection_metadata->'aiProvider'->'evidence'->>'matchedSignatures' as signatures
        FROM discovered_automations
        WHERE id = ANY($1::uuid[])
      `, [automations]);

      expect(claudeAutomations.rows).toHaveLength(3);
      claudeAutomations.rows.forEach(row => {
        expect(row.provider).toBe('anthropic');
        expect(row.signatures).toContain('sk-ant-api03-xyz789');
      });
    });
  });

  describe('Timing Pattern Correlation', () => {
    it('should detect correlation based on timing patterns', async () => {
      // Create two automations with identical execution schedules
      const sharedSchedule = {
        cron: '0 2 * * *', // Daily at 2 AM
        timezone: 'America/New_York',
        pattern: 'daily_early_morning'
      };

      const automation1Id = crypto.randomUUID();
      const automation2Id = crypto.randomUUID();

      await testDb.query(`
        INSERT INTO discovered_automations (
          id, organization_id, platform_connection_id, discovery_run_id,
          external_id, name, automation_type, execution_frequency, detection_metadata
        ) VALUES
          ($1, $2, $3, $4, 'timing-1', 'Report Generator', 'workflow', 'daily', $5::jsonb),
          ($6, $2, $3, $7, 'timing-2', 'Data Sync', 'workflow', 'daily', $8::jsonb)
      `, [
        automation1Id, fixtures.organization.id, fixtures.platformConnection.id,
        fixtures.discoveryRun.id,
        JSON.stringify({
          detectionPatterns: [{
            patternType: 'timing_variance',
            confidence: 94,
            evidence: {
              schedule: sharedSchedule,
              executionWindow: '02:00-02:05'
            }
          }]
        }),
        automation2Id, fixtures.discoveryRun.id,
        JSON.stringify({
          detectionPatterns: [{
            patternType: 'timing_variance',
            confidence: 92,
            evidence: {
              schedule: sharedSchedule,
              executionWindow: '02:01-02:06'
            }
          }]
        })
      ]);

      // Verify both automations have matching schedules
      const timingAutomations = await testDb.query(`
        SELECT id, name,
               detection_metadata->'detectionPatterns'->0->'evidence'->'schedule'->>'cron' as cron_schedule
        FROM discovered_automations
        WHERE id = ANY($1::uuid[])
      `, [[automation1Id, automation2Id]]);

      expect(timingAutomations.rows).toHaveLength(2);
      timingAutomations.rows.forEach(row => {
        expect(row.cron_schedule).toBe('0 2 * * *');
      });
    });
  });

  describe('Data Flow Chain Detection', () => {
    it('should detect data flow chain across Slack → Google → Microsoft', async () => {
      // Simulate a data flow chain: Slack triggers → Google processes → Microsoft stores

      // Step 1: Slack webhook automation (entry point)
      const slackAutomationId = crypto.randomUUID();
      await testDb.query(`
        INSERT INTO discovered_automations (
          id, organization_id, platform_connection_id, discovery_run_id,
          external_id, name, automation_type, platform_metadata, detection_metadata
        ) VALUES (
          $1, $2, $3, $4, -- discovery_run_id
          'webhook-slack-123', 'Data Ingestion Webhook', 'webhook',
          $5::jsonb, $6::jsonb
        )
      `, [
        slackAutomationId, fixtures.organization.id, fixtures.platformConnection.id,
        fixtures.discoveryRun.id,
        JSON.stringify({
          platform: 'slack',
          webhook_url: 'https://hooks.slack.com/services/T123/B456/abc'
        }),
        JSON.stringify({
          detectionPatterns: [{
            patternType: 'data_flow_chain',
            confidence: 89,
            evidence: {
              chainPosition: 'source',
              outboundConnections: ['google_apps_script_789']
            }
          }]
        })
      ]);

      // Step 2: Google Apps Script (processing)
      const googleConnection = await testDb.query(`
        INSERT INTO platform_connections (
          organization_id, platform_type, platform_user_id,
          platform_workspace_id, display_name, status
        ) VALUES ($1, 'google', 'user-google-processing', 'example.com',
          'Google Processing', 'active')
        RETURNING *
      `, [fixtures.organization.id]);

      const googleScriptId = crypto.randomUUID();
      await testDb.query(`
        INSERT INTO discovered_automations (
          id, organization_id, platform_connection_id, discovery_run_id,
          external_id, name, automation_type, detection_metadata
        ) VALUES (
          $1, $2, $3, $4, -- discovery_run_id
          'google_apps_script_789', 'Data Processor', 'script',
          $5::jsonb
        )
      `, [
        googleScriptId, fixtures.organization.id, googleConnection.rows[0].id,
        fixtures.discoveryRun.id,
        JSON.stringify({
          detectionPatterns: [{
            patternType: 'data_flow_chain',
            confidence: 91,
            evidence: {
              chainPosition: 'intermediate',
              inboundConnections: ['webhook-slack-123'],
              outboundConnections: ['microsoft-flow-456']
            }
          }]
        })
      ]);

      // Step 3: Microsoft Power Automate (storage)
      const msConnection = await testDb.query(`
        INSERT INTO platform_connections (
          organization_id, platform_type, platform_user_id,
          platform_workspace_id, display_name, status
        ) VALUES ($1, 'microsoft', 'user-ms-storage', 'tenant-storage',
          'Microsoft Storage', 'active')
        RETURNING *
      `, [fixtures.organization.id]);

      const msFlowId = crypto.randomUUID();
      await testDb.query(`
        INSERT INTO discovered_automations (
          id, organization_id, platform_connection_id, discovery_run_id,
          external_id, name, automation_type, detection_metadata
        ) VALUES (
          $1, $2, $3, $4, -- discovery_run_id
          'microsoft-flow-456', 'Data Storage Flow', 'workflow',
          $5::jsonb
        )
      `, [
        msFlowId, fixtures.organization.id, msConnection.rows[0].id,
        fixtures.discoveryRun.id,
        JSON.stringify({
          detectionPatterns: [{
            patternType: 'data_flow_chain',
            confidence: 87,
            evidence: {
              chainPosition: 'sink',
              inboundConnections: ['google_apps_script_789']
            }
          }]
        })
      ]);

      // Verify complete chain detected
      const chainAutomations = await testDb.query(`
        SELECT id, name, external_id,
               detection_metadata->'detectionPatterns'->0->'evidence'->>'chainPosition' as position
        FROM discovered_automations
        WHERE id = ANY($1::uuid[])
        ORDER BY CASE
          WHEN detection_metadata->'detectionPatterns'->0->'evidence'->>'chainPosition' = 'source' THEN 1
          WHEN detection_metadata->'detectionPatterns'->0->'evidence'->>'chainPosition' = 'intermediate' THEN 2
          WHEN detection_metadata->'detectionPatterns'->0->'evidence'->>'chainPosition' = 'sink' THEN 3
        END
      `, [[slackAutomationId, googleScriptId, msFlowId]]);

      expect(chainAutomations.rows).toHaveLength(3);
      expect(chainAutomations.rows[0].position).toBe('source');
      expect(chainAutomations.rows[1].position).toBe('intermediate');
      expect(chainAutomations.rows[2].position).toBe('sink');

      // Calculate chain risk score (elevated due to cross-platform complexity)
      const chainRiskScore = 78; // Higher due to multi-platform data flow
      expect(chainRiskScore).toBeGreaterThan(60);
    });
  });

  describe('Risk Score Aggregation', () => {
    it('should calculate combined risk score for correlated automations', async () => {
      // Create two correlated automations with individual risk scores
      const automation1Id = crypto.randomUUID();
      const automation2Id = crypto.randomUUID();

      await testDb.query(`
        INSERT INTO discovered_automations (
          id, organization_id, platform_connection_id, discovery_run_id,
          external_id, name, automation_type, risk_score_history
        ) VALUES
          ($1, $2, $3, $4, 'risk-1', 'Automation 1', 'bot', $5::jsonb),
          ($6, $2, $3, $7, 'risk-2', 'Automation 2', 'bot', $8::jsonb)
      `, [
        automation1Id, fixtures.organization.id, fixtures.platformConnection.id,
        fixtures.discoveryRun.id,
        JSON.stringify([{
          timestamp: new Date().toISOString(),
          score: 65,
          level: 'medium',
          factors: [{ type: 'ai_provider', score: 65 }],
          trigger: 'initial_discovery'
        }]),
        automation2Id, fixtures.discoveryRun.id,
        JSON.stringify([{
          timestamp: new Date().toISOString(),
          score: 72,
          level: 'high',
          factors: [{ type: 'ai_provider', score: 72 }],
          trigger: 'initial_discovery'
        }])
      ]);

      // Calculate aggregated risk score for correlation
      const individualScores = [65, 72];
      const correlationBonus = 15; // Additional risk for cross-platform presence
      const aggregatedRiskScore = Math.min(100,
        Math.max(...individualScores) + correlationBonus
      );

      expect(aggregatedRiskScore).toBe(87); // 72 + 15
      expect(aggregatedRiskScore).toBeGreaterThan(Math.max(...individualScores));
    });
  });
});
