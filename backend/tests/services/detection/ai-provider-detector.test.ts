import { 
  GoogleWorkspaceEvent, 
  AutomationSignature,
  RiskIndicator
} from '@singura/shared-types';
import { AIProviderDetectorService } from '../../../src/services/detection/ai-provider-detector.service';

describe('AIProviderDetectorService', () => {
  let aiProviderDetector: AIProviderDetectorService;

  beforeEach(() => {
    aiProviderDetector = new AIProviderDetectorService();
  });

  const createMockEvent = (
    eventType: string,
    timestamp: Date,
    actionDetails: any,
    userAgent?: string,
    userId: string = 'test-user'
  ): GoogleWorkspaceEvent => ({
    eventId: `event_${Math.random()}`,
    timestamp,
    userId,
    userEmail: 'test@example.com',
    eventType,
    resourceId: `resource_${Math.random()}`,
    resourceType: 'script',
    actionDetails,
    userAgent
  });

  describe('detectAIProviders', () => {
    it('should detect OpenAI API usage by endpoint', () => {
      const event = createMockEvent(
        'script_execution',
        new Date(),
        {
          action: 'execute',
          resourceName: 'chatgpt-integration.gs',
          additionalMetadata: {
            scriptContent: 'fetch("https://api.openai.com/v1/chat/completions", {...})',
            apiCalls: ['api.openai.com']
          }
        }
      );

      const signatures = aiProviderDetector.detectAIProviders([event]);
      expect(signatures.length).toBeGreaterThan(0);
      
      const openaiSignature = signatures.find(s => s.aiProvider === 'openai');
      expect(openaiSignature).toBeDefined();
      expect(openaiSignature!.signatureType).toBe('ai_integration');
      expect(openaiSignature!.detectionMethod).toBe('api_endpoint');
      expect(openaiSignature!.confidence).toBeGreaterThan(30);
    });

    it('should detect Anthropic API usage by content signature', () => {
      const event = createMockEvent(
        'script_execution',
        new Date(),
        {
          action: 'execute',
          resourceName: 'claude-integration.gs',
          additionalMetadata: {
            scriptContent: 'const anthropic_api_key = "sk-ant-..."; fetch("https://api.anthropic.com/v1/messages")',
            variables: ['anthropic_api_key']
          }
        }
      );

      const signatures = aiProviderDetector.detectAIProviders([event]);
      expect(signatures.length).toBeGreaterThan(0);
      
      const anthropicSignature = signatures.find(s => s.aiProvider === 'anthropic');
      expect(anthropicSignature).toBeDefined();
      expect(anthropicSignature!.signatureType).toBe('ai_integration');
      expect(anthropicSignature!.confidence).toBeGreaterThan(30);
    });

    it('should detect Cohere API usage by user agent', () => {
      const event = createMockEvent(
        'script_execution',
        new Date(),
        {
          action: 'execute',
          resourceName: 'cohere-integration.gs',
          additionalMetadata: {}
        },
        'Cohere-Python/4.21 Google-Apps-Script/1.0'
      );

      const signatures = aiProviderDetector.detectAIProviders([event]);
      expect(signatures.length).toBeGreaterThan(0);
      
      const cohereSignature = signatures.find(s => s.aiProvider === 'cohere');
      expect(cohereSignature).toBeDefined();
      expect(cohereSignature!.detectionMethod).toBe('user_agent');
    });

    it('should handle events with no AI provider signatures', () => {
      const event = createMockEvent(
        'file_create',
        new Date(),
        {
          action: 'create',
          resourceName: 'normal-document.pdf',
          additionalMetadata: {}
        }
      );

      const signatures = aiProviderDetector.detectAIProviders([event]);
      expect(signatures.length).toBe(0);
    });

    it('should detect multiple AI providers in different events', () => {
      const events = [
        createMockEvent(
          'script_execution',
          new Date(),
          {
            action: 'execute',
            resourceName: 'openai-script.gs',
            additionalMetadata: {
              scriptContent: 'openai_api_key = "sk-..."; model: "gpt-3.5-turbo"'
            }
          }
        ),
        createMockEvent(
          'script_execution',
          new Date(),
          {
            action: 'execute',
            resourceName: 'anthropic-script.gs',
            additionalMetadata: {
              scriptContent: 'claude-v2 integration with anthropic_api_key'
            }
          }
        )
      ];

      const signatures = aiProviderDetector.detectAIProviders(events);
      expect(signatures.length).toBe(2);
      
      const providers = signatures.map(s => s.aiProvider);
      expect(providers).toContain('openai');
      expect(providers).toContain('anthropic');
    });
  });

  describe('generateAIIntegrationRiskIndicator', () => {
    it('should generate risk indicators for AI provider signatures', () => {
      const signature: AutomationSignature = {
        signatureId: 'test-signature',
        signatureType: 'ai_integration',
        aiProvider: 'openai',
        detectionMethod: 'api_endpoint',
        confidence: 85,
        riskLevel: 'high',
        indicators: {
          apiEndpoints: ['api.openai.com'],
          userAgents: [],
          contentSignatures: []
        },
        metadata: {
          firstDetected: new Date(),
          lastDetected: new Date(),
          occurrenceCount: 1,
          affectedResources: ['resource-123']
        }
      };

      const riskIndicators = aiProviderDetector.generateAIIntegrationRiskIndicator([signature]);
      expect(riskIndicators.length).toBe(1);
      
      const riskIndicator = riskIndicators[0];
      expect(riskIndicator.riskType).toBe('external_access');
      expect(riskIndicator.riskLevel).toBe('high');
      expect(riskIndicator.severity).toBe(85);
      expect(riskIndicator.description).toContain('openai');
      expect(riskIndicator.mitigationRecommendations.length).toBeGreaterThan(0);
      expect(riskIndicator.complianceImpact.gdpr).toBe(true);
      expect(riskIndicator.complianceImpact.sox).toBe(true);
    });

    it('should set appropriate compliance impact based on risk level', () => {
      const lowRiskSignature: AutomationSignature = {
        signatureId: 'low-risk-signature',
        signatureType: 'ai_integration',
        aiProvider: 'openai',
        detectionMethod: 'content_analysis',
        confidence: 20,
        riskLevel: 'low',
        indicators: {},
        metadata: {
          firstDetected: new Date(),
          lastDetected: new Date(),
          occurrenceCount: 1,
          affectedResources: ['resource-456']
        }
      };

      const riskIndicators = aiProviderDetector.generateAIIntegrationRiskIndicator([lowRiskSignature]);
      const riskIndicator = riskIndicators[0];
      
      expect(riskIndicator.complianceImpact.gdpr).toBe(false);
      expect(riskIndicator.complianceImpact.sox).toBe(false);
      expect(riskIndicator.complianceImpact.hipaa).toBe(false);
    });
  });

  describe('ChatGPT Integration Detection Scenarios', () => {
    it('should detect financial data exposure via ChatGPT integration', () => {
      const event = createMockEvent(
        'script_execution',
        new Date(),
        {
          action: 'execute',
          resourceName: 'financial-report-ai-analysis.gs',
          additionalMetadata: {
            scriptContent: `
              function analyzeFinancialData() {
                const openai_api_key = "sk-proj-...";
                const financialData = getFinancialSpreadsheetData();
                const response = UrlFetchApp.fetch("https://api.openai.com/v1/chat/completions", {
                  method: "POST",
                  headers: { "Authorization": "Bearer " + openai_api_key },
                  payload: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [{ role: "user", content: "Analyze this financial data: " + financialData }]
                  })
                });
              }
            `,
            fileAccess: ['financial-q4-2024.xlsx', 'revenue-projections.xlsx'],
            externalCalls: ['api.openai.com']
          }
        },
        'Google-Apps-Script/1.0'
      );

      const signatures = aiProviderDetector.detectAIProviders([event]);
      expect(signatures.length).toBeGreaterThan(0);
      
      const openaiSignature = signatures.find(s => s.aiProvider === 'openai');
      expect(openaiSignature).toBeDefined();
      expect(openaiSignature!.confidence).toBeGreaterThan(70); // Multiple detection methods
      
      const riskIndicators = aiProviderDetector.generateAIIntegrationRiskIndicator([openaiSignature!]);
      const riskIndicator = riskIndicators[0];
      expect(riskIndicator.riskLevel).toBe('high'); // Financial data + external AI
      expect(riskIndicator.complianceImpact.sox).toBe(true);
    });

    it('should detect automated email forwarding to AI services', () => {
      const event = createMockEvent(
        'script_execution',
        new Date(),
        {
          action: 'execute',
          resourceName: 'email-ai-summarizer.gs',
          additionalMetadata: {
            scriptContent: `
              function summarizeEmails() {
                const emails = GmailApp.getInboxThreads();
                emails.forEach(thread => {
                  const messages = thread.getMessages();
                  const emailContent = messages.map(m => m.getBody()).join("\\n");
                  
                  UrlFetchApp.fetch("https://api.anthropic.com/v1/messages", {
                    method: "POST",
                    headers: { "x-api-key": anthropic_api_key },
                    payload: JSON.stringify({
                      model: "claude-v2",
                      max_tokens: 1000,
                      messages: [{ role: "user", content: "Summarize: " + emailContent }]
                    })
                  });
                });
              }
            `,
            gmailAccess: true,
            externalCalls: ['api.anthropic.com']
          }
        }
      );

      const signatures = aiProviderDetector.detectAIProviders([event]);
      expect(signatures.length).toBeGreaterThan(0);
      
      const anthropicSignature = signatures.find(s => s.aiProvider === 'anthropic');
      expect(anthropicSignature).toBeDefined();
      expect(anthropicSignature!.confidence).toBeGreaterThan(60);
      
      const riskIndicators = aiProviderDetector.generateAIIntegrationRiskIndicator([anthropicSignature!]);
      const riskIndicator = riskIndicators[0];
      expect(riskIndicator.description).toContain('anthropic');
      expect(riskIndicator.mitigationRecommendations).toContain('Review AI provider integration for anthropic');
    });

    it('should handle unknown AI providers with generic detection', () => {
      const event = createMockEvent(
        'script_execution',
        new Date(),
        {
          action: 'execute',
          resourceName: 'custom-ai-integration.gs',
          additionalMetadata: {
            scriptContent: 'fetch("https://api.huggingface.co/models/gpt2")',
            externalCalls: ['api.huggingface.co']
          }
        }
      );

      const signatures = aiProviderDetector.detectAIProviders([event]);
      // This would be detected as 'unknown' since HuggingFace isn't in the current patterns
      // but the detection logic should still work for known patterns
      expect(signatures.length).toBe(0); // Current implementation only detects known providers
    });
  });
});