# Google OAuth Metadata Quick Reference

**TL;DR**: 7 out of 8 metadata fields are available. Only "last used timestamp" is impossible to get from Google's API.

## Metadata Availability Matrix

| Field | Available? | Effort | Source |
|-------|-----------|--------|--------|
| Platform | ✅ Yes | 1 line | Hardcode `'google'` |
| App Name | ✅ Yes | Low | `event.parameters[name=app_name]` |
| Client ID | ✅ Yes | Low | `event.parameters[name=client_id]` |
| Scopes | ✅ Yes | Low | `event.parameters[name=scope]` (multiValue) |
| Created Date | ✅ Yes | Medium | `event.id.time` (first occurrence) |
| Created By | ✅ Yes | Low | `event.actor.email` |
| Last Used | ❌ No | N/A | Google doesn't provide this |
| Risk Score | ✅ Yes | None | Already implemented |

## Quick Implementation Guide

### Step 1: Fix Mapping (2 hours)

```typescript
// In google.ts discoverAutomations()
const automation: AutomationEvent = {
  platform: 'google',  // ADD THIS
  name: params.app_name || params.application_name,  // FIX THIS
  owner: {
    email: event.actor.email  // ADD THIS
  },
  metadata: {
    clientId: params.client_id,  // ADD THIS
    platform: 'google'  // ADD THIS
  },
  permissions: params.scope  // MAP THIS
};
```

### Step 2: Add Correlation (1 day)

```typescript
// Track first occurrence per client_id
const firstSeen = new Map<string, Date>();

for (const event of allEvents.sort(byTimestamp)) {
  const clientId = extractClientId(event);
  if (!firstSeen.has(clientId)) {
    firstSeen.set(clientId, new Date(event.id.time));
  }
}

automation.createdAt = firstSeen.get(clientId);
```

### Step 3: Document Limitations (30 min)

```typescript
metadata: {
  limitations: [
    'Last used date not available from Google API',
    'Creation date accurate within 180-day retention window'
  ]
}
```

## API Response Structure

```json
{
  "id": { "time": "2025-01-15T10:30:00Z" },  // ✅ Timestamp
  "actor": { "email": "user@company.com" },   // ✅ User
  "events": [{
    "parameters": [
      { "name": "app_name", "value": "ChatGPT" },          // ✅ Name
      { "name": "client_id", "value": "openai-123" },      // ✅ ID
      { "name": "scope", "multiValue": ["email", "..."] }  // ✅ Scopes
    ]
  }]
}
```

## Key Files

- **Research**: `.claude/reports/GOOGLE_OAUTH_METADATA_RESEARCH.md`
- **Connector**: `backend/src/connectors/google.ts` (lines 285-325)
- **Detector**: `backend/src/services/detection/google-oauth-ai-detector.service.ts`
- **Types**: `backend/src/connectors/types.ts` (AutomationEvent)

## What's NOT Available

**Last Used Timestamp**:
- Google only tracks authorization events, not token usage
- Directory API tokens.list() doesn't include timestamps
- No workaround exists

**Recommendation**: Set `lastTriggered: null` and document limitation in UI

## Next Actions

1. [ ] Implement Step 1 (mapping fixes)
2. [ ] Implement Step 2 (correlation logic)
3. [ ] Add tests for metadata extraction
4. [ ] Update UI to show limitations tooltip
5. [ ] Document in API reference

**Priority**: P1 - Required for accurate OAuth detection

---

## Visual: Current vs Fixed Implementation

### BEFORE (Missing Metadata)
```typescript
// Current code extracts:
{
  id: clientId,
  name: undefined,           // ❌ Not mapped
  type: 'integration',
  platform: undefined,       // ❌ Not set
  createdAt: new Date(),     // ❌ Wrong (uses current time)
  owner: undefined,          // ❌ Not mapped
  metadata: {
    // Only AI detection metadata, missing OAuth specifics
  }
}
```

