## Context

Singura's detection system consists of 11 implemented algorithms processing OAuth-connected platform data. Testing infrastructure is fragmented: unit tests exist for some detectors, integration tests cover API endpoints, but NO comprehensive validation of end-to-end detection accuracy, performance at scale, or baseline drift monitoring.

**Stakeholders**:
- Security team: Need confidence in detection accuracy (minimize false negatives)
- Product team: Need low false positive rate (maintain user trust)
- Engineering team: Need automated validation and performance regression detection

**Constraints**:
- Must not modify existing detection algorithm logic (only add instrumentation)
- Must maintain 100% OAuth/security test coverage
- Must complete in 6 weeks with single full-time engineer
- CI/CD test runtime must stay <10 minutes

## Goals / Non-Goals

**Goals**:
- Validate detection precision ≥85%, recall ≥90% against ground truth dataset
- Stress test processing of 10K automations (<30s, <512MB memory)
- E2E validation of OAuth → Discovery → Detection → Dashboard workflows
- Baseline drift detection alerting (5% precision drop = warning)
- CI/CD integration with parallel execution and coverage reporting

**Non-Goals**:
- NOT modifying detection algorithm logic (only adding metrics tracking)
- NOT creating new UI dashboards for metrics (command-line reporting sufficient)
- NOT implementing ML model retraining (baseline comparison only)
- NOT replacing existing test infrastructure (additive enhancements)

## Decisions

### Decision 1: Versioned Fixture Architecture
**Choice**: `tests/fixtures/{platform}/v{major}.{minor}/{scenario}.json` with fallback

**Rationale**:
- API responses change over time (Slack API v2 → v3, Google Workspace schema updates)
- Tests should remain stable even when fixture format evolves
- Fallback logic (`v1.1 → v1.0`) prevents test breakage

**Alternatives considered**:
- Single version directory (`fixtures/{platform}/`) - Rejected: No backward compatibility
- Git-based versioning (branches) - Rejected: Complex for non-Git workflows

**Implementation**:
```typescript
class FixtureVersionManager {
  loadFixture(platform: string, version: string, scenario: string): any {
    const exactPath = `fixtures/${platform}/v${version}/${scenario}.json`;
    if (exists(exactPath)) return load(exactPath);
    
    // Fallback to previous minor version
    const fallbackPath = `fixtures/${platform}/v${majorVersion(version)}.0/${scenario}.json`;
    return load(fallbackPath);
  }
}
```

### Decision 2: Ground Truth Labeling Strategy
**Choice**: 100 manually labeled automations (50 malicious, 50 legitimate) with multi-reviewer consensus

**Rationale**:
- 100 samples provides statistically significant precision/recall metrics
- 50/50 split prevents class imbalance bias
- Multi-reviewer consensus (2+ security engineers) ensures label quality

**Alternatives considered**:
- 1000+ labeled samples - Rejected: Excessive manual labor, diminishing returns
- Synthetic data only - Rejected: Doesn't capture real-world edge cases
- Single reviewer - Rejected: Introduces subjective bias

**Label format**:
```json
{
  "automation_id": "slack-bot-xyz",
  "platform": "slack",
  "ground_truth": "malicious",
  "confidence": 0.95,
  "reviewers": ["engineer1", "engineer2"],
  "rationale": "Excessive data exfiltration pattern detected"
}
```

### Decision 3: Stress Test Data Generation
**Choice**: Synthetic data generator with configurable distributions (80% benign, 15% suspicious, 5% malicious)

**Rationale**:
- 10K real automations expensive to collect and sanitize
- Synthetic data allows controlled testing of edge cases
- Distribution matches expected production ratios

**Alternatives considered**:
- Real production data - Rejected: Privacy concerns, hard to sanitize at scale
- Purely random data - Rejected: Doesn't represent realistic patterns

**Generator parameters**:
```typescript
interface StressTestConfig {
  totalAutomations: number;        // 10,000
  maliciousRatio: number;          // 0.05 (5%)
  suspiciousRatio: number;         // 0.15 (15%)
  platformDistribution: {          // Match production ratios
    slack: 0.40,
    google: 0.35,
    microsoft: 0.25
  };
  aiProviderDistribution: {        // 8 AI providers
    openai: 0.50,
    anthropic: 0.20,
    google: 0.15,
    // ... others
  };
}
```

