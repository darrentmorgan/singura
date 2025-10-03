/**
 * Cross-Platform Correlation Types
 * Multi-platform automation workflow detection for enterprise shadow AI governance
 * Following CLAUDE.md Types-Tests-Code methodology - Phase 4.2.1
 */

import { GoogleWorkspaceEvent } from './detection-patterns';

/**
 * Cross-platform correlation engine for automation chain detection
 */
export interface CrossPlatformCorrelationEngine {
  detectAutomationChains(events: MultiPlatformEvent[]): Promise<AutomationWorkflowChain[]>;
  analyzeTemporalCorrelation(events: MultiPlatformEvent[], timeWindowMs: number): Promise<TemporalCorrelation[]>;
  identifyUserCorrelation(events: MultiPlatformEvent[], userId: string): Promise<UserCorrelationAnalysis>;
  calculateCrossPlatformRisk(chains: AutomationWorkflowChain[]): Promise<MultiPlatformRiskAssessment>;
  generateExecutiveReport(analysis: CorrelationAnalysisResult): Promise<ExecutiveRiskReport>;
}

/**
 * Multi-platform event for correlation analysis
 */
export interface MultiPlatformEvent {
  eventId: string;
  platform: 'slack' | 'google' | 'microsoft' | 'jira';
  timestamp: Date;
  userId: string;
  userEmail: string;
  eventType: string;
  resourceId: string;
  resourceType: string;
  actionDetails: {
    action: string;
    resourceName: string;
    metadata: Record<string, unknown>;
  };
  correlationMetadata: {
    potentialTrigger: boolean;
    potentialAction: boolean;
    externalDataAccess: boolean;
    automationIndicators: string[];
  };
}

/**
 * Automation workflow chain spanning multiple platforms
 */
export interface AutomationWorkflowChain {
  chainId: string;
  chainName: string;
  platforms: ('slack' | 'google' | 'microsoft' | 'jira')[];
  triggerEvent: MultiPlatformEvent;
  actionEvents: MultiPlatformEvent[];
  correlationConfidence: number; // 0-100, confidence this is an automation chain
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  
  workflow: {
    description: string;
    stages: WorkflowStage[];
    dataFlow: DataFlowAnalysis;
    automation: {
      isAutomated: boolean;
      automationType: 'human_triggered' | 'time_based' | 'event_driven' | 'api_driven';
      frequency: 'one_time' | 'irregular' | 'regular' | 'continuous';
    };
  };
  
  riskAssessment: {
    dataExposure: DataExposureRisk;
    complianceImpact: ComplianceImpact;
    businessImpact: BusinessImpactAssessment;
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    recommendations: string[];
  };
}

/**
 * Individual stage in a cross-platform workflow
 */
export interface WorkflowStage {
  stageId: string;
  platform: 'slack' | 'google' | 'microsoft' | 'jira';
  stageName: string;
  description: string;
  events: MultiPlatformEvent[];
  timing: {
    averageExecutionTime: number;
    timeFromPreviousStage?: number;
    timingRegularity: 'consistent' | 'variable' | 'irregular';
  };
  dataProcessing: {
    inputData: string[];
    outputData: string[];
    transformationType: string;
    sensitivityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
  };
}

/**
 * Data flow analysis across platforms
 */
export interface DataFlowAnalysis {
  flowId: string;
  sourceDataType: string[];
  destinationPlatforms: string[];
  transformations: DataTransformation[];
  externalServices: ExternalServiceAccess[];
  sensitivityClassification: {
    containsPII: boolean;
    containsFinancialData: boolean;
    containsHealthData: boolean;
    containsBusinessSecrets: boolean;
    overallSensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
  };
}

/**
 * Data transformation in automation workflow
 */
export interface DataTransformation {
  transformationId: string;
  stage: string;
  inputFormat: string;
  outputFormat: string;
  processingType: 'extraction' | 'analysis' | 'generation' | 'aggregation' | 'ai_processing';
  aiProvider?: 'openai' | 'anthropic' | 'cohere' | 'huggingface' | 'unknown';
  riskIndicators: string[];
}

/**
 * External service access in workflow
 */
export interface ExternalServiceAccess {
  serviceId: string;
  serviceName: string;
  serviceType: 'ai_api' | 'data_processor' | 'storage' | 'communication' | 'analytics';
  dataShared: string[];
  permissionsGranted: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  complianceFlags: string[];
}

