/**
 * Automation Metadata Helpers Unit Tests
 * Tests extraction of OAuth context, detection evidence, and technical details
 */

import {
  extractOAuthContext,
  extractDetectionEvidence,
  extractTechnicalDetails,
  OAuthContext,
  DetectionEvidence,
  TechnicalDetails
} from '../../../src/utils/automation-metadata-helpers';

describe('Automation Metadata Helpers', () => {
  describe('extractOAuthContext', () => {
    it('should extract full OAuth context from Google OAuth app metadata', () => {
      // Real data from database: Google Chrome OAuth app
      const platformMetadata = {
        scopes: [
          'https://www.googleapis.com/auth/userinfo.profile'
        ],
        scopeCount: 1,
        clientId: '77185425430.apps.googleusercontent.com',
        authorizedBy: 'jess@baliluxurystays.com',
        firstAuthorization: '2024-05-30T03:10:37.000Z',
        lastActivity: '2024-05-30T03:10:37.000Z',
        authorizationAge: 151
      };

      const result = extractOAuthContext(platformMetadata);

      expect(result).not.toBeNull();
      expect(result).toMatchObject({
        scopes: ['https://www.googleapis.com/auth/userinfo.profile'],
        scopeCount: 1,
        clientId: '77185425430.apps.googleusercontent.com',
        authorizedBy: 'jess@baliluxurystays.com',
        firstAuthorization: '2024-05-30T03:10:37.000Z',
        lastActivity: '2024-05-30T03:10:37.000Z',
        authorizationAge: 151
      });
    });

    it('should extract OAuth context with scopeCount calculated from scopes array length', () => {
      const platformMetadata = {
        scopes: [
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/drive.readonly'
        ],
        clientId: 'test-client-id',
        authorizedBy: 'test@example.com'
      };

      const result = extractOAuthContext(platformMetadata);

      expect(result).not.toBeNull();
      expect(result?.scopeCount).toBe(3);
      expect(result?.scopes).toHaveLength(3);
    });

    it('should return null when platformMetadata is null', () => {
      const result = extractOAuthContext(null);
      expect(result).toBeNull();
    });

    it('should return null when platformMetadata is undefined', () => {
      const result = extractOAuthContext(undefined);
      expect(result).toBeNull();
    });

    it('should return null when no OAuth-related data exists', () => {
      const platformMetadata = {
        someOtherField: 'value',
        randomData: 123
      };

      const result = extractOAuthContext(platformMetadata);
      expect(result).toBeNull();
    });

    it('should handle partial OAuth data (only scopes)', () => {
      const platformMetadata = {
        scopes: ['scope1', 'scope2']
      };

      const result = extractOAuthContext(platformMetadata);

      expect(result).not.toBeNull();
      expect(result?.scopes).toEqual(['scope1', 'scope2']);
      expect(result?.scopeCount).toBe(2);
      expect(result?.authorizedBy).toBeUndefined();
      expect(result?.clientId).toBeUndefined();
    });

    it('should handle empty scopes array', () => {
      const platformMetadata = {
        scopes: [],
        clientId: 'test-client'
      };

      const result = extractOAuthContext(platformMetadata);

      expect(result).not.toBeNull();
      expect(result?.scopes).toEqual([]);
      expect(result?.scopeCount).toBe(0);
    });

    it('should handle non-array scopes value gracefully', () => {
      const platformMetadata = {
        scopes: 'not-an-array',
        clientId: 'test-client'
      };

      const result = extractOAuthContext(platformMetadata);

      expect(result).not.toBeNull();
      expect(result?.scopes).toEqual([]);
      expect(result?.scopeCount).toBe(0);
    });
  });

  describe('extractDetectionEvidence', () => {
    it('should extract full detection evidence with AI platform detection', () => {
      const detectionMetadata = {
        lastUpdated: '2024-10-28T15:30:00.000Z',
        detectionPatterns: [
          {
            evidence: {
              eventCount: 263,
              timeWindowMs: 3983,
              automationConfidence: 95.8
            },
            metadata: {
              description: 'Batch operation detected: 263 similar events in 4 seconds',
              supportingEvents: ['event1', 'event2', 'event3']
            }
          }
        ]
      };

      const platformMetadata = {
        isAIPlatform: true,
        aiPlatforms: ['OpenAI', 'Claude'],
        aiPlatformConfidence: 95.8,
        aiEndpoints: ['https://api.openai.com/v1/chat/completions'],
        detectionMethod: 'oauth_tokens_api'
      };

      const result = extractDetectionEvidence(detectionMetadata, platformMetadata);

      expect(result).not.toBeNull();
      expect(result?.method).toBe('oauth_tokens_api');
      expect(result?.confidence).toBe(95.8);
      expect(result?.lastUpdated).toBe('2024-10-28T15:30:00.000Z');
      expect(result?.patterns).toHaveLength(1);
      expect(result?.patterns[0]).toMatchObject({
        description: 'Batch operation detected: 263 similar events in 4 seconds',
        eventCount: 263,
        timeWindowMs: 3983,
        confidence: 95.8
      });
      expect(result?.aiPlatforms).toHaveLength(2);
      expect(result?.aiPlatforms?.[0]).toMatchObject({
        name: 'OpenAI',
        confidence: 95.8,
        endpoints: ['https://api.openai.com/v1/chat/completions']
      });
    });

    it('should handle detection patterns without metadata', () => {
      const detectionMetadata = {
        lastUpdated: '2024-10-28T15:30:00.000Z',
        detectionPatterns: [
          {
            evidence: {
              eventCount: 100,
              timeWindowMs: 1000,
              automationConfidence: 80.5
            }
          }
        ]
      };

      const result = extractDetectionEvidence(detectionMetadata, null);

      expect(result).not.toBeNull();
      expect(result?.patterns).toHaveLength(1);
      expect(result?.patterns[0]?.description).toBe('Pattern detected');
      expect(result?.patterns[0]?.confidence).toBe(80.5);
    });

    it('should return null when both detection and platform metadata are null', () => {
      const result = extractDetectionEvidence(null, null);
      expect(result).toBeNull();
    });

    it('should return null when no detection-related data exists', () => {
      const detectionMetadata = {
        someField: 'value'
      };
      const platformMetadata = {
        otherField: 'value'
      };

      const result = extractDetectionEvidence(detectionMetadata, platformMetadata);
      expect(result).toBeNull();
    });

    it('should limit supporting events to first 10 items', () => {
      const detectionMetadata = {
        lastUpdated: '2024-10-28T15:30:00.000Z',
        detectionPatterns: [
          {
            evidence: {
              eventCount: 50,
              timeWindowMs: 5000,
              automationConfidence: 90
            },
            metadata: {
              description: 'Pattern with many events',
              supportingEvents: Array.from({ length: 20 }, (_, i) => `event${i}`)
            }
          }
        ]
      };

      const result = extractDetectionEvidence(detectionMetadata, null);

      expect(result).not.toBeNull();
      expect(result?.patterns[0]?.supportingEvents).toHaveLength(10);
    });

    it('should use platform AI confidence when no patterns exist', () => {
      const platformMetadata = {
        isAIPlatform: true,
        aiPlatformConfidence: 87.5,
        detectionMethod: 'api_call_analysis'
      };

      const result = extractDetectionEvidence(null, platformMetadata);

      expect(result).not.toBeNull();
      expect(result?.confidence).toBe(87.5);
      expect(result?.method).toBe('api_call_analysis');
    });

    it('should handle AI platforms as string instead of array', () => {
      const platformMetadata = {
        isAIPlatform: true,
        aiPlatforms: 'OpenAI',
        aiPlatformConfidence: 90,
        detectionMethod: 'endpoint_detection'
      };

      const result = extractDetectionEvidence(null, platformMetadata);

      expect(result).not.toBeNull();
      expect(result?.aiPlatforms).toHaveLength(1);
      expect(result?.aiPlatforms?.[0]?.name).toBe('OpenAI');
    });

    it('should handle AI platforms as object with name property', () => {
      const platformMetadata = {
        isAIPlatform: true,
        aiPlatforms: [{ name: 'Claude', version: '3.5' }],
        aiPlatformConfidence: 92,
        detectionMethod: 'ml_classification'
      };

      const result = extractDetectionEvidence(null, platformMetadata);

      expect(result).not.toBeNull();
      expect(result?.aiPlatforms?.[0]?.name).toBe('Claude');
    });
  });

  describe('extractTechnicalDetails', () => {
    it('should extract full technical details from Apps Script metadata', () => {
      const platformMetadata = {
        scriptId: 'AKfycbzTest123',
        fileId: 'drive-file-id-123',
        driveFileId: 'drive-file-id-123',
        driveLocation: 'My Drive/Scripts',
        mimeType: 'application/vnd.google-apps.script',
        parentType: 'folder',
        owners: ['owner1@example.com', 'owner2@example.com'],
        shared: true,
        functions: ['onOpen', 'processData', 'sendEmail'],
        triggers: ['onEdit', 'time-driven'],
        description: 'Automated data processing script'
      };

      const result = extractTechnicalDetails(platformMetadata);

      expect(result).not.toBeNull();
      expect(result).toMatchObject({
        scriptId: 'AKfycbzTest123',
        fileId: 'drive-file-id-123',
        driveFileId: 'drive-file-id-123',
        driveLocation: 'My Drive/Scripts',
        mimeType: 'application/vnd.google-apps.script',
        parentType: 'folder',
        owners: ['owner1@example.com', 'owner2@example.com'],
        shared: true,
        functions: ['onOpen', 'processData', 'sendEmail'],
        triggers: ['onEdit', 'time-driven'],
        description: 'Automated data processing script'
      });
    });

    it('should return null when platformMetadata is null', () => {
      const result = extractTechnicalDetails(null);
      expect(result).toBeNull();
    });

    it('should return null when platformMetadata is undefined', () => {
      const result = extractTechnicalDetails(undefined);
      expect(result).toBeNull();
    });

    it('should return null when no technical data exists', () => {
      const platformMetadata = {
        someOtherField: 'value',
        randomData: 123
      };

      const result = extractTechnicalDetails(platformMetadata);
      expect(result).toBeNull();
    });

    it('should handle partial technical details (only scriptId)', () => {
      const platformMetadata = {
        scriptId: 'AKfycbzPartial'
      };

      const result = extractTechnicalDetails(platformMetadata);

      expect(result).not.toBeNull();
      expect(result?.scriptId).toBe('AKfycbzPartial');
      expect(result?.fileId).toBeUndefined();
      expect(result?.owners).toBeUndefined();
    });

    it('should handle non-array owners gracefully', () => {
      const platformMetadata = {
        scriptId: 'test-script',
        owners: 'not-an-array'
      };

      const result = extractTechnicalDetails(platformMetadata);

      expect(result).not.toBeNull();
      expect(result?.owners).toBeUndefined();
    });

    it('should handle non-array functions gracefully', () => {
      const platformMetadata = {
        fileId: 'test-file',
        functions: 'not-an-array'
      };

      const result = extractTechnicalDetails(platformMetadata);

      expect(result).not.toBeNull();
      expect(result?.functions).toBeUndefined();
    });

    it('should handle non-array triggers gracefully', () => {
      const platformMetadata = {
        scriptId: 'test-script',
        triggers: 'not-an-array'
      };

      const result = extractTechnicalDetails(platformMetadata);

      expect(result).not.toBeNull();
      expect(result?.triggers).toBeUndefined();
    });

    it('should extract technical details with minimal data (fileId only)', () => {
      const platformMetadata = {
        fileId: 'minimal-file-id'
      };

      const result = extractTechnicalDetails(platformMetadata);

      expect(result).not.toBeNull();
      expect(result?.fileId).toBe('minimal-file-id');
      expect(result?.scriptId).toBeUndefined();
    });
  });

  describe('Type safety and edge cases', () => {
    it('should handle object with wrong type', () => {
      const invalidMetadata = 'string-instead-of-object' as any;

      const oauthResult = extractOAuthContext(invalidMetadata);
      expect(oauthResult).toBeNull();

      const detectionResult = extractDetectionEvidence(invalidMetadata, null);
      expect(detectionResult).toBeNull();

      const technicalResult = extractTechnicalDetails(invalidMetadata);
      expect(technicalResult).toBeNull();
    });

    it('should handle empty objects', () => {
      const emptyMetadata = {};

      const oauthResult = extractOAuthContext(emptyMetadata);
      expect(oauthResult).toBeNull();

      const detectionResult = extractDetectionEvidence(emptyMetadata, emptyMetadata);
      expect(detectionResult).toBeNull();

      const technicalResult = extractTechnicalDetails(emptyMetadata);
      expect(technicalResult).toBeNull();
    });

    it('should handle metadata with null values for all fields', () => {
      const nullValueMetadata = {
        scopes: null,
        clientId: null,
        authorizedBy: null,
        scriptId: null,
        owners: null
      };

      const oauthResult = extractOAuthContext(nullValueMetadata);
      // Should return null because scopes is null (not an array) and no other OAuth data
      expect(oauthResult).toBeNull();

      const technicalResult = extractTechnicalDetails(nullValueMetadata);
      // Should return null because all fields are null (no actual data)
      expect(technicalResult).toBeNull();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle real-world Google OAuth app with all metadata', () => {
      const platformMetadata = {
        // OAuth data
        scopes: ['https://www.googleapis.com/auth/userinfo.profile'],
        scopeCount: 1,
        clientId: '77185425430.apps.googleusercontent.com',
        authorizedBy: 'jess@baliluxurystays.com',
        firstAuthorization: '2024-05-30T03:10:37.000Z',
        lastActivity: '2024-05-30T03:10:37.000Z',
        authorizationAge: 151,
        // Detection data
        isAIPlatform: false,
        detectionMethod: 'oauth_tokens_api',
        // Technical data
        platformName: 'Google Chrome'
      };

      const detectionMetadata = null;

      const oauth = extractOAuthContext(platformMetadata);
      const detection = extractDetectionEvidence(detectionMetadata, platformMetadata);
      const technical = extractTechnicalDetails(platformMetadata);

      expect(oauth).not.toBeNull();
      expect(oauth?.scopes).toHaveLength(1);
      expect(oauth?.authorizedBy).toBe('jess@baliluxurystays.com');

      expect(detection).not.toBeNull();
      expect(detection?.method).toBe('oauth_tokens_api');

      expect(technical).toBeNull(); // No scriptId, fileId, etc.
    });

    it('should handle Apps Script with AI detection', () => {
      const platformMetadata = {
        scriptId: 'AKfycbzAI123',
        fileId: 'drive-file-ai',
        mimeType: 'application/vnd.google-apps.script',
        owners: ['developer@company.com'],
        functions: ['processWithAI', 'analyzeData'],
        isAIPlatform: true,
        aiPlatforms: ['OpenAI'],
        aiPlatformConfidence: 98.5,
        detectionMethod: 'code_analysis'
      };

      const detectionMetadata = {
        lastUpdated: '2024-10-28T15:30:00.000Z',
        detectionPatterns: [
          {
            evidence: {
              eventCount: 50,
              timeWindowMs: 2000,
              automationConfidence: 98.5
            },
            metadata: {
              description: 'AI API calls detected in script code'
            }
          }
        ]
      };

      const oauth = extractOAuthContext(platformMetadata);
      const detection = extractDetectionEvidence(detectionMetadata, platformMetadata);
      const technical = extractTechnicalDetails(platformMetadata);

      expect(oauth).toBeNull(); // No OAuth data for Apps Script

      expect(detection).not.toBeNull();
      expect(detection?.confidence).toBe(98.5);
      expect(detection?.aiPlatforms).toHaveLength(1);
      expect(detection?.aiPlatforms?.[0]?.name).toBe('OpenAI');

      expect(technical).not.toBeNull();
      expect(technical?.scriptId).toBe('AKfycbzAI123');
      expect(technical?.functions).toContain('processWithAI');
    });
  });
});
