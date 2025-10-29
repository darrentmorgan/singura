# Testing Best Practices - Quick Reference

## Test Type Decision Tree

```
Is it testing a single function/class in isolation?
├─ YES → Unit Test (tests/unit/)
└─ NO
   └─ Is it testing multiple components together?
      ├─ YES → Integration Test (tests/integration/)
      └─ NO
         └─ Is it testing the full system end-to-end?
            ├─ YES → E2E Test (tests/e2e/)
            └─ NO
               └─ Is it testing performance/scale?
                  └─ YES → Performance Test (tests/performance/)
```

## Naming Conventions

```typescript
// File naming
detection-engine.unit.test.ts        // Unit test
slack-oauth.integration.test.ts      // Integration test
oauth-flows.e2e.test.ts              // E2E test
stress-test.perf.test.ts             // Performance test
jwt.security.test.ts                 // Security test

// Test descriptions
describe('DetectionEngine', () => {
  describe('#classify', () => {
    it('should classify high-risk scripts as automations', async () => {
      // Test implementation
    });
  });
});
```

## Essential Test Patterns

### 1. AAA Pattern (Arrange, Act, Assert)

```typescript
it('should detect Google Apps Script as automation', async () => {
  // ARRANGE - Set up test data
  const script = MockDataGenerator.createMockGoogleAppsScriptProject({
    riskScore: 95,
    permissions: [{ scope: 'admin.directory.user', riskLevel: 'critical' }]
  });

  // ACT - Execute the operation
  const result = await detectionEngine.classify(script);

  // ASSERT - Verify expectations
  expect(result.isAutomation).toBe(true);
  expect(result.confidence).toBeGreaterThan(0.85);
});
```

### 2. Fixture Loading

```typescript
// Load versioned fixture
const fixture = MockDataGenerator.loadFixture<GoogleUserResponse>(
  'google',
  'admin.users.list',
  'v1.0'
);

// Generate mock data
const mockOrg = MockDataGenerator.createMockOrganization();
const mockConnection = MockDataGenerator.createMockPlatformConnection(mockOrg.id);
```

### 3. Detection Metrics Testing

```typescript
// Calculate metrics
const metrics = DetectionMetrics.calculateMetrics(results);

// Assert minimum thresholds
expect(metrics.precision).toBeGreaterThanOrEqual(0.85);  // 85% precision
expect(metrics.recall).toBeGreaterThanOrEqual(0.90);     // 90% recall
expect(metrics.f1Score).toBeGreaterThanOrEqual(0.87);    // 87% F1
```

### 4. OAuth Connector Testing

```typescript
// Mock OAuth server
const mockServer = new MockOAuthServer({
  platform: 'google',
  baseUrl: 'http://localhost:9999'
});
mockServer.start();

mockServer.mockTokenExchange({
  access_token: 'ya29.mock_token',
  expires_in: 3599
});

// Test connector
const connector = new GoogleConnector({
  oauthBaseUrl: mockServer.baseUrl
});

await connector.exchangeCode('mock_code');

mockServer.stop();
```

### 5. Rate Limiting Testing

```typescript
it('should implement exponential backoff on 429', async () => {
  mockServer.mockRateLimitSequence([
    { retryAfter: 1 },
    { retryAfter: 2 },
    { retryAfter: 4 },
    { success: true }
  ]);

  const startTime = Date.now();
  await connector.listUsers();
  const duration = Date.now() - startTime;

  // Should wait ~7 seconds (1+2+4)
  expect(duration).toBeGreaterThan(7000);
});
```

## Detection Metrics Cheat Sheet

```
Metric      Formula                  Singura Target   Use Case
------      -------                  --------------   --------
Precision   TP/(TP+FP)              85%+             Avoid false alarms
Recall      TP/(TP+FN)              90%+             Catch all threats (critical)
F1 Score    2×(P×R)/(P+R)           87%+             Balanced performance
Accuracy    (TP+TN)/Total           N/A              Misleading for imbalanced data
FDR         FP/(FP+TP)              <15%             False discovery rate

TP = True Positives  (Correctly identified automations)
FP = False Positives (Legitimate tools flagged as automations)
TN = True Negatives  (Correctly identified legitimate tools)
FN = False Negatives (Missed automations - CRITICAL TO MINIMIZE)
```

## Common Test Scenarios

### False Positives (Should NOT Flag)
```typescript
const legitimateTools = [
  'Zapier Official Integration',
  'Power Automate Enterprise',
  'Salesforce Integration',
  'GitHub Actions (Company-Approved)'
];

for (const tool of legitimateTools) {
  const result = await detectionEngine.classify(tool);
  expect(result.isAutomation).toBe(false);
}
```

### False Negatives (MUST Detect)
```typescript
const securityThreats = [
  'Shadow IT Google Apps Script',
  'Unauthorized Service Account',
  'Rogue OAuth App',
  'Unmanaged Automation'
];

for (const threat of securityThreats) {
  const result = await detectionEngine.classify(threat);
  expect(result.isAutomation).toBe(true);
  expect(result.confidence).toBeGreaterThan(0.7);
}
```

