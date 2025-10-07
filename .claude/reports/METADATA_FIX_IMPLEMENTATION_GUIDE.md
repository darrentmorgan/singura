# Automation Metadata Fix - Implementation Guide

**Related Report**: `AUTOMATION_METADATA_QA_REPORT.md`
**Estimated Time**: 6 hours (Phase 1), 12-16 hours (Phase 2)
**Developer**: Backend + Full-stack developer
**Branch**: `fix/automation-metadata-mapping`

---

## Phase 1: Immediate Fixes (6 hours)

### 1.1 Fix API Route Mapping (2 hours)

**File**: `/backend/src/routes/automations-mock.ts`

**Current Code** (Lines 232-260):
```typescript
const dbResult = await discoveredAutomationRepository.findManyCustom({
  organization_id: user.organizationId,
  is_active: true
});

// Map database automations to API format
automations = dbResult.data.map((da: DiscoveredAutomation) => ({
  id: da.id,
  name: da.name,
  description: da.description || '',
  type: da.automation_type,
  platform: 'unknown', // ❌ PROBLEM
  status: da.status || 'unknown',
  riskLevel: 'medium', // ❌ PROBLEM
  createdAt: da.first_discovered_at?.toISOString() || da.created_at.toISOString(),
  lastTriggered: da.last_triggered_at?.toISOString() || '',
  permissions: Array.isArray(da.permissions_required) ? da.permissions_required : [], // ❌ PROBLEM
  createdBy: da.owner_info && typeof da.owner_info === 'object' && 'email' in da.owner_info
    ? String(da.owner_info.email)
    : 'unknown',
  metadata: {
    riskScore: 50, // ❌ PROBLEM
    riskFactors: [], // ❌ PROBLEM
    recommendations: []
  }
}));
```

**REPLACEMENT CODE**:
```typescript
// Step 1: Add JOIN to get platform_type
const dbResult = await discoveredAutomationRepository.findManyWithPlatform({
  organization_id: user.organizationId,
  is_active: true
});

// Step 2: Helper function to calculate risk score
function calculateRiskScore(metadata: any): number {
  let score = 50; // Base score

  if (metadata.isAIPlatform === true) {
    score += 30; // AI platforms are high risk
  }

  const scopes = metadata.scopes || [];
  if (scopes.some((s: string) => s.includes('drive'))) score += 10;
  if (scopes.some((s: string) => s.includes('gmail'))) score += 15;
  if (scopes.some((s: string) => s.includes('admin'))) score += 20;

  if (scopes.length > 10) score += 10; // Excessive permissions

  return Math.min(score, 100);
}

// Step 3: Helper function to generate recommendations
function generateRecommendations(metadata: any): string[] {
  const recommendations: string[] = [];

  if (metadata.isAIPlatform === true) {
    recommendations.push('Review AI platform data access permissions');
    recommendations.push('Ensure compliance with AI usage policies');
    recommendations.push('Monitor for data exfiltration patterns');
  }

  const scopes = metadata.scopes || [];
  if (scopes.some((s: string) => s.includes('drive'))) {
    recommendations.push('Audit which files/folders are accessible');
  }
  if (scopes.some((s: string) => s.includes('gmail'))) {
    recommendations.push('Review email access permissions and usage');
  }
  if (scopes.length > 10) {
    recommendations.push('Consider principle of least privilege - reduce scope count');
  }

  return recommendations;
}

// Step 4: Helper function to determine risk level
function determineRiskLevel(metadata: any): 'low' | 'medium' | 'high' | 'critical' {
  const score = calculateRiskScore(metadata);

  if (metadata.isAIPlatform === true) {
    return 'high'; // All AI platforms are at least high risk
  }

  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

// Step 5: Map database automations to API format with FULL metadata
automations = dbResult.data.map((da: any) => {
  // Parse platform_metadata JSONB
  const metadata = typeof da.platform_metadata === 'object'
    ? da.platform_metadata
    : {};

  // Parse owner_info JSONB
  const ownerInfo = typeof da.owner_info === 'object'
    ? da.owner_info
    : {};

  return {
    id: da.id,
    name: da.name,
    description: metadata.description || da.description || '',
    type: da.automation_type,
    platform: da.platform_type || 'unknown', // ✅ FROM JOIN
    status: da.status || 'unknown',
    riskLevel: determineRiskLevel(metadata), // ✅ CALCULATED
    createdAt: da.first_discovered_at?.toISOString() || da.created_at.toISOString(),
    lastTriggered: da.last_triggered_at?.toISOString() || '',
    permissions: metadata.scopes || da.permissions_required || [], // ✅ FROM METADATA
    createdBy: ownerInfo.email || 'unknown',
    metadata: {
      riskScore: calculateRiskScore(metadata), // ✅ CALCULATED
      riskFactors: metadata.riskFactors || [], // ✅ FROM METADATA
      recommendations: generateRecommendations(metadata), // ✅ GENERATED
      // Additional metadata for UI
      isAIPlatform: metadata.isAIPlatform || false,
      platformName: metadata.platformName,
      detectionMethod: metadata.detectionMethod,
      clientId: metadata.clientId,
      scopeCount: metadata.scopeCount || (metadata.scopes?.length || 0)
    }
  };
});

console.log(`Using RealDataProvider - ${automations.length} automations from database with full metadata`);
```

