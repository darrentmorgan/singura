# OAuth App "View Details" Enhancement - Quick Reference

**TL;DR**: We can add 10+ new metadata fields to View Details using existing Google APIs (no new scopes needed). Phase 1 implementation: 8-16 hours.

---

## What We Can Add (No New Scopes Required)

### 1. Token Metadata ✅ (Admin Directory API)
```typescript
{
  isNativeApp: boolean,      // Mobile/desktop vs web
  isUnverified: boolean,     // Anonymous/unverified app flag
  tokenType: string          // OAuth token characteristics
}
```
**API**: `GET /admin/directory/v1/users/{userKey}/tokens`  
**Complexity**: LOW (1-2 hours)

### 2. User Context ✅ (Admin Directory API)
```typescript
{
  authorizedBy: {
    email: string,
    isAdmin: boolean,        // Admin vs regular user
    department: string,      // "Engineering", "Sales"
    orgUnit: string,         // "/Engineering/Backend"
    title: string
  }
}
```
**API**: `GET /admin/directory/v1/users/{userKey}`  
**Complexity**: LOW (1-2 hours)

### 3. Usage Statistics ✅ (Admin Reports API)
```typescript
{
  usage: {
    totalEvents: 127,
    last7Days: 23,
    last30Days: 89,
    peakDay: "2025-09-28",
    averageDailyUsage: 4.2,
    trend: { increasing: true, percentage: 15 }
  }
}
```
**API**: `GET /admin/reports/v1/activity/users/all/applications/token` (filtered by client_id)  
**Complexity**: MEDIUM (3-4 hours, requires aggregation)

### 4. Activity Timeline ✅ (Admin Reports API)
```typescript
{
  activityTimeline: [
    {
      date: "2025-10-06T14:23:00Z",
      eventType: "api_access",
      action: "Drive API access",
      user: "darren@baliluxurystays.com",
      ipAddress: "203.45.67.89"
    },
    {
      date: "2025-09-14T09:15:00Z",
      eventType: "authorization",
      action: "First authorization",
      metadata: { scopes: [...] }
    }
  ]
}
```
**API**: Same as #3, parsed into timeline  
**Complexity**: MEDIUM (2-3 hours)

### 5. Enhanced Scope Descriptions ✅ (Scope Library)
```typescript
{
  permissions: [
    {
      scope: "https://www.googleapis.com/auth/drive.readonly",
      service: "Google Drive",
      accessLevel: "Read-only",
      riskScore: 65,
      riskLevel: "HIGH",
      description: "Can read all files...",
      potentialAbuse: ["Data exfiltration", "IP theft"],
      recommendedAlternative: "drive.metadata.readonly",
      regulatoryImpact: { gdpr: true, hipaa: false }
    }
  ]
}
```
**API**: Local database/JSON library (see scope library below)  
**Complexity**: LOW (2-3 hours to build library)

### 6. Access Patterns ✅ (Admin Reports API)
```typescript
{
  accessPatterns: {
    ipAddresses: [{ ip: "203.45.67.89", country: "AU", count: 47 }],
    accessTimes: {
      businessHours: 78%,
      offHours: 22%,
      weekends: 5%
    }
  }
}
```
**API**: Admin Reports API events + IP geolocation  
**Complexity**: MEDIUM (4-6 hours, requires GeoIP integration)

### 7. Scope Evolution ✅ (Admin Reports API)
```typescript
{
  scopeEvolution: {
    originalScopes: ["drive.readonly", "userinfo.email"],
    addedScopes: [
      { scope: "gmail.readonly", addedDate: "2025-09-28", addedBy: "..." }
    ],
    removedScopes: []
  }
}
```
**API**: Correlate multiple `authorize` events over time  
**Complexity**: MEDIUM (3-4 hours)

---

## What We CANNOT Add (Without New Scopes)

### ❌ Drive File Access Tracking
**Requires**: `drive.activity.readonly` scope (NOT currently granted)  
**Complexity**: HIGH (requires re-authorization)  
**Recommendation**: DEFER to Phase 3

