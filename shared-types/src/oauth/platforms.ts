/**
 * Platform-specific OAuth configurations and types
 * OAuth specifications for each supported SaaS platform
 */

import { OAuthCredentials } from './credentials';
import { PlatformOAuthConfig } from './flows';

/**
 * Slack OAuth configuration and types
 */
export interface SlackOAuthConfig extends PlatformOAuthConfig {
  platform: 'slack';
  
  /** Slack-specific endpoints */
  authorizationEndpoint: 'https://slack.com/oauth/v2/authorize';
  tokenEndpoint: 'https://slack.com/api/oauth.v2.access';
  userInfoEndpoint: 'https://slack.com/api/users.identity';
  revocationEndpoint: 'https://slack.com/api/auth.revoke';
  
  /** Slack OAuth scopes */
  supportedScopes: [
    'channels:read',
    'groups:read', 
    'users:read',
    'team:read',
    'bots:read',
    'apps:read',
    'admin.apps:read',
    'admin.users:read',
    'admin.teams:read'
  ];
  
  /** Slack-specific parameters */
  additionalAuthParams: {
    user_scope?: string;
    granular_bot_scope?: string;
  };
}

export interface SlackOAuthCredentials extends OAuthCredentials {
  /** Slack team ID */
  platformWorkspaceId: string;
  
  /** Slack user ID */
  platformUserId: string;
  
  /** Slack-specific data */
  platformData: {
    teamName: string;
    teamDomain: string;
    botUserId?: string;
    appId: string;
    enterpriseId?: string;
  };
}

/**
 * Google Workspace OAuth configuration and types
 */
export interface GoogleOAuthConfig extends PlatformOAuthConfig {
  platform: 'google';
  
  /** Google OAuth endpoints */
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth';
  tokenEndpoint: 'https://oauth2.googleapis.com/token';
  userInfoEndpoint: 'https://www.googleapis.com/oauth2/v2/userinfo';
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke';
  
  /** Google OAuth scopes */
  supportedScopes: [
    'https://www.googleapis.com/auth/admin.directory.user.readonly',
    'https://www.googleapis.com/auth/admin.directory.group.readonly',
    'https://www.googleapis.com/auth/admin.reports.audit.readonly',
    'https://www.googleapis.com/auth/admin.reports.usage.readonly',
    'https://www.googleapis.com/auth/script.projects.readonly',
    'https://www.googleapis.com/auth/drive.metadata.readonly',
    'https://www.googleapis.com/auth/admin.directory.domain.readonly'
  ];
  
  /** Google-specific parameters */
  additionalAuthParams: {
    access_type: 'offline';
    prompt?: 'consent' | 'select_account';
    include_granted_scopes?: 'true';
    hd?: string; // Hosted domain
  };
}

export interface GoogleOAuthCredentials extends OAuthCredentials {
  /** Google customer ID */
  platformWorkspaceId: string;
  
  /** Google user ID */
  platformUserId: string;
  
  /** Google-specific data */
  platformData: {
    email: string;
    domain: string;
    customerId: string;
    orgUnitPath?: string;
    adminUser: boolean;
  };
}

/**
 * Microsoft 365 OAuth configuration and types
 */
export interface MicrosoftOAuthConfig extends PlatformOAuthConfig {
  platform: 'microsoft';
  
  /** Microsoft OAuth endpoints */
  authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
  tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
  userInfoEndpoint: 'https://graph.microsoft.com/v1.0/me';
  
  /** Microsoft Graph scopes */
  supportedScopes: [
    'https://graph.microsoft.com/User.Read',
    'https://graph.microsoft.com/Directory.Read.All',
    'https://graph.microsoft.com/AuditLog.Read.All',
    'https://graph.microsoft.com/Application.Read.All',
    'https://graph.microsoft.com/Organization.Read.All',
    'https://graph.microsoft.com/Reports.Read.All'
  ];
  
  /** Microsoft-specific parameters */
  additionalAuthParams: {
    tenant?: string;
    prompt?: 'consent' | 'select_account' | 'login';
    domain_hint?: string;
  };
}

