/**
 * Unit Tests for Discovered Automation Repository - Platform JOIN
 * Tests that platform_type is correctly retrieved via platform_connections JOIN
 * Coverage Target: 95%+
 *
 * CONTEXT: These tests WILL FAIL initially (TDD approach)
 * Implementation required in discovered-automation.ts to:
 * 1. Add JOIN with platform_connections table
 * 2. Include platform_type in SELECT clause
 * 3. Return platform_type in result rows
 */

import { discoveredAutomationRepository } from '../../../database/repositories/discovered-automation';
import { db } from '../../../database/pool';
import { DiscoveredAutomation } from '../../../types/database';

// Mock the database pool
jest.mock('../../../database/pool', () => ({
  db: {
    query: jest.fn()
  }
}));

describe('DiscoveredAutomationRepository - Platform JOIN Tests', () => {
  const mockQuery = db.query;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findManyCustom - Platform Type Extraction', () => {
    it('should JOIN platform_connections to get platform_type', async () => {
      const testOrgId = 'org_test123';

      // Mock database response with platform_type from JOIN
      const mockDbResponse = {
        rows: [
          {
            id: 'automation_1',
            name: 'ChatGPT',
            organization_id: testOrgId,
            platform_connection_id: 'conn_google',
            discovery_run_id: 'run_1',
            external_id: 'ext_1',
            automation_type: 'integration',
            status: 'active',
            trigger_type: 'oauth',
            actions: ['api_access', 'data_read'],
            permissions_required: [],
            data_access_patterns: [],
            owner_info: {},
            platform_metadata: {
              isAIPlatform: true,
              platformName: 'OpenAI / ChatGPT',
              scopes: [
                'https://www.googleapis.com/auth/drive.readonly',
                'https://www.googleapis.com/auth/userinfo.email'
              ],
              riskFactors: ['AI platform integration: openai']
            },
            first_discovered_at: new Date('2025-10-06T08:27:30.777Z'),
            last_seen_at: new Date('2025-10-06T08:27:30.777Z'),
            is_active: true,
            created_at: new Date('2025-10-06T08:27:30.777Z'),
            updated_at: new Date('2025-10-06T08:27:30.777Z'),
            // THIS is from the JOIN with platform_connections
            platform_type: 'google'
          }
        ],
        rowCount: 1,
        command: 'SELECT'
      };

      mockQuery.mockResolvedValueOnce(mockDbResponse);

      // Call findManyCustom
      const result = await discoveredAutomationRepository.findManyCustom({
        organization_id: testOrgId,
        is_active: true
      });

      // ASSERTION 1: Query includes JOIN
      expect(mockQuery).toHaveBeenCalledTimes(1);
      const queryCall = mockQuery.mock.calls[0][0];

      expect(queryCall).toContain('FROM discovered_automations');
      expect(queryCall).toContain('LEFT JOIN platform_connections');
      expect(queryCall).toContain('ON');
      expect(queryCall).toContain('platform_connection_id');

      // ASSERTION 2: Query selects platform_type
      expect(queryCall).toContain('platform_type');

      // ASSERTION 3: Result includes platform_type
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toHaveProperty('platform_type');
      expect(result.data[0].platform_type).toBe('google');
    });

    it('should handle NULL platform_type for missing platform_connections', async () => {
      const mockDbResponse = {
        rows: [
          {
            id: 'automation_orphan',
            name: 'Orphaned Automation',
            organization_id: 'org_test',
            platform_connection_id: 'conn_deleted',
            discovery_run_id: 'run_1',
            external_id: 'ext_orphan',
            automation_type: 'integration',
            status: 'inactive',
            trigger_type: null,
            actions: [],
            permissions_required: [],
            data_access_patterns: [],
            owner_info: {},
            platform_metadata: {},
            first_discovered_at: new Date(),
            last_seen_at: new Date(),
            is_active: false,
            created_at: new Date(),
            updated_at: new Date(),
            // LEFT JOIN should return NULL if platform_connection doesn't exist
            platform_type: null
          }
        ],
        rowCount: 1,
        command: 'SELECT'
      };

      mockQuery.mockResolvedValueOnce(mockDbResponse);

      const result = await discoveredAutomationRepository.findManyCustom({
        organization_id: 'org_test'
      });

      expect(result.data[0].platform_type).toBeNull();
    });

    it('should retrieve multiple automations with correct platform_types', async () => {
      const mockDbResponse = {
        rows: [
          {
            id: 'auto_slack',
            name: 'Slack Bot',
            platform_connection_id: 'conn_slack',
            platform_type: 'slack',
            organization_id: 'org_test',
            discovery_run_id: 'run_1',
            external_id: 'ext_slack',
            automation_type: 'bot',
            status: 'active',
            trigger_type: 'webhook',
            actions: [],
            permissions_required: [],
            data_access_patterns: [],
            owner_info: {},
            platform_metadata: {},
            first_discovered_at: new Date(),
            last_seen_at: new Date(),
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          },
          {
            id: 'auto_google',
            name: 'Google Workflow',
            platform_connection_id: 'conn_google',
            platform_type: 'google',
            organization_id: 'org_test',
            discovery_run_id: 'run_1',
            external_id: 'ext_google',
            automation_type: 'workflow',
            status: 'active',
            trigger_type: 'scheduled',
            actions: [],
            permissions_required: [],
            data_access_patterns: [],
            owner_info: {},
            platform_metadata: {},
            first_discovered_at: new Date(),
            last_seen_at: new Date(),
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          },
          {
            id: 'auto_microsoft',
            name: 'Teams Integration',
            platform_connection_id: 'conn_microsoft',
            platform_type: 'microsoft',
            organization_id: 'org_test',
            discovery_run_id: 'run_1',
            external_id: 'ext_microsoft',
            automation_type: 'integration',
            status: 'active',
            trigger_type: 'event',
            actions: [],
            permissions_required: [],
            data_access_patterns: [],
            owner_info: {},
            platform_metadata: {},
            first_discovered_at: new Date(),
            last_seen_at: new Date(),
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          }
        ],
        rowCount: 3,
        command: 'SELECT'
      };

      mockQuery.mockResolvedValueOnce(mockDbResponse);

      const result = await discoveredAutomationRepository.findManyCustom({
        organization_id: 'org_test',
        is_active: true
      });

      expect(result.data).toHaveLength(3);
      expect(result.data[0].platform_type).toBe('slack');
      expect(result.data[1].platform_type).toBe('google');
      expect(result.data[2].platform_type).toBe('microsoft');
    });
  });

  describe('getByPlatformForOrganization - Existing JOIN Verification', () => {
    it('should use existing JOIN implementation correctly', async () => {
      const mockStats = {
        rows: [
          { platform_type: 'slack', count: '5' },
          { platform_type: 'google', count: '12' },
          { platform_type: 'microsoft', count: '3' }
        ],
        rowCount: 3,
        command: 'SELECT'
      };

      mockQuery.mockResolvedValueOnce(mockStats);

      const result = await discoveredAutomationRepository.getByPlatformForOrganization('org_test');

      // Verify the existing JOIN is correct
      const queryCall = mockQuery.mock.calls[0][0];
      expect(queryCall).toContain('JOIN platform_connections pc ON da.platform_connection_id = pc.id');
      expect(queryCall).toContain('GROUP BY pc.platform_type');

      expect(result).toHaveLength(3);
      expect(result[0].platform_type).toBe('slack');
      expect(result[0].count).toBe('5');
    });
  });

  describe('Query Performance and Correctness', () => {
    it('should use LEFT JOIN to preserve automations with missing connections', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT' });

      await discoveredAutomationRepository.findManyCustom({
        organization_id: 'org_test'
      });

      const queryCall = mockQuery.mock.calls[0][0];

      // Should use LEFT JOIN, not INNER JOIN
      expect(queryCall).toContain('LEFT JOIN');
      expect(queryCall).not.toContain('INNER JOIN');
    });

    it('should apply filters correctly with JOIN', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT' });

      await discoveredAutomationRepository.findManyCustom({
        organization_id: 'org_test',
        automation_type: 'integration',
        is_active: true
      });

      const queryCall = mockQuery.mock.calls[0][0];
      const queryParams = mockQuery.mock.calls[0][1];

      // Verify filters are applied
      expect(queryCall).toContain('WHERE');
      expect(queryCall).toContain('organization_id');
      expect(queryCall).toContain('automation_type');
      expect(queryCall).toContain('is_active');

      expect(queryParams).toContain('org_test');
      expect(queryParams).toContain('integration');
      expect(queryParams).toContain(true);
    });

    it('should order results correctly', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT' });

      await discoveredAutomationRepository.findManyCustom({
        organization_id: 'org_test'
      });

      const queryCall = mockQuery.mock.calls[0][0];

      // Verify ordering
      expect(queryCall).toContain('ORDER BY');
      expect(queryCall).toContain('last_seen_at DESC');
      expect(queryCall).toContain('created_at DESC');
    });
  });

  describe('Real-World Data Scenarios', () => {
    it('should handle ChatGPT automation with complete metadata', async () => {
      const chatGPTAutomation = {
        id: 'chatgpt-automation-id',
        name: 'ChatGPT',
        description: 'AI Platform Integration: OpenAI / ChatGPT',
        organization_id: 'org_test',
        platform_connection_id: 'conn_google_workspace',
        discovery_run_id: 'run_20251006',
        external_id: '77377267392-xxx.apps.googleusercontent.com',
        automation_type: 'integration',
        status: 'active',
        trigger_type: 'oauth',
        actions: ['api_access', 'data_read'],
        permissions_required: [],
        data_access_patterns: [],
        owner_info: {},
        platform_metadata: {
          isAIPlatform: true,
          platformName: 'OpenAI / ChatGPT',
          scopes: [
            'https://www.googleapis.com/auth/drive.readonly',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
            'openid'
          ],
          clientId: '77377267392-xxx.apps.googleusercontent.com',
          riskFactors: [
            'AI platform integration: openai',
            '4 OAuth scopes granted',
            'Google Drive access: 1 scope(s)'
          ],
          detectionMethod: 'oauth_tokens_api'
        },
        first_discovered_at: new Date('2025-10-06T08:27:30.777Z'),
        last_seen_at: new Date('2025-10-06T08:27:30.777Z'),
        is_active: true,
        created_at: new Date('2025-10-06T08:27:30.777Z'),
        updated_at: new Date('2025-10-06T08:27:30.777Z'),
        platform_type: 'google' // FROM JOIN
      };

      mockQuery.mockResolvedValueOnce({
        rows: [chatGPTAutomation],
        rowCount: 1,
        command: 'SELECT'
      });

      const result = await discoveredAutomationRepository.findManyCustom({
        organization_id: 'org_test',
        is_active: true
      });

      const automation = result.data[0];

      // Verify all data is present
      expect(automation.name).toBe('ChatGPT');
      expect(automation.platform_type).toBe('google');
      expect(automation.platform_metadata).toHaveProperty('isAIPlatform', true);
      expect(automation.platform_metadata).toHaveProperty('platformName', 'OpenAI / ChatGPT');
      expect(automation.platform_metadata.scopes).toHaveLength(4);
      expect(automation.platform_metadata.riskFactors).toHaveLength(3);
    });

    it('should handle Claude automation with AI metadata', async () => {
      const claudeAutomation = {
        id: 'claude-automation-id',
        name: 'Claude',
        description: 'AI Platform Integration: Anthropic / Claude',
        organization_id: 'org_test',
        platform_connection_id: 'conn_google_workspace_2',
        discovery_run_id: 'run_20251006',
        external_id: '77377267392-yyy.apps.googleusercontent.com',
        automation_type: 'integration',
        status: 'active',
        trigger_type: 'oauth',
        actions: ['api_access', 'data_read'],
        permissions_required: [],
        data_access_patterns: [],
        owner_info: {},
        platform_metadata: {
          isAIPlatform: true,
          platformName: 'Anthropic / Claude',
          scopes: [
            'https://www.googleapis.com/auth/drive.readonly',
            'https://www.googleapis.com/auth/userinfo.email'
          ],
          clientId: '77377267392-yyy.apps.googleusercontent.com',
          riskFactors: [
            'AI platform integration: anthropic',
            '2 OAuth scopes granted',
            'Google Drive access detected'
          ],
          detectionMethod: 'oauth_tokens_api'
        },
        first_discovered_at: new Date('2025-10-06T08:30:00.000Z'),
        last_seen_at: new Date('2025-10-06T08:30:00.000Z'),
        is_active: true,
        created_at: new Date('2025-10-06T08:30:00.000Z'),
        updated_at: new Date('2025-10-06T08:30:00.000Z'),
        platform_type: 'google' // FROM JOIN
      };

      mockQuery.mockResolvedValueOnce({
        rows: [claudeAutomation],
        rowCount: 1,
        command: 'SELECT'
      });

      const result = await discoveredAutomationRepository.findManyCustom({
        organization_id: 'org_test',
        is_active: true
      });

      const automation = result.data[0];

      expect(automation.name).toBe('Claude');
      expect(automation.platform_type).toBe('google');
      expect(automation.platform_metadata.isAIPlatform).toBe(true);
      expect(automation.platform_metadata.platformName).toBe('Anthropic / Claude');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty result set', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT'
      });

      const result = await discoveredAutomationRepository.findManyCustom({
        organization_id: 'org_nonexistent'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(
        discoveredAutomationRepository.findManyCustom({ organization_id: 'org_test' })
      ).rejects.toThrow('Database connection failed');
    });
  });
});
