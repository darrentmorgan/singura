# OAuth App Risk Analysis Algorithms: Complete Design Document

**Date**: 2025-10-07  
**Priority**: P1  
**Status**: Design Complete - Ready for Implementation  
**Complements**: GOOGLE_OAUTH_APP_VIEW_DETAILS_ENHANCEMENT.md

---

## Executive Summary

This document provides comprehensive algorithmic designs for multi-dimensional risk scoring of OAuth applications in the "View Details" Risk Analysis tab. The algorithms leverage 10+ metadata fields identified in OAuth research to calculate sophisticated, actionable risk scores with high confidence.

**Design Goals:**
- Multi-dimensional risk scoring (5 dimensions)
- Actionable risk factors (not just "high risk")
- Smart recommendations with implementation steps
- Anomaly detection with thresholds
- >95% detection accuracy, <5% false positive rate

**Available Data Inputs:**
1. OAuth scope library (15+ scopes with risk scores 5-95)
2. Usage statistics (events in 7d, 30d, 90d)
3. Activity patterns (peak days, time-of-day, frequency)
4. User context (admin status, department, role)
5. Scope evolution (added/removed scopes over time)
6. Access patterns (IP addresses, geolocation)
7. Temporal signals (first auth, last activity, dormancy)

---

## 1. Multi-Dimensional Risk Scoring Algorithm

### 1.1 Core Risk Model

```typescript
interface RiskDimensions {
  permissionRisk: number;     // 0-100 (from scope library)
  activityRisk: number;       // 0-100 (usage patterns)
  temporalRisk: number;       // 0-100 (dormancy, sudden changes)
  userRisk: number;           // 0-100 (admin users, external users)
  aiPlatformRisk: number;     // 0-100 (AI detection confidence)
}

interface RiskScore {
  overall: number;            // Weighted average
  dimensions: RiskDimensions;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;         // How confident are we? (0-100)
  breakdown: RiskBreakdown[];
  assessedAt: Date;
}

interface RiskBreakdown {
  dimension: keyof RiskDimensions;
  score: number;
  weight: number;
  contribution: number;       // score * weight
  factors: string[];
}
```

### 1.2 Weighting Strategy

**Recommended Weights:**
```typescript
const RISK_WEIGHTS = {
  aiPlatformRisk: 0.30,      // 30% - Highest impact
  permissionRisk: 0.25,      // 25% - Broad data access
  activityRisk: 0.20,        // 20% - Behavioral anomalies
  userRisk: 0.15,            // 15% - Authorization context
  temporalRisk: 0.10         // 10% - Time-based signals
};

// Total: 100% (1.00)
```

**Rationale:**
- **AI Platform Risk**: Highest weight because AI platforms pose unique data exfiltration risks
- **Permission Risk**: Second highest because broad scopes = broad exposure
- **Activity Risk**: Behavioral anomalies indicate potential compromise
- **User Risk**: Admin users authorizing apps = elevated privileges
- **Temporal Risk**: Time signals are important but lower priority

### 1.3 Overall Risk Calculation

```typescript
function calculateEnhancedRisk(
  metadata: OAuthAppMetadata,
  auditActivity: AuditEvent[],
  scopeLibrary: ScopeLibrary
): RiskScore {
  // Calculate each dimension
  const permissionRisk = calculatePermissionRisk(metadata.scopes, scopeLibrary);
  const activityRisk = calculateActivityRisk(auditActivity, metadata.firstAuthorized);
  const temporalRisk = calculateTemporalRisk(metadata, auditActivity);
  const userRisk = calculateUserRisk(metadata.authorizedBy);
  const aiPlatformRisk = calculateAIPlatformRisk(metadata);

  const dimensions: RiskDimensions = {
    permissionRisk: permissionRisk.totalScore,
    activityRisk: activityRisk.totalScore,
    temporalRisk: temporalRisk.totalScore,
    userRisk: userRisk.totalScore,
    aiPlatformRisk: aiPlatformRisk.totalScore
  };

  // Weighted average
  const overall = 
    (dimensions.permissionRisk * RISK_WEIGHTS.permissionRisk) +
    (dimensions.activityRisk * RISK_WEIGHTS.activityRisk) +
    (dimensions.temporalRisk * RISK_WEIGHTS.temporalRisk) +
    (dimensions.userRisk * RISK_WEIGHTS.userRisk) +
    (dimensions.aiPlatformRisk * RISK_WEIGHTS.aiPlatformRisk);

  // Determine severity
  const severity = classifySeverity(overall);

  // Calculate confidence based on data quality
  const confidence = calculateConfidence({
    hasAuditData: auditActivity.length > 0,
    hasScopeData: metadata.scopes.length > 0,
    hasUserData: !!metadata.authorizedBy,
    hasTemporalData: !!metadata.firstAuthorized,
    dataAge: daysSince(metadata.firstAuthorized)
  });

  return {
    overall: Math.round(overall),
    dimensions,
    severity,
    confidence,
    breakdown: [
      {
        dimension: 'aiPlatformRisk',
        score: dimensions.aiPlatformRisk,
        weight: RISK_WEIGHTS.aiPlatformRisk,
        contribution: dimensions.aiPlatformRisk * RISK_WEIGHTS.aiPlatformRisk,
        factors: aiPlatformRisk.concerns
      },
      {
        dimension: 'permissionRisk',
        score: dimensions.permissionRisk,
        weight: RISK_WEIGHTS.permissionRisk,
        contribution: dimensions.permissionRisk * RISK_WEIGHTS.permissionRisk,
        factors: permissionRisk.concerns
      },
      {
        dimension: 'activityRisk',
        score: dimensions.activityRisk,
        weight: RISK_WEIGHTS.activityRisk,
        contribution: dimensions.activityRisk * RISK_WEIGHTS.activityRisk,
        factors: activityRisk.concerns
      },
      {
        dimension: 'userRisk',
        score: dimensions.userRisk,
        weight: RISK_WEIGHTS.userRisk,
        contribution: dimensions.userRisk * RISK_WEIGHTS.userRisk,
        factors: userRisk.concerns
      },
      {
        dimension: 'temporalRisk',
        score: dimensions.temporalRisk,
        weight: RISK_WEIGHTS.temporalRisk,
        contribution: dimensions.temporalRisk * RISK_WEIGHTS.temporalRisk,
        factors: temporalRisk.concerns
      }
    ],
    assessedAt: new Date()
  };
}

function classifySeverity(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

function calculateConfidence(data: {
  hasAuditData: boolean;
  hasScopeData: boolean;
  hasUserData: boolean;
  hasTemporalData: boolean;
  dataAge: number;
}): number {
  let confidence = 0;

  // Data availability (60 points max)
  if (data.hasAuditData) confidence += 20;
  if (data.hasScopeData) confidence += 20;
  if (data.hasUserData) confidence += 10;
  if (data.hasTemporalData) confidence += 10;

  // Data recency (40 points max)
  if (data.dataAge <= 7) confidence += 40;      // Last week: full points
  else if (data.dataAge <= 30) confidence += 30; // Last month: 75%
  else if (data.dataAge <= 90) confidence += 20; // Last 90 days: 50%
  else confidence += 10;                         // Older: 25%

  return Math.min(confidence, 100);
}
```

---

## 2. Permission Risk Calculation

### 2.1 Scope Risk Scoring

