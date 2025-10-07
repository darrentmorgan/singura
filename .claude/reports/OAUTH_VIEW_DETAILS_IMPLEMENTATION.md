# OAuth App View Details Enhancement - Implementation Guide

**Ready-to-implement code snippets and SQL for Phase 1 (8-16 hours)**

---

## 1. Database Migration: OAuth Scope Library

```sql
-- backend/src/database/migrations/009_create_oauth_scope_library.sql

-- Create OAuth scope library table
CREATE TABLE IF NOT EXISTS oauth_scope_library (
  scope_url VARCHAR(500) PRIMARY KEY,
  service_name VARCHAR(100) NOT NULL,
  access_level VARCHAR(50) NOT NULL,
  data_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  description TEXT NOT NULL,
  justification TEXT NOT NULL,
  common_uses JSONB NOT NULL DEFAULT '[]'::jsonb,
  potential_abuse JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_alternative VARCHAR(500),
  regulatory_impact JSONB NOT NULL DEFAULT '{"gdpr": false, "hipaa": false, "pci": false}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX idx_oauth_scope_library_service ON oauth_scope_library(service_name);
CREATE INDEX idx_oauth_scope_library_risk ON oauth_scope_library(risk_level);

-- Seed with top 20 Google OAuth scopes
INSERT INTO oauth_scope_library (
  scope_url, service_name, access_level, data_types, risk_score, risk_level,
  description, justification, common_uses, potential_abuse,
  recommended_alternative, regulatory_impact
) VALUES
-- CRITICAL Risk
(
  'https://mail.google.com/',
  'Gmail',
  'Full read/write/send',
  '["Emails", "Drafts", "Labels", "Settings"]'::jsonb,
  95,
  'CRITICAL',
  'Complete access to all emails with ability to send, delete, and modify messages',
  'Unrestricted Gmail access allows reading sensitive communications, impersonation, and evidence deletion',
  '["Email clients", "Email automation", "Email backup"]'::jsonb,
  '["Email interception", "Phishing campaigns", "Sensitive data theft", "Account impersonation"]'::jsonb,
  'gmail.readonly',
  '{"gdpr": true, "hipaa": false, "pci": false}'::jsonb
),
(
  'https://www.googleapis.com/auth/admin.directory.user',
  'Google Workspace Admin',
  'Full user management',
  '["Users", "Passwords", "Permissions", "Groups"]'::jsonb,
  90,
  'CRITICAL',
  'Create, delete, and modify user accounts with password reset capabilities',
  'Complete administrative control over user accounts enables privilege escalation and account takeover',
  '["User provisioning", "SCIM integration", "Identity management"]'::jsonb,
  '["Account takeover", "Privilege escalation", "Unauthorized admin access"]'::jsonb,
  'admin.directory.user.readonly',
  '{"gdpr": true, "hipaa": false, "pci": false}'::jsonb
),

-- HIGH Risk
(
  'https://www.googleapis.com/auth/drive',
  'Google Drive',
  'Full read/write/delete',
  '["Documents", "Spreadsheets", "Presentations", "Files", "Folders", "Shared Drives"]'::jsonb,
  85,
  'HIGH',
  'Unlimited access to all Drive files with create, modify, and delete permissions',
  'Broad file access enables mass data exfiltration, intellectual property theft, and potential ransomware',
  '["File sync", "Backup services", "Document management"]'::jsonb,
  '["Mass file exfiltration", "IP theft", "Ransomware deployment", "Data deletion"]'::jsonb,
  'drive.file',
  '{"gdpr": true, "hipaa": false, "pci": false}'::jsonb
),
(
  'https://www.googleapis.com/auth/drive.readonly',
  'Google Drive',
  'Read-only',
  '["Documents", "Spreadsheets", "Presentations", "Files", "Folders", "Shared Drives"]'::jsonb,
  65,
  'HIGH',
  'Read-only access to all files and folders, including items shared by other users',
  'Can access potentially sensitive documents across entire organization without modification tracking',
  '["File search", "Document indexing", "Analytics dashboards"]'::jsonb,
  '["Data exfiltration", "Competitive intelligence", "Trade secret theft"]'::jsonb,
  'drive.metadata.readonly',
  '{"gdpr": true, "hipaa": false, "pci": false}'::jsonb
),
(
  'https://www.googleapis.com/auth/gmail.readonly',
  'Gmail',
  'Read-only',
  '["Emails", "Attachments", "Labels", "Threads"]'::jsonb,
  70,
  'HIGH',
  'Read-only access to all email messages and settings',
  'Can read sensitive communications and business correspondence without user awareness',
  '["Email analytics", "Compliance scanning", "Email search"]'::jsonb,
  '["Email content analysis", "Sensitive data exposure", "Business intelligence theft"]'::jsonb,
  'gmail.metadata',
  '{"gdpr": true, "hipaa": false, "pci": false}'::jsonb
),

-- MEDIUM Risk
(
  'https://www.googleapis.com/auth/calendar',
  'Google Calendar',
  'Full read/write',
  '["Events", "Attendees", "Locations", "Meeting Details"]'::jsonb,
  50,
  'MEDIUM',
  'Full access to create, modify, and delete calendar events',
  'Calendar access enables meeting intelligence and schedule tracking for targeted attacks',
  '["Calendar sync", "Scheduling automation", "Meeting management"]'::jsonb,
  '["Schedule tracking", "Meeting intelligence", "Executive targeting"]'::jsonb,
  'calendar.readonly',
  '{"gdpr": true, "hipaa": false, "pci": false}'::jsonb
),
(
  'https://www.googleapis.com/auth/calendar.readonly',
  'Google Calendar',
  'Read-only',
  '["Events", "Attendees", "Locations"]'::jsonb,
  35,
  'MEDIUM',
  'Read-only access to all calendar events and details',
  'Can track user schedules and identify meeting patterns for social engineering',
  '["Calendar widgets", "Scheduling assistants", "Time tracking"]'::jsonb,
  '["Schedule reconnaissance", "Social engineering preparation"]'::jsonb,
  NULL,
  '{"gdpr": true, "hipaa": false, "pci": false}'::jsonb
),
(
  'https://www.googleapis.com/auth/drive.file',
  'Google Drive',
  'App-created files only',
  '["App-created files"]'::jsonb,
  25,
  'MEDIUM',
  'Access limited to files created by this application',
  'Restricted scope limits exposure to only files created by the app',
  '["Document editors", "Form builders", "Export tools"]'::jsonb,
  '["Limited to app-created files only"]'::jsonb,
  NULL,
  '{"gdpr": false, "hipaa": false, "pci": false}'::jsonb
),
(
  'https://www.googleapis.com/auth/admin.reports.audit.readonly',
  'Google Workspace Admin',
  'Audit log access',
  '["Audit logs", "Activity reports"]'::jsonb,
  45,
  'MEDIUM',
  'Read-only access to admin audit logs and activity reports',
  'Audit log access enables activity monitoring without modification capabilities',
  '["Security monitoring", "Compliance reporting", "Activity analysis"]'::jsonb,
  '["Activity surveillance", "User behavior tracking"]'::jsonb,
  NULL,
  '{"gdpr": false, "hipaa": false, "pci": false}'::jsonb
),
(
  'https://www.googleapis.com/auth/script.projects.readonly',
  'Google Apps Script',
  'Read projects',
  '["Script projects", "Code", "Configurations"]'::jsonb,
  30,
  'MEDIUM',
  'Read-only access to Apps Script projects',
  'Can inspect automation code and configurations',
  '["Code analysis", "Automation discovery", "Security auditing"]'::jsonb,
  '["Code inspection", "Secret extraction from scripts"]'::jsonb,
  NULL,
  '{"gdpr": false, "hipaa": false, "pci": false}'::jsonb
),

-- LOW Risk
(
  'https://www.googleapis.com/auth/userinfo.email',
  'OAuth',
  'Email address',
  '["Email address"]'::jsonb,
  10,
  'LOW',
  'Access to user email address only',
  'Basic identity information with minimal privacy impact',
  '["Authentication", "User identification", "Email verification"]'::jsonb,
  '["Email harvesting", "Spam targeting"]'::jsonb,
  NULL,
  '{"gdpr": true, "hipaa": false, "pci": false}'::jsonb
),
(
  'https://www.googleapis.com/auth/userinfo.profile',
  'OAuth',
  'Basic profile',
  '["Name", "Picture", "Locale"]'::jsonb,
  10,
  'LOW',
  'Access to basic profile information (name, picture, locale)',
  'Public profile data with minimal sensitivity',
  '["User profiles", "Social login", "Personalization"]'::jsonb,
  '["Profile data collection", "Identity mapping"]'::jsonb,
  NULL,
  '{"gdpr": true, "hipaa": false, "pci": false}'::jsonb
),
(
  'openid',
  'OAuth',
  'Authentication',
  '["User ID"]'::jsonb,
  5,
  'LOW',
  'OpenID Connect authentication scope',
  'Standard authentication scope with minimal data access',
  '["SSO", "Identity verification", "Authentication"]'::jsonb,
  '["Identity correlation"]'::jsonb,
  NULL,
  '{"gdpr": false, "hipaa": false, "pci": false}'::jsonb
),
(
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'Google Drive',
  'Metadata only',
  '["File names", "File types", "Owners", "Modified dates"]'::jsonb,
  20,
  'LOW',
  'Read-only access to file metadata without content',
  'File structure visibility without access to sensitive content',
  '["File organization", "Metadata search", "File analytics"]'::jsonb,
  '["File structure reconnaissance", "Naming pattern analysis"]'::jsonb,
  NULL,
  '{"gdpr": false, "hipaa": false, "pci": false}'::jsonb
),
(
  'https://www.googleapis.com/auth/admin.directory.user.readonly',
  'Google Workspace Admin',
  'User directory read-only',
  '["User list", "User details", "Groups"]'::jsonb,
  40,
  'MEDIUM',
  'Read-only access to user directory information',
  'Can enumerate users and organizational structure',
  '["Directory sync", "Org chart", "User analytics"]'::jsonb,
  '["User enumeration", "Org structure mapping"]'::jsonb,
  NULL,
  '{"gdpr": true, "hipaa": false, "pci": false}'::jsonb
);

-- Add update trigger
CREATE OR REPLACE FUNCTION update_oauth_scope_library_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER oauth_scope_library_updated_at
  BEFORE UPDATE ON oauth_scope_library
  FOR EACH ROW
  EXECUTE FUNCTION update_oauth_scope_library_updated_at();
```

