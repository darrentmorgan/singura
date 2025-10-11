import {
  AutomationSignature,
  GoogleWorkspaceEvent,
  RiskIndicator
} from '@singura/shared-types';

export class AIProviderDetectorService {
  private readonly AI_DETECTION_PATTERNS = {
    openai: {
      apiEndpoints: ['api.openai.com', 'api.chat.openai.com'],
      userAgents: ['OpenAI-Python', 'ChatGPT-Integration'],
      contentSignatures: [
        'model:', 
        'openai_api_key', 
        'text-davinci', 
        'gpt-3.5-turbo'
      ]
    },
    anthropic: {
      apiEndpoints: ['api.anthropic.com', 'api.claude.ai'],
      userAgents: ['Anthropic-Python', 'Claude-Integration'],
      contentSignatures: [
        'anthropic_api_key', 
        'claude-v1', 
        'claude-v2', 
        'anthropic-'
      ]
    },
    cohere: {
      apiEndpoints: ['api.cohere.ai', 'cohere.com/generate'],
      userAgents: ['Cohere-Python', 'Cohere-Integration'],
      contentSignatures: [
        'cohere_api_key', 
        'cohere.generate', 
        'cohere-'
      ]
    }
  };

  detectAIProviders(events: GoogleWorkspaceEvent[]): AutomationSignature[] {
    const signatures: AutomationSignature[] = [];

    events.forEach(event => {
      const aiSignature = this.analyzeEventForAIProvider(event);
      if (aiSignature) signatures.push(aiSignature);
    });

    return signatures;
  }

  private analyzeEventForAIProvider(event: GoogleWorkspaceEvent): AutomationSignature | null {
    const userAgent = event.userAgent?.toLowerCase() || '';
    const actionDetails = JSON.stringify(event.actionDetails).toLowerCase();
    const scriptContent = actionDetails.includes('script') 
      ? actionDetails 
      : '';

    // Detect by API endpoints
    const apiEndpointMatch = Object.entries(this.AI_DETECTION_PATTERNS).find(
      ([_, patterns]) => patterns.apiEndpoints.some(
        endpoint => actionDetails.includes(endpoint.toLowerCase())
      )
    );

    // Detect by user agent
    const userAgentMatch = Object.entries(this.AI_DETECTION_PATTERNS).find(
      ([_, patterns]) => patterns.userAgents.some(
        agent => userAgent.includes(agent.toLowerCase())
      )
    );

    // Detect by content signatures
    const contentSignatureMatch = Object.entries(this.AI_DETECTION_PATTERNS).find(
      ([_, patterns]) => patterns.contentSignatures.some(
        signature => scriptContent.includes(signature.toLowerCase())
      )
    );

    const matchedProvider = apiEndpointMatch?.[0] || 
                             userAgentMatch?.[0] || 
                             contentSignatureMatch?.[0] || 
                             'unknown';

    if (matchedProvider !== 'unknown') {
      return this.createAIProviderSignature(event, matchedProvider as keyof typeof this.AI_DETECTION_PATTERNS);
    }

    return null;
  }

  private createAIProviderSignature(
    event: GoogleWorkspaceEvent, 
    provider: keyof typeof this.AI_DETECTION_PATTERNS
  ): AutomationSignature {
    const confidence = this.calculateConfidence(event, provider);
    const riskLevel = this.determineRiskLevel(confidence);

    return {
      signatureId: `ai_sig_${provider}_${event.eventId}_${Date.now()}`,
      signatureType: 'ai_integration',
      aiProvider: provider,
      detectionMethod: this.determineDetectionMethod(event),
      confidence,
      riskLevel,
      indicators: {
        apiEndpoints: this.AI_DETECTION_PATTERNS[provider].apiEndpoints,
        userAgents: this.AI_DETECTION_PATTERNS[provider].userAgents,
        contentSignatures: this.AI_DETECTION_PATTERNS[provider].contentSignatures
      },
      metadata: {
        firstDetected: event.timestamp,
        lastDetected: event.timestamp,
        occurrenceCount: 1,
        affectedResources: [event.resourceId]
      }
    };
  }

