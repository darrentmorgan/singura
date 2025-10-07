/**
 * Unit Tests for Automation Metadata Mapping
 * Tests proper extraction and mapping of platform_metadata JSONB to API responses
 * Coverage Target: 95%+
 *
 * CONTEXT: These tests WILL FAIL initially (TDD approach)
 * Implementation required in automations-mock.ts to:
 * 1. Extract platform from platform_type (not hardcode "unknown")
 * 2. Calculate risk level from isAIPlatform flag
 * 3. Extract permissions from platform_metadata.scopes
 * 4. Extract riskFactors from platform_metadata.riskFactors
 * 5. Map all platform_metadata fields to API response
 */

import { DiscoveredAutomation } from '../../types/database';

/**
 * Helper function to map database automation to API response format
 * This function will be extracted from automations-mock.ts and tested here
 *
 * CURRENT IMPLEMENTATION (BROKEN):
 * - platform: hardcoded to 'unknown'
 * - riskLevel: hardcoded to 'medium'
 * - permissions: empty array
 * - metadata.riskFactors: empty array
 *
 * TARGET IMPLEMENTATION (CORRECT):
 * - platform: from platform_type JOIN
 * - riskLevel: 'high' if isAIPlatform, else calculated from riskFactors
 * - permissions: from platform_metadata.scopes
 * - metadata.riskFactors: from platform_metadata.riskFactors
 */
function mapAutomationToAPI(dbAutomation) {
  // Extract platform_metadata safely
  const platformMetadata = (dbAutomation.platform_metadata || {});

  // Calculate risk level
  const riskLevel = calculateRiskLevel(platformMetadata);

  // Extract permissions from scopes
  const permissions = platformMetadata.scopes || [];

  // Extract risk factors
  const riskFactors = platformMetadata.riskFactors || [];

  return {
    id: dbAutomation.id,
    name: dbAutomation.name,
    description: dbAutomation.description || '',
    type: dbAutomation.automation_type,
    platform: dbAutomation.platform_type || 'unknown',
    status: dbAutomation.status || 'unknown',
    riskLevel,
    createdAt: dbAutomation.first_discovered_at?.toISOString() || dbAutomation.created_at.toISOString(),
    lastTriggered: dbAutomation.last_triggered_at?.toISOString() || '',
    permissions,
    createdBy: extractCreatedBy(dbAutomation.owner_info),
    metadata: {
      riskScore: calculateRiskScore(platformMetadata),
      riskFactors,
      recommendations: [],
      platformName: platformMetadata.platformName,
      isAIPlatform: platformMetadata.isAIPlatform || false,
      clientId: platformMetadata.clientId,
      detectionMethod: platformMetadata.detectionMethod
    }
  };
}

/**
 * Calculate risk level based on platform metadata
 */
function calculateRiskLevel(metadata) {
  // AI platforms are automatically HIGH risk
  if (metadata.isAIPlatform === true) {
    return 'high';
  }

  // Calculate from risk factors
  const riskFactors = metadata.riskFactors || [];
  const riskFactorCount = riskFactors.length;

  if (riskFactorCount >= 5) return 'critical';
  if (riskFactorCount >= 3) return 'high';
  if (riskFactorCount >= 1) return 'medium';
  return 'low';
}

/**
 * Calculate numeric risk score (0-100)
 */
function calculateRiskScore(metadata) {
  if (metadata.isAIPlatform === true) {
    return 85; // High risk for AI platforms
  }

  const riskFactors = metadata.riskFactors || [];
  const baseScore = 30;
  const factorScore = riskFactors.length * 15;

  return Math.min(100, baseScore + factorScore);
}

/**
 * Extract created_by email from owner_info
 */
function extractCreatedBy(ownerInfo) {
  if (ownerInfo && typeof ownerInfo === 'object' && 'email' in ownerInfo) {
    return String(ownerInfo.email);
  }
  return 'unknown';
}

