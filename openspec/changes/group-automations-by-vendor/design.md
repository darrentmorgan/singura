# Design: Vendor-Level Grouping Architecture

## Overview

This design adds vendor-level grouping capabilities to the automation discovery system, enabling users to view OAuth applications grouped by vendor while maintaining individual app tracking for compliance and security auditing.

## Architecture Decisions

### 1. Vendor Extraction Strategy

**Decision**: Extract vendor name from OAuth app `displayText` using pattern matching, not external API lookups.

**Rationale**:
- **Reliability**: No external API dependencies or rate limits
- **Performance**: Zero latency for vendor extraction
- **Offline**: Works without internet connectivity
- **Cost**: No API costs or service dependencies

**Trade-offs**:
- **Accuracy**: ~90% accurate (some edge cases may fail)
- **Maintenance**: May need pattern updates as vendors change naming

**Implementation**:
```typescript
function extractVendorName(displayText: string): string | null {
  if (!displayText) return null;

  // Remove common suffixes
  const cleaned = displayText
    .replace(/\s*(for Google Workspace|OAuth|API|App)\s*/gi, '')
    .replace(/\.(com|io|ai|net|org)$/i, '')
    .trim();

  // Return first word if multi-word (e.g., "Attio CRM" → "Attio")
  const firstWord = cleaned.split(/\s+/)[0];

  return firstWord && firstWord.length > 2 ? firstWord : null;
}
```

**Examples**:
- "Attio" → "Attio" ✅
- "Attio CRM" → "Attio" ✅
- "attio.com" → "attio" ✅
- "OAuth App: 12345" → null ✅
- "Slack" → "Slack" ✅
- "slack.com" → "slack" ✅

---

### 2. Database Schema Design

**Decision**: Add `vendor_name` and `vendor_group` columns to existing `discovered_automations` table.

**Schema**:
```sql
ALTER TABLE discovered_automations
  ADD COLUMN vendor_name VARCHAR(255),
  ADD COLUMN vendor_group VARCHAR(255);

CREATE INDEX idx_discovered_automations_vendor_name
  ON discovered_automations(vendor_name);

CREATE INDEX idx_discovered_automations_vendor_group
  ON discovered_automations(vendor_group);
```

**Why This Design**:
- **No New Tables**: Avoids join complexity
- **Nullable Columns**: Backward compatible (existing rows stay valid)
- **Indexed**: Fast vendor-based queries
- **vendor_group**: Enables platform-specific grouping (`vendor_name + platform_type`)

**Storage Impact**:
- Per automation: ~50 bytes (vendor_name: 20B, vendor_group: 30B)
- 1000 automations: 50KB (negligible)
- Index overhead: ~10KB per 1000 automations

**Alternative Considered**: Separate `vendors` table with foreign key
- **Rejected**: Overkill for simple text extraction, adds join complexity

---

### 3. API Grouping Strategy

**Decision**: Add optional `groupBy=vendor` query parameter, return nested structure when grouping enabled.

**API Design**:

**Ungrouped (Current)**:
```http
GET /api/automations?page=1&limit=20
```

**Grouped (New)**:
```http
GET /api/automations?page=1&limit=20&groupBy=vendor
```

**Response Structure (Grouped)**:
```json
{
  "success": true,
  "grouped": true,
  "groupBy": "vendor",
  "vendorGroups": [
    {
      "vendorName": "Attio",
      "platform": "google",
      "applicationCount": 2,
      "highestRiskLevel": "medium",
      "lastSeen": "2025-10-30T09:20:53Z",
      "applications": [
        {
          "id": "75e82a7e-2f4e-41da-bfd4-e0f6c925b828",
          "name": "Attio",
          "metadata": {
            "clientId": "167690183287-ktk2mrcp1k8bd5eau2k7cb01tlblf563",
            "scopeCount": 3
          }
        },
        {
          "id": "12a565ba-aade-4086-ab10-b5f7e8c49188",
          "name": "Attio",
          "metadata": {
            "clientId": "167690183287-b5mo6an9uv6nt77i4d0447hlev31l7a2",
            "scopeCount": 8
          }
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15
  }
}
```