### Decision 4: Mock OAuth Server Implementation
**Choice**: Express-based mock servers (one per platform) with token state management

**Rationale**:
- Enables E2E testing without hitting real OAuth endpoints
- Controlled environment for testing token expiry, refresh, revocation
- Fast test execution (<5 min for 10 E2E scenarios)

**Alternatives considered**:
- Record/replay (VCR pattern) - Rejected: Doesn't test error scenarios
- Stubbing HTTP calls - Rejected: Doesn't validate OAuth flow logic
- Using real OAuth (sandbox) - Rejected: Slow, rate limits, external dependency

**Mock server features**:
- Token generation with configurable expiry
- Refresh token rotation
- Scope validation
- Revocation endpoint
- Rate limiting simulation

### Decision 5: Baseline Drift Detection Thresholds
**Choice**: 5% precision drop = warning, 3% recall drop = critical

**Rationale**:
- Precision (false positives): 5% tolerance acceptable (user friction)
- Recall (false negatives): 3% tolerance critical (security risk)
- Asymmetric thresholds reflect security-first priority

**Alternatives considered**:
- Equal thresholds (5%/5%) - Rejected: Doesn't prioritize security
- Tighter thresholds (2%/2%) - Rejected: Too noisy, false alarms

**Alert routing**:
- Warning (5% precision drop) → Slack channel `#detection-monitoring`
- Critical (3% recall drop) → PagerDuty on-call engineer

## Risks / Trade-offs

### Risk 1: Ground Truth Label Quality
**Risk**: Subjective labeling introduces bias, affecting metrics reliability

**Mitigation**:
- Multi-reviewer consensus (2+ engineers)
- Regular label audits (quarterly)
- Inter-rater reliability scoring (Cohen's kappa ≥0.80)

### Risk 2: Synthetic Data Doesn't Match Production
**Risk**: Stress test results don't reflect real-world performance

**Mitigation**:
- Validate generator against 100 real production samples
- Periodically update distribution parameters based on prod metrics
- Run stress tests with BOTH synthetic AND real (sanitized) data

### Risk 3: CI/CD Runtime Exceeds 10 Minutes
**Risk**: Test suite slows down development cycle

**Mitigation**:
- Parallel execution (unit, integration, e2e in separate jobs)
- Selective test running (only run affected tests on non-main branches)
- Caching (fixtures, node_modules, compiled TypeScript)

### Risk 4: Test Flakiness in E2E Suite
**Risk**: Non-deterministic failures reduce confidence in CI/CD

**Mitigation**:
- 3x retry logic for flaky tests
- Flakiness detection (report tests that fail intermittently)
- Deterministic mock servers (no real network calls)

## Migration Plan

**Phase 1-3 (Weeks 1-4)**: Additive changes only, no impact on existing tests
**Phase 4 (Week 5)**: E2E tests run in parallel with existing tests
**Phase 5 (Week 6)**: Enhanced CI/CD replaces current workflow

**Rollback**:
- All changes behind feature flags (`ENABLE_DETECTION_METRICS=true`)
- Separate GitHub Actions workflow (can disable if issues)
- No changes to production detection logic

**Deployment**:
1. Merge Phase 1-3 (fixtures, metrics, stress tests)
2. Run Phase 4 E2E tests in CI/CD for 1 week (validation period)
3. Enable Phase 5 enhanced workflow after validation
4. Archive old workflow after 2 weeks of stability

## Open Questions

1. **Should we implement automated label generation using GPT-5?**
   - Pros: Scales to 1000+ labels quickly
   - Cons: Requires validation, may introduce AI bias
   - **Decision**: Start with 100 manual labels, consider GPT-5 for expansion later

2. **Should stress tests run on every PR or only on main?**
   - Pros (every PR): Catches performance regressions early
   - Cons (every PR): Adds 2-3 minutes to CI/CD runtime
   - **Decision**: Run on main + manual trigger for PRs

3. **Should we add real-time drift alerting or daily batch reports?**
   - Pros (real-time): Immediate detection of issues
   - Cons (real-time): Requires infrastructure (message queue, worker)
   - **Decision**: Start with daily batch reports, add real-time later if needed
