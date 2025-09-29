/**
 * AI Enhanced Detection Orchestrator
 * Integrates GPT-5 validation with existing detection algorithms
 *
 * Flow: Local Detection → GPT-5 AI Validation → Dashboard Display
 * Business Impact: Reduces false positives through AI intelligence
 */

import { DetectionService } from './detection-service';
import { GPT5ValidationService } from './gpt5-validation.service';
import { MLEnhancedDetectionService } from './ml-behavioral/ml-enhanced-detection.service';

interface EnhancedDetectionResult {
  automation: any;
  localDetection: {
    riskScore: number;
    detectionSignals: any[];
    confidence: number;
  };
  gpt5Validation: {
    isValidThreat: boolean;
    confidence: number;
    reasoning: string;
    riskLevel: string;
    executiveSummary: string;
  };
  finalRiskScore: number;
  displayToUser: boolean;
  processingMetadata: {
    layers: string[];
    processingTimeMs: number;
    aiEnhanced: boolean;
  };
}

/**
 * AI Enhanced Detection Orchestrator
 * Coordinates all AI layers including GPT-5 validation before user display
 */
export class AIEnhancedDetectionOrchestrator {
  private detectionService: DetectionService;
  private gpt5Validation: GPT5ValidationService;
  private mlDetection: MLEnhancedDetectionService;

  constructor() {
    this.detectionService = new DetectionService();
    this.gpt5Validation = new GPT5ValidationService();
    this.mlDetection = new MLEnhancedDetectionService();
  }

  /**
   * Complete AI-enhanced detection flow
   */
  async analyzeForDashboard(
    automation: any,
    organizationContext: { organizationId: string; platform: string }
  ): Promise<EnhancedDetectionResult> {

    const startTime = Date.now();

    try {
      console.log(`🔍 Starting AI-enhanced analysis for: ${automation.name}`);

      // 1. Local pattern detection (existing algorithms)
      const localDetection = await this.runLocalDetection(automation);
      console.log(`📊 Local detection: ${localDetection.riskScore}/100 risk`);

      // 2. ML behavioral analysis (your new ML engine)
      const mlAnalysis = await this.mlDetection.analyzeAutomation(automation, organizationContext);
      console.log(`🧠 ML behavioral analysis: ${mlAnalysis.enhancedRiskScore}/100 risk`);

      // 3. GPT-5 AI validation (intelligent filtering)
      const gpt5Analysis = await this.gpt5Validation.validateDetection({
        automation,
        detectionSignals: localDetection.detectionSignals,
        riskScore: mlAnalysis.enhancedRiskScore,
        organizationContext: `${organizationContext.organizationId} - ${organizationContext.platform}`
      });

      console.log(`🤖 GPT-5 validation: ${gpt5Analysis.isValidThreat ? 'VALID THREAT' : 'FALSE POSITIVE'} (${Math.round(gpt5Analysis.confidence * 100)}% confidence)`);

      // 4. Final risk scoring (combine all AI layers)
      const finalRiskScore = this.calculateFinalRiskScore({
        local: localDetection.riskScore,
        ml: mlAnalysis.enhancedRiskScore,
        gpt5: gpt5Analysis
      });

      // 5. Display decision (AI-filtered results)
      const displayToUser = this.shouldDisplayToUser(gpt5Analysis, finalRiskScore);

      const processingTime = Date.now() - startTime;

      const result: EnhancedDetectionResult = {
        automation,
        localDetection,
        gpt5Validation: gpt5Analysis,
        finalRiskScore,
        displayToUser,
        processingMetadata: {
          layers: ['local_detection', 'ml_behavioral', 'gpt5_validation'],
          processingTimeMs: processingTime,
          aiEnhanced: true
        }
      };

      // Log AI filtering decision
      if (displayToUser) {
        console.log(`✅ Displaying to user: ${automation.name} (Final risk: ${finalRiskScore}/100)`);
      } else {
        console.log(`🚫 Filtered out: ${automation.name} (AI determined false positive)`);
      }

      return result;

    } catch (error) {
      console.error('AI-enhanced detection failed:', error);

      // Fallback to local detection only
      return this.fallbackAnalysis(automation, organizationContext);
    }
  }