export interface MicrosoftOAuthCredentials extends OAuthCredentials {
  /** Microsoft tenant ID */
  platformWorkspaceId: string;
  
  /** Microsoft user ID */
  platformUserId: string;
  
  /** Microsoft-specific data */
  platformData: {
    tenantId: string;
    principalName: string;
    tenantName: string;
    isAdmin: boolean;
    objectId: string;
  };
}

/**
 * GitHub OAuth configuration and types
 */
export interface GitHubOAuthConfig extends PlatformOAuthConfig {
  platform: 'github';
  
  /** GitHub OAuth endpoints */
  authorizationEndpoint: 'https://github.com/login/oauth/authorize';
  tokenEndpoint: 'https://github.com/login/oauth/access_token';
  userInfoEndpoint: 'https://api.github.com/user';
  revocationEndpoint: 'https://api.github.com/applications/{client_id}/token';
  
  /** GitHub OAuth scopes */
  supportedScopes: [
    'repo',
    'read:org',
    'read:user',
    'user:email',
    'admin:org',
    'read:audit_log'
  ];
}

export interface GitHubOAuthCredentials extends OAuthCredentials {
  /** GitHub organization ID */
  platformWorkspaceId?: string;
  
  /** GitHub user ID */
  platformUserId: string;
  
  /** GitHub-specific data */
  platformData: {
    login: string;
    nodeId: string;
    organizationLogin?: string;
    isOrgAdmin: boolean;
    publicRepos: number;
    privateRepos: number;
  };
}

/**
 * Atlassian OAuth configuration and types
 */
export interface AtlassianOAuthConfig extends PlatformOAuthConfig {
  platform: 'atlassian';
  
  /** Atlassian OAuth endpoints */
  authorizationEndpoint: 'https://auth.atlassian.com/authorize';
  tokenEndpoint: 'https://auth.atlassian.com/oauth/token';
  userInfoEndpoint: 'https://api.atlassian.com/me';
  
  /** Atlassian OAuth scopes */
  supportedScopes: [
    'read:jira-work',
    'read:jira-user',
    'manage:jira-project',
    'read:confluence-space.summary',
    'read:confluence-content-details'
  ];
  
  /** Atlassian-specific parameters */
  additionalAuthParams: {
    audience: 'api.atlassian.com';
    prompt?: 'consent';
  };
}

export interface AtlassianOAuthCredentials extends OAuthCredentials {
  /** Atlassian cloud ID */
  platformWorkspaceId: string;
  
  /** Atlassian account ID */
  platformUserId: string;
  
  /** Atlassian-specific data */
  platformData: {
    cloudId: string;
    siteName: string;
    siteUrl: string;
    products: string[];
    accountType: 'atlassian' | 'customer';
  };
}

/**
 * Notion OAuth configuration and types
 */
export interface NotionOAuthConfig extends PlatformOAuthConfig {
  platform: 'notion';
  
  /** Notion OAuth endpoints */
  authorizationEndpoint: 'https://api.notion.com/v1/oauth/authorize';
  tokenEndpoint: 'https://api.notion.com/v1/oauth/token';
  
  /** Notion OAuth scopes (Note: Notion uses capabilities instead) */
  supportedScopes: [];
  
  /** Notion-specific parameters */
  additionalAuthParams: {
    owner: 'user' | 'workspace';
  };
}

export interface NotionOAuthCredentials extends OAuthCredentials {
  /** Notion workspace ID */
  platformWorkspaceId: string;
  
  /** Notion user/bot ID */
  platformUserId: string;
  
  /** Notion-specific data */
  platformData: {
    workspaceName: string;
    workspaceIcon?: string;
    botId: string;
    owner: {
      type: 'user' | 'workspace';
      user?: {
        id: string;
        name: string;
        avatarUrl?: string;
        type: 'person' | 'bot';
      };
    };
    duplicatedTemplateId?: string;
  };
}

/**
 * Platform OAuth configuration registry
 */