```typescript
interface PermissionRisk {
  totalScore: number;
  scopeBreakdown: ScopeRisk[];
  crossServiceRisk: number;
  adminScopeDetected: boolean;
  dataExfiltrationRisk: number;
  concerns: string[];
}

interface ScopeRisk {
  scope: string;
  service: string;
  riskScore: number;
  sensitivity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  concerns: string[];
  recommendedAlternative?: string;
}

function calculatePermissionRisk(
  scopes: string[],
  scopeLibrary: ScopeLibrary
): PermissionRisk {
  const scopeBreakdown: ScopeRisk[] = [];
  const concerns: string[] = [];
  let totalScore = 0;
  let adminScopeDetected = false;
  let dataExfiltrationRisk = 0;

  // Analyze each scope
  for (const scope of scopes) {
    const scopeData = scopeLibrary.find(scope);

    if (!scopeData) {
      // Unknown scope - assume medium risk
      scopeBreakdown.push({
        scope,
        service: 'Unknown',
        riskScore: 50,
        sensitivity: 'MEDIUM',
        concerns: ['Scope not in library - requires manual review']
      });
      totalScore += 50;
      continue;
    }

    // Add scope to breakdown
    scopeBreakdown.push({
      scope,
      service: scopeData.service_name,
      riskScore: scopeData.risk_score,
      sensitivity: scopeData.risk_level,
      concerns: scopeData.potential_abuse,
      recommendedAlternative: scopeData.recommended_alternative
    });

    // Add to total score
    totalScore += scopeData.risk_score;

    // Check for admin scopes
    if (scope.includes('admin')) {
      adminScopeDetected = true;
      concerns.push(`🚨 **Admin Access**: ${scopeData.service_name} admin privileges grant elevated permissions`);
    }

    // Check for broad data access (Drive, Gmail)
    if (scope.includes('drive') && !scope.includes('metadata') && !scope.includes('file')) {
      dataExfiltrationRisk += 30;
      concerns.push(`🚨 **Data Exfiltration Risk**: Full Drive access allows reading all files, including sensitive documents`);
    }

    if (scope.includes('mail.google.com')) {
      dataExfiltrationRisk += 35;
      concerns.push(`🚨 **Email Access**: Full Gmail access allows reading all emails and sending messages`);
    }

    if (scope.includes('gmail') && !scope.includes('metadata') && !scope.includes('readonly')) {
      dataExfiltrationRisk += 25;
      concerns.push(`⚠️ **Gmail Write Access**: Can send emails and modify mailbox`);
    }
  }

  // Normalize total score to 0-100 range
  const averageScore = scopes.length > 0 ? totalScore / scopes.length : 0;

  // Calculate cross-service risk (multiple sensitive services)
  const crossServiceRisk = calculateCrossServiceRisk(scopes, scopeBreakdown);
  if (crossServiceRisk > 0) {
    concerns.push(`⚠️ **Cross-Service Access**: App has access to ${crossServiceRisk} sensitive services (amplified risk)`);
  }

  return {
    totalScore: Math.min(averageScore + crossServiceRisk, 100),
    scopeBreakdown: scopeBreakdown.sort((a, b) => b.riskScore - a.riskScore),
    crossServiceRisk,
    adminScopeDetected,
    dataExfiltrationRisk: Math.min(dataExfiltrationRisk, 100),
    concerns
  };
}

function calculateCrossServiceRisk(scopes: string[], breakdown: ScopeRisk[]): number {
  const services = new Set(breakdown.map(s => s.service));
  const sensitiveServices = ['Gmail', 'Google Drive', 'Google Calendar', 'Contacts'];
  
  const sensitiveCount = Array.from(services).filter(s => 
    sensitiveServices.includes(s)
  ).length;

  // Risk multiplier: 2 services = +10, 3+ services = +20
  if (sensitiveCount >= 3) return 20;
  if (sensitiveCount >= 2) return 10;
  return 0;
}
```

### 2.2 Scope Risk Library (Database Seed Data)

```sql
-- Example scope risk entries
INSERT INTO oauth_scope_library VALUES
  -- CRITICAL RISK
  ('https://mail.google.com/', 'Gmail', 'read-write', 
   '["All emails", "Drafts", "Sent items", "Settings"]',
   95, 'CRITICAL',
   'Full read/write access to all emails and settings',
   'Can read sensitive emails, send as user, delete evidence',
   '["Email backup applications", "Mail merge tools"]',
   '["Reading confidential communications", "Sending phishing emails", "Deleting audit trails"]',
   'gmail.readonly',
   '{"gdpr": true, "hipaa": false, "pci": false}'),

  ('https://www.googleapis.com/auth/admin.directory.user', 'Workspace Admin', 'admin',
   '["User accounts", "Passwords", "Groups", "OUs"]',
   90, 'CRITICAL',
   'Full user management including create/delete users and reset passwords',
   'Complete admin control, account takeover risk',
   '["User provisioning systems", "HR integrations"]',
   '["Creating rogue admin accounts", "Resetting passwords", "Data exfiltration via new users"]',
   'admin.directory.user.readonly',
   '{"gdpr": true, "hipaa": false, "pci": false}'),

  -- HIGH RISK
  ('https://www.googleapis.com/auth/drive', 'Google Drive', 'read-write',
   '["Documents", "Spreadsheets", "Presentations", "All files"]',
   75, 'HIGH',
   'Full read/write access to all Drive files including shared files',
   'Can read, modify, and delete all documents',
   '["Backup applications", "Document management systems"]',
   '["Mass document theft", "Deleting critical files", "Reading confidential docs"]',
   'drive.file',
   '{"gdpr": true, "hipaa": false, "pci": false}'),

  ('https://www.googleapis.com/auth/drive.readonly', 'Google Drive', 'read-only',
   '["Documents", "Spreadsheets", "Presentations", "All files"]',
   65, 'HIGH',
   'Read-only access to all Drive files including shared files',
   'Can read all documents across organization',
   '["Search indexing", "Backup tools", "Analytics"]',
   '["Intellectual property theft", "Reading confidential business data", "PII exposure"]',
   'drive.metadata.readonly',
   '{"gdpr": true, "hipaa": false, "pci": false}'),

  ('https://www.googleapis.com/auth/calendar', 'Google Calendar', 'read-write',
   '["Events", "Attendees", "Locations", "Free/busy"]',
   50, 'HIGH',
   'Full calendar access including creating and deleting events',
   'Can track executive schedules, create fake meetings',
   '["Meeting schedulers", "Room booking systems"]',
   '["Meeting intelligence gathering", "Creating malicious calendar invites", "Schedule manipulation"]',
   'calendar.readonly',
   '{"gdpr": false, "hipaa": false, "pci": false}'),

  -- MEDIUM RISK
  ('https://www.googleapis.com/auth/calendar.readonly', 'Google Calendar', 'read-only',
   '["Events", "Attendees", "Locations"]',
   35, 'MEDIUM',
   'Read-only calendar access',
   'Can track user schedules and meeting patterns',
   '["Calendar analytics", "Time tracking"]',
   '["Executive schedule tracking", "Meeting pattern analysis"]',
   'calendar.events.readonly',
   '{"gdpr": false, "hipaa": false, "pci": false}'),

  ('https://www.googleapis.com/auth/gmail.readonly', 'Gmail', 'read-only',
   '["Email content", "Labels", "Threads"]',
   55, 'MEDIUM',
   'Read-only access to all emails',
   'Can read all email communications',
   '["Email analytics", "Search tools"]',
   '["Reading confidential communications", "Email pattern analysis"]',
   'gmail.metadata',
   '{"gdpr": true, "hipaa": false, "pci": false}'),

  ('https://www.googleapis.com/auth/drive.file', 'Google Drive', 'read-write',
   '["Files created by this app only"]',
   25, 'MEDIUM',
   'Access only to files created by this application',
   'Limited scope, lowest Drive risk',
   '["Document editors", "Form builders"]',
   '["Limited to app-created files only"]',
   NULL,
   '{"gdpr": false, "hipaa": false, "pci": false}'),

  -- LOW RISK
  ('https://www.googleapis.com/auth/userinfo.email', 'OAuth', 'read-only',
   '["Email address"]',
   10, 'LOW',
   'Email address only for authentication',
   'Minimal risk - identity verification only',
   '["SSO applications", "Identity providers"]',
   '["No data access beyond email address"]',
   NULL,
   '{"gdpr": false, "hipaa": false, "pci": false}'),

  ('https://www.googleapis.com/auth/userinfo.profile', 'OAuth', 'read-only',
   '["Name", "Picture", "Locale"]',
   10, 'LOW',
   'Basic profile information for display',
   'Minimal risk - public profile data',
   '["Profile display", "Personalization"]',
   '["No sensitive data access"]',
   NULL,
   '{"gdpr": false, "hipaa": false, "pci": false}'),

  ('openid', 'OAuth', 'read-only',
   '["OpenID Connect authentication"]',
   5, 'LOW',
   'Standard OpenID Connect authentication',
   'No risk - authentication protocol only',
   '["All OAuth applications"]',
   '["No data access"]',
   NULL,
   '{"gdpr": false, "hipaa": false, "pci": false}'),

  ('https://www.googleapis.com/auth/drive.metadata.readonly', 'Google Drive', 'read-only',
   '["File names", "Types", "Owners"]',
   20, 'LOW',
   'File metadata only, no content access',
   'Can see file structure but not content',
   '["File organization tools", "Metadata indexing"]',
   '["Limited to file names and structure"]',
   NULL,
   '{"gdpr": false, "hipaa": false, "pci": false}');
```