/**
 * Temporal correlation between events
 */
export interface TemporalCorrelation {
  correlationId: string;
  events: MultiPlatformEvent[];
  timeWindow: {
    startTime: Date;
    endTime: Date;
    durationMs: number;
  };
  pattern: {
    isSequential: boolean;
    isSimultaneous: boolean;
    hasRegularInterval: boolean;
    intervalMs?: number;
  };
  automationLikelihood: number; // 0-100, likelihood of automated workflow
  humanLikelihood: number; // 0-100, likelihood of human-initiated workflow
}

/**
 * User correlation analysis across platforms
 */
export interface UserCorrelationAnalysis {
  userId: string;
  userEmail: string;
  platforms: string[];
  activityCorrelation: {
    simultaneousActivity: boolean;
    crossPlatformWorkflows: number;
    automationPatterns: string[];
    riskIndicators: string[];
  };
  behavioral: {
    typicalWorkingHours: string;
    activityPatterns: string[];
    automationUsage: 'low' | 'medium' | 'high' | 'excessive';
    shadowAIUsage: 'none' | 'minimal' | 'moderate' | 'extensive';
  };
  riskProfile: {
    overallRiskScore: number;
    riskFactors: string[];
    complianceViolations: string[];
    recommendedActions: string[];
  };
}

/**
 * Multi-platform risk assessment
 */
export interface MultiPlatformRiskAssessment {
  assessmentId: string;
  organizationId: string;
  assessmentDate: Date;
  
  platforms: {
    slack: PlatformRiskMetrics;
    google: PlatformRiskMetrics;
    microsoft?: PlatformRiskMetrics;
    jira?: PlatformRiskMetrics;
  };
  
  crossPlatformRisks: {
    automationChains: number;
    dataExposureRisks: number;
    complianceViolations: number;
    unauthorizedAIIntegrations: number;
  };
  
  overallAssessment: {
    compositeRiskScore: number; // 0-100, weighted across all platforms
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    topRisks: string[];
    executiveSummary: string;
    recommendedActions: ActionPriority[];
  };
  
  complianceFramework: {
    gdprCompliance: ComplianceStatus;
    soxCompliance: ComplianceStatus;
    hipaaCompliance: ComplianceStatus;
    pciCompliance: ComplianceStatus;
    customCompliance: CustomComplianceCheck[];
  };
}

/**
 * Platform-specific risk metrics
 */
export interface PlatformRiskMetrics {
  platform: 'slack' | 'google' | 'microsoft' | 'jira';
  connectionStatus: 'connected' | 'disconnected' | 'error';
  automationsDetected: number;
  riskScore: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  aiIntegrations: AIIntegrationSummary[];
  complianceIssues: string[];
}

/**
 * AI integration summary for platform risk assessment
 */
export interface AIIntegrationSummary {
  aiProvider: 'openai' | 'anthropic' | 'cohere' | 'huggingface' | 'unknown';
  integrationCount: number;
  dataTypes: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastActivity: Date;
}

/**
 * Data exposure risk assessment
 */
export interface DataExposureRisk {
  exposureId: string;
  dataTypes: string[];
  sensitivityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
  exposureMethod: 'api_sharing' | 'file_sharing' | 'email_forwarding' | 'webhook' | 'ai_processing';
  externalDestinations: string[];
  estimatedVolume: 'low' | 'medium' | 'high' | 'massive';
  riskScore: number;
  complianceViolations: string[];
}

/**
 * Compliance impact assessment
 */
export interface ComplianceImpact {
  gdprViolations: string[];
  soxViolations: string[];
  hipaaViolations: string[];
  pciViolations: string[];
  customViolations: CustomComplianceViolation[];
  overallComplianceRisk: 'compliant' | 'minor_issues' | 'major_violations' | 'critical_violations';
}

/**
 * Business impact assessment
 */
export interface BusinessImpactAssessment {
  impactLevel: 'minimal' | 'moderate' | 'significant' | 'severe';
  affectedBusinessFunctions: string[];
  reputationRisk: 'low' | 'medium' | 'high' | 'critical';
  financialExposure: FinancialExposureEstimate;
  operationalRisk: string[];
  mitigationComplexity: 'simple' | 'moderate' | 'complex' | 'extensive';
}

