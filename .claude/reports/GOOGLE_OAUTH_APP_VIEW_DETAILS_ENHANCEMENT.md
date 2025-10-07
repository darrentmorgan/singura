# Google Workspace OAuth App "View Details" Enhancement: Complete API Research

**Date**: 2025-10-07  
**Priority**: P1  
**Status**: Complete - Comprehensive Research

---

## Executive Summary

This document provides a comprehensive analysis of ALL available Google Workspace API capabilities for enriching OAuth app metadata in the "View Details" section. Research covers Admin Reports API, Admin Directory API, Drive Activity API, and scope risk analysis.

### Current State vs Enhanced State

**What We Have Today:**
```json
{
  "name": "ChatGPT",
  "platform": "google",
  "riskLevel": "high",
  "createdAt": "2025-09-14",
  "createdBy": "darren@baliluxurystays.com",
  "permissions": [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "openid"
  ],
  "metadata": {
    "clientId": "77377267392-xxx.apps.googleusercontent.com",
    "platformName": "OpenAI / ChatGPT",
    "isAIPlatform": true,
    "authorizationAge": 22,
    "riskFactors": [
      "AI platform integration: openai",
      "4 OAuth scopes granted",
      "Google Drive access"
    ]
  }
}
```

**What We Can Add (Enhancement Opportunities):**

| Category | New Metadata | API Source | Implementation |
|----------|--------------|------------|----------------|
| **Activity Timeline** | Usage events, frequency, last activity | Admin Reports API | MEDIUM |
| **Detailed Permissions** | Scope descriptions, risk levels, alternatives | Scope Library | LOW |
| **Token Information** | Token type, native app flag, anonymous | Admin Directory API | LOW |
| **File Access Tracking** | Files accessed, sharing events | Drive Activity API | HIGH (new scope) |
| **User Context** | User roles, OUs, departments | Admin Directory API | LOW |
| **Usage Statistics** | Event counts, peak usage, patterns | Admin Reports API | MEDIUM |
| **Scope Evolution** | Added/removed scopes over time | Admin Reports API | MEDIUM |
| **Access Patterns** | IP addresses, geolocation, off-hours | Admin Reports API | MEDIUM |

---

## 1. Admin Reports API: Activity Analysis Capabilities

### 1.1 Token Event Names (Complete List)

**From**: https://developers.google.com/admin-sdk/reports/v1/appendix/activity/token

| Event Name | Description | Key Parameters | Use Case |
|------------|-------------|----------------|----------|
| `authorize` | User grants access to app | `app_name`, `client_id`, `scope` | First authorization tracking |
| `revoke` | Access removed from app | `app_name`, `client_id` | Deauthorization events |
| `request` | Access requested | `app_name`, `client_id` | Permission request tracking |
| `activity` | General app activity | `app_name`, `client_id`, `product_bucket` | Usage monitoring |

**Available Parameters Across Events:**
- `app_name`: Application display name
- `client_id`: Unique OAuth client identifier
- `client_type`: "WEB", "NATIVE_ANDROID", "IOS", etc.
- `scope`: Permissions granted/revoked (multiValue array)
- `scope_data`: Additional scope metadata
- `product_bucket`: Service used ("DRIVE", "GMAIL", "CALENDAR", etc.)
- `api_name`: Specific API accessed
- `method_name`: API method called

### 1.2 Usage Frequency Detection

**Implementation Strategy:**
```typescript
interface UsageFrequency {
  totalEvents: number;
  last7Days: number;
  last30Days: number;
  last90Days: number;
  peakDay: string; // ISO date
  averageDailyUsage: number;
  trendsAnalysis: {
    increasing: boolean;
    percentage: number;
  };
}

// Query Example
const usageStats = await getUsageFrequency({
  clientId: "77377267392-xxx.apps.googleusercontent.com",
  startTime: thirtyDaysAgo,
  endTime: now,
  applicationName: "token", // Token activity events
  eventName: "activity" // General usage events
});
```

**Data Available:**
- Event count by time period
- Activity patterns (daily, weekly, monthly)
- Peak usage detection
- Trend analysis (increasing/decreasing usage)

### 1.3 Activity Timeline Construction

**Timeline Event Types:**
```typescript
interface ActivityTimelineEvent {
  date: string; // ISO timestamp
  eventType: 'authorization' | 'revocation' | 'scope_change' | 'api_access' | 'file_access';
  user: string; // email
  action: string; // Human-readable
  details: string;
  metadata: {
    scopes?: string[];
    productBucket?: string;
    apiMethod?: string;
    ipAddress?: string;
  };
}
```

