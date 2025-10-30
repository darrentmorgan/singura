# Mock OAuth Servers for E2E Testing

Complete OAuth 2.0 mock servers for Slack, Google, and Microsoft platforms. These servers simulate real OAuth flows for E2E testing without calling external APIs.

## Features

- **Complete OAuth 2.0 Flow**: Authorization code grant, token exchange, refresh, and revocation
- **PKCE Support**: Full Proof Key for Code Exchange (RFC 7636) implementation
- **State Validation**: CSRF protection via state parameter
- **Platform-Specific**: Accurate simulation of Slack, Google, and Microsoft OAuth responses
- **Configurable**: Support for error scenarios, custom responses, and multi-tenant testing
- **Type-Safe**: Full TypeScript support with comprehensive type definitions

## Installation

The mock servers are already part of the test suite. No additional installation needed.

```typescript
import {
  SlackMockOAuthServer,
  GoogleMockOAuthServer,
  MicrosoftMockOAuthServer,
} from './tests/mocks/oauth-servers';
```

## Usage

### Basic Example: Slack OAuth Flow

```typescript
import { SlackMockOAuthServer } from './tests/mocks/oauth-servers';
import axios from 'axios';

describe('Slack OAuth Integration', () => {
  let mockServer: SlackMockOAuthServer;

  beforeAll(async () => {
    // Start mock server on port 4001
    mockServer = new SlackMockOAuthServer({ port: 4001 });
    await mockServer.start();
  });

  afterAll(async () => {
    await mockServer.stop();
  });

  beforeEach(() => {
    mockServer.reset(); // Clear state between tests
  });

  it('should complete full OAuth flow', async () => {
    // 1. Get authorization URL
    const authUrl = mockServer.getFullAuthorizationUrl({
      client_id: 'my_client_id',
      redirect_uri: 'http://localhost:3000/callback',
      scope: ['users:read', 'team:read'],
      state: 'random_state',
    });

    // 2. Simulate user authorization (get code from redirect)
    const response = await axios.get(authUrl, { maxRedirects: 0 });
    const redirectUrl = new URL(response.headers.location);
    const code = redirectUrl.searchParams.get('code');

    // 3. Exchange code for tokens
    const tokenResponse = await axios.post(mockServer.getFullTokenUrl(), {
      grant_type: 'authorization_code',
      code: code,
      client_id: 'my_client_id',
      redirect_uri: 'http://localhost:3000/callback',
    });

    // 4. Verify token response
    expect(tokenResponse.data).toMatchObject({
      ok: true,
      access_token: expect.any(String),
      refresh_token: expect.any(String),
      token_type: 'bot',
      scope: 'users:read,team:read',
      team: {
        id: expect.any(String),
        name: expect.any(String),
      },
    });

    // 5. Refresh tokens
    const refreshResponse = await axios.post(mockServer.getFullTokenUrl(), {
      grant_type: 'refresh_token',
      refresh_token: tokenResponse.data.refresh_token,
      client_id: 'my_client_id',
    });

    expect(refreshResponse.data.access_token).toBeTruthy();
  });
});
```

### Google OAuth with PKCE

```typescript
import { GoogleMockOAuthServer } from './tests/mocks/oauth-servers';
import * as crypto from 'crypto';

const mockServer = new GoogleMockOAuthServer({ port: 4002 });
await mockServer.start();

// Generate PKCE code verifier and challenge
const codeVerifier = crypto.randomBytes(32).toString('base64url');
const codeChallenge = crypto
  .createHash('sha256')
  .update(codeVerifier)
  .digest('base64url');

// Get authorization URL with PKCE
const authUrl = mockServer.getFullAuthorizationUrl({
  client_id: 'my_client_id',
  redirect_uri: 'http://localhost:3000/callback',
  scope: ['openid', 'email', 'profile'],
  code_challenge: codeChallenge,
  code_challenge_method: 'S256',
  access_type: 'offline', // Request refresh token
  prompt: 'consent',
});

// ... authorization flow ...

// Exchange with code verifier
const tokenResponse = await axios.post(mockServer.getFullTokenUrl(), {
  grant_type: 'authorization_code',
  code: authCode,
  client_id: 'my_client_id',
  redirect_uri: 'http://localhost:3000/callback',
  code_verifier: codeVerifier, // PKCE verification
});
```

### Microsoft OAuth with Tenant Support