/**
 * Financial exposure estimate
 */
export interface FinancialExposureEstimate {
  potentialFineRange: {
    minimum: number;
    maximum: number;
    currency: string;
  };
  remediationCosts: {
    estimated: number;
    confidence: 'low' | 'medium' | 'high';
    breakdown: Record<string, number>;
  };
  businessDisruptionCost: {
    estimated: number;
    timeframe: string;
    confidence: 'low' | 'medium' | 'high';
  };
}

/**
 * Action priority for executive recommendations
 */
export interface ActionPriority {
  actionId: string;
  priority: 'immediate' | 'high' | 'medium' | 'low';
  action: string;
  rationale: string;
  estimatedEffort: 'hours' | 'days' | 'weeks' | 'months';
  businessImpact: 'high' | 'medium' | 'low';
  complianceImpact: 'critical' | 'important' | 'minor' | 'none';
}

/**
 * Compliance status
 */
export interface ComplianceStatus {
  compliant: boolean;
  violations: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastAssessment: Date;
  nextReviewDate: Date;
  recommendedActions: string[];
}

/**
 * Custom compliance check for organization-specific requirements
 */
export interface CustomComplianceCheck {
  checkId: string;
  checkName: string;
  requirement: string;
  status: 'compliant' | 'non_compliant' | 'partial' | 'unknown';
  findings: string[];
  recommendation: string;
}

/**
 * Custom compliance violation
 */
export interface CustomComplianceViolation {
  violationId: string;
  violationType: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedResources: string[];
  remediation: string;
}

/**
 * Correlation analysis result
 */
export interface CorrelationAnalysisResult {
  analysisId: string;
  organizationId: string;
  analysisDate: Date;
  platforms: string[];
  
  summary: {
    totalAutomationChains: number;
    crossPlatformWorkflows: number;
    aiIntegrationsDetected: number;
    complianceViolations: number;
    overallRiskScore: number;
  };
  
  workflows: AutomationWorkflowChain[];
  riskAssessment: MultiPlatformRiskAssessment;
  executiveSummary: ExecutiveRiskReport;
  
  recommendations: {
    immediate: ActionPriority[];
    shortTerm: ActionPriority[];
    longTerm: ActionPriority[];
  };
}

/**
 * Executive risk report for C-level stakeholders
 */
export interface ExecutiveRiskReport {
  reportId: string;
  executiveSummary: string;
  keyFindings: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  
  businessContext: {
    totalPlatformsMonitored: number;
    totalAutomationsDetected: number;
    unauthorizedAIIntegrations: number;
    dataExposureRisks: number;
  };
  
  complianceStatus: {
    overallStatus: 'compliant' | 'at_risk' | 'violations_detected' | 'critical_violations';
    keyViolations: string[];
    complianceScore: number; // 0-100
  };
  
  actionPlan: {
    immediateActions: string[];
    strategicRecommendations: string[];
    investmentRequired: FinancialExposureEstimate;
    timeline: string;
  };
  
  kpis: {
    riskReduction: number; // Expected % risk reduction with recommended actions
    complianceImprovement: number; // Expected compliance score improvement
    costBenefit: number; // ROI of implementing recommendations
  };
}

/**
 * Type guards for correlation analysis validation
 */
export function isValidAutomationWorkflowChain(value: unknown): value is AutomationWorkflowChain {
  return (
    typeof value === 'object' &&
    value !== null &&
    'chainId' in value &&
    'chainName' in value &&
    'platforms' in value &&
    'triggerEvent' in value &&
    'actionEvents' in value &&
    typeof (value as any).chainId === 'string' &&
    Array.isArray((value as any).platforms) &&
    Array.isArray((value as any).actionEvents)
  );
}

export function isValidMultiPlatformRiskAssessment(value: unknown): value is MultiPlatformRiskAssessment {
  return (
    typeof value === 'object' &&
    value !== null &&
    'assessmentId' in value &&
    'organizationId' in value &&
    'overallAssessment' in value &&
    typeof (value as any).assessmentId === 'string' &&
    typeof (value as any).organizationId === 'string'
  );
}

export function isValidCorrelationAnalysisResult(value: unknown): value is CorrelationAnalysisResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'analysisId' in value &&
    'summary' in value &&
    'workflows' in value &&
    'riskAssessment' in value &&
    Array.isArray((value as any).workflows)
  );
}