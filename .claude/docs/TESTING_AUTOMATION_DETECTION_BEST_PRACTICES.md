# Testing Automation Detection Systems: Research & Best Practices

## Executive Summary

This document compiles industry best practices for testing automation detection systems, specifically tailored for Node.js/TypeScript environments with Jest. Based on research from authoritative sources including the Node.js Testing Best Practices repository (goldbergyoni), Google ML documentation, OAuth testing guides, and real-world enterprise patterns.

**Key Findings:**
- Component/integration tests provide the highest ROI for detection systems
- Fixture versioning is critical for regression testing detection algorithms
- Detection accuracy metrics (precision, recall, F1) must be continuously monitored
- OAuth connector testing requires both mock and contract-based approaches
- Parallel test execution essential for CI/CD efficiency

---

## 1. Test Data & Fixtures

### 1.1 Realistic Mock Data for OAuth Platforms

**Authority Level:** Industry Standard (BrowserStack, Beeceptor, WireMock documentation)

#### Best Practices

**Minimal Fixture Pattern:**
Only mock fields your unit under test actually needs. Over-mocking creates brittleness.

```typescript
// ✅ GOOD - Minimal, focused fixture
export const mockSlackUser = {
  id: 'U024BE7LH',
  name: 'test-user',
  is_bot: false,
  // Only include fields the test validates
};

// ❌ BAD - Over-mocking creates maintenance burden
export const mockSlackUser = {
  id: 'U024BE7LH',
  name: 'test-user',
  is_bot: false,
  profile: { /* 50+ fields */ },
  tz_offset: -28800,
  // ... unnecessary fields
};
```

**Captured Real Responses:**
Create fixtures from real API responses during development, then sanitize for testing.

```typescript
// backend/tests/fixtures/oauth/slack/
// - users.list.json
// - conversations.list.json
// - team.info.json

// Create subclasses that override OAuth client methods
class MockSlackClient extends SlackClient {
  async users.list() {
    return JSON.parse(
      fs.readFileSync('./fixtures/oauth/slack/users.list.json', 'utf-8')
    );
  }
}
```

**Security-First Fixtures:**
Always sanitize real credentials from captured responses.

```typescript
// ✅ Sanitization helper
export function sanitizeOAuthFixture(response: any) {
  const sanitized = { ...response };

  // Remove real tokens
  if (sanitized.access_token) {
    sanitized.access_token = `mock_token_${crypto.randomBytes(8).toString('hex')}`;
  }

  // Mask real user data
  if (sanitized.email) {
    sanitized.email = `test.user${Math.random()}@example.com`;
  }

  return sanitized;
}
```

#### Recommended File Structure

```
backend/tests/fixtures/
├── oauth/
│   ├── slack/
│   │   ├── v1.0/                    # Version fixtures
│   │   │   ├── users.list.json
│   │   │   ├── team.info.json
│   │   │   └── error-responses/
│   │   │       ├── rate-limit.json
│   │   │       └── invalid-token.json
│   │   └── v1.1/
│   ├── google/
│   │   ├── v1.0/
│   │   │   ├── people.list.json
│   │   │   ├── scripts.list.json
│   │   │   └── admin.users.list.json
│   │   └── scenarios/              # Test scenarios
│   │       ├── workspace-admin.json
│   │       ├── personal-account.json
│   │       └── high-risk-script.json
│   └── microsoft/
│       └── v1.0/
├── audit-logs/
│   ├── slack-events.json
│   ├── google-audit.json
│   └── anomalies.json              # Known anomaly patterns
└── detection-scenarios/            # Edge cases
    ├── false-positives.json
    ├── false-negatives.json
    └── boundary-cases.json
```

**Your Current Implementation:**
Your `MockDataGenerator` class is excellent. Enhancements:

```typescript
// Add to backend/tests/helpers/mock-data.ts

export class MockDataGenerator {
  // ... existing methods ...

  /**
   * Load fixture from versioned directory
   * Supports fixture versioning for regression testing
   */
  static loadFixture<T>(
    platform: Platform,
    fixtureName: string,
    version: string = 'v1.0'
  ): T {
    const fixturePath = path.join(
      __dirname,
      '../fixtures/oauth',
      platform,
      version,
      `${fixtureName}.json`
    );

    if (!fs.existsSync(fixturePath)) {
      throw new Error(`Fixture not found: ${fixturePath}`);
    }

    return JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
  }

  /**
   * Save fixture for future regression tests
   */
  static saveFixture(
    platform: Platform,
    fixtureName: string,
    data: any,
    version: string = 'v1.0'
  ): void {
    const fixtureDir = path.join(
      __dirname,
      '../fixtures/oauth',
      platform,
      version
    );

    fs.mkdirSync(fixtureDir, { recursive: true });

    const sanitized = this.sanitizeOAuthFixture(data);
    fs.writeFileSync(
      path.join(fixtureDir, `${fixtureName}.json`),
      JSON.stringify(sanitized, null, 2)
    );
  }
}
```

### 1.2 Stress Test Dataset Generation

**Authority Level:** Official Testing Documentation (Jest, Node.js Test Runner)

**Scalable Dataset Generation:**

