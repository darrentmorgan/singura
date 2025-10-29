# Audit Logging

## MODIFIED Requirements

### Requirement: Audit Log Schema Compliance
The system SHALL ensure all audit log database operations use the correct schema as defined in migration `20250116_create_audit_logs.sql`. All INSERT and UPDATE operations MUST use the `timestamp` column for audit event timestamps and the `created_at` column for row creation timestamps.

#### Scenario: Audit log created successfully
- **WHEN** a user performs an auditable action (OAuth connection, login, discovery)
- **THEN** the system SHALL insert a record into `audit_logs` using the `timestamp` column
- **AND** the insertion SHALL succeed without database errors
- **AND** the `timestamp` field SHALL contain the audit event time
- **AND** the `created_at` field SHALL contain the row creation time (auto-generated)

#### Scenario: Database schema verified at startup
- **WHEN** the application starts
- **THEN** the system SHALL verify the `audit_logs` table exists
- **AND** the system SHALL verify the `timestamp` column exists
- **AND** the system SHALL verify required indexes exist (`idx_audit_logs_user_id`, `idx_audit_logs_timestamp`, `idx_audit_logs_org_id`)
- **AND** the system SHALL log verification results
- **AND** the system SHALL exit with error if critical schema mismatch detected

#### Scenario: Audit log query uses correct column names
- **WHEN** code executes an INSERT query on `audit_logs`
- **THEN** the query SHALL use `timestamp` for the audit event time
- **AND** the query SHALL NOT use `created_at` for the audit event time
- **AND** the query SHALL include all required columns: `user_id`, `organization_id`, `action`, `timestamp`

## ADDED Requirements

### Requirement: TypeScript Type Safety for Audit Logs
The system SHALL enforce audit log schema compliance at compile time using TypeScript interfaces from `@singura/shared-types`.

#### Scenario: TypeScript interface matches database schema
- **WHEN** an audit log entry is created in code
- **THEN** the code SHALL use the `AuditLogEntry` interface from `@singura/shared-types`
- **AND** the interface SHALL define `timestamp: Date` for audit event time
- **AND** the interface SHALL define `createdAt: Date` for row creation time
- **AND** TypeScript compilation SHALL fail if wrong column names are used

#### Scenario: Repository enforces type safety
- **WHEN** `AuditLogRepository.create()` is called
- **THEN** the method SHALL accept a parameter typed as `Omit<AuditLogEntry, 'id' | 'createdAt'>`
- **AND** the method SHALL map TypeScript property names to correct database column names
- **AND** the method SHALL return a typed `AuditLogEntry` object

### Requirement: Migration Verification at Startup
The system SHALL verify database schema matches expected state before accepting requests.

#### Scenario: Migration verification succeeds
- **WHEN** the application starts
- **THEN** the `MigrationVerifier.verifyAuditLogsSchema()` method SHALL run
- **AND** the method SHALL check if `audit_logs` table exists
- **AND** the method SHALL check if `timestamp` column exists
- **AND** the method SHALL log "audit_logs schema verified ✅" if all checks pass
- **AND** the application SHALL continue startup

#### Scenario: Migration verification fails
- **WHEN** the application starts
- **AND** the `audit_logs` table or `timestamp` column is missing
- **THEN** the `MigrationVerifier.verifyAuditLogsSchema()` method SHALL log an error
- **AND** the error message SHALL include which table or column is missing
- **AND** the error message SHALL provide the migration command to run
- **AND** the application SHALL prevent startup (fail fast)