---

## 2. TypeScript Types

```typescript
// shared-types/src/models/oauth-app-details.ts

export interface OAuthAppDetails {
  // Basic info
  id: string;
  name: string;
  platform: 'google' | 'slack' | 'microsoft';
  clientId: string;
  applicationType: 'web' | 'native' | 'unknown';
  isVerified: boolean;
  
  // Authorization
  firstAuthorized: Date;
  authorizedBy: OAuthAppAuthorizer;
  
  // Usage
  usage: OAuthAppUsageStats;
  
  // Access patterns
  accessPatterns: OAuthAppAccessPatterns;
  
  // Permissions (enriched)
  permissions: EnrichedOAuthScope[];
  
  // Activity
  activityTimeline: OAuthAppTimelineEvent[];
  
  // Scope evolution
  scopeEvolution: OAuthScopeEvolution;
  
  // Risk
  risk: OAuthAppRiskAssessment;
}

export interface OAuthAppAuthorizer {
  email: string;
  name: string;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  department?: string;
  orgUnit?: string;
  title?: string;
}

export interface OAuthAppUsageStats {
  totalEvents: number;
  last7Days: number;
  last30Days: number;
  last90Days: number;
  peakDay: { date: string; count: number };
  averageDailyUsage: number;
  trend: { increasing: boolean; percentage: number };
}

export interface OAuthAppAccessPatterns {
  ipAddresses: Array<{
    ip: string;
    country?: string;
    firstSeen: Date;
    lastSeen: Date;
    requestCount: number;
  }>;
  accessTimes: {
    businessHours: number;
    offHours: number;
    weekends: number;
    peakHour: number;
  };
  suspiciousIndicators: string[];
}

export interface EnrichedOAuthScope {
  scope: string;
  service: string;
  accessLevel: string;
  dataTypes: string[];
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  justification: string;
  commonUses: string[];
  potentialAbuse: string[];
  recommendedAlternative?: string;
  regulatoryImpact: {
    gdpr: boolean;
    hipaa: boolean;
    pci: boolean;
  };
  grantedDate: Date;
  grantedBy: string;
  usageCount?: number;
}

export interface OAuthAppTimelineEvent {
  timestamp: Date;
  eventType: 'authorization' | 'revocation' | 'scope_change' | 'api_access';
  user: string;
  action: string;
  details: string;
  metadata: Record<string, any>;
}

export interface OAuthScopeEvolution {
  originalScopes: string[];
  currentScopes: string[];
  addedScopes: Array<{
    scope: string;
    addedDate: Date;
    addedBy: string;
  }>;
  removedScopes: Array<{
    scope: string;
    removedDate: Date;
  }>;
  scopeHistory: Array<{
    date: Date;
    scopes: string[];
    changeType: 'added' | 'removed' | 'initial';
  }>;
}

export interface OAuthAppRiskAssessment {
  overallScore: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  breakdown: {
    aiPlatformIntegration: number;
    highPrivilegeScopes: number;
    adminUserAuthorization: number;
    usagePatterns: number;
  };
  gdprConcerns: string[];
  recommendations: string[];
}
```