  private calculateConfidence(event: GoogleWorkspaceEvent, provider: string): number {
    const methods = [
      this.scoreApiEndpointDetection(event, provider),
      this.scoreUserAgentDetection(event, provider),
      this.scoreContentSignatureDetection(event, provider)
    ];

    const averageConfidence = methods.reduce((sum, score) => sum + score, 0) / methods.length;
    return Math.min(Math.max(averageConfidence, 0), 100);
  }

  private scoreApiEndpointDetection(event: GoogleWorkspaceEvent, provider: string): number {
    const patterns = this.AI_DETECTION_PATTERNS[provider as keyof typeof this.AI_DETECTION_PATTERNS];
    const actionDetails = JSON.stringify(event.actionDetails).toLowerCase();
    
    const matchCount = patterns.apiEndpoints.filter(
      endpoint => actionDetails.includes(endpoint.toLowerCase())
    ).length;

    return matchCount * 40; // High weight for API endpoint detection
  }

  private scoreUserAgentDetection(event: GoogleWorkspaceEvent, provider: string): number {
    const patterns = this.AI_DETECTION_PATTERNS[provider as keyof typeof this.AI_DETECTION_PATTERNS];
    const userAgent = event.userAgent?.toLowerCase() || '';
    
    const matchCount = patterns.userAgents.filter(
      agent => userAgent.includes(agent.toLowerCase())
    ).length;

    return matchCount * 30; // Medium weight for user agent
  }

  private scoreContentSignatureDetection(event: GoogleWorkspaceEvent, provider: string): number {
    const patterns = this.AI_DETECTION_PATTERNS[provider as keyof typeof this.AI_DETECTION_PATTERNS];
    const actionDetails = JSON.stringify(event.actionDetails).toLowerCase();
    
    const matchCount = patterns.contentSignatures.filter(
      signature => actionDetails.includes(signature.toLowerCase())
    ).length;

    return matchCount * 30; // Medium weight for content signature
  }

  private determineDetectionMethod(event: GoogleWorkspaceEvent): AutomationSignature['detectionMethod'] {
    const actionDetails = JSON.stringify(event.actionDetails).toLowerCase();
    if (actionDetails.includes('api')) return 'api_endpoint';
    if (event.userAgent) return 'user_agent';
    if (actionDetails.includes('script') || actionDetails.includes('code')) return 'content_analysis';
    return 'access_pattern';
  }

  private determineRiskLevel(confidence: number): RiskIndicator['riskLevel'] {
    if (confidence < 30) return 'low';
    if (confidence < 60) return 'medium';
    if (confidence < 90) return 'high';
    return 'critical';
  }

  generateAIIntegrationRiskIndicator(signatures: AutomationSignature[]): RiskIndicator[] {
    return signatures.map(signature => ({
      indicatorId: `ai_risk_${signature.signatureId}`,
      riskType: 'external_access',
      riskLevel: signature.riskLevel,
      severity: signature.confidence,
      description: `AI Provider Integration Detected: ${signature.aiProvider}`,
      detectionTime: new Date(),
      affectedResources: signature.metadata.affectedResources.map(resourceId => ({
        resourceId,
        resourceType: 'script',
        resourceName: `AI Integration - ${signature.aiProvider}`,
        sensitivity: 'internal'
      })),
      mitigationRecommendations: [
        `Review AI provider integration for ${signature.aiProvider}`,
        'Verify API key security',
        'Check script permissions',
        'Audit external service access'
      ],
      complianceImpact: {
        gdpr: signature.riskLevel !== 'low',
        sox: signature.riskLevel === 'high' || signature.riskLevel === 'critical',
        hipaa: signature.riskLevel === 'high' || signature.riskLevel === 'critical',
        pci: false
      }
    }));
  }
}