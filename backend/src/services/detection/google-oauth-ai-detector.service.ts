import {
  AIplatformAuditLog,
  AIPlatform,
  AIActivityType,
  AIRiskIndicator
} from '@saas-xray/shared-types';

/**
 * Detects AI platform logins via Google Workspace OAuth audit logs
 *
 * This service monitors Google Admin SDK login and token events to identify
 * when users authenticate to AI platforms (ChatGPT, Claude, etc.) using
 * Google SSO or OAuth.
 */
export class GoogleOAuthAIDetectorService {
  private readonly AI_PLATFORM_PATTERNS = {
    chatgpt: {
      domains: [
        'api.openai.com',
        'auth.openai.com',
        'chat.openai.com',
        'platform.openai.com'
      ],
      clientIdPatterns: ['openai', 'chatgpt'],
      displayName: 'ChatGPT',
      riskLevel: 'medium' as const
    },
    claude: {
      domains: [
        'claude.ai',
        'anthropic.com',
        'console.anthropic.com'
      ],
      clientIdPatterns: ['anthropic', 'claude'],
      displayName: 'Claude',
      riskLevel: 'medium' as const
    },
    gemini: {
      domains: [
        'gemini.google.com',
        'ai.google.dev',
        'generativelanguage.googleapis.com'
      ],
      clientIdPatterns: ['gemini'],
      displayName: 'Gemini',
      riskLevel: 'low' as const // Native Google product
    },
    perplexity: {
      domains: ['perplexity.ai', 'www.perplexity.ai'],
      clientIdPatterns: ['perplexity'],
      displayName: 'Perplexity AI',
      riskLevel: 'medium' as const
    },
    copilot: {
      domains: [
        'copilot.microsoft.com',
        'github.com/copilot',
        'api.github.com/copilot'
      ],
      clientIdPatterns: ['copilot', 'github-copilot'],
      displayName: 'GitHub Copilot',
      riskLevel: 'low' as const
    }
  };

  /**
   * Analyze Google login/token audit log for AI platform OAuth events
   *
   * @param googleEvent - Raw Google Admin SDK activity event
   * @returns Normalized AIplatformAuditLog or null if not AI platform
   */
  detectAIPlatformLogin(googleEvent: any): AIplatformAuditLog | null {
    if (!googleEvent || !googleEvent.events || googleEvent.events.length === 0) {
      return null;
    }

    const parameters = this.extractParameters(googleEvent.events);

    // Check if this is an OAuth event
    if (!this.isOAuthEvent(googleEvent)) {
      return null;
    }

    // Extract application/client information
    const applicationName = parameters.application_name ||
                          parameters.app_name ||
                          parameters.client_name;
    const clientId = parameters.oauth_client_id ||
                    parameters.client_id;

    // Identify AI platform
    const detectedPlatform = this.identifyAIPlatform(applicationName, clientId);

    if (!detectedPlatform) {
      return null; // Not an AI platform
    }

    // Normalize to AIplatformAuditLog
    return this.normalizeToAIPlatformLog(googleEvent, detectedPlatform, parameters);
  }

  /**
   * Identify AI platform from OAuth parameters
   */
  identifyAIPlatform(applicationName?: string, clientId?: string): AIPlatform | null {
    if (!applicationName && !clientId) {
      return null;
    }

    for (const [platform, patterns] of Object.entries(this.AI_PLATFORM_PATTERNS)) {
      // Check domain match
      if (applicationName) {
        const matchesDomain = patterns.domains.some(domain =>
          applicationName.toLowerCase().includes(domain.toLowerCase())
        );
        if (matchesDomain) {
          return platform as AIPlatform;
        }
      }

      // Check client ID match
      if (clientId) {
        const matchesClientId = patterns.clientIdPatterns.some(pattern =>
          clientId.toLowerCase().includes(pattern.toLowerCase())
        );
        if (matchesClientId) {
          return platform as AIPlatform;
        }
      }
    }

    return null;
  }

  /**
   * Check if Google event is an OAuth-related event
   */
  private isOAuthEvent(googleEvent: any): boolean {
    const eventName = googleEvent.events[0]?.name?.toLowerCase() || '';

    const oauthEventNames = [
      'oauth2_authorize',
      'oauth2_approve',
      'authorize',
      'token_revoke',
      'login_success'
    ];

    return oauthEventNames.some(name => eventName.includes(name));
  }

