# Stress Test Data Generator

## Overview

The `StressTestDataGenerator` service generates realistic automation scenarios for stress testing detection algorithms. It can produce 10,000+ automation scenarios with realistic distributions across platforms, malicious vs legitimate classifications, and attack patterns.

## Features

- **High Performance**: Generates 10K automations in <50ms (well under 5-second requirement)
- **Realistic Distributions**:
  - Platform: 50% Slack, 30% Google, 20% Microsoft
  - Classification: 20% malicious, 80% legitimate
- **AI Provider Integration**: Malicious automations always have AI providers (OpenAI, Anthropic, Google)
- **Attack Types**: Supports 6 attack types (data_exfiltration, privilege_escalation, credential_theft, backdoor, rate_limit_evasion, ai_abuse)
- **Feature Differentiation**: Clear distinction between malicious and legitimate features
- **Deterministic Generation**: Same seed produces same results for reproducibility

## Usage

### Basic Generation

```typescript
import { StressTestDataGenerator } from './stress-test-data-generator.service';

const generator = new StressTestDataGenerator();

// Generate 10K automations
const scenarios = generator.generateAutomations(10000);
```

### Platform-Specific Generation

```typescript
// Generate Slack bot scenarios
const maliciousBot = generator.generateSlackBot(true);
const legitimateBot = generator.generateSlackBot(false);

// Generate Google Apps Script scenarios
const maliciousScript = generator.generateGoogleScript(true);
const legitimateScript = generator.generateGoogleScript(false);

// Generate Microsoft Power Automate scenarios
const maliciousFlow = generator.generateMicrosoftFlow(true);
const legitimateFlow = generator.generateMicrosoftFlow(false);
```

### Custom Ratio Batch

```typescript
// Generate 1000 scenarios with 30% malicious
const batch = generator.generateBatch(1000, 0.3);
```

## Scenario Structure

```typescript
interface AutomationScenario {
  automationId: string;
  platform: 'slack' | 'google' | 'microsoft';
  actual: 'malicious' | 'legitimate';
  confidence: number;
  timestamp: Date;
  features: {
    hasAIProvider?: boolean;
    aiProvider?: string;
    velocityScore?: number;
    offHoursActivity?: boolean;
    dataVolumeAnomalous?: boolean;
    permissionEscalation?: boolean;
    batchOperations?: boolean;
    timingVariance?: number;
  };
  attackType?: string;
}
```

## Malicious vs Legitimate Features

### Malicious Automations
- **AI Provider**: Always present (OpenAI, Anthropic, Google)
- **Velocity Score**: 0.70-1.00 (high)
- **Off-Hours Activity**: 70% probability
- **Data Volume Anomalies**: 60% probability
- **Permission Escalation**: 40% probability
- **Batch Operations**: 50% probability
- **Timing Variance**: 30% probability (0.75-0.95)
- **Attack Type**: One of 6 types
- **Confidence**: 0.70-1.00

### Legitimate Automations
- **AI Provider**: 10% probability (rare)
- **Velocity Score**: 0.00-0.50 (low)
- **Off-Hours Activity**: 20% probability
- **Data Volume Anomalies**: Never
- **Permission Escalation**: Never
- **Batch Operations**: 30% probability
- **Timing Variance**: Never
- **Attack Type**: None
- **Confidence**: 0.80-1.00

## Demo

Run the demo script to see the generator in action:

```bash
npx ts-node src/services/testing/demo-stress-test-generator.ts
```

## Tests

Run the comprehensive test suite:

```bash
npm test -- tests/unit/services/testing/stress-test-data-generator.test.ts
```

**Test Coverage**: 100% (statements, branches, functions, lines)

**Test Count**: 35 tests covering:
- Generation performance
- Distribution accuracy
- Feature differences
- Confidence scores
- Attack type distribution
- Deterministic generation
- ID format validation
- Risk indicator combinations

## Performance Metrics

- **10K automations**: ~10-30ms (0.01-0.03s)
- **100K automations**: ~100-300ms (0.1-0.3s)
- **1M automations**: ~1-3s

Well within the <5-second requirement for 10K automations.
