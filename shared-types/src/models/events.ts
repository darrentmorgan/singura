/**
 * Event Processing and Detection Types
 * Core types for shadow AI detection and event correlation
 */

import { AuditLogEntry } from './audit-log';
import { AIProvider as AutomationAIProvider } from './automation';

/**
 * Processed event after normalization
 */
export interface ProcessedEvent {
  id: string;
  originalEvent: AuditLogEntry;
  platform: string;
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  actorId: string;
  actorType: 'bot' | 'user' | 'system' | 'service_account';
  targetId: string;
  targetType: string;
  organizationId: string;
  connectionId: string;
  metadata: Record<string, any>;
  shadowAIIndicators?: ShadowAIIndicators;
  processed: boolean;
}

/**
 * Shadow AI detection indicators
 */
export interface ShadowAIIndicators {
  rapidFire: boolean;
  nonHumanTiming: boolean;
  repetitivePatterns: boolean;
  aiKeywords: boolean;
  externalConnections: boolean;
  suspiciousActivity: string[];
  confidenceScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Shadow AI detection result
 */
export interface ShadowAIDetectionResult {
  detectionId: string;
  eventIds: string[];
  detectionType: ShadowAIDetectionType;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  indicators: DetectionIndicator[];
  evidence: Evidence[];
  automationType: AutomationCategory;
  aiProvider?: AutomationAIProvider;
  detectedAt: Date;
  organizationId: string;
  platform: string;
  actorId: string;
  metadata: Record<string, any>;
}

/**
 * Types of shadow AI detection
 */
export type ShadowAIDetectionType = 
  | 'rapid_fire_messaging'
  | 'template_responses'
  | 'inhuman_timing'
  | 'ai_keyword_patterns'
  | 'external_api_integration'
  | 'bulk_data_processing'
  | 'cross_platform_automation'
  | 'unauthorized_app_installation'
  | 'permission_escalation'
  | 'suspicious_file_patterns'
  | 'cross_actor_automation'
  | 'coordinated_activity';

/**
 * Automation categories
 */
export type AutomationCategory = 
  | 'chatbot'
  | 'workflow_automation'
  | 'api_integration'
  | 'data_processor'
  | 'custom_app'
  | 'privilege_escalator'
  | 'coordinated_bots'
  | 'bot_network'
  | 'unknown';


/**
 * Detection indicator
 */
export interface DetectionIndicator {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  evidence: string[];
}

/**
 * Evidence for detection
 */
export interface Evidence {
  type: EvidenceType;
  description: string;
  data: any;
  timestamp: Date;
}

/**
 * Types of evidence
 */
export type EvidenceType = 
  | 'timing'
  | 'pattern'
  | 'content'
  | 'metadata'
  | 'correlation'
  | 'data_access'
  | 'app_installation'
  | 'permission_change'
  | 'file_activity'
  | 'cross_actor'
  | 'coordination';

/**
 * Event ingestion configuration
 */
export interface EventIngestionConfig {
  batchSize: number;
  processingInterval: number; // milliseconds
  retentionPeriod: number; // days
  realTimeThreshold: number; // milliseconds for real-time processing
  maxConcurrentProcessors: number;
}

/**
 * Behavioral baseline for anomaly detection
 */
export interface BehavioralBaseline {
  userId: string;
  platform: string;
  averageResponseTime: number; // milliseconds
  messageFrequency: number; // messages per hour
  activeHours: number[]; // hours of day (0-23)
  commonPatterns: string[];
  vocabularyComplexity: number;
  lastUpdated: Date;
}

/**
 * Detection rule configuration
 */
export interface DetectionRule {
  id: string;
  name: string;
  description: string;
  detectionType: ShadowAIDetectionType;
  enabled: boolean;
  confidenceThreshold: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
}

/**
 * Rule condition
 */
export interface RuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'matches';
  value: any;
  weight: number;
}

/**
 * Rule action
 */
export interface RuleAction {
  type: 'alert' | 'block' | 'log' | 'notify';
  parameters: Record<string, any>;
}

/**
 * Cross-platform event for correlation
 */
export interface CrossPlatformEvent extends ProcessedEvent {
  correlationId?: string;
  sourceDetection?: string;
  relatedEvents?: string[];
}

/**
 * Correlation pattern for cross-platform detection
 */
export interface CorrelationPattern {
  id: string;
  name: string;
  description: string;
  platforms: string[];
  timeWindow: number; // milliseconds
  confidence: number;
  indicatorTypes: string[];
  automationChainLength: number;
}

/**
 * Cross-platform correlation result
 */
export interface CorrelationResult {
  correlationId: string;
  pattern: CorrelationPattern;
  events: CrossPlatformEvent[];
  platforms: string[];
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  chainDescription: string;
  detectedAt: Date;
  organizationId: string;
  metadata: {
    totalEvents: number;
    timeSpan: number;
    actorsInvolved: string[];
    platformTransitions: Array<{ from: string; to: string; events: number }>;
    automationIndicators: string[];
  };
}

/**
 * Event processing status
 */
export interface EventProcessingStatus {
  organizationId: string;
  platform: string;
  lastProcessedAt: Date;
  eventsProcessed: number;
  detectionsFound: number;
  averageProcessingTime: number;
  status: 'active' | 'paused' | 'error';
  errorMessage?: string;
}