**Example Timeline:**
```json
{
  "activityTimeline": [
    {
      "date": "2025-10-06T14:23:00Z",
      "eventType": "api_access",
      "user": "darren@baliluxurystays.com",
      "action": "Drive API access",
      "details": "Accessed Drive files via ChatGPT",
      "metadata": {
        "productBucket": "DRIVE",
        "apiMethod": "files.list",
        "ipAddress": "203.45.67.89"
      }
    },
    {
      "date": "2025-09-14T09:15:00Z",
      "eventType": "authorization",
      "user": "darren@baliluxurystays.com",
      "action": "First authorization",
      "details": "Granted 4 OAuth scopes to ChatGPT",
      "metadata": {
        "scopes": [
          "https://www.googleapis.com/auth/drive.readonly",
          "https://www.googleapis.com/auth/userinfo.email",
          "https://www.googleapis.com/auth/userinfo.profile",
          "openid"
        ]
      }
    }
  ]
}
```

### 1.4 Scope Evolution Tracking

**Detection Method:**
1. Query all `authorize` events for clientId
2. Compare scope arrays over time
3. Detect additions/removals

```typescript
interface ScopeEvolution {
  originalScopes: string[]; // From first authorization
  currentScopes: string[];
  addedScopes: Array<{
    scope: string;
    addedDate: string;
    addedBy: string;
  }>;
  removedScopes: Array<{
    scope: string;
    removedDate: string;
  }>;
  scopeHistory: Array<{
    date: string;
    scopes: string[];
    changeType: 'added' | 'removed' | 'initial';
  }>;
}
```

**Risk Signal**: Recent scope additions (especially broad ones) = HIGH RISK

### 1.5 Access Pattern Analysis

**Detectable Patterns from Admin Reports API:**

```typescript
interface AccessPatterns {
  ipAddresses: Array<{
    ip: string;
    country?: string; // If geolocation available
    firstSeen: string;
    lastSeen: string;
    requestCount: number;
  }>;
  accessTimes: {
    businessHours: number; // 9am-5pm local time
    offHours: number; // Outside business hours
    weekends: number;
    peakHour: number; // 0-23
  };
  geographicDistribution: {
    primaryLocation: string;
    secondaryLocations: string[];
    unusualLocations: string[]; // Different from user's normal pattern
  };
  suspiciousIndicators: string[]; // e.g., "Multiple IPs in short time", "Access from unusual country"
}
```

**Implementation Complexity**: MEDIUM (requires IP geolocation enrichment)

---

## 2. Admin Directory API: Token & User Enrichment

### 2.1 Token Metadata (admin.directory.v1.tokens)

**Endpoint**: `GET /admin/directory/v1/users/{userKey}/tokens`

**Complete Token Object Schema:**
```typescript
interface GoogleOAuthToken {
  // Core identification
  clientId: string;
  displayText: string; // Human-readable app name
  scopes: string[];
  
  // Additional metadata we can extract
  kind: string; // "admin#directory#token"
  etag: string; // Version tag
  
  // Token characteristics
  anonymous: boolean; // Is this an unverified app?
  nativeApp: boolean; // Is this a mobile/desktop app?
  
  // User context
  userKey: string; // User ID who authorized
  
  // NOTE: No "lastUsed" or "createdAt" in token API
}
```

**Enhancement Opportunities:**
- **Native App Detection**: Flag mobile/desktop apps vs web apps
- **Anonymous App Warning**: Detect unverified apps (higher risk)
- **User Association**: Link token to specific user details

### 2.2 User Context Enrichment

**Endpoint**: `GET /admin/directory/v1/users/{userKey}`

**User Metadata We Can Add:**
```typescript
interface UserContext {
  // Role & permissions
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isDelegatedAdmin: boolean;
  
  // Organizational context
  orgUnitPath: string; // e.g., "/Engineering/Backend"
  department: string;
  title: string;
  
  // Account status
  suspended: boolean;
  archived: boolean;
  lastLoginTime: string;
  
  // Contact
  primaryEmail: string;
  aliases: string[];
  
  // Risk context
  agreedToTerms: boolean;
  changePasswordAtNextLogin: boolean;
}
```

**Risk Enhancement Example:**
```typescript
// BEFORE
riskFactors: ["AI platform integration: openai", "4 OAuth scopes granted", "Google Drive access"]

// AFTER (with user context)
riskFactors: [
  "AI platform integration: openai",
  "4 OAuth scopes granted", 
  "Google Drive access",
  "Authorized by Admin user", // NEW: High-privilege user
  "User in Engineering department", // NEW: Department context
  "Mobile app (native)", // NEW: App type
  "Unverified app (anonymous)" // NEW: Verification status
]
```

---

## 3. Drive Activity API: File Access Tracking