```typescript
// backend/tests/helpers/stress-test-data.ts

export class StressTestDataGenerator {
  /**
   * Generate large datasets for performance testing
   * Target: 10K-100K automations across platforms
   */
  static generateLargeDataset(config: {
    organizations: number;
    connectionsPerOrg: number;
    automationsPerConnection: number;
  }) {
    const { organizations, connectionsPerOrg, automationsPerConnection } = config;

    // Pre-allocate arrays for performance
    const totalConnections = organizations * connectionsPerOrg;
    const totalAutomations = totalConnections * automationsPerConnection;

    console.log(`Generating ${totalAutomations} automations...`);

    const orgs = new Array(organizations);
    const connections = new Array(totalConnections);
    const automations = new Array(totalAutomations);

    let connIdx = 0;
    let autoIdx = 0;

    for (let i = 0; i < organizations; i++) {
      orgs[i] = MockDataGenerator.createMockOrganization({
        name: `Stress Test Org ${i}`
      });

      for (let j = 0; j < connectionsPerOrg; j++) {
        connections[connIdx] = MockDataGenerator.createMockPlatformConnection(
          orgs[i].id,
          { platform_type: this.getPlatformByIndex(j % 3) }
        );

        for (let k = 0; k < automationsPerConnection; k++) {
          automations[autoIdx] = this.createMockAutomation(
            connections[connIdx].id,
            { riskScore: Math.random() * 100 }
          );
          autoIdx++;
        }
        connIdx++;
      }
    }

    return { organizations: orgs, connections, automations };
  }

  /**
   * Generate edge case scenarios
   * Based on real-world anomalies from production systems
   */
  static generateEdgeCases() {
    return {
      // Zero-day automation (created seconds ago)
      zeroDayAutomation: MockDataGenerator.createMockGoogleAppsScriptProject({
        createdTime: new Date(Date.now() - 5000), // 5 seconds ago
        lastModifiedTime: new Date()
      }),

      // Dormant automation (no activity for 2+ years)
      dormantAutomation: MockDataGenerator.createMockGoogleAppsScriptProject({
        createdTime: new Date(Date.now() - 730 * 24 * 3600000),
        lastModifiedTime: new Date(Date.now() - 730 * 24 * 3600000)
      }),

      // Extreme permissions (100+ scopes)
      extremePermissions: MockDataGenerator.createMockGoogleAppsScriptProject({
        permissions: Array.from({ length: 100 }, (_, i) => ({
          scope: `https://www.googleapis.com/auth/scope${i}`,
          riskLevel: i > 90 ? 'critical' : 'medium'
        }))
      }),

      // Unicode/emoji in metadata
      unicodeMetadata: MockDataGenerator.createMockGoogleAppsScriptProject({
        title: '🤖 Automation Bot 自動化 مؤتمت',
        description: 'Testing unicode: 你好 مرحبا שלום'
      }),

      // Null/undefined handling
      incompleteData: {
        scriptId: undefined,
        title: null,
        owner: '',
        permissions: []
      }
    };
  }
}
```

### 1.3 Fixture Versioning Strategy

**Authority Level:** Test Data Management Best Practices (Tricentis, BrowserStack)

**Why Version Fixtures?**
1. Track API changes over time
2. Support regression testing
3. Enable rollback to previous test states
4. Document API evolution

**Versioning Pattern:**

```typescript
// backend/tests/helpers/fixture-version-manager.ts

export class FixtureVersionManager {
  /**
   * Load fixture with automatic fallback to previous versions
   */
  static loadWithFallback<T>(
    platform: Platform,
    fixtureName: string,
    preferredVersion: string = 'latest'
  ): T {
    const versions = this.getAvailableVersions(platform, fixtureName);

    if (preferredVersion === 'latest') {
      return MockDataGenerator.loadFixture(
        platform,
        fixtureName,
        versions[versions.length - 1]
      );
    }

    // Try exact version match
    if (versions.includes(preferredVersion)) {
      return MockDataGenerator.loadFixture(platform, fixtureName, preferredVersion);
    }

    // Fallback to closest version
    const closest = this.findClosestVersion(versions, preferredVersion);
    console.warn(
      `Fixture version ${preferredVersion} not found, using ${closest}`
    );

    return MockDataGenerator.loadFixture(platform, fixtureName, closest);
  }

  /**
   * Compare fixture versions for breaking changes
   */
  static compareVersions(
    platform: Platform,
    fixtureName: string,
    oldVersion: string,
    newVersion: string
  ): FixtureDiff {
    const oldData = MockDataGenerator.loadFixture(
      platform,
      fixtureName,
      oldVersion
    );
    const newData = MockDataGenerator.loadFixture(
      platform,
      fixtureName,
      newVersion
    );

    return {
      addedFields: this.findAddedFields(oldData, newData),
      removedFields: this.findRemovedFields(oldData, newData),
      modifiedFields: this.findModifiedFields(oldData, newData),
      breakingChanges: this.detectBreakingChanges(oldData, newData)
    };
  }
}

// Usage in tests
describe('Google OAuth Connector - API Version Compatibility', () => {
  it('should handle both v1.0 and v1.1 user responses', async () => {
    // Test against old API version
    const v1Response = FixtureVersionManager.loadWithFallback(
      'google',
      'admin.users.list',
      'v1.0'
    );

    // Test against new API version
    const v1_1Response = FixtureVersionManager.loadWithFallback(
      'google',
      'admin.users.list',
      'v1.1'
    );

    // Connector should handle both
    expect(connector.parseUsers(v1Response)).toBeDefined();
    expect(connector.parseUsers(v1_1Response)).toBeDefined();
  });
});
```

---

## 2. Detection Algorithm Testing

### 2.1 ML/Correlation Algorithm Accuracy Testing

**Authority Level:** Official Documentation (Google ML Crash Course, Evidently AI)

#### Core Metrics

**Precision:** TP / (TP + FP)
- Definition: Percentage of detected automations that are actually automated agents
- Use Case: When false positives are costly (don't want to flag legitimate tools)
- Singura Target: 85%+ precision

**Recall (Sensitivity):** TP / (TP + FN)
- Definition: Percentage of actual automations that were detected
- Use Case: When false negatives are dangerous (must catch all threats)
- Singura Target: 90%+ recall (security-critical)

**F1 Score:** 2 × (Precision × Recall) / (Precision + Recall)
- Definition: Harmonic mean balancing precision and recall
- Use Case: When you need balanced performance
- Singura Target: 87%+ F1

#### Implementation

```typescript
// backend/tests/services/detection/detection-metrics.test.ts

interface DetectionResult {
  automationId: string;
  predicted: boolean;    // Model prediction
  actual: boolean;       // Ground truth
  confidence: number;
  riskScore: number;
}

