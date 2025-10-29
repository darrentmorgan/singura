## Scaffolding Complete (Completed)

- [x] S.1 Create complete directory structure for all 5 phases (16 directories)
- [x] S.2 Create fixture directory structure (`tests/fixtures/{slack,google,microsoft}/v1.0/{oauth,audit-logs,edge-cases}/`)
- [x] S.3 Create 7 sample fixture files (Slack, Google, Microsoft OAuth + audit logs + ground truth)
- [x] S.4 Implement stub `FixtureVersionManager` class with method signatures
- [x] S.5 Implement stub `fixture-loader` utilities
- [x] S.6 Implement stub `DetectionMetricsService` class with 9 methods
- [x] S.7 Implement stub `BaselineManagerService` class with 6 methods
- [x] S.8 Implement stub `StressTestDataGenerator` class
- [x] S.9 Implement stub `performance-benchmarking` utilities
- [x] S.10 Create stress test skeleton (`process-10k-automations.test.ts`)
- [x] S.11 Create 3 mock OAuth servers (Slack, Google, Microsoft)
- [x] S.12 Create 4 E2E workflow test skeletons (backend)
- [x] S.13 Create frontend E2E test skeleton (`dashboard-validation.spec.ts`)
- [x] S.14 Create GitHub Actions workflow skeleton (`test-validation.yml`)
- [x] S.15 Validate TypeScript compilation (0 errors)

**Total Files Created**: 23 files
**Architecture Status**: ✅ Complete skeleton ready for incremental implementation
**TypeScript Status**: ✅ All files compile without errors

---

## Phase 1: Test Fixtures & Versioning (Week 1) 

- [ ] 1.1 Create fixture directory structure (`tests/fixtures/{slack,google,microsoft}/v1.0/{oauth,audit-logs,edge-cases}/`)
- [ ] 1.2 Capture and sanitize real Slack API responses (10 files: oauth tokens, user lists, bots, audit logs)
- [ ] 1.3 Capture and sanitize real Google Workspace API responses (10 files: Apps Script, service accounts, Drive automations, audit logs)
- [ ] 1.4 Capture and sanitize real Microsoft 365 API responses (10 files: Power Automate, Azure Apps, Teams apps, audit logs)
- [ ] 1.5 Implement `FixtureVersionManager` class with version fallback logic (`v1.1 → v1.0`)
- [ ] 1.6 Add fixture loading utilities (`loadFixture(platform, version, scenario)`)
- [ ] 1.7 Validate all fixtures against API schemas (JSON Schema validation)
- [ ] 1.8 Write unit tests for FixtureVersionManager (100% coverage)

## Phase 2: Detection Metrics & Baseline Monitoring (Week 2)

- [ ] 2.1 Create ground truth dataset (100 labeled automations: 50 malicious, 50 legitimate) in `tests/fixtures/ground-truth-dataset.json`
- [ ] 2.2 Implement `DetectionMetrics` class (`precision()`, `recall()`, `f1Score()`, `confusionMatrix()`)
- [ ] 2.3 Implement `BaselineManager` class (`recordBaseline()`, `compareToBaseline()`, `detectDrift()`)
- [ ] 2.4 Add metrics tracking hooks to all 11 detector services (emit events)
- [ ] 2.5 Create precision-recall curve generator for visualization
- [ ] 2.6 Add false positive/false negative tracking system
- [ ] 2.7 Run detection suite against ground truth, validate precision ≥85%, recall ≥90%
- [ ] 2.8 Write unit tests for DetectionMetrics and BaselineManager (100% coverage)
- [ ] 2.9 Set up drift alert thresholds (5% precision drop = warning, 3% recall drop = critical)

## Phase 3: Stress Testing & Performance (Weeks 3-4)