---

## 3. Google Directory Service

```typescript
// backend/src/services/google-directory.service.ts

import { google, admin_directory_v1 } from 'googleapis';
import { GoogleOAuthCredentials } from '@saas-xray/shared-types';

export interface GoogleTokenMetadata {
  clientId: string;
  displayText: string;
  scopes: string[];
  anonymous: boolean;
  nativeApp: boolean;
  userKey: string;
}

export interface GoogleUserDetails {
  email: string;
  name: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isDelegatedAdmin: boolean;
  orgUnitPath: string;
  department?: string;
  title?: string;
  suspended: boolean;
  lastLoginTime?: string;
}

export class GoogleDirectoryService {
  private directory: admin_directory_v1.Admin;
  
  constructor(credentials: GoogleOAuthCredentials) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken
    });
    
    this.directory = google.admin({ version: 'directory_v1', auth });
  }
  
  async getTokenMetadata(userKey: string, clientId: string): Promise<GoogleTokenMetadata | null> {
    try {
      const response = await this.directory.tokens.list({
        userKey
      });
      
      const tokens = response.data.items || [];
      const token = tokens.find(t => t.clientId === clientId);
      
      if (!token) return null;
      
      return {
        clientId: token.clientId!,
        displayText: token.displayText!,
        scopes: token.scopes || [],
        anonymous: token.anonymous || false,
        nativeApp: token.nativeApp || false,
        userKey: token.userKey!
      };
    } catch (error) {
      console.error('Error fetching token metadata:', error);
      return null;
    }
  }
  
  async getUserDetails(userKey: string): Promise<GoogleUserDetails | null> {
    try {
      const response = await this.directory.users.get({
        userKey,
        projection: 'full'
      });
      
      const user = response.data;
      
      return {
        email: user.primaryEmail!,
        name: user.name?.fullName || 'Unknown',
        isAdmin: user.isAdmin || false,
        isSuperAdmin: user.isAdmin || false, // Google uses same field
        isDelegatedAdmin: user.isDelegatedAdmin || false,
        orgUnitPath: user.orgUnitPath || '/',
        department: user.organizations?.[0]?.department,
        title: user.organizations?.[0]?.title,
        suspended: user.suspended || false,
        lastLoginTime: user.lastLoginTime
      };
    } catch (error) {
      console.error('Error fetching user details:', error);
      return null;
    }
  }
}
```