class DetectionMetrics {
  /**
   * Calculate precision, recall, F1 from test results
   */
  static calculateMetrics(results: DetectionResult[]) {
    const truePositives = results.filter(r => r.predicted && r.actual).length;
    const falsePositives = results.filter(r => r.predicted && !r.actual).length;
    const falseNegatives = results.filter(r => !r.predicted && r.actual).length;
    const trueNegatives = results.filter(r => !r.predicted && !r.actual).length;

    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    const f1Score = (2 * precision * recall) / (precision + recall) || 0;

    // False discovery rate (for security context)
    const fdr = falsePositives / (falsePositives + truePositives) || 0;

    return {
      precision,
      recall,
      f1Score,
      truePositives,
      falsePositives,
      trueNegatives,
      falseNegatives,
      accuracy: (truePositives + trueNegatives) / results.length,
      falseDiscoveryRate: fdr,
      specificity: trueNegatives / (trueNegatives + falsePositives) || 0
    };
  }

  /**
   * Generate confusion matrix
   */
  static confusionMatrix(results: DetectionResult[]) {
    const metrics = this.calculateMetrics(results);

    return {
      matrix: [
        [metrics.trueNegatives, metrics.falsePositives],
        [metrics.falseNegatives, metrics.truePositives]
      ],
      labels: ['Legitimate', 'Automation'],
      visualization: this.visualizeMatrix(metrics)
    };
  }

  /**
   * Precision-Recall curve for threshold tuning
   */
  static precisionRecallCurve(results: DetectionResult[]) {
    // Sort by confidence descending
    const sorted = results.sort((a, b) => b.confidence - a.confidence);

    const curve = sorted.map((_, threshold) => {
      const thresholdResults = sorted.slice(0, threshold + 1);
      return {
        threshold: sorted[threshold].confidence,
        ...this.calculateMetrics(thresholdResults)
      };
    });

    return curve;
  }
}

describe('Detection Algorithm - Accuracy Metrics', () => {
  let testDataset: DetectionResult[];

  beforeAll(async () => {
    // Load ground truth dataset
    testDataset = await loadGroundTruthDataset();
  });

  it('should achieve minimum precision threshold (85%)', async () => {
    const metrics = DetectionMetrics.calculateMetrics(testDataset);

    expect(metrics.precision).toBeGreaterThanOrEqual(0.85);

    if (metrics.precision < 0.85) {
      console.error('Precision below threshold:', {
        precision: metrics.precision,
        falsePositives: metrics.falsePositives,
        truePositives: metrics.truePositives
      });
    }
  });

  it('should achieve minimum recall threshold (90%)', async () => {
    const metrics = DetectionMetrics.calculateMetrics(testDataset);

    // Recall is critical for security - must catch threats
    expect(metrics.recall).toBeGreaterThanOrEqual(0.90);

    if (metrics.recall < 0.90) {
      console.error('Recall below threshold:', {
        recall: metrics.recall,
        falseNegatives: metrics.falseNegatives,
        missedAutomations: testDataset
          .filter(r => !r.predicted && r.actual)
          .map(r => r.automationId)
      });
    }
  });

  it('should balance precision and recall (F1 >= 87%)', async () => {
    const metrics = DetectionMetrics.calculateMetrics(testDataset);

    expect(metrics.f1Score).toBeGreaterThanOrEqual(0.87);
  });

  it('should maintain low false discovery rate (< 15%)', async () => {
    const metrics = DetectionMetrics.calculateMetrics(testDataset);

    expect(metrics.falseDiscoveryRate).toBeLessThan(0.15);
  });
});
```

### 2.2 False Positive & False Negative Testing

**Authority Level:** Industry Best Practices (BrowserStack, Testsigma, Rapita Systems)

**Key Insight:** False negatives are more dangerous in security contexts than false positives.

```typescript
// backend/tests/fixtures/detection-scenarios/false-positives.json
{
  "legitimateTools": [
    {
      "name": "Zapier Official Integration",
      "description": "Company-approved automation platform",
      "indicators": {
        "hasOAuthApp": true,
        "companyApproved": true,
        "hasServiceAccount": false,
        "riskFactors": ["external_integration"]
      },
      "expectedClassification": "legitimate",
      "notes": "Should NOT be flagged despite OAuth presence"
    },
    {
      "name": "Power Automate Enterprise",
      "description": "Microsoft-managed automation (company subscription)",
      "indicators": {
        "hasOAuthApp": true,
        "vendorVerified": true,
        "enterpriseTier": true
      },
      "expectedClassification": "legitimate"
    }
  ]
}

// backend/tests/fixtures/detection-scenarios/false-negatives.json
{
  "missedThreats": [
    {
      "name": "Shadow IT Script",
      "description": "Unmanaged Google Apps Script with admin access",
      "indicators": {
        "createdByEmployee": true,
        "hasAdminScope": true,
        "noITApproval": true,
        "lastModified": "2023-01-15T10:30:00Z"
      },
      "expectedClassification": "automation_agent",
      "notes": "MUST be detected - security risk"
    },
    {
      "name": "Rogue Service Account",
      "description": "Unauthorized GCP service account with domain delegation",
      "indicators": {
        "hasServiceAccount": true,
        "domainWideDelegation": true,
        "unknownOrigin": true
      },
      "expectedClassification": "automation_agent"
    }
  ]
}

// Test implementation
describe('Detection Algorithm - False Positive Prevention', () => {
  const legitimateToolsFixture = require('../fixtures/detection-scenarios/false-positives.json');

  it('should NOT flag company-approved tools', async () => {
    for (const tool of legitimateToolsFixture.legitimateTools) {
      const result = await detectionEngine.classify(tool);

      expect(result.isAutomation).toBe(false);
      expect(result.confidence).toBeLessThan(0.3); // Low confidence it's automation
    }
  });
});

