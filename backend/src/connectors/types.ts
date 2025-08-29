/**
 * Platform Connector Interface Types
 * Defines the contract for all SaaS platform connectors
 */

export interface OAuthCredentials {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt?: Date;
  scope?: string;
}

export interface ConnectionResult {
  success: boolean;
  platformUserId?: string;
  platformWorkspaceId?: string;
  displayName?: string;
  permissions?: string[];
  metadata?: Record<string, any>;
  error?: string;
  errorCode?: string;
}

export interface AutomationEvent {
  id: string;
  name: string;
  type: 'workflow' | 'bot' | 'integration' | 'webhook' | 'scheduled_task' | 'trigger';
  platform: 'slack' | 'google' | 'microsoft' | 'hubspot' | 'salesforce' | 'notion' | 'asana' | 'jira';
  status: 'active' | 'inactive' | 'paused' | 'error';
  trigger: string;
  actions: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  lastTriggered: Date | null;
  lastModified?: Date;
  owner?: {
    id: string;
    name: string;
    email?: string;
  };
  description?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  permissions?: string[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  actorId: string;
  actorType: 'user' | 'system' | 'service_account' | 'bot';
  actionType: string;
  resourceType: string;
  resourceId: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  outcome?: 'success' | 'failure' | 'partial';
}

export interface PermissionCheck {
  isValid: boolean;
  permissions: string[];
  missingPermissions: string[];
  errors: string[];
  lastChecked: Date;
  metadata?: Record<string, any>;
}

/**
 * Platform Connector Interface
 * All platform connectors must implement this interface
 */
export interface PlatformConnector {
  platform: 'slack' | 'google' | 'microsoft' | 'hubspot' | 'salesforce' | 'notion' | 'asana' | 'jira';

  /**
   * Authenticate with the platform using OAuth credentials
   */
  authenticate(credentials: OAuthCredentials): Promise<ConnectionResult>;

  /**
   * Discover automations, bots, and integrations in the platform
   */
  discoverAutomations(): Promise<AutomationEvent[]>;

  /**
   * Get audit logs from the platform (if available)
   */
  getAuditLogs(since: Date): Promise<AuditLogEntry[]>;

  /**
   * Validate current permissions and connection health
   */
  validatePermissions(): Promise<PermissionCheck>;
}

/**
 * Platform Discovery Result
 * Results from platform automation discovery
 */
export interface DiscoveryResult {
  platform: string;
  connectionId: string;
  automations: AutomationEvent[];
  auditLogs: AuditLogEntry[];
  permissionCheck: PermissionCheck;
  discoveredAt: Date;
  errors: string[];
  warnings: string[];
  metadata: {
    executionTimeMs: number;
    automationsFound: number;
    auditLogsFound: number;
    riskScore: number;
    complianceStatus: 'compliant' | 'non_compliant' | 'unknown';
  };
}

/**
 * Automation Risk Assessment
 */
export interface RiskAssessment {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-100
  riskFactors: string[];
  recommendations: string[];
  complianceIssues: string[];
  securityConcerns: string[];
}

/**
 * Platform Integration Status
 */
export interface IntegrationStatus {
  platform: string;
  connectionId: string;
  status: 'connected' | 'disconnected' | 'error' | 'expired';
  lastSync: Date | null;
  nextSync: Date | null;
  errors: string[];
  warnings: string[];
  metadata: Record<string, any>;
}

/**
 * Cross-Platform Integration Detection
 */
export interface CrossPlatformIntegration {
  id: string;
  name: string;
  platforms: string[];
  integrationType: 'data_sync' | 'workflow' | 'authentication' | 'reporting' | 'other';
  dataFlow: {
    source: string;
    destination: string;
    dataTypes: string[];
  }[];
  riskAssessment: RiskAssessment;
  lastDetected: Date;
  confidence: number; // 0-100
}

/**
 * Compliance Framework Mapping
 */
export interface ComplianceMapping {
  framework: 'SOC2' | 'GDPR' | 'HIPAA' | 'PCI_DSS' | 'ISO27001';
  requirements: {
    id: string;
    description: string;
    status: 'compliant' | 'non_compliant' | 'unknown';
    evidence: string[];
    gaps: string[];
  }[];
  overallStatus: 'compliant' | 'non_compliant' | 'partially_compliant';
  lastAssessed: Date;
}

/**
 * Automation Network Graph
 */
export interface AutomationNetwork {
  nodes: {
    id: string;
    type: 'platform' | 'automation' | 'user' | 'data';
    platform?: string;
    metadata: Record<string, any>;
  }[];
  edges: {
    source: string;
    target: string;
    type: 'triggers' | 'accesses' | 'modifies' | 'depends_on';
    weight: number;
    metadata: Record<string, any>;
  }[];
  clusters: {
    id: string;
    nodes: string[];
    type: 'workflow_group' | 'platform_ecosystem' | 'user_group';
    riskLevel: 'low' | 'medium' | 'high';
  }[];
}

/**
 * Platform Metrics and Analytics
 */
export interface PlatformMetrics {
  platform: string;
  timeframe: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalAutomations: number;
    activeAutomations: number;
    failedAutomations: number;
    totalTriggers: number;
    uniqueUsers: number;
    dataVolume: number; // bytes
    apiCalls: number;
    errorRate: number; // 0-100
    performanceScore: number; // 0-100
  };
  trends: {
    automationGrowth: number; // percentage
    errorTrend: 'increasing' | 'decreasing' | 'stable';
    usageTrend: 'increasing' | 'decreasing' | 'stable';
    riskTrend: 'increasing' | 'decreasing' | 'stable';
  };
}

/**
 * Data Lineage Tracking
 */
export interface DataLineage {
  dataElement: {
    id: string;
    name: string;
    type: string;
    classification: 'public' | 'internal' | 'confidential' | 'restricted';
  };
  sources: {
    platform: string;
    system: string;
    lastUpdated: Date;
  }[];
  transformations: {
    id: string;
    type: string;
    description: string;
    platform: string;
    timestamp: Date;
  }[];
  destinations: {
    platform: string;
    system: string;
    purpose: string;
    lastAccessed: Date;
  }[];
  complianceRequirements: string[];
  retentionPolicies: {
    platform: string;
    retentionPeriod: number; // days
    autoDelete: boolean;
  }[];
}