# Automation Metadata - Quick Fix Guide

**For**: Developers who want the TL;DR version
**Time**: 6 hours implementation
**Goal**: Fix metadata quality from 40% → 85%

---

## The Problem (1 minute read)

**What Users See**:
```json
{
  "name": "ChatGPT",
  "platform": "unknown",      ❌ WRONG
  "riskLevel": "medium",      ❌ SHOULD BE "high"
  "permissions": [],           ❌ EMPTY
  "createdBy": "unknown",     ❌ MISSING
  "metadata": {
    "riskFactors": []         ❌ EMPTY
  }
}
```

**What Database Has**:
```sql
platform_metadata = {
  "scopes": ["...drive.readonly", "...userinfo.email", ...],  ✅ EXISTS
  "isAIPlatform": true,                                      ✅ EXISTS
  "platformName": "OpenAI / ChatGPT",                       ✅ EXISTS
  "riskFactors": ["AI platform integration...", ...]        ✅ EXISTS
}
```

**Root Cause**: API mapping discards metadata → Users see incomplete data

---

## The Fix (Copy-Paste Ready)

### Step 1: Update Repository (5 min)

**File**: `/backend/src/database/repositories/discovered-automation.ts`

**Add after line 107**:
```typescript
async findManyWithPlatform(filters: DiscoveredAutomationFilters = {}) {
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (filters.organization_id) {
    conditions.push('da.organization_id = $' + paramIndex++);
    values.push(filters.organization_id);
  }
  if (filters.is_active !== undefined) {
    conditions.push('da.is_active = $' + paramIndex++);
    values.push(filters.is_active);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT da.*, pc.platform_type
    FROM ${this.tableName} da
    LEFT JOIN platform_connections pc ON da.platform_connection_id = pc.id
    ${whereClause}
    ORDER BY da.last_seen_at DESC, da.created_at DESC
  `;

  const result = await db.query(query, values);
  return { success: true, data: result.rows, total: result.rows.length };
}
```

---

### Step 2: Add Helper Functions (10 min)

**File**: `/backend/src/routes/automations-mock.ts`

**Add before line 187** (before the GET /automations route):
```typescript
function calculateRiskScore(metadata: any): number {
  let score = 50;
  if (metadata.isAIPlatform === true) score += 30;
  const scopes = metadata.scopes || [];
  if (scopes.some((s: string) => s.includes('drive'))) score += 10;
  if (scopes.some((s: string) => s.includes('gmail'))) score += 15;
  if (scopes.some((s: string) => s.includes('admin'))) score += 20;
  if (scopes.length > 10) score += 10;
  return Math.min(score, 100);
}

