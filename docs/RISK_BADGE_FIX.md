# Risk Badge Display Fix - Technical Documentation

## Issue Summary
Risk badges were displaying "unknown risk" after running discovery, despite showing correct risk levels on initial page load.

**Date Fixed:** October 9, 2025
**Fixed In:** Commit `86e211e`
**Branch:** `fix/typescript-strict-errors`

---

## Root Cause

### Problem Discovery Process
1. Initial page load: GET `/api/automations` returned automations WITH `riskLevel` field
2. After discovery: POST `/api/connections/:id/discover` returned automations WITHOUT `riskLevel` field
3. Frontend received data without risk information → displayed "unknown risk" badges

### Technical Root Cause
The discovery endpoint in `simple-server.ts` was mapping database records to automation objects but **did not calculate risk levels**, while the GET `/automations` endpoint did calculate them.

**Key Finding:** There are TWO discovery routes in the codebase:
- ✅ **Used Route:** `app.post('/api/connections/:id/discover')` in `simple-server.ts:805`
- ❌ **Unused Route:** `router.post('/connections/:connectionId/discover')` in `routes/connections.ts:437`

The unused route in `connections.ts` was never being hit because the `simple-server.ts` route is registered first and matches the request.

---

## Solution Implementation

### Files Modified

#### 1. `backend/src/simple-server.ts` (Lines 1067-1097)
**Added risk calculation logic when mapping database records:**

```typescript
// Replace connector data (with external_id as id) with database records (with UUID as id)
result.discovery.automations = persistedResult.rows.map((row: any) => {
  const platformMetadata = row.platform_metadata || {};

  // Calculate risk level from metadata (same as GET /automations)
  const riskLevel = platformMetadata.isAIPlatform === true ? 'high' :
    (platformMetadata.riskFactors || []).length >= 5 ? 'critical' :
    (platformMetadata.riskFactors || []).length >= 3 ? 'high' :
    (platformMetadata.riskFactors || []).length >= 1 ? 'medium' : 'low';

  // Calculate risk score (same as GET /automations)
  const riskScore = platformMetadata.isAIPlatform === true ? 85 :
    Math.min(100, 30 + (platformMetadata.riskFactors || []).length * 15);

  return {
    id: row.id,  // ✅ UUID from database
    name: row.name,
    type: row.automation_type,
    platform: id?.includes('google') ? 'google' : id?.includes('slack') ? 'slack' : 'google',
    status: row.status,
    trigger: row.trigger_type,
    actions: row.actions && Array.isArray(row.actions) ? row.actions : [],
    createdAt: row.first_discovered_at,
    lastTriggered: row.last_triggered_at,
    riskLevel: riskLevel,  // ✅ Add calculated risk level
    metadata: {
      ...platformMetadata,
      riskScore: riskScore,  // ✅ Add calculated risk score
      riskFactors: platformMetadata.riskFactors || []
    }
  };
});
```

#### 2. `backend/src/connectors/types.ts` (Line 43)
**Updated AutomationEvent type to support 'critical' risk level:**

```typescript
// Before:
riskLevel?: 'low' | 'medium' | 'high';

// After:
riskLevel?: 'low' | 'medium' | 'high' | 'critical';
```

---

## Risk Calculation Algorithm

### Risk Level Logic
```typescript
if (metadata.isAIPlatform === true) {
  return 'high';  // AI platforms are always high risk
}

const riskFactorCount = (metadata.riskFactors || []).length;

if (riskFactorCount >= 5) return 'critical';
if (riskFactorCount >= 3) return 'high';
if (riskFactorCount >= 1) return 'medium';
return 'low';
```

### Risk Score Logic (0-100)
```typescript
if (metadata.isAIPlatform === true) {
  return 85;  // High score for AI platforms
}

const baseScore = 30;
const factorScore = riskFactors.length * 15;
return Math.min(100, baseScore + factorScore);
```

### Examples
| Risk Factors | Is AI Platform | Risk Level | Risk Score |
|--------------|---------------|------------|------------|
| 0            | No            | Low        | 30         |
| 1            | No            | Medium     | 45         |
| 3            | No            | High       | 75         |
| 5            | No            | Critical   | 100        |
| Any          | Yes           | High       | 85         |

---

## Testing

### Manual Test
```bash
# Test discovery endpoint
curl -X POST http://localhost:4201/api/connections/{connectionId}/discover \
  -H "Content-Type: application/json" \
  -H "x-clerk-organization-id: {orgId}" \
  -H "x-clerk-user-id: {userId}"

# Verify response includes riskLevel
jq '.discovery.automations[0] | {name, riskLevel, metadata: {riskScore}}' response.json
```

**Expected Result:**
```json
{
  "name": "Superhuman",
  "riskLevel": "medium",
  "metadata": {
    "riskScore": 45
  }
}
```

### Automated Test
See `backend/tests/integration/discovery-risk-calculation.test.ts`

---

## Prevention - How to Avoid This Issue

### 1. **Always Calculate Risk Levels Consistently**
When returning automation data from ANY endpoint, ensure risk levels are calculated:

```typescript
// ✅ GOOD - Always calculate risk
const automation = {
  ...baseData,
  riskLevel: calculateRiskLevel(metadata),
  metadata: {
    ...metadata,
    riskScore: calculateRiskScore(metadata)
  }
};

// ❌ BAD - Missing risk calculation
const automation = {
  ...baseData,
  metadata: metadata
};
```

### 2. **Use Centralized Risk Calculation**
Extract risk calculation to a shared utility:

```typescript
// utils/risk-calculator.ts
export function calculateAutomationRisk(metadata: any) {
  return {
    riskLevel: calculateRiskLevel(metadata),
    riskScore: calculateRiskScore(metadata)
  };
}
```

### 3. **Type Safety**
Always ensure `riskLevel` is included in response types:

```typescript
interface AutomationResponse {
  id: string;
  name: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';  // ✅ Required field
  metadata: {
    riskScore: number;
    riskFactors: string[];
  };
}
```

### 4. **Integration Tests**
Add tests that verify risk calculation:

```typescript
describe('Discovery Endpoint', () => {
  it('should return automations with calculated risk levels', async () => {
    const response = await request(app)
      .post('/api/connections/:id/discover')
      .expect(200);

    expect(response.body.discovery.automations[0]).toHaveProperty('riskLevel');
    expect(response.body.discovery.automations[0].riskLevel).toMatch(/^(low|medium|high|critical)$/);
  });
});
```

---

## Related Files

- **Discovery Endpoint:** `backend/src/simple-server.ts:805-378`
- **Automations Endpoint:** `backend/src/routes/automations.ts:91-120`
- **Type Definitions:** `backend/src/connectors/types.ts`
- **Frontend Display:** `frontend/src/components/automations/AutomationCard.tsx`
- **Test:** `backend/tests/integration/discovery-risk-calculation.test.ts`

---

## Future Improvements

1. **Centralize Risk Calculation**
   - Create `backend/src/utils/risk-calculator.ts`
   - Use in both `/automations` and `/discover` endpoints
   - Add unit tests for risk calculation logic

2. **Route Consolidation**
   - Remove unused route in `routes/connections.ts`
   - Document why `simple-server.ts` handles discovery

3. **Enhanced Testing**
   - Add E2E test: "Risk badges display correctly after discovery"
   - Add unit tests for risk calculation edge cases

4. **Type Safety**
   - Make `riskLevel` a required field in `AutomationEvent`
   - Add compile-time checks to prevent missing risk fields