---

## 3. Activity Risk Calculation

### 3.1 Behavioral Anomaly Detection

```typescript
interface ActivityRisk {
  totalScore: number;
  usageFrequency: 'dormant' | 'low' | 'medium' | 'high' | 'excessive';
  recentActivity: {
    last7Days: number;
    last30Days: number;
    last90Days: number;
  };
  patterns: ActivityPatterns;
  concerns: string[];
}

interface ActivityPatterns {
  offHoursAccess: boolean;
  weekendAccess: boolean;
  unusualSpike: boolean;
  dormancyPeriod: number;
  suddenReactivation: boolean;
  averageDailyRate: number;
  peakDailyRate: number;
  velocityChange: number;  // % change in last 30d vs previous 30d
}

function calculateActivityRisk(
  auditEvents: AuditEvent[],
  firstAuthorized: Date
): ActivityRisk {
  const now = new Date();
  const concerns: string[] = [];
  let riskScore = 0;

  // Calculate time periods
  const last7Days = filterEventsByDays(auditEvents, 7);
  const last30Days = filterEventsByDays(auditEvents, 30);
  const last90Days = filterEventsByDays(auditEvents, 90);
  const previous30Days = filterEventsByDays(auditEvents, 60, 30); // Days 31-60

  // Usage frequency classification
  const usageFrequency = classifyUsageFrequency(last30Days.length, 30);

  // Calculate average daily rate
  const daysSinceAuthorized = daysBetween(firstAuthorized, now);
  const averageDailyRate = auditEvents.length / Math.max(daysSinceAuthorized, 1);

  // Find peak daily rate
  const dailyCounts = groupEventsByDay(auditEvents);
  const peakDailyRate = Math.max(...Object.values(dailyCounts));

  // Velocity change (trend analysis)
  const velocityChange = previous30Days.length > 0
    ? ((last30Days.length - previous30Days.length) / previous30Days.length) * 100
    : 0;

  // Detect off-hours access (2am-5am)
  const offHoursAccess = detectOffHoursAccess(auditEvents);
  if (offHoursAccess) {
    riskScore += 20;
    concerns.push('🕒 **Off-Hours Access**: Detected API activity between 2:00 AM - 5:00 AM on multiple occasions');
  }

  // Detect weekend access
  const weekendAccess = detectWeekendAccess(auditEvents);
  if (weekendAccess) {
    riskScore += 10;
    concerns.push('📅 **Weekend Activity**: App accessed during weekends (potential bot activity)');
  }

  // Detect unusual spike (3x increase)
  const unusualSpike = peakDailyRate > averageDailyRate * 3;
  if (unusualSpike) {
    riskScore += 25;
    concerns.push(`📈 **Unusual Spike**: Peak activity of ${peakDailyRate} events/day is ${Math.round(peakDailyRate / averageDailyRate)}x the average`);
  }

  // Detect dormancy period
  const daysSinceLastActivity = daysBetween(
    new Date(auditEvents[auditEvents.length - 1]?.timestamp || now),
    now
  );
  const dormancyPeriod = daysSinceLastActivity;

  if (dormancyPeriod > 60) {
    riskScore += 15;
    concerns.push(`⏸️ **Dormant App**: No activity in ${dormancyPeriod} days (zombie app risk)`);
  }

  // Detect sudden reactivation (dormant then active)
  const suddenReactivation = detectSuddenReactivation(auditEvents);
  if (suddenReactivation) {
    riskScore += 30;
    concerns.push('🚨 **Sudden Reactivation**: App was dormant for 60+ days then suddenly active (potential compromise)');
  }

  // Excessive usage
  if (usageFrequency === 'excessive') {
    riskScore += 15;
    concerns.push(`⚡ **Excessive Usage**: ${last30Days.length} events in 30 days (${Math.round(last30Days.length / 30)}/day average)`);
  }

  // Very low usage (authorized but unused)
  if (usageFrequency === 'dormant' && daysSinceAuthorized > 30) {
    riskScore += 10;
    concerns.push('💤 **Unused App**: Authorized but never used (remove unused permissions)');
  }

  // Increasing velocity (potential attack)
  if (velocityChange > 200) {
    riskScore += 20;
    concerns.push(`📊 **Accelerating Usage**: Activity increased ${Math.round(velocityChange)}% in last 30 days`);
  }

  return {
    totalScore: Math.min(riskScore, 100),
    usageFrequency,
    recentActivity: {
      last7Days: last7Days.length,
      last30Days: last30Days.length,
      last90Days: last90Days.length
    },
    patterns: {
      offHoursAccess,
      weekendAccess,
      unusualSpike,
      dormancyPeriod,
      suddenReactivation,
      averageDailyRate: Math.round(averageDailyRate * 10) / 10,
      peakDailyRate,
      velocityChange: Math.round(velocityChange)
    },
    concerns
  };
}

function classifyUsageFrequency(
  events: number,
  days: number
): 'dormant' | 'low' | 'medium' | 'high' | 'excessive' {
  const dailyAverage = events / days;

  if (events === 0) return 'dormant';
  if (dailyAverage < 1) return 'low';
  if (dailyAverage < 10) return 'medium';
  if (dailyAverage < 50) return 'high';
  return 'excessive';
}

function detectOffHoursAccess(events: AuditEvent[]): boolean {
  const offHoursCount = events.filter(event => {
    const hour = new Date(event.timestamp).getHours();
    return hour >= 2 && hour < 5; // 2am-5am
  }).length;

  return offHoursCount >= 3; // 3+ off-hours accesses = true
}

function detectWeekendAccess(events: AuditEvent[]): boolean {
  const weekendCount = events.filter(event => {
    const day = new Date(event.timestamp).getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }).length;

  return weekendCount >= 5; // 5+ weekend accesses = true
}

function detectSuddenReactivation(events: AuditEvent[]): boolean {
  if (events.length < 10) return false;

  // Sort by timestamp
  const sorted = events.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Find gaps > 60 days
  for (let i = 1; i < sorted.length; i++) {
    const gap = daysBetween(
      new Date(sorted[i - 1].timestamp),
      new Date(sorted[i].timestamp)
    );

    if (gap > 60) {
      // Check if reactivation is recent (within last 30 days)
      const daysSinceReactivation = daysBetween(
        new Date(sorted[i].timestamp),
        new Date()
      );

      if (daysSinceReactivation <= 30) {
        return true;
      }
    }
  }

  return false;
}

function filterEventsByDays(
  events: AuditEvent[],
  days: number,
  offset: number = 0
): AuditEvent[] {
  const now = new Date();
  const startDate = new Date(now.getTime() - (days + offset) * 24 * 60 * 60 * 1000);
  const endDate = offset > 0 
    ? new Date(now.getTime() - offset * 24 * 60 * 60 * 1000)
    : now;

  return events.filter(event => {
    const eventDate = new Date(event.timestamp);
    return eventDate >= startDate && eventDate <= endDate;
  });
}

function groupEventsByDay(events: AuditEvent[]): Record<string, number> {
  const groups: Record<string, number> = {};

  for (const event of events) {
    const date = new Date(event.timestamp).toISOString().split('T')[0];
    groups[date] = (groups[date] || 0) + 1;
  }

  return groups;
}

function daysBetween(date1: Date, date2: Date): number {
  return Math.abs(date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24);
}

function daysSince(date: Date): number {
  return daysBetween(date, new Date());
}
```