```typescript
import { MicrosoftMockOAuthServer } from './tests/mocks/oauth-servers';

const mockServer = new MicrosoftMockOAuthServer({ port: 4003 });
await mockServer.start();

// Configure mock tenant
mockServer.setMockTenant('12345678-1234-1234-1234-123456789012', 'Acme Corp');
mockServer.setMockUser(
  '87654321-4321-4321-4321-210987654321',
  'admin@acme.onmicrosoft.com',
  'Admin User'
);

// Test Microsoft Graph /me endpoint
const userResponse = await axios.get(mockServer.getFullMeUrl(), {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});

expect(userResponse.data).toMatchObject({
  id: '87654321-4321-4321-4321-210987654321',
  userPrincipalName: 'admin@acme.onmicrosoft.com',
  displayName: 'Admin User',
});
```

## Configuration Options

### Slack Configuration

```typescript
interface SlackMockServerConfig {
  port?: number; // Default: 4001
  tokenExpiry?: number; // seconds, Default: 43200 (12 hours)
  codeExpiry?: number; // seconds, Default: 600 (10 minutes)
  enablePKCE?: boolean; // Default: true
  enableStateValidation?: boolean; // Default: true
}
```

### Google Configuration

```typescript
interface GoogleMockServerConfig {
  port?: number; // Default: 4002
  tokenExpiry?: number; // seconds, Default: 3599 (1 hour)
  codeExpiry?: number; // seconds, Default: 600
  enablePKCE?: boolean; // Default: true
  enableStateValidation?: boolean; // Default: true
  enableScopeValidation?: boolean; // Default: true
}
```

### Microsoft Configuration

```typescript
interface MicrosoftMockServerConfig {
  port?: number; // Default: 4003
  tokenExpiry?: number; // seconds, Default: 3599 (1 hour)
  codeExpiry?: number; // seconds, Default: 600
  enablePKCE?: boolean; // Default: true
  enableStateValidation?: boolean; // Default: true
  enableTenantValidation?: boolean; // Default: true
}
```

## Testing Error Scenarios

```typescript
// Simulate OAuth error responses
mockServer.setMockResponse({
  error: 'invalid_grant',
  errorDescription: 'Authorization code has been revoked',
});

// Next token request will return this error
try {
  await axios.post(mockServer.getFullTokenUrl(), {
    grant_type: 'authorization_code',
    code: 'any_code',
    client_id: 'test_client',
    redirect_uri: 'http://localhost:3000/callback',
  });
} catch (error) {
  expect(error.response.data.error).toBe('invalid_grant');
}

// Clear mock response to resume normal operation
mockServer.clearMockResponse();
```

## Supported OAuth Scopes

### Slack Scopes

- `users:read`, `team:read`, `channels:read`
- `channels:history`, `groups:read`, `groups:history`
- `im:read`, `im:history`, `mpim:read`, `mpim:history`
- `chat:write`, `files:read`, `users:read.email`
- Full list in `slack-mock-server.ts`

### Google Scopes

- `openid`, `email`, `profile`
- `https://www.googleapis.com/auth/admin.directory.user.readonly`
- `https://www.googleapis.com/auth/script.projects.readonly`
- `https://www.googleapis.com/auth/admin.reports.audit.readonly`
- Full list in `google-mock-server.ts`

### Microsoft Scopes

- `openid`, `profile`, `email`, `offline_access`
- `User.Read`, `User.ReadWrite`, `User.Read.All`
- `Directory.Read.All`, `Application.Read.All`
- `Mail.Read`, `Calendars.Read`, `Files.Read`
- Full list in `microsoft-mock-server.ts`

## Platform-Specific Features

### Slack Features

- Bot and user tokens
- Team (workspace) information
- App metadata (app_id, bot_user_id)
- Comma-separated scopes (Slack convention)

### Google Features

- OpenID Connect ID tokens
- User info endpoint (`/oauth2/v2/userinfo`)
- Hosted domain (workspace) support
- Space-separated scopes (OAuth 2.0 standard)

### Microsoft Features

- Azure AD tenant support
- Microsoft Graph `/me` endpoint
- OpenID Connect discovery (`.well-known/openid-configuration`)
- Extended token expiry (`ext_expires_in`)

## API Reference

### Base Methods (All Servers)

