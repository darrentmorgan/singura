# Google Admin Reports API: OAuth App Metadata Availability Research

**Date**: 2025-10-06  
**Urgency**: P1  
**Status**: Complete

---

## Executive Summary

This research document provides a comprehensive analysis of metadata availability for OAuth apps detected via Google Workspace Admin Reports API. It categorizes each required metadata field by feasibility and provides implementation guidance.

### Quick Answer Matrix

| Metadata Field | Available? | Source | Implementation Complexity |
|---------------|------------|--------|---------------------------|
| **Platform** | ✅ Yes | Hardcoded | Trivial (1 line) |
| **App Name** | ✅ Yes | `event.parameters[name=app_name]` | Low (extraction fix) |
| **Client ID** | ✅ Yes | `event.parameters[name=client_id]` | Low (extraction fix) |
| **Scopes** | ✅ Yes | `event.parameters[name=scope]` | Low (extraction fix) |
| **Created Date** | ✅ Yes | `event.id.time` (first occurrence) | Medium (correlation) |
| **Created By** | ✅ Yes | `event.actor.email` | Low (extraction fix) |
| **Last Used** | ❌ No | Not provided by Google | Not feasible |
| **Risk Factors** | ✅ Yes | Calculated from scopes | Already implemented |

---

## 1. Google Admin Reports API Schema

### 1.1 Complete Activity Object Structure

