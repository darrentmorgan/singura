/**
 * AI Provider Detector Service
 * Enhanced detection for 8 major AI providers with comprehensive multi-method analysis
 * Phase 1: AI Provider Detection (Production-Ready)
 */

import {
  GoogleWorkspaceEvent,
  AutomationSignature,
  RiskIndicator,
  AIProvider,
  AIProviderDetectionResult,
  DetectionMethod,
  AI_PROVIDER_PATTERNS,
  detectAIProvider,
  extractModelName
} from '@singura/shared-types';

// Type alias for AIProviderDetection (matches automation.ts internal type)
type AIProviderDetection = AIProviderDetectionResult;

/**
 * Enhanced AI Provider Detector Service
 *
 * Features:
 * - Detects 8 major AI providers (OpenAI, Anthropic, Google AI, Cohere, HuggingFace, Replicate, Mistral, Together AI)
 * - Multi-method detection (API endpoints, user agents, OAuth scopes, IP ranges, webhooks, content signatures)
 * - Confidence scoring with weighted detection methods
 * - Model name extraction (gpt-4, claude-3-opus, gemini-pro, etc.)
 * - Evidence collection for each detection
 * - Compatible with existing detection engine
 */
export class AIProviderDetectorService {
  /**
   * Detect AI providers from Google Workspace events
   * Returns automation signatures (legacy format) for backward compatibility
   *
   * @param events - Array of Google Workspace audit log events
   * @returns Array of automation signatures
   */
  detectAIProviders(events: GoogleWorkspaceEvent[]): AutomationSignature[] {
    const detections = this.detectAIProvidersInternal(events);
    return this.generateAutomationSignatures(detections, events);
  }

  /**
   * Internal detection method that returns new AIProviderDetection format
   *
   * @param events - Array of Google Workspace audit log events
   * @returns Array of AI provider detection results
   */
  private detectAIProvidersInternal(events: GoogleWorkspaceEvent[]): AIProviderDetection[] {
    const detections: AIProviderDetection[] = [];
    const processedProviders = new Set<string>(); // Prevent duplicate detections

    for (const event of events) {
      const detection = this.analyzeEventForAIProvider(event);

      if (detection) {
        // Use provider as deduplication key
        const detectionKey = `${detection.provider}_${event.userId}`;

        if (!processedProviders.has(detectionKey)) {
          processedProviders.add(detectionKey);
          detections.push(detection);
        }
      }
    }

    return detections;
  }

  /**
   * Analyze a single event for AI provider indicators
   *
   * @param event - Google Workspace event
   * @returns AI provider detection result or null
   */
  private analyzeEventForAIProvider(event: GoogleWorkspaceEvent): AIProviderDetection | null {
    // Extract relevant data from event
    const eventData = this.extractEventData(event);

    // Use comprehensive detection function from ai-provider-patterns
    const detection = detectAIProvider(eventData);

    if (!detection) {
      return null;
    }

    // Extract model name if present in event content
    const model = eventData.content ? extractModelName(eventData.content) : undefined;

    // Build complete AI provider detection result
    return {
      provider: detection.provider,
      confidence: detection.confidence,
      detectionMethods: detection.detectionMethods,
      evidence: detection.evidence,
      model: model || detection.model,
      detectedAt: event.timestamp
    };
  }

  /**
   * Extract detection-relevant data from Google Workspace event
   *
   * @param event - Google Workspace event
   * @returns Event data structured for AI provider detection
   */
  private extractEventData(event: GoogleWorkspaceEvent): {
    apiEndpoint?: string;
    userAgent?: string;
    scopes?: string[];
    ipAddress?: string;
    webhookUrl?: string;
    content?: string;
  } {
    const actionDetails = event.actionDetails;
    const actionDetailsStr = JSON.stringify(actionDetails);

    return {
      // Extract API endpoint from action details or resource ID
      apiEndpoint: this.extractApiEndpoint(actionDetailsStr, event.resourceId),

      // User agent from event
      userAgent: event.userAgent,

      // Extract OAuth scopes if present in action details
      scopes: this.extractOAuthScopes(actionDetails),

      // IP address from event
      ipAddress: event.ipAddress,

      // Extract webhook URLs from action details
      webhookUrl: this.extractWebhookUrl(actionDetailsStr),

      // Full content for signature matching
      content: actionDetailsStr
    };
  }