---

## 4. Scope Enrichment Service

```typescript
// backend/src/services/oauth-scope-enrichment.service.ts

import { EnrichedOAuthScope } from '@saas-xray/shared-types';
import { Pool } from 'pg';

export class OAuthScopeEnrichmentService {
  constructor(private db: Pool) {}
  
  async enrichScopes(
    scopes: string[],
    grantedDate: Date,
    grantedBy: string
  ): Promise<EnrichedOAuthScope[]> {
    const enriched: EnrichedOAuthScope[] = [];
    
    for (const scope of scopes) {
      const result = await this.db.query(
        'SELECT * FROM oauth_scope_library WHERE scope_url = $1',
        [scope]
      );
      
      if (result.rows.length === 0) {
        // Fallback for unknown scopes
        enriched.push({
          scope,
          service: 'Unknown',
          accessLevel: 'Unknown',
          dataTypes: [],
          riskScore: 50,
          riskLevel: 'MEDIUM',
          description: 'Scope not in library - requires manual review',
          justification: 'Unknown scope risk',
          commonUses: [],
          potentialAbuse: [],
          regulatoryImpact: { gdpr: false, hipaa: false, pci: false },
          grantedDate,
          grantedBy
        });
        continue;
      }
      
      const lib = result.rows[0];
      enriched.push({
        scope,
        service: lib.service_name,
        accessLevel: lib.access_level,
        dataTypes: lib.data_types,
        riskScore: lib.risk_score,
        riskLevel: lib.risk_level,
        description: lib.description,
        justification: lib.justification,
        commonUses: lib.common_uses,
        potentialAbuse: lib.potential_abuse,
        recommendedAlternative: lib.recommended_alternative,
        regulatoryImpact: lib.regulatory_impact,
        grantedDate,
        grantedBy
      });
    }
    
    // Sort by risk score descending
    enriched.sort((a, b) => b.riskScore - a.riskScore);
    
    return enriched;
  }
}
```

