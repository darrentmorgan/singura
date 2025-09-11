/**
 * Google Workspace Platform Types
 * Types for Google Workspace automation discovery and metadata logging
 */

/**
 * Google Workspace automation types that can be discovered
 */
export type GoogleAutomationType = 
  | 'apps_script'      // Google Apps Script automations
  | 'workflow'         // Google Workspace workflows  
  | 'service_account'  // Service account automations
  | 'addon'           // Google Workspace add-ons
  | 'integration'     // Third-party integrations
  | 'trigger'         // Event-based triggers

/**
 * Google Apps Script project information (Workspace-specific)
 */
export interface GoogleWorkspaceAppsScriptProject {
  scriptId: string;
  title: string;
  description?: string;
  owner: string;
  createdTime: Date;
  lastModifiedTime: Date;
  permissions: GoogleAppsScriptPermission[];
  triggers: GoogleWorkspaceAppsScriptTrigger[];
  riskScore: number;
  riskFactors: string[];
}

/**
 * Apps Script permissions for risk assessment
 */
export interface GoogleAppsScriptPermission {
  scope: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  dataAccess: string[];
}

/**
 * Apps Script triggers for automation detection (Workspace-specific)
 */
export interface GoogleWorkspaceAppsScriptTrigger {
  triggerId: string;
  eventType: 'ON_EDIT' | 'ON_CHANGE' | 'ON_FORM_SUBMIT' | 'ON_OPEN' | 'TIME_DRIVEN';
  functionName: string;
  enabled: boolean;
  lastRunTime?: Date;
  frequency?: string;
}

/**
 * Google Drive automation detection
 */
export interface GoogleDriveAutomation {
  fileId: string;
  fileName: string;
  automationType: 'shared_script' | 'addon_integration' | 'workflow_trigger';
  owner: string;
  permissions: GoogleDrivePermission[];
  lastActivity: Date;
  riskScore: number;
  dataExposure: string[];
}

/**
 * Drive file permissions for risk assessment
 */
export interface GoogleDrivePermission {
  permissionId: string;
  type: 'user' | 'group' | 'domain' | 'anyone';
  role: 'owner' | 'organizer' | 'fileOrganizer' | 'writer' | 'commenter' | 'reader';
  emailAddress?: string;
  domain?: string;
  allowFileDiscovery?: boolean;
}

/**
 * Google Workspace service account detection
 */
export interface GoogleServiceAccount {
  uniqueId: string;
  email: string;
  displayName: string;
  description?: string;
  projectId: string;
  createdTime: Date;
  keys: GoogleWorkspaceServiceAccountKey[];
  permissions: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Service account key information for security assessment (Workspace-specific)
 */
export interface GoogleWorkspaceServiceAccountKey {
  keyId: string;
  keyType: 'USER_MANAGED' | 'SYSTEM_MANAGED';
  createdTime: Date;
  validAfterTime?: Date;
  validBeforeTime?: Date;
  keyAlgorithm: string;
}

/**
 * Google Workspace automation discovery result
 */
export interface GoogleWorkspaceDiscoveryResult {
  appsScriptProjects: GoogleWorkspaceAppsScriptProject[];
  driveAutomations: GoogleDriveAutomation[];
  serviceAccounts: GoogleServiceAccount[];
  totalAutomations: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  discoveryMetadata: {
    scanStartTime: Date;
    scanEndTime: Date;
    scopesUsed: string[];
    apiCallsCount: number;
    errorsEncountered: string[];
  };
}

/**
 * Google Workspace audit log entry for compliance
 */
export interface GoogleWorkspaceAuditEntry {
  eventId: string;
  timestamp: Date;
  eventType: 'automation_discovered' | 'permission_granted' | 'script_executed' | 'file_shared';
  user: string;
  resource: string;
  action: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  metadata: Record<string, unknown>;
}

/**
 * Google Workspace organization information
 */
export interface GoogleWorkspaceOrganization {
  customerId: string;
  domain: string;
  organizationName: string;
  adminEmail: string;
  userCount: number;
  serviceAccountsCount: number;
  appsScriptProjectsCount: number;
  securitySettings: {
    twoFactorRequired: boolean;
    externalSharingEnabled: boolean;
    appsScriptEnabled: boolean;
    marketplaceInstallsAllowed: boolean;
  };
}

/**
 * Type guard for Google Workspace discovery result
 */
export function isValidGoogleWorkspaceDiscoveryResult(value: unknown): value is GoogleWorkspaceDiscoveryResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'appsScriptProjects' in value &&
    'driveAutomations' in value &&
    'serviceAccounts' in value &&
    'totalAutomations' in value &&
    Array.isArray((value as any).appsScriptProjects) &&
    Array.isArray((value as any).driveAutomations) &&
    Array.isArray((value as any).serviceAccounts) &&
    typeof (value as any).totalAutomations === 'number'
  );
}