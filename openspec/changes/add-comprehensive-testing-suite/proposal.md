## Why

Singura claims to detect unauthorized AI automations across 3 platforms (Slack, Google Workspace, Microsoft 365) using 11 specialized detection algorithms. **Critical gap**: No comprehensive validation infrastructure exists to prove these claims work at enterprise scale.

Without stress testing, precision/recall tracking, and E2E validation, we risk:
- **Security failures**: Undetected threats (low recall)
- **User trust erosion**: False positives degrading confidence  
- **MVP credibility issues**: Can't back detection claims with data
- **Performance degradation**: Unknown behavior at 10K+ automations

GitHub Issue #19 provides the comprehensive 6-week, 5-phase implementation plan to validate our 4-layer detection system works as advertised.

## What Changes

### Capability 1: Automation Detection (NEW SPEC)
Document the existing 11 detection algorithms that are implemented but not specified:
1. Velocity Detection - Inhuman activity speed patterns
2. AI Provider Detection - Multi-method pattern matching (6 methods) for 8 AI providers
3. Batch Operation Detection - Bulk automated action identification
4. Off-Hours Detection - Business hours analysis
5. Timing Variance Detection - Throttled bot pattern recognition
6. Permission Escalation Detection - Privilege creep monitoring
7. Data Volume Detection - Data exfiltration pattern analysis
8. ML Behavioral Analysis - Anomaly detection
9. GPT-5 Validation - AI-powered threat assessment
10. Cross-Platform Correlation - Related automation detection across platforms
11. Risk Assessment - 0-100 scoring with GDPR/compliance concerns

**Files**: 
- `backend/src/services/detection/detection-engine.service.ts` (orchestrator)
- `backend/src/services/detection/*-detector.service.ts` (11 individual detectors)

### Capability 2: Detection Metrics (NEW SPEC)
Add precision/recall tracking, baseline monitoring, and drift detection:
- **DetectionMetrics class**: Calculate precision (≥85%), recall (≥90%), F1 score (≥87%), confusion matrix
- **BaselineManager**: Track algorithm performance over time, alert on 5% precision drop or 3% recall drop
- **Ground truth dataset**: 100 labeled automations (50 malicious, 50 legitimate)
- **False positive/negative tracking**: Monitor and report misclassifications

**New files**:
- `backend/src/services/detection/detection-metrics.service.ts`
- `backend/src/services/detection/baseline-manager.service.ts`
- `backend/tests/fixtures/ground-truth-dataset.json`

### Capability 3: Test Infrastructure (NEW SPEC)
Versioned fixtures, stress testing, and performance benchmarks:
- **Fixture versioning**: `tests/fixtures/{platform}/{version}/{scenario}.json` with fallback support
- **Stress test generator**: 10K automation scenarios with performance profiling
- **Performance targets**: Process 10K automations <30s, memory <512MB, throughput >300/sec
- **Mock OAuth servers**: Slack, Google, Microsoft for E2E testing

**New directories**:
- `backend/tests/fixtures/{slack,google,microsoft}/v1.0/`
- `backend/tests/stress/`
- `backend/tests/mocks/oauth-servers/`

### Capability 4: E2E Validation (NEW SPEC)
Complete user workflow testing from OAuth to dashboard:
- **10 critical E2E scenarios**: OAuth → Discovery → Detection → Dashboard for all platforms
- **Cross-platform correlation E2E**: Validate multi-platform automation detection
- **Real-time update validation**: Confirm WebSocket detection updates work correctly
- **Browser automation**: Playwright tests for dashboard accuracy

**New files**:
- `backend/tests/e2e/complete-workflows/*.test.ts` (10 scenarios)
- `frontend/e2e/dashboard-validation.spec.ts`

### Implementation Phases
This change follows GitHub Issue #19's 5-phase structure:
1. **Phase 1**: Test Fixtures & Versioning (Week 1)
2. **Phase 2**: Detection Metrics & Baseline Monitoring (Week 2)
3. **Phase 3**: Stress Testing & Performance (Weeks 3-4)
4. **Phase 4**: End-to-End Testing (Week 5)
5. **Phase 5**: CI/CD Integration (Week 6)

## Impact

**Affected specs**:
- `automation-detection` (NEW) - Documents 11 existing algorithms
- `detection-metrics` (NEW) - Precision/recall tracking & baseline monitoring
- `test-infrastructure` (NEW) - Fixtures, stress tests, performance benchmarks
- `e2e-validation` (NEW) - Complete workflow testing

**Affected code**:
- `backend/src/services/detection/*.service.ts` - No changes to algorithm logic, only adding metrics tracking hooks
- `backend/tests/` - Extensive new test infrastructure across unit/integration/e2e/stress/fixtures
- `.github/workflows/test-validation.yml` - Enhanced CI/CD with parallel execution, coverage reporting, performance regression detection

**Dependencies**:
- Jest (existing) - Testing framework
- Playwright (new) - Browser automation for E2E tests
- Codecov (new) - Coverage reporting for PRs

**Breaking changes**: None - This is additive testing infrastructure

**Resource requirements**: 240 hours (6 weeks, 1 engineer full-time)

**Success metrics**:
- ✅ Detection precision ≥85%
- ✅ Detection recall ≥90%
- ✅ F1 score ≥87%
- ✅ Process 10K automations <30s
- ✅ Memory usage <512MB
- ✅ Test suite <10 minutes (CI/CD)
- ✅ 100% OAuth/security test coverage (maintained)
- ✅ 80%+ overall test coverage (maintained)