---

## 4. Temporal Risk Calculation

### 4.1 Time-Based Risk Signals

```typescript
interface TemporalRisk {
  totalScore: number;
  ageInDays: number;
  accountAge: 'new' | 'established' | 'mature';
  scopeChanges: ScopeEvolution;
  activityPattern: 'stable' | 'increasing' | 'decreasing' | 'erratic';
  concerns: string[];
}

interface ScopeEvolution {
  originalScopes: string[];
  currentScopes: string[];
  recentAdditions: ScopeChange[];
  recentRemovals: ScopeChange[];
  escalationDetected: boolean;
}

interface ScopeChange {
  scope: string;
  date: Date;
  addedBy?: string;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

function calculateTemporalRisk(
  metadata: OAuthAppMetadata,
  auditEvents: AuditEvent[]
): TemporalRisk {
  const concerns: string[] = [];
  let riskScore = 0;

  const ageInDays = daysSince(metadata.firstAuthorized);
  const accountAge = classifyAccountAge(ageInDays);

  // Scope evolution analysis
  const scopeChanges = analyzeScopeEvolution(metadata, auditEvents);

  // New app with broad permissions (HIGH RISK)
  if (accountAge === 'new' && metadata.scopes.length > 5) {
    riskScore += 25;
    concerns.push(`⚠️ **New App with Broad Permissions**: Authorized ${ageInDays} days ago with ${metadata.scopes.length} scopes`);
  }

  // Scope escalation detected
  if (scopeChanges.escalationDetected) {
    riskScore += 35;
    concerns.push(`🚨 **Scope Escalation**: App permissions expanded from ${scopeChanges.originalScopes.length} to ${scopeChanges.currentScopes.length} scopes`);
    
    for (const addition of scopeChanges.recentAdditions) {
      concerns.push(`  └─ Added: ${addition.scope} (${addition.riskLevel}) on ${addition.date.toLocaleDateString()}`);
    }
  }

  // Recent scope additions (last 30 days)
  const recentAdditions = scopeChanges.recentAdditions.filter(s => 
    daysSince(s.date) <= 30
  );

  if (recentAdditions.length > 0) {
    riskScore += 20;
    concerns.push(`📈 **Recent Permission Changes**: ${recentAdditions.length} scope(s) added in last 30 days`);
  }

  // Dormant app (no activity in 90+ days)
  const lastActivity = auditEvents[auditEvents.length - 1];
  if (lastActivity && daysSince(new Date(lastActivity.timestamp)) > 90) {
    riskScore += 15;
    concerns.push(`💤 **Dormant App**: No activity detected in 90+ days (consider revoking)`);
  }

  // Activity pattern analysis
  const activityPattern = analyzeActivityPattern(auditEvents);
  
  if (activityPattern === 'erratic') {
    riskScore += 10;
    concerns.push('📊 **Erratic Activity**: Usage pattern is inconsistent (possible automation failure or compromise)');
  }

  if (activityPattern === 'increasing') {
    concerns.push('📈 **Increasing Activity**: Usage trending upward (monitor for anomalies)');
  }

  return {
    totalScore: Math.min(riskScore, 100),
    ageInDays,
    accountAge,
    scopeChanges,
    activityPattern,
    concerns
  };
}

function classifyAccountAge(days: number): 'new' | 'established' | 'mature' {
  if (days <= 30) return 'new';
  if (days <= 90) return 'established';
  return 'mature';
}

function analyzeScopeEvolution(
  metadata: OAuthAppMetadata,
  auditEvents: AuditEvent[]
): ScopeEvolution {
  // Find authorization events
  const authEvents = auditEvents.filter(e => 
    e.eventType === 'authorization' || e.eventType === 'scope_change'
  );

  if (authEvents.length === 0) {
    return {
      originalScopes: metadata.scopes,
      currentScopes: metadata.scopes,
      recentAdditions: [],
      recentRemovals: [],
      escalationDetected: false
    };
  }

  // Sort by timestamp
  authEvents.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const originalScopes = extractScopesFromEvent(authEvents[0]);
  const currentScopes = metadata.scopes;

  // Detect additions and removals
  const addedScopes = currentScopes.filter(s => !originalScopes.includes(s));
  const removedScopes = originalScopes.filter(s => !currentScopes.includes(s));

  const recentAdditions: ScopeChange[] = addedScopes.map(scope => ({
    scope,
    date: metadata.firstAuthorized, // Fallback date
    riskLevel: classifyScopeRisk(scope)
  }));

  const recentRemovals: ScopeChange[] = removedScopes.map(scope => ({
    scope,
    date: metadata.firstAuthorized
  }));

  // Detect escalation (added high-risk scopes)
  const escalationDetected = recentAdditions.some(s => 
    s.riskLevel === 'HIGH' || s.riskLevel === 'CRITICAL'
  );

  return {
    originalScopes,
    currentScopes,
    recentAdditions,
    recentRemovals,
    escalationDetected
  };
}

function extractScopesFromEvent(event: AuditEvent): string[] {
  // Extract scopes from event metadata
  if (event.metadata?.scopes) {
    return event.metadata.scopes;
  }
  return [];
}

function classifyScopeRisk(scope: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (scope.includes('admin')) return 'CRITICAL';
  if (scope.includes('mail.google.com')) return 'CRITICAL';
  if (scope.includes('drive') && !scope.includes('readonly') && !scope.includes('file')) return 'HIGH';
  if (scope.includes('gmail') || scope.includes('calendar')) return 'MEDIUM';
  return 'LOW';
}

function analyzeActivityPattern(events: AuditEvent[]): 'stable' | 'increasing' | 'decreasing' | 'erratic' {
  if (events.length < 10) return 'stable';

  // Group by week
  const weeks: number[] = [];
  const sorted = events.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let currentWeek = 0;
  let currentWeekStart = new Date(sorted[0].timestamp);

  for (const event of sorted) {
    const eventDate = new Date(event.timestamp);
    const weeksDiff = daysBetween(currentWeekStart, eventDate) / 7;

    if (weeksDiff >= 1) {
      currentWeek++;
      currentWeekStart = eventDate;
      weeks[currentWeek] = 0;
    }

    weeks[currentWeek] = (weeks[currentWeek] || 0) + 1;
  }

  // Calculate trend
  if (weeks.length < 3) return 'stable';

  const firstHalf = weeks.slice(0, Math.floor(weeks.length / 2));
  const secondHalf = weeks.slice(Math.floor(weeks.length / 2));

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  const change = ((secondAvg - firstAvg) / firstAvg) * 100;

  // Calculate variance (erratic detection)
  const variance = calculateVariance(weeks);
  const avgWeekly = weeks.reduce((a, b) => a + b, 0) / weeks.length;
  const coefficientOfVariation = Math.sqrt(variance) / avgWeekly;

  if (coefficientOfVariation > 1.5) return 'erratic';
  if (change > 50) return 'increasing';
  if (change < -50) return 'decreasing';
  return 'stable';
}

function calculateVariance(values: number[]): number {
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  return squareDiffs.reduce((a, b) => a + b, 0) / values.length;
}
```

---

## 5. User Risk Calculation

### 5.1 Authorization Context Risk

