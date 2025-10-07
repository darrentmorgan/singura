# Phase 2: OAuth Scope Enrichment API Integration

**Status**: READY TO START
**Prerequisites**: Phase 1 Complete ✅
**Next Steps**: API endpoint + Frontend integration

## Phase 1 Completion Summary

✅ Repository layer: `oauthScopeLibraryRepository`
✅ Service layer: `oauthScopeEnrichmentService`
✅ Manual tests: All 7 tests passing
✅ TypeScript: No errors in new files
✅ Database: 15 Google scopes loaded
✅ Caching: Working correctly
✅ Documentation: Complete

## Phase 2 Objectives

1. **API Endpoint**: Add scope enrichment to connection details endpoint
2. **Response Enrichment**: Include enriched scopes in connection API responses
3. **Error Handling**: Handle missing scope data gracefully
4. **API Tests**: Integration tests for enrichment endpoint
5. **Documentation**: Update API reference

## Implementation Plan

### Task 1: Update Connection Details Endpoint

**File**: `backend/src/routes/connections.ts`

**Current Endpoint**: `GET /api/connections/:id`

**Enhancement**: Add `enrichedScopes` field to response

```typescript
// Add enrichment service import
import { oauthScopeEnrichmentService } from '../services/oauth-scope-enrichment.service';

// In connection details handler
const connection = await platformConnectionRepository.findById(connectionId);
const credentials = await oauthCredentialStorage.getCredentials(connectionId);

// NEW: Enrich scopes
let enrichedScopes = null;
if (credentials?.scopes && connection.platform_type) {
  enrichedScopes = await oauthScopeEnrichmentService.enrichScopes(
    credentials.scopes,
    connection.platform_type
  );
}

// NEW: Calculate risk
let riskAnalysis = null;
if (enrichedScopes && enrichedScopes.length > 0) {
  riskAnalysis = oauthScopeEnrichmentService.calculatePermissionRisk(enrichedScopes);
}

return res.json({
  ...connection,
  scopes: credentials?.scopes || [],
  enrichedScopes,
  riskAnalysis
});
```

### Task 2: Add Scope Analysis Endpoint

**New Endpoint**: `GET /api/connections/:id/scope-analysis`

**Purpose**: Dedicated endpoint for detailed scope analysis

```typescript
router.get('/:id/scope-analysis', async (req, res) => {
  const { id } = req.params;
  const organizationId = req.auth.organizationId;

  // Verify connection ownership
  const connection = await platformConnectionRepository.findById(id);
  if (!connection || connection.organization_id !== organizationId) {
    return res.status(404).json({ error: 'Connection not found' });
  }

  // Get credentials
  const credentials = await oauthCredentialStorage.getCredentials(id);
  if (!credentials?.scopes) {
    return res.status(200).json({
      scopes: [],
      enrichedScopes: [],
      riskAnalysis: null,
      coverage: { total: 0, enriched: 0, missing: [], coverage: 0 }
    });
  }

  // Enrich scopes
  const enrichedScopes = await oauthScopeEnrichmentService.enrichScopes(
    credentials.scopes,
    connection.platform_type
  );

  // Calculate risk
  const riskAnalysis = enrichedScopes.length > 0
    ? oauthScopeEnrichmentService.calculatePermissionRisk(enrichedScopes)
    : null;

  // Get coverage
  const coverage = await oauthScopeEnrichmentService.getEnrichmentCoverage(
    credentials.scopes,
    connection.platform_type
  );

  return res.json({
    connectionId: id,
    platform: connection.platform_type,
    scopes: credentials.scopes,
    enrichedScopes,
    riskAnalysis,
    coverage
  });
});
```

### Task 3: Add Scope Search Endpoint

**New Endpoint**: `GET /api/scopes/search`

**Purpose**: Search available scopes by platform

```typescript
router.get('/scopes/search', async (req, res) => {
  const { platform, query, riskLevel, limit } = req.query;

  if (!platform) {
    return res.status(400).json({ error: 'Platform parameter required' });
  }

  let results;
  if (query) {
    results = await oauthScopeEnrichmentService.searchScopes(
      platform as string,
      query as string,
      parseInt(limit as string) || 20
    );
  } else if (riskLevel) {
    results = await oauthScopeEnrichmentService.getScopesByRiskLevel(
      platform as string,
      riskLevel as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    );
  } else {
    results = await oauthScopeLibraryRepository.findByPlatform(platform as string);
  }

  return res.json({
    platform,
    results,
    count: results.length
  });
});
```

### Task 4: Integration Tests

**File**: `backend/src/__tests__/routes/connections-scope-enrichment.test.ts`

