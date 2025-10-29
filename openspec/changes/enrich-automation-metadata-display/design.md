# Design: Enrich Automation Metadata Display

## Architecture Overview

This is a **frontend-heavy enhancement** with minimal backend changes. The core pattern is:

1. Backend already stores 27+ metadata fields in `platform_metadata` JSONB column
2. Backend already returns this data via `/api/automations/:id/details`
3. Frontend needs to **extract and display** this existing data

## Component Architecture

### Current Flow
```
AutomationDetailsModal
  ├── Permissions Tab → Shows "No data available" (BROKEN)
  ├── Risk Tab → Shows partial metadata
  ├── Feedback Tab → Working correctly
  └── Details Tab → Shows basic info only
```

### Proposed Flow
```
AutomationDetailsModal (enhanced)
  ├── Permissions Tab → Display scopes, authorization context
  ├── Detection Tab (NEW) → Show AI detection evidence
  ├── Risk Tab → Enhanced with AI platform info
  ├── Feedback Tab → No changes
  └── Details Tab → Add script/file metadata
```

## Data Flow

### Backend (Minimal Changes)

**Current**: `GET /api/automations/:id/details`
```typescript
// backend/src/routes/automations.ts
{
  automation: {
    id: string;
    name: string;
    platform_metadata: { // ← Already includes 27+ fields
      scopes: string[];
      scopeCount: number;
      clientId: string;
      authorizedBy: string;
      // ... 23 more fields
    };
    detection_metadata: { // ← Already includes detection data
      lastUpdated: string;
      detectionPatterns: Array<{
        evidence: {
          eventCount: number;
          timeWindowMs: number;
          automationConfidence: number;
        };
        // ...
      }>;
    };
  }
}
```

**Enhancement**: Add helper function to transform metadata into UI-friendly format
```typescript
// backend/src/routes/automations.ts (NEW helper)
function enrichAutomationMetadata(automation: DiscoveredAutomation) {
  return {
    ...automation,
    enriched_metadata: {
      oauth_context: extractOAuthContext(automation.platform_metadata),
      detection_evidence: extractDetectionEvidence(automation.detection_metadata),
      technical_details: extractTechnicalDetails(automation.platform_metadata)
    }
  };
}
```

### Frontend (Major Changes)

**File**: `frontend/src/components/automations/AutomationDetailsModal.tsx`

#### 1. New Type Definitions
```typescript
// Extended metadata types
interface OAuthContext {
  scopes: Array<{
    scope: string;
    displayName?: string;  // Optional: future enrichment
  }>;
  scopeCount: number;
  authorizedBy: string;
  clientId: string;
  firstAuthorization: string;
  lastActivity: string;
  authorizationAge: number;
}

interface DetectionEvidence {
  method: string;
  confidence: number;
  lastUpdated: string;
  patterns: Array<{
    description: string;
    eventCount: number;
    timeWindowMs: number;
    confidence: number;
  }>;
  aiPlatforms?: Array<{
    name: string;
    confidence: number;
    endpoints: string[];
  }>;
}

interface TechnicalDetails {
  scriptId?: string;
  fileId?: string;
  driveLocation?: string;
  mimeType?: string;
  owners?: string[];
  shared?: boolean;
  functions?: string[];
  triggers?: string[];
}
```

#### 2. Data Extraction Utilities
```typescript
// frontend/src/utils/automation-metadata-helpers.ts (NEW)
export function extractOAuthContext(metadata: any): OAuthContext | null {
  if (!metadata) return null;

  return {
    scopes: metadata.scopes || [],
    scopeCount: metadata.scopeCount || metadata.scopes?.length || 0,
    authorizedBy: metadata.authorizedBy,
    clientId: metadata.clientId,
    firstAuthorization: metadata.firstAuthorization,
    lastActivity: metadata.lastActivity,
    authorizationAge: metadata.authorizationAge
  };
}

export function extractDetectionEvidence(metadata: any): DetectionEvidence | null {
  if (!metadata) return null;

  return {
    method: metadata.detectionMethod || 'unknown',
    confidence: metadata.detectionPatterns?.[0]?.evidence?.automationConfidence || 0,
    lastUpdated: metadata.lastUpdated,
    patterns: metadata.detectionPatterns || [],
    aiPlatforms: metadata.aiPlatforms?.map((name: string) => ({
      name,
      confidence: metadata.aiPlatformConfidence || 0,
      endpoints: metadata.aiEndpoints || []
    }))
  };
}
```

#### 3. UI Components