```typescript
interface UserRisk {
  totalScore: number;
  authorizedBy: UserContext;
  concerns: string[];
}

interface UserContext {
  email: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  role: string;
  department: string;
  isExternal: boolean;
  orgUnit: string;
}

function calculateUserRisk(
  authorizedBy: UserContext
): UserRisk {
  const concerns: string[] = [];
  let riskScore = 0;

  // Super admin authorization (HIGHEST RISK)
  if (authorizedBy.isSuperAdmin) {
    riskScore += 40;
    concerns.push('🚨 **Super Admin Authorization**: Authorized by super admin with elevated organization-wide permissions');
  }

  // Regular admin authorization
  else if (authorizedBy.isAdmin) {
    riskScore += 25;
    concerns.push('⚠️ **Admin Authorization**: Authorized by admin user with elevated permissions');
  }

  // External user authorization
  if (authorizedBy.isExternal) {
    riskScore += 30;
    concerns.push('🌐 **External User**: Authorized by user outside organization domain (third-party risk)');
  }

  // Executive/C-level authorization
  const executiveTitles = ['ceo', 'cto', 'cfo', 'coo', 'president', 'vp', 'vice president', 'director'];
  const isExecutive = executiveTitles.some(title => 
    authorizedBy.role?.toLowerCase().includes(title)
  );

  if (isExecutive) {
    riskScore += 20;
    concerns.push('👔 **Executive Access**: Authorized by executive-level user (high-value target)');
  }

  // Sensitive department (Finance, Legal, HR)
  const sensitiveDepts = ['finance', 'legal', 'hr', 'human resources', 'accounting'];
  const isSensitiveDept = sensitiveDepts.some(dept => 
    authorizedBy.department?.toLowerCase().includes(dept)
  );

  if (isSensitiveDept) {
    riskScore += 15;
    concerns.push(`📁 **Sensitive Department**: Authorized by user in ${authorizedBy.department} (access to sensitive data)`);
  }

  return {
    totalScore: Math.min(riskScore, 100),
    authorizedBy,
    concerns
  };
}
```

---

## 6. AI Platform Risk Calculation

### 6.1 AI Detection Risk

```typescript
interface AIPlatformRisk {
  totalScore: number;
  isAIPlatform: boolean;
  platform: string | null;
  confidence: number;
  concerns: string[];
}

function calculateAIPlatformRisk(
  metadata: OAuthAppMetadata
): AIPlatformRisk {
  const concerns: string[] = [];
  let riskScore = 0;

  if (!metadata.isAIPlatform) {
    return {
      totalScore: 0,
      isAIPlatform: false,
      platform: null,
      confidence: 0,
      concerns: []
    };
  }

  const platform = metadata.aiPlatformType || 'unknown';
  const confidence = metadata.aiPlatformConfidence || 0;

  // Base AI platform risk
  riskScore = 50; // Base score for any AI platform

  // Platform-specific risk adjustments
  switch (platform.toLowerCase()) {
    case 'openai':
    case 'chatgpt':
      riskScore += 30;
      concerns.push('🤖 **OpenAI/ChatGPT Integration**: Third-party AI platform with data processing outside organization');
      concerns.push('🌐 **Data Residency**: Data sent to OpenAI servers (potential GDPR compliance issue)');
      concerns.push('📤 **Data Exfiltration**: Documents sent to external AI service for processing');
      break;

    case 'claude':
    case 'anthropic':
      riskScore += 30;
      concerns.push('🤖 **Claude (Anthropic) Integration**: Third-party AI platform with external data processing');
      concerns.push('🌐 **Data Residency**: Data sent to Anthropic servers');
      concerns.push('📤 **Data Exfiltration**: Content sent to external AI service');
      break;

    case 'gemini':
      riskScore += 15; // Lower risk as Google-owned
      concerns.push('🤖 **Gemini Integration**: Google AI platform (lower third-party risk)');
      concerns.push('ℹ️ **Internal Platform**: Google-owned AI service (data stays within Google ecosystem)');
      break;

    default:
      riskScore += 25;
      concerns.push('🤖 **Unknown AI Platform**: Third-party AI integration detected');
  }

  // Confidence adjustment (lower confidence = higher risk)
  if (confidence < 70) {
    riskScore += 10;
    concerns.push(`⚠️ **Detection Confidence**: ${confidence}% confidence in AI platform detection (manual review recommended)`);
  }

  return {
    totalScore: Math.min(riskScore, 100),
    isAIPlatform: true,
    platform,
    confidence,
    concerns
  };
}
```

---

## 7. Risk Factor Generation

### 7.1 Intelligent Risk Factors

```typescript
interface RiskFactor {
  severity: '🚨' | '⚠️' | '📊' | 'ℹ️';
  category: string;
  title: string;
  description: string;
  evidence: string[];
  recommendation?: string;
}

function generateRiskFactors(
  riskAnalysis: RiskScore
): RiskFactor[] {
  const factors: RiskFactor[] = [];

  // Extract from each dimension
  for (const breakdown of riskAnalysis.breakdown) {
    const dimension = breakdown.dimension;
    const concerns = breakdown.factors;

    for (const concern of concerns) {
      // Parse severity emoji from concern
      let severity: '🚨' | '⚠️' | '📊' | 'ℹ️' = 'ℹ️';
      if (concern.includes('🚨')) severity = '🚨';
      else if (concern.includes('⚠️')) severity = '⚠️';
      else if (concern.includes('📊') || concern.includes('📈')) severity = '📊';

      // Extract title and description
      const parts = concern.split(':');
      const title = parts[0].replace(/[🚨⚠️📊📈ℹ️]/g, '').trim();
      const description = parts.slice(1).join(':').trim();

      factors.push({
        severity,
        category: mapDimensionToCategory(dimension),
        title,
        description,
        evidence: [], // To be populated with specific evidence
        recommendation: generateRecommendation(title, description)
      });
    }
  }

  return factors.sort((a, b) => {
    const severityOrder = { '🚨': 0, '⚠️': 1, '📊': 2, 'ℹ️': 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

function mapDimensionToCategory(dimension: keyof RiskDimensions): string {
  const mapping: Record<keyof RiskDimensions, string> = {
    aiPlatformRisk: 'AI Platform Integration',
    permissionRisk: 'Permissions & Scopes',
    activityRisk: 'Activity Patterns',
    userRisk: 'User Context',
    temporalRisk: 'Temporal Signals'
  };

  return mapping[dimension];
}

function generateRecommendation(title: string, description: string): string {
  // Rule-based recommendation generation
  if (title.includes('Data Exfiltration')) {
    return 'Review scope necessity and consider replacing with more restrictive alternatives';
  }

  if (title.includes('Admin Access')) {
    return 'Verify admin permissions are required, consider demoting to standard user if possible';
  }

  if (title.includes('Off-Hours Access')) {
    return 'Investigate legitimacy of after-hours activity, may indicate compromised credentials';
  }

  if (title.includes('Dormant')) {
    return 'Revoke access for unused applications to reduce attack surface';
  }

  if (title.includes('Scope Escalation')) {
    return 'Audit permission changes and verify business justification for new scopes';
  }

  if (title.includes('AI Platform')) {
    return 'Review data processing agreement (DPA) with AI provider, ensure GDPR compliance';
  }

  return 'Review and monitor this risk factor regularly';
}
```

---

## 8. Recommendations Engine

### 8.1 Smart Recommendations

