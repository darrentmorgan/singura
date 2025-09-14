// ============================================================================
// Shared Types for Supabase Edge Functions
// Imports from @saas-xray/shared-types for consistency
// ============================================================================

// Re-export commonly used types for Edge Functions
export type {
  Organization,
  PlatformConnection,
  DiscoveredAutomation,
  RiskAssessment,
  DiscoveryRun,
  AutomationActivity,
  UserFeedback,
  AuditLog,
  OAuthCredentials,
  ExtendedTokenResponse,
  ConnectionResult,
  AutomationEvent,
  PlatformType,
  ConnectionStatus,
  AutomationType,
  AutomationStatus,
  RiskLevel,
  DiscoveryStatus
} from '@saas-xray/shared-types';

// Supabase-specific types
export interface SupabaseResponse<T> {
  data: T | null;
  error: {
    message: string;
    details: string;
    hint: string;
  } | null;
}

export interface EdgeFunctionRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
}

export interface EdgeFunctionResponse<T = any> {
  status: number;
  data?: T;
  error?: string;
  message?: string;
}

// Environment configuration types
export interface EnvironmentConfig {
  supabase_url: string;
  supabase_anon_key: string;
  supabase_service_key: string;
  frontend_url: string;
  environment: 'demo' | 'staging' | 'production' | 'development';
  oauth_config: {
    slack: {
      client_id: string;
      client_secret: string;
      redirect_uri: string;
    };
    google: {
      client_id: string;
      client_secret: string;
      redirect_uri: string;
    };
    microsoft: {
      client_id: string;
      client_secret: string;
      redirect_uri: string;
    };
  };
}

// Database utility types for Edge Functions
export interface DatabaseFilters {
  organization_id?: string;
  platform_type?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

// API response standardization
export interface APISuccess<T = any> {
  success: true;
  data: T;
  timestamp: Date;
}

export interface APIError {
  success: false;
  error: string;
  code: string;
  timestamp: Date;
  details?: any;
}

export type APIResponse<T = any> = APISuccess<T> | APIError;

// Webhook payload types
export interface WebhookPayload {
  event_type: string;
  organization_id: string;
  platform_type: PlatformType;
  data: any;
  timestamp: Date;
}

// Real-time event types
export interface RealtimeEvent {
  type: string;
  payload: any;
  organization_id: string;
  timestamp: Date;
}