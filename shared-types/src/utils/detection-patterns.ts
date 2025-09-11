/**
 * Google Workspace Detection Patterns
 * Foundation types for shadow AI and automation detection algorithms
 * Following CLAUDE.md Types-Tests-Code methodology
 */

/**
 * Google Workspace activity pattern for automation detection
 */
export interface GoogleActivityPattern {
  patternId: string;
  patternType: 'velocity' | 'batch_operation' | 'off_hours' | 'regular_interval' | 'api_usage';
  detectedAt: Date;
  confidence: number; // 0-100, confidence in automation detection
  metadata: {
    userId: string;
    userEmail: string;
    resourceType: 'file' | 'email' | 'calendar' | 'script' | 'permission';
    actionType: string;
    timestamp: Date;
    location?: string;
    userAgent?: string;
  };
  evidence: {
    description: string;
    dataPoints: Record<string, unknown>;
    supportingEvents: string[];
  };
}

/**
 * Automation signature for known AI tool detection
 */
export interface AutomationSignature {
  signatureId: string;
  signatureType: 'ai_integration' | 'api_pattern' | 'behavior_pattern' | 'external_service';
  aiProvider?: 'openai' | 'anthropic' | 'cohere' | 'huggingface' | 'unknown';
  detectionMethod: 'api_endpoint' | 'user_agent' | 'access_pattern' | 'content_analysis';
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  indicators: {
    apiEndpoints?: string[];
    userAgents?: string[];
    accessPatterns?: string[];
    contentSignatures?: string[];
  };
  metadata: {
    firstDetected: Date;
    lastDetected: Date;
    occurrenceCount: number;
    affectedResources: string[];
  };
}

/**
 * Risk indicator for security assessment
 */
export interface RiskIndicator {
  indicatorId: string;
  riskType: 'data_sensitivity' | 'permission_scope' | 'external_access' | 'automation_frequency';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  severity: number; // 0-100, numerical risk score
  description: string;
  detectionTime: Date;
  affectedResources: {
    resourceId: string;
    resourceType: 'file' | 'email' | 'script' | 'service_account';
    resourceName: string;
    sensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
  }[];
  mitigationRecommendations: string[];
  complianceImpact: {
    gdpr: boolean;
    sox: boolean;
    hipaa: boolean;
    pci: boolean;
  };
}

/**
 * Type guards for runtime validation
 */

export function isValidGoogleActivityPattern(value: unknown): value is GoogleActivityPattern {
  return (
    typeof value === 'object' &&
    value !== null &&
    'patternId' in value &&
    'patternType' in value &&
    'detectedAt' in value &&
    'confidence' in value &&
    typeof (value as any).patternId === 'string' &&
    ['velocity', 'batch_operation', 'off_hours', 'regular_interval', 'api_usage'].includes((value as any).patternType) &&
    (value as any).detectedAt instanceof Date &&
    typeof (value as any).confidence === 'number' &&
    (value as any).confidence >= 0 &&
    (value as any).confidence <= 100
  );
}

export function isValidAutomationSignature(value: unknown): value is AutomationSignature {
  return (
    typeof value === 'object' &&
    value !== null &&
    'signatureId' in value &&
    'signatureType' in value &&
    'detectionMethod' in value &&
    'confidence' in value &&
    'riskLevel' in value &&
    typeof (value as any).signatureId === 'string' &&
    ['ai_integration', 'api_pattern', 'behavior_pattern', 'external_service'].includes((value as any).signatureType) &&
    ['api_endpoint', 'user_agent', 'access_pattern', 'content_analysis'].includes((value as any).detectionMethod) &&
    typeof (value as any).confidence === 'number' &&
    ['low', 'medium', 'high', 'critical'].includes((value as any).riskLevel)
  );
}

export function isValidRiskIndicator(value: unknown): value is RiskIndicator {
  return (
    typeof value === 'object' &&
    value !== null &&
    'indicatorId' in value &&
    'riskType' in value &&
    'riskLevel' in value &&
    'severity' in value &&
    typeof (value as any).indicatorId === 'string' &&
    ['data_sensitivity', 'permission_scope', 'external_access', 'automation_frequency'].includes((value as any).riskType) &&
    ['low', 'medium', 'high', 'critical'].includes((value as any).riskLevel) &&
    typeof (value as any).severity === 'number' &&
    (value as any).severity >= 0 &&
    (value as any).severity <= 100
  );
}