```typescript
describe('Connection Scope Enrichment', () => {
  it('should enrich scopes in connection details', async () => {
    // Create connection with scopes
    // Get connection details
    // Verify enrichedScopes field exists
    // Verify riskAnalysis field exists
  });

  it('should handle missing scope metadata gracefully', async () => {
    // Create connection with unknown scopes
    // Verify partial enrichment
    // Verify coverage stats
  });

  it('should return scope analysis', async () => {
    // GET /api/connections/:id/scope-analysis
    // Verify response structure
    // Verify risk calculation
  });

  it('should search scopes', async () => {
    // GET /api/scopes/search?platform=google&query=drive
    // Verify results
  });
});
```

### Task 5: TypeScript Types

**File**: `backend/src/types/api-responses.ts` (or update existing)

```typescript
import { EnrichedScope, PermissionRiskAnalysis } from '../services/oauth-scope-enrichment.service';

export interface ConnectionDetailsResponse {
  id: string;
  platform_type: string;
  display_name: string;
  status: string;
  scopes: string[];
  enrichedScopes: EnrichedScope[] | null;
  riskAnalysis: PermissionRiskAnalysis | null;
  // ... other connection fields
}

export interface ScopeAnalysisResponse {
  connectionId: string;
  platform: string;
  scopes: string[];
  enrichedScopes: EnrichedScope[];
  riskAnalysis: PermissionRiskAnalysis | null;
  coverage: {
    total: number;
    enriched: number;
    missing: string[];
    coverage: number;
  };
}
```

## Success Criteria

- ✅ Connection details endpoint returns enrichedScopes
- ✅ Risk analysis included in responses
- ✅ Dedicated scope analysis endpoint working
- ✅ Scope search endpoint functional
- ✅ Integration tests passing
- ✅ TypeScript types defined
- ✅ Error handling for missing data
- ✅ Coverage stats accurate

## Testing Checklist

### Manual Testing
- [ ] GET /api/connections/:id includes enrichedScopes
- [ ] GET /api/connections/:id/scope-analysis returns full analysis
- [ ] GET /api/scopes/search?platform=google works
- [ ] GET /api/scopes/search?platform=google&query=drive filters correctly
- [ ] GET /api/scopes/search?platform=google&riskLevel=HIGH returns high-risk scopes
- [ ] Unknown scopes handled gracefully (partial enrichment)

### Integration Tests
- [ ] Test connection details enrichment
- [ ] Test scope analysis endpoint
- [ ] Test scope search
- [ ] Test error handling (connection not found)
- [ ] Test error handling (no scopes)
- [ ] Test coverage calculation

## API Examples

### Get Connection with Enriched Scopes
```bash
GET /api/connections/conn_123
Authorization: Bearer <clerk-token>

Response:
{
  "id": "conn_123",
  "platform_type": "google",
  "scopes": ["https://www.googleapis.com/auth/drive.readonly"],
  "enrichedScopes": [{
    "scopeUrl": "https://www.googleapis.com/auth/drive.readonly",
    "displayName": "Full Drive Access (Read-Only)",
    "riskScore": 75,
    "riskLevel": "HIGH",
    "gdprImpact": "...",
    "hipaaImpact": "..."
  }],
  "riskAnalysis": {
    "totalScore": 75,
    "riskLevel": "HIGH",
    "highestRiskScope": { ... }
  }
}
```

### Get Scope Analysis
```bash
GET /api/connections/conn_123/scope-analysis
Authorization: Bearer <clerk-token>

Response:
{
  "connectionId": "conn_123",
  "platform": "google",
  "scopes": ["..."],
  "enrichedScopes": [...],
  "riskAnalysis": {...},
  "coverage": {
    "total": 4,
    "enriched": 4,
    "missing": [],
    "coverage": 100
  }
}
```

### Search Scopes
```bash
GET /api/scopes/search?platform=google&query=drive&limit=10
Authorization: Bearer <clerk-token>

Response:
{
  "platform": "google",
  "results": [...],
  "count": 4
}
```

## Next Phase (Phase 3)

After Phase 2 API integration is complete, Phase 3 will focus on:

1. **Frontend Components**
   - Scope risk badges
   - GDPR/HIPAA warnings
   - Alternative scope suggestions
   - Compliance recommendations

2. **Dashboard Integration**
   - Organization-wide risk overview
   - Scope usage analytics
   - Trend charts

3. **Alerts & Notifications**
   - High-risk scope alerts
   - Compliance violation warnings
   - Automated recommendations

## References

- Phase 1 Implementation: `/Users/darrenmorgan/AI_Projects/saas-xray/OAUTH_SCOPE_ENRICHMENT_IMPLEMENTATION.md`
- Service: `backend/src/services/oauth-scope-enrichment.service.ts`
- Repository: `backend/src/database/repositories/oauth-scope-library.ts`
- Test Script: `backend/test-scope-enrichment.sh`
