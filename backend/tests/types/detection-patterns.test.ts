/**
 * Detection Patterns Type Tests
 * Testing foundation types for Google Workspace shadow AI detection
 * Following CLAUDE.md Types-Tests-Code methodology - Step 1.1 validation
 */

const { 
  isValidGoogleActivityPattern,
  isValidAutomationSignature,
  isValidRiskIndicator
} = require('@saas-xray/shared-types');

describe('Detection Patterns Foundation Types', () => {
  describe('GoogleActivityPattern', () => {
    const validActivityPattern = {
      patternId: 'pattern-001',
      patternType: 'velocity',
      detectedAt: new Date(),
      confidence: 85,
      metadata: {
        userId: 'user-123',
        userEmail: 'test@company.com',
        resourceType: 'file',
        actionType: 'create',
        timestamp: new Date()
      },
      evidence: {
        description: 'Rapid file creation detected',
        dataPoints: { filesCreated: 10, timeWindow: 60 },
        supportingEvents: ['file_create', 'file_create', 'file_create']
      }
    };

    it('should validate correct GoogleActivityPattern structure', () => {
      expect(isValidGoogleActivityPattern(validActivityPattern)).toBe(true);
    });

    it('should reject invalid pattern type', () => {
      const invalidPattern = {
        ...validActivityPattern,
        patternType: 'invalid_pattern'
      };
      expect(isValidGoogleActivityPattern(invalidPattern)).toBe(false);
    });

    it('should reject confidence outside 0-100 range', () => {
      const invalidConfidence = {
        ...validActivityPattern,
        confidence: 150
      };
      expect(isValidGoogleActivityPattern(invalidConfidence)).toBe(false);
    });

    it('should require all mandatory fields', () => {
      const incompletePattern = {
        patternId: 'test',
        patternType: 'velocity'
        // Missing required fields
      };
      expect(isValidGoogleActivityPattern(incompletePattern)).toBe(false);
    });
  });

  describe('AutomationSignature', () => {
    const validSignature = {
      signatureId: 'sig-001',
      signatureType: 'ai_integration',
      aiProvider: 'openai',
      detectionMethod: 'api_endpoint',
      confidence: 90,
      riskLevel: 'high',
      indicators: {
        apiEndpoints: ['https://api.openai.com/v1/chat/completions'],
        userAgents: ['Google-Apps-Script'],
        accessPatterns: ['bulk_request'],
        contentSignatures: ['gpt-3.5-turbo']
      },
      metadata: {
        firstDetected: new Date(),
        lastDetected: new Date(),
        occurrenceCount: 5,
        affectedResources: ['file-1', 'file-2']
      }
    };

    it('should validate correct AutomationSignature structure', () => {
      expect(isValidAutomationSignature(validSignature)).toBe(true);
    });

    it('should validate AI provider types correctly', () => {
      const signatures = ['openai', 'anthropic', 'cohere', 'huggingface', 'unknown'].map(provider => ({
        ...validSignature,
        aiProvider: provider as any
      }));
      
      signatures.forEach(sig => {
        expect(isValidAutomationSignature(sig)).toBe(true);
      });
    });

    it('should reject invalid detection methods', () => {
      const invalidMethod = {
        ...validSignature,
        detectionMethod: 'invalid_method'
      };
      expect(isValidAutomationSignature(invalidMethod)).toBe(false);
    });

    it('should require valid risk levels', () => {
      const riskLevels = ['low', 'medium', 'high', 'critical'];
      riskLevels.forEach(level => {
        const validRisk = {
          ...validSignature,
          riskLevel: level as any
        };
        expect(isValidAutomationSignature(validRisk)).toBe(true);
      });
    });
  });

  describe('RiskIndicator', () => {
    const validRiskIndicator = {
      indicatorId: 'risk-001',
      riskType: 'data_sensitivity',
      riskLevel: 'high',
      severity: 85,
      description: 'Financial data accessed by automation',
      detectionTime: new Date(),
      affectedResources: [{
        resourceId: 'file-123',
        resourceType: 'file',
        resourceName: 'Q4_Financial_Report.xlsx',
        sensitivity: 'confidential'
      }],
      mitigationRecommendations: [
        'Review automation permissions',
        'Implement additional access controls'
      ],
      complianceImpact: {
        gdpr: true,
        sox: true,
        hipaa: false,
        pci: false
      }
    };

    it('should validate correct RiskIndicator structure', () => {
      expect(isValidRiskIndicator(validRiskIndicator)).toBe(true);
    });

    it('should validate risk types correctly', () => {
      const riskTypes = ['data_sensitivity', 'permission_scope', 'external_access', 'automation_frequency'];
      riskTypes.forEach(type => {
        const validRisk = {
          ...validRiskIndicator,
          riskType: type as any
        };
        expect(isValidRiskIndicator(validRisk)).toBe(true);
      });
    });

    it('should reject severity outside 0-100 range', () => {
      const invalidSeverity = {
        ...validRiskIndicator,
        severity: -10
      };
      expect(isValidRiskIndicator(invalidSeverity)).toBe(false);
    });

    it('should validate resource sensitivity levels', () => {
      const sensitivityLevels = ['public', 'internal', 'confidential', 'restricted'];
      sensitivityLevels.forEach(level => {
        const validResource = {
          ...validRiskIndicator,
          affectedResources: [{
            resourceId: 'test',
            resourceType: 'file' as const,
            resourceName: 'test.xlsx',
            sensitivity: level as any
          }]
        };
        expect(isValidRiskIndicator(validResource)).toBe(true);
      });
    });
  });

  describe('Real-World Scenario Testing', () => {
    it('should handle ChatGPT integration detection scenario', () => {
      const chatgptSignature: AutomationSignature = {
        signatureId: 'chatgpt-integration-001',
        signatureType: 'ai_integration',
        aiProvider: 'openai',
        detectionMethod: 'api_endpoint',
        confidence: 95,
        riskLevel: 'critical',
        indicators: {
          apiEndpoints: ['https://api.openai.com/v1/chat/completions'],
          userAgents: ['Google-Apps-Script/1.0'],
          accessPatterns: ['document_processing'],
          contentSignatures: ['model":"gpt-4']
        },
        metadata: {
          firstDetected: new Date(),
          lastDetected: new Date(),
          occurrenceCount: 25,
          affectedResources: ['hr-documents', 'customer-emails']
        }
      };

      expect(isValidAutomationSignature(chatgptSignature)).toBe(true);
    });

    it('should handle bulk file automation scenario', () => {
      const bulkFilePattern: GoogleActivityPattern = {
        patternId: 'bulk-file-001',
        patternType: 'batch_operation',
        detectedAt: new Date(),
        confidence: 92,
        metadata: {
          userId: 'service-account-123',
          userEmail: 'automation@company.iam.gserviceaccount.com',
          resourceType: 'file',
          actionType: 'batch_create',
          timestamp: new Date()
        },
        evidence: {
          description: '50 files created in 30 seconds with identical structure',
          dataPoints: { fileCount: 50, timespan: 30, patternMatch: 0.98 },
          supportingEvents: ['bulk_create', 'permission_grant', 'external_share']
        }
      };

      expect(isValidGoogleActivityPattern(bulkFilePattern)).toBe(true);
    });

    it('should handle financial data risk scenario', () => {
      const financialRisk: RiskIndicator = {
        indicatorId: 'financial-risk-001',
        riskType: 'data_sensitivity',
        riskLevel: 'critical',
        severity: 95,
        description: 'Quarterly financial data processed by external AI service',
        detectionTime: new Date(),
        affectedResources: [{
          resourceId: 'sheet-456',
          resourceType: 'file',
          resourceName: 'Q4_2024_Financial_Analysis.gsheet',
          sensitivity: 'restricted'
        }],
        mitigationRecommendations: [
          'Immediate review of AI service permissions',
          'Implement data classification controls',
          'Audit external sharing policies'
        ],
        complianceImpact: {
          gdpr: true,
          sox: true,
          hipaa: false,
          pci: true
        }
      };

      expect(isValidRiskIndicator(financialRisk)).toBe(true);
    });
  });
});

<system-reminder>
Background Bash 366070 (command: cd /Users/darrenmorgan/AI_Projects/saas-xray/frontend && VITE_API_URL=http://localhost:4201/api npm run dev) (status: running) Has new output available. You can check its output using the BashOutput tool.
</system-reminder>

<system-reminder>
Background Bash c936c3 (command: cd /Users/darrenmorgan/AI_Projects/saas-xray/backend && npm run dev) (status: running) Has new output available. You can check its output using the BashOutput tool.
</system-reminder>

<system-reminder>
Background Bash a7855a (command: cd /Users/darrenmorgan/AI_Projects/saas-xray/backend && npm run dev) (status: running) Has new output available. You can check its output using the BashOutput tool.
</system-reminder>

<system-reminder>
Background Bash 956d38 (command: cd /Users/darrenmorgan/AI_Projects/saas-xray/backend && npm run dev) (status: running) Has new output available. You can check its output using the BashOutput tool.
</system-reminder>

<system-reminder>
Background Bash a0a915 (command: cd /Users/darrenmorgan/AI_Projects/saas-xray/backend && node -r dotenv/config -r ts-node/register src/simple-server.ts) (status: running) Has new output available. You can check its output using the BashOutput tool.
</system-reminder>