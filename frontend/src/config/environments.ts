// ============================================================================
// Environment Configuration for Multi-Environment Deployment
// Provides environment-specific settings for demo, staging, and production
// ============================================================================

export type Environment = 'development' | 'demo' | 'staging' | 'production';

export interface EnvironmentConfig {
  // Environment identification
  environment: Environment;
  isDevelopment: boolean;
  isDemo: boolean;
  isStaging: boolean;
  isProduction: boolean;

  // API Configuration
  apiUrl: string;
  wsUrl: string;
  frontendUrl: string;

  // Supabase Configuration
  supabase: {
    url: string;
    anonKey: string;
  };

  // Feature Flags
  features: {
    realTimeUpdates: boolean;
    gpt5Validation: boolean;
    crossPlatformCorrelation: boolean;
    pdfReports: boolean;
    auditLogging: boolean;
    advancedRiskScoring: boolean;
    complianceReporting: boolean;
    enterpriseSSO: boolean;
    customBranding: boolean;
    bulkOperations: boolean;
    dataExport: boolean;
  };

  // Demo-specific settings
  demo?: {
    companyName: string;
    workspaceCount: number;
    automationCount: number;
    riskScore: number;
    dataRefreshInterval: number;
    autoReset: boolean;
  };

  // Beta-specific settings
  beta?: {
    feedbackWidget: boolean;
    usageAnalytics: boolean;
    errorReporting: boolean;
  };

  // Performance settings
  performance: {
    apiTimeout: number;
    wsTimeout: number;
    enablePerformanceMonitoring: boolean;
  };

  // Analytics
  analytics?: {
    vercelAnalyticsId?: string;
    sentryDsn?: string;
  };
}

// ============================================================================
// Environment-Specific Configurations
// ============================================================================

const developmentConfig: EnvironmentConfig = {
  environment: 'development',
  isDevelopment: true,
  isDemo: false,
  isStaging: false,
  isProduction: false,

  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:4201/api',
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:4201',
  frontendUrl: import.meta.env.VITE_FRONTEND_URL || 'http://localhost:3000',

  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },

  features: {
    realTimeUpdates: true,
    gpt5Validation: true,
    crossPlatformCorrelation: true,
    pdfReports: true,
    auditLogging: true,
    advancedRiskScoring: true,
    complianceReporting: true,
    enterpriseSSO: false,
    customBranding: false,
    bulkOperations: true,
    dataExport: true,
  },

  performance: {
    apiTimeout: 10000,
    wsTimeout: 5000,
    enablePerformanceMonitoring: false,
  },
};

const demoConfig: EnvironmentConfig = {
  environment: 'demo',
  isDevelopment: false,
  isDemo: true,
  isStaging: false,
  isProduction: false,

  apiUrl: import.meta.env.VITE_API_URL || 'https://demo.saasxray.com/api',
  wsUrl: import.meta.env.VITE_WS_URL || 'wss://demo.saasxray.com/ws',
  frontendUrl: import.meta.env.VITE_FRONTEND_URL || 'https://demo.saasxray.com',

  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },

  features: {
    realTimeUpdates: true,
    gpt5Validation: true,
    crossPlatformCorrelation: true,
    pdfReports: true,
    auditLogging: true,
    advancedRiskScoring: true,
    complianceReporting: true,
    enterpriseSSO: false,
    customBranding: false,
    bulkOperations: false,
    dataExport: false,
  },

  demo: {
    companyName: import.meta.env.VITE_DEMO_COMPANY_NAME || 'Acme Corporation',
    workspaceCount: parseInt(import.meta.env.VITE_DEMO_WORKSPACE_COUNT || '3'),
    automationCount: parseInt(import.meta.env.VITE_DEMO_AUTOMATION_COUNT || '47'),
    riskScore: parseInt(import.meta.env.VITE_DEMO_RISK_SCORE || '73'),
    dataRefreshInterval: parseInt(import.meta.env.VITE_DEMO_DATA_REFRESH_INTERVAL || '3600'),
    autoReset: import.meta.env.VITE_DEMO_AUTO_RESET === 'true',
  },

  performance: {
    apiTimeout: 10000,
    wsTimeout: 5000,
    enablePerformanceMonitoring: true,
  },

  analytics: {
    vercelAnalyticsId: import.meta.env.VITE_VERCEL_ANALYTICS_ID,
    sentryDsn: import.meta.env.VITE_SENTRY_DSN,
  },
};