**Status**: ⚠️ REQUIRES NEW SCOPE

### 3.1 Required Scope

**Current Scopes:**
- ✅ `https://www.googleapis.com/auth/admin.reports.audit.readonly`
- ✅ `https://www.googleapis.com/auth/admin.directory.user.readonly`
- ✅ `https://www.googleapis.com/auth/drive.metadata.readonly`

**Additional Scope Needed:**
- ❌ `https://www.googleapis.com/auth/drive.activity.readonly` (NOT CURRENTLY GRANTED)

### 3.2 Drive Activity API Capabilities

**Endpoint**: `POST /v2/activity:query`

**What We Could Track (If Scope Added):**
```typescript
interface DriveAccessByApp {
  filesAccessed: Array<{
    fileId: string;
    fileName: string;
    fileType: string; // "document", "spreadsheet", "presentation"
    action: 'view' | 'download' | 'edit' | 'share';
    timestamp: string;
    actor: {
      type: 'user' | 'application';
      appId?: string; // OAuth app that accessed file
      userId?: string;
    };
  }>;
  
  sharingEvents: Array<{
    fileId: string;
    sharedWith: string; // email or "anyone"
    permission: 'view' | 'edit' | 'comment';
    sharedBy: string;
    timestamp: string;
  }>;
  
  summary: {
    totalFilesAccessed: number;
    documentsAccessed: number;
    spreadsheetsAccessed: number;
    sensitiveFilesAccessed: number; // Based on file naming patterns
    externalSharingEvents: number;
  };
}
```

**Implementation Complexity**: HIGH
- Requires new OAuth scope addition
- Requires re-authorization from users
- Significant API overhead (Drive Activity is verbose)

**Recommendation**: DEFER to Phase 2 (Nice-to-have, not critical for MVP)

---

## 4. Comprehensive OAuth Scope Risk Library

### 4.1 Scope Categorization & Risk Analysis

Based on research from https://developers.google.com/identity/protocols/oauth2/scopes:

#### **4.1.1 CRITICAL Risk Scopes**

| Scope | Service | Access | Data Types | Risk Factors | Alternatives |
|-------|---------|--------|------------|--------------|--------------|
| `https://mail.google.com/` | Gmail | Full read/write/send | All emails, drafts, settings | Can read sensitive emails, send as user, delete evidence | `gmail.readonly`, `gmail.send` (specific) |
| `https://www.googleapis.com/auth/admin.directory.user` | Workspace Admin | Full user management | Create/delete users, reset passwords | Complete admin control, account takeover risk | `admin.directory.user.readonly` |
| `https://www.googleapis.com/auth/admin.directory.device.chromeos` | Chrome OS Admin | Device management | Full device control | Can wipe devices, install software | `admin.directory.device.chromeos.readonly` |

#### **4.1.2 HIGH Risk Scopes**

| Scope | Service | Access | Data Types | Risk Factors | Alternatives |
|-------|---------|--------|------------|--------------|--------------|
| `https://www.googleapis.com/auth/drive` | Drive | Full read/write/delete | All files, folders, shared drives | Unlimited file access, data exfiltration | `drive.file` (app-created only) |
| `https://www.googleapis.com/auth/drive.readonly` | Drive | Read-only | All files and folders | Can read all documents, including shared | `drive.metadata.readonly` |
| `https://www.googleapis.com/auth/calendar` | Calendar | Full calendar access | All events, attendees, locations | Meeting intelligence, schedule tracking | `calendar.readonly` |
| `https://www.google.com/m8/feeds` | Contacts | Full contact management | All contact data | Mass contact harvesting | Contacts readonly (if exists) |

#### **4.1.3 MEDIUM Risk Scopes**

| Scope | Service | Access | Data Types | Risk Factors | Alternatives |
|-------|---------|--------|------------|--------------|--------------|
| `https://www.googleapis.com/auth/calendar.readonly` | Calendar | Read-only | All calendar events | Can track user schedule, meetings | `calendar.events.readonly` |
| `https://www.googleapis.com/auth/gmail.readonly` | Gmail | Read-only emails | All email content | Can read sensitive communications | `gmail.metadata` |
| `https://www.googleapis.com/auth/drive.file` | Drive | App-created files only | Files created by this app | Limited scope, lower risk | Most restrictive Drive option |
| `https://www.googleapis.com/auth/userinfo.profile` | OAuth | Profile info | Name, picture, locale | Basic identity, low sensitivity | None needed (minimal scope) |

#### **4.1.4 LOW Risk Scopes**