**Why This Design**:
- **Backward Compatible**: Default behavior unchanged (groupBy omitted)
- **Client Control**: Frontend decides when to group
- **Flexible**: Easy to add `groupBy=platform` or `groupBy=riskLevel` later

**Alternative Considered**: Always return grouped + ungrouped in every response
- **Rejected**: Doubles response size unnecessarily

---

### 4. Frontend Grouping UI

**Decision**: Add toggle switch to automation list header, expand/collapse vendor groups.

**UI Components**:

**AutomationList.tsx**:
```tsx
<div className="flex items-center justify-between">
  <h2>Recent Automations</h2>
  <div className="flex items-center gap-2">
    <label>Group by Vendor</label>
    <Switch
      checked={groupByVendor}
      onCheckedChange={setGroupByVendor}
    />
  </div>
</div>

{groupByVendor ? (
  <VendorGroupedView vendors={vendorGroups} />
) : (
  <AutomationCard automations={automations} />
)}
```

**VendorGroupCard.tsx**:
```tsx
<Card>
  <CardHeader onClick={() => setExpanded(!expanded)}>
    <div className="flex items-center justify-between">
      <div>
        <h3>{vendorName} ({applicationCount} applications)</h3>
        <p className="text-sm text-muted-foreground">
          {platform} • Last seen {lastSeen}
        </p>
      </div>
      <Badge variant={riskColor}>{highestRiskLevel}</Badge>
    </div>
  </CardHeader>

  {expanded && (
    <CardContent>
      {applications.map(app => (
        <div key={app.id} className="border-l-2 pl-4">
          <p>{app.metadata.scopeCount} permissions</p>
          <p className="text-xs text-muted-foreground">
            Client ID: {app.metadata.clientId}
          </p>
        </div>
      ))}
    </CardContent>
  )}
</Card>
```

**Why This Design**:
- **Progressive Disclosure**: Collapsed by default, expand on click
- **Familiar Pattern**: Similar to file explorer or email threads
- **Accessible**: Keyboard navigation supported

**Alternative Considered**: Modal for vendor details
- **Rejected**: Requires extra click, breaks list flow

---

### 5. Deduplication Strategy

**Decision**: Preserve existing deduplication (`UNIQUE (platform_connection_id, external_id)`), add vendor grouping as view layer only.

**Current Deduplication**:
```sql
CONSTRAINT unique_automation_per_connection
  UNIQUE (platform_connection_id, external_id)
```

Where `external_id = google-oauth-${clientId}`

**Why Preserve This**:
- **Security**: Different OAuth client IDs ARE different security principals
- **Compliance**: SOC 2, GDPR, ISO 27001 require individual app tracking
- **Auditability**: Need to track each OAuth grant individually

**Vendor Grouping as View Layer**:
- Database stores individual OAuth apps (unchanged)
- API groups on-demand when `groupBy=vendor`
- Frontend displays grouped or ungrouped based on toggle

**This Ensures**:
- Individual OAuth apps still discoverable
- Risk assessment per app preserved
- Audit trail complete
- UX improved without compromising security

---

## Data Flow

### Discovery Flow (Updated)

```
1. Google Admin SDK
   ↓
2. GoogleConnector.discoverOAuthApplications()
   - Fetch OAuth tokens
   - Extract vendor name: extractVendorName(token.displayText)
   - Create automation with vendor metadata
   ↓
3. DiscoveryService.storeDiscoveredAutomations()
   - INSERT/UPDATE discovered_automations
   - Populate vendor_name, vendor_group columns
   ↓
4. Database
   - Store with vendor fields
   - Index on vendor_name for fast queries
```

### API Query Flow (Grouped)

```
1. GET /api/automations?groupBy=vendor
   ↓
2. AutomationController.getAutomations()
   - Parse groupBy parameter
   - Query discovered_automations with vendor filter
   ↓
3. Group by vendor_name
   - SQL: GROUP BY vendor_name, platform_type
   - Aggregate: COUNT(*), MAX(risk_level), MAX(last_seen_at)
   ↓
4. Fetch individual apps per vendor
   - SQL: WHERE vendor_name = ? ORDER BY scope_count DESC
   ↓
5. Return grouped response
   {vendorGroups: [{vendorName, applications: [...]}]}
```

### Frontend Render Flow