## Stress Testing Checklist

```typescript
// Generate large datasets
const dataset = StressTestDataGenerator.generateLargeDataset({
  organizations: 100,
  connectionsPerOrg: 10,
  automationsPerConnection: 10  // = 10,000 automations
});

// Performance targets
expect(duration).toBeLessThan(30000);        // < 30 seconds for 10K
expect(memoryIncreaseMB).toBeLessThan(512);  // < 512MB memory
expect(throughput).toBeGreaterThan(300);     // > 300 automations/sec
```

## Jest Commands

```bash
# Run all tests
npm test

# Run specific test type
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:performance

# Run with coverage
npm test -- --coverage

# Run specific file
npm test -- detection-engine.unit.test.ts

# Run in watch mode
npm test -- --watch

# Run with debugging
node --inspect-brk node_modules/.bin/jest --runInBand
```

## CI/CD Test Strategy

```yaml
1. On every commit (fast feedback):
   - Unit tests (~5 mins)
   - Linting + type checking

2. On pull requests:
   - Unit tests
   - Integration tests (~10 mins)
   - E2E tests (~15 mins)
   - Coverage report

3. On main branch:
   - All tests
   - Performance tests (~30 mins)
   - Baseline comparison
   - Deploy to staging

4. Nightly:
   - Full stress tests
   - Drift detection
   - Baseline updates
```

## Coverage Thresholds

```javascript
// Global
global: {
  branches: 80,
  functions: 80,
  lines: 80,
  statements: 80
}

// Security-critical (OAuth, encryption)
'./src/services/oauth/**/*.ts': {
  branches: 100,
  functions: 100,
  lines: 100,
  statements: 100
}

// Detection algorithms
'./src/services/detection/**/*.ts': {
  branches: 90,
  functions: 90,
  lines: 90,
  statements: 90
}
```

## Test Data Organization

```
tests/fixtures/
├── oauth/
│   ├── slack/v1.0/
│   │   ├── users.list.json
│   │   ├── team.info.json
│   │   └── error-responses/
│   ├── google/v1.0/
│   │   ├── admin.users.list.json
│   │   ├── scripts.list.json
│   │   └── scenarios/
│   │       ├── workspace-admin.json
│   │       ├── high-risk-script.json
│   │       └── personal-account.json
│   └── microsoft/v1.0/
├── detection-scenarios/
│   ├── false-positives.json
│   ├── false-negatives.json
│   └── edge-cases.json
└── baselines/
    └── detection-baseline.json
```

## Debugging Tips

```typescript
// Log detection decisions
if (!result.isAutomation && expectedAutomation) {
  console.error('FALSE NEGATIVE DETECTED:', {
    automation: data.name,
    expected: true,
    actual: false,
    confidence: result.confidence,
    factors: result.factors
  });
}

// Profile performance
performance.mark('detection-start');
await detectionEngine.classify(data);
performance.mark('detection-end');
performance.measure('detection', 'detection-start', 'detection-end');

// Memory snapshots
const initialMemory = process.memoryUsage().heapUsed;
// ... run test
const finalMemory = process.memoryUsage().heapUsed;
console.log(`Memory delta: ${(finalMemory - initialMemory) / 1024 / 1024} MB`);
```

## Anti-Patterns to Avoid

```typescript
// ❌ BAD - Over-mocking
const mockUser = {
  id: '123',
  name: 'test',
  email: 'test@example.com',
  // ... 50 more fields you don't test
};

// ✅ GOOD - Minimal mocking
const mockUser = {
  id: '123',
  name: 'test'
  // Only fields the test validates
};

// ❌ BAD - Tight coupling to implementation
expect(spy).toHaveBeenCalledTimes(3);

// ✅ GOOD - Test outcomes, not implementation
expect(result.users).toHaveLength(3);

// ❌ BAD - Shared mutable state
let sharedOrg;
beforeAll(() => { sharedOrg = createMockOrg(); });

// ✅ GOOD - Isolated test data
beforeEach(() => {
  org = createMockOrg(); // Fresh data per test
});
```

## Quick Decision Guide

**When to write a test:**
- Always (for new code)
- Before fixing bugs (TDD)
- When adding features

**Which type of test:**
- Testing single function? → Unit
- Testing API endpoint? → Integration
- Testing full workflow? → E2E
- Testing performance? → Stress test

**When to use fixtures:**
- OAuth API responses
- Known edge cases
- Regression scenarios
- Baseline comparisons

**When to generate mock data:**
- Stress testing
- Property-based testing
- Randomized scenarios

---

**For detailed information, see:** `/Users/darrenmorgan/AI_Projects/singura/.claude/docs/TESTING_AUTOMATION_DETECTION_BEST_PRACTICES.md`
