## ADDED Requirements

### Requirement: Complete OAuth-to-Dashboard Workflow
The system SHALL validate end-to-end workflows from OAuth authorization through discovery, detection, and dashboard display for all 3 platforms (Slack, Google Workspace, Microsoft 365).

#### Scenario: Slack OAuth to detection workflow
- **WHEN** E2E test initiates Slack OAuth flow with mock server
- **THEN** test SHALL complete: authorization → token exchange → discovery → detection → dashboard update
- **AND** detected automation SHALL appear in dashboard within 5 seconds

#### Scenario: Google Workspace full workflow
- **WHEN** E2E test initiates Google OAuth with Apps Script permissions
- **THEN** test SHALL detect Apps Script automation
- **AND** calculate risk score
- **AND** display in dashboard with correct metadata

### Requirement: Cross-Platform Correlation E2E
The system SHALL validate that automations spanning multiple platforms are correctly correlated and grouped in end-to-end workflows.

#### Scenario: Multi-platform automation detection
- **WHEN** E2E test creates Slack bot + Google Apps Script with same OAuth client_id
- **THEN** system SHALL correlate both automations
- **AND** create automation group
- **AND** display grouped view in dashboard

### Requirement: Real-Time Update Validation
The system SHALL validate that detection updates are pushed to dashboard via WebSocket in real-time during E2E tests.

#### Scenario: WebSocket detection update
- **WHEN** new automation is detected during E2E test
- **THEN** WebSocket message SHALL be sent to connected clients within 2 seconds
- **AND** dashboard SHALL update without page refresh

### Requirement: False Positive Filtering E2E
The system SHALL validate that legitimate automations are NOT incorrectly flagged during end-to-end workflows.

#### Scenario: Legitimate automation workflow
- **WHEN** E2E test creates automation with read-only permissions + business hours activity
- **THEN** risk score SHALL be <30/100
- **AND** automation SHALL NOT trigger security alerts

### Requirement: OAuth Token Lifecycle E2E
The system SHALL validate OAuth token expiry, refresh, and revocation workflows end-to-end.

#### Scenario: Token expiry and refresh
- **WHEN** E2E test uses OAuth token with 1-minute expiry
- **THEN** system SHALL detect expiry
- **AND** automatically refresh token
- **AND** continue discovery without interruption

#### Scenario: Token revocation handling
- **WHEN** OAuth token is revoked during discovery
- **THEN** system SHALL detect revocation
- **AND** mark connection as inactive
- **AND** notify user via dashboard

### Requirement: Dashboard Data Accuracy
The system SHALL validate that all automation metadata, risk scores, and detection evidence are correctly displayed in the dashboard UI.

#### Scenario: Dashboard metadata validation
- **WHEN** E2E test detects automation with AI provider usage
- **THEN** dashboard SHALL display: automation name, platform, AI provider detected, risk score, detection timestamp
- **AND** ALL fields SHALL match backend data exactly

### Requirement: E2E Test Consistency
The system SHALL ensure all E2E tests pass with 100% consistency across 10 consecutive runs to eliminate flakiness.

#### Scenario: 10-run consistency check
- **WHEN** E2E test suite runs 10 times consecutively
- **THEN** ALL tests SHALL pass on ALL runs
- **AND** no intermittent failures SHALL occur