### ❌ Last Used Timestamp
**Reason**: Google doesn't provide this in any API  
**Workaround**: Use "last activity event" from audit logs (approximate)

---

## OAuth Scope Risk Library (Top 20 Scopes)

Copy-paste this for scope enrichment:

```json
{
  "https://mail.google.com/": {
    "service": "Gmail",
    "accessLevel": "Full read/write/send",
    "riskScore": 95,
    "riskLevel": "CRITICAL",
    "description": "Complete access to all emails, can send as user",
    "potentialAbuse": ["Email interception", "Phishing", "Data theft"],
    "recommendedAlternative": "gmail.readonly",
    "regulatoryImpact": { "gdpr": true, "hipaa": false, "pci": false }
  },
  "https://www.googleapis.com/auth/drive": {
    "service": "Google Drive",
    "accessLevel": "Full read/write/delete",
    "riskScore": 85,
    "riskLevel": "HIGH",
    "description": "Complete access to all Drive files and folders",
    "potentialAbuse": ["Mass file exfiltration", "IP theft", "Ransomware"],
    "recommendedAlternative": "drive.file",
    "regulatoryImpact": { "gdpr": true, "hipaa": false, "pci": false }
  },
  "https://www.googleapis.com/auth/drive.readonly": {
    "service": "Google Drive",
    "accessLevel": "Read-only",
    "riskScore": 65,
    "riskLevel": "HIGH",
    "description": "Read all files and folders, including shared items",
    "potentialAbuse": ["Data exfiltration", "Competitive intelligence"],
    "recommendedAlternative": "drive.metadata.readonly",
    "regulatoryImpact": { "gdpr": true, "hipaa": false, "pci": false }
  },
  "https://www.googleapis.com/auth/admin.directory.user": {
    "service": "Workspace Admin",
    "accessLevel": "Full user management",
    "riskScore": 90,
    "riskLevel": "CRITICAL",
    "description": "Create, delete, modify users and reset passwords",
    "potentialAbuse": ["Account takeover", "Privilege escalation"],
    "recommendedAlternative": "admin.directory.user.readonly",
    "regulatoryImpact": { "gdpr": true, "hipaa": false, "pci": false }
  },
  "https://www.googleapis.com/auth/calendar": {
    "service": "Google Calendar",
    "accessLevel": "Full read/write",
    "riskScore": 50,
    "riskLevel": "MEDIUM",
    "description": "Access and modify all calendar events",
    "potentialAbuse": ["Schedule tracking", "Meeting intelligence"],
    "recommendedAlternative": "calendar.readonly",
    "regulatoryImpact": { "gdpr": true, "hipaa": false, "pci": false }
  },
  "https://www.googleapis.com/auth/gmail.readonly": {
    "service": "Gmail",
    "accessLevel": "Read-only",
    "riskScore": 70,
    "riskLevel": "HIGH",
    "description": "Read all email messages and settings",
    "potentialAbuse": ["Email content analysis", "Sensitive data exposure"],
    "recommendedAlternative": "gmail.metadata",
    "regulatoryImpact": { "gdpr": true, "hipaa": false, "pci": false }
  },
  "https://www.googleapis.com/auth/userinfo.email": {
    "service": "OAuth",
    "accessLevel": "Basic identity",
    "riskScore": 10,
    "riskLevel": "LOW",
    "description": "User's email address only",
    "potentialAbuse": ["Email harvesting"],
    "recommendedAlternative": null,
    "regulatoryImpact": { "gdpr": true, "hipaa": false, "pci": false }
  },
  "https://www.googleapis.com/auth/userinfo.profile": {
    "service": "OAuth",
    "accessLevel": "Basic profile",
    "riskScore": 10,
    "riskLevel": "LOW",
    "description": "Name, picture, locale",
    "potentialAbuse": ["Profile data collection"],
    "recommendedAlternative": null,
    "regulatoryImpact": { "gdpr": true, "hipaa": false, "pci": false }
  },
  "openid": {
    "service": "OAuth",
    "accessLevel": "Authentication",
    "riskScore": 5,
    "riskLevel": "LOW",
    "description": "OpenID Connect authentication",
    "potentialAbuse": ["Identity impersonation"],
    "recommendedAlternative": null,
    "regulatoryImpact": { "gdpr": false, "hipaa": false, "pci": false }
  },
  "https://www.googleapis.com/auth/drive.file": {
    "service": "Google Drive",
    "accessLevel": "App-created files only",
    "riskScore": 25,
    "riskLevel": "MEDIUM",
    "description": "Access only files created by this app",
    "potentialAbuse": ["Limited to app files"],
    "recommendedAlternative": null,
    "regulatoryImpact": { "gdpr": false, "hipaa": false, "pci": false }
  },
  "https://www.googleapis.com/auth/drive.metadata.readonly": {
    "service": "Google Drive",
    "accessLevel": "Metadata only",
    "riskScore": 20,
    "riskLevel": "LOW",
    "description": "File names, types, owners - no content",
    "potentialAbuse": ["File structure intelligence"],
    "recommendedAlternative": null,
    "regulatoryImpact": { "gdpr": false, "hipaa": false, "pci": false }
  },
  "https://www.googleapis.com/auth/calendar.readonly": {
    "service": "Google Calendar",
    "accessLevel": "Read-only",
    "riskScore": 35,
    "riskLevel": "MEDIUM",
    "description": "View all calendar events",
    "potentialAbuse": ["Schedule tracking"],
    "recommendedAlternative": null,
    "regulatoryImpact": { "gdpr": true, "hipaa": false, "pci": false }
  },
  "https://www.googleapis.com/auth/admin.reports.audit.readonly": {
    "service": "Workspace Admin",
    "accessLevel": "Audit logs",
    "riskScore": 45,
    "riskLevel": "MEDIUM",
    "description": "Read admin audit logs",
    "potentialAbuse": ["Activity monitoring"],
    "recommendedAlternative": null,
    "regulatoryImpact": { "gdpr": false, "hipaa": false, "pci": false }
  },
  "https://www.googleapis.com/auth/script.projects.readonly": {
    "service": "Apps Script",
    "accessLevel": "Read projects",
    "riskScore": 30,
    "riskLevel": "MEDIUM",
    "description": "View Apps Script projects",
    "potentialAbuse": ["Code inspection"],
    "recommendedAlternative": null,
    "regulatoryImpact": { "gdpr": false, "hipaa": false, "pci": false }
  }
}
```

