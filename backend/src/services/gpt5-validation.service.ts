/**
 * GPT-5 AI Validation Service
 * Uses GPT-5 to validate and filter detection results before dashboard display
 *
 * Business Impact: Reduces false positives and provides AI-powered threat assessment
 * Technical Objective: Intelligent filtering of detection results
 */

import OpenAI from 'openai';

interface GPT5ValidationResult {
  isValidThreat: boolean;
  confidence: number;
  reasoning: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  executiveSummary: string;
}

interface DetectionInput {
  automation: any;
  detectionSignals: any[];
  riskScore: number;
  organizationContext: string;
}

export class GPT5ValidationService {
  private openai: OpenAI | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeOpenAI();
  }

  private initializeOpenAI(): void {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.warn('⚠️ OpenAI API key not configured - GPT-5 validation disabled');
      console.warn('💡 Add OPENAI_API_KEY to .env file to enable AI validation');
      this.isConfigured = false;
      return;
    }

    try {
      this.openai = new OpenAI({ apiKey });
      this.isConfigured = true;
      console.log('✅ GPT-5 validation service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize OpenAI:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Validate detection using GPT-5 AI analysis
   */
  async validateDetection(detection: DetectionInput): Promise<GPT5ValidationResult> {
    // Fallback if GPT-5 not configured
    if (!this.isConfigured || !this.openai) {
      return this.fallbackValidation(detection);
    }

    try {
      const prompt = this.constructValidationPrompt(detection);

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-5',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || '500'),
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.3')
      });

      const analysis = response.choices[0]?.message?.content;
      if (!analysis) {
        throw new Error('No response from GPT-5');
      }

      return this.parseGPT5Response(analysis);

    } catch (error) {
      console.error('GPT-5 validation failed:', error);
      return this.fallbackValidation(detection);
    }
  }

  /**
   * Construct intelligent prompt for GPT-5 analysis
   */
  private constructValidationPrompt(detection: DetectionInput): string {
    return `You are an expert cybersecurity analyst specializing in shadow AI and automation security.

Analyze this detected automation and determine if it represents a genuine security threat:

AUTOMATION DETAILS:
- Name: ${detection.automation.name}
- Platform: ${detection.automation.platform}
- Type: ${detection.automation.type}
- Permissions: ${detection.automation.permissions?.join(', ') || 'Unknown'}
- Risk Factors: ${detection.automation.metadata?.riskFactors?.join(', ') || 'None listed'}

DETECTION SIGNALS:
- Pattern Analysis Score: ${detection.riskScore}/100
- Detection Algorithms: ${detection.detectionSignals.map(s => s.type).join(', ')}
- Organization Context: ${detection.organizationContext}

ANALYSIS REQUIREMENTS:
1. Assess if this represents a genuine security threat
2. Consider business context and legitimate automation use cases
3. Evaluate the severity of potential security impact
4. Provide clear, actionable reasoning

Respond in this exact JSON format:
{
  "isValidThreat": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "Detailed explanation of analysis",
  "riskLevel": "low/medium/high/critical",
  "executiveSummary": "One sentence executive summary"
}`;
  }

  /**
   * Parse GPT-5 response into structured result
   */
  private parseGPT5Response(response: string): GPT5ValidationResult {
    try {
      // Try to parse JSON response
      const parsed = JSON.parse(response);

      return {
        isValidThreat: Boolean(parsed.isValidThreat),
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
        reasoning: parsed.reasoning || 'GPT-5 analysis completed',
        riskLevel: parsed.riskLevel || 'medium',
        executiveSummary: parsed.executiveSummary || 'AI threat assessment completed'
      };
    } catch (error) {
      // Fallback parsing if JSON fails
      console.warn('Failed to parse GPT-5 JSON response, using text analysis');

      const isValidThreat = response.toLowerCase().includes('threat') ||
                           response.toLowerCase().includes('risk') ||
                           response.toLowerCase().includes('danger');

      return {
        isValidThreat,
        confidence: 0.7,
        reasoning: response.substring(0, 200),
        riskLevel: isValidThreat ? 'medium' : 'low',
        executiveSummary: 'GPT-5 text analysis completed'
      };
    }
  }

  /**
   * Fallback validation when GPT-5 is unavailable
   */
  private fallbackValidation(detection: DetectionInput): GPT5ValidationResult {
    const riskScore = detection.riskScore;

    return {
      isValidThreat: riskScore > 50,
      confidence: 0.6, // Lower confidence without AI
      reasoning: 'Rule-based validation (GPT-5 unavailable)',
      riskLevel: riskScore > 80 ? 'high' : riskScore > 50 ? 'medium' : 'low',
      executiveSummary: 'Traditional pattern analysis applied'
    };
  }

  /**
   * Batch validate multiple detections
   */
  async validateBatch(detections: DetectionInput[]): Promise<GPT5ValidationResult[]> {
    const validations = await Promise.all(
      detections.map(detection => this.validateDetection(detection))
    );

    console.log(`🧠 GPT-5 validated ${detections.length} detections`);
    const validThreats = validations.filter(v => v.isValidThreat).length;
    console.log(`🎯 ${validThreats}/${detections.length} validated as genuine threats`);

    return validations;
  }

  /**
   * Get service status
   */
  getStatus(): {
    configured: boolean;
    model: string;
    apiKeyPresent: boolean;
  } {
    return {
      configured: this.isConfigured,
      model: process.env.OPENAI_MODEL || 'gpt-5',
      apiKeyPresent: Boolean(process.env.OPENAI_API_KEY)
    };
  }
}

export const gpt5ValidationService = new GPT5ValidationService();