describe('Detection Algorithm - False Negative Prevention', () => {
  const missedThreatsFixture = require('../fixtures/detection-scenarios/false-negatives.json');

  it('MUST detect all known shadow IT patterns', async () => {
    for (const threat of missedThreatsFixture.missedThreats) {
      const result = await detectionEngine.classify(threat);

      // Critical: These MUST be detected
      expect(result.isAutomation).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);

      if (!result.isAutomation) {
        // Log for immediate investigation
        console.error('CRITICAL: Missed threat detection', {
          threat: threat.name,
          indicators: threat.indicators,
          result
        });
      }
    }
  });
});
```

### 2.3 Baseline Establishment & Drift Detection

**Authority Level:** ML Best Practices (ScienceDirect, GeeksforGeeks)

```typescript
// backend/tests/services/detection/baseline-testing.test.ts

class BaselineManager {
  /**
   * Establish baseline metrics from known-good dataset
   */
  static async establishBaseline(
    testDataset: DetectionResult[]
  ): Promise<DetectionBaseline> {
    const metrics = DetectionMetrics.calculateMetrics(testDataset);

    return {
      timestamp: new Date(),
      datasetSize: testDataset.length,
      metrics,
      distribution: {
        automations: testDataset.filter(r => r.actual).length,
        legitimate: testDataset.filter(r => !r.actual).length
      },
      version: '1.0.0'
    };
  }

  /**
   * Detect drift from baseline (algorithm degradation)
   */
  static detectDrift(
    baseline: DetectionBaseline,
    current: DetectionBaseline,
    thresholds: DriftThresholds = {
      precisionDrift: 0.05,  // 5% drop is significant
      recallDrift: 0.03,     // 3% drop is critical (security)
      f1Drift: 0.05
    }
  ): DriftReport {
    const precisionDrift = baseline.metrics.precision - current.metrics.precision;
    const recallDrift = baseline.metrics.recall - current.metrics.recall;
    const f1Drift = baseline.metrics.f1Score - current.metrics.f1Score;

    return {
      hasDrift:
        precisionDrift > thresholds.precisionDrift ||
        recallDrift > thresholds.recallDrift ||
        f1Drift > thresholds.f1Drift,
      drifts: {
        precision: {
          baseline: baseline.metrics.precision,
          current: current.metrics.precision,
          drift: precisionDrift,
          significant: precisionDrift > thresholds.precisionDrift
        },
        recall: {
          baseline: baseline.metrics.recall,
          current: current.metrics.recall,
          drift: recallDrift,
          significant: recallDrift > thresholds.recallDrift
        },
        f1: {
          baseline: baseline.metrics.f1Score,
          current: current.metrics.f1Score,
          drift: f1Drift,
          significant: f1Drift > thresholds.f1Drift
        }
      }
    };
  }
}

describe('Detection Algorithm - Baseline & Drift', () => {
  let baseline: DetectionBaseline;

  beforeAll(async () => {
    // Establish baseline from curated dataset
    const groundTruth = await loadGroundTruthDataset();
    baseline = await BaselineManager.establishBaseline(groundTruth);

    // Save baseline for future comparison
    fs.writeFileSync(
      './tests/fixtures/baselines/detection-baseline.json',
      JSON.stringify(baseline, null, 2)
    );
  });

  it('should maintain baseline performance', async () => {
    const currentDataset = await loadGroundTruthDataset();
    const currentMetrics = DetectionMetrics.calculateMetrics(currentDataset);

    const current: DetectionBaseline = {
      timestamp: new Date(),
      datasetSize: currentDataset.length,
      metrics: currentMetrics,
      distribution: {
        automations: currentDataset.filter(r => r.actual).length,
        legitimate: currentDataset.filter(r => !r.actual).length
      },
      version: '1.0.0'
    };

    const driftReport = BaselineManager.detectDrift(baseline, current);

    expect(driftReport.hasDrift).toBe(false);

    if (driftReport.hasDrift) {
      console.error('Algorithm drift detected:', driftReport.drifts);
    }
  });
});
```

---

## 3. Integration Testing

### 3.1 OAuth Connector Testing with Mock APIs

**Authority Level:** OAuth Documentation, Stack Overflow Best Practices

**Dual Strategy: Mocks + Contract Tests**

```typescript
// backend/tests/connectors/oauth-testing-strategy.test.ts

/**
 * STRATEGY 1: Mock OAuth Servers (Fast, Isolated)
 * Use for: Unit tests, CI/CD, rapid feedback
 */
describe('Google Connector - Mock OAuth Server', () => {
  let mockServer: MockOAuthServer;

  beforeEach(() => {
    mockServer = new MockOAuthServer({
      platform: 'google',
      baseUrl: 'http://localhost:9999'
    });

    mockServer.start();
  });

  afterEach(() => {
    mockServer.stop();
  });

  it('should handle successful OAuth flow', async () => {
    // Mock server returns predefined response
    mockServer.mockTokenExchange({
      access_token: 'ya29.mock_token',
      refresh_token: '1//04mock_refresh',
      expires_in: 3599,
      scope: 'https://www.googleapis.com/auth/userinfo.email'
    });

    const connector = new GoogleConnector({
      oauthBaseUrl: mockServer.baseUrl
    });

    const tokens = await connector.exchangeCode('mock_code');

    expect(tokens.accessToken).toBe('ya29.mock_token');
  });

  it('should handle rate limiting (429)', async () => {
    mockServer.mockRateLimit({
      retryAfter: 60,
      quotaUser: 'test-user',
      quotaExceeded: true
    });

    const connector = new GoogleConnector({
      oauthBaseUrl: mockServer.baseUrl
    });

    await expect(connector.listUsers()).rejects.toThrow(RateLimitError);
  });
});

/**
 * STRATEGY 2: Contract Tests (Validate Against Real API Schema)
 * Use for: API version changes, regression testing
 */