export const PLATFORM_OAUTH_CONFIGS: Record<string, PlatformOAuthConfig> = {
  slack: {
    platform: 'slack',
    authorizationEndpoint: 'https://slack.com/oauth/v2/authorize',
    tokenEndpoint: 'https://slack.com/api/oauth.v2.access',
    userInfoEndpoint: 'https://slack.com/api/users.identity',
    revocationEndpoint: 'https://slack.com/api/auth.revoke',
    supportedScopes: [
      'channels:read', 'groups:read', 'users:read', 'team:read', 
      'bots:read', 'apps:read', 'admin.apps:read', 'admin.users:read'
    ],
    requiredScopes: ['channels:read', 'users:read', 'team:read'],
    pkceSupport: false,
    additionalAuthParams: {},
    tokenRefresh: {
      supported: false,
      bufferSeconds: 300
    },
    validation: {
      validateState: true
    }
  },
  
  google: {
    platform: 'google',
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    userInfoEndpoint: 'https://www.googleapis.com/oauth2/v2/userinfo',
    revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
    supportedScopes: [
      'https://www.googleapis.com/auth/admin.directory.user.readonly',
      'https://www.googleapis.com/auth/admin.reports.audit.readonly',
      'https://www.googleapis.com/auth/script.projects.readonly'
    ],
    requiredScopes: [
      'https://www.googleapis.com/auth/admin.directory.user.readonly'
    ],
    pkceSupport: true,
    additionalAuthParams: {
      access_type: 'offline',
      prompt: 'consent'
    },
    tokenRefresh: {
      supported: true,
      endpoint: 'https://oauth2.googleapis.com/token',
      bufferSeconds: 300
    },
    validation: {
      validateState: true
    }
  },
  
  microsoft: {
    platform: 'microsoft',
    authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoEndpoint: 'https://graph.microsoft.com/v1.0/me',
    supportedScopes: [
      'https://graph.microsoft.com/User.Read',
      'https://graph.microsoft.com/Directory.Read.All',
      'https://graph.microsoft.com/AuditLog.Read.All'
    ],
    requiredScopes: [
      'https://graph.microsoft.com/User.Read'
    ],
    pkceSupport: true,
    additionalAuthParams: {
      prompt: 'consent'
    },
    tokenRefresh: {
      supported: true,
      endpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      bufferSeconds: 300
    },
    validation: {
      validateState: true
    }
  }
};

/**
 * Platform-specific credential validator
 */
export interface PlatformCredentialValidator {
  /**
   * Validate platform-specific credential structure
   */
  validateCredentials(credentials: OAuthCredentials): Promise<boolean>;
  
  /**
   * Extract platform-specific user info
   */
  extractUserInfo(credentials: OAuthCredentials): Promise<Record<string, unknown>>;
  
  /**
   * Validate token with platform API
   */
  validateWithPlatform(credentials: OAuthCredentials): Promise<boolean>;
  
  /**
   * Get platform-specific permissions
   */
  getPermissions(credentials: OAuthCredentials): Promise<string[]>;
}

/**
 * Platform OAuth error mapping
 */
export interface PlatformOAuthError {
  platform: string;
  platformError: {
    code: string;
    message: string;
    description?: string;
  };
  mappedError: {
    code: string;
    message: string;
    category: 'auth_error' | 'permission_error' | 'rate_limit' | 'server_error';
    retryable: boolean;
  };
}

/**
 * Platform capability matrix
 */
export interface PlatformCapabilities {
  platform: string;
  
  /** OAuth capabilities */
  oauth: {
    supportsRefreshTokens: boolean;
    supportsPKCE: boolean;
    supportsDeviceFlow: boolean;
    maxScopeLength: number;
  };
  
  /** API capabilities */
  api: {
    supportsWebhooks: boolean;
    supportsRealTimeEvents: boolean;
    maxRequestsPerMinute: number;
    maxBatchSize: number;
  };
  
  /** Discovery capabilities */
  discovery: {
    canListUsers: boolean;
    canListApplications: boolean;
    canAccessAuditLogs: boolean;
    canDetectAutomations: boolean;
    supportsIncrementalSync: boolean;
  };
  
  /** Security features */
  security: {
    supportsTokenRevocation: boolean;
    supportsTokenIntrospection: boolean;
    requiresHTTPS: boolean;
    supportsJWTTokens: boolean;
  };
}