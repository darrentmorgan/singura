/**
 * Organization domain model types
 */

/**
 * Organization tier levels with feature access
 */
export type OrganizationTier = 'free' | 'starter' | 'professional' | 'enterprise';

/**
 * Organization subscription status
 */
export type SubscriptionStatus = 'active' | 'inactive' | 'trial' | 'cancelled' | 'past_due';

/**
 * Core Organization entity
 */
export interface Organization {
  /** Unique organization identifier */
  id: string;
  
  /** Organization display name */
  name: string;
  
  /** Organization domain (for email validation) */
  domain?: string;
  
  /** Current subscription tier */
  tier: OrganizationTier;
  
  /** Subscription status */
  status: SubscriptionStatus;
  
  /** Maximum number of users allowed */
  maxUsers: number;
  
  /** Maximum number of platform connections allowed */
  maxConnections: number;
  
  /** Organization settings */
  settings: OrganizationSettings;
  
  /** Metadata */
  createdAt: Date;
  updatedAt: Date;
  
  /** Optional billing information */
  billing?: BillingInfo;
}

/**
 * Organization-level settings and preferences
 */
export interface OrganizationSettings {
  /** Risk scoring configuration */
  riskThresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  
  /** Notification preferences */
  notifications: {
    email: boolean;
    slack: boolean;
    webhook?: string;
  };
  
  /** Automation discovery settings */
  discovery: {
    /** Enable automatic discovery */
    enabled: boolean;
    
    /** Discovery frequency in hours */
    frequencyHours: number;
    
    /** Platforms to monitor */
    enabledPlatforms: string[];
  };
  
  /** Data retention policy */
  retention: {
    /** Audit log retention in days */
    auditLogDays: number;
    
    /** Automation history retention in days */
    automationHistoryDays: number;
  };
  
  /** Compliance settings */
  compliance: {
    gdprEnabled: boolean;
    soc2Enabled: boolean;
    customRequirements: string[];
  };
}

/**
 * Billing information for organizations
 */
export interface BillingInfo {
  /** Stripe customer ID or similar */
  customerId: string;
  
  /** Current subscription ID */
  subscriptionId?: string;
  
  /** Billing email */
  billingEmail: string;
  
  /** Payment method information */
  paymentMethod?: {
    type: 'card' | 'bank' | 'invoice';
    last4?: string;
    expiryDate?: string;
  };
  
  /** Next billing date */
  nextBillingDate?: Date;
  
  /** Monthly cost in cents */
  monthlyCost: number;
}


/**
 * Organization usage statistics
 */
export interface OrganizationUsage {
  /** Current user count */
  currentUsers: number;
  
  /** Current connection count */
  currentConnections: number;
  
  /** Automations discovered this month */
  automationsDiscovered: number;
  
  /** API calls this month */
  apiCalls: number;
  
  /** Storage usage in MB */
  storageUsageMB: number;
}

/**
 * Feature flags for organization tiers
 */
export interface OrganizationFeatures {
  /** Maximum platforms that can be connected */
  maxPlatforms: number;
  
  /** Real-time monitoring enabled */
  realTimeMonitoring: boolean;
  
  /** Advanced risk analytics */
  advancedAnalytics: boolean;
  
  /** Custom detection rules */
  customRules: boolean;
  
  /** API access */
  apiAccess: boolean;
  
  /** SSO integration */
  ssoIntegration: boolean;
  
  /** Custom compliance reporting */
  customReports: boolean;
  
  /** White-label branding */
  whiteLabel: boolean;
}