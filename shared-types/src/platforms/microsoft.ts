/**
 * Microsoft 365 platform-specific types
 */

import { Automation } from '../models';

/**
 * Microsoft 365-specific automation types
 */
export interface MicrosoftAutomation extends Automation {
  platform: 'microsoft';
  
  /** Microsoft-specific metadata */
  microsoftData: {
    /** Microsoft tenant ID */
    tenantId: string;
    
    /** Tenant name */
    tenantName: string;
    
    /** Power Platform environment */
    environment?: MicrosoftEnvironmentInfo;
    
    /** Power Automate flow */
    powerAutomate?: MicrosoftPowerAutomateFlow;
    
    /** Logic App */
    logicApp?: MicrosoftLogicApp;
    
    /** Microsoft Graph application */
    graphApp?: MicrosoftGraphApplication;
    
    /** Power Apps application */
    powerApp?: MicrosoftPowerApp;
    
    /** Teams app/bot */
    teamsApp?: MicrosoftTeamsApp;
  };
}

/**
 * Microsoft Power Platform environment
 */
export interface MicrosoftEnvironmentInfo {
  /** Environment ID */
  id: string;
  
  /** Environment name */
  displayName: string;
  
  /** Environment type */
  type: 'Default' | 'Production' | 'Sandbox' | 'Trial' | 'Developer';
  
  /** Environment region */
  region: string;
  
  /** Created date */
  createdTime: Date;
  
  /** Created by */
  createdBy: {
    id: string;
    displayName: string;
    userPrincipalName: string;
  };
  
  /** Environment state */
  state: 'Creating' | 'Ready' | 'Deleting' | 'Deleted';
  
  /** Security group */
  securityGroupId?: string;
}

/**
 * Microsoft Power Automate flow
 */
export interface MicrosoftPowerAutomateFlow {
  /** Flow ID */
  id: string;
  
  /** Flow name */
  displayName: string;
  
  /** Flow description */
  description?: string;
  
  /** Flow type */
  type: 'cloud' | 'desktop' | 'instant' | 'scheduled' | 'automated';
  
  /** Flow state */
  state: 'Started' | 'Stopped' | 'Suspended';
  
  /** Flow definition */
  definition: {
    triggers: MicrosoftFlowTrigger[];
    actions: MicrosoftFlowAction[];
    connections: Record<string, MicrosoftConnection>;
  };
  
  /** Created date */
  createdTime: Date;
  
  /** Created by */
  createdBy: {
    id: string;
    displayName: string;
    userPrincipalName: string;
  };
  
  /** Last modified */
  lastModifiedTime: Date;
  
  /** Run summary */
  runSummary?: {
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    lastRunTime?: Date;
  };
}

/**
 * Microsoft Flow trigger
 */
export interface MicrosoftFlowTrigger {
  /** Trigger type */
  type: string;
  
  /** Display name */
  displayName?: string;
  
  /** Connector ID */
  connectorId?: string;
  
  /** Operation ID */
  operationId?: string;
  
  /** Parameters */
  parameters?: Record<string, unknown>;
  
  /** Recurrence settings */
  recurrence?: {
    frequency: 'Minute' | 'Hour' | 'Day' | 'Week' | 'Month';
    interval: number;
    startTime?: Date;
    timeZone?: string;
  };
}

/**
 * Microsoft Flow action
 */
export interface MicrosoftFlowAction {
  /** Action type */
  type: string;
  
  /** Display name */
  displayName?: string;
  
  /** Connector ID */
  connectorId?: string;
  
  /** Operation ID */
  operationId?: string;
  
  /** Parameters */
  parameters?: Record<string, unknown>;
  
  /** Run after conditions */
  runAfter?: Record<string, string[]>;
  
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Microsoft connection
 */
export interface MicrosoftConnection {
  /** Connection ID */
  id: string;
  
  /** Connection name */
  displayName: string;
  
  /** Connector ID */
  connectorId: string;
  
  /** API ID */
  apiId: string;
  
  /** Connection status */
  status: 'Connected' | 'Error' | 'Unauthenticated';
  
  /** Created date */
  createdTime: Date;
  
  /** Last modified */
  lastModifiedTime: Date;
  
  /** Test links */
  testLinks?: Array<{
    requestUri: string;
    method: string;
  }>;
}

/**
 * Microsoft Logic App
 */
export interface MicrosoftLogicApp {
  /** Logic App ID */
  id: string;
  
  /** Logic App name */
  name: string;
  
  /** Resource group */
  resourceGroup: string;
  
  /** Subscription ID */
  subscriptionId: string;
  
  /** Location */
  location: string;
  
  /** State */
  state: 'Enabled' | 'Disabled';
  
  /** Workflow definition */
  definition: {
    triggers: Record<string, unknown>;
    actions: Record<string, unknown>;
    parameters?: Record<string, unknown>;
  };
  
  /** Integration account */
  integrationAccount?: {
    id: string;
    name: string;
  };
  
  /** Access endpoints */
  accessEndpoint: string;
  
  /** Created date */
  createdTime: Date;
  
  /** Last modified */
  changedTime: Date;
  
  /** Version */
  version: string;
}

/**
 * Microsoft Graph application
 */
export interface MicrosoftGraphApplication {
  /** Application ID */
  id: string;
  
  /** App ID */
  appId: string;
  
  /** Display name */
  displayName: string;
  
  /** Description */
  description?: string;
  