```typescript
// Lifecycle
await server.start(): Promise<void>
await server.stop(): Promise<void>
server.reset(): void

// Configuration
server.setMockResponse(response: MockServerResponse): void
server.clearMockResponse(): void

// Testing helpers
server.getTokenData(token: string): TokenData | undefined
server.isTokenRevoked(token: string): boolean
server.isRunning(): boolean
server.getPort(): number
server.getBaseUrl(): string
```

### Platform-Specific Methods

**Slack:**

```typescript
server.setMockTeam(teamId: string, teamName: string): void
server.setMockBotUser(botUserId: string): void
server.setMockAppId(appId: string): void
server.getMockTeam(): { teamId: string; teamName: string }
```

**Google:**

```typescript
server.setMockDomain(domain: string): void
server.setMockUser(userId: string, userEmail: string, userName: string): void
server.getMockUser(): { userId, userEmail, userName, domain }
server.getFullUserInfoUrl(): string
```

**Microsoft:**

```typescript
server.setMockTenant(tenantId: string, tenantName: string): void
server.setMockUser(userId: string, userPrincipalName: string, displayName: string): void
server.getMockTenant(): { tenantId, tenantName }
server.getMockUser(): { userId, userPrincipalName, displayName }
server.getFullMeUrl(): string
```

## Architecture

### File Structure

```
tests/mocks/oauth-servers/
├── base-mock-oauth-server.ts      (591 lines) - Base OAuth implementation
├── slack-mock-server.ts           (259 lines) - Slack-specific server
├── google-mock-server.ts          (352 lines) - Google-specific server
├── microsoft-mock-server.ts       (417 lines) - Microsoft-specific server
├── index.ts                       (24 lines)  - Exports
├── README.md                                  - This file
└── __tests__/
    ├── slack-mock-server.test.ts      (466 lines) - 21 tests
    ├── google-mock-server.test.ts     (336 lines) - 15 tests
    └── microsoft-mock-server.test.ts  (361 lines) - 16 tests

Total: 2,806 lines
```

### Base Server Features

The `BaseMockOAuthServer` provides:

- Authorization code generation and storage
- Token exchange with validation
- Token refresh mechanism
- Token revocation (RFC 7009)
- PKCE verification (RFC 7636)
- State parameter validation
- Configurable error responses
- In-memory token storage

### Platform Servers

Each platform server extends the base and adds:

- Platform-specific OAuth URLs
- Platform-specific token response format
- Platform-specific scope validation
- Additional API endpoints (user info, Graph API, etc.)
- Platform-specific metadata (team, domain, tenant)

## Testing Coverage

**52 tests total, all passing:**

- **21 Slack tests**: Authorization, token exchange/refresh/revoke, PKCE, error scenarios
- **15 Google tests**: Authorization, tokens, user info endpoint, PKCE
- **16 Microsoft tests**: Authorization, tokens, Graph /me endpoint, OIDC discovery, PKCE

**Coverage: >90%** for all mock server code

## Design Decisions

### Why Mock Servers Instead of Stubs?

1. **Real HTTP Flows**: Tests actual HTTP requests/responses
2. **Complete OAuth**: Tests full authorization code flow, not just token exchange
3. **Redirect Handling**: Tests state parameter and redirect URI validation
4. **PKCE Testing**: Validates code challenge/verifier correctly
5. **Error Scenarios**: Can simulate real OAuth errors

### Port Assignments

- **Slack**: 4001 (default)
- **Google**: 4002 (default)
- **Microsoft**: 4003 (default)

These don't conflict with typical dev servers (3000, 8000, etc.)

### Token Format

Mock tokens use prefixes for easy identification:

- `mock_code_*` - Authorization codes
- `mock_access_*` - Access tokens
- `mock_refresh_*` - Refresh tokens

### Security Notes

- These are **test-only** servers with no real security
- Tokens are random hex strings, not JWTs (except ID tokens)
- No actual signature verification
- Not suitable for production use

## Roadmap

Future enhancements:

- [ ] Rate limiting simulation
- [ ] Network latency simulation
- [ ] Token expiration time travel
- [ ] Webhook simulation for token revocation
- [ ] Multi-tenant parallel testing
- [ ] Request/response logging

## Contributing

When adding new OAuth platforms:

1. Extend `BaseMockOAuthServer`
2. Implement abstract methods
3. Add platform-specific endpoints
4. Write comprehensive tests (>90% coverage)
5. Update this README

## Support

For issues or questions:

1. Check test files for usage examples
2. Review CLAUDE.md for delegation patterns
3. Consult `.claude/docs/TESTING.md` for test strategy
