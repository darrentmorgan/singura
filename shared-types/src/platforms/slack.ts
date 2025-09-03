/**
 * Slack platform-specific types
 */

import { Automation, Platform } from '../models';

/**
 * Slack-specific automation types
 */
export interface SlackAutomation extends Automation {
  platform: 'slack';
  
  /** Slack-specific metadata */
  slackData: {
    /** Slack team/workspace ID */
    teamId: string;
    
    /** Slack team name */
    teamName: string;
    
    /** Slack team domain */
    teamDomain: string;
    
    /** App or bot information */
    app?: SlackAppInfo;
    
    /** Workflow information */
    workflow?: SlackWorkflowInfo;
    
    /** Bot information */
    bot?: SlackBotInfo;
    
    /** Channel information */
    channels?: SlackChannelInfo[];
    
    /** User information */
    users?: SlackUserInfo[];
  };
}

/**
 * Slack app information
 */
export interface SlackAppInfo {
  /** App ID */
  id: string;
  
  /** App name */
  name: string;
  
  /** App description */
  description?: string;
  
  /** App developer */
  developer: {
    name: string;
    website?: string;
    supportEmail?: string;
  };
  
  /** OAuth scopes */
  scopes: string[];
  
  /** Installation date */
  installedAt: Date;
  
  /** Installation user */
  installedBy: {
    id: string;
    name: string;
    email?: string;
  };
  
  /** App distribution */
  distribution: 'workspace' | 'public' | 'private';
  
  /** App configuration */
  config?: Record<string, unknown>;
}

/**
 * Slack workflow information
 */
export interface SlackWorkflowInfo {
  /** Workflow ID */
  id: string;
  
  /** Workflow name */
  name: string;
  
  /** Workflow description */
  description?: string;
  
  /** Workflow trigger */
  trigger: {
    type: 'webhook' | 'schedule' | 'event' | 'manual';
    config: Record<string, unknown>;
  };
  
  /** Workflow steps */
  steps: SlackWorkflowStep[];
  
  /** Created by */
  createdBy: {
    id: string;
    name: string;
  };
  
  /** Creation date */
  createdAt: Date;
  
  /** Last run */
  lastRun?: Date;
  
  /** Run count */
  runCount: number;
  
  /** Status */
  status: 'active' | 'paused' | 'draft';
}

/**
 * Slack workflow step
 */
export interface SlackWorkflowStep {
  /** Step ID */
  id: string;
  
  /** Step name */
  name: string;
  
  /** Step type */
  type: 'message' | 'webhook' | 'app_action' | 'condition' | 'delay';
  
  /** Step configuration */
  config: Record<string, unknown>;
  
  /** Connected apps */
  connectedApps?: string[];
  
  /** External URLs */
  externalUrls?: string[];
}

/**
 * Slack bot information
 */
export interface SlackBotInfo {
  /** Bot ID */
  id: string;
  
  /** Bot name */
  name: string;
  
  /** Bot purpose */
  purpose?: string;
  
  /** Bot creator */
  createdBy: {
    id: string;
    name: string;
  };
  
  /** Bot app association */
  appId?: string;
  
  /** Bot permissions */
  permissions: string[];
  
  /** Online status */
  isOnline: boolean;
  
  /** Last activity */
  lastActivity?: Date;
  
  /** Message count */
  messageCount: number;
}

/**
 * Slack channel information
 */
export interface SlackChannelInfo {
  /** Channel ID */
  id: string;
  
  /** Channel name */
  name: string;
  
  /** Channel type */
  type: 'public' | 'private' | 'im' | 'mpim';
  
  /** Member count */
  memberCount: number;
  
  /** Channel purpose */
  purpose?: string;
  
  /** Channel topic */
  topic?: string;
  
  /** Created date */
  createdAt: Date;
  
  /** Is archived */
  isArchived: boolean;
}

/**
 * Slack user information
 */
export interface SlackUserInfo {
  /** User ID */
  id: string;
  
  /** Username */
  name: string;
  
  /** Display name */
  displayName?: string;
  
  /** Email address */
  email?: string;
  
  /** Real name */
  realName?: string;
  