---

## 5. View Details API Endpoint

```typescript
// backend/src/routes/automations.ts

import { Router } from 'express';
import { clerkAuthMiddleware } from '../middleware/clerk-auth';
import { GoogleDirectoryService } from '../services/google-directory.service';
import { OAuthScopeEnrichmentService } from '../services/oauth-scope-enrichment.service';
import { oauthCredentialStorage } from '../services/oauth-credential-storage-service';
import { db } from '../database';

const router = Router();

router.get('/automations/:id/details', clerkAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.headers['x-clerk-organization-id'] as string;
    
    // Fetch automation from database
    const automation = await db.query(
      'SELECT * FROM discovered_automations WHERE id = $1 AND organization_id = $2',
      [id, orgId]
    );
    
    if (automation.rows.length === 0) {
      return res.status(404).json({ error: 'Automation not found' });
    }
    
    const auto = automation.rows[0];
    const metadata = auto.platform_metadata || {};
    
    // Get OAuth credentials for this connection
    const credentials = await oauthCredentialStorage.getCredentials(auto.platform_connection_id);
    if (!credentials) {
      return res.status(500).json({ error: 'OAuth credentials not found' });
    }
    
    // Initialize services
    const directoryService = new GoogleDirectoryService(credentials);
    const scopeService = new OAuthScopeEnrichmentService(db);
    
    // Get token metadata
    const tokenMetadata = await directoryService.getTokenMetadata(
      metadata.createdBy,
      metadata.clientId
    );
    
    // Get user details
    const userDetails = await directoryService.getUserDetails(metadata.createdBy);
    
    // Enrich scopes
    const enrichedScopes = await scopeService.enrichScopes(
      metadata.permissions || [],
      new Date(metadata.createdAt),
      metadata.createdBy
    );
    
    // Build response
    const response = {
      id: auto.id,
      name: auto.name,
      platform: auto.platform,
      clientId: metadata.clientId,
      applicationType: tokenMetadata?.nativeApp ? 'native' : 'web',
      isVerified: !tokenMetadata?.anonymous,
      
      firstAuthorized: new Date(metadata.createdAt),
      authorizedBy: {
        email: userDetails?.email || metadata.createdBy,
        name: userDetails?.name || 'Unknown',
        isAdmin: userDetails?.isAdmin || false,
        isSuperAdmin: userDetails?.isSuperAdmin || false,
        department: userDetails?.department,
        orgUnit: userDetails?.orgUnitPath,
        title: userDetails?.title
      },
      
      permissions: enrichedScopes,
      
      // TODO: Add usage stats, activity timeline, access patterns
      usage: {
        totalEvents: 0,
        last7Days: 0,
        last30Days: 0,
        last90Days: 0,
        peakDay: { date: '', count: 0 },
        averageDailyUsage: 0,
        trend: { increasing: false, percentage: 0 }
      },
      
      activityTimeline: [],
      
      accessPatterns: {
        ipAddresses: [],
        accessTimes: {
          businessHours: 0,
          offHours: 0,
          weekends: 0,
          peakHour: 0
        },
        suspiciousIndicators: []
      },
      
      risk: {
        overallScore: metadata.riskLevel === 'high' ? 75 : 50,
        level: metadata.riskLevel?.toUpperCase() || 'MEDIUM',
        breakdown: {
          aiPlatformIntegration: metadata.isAIPlatform ? 30 : 0,
          highPrivilegeScopes: enrichedScopes.filter(s => s.riskLevel === 'HIGH').length * 15,
          adminUserAuthorization: userDetails?.isAdmin ? 10 : 0,
          usagePatterns: 0
        },
        gdprConcerns: enrichedScopes
          .filter(s => s.regulatoryImpact.gdpr)
          .map(s => `${s.service}: ${s.description}`),
        recommendations: [
          'Review scope necessity and consider least-privilege alternatives',
          'Implement regular access reviews',
          'Enable audit logging for all API access'
        ]
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching automation details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

---

## 6. Testing

```typescript
// backend/src/__tests__/routes/automation-details.test.ts