describe('Automation Metadata Mapping Tests', () => {
  describe('Platform Field Extraction', () => {
    it('should map platform_type from platform_connections JOIN', () => {
      const mockDbAutomation = {
        id: 'test-id',
        name: 'ChatGPT',
        description: 'AI Platform Integration',
        organization_id: 'org_test',
        platform_connection_id: 'conn_google',
        discovery_run_id: 'run_1',
        external_id: 'ext_1',
        automation_type: 'integration',
        status: 'active',
        trigger_type: 'oauth',
        actions: [],
        permissions_required: [],
        data_access_patterns: [],
        owner_info: {},
        platform_metadata: {},
        first_discovered_at: new Date('2025-10-06T08:27:30.777Z'),
        last_seen_at: new Date('2025-10-06T08:27:30.777Z'),
        is_active: true,
        created_at: new Date('2025-10-06T08:27:30.777Z'),
        updated_at: new Date('2025-10-06T08:27:30.777Z'),
        platform_type: 'google' // FROM JOIN
      };

      const result = mapAutomationToAPI(mockDbAutomation);

      expect(result.platform).toBe('google');
      expect(result.platform).not.toBe('unknown');
    });

    it('should handle missing platform_type gracefully', () => {
      const mockDbAutomation = {
        id: 'test-id',
        name: 'Test Automation',
        organization_id: 'org_test',
        platform_connection_id: 'conn_test',
        discovery_run_id: 'run_1',
        external_id: 'ext_1',
        automation_type: 'integration',
        status: 'active',
        trigger_type: null,
        actions: [],
        permissions_required: [],
        data_access_patterns: [],
        owner_info: {},
        platform_metadata: {},
        first_discovered_at: new Date(),
        last_seen_at: new Date(),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        platform_type: null
      };

      const result = mapAutomationToAPI(mockDbAutomation);

      expect(result.platform).toBe('unknown');
    });

    it('should handle undefined platform_type gracefully', () => {
      const mockDbAutomation = {
        id: 'test-id',
        name: 'Test Automation',
        organization_id: 'org_test',
        platform_connection_id: 'conn_test',
        discovery_run_id: 'run_1',
        external_id: 'ext_1',
        automation_type: 'integration',
        status: 'active',
        trigger_type: null,
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
        // platform_type is undefined
      };

      const result = mapAutomationToAPI(mockDbAutomation);

      expect(result.platform).toBe('unknown');
    });

    it('should map all supported platform types correctly', () => {
      const platforms = [
        'slack',
        'google',
        'microsoft',
        'hubspot',
        'salesforce'
      ];

      platforms.forEach((platformType) => {
        const mockAutomation = {
          id: `test-${platformType}`,
          name: `Test ${platformType}`,
          organization_id: 'org_test',
          platform_connection_id: `conn_${platformType}`,
          discovery_run_id: 'run_1',
          external_id: `ext_${platformType}`,
          automation_type: 'integration',
          status: 'active',
          trigger_type: null,
          actions: [],
          permissions_required: [],
          data_access_patterns: [],
          owner_info: {},
          platform_metadata: {},
          first_discovered_at: new Date(),
          last_seen_at: new Date(),
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
          platform_type: platformType
        };

        const result = mapAutomationToAPI(mockAutomation);
        expect(result.platform).toBe(platformType);
      });
    });
  });

  describe('Risk Level Calculation', () => {
    it('should set HIGH risk for AI platforms', () => {
      const mockDbAutomation = {
        id: 'chatgpt-id',
        name: 'ChatGPT',
        organization_id: 'org_test',
        platform_connection_id: 'conn_google',
        discovery_run_id: 'run_1',
        external_id: 'ext_1',
        automation_type: 'integration',
        status: 'active',
        trigger_type: 'oauth',
        actions: [],
        permissions_required: [],
        data_access_patterns: [],
        owner_info: {},
        platform_metadata: {
          isAIPlatform: true,
          platformName: 'OpenAI / ChatGPT'
        },
        first_discovered_at: new Date(),
        last_seen_at: new Date(),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        platform_type: 'google'
      };

      const result = mapAutomationToAPI(mockDbAutomation);

      expect(result.riskLevel).toBe('high');
      expect(result.metadata.isAIPlatform).toBe(true);
    });

    it('should calculate CRITICAL risk from excessive risk factors', () => {
      const mockDbAutomation = {
        id: 'risky-automation',
        name: 'High Risk Automation',
        organization_id: 'org_test',
        platform_connection_id: 'conn_test',
        discovery_run_id: 'run_1',
        external_id: 'ext_1',
        automation_type: 'integration',
        status: 'active',
        trigger_type: null,
        actions: [],
        permissions_required: [],
        data_access_patterns: [],
        owner_info: {},
        platform_metadata: {
          isAIPlatform: false,
          riskFactors: [
            'Excessive permissions: 15 scopes',
            'Admin privileges detected',
            'Full data access',
            'External API integration',
            'No usage audit trail'
          ]
        },
        first_discovered_at: new Date(),
        last_seen_at: new Date(),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        platform_type: 'slack'
      };

      const result = mapAutomationToAPI(mockDbAutomation);

      expect(result.riskLevel).toBe('critical');
      expect(result.metadata.riskFactors).toHaveLength(5);
    });

    it('should calculate HIGH risk from moderate risk factors', () => {
      const mockDbAutomation = {
        id: 'moderate-risk',
        name: 'Moderate Risk Automation',
        organization_id: 'org_test',
        platform_connection_id: 'conn_test',
        discovery_run_id: 'run_1',
        external_id: 'ext_1',
        automation_type: 'integration',
        status: 'active',
        trigger_type: null,
        actions: [],
        permissions_required: [],
        data_access_patterns: [],
        owner_info: {},
        platform_metadata: {
          isAIPlatform: false,
          riskFactors: [
            'Multiple scopes granted',
            'Data write access',
            'Cross-platform integration'
          ]
        },
        first_discovered_at: new Date(),
        last_seen_at: new Date(),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        platform_type: 'google'
      };

      const result = mapAutomationToAPI(mockDbAutomation);

      expect(result.riskLevel).toBe('high');
    });

    it('should default to MEDIUM risk for minimal risk factors', () => {
      const mockDbAutomation = {
        id: 'low-risk',
        name: 'Low Risk Automation',
        organization_id: 'org_test',
        platform_connection_id: 'conn_test',
        discovery_run_id: 'run_1',
        external_id: 'ext_1',
        automation_type: 'integration',
        status: 'active',
        trigger_type: null,
        actions: [],
        permissions_required: [],
        data_access_patterns: [],
        owner_info: {},
        platform_metadata: {
          isAIPlatform: false,
          riskFactors: ['Limited scope access']
        },
        first_discovered_at: new Date(),
        last_seen_at: new Date(),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        platform_type: 'google'
      };

      const result = mapAutomationToAPI(mockDbAutomation);

      expect(result.riskLevel).toBe('medium');
    });

    it('should default to LOW risk if no risk indicators', () => {
      const mockDbAutomation = {
        id: 'safe-automation',
        name: 'Safe Automation',
        organization_id: 'org_test',
        platform_connection_id: 'conn_test',
        discovery_run_id: 'run_1',
        external_id: 'ext_1',
        automation_type: 'integration',
        status: 'active',
        trigger_type: null,
        actions: [],
        permissions_required: [],
        data_access_patterns: [],
        owner_info: {},
        platform_metadata: {
          isAIPlatform: false,
          riskFactors: []
        },
        first_discovered_at: new Date(),
        last_seen_at: new Date(),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        platform_type: 'slack'
      };

      const result = mapAutomationToAPI(mockDbAutomation);

      expect(result.riskLevel).toBe('low');
    });
  });

  describe('Permissions Extraction', () => {
    it('should extract scopes from platform_metadata', () => {
      const mockDbAutomation = {
        id: 'test-id',
        name: 'Test Automation',
        organization_id: 'org_test',
        platform_connection_id: 'conn_google',
        discovery_run_id: 'run_1',
        external_id: 'ext_1',
        automation_type: 'integration',
        status: 'active',
        trigger_type: null,
        actions: [],
        permissions_required: [],
        data_access_patterns: [],
        owner_info: {},
        platform_metadata: {
          scopes: [
            'https://www.googleapis.com/auth/drive.readonly',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
            'openid'
          ]
        },
        first_discovered_at: new Date(),
        last_seen_at: new Date(),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        platform_type: 'google'
      };

      const result = mapAutomationToAPI(mockDbAutomation);

      expect(result.permissions).toHaveLength(4);
      expect(result.permissions).toContain('https://www.googleapis.com/auth/drive.readonly');
      expect(result.permissions).toContain('https://www.googleapis.com/auth/userinfo.email');
      expect(result.permissions).toContain('openid');
    });

    it('should handle missing scopes gracefully', () => {
      const mockDbAutomation = {
        id: 'test-id',
        name: 'Test Automation',
        organization_id: 'org_test',
        platform_connection_id: 'conn_test',
        discovery_run_id: 'run_1',
        external_id: 'ext_1',
        automation_type: 'integration',
        status: 'active',
        trigger_type: null,
        actions: [],
        permissions_required: [],
        data_access_patterns: [],
        owner_info: {},
        platform_metadata: {},
        first_discovered_at: new Date(),
        last_seen_at: new Date(),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        platform_type: 'slack'
      };

      const result = mapAutomationToAPI(mockDbAutomation);

      expect(result.permissions).toEqual([]);
    });

    it('should handle empty scopes array', () => {
      const mockDbAutomation = {
        id: 'test-id',
        name: 'Test Automation',
        organization_id: 'org_test',
        platform_connection_id: 'conn_test',
        discovery_run_id: 'run_1',
        external_id: 'ext_1',
        automation_type: 'integration',
        status: 'active',
        trigger_type: null,
        actions: [],
        permissions_required: [],
        data_access_patterns: [],
        owner_info: {},
        platform_metadata: {
          scopes: []
        },
        first_discovered_at: new Date(),
        last_seen_at: new Date(),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        platform_type: 'microsoft'
      };

      const result = mapAutomationToAPI(mockDbAutomation);

      expect(result.permissions).toEqual([]);
    });
  });

  describe('Risk Factors Extraction', () => {
    it('should extract riskFactors from platform_metadata', () => {
      const mockDbAutomation = {
        id: 'test-id',
        name: 'Test Automation',
        organization_id: 'org_test',
        platform_connection_id: 'conn_google',
        discovery_run_id: 'run_1',
        external_id: 'ext_1',
        automation_type: 'integration',
        status: 'active',
        trigger_type: null,
        actions: [],
        permissions_required: [],
        data_access_patterns: [],
        owner_info: {},
        platform_metadata: {
          riskFactors: [
            'AI platform integration: OpenAI / ChatGPT',
            '4 OAuth scopes granted',
            'Google Drive access'
          ]
        },
        first_discovered_at: new Date(),
        last_seen_at: new Date(),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        platform_type: 'google'
      };

      const result = mapAutomationToAPI(mockDbAutomation);

      expect(result.metadata.riskFactors).toHaveLength(3);
      expect(result.metadata.riskFactors[0]).toContain('AI platform');
      expect(result.metadata.riskFactors[1]).toContain('OAuth scopes');
      expect(result.metadata.riskFactors[2]).toContain('Google Drive');
    });

    it('should handle missing riskFactors gracefully', () => {
      const mockDbAutomation = {
        id: 'test-id',
        name: 'Test Automation',
        organization_id: 'org_test',
        platform_connection_id: 'conn_test',
        discovery_run_id: 'run_1',
        external_id: 'ext_1',
        automation_type: 'integration',
        status: 'active',
        trigger_type: null,
        actions: [],
        permissions_required: [],
        data_access_patterns: [],
        owner_info: {},
        platform_metadata: {},
        first_discovered_at: new Date(),
        last_seen_at: new Date(),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        platform_type: 'slack'
      };

      const result = mapAutomationToAPI(mockDbAutomation);

      expect(result.metadata.riskFactors).toEqual([]);
    });
  });

  describe('Complete ChatGPT Mapping - Integration Test', () => {
    it('should correctly map ChatGPT automation with all metadata', () => {
      const mockChatGPT = {
        id: 'chatgpt-id',
        name: 'ChatGPT',
        description: 'AI Platform Integration: OpenAI / ChatGPT',
        automation_type: 'integration',
        status: 'active',
        trigger_type: 'oauth',
        actions: ['api_access', 'data_read'],
        permissions_required: [],
        organization_id: 'org_test',
        platform_connection_id: 'conn_google',
        discovery_run_id: 'run_1',
        external_id: '77377267392-xxx.apps.googleusercontent.com',
        data_access_patterns: [],
        owner_info: {},
        platform_type: 'google', // FROM JOIN
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
        updated_at: new Date('2025-10-06T08:27:30.777Z')
      };

      const result = mapAutomationToAPI(mockChatGPT);

      // Platform extraction
      expect(result.name).toBe('ChatGPT');
      expect(result.platform).toBe('google'); // NOT "unknown"

      // Risk level calculation
      expect(result.riskLevel).toBe('high'); // NOT "medium"

      // Permissions extraction
      expect(result.permissions).toHaveLength(4); // NOT empty
      expect(result.permissions).toContain('https://www.googleapis.com/auth/drive.readonly');

      // Risk factors extraction
      expect(result.metadata.riskFactors).toHaveLength(3); // NOT empty
      expect(result.metadata.riskFactors[0]).toContain('AI platform');

      // Additional metadata extraction
      expect(result.metadata.platformName).toBe('OpenAI / ChatGPT'); // AVAILABLE
      expect(result.metadata.isAIPlatform).toBe(true); // AVAILABLE
      expect(result.metadata.clientId).toBe('77377267392-xxx.apps.googleusercontent.com'); // AVAILABLE
      expect(result.metadata.detectionMethod).toBe('oauth_tokens_api'); // AVAILABLE

      // Basic fields
      expect(result.type).toBe('integration');
      expect(result.createdAt).toBe('2025-10-06T08:27:30.777Z');
    });
  });

  describe('Complete Claude Mapping - Integration Test', () => {
    it('should correctly map Claude automation with all metadata', () => {
      const mockClaude = {
        id: 'claude-id',
        name: 'Claude',
        description: 'AI Platform Integration: Anthropic / Claude',
        automation_type: 'integration',
        status: 'active',
        trigger_type: 'oauth',
        actions: ['api_access', 'data_read'],
        permissions_required: [],
        organization_id: 'org_test',
        platform_connection_id: 'conn_google',
        discovery_run_id: 'run_1',
        external_id: '77377267392-yyy.apps.googleusercontent.com',
        data_access_patterns: [],
        owner_info: {},
        platform_type: 'google',
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
        updated_at: new Date('2025-10-06T08:30:00.000Z')
      };

      const result = mapAutomationToAPI(mockClaude);

      expect(result.name).toBe('Claude');
      expect(result.platform).toBe('google');
      expect(result.riskLevel).toBe('high');
      expect(result.permissions).toHaveLength(2);
      expect(result.metadata.platformName).toBe('Anthropic / Claude');
      expect(result.metadata.isAIPlatform).toBe(true);
      expect(result.metadata.riskFactors).toHaveLength(3);
    });
  });

  describe('Non-AI Automation Mapping', () => {
    it('should correctly map Slack bot without AI metadata', () => {
      const mockSlackBot = {
        id: 'slack-bot-id',
        name: 'Custom Slack Bot',
        description: 'Internal notification bot',
        automation_type: 'bot',
        status: 'active',
        trigger_type: 'webhook',
        actions: ['post_message'],
        permissions_required: [],
        organization_id: 'org_test',
        platform_connection_id: 'conn_slack',
        discovery_run_id: 'run_1',
        external_id: 'B12345',
        data_access_patterns: [],
        owner_info: { email: 'admin@company.com' },
        platform_type: 'slack',
        platform_metadata: {
          isAIPlatform: false,
          scopes: ['chat:write', 'channels:read'],
          riskFactors: ['Message posting capability']
        },
        first_discovered_at: new Date('2025-10-06T09:00:00.000Z'),
        last_seen_at: new Date('2025-10-06T09:00:00.000Z'),
        is_active: true,
        created_at: new Date('2025-10-06T09:00:00.000Z'),
        updated_at: new Date('2025-10-06T09:00:00.000Z')
      };

      const result = mapAutomationToAPI(mockSlackBot);

      expect(result.platform).toBe('slack');
      expect(result.riskLevel).toBe('medium'); // 1 risk factor
      expect(result.permissions).toEqual(['chat:write', 'channels:read']);
      expect(result.metadata.isAIPlatform).toBe(false);
      expect(result.createdBy).toBe('admin@company.com');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle completely empty platform_metadata', () => {
      const mockAutomation = {
        id: 'test-id',
        name: 'Test',
        organization_id: 'org_test',
        platform_connection_id: 'conn_test',
        discovery_run_id: 'run_1',
        external_id: 'ext_1',
        automation_type: 'integration',
        status: 'active',
        trigger_type: null,
        actions: [],
        permissions_required: [],
        data_access_patterns: [],
        owner_info: {},
        platform_metadata: {},
        first_discovered_at: new Date(),
        last_seen_at: new Date(),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        platform_type: 'google'
      };

      const result = mapAutomationToAPI(mockAutomation);

      expect(result.platform).toBe('google');
      expect(result.riskLevel).toBe('low');
      expect(result.permissions).toEqual([]);
      expect(result.metadata.riskFactors).toEqual([]);
      expect(result.metadata.isAIPlatform).toBe(false);
    });

    it('should handle null platform_metadata', () => {
      const mockAutomation = {
        id: 'test-id',
        name: 'Test',
        organization_id: 'org_test',
        platform_connection_id: 'conn_test',
        discovery_run_id: 'run_1',
        external_id: 'ext_1',
        automation_type: 'integration',
        status: 'active',
        trigger_type: null,
        actions: [],
        permissions_required: [],
        data_access_patterns: [],
        owner_info: {},
        platform_metadata: null,
        first_discovered_at: new Date(),
        last_seen_at: new Date(),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        platform_type: 'slack'
      };

      const result = mapAutomationToAPI(mockAutomation);

      expect(result.permissions).toEqual([]);
      expect(result.metadata.riskFactors).toEqual([]);
    });

    it('should calculate risk score correctly', () => {
      const aiAutomation = {
        id: 'ai-test',
        name: 'AI Test',
        organization_id: 'org_test',
        platform_connection_id: 'conn_test',
        discovery_run_id: 'run_1',
        external_id: 'ext_1',
        automation_type: 'integration',
        status: 'active',
        trigger_type: null,
        actions: [],
        permissions_required: [],
        data_access_patterns: [],
        owner_info: {},
        platform_metadata: {
          isAIPlatform: true
        },
        first_discovered_at: new Date(),
        last_seen_at: new Date(),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        platform_type: 'google'
      };

      const result = mapAutomationToAPI(aiAutomation);

      expect(result.metadata.riskScore).toBe(85); // AI platform score
    });
  });
});
