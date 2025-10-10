/**
 * Centralized type exports for Singura AI Frontend
 */

export * from './api';
export * from './ui';

// Re-export commonly used types
export type { 
  PlatformType,
  ConnectionStatus,
  AutomationStatus,
  RiskLevel,
  ComplianceStatus,
  PlatformConnection,
  AutomationDiscovery,
  User,
  ApiResponse,
  ApiError
} from './api';

export type {
  LoadingState,
  ErrorState,
  NotificationState,
  FormValidation,
  Theme,
  UIContext
} from './ui';