| Scope | Service | Access | Data Types | Risk Factors | Alternatives |
|-------|---------|--------|------------|--------------|--------------|
| `https://www.googleapis.com/auth/userinfo.email` | OAuth | Email address | User's email | Identity only, no content | None (minimal) |
| `openid` | OAuth | OpenID Connect | User ID | Authentication only | None (standard) |
| `https://www.googleapis.com/auth/drive.metadata.readonly` | Drive | File metadata | File names, types, owners | No content access | None (most restrictive) |

### 4.2 Scope Risk Scoring Algorithm

```typescript
interface ScopeRiskAnalysis {
  scope: string;
  service: string;
  accessLevel: 'read-only' | 'read-write' | 'admin';
  dataAccess: string[];
  riskScore: number; // 0-100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskJustification: string;
  commonUseCases: string[];
  potentialAbuse: string[];
  recommendedAlternative?: string;
  regulatoryImpact: {
    gdpr: boolean; // PII access
    hipaa: boolean; // Health data
    pci: boolean; // Payment data (if Gmail/Drive)
  };
}

// Scoring Logic
function calculateScopeRisk(scope: string): number {
  let score = 0;
  
  // Base scores by service
  if (scope.includes('admin')) score += 40; // Admin access
  if (scope.includes('mail.google.com')) score += 35; // Full Gmail
  if (scope.includes('drive') && !scope.includes('readonly') && !scope.includes('file')) score += 30; // Full Drive
  
  // Access level adjustments
  if (scope.includes('readonly')) score -= 15;
  if (scope.includes('metadata')) score -= 10;
  
  // Specific high-risk patterns
  if (scope.includes('device')) score += 25; // Device management
  if (scope.includes('security')) score += 25; // Security settings
  if (scope === 'openid' || scope.includes('userinfo')) score = Math.max(score, 10); // Basic scopes
  
  return Math.min(score, 100); // Cap at 100
}
```

### 4.3 Scope Description Enrichment

**Enhanced Permission Display Example:**

```typescript
// Current (minimal)
{
  "scope": "https://www.googleapis.com/auth/drive.readonly",
  "granted": true
}

// Enhanced (rich metadata)
{
  "scope": "https://www.googleapis.com/auth/drive.readonly",
  "service": "Google Drive",
  "accessLevel": "Read-only",
  "dataTypes": ["Documents", "Spreadsheets", "Presentations", "Files", "Folders", "Shared Drives"],
  "riskLevel": "HIGH",
  "riskScore": 65,
  "description": "Can read all files and folders in Google Drive, including shared items from other users",
  "justification": "Provides access to potentially sensitive documents across entire organization",
  "commonUses": [
    "File backup and sync applications",
    "Document search and indexing",
    "Content management systems"
  ],
  "potentialAbuse": [
    "Mass document exfiltration",
    "Intellectual property theft",
    "Access to confidential business data",
    "Reading shared files from other users"
  ],
  "recommendedAlternative": "drive.metadata.readonly (file names only) or drive.file (app-created files only)",
  "regulatoryImpact": {
    "gdpr": true, // May contain PII in documents
    "hipaa": false,
    "pci": false
  },
  "grantedDate": "2025-09-14",
  "grantedBy": "darren@baliluxurystays.com",
  "lastUsed": null, // Not available from Google API
  "usageDetected": true, // From audit logs
  "usageCount": 47 // From audit logs
}
```

---

## 5. Implementation Roadmap

### Phase 1: Quick Wins (1-2 days) - Already Accessible Data

**What to implement:**
- ✅ Enhanced scope descriptions from scope library
- ✅ Token metadata (native app, anonymous flags) from Directory API
- ✅ User context enrichment (role, department, OU)
- ✅ Basic activity timeline from existing audit logs

**Implementation:**
1. Build scope risk library (JSON file or database table)
2. Add Directory API token fetch in discovery flow
3. Add Directory API user fetch for creator context
4. Parse existing audit log data for timeline

**Complexity**: LOW  
**Effort**: 8-16 hours  
**Value**: HIGH (immediate UX improvement)

### Phase 2: Medium Complexity (3-5 days) - Correlation & Aggregation

**What to implement:**
- ✅ Usage frequency statistics (event counting)
- ✅ Scope evolution tracking (historical comparison)
- ✅ Access pattern analysis (IP, timing)
- ✅ Advanced activity timeline with aggregations

**Implementation:**
1. Build audit log aggregation queries
2. Implement scope diff algorithm
3. Add IP geolocation enrichment (MaxMind GeoIP2)
4. Create timeline construction service

**Complexity**: MEDIUM  
**Effort**: 24-40 hours  
**Value**: MEDIUM (good insights, not critical)

### Phase 3: Advanced Features (1-2 weeks) - New Scopes & Complex Logic

