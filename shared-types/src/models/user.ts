/**
 * User domain model types
 */

/**
 * User role levels with different permissions
 */
export type UserRole = 'admin' | 'manager' | 'analyst' | 'viewer';

/**
 * User status for account management
 */
export type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended';

/**
 * Core User entity
 */
export interface User {
  /** Unique user identifier */
  id: string;
  
  /** User's email address (used for login) */
  email: string;
  
  /** User's full name */
  name: string;
  
  /** User's role within the organization */
  role: UserRole;
  
  /** Account status */
  status: UserStatus;
  
  /** Organization this user belongs to */
  organizationId: string;
  
  /** User preferences and settings */
  preferences: UserPreferences;
  
  /** Last login timestamp */
  lastLoginAt?: Date;
  
  /** Account metadata */
  createdAt: Date;
  updatedAt: Date;
  
  /** Optional avatar URL */
  avatarUrl?: string;
  
  /** Two-factor authentication enabled */
  twoFactorEnabled: boolean;
}

/**
 * User preferences and UI settings
 */
export interface UserPreferences {
  /** Dashboard configuration */
  dashboard: {
    /** Preferred view mode */
    viewMode: 'grid' | 'list' | 'cards';
    
    /** Default time range for charts */
    defaultTimeRange: '24h' | '7d' | '30d' | '90d';
    
    /** Show/hide specific widgets */
    hiddenWidgets: string[];
  };
  
  /** Notification preferences */
  notifications: {
    /** Email notifications */
    email: {
      riskAlerts: boolean;
      weeklyReport: boolean;
      newAutomations: boolean;
      systemUpdates: boolean;
    };
    
    /** In-app notifications */
    inApp: {
      riskAlerts: boolean;
      newAutomations: boolean;
      systemUpdates: boolean;
    };
  };
  
  /** UI preferences */
  ui: {
    theme: 'light' | 'dark' | 'auto';
    timezone: string;
    dateFormat: 'US' | 'EU' | 'ISO';
  };
}

/**
 * User permissions based on role
 */
export interface UserPermissions {
  /** Can view dashboards and reports */
  canView: boolean;
  
  /** Can manage platform connections */
  canManageConnections: boolean;
  
  /** Can configure organization settings */
  canConfigureOrg: boolean;
  
  /** Can manage other users */
  canManageUsers: boolean;
  
  /** Can access API endpoints */
  canAccessAPI: boolean;
  
  /** Can export data */
  canExportData: boolean;
  
  /** Can create custom rules */
  canCreateRules: boolean;
  
  /** Can view audit logs */
  canViewAuditLogs: boolean;
}


/**
 * User invitation for new users
 */
export interface UserInvitation {
  /** Invitation ID */
  id: string;
  
  /** Email address to invite */
  email: string;
  
  /** Role to assign when accepted */
  role: UserRole;
  
  /** Organization ID */
  organizationId: string;
  
  /** User who sent the invitation */
  invitedBy: string;
  
  /** Invitation token (for verification) */
  token: string;
  
  /** Invitation status */
  status: 'pending' | 'accepted' | 'expired';
  
  /** Expiration date */
  expiresAt: Date;
  
  /** Creation date */
  createdAt: Date;
}

/**
 * User authentication session
 */
export interface UserSession {
  /** Session ID */
  sessionId: string;
  
  /** User ID */
  userId: string;
  
  /** Organization ID */
  organizationId: string;
  
  /** Session creation time */
  createdAt: Date;
  
  /** Session expiration time */
  expiresAt: Date;
  
  /** Last activity timestamp */
  lastActivityAt: Date;
  
  /** IP address */
  ipAddress: string;
  
  /** User agent string */
  userAgent: string;
  
  /** Device information */
  device?: {
    type: 'desktop' | 'mobile' | 'tablet';
    os: string;
    browser: string;
  };
}

/**
 * User activity log entry
 */
export interface UserActivity {
  /** Activity ID */
  id: string;
  
  /** User who performed the action */
  userId: string;
  
  /** Action performed */
  action: string;
  
  /** Resource affected */
  resource: string;
  
  /** Resource ID */
  resourceId: string;
  
  /** Activity timestamp */
  timestamp: Date;
  
  /** IP address */
  ipAddress: string;
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  
  /** Success or failure */
  success: boolean;
  
  /** Error message if failed */
  error?: string;
}