---

## Implementation Checklist

### Phase 1: Quick Wins (8-16 hours)

- [ ] **Create scope library** (2-3 hours)
  - [ ] Create `oauth_scope_library` database table
  - [ ] Seed with top 20 scopes (use JSON above)
  - [ ] Add TypeScript types in shared-types

- [ ] **Add Directory API integration** (2-3 hours)
  - [ ] Create `GoogleDirectoryService`
  - [ ] Implement `getTokenMetadata(userKey, clientId)`
  - [ ] Implement `getUserDetails(userKey)`
  - [ ] Add to discovery flow

- [ ] **Enhance metadata extraction** (3-4 hours)
  - [ ] Update `google-api-client-service.ts`
  - [ ] Add token metadata fields
  - [ ] Add user context fields
  - [ ] Store in `platform_metadata` JSONB

- [ ] **Build scope enrichment** (2-3 hours)
  - [ ] Create `OAuthScopeEnrichmentService`
  - [ ] Join scopes with library data
  - [ ] Add risk calculations
  - [ ] Return enriched permissions array

- [ ] **Create View Details API** (3-4 hours)
  - [ ] New endpoint: `GET /api/automations/:id/details`
  - [ ] Aggregate all metadata sources
  - [ ] Return comprehensive response
  - [ ] Add error handling

