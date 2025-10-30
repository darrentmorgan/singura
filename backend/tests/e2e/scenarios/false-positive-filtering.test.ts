/**
 * E2E Test: False Positive Filtering
 *
 * Tests that legitimate automations are NOT flagged as malicious.
 * Critical for maintaining low false-positive rates in production.
 *
 * Scenarios:
 * 1. Legitimate Slack integrations (GitHub bot, CI/CD bots)
 * 2. Legitimate Google Workspace add-ons (standard Apps Scripts)
 * 3. Legitimate Microsoft Power Automate templates
 * 4. Well-known service accounts and automation platforms
 * 5. Low-risk automation patterns (read-only, scheduled reports)
 */

import { testDb, TestFixtures } from '../../helpers/test-database';
import { MockDataGenerator } from '../../helpers/mock-data';
import crypto from 'crypto';

describe('E2E: False Positive Filtering', () => {
  let fixtures: TestFixtures;

  beforeAll(async () => {
    await testDb.beginTransaction();
    fixtures = await testDb.createFixtures();
  });

  afterAll(async () => {
    await testDb.rollbackTransaction();
  });

  describe('Legitimate Slack Integrations', () => {
    it('should not flag legitimate GitHub bot', async () => {
      // Create GitHub bot automation (well-known integration)
      const githubBotId = crypto.randomUUID();
      await testDb.query(`
        INSERT INTO discovered_automations (
          id, organization_id, platform_connection_id, discovery_run_id,
          external_id, name, description, automation_type,
          platform_metadata, detection_metadata, risk_score_history
        ) VALUES (
          $1, $2, $3, $4, -- discovery_run_id
          'B-GITHUB-BOT', 'GitHub', 'Official GitHub integration', 'bot',
          $5::jsonb, $6::jsonb, $7::jsonb
        ) RETURNING *
      `, [
        githubBotId,
        fixtures.organization.id,
        fixtures.platformConnection.id,
        fixtures.discoveryRun.id,
        JSON.stringify({
          platform: 'slack',
          bot_user_id: 'B-GITHUB-BOT',
          app_id: 'A0F7YS25R', // Official GitHub app ID
          is_verified: true,
          publisher: 'GitHub Inc.'
        }),
        JSON.stringify({
          legitimacyScore: 95,
          verifiedPublisher: true,
          wellKnownIntegration: 'github',
          detectionPatterns: []
        }),
        JSON.stringify([{
          timestamp: new Date().toISOString(),
          score: 15, // Low risk score
          level: 'low',
          factors: [
            { type: 'verified_publisher', score: -30 }, // Negative = reduces risk
            { type: 'well_known_integration', score: -20 }
          ],
          trigger: 'initial_discovery'
        }])
      ]);

      // Verify low risk classification
      const githubBot = await testDb.query(`
        SELECT id, name,
               (risk_score_history->-1->>'score')::integer as current_risk_score,
               risk_score_history->-1->>'level' as risk_level,
               detection_metadata->>'wellKnownIntegration' as integration_type
        FROM discovered_automations
        WHERE id = $1
      `, [githubBotId]);

      expect(githubBot.rows[0].current_risk_score).toBeLessThan(30);
      expect(githubBot.rows[0].risk_level).toBe('low');
      expect(githubBot.rows[0].integration_type).toBe('github');
    });

    it('should not flag CircleCI bot', async () => {
      const circleCIBotId = crypto.randomUUID();
      await testDb.query(`
        INSERT INTO discovered_automations (
          id, organization_id, platform_connection_id, discovery_run_id,
          external_id, name, automation_type, platform_metadata, risk_score_history
        ) VALUES (
          $1, $2, $3, $4, -- discovery_run_id
          'B-CIRCLECI', 'CircleCI', 'bot',
          $5::jsonb, $6::jsonb
        )
      `, [
        circleCIBotId,
        fixtures.organization.id,
        fixtures.platformConnection.id,
        fixtures.discoveryRun.id,
        JSON.stringify({
          platform: 'slack',
          bot_user_id: 'B-CIRCLECI',
          is_verified: true,
          publisher: 'CircleCI'
        }),
        JSON.stringify([{
          timestamp: new Date().toISOString(),
          score: 18,
          level: 'low',
          factors: [{ type: 'ci_cd_integration', score: -25 }],
          trigger: 'initial_discovery'
        }])
      ]);

      const circleBot = await testDb.query(`
        SELECT (risk_score_history->-1->>'score')::integer as risk_score
        FROM discovered_automations
        WHERE id = $1
      `, [circleCIBotId]);

      expect(circleBot.rows[0].risk_score).toBeLessThan(30);
    });

    it('should not flag Zapier integration', async () => {
      const zapierId = crypto.randomUUID();
      await testDb.query(`
        INSERT INTO discovered_automations (
          id, organization_id, platform_connection_id, discovery_run_id,
          external_id, name, automation_type, platform_metadata, detection_metadata, risk_score_history
        ) VALUES (
          $1, $2, $3, $4, -- discovery_run_id
          'B-ZAPIER', 'Zapier', 'integration',
          $5::jsonb, $6::jsonb, $7::jsonb
        )
      `, [
        zapierId,
        fixtures.organization.id,
        fixtures.platformConnection.id,
        fixtures.discoveryRun.id,
        JSON.stringify({
          platform: 'slack',
          bot_user_id: 'B-ZAPIER',
          is_verified: true,
          publisher: 'Zapier Inc.'
        }),
        JSON.stringify({
          wellKnownIntegration: 'zapier',
          legitimacyScore: 92
        }),
        JSON.stringify([{
          timestamp: new Date().toISOString(),
          score: 22,
          level: 'low',
          factors: [{ type: 'automation_platform', score: -20 }],
          trigger: 'initial_discovery'
        }])
      ]);

      const zapier = await testDb.query(`
        SELECT (risk_score_history->-1->>'score')::integer as risk_score,
               detection_metadata->>'wellKnownIntegration' as integration
        FROM discovered_automations
        WHERE id = $1
      `, [zapierId]);

      expect(zapier.rows[0].risk_score).toBeLessThan(30);
      expect(zapier.rows[0].integration).toBe('zapier');
    });
  });

  describe('Legitimate Google Workspace Add-Ons', () => {
    it('should not flag legitimate Apps Script add-on', async () => {
      // Create Google connection
      const googleConnection = await testDb.query(`
        INSERT INTO platform_connections (
          organization_id, platform_type, platform_user_id,
          platform_workspace_id, display_name, status
        ) VALUES ($1, 'google', 'user-google-legit', 'example.com',
          'Google Workspace', 'active')
        RETURNING *
      `, [fixtures.organization.id]);

      // Create legitimate Apps Script (read-only calendar view)
      const scriptId = crypto.randomUUID();
      await testDb.query(`
        INSERT INTO discovered_automations (
          id, organization_id, platform_connection_id, discovery_run_id,
          external_id, name, description, automation_type,
          platform_metadata, detection_metadata, risk_score_history
        ) VALUES (
          $1, $2, $3, $4, -- discovery_run_id
          'script-calendar-view', 'Team Calendar Dashboard',
          'Read-only calendar aggregator', 'script',
          $5::jsonb, $6::jsonb, $7::jsonb
        )
      `, [
        scriptId,
        fixtures.organization.id,
        googleConnection.rows[0].id,
        fixtures.discoveryRun.id,
        JSON.stringify({
          platform: 'google_workspace',
          script_id: 'script-calendar-view',
          permissions: [
            'https://www.googleapis.com/auth/calendar.readonly' // Read-only!
          ],
          triggers: [{
            type: 'TIME_DRIVEN',
            frequency: 'daily'
          }]
        }),
        JSON.stringify({
          permissionRiskLevel: 'low',
          readOnlyAccess: true,
          noExternalConnections: true
        }),
        JSON.stringify([{
          timestamp: new Date().toISOString(),
          score: 12,
          level: 'low',
          factors: [
            { type: 'read_only_permissions', score: -35 },
            { type: 'no_external_connections', score: -20 },
            { type: 'standard_trigger', score: -10 }
          ],
          trigger: 'initial_discovery'
        }])
      ]);

      const calendarScript = await testDb.query(`
        SELECT (risk_score_history->-1->>'score')::integer as risk_score,
               risk_score_history->-1->>'level' as risk_level,
               detection_metadata->>'readOnlyAccess' as read_only
        FROM discovered_automations
        WHERE id = $1
      `, [scriptId]);

      expect(calendarScript.rows[0].risk_score).toBeLessThan(20);
      expect(calendarScript.rows[0].risk_level).toBe('low');
      expect(calendarScript.rows[0].read_only).toBe('true');
    });

    it('should not flag Google Workspace Marketplace app', async () => {
      const googleConnection = await testDb.query(`
        INSERT INTO platform_connections (
          organization_id, platform_type, platform_user_id,
          platform_workspace_id, display_name, status
        ) VALUES ($1, 'google', 'user-google-marketplace', 'example.com',
          'Google Workspace', 'active')
        RETURNING *
      `, [fixtures.organization.id]);

      const marketplaceAppId = crypto.randomUUID();
      await testDb.query(`
        INSERT INTO discovered_automations (
          id, organization_id, platform_connection_id, discovery_run_id,
          external_id, name, automation_type, platform_metadata, detection_metadata, risk_score_history
        ) VALUES (
          $1, $2, $3, $4, -- discovery_run_id
          'marketplace-docusign', 'DocuSign for Gmail', 'integration',
          $5::jsonb, $6::jsonb, $7::jsonb
        )
      `, [
        marketplaceAppId,
        fixtures.organization.id,
        googleConnection.rows[0].id,
        fixtures.discoveryRun.id,
        JSON.stringify({
          platform: 'google_workspace',
          app_id: 'marketplace-docusign',
          is_verified: true,
          marketplace_listing: 'https://workspace.google.com/marketplace/app/docusign'
        }),
        JSON.stringify({
          wellKnownIntegration: 'docusign',
          marketplaceVerified: true,
          legitimacyScore: 94
        }),
        JSON.stringify([{
          timestamp: new Date().toISOString(),
          score: 20,
          level: 'low',
          factors: [
            { type: 'marketplace_verified', score: -30 },
            { type: 'well_known_vendor', score: -15 }
          ],
          trigger: 'initial_discovery'
        }])
      ]);

      const marketplaceApp = await testDb.query(`
        SELECT (risk_score_history->-1->>'score')::integer as risk_score,
               detection_metadata->>'marketplaceVerified' as verified
        FROM discovered_automations
        WHERE id = $1
      `, [marketplaceAppId]);

      expect(marketplaceApp.rows[0].risk_score).toBeLessThan(30);
      expect(marketplaceApp.rows[0].verified).toBe('true');
    });
  });

  describe('Legitimate Microsoft Power Automate Templates', () => {
    it('should not flag official Power Automate template', async () => {
      const msConnection = await testDb.query(`
        INSERT INTO platform_connections (
          organization_id, platform_type, platform_user_id,
          platform_workspace_id, display_name, status
        ) VALUES ($1, 'microsoft', 'user-ms-legit', 'tenant-legit',
          'Microsoft 365', 'active')
        RETURNING *
      `, [fixtures.organization.id]);

      const flowId = crypto.randomUUID();
      await testDb.query(`
        INSERT INTO discovered_automations (
          id, organization_id, platform_connection_id, discovery_run_id,
          external_id, name, description, automation_type,
          platform_metadata, detection_metadata, risk_score_history
        ) VALUES (
          $1, $2, $3, $4, -- discovery_run_id
          'flow-template-approval', 'Approval Workflow',
          'Standard document approval flow', 'workflow',
          $5::jsonb, $6::jsonb, $7::jsonb
        )
      `, [
        flowId,
        fixtures.organization.id,
        msConnection.rows[0].id,
        fixtures.discoveryRun.id,
        JSON.stringify({
          platform: 'microsoft',
          flow_id: 'flow-template-approval',
          is_template: true,
          template_source: 'microsoft_official',
          actions: ['Get file', 'Send approval', 'Update file']
        }),
        JSON.stringify({
          officialTemplate: true,
          standardActions: true,
          noExternalConnections: true
        }),
        JSON.stringify([{
          timestamp: new Date().toISOString(),
          score: 16,
          level: 'low',
          factors: [
            { type: 'official_template', score: -30 },
            { type: 'standard_actions', score: -15 }
          ],
          trigger: 'initial_discovery'
        }])
      ]);

      const approvalFlow = await testDb.query(`
        SELECT (risk_score_history->-1->>'score')::integer as risk_score,
               detection_metadata->>'officialTemplate' as is_template
        FROM discovered_automations
        WHERE id = $1
      `, [flowId]);

      expect(approvalFlow.rows[0].risk_score).toBeLessThan(25);
      expect(approvalFlow.rows[0].is_template).toBe('true');
    });

    it('should not flag Microsoft Teams built-in bot', async () => {
      const msConnection = await testDb.query(`
        INSERT INTO platform_connections (
          organization_id, platform_type, platform_user_id,
          platform_workspace_id, display_name, status
        ) VALUES ($1, 'microsoft', 'user-ms-teams', 'tenant-teams',
          'Microsoft Teams', 'active')
        RETURNING *
      `, [fixtures.organization.id]);

      const pollyBotId = crypto.randomUUID();
      await testDb.query(`
        INSERT INTO discovered_automations (
          id, organization_id, platform_connection_id, discovery_run_id,
          external_id, name, automation_type, platform_metadata, detection_metadata, risk_score_history
        ) VALUES (
          $1, $2, $3, $4, -- discovery_run_id
          'bot-polly', 'Polly', 'bot',
          $5::jsonb, $6::jsonb, $7::jsonb
        )
      `, [
        pollyBotId,
        fixtures.organization.id,
        msConnection.rows[0].id,
        fixtures.discoveryRun.id,
        JSON.stringify({
          platform: 'microsoft',
          bot_id: 'bot-polly',
          is_verified: true,
          publisher: 'Microsoft Corporation',
          app_store_listing: true
        }),
        JSON.stringify({
          wellKnownIntegration: 'polly',
          verifiedPublisher: true,
          appStoreApproved: true
        }),
        JSON.stringify([{
          timestamp: new Date().toISOString(),
          score: 14,
          level: 'low',
          factors: [
            { type: 'verified_publisher', score: -30 },
            { type: 'app_store_approved', score: -20 }
          ],
          trigger: 'initial_discovery'
        }])
      ]);

      const pollyBot = await testDb.query(`
        SELECT (risk_score_history->-1->>'score')::integer as risk_score
        FROM discovered_automations
        WHERE id = $1
      `, [pollyBotId]);

      expect(pollyBot.rows[0].risk_score).toBeLessThan(20);
    });
  });

  describe('Well-Known Service Accounts', () => {
    it('should not flag Google Workspace service account for backup', async () => {
      const googleConnection = await testDb.query(`
        INSERT INTO platform_connections (
          organization_id, platform_type, platform_user_id,
          platform_workspace_id, display_name, status
        ) VALUES ($1, 'google', 'service-backup', 'example.com',
          'Google Workspace Backup', 'active')
        RETURNING *
      `, [fixtures.organization.id]);

      const serviceAccountId = crypto.randomUUID();
      await testDb.query(`
        INSERT INTO discovered_automations (
          id, organization_id, platform_connection_id, discovery_run_id,
          external_id, name, description, automation_type,
          platform_metadata, detection_metadata, risk_score_history
        ) VALUES (
          $1, $2, $3, $4, -- discovery_run_id
          'sa-backup-123', 'Workspace Backup Service Account',
          'Automated daily backups', 'service_account',
          $5::jsonb, $6::jsonb, $7::jsonb
        )
      `, [
        serviceAccountId,
        fixtures.organization.id,
        googleConnection.rows[0].id,
        fixtures.discoveryRun.id,
        JSON.stringify({
          platform: 'google_workspace',
          service_account_email: 'backup@project.iam.gserviceaccount.com',
          purpose: 'backup',
          permissions: ['https://www.googleapis.com/auth/drive.readonly']
        }),
        JSON.stringify({
          serviceAccountPurpose: 'backup',
          readOnlyAccess: true,
          scheduledOperation: true
        }),
        JSON.stringify([{
          timestamp: new Date().toISOString(),
          score: 25,
          level: 'low',
          factors: [
            { type: 'service_account', score: 10 },
            { type: 'read_only_permissions', score: -30 },
            { type: 'backup_purpose', score: -20 }
          ],
          trigger: 'initial_discovery'
        }])
      ]);

      const backupAccount = await testDb.query(`
        SELECT (risk_score_history->-1->>'score')::integer as risk_score,
               detection_metadata->>'serviceAccountPurpose' as purpose
        FROM discovered_automations
        WHERE id = $1
      `, [serviceAccountId]);

      expect(backupAccount.rows[0].risk_score).toBeLessThan(35);
      expect(backupAccount.rows[0].purpose).toBe('backup');
    });
  });

  describe('Low-Risk Automation Patterns', () => {
    it('should not flag scheduled report generation', async () => {
      const reportAutomationId = crypto.randomUUID();
      await testDb.query(`
        INSERT INTO discovered_automations (
          id, organization_id, platform_connection_id, discovery_run_id,
          external_id, name, description, automation_type,
          execution_frequency, detection_metadata, risk_score_history
        ) VALUES (
          $1, $2, $3, $4, -- discovery_run_id
          'report-weekly', 'Weekly Sales Report',
          'Automated weekly report generation', 'workflow',
          'weekly', $5::jsonb, $6::jsonb
        )
      `, [
        reportAutomationId,
        fixtures.organization.id,
        fixtures.platformConnection.id,
        fixtures.discoveryRun.id,
        JSON.stringify({
          automationPattern: 'scheduled_report',
          dataAccess: 'read_only',
          outputDestination: 'internal_email'
        }),
        JSON.stringify([{
          timestamp: new Date().toISOString(),
          score: 18,
          level: 'low',
          factors: [
            { type: 'scheduled_operation', score: -15 },
            { type: 'read_only_access', score: -25 },
            { type: 'internal_destination', score: -10 }
          ],
          trigger: 'initial_discovery'
        }])
      ]);

      const reportAutomation = await testDb.query(`
        SELECT (risk_score_history->-1->>'score')::integer as risk_score,
               execution_frequency
        FROM discovered_automations
        WHERE id = $1
      `, [reportAutomationId]);

      expect(reportAutomation.rows[0].risk_score).toBeLessThan(25);
      expect(reportAutomation.rows[0].execution_frequency).toBe('weekly');
    });

    it('should not flag internal notification automation', async () => {
      const notificationId = crypto.randomUUID();
      await testDb.query(`
        INSERT INTO discovered_automations (
          id, organization_id, platform_connection_id, discovery_run_id,
          external_id, name, automation_type, platform_metadata, detection_metadata, risk_score_history
        ) VALUES (
          $1, $2, $3, $4, -- discovery_run_id
          'notify-internal', 'Build Notifications', 'bot',
          $5::jsonb, $6::jsonb, $7::jsonb
        )
      `, [
        notificationId,
        fixtures.organization.id,
        fixtures.platformConnection.id,
        fixtures.discoveryRun.id,
        JSON.stringify({
          platform: 'slack',
          bot_user_id: 'B-NOTIFY',
          channels: ['#engineering'],
          scope: 'internal_only'
        }),
        JSON.stringify({
          automationPattern: 'notification',
          internalOnly: true,
          noDataExfiltration: true
        }),
        JSON.stringify([{
          timestamp: new Date().toISOString(),
          score: 10,
          level: 'low',
          factors: [
            { type: 'notification_only', score: -30 },
            { type: 'internal_channels', score: -25 }
          ],
          trigger: 'initial_discovery'
        }])
      ]);

      const notification = await testDb.query(`
        SELECT (risk_score_history->-1->>'score')::integer as risk_score
        FROM discovered_automations
        WHERE id = $1
      `, [notificationId]);

      expect(notification.rows[0].risk_score).toBeLessThan(15);
    });
  });

  describe('False Positive Rate Validation', () => {
    it('should maintain false positive rate below 5%', async () => {
      // Create 100 automations: 90 legitimate, 10 malicious
      const legitimateCount = 90;
      const maliciousCount = 10;
      const automations = [];

      // Create legitimate automations
      for (let i = 0; i < legitimateCount; i++) {
        const automationId = crypto.randomUUID();
        await testDb.query(`
          INSERT INTO discovered_automations (
            id, organization_id, platform_connection_id, discovery_run_id,
            external_id, name, automation_type, risk_score_history
          ) VALUES (
            $1, $2, $3, $4, $5, $6, 'bot', $7::jsonb
          )
        `, [
          automationId,
          fixtures.organization.id,
          fixtures.platformConnection.id,
          fixtures.discoveryRun.id,
          `legit-${i}`,
          `Legitimate Automation ${i}`,
          JSON.stringify([{
            timestamp: new Date().toISOString(),
            score: Math.floor(Math.random() * 25) + 5, // 5-30 (low risk)
            level: 'low',
            factors: [{ type: 'verified_integration', score: -30 }],
            trigger: 'initial_discovery'
          }])
        ]);
        automations.push({ id: automationId, type: 'legitimate' });
      }

      // Create malicious automations
      for (let i = 0; i < maliciousCount; i++) {
        const automationId = crypto.randomUUID();
        await testDb.query(`
          INSERT INTO discovered_automations (
            id, organization_id, platform_connection_id, discovery_run_id,
            external_id, name, automation_type, risk_score_history
          ) VALUES (
            $1, $2, $3, $4, $5, $6, 'bot', $7::jsonb
          )
        `, [
          automationId,
          fixtures.organization.id,
          fixtures.platformConnection.id,
          fixtures.discoveryRun.id,
          `malicious-${i}`,
          `Suspicious Automation ${i}`,
          JSON.stringify([{
            timestamp: new Date().toISOString(),
            score: Math.floor(Math.random() * 30) + 70, // 70-100 (high risk)
            level: 'high',
            factors: [
              { type: 'data_exfiltration', score: 40 },
              { type: 'external_connections', score: 30 }
            ],
            trigger: 'initial_discovery'
          }])
        ]);
        automations.push({ id: automationId, type: 'malicious' });
      }

      // Query flagged automations (risk score >= 60)
      const flaggedAutomations = await testDb.query(`
        SELECT id, (risk_score_history->-1->>'score')::integer as risk_score
        FROM discovered_automations
        WHERE (risk_score_history->-1->>'score')::integer >= 60
        AND organization_id = $1
      `, [fixtures.organization.id]);

      // Calculate false positive rate
      const flaggedIds = new Set(flaggedAutomations.rows.map(r => r.id));
      const falsePositives = automations.filter(a =>
        a.type === 'legitimate' && flaggedIds.has(a.id)
      );

      const falsePositiveRate = (falsePositives.length / legitimateCount) * 100;

      expect(falsePositiveRate).toBeLessThan(5); // Less than 5% false positives
      expect(flaggedAutomations.rows.length).toBeGreaterThanOrEqual(maliciousCount * 0.9); // Catch at least 90% of malicious
    });
  });
});