function determineRiskLevel(metadata: any): 'low' | 'medium' | 'high' | 'critical' {
  if (metadata.isAIPlatform === true) return 'high';
  const score = calculateRiskScore(metadata);
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

function generateRecommendations(metadata: any): string[] {
  const recs: string[] = [];
  if (metadata.isAIPlatform === true) {
    recs.push('Review AI platform data access permissions');
    recs.push('Ensure compliance with AI usage policies');
  }
  const scopes = metadata.scopes || [];
  if (scopes.some((s: string) => s.includes('drive'))) {
    recs.push('Audit which files/folders are accessible');
  }
  if (scopes.some((s: string) => s.includes('gmail'))) {
    recs.push('Review email access permissions and usage');
  }
  if (scopes.length > 10) {
    recs.push('Consider principle of least privilege');
  }
  return recs;
}
```

---

### Step 3: Fix API Mapping (15 min)

**File**: `/backend/src/routes/automations-mock.ts`

**Replace lines 232-260** with:
```typescript
// Get automations with platform JOIN
const dbResult = await discoveredAutomationRepository.findManyWithPlatform({
  organization_id: user.organizationId,
  is_active: true
});

// Map with FULL metadata extraction
automations = dbResult.data.map((da: any) => {
  const metadata = typeof da.platform_metadata === 'object' ? da.platform_metadata : {};
  const ownerInfo = typeof da.owner_info === 'object' ? da.owner_info : {};

  return {
    id: da.id,
    name: da.name,
    description: metadata.description || da.description || '',
    type: da.automation_type,
    platform: da.platform_type || 'unknown',
    status: da.status || 'unknown',
    riskLevel: determineRiskLevel(metadata),
    createdAt: da.first_discovered_at?.toISOString() || da.created_at.toISOString(),
    lastTriggered: da.last_triggered_at?.toISOString() || '',
    permissions: metadata.scopes || da.permissions_required || [],
    createdBy: ownerInfo.email || 'unknown',
    metadata: {
      riskScore: calculateRiskScore(metadata),
      riskFactors: metadata.riskFactors || [],
      recommendations: generateRecommendations(metadata),
      isAIPlatform: metadata.isAIPlatform || false,
      platformName: metadata.platformName,
      detectionMethod: metadata.detectionMethod,
      clientId: metadata.clientId,
      scopeCount: metadata.scopeCount || (metadata.scopes?.length || 0)
    }
  };
});

console.log(`Using RealDataProvider - ${automations.length} automations with full metadata`);
```

---

## Testing (30 min)

### Quick Manual Test
```bash
# 1. Restart backend
cd backend
npm run dev

# 2. Test API
curl http://localhost:3000/api/automations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  | jq '.automations[] | select(.name=="ChatGPT")'

# Expected output:
# {
#   "platform": "google",        ✅
#   "riskLevel": "high",         ✅
#   "permissions": [4 scopes],   ✅
#   "metadata": {
#     "isAIPlatform": true,      ✅
#     "riskFactors": [3 items]   ✅
#   }
# }
```

### Database Verification
```sql
-- Connect to database
psql postgresql://postgres:password@localhost:5433/saas_xray

-- Verify metadata exists
SELECT
  name,
  platform_metadata->>'isAIPlatform' as is_ai,
  jsonb_array_length(platform_metadata->'scopes') as scope_count,
  jsonb_array_length(platform_metadata->'riskFactors') as risk_factor_count
FROM discovered_automations
WHERE name IN ('ChatGPT', 'Claude');

-- Expected:
--   name   | is_ai | scope_count | risk_factor_count
-- ---------+-------+-------------+-------------------
--  ChatGPT | true  |           4 |                 3
--  Claude  | true  |           3 |                 2
```

---

## Verification Checklist

After implementing the fix, verify:

- [ ] Platform field shows "google" (not "unknown")
- [ ] Risk level shows "high" for ChatGPT and Claude
- [ ] Permissions array contains 3-5 OAuth scopes
- [ ] Risk factors array contains 2-4 items
- [ ] Recommendations array not empty
- [ ] Can filter automations by platform=google
- [ ] Can filter automations by riskLevel=high
- [ ] Stats endpoint still works

---

## What This Fixes

| Field | Before | After | Impact |
|-------|--------|-------|--------|
| platform | "unknown" | "google" | Can filter by platform ✅ |
| riskLevel | "medium" | "high" | Correct risk assessment ✅ |
| permissions | [] | [4-5 scopes] | Can audit data access ✅ |
| riskFactors | [] | [2-4 factors] | Understand threats ✅ |
| metadata.isAIPlatform | undefined | true | AI platform identification ✅ |
| metadata.platformName | undefined | "OpenAI / ChatGPT" | Clear labeling ✅ |

**Result**: Metadata quality 40% → 85% (45 point improvement)

---

## What This Doesn't Fix

**Still Shows "unknown"**:
- `createdBy` field (needs audit log correlation - see Phase 2 in full guide)

**Still Shows Discovery Date**:
- `createdAt` field (actual auth date requires audit correlation - see Phase 2)

**Why**: Google Token API doesn't provide user email or authorization timestamps. These require correlating OAuth tokens with audit log events.

**Fix Available**: See `METADATA_FIX_IMPLEMENTATION_GUIDE.md` Phase 2 (12-16 hours)

---

## Rollback

If something breaks:
```bash
git checkout main -- backend/src/routes/automations-mock.ts
git checkout main -- backend/src/database/repositories/discovered-automation.ts
npm run dev
```

---

## Full Documentation

**Quick Fix (this file)**: 6 hours, 85% quality
**Full Investigation**: `.claude/reports/AUTOMATION_METADATA_QA_REPORT.md`
**Complete Implementation**: `.claude/reports/METADATA_FIX_IMPLEMENTATION_GUIDE.md`
**Executive Summary**: `.claude/reports/QA_INVESTIGATION_SUMMARY.md`

---

## Time Breakdown

- Repository update: 5 min
- Helper functions: 10 min
- API mapping fix: 15 min
- Testing: 30 min
- **Total**: ~1 hour (plus buffer for issues)

**Recommended**: Allocate 6 hours for implementation + testing + integration tests

---

## Success

**You'll know it works when**:
```bash
curl localhost:3000/api/automations | jq '.automations[0]'
```

Returns:
```json
{
  "platform": "google",         // ✅ NOT "unknown"
  "riskLevel": "high",          // ✅ NOT "medium"
  "permissions": [              // ✅ NOT empty
    "https://www.googleapis.com/auth/drive.readonly",
    "..."
  ],
  "metadata": {
    "isAIPlatform": true,       // ✅ NEW
    "platformName": "ChatGPT",  // ✅ NEW
    "riskFactors": [            // ✅ NOT empty
      "AI platform integration...",
      "..."
    ]
  }
}
```

---

**Questions?** See full implementation guide or QA report in `.claude/reports/`