**What to implement:**
- ⚠️ Drive Activity API integration (requires new scope)
- ⚠️ File access tracking
- ⚠️ Advanced ML-based anomaly detection

**Implementation:**
1. Request new OAuth scope (requires re-auth)
2. Build Drive Activity query service
3. Correlate file access with OAuth apps
4. Train anomaly detection models

**Complexity**: HIGH  
**Effort**: 80-120 hours  
**Value**: LOW for MVP (nice-to-have, defer to post-launch)

---

## 6. UI/UX Recommendations

### 6.1 View Details Modal Structure

**Recommended Tab Layout:**

```
┌─────────────────────────────────────────────────────────┐
│  ChatGPT (OpenAI)                              [X]      │
│  ─────────────────────────────────────────────────────  │
│  📊 Overview  │  🔒 Permissions  │  📈 Activity  │  ⚠️ Risk  │
│  ─────────────────────────────────────────────────────  │
│                                                          │
│  [TAB CONTENT AREA]                                     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 6.2 Overview Tab

```
Platform: Google Workspace
Client ID: 77377267392-xxx.apps.googleusercontent.com
Application Type: Web Application

First Authorized: Sep 14, 2025 (22 days ago)
Authorized By: darren@baliluxurystays.com (Admin)
Department: Engineering
Last Activity: 2 hours ago

Usage Statistics:
├─ Total Events: 127
├─ Last 7 Days: 23 events
├─ Last 30 Days: 89 events
└─ Peak Day: Sep 28, 2025 (14 events)
```

### 6.3 Permissions Tab

**Grouped by Risk Level:**

```
CRITICAL RISK (0 scopes)
  [None]

HIGH RISK (1 scope)
  🔴 https://www.googleapis.com/auth/drive.readonly
     Google Drive - Read-only access to all files
     ⚠️ Can access all documents, including shared files
     📅 Granted: Sep 14, 2025
     🔄 Usage: 47 API calls detected
     💡 Alternative: drive.metadata.readonly

MEDIUM RISK (0 scopes)
  [None]

LOW RISK (3 scopes)
  🟢 https://www.googleapis.com/auth/userinfo.email
     OAuth - Email address only
     📅 Granted: Sep 14, 2025
     
  🟢 https://www.googleapis.com/auth/userinfo.profile
     OAuth - Profile information
     📅 Granted: Sep 14, 2025
     
  🟢 openid
     OAuth - OpenID Connect authentication
     📅 Granted: Sep 14, 2025

[Expand All] [Collapse All] [Export Permissions]
```

### 6.4 Activity Tab

**Timeline View:**

```
Recent Activity Timeline

Oct 6, 2025 14:23:00
├─ API Access
├─ Drive files.list() called
├─ User: darren@baliluxurystays.com
└─ IP: 203.45.67.89 (Australia)

Oct 5, 2025 09:15:00
├─ API Access
├─ Drive files.list() called
└─ IP: 203.45.67.89 (Australia)

Sep 14, 2025 09:15:00
├─ First Authorization
├─ Granted 4 OAuth scopes
├─ User: darren@baliluxurystays.com
└─ IP: 203.45.67.89 (Australia)

Access Patterns:
├─ Unique IPs: 1
├─ Primary Location: Australia
├─ Business Hours: 78%
├─ Off-Hours: 22%
└─ Weekend Activity: 5%

[Show All Events] [Export Timeline]
```

### 6.5 Risk Tab

```
Overall Risk Score: 72/100 (HIGH)

Risk Breakdown:

AI Platform Integration (30 points)
├─ Detected as OpenAI/ChatGPT
├─ Third-party AI service
└─ Data exfiltration risk

High-Privilege Scopes (25 points)
├─ drive.readonly: Access to all files
└─ Can read sensitive documents

Admin User Authorization (10 points)
├─ Authorized by admin user
└─ Elevated permissions granted

Usage Patterns (7 points)
├─ Regular usage detected (127 events)
└─ No suspicious patterns

GDPR Compliance Concerns:
├─ May process personal data from Drive files
├─ Third-party data processor (OpenAI)
└─ Data residency: Unknown

Recommended Actions:
1. Review scope necessity - Consider drive.metadata.readonly
2. Implement data classification for Drive files
3. Add DPA (Data Processing Agreement) with OpenAI
4. Enable audit logging for all file access