Based on official Google documentation ([activities.list](https://developers.google.com/admin-sdk/reports/reference/rest/v1/activities/list#Activity)):

```json
{
  "kind": "string",
  "etag": "string", 
  "ownerDomain": "string",
  "ipAddress": "string",
  "id": {
    "time": "string",              // ✅ TIMESTAMP AVAILABLE
    "uniqueQualifier": "string",
    "applicationName": "string",    // "login" or "token"
    "customerId": "string"          // Organization ID
  },
  "actor": {
    "profileId": "string",
    "email": "string",               // ✅ USER EMAIL AVAILABLE
    "callerType": "string",          // "USER", "APPLICATION", etc.
    "key": "string",
    "applicationInfo": {             // ✅ OAUTH APP INFO AVAILABLE
      "oauthClientId": "string",
      "applicationName": "string", 
      "impersonation": "boolean"
    }
  },
  "events": [
    {
      "type": "string",
      "name": "string",              // "oauth2_authorize", "authorize", etc.
      "parameters": [
        {
          "name": "string",          // ✅ PARAMETER NAMES
          "value": "string",         // ✅ SINGLE VALUES
          "multiValue": ["string"],  // ✅ ARRAY VALUES (scopes)
          "intValue": "string", 
          "boolValue": "boolean"
        }
      ]
    }
  ]
}
```

### 1.2 OAuth Event Types

**Login Application (`applicationName: 'login'`)**:
- Event names: `oauth2_authorize`, `oauth2_approve`, `login_success`
- Available parameters:
  - `application_name` - OAuth app display name
  - `oauth_client_id` - Client ID
  - `oauth_scopes` (multiValue) - Granted scopes
  - `login_type` - Type of login
  - `is_third_party_id` - Third-party app flag

**Token Application (`applicationName: 'token'`)**:
- Event names: `authorize`, `revoke`
- Available parameters:
  - `app_name` - Application name
  - `client_id` - Client ID
  - `client_type` - "WEB", "NATIVE_ANDROID", etc.
  - `scope` (multiValue) - Token scopes
  - `scope_data` - Additional scope info
  - `api_name` - API used
  - `method_name` - Method called
  - `product_bucket` - "DRIVE", "GMAIL", etc.

---

## 2. Current Implementation Analysis

### 2.1 What We're Currently Extracting

**File**: `/Users/darrenmorgan/AI_Projects/saas-xray/backend/src/services/detection/google-oauth-ai-detector.service.ts`

```typescript
// Lines 272-295: extractParameters() method
private extractParameters(events: any[]): Record<string, any> {
  const params: Record<string, any> = {};
  
  events.forEach(event => {
    if (event.parameters) {
      event.parameters.forEach((param: any) => {
        if (param.multiValue) {
          params[param.name] = param.multiValue;  // ✅ Array values
        } else if (param.value) {
          params[param.name] = param.value;       // ✅ String values
        } else if (param.intValue) {
          params[param.name] = parseInt(param.intValue);
        } else if (param.boolValue !== undefined) {
          params[param.name] = param.boolValue;
        }
      });
    }
  });
  
  return params;
}
```

**Current Extraction**:
```typescript
// Lines 84-89: detectAIPlatformLogin()
const applicationName = parameters.application_name ||
                      parameters.app_name ||
                      parameters.client_name;
const clientId = parameters.oauth_client_id ||
                parameters.client_id;
```

### 2.2 What We're NOT Extracting (But Should)

**Actor Information** (Lines 251-265 in `google.ts`):
```typescript
// ✅ ALREADY AVAILABLE IN AUDIT LOG MAPPING
actorId: activity.actor?.email || 'system',
actorType: mapGoogleActorType(activity.actor?.callerType),
```

**Timestamp Information**:
```typescript
// ✅ ALREADY AVAILABLE
timestamp: new Date(activity.id?.time || Date.now()),
```

**Missing**:
- Not correlating first occurrence per `client_id` to get "created date"
- Not extracting `event.actor.email` as "created by"

---

## 3. Metadata Availability Assessment

### Tier 1: Already Available (Just Fix Mapping)

#### 3.1 Platform (Hardcoded)
**Status**: ✅ Trivial fix  
**Source**: N/A - Google OAuth apps detected from Google Workspace  
**Implementation**:
```typescript
// In AutomationEvent metadata
metadata: {
  platform: 'google',  // Hardcoded
  ...
}
```

#### 3.2 App Name
**Status**: ✅ Available  
**Source**: `event.parameters[name=app_name]` or `event.parameters[name=application_name]`  
**Current Code**: Already extracting (line 85-87 in detector)  
**Fix Required**: Ensure mapped to `AutomationEvent.name`

#### 3.3 Client ID
**Status**: ✅ Available  
**Source**: `event.parameters[name=client_id]` or `event.parameters[name=oauth_client_id]`  
**Current Code**: Already extracting (line 88-89)  
**Fix Required**: Add to `metadata.clientId`

#### 3.4 Scopes/Permissions
**Status**: ✅ Available  
**Source**: `event.parameters[name=scope]` or `event.parameters[name=oauth_scopes]` (multiValue)  
**Current Code**: Already extracting in `platform_metadata`  
**Fix Required**: Map to `AutomationEvent.permissions` array

#### 3.5 Risk Factors
**Status**: ✅ Already Implemented  
**Source**: Calculated from scopes via `assessOAuthRiskIndicators()`  
**No Fix Required**: Working correctly

---

### Tier 2: Available from Audit Logs (Requires Correlation)

#### 3.6 Created Date
**Status**: ✅ Available with correlation  
**Source**: `event.id.time` of FIRST oauth event per `client_id`  
**Implementation Complexity**: Medium

**Algorithm**:
```typescript
// Pseudo-code
const oauthAppFirstSeen = new Map<string, Date>();

for (const event of allOAuthEvents) {
  const clientId = extractClientId(event);
  const timestamp = new Date(event.id.time);
  
  if (!oauthAppFirstSeen.has(clientId) || 
      timestamp < oauthAppFirstSeen.get(clientId)) {
    oauthAppFirstSeen.set(clientId, timestamp);
  }
}

// Use as createdAt for AutomationEvent
automation.createdAt = oauthAppFirstSeen.get(clientId);
```

**Trade-offs**:
- ✅ Accurate for recent authorizations (within audit log retention: 180 days)
- ❌ Inaccurate for older apps (will show first event in last 180 days, not actual creation)
- ⚠️ Requires fetching ALL events (not just AI platforms) to find earliest

**Recommendation**: Implement with caveat documentation

#### 3.7 Created By (Authorizing User)
**Status**: ✅ Available  
**Source**: `event.actor.email` from authorization event  
**Implementation Complexity**: Low

**Current Code** (already extracting):
```typescript
// google.ts line 253
actorId: activity.actor?.email || 'system',
```

**Fix Required**:
```typescript
// In AutomationEvent
owner: {
  id: event.actor.profileId,
  name: event.actor.email.split('@')[0],  // Derive from email
  email: event.actor.email
}
```

---

### Tier 3: Not Available (Document Limitation)

#### 3.8 Last Used Date
**Status**: ❌ Not available  
**Reason**: Google Admin Reports API tracks authorization events, not token usage  

**Evidence**:
- Token application only logs `authorize` and `revoke` events
- No `token_used`, `api_call`, or `last_access` events
- Activity logs are per-user-action, not per-app-usage

**Workaround Attempts**:
1. **Admin SDK Directory API `tokens.list()`**: Does not include last_used timestamp
2. **Audit log frequency analysis**: Unreliable (no guarantee of recent usage)
3. **Drive/Gmail activity correlation**: Requires extensive cross-referencing, still incomplete

**Recommendation**: Mark as "Unknown" in UI, document limitation

---

### Tier 4: Requires Admin Access (May Not Be Possible)

#### 3.9 Directory API Tokens Endpoint
**API**: `admin.directory.v1.tokens.list({ userKey: 'all' })`  
**Status**: ⚠️ Limited metadata  

**Available Fields**:
```typescript
{
  clientId: string;          // ✅ Client ID
  displayText: string;       // ✅ App name
  scopes: string[];          // ✅ Scopes
  userKey: string;           // ✅ User ID
  anonymous: boolean;        // ✅ Third-party flag
  nativeApp: boolean;        // ✅ App type
  kind: string;
  etag: string;
}
```

**Missing Fields**:
- ❌ Creation timestamp
- ❌ Last used timestamp
- ❌ Authorization history

**Access Requirements**:
- Requires admin privileges
- May need super admin for all users
- `https://www.googleapis.com/auth/admin.directory.user.security` scope

**Recommendation**: Not worth implementing - doesn't add value over audit logs

---

## 4. Implementation Recommendations

### 4.1 Quick Wins (Fix Mapping)

**Priority**: P0 - Immediate  
**Effort**: 2 hours  
**Impact**: High

```typescript
// File: backend/src/connectors/google.ts
// In discoverAutomations() method

// Map OAuth apps from audit logs to AutomationEvent
const automation: AutomationEvent = {
  id: clientId,
  name: appName || 'Unknown OAuth App',  // ✅ FIX: Use app_name
  type: 'integration',
  platform: 'google',  // ✅ FIX: Hardcoded
  status: 'active',
  trigger: 'oauth_authorization',
  actions: scopes,
  
  // ✅ FIX: Extract from audit log correlation
  createdAt: firstSeenMap.get(clientId) || new Date(),
  
  lastTriggered: null,  // Not available
  
  // ✅ FIX: Map from event.actor
  owner: {
    id: actorProfileId,
    name: actorEmail.split('@')[0],
    email: actorEmail
  },
  
  // ✅ FIX: Add client metadata
  metadata: {
    platform: 'google',
    clientId: clientId,
    clientType: clientType,
    scopes: scopes,
    riskFactors: riskIndicators,
    detectedFrom: 'admin_reports_api',
    limitationNote: 'Last used date not available from Google API'
  },
  
  // ✅ Already implemented
  permissions: scopes,
  riskLevel: calculateRiskLevel(riskIndicators)
};
```

### 4.2 Medium Effort (Audit Log Correlation)

**Priority**: P1 - Next sprint  
**Effort**: 1 day  
**Impact**: Medium

**Create OAuth App Correlation Service**:

```typescript
// File: backend/src/services/google-oauth-app-correlator.service.ts

interface OAuthAppMetadata {
  clientId: string;
  appName: string;
  firstSeen: Date;              // ✅ Correlated from earliest event
  lastAuthorizationEvent: Date;  // ✅ Most recent oauth event
  authorizedBy: string[];        // ✅ List of users who authorized
  scopes: Set<string>;           // ✅ All granted scopes
  eventCount: number;            // ✅ Total authorization events
}

class GoogleOAuthAppCorrelator {
  /**
   * Correlate all OAuth events by client_id to build app metadata
   */
  async correlateOAuthApps(
    events: any[]
  ): Promise<Map<string, OAuthAppMetadata>> {
    const appMap = new Map<string, OAuthAppMetadata>();
    
    for (const event of events) {
      const params = this.extractParameters(event.events);
      const clientId = params.oauth_client_id || params.client_id;
      
      if (!clientId) continue;
      
      const timestamp = new Date(event.id.time);
      const userEmail = event.actor.email;
      
      if (!appMap.has(clientId)) {
        appMap.set(clientId, {
          clientId,
          appName: params.app_name || params.application_name,
          firstSeen: timestamp,
          lastAuthorizationEvent: timestamp,
          authorizedBy: [userEmail],
          scopes: new Set(params.oauth_scopes || params.scope || []),
          eventCount: 1
        });
      } else {
        const app = appMap.get(clientId)!;
        
        // Update earliest timestamp
        if (timestamp < app.firstSeen) {
          app.firstSeen = timestamp;
        }
        
        // Update latest event
        if (timestamp > app.lastAuthorizationEvent) {
          app.lastAuthorizationEvent = timestamp;
        }
        
        // Add user
        if (!app.authorizedBy.includes(userEmail)) {
          app.authorizedBy.push(userEmail);
        }
        
        // Merge scopes
        (params.oauth_scopes || params.scope || []).forEach(
          (scope: string) => app.scopes.add(scope)
        );
        
        app.eventCount++;
      }
    }
    
    return appMap;
  }
}
```

**Integration**:
```typescript
// In google.ts discoverAutomations()

const correlator = new GoogleOAuthAppCorrelator();
const appMetadata = await correlator.correlateOAuthApps(allOAuthEvents);

for (const [clientId, metadata] of appMetadata) {
  const automation: AutomationEvent = {
    id: clientId,
    name: metadata.appName,
    createdAt: metadata.firstSeen,  // ✅ Correlated creation date
    owner: {
      id: metadata.authorizedBy[0],
      name: metadata.authorizedBy[0].split('@')[0],
      email: metadata.authorizedBy[0]
    },
    metadata: {
      ...metadata,
      totalUsers: metadata.authorizedBy.length,
      createdAtAccuracy: metadata.eventCount > 10 ? 'high' : 'estimated'
    }
  };
}
```

### 4.3 Not Feasible (Document Limitation)

**Priority**: P2 - Documentation  
**Effort**: 30 minutes  
**Impact**: User expectations

**UI Component**:
```typescript
// frontend/src/components/AutomationDetails.tsx

<Tooltip content="Google does not provide last usage timestamp via their API">
  <InfoIcon />
  Last Used: Not Available
</Tooltip>
```

**API Response Documentation**:
```typescript
// In API response
{
  automation: {
    ...
    lastUsed: null,
    metadata: {
      limitations: [
        "Last used date not available from Google Admin Reports API",
        "Creation date estimated from audit log retention window (180 days)"
      ]
    }
  }
}
```

---

## 5. Code Examples

### 5.1 Extract Actor Email (Created By)

**File**: `backend/src/connectors/google.ts`

```typescript
// BEFORE (lines 696-703)
for (const activity of allActivities) {
  const actorEmail = activity.actor?.email;
  // Not using this for automation owner
}

// AFTER
for (const activity of allActivities) {
  const actorEmail = activity.actor?.email;
  const clientId = extractClientId(activity);
  
  // Store first user who authorized this app
  if (!oauthAppOwners.has(clientId)) {
    oauthAppOwners.set(clientId, {
      id: activity.actor.profileId,
      name: actorEmail.split('@')[0],
      email: actorEmail
    });
  }
}
```

### 5.2 Find First Authorization Timestamp

```typescript
// Add to google.ts discoverAutomations()

const oauthAppFirstSeen = new Map<string, Date>();

// Process all OAuth events chronologically
const sortedEvents = [...loginEvents, ...tokenEvents]
  .sort((a, b) => 
    new Date(a.id.time).getTime() - new Date(b.id.time).getTime()
  );

for (const event of sortedEvents) {
  const clientId = extractClientId(event);
  const timestamp = new Date(event.id.time);
  
  if (!oauthAppFirstSeen.has(clientId)) {
    oauthAppFirstSeen.set(clientId, timestamp);
  }
}

// Use in AutomationEvent
automation.createdAt = oauthAppFirstSeen.get(clientId) || new Date();
```

### 5.3 Extract All Available Metadata

```typescript
// Complete metadata extraction
function buildOAuthAppMetadata(
  event: any,
  correlatedData: OAuthAppMetadata
): Record<string, any> {
  const params = extractParameters(event.events);
  
  return {
    // Platform identification
    platform: 'google',
    
    // App identification
    clientId: params.oauth_client_id || params.client_id,
    clientType: params.client_type || 'unknown',
    appName: params.app_name || params.application_name,
    
    // Authorization details
    scopes: Array.from(correlatedData.scopes),
    isThirdParty: params.is_third_party_id !== false,
    
    // Temporal metadata (with caveats)
    firstSeen: correlatedData.firstSeen,
    lastAuthorizationEvent: correlatedData.lastAuthorizationEvent,
    createdAtAccuracy: determineTimestampAccuracy(correlatedData),
    
    // User metadata
    authorizedByUsers: correlatedData.authorizedBy,
    totalAuthorizations: correlatedData.eventCount,
    
    // Risk assessment
    riskIndicators: assessOAuthRiskIndicators(params, 'google'),
    sensitiveScopes: identifySensitiveScopes(correlatedData.scopes),
    
    // Limitations
    limitations: [
      'Last used timestamp not available from Google API',
      'Creation date based on audit log retention (max 180 days)'
    ],
    
    // Data source
    detectedFrom: 'google_admin_reports_api',
    apiVersion: 'reports_v1'
  };
}

function determineTimestampAccuracy(data: OAuthAppMetadata): string {
  const daysSinceFirstEvent = 
    (Date.now() - data.firstSeen.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysSinceFirstEvent > 170) {
    return 'estimated'; // Near retention limit
  } else if (data.eventCount > 5) {
    return 'high'; // Multiple events, likely accurate
  } else {
    return 'medium'; // Few events, may be accurate
  }
}
```

---

## 6. Testing Strategy

### 6.1 Unit Tests

```typescript
// backend/src/__tests__/services/google-oauth-app-correlator.test.ts

describe('GoogleOAuthAppCorrelator', () => {
  it('should find earliest authorization timestamp', () => {
    const events = [
      createMockEvent('2025-01-15', 'client-123'),
      createMockEvent('2025-01-10', 'client-123'),  // Earlier
      createMockEvent('2025-01-20', 'client-123')
    ];
    
    const correlator = new GoogleOAuthAppCorrelator();
    const result = correlator.correlateOAuthApps(events);
    
    expect(result.get('client-123').firstSeen).toEqual(
      new Date('2025-01-10')
    );
  });
  
  it('should aggregate all users who authorized app', () => {
    const events = [
      createMockEvent('2025-01-15', 'client-123', 'user1@company.com'),
      createMockEvent('2025-01-16', 'client-123', 'user2@company.com'),
      createMockEvent('2025-01-17', 'client-123', 'user1@company.com')
    ];
    
    const correlator = new GoogleOAuthAppCorrelator();
    const result = correlator.correlateOAuthApps(events);
    
    expect(result.get('client-123').authorizedBy).toEqual([
      'user1@company.com',
      'user2@company.com'
    ]);
  });
  
  it('should merge scopes from multiple events', () => {
    const events = [
      createMockEventWithScopes('2025-01-15', 'client-123', ['email', 'profile']),
      createMockEventWithScopes('2025-01-16', 'client-123', ['drive.readonly'])
    ];
    
    const correlator = new GoogleOAuthAppCorrelator();
    const result = correlator.correlateOAuthApps(events);
    
    expect(Array.from(result.get('client-123').scopes)).toEqual([
      'email',
      'profile',
      'drive.readonly'
    ]);
  });
});
```

### 6.2 Integration Tests

```typescript
// backend/src/__tests__/integration/google-oauth-metadata.integration.test.ts

describe('Google OAuth Metadata Extraction', () => {
  it('should extract complete metadata for real OAuth apps', async () => {
    const connector = new GoogleConnector();
    await connector.authenticate(testCredentials);
    
    const automations = await connector.discoverAutomations();
    
    const oauthApp = automations.find(a => a.type === 'integration');
    
    expect(oauthApp).toMatchObject({
      name: expect.any(String),           // ✅ App name
      createdAt: expect.any(Date),        // ✅ First seen
      owner: {
        email: expect.stringMatching(/@/) // ✅ Authorizing user
      },
      metadata: {
        platform: 'google',               // ✅ Hardcoded
        clientId: expect.any(String),     // ✅ Client ID
        scopes: expect.any(Array),        // ✅ Scopes
        riskIndicators: expect.any(Array) // ✅ Risk factors
      }
    });
  });
});
```

---

## 7. Metadata Availability Summary

### Complete Matrix

| Metadata Field | AutomationEvent Field | Source | Status | Implementation |
|---------------|----------------------|--------|--------|----------------|
| Platform | `platform` | Hardcoded `'google'` | ✅ Available | 1 line |
| App Name | `name` | `event.parameters[name=app_name]` | ✅ Available | Mapping fix |
| Client ID | `metadata.clientId` | `event.parameters[name=client_id]` | ✅ Available | Mapping fix |
| Client Type | `metadata.clientType` | `event.parameters[name=client_type]` | ✅ Available | Extraction |
| Scopes | `permissions` | `event.parameters[name=scope]` | ✅ Available | Array mapping |
| Created Date | `createdAt` | `event.id.time` (first per clientId) | ✅ Available | Correlation |
| Created By | `owner.email` | `event.actor.email` | ✅ Available | Mapping fix |
| Authorized Users | `metadata.authorizedBy` | `event.actor.email` (all) | ✅ Available | Aggregation |
| Last Authorization | `metadata.lastAuthEvent` | `event.id.time` (latest) | ✅ Available | Correlation |
| Last Used | `lastTriggered` | N/A | ❌ Not Available | Document limitation |
| Risk Factors | `riskLevel`, `metadata.riskIndicators` | Calculated | ✅ Available | Already implemented |

### Accuracy Caveats

**Created Date Accuracy**:
- ✅ Accurate for apps authorized in last 180 days
- ⚠️ May be inaccurate for older apps (shows first event in retention window)
- 📊 Confidence level: Include `metadata.createdAtAccuracy` field

**Last Used Limitation**:
- ❌ Google does not track per-app usage timestamps
- ❌ Workarounds are unreliable
- ✅ Document clearly in UI and API responses

---

## 8. Next Steps

### Immediate (This Sprint)

1. **Fix Metadata Mapping** (2 hours)
   - [ ] Add `platform: 'google'` to AutomationEvent
   - [ ] Map `app_name` to `name`
   - [ ] Map `client_id` to `metadata.clientId`
   - [ ] Map `event.actor.email` to `owner.email`
   - [ ] Map `scope` to `permissions` array

2. **Document Limitations** (30 minutes)
   - [ ] Add tooltip for "Last Used: Not Available"
   - [ ] Update API documentation
   - [ ] Add `metadata.limitations` field

### Next Sprint

3. **Implement OAuth App Correlation** (1 day)
   - [ ] Create `GoogleOAuthAppCorrelator` service
   - [ ] Add `firstSeen` timestamp correlation
   - [ ] Add `authorizedBy` user aggregation
   - [ ] Add `createdAtAccuracy` confidence field

4. **Add Integration Tests** (4 hours)
   - [ ] Test metadata extraction from real audit logs
   - [ ] Validate correlation logic
   - [ ] Test edge cases (single event, no scopes, etc.)

### Future Enhancements

5. **Enhanced Risk Assessment** (Optional)
   - [ ] Correlate with Drive/Gmail activity for usage patterns
   - [ ] Flag apps with excessive authorizations
   - [ ] Detect unused apps (no events in 90 days)

---

## 9. Limitations Documentation

### For End Users

```markdown
## Google OAuth App Metadata

SaaS X-Ray detects OAuth apps authorized in your Google Workspace using the Admin Reports API.

**Available Metadata**:
- ✅ App name and client ID
- ✅ Granted scopes and permissions
- ✅ Users who authorized the app
- ✅ First authorization date (within 180-day retention)
- ✅ Risk assessment based on scopes

**Limitations**:
- ❌ **Last used date**: Google does not provide per-app usage timestamps
- ⚠️ **Creation date accuracy**: Limited by 180-day audit log retention. Apps authorized before this window show the earliest event we can see, not the actual creation date.

**Why These Limitations Exist**:
Google's Admin Reports API tracks authorization events (when users grant access) but does not track token usage events (when apps actually use the granted access). This is a platform limitation, not a SaaS X-Ray limitation.
```

### For Developers

```typescript
/**
 * Google OAuth App Metadata Limitations
 * 
 * AVAILABLE:
 * - Platform: 'google' (hardcoded)
 * - App name: event.parameters[name=app_name]
 * - Client ID: event.parameters[name=client_id]
 * - Scopes: event.parameters[name=scope] (multiValue)
 * - Created date: event.id.time (first occurrence per client_id)
 * - Created by: event.actor.email
 * - Risk factors: Calculated from scopes
 * 
 * NOT AVAILABLE:
 * - Last used timestamp (Google API limitation)
 * - Actual creation date for apps > 180 days old
 * - Per-app API call frequency
 * 
 * WORKAROUNDS ATTEMPTED:
 * - Admin SDK Directory API tokens.list(): No timestamps
 * - Drive/Gmail activity correlation: Unreliable
 * - Audit log frequency analysis: Inaccurate
 * 
 * RECOMMENDATION:
 * - Set lastTriggered = null
 * - Add metadata.limitations array
 * - Document in UI with tooltips
 */
```

---

## 10. References

### Official Documentation

1. **Admin Reports API**:
   - [activities.list()](https://developers.google.com/admin-sdk/reports/reference/rest/v1/activities/list)
   - [Activity Resource](https://developers.google.com/admin-sdk/reports/reference/rest/v1/activities/list#Activity)

2. **Login Application Events**:
   - [Login Audit Events](https://developers.google.com/admin-sdk/reports/v1/appendix/activity/login)

3. **Token Application Events**:
   - [Token Audit Events](https://developers.google.com/admin-sdk/reports/v1/appendix/activity/token)

4. **Directory API (Limited Metadata)**:
   - [tokens.list()](https://developers.google.com/admin-sdk/directory/reference/rest/v1/tokens)
   - [Token Resource](https://developers.google.com/admin-sdk/directory/reference/rest/v1/tokens#Token)

### Code References

- `backend/src/connectors/google.ts`: Lines 285-325 (getAIAuditLogs)
- `backend/src/services/detection/google-oauth-ai-detector.service.ts`: Lines 72-100 (detectAIPlatformLogin)
- `backend/src/__tests__/integration/google-oauth-ai-detection.integration.test.ts`: Lines 190-221 (mock data)
- `backend/src/connectors/types.ts`: Lines 25-45 (AutomationEvent interface)

---

## Appendix A: Sample API Responses

### A.1 Login Application OAuth Event

```json
{
  "kind": "admin#reports#activity",
  "id": {
    "time": "2025-01-15T10:30:00.000Z",
    "uniqueQualifier": "abc123",
    "applicationName": "login",
    "customerId": "C01234567"
  },
  "actor": {
    "email": "user@company.com",
    "profileId": "1234567890",
    "callerType": "USER"
  },
  "ipAddress": "203.0.113.1",
  "events": [
    {
      "type": "login",
      "name": "oauth2_authorize",
      "parameters": [
        {
          "name": "application_name",
          "value": "api.openai.com"
        },
        {
          "name": "oauth_client_id",
          "value": "openai-web-client-123"
        },
        {
          "name": "oauth_scopes",
          "multiValue": [
            "email",
            "profile",
            "openid"
          ]
        },
        {
          "name": "is_third_party_id",
          "boolValue": true
        }
      ]
    }
  ]
}
```

### A.2 Token Application Authorize Event

```json
{
  "kind": "admin#reports#activity",
  "id": {
    "time": "2025-01-15T14:22:00.000Z",
    "uniqueQualifier": "def456",
    "applicationName": "token",
    "customerId": "C01234567"
  },
  "actor": {
    "email": "admin@company.com",
    "profileId": "9876543210",
    "callerType": "USER"
  },
  "events": [
    {
      "type": "authorize",
      "name": "authorize",
      "parameters": [
        {
          "name": "app_name",
          "value": "Claude AI"
        },
        {
          "name": "client_id",
          "value": "anthropic-oauth-client"
        },
        {
          "name": "client_type",
          "value": "WEB"
        },
        {
          "name": "scope",
          "multiValue": [
            "https://www.googleapis.com/auth/drive.readonly",
            "https://www.googleapis.com/auth/gmail.metadata"
          ]
        },
        {
          "name": "product_bucket",
          "value": "DRIVE"
        }
      ]
    }
  ]
}
```

---

## Conclusion

**Summary**: We can extract 7 out of 8 desired metadata fields for Google OAuth apps. The only limitation is "last used timestamp," which is not provided by Google's Admin Reports API.

**Recommended Action**: Implement Tier 1 fixes immediately (2 hours), plan Tier 2 correlation for next sprint (1 day), and document limitations clearly in UI and API responses.

**Success Criteria**:
- ✅ All available metadata properly mapped to AutomationEvent
- ✅ Created date correlation implemented with accuracy indicators
- ✅ Limitations documented and communicated to users
- ✅ Integration tests validate real-world extraction

**Priority**: P1 - Critical for accurate OAuth app detection and risk assessment.

