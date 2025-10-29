## ADDED Requirements

### Requirement: Velocity Detection
The system SHALL detect automations based on inhuman activity speed patterns, analyzing event frequency and timing to identify bots that perform actions faster than human operators.

#### Scenario: High-frequency bot detection
- **WHEN** an automation performs >100 actions/minute
- **THEN** the system SHALL flag it as high-velocity automation
- **AND** assign a confidence score ≥0.85

#### Scenario: Legitimate high-frequency activity
- **WHEN** a user performs <50 actions/minute consistently
- **THEN** the system SHALL NOT flag it as automation
- **AND** confidence score SHALL be <0.3

### Requirement: AI Provider Detection  
The system SHALL detect AI provider usage through multi-method pattern matching across 6 detection methods (URL patterns, API endpoints, request headers, response signatures, timing patterns, correlation signatures) for 8 AI providers (OpenAI, Anthropic, Google AI, Cohere, HuggingFace, Replicate, Mistral, Together AI).

#### Scenario: OpenAI API detection via URL pattern
- **WHEN** audit logs contain requests to `api.openai.com/v1/chat/completions`
- **THEN** the system SHALL detect OpenAI usage
- **AND** assign provider confidence ≥0.90

#### Scenario: Multiple AI provider correlation
- **WHEN** automation uses both OpenAI and Anthropic APIs
- **THEN** the system SHALL detect both providers
- **AND** flag as multi-provider AI automation

### Requirement: Batch Operation Detection
The system SHALL identify bulk automated actions by analyzing event clustering, parallelism, and timing uniformity to distinguish batch operations from normal user activity.

#### Scenario: Batch file operations
- **WHEN** >50 files are created/modified within 5-second window
- **THEN** the system SHALL detect batch operation
- **AND** confidence ≥0.80

### Requirement: Off-Hours Detection
The system SHALL analyze activity timing against business hours (9 AM - 6 PM local timezone) to identify automations running outside normal working hours.

#### Scenario: Weekend automation activity
- **WHEN** automation performs actions on Saturday/Sunday 2 AM
- **THEN** the system SHALL flag off-hours activity
- **AND** increase automation likelihood score by 0.20

### Requirement: Timing Variance Detection
The system SHALL detect throttled bot patterns by analyzing timing uniformity (low variance) and periodic patterns that indicate programmatic delays.

#### Scenario: Uniform timing pattern detection
- **WHEN** automation performs actions every 60 seconds (variance <2s) for 1 hour
- **THEN** the system SHALL detect throttled bot pattern
- **AND** confidence ≥0.75

### Requirement: Permission Escalation Detection
The system SHALL monitor OAuth scope changes and privilege increases over time to identify potential privilege creep or malicious permission expansion.

#### Scenario: Scope escalation over time
- **WHEN** OAuth app requests additional scopes (e.g., `admin.reports.audit.readonly` added after initial authorization)
- **THEN** the system SHALL flag permission escalation
- **AND** trigger security review workflow

### Requirement: Data Volume Detection
The system SHALL analyze data transfer patterns to identify potential data exfiltration through high-volume reads, downloads, or API calls exceeding normal thresholds.

#### Scenario: Bulk data export detection
- **WHEN** automation downloads >10GB of data in 1 hour
- **THEN** the system SHALL flag data exfiltration risk
- **AND** assign risk score ≥80/100

### Requirement: Cross-Platform Correlation
The system SHALL link related automations across multiple platforms (Slack, Google Workspace, Microsoft 365) based on shared identifiers, timing patterns, and behavioral signatures to detect coordinated automation campaigns.

#### Scenario: Same OAuth client across platforms
- **WHEN** OAuth client_id appears in both Slack and Google Workspace
- **THEN** the system SHALL correlate automations
- **AND** create cross-platform automation group

#### Scenario: Timing-based correlation
- **WHEN** Slack bot and Google Apps Script execute within 5 minutes with similar action patterns
- **THEN** the system SHALL detect potential correlation
- **AND** assign correlation confidence ≥0.70

### Requirement: Risk Assessment
The system SHALL calculate a 0-100 risk score for each automation based on permission scope, data access patterns, off-hours activity, and GDPR/compliance concerns.

#### Scenario: High-risk automation scoring
- **WHEN** automation has admin permissions + off-hours activity + data exfiltration pattern
- **THEN** the system SHALL assign risk score ≥80/100
- **AND** flag for immediate security review

#### Scenario: Low-risk automation scoring
- **WHEN** automation has read-only permissions + business hours activity + low data volume
- **THEN** the system SHALL assign risk score ≤30/100
- **AND** mark as low priority