### AFTER (Complete Metadata)
```typescript
// Fixed code extracts:
{
  id: clientId,
  name: 'ChatGPT',           // ✅ From app_name parameter
  type: 'integration',
  platform: 'google',        // ✅ Hardcoded
  createdAt: new Date('2024-12-15'),  // ✅ First authorization event
  owner: {                   // ✅ From event.actor
    email: 'user@company.com',
    name: 'user',
    id: 'profileId'
  },
  metadata: {
    platform: 'google',      // ✅ Explicit
    clientId: 'openai-123',  // ✅ From client_id parameter
    clientType: 'WEB',       // ✅ From client_type parameter
    scopes: [...],           // ✅ Already extracting
    riskIndicators: [...],   // ✅ Already implemented
    authorizedBy: [...],     // ✅ From correlation
    createdAtAccuracy: 'high', // ✅ Confidence indicator
    limitations: [           // ✅ Documentation
      'Last used date not available from Google API'
    ]
  }
}
```

## Code Change Summary

### File: `backend/src/connectors/google.ts`

**Add Correlation Helper** (new function):
```typescript
private correlateOAuthAppMetadata(events: any[]): Map<string, {
  firstSeen: Date;
  authorizedBy: string[];
  appName: string;
  clientId: string;
}> {
  const appMap = new Map();
  
  // Sort by timestamp
  const sorted = events.sort((a, b) => 
    new Date(a.id.time).getTime() - new Date(b.id.time).getTime()
  );
  
  for (const event of sorted) {
    const params = this.extractParams(event);
    const clientId = params.client_id || params.oauth_client_id;
    
    if (!appMap.has(clientId)) {
      appMap.set(clientId, {
        firstSeen: new Date(event.id.time),
        authorizedBy: [event.actor.email],
        appName: params.app_name || params.application_name,
        clientId
      });
    } else {
      const app = appMap.get(clientId);
      if (!app.authorizedBy.includes(event.actor.email)) {
        app.authorizedBy.push(event.actor.email);
      }
    }
  }
  
  return appMap;
}
```

**Update discoverAutomations()** (modify existing):
```typescript
async discoverAutomations(): Promise<AutomationEvent[]> {
  // ... existing code to fetch events ...
  
  // NEW: Correlate metadata
  const metadata = this.correlateOAuthAppMetadata(allEvents);
  
  // Build AutomationEvent with complete metadata
  for (const [clientId, meta] of metadata) {
    automations.push({
      id: clientId,
      name: meta.appName || 'Unknown OAuth App',  // FIX
      type: 'integration',
      platform: 'google',  // FIX
      status: 'active',
      trigger: 'oauth_authorization',
      actions: [],
      createdAt: meta.firstSeen,  // FIX
      lastTriggered: null,  // Not available from Google
      owner: {  // FIX
        id: meta.authorizedBy[0],
        name: meta.authorizedBy[0].split('@')[0],
        email: meta.authorizedBy[0]
      },
      metadata: {
        platform: 'google',  // FIX
        clientId: meta.clientId,  // FIX
        authorizedByUsers: meta.authorizedBy,  // NEW
        limitations: ['Last used date not available from Google API']  // NEW
      },
      permissions: scopes  // Already exists
    });
  }
  
  return automations;
}
```

## Testing Checklist

- [ ] Unit test: Extract app_name parameter correctly
- [ ] Unit test: Extract client_id parameter correctly
- [ ] Unit test: Extract actor.email correctly
- [ ] Unit test: Find earliest timestamp per client_id
- [ ] Unit test: Aggregate all users who authorized app
- [ ] Integration test: Real Google API returns complete metadata
- [ ] Integration test: Handles missing fields gracefully
- [ ] Integration test: Correlation works with multiple events

## Documentation Updates

- [ ] Update API documentation: Add `metadata.limitations` field
- [ ] Update UI tooltips: Explain why last_used is unavailable
- [ ] Update README: Document Google API limitations
- [ ] Update shared-types: Ensure AutomationEvent supports all fields