```typescript
interface Recommendation {
  priority: 'immediate' | 'high' | 'medium' | 'low';
  category: 'scope_reduction' | 'monitoring' | 'revocation' | 'policy' | 'compliance';
  title: string;
  description: string;
  actionSteps: string[];
  impact: string;
  estimatedEffort: 'low' | 'medium' | 'high';
}

function generateRecommendations(
  riskAnalysis: RiskScore,
  metadata: OAuthAppMetadata,
  permissionRisk: PermissionRisk
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // 1. Scope reduction recommendations
  const broadScopes = permissionRisk.scopeBreakdown.filter(s => 
    s.sensitivity === 'HIGH' || s.sensitivity === 'CRITICAL'
  );

  for (const scope of broadScopes) {
    if (scope.recommendedAlternative) {
      recommendations.push({
        priority: scope.sensitivity === 'CRITICAL' ? 'immediate' : 'high',
        category: 'scope_reduction',
        title: `Replace Broad ${scope.service} Access with Limited Scope`,
        description: `${metadata.name} currently has ${scope.scope.includes('readonly') ? 'read' : 'read/write'} access to ALL ${scope.service} data. This creates unnecessary data exposure risk.`,
        actionSteps: [
          `Revoke current ${metadata.name} authorization`,
          `Re-authorize with ${scope.recommendedAlternative} scope (more restrictive)`,
          `Update ${metadata.name} integration to request limited scope`,
          'Test integration to ensure functionality preserved'
        ],
        impact: `Reduces data exposure from 100% of ${scope.service} to app-specific files only`,
        estimatedEffort: 'medium'
      });
    }
  }

  // 2. Dormant app revocation
  if (riskAnalysis.dimensions.temporalRisk > 50) {
    const temporalConcerns = riskAnalysis.breakdown.find(b => 
      b.dimension === 'temporalRisk'
    )?.factors || [];

    if (temporalConcerns.some(c => c.includes('Dormant'))) {
      recommendations.push({
        priority: 'medium',
        category: 'revocation',
        title: 'Revoke Access for Unused Application',
        description: `${metadata.name} has been authorized for ${Math.round(daysSince(metadata.firstAuthorized))} days but shows minimal or no activity. Unused permissions create unnecessary security risk.`,
        actionSteps: [
          'Confirm application is no longer needed with business owner',
          `Navigate to Google Account > Security > Third-party apps`,
          `Find ${metadata.name} and click "Remove Access"`,
          'Document revocation in security audit log'
        ],
        impact: 'Eliminates attack surface from unused OAuth application',
        estimatedEffort: 'low'
      });
    }
  }

  // 3. AI platform compliance
  if (riskAnalysis.dimensions.aiPlatformRisk > 50) {
    recommendations.push({
      priority: 'high',
      category: 'compliance',
      title: 'Ensure Data Processing Agreement (DPA) with AI Provider',
      description: `${metadata.name} integrates with ${metadata.aiPlatformType} AI platform. Under GDPR, you must have a DPA in place when sharing personal data with third-party processors.`,
      actionSteps: [
        `Review ${metadata.aiPlatformType} terms of service and privacy policy`,
        'Verify DPA is in place (or request one from provider)',
        'Document what data types are sent to AI platform',
        'Ensure data processing complies with GDPR Article 28',
        'Update privacy notices to inform users about AI processing'
      ],
      impact: 'Ensures GDPR compliance and protects organization from regulatory fines',
      estimatedEffort: 'high'
    });
  }

  // 4. Activity monitoring
  if (riskAnalysis.dimensions.activityRisk > 60) {
    recommendations.push({
      priority: 'high',
      category: 'monitoring',
      title: 'Enable Enhanced Monitoring for Anomalous Activity',
      description: `${metadata.name} shows unusual activity patterns that may indicate automation, compromise, or misconfiguration.`,
      actionSteps: [
        'Enable Google Workspace audit log exports to SIEM',
        `Create alert for ${metadata.name} activity spikes (>3x normal)`,
        'Set up weekly activity reports for security team',
        'Review IP addresses accessing the application',
        'Consider implementing conditional access policies'
      ],
      impact: 'Early detection of compromised credentials or malicious activity',
      estimatedEffort: 'medium'
    });
  }

  // 5. Policy enforcement
  if (riskAnalysis.overall >= 75) {
    recommendations.push({
      priority: 'immediate',
      category: 'policy',
      title: 'Apply Critical Risk OAuth Application Policy',
      description: `${metadata.name} scored ${riskAnalysis.overall}/100 on risk assessment, classifying it as ${riskAnalysis.severity.toUpperCase()} risk. Organization policy may require additional controls.`,
      actionSteps: [
        'Notify security team of critical risk application',
        'Conduct security review within 7 days',
        'Document business justification for application',
        'Implement compensating controls (e.g., IP restrictions)',
        'Consider approval workflow for similar apps'
      ],
      impact: 'Ensures high-risk applications receive appropriate security oversight',
      estimatedEffort: 'high'
    });
  }

  // Sort by priority
  const priorityOrder = { immediate: 0, high: 1, medium: 2, low: 3 };
  recommendations.sort((a, b) => 
    priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  return recommendations;
}
```

---

## 9. Anomaly Detection Patterns

### 9.1 Detection Pattern Library

```typescript
interface AnomalyPattern {
  id: string;
  name: string;
  description: string;
  detectionLogic: (data: any) => boolean;
  threshold: number;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
}

const ANOMALY_PATTERNS: AnomalyPattern[] = [
  {
    id: 'zombie_app',
    name: 'Zombie App (Authorized but Unused)',
    description: 'OAuth app authorized more than 90 days ago with zero activity in last 30 days',
    detectionLogic: (data) => {
      return data.ageInDays > 90 && data.last30DayEvents === 0;
    },
    threshold: 90,
    confidence: 95,
    severity: 'medium',
    recommendation: 'Revoke access to reduce attack surface'
  },

  {
    id: 'scope_creep',
    name: 'Scope Creep (Permissions Growing Over Time)',
    description: 'OAuth app permissions have increased by 50%+ since initial authorization',
    detectionLogic: (data) => {
      return data.scopeChanges.recentAdditions.length >= data.scopeChanges.originalScopes.length * 0.5;
    },
    threshold: 0.5,
    confidence: 90,
    severity: 'high',
    recommendation: 'Review necessity of new scopes and verify business justification'
  },

  {
    id: 'dormancy_spike',
    name: 'Dormancy Spike (Suspicious Reactivation)',
    description: 'App with no activity for 60+ days suddenly shows 100+ events in 1 day',
    detectionLogic: (data) => {
      return data.dormancyPeriod > 60 && data.peakDailyRate > 100;
    },
    threshold: 100,
    confidence: 85,
    severity: 'critical',
    recommendation: 'Investigate for potential account compromise, review recent authorization events'
  },

  {
    id: 'off_hours_access',
    name: 'Off-Hours Access (After-Hours API Usage)',
    description: 'Regular API access detected between 2:00 AM - 5:00 AM (5+ occurrences)',
    detectionLogic: (data) => {
      return data.offHoursAccessCount >= 5;
    },
    threshold: 5,
    confidence: 80,
    severity: 'high',
    recommendation: 'Verify legitimate automation vs potential breach, check user timezone'
  },

  {
    id: 'velocity_spike',
    name: 'Velocity Spike (Sudden Activity Increase)',
    description: 'API usage increased by 300%+ compared to baseline',
    detectionLogic: (data) => {
      return data.velocityChange > 300;
    },
    threshold: 300,
    confidence: 85,
    severity: 'high',
    recommendation: 'Investigate cause of spike, may indicate automation loop or data scraping'
  },

  {
    id: 'data_exfil_combo',
    name: 'Data Exfiltration Risk (Drive + Gmail + AI Platform)',
    description: 'App has both Drive and Gmail access PLUS integrates with AI platform',
    detectionLogic: (data) => {
      const hasDrive = data.scopes.some((s: string) => s.includes('drive'));
      const hasGmail = data.scopes.some((s: string) => s.includes('gmail') || s.includes('mail.google.com'));
      return hasDrive && hasGmail && data.isAIPlatform;
    },
    threshold: 1,
    confidence: 95,
    severity: 'critical',
    recommendation: 'Review data processing agreement, consider scope reduction, enable DLP controls'
  },

  {
    id: 'admin_scope_non_admin',
    name: 'Admin Scope Granted to Non-Admin App',
    description: 'Application has admin scopes but is not an official admin tool',
    detectionLogic: (data) => {
      const hasAdminScope = data.scopes.some((s: string) => s.includes('admin'));
      const isOfficialAdminTool = ['Google Admin', 'Workspace Admin'].some(
        name => data.appName.includes(name)
      );
      return hasAdminScope && !isOfficialAdminTool;
    },
    threshold: 1,
    confidence: 90,
    severity: 'critical',
    recommendation: 'Verify admin permissions are absolutely required, consider downgrading to standard scopes'
  },

  {
    id: 'external_user_auth',
    name: 'External User Authorization',
    description: 'OAuth app authorized by user outside organization domain',
    detectionLogic: (data) => {
      return data.authorizedBy.isExternal === true;
    },
    threshold: 1,
    confidence: 100,
    severity: 'high',
    recommendation: 'Verify legitimacy of external user, may indicate unauthorized access or contractor'
  },

  {
    id: 'new_app_broad_scope',
    name: 'New App with Broad Permissions',
    description: 'App authorized within last 30 days with 10+ OAuth scopes',
    detectionLogic: (data) => {
      return data.ageInDays <= 30 && data.scopes.length >= 10;
    },
    threshold: 10,
    confidence: 85,
    severity: 'high',
    recommendation: 'Review necessity of all scopes, implement least-privilege principle'
  },

  {
    id: 'weekend_bot_pattern',
    name: 'Weekend Bot Activity Pattern',
    description: 'Consistent weekend activity indicating automated bot behavior',
    detectionLogic: (data) => {
      return data.weekendAccessCount > 10 && data.weekendAccessPercentage > 30;
    },
    threshold: 30,
    confidence: 75,
    severity: 'medium',
    recommendation: 'Verify automation is intentional and properly secured'
  }
];

function detectAnomalies(
  riskAnalysis: RiskScore,
  metadata: OAuthAppMetadata,
  auditEvents: AuditEvent[]
): Array<{ pattern: AnomalyPattern; detected: boolean; evidence: any }> {
  const results = [];

  const data = {
    ...metadata,
    ...riskAnalysis,
    ageInDays: daysSince(metadata.firstAuthorized),
    last30DayEvents: auditEvents.filter(e => daysSince(new Date(e.timestamp)) <= 30).length,
    peakDailyRate: Math.max(...Object.values(groupEventsByDay(auditEvents))),
    offHoursAccessCount: auditEvents.filter(e => {
      const hour = new Date(e.timestamp).getHours();
      return hour >= 2 && hour < 5;
    }).length,
    weekendAccessCount: auditEvents.filter(e => {
      const day = new Date(e.timestamp).getDay();
      return day === 0 || day === 6;
    }).length,
    weekendAccessPercentage: (auditEvents.filter(e => {
      const day = new Date(e.timestamp).getDay();
      return day === 0 || day === 6;
    }).length / auditEvents.length) * 100
  };

  for (const pattern of ANOMALY_PATTERNS) {
    const detected = pattern.detectionLogic(data);

    results.push({
      pattern,
      detected,
      evidence: detected ? data : null
    });
  }

  return results.filter(r => r.detected);
}
```

