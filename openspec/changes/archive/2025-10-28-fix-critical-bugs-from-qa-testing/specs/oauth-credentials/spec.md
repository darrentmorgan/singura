# OAuth Credentials

## MODIFIED Requirements

### Requirement: OAuth Credential Retrieval
The system SHALL reliably retrieve OAuth credentials for all platforms (Slack, Google Workspace, Microsoft 365) using the same connection ID that was used during storage. The system SHALL handle token expiration automatically.

#### Scenario: Valid credentials retrieved successfully
- **WHEN** `OAuthCredentialStorageService.getCredentials(connectionId)` is called
- **AND** credentials exist for the connection ID
- **AND** credentials are not expired
- **THEN** the method SHALL return the decrypted `OAuthCredentials` object
- **AND** the method SHALL log "Successfully retrieved credentials for: {connectionId}, platform: {platform} ✅"

#### Scenario: Credentials not found
- **WHEN** `OAuthCredentialStorageService.getCredentials(connectionId)` is called
- **AND** no credentials exist for the connection ID
- **THEN** the method SHALL return `null`
- **AND** the method SHALL log "No credentials found for connection: {connectionId} ❌"

#### Scenario: Discovery uses same connection ID for credential lookup
- **WHEN** `DiscoveryService.discoverAutomations(connectionId)` is called
- **THEN** the method SHALL retrieve connection metadata using the same `connectionId`
- **AND** the method SHALL retrieve OAuth credentials using the same `connectionId`
- **AND** the method SHALL log both connection ID references for debugging
- **AND** if credentials are not found, the method SHALL throw an error with the connection ID

## ADDED Requirements

### Requirement: Automatic Token Refresh
The system SHALL automatically refresh expired OAuth tokens without requiring user intervention.

#### Scenario: Expired token refreshed automatically
- **WHEN** `OAuthCredentialStorageService.getValidCredentials(connectionId)` is called
- **AND** credentials exist but are expired (expiresAt <= now + 5 minutes)
- **THEN** the system SHALL call the platform-specific refresh method
- **AND** if refresh succeeds, the system SHALL store the refreshed credentials
- **AND** the system SHALL log "Token refreshed successfully for: {connectionId} ✅"
- **AND** the system SHALL return the refreshed credentials

#### Scenario: Token refresh fails
- **WHEN** `OAuthCredentialStorageService.getValidCredentials(connectionId)` is called
- **AND** credentials are expired
- **AND** token refresh fails (invalid refresh token or network error)
- **THEN** the system SHALL log "Token refresh failed for: {connectionId} ❌"
- **AND** the system SHALL return `null`
- **AND** the user SHALL be prompted to re-authenticate

#### Scenario: Non-expired token returned immediately
- **WHEN** `OAuthCredentialStorageService.getValidCredentials(connectionId)` is called
- **AND** credentials exist and are not expired
- **THEN** the system SHALL return the credentials immediately without refreshing
- **AND** the system SHALL log "Token valid for connection: {connectionId} ✅"

### Requirement: Token Expiration Detection
The system SHALL accurately detect when OAuth tokens are expired or about to expire.

#### Scenario: Token expiration checked with buffer
- **WHEN** `OAuthCredentialStorageService.isExpired(credentials)` is called
- **AND** credentials have an `expiresAt` timestamp
- **THEN** the method SHALL return `true` if `expiresAt` <= (now + 5 minutes)
- **AND** the method SHALL return `false` if `expiresAt` > (now + 5 minutes)
- **AND** the 5-minute buffer SHALL prevent refresh failures due to clock skew

#### Scenario: Token without expiration assumed valid
- **WHEN** `OAuthCredentialStorageService.isExpired(credentials)` is called
- **AND** credentials do not have an `expiresAt` timestamp
- **THEN** the method SHALL return `false` (assume valid)

### Requirement: Platform-Specific Token Refresh
The system SHALL implement token refresh for each OAuth platform following their specific protocols.

#### Scenario: Google Workspace token refresh
- **WHEN** `OAuthCredentialStorageService.refreshGoogleToken(credentials)` is called
- **AND** credentials contain a valid refresh token
- **THEN** the system SHALL use `googleapis.auth.OAuth2Client` to refresh the token
- **AND** the system SHALL extract the new access token and expiration
- **AND** the system SHALL return updated credentials with new access token
- **AND** the refresh token SHALL be preserved if not rotated by Google

#### Scenario: Slack token refresh
- **WHEN** `OAuthCredentialStorageService.refreshSlackToken(credentials)` is called
- **AND** credentials contain a valid refresh token
- **THEN** the system SHALL call `https://slack.com/api/oauth.v2.access` with refresh_token grant
- **AND** the system SHALL extract the new access token and expiration
- **AND** the system SHALL return updated credentials with new access token

#### Scenario: Microsoft 365 token refresh
- **WHEN** `OAuthCredentialStorageService.refreshMicrosoftToken(credentials)` is called
- **AND** credentials contain a valid refresh token
- **THEN** the system SHALL call the Microsoft token endpoint with refresh_token grant
- **AND** the system SHALL extract the new access token and expiration
- **AND** the system SHALL return updated credentials with new access token

### Requirement: Debug Logging for OAuth Operations
The system SHALL provide detailed logging for OAuth credential operations without exposing sensitive tokens.

#### Scenario: Storage operation logged safely
- **WHEN** `OAuthCredentialStorageService.storeCredentials(connectionId, credentials)` is called
- **THEN** the system SHALL log "Storing credentials for connection: {connectionId}, platform: {platform}"
- **AND** the log SHALL include connection ID and platform name
- **AND** the log SHALL NOT include access tokens or refresh tokens
- **AND** after successful storage, the system SHALL log "Successfully stored credentials for: {connectionId} ✅"

#### Scenario: Retrieval operation logged safely
- **WHEN** `OAuthCredentialStorageService.getCredentials(connectionId)` is called
- **THEN** the system SHALL log "Retrieving credentials for connection: {connectionId}"
- **AND** if found, the system SHALL log "Successfully retrieved credentials for: {connectionId}, platform: {platform} ✅"
- **AND** if not found, the system SHALL log "No credentials found for connection: {connectionId} ❌"
- **AND** the log SHALL NOT include tokens

#### Scenario: Encryption validated during storage
- **WHEN** `OAuthCredentialStorageService.storeCredentials(connectionId, credentials)` is called
- **THEN** the system SHALL encrypt the access token
- **AND** the system SHALL immediately decrypt the encrypted token
- **AND** the system SHALL verify decrypted token matches original
- **AND** if validation fails, the system SHALL throw an error "Encryption validation failed"