---

### 1.2 Add Repository JOIN Method (1 hour)

**File**: `/backend/src/database/repositories/discovered-automation.ts`

**ADD NEW METHOD** (after line 107):
```typescript
/**
 * Find automations with platform type via JOIN
 */
async findManyWithPlatform(filters: DiscoveredAutomationFilters = {}) {
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (filters.organization_id) {
    conditions.push('da.organization_id = $' + paramIndex++);
    values.push(filters.organization_id);
  }

  if (filters.platform_connection_id) {
    conditions.push('da.platform_connection_id = $' + paramIndex++);
    values.push(filters.platform_connection_id);
  }

  if (filters.automation_type) {
    conditions.push('da.automation_type = $' + paramIndex++);
    values.push(filters.automation_type);
  }

  if (filters.status) {
    conditions.push('da.status = $' + paramIndex++);
    values.push(filters.status);
  }

  if (filters.is_active !== undefined) {
    conditions.push('da.is_active = $' + paramIndex++);
    values.push(filters.is_active);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT
      da.*,
      pc.platform_type
    FROM ${this.tableName} da
    LEFT JOIN platform_connections pc ON da.platform_connection_id = pc.id
    ${whereClause}
    ORDER BY da.last_seen_at DESC, da.created_at DESC
  `;

  const result = await db.query(query, values);
  return {
    success: true,
    data: result.rows,
    total: result.rows.length
  };
}
```

---

### 1.3 Update Stats Query to Include Platform (30 min)

**File**: `/backend/src/routes/automations-mock.ts`

**Find** (around line 385-401):
```typescript
// Map platform stats to object
const byPlatform = platformStats.reduce((acc: Record<string, number>, p: any) => {
  acc[p.platform_type] = parseInt(p.count);
  return acc;
}, {
  slack: 0,
  google: 0,
  microsoft: 0,
  hubspot: 0,
  salesforce: 0,
  notion: 0,
  asana: 0,
  jira: 0
} as Record<string, number>);
```

**Verify this is working correctly** - it already JOINs platform_connections.

---

### 1.4 Add Integration Test (2.5 hours)

**Create File**: `/backend/src/__tests__/routes/automations-metadata.integration.test.ts`

```typescript
/**
 * Integration Test: Automation Metadata API Response
 * Validates that rich metadata flows from database to API response
 */

import request from 'supertest';
import { app } from '../../simple-server';
import { db } from '../../database/pool';
import { discoveredAutomationRepository } from '../../database/repositories/discovered-automation';
import { platformConnectionRepository } from '../../database/repositories/platform-connection';