  /**
   * Normalize Google OAuth event to AIplatformAuditLog
   */
  private normalizeToAIPlatformLog(
    googleEvent: any,
    platform: AIPlatform,
    parameters: any
  ): AIplatformAuditLog {
    const eventName = googleEvent.events[0]?.name || '';

    return {
      id: googleEvent.id.uniqueQualifier,
      platform,
      timestamp: new Date(googleEvent.id.time),
      userId: googleEvent.actor.profileId,
      userEmail: googleEvent.actor.email,
      organizationId: googleEvent.id.customerId,
      activityType: this.mapOAuthEventToActivityType(eventName),
      action: eventName,
      metadata: {
        applicationName: parameters.application_name || parameters.app_name,
        clientId: parameters.oauth_client_id || parameters.client_id,
        scopes: parameters.oauth_scopes || parameters.scope || [],
        loginType: parameters.login_type,
        isThirdParty: parameters.is_third_party_id || true,
        platformDisplayName: this.AI_PLATFORM_PATTERNS[platform].displayName
      },
      ipAddress: googleEvent.ipAddress,
      userAgent: parameters.user_agent,
      riskIndicators: this.assessOAuthRiskIndicators(parameters, platform)
    };
  }

  /**
   * Map OAuth event name to AI activity type
   */
  private mapOAuthEventToActivityType(eventName: string): AIActivityType {
    const lowerEvent = eventName.toLowerCase();

    if (lowerEvent.includes('authorize') || lowerEvent.includes('approve')) {
      return 'integration_created'; // OAuth consent = new integration
    }

    if (lowerEvent.includes('login')) {
      return 'login';
    }

    if (lowerEvent.includes('logout')) {
      return 'logout';
    }

    if (lowerEvent.includes('revoke')) {
      return 'api_key_deleted'; // Token revoked
    }

    return 'login'; // Default
  }

  /**
   * Assess risk indicators for OAuth authorization
   */
  assessOAuthRiskIndicators(parameters: any, platform: AIPlatform): AIRiskIndicator[] {
    const indicators: AIRiskIndicator[] = [];

    const scopes = parameters.oauth_scopes || parameters.scope || [];

    // Check for excessive scopes
    if (scopes.length > 5) {
      indicators.push({
        type: 'security_event',
        severity: 'medium',
        description: `OAuth authorization with ${scopes.length} scopes to ${platform}`,
        confidence: 70,
        evidence: [`Scopes granted: ${scopes.join(', ')}`]
      });
    }

    // Check for sensitive data scopes
    const sensitiveScopePatterns = [
      'drive',
      'gmail',
      'calendar',
      'contacts',
      'admin',
      'directory'
    ];

    const sensitiveScopes = scopes.filter((scope: string) =>
      sensitiveScopePatterns.some(pattern => scope.toLowerCase().includes(pattern))
    );

    if (sensitiveScopes.length > 0) {
      indicators.push({
        type: 'unauthorized_access',
        severity: 'high',
        description: `${this.AI_PLATFORM_PATTERNS[platform].displayName} authorized with sensitive data access`,
        confidence: 85,
        evidence: [
          `Sensitive scopes: ${sensitiveScopes.join(', ')}`,
          'AI platform can access user data in Google Workspace'
        ],
        complianceImpact: ['GDPR', 'SOC2']
      });
    }

    // Platform-specific risk assessment
    const baseRisk = this.AI_PLATFORM_PATTERNS[platform].riskLevel;
    if (baseRisk === 'medium' && indicators.length === 0) {
      indicators.push({
        type: 'policy_violation',
        severity: 'medium',
        description: `Unauthorized ${this.AI_PLATFORM_PATTERNS[platform].displayName} integration detected`,
        confidence: 75,
        evidence: ['User authorized third-party AI platform without approval']
      });
    }

    return indicators;
  }

  /**
   * Extract parameters from Google event
   */
  private extractParameters(events: any[]): Record<string, any> {
    const params: Record<string, any> = {};

    events.forEach(event => {
      if (event.parameters) {
        event.parameters.forEach((param: any) => {
          if (param.multiValue) {
            params[param.name] = param.multiValue;
          } else if (param.value) {
            params[param.name] = param.value;
          } else if (param.intValue) {
            params[param.name] = parseInt(param.intValue);
          } else if (param.boolValue !== undefined) {
            params[param.name] = param.boolValue;
          }
        });
      }
    });

    return params;
  }

  /**
   * Get list of all supported AI platforms
   */
  getSupportedPlatforms(): Array<{ platform: AIPlatform; displayName: string }> {
    return Object.entries(this.AI_PLATFORM_PATTERNS).map(([key, value]) => ({
      platform: key as AIPlatform,
      displayName: value.displayName
    }));
  }
}

// Export singleton
export const googleOAuthAIDetector = new GoogleOAuthAIDetectorService();