describe('Google Connector - Contract Tests', () => {
  it('should match Google OAuth 2.0 token response schema', async () => {
    const mockResponse = MockDataGenerator.createMockGoogleOAuthRawResponse();

    // Validate against OpenAPI/JSON Schema
    const schema = require('../fixtures/contracts/google-oauth-token-schema.json');
    const validator = new Validator(schema);

    const validation = validator.validate(mockResponse);

    expect(validation.errors).toHaveLength(0);
  });

  it('should handle all documented Google OAuth error codes', async () => {
    const errorCodes = [
      'invalid_client',
      'invalid_grant',
      'unauthorized_client',
      'access_denied',
      'unsupported_response_type'
    ];

    for (const errorCode of errorCodes) {
      const mockError = {
        error: errorCode,
        error_description: 'Mock error description'
      };

      // Connector should handle gracefully
      expect(() => connector.handleOAuthError(mockError)).not.toThrow();
    }
  });
});
```

**Mock OAuth Server Implementation:**

```typescript
// backend/tests/helpers/mock-oauth-server.ts

import express from 'express';
import { Server } from 'http';

export class MockOAuthServer {
  private app: express.Application;
  private server: Server | null = null;
  private responses: Map<string, any> = new Map();

  constructor(private config: { platform: string; baseUrl: string }) {
    this.app = express();
    this.setupRoutes();
  }

  private setupRoutes() {
    // OAuth token endpoint
    this.app.post('/oauth/token', (req, res) => {
      const response = this.responses.get('token_exchange') || {
        error: 'invalid_request'
      };

      // Simulate rate limiting
      if (this.responses.has('rate_limit')) {
        return res.status(429).json(this.responses.get('rate_limit'));
      }

      res.json(response);
    });

    // User info endpoint
    this.app.get('/oauth/userinfo', (req, res) => {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'invalid_token' });
      }

      res.json(this.responses.get('user_info') || {});
    });

    // Platform-specific API endpoints
    this.app.get('/admin/directory/v1/users', (req, res) => {
      res.json(this.responses.get('users_list') || { users: [] });
    });
  }

  mockTokenExchange(response: any) {
    this.responses.set('token_exchange', response);
  }

  mockRateLimit(config: { retryAfter: number }) {
    this.responses.set('rate_limit', {
      error: {
        code: 429,
        message: 'Rate Limit Exceeded',
        errors: [{ reason: 'rateLimitExceeded' }]
      }
    });
  }

  start(port: number = 9999) {
    this.server = this.app.listen(port);
  }

  stop() {
    this.server?.close();
  }
}
```

### 3.2 Rate Limiting & Error Handling

**Authority Level:** OAuth Provider Documentation (Okta, Auth0, Google Cloud)

```typescript
// backend/tests/connectors/rate-limiting.test.ts

describe('OAuth Connector - Rate Limiting', () => {
  it('should implement exponential backoff on 429', async () => {
    const mockServer = new MockOAuthServer({ platform: 'google', baseUrl: 'http://localhost:9999' });
    mockServer.start();

    let attemptCount = 0;
    const attemptTimes: number[] = [];

    // Mock 3 rate limit responses, then success
    mockServer.mockRateLimitSequence([
      { retryAfter: 1, attempt: 1 },
      { retryAfter: 2, attempt: 2 },
      { retryAfter: 4, attempt: 3 },
      { success: true }
    ]);

    const connector = new GoogleConnector({
      oauthBaseUrl: mockServer.baseUrl,
      retryConfig: {
        maxAttempts: 4,
        backoffStrategy: 'exponential'
      }
    });

    const startTime = Date.now();
    const result = await connector.listUsers();
    const endTime = Date.now();

    // Should have retried 3 times with exponential backoff
    expect(attemptCount).toBe(4);

    // Total wait time should be approximately 1 + 2 + 4 = 7 seconds
    expect(endTime - startTime).toBeGreaterThan(7000);
    expect(endTime - startTime).toBeLessThan(8000);

    mockServer.stop();
  });

  it('should respect RateLimit-Reset header', async () => {
    const connector = new GoogleConnector();

    const rateLimitResponse = {
      status: 429,
      headers: {
        'RateLimit-Limit': '100',
        'RateLimit-Remaining': '0',
        'RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 60)
      }
    };

    const retryInfo = connector.parseRateLimitHeaders(rateLimitResponse.headers);

    expect(retryInfo.retryAfterSeconds).toBe(60);
    expect(retryInfo.quotaRemaining).toBe(0);
  });

  it('should log rate limit metrics for monitoring', async () => {
    const metrics: RateLimitMetric[] = [];

    const connector = new GoogleConnector({
      onRateLimit: (metric) => metrics.push(metric)
    });

    // Trigger rate limit
    await connector.listUsers().catch(() => {});

    expect(metrics).toHaveLength(1);
    expect(metrics[0]).toMatchObject({
      platform: 'google',
      endpoint: '/admin/directory/v1/users',
      retryAfter: expect.any(Number),
      timestamp: expect.any(Date)
    });
  });
});

// Integration test: Parallel requests with rate limiting
describe('OAuth Connector - Concurrent Rate Limiting', () => {
  it('should handle concurrent requests without exceeding quota', async () => {
    const connector = new GoogleConnector({
      rateLimitConfig: {
        requestsPerSecond: 10,
        burstSize: 20
      }
    });

    // Simulate 100 concurrent requests
    const requests = Array.from({ length: 100 }, (_, i) =>
      connector.listUsers({ pageToken: `page-${i}` })
    );

    const startTime = Date.now();
    const results = await Promise.allSettled(requests);
    const endTime = Date.now();

    // All should eventually succeed
    const successful = results.filter(r => r.status === 'fulfilled').length;
    expect(successful).toBe(100);

    // Should take at least 10 seconds (100 requests / 10 per second)
    expect(endTime - startTime).toBeGreaterThan(10000);
  });
});
```

### 3.3 End-to-End OAuth Flow Testing

**Authority Level:** Node.js Testing Best Practices (goldbergyoni)

```typescript
// backend/tests/e2e/oauth-flow.test.ts