  /** User type */
  type: 'member' | 'admin' | 'owner' | 'bot' | 'restricted' | 'ultra_restricted';
  
  /** Is deleted */
  isDeleted: boolean;
  
  /** Is bot */
  isBot: boolean;
  
  /** Profile information */
  profile?: {
    title?: string;
    phone?: string;
    image?: string;
    statusText?: string;
    statusEmoji?: string;
  };
}

/**
 * Slack audit log entry
 */
export interface SlackAuditLogEntry {
  /** Entry ID */
  id: string;
  
  /** Action performed */
  action: string;
  
  /** Actor (user who performed action) */
  actor: {
    type: 'user' | 'app' | 'workflow';
    id: string;
    name: string;
  };
  
  /** Entity affected */
  entity: {
    type: string;
    id: string;
    name?: string;
  };
  
  /** Timestamp */
  timestamp: Date;
  
  /** Context */
  context: {
    teamId: string;
    channelId?: string;
    appId?: string;
    workflowId?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  
  /** Additional details */
  details?: Record<string, unknown>;
}

/**
 * Slack webhook configuration
 */
export interface SlackWebhookConfig {
  /** Webhook URL */
  url: string;
  
  /** Webhook type */
  type: 'incoming' | 'outgoing' | 'slash_command' | 'event_subscription';
  
  /** Channel */
  channel?: string;
  
  /** Token */
  token?: string;
  
  /** Configuration URL */
  configUrl?: string;
  
  /** Creator */
  createdBy: {
    id: string;
    name: string;
  };
  
  /** Created date */
  createdAt: Date;
  
  /** Last used */
  lastUsed?: Date;
  
  /** Usage count */
  usageCount: number;
}

/**
 * Slack integration detection patterns
 */
export const SLACK_DETECTION_PATTERNS = {
  /** AI service domains commonly used in Slack */
  AI_DOMAINS: [
    'api.openai.com',
    'api.anthropic.com',
    'api.cohere.ai',
    'api.huggingface.co',
    'generativelanguage.googleapis.com'
  ],
  
  /** Bot name patterns that suggest AI functionality */
  AI_BOT_PATTERNS: [
    /.*gpt.*/i,
    /.*ai.*/i,
    /.*claude.*/i,
    /.*assistant.*/i,
    /.*chatbot.*/i,
    /.*intelligence.*/i
  ],
  
  /** App names that suggest automation */
  AUTOMATION_APP_PATTERNS: [
    /.*zapier.*/i,
    /.*integromat.*/i,
    /.*make.*/i,
    /.*automation.*/i,
    /.*workflow.*/i,
    /.*bot.*/i
  ],
  
  /** Webhook URL patterns */
  WEBHOOK_PATTERNS: [
    /hooks\.slack\.com/,
    /slack\.com\/api\//,
    /zapier\.com/,
    /integromat\.com/,
    /make\.com/
  ]
};

/**
 * Slack OAuth scopes and their descriptions
 */
export const SLACK_OAUTH_SCOPES = {
  'channels:read': 'View basic information about public channels',
  'groups:read': 'View basic information about private channels',
  'users:read': 'View people in the workspace',
  'team:read': 'View the workspace name, domain, and icon',
  'bots:read': 'View information about bots in the workspace',
  'apps:read': 'View installed apps in the workspace',
  'admin.apps:read': 'View all apps in an Enterprise Grid workspace',
  'admin.users:read': 'View users in an Enterprise Grid workspace',
  'admin.teams:read': 'View workspaces in an Enterprise Grid',
  'audit:read': 'View audit log events'
} as const;

/**
 * Slack API rate limits
 */
export const SLACK_RATE_LIMITS = {
  /** Standard tier limits */
  STANDARD: {
    requestsPerMinute: 100,
    burstLimit: 120,
    specialMethods: {
      'conversations.list': 20,
      'users.list': 20,
      'admin.audit.logs': 10
    }
  },
  
  /** Plus tier limits */
  PLUS: {
    requestsPerMinute: 100,
    burstLimit: 120,
    specialMethods: {
      'conversations.list': 50,
      'users.list': 50,
      'admin.audit.logs': 20
    }
  }
} as const;