  /**
   * Extract API endpoint from event details
   */
  private extractApiEndpoint(actionDetails: string, resourceId: string): string | undefined {
    // Common API endpoint patterns (match URLs with proper protocol)
    const endpointPatterns = [
      /https?:\/\/[a-z0-9.-]+\.(?:openai|anthropic|cohere|huggingface|replicate|mistral|together|googleapis)\.(?:com|ai|co|xyz)(?:\/[a-z0-9/._-]*)?/gi,
      /(?:https?:\/\/)?api\.[a-z0-9.-]+\.(?:com|ai|co|xyz)(?:\/[a-z0-9/._-]*)?/gi
    ];

    for (const pattern of endpointPatterns) {
      const matches = actionDetails.match(pattern);
      if (matches && matches.length > 0) {
        // Return the first match, removing any escape backslashes
        let endpoint = matches[0];

        // Remove escape backslashes (\" becomes ")
        endpoint = endpoint.replace(/\\/g, '');

        // Remove trailing quotes or commas
        endpoint = endpoint.replace(/[",]+$/, '');

        return endpoint;
      }
    }

    // Check if resource ID looks like an API endpoint
    if (resourceId && resourceId.includes('api.')) {
      return resourceId;
    }

    return undefined;
  }

  /**
   * Extract OAuth scopes from action details
   */
  private extractOAuthScopes(actionDetails: { action: string; resourceName: string; additionalMetadata: Record<string, unknown> }): string[] | undefined {
    const metadata = actionDetails.additionalMetadata;

    // Check for OAuth scopes in metadata
    if (metadata?.scopes) {
      if (Array.isArray(metadata.scopes)) {
        return metadata.scopes as string[];
      }
      if (typeof metadata.scopes === 'string') {
        return [metadata.scopes];
      }
    }

    // Check for scope in OAuth application details
    if (metadata?.oauthScopes) {
      if (Array.isArray(metadata.oauthScopes)) {
        return metadata.oauthScopes as string[];
      }
    }

    // Check for authorized scopes
    if (metadata?.authorizedScopes) {
      if (Array.isArray(metadata.authorizedScopes)) {
        return metadata.authorizedScopes as string[];
      }
    }

    return undefined;
  }

  /**
   * Extract webhook URL from action details
   */
  private extractWebhookUrl(actionDetails: string): string | undefined {
    const webhookPatterns = [
      /webhook[s]?:?\s*["']?(https?:\/\/[^"'\s]+)["']?/gi,
      /callback[s]?:?\s*["']?(https?:\/\/[^"'\s]+)["']?/gi,
      /https?:\/\/[a-z0-9.-]+\.(?:openai|anthropic|cohere|huggingface|replicate|mistral|together|googleapis)\.(?:com|ai|co|xyz)\/(?:webhook|callback)[^\s"]*/gi
    ];

    for (const pattern of webhookPatterns) {
      const matches = actionDetails.match(pattern);
      if (matches && matches.length > 0) {
        // Extract just the URL from the match
        const urlMatch = matches[0].match(/https?:\/\/[^\s"']+/);
        if (urlMatch) {
          return urlMatch[0];
        }
      }
    }

    return undefined;
  }

  /**
   * Generate automation signatures (legacy format)
   * Converts AIProviderDetection to AutomationSignature for backward compatibility
   *
   * @param detections - AI provider detections
   * @param events - Original events
   * @returns Array of automation signatures
   */
  generateAutomationSignatures(
    detections: AIProviderDetection[],
    events: GoogleWorkspaceEvent[]
  ): AutomationSignature[] {
    return detections.map(detection => {
      // Find events related to this detection
      const relatedEvents = events.filter(event =>
        this.isEventRelatedToDetection(event, detection)
      );

      // Map new AIProvider types to legacy types
      const legacyProvider = this.mapToLegacyProvider(detection.provider);

      // Use detection timestamp or current time as fallback
      const detectedTime = detection.detectedAt || new Date();

      return {
        signatureId: `ai_sig_${detection.provider}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        signatureType: 'ai_integration',
        aiProvider: legacyProvider,
        detectionMethod: this.primaryDetectionMethod(detection.detectionMethods),
        confidence: detection.confidence,
        riskLevel: this.determineRiskLevel(detection.confidence),
        indicators: {
          apiEndpoints: detection.evidence.matchedEndpoints || [],
          userAgents: detection.evidence.matchedUserAgents || [],
          contentSignatures: detection.evidence.matchedSignatures || []
        },
        metadata: {
          firstDetected: detectedTime,
          lastDetected: detectedTime,
          occurrenceCount: relatedEvents.length,
          affectedResources: relatedEvents.map(e => e.resourceId)
        }
      };
    });
  }

  /**
   * Check if event is related to a detection
   */
  private isEventRelatedToDetection(
    event: GoogleWorkspaceEvent,
    detection: AIProviderDetection
  ): boolean {
    const eventData = this.extractEventData(event);
    const eventDataStr = JSON.stringify(eventData).toLowerCase();

    // Check if any evidence from detection appears in event
    const allEvidence = [
      ...(detection.evidence.matchedEndpoints || []),
      ...(detection.evidence.matchedUserAgents || []),
      ...(detection.evidence.matchedSignatures || [])
    ];

    return allEvidence.some(evidence =>
      eventDataStr.includes(evidence.toLowerCase())
    );
  }

  /**
   * Map new AIProvider type to legacy provider type
   */
  private mapToLegacyProvider(provider: AIProvider): 'openai' | 'anthropic' | 'cohere' | 'huggingface' | 'unknown' {
    const legacyProviders = ['openai', 'anthropic', 'cohere', 'huggingface'] as const;

    if (legacyProviders.includes(provider as any)) {
      return provider as any;
    }

    // Map new providers to closest legacy equivalent
    switch (provider) {
      case 'google_ai':
        return 'unknown'; // No direct legacy mapping
      case 'replicate':
      case 'mistral':
      case 'together_ai':
        return 'unknown'; // No direct legacy mapping
      default:
        return 'unknown';
    }
  }

  /**
   * Get primary detection method for legacy compatibility
   */
  private primaryDetectionMethod(methods: DetectionMethod[]): AutomationSignature['detectionMethod'] {
    // Priority order for detection methods
    const priority: DetectionMethod[] = [
      'api_endpoint',
      'oauth_scope',
      'user_agent',
      'webhook_pattern',
      'content_signature',
      'ip_range'
    ];

    for (const method of priority) {
      if (methods.includes(method)) {
        switch (method) {
          case 'api_endpoint':
            return 'api_endpoint';
          case 'user_agent':
            return 'user_agent';
          case 'content_signature':
            return 'content_analysis';
          default:
            return 'access_pattern';
        }
      }
    }

    return 'access_pattern';
  }

  /**
   * Determine risk level from confidence score
   */
  private determineRiskLevel(confidence: number): RiskIndicator['riskLevel'] {
    if (confidence < 30) return 'low';
    if (confidence < 60) return 'medium';
    if (confidence < 90) return 'high';
    return 'critical';
  }

  /**
   * Generate AI integration risk indicators (legacy format)
   *
   * @param signatures - Automation signatures
   * @returns Array of risk indicators
   */
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
      mitigationRecommendations: this.generateMitigationRecommendations(signature.aiProvider!),
      complianceImpact: {
        gdpr: signature.riskLevel !== 'low',
        sox: signature.riskLevel === 'high' || signature.riskLevel === 'critical',
        hipaa: signature.riskLevel === 'high' || signature.riskLevel === 'critical',
        pci: false
      }
    }));
  }

  /**
   * Generate AI provider-specific mitigation recommendations
   */
  private generateMitigationRecommendations(provider: string): string[] {
    const baseRecommendations = [
      `Review AI provider integration for ${provider}`,
      'Verify API key security and rotation policy',
      'Check script permissions and data access scope',
      'Audit external service access and data flow'
    ];

    // Provider-specific recommendations
    const providerSpecific: Record<string, string[]> = {
      openai: [
        'Review prompts for sensitive data leakage',
        'Implement prompt injection safeguards',
        'Monitor API usage and costs'
      ],
      anthropic: [
        'Review Claude integration safety settings',
        'Verify prompt content filtering',
        'Check data retention policies'
      ],
      google_ai: [
        'Verify Google AI API quotas and limits',
        'Review Gemini model access permissions',
        'Check data residency requirements'
      ],
      cohere: [
        'Review Cohere embedding usage',
        'Verify classification model training data',
        'Check API rate limits'
      ],
      huggingface: [
        'Audit model inference endpoints',
        'Review custom model deployments',
        'Verify model licensing compliance'
      ]
    };

    return [
      ...baseRecommendations,
      ...(providerSpecific[provider] || [])
    ];
  }

  /**
   * Get detection statistics
   *
   * @param detections - AI provider detections
   * @returns Detection statistics summary
   */
  getDetectionStatistics(detections: AIProviderDetection[]): {
    totalDetections: number;
    byProvider: Record<AIProvider, number>;
    byConfidenceLevel: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
    averageConfidence: number;
    detectionMethods: Record<DetectionMethod, number>;
  } {
    const byProvider: Record<AIProvider, number> = {} as any;
    const byConfidenceLevel = { low: 0, medium: 0, high: 0, critical: 0 };
    const detectionMethods: Record<DetectionMethod, number> = {} as any;
    let totalConfidence = 0;

    for (const detection of detections) {
      // Count by provider
      byProvider[detection.provider] = (byProvider[detection.provider] || 0) + 1;

      // Count by confidence level
      const level = this.determineRiskLevel(detection.confidence);
      byConfidenceLevel[level]++;

      // Count detection methods
      for (const method of detection.detectionMethods) {
        detectionMethods[method] = (detectionMethods[method] || 0) + 1;
      }

      totalConfidence += detection.confidence;
    }

    return {
      totalDetections: detections.length,
      byProvider,
      byConfidenceLevel,
      averageConfidence: detections.length > 0 ? Math.round(totalConfidence / detections.length) : 0,
      detectionMethods
    };
  }
}

/**
 * Export singleton instance for service consistency
 */
export const aiProviderDetector = new AIProviderDetectorService();