---

## 10. Implementation Pseudocode

### 10.1 Main Risk Analysis Orchestrator

```typescript
/**
 * Main orchestrator for OAuth app risk analysis
 * Called from View Details endpoint
 */
async function analyzeOAuthAppRisk(
  appId: string,
  connectionId: string,
  organizationId: string
): Promise<{
  riskScore: RiskScore;
  riskFactors: RiskFactor[];
  recommendations: Recommendation[];
  anomalies: Array<{ pattern: AnomalyPattern; detected: boolean; evidence: any }>;
}> {
  // 1. Fetch OAuth app metadata
  const metadata = await getOAuthAppMetadata(appId, connectionId);

  // 2. Fetch audit activity for last 90 days
  const auditEvents = await getAuditActivity(
    connectionId,
    metadata.clientId,
    90
  );

  // 3. Load scope library
  const scopeLibrary = await loadScopeLibrary();

  // 4. Calculate multi-dimensional risk
  const riskScore = calculateEnhancedRisk(
    metadata,
    auditEvents,
    scopeLibrary
  );

  // 5. Generate actionable risk factors
  const riskFactors = generateRiskFactors(riskScore);

  // 6. Generate smart recommendations
  const permissionRisk = calculatePermissionRisk(metadata.scopes, scopeLibrary);
  const recommendations = generateRecommendations(
    riskScore,
    metadata,
    permissionRisk
  );

  // 7. Detect anomaly patterns
  const anomalies = detectAnomalies(
    riskScore,
    metadata,
    auditEvents
  );

  // 8. Store risk assessment
  await storeRiskAssessment({
    appId,
    organizationId,
    riskScore,
    riskFactors,
    recommendations,
    anomalies,
    assessedAt: new Date()
  });

  return {
    riskScore,
    riskFactors,
    recommendations,
    anomalies
  };
}
```

### 10.2 Test Data Examples

```typescript
// Example 1: ChatGPT with Drive access (HIGH RISK)
const chatGPTExample = {
  name: 'ChatGPT',
  clientId: '77377267392-xxx.apps.googleusercontent.com',
  scopes: [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'openid'
  ],
  isAIPlatform: true,
  aiPlatformType: 'openai',
  aiPlatformConfidence: 95,
  firstAuthorized: new Date('2025-09-14'),
  authorizedBy: {
    email: 'darren@baliluxurystays.com',
    isAdmin: true,
    isSuperAdmin: false,
    role: 'Engineering Director',
    department: 'Engineering',
    isExternal: false,
    orgUnit: '/Engineering'
  }
};

// Expected Risk Score: ~72/100 (HIGH)
// - aiPlatformRisk: 80 (OpenAI integration)
// - permissionRisk: 65 (Drive readonly)
// - activityRisk: 30 (assuming normal usage)
// - userRisk: 25 (admin user)
// - temporalRisk: 25 (new app)
// Overall: (80*0.3) + (65*0.25) + (30*0.2) + (25*0.15) + (25*0.1) = 72

// Example 2: Dormant Zapier Integration (MEDIUM RISK)
const zapierExample = {
  name: 'Zapier',
  clientId: '12345-zapier.apps.googleusercontent.com',
  scopes: [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/userinfo.email'
  ],
  isAIPlatform: false,
  aiPlatformType: null,
  aiPlatformConfidence: 0,
  firstAuthorized: new Date('2024-06-15'),
  authorizedBy: {
    email: 'jane@example.com',
    isAdmin: false,
    isSuperAdmin: false,
    role: 'Marketing Manager',
    department: 'Marketing',
    isExternal: false,
    orgUnit: '/Marketing'
  }
};

// Expected Risk Score: ~38/100 (MEDIUM)
// - aiPlatformRisk: 0 (not AI)
// - permissionRisk: 50 (Gmail send + Calendar)
// - activityRisk: 65 (dormant app)
// - userRisk: 0 (standard user)
// - temporalRisk: 15 (dormancy)
// Overall: (0*0.3) + (50*0.25) + (65*0.2) + (0*0.15) + (15*0.1) = 27.5
```

### 10.3 Expected Outputs