- [ ] 3.1 Implement `StressTestDataGenerator` class (generate 10K automation scenarios)
- [ ] 3.2 Create performance benchmarking utilities (measure throughput, memory, CPU)
- [ ] 3.3 Write stress test suite: Process 10K automations and validate <30s processing time
- [ ] 3.4 Write stress test suite: Validate memory usage <512MB
- [ ] 3.5 Write stress test suite: Validate throughput >300 automations/sec
- [ ] 3.6 Create concurrent discovery job test (50+ parallel jobs)
- [ ] 3.7 Add database query optimization tests (all queries <100ms)
- [ ] 3.8 Run 1-hour stress test, validate no memory leaks
- [ ] 3.9 Test graceful degradation under load (rate limiting, backpressure)
- [ ] 3.10 Document performance optimization recommendations based on profiling

## Phase 4: End-to-End Testing (Week 5)

- [ ] 4.1 Implement `MockOAuthServer` for Slack (token exchange, refresh, revocation)
- [ ] 4.2 Implement `MockOAuthServer` for Google Workspace (token exchange, refresh, revocation)
- [ ] 4.3 Implement `MockOAuthServer` for Microsoft 365 (token exchange, refresh, revocation)
- [ ] 4.4 Write E2E test: Slack OAuth → Discovery → Detection → Dashboard (bot with OpenAI)
- [ ] 4.5 Write E2E test: Google OAuth → Discovery → Detection → Dashboard (Apps Script)
- [ ] 4.6 Write E2E test: Microsoft OAuth → Discovery → Detection → Dashboard (Power Automate)
- [ ] 4.7 Write E2E test: Cross-platform correlation detection (same automation across 2 platforms)
- [ ] 4.8 Write E2E test: False positive filtering (legitimate automation not flagged)
- [ ] 4.9 Write E2E test: Real-time detection updates via WebSocket
- [ ] 4.10 Write E2E test: Risk score evolution over time
- [ ] 4.11 Write E2E test: ML baseline learning after 100 automations
- [ ] 4.12 Write E2E test: GPT-5 validation override (manual review)
- [ ] 4.13 Write E2E test: OAuth token expiry and refresh flow
- [ ] 4.14 Add Playwright tests for dashboard data accuracy
- [ ] 4.15 Ensure all 10 E2E scenarios pass with 100% consistency (10 runs each)

## Phase 5: CI/CD Integration (Week 6)

- [ ] 5.1 Create enhanced GitHub Actions workflow file (`.github/workflows/test-validation.yml`)
- [ ] 5.2 Add PostgreSQL and Redis service containers to workflow
- [ ] 5.3 Configure parallel test execution (unit, integration, e2e in separate jobs)
- [ ] 5.4 Integrate Codecov for PR coverage reporting
- [ ] 5.5 Add performance regression detection (compare to baseline, fail if >10% slower)
- [ ] 5.6 Set up automated drift alert system (Slack webhook notifications)
- [ ] 5.7 Configure test result artifacts (upload reports, screenshots on failure)
- [ ] 5.8 Optimize test parallelization to achieve <10 minute total runtime
- [ ] 5.9 Add test flakiness detection (retry 3x, report flaky tests)
- [ ] 5.10 Document CI/CD workflow and troubleshooting guide

## Validation & Documentation

- [ ] V.1 Run `openspec validate add-comprehensive-testing-suite --strict` and resolve all issues
- [ ] V.2 Ensure test suite passes with ≥80% overall coverage, 100% OAuth/security coverage
- [ ] V.3 Validate detection metrics: Precision ≥85%, Recall ≥90%, F1 ≥87%
- [ ] V.4 Confirm performance targets met: <30s processing, <512MB memory, >300/sec throughput
- [ ] V.5 Run all E2E scenarios 10x each, confirm 100% pass rate (no flakiness)
- [ ] V.6 Update CLAUDE.md with testing best practices
- [ ] V.7 Create `.claude/docs/TESTING_AUTOMATION_DETECTION_BEST_PRACTICES.md` (already exists, enhance)
- [ ] V.8 Add testing guide to main README.md