import request from 'supertest';
import { app } from '../../simple-server';
import { db } from '../../database';

describe('GET /api/automations/:id/details', () => {
  it('should return enriched OAuth app details', async () => {
    const response = await request(app)
      .get('/api/automations/test-automation-id/details')
      .set('Authorization', 'Bearer mock-token')
      .set('x-clerk-organization-id', 'org_test');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('applicationType');
    expect(response.body).toHaveProperty('isVerified');
    expect(response.body).toHaveProperty('authorizedBy');
    expect(response.body.authorizedBy).toHaveProperty('isAdmin');
    expect(response.body).toHaveProperty('permissions');
    expect(response.body.permissions[0]).toHaveProperty('riskScore');
    expect(response.body.permissions[0]).toHaveProperty('riskLevel');
  });
  
  it('should sort permissions by risk score descending', async () => {
    const response = await request(app)
      .get('/api/automations/test-automation-id/details')
      .set('Authorization', 'Bearer mock-token')
      .set('x-clerk-organization-id', 'org_test');
    
    const permissions = response.body.permissions;
    for (let i = 0; i < permissions.length - 1; i++) {
      expect(permissions[i].riskScore).toBeGreaterThanOrEqual(permissions[i + 1].riskScore);
    }
  });
});
```

---

## 7. Frontend Component (React)

```typescript
// frontend/src/components/automations/AutomationDetailsModal.tsx

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OAuthAppDetails } from '@saas-xray/shared-types';