describe('OAuth Flow - End-to-End', () => {
  let testServer: TestServer;
  let database: TestDatabase;

  beforeAll(async () => {
    // Start real backend server
    testServer = await TestServer.start({
      port: 3001,
      env: 'test'
    });

    // Use real PostgreSQL with test data
    database = await TestDatabase.initialize();
  });

  afterAll(async () => {
    await testServer.stop();
    await database.cleanup();
  });

  it('should complete full OAuth flow: authorization -> token exchange -> API calls', async () => {
    const testOrg = await database.createOrganization();
    const testUser = await database.createUser({ organizationId: testOrg.id });

    // 1. Initiate OAuth
    const authUrl = await request(testServer.app)
      .get('/api/auth/google/authorize')
      .query({ userId: testUser.id, organizationId: testOrg.id })
      .expect(200);

    expect(authUrl.body).toHaveProperty('authorizationUrl');
    expect(authUrl.body.authorizationUrl).toContain('accounts.google.com/o/oauth2');

    // 2. Simulate OAuth callback with mock code
    const callbackResponse = await request(testServer.app)
      .get('/api/auth/google/callback')
      .query({
        code: 'mock_authorization_code',
        state: authUrl.body.state
      })
      .expect(302); // Redirect

    // 3. Verify connection created in database
    const connection = await database.findConnection({
      organizationId: testOrg.id,
      platformType: 'google'
    });

    expect(connection).toBeDefined();
    expect(connection.status).toBe('connected');

    // 4. Test API call using stored credentials
    const usersResponse = await request(testServer.app)
      .get('/api/google/users')
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .query({ connectionId: connection.id })
      .expect(200);

    expect(usersResponse.body).toHaveProperty('users');
    expect(Array.isArray(usersResponse.body.users)).toBe(true);

    // 5. Verify audit log created
    const auditLogs = await database.getAuditLogs({
      organizationId: testOrg.id,
      action: 'platform_connection_created'
    });

    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].resource_id).toBe(connection.id);
  });

  it('should handle OAuth errors gracefully', async () => {
    const testOrg = await database.createOrganization();
    const testUser = await database.createUser({ organizationId: testOrg.id });

    // Simulate OAuth rejection
    const errorResponse = await request(testServer.app)
      .get('/api/auth/google/callback')
      .query({
        error: 'access_denied',
        error_description: 'The user denied the request'
      })
      .expect(400);

    expect(errorResponse.body).toMatchObject({
      error: 'oauth_error',
      message: expect.stringContaining('access_denied')
    });

    // Verify no connection created
    const connection = await database.findConnection({
      organizationId: testOrg.id,
      platformType: 'google'
    });

    expect(connection).toBeNull();
  });
});
```

---

## 4. Stress Testing

### 4.1 Large Dataset Generation & Performance

**Authority Level:** Performance Testing Best Practices (AppSignal, Stackify, Bocoup)

```typescript
// backend/tests/performance/stress-test.test.ts

describe('Detection Engine - Stress Testing', () => {
  // Disable default timeout for stress tests
  jest.setTimeout(300000); // 5 minutes

  it('should process 10K automations in < 30 seconds', async () => {
    const dataset = StressTestDataGenerator.generateLargeDataset({
      organizations: 100,
      connectionsPerOrg: 10,
      automationsPerConnection: 10
    }); // 100 * 10 * 10 = 10K automations

    const startTime = Date.now();
    const results = await detectionEngine.batchClassify(dataset.automations);
    const endTime = Date.now();

    const duration = endTime - startTime;

    expect(duration).toBeLessThan(30000); // < 30 seconds
    expect(results).toHaveLength(10000);

    // Log performance metrics
    console.log(`Processed ${results.length} automations in ${duration}ms`);
    console.log(`Throughput: ${Math.floor(results.length / (duration / 1000))} automations/second`);
  });

  it('should maintain accuracy under high load', async () => {
    const dataset = StressTestDataGenerator.generateLargeDataset({
      organizations: 50,
      connectionsPerOrg: 20,
      automationsPerConnection: 10
    }); // 10K automations

    // Add ground truth labels
    const labeledDataset = dataset.automations.map(automation => ({
      ...automation,
      actual: automation.riskScore > 70 // Ground truth: high risk = automation
    }));

    const results = await detectionEngine.batchClassify(labeledDataset);

    const detectionResults: DetectionResult[] = results.map((result, i) => ({
      automationId: labeledDataset[i].id,
      predicted: result.isAutomation,
      actual: labeledDataset[i].actual,
      confidence: result.confidence,
      riskScore: labeledDataset[i].riskScore
    }));

    const metrics = DetectionMetrics.calculateMetrics(detectionResults);

    // Metrics should not degrade under load
    expect(metrics.precision).toBeGreaterThan(0.85);
    expect(metrics.recall).toBeGreaterThan(0.90);
  });
});
```

### 4.2 Concurrent Discovery Jobs

**Authority Level:** Node.js Testing Best Practices (goldbergyoni)

```typescript
// backend/tests/performance/concurrent-discovery.test.ts

describe('Discovery Service - Concurrent Jobs', () => {
  it('should handle 50 simultaneous discovery jobs', async () => {
    const organizations = Array.from({ length: 50 }, (_, i) =>
      MockDataGenerator.createMockOrganization({ name: `Org ${i}` })
    );

    // Start all discoveries concurrently
    const startTime = Date.now();

    const discoveries = await Promise.all(
      organizations.map(org =>
        discoveryService.startDiscovery({
          organizationId: org.id,
          platforms: ['slack', 'google', 'microsoft']
        })
      )
    );

    const endTime = Date.now();

    // All should complete successfully
    expect(discoveries).toHaveLength(50);
    expect(discoveries.every(d => d.status === 'completed')).toBe(true);

    // Should complete in reasonable time (< 2 minutes with parallelization)
    expect(endTime - startTime).toBeLessThan(120000);
  });

  it('should respect concurrency limits', async () => {
    const discoveryService = new DiscoveryService({
      maxConcurrent: 5 // Only 5 simultaneous discoveries
    });

    const organizations = Array.from({ length: 20 }, (_, i) =>
      MockDataGenerator.createMockOrganization()
    );

    let activeDiscoveries = 0;
    let maxConcurrent = 0;

    discoveryService.on('discovery:start', () => {
      activeDiscoveries++;
      maxConcurrent = Math.max(maxConcurrent, activeDiscoveries);
    });

    discoveryService.on('discovery:complete', () => {
      activeDiscoveries--;
    });

    await Promise.all(
      organizations.map(org =>
        discoveryService.startDiscovery({ organizationId: org.id })
      )
    );

    // Should never exceed concurrency limit
    expect(maxConcurrent).toBeLessThanOrEqual(5);
  });
});
```

### 4.3 Memory & CPU Profiling

**Authority Level:** Node.js Performance Tuning (Stackify, clinic.js)

```typescript
// backend/tests/performance/profiling.test.ts

