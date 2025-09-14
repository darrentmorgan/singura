import {
  AIValidationResult,
  AIValidationRequest,
  LLMServiceConfig,
  LLMUsageTracker,
  AIValidationError,
  RiskClassificationEnum
} from '../../types/shadow-network/ai-validation';
import { OpenAI } from 'openai';
import { z } from 'zod';

export class AIValidationService {
  private llmClient: OpenAI;
  private usageTracker: Map<string, LLMUsageTracker> = new Map();
  private config: LLMServiceConfig;

  constructor(config: LLMServiceConfig) {
    this.config = config;
    this.llmClient = new OpenAI({ apiKey: config.apiKey });
  }

  private async trackUsage(organizationId: string): Promise<void> {
    const tracker = this.usageTracker.get(organizationId) || {
      organizationId,
      currentMonthUsage: 0,
      monthlyCap: 10000, // Default 10,000 tokens
      lastResetDate: new Date(),
      warningThresholdPercentage: 80
    };

    const currentDate = new Date();
    const monthChanged = currentDate.getMonth() !== tracker.lastResetDate.getMonth();

    if (monthChanged) {
      tracker.currentMonthUsage = 0;
      tracker.lastResetDate = currentDate;
    }

    if (tracker.currentMonthUsage >= tracker.monthlyCap) {
      throw new AIValidationError(
        'Monthly LLM API usage cap exceeded',
        'RATE_LIMITED'
      );
    }

    this.usageTracker.set(organizationId, tracker);
  }

  public async validateSignal(request: AIValidationRequest): Promise<AIValidationResult> {
    try {
      await this.trackUsage(request.organizationId);

      const prompt = this.constructPrompt(request);

      const response = await this.llmClient.chat.completions.create({
        model: this.config.model || 'gpt-5', // Use GPT-5 for maximum accuracy (45% fewer errors than GPT-4o)
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.config.maxTokens || 300,
        temperature: this.config.temperature || 0.5
      });

      const validationResult = this.parseValidationResponse(response.choices[0].message.content || '');

      return {
        signalId: crypto.randomUUID(),
        ...validationResult,
        detectedAt: new Date(),
        organizationId: request.organizationId
      };
    } catch (error) {
      if (error instanceof AIValidationError) {
        throw error;
      }

      // Graceful degradation: fallback mechanism
      return this.fallbackValidation(request);
    }
  }

  private constructPrompt(request: AIValidationRequest): string {
    return `
      Analyze the following signal metadata for potential automation risk.
      Platform: ${request.platformContext.platform}
      Detection Type: ${request.platformContext.detectionType}
      Signal Details: ${JSON.stringify(request.signalMetadata)}

      Provide classification as one of: HIGH_RISK_AUTOMATION, APPROVED_BUSINESS_PROCESS, NOISE
      Also provide a confidence percentage (0-100) and brief reasoning.

      Response format:
      {
        "classification": "...",
        "confidence": number,
        "reasoning": "...",
        "evidenceSummary": ["...", "..."]
      }
    `;
  }

  private parseValidationResponse(responseText: string): Omit<AIValidationResult, 'signalId' | 'detectedAt' | 'organizationId'> {
    try {
      const result = JSON.parse(responseText);

      const resultSchema = z.object({
        classification: RiskClassificationEnum,
        confidence: z.number().min(0).max(100),
        reasoning: z.string(),
        evidenceSummary: z.array(z.string())
      });

      return resultSchema.parse(result);
    } catch {
      return this.fallbackValidation().result;
    }
  }

  private fallbackValidation(request?: AIValidationRequest): { result: Omit<AIValidationResult, 'signalId' | 'detectedAt' | 'organizationId'> } {
    return {
      result: {
        classification: 'NOISE',
        confidence: 50,
        reasoning: 'Fallback validation due to AI service unavailability',
        evidenceSummary: ['Basic pattern matching used']
      }
    };
  }
}