  /**
   * Run existing local detection algorithms
   */
  private async runLocalDetection(automation: any): Promise<{
    riskScore: number;
    detectionSignals: any[];
    confidence: number;
  }> {

    // Simulate existing detection algorithms
    const detectionSignals = [];

    // AI Provider Detection
    if (automation.metadata?.riskFactors?.includes('OpenAI') ||
        automation.metadata?.riskFactors?.includes('AI')) {
      detectionSignals.push({
        type: 'ai_provider_detection',
        confidence: 0.9,
        details: 'AI service integration detected'
      });
    }

    // Velocity Detection
    if (automation.metadata?.riskFactors?.includes('Recently active')) {
      detectionSignals.push({
        type: 'velocity_detection',
        confidence: 0.8,
        details: 'High-frequency activity pattern'
      });
    }

    // Permission Analysis
    if (automation.permissions?.some((p: string) => p.includes('admin') || p.includes('write'))) {
      detectionSignals.push({
        type: 'permission_analysis',
        confidence: 0.85,
        details: 'Elevated permissions detected'
      });
    }

    // Calculate local risk score
    const baseRisk = automation.metadata?.riskScore || 50;
    const signalBonus = detectionSignals.length * 10;
    const riskScore = Math.min(baseRisk + signalBonus, 100);

    return {
      riskScore,
      detectionSignals,
      confidence: 0.8
    };
  }

  /**
   * Calculate final risk score combining all AI layers
   */
  private calculateFinalRiskScore(scores: {
    local: number;
    ml: number;
    gpt5: any;
  }): number {

    // Weight AI validation heavily
    const gpt5Weight = scores.gpt5.confidence;
    const gpt5Risk = scores.gpt5.isValidThreat ?
      (scores.gpt5.riskLevel === 'critical' ? 90 :
       scores.gpt5.riskLevel === 'high' ? 75 :
       scores.gpt5.riskLevel === 'medium' ? 50 : 25) : 10;

    // Combine with local and ML scores
    const weightedScore = (
      scores.local * 0.3 +
      scores.ml * 0.3 +
      gpt5Risk * 0.4
    );

    return Math.round(weightedScore);
  }

  /**
   * Decide if detection should be displayed to user
   */
  private shouldDisplayToUser(gpt5Analysis: any, finalRiskScore: number): boolean {
    // High confidence AI says it's a valid threat
    if (gpt5Analysis.isValidThreat && gpt5Analysis.confidence > 0.8) {
      return true;
    }

    // High risk score even if AI is uncertain
    if (finalRiskScore > 70) {
      return true;
    }

    // AI says false positive with high confidence
    if (!gpt5Analysis.isValidThreat && gpt5Analysis.confidence > 0.8) {
      return false;
    }

    // Default: show medium+ risk items
    return finalRiskScore > 40;
  }

  /**
   * Fallback analysis when GPT-5 unavailable
   */
  private fallbackAnalysis(automation: any, context: any): EnhancedDetectionResult {
    const localRisk = automation.metadata?.riskScore || 50;

    return {
      automation,
      localDetection: {
        riskScore: localRisk,
        detectionSignals: [{ type: 'fallback_analysis', confidence: 0.6 }],
        confidence: 0.6
      },
      gpt5Validation: {
        isValidThreat: localRisk > 50,
        confidence: 0.5,
        reasoning: 'GPT-5 validation unavailable',
        riskLevel: localRisk > 70 ? 'high' : 'medium',
        executiveSummary: 'Traditional analysis applied'
      },
      finalRiskScore: localRisk,
      displayToUser: localRisk > 40,
      processingMetadata: {
        layers: ['local_detection', 'fallback'],
        processingTimeMs: 100,
        aiEnhanced: false
      }
    };
  }

  /**
   * Filter detection results for dashboard display
   */
  async filterForDashboard(
    detections: any[],
    organizationContext: { organizationId: string; platform: string }
  ): Promise<{
    displayResults: any[];
    filteredOut: any[];
    processingStats: {
      total: number;
      displayed: number;
      filteredOut: number;
      aiValidated: number;
    };
  }> {

    console.log(`🧠 GPT-5 filtering ${detections.length} detections for dashboard display...`);

    const enhancedResults = await Promise.all(
      detections.map(detection =>
        this.analyzeForDashboard(detection, organizationContext)
      )
    );

    const displayResults = enhancedResults
      .filter(result => result.displayToUser)
      .map(result => ({
        ...result.automation,
        enhancedRiskScore: result.finalRiskScore,
        aiValidation: result.gpt5Validation,
        processingMetadata: result.processingMetadata
      }));

    const filteredOut = enhancedResults
      .filter(result => !result.displayToUser)
      .map(result => result.automation);

    const aiValidated = enhancedResults.filter(r => r.processingMetadata.aiEnhanced).length;

    return {
      displayResults,
      filteredOut,
      processingStats: {
        total: detections.length,
        displayed: displayResults.length,
        filteredOut: filteredOut.length,
        aiValidated
      }
    };
  }

  /**
   * Get GPT-5 service status
   */
  getServiceStatus(): {
    gpt5Configured: boolean;
    model: string;
    fallbackMode: boolean;
  } {
    return {
      gpt5Configured: this.gpt5Validation.getStatus().configured,
      model: process.env.OPENAI_MODEL || 'gpt-5',
      fallbackMode: !this.gpt5Validation.getStatus().configured
    };
  }
}

export const aiEnhancedDetectionOrchestrator = new AIEnhancedDetectionOrchestrator();