describe('Automations API - Metadata Quality', () => {
  let organizationId: string;
  let platformConnectionId: string;
  let automationId: string;

  beforeAll(async () => {
    organizationId = 'test-org-metadata-quality';

    // Create test platform connection
    const connection = await platformConnectionRepository.create({
      organization_id: organizationId,
      platform_type: 'google',
      status: 'active',
      connection_metadata: {}
    });
    platformConnectionId = connection.id;

    // Create test automation with FULL metadata (simulating ChatGPT)
    const automation = await db.query(`
      INSERT INTO discovered_automations (
        organization_id,
        platform_connection_id,
        discovery_run_id,
        external_id,
        name,
        description,
        automation_type,
        status,
        trigger_type,
        actions,
        permissions_required,
        platform_metadata,
        owner_info,
        first_discovered_at,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id
    `, [
      organizationId,
      platformConnectionId,
      'test-run-id',
      'test-chatgpt-external-id',
      'ChatGPT',
      'AI Platform Integration',
      'integration',
      'active',
      'oauth',
      JSON.stringify(['api_access', 'data_read']),
      JSON.stringify([]), // Empty - scopes should come from platform_metadata
      JSON.stringify({
        scopes: [
          'https://www.googleapis.com/auth/drive.readonly',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile',
          'openid'
        ],
        clientId: '77377267392-test.apps.googleusercontent.com',
        scopeCount: 4,
        description: 'AI Platform Integration: OpenAI / ChatGPT',
        riskFactors: [
          'AI platform integration: OpenAI / ChatGPT',
          '4 OAuth scopes granted',
          'Google Drive access'
        ],
        isAIPlatform: true,
        platformName: 'OpenAI / ChatGPT',
        detectionMethod: 'oauth_tokens_api'
      }),
      JSON.stringify({ email: 'test@example.com' }),
      new Date('2025-09-15T14:30:00Z'),
      true
    ]);

    automationId = automation.rows[0].id;
  });

  afterAll(async () => {
    // Cleanup
    await db.query('DELETE FROM discovered_automations WHERE organization_id = $1', [organizationId]);
    await db.query('DELETE FROM platform_connections WHERE organization_id = $1', [organizationId]);
  });

  describe('GET /automations', () => {
    it('should return automations with full metadata extracted', async () => {
      const response = await request(app)
        .get('/api/automations')
        .set('Authorization', `Bearer test-token-${organizationId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.automations).toBeDefined();

      const chatgpt = response.body.automations.find((a: any) => a.name === 'ChatGPT');
      expect(chatgpt).toBeDefined();

      // Critical metadata fields
      expect(chatgpt.platform).toBe('google'); // ✅ NOT "unknown"
      expect(chatgpt.riskLevel).toBe('high'); // ✅ NOT "medium"
      expect(chatgpt.permissions).toEqual([
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'openid'
      ]); // ✅ NOT empty array
      expect(chatgpt.createdBy).toBe('test@example.com'); // ✅ NOT "unknown"

      // Metadata object
      expect(chatgpt.metadata.isAIPlatform).toBe(true);
      expect(chatgpt.metadata.platformName).toBe('OpenAI / ChatGPT');
      expect(chatgpt.metadata.riskFactors).toHaveLength(3);
      expect(chatgpt.metadata.riskFactors).toContain('AI platform integration: OpenAI / ChatGPT');
      expect(chatgpt.metadata.riskScore).toBeGreaterThan(50); // Calculated, not default
      expect(chatgpt.metadata.recommendations).toBeDefined();
      expect(chatgpt.metadata.recommendations.length).toBeGreaterThan(0);
    });

    it('should filter by platform correctly', async () => {
      const response = await request(app)
        .get('/api/automations?platform=google')
        .set('Authorization', `Bearer test-token-${organizationId}`)
        .expect(200);

      expect(response.body.automations.length).toBeGreaterThan(0);
      response.body.automations.forEach((automation: any) => {
        expect(automation.platform).toBe('google');
      });
    });

    it('should filter by riskLevel correctly', async () => {
      const response = await request(app)
        .get('/api/automations?riskLevel=high')
        .set('Authorization', `Bearer test-token-${organizationId}`)
        .expect(200);

      expect(response.body.automations.length).toBeGreaterThan(0);
      response.body.automations.forEach((automation: any) => {
        expect(automation.riskLevel).toBe('high');
      });
    });
  });

  describe('Risk Score Calculation', () => {
    it('should assign high risk to AI platforms', async () => {
      const response = await request(app)
        .get('/api/automations')
        .set('Authorization', `Bearer test-token-${organizationId}`)
        .expect(200);

      const aiAutomations = response.body.automations.filter(
        (a: any) => a.metadata.isAIPlatform === true
      );

      aiAutomations.forEach((automation: any) => {
        expect(automation.riskLevel).toBe('high');
        expect(automation.metadata.riskScore).toBeGreaterThanOrEqual(60);
      });
    });

    it('should increase risk score for Drive access', async () => {
      const response = await request(app)
        .get('/api/automations')
        .set('Authorization', `Bearer test-token-${organizationId}`)
        .expect(200);

      const chatgpt = response.body.automations.find((a: any) => a.name === 'ChatGPT');

      // Should have Drive access in scopes
      const hasDriveAccess = chatgpt.permissions.some((p: string) =>
        p.includes('drive')
      );
      expect(hasDriveAccess).toBe(true);

      // Risk score should reflect this
      expect(chatgpt.metadata.riskScore).toBeGreaterThanOrEqual(70);
    });
  });

  describe('Recommendations Generation', () => {
    it('should generate AI-specific recommendations', async () => {
      const response = await request(app)
        .get('/api/automations')
        .set('Authorization', `Bearer test-token-${organizationId}`)
        .expect(200);

      const chatgpt = response.body.automations.find((a: any) => a.name === 'ChatGPT');

      expect(chatgpt.metadata.recommendations).toContain(
        'Review AI platform data access permissions'
      );
      expect(chatgpt.metadata.recommendations).toContain(
        'Ensure compliance with AI usage policies'
      );
    });

    it('should generate Drive-specific recommendations', async () => {
      const response = await request(app)
        .get('/api/automations')
        .set('Authorization', `Bearer test-token-${organizationId}`)
        .expect(200);

      const chatgpt = response.body.automations.find((a: any) => a.name === 'ChatGPT');

      expect(chatgpt.metadata.recommendations).toContain(
        'Audit which files/folders are accessible'
      );
    });
  });
});
```

**Run Test**:
```bash
npm test -- automations-metadata.integration.test.ts
```

---

## Phase 2: Audit Log Correlation (12-16 hours)

### 2.1 Enhance Google API Client (4 hours)

**File**: `/backend/src/services/google-api-client-service.ts`

**MODIFY METHOD** `getOAuthApplications()` (lines 564-717):

```typescript
/**
 * Get OAuth applications with AUDIT LOG CORRELATION for user email + auth date
 */
async getOAuthApplications(): Promise<Array<{
  clientId: string;
  displayText: string;
  scopes: string[];
  isAIPlatform: boolean;
  platformName?: string;
  authorizedBy?: string;        // ✅ NEW: From audit log
  authorizedAt?: Date;           // ✅ NEW: From audit log
}>> {
  try {
    await this.ensureAuthenticated();

    console.log('🔐 Searching for OAuth applications via audit logs...');

    // Step 1: Get audit logs for OAuth events
    const loginResponse = await this.adminReports.activities.list({
      userKey: 'all',
      applicationName: 'login',
      startTime: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      maxResults: 1000
    });

    const tokenResponse = await this.adminReports.activities.list({
      userKey: 'all',
      applicationName: 'token',
      startTime: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      maxResults: 1000
    });

    // Step 2: Combine and parse events
    const allEvents = [
      ...(loginResponse.data.items || []),
      ...(tokenResponse.data.items || [])
    ];

    // Step 3: Build enriched OAuth app map with user email + timestamp
    const oauthAppsMap = new Map<string, {
      clientId: string;
      displayText: string;
      scopes: Set<string>;
      firstSeen: Date;
      lastSeen: Date;
      authorizedBy: string;      // ✅ NEW
      authorizedAt: Date;         // ✅ NEW
    }>();

    for (const event of allEvents) {
      if (!event.events) continue;

      for (const ev of event.events) {
        const eventName = ev.name?.toLowerCase() || '';
        const isOAuthEvent = eventName.includes('oauth') ||
                            eventName.includes('authorize') ||
                            eventName.includes('token');

        if (!isOAuthEvent || !ev.parameters) continue;

        let clientId: string | undefined;
        let appName: string | undefined;
        const scopes: string[] = [];

        for (const param of ev.parameters) {
          if (param.name === 'client_id' || param.name === 'oauth_client_id') {
            clientId = param.value;
          }
          if (param.name === 'app_name' || param.name === 'product_name') {
            appName = param.value;
          }
          if (param.name === 'scope' || param.name === 'oauth_scopes') {
            const scopeValues = param.multiValue || [param.value];
            scopes.push(...scopeValues);
          }
        }

        if (clientId) {
          const eventTime = new Date(event.id.time);
          const actorEmail = event.actor?.email || 'unknown';

          if (!oauthAppsMap.has(clientId)) {
            oauthAppsMap.set(clientId, {
              clientId,
              displayText: appName || clientId,
              scopes: new Set(scopes),
              firstSeen: eventTime,
              lastSeen: eventTime,
              authorizedBy: actorEmail,   // ✅ USER EMAIL
              authorizedAt: eventTime      // ✅ AUTH TIMESTAMP
            });
          } else {
            const app = oauthAppsMap.get(clientId)!;
            scopes.forEach(s => app.scopes.add(s));
            if (eventTime > app.lastSeen) {
              app.lastSeen = eventTime;
              app.authorizedBy = actorEmail; // Update to latest authorizer
              app.authorizedAt = eventTime;
            }
            if (eventTime < app.firstSeen) {
              app.firstSeen = eventTime;
            }
            if (appName && !app.displayText) {
              app.displayText = appName;
            }
          }
        }
      }
    }

    console.log(`  Discovered ${oauthAppsMap.size} unique OAuth applications with user correlation`);

    // Step 4: Convert to result format with enriched metadata
    const apps = Array.from(oauthAppsMap.values()).map(app => {
      const displayText = app.displayText.toLowerCase();
      const clientId = app.clientId.toLowerCase();

      let isAIPlatform = false;
      let platformName: string | undefined;

      if (displayText.includes('openai') || displayText.includes('chatgpt')) {
        isAIPlatform = true;
        platformName = 'OpenAI / ChatGPT';
      } else if (displayText.includes('claude') || displayText.includes('anthropic')) {
        isAIPlatform = true;
        platformName = 'Claude (Anthropic)';
      } else if (displayText.includes('gemini')) {
        isAIPlatform = true;
        platformName = 'Gemini (Google)';
      }

      return {
        clientId: app.clientId,
        displayText: app.displayText,
        scopes: Array.from(app.scopes),
        isAIPlatform,
        platformName,
        authorizedBy: app.authorizedBy,   // ✅ RETURN USER EMAIL
        authorizedAt: app.authorizedAt     // ✅ RETURN AUTH TIMESTAMP
      };
    });

    console.log(`✅ OAuth app discovery: ${apps.length} apps with authorization metadata`);
    return apps;

  } catch (error: any) {
    console.error('Failed to get OAuth applications:', error);
    return [];
  }
}
```

---

### 2.2 Update Discovery Service (4 hours)

**File**: `/backend/src/connectors/google.ts`

**MODIFY METHOD** `discoverOAuthApplications()` (lines 882-962):

**Find this section** (around line 913):
```typescript
metadata: {
  clientId: token.clientId,
  scopes: token.scopes,
  scopeCount: token.scopes?.length || 0,
  displayText: token.displayText,
  anonymous: token.anonymous,
  nativeApp: token.nativeApp,
  isAIPlatform: aiDetection.detected,
  aiPlatformType: aiDetection.platform,
  aiPlatformName: aiDetection.platformName,
  aiPlatformConfidence: aiDetection.confidence,
  detectionMethod: 'oauth_tokens_api',
  riskFactors: riskAssessment.riskFactors
}
```

**ADD NEW FIELDS**:
```typescript
metadata: {
  clientId: token.clientId,
  scopes: token.scopes,
  scopeCount: token.scopes?.length || 0,
  displayText: token.displayText,
  anonymous: token.anonymous,
  nativeApp: token.nativeApp,
  isAIPlatform: aiDetection.detected,
  aiPlatformType: aiDetection.platform,
  aiPlatformName: aiDetection.platformName,
  aiPlatformConfidence: aiDetection.confidence,
  detectionMethod: 'oauth_tokens_api',
  riskFactors: riskAssessment.riskFactors,
  authorizedBy: token.authorizedBy,      // ✅ NEW: From audit log
  authorizedAt: token.authorizedAt        // ✅ NEW: From audit log
},
owner: {                                 // ✅ NEW: Owner information
  email: token.authorizedBy,
  authorizedAt: token.authorizedAt
}
```

---

### 2.3 Update Discovery Service Storage (2 hours)

**File**: `/backend/src/services/discovery-service.ts`

**FIND** (around line 432):
```typescript
JSON.stringify(automation.owner || {}),
```

**ENSURE** it stores the owner object properly from `automation.owner`.

The current code is correct - it will store whatever `automation.owner` contains.

---

### 2.4 Integration Test for Audit Log Correlation (4 hours)

**Create File**: `/backend/src/__tests__/integration/google-oauth-audit-correlation.integration.test.ts`

```typescript
/**
 * Integration Test: Google OAuth Audit Log Correlation
 * Tests that user email and auth timestamps are extracted from audit logs
 */

import { GoogleAPIClientService } from '../../services/google-api-client-service';
import { GoogleOAuthCredentials } from '@saas-xray/shared-types';

describe('Google OAuth Audit Log Correlation', () => {
  let client: GoogleAPIClientService;
  let credentials: GoogleOAuthCredentials;

  beforeAll(() => {
    client = new GoogleAPIClientService();

    // Load real credentials from environment (for manual testing)
    credentials = {
      accessToken: process.env.GOOGLE_ACCESS_TOKEN || '',
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN || '',
      tokenType: 'Bearer',
      scope: process.env.GOOGLE_SCOPES || '',
      expiresAt: new Date(Date.now() + 3600000)
    };
  });

  it('should correlate OAuth tokens with audit log user emails', async () => {
    if (!credentials.accessToken) {
      console.log('Skipping test - no Google credentials');
      return;
    }

    await client.initialize(credentials);

    const apps = await client.getOAuthApplications();

    expect(apps.length).toBeGreaterThan(0);

    // Check that at least some apps have user email correlation
    const appsWithEmail = apps.filter(app => app.authorizedBy && app.authorizedBy !== 'unknown');

    expect(appsWithEmail.length).toBeGreaterThan(0);

    appsWithEmail.forEach(app => {
      expect(app.authorizedBy).toMatch(/@/); // Valid email format
      expect(app.authorizedAt).toBeInstanceOf(Date);
      expect(app.authorizedAt?.getTime()).toBeLessThan(Date.now()); // In the past
    });
  });

  it('should extract authorization timestamps from audit logs', async () => {
    if (!credentials.accessToken) {
      console.log('Skipping test - no Google credentials');
      return;
    }

    await client.initialize(credentials);

    const apps = await client.getOAuthApplications();

    const aiPlatforms = apps.filter(app => app.isAIPlatform === true);

    aiPlatforms.forEach(platform => {
      if (platform.authorizedAt) {
        const daysSinceAuth = (Date.now() - platform.authorizedAt.getTime()) / (1000 * 60 * 60 * 24);

        // Authorization should be within last 90 days (our audit log window)
        expect(daysSinceAuth).toBeLessThanOrEqual(90);
        expect(daysSinceAuth).toBeGreaterThanOrEqual(0);

        console.log(`${platform.displayText} authorized ${daysSinceAuth.toFixed(0)} days ago by ${platform.authorizedBy}`);
      }
    });
  });
});
```

---

## Testing Checklist

### Manual Testing Steps

1. **Start Backend**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Trigger Discovery**:
   ```bash
   curl -X POST http://localhost:3000/api/discovery/run \
     -H "Authorization: Bearer <clerk-token>" \
     -H "Content-Type: application/json"
   ```

3. **Check API Response**:
   ```bash
   curl http://localhost:3000/api/automations \
     -H "Authorization: Bearer <clerk-token>" \
     | jq '.automations[] | select(.name=="ChatGPT")'
   ```

4. **Verify Database**:
   ```bash
   psql postgresql://postgres:password@localhost:5433/saas_xray
   ```
   ```sql
   SELECT
     name,
     platform_metadata->>'isAIPlatform' as is_ai,
     platform_metadata->>'platformName' as platform,
     platform_metadata->>'scopes' as scopes,
     owner_info->>'email' as authorized_by
   FROM discovered_automations
   WHERE name IN ('ChatGPT', 'Claude');
   ```

5. **Test Frontend**:
   ```bash
   cd frontend
   npm run dev
   # Navigate to http://localhost:4200/automations
   ```

---

## Success Criteria

### Phase 1 Complete When:
- ✅ Platform field shows "google" (not "unknown")
- ✅ Risk level shows "high" for AI platforms (not "medium")
- ✅ Permissions array contains 3-5 OAuth scopes (not empty)
- ✅ Risk factors array contains 2-4 items (not empty)
- ✅ Recommendations generated automatically
- ✅ All integration tests pass

### Phase 2 Complete When:
- ✅ Created By shows user email (not "unknown")
- ✅ Created At shows authorization date (not discovery date)
- ✅ Audit log correlation integration test passes
- ✅ Manual verification: `owner_info.email` populated in database

---

## Rollback Plan

If issues arise:

1. **Revert API Mapping**:
   ```bash
   git checkout main -- backend/src/routes/automations-mock.ts
   ```

2. **Revert Repository Changes**:
   ```bash
   git checkout main -- backend/src/database/repositories/discovered-automation.ts
   ```

3. **Revert Google API Client**:
   ```bash
   git checkout main -- backend/src/services/google-api-client-service.ts
   ```

4. **Restart Server**:
   ```bash
   npm run dev
   ```

---

**End of Implementation Guide**