  /** Publisher domain */
  publisherDomain?: string;
  
  /** Sign-in audience */
  signInAudience: 'AzureADMyOrg' | 'AzureADMultipleOrgs' | 'AzureADandPersonalMicrosoftAccount' | 'PersonalMicrosoftAccount';
  
  /** Required resource access */
  requiredResourceAccess: Array<{
    resourceAppId: string;
    resourceAccess: Array<{
      id: string;
      type: 'Scope' | 'Role';
    }>;
  }>;
  
  /** Web configuration */
  web?: {
    redirectUris: string[];
    implicitGrantSettings: {
      enableAccessTokenIssuance: boolean;
      enableIdTokenIssuance: boolean;
    };
  };
  
  /** API configuration */
  api?: {
    acceptMappedClaims: boolean;
    knownClientApplications: string[];
    requestedAccessTokenVersion: number;
  };
  
  /** Created date */
  createdDateTime: Date;
  
  /** Deleted date */
  deletedDateTime?: Date;
}

/**
 * Microsoft Power App
 */
export interface MicrosoftPowerApp {
  /** App ID */
  name: string;
  
  /** Display name */
  displayName: string;
  
  /** Description */
  description?: string;
  
  /** App type */
  appType: 'Canvas' | 'Model' | 'Portal';
  
  /** Owner */
  owner: {
    id: string;
    displayName: string;
    userPrincipalName: string;
  };
  
  /** Created date */
  createdTime: Date;
  
  /** Last modified */
  lastModifiedTime: Date;
  
  /** Environment */
  environment: {
    id: string;
    name: string;
  };
  
  /** App version */
  appVersion: string;
  
  /** Background color */
  backgroundColor?: string;
  
  /** Connection references */
  connectionReferences?: Record<string, {
    id: string;
    displayName: string;
    connectionId: string;
  }>;
  
  /** Data sources */
  dataSources?: Array<{
    name: string;
    type: string;
  }>;
}

/**
 * Microsoft Teams app
 */
export interface MicrosoftTeamsApp {
  /** App ID */
  id: string;
  
  /** External ID */
  externalId?: string;
  
  /** Display name */
  displayName: string;
  
  /** Description */
  description?: string;
  
  /** App type */
  distributionMethod: 'store' | 'organization' | 'sideloaded';
  
  /** Teams app definition */
  teamsAppDefinition?: {
    teamsAppId: string;
    displayName: string;
    version: string;
    publishingState: 'submitted' | 'rejected' | 'published';
    shortDescription?: string;
    description?: string;
    lastModifiedDateTime?: Date;
  };
  
  /** Installed date */
  installedDateTime?: Date;
  
  /** Installed by */
  installedBy?: {
    application?: {
      id: string;
      displayName: string;
    };
    user?: {
      id: string;
      displayName: string;
    };
  };
}

/**
 * Microsoft detection patterns
 */
export const MICROSOFT_DETECTION_PATTERNS = {
  /** Power Platform connectors that suggest AI integration */
  AI_CONNECTORS: [
    'shared_cognitiveservicescomputervision',
    'shared_cognitiveservicestextanalytics',
    'shared_cognitiveservicesluis',
    'shared_cognitiveservicesformrecognizer',
    'shared_openai',
    'shared_azureopenai'
  ],
  
  /** Flow action patterns suggesting automation */
  AUTOMATION_ACTION_PATTERNS: [
    /.*http.*/i,
    /.*webhook.*/i,
    /.*schedule.*/i,
    /.*trigger.*/i,
    /.*batch.*/i,
    /.*process.*/i
  ],
  
  /** App name patterns suggesting automation */
  AUTOMATION_APP_PATTERNS: [
    /.*bot.*/i,
    /.*automation.*/i,
    /.*workflow.*/i,
    /.*integration.*/i,
    /.*sync.*/i
  ]
};

/**
 * Microsoft Graph permissions
 */
export const MICROSOFT_GRAPH_PERMISSIONS = {
  // User permissions
  'User.Read': 'Sign you in and read your profile',
  'User.ReadBasic.All': 'Read all users\' basic profiles',
  'User.Read.All': 'Read all users\' full profiles',
  'User.ReadWrite': 'Read and write access to user profile',
  'User.ReadWrite.All': 'Read and write all users\' full profiles',
  
  // Directory permissions
  'Directory.Read.All': 'Read directory data',
  'Directory.ReadWrite.All': 'Read and write directory data',
  'Directory.AccessAsUser.All': 'Access directory as the signed-in user',
  
  // Application permissions
  'Application.Read.All': 'Read all applications',
  'Application.ReadWrite.All': 'Read and write all applications',
  
  // Audit log permissions
  'AuditLog.Read.All': 'Read all audit log data',
  
  // Reports permissions
  'Reports.Read.All': 'Read all usage reports'
} as const;

/**
 * Microsoft API rate limits
 */
export const MICROSOFT_API_RATE_LIMITS = {
  /** Graph API limits */
  GRAPH_API: {
    requestsPerSecond: 10,
    requestsPerMinute: 600,
    throttlingHeaders: [
      'Retry-After',
      'x-ms-throttle-limit-percentage',
      'x-ms-throttle-scope'
    ]
  },
  
  /** Power Platform limits */
  POWER_PLATFORM: {
    requestsPerDay: 100000,
    requestsPerMinute: 6000,
    specialLimits: {
      'flows': 500,
      'connections': 1000
    }
  }
} as const;