interface Props {
  automationId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AutomationDetailsModal({ automationId, isOpen, onClose }: Props) {
  const [details, setDetails] = useState<OAuthAppDetails | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!isOpen) return;
    
    fetch(`/api/automations/${automationId}/details`)
      .then(res => res.json())
      .then(data => {
        setDetails(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [automationId, isOpen]);
  
  if (loading) return <div>Loading...</div>;
  if (!details) return <div>No details available</div>;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{details.name}</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">📊 Overview</TabsTrigger>
            <TabsTrigger value="permissions">🔒 Permissions</TabsTrigger>
            <TabsTrigger value="activity">📈 Activity</TabsTrigger>
            <TabsTrigger value="risk">⚠️ Risk</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Application Type</h3>
                <p>{details.applicationType === 'native' ? 'Mobile/Desktop App' : 'Web Application'}</p>
              </div>
              
              <div>
                <h3 className="font-semibold">Verification Status</h3>
                <p>{details.isVerified ? '✅ Verified' : '⚠️ Unverified'}</p>
              </div>
              
              <div>
                <h3 className="font-semibold">Authorized By</h3>
                <p>{details.authorizedBy.name} ({details.authorizedBy.email})</p>
                {details.authorizedBy.isAdmin && <span className="text-red-500">⚠️ Admin User</span>}
              </div>
              
              <div>
                <h3 className="font-semibold">Client ID</h3>
                <p className="font-mono text-sm">{details.clientId}</p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="permissions">
            <div className="space-y-4">
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(level => {
                const scopesAtLevel = details.permissions.filter(p => p.riskLevel === level);
                if (scopesAtLevel.length === 0) return null;
                
                return (
                  <div key={level}>
                    <h3 className="font-semibold text-lg mb-2">
                      {level} Risk ({scopesAtLevel.length} scopes)
                    </h3>
                    {scopesAtLevel.map(scope => (
                      <div key={scope.scope} className="border p-3 rounded mb-2">
                        <div className="font-mono text-sm">{scope.scope}</div>
                        <div className="text-gray-600">{scope.service} - {scope.accessLevel}</div>
                        <div className="text-sm mt-1">{scope.description}</div>
                        <div className="text-xs text-red-600 mt-1">
                          ⚠️ {scope.potentialAbuse.join(', ')}
                        </div>
                        {scope.recommendedAlternative && (
                          <div className="text-xs text-green-600 mt-1">
                            💡 Alternative: {scope.recommendedAlternative}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </TabsContent>
          
          <TabsContent value="activity">
            <div>Activity timeline coming soon...</div>
          </TabsContent>
          
          <TabsContent value="risk">
            <div className="space-y-4">
              <div>
                <h3 className="text-2xl font-bold">Risk Score: {details.risk.overallScore}/100</h3>
                <p className="text-lg">{details.risk.level}</p>
              </div>
              
              <div>
                <h3 className="font-semibold">GDPR Concerns</h3>
                <ul className="list-disc pl-5">
                  {details.risk.gdprConcerns.map((concern, i) => (
                    <li key={i}>{concern}</li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold">Recommendations</h3>
                <ul className="list-disc pl-5">
                  {details.risk.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 8. Deployment Checklist

- [ ] Run database migration: `npm run migrate:up`
- [ ] Verify scope library seeded: `SELECT COUNT(*) FROM oauth_scope_library;` (should be 15)
- [ ] Build shared-types: `npm run build:shared`
- [ ] Add new endpoint to routes: Import in `simple-server.ts`
- [ ] Test with Postman/curl
- [ ] Add frontend component
- [ ] Test end-to-end
- [ ] Deploy to staging
- [ ] Monitor logs for errors

---

**Estimated Implementation Time**: 8-16 hours for Phase 1 (basic enrichment)

**Next Steps**: Implement Phase 2 (usage statistics, activity timeline) in separate PR