### Phase 2: Analytics (16-24 hours)

- [ ] **Usage statistics** (4-6 hours)
  - [ ] Create `OAuthAppUsageAnalyzerService`
  - [ ] Query Admin Reports API
  - [ ] Aggregate by time periods
  - [ ] Calculate trends

- [ ] **Activity timeline** (3-4 hours)
  - [ ] Create `OAuthAppTimelineBuilderService`
  - [ ] Parse audit log events
  - [ ] Build chronological timeline
  - [ ] Add event categorization

- [ ] **Access patterns** (4-6 hours)
  - [ ] IP address extraction
  - [ ] GeoIP integration (MaxMind)
  - [ ] Time-of-day analysis
  - [ ] Anomaly detection (basic)

- [ ] **Scope evolution** (3-4 hours)
  - [ ] Historical scope tracking
  - [ ] Diff algorithm
  - [ ] Change event detection

- [ ] **Frontend UI** (6-8 hours)
  - [ ] View Details modal redesign
  - [ ] 4-tab layout (Overview, Permissions, Activity, Risk)
  - [ ] Data visualization (charts)
  - [ ] Export functionality

---

## API Query Examples

### Get Token Metadata
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://admin.googleapis.com/admin/directory/v1/users/darren@baliluxurystays.com/tokens"
```

### Get User Details
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://admin.googleapis.com/admin/directory/v1/users/darren@baliluxurystays.com"
```

### Get Token Activity Events
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://admin.googleapis.com/admin/reports/v1/activity/users/all/applications/token?\
startTime=2025-09-01T00:00:00Z&\
filters=client_id==77377267392-xxx.apps.googleusercontent.com&\
maxResults=1000"
```

---

## Testing Strategy

### Unit Tests
```typescript
describe('OAuthScopeEnrichmentService', () => {
  it('should enrich drive.readonly with HIGH risk', () => {
    const enriched = enrichScope('https://www.googleapis.com/auth/drive.readonly');
    expect(enriched.riskLevel).toBe('HIGH');
    expect(enriched.riskScore).toBe(65);
  });
});
```

### Integration Tests
```typescript
describe('GET /api/automations/:id/details', () => {
  it('should return enhanced metadata', async () => {
    const response = await request(app).get('/api/automations/123/details');
    expect(response.body).toHaveProperty('usage');
    expect(response.body).toHaveProperty('activityTimeline');
    expect(response.body.permissions[0]).toHaveProperty('riskScore');
  });
});
```

---

## Success Criteria

✅ **User sees 10+ new data points in View Details**  
✅ **All scopes have risk levels and descriptions**  
✅ **Activity timeline shows historical events**  
✅ **Usage statistics show trends**  
✅ **No new OAuth scopes required**  
✅ **Implementation complete in 2 weeks**

---

## Files to Modify

**Backend:**
- `backend/src/services/google-directory.service.ts` (NEW)
- `backend/src/services/oauth-scope-enrichment.service.ts` (NEW)
- `backend/src/services/oauth-app-usage-analyzer.service.ts` (NEW)
- `backend/src/services/oauth-app-timeline-builder.service.ts` (NEW)
- `backend/src/routes/automations.ts` (ADD `/details` endpoint)
- `backend/src/connectors/google.ts` (ENHANCE metadata extraction)

**Database:**
- `backend/src/database/migrations/XXX_create_oauth_scope_library.sql` (NEW)

**Shared Types:**
- `shared-types/src/models/automation.ts` (ADD OAuthAppDetails interface)

**Frontend:**
- `frontend/src/components/automations/AutomationDetailsModal.tsx` (NEW)
- `frontend/src/components/automations/PermissionsTab.tsx` (NEW)
- `frontend/src/components/automations/ActivityTab.tsx` (NEW)
- `frontend/src/components/automations/RiskTab.tsx` (NEW)

---

**Quick Start**: Implement Phase 1 first (8-16 hours) for immediate value!