```typescript
// Example output for ChatGPT
{
  riskScore: {
    overall: 72,
    severity: 'high',
    confidence: 85,
    dimensions: {
      aiPlatformRisk: 80,
      permissionRisk: 65,
      activityRisk: 30,
      userRisk: 25,
      temporalRisk: 25
    },
    breakdown: [
      {
        dimension: 'aiPlatformRisk',
        score: 80,
        weight: 0.30,
        contribution: 24,
        factors: [
          '🤖 **OpenAI/ChatGPT Integration**: Third-party AI platform with data processing outside organization',
          '🌐 **Data Residency**: Data sent to OpenAI servers (potential GDPR compliance issue)',
          '📤 **Data Exfiltration**: Documents sent to external AI service for processing'
        ]
      },
      {
        dimension: 'permissionRisk',
        score: 65,
        weight: 0.25,
        contribution: 16.25,
        factors: [
          '🚨 **Data Exfiltration Risk**: Full Drive access allows reading all files, including sensitive documents'
        ]
      }
      // ... other dimensions
    ],
    assessedAt: '2025-10-07T10:30:00Z'
  },
  
  riskFactors: [
    {
      severity: '🚨',
      category: 'AI Platform Integration',
      title: 'OpenAI/ChatGPT Integration',
      description: 'Third-party AI platform with data processing outside organization',
      evidence: ['Client ID matches OpenAI pattern', 'App name contains ChatGPT'],
      recommendation: 'Review data processing agreement (DPA) with AI provider, ensure GDPR compliance'
    },
    {
      severity: '🚨',
      category: 'Permissions & Scopes',
      title: 'Data Exfiltration Risk',
      description: 'Full Drive access allows reading all files, including sensitive documents',
      evidence: ['drive.readonly scope granted', '127 API calls in last 30 days'],
      recommendation: 'Review scope necessity and consider replacing with more restrictive alternatives'
    }
    // ... more factors
  ],
  
  recommendations: [
    {
      priority: 'high',
      category: 'scope_reduction',
      title: 'Replace Broad Drive Access with Limited Scope',
      description: 'ChatGPT currently has read access to ALL files in Google Drive. This creates unnecessary data exposure risk.',
      actionSteps: [
        'Revoke current ChatGPT authorization',
        'Re-authorize with drive.file scope (app-created files only)',
        'Update ChatGPT integration to request limited scope',
        'Test integration to ensure functionality preserved'
      ],
      impact: 'Reduces data exposure from 100% of Drive files to <1%',
      estimatedEffort: 'medium'
    },
    {
      priority: 'high',
      category: 'compliance',
      title: 'Ensure Data Processing Agreement (DPA) with AI Provider',
      description: 'ChatGPT integrates with openai AI platform. Under GDPR, you must have a DPA in place when sharing personal data with third-party processors.',
      actionSteps: [
        'Review openai terms of service and privacy policy',
        'Verify DPA is in place (or request one from provider)',
        'Document what data types are sent to AI platform',
        'Ensure data processing complies with GDPR Article 28',
        'Update privacy notices to inform users about AI processing'
      ],
      impact: 'Ensures GDPR compliance and protects organization from regulatory fines',
      estimatedEffort: 'high'
    }
  ],
  
  anomalies: [
    {
      pattern: {
        id: 'new_app_broad_scope',
        name: 'New App with Broad Permissions',
        severity: 'high'
      },
      detected: true,
      evidence: {
        ageInDays: 22,
        scopeCount: 4,
        hasBroadScope: true
      }
    }
  ]
}
```

---

## 11. Success Criteria

### 11.1 Detection Accuracy Targets

```typescript
const SUCCESS_METRICS = {
  detection: {
    accuracy: 0.95,              // 95% correct risk classifications
    falsePositiveRate: 0.05,     // <5% false positives
    falseNegativeRate: 0.05,     // <5% false negatives
    confidenceThreshold: 0.80    // 80% minimum confidence
  },
  
  performance: {
    analysisTime: 5000,          // <5 seconds to analyze
    apiCalls: 10,                // <10 API calls
    cacheHitRate: 0.70           // 70% cache hit rate
  },
  
  usability: {
    actionableFactors: 0.90,     // 90% of factors have recommendations
    recommendationClarity: 0.85, // 85% user satisfaction
    falseAlarmRate: 0.10         // <10% false alarms
  }
};
```

### 11.2 Validation Test Cases

```typescript
// Test Case 1: High-Risk AI Platform with Broad Scopes
const testCase1 = {
  input: {
    scopes: ['drive.readonly', 'gmail.readonly', 'userinfo.email'],
    isAIPlatform: true,
    aiPlatformType: 'openai',
    authorizedBy: { isAdmin: true }
  },
  expected: {
    severity: 'high',
    overallScore: { min: 70, max: 85 },
    topFactors: ['AI Platform Integration', 'Data Exfiltration Risk'],
    recommendations: { min: 2, max: 5 }
  }
};

// Test Case 2: Low-Risk Standard OAuth App
const testCase2 = {
  input: {
    scopes: ['userinfo.email', 'userinfo.profile', 'openid'],
    isAIPlatform: false,
    authorizedBy: { isAdmin: false }
  },
  expected: {
    severity: 'low',
    overallScore: { min: 5, max: 20 },
    topFactors: [],
    recommendations: { min: 0, max: 1 }
  }
};

// Test Case 3: Dormant Zombie App
const testCase3 = {
  input: {
    scopes: ['drive', 'calendar'],
    isAIPlatform: false,
    firstAuthorized: new Date('2024-01-01'),
    last30DayEvents: 0
  },
  expected: {
    severity: 'medium',
    overallScore: { min: 30, max: 50 },
    anomalies: ['zombie_app'],
    recommendations: ['revocation']
  }
};
```

---

## 12. Implementation Checklist

### Phase 1: Core Algorithm Implementation (Week 1)

- [ ] Implement `calculateEnhancedRisk()` main orchestrator
- [ ] Implement `calculatePermissionRisk()` with scope library
- [ ] Implement `calculateActivityRisk()` with anomaly detection
- [ ] Implement `calculateTemporalRisk()` with scope evolution
- [ ] Implement `calculateUserRisk()` with context analysis
- [ ] Implement `calculateAIPlatformRisk()` with confidence scores
- [ ] Create scope risk library database table and seed data
- [ ] Write unit tests for each risk calculation function

### Phase 2: Risk Factor Generation (Week 2)

- [ ] Implement `generateRiskFactors()` with template parsing
- [ ] Create 50+ risk factor templates
- [ ] Implement severity classification
- [ ] Add evidence extraction logic
- [ ] Write tests for risk factor generation

### Phase 3: Recommendations Engine (Week 2)

- [ ] Implement `generateRecommendations()` with rule engine
- [ ] Create recommendation templates (scope reduction, revocation, etc.)
- [ ] Add priority classification logic
- [ ] Implement impact assessment
- [ ] Write tests for recommendation generation

### Phase 4: Anomaly Detection (Week 3)

- [ ] Implement `detectAnomalies()` pattern matcher
- [ ] Create 10+ anomaly detection patterns
- [ ] Add threshold-based detection
- [ ] Implement confidence scoring
- [ ] Write tests for anomaly detection

### Phase 5: Integration & Testing (Week 3-4)

- [ ] Integrate with View Details API endpoint
- [ ] Add caching layer for performance
- [ ] Implement real-time risk recalculation
- [ ] Add frontend display components
- [ ] Conduct end-to-end testing
- [ ] Validate against success criteria

---

## 13. References

**Related Documents:**
- GOOGLE_OAUTH_APP_VIEW_DETAILS_ENHANCEMENT.md (API capabilities research)
- .claude/PITFALLS.md (Common pitfalls to avoid)
- .claude/ARCHITECTURE.md (System architecture)

**Google API Documentation:**
- OAuth Scopes: https://developers.google.com/identity/protocols/oauth2/scopes
- Admin Reports API: https://developers.google.com/admin-sdk/reports/reference/rest/v1/activities
- Admin Directory Tokens: https://developers.google.com/admin-sdk/directory/reference/rest/v1/tokens

**Implementation Files:**
- backend/src/services/detection/ai-provider-detector.service.ts
- backend/src/services/detection/velocity-detector.service.ts
- backend/src/services/detection/off-hours-detector.service.ts
- backend/src/connectors/google.ts

---

**Status**: ✅ Design Complete - Ready for Implementation  
**Next Steps**: Review with team, prioritize Phase 1 implementation  
**Owner**: Detection Algorithm Engineer  
**Updated**: 2025-10-07
