/**
 * Google Workspace platform-specific types
 */

import { Automation } from '../models';

/**
 * Google Workspace-specific automation types
 */
export interface GoogleAutomation extends Automation {
  platform: 'google';
  
  /** Google-specific metadata */
  googleData: {
    /** Google Workspace customer ID */
    customerId: string;
    
    /** Domain name */
    domain: string;
    
    /** Organization unit path */
    orgUnitPath?: string;
    
    /** Apps Script information */
    appsScript?: GoogleAppsScriptInfo;
    
    /** Service account information */
    serviceAccount?: GooglePlatformServiceAccountInfo;
    
    /** OAuth client information */
    oauthClient?: GoogleOAuthClientInfo;
    
    /** Add-on information */
    addon?: GoogleAddonInfo;
    
    /** Cloud Function information */
    cloudFunction?: GoogleCloudFunctionInfo;
  };
}

/**
 * Google Apps Script information
 */
export interface GoogleAppsScriptInfo {
  /** Script ID */
  scriptId: string;
  
  /** Script name */
  title: string;
  
  /** Script description */
  description?: string;
  
  /** Script type */
  type: 'standalone' | 'bound' | 'library' | 'webapp';
  
  /** Parent application (for bound scripts) */
  parentApplication?: {
    type: 'sheets' | 'docs' | 'slides' | 'forms' | 'sites';
    id: string;
    name: string;
  };
  
  /** Script owner */
  owner: {
    email: string;
    name?: string;
  };
  
  /** Creation date */
  createTime: Date;
  
  /** Last update */
  updateTime: Date;
  
  /** Script version */
  version: string;
  
  /** Function names */
  functions: string[];
  
  /** External APIs used */
  apis: GoogleAPIUsage[];
  
  /** Triggers configured */
  triggers: GooglePlatformScriptTrigger[];
  
  /** Permissions required */
  oauthScopes: string[];
  
  /** Web app configuration */
  webApp?: {
    url: string;
    accessLevel: 'MYSELF' | 'DOMAIN' | 'ANYONE' | 'ANYONE_ANONYMOUS';
    executeAs: 'USER_ACCESSING' | 'USER_DEPLOYING';
  };
}

/**
 * Google API usage information
 */
export interface GoogleAPIUsage {
  /** API name */
  name: string;
  
  /** API version */
  version: string;
  
  /** Usage frequency */
  dailyCalls?: number;
  
  /** Last used */
  lastUsed?: Date;
  
  /** Scopes used */
  scopes: string[];
}

/**
 * Google Apps Script trigger (Platform-specific)
 */
export interface GooglePlatformScriptTrigger {
  /** Trigger ID */
  triggerId: string;
  
  /** Trigger type */
  type: 'time_driven' | 'event_driven' | 'form_submit' | 'spreadsheet_edit';
  
  /** Function name */
  handlerFunction: string;
  
  /** Trigger configuration */
  config: {
    /** For time-driven triggers */
    timeBasedTrigger?: {
      frequency: 'MINUTES' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
      interval?: number;
    };
    
    /** For event-driven triggers */
    eventBasedTrigger?: {
      eventType: string;
      resource?: string;
    };
  };
  
  /** Creation date */
  createdAt: Date;
  
  /** Last execution */
  lastExecution?: {
    timestamp: Date;
    status: 'SUCCESS' | 'FAILED' | 'TIMEOUT';
    duration: number;
    error?: string;
  };
}

/**
 * Google Service Account information (Platform-specific)
 */
export interface GooglePlatformServiceAccountInfo {
  /** Service account email */
  email: string;
  
  /** Service account name */
  name: string;
  
  /** Service account description */
  description?: string;
  
  /** Project ID */
  projectId: string;
  
  /** Project number */
  projectNumber: string;
  
  /** Unique ID */
  uniqueId: string;
  
  /** OAuth2 client ID */
  oauth2ClientId: string;
  
  /** Creation date */
  createdAt: Date;
  
  /** Status */
  disabled: boolean;
  
