/**
 * Tests for Unified AI Platform Types
 */

import {
  AIplatformAuditLog,
  AIPlatform,
  AIActivityType,
  AIRiskIndicator,
  AIAuditLogQuery,
  AIAuditLogResult,
  UsageAnalytics,
  AIPlatformConnectionStatus,
  RiskSeverity,
  ComplianceFramework,
  FileReference,
  GeoLocation,
  AIDateRange
} from '../ai-platforms';

describe('AI Platform Types', () => {
  describe('AIplatformAuditLog', () => {
    it('should accept valid audit log for ChatGPT', () => {
      const log: AIplatformAuditLog = {
        id: 'log-chatgpt-123',
        platform: 'chatgpt',
        timestamp: new Date('2025-01-15T10:30:00Z'),
        userId: 'user-456',
        userEmail: 'john.doe@company.com',
        organizationId: 'org-789',
        activityType: 'conversation',
        action: 'conversation.created',
        metadata: {
          conversationId: 'conv-001',
          messageCount: 5,
          tokensUsed: 1500,
          model: 'gpt-4'
        },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        riskIndicators: []
      };

      expect(log.platform).toBe('chatgpt');
      expect(log.activityType).toBe('conversation');
      expect(log.metadata.model).toBe('gpt-4');
    });

    it('should accept valid audit log for Claude', () => {
      const log: AIplatformAuditLog = {
        id: 'log-claude-456',
        platform: 'claude',
        timestamp: new Date('2025-01-15T14:20:00Z'),
        userId: 'user-789',
        userEmail: 'jane.smith@company.com',
        organizationId: 'org-789',
        activityType: 'file_upload',
        action: 'file.uploaded',
        metadata: {
          files: [{
            fileId: 'file-001',
            fileName: 'financial_report.xlsx',
            fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            fileSize: 524288,
            uploadedAt: new Date('2025-01-15T14:20:00Z'),
            isSensitive: true
          }]
        },
        riskIndicators: [{
          type: 'sensitive_data',
          severity: 'high',
          description: 'Financial document uploaded to Claude',
          confidence: 90,
          evidence: ['File name contains "financial"', 'Excel spreadsheet detected'],
          complianceImpact: ['SOX', 'GDPR']
        }]
      };

      expect(log.platform).toBe('claude');
      expect(log.riskIndicators).toHaveLength(1);
      expect(log.riskIndicators[0].severity).toBe('high');
    });

    it('should accept valid audit log for Gemini', () => {
      const log: AIplatformAuditLog = {
        id: 'log-gemini-789',
        platform: 'gemini',
        timestamp: new Date('2025-01-15T09:15:00Z'),
        userId: 'user-321',
        userEmail: 'bob.johnson@company.com',
        organizationId: 'org-789',
        activityType: 'model_usage',
        action: 'help_me_write',
        metadata: {
          applicationContext: 'gmail',
          model: 'gemini-pro'
        },
        riskIndicators: []
      };

      expect(log.platform).toBe('gemini');
      expect(log.metadata.applicationContext).toBe('gmail');
    });
  });

  describe('Activity Types', () => {
    it('should enforce valid activity type values', () => {
      const validTypes: AIActivityType[] = [
        'login',
        'logout',
        'conversation',
        'file_upload',
        'file_download',
        'model_usage',
        'prompt_injection',
        'data_export',
        'settings_change',
        'integration_created',
        'api_key_created',
        'api_key_deleted'
      ];

      validTypes.forEach(type => {
        const log: AIplatformAuditLog = {
          id: 'test',
          platform: 'chatgpt',
          timestamp: new Date(),
          userId: 'user',
          userEmail: 'test@example.com',
          organizationId: 'org',
          activityType: type,
          action: 'test_action',
          metadata: {},
          riskIndicators: []
        };

        expect(log.activityType).toBe(type);
      });
    });
  });

  describe('Risk Indicators', () => {
    it('should create valid risk indicator for sensitive data', () => {
      const indicator: AIRiskIndicator = {
        type: 'sensitive_data',
        severity: 'high',
        description: 'PII detected in conversation',
        confidence: 85,
        evidence: [
          'Social security number pattern detected',
          'Credit card number pattern detected'
        ],
        complianceImpact: ['GDPR', 'PCI', 'HIPAA']
      };

      expect(indicator.type).toBe('sensitive_data');
      expect(indicator.confidence).toBe(85);
      expect(indicator.complianceImpact).toContain('GDPR');
    });

    it('should create valid risk indicator for unusual activity', () => {
      const indicator: AIRiskIndicator = {
        type: 'unusual_activity',
        severity: 'medium',
        description: 'Login from new location',
        confidence: 70,
        evidence: ['IP address from different country']
      };

      expect(indicator.type).toBe('unusual_activity');
      expect(indicator.severity).toBe('medium');
    });

    it('should enforce severity levels', () => {
      const severities: RiskSeverity[] = ['low', 'medium', 'high', 'critical'];

      severities.forEach(severity => {
        const indicator: AIRiskIndicator = {
          type: 'security_event',
          severity,
          description: 'Test event',
          confidence: 50
        };

        expect(indicator.severity).toBe(severity);
      });
    });
  });

  describe('AIAuditLogQuery', () => {
    it('should create valid query with required fields', () => {
      const query: AIAuditLogQuery = {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31')
      };

      expect(query.startDate).toBeInstanceOf(Date);
      expect(query.endDate).toBeInstanceOf(Date);
    });

    it('should create valid query with optional filters', () => {
      const query: AIAuditLogQuery = {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        userIds: ['user-123', 'user-456'],
        eventTypes: ['login', 'file_upload'],
        limit: 100,
        cursor: 'next_page_token'
      };

      expect(query.userIds).toHaveLength(2);
      expect(query.eventTypes).toContain('login');
      expect(query.limit).toBe(100);
    });
  });

  describe('AIAuditLogResult', () => {
    it('should structure query results correctly', () => {
      const result: AIAuditLogResult = {
        logs: [
          {
            id: 'log-1',
            platform: 'chatgpt',
            timestamp: new Date(),
            userId: 'user-1',
            userEmail: 'user1@example.com',
            organizationId: 'org-1',
            activityType: 'login',
            action: 'user.login',
            metadata: {},
            riskIndicators: []
          }
        ],
        totalCount: 150,
        hasMore: true,
        nextCursor: 'cursor-abc123',
        metadata: {
          queryTime: 250,
          platform: 'chatgpt',
          warnings: ['Rate limit approaching']
        }
      };

      expect(result.logs).toHaveLength(1);
      expect(result.hasMore).toBe(true);
      expect(result.metadata.platform).toBe('chatgpt');
    });
  });

  describe('UsageAnalytics', () => {
    it('should aggregate usage data correctly', () => {
      const analytics: UsageAnalytics = {
        platform: 'gemini',
        period: {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-31')
        },
        totalUsers: 50,
        activeUsers: 35,
        totalEvents: 1250,
        topUsers: [
          {
            userId: 'user-1',
            email: 'power.user@company.com',
            eventCount: 150,
            lastActivity: new Date('2025-01-31T16:00:00Z'),
            riskScore: 45
          }
        ],
        eventsByType: {
          'help_me_write': 500,
          'summarize': 300,
          'help_me_organize': 200
        },
        dailyBreakdown: [
          {
            date: '2025-01-15',
            activeUsers: 25,
            totalEvents: 80,
            peakHour: 14
          }
        ],
        modelUsage: [
          {
            model: 'gemini-pro',
            usageCount: 1000,
            totalTokens: 50000,
            costEstimate: 2.50
          }
        ]
      };

      expect(analytics.totalUsers).toBe(50);
      expect(analytics.activeUsers).toBe(35);
      expect(analytics.topUsers[0].eventCount).toBe(150);
    });
  });

  describe('AIPlatformConnectionStatus', () => {
    it('should track connection status correctly', () => {
      const status: AIPlatformConnectionStatus = {
        platform: 'chatgpt',
        isConnected: true,
        lastSyncAt: new Date('2025-01-15T10:00:00Z'),
        nextSyncAt: new Date('2025-01-15T11:00:00Z'),
        status: 'active',
        credentialsExpiresAt: new Date('2025-12-31T23:59:59Z')
      };

      expect(status.isConnected).toBe(true);
      expect(status.status).toBe('active');
    });

    it('should handle error states', () => {
      const status: AIPlatformConnectionStatus = {
        platform: 'claude',
        isConnected: false,
        status: 'error',
        error: 'Invalid API key'
      };

      expect(status.status).toBe('error');
      expect(status.error).toBeDefined();
    });
  });

  describe('GeoLocation', () => {
    it('should structure geographic data correctly', () => {
      const location: GeoLocation = {
        country: 'US',
        region: 'California',
        city: 'San Francisco',
        coordinates: {
          latitude: 37.7749,
          longitude: -122.4194
        },
        timezone: 'America/Los_Angeles'
      };

      expect(location.country).toBe('US');
      expect(location.coordinates?.latitude).toBe(37.7749);
    });
  });

  describe('FileReference', () => {
    it('should structure file metadata correctly', () => {
      const file: FileReference = {
        fileId: 'file-123',
        fileName: 'sensitive_data.csv',
        fileType: 'text/csv',
        fileSize: 1048576,
        uploadedAt: new Date('2025-01-15T12:00:00Z'),
        isSensitive: true
      };

      expect(file.fileName).toBe('sensitive_data.csv');
      expect(file.isSensitive).toBe(true);
    });
  });

  describe('Type Compatibility', () => {
    it('should allow platform type to be used as discriminator', () => {
      function processByPlatform(log: AIplatformAuditLog): string {
        switch (log.platform) {
          case 'chatgpt':
            return 'Processing ChatGPT log';
          case 'claude':
            return 'Processing Claude log';
          case 'gemini':
            return 'Processing Gemini log';
          default:
            const exhaustive: never = log.platform;
            throw new Error(`Unhandled platform: ${exhaustive}`);
        }
      }

      const chatgptLog: AIplatformAuditLog = {
        id: 'test',
        platform: 'chatgpt',
        timestamp: new Date(),
        userId: 'user',
        userEmail: 'test@example.com',
        organizationId: 'org',
        activityType: 'login',
        action: 'test',
        metadata: {},
        riskIndicators: []
      };

      expect(processByPlatform(chatgptLog)).toBe('Processing ChatGPT log');
    });

    it('should allow activity type to be used as discriminator', () => {
      function processActivity(activityType: AIActivityType): string {
        const handlers: Record<AIActivityType, string> = {
          'login': 'Handle login',
          'logout': 'Handle logout',
          'conversation': 'Handle conversation',
          'file_upload': 'Handle file upload',
          'file_download': 'Handle file download',
          'model_usage': 'Handle model usage',
          'prompt_injection': 'Handle prompt injection',
          'data_export': 'Handle data export',
          'settings_change': 'Handle settings change',
          'integration_created': 'Handle integration',
          'api_key_created': 'Handle API key creation',
          'api_key_deleted': 'Handle API key deletion'
        };

        return handlers[activityType];
      }

      expect(processActivity('file_upload')).toBe('Handle file upload');
    });
  });

  describe('Risk Assessment', () => {
    it('should calculate risk level based on indicators', () => {
      const indicators: AIRiskIndicator[] = [
        {
          type: 'sensitive_data',
          severity: 'high',
          description: 'PII detected',
          confidence: 90
        },
        {
          type: 'unusual_activity',
          severity: 'medium',
          description: 'Off-hours usage',
          confidence: 75
        }
      ];

      // Calculate overall risk
      const averageConfidence = indicators.reduce((sum, i) => sum + i.confidence, 0) / indicators.length;
      const highestSeverity = indicators.some(i => i.severity === 'critical' || i.severity === 'high');

      expect(averageConfidence).toBe(82.5);
      expect(highestSeverity).toBe(true);
    });
  });

  describe('Date Range Validation', () => {
    it('should enforce valid date ranges in queries', () => {
      const query: AIAuditLogQuery = {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31')
      };

      const isValidRange = query.endDate >= query.startDate;
      expect(isValidRange).toBe(true);
    });

    it('should handle invalid date ranges gracefully', () => {
      const query: AIAuditLogQuery = {
        startDate: new Date('2025-01-31'),
        endDate: new Date('2025-01-01')
      };

      const isValidRange = query.endDate >= query.startDate;
      expect(isValidRange).toBe(false);
    });
  });

  describe('Usage Analytics Aggregation', () => {
    it('should calculate user activity metrics', () => {
      const analytics: UsageAnalytics = {
        platform: 'chatgpt',
        period: {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-31')
        },
        totalUsers: 100,
        activeUsers: 75,
        totalEvents: 5000,
        topUsers: [
          { userId: 'user-1', email: 'user1@example.com', eventCount: 500 },
          { userId: 'user-2', email: 'user2@example.com', eventCount: 400 }
        ],
        eventsByType: {
          'conversation': 3000,
          'file_upload': 1500,
          'login': 500
        },
        dailyBreakdown: []
      };

      const activityRate = analytics.activeUsers / analytics.totalUsers;
      expect(activityRate).toBe(0.75);
      expect(analytics.topUsers[0].eventCount).toBeGreaterThan(analytics.topUsers[1].eventCount);
    });
  });

  describe('Platform Type Safety', () => {
    it('should ensure type safety for platform values', () => {
      const platforms: AIPlatform[] = ['chatgpt', 'claude', 'gemini'];

      platforms.forEach(platform => {
        const status: AIPlatformConnectionStatus = {
          platform,
          isConnected: true,
          status: 'active'
        };

        expect(['chatgpt', 'claude', 'gemini']).toContain(status.platform);
      });
    });
  });

  describe('Metadata Extensibility', () => {
    it('should allow platform-specific metadata through index signature', () => {
      const metadata: AIActivityMetadata = {
        conversationId: 'conv-123',
        model: 'gpt-4',
        // Platform-specific fields
        customField1: 'value1',
        customField2: 123,
        customField3: { nested: 'object' }
      };

      expect(metadata.conversationId).toBe('conv-123');
      expect(metadata.customField1).toBe('value1');
      expect(metadata.customField2).toBe(123);
    });
  });

  describe('Compliance Framework Types', () => {
    it('should enforce valid compliance frameworks', () => {
      const frameworks: ComplianceFramework[] = [
        'GDPR',
        'SOX',
        'HIPAA',
        'PCI',
        'SOC2',
        'ISO27001'
      ];

      const indicator: AIRiskIndicator = {
        type: 'sensitive_data',
        severity: 'critical',
        description: 'Healthcare data detected',
        confidence: 95,
        complianceImpact: frameworks
      };

      expect(indicator.complianceImpact).toHaveLength(6);
      expect(indicator.complianceImpact).toContain('HIPAA');
    });
  });
});
