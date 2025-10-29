## ADDED Requirements

### Requirement: Versioned Fixture Architecture
The system SHALL organize test fixtures in versioned directories (`tests/fixtures/{platform}/v{major}.{minor}/{scenario}.json`) with automatic fallback to previous versions.

#### Scenario: Fixture version fallback
- **WHEN** test requests `slack/v1.2/oauth-response.json` but only `v1.0` exists
- **THEN** system SHALL load `slack/v1.0/oauth-response.json`
- **AND** log fallback warning

### Requirement: Ground Truth Dataset
The system SHALL maintain a ground truth dataset of 100 manually labeled automations (50 malicious, 50 legitimate) for metrics validation.

#### Scenario: Ground truth label format
- **WHEN** ground truth entry is created
- **THEN** it SHALL contain {automation_id, platform, ground_truth, confidence, reviewers[], rationale}
- **AND** require ≥2 reviewer consensus

### Requirement: Stress Test Data Generation
The system SHALL generate synthetic test datasets up to 10K automations with configurable platform distribution, malicious ratio, and AI provider distribution.

#### Scenario: 10K automation generation
- **WHEN** stress test generator is invoked with totalAutomations=10000
- **THEN** system SHALL generate 10K unique automations
- **AND** match distribution: 80% benign, 15% suspicious, 5% malicious

#### Scenario: Platform distribution matching
- **WHEN** generator creates 10K automations
- **THEN** platform distribution SHALL be: Slack 40%, Google 35%, Microsoft 25%
- **AND** ALL platforms SHALL be represented

### Requirement: Performance Benchmarking
The system SHALL measure processing throughput, memory usage, and CPU utilization during stress tests and validate against performance targets.

#### Scenario: 10K automation processing time
- **WHEN** detection system processes 10K automations
- **THEN** total processing time SHALL be <30 seconds
- **AND** throughput SHALL be >300 automations/second

#### Scenario: Memory usage limit
- **WHEN** processing 10K automations
- **THEN** peak memory usage SHALL be <512MB
- **AND** no memory leaks SHALL be detected

### Requirement: Mock OAuth Servers
The system SHALL provide mock OAuth servers for Slack, Google Workspace, and Microsoft 365 with token generation, refresh, and revocation support.

#### Scenario: Mock token generation
- **WHEN** test requests OAuth token from mock server
- **THEN** server SHALL return valid JWT with configurable expiry
- **AND** token SHALL be statefully stored for validation

#### Scenario: Mock token refresh
- **WHEN** test sends refresh token to mock server
- **THEN** server SHALL return new access token
- **AND** rotate refresh token
- **AND** invalidate old refresh token

### Requirement: Concurrent Job Testing
The system SHALL support testing of 50+ concurrent discovery jobs without performance degradation or resource contention.

#### Scenario: 50 parallel discovery jobs
- **WHEN** 50 discovery jobs execute simultaneously
- **THEN** ALL jobs SHALL complete without errors
- **AND** no database deadlocks SHALL occur
- **AND** total execution time SHALL be <60 seconds