```
1. AutomationList.tsx
   - User toggles "Group by Vendor" switch
   ↓
2. API Request
   - groupByVendor ? '?groupBy=vendor' : ''
   ↓
3. Response Handling
   - If grouped: render VendorGroupedView
   - If ungrouped: render AutomationCard list
   ↓
4. VendorGroupCard.tsx
   - Render collapsed by default
   - Expand on click to show individual apps
```

---

## Performance Considerations

### Database Performance

**Query Complexity**:
- **Ungrouped**: `SELECT * FROM discovered_automations WHERE ... LIMIT 20`
- **Grouped**:
  ```sql
  SELECT vendor_name, COUNT(*), MAX(risk_level), MAX(last_seen_at)
  FROM discovered_automations
  WHERE platform_connection_id = ?
  GROUP BY vendor_name, platform_type
  ```

**Index Strategy**:
```sql
CREATE INDEX idx_discovered_automations_vendor_name
  ON discovered_automations(vendor_name);

CREATE INDEX idx_discovered_automations_vendor_group
  ON discovered_automations(vendor_group);

CREATE INDEX idx_discovered_automations_platform_vendor
  ON discovered_automations(platform_connection_id, vendor_name);
```

**Expected Performance**:
- **Grouped query**: +5-10ms overhead (acceptable)
- **Index size**: ~10KB per 1000 automations
- **Memory**: Minimal (indexes loaded on-demand)

### API Response Time

**Current (Ungrouped)**: ~50-100ms
**Grouped (Estimated)**: ~60-110ms (+10ms overhead)