const stagingConfig: EnvironmentConfig = {
  environment: 'staging',
  isDevelopment: false,
  isDemo: false,
  isStaging: true,
  isProduction: false,

  apiUrl: import.meta.env.VITE_API_URL || 'https://staging.saasxray.com/api',
  wsUrl: import.meta.env.VITE_WS_URL || 'wss://staging.saasxray.com/ws',
  frontendUrl: import.meta.env.VITE_FRONTEND_URL || 'https://staging.saasxray.com',

  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },

  features: {
    realTimeUpdates: true,
    gpt5Validation: true,
    crossPlatformCorrelation: true,
    pdfReports: true,
    auditLogging: true,
    advancedRiskScoring: true,
    complianceReporting: true,
    enterpriseSSO: false,
    customBranding: false,
    bulkOperations: true,
    dataExport: true,
  },

  beta: {
    feedbackWidget: true,
    usageAnalytics: true,
    errorReporting: true,
  },

  performance: {
    apiTimeout: 15000,
    wsTimeout: 10000,
    enablePerformanceMonitoring: true,
  },

  analytics: {
    vercelAnalyticsId: import.meta.env.VITE_VERCEL_ANALYTICS_ID,
    sentryDsn: import.meta.env.VITE_SENTRY_DSN,
  },
};

const productionConfig: EnvironmentConfig = {
  environment: 'production',
  isDevelopment: false,
  isDemo: false,
  isStaging: false,
  isProduction: true,

  apiUrl: import.meta.env.VITE_API_URL || 'https://app.saasxray.com/api',
  wsUrl: import.meta.env.VITE_WS_URL || 'wss://app.saasxray.com/ws',
  frontendUrl: import.meta.env.VITE_FRONTEND_URL || 'https://app.saasxray.com',

  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },

  features: {
    realTimeUpdates: true,
    gpt5Validation: true,
    crossPlatformCorrelation: true,
    pdfReports: true,
    auditLogging: true,
    advancedRiskScoring: true,
    complianceReporting: true,
    enterpriseSSO: true,
    customBranding: true,
    bulkOperations: true,
    dataExport: true,
  },

  performance: {
    apiTimeout: 30000,
    wsTimeout: 15000,
    enablePerformanceMonitoring: true,
  },

  analytics: {
    vercelAnalyticsId: import.meta.env.VITE_VERCEL_ANALYTICS_ID,
    sentryDsn: import.meta.env.VITE_SENTRY_DSN,
  },
};

// ============================================================================
// Environment Configuration Selector
// ============================================================================

export function getEnvironmentConfig(): EnvironmentConfig {
  const environment = (import.meta.env.VITE_ENVIRONMENT as Environment) || 'development';

  switch (environment) {
    case 'demo':
      return demoConfig;
    case 'staging':
      return stagingConfig;
    case 'production':
      return productionConfig;
    default:
      return developmentConfig;
  }
}

// ============================================================================
// Environment Utilities
// ============================================================================

export const config = getEnvironmentConfig();

export function isFeatureEnabled(feature: keyof EnvironmentConfig['features']): boolean {
  return config.features[feature] === true;
}

export function getEnvironmentName(): Environment {
  return config.environment;
}

export function getEnvironmentDisplay(): string {
  switch (config.environment) {
    case 'demo':
      return 'Demo';
    case 'staging':
      return 'Staging';
    case 'production':
      return 'Production';
    default:
      return 'Development';
  }
}

export function shouldShowEnvironmentBadge(): boolean {
  return config.environment !== 'production';
}

export function getEnvironmentBadgeColor(): string {
  switch (config.environment) {
    case 'demo':
      return 'bg-blue-500';
    case 'staging':
      return 'bg-yellow-500';
    case 'production':
      return 'bg-green-500';
    default:
      return 'bg-gray-500';
  }
}

// ============================================================================
// API Configuration Helpers
// ============================================================================

export function getApiUrl(path: string = ''): string {
  const baseUrl = config.apiUrl.replace(/\/$/, ''); // Remove trailing slash
  const cleanPath = path.replace(/^\//, ''); // Remove leading slash
  return cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl;
}

export function getWebSocketUrl(): string {
  return config.wsUrl;
}

// ============================================================================
// Supabase Configuration
// ============================================================================

export function getSupabaseConfig() {
  return config.supabase;
}

// ============================================================================
// Export current configuration
// ============================================================================

export default config;