[View Detailed Risk Analysis] [Generate Compliance Report]
```

---

## 7. Code Implementation Examples

### 7.1 Scope Risk Library (Database Schema)

```sql
CREATE TABLE oauth_scope_library (
  scope_url VARCHAR(500) PRIMARY KEY,
  service_name VARCHAR(100) NOT NULL,
  access_level VARCHAR(50) NOT NULL, -- 'read-only', 'read-write', 'admin'
  data_types JSONB NOT NULL, -- ["Documents", "Spreadsheets", ...]
  risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level VARCHAR(20) NOT NULL, -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  description TEXT NOT NULL,
  justification TEXT NOT NULL,
  common_uses JSONB NOT NULL,
  potential_abuse JSONB NOT NULL,
  recommended_alternative VARCHAR(500),
  regulatory_impact JSONB NOT NULL, -- { gdpr: true, hipaa: false, ... }
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed data example
INSERT INTO oauth_scope_library VALUES (
  'https://www.googleapis.com/auth/drive.readonly',
  'Google Drive',
  'read-only',
  '["Documents", "Spreadsheets", "Presentations", "Files", "Folders", "Shared Drives"]',
  65,
  'HIGH',
  'Read-only access to all files and folders in Google Drive, including items shared by other users',
  'Provides broad access to potentially sensitive documents across entire organization',
  '["File backup and sync applications", "Document search and indexing", "Content management systems"]',
  '["Mass document exfiltration", "Intellectual property theft", "Access to confidential business data"]',
  'drive.metadata.readonly',
  '{"gdpr": true, "hipaa": false, "pci": false}',
  NOW(),
  NOW()
);
```

### 7.2 Usage Frequency Calculation Service

```typescript
// backend/src/services/oauth-app-usage-analyzer.service.ts

import { google } from 'googleapis';
import { GoogleOAuthCredentials } from '@saas-xray/shared-types';

interface UsageStatistics {
  totalEvents: number;
  last7Days: number;
  last30Days: number;
  last90Days: number;
  peakDay: { date: string; count: number };
  averageDailyUsage: number;
  trend: { increasing: boolean; percentage: number };
}

export class OAuthAppUsageAnalyzerService {
  async analyzeUsage(
    credentials: GoogleOAuthCredentials,
    clientId: string
  ): Promise<UsageStatistics> {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken
    });

    const reports = google.admin({ version: 'reports_v1', auth });

    // Query token activity events for this client ID
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const response = await reports.activities.list({
      userKey: 'all',
      applicationName: 'token',
      startTime: ninetyDaysAgo.toISOString(),
      endTime: now.toISOString(),
      filters: `client_id==${clientId}`,
      maxResults: 1000
    });

    const activities = response.data.items || [];

    // Aggregate by day
    const dailyCounts = new Map<string, number>();
    for (const activity of activities) {
      const date = activity.id?.time?.split('T')[0];
      if (date) {
        dailyCounts.set(date, (dailyCounts.get(date) || 0) + 1);
      }
    }

    // Calculate statistics
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const last7Days = activities.filter(a => 
      new Date(a.id?.time!) >= sevenDaysAgo
    ).length;

    const last30Days = activities.filter(a => 
      new Date(a.id?.time!) >= thirtyDaysAgo
    ).length;

    // Find peak day
    let peakDay = { date: '', count: 0 };
    for (const [date, count] of dailyCounts.entries()) {
      if (count > peakDay.count) {
        peakDay = { date, count };
      }
    }

    // Trend analysis (compare last 30 days vs previous 30 days)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const previous30Days = activities.filter(a => {
      const date = new Date(a.id?.time!);
      return date >= sixtyDaysAgo && date < thirtyDaysAgo;
    }).length;

    const trendPercentage = previous30Days > 0
      ? ((last30Days - previous30Days) / previous30Days) * 100
      : 0;

    return {
      totalEvents: activities.length,
      last7Days,
      last30Days,
      last90Days: activities.length,
      peakDay,
      averageDailyUsage: activities.length / 90,
      trend: {
        increasing: trendPercentage > 0,
        percentage: Math.abs(trendPercentage)
      }
    };
  }
}
```

### 7.3 Activity Timeline Builder

```typescript
// backend/src/services/oauth-app-timeline-builder.service.ts

interface TimelineEvent {
  timestamp: Date;
  eventType: 'authorization' | 'revocation' | 'scope_change' | 'api_access';
  user: string;
  action: string;
  details: string;
  metadata: Record<string, any>;
}

