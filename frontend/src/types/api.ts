/**
 * API Interface Types for Singura AI Frontend
 * These types match the backend API contracts
 */

// Base types
export type PlatformType = 'slack' | 'google' | 'microsoft' | 'hubspot' | 'salesforce' | 'notion' | 'asana' | 'jira';
export type ConnectionStatus = 'active' | 'inactive' | 'error' | 'expired' | 'pending';
export type AutomationStatus = 'active' | 'inactive' | 'error' | 'unknown';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical' | 'unknown';
export type ComplianceStatus = 'compliant' | 'non_compliant' | 'unknown';

// Authentication Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  tokenType?: string;
  user: {
    id: string;
    organizationId?: string;
    email?: string;
    name?: string;
    permissions?: string[];
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  tokenType?: string;
}

export interface User {
  id: string;
  organizationId?: string;
  email?: string;
  name?: string;
  permissions?: string[];
}

// OAuth Types
export interface OAuthInitiateResponse {
  success: boolean;
  authorizationUrl: string;
  state: string;
}

export interface OAuthCallbackResponse {
  success: boolean;
  connection: PlatformConnection;
}

// Platform Connection Types
export interface PlatformConnection {
  id: string;
  organization_id: string;
  platform_type: PlatformType;
  status: ConnectionStatus;
  display_name: string;
  created_at: string;
  updated_at: string;
  last_sync_at?: string;
  error_message?: string;
  credentials?: EncryptedCredential[];
  metadata?: Record<string, unknown>;
}

export interface EncryptedCredential {
  id: string;
  credential_type: string;
  expires_at?: string;
  encryption_key_id: string;
}

export interface ConnectionsListResponse {
  success: boolean;
  connections: PlatformConnection[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ConnectionDetailResponse {
  success: boolean;
  connection: PlatformConnection;
}

export interface ConnectionStatsResponse {
  success: boolean;
  stats: {
    total: number;
    active: number;
    inactive: number;
    error: number;
    byPlatform: Record<PlatformType, number>;
  };
}

// Automation Discovery Types
export interface AutomationDiscovery {
  id: string;
  name: string;
  type: 'bot' | 'workflow' | 'integration' | 'webhook' | 'app';
  platform: PlatformType;
  connectionId: string; // Platform connection ID this automation belongs to
  status: AutomationStatus;
  description?: string;
  createdBy?: string;
  createdAt?: string;
  lastTriggered?: string;
  permissions?: string[];
  riskLevel: RiskLevel;
  riskScore: number;
  discoveredAt: string;
  metadata?: {
    isInternal?: boolean;
    version?: string;
    triggers?: string[];
    actions?: string[];
    [key: string]: unknown;
  };
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  details?: Record<string, unknown>;
}

export interface PermissionCheck {
  isValid: boolean;
  errors: string[];
  missingPermissions: string[];
  grantedPermissions: string[];
}

export interface DiscoveryResult {
  platform: PlatformType;
  connectionId: string;
  automations: AutomationDiscovery[];
  auditLogs: AuditLogEntry[];
  permissionCheck: PermissionCheck;
  discoveredAt: string;
  errors: string[];
  warnings: string[];
  metadata: {
    executionTimeMs: number;
    automationsFound: number;
    auditLogsFound: number;
    riskScore: number;
    complianceStatus: ComplianceStatus;
  };
}

export interface DiscoveryResponse {
  success: boolean;
  discovery: DiscoveryResult;
  message: string;
}

// Automation Enriched Metadata Types
export interface OAuthContext {
  scopes: string[];
  scopeCount: number;
  authorizedBy?: string;
  clientId?: string;
  firstAuthorization?: string;
  lastActivity?: string;
  authorizationAge?: number;
}

export interface DetectionPattern {
  description: string;
  eventCount: number;
  timeWindowMs: number;
  confidence: number;
  supportingEvents?: string[];
}

export interface AIPlatformDetection {
  name: string;
  confidence: number;
  endpoints?: string[];
}

export interface DetectionEvidence {
  method: string;
  confidence: number;
  lastUpdated?: string;
  patterns: DetectionPattern[];
  aiPlatforms?: AIPlatformDetection[];
}

export interface TechnicalDetails {
  scriptId?: string;
  fileId?: string;
  driveFileId?: string;
  driveLocation?: string;
  mimeType?: string;
  parentType?: string;
  owners?: string[];
  shared?: boolean;
  functions?: string[];
  triggers?: string[];
  description?: string;
}

export interface EnrichedMetadata {
  oauth_context: OAuthContext | null;
  detection_evidence: DetectionEvidence | null;
  technical_details: TechnicalDetails | null;
}

// Validation Types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  missingPermissions: string[];
  message?: string;
}

export interface ValidationResponse {
  success: boolean;
  validation: ValidationResult;
  message: string;
}

// Error Types
export interface ApiError {
  error: string;
  code: string;
  message?: string;
  details?: Record<string, unknown>;
}

// Request/Response wrapper types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

// Filter and pagination types
export interface ConnectionFilters {
  platform?: PlatformType;
  status?: ConnectionStatus;
  page?: number;
  limit?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

// WebSocket Types
export interface WebSocketMessage<T = unknown> {
  type: string;
  payload: T;
  timestamp: string;
}

export interface ConnectionStatusUpdate {
  connectionId: string;
  status: ConnectionStatus;
  error?: string;
  lastSync?: string;
}

export interface DiscoveryProgress {
  connectionId: string;
  stage: 'started' | 'authenticating' | 'discovering' | 'analyzing' | 'completed' | 'failed';
  progress: number;
  message?: string;
}

// Security and Compliance Types
export interface SecurityMetrics {
  authenticationEvents: number;
  failedLogins: number;
  activeConnections: number;
  riskScore: number;
  complianceViolations: number;
}

export interface ComplianceReport {
  reportType: 'soc2' | 'gdpr' | 'owasp';
  generatedAt: string;
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalConnections: number;
    compliantConnections: number;
    violations: number;
  };
  details: Record<string, unknown>;
}