import { performance, PerformanceObserver } from 'perf_hooks';

describe('Detection Engine - Profiling', () => {
  it('should not exceed 512MB memory for 10K automations', async () => {
    const initialMemory = process.memoryUsage().heapUsed;

    const dataset = StressTestDataGenerator.generateLargeDataset({
      organizations: 100,
      connectionsPerOrg: 10,
      automationsPerConnection: 10
    });

    await detectionEngine.batchClassify(dataset.automations);

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncreaseMB = (finalMemory - initialMemory) / (1024 * 1024);

    expect(memoryIncreaseMB).toBeLessThan(512);

    console.log(`Memory usage: ${memoryIncreaseMB.toFixed(2)} MB`);
  });

  it('should profile CPU usage during batch detection', async () => {
    const marks: { name: string; duration: number }[] = [];

    const obs = new PerformanceObserver((items) => {
      items.getEntries().forEach((entry) => {
        marks.push({ name: entry.name, duration: entry.duration });
      });
    });
    obs.observe({ entryTypes: ['measure'] });

    performance.mark('batch-start');

    const dataset = StressTestDataGenerator.generateLargeDataset({
      organizations: 10,
      connectionsPerOrg: 10,
      automationsPerConnection: 10
    });

    await detectionEngine.batchClassify(dataset.automations);

    performance.mark('batch-end');
    performance.measure('batch-detection', 'batch-start', 'batch-end');

    const measure = marks.find(m => m.name === 'batch-detection');

    expect(measure).toBeDefined();
    expect(measure!.duration).toBeLessThan(10000); // < 10 seconds

    console.log('CPU Profiling:', marks);
  });
});
```

---

## 5. Test Organization

### 5.1 File Structure

**Authority Level:** Jest Official Documentation, LinkedIn Best Practices

**Recommended Structure for Singura:**

```
backend/
├── tests/
│   ├── unit/                          # Fast, isolated tests
│   │   ├── services/
│   │   │   ├── detection-engine.unit.test.ts
│   │   │   ├── correlation.unit.test.ts
│   │   │   └── behavioral-baseline.unit.test.ts
│   │   ├── utils/
│   │   └── helpers/
│   ├── integration/                   # Cross-component tests
│   │   ├── oauth/
│   │   │   ├── slack-oauth.integration.test.ts
│   │   │   ├── google-oauth.integration.test.ts
│   │   │   └── microsoft-oauth.integration.test.ts
│   │   ├── detection/
│   │   │   ├── ml-detection-pipeline.integration.test.ts
│   │   │   └── cross-platform-correlation.integration.test.ts
│   │   └── database/
│   │       ├── repositories.integration.test.ts
│   │       └── migrations.integration.test.ts
│   ├── e2e/                           # Full system tests
│   │   ├── oauth-flows.e2e.test.ts
│   │   ├── discovery-workflow.e2e.test.ts
│   │   └── correlation-workflow.e2e.test.ts
│   ├── performance/                   # Stress & load tests
│   │   ├── stress-test.perf.test.ts
│   │   ├── concurrent-discovery.perf.test.ts
│   │   └── profiling.perf.test.ts
│   ├── security/                      # Security-specific tests
│   │   ├── encryption.security.test.ts
│   │   ├── jwt.security.test.ts
│   │   └── audit.security.test.ts
│   ├── fixtures/                      # Test data
│   │   ├── oauth/
│   │   │   ├── slack/v1.0/
│   │   │   ├── google/v1.0/
│   │   │   └── microsoft/v1.0/
│   │   ├── detection-scenarios/
│   │   │   ├── false-positives.json
│   │   │   ├── false-negatives.json
│   │   │   └── edge-cases.json
│   │   ├── baselines/
│   │   │   └── detection-baseline.json
│   │   └── contracts/                 # API schemas
│   │       ├── google-oauth-token-schema.json
│   │       └── slack-api-schema.json
│   ├── helpers/                       # Test utilities
│   │   ├── mock-data.ts
│   │   ├── test-database.ts
│   │   ├── test-server.ts
│   │   ├── mock-oauth-server.ts
│   │   ├── stress-test-data.ts
│   │   ├── fixture-version-manager.ts
│   │   └── detection-metrics.ts
│   ├── setup.ts                       # Global test setup
│   └── env.ts                         # Test environment variables
├── src/
│   └── __tests__/                     # Co-located component tests
│       ├── services/
│       │   ├── google-api-client.test.ts
│       │   └── export.service.test.ts
│       └── routes/
│           └── automations-metadata-mapping.test.ts
└── jest.config.js
```

**Naming Conventions:**

```
Test Type          Extension                  Example
---------          ---------                  -------
Unit               .unit.test.ts              detection-engine.unit.test.ts
Integration        .integration.test.ts       slack-oauth.integration.test.ts
E2E                .e2e.test.ts               oauth-flows.e2e.test.ts
Performance        .perf.test.ts              stress-test.perf.test.ts
Security           .security.test.ts          jwt.security.test.ts
Component (src)    .test.ts                   google-api-client.test.ts
```

### 5.2 Jest Configuration Optimization

**Authority Level:** Jest Official Documentation

**Your Current Configuration is Good. Recommended Enhancements:**

```javascript
// backend/jest.config.js

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Separate test types for faster CI
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.unit.test.ts'],
      testEnvironment: 'node'
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.integration.test.ts'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup-integration.ts']
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/tests/e2e/**/*.e2e.test.ts'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup-e2e.ts'],
      testTimeout: 30000 // E2E tests need more time
    },
    {
      displayName: 'performance',
      testMatch: ['<rootDir>/tests/performance/**/*.perf.test.ts'],
      testEnvironment: 'node',
      testTimeout: 300000, // 5 minutes for stress tests
      maxWorkers: 1 // Run performance tests serially
    }
  ],

  // Parallel execution for speed
  maxWorkers: '50%',

  // Coverage
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Stricter for security-critical code
    './src/services/oauth/**/*.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    },
    './src/services/detection/**/*.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },

  // Module aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@fixtures/(.*)$': '<rootDir>/tests/fixtures/$1',
    '^@singura/shared-types$': '<rootDir>/../shared-types/src/index.ts'
  },

  // Cleanup
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Performance
  cacheDirectory: '<rootDir>/.jest-cache'
};
```

### 5.3 Test Data Management

**Authority Level:** Test Data Management Best Practices (Tricentis, BrowserStack)

**Fixture Loading Pattern:**

```typescript
// backend/tests/helpers/fixture-loader.ts