export class OAuthAppTimelineBuilderService {
  async buildTimeline(
    credentials: GoogleOAuthCredentials,
    clientId: string
  ): Promise<TimelineEvent[]> {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken
    });

    const reports = google.admin({ version: 'reports_v1', auth });

    // Fetch all events for this OAuth app
    const response = await reports.activities.list({
      userKey: 'all',
      applicationName: 'token',
      filters: `client_id==${clientId}`,
      maxResults: 1000
    });

    const activities = response.data.items || [];
    const timeline: TimelineEvent[] = [];

    for (const activity of activities) {
      const eventName = activity.events?.[0]?.name || '';
      const parameters = this.extractParameters(activity.events || []);

      let timelineEvent: TimelineEvent;

      if (eventName === 'authorize') {
        timelineEvent = {
          timestamp: new Date(activity.id?.time!),
          eventType: 'authorization',
          user: activity.actor?.email || 'Unknown',
          action: 'OAuth authorization',
          details: `Granted ${parameters.scope?.length || 0} scopes`,
          metadata: {
            scopes: parameters.scope || [],
            clientType: parameters.client_type,
            ipAddress: activity.ipAddress
          }
        };
      } else if (eventName === 'revoke') {
        timelineEvent = {
          timestamp: new Date(activity.id?.time!),
          eventType: 'revocation',
          user: activity.actor?.email || 'Unknown',
          action: 'OAuth revoked',
          details: 'Access removed from application',
          metadata: {
            ipAddress: activity.ipAddress
          }
        };
      } else if (eventName === 'activity') {
        timelineEvent = {
          timestamp: new Date(activity.id?.time!),
          eventType: 'api_access',
          user: activity.actor?.email || 'Unknown',
          action: `${parameters.product_bucket} API access`,
          details: `Method: ${parameters.method_name || 'unknown'}`,
          metadata: {
            productBucket: parameters.product_bucket,
            apiName: parameters.api_name,
            methodName: parameters.method_name,
            ipAddress: activity.ipAddress
          }
        };
      } else {
        continue; // Skip unknown event types
      }

      timeline.push(timelineEvent);
    }

    // Sort by timestamp descending (most recent first)
    timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return timeline;
  }

  private extractParameters(events: any[]): Record<string, any> {
    const params: Record<string, any> = {};
    for (const event of events) {
      for (const param of event.parameters || []) {
        if (param.multiValue) {
          params[param.name] = param.multiValue;
        } else if (param.value) {
          params[param.name] = param.value;
        } else if (param.intValue) {
          params[param.name] = param.intValue;
        } else if (param.boolValue !== undefined) {
          params[param.name] = param.boolValue;
        }
      }
    }
    return params;
  }
}
```

### 7.4 Scope Enrichment Service

```typescript
// backend/src/services/oauth-scope-enrichment.service.ts

interface EnrichedScope {
  scope: string;
  service: string;
  accessLevel: string;
  dataTypes: string[];
  riskScore: number;
  riskLevel: string;
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

export class OAuthScopeEnrichmentService {
  constructor(private db: DatabaseAdapter) {}

  async enrichScopes(
    scopes: string[],
    grantedDate: Date,
    grantedBy: string,
    clientId: string
  ): Promise<EnrichedScope[]> {
    const enriched: EnrichedScope[] = [];

    for (const scope of scopes) {
      // Fetch scope metadata from library
      const scopeData = await this.db.query(
        'SELECT * FROM oauth_scope_library WHERE scope_url = $1',
        [scope]
      );

      if (scopeData.rows.length === 0) {
        // Fallback for unknown scopes
        enriched.push({
          scope,
          service: 'Unknown',
          accessLevel: 'Unknown',
          dataTypes: [],
          riskScore: 50,
          riskLevel: 'MEDIUM',
          description: 'Scope not in library',
          justification: 'Unknown scope - requires manual review',
          commonUses: [],
          potentialAbuse: [],
          regulatoryImpact: { gdpr: false, hipaa: false, pci: false },
          grantedDate,
          grantedBy
        });
        continue;
      }

      const libraryData = scopeData.rows[0];

      // Get usage count from audit logs
      const usageCount = await this.getScopeUsageCount(clientId, scope);

      enriched.push({
        scope,
        service: libraryData.service_name,
        accessLevel: libraryData.access_level,
        dataTypes: libraryData.data_types,
        riskScore: libraryData.risk_score,
        riskLevel: libraryData.risk_level,
        description: libraryData.description,
        justification: libraryData.justification,
        commonUses: libraryData.common_uses,
        potentialAbuse: libraryData.potential_abuse,
        recommendedAlternative: libraryData.recommended_alternative,
        regulatoryImpact: libraryData.regulatory_impact,
        grantedDate,
        grantedBy,
        usageCount
      });
    }

    // Sort by risk score descending
    enriched.sort((a, b) => b.riskScore - a.riskScore);

    return enriched;
  }

  private async getScopeUsageCount(clientId: string, scope: string): Promise<number> {
    // Query audit logs for usage of this specific scope
    // This would require correlating API calls with scopes
    // Simplified example - return 0 if not implemented
    return 0;
  }
}
```

---

## 8. API Endpoints Design

### 8.1 Enhanced Metadata Endpoint

```typescript
// GET /api/automations/:id/details

interface OAuthAppDetailsResponse {
  // Basic info
  id: string;
  name: string;
  platform: 'google';
  clientId: string;
  applicationType: 'web' | 'native' | 'unknown';
  isVerified: boolean; // From Directory API anonymous flag
  