**Caching Strategy** (Future Optimization):
```typescript
// Cache vendor groups for 5 minutes
const cacheKey = `vendor-groups:${orgId}:${platformId}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const groups = await groupAutomationsByVendor();
await redis.setex(cacheKey, 300, JSON.stringify(groups));
return groups;
```

### Frontend Rendering

**Grouped View**: Renders fewer initial DOM nodes (collapsed cards)
**Ungrouped View**: Renders all automation cards

**Performance Impact**: Grouped view should be *faster* for large lists (20+ automations)

---

## Security & Compliance

### Individual App Tracking Preserved

**Requirement**: SOC 2, GDPR, ISO 27001 require tracking individual OAuth grants

**How We Preserve This**:
1. Database stores each OAuth app as separate row (unchanged)
2. `external_id` uniquely identifies each OAuth client ID
3. Audit logs track actions per automation ID (not vendor)
4. API supports querying individual apps: `GET /api/automations/{id}`

**Vendor Grouping is View-Only**:
- Does NOT modify database structure
- Does NOT merge automation records
- Does NOT hide individual apps (expand to see all)

### Risk Assessment

**Group-Level Risk**: Show highest risk level among vendor's apps
**Individual Risk**: Still calculated per OAuth app

**Example**:
- Attio App 1: Medium risk (3 scopes)
- Attio App 2: High risk (8 scopes, Gmail access)
- **Vendor Group Badge**: High risk ⚠️

**Why This Matters**: Users see elevated risk even when viewing grouped

### Audit Trail

**Individual Actions Still Tracked**:
- Revoking OAuth token: Tracked per `automation_id`
- Risk updates: Tracked per `automation_id`
- Discovery events: Tracked per `external_id`

**Vendor-Level Actions (Future)**:
- "Revoke all Attio apps": Generates multiple individual revocation events
- Audit log shows each app revoked separately

---

## Migration Strategy

### Phase 1: Soft Launch (Week 1)
1. Deploy database migration (add columns, indexes)
2. Update discovery connector to populate vendor fields
3. Backfill existing automations: `UPDATE discovered_automations SET vendor_name = extract_vendor(name)`
4. Deploy API with `groupBy=vendor` support
5. Monitor performance metrics

### Phase 2: Frontend Release (Week 1-2)
1. Deploy frontend with toggle (default: off)
2. A/B test with 10% of users
3. Collect feedback and usage metrics
4. Gradually roll out to 100%

### Phase 3: Optimization (Week 2+)
1. Add caching for grouped responses
2. Implement vendor-level analytics
3. Add vendor comparison views
4. Build vendor risk dashboard

---

## Testing Strategy

### Unit Tests

**Vendor Extraction**:
```typescript
describe('extractVendorName', () => {
  it('extracts vendor from simple name', () => {
    expect(extractVendorName('Attio')).toBe('Attio');
  });

  it('extracts vendor from compound name', () => {
    expect(extractVendorName('Attio CRM')).toBe('Attio');
  });

  it('returns null for generic OAuth app', () => {
    expect(extractVendorName('OAuth App: 12345')).toBeNull();
  });
});
```

**Grouping Logic**:
```typescript
describe('groupAutomationsByVendor', () => {
  it('groups OAuth apps by vendor name', () => {
    const automations = [
      { id: '1', name: 'Attio', vendor_name: 'Attio', scopeCount: 3 },
      { id: '2', name: 'Attio', vendor_name: 'Attio', scopeCount: 8 },
    ];

    const grouped = groupAutomationsByVendor(automations);

    expect(grouped).toHaveLength(1);
    expect(grouped[0].vendorName).toBe('Attio');
    expect(grouped[0].applications).toHaveLength(2);
  });
});
```

### Integration Tests

**Discovery with Vendor Extraction**:
```typescript
describe('OAuth Discovery with Vendor Fields', () => {
  it('populates vendor_name during discovery', async () => {
    const result = await googleConnector.discoverOAuthApplications();

    const attioApps = result.filter(a => a.name.includes('Attio'));
    expect(attioApps[0].metadata.vendorName).toBe('Attio');
    expect(attioApps[0].metadata.vendorGroup).toBe('Attio-google');
  });
});
```

**API Grouping**:
```typescript
describe('GET /api/automations?groupBy=vendor', () => {
  it('returns vendor-grouped response', async () => {
    const response = await request(app)
      .get('/api/automations?groupBy=vendor')
      .expect(200);

    expect(response.body.grouped).toBe(true);
    expect(response.body.vendorGroups).toBeDefined();
    expect(response.body.vendorGroups[0]).toHaveProperty('vendorName');
    expect(response.body.vendorGroups[0]).toHaveProperty('applications');
  });
});
```

### E2E Tests

**Frontend Grouping Toggle**:
```typescript
describe('Automation List Vendor Grouping', () => {
  it('toggles between grouped and ungrouped views', async () => {
    await page.goto('/dashboard');

    // Initial: ungrouped
    expect(await page.locator('[data-testid="automation-card"]').count()).toBeGreaterThan(5);

    // Toggle to grouped
    await page.click('[data-testid="group-by-vendor-toggle"]');
    await page.waitForSelector('[data-testid="vendor-group-card"]');

    expect(await page.locator('[data-testid="vendor-group-card"]').count()).toBeLessThan(5);
  });

  it('expands vendor group to show individual apps', async () => {
    await page.goto('/dashboard');
    await page.click('[data-testid="group-by-vendor-toggle"]');

    const attioGroup = page.locator('[data-testid="vendor-group-card"]:has-text("Attio")');
    await attioGroup.click();

    expect(await attioGroup.locator('[data-testid="individual-app"]').count()).toBeGreaterThan(1);
  });
});
```

---

## Rollback Plan

If issues arise after deployment:

### Immediate Rollback (< 5 minutes)
1. **Frontend**: Toggle default to `false` via feature flag
2. **Backend**: No rollback needed (API backward compatible)

### Database Rollback (if needed)
```sql
-- Remove vendor columns (data loss)
ALTER TABLE discovered_automations
  DROP COLUMN vendor_name,
  DROP COLUMN vendor_group;

DROP INDEX idx_discovered_automations_vendor_name;
DROP INDEX idx_discovered_automations_vendor_group;
```

**Note**: Database rollback causes data loss for vendor fields, but does NOT affect core discovery functionality.

---

## Future Enhancements

### Phase 4: Vendor Analytics (Future)
- Vendor-level risk trends over time
- Permission comparison across vendor apps
- Vendor access heatmap (which data, which teams)

### Phase 5: Vendor Management (Future)
- Manual vendor assignment/correction
- Vendor allowlist/blocklist
- Vendor-level policies ("Require approval for new Vendor X apps")

### Phase 6: Multi-Platform Vendor Grouping (Future)
- Group "Slack" from Google + Microsoft + Slack platforms
- Cross-platform vendor risk assessment