  /** Keys */
  keys: {
    id: string;
    type: 'user_managed' | 'system_managed';
    algorithm: 'KEY_ALG_RSA_1024' | 'KEY_ALG_RSA_2048';
    createdAt: Date;
    expiresAt?: Date;
  }[];
  
  /** IAM roles */
  roles: string[];
  
  /** Domain-wide delegation */
  domainWideDelegation: {
    enabled: boolean;
    clientId?: string;
    scopes?: string[];
  };
}

/**
 * Google OAuth Client information
 */
export interface GoogleOAuthClientInfo {
  /** Client ID */
  clientId: string;
  
  /** Client name */
  name: string;
  
  /** Client type */
  type: 'web' | 'installed' | 'android' | 'ios';
  
  /** Project ID */
  projectId: string;
  
  /** Authorized domains */
  authorizedDomains: string[];
  
  /** Redirect URIs */
  redirectUris: string[];
  
  /** JavaScript origins */
  javascriptOrigins: string[];
  
  /** Creation date */
  createdAt: Date;
  
  /** Client secret (not stored) */
  hasClientSecret: boolean;
  
  /** Usage statistics */
  usage: {
    totalTokens: number;
    activeTokens: number;
    lastTokenIssued?: Date;
    monthlyTokens: number;
  };
}

/**
 * Google Add-on information
 */
export interface GoogleAddonInfo {
  /** Add-on ID */
  id: string;
  
  /** Add-on name */
  name: string;
  
  /** Add-on description */
  description?: string;
  
  /** Add-on type */
  type: 'gmail' | 'calendar' | 'drive' | 'docs' | 'sheets' | 'slides';
  
  /** Publisher */
  publisher: {
    name: string;
    email?: string;
    website?: string;
  };
  
  /** Installation source */
  installSource: 'marketplace' | 'admin' | 'developer';
  
  /** Installation date */
  installedAt: Date;
  
  /** Installed by */
  installedBy: {
    email: string;
    name?: string;
  };
  
  /** Permissions */
  permissions: string[];
  
  /** Usage statistics */
  usage: {
    activeUsers: number;
    totalSessions: number;
    lastUsed?: Date;
  };
  
  /** Version information */
  version: string;
  
  /** Update available */
  updateAvailable: boolean;
}

/**
 * Google Cloud Function information
 */
export interface GoogleCloudFunctionInfo {
  /** Function name */
  name: string;
  
  /** Function description */
  description?: string;
  
  /** Source location */
  sourceArchiveUrl?: string;
  
  /** Function trigger */
  trigger: {
    type: 'httpsTrigger' | 'eventTrigger';
    config: Record<string, unknown>;
  };
  
  /** Runtime */
  runtime: string;
  
  /** Entry point */
  entryPoint: string;
  
  /** Environment variables */
  environmentVariables?: Record<string, string>;
  
  /** Service account email */
  serviceAccountEmail?: string;
  
  /** VPC connector */
  vpcConnector?: string;
  
  /** Maximum instances */
  maxInstances?: number;
  
  /** Available memory */
  availableMemoryMb?: number;
  
  /** Timeout */
  timeout?: string;
  
  /** Labels */
  labels?: Record<string, string>;
  
  /** Creation date */
  createdAt: Date;
  
  /** Last update */
  updatedAt: Date;
  
  /** Version ID */
  versionId: string;
  
  /** Status */
  status: 'CLOUD_FUNCTION_STATUS_UNSPECIFIED' | 'ACTIVE' | 'OFFLINE' | 'DEPLOY_IN_PROGRESS' | 'DELETE_IN_PROGRESS' | 'UNKNOWN';
}

/**
 * Google Workspace admin audit log entry
 */
export interface GoogleAdminAuditLogEntry {
  /** Event ID */
  id: string;
  
  /** Event name */
  eventName: string;
  
  /** Event type */
  eventType: string;
  
  /** Actor */
  actor: {
    email: string;
    profileId?: string;
    type: 'user' | 'service_account' | 'system';
  };
  
  /** Target */
  target?: {
    email?: string;
    name?: string;
    type: string;
  };
  
  /** Timestamp */
  timestamp: Date;
  
  /** IP address */
  ipAddress?: string;
  
