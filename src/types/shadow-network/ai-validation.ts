import { z } from 'zod';

// Enum for risk classifications
export const RiskClassificationEnum = z.enum([
  'HIGH_RISK_AUTOMATION',
  'APPROVED_BUSINESS_PROCESS',
  'NOISE'
]);

// Comprehensive AI Validation Result Type
export interface AIValidationResult {
  signalId: string;
  classification: z.infer<typeof RiskClassificationEnum>;
  confidence: number; // 0-100 percentage
  reasoning: string;
  evidenceSummary: string[];
  detectedAt: Date;
  organizationId: string;
}

// Supported OpenAI GPT-5 Models for shadow network detection
export const GPT5ModelVariants = z.enum([
  'gpt-5',      // Best accuracy for complex pattern analysis
  'gpt-5-mini', // Balanced accuracy and cost for high-volume analysis
  'gpt-5-nano'  // Cost-effective for simple pattern classification
]);

// LLM Service Configuration
export interface LLMServiceConfig {
  provider: string;
  apiEndpoint: string;
  apiKey: string;
  model?: z.infer<typeof GPT5ModelVariants>; // GPT-5 model variant selection
  maxTokens?: number;
  temperature?: number;
}

// Cost Tracking for LLM API Usage
export interface LLMUsageTracker {
  organizationId: string;
  currentMonthUsage: number;
  monthlyCap: number;
  lastResetDate: Date;
  warningThresholdPercentage: number;
}

// Validation Request Type
export interface AIValidationRequest {
  signalMetadata: Record<string, unknown>;
  platformContext: {
    platform: 'GOOGLE_WORKSPACE' | 'SLACK';
    detectionType: string;
  };
  organizationId: string;
}

// Validation Error Handling
export class AIValidationError extends Error {
  public code: 'SERVICE_UNAVAILABLE' | 'RATE_LIMITED' | 'CONFIGURATION_ERROR';

  constructor(message: string, code: AIValidationError['code']) {
    super(message);
    this.name = 'AIValidationError';
    this.code = code;
  }
}

// Type guard for AI Validation Result
export function isAIValidationResult(result: unknown): result is AIValidationResult {
  return (
    typeof result === 'object' &&
    result !== null &&
    'signalId' in result &&
    'classification' in result &&
    'confidence' in result
  );
}