  // Authorization info
  firstAuthorized: Date;
  authorizedBy: {
    email: string;
    name: string;
    isAdmin: boolean;
    department?: string;
    orgUnit?: string;
  };
  
  // Usage statistics
  usage: {
    totalEvents: number;
    last7Days: number;
    last30Days: number;
    last90Days: number;
    peakDay: { date: string; count: number };
    averageDailyUsage: number;
    trend: { increasing: boolean; percentage: number };
  };
  
  // Access patterns
  accessPatterns: {
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
  };
  
  // Permissions (enriched)
  permissions: Array<{
    scope: string;
    service: string;
    accessLevel: string;
    dataTypes: string[];
    riskScore: number;
    riskLevel: string;
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
    usageCount?: number;
  }>;
  
  // Activity timeline
  activityTimeline: Array<{
    timestamp: Date;
    eventType: 'authorization' | 'revocation' | 'scope_change' | 'api_access';
    user: string;
    action: string;
    details: string;
    metadata: Record<string, any>;
  }>;
  
  // Scope evolution
  scopeEvolution: {
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
  };
  
  // Risk assessment
  risk: {
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
  };
}
```

---

## 9. Summary & Recommendations

### 9.1 Key Findings

✅ **Available Today (No New Scopes):**
- Token metadata (native app, anonymous flags)
- User context (role, department, OU)
- Usage frequency statistics
- Activity timeline
- Scope evolution tracking
- Access pattern analysis (IP, timing)
- Enhanced scope descriptions via library

⚠️ **Requires New Scope:**
- Drive Activity API (file access tracking)
- Requires `drive.activity.readonly` scope
- High implementation effort
- Low MVP priority

### 9.2 Implementation Priority

**PHASE 1 (Week 1): Quick Wins**
1. Build OAuth scope risk library (database table + seed data)
2. Enhance existing metadata extraction with Directory API
3. Add user context enrichment
4. Implement basic activity timeline

**PHASE 2 (Week 2): Analytics & Insights**
1. Usage frequency calculation
2. Scope evolution tracking
3. Access pattern analysis
4. Enhanced risk scoring

**PHASE 3 (Future): Advanced Features**
1. Drive Activity API integration (defer)
2. ML-based anomaly detection (defer)
3. Predictive risk modeling (defer)

### 9.3 Success Metrics

**User Experience:**
- "View Details" modal shows 10+ new data points
- Scope descriptions include risk levels and alternatives
- Activity timeline shows historical authorization events
- Risk analysis provides actionable recommendations

**Technical:**
- No additional OAuth scopes required for Phase 1-2
- Minimal API overhead (reuse existing audit log queries)
- Database schema supports all new metadata
- All new fields properly typed in @saas-xray/shared-types

**Business:**
- Differentiation from competitors (richer OAuth app intelligence)
- Compliance value (GDPR/SOC2 audit evidence)
- Customer trust (transparent risk analysis)

---

## 10. References & Resources

**Google API Documentation:**
- Admin Reports API: https://developers.google.com/admin-sdk/reports/reference/rest/v1/activities/list
- Admin Directory Tokens API: https://developers.google.com/admin-sdk/directory/reference/rest/v1/tokens
- OAuth Scopes Catalog: https://developers.google.com/identity/protocols/oauth2/scopes
- Token Events: https://developers.google.com/admin-sdk/reports/v1/appendix/activity/token
- Drive Events: https://developers.google.com/admin-sdk/reports/v1/appendix/activity/drive
- Drive Activity API: https://developers.google.com/drive/activity/v2/reference/rest

**Implementation Files:**
- Current metadata extraction: `backend/src/services/google-api-client-service.ts`
- Discovery service: `backend/src/connectors/google.ts`
- AI detection: `backend/src/services/detection/google-oauth-ai-detector.service.ts`
- Shared types: `shared-types/src/models/automation.ts`
- Database schema: `discovered_automations.platform_metadata` (JSONB)

**Related Documentation:**
- Previous research: `.claude/reports/GOOGLE_OAUTH_METADATA_RESEARCH.md`
- OAuth pitfalls: `.claude/PITFALLS.md`
- Architecture: `.claude/ARCHITECTURE.md`

---

**Status**: ✅ Research Complete  
**Next Steps**: Review with team, prioritize Phase 1 implementation  
**Owner**: Development Team  
**Updated**: 2025-10-07