export class FixtureLoader {
  private static cache: Map<string, any> = new Map();

  /**
   * Load fixture with caching
   */
  static load<T>(path: string): T {
    if (this.cache.has(path)) {
      return this.cache.get(path);
    }

    const fixturePath = require.resolve(`../fixtures/${path}`);
    const data = require(fixturePath);

    this.cache.set(path, data);
    return data;
  }

  /**
   * Clear cache between test suites
   */
  static clearCache() {
    this.cache.clear();
  }
}

// Usage in tests
describe('Google Connector', () => {
  afterAll(() => {
    FixtureLoader.clearCache();
  });

  it('should parse user list response', () => {
    const fixture = FixtureLoader.load('oauth/google/v1.0/admin.users.list.json');

    const parsed = connector.parseUsers(fixture);

    expect(parsed).toHaveLength(fixture.users.length);
  });
});
```

### 5.4 CI/CD Integration

**Authority Level:** GitHub Actions Best Practices, Jest Documentation

```yaml
# .github/workflows/test.yml

name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - run: npm ci
      - run: npm run test:unit

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/unit/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5433:5432

      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      - run: npm ci
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      - run: npm ci
      - run: npm run test:e2e

  performance-tests:
    runs-on: ubuntu-latest
    # Only run on main branch or release tags
    if: github.ref == 'refs/heads/main' || startsWith(github.ref, 'refs/tags/')
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      - run: npm ci
      - run: npm run test:performance

      - name: Compare with baseline
        run: |
          node scripts/compare-performance-baseline.js
```

---

## 6. Key Recommendations Summary

### Must-Have Practices (Priority 1)

1. **Fixture Versioning:** Implement version-controlled fixtures for regression testing
2. **Detection Metrics:** Track precision, recall, F1 score in every test run
3. **Baseline Monitoring:** Establish performance baselines and detect drift
4. **Parallel Testing:** Use Jest projects for faster CI feedback
5. **OAuth Mocking:** Use mock OAuth servers for fast, isolated tests

### Recommended Practices (Priority 2)

6. **Contract Testing:** Validate against real API schemas
7. **Stress Testing:** Test with 10K+ automations regularly
8. **Rate Limit Testing:** Test exponential backoff and quota management
9. **False Negative Monitoring:** Critical for security - log missed threats
10. **Memory Profiling:** Profile detection engine under load

### Nice-to-Have Practices (Priority 3)

11. **Precision-Recall Curves:** Tune detection thresholds
12. **Confusion Matrix Visualization:** Debug classification errors
13. **Fixture Capture Tools:** Auto-generate fixtures from real API responses
14. **Performance Regression Tests:** Compare against baseline in CI
15. **Test Data Sanitization:** Auto-sanitize fixtures for security

---

## 7. Singura-Specific Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Implement fixture versioning system
- [ ] Create detection metrics tracking
- [ ] Set up baseline performance tests
- [ ] Add mock OAuth servers for Slack, Google, Microsoft

### Phase 2: Enhancement (Week 3-4)
- [ ] Build stress test datasets (10K+ automations)
- [ ] Implement false positive/negative tracking
- [ ] Add contract tests for OAuth APIs
- [ ] Create performance profiling tests

### Phase 3: Optimization (Week 5-6)
- [ ] Optimize parallel test execution
- [ ] Add precision-recall curve analysis
- [ ] Implement drift detection automation
- [ ] Create CI/CD performance comparison

---

## References

1. **Node.js Testing Best Practices:** github.com/goldbergyoni/nodejs-testing-best-practices (April 2025)
2. **Google ML Metrics:** developers.google.com/machine-learning/crash-course/classification
3. **OAuth Testing:** BrowserStack Guide to Mock API Authentication Testing
4. **Test Data Management:** Tricentis, TestRail, K2View Best Practices
5. **Performance Testing:** AppSignal, Stackify, Bocoup Node.js Performance Guides
6. **Jest Documentation:** jestjs.io/docs/configuration
7. **Rate Limiting:** OAuth.net, Auth0, Okta Documentation

---

## Appendix: Tools & Libraries

### Testing Frameworks
- **Jest:** Primary test runner (already in use)
- **ts-jest:** TypeScript preprocessor for Jest
- **Supertest:** HTTP assertion library for API testing

### Mocking & Fixtures
- **Nock:** HTTP request mocking for external APIs
- **MockServer:** Advanced mock server for OAuth flows
- **Faker.js:** Generate realistic test data

### Performance
- **AutoCannon:** HTTP benchmarking tool
- **clinic.js:** Node.js performance profiling
- **Benchmark.js:** Micro-benchmarking framework

### Metrics & Monitoring
- **Codecov:** Coverage reporting
- **Evidently AI:** ML model monitoring (for detection metrics)
- **Performance Hooks:** Built-in Node.js profiling

---

**Document Version:** 1.0.0
**Last Updated:** 2025-10-25
**Maintained By:** Singura Platform Team
**Review Frequency:** Quarterly