**Enhanced Permissions Tab**:
```tsx
<TabsContent value="permissions">
  {oauthContext ? (
    <>
      {/* Authorization Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>OAuth Authorization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <InfoField label="Authorized By" value={oauthContext.authorizedBy} />
            <InfoField label="Client ID" value={oauthContext.clientId} />
            <InfoField label="First Authorization" value={formatDate(oauthContext.firstAuthorization)} />
            <InfoField label="Last Activity" value={formatDate(oauthContext.lastActivity)} />
            <InfoField label="Authorization Age" value={`${oauthContext.authorizationAge} days`} />
          </div>
        </CardContent>
      </Card>

      {/* Scopes List */}
      <Card>
        <CardHeader>
          <CardTitle>Granted Scopes ({oauthContext.scopeCount})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {oauthContext.scopes.map((scope, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
                <code className="text-sm">{scope}</code>
                <Badge variant="outline">OAuth 2.0</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  ) : (
    <EmptyState message="No OAuth permission data available" />
  )}
</TabsContent>
```

**New Detection Tab**:
```tsx
<TabsContent value="detection">
  {detectionEvidence ? (
    <>
      {/* Detection Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Detection Confidence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Progress value={detectionEvidence.confidence} max={100} />
            <span className="text-2xl font-bold">{detectionEvidence.confidence.toFixed(1)}%</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Method: {detectionEvidence.method}
          </p>
          <p className="text-xs text-muted-foreground">
            Last updated: {formatDate(detectionEvidence.lastUpdated)}
          </p>
        </CardContent>
      </Card>

      {/* AI Platform Detection */}
      {detectionEvidence.aiPlatforms && detectionEvidence.aiPlatforms.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>AI Platform Detected</AlertTitle>
          <AlertDescription>
            This automation integrates with: {detectionEvidence.aiPlatforms.map(p => p.name).join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {/* Detection Patterns */}
      <Card>
        <CardHeader>
          <CardTitle>Detection Patterns ({detectionEvidence.patterns.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {detectionEvidence.patterns.map((pattern, i) => (
            <div key={i} className="mb-4 p-3 bg-muted rounded">
              <p className="font-medium">{pattern.description}</p>
              <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                <InfoField label="Events" value={pattern.eventCount} />
                <InfoField label="Time Window" value={`${pattern.timeWindowMs}ms`} />
                <InfoField label="Confidence" value={`${pattern.confidence.toFixed(1)}%`} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  ) : (
    <EmptyState message="No detection evidence available" />
  )}
</TabsContent>
```

## Implementation Strategy

### Phase 1: Backend Enhancement (2 hours)
1. Add metadata extraction helper functions
2. Update `/api/automations/:id/details` response type
3. Add unit tests for extraction logic

### Phase 2: Frontend Types & Utilities (1 hour)
1. Create `automation-metadata-helpers.ts`
2. Add extraction functions with null safety
3. Add TypeScript interfaces

### Phase 3: Permissions Tab (1.5 hours)
1. Replace "No data available" with OAuth context display
2. Add scope list rendering
3. Add authorization summary card

### Phase 4: Detection Tab (NEW) (1.5 hours)
1. Create new tab component
2. Add confidence score visualization
3. Add AI platform detection alerts
4. Add pattern evidence list

### Phase 5: Details Tab Enhancement (1 hour)
1. Add technical details section
2. Display script/file metadata
3. Add ownership information

### Phase 6: Testing (2 hours)
1. Unit tests for extraction helpers
2. Component tests for new UI sections
3. Integration test for full modal flow
4. Manual E2E testing with real data

## Error Handling

**Pattern**: Graceful degradation with specific empty states

```typescript
// Instead of generic "No data available"
if (!oauthContext) {
  return <EmptyState
    icon={Lock}
    title="No OAuth Authorization Data"
    message="This automation was not detected via OAuth tokens. Try the Detection tab for discovery details."
  />;
}

if (!detectionEvidence) {
  return <EmptyState
    icon={Search}
    title="No Detection Evidence"
    message="Detection metadata is only available for automations discovered after v2.0."
  />;
}
```

## Performance Considerations

**No performance impact expected**:
- Data already fetched in single API call
- JSONB fields already indexed
- No additional database queries
- Frontend only extracts/displays existing data

## Accessibility

- All new components follow WCAG 2.1 AA
- Semantic HTML with proper heading hierarchy
- Keyboard navigation for all interactive elements
- Screen reader labels for icon-only buttons
- Color contrast meets 4.5:1 minimum ratio

## Browser Compatibility

- Chrome/Edge: 100% (primary target)
- Firefox: 100%
- Safari: 100%
- No IE11 support required

## Future Enhancements (Out of Scope)

1. **OAuth Scope Enrichment API**: Call external service to get human-readable scope descriptions
2. **Real-time Updates**: WebSocket notifications when detection confidence changes
3. **Historical Tracking**: Show how metadata changed over time
4. **Bulk Actions**: Revoke multiple scopes, disable multiple automations
5. **Export**: Download metadata as CSV/PDF for compliance reports