  /** User agent */
  userAgent?: string;
  
  /** Application name */
  applicationName: string;
  
  /** Event parameters */
  parameters?: Array<{
    name: string;
    value: string;
    type?: string;
  }>;
  
  /** Organizational unit path */
  orgUnitPath?: string;
  
  /** Kind */
  kind: string;
  
  /** ETag */
  etag?: string;
}

/**
 * Google detection patterns
 */
export const GOOGLE_DETECTION_PATTERNS = {
  /** AI service integrations */
  AI_APIS: [
    'generativelanguage.googleapis.com', // Gemini API
    'aiplatform.googleapis.com',          // Vertex AI
    'ml.googleapis.com',                  // Cloud ML Engine
    'automl.googleapis.com',              // AutoML
    'translate.googleapis.com',           // Translation API
    'speech.googleapis.com',              // Speech API
    'vision.googleapis.com'               // Vision API
  ],
  
  /** External AI service domains in Apps Script */
  EXTERNAL_AI_DOMAINS: [
    'api.openai.com',
    'api.anthropic.com',
    'api.cohere.ai',
    'api.huggingface.co'
  ],
  
  /** Apps Script function patterns suggesting automation */
  AUTOMATION_FUNCTION_PATTERNS: [
    /.*trigger.*/i,
    /.*schedule.*/i,
    /.*auto.*/i,
    /.*batch.*/i,
    /.*process.*/i,
    /.*sync.*/i,
    /.*import.*/i,
    /.*export.*/i
  ],
  
  /** Service account naming patterns */
  SERVICE_ACCOUNT_PATTERNS: [
    /.*automation.*/i,
    /.*bot.*/i,
    /.*service.*/i,
    /.*integration.*/i,
    /.*sync.*/i
  ]
};

/**
 * Google OAuth scopes and descriptions
 */
export const GOOGLE_OAUTH_SCOPES = {
  // Admin SDK
  'https://www.googleapis.com/auth/admin.directory.user': 'View and manage users in your domain',
  'https://www.googleapis.com/auth/admin.directory.user.readonly': 'View users in your domain',
  'https://www.googleapis.com/auth/admin.directory.group': 'View and manage groups in your domain',
  'https://www.googleapis.com/auth/admin.directory.group.readonly': 'View groups in your domain',
  'https://www.googleapis.com/auth/admin.reports.audit.readonly': 'View audit reports for your domain',
  'https://www.googleapis.com/auth/admin.reports.usage.readonly': 'View usage reports for your domain',
  
  // Apps Script
  'https://www.googleapis.com/auth/script.projects': 'Create and manage Apps Script projects',
  'https://www.googleapis.com/auth/script.projects.readonly': 'View Apps Script projects',
  
  // Drive
  'https://www.googleapis.com/auth/drive': 'See, edit, create, and delete all of your Google Drive files',
  'https://www.googleapis.com/auth/drive.readonly': 'View and download all your Google Drive files',
  'https://www.googleapis.com/auth/drive.metadata.readonly': 'View metadata for files in your Google Drive',
  
  // Sheets
  'https://www.googleapis.com/auth/spreadsheets': 'See, edit, create, and delete your spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly': 'View your Google Spreadsheets',
  
  // Gmail
  'https://www.googleapis.com/auth/gmail.readonly': 'Read all resources and their metadata—no write operations',
  'https://www.googleapis.com/auth/gmail.modify': 'Read, compose, send, and permanently delete all your email from Gmail'
} as const;

/**
 * Google API rate limits
 */
export const GOOGLE_API_RATE_LIMITS = {
  /** Admin SDK limits */
  ADMIN_SDK: {
    requestsPerDay: 2400,
    requestsPerMinute: 150,
    specialMethods: {
      'users.list': 20,
      'groups.list': 20,
      'reports.activities.list': 10
    }
  },
  
  /** Apps Script API limits */
  APPS_SCRIPT: {
    requestsPerDay: 300,
    requestsPerMinute: 30
  },
  
  /** Drive API limits */
  DRIVE: {
    requestsPerDay: 1000000,
    requestsPerMinute: 1000
  }
} as const;