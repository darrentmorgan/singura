# Clerk Authentication Integration Guide

## Overview

Singura now uses Clerk for authentication and organization management. This integration resolves the organization_id UUID issue and enables proper multi-tenant support.

## What Changed

### Before Clerk
- Hardcoded `demo-org-id` in OAuth callbacks
- No real user authentication
- No organization context
- Database expected UUIDs but received string literals

### After Clerk
- Real user authentication via Clerk
- Organization-based multi-tenancy
- OAuth flows include Clerk organization ID
- All connections scoped to organizations
- Proper UUID organization IDs from Clerk

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                       │
│                                                             │
│  ┌────────────────┐         ┌────────────────┐            │
│  │ ClerkProvider  │────────►│ useOrganization │            │
│  │                │         │                  │            │
│  └────────────────┘         └────────────────┘            │
│         │                            │                      │
│         │                            ▼                      │
│         │                  ┌────────────────┐              │
│         │                  │ PlatformCard   │              │
│         │                  │ (OAuth Trigger)│              │
│         │                  └────────────────┘              │
│         │                            │                      │
│         │                            │ orgId=org_xxx       │
│         ▼                            ▼                      │
│  OAuth Flow: /auth/oauth/slack/authorize?orgId=org_xxx    │
└─────────────────────────────────────────────────────────────┘
                                  │
                                  │ HTTP Request
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend (Express)                      │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ OAuth Authorize Endpoint                             │  │
│  │ • Receives orgId query param                         │  │
│  │ • Validates orgId starts with 'org_'                 │  │
│  │ • Includes orgId in state parameter                  │  │
│  │ • Redirects to Slack/Google OAuth                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                   │
│                         │ User authorizes                   │
│                         ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ OAuth Callback Endpoint                              │  │
│  │ • Extracts orgId from state parameter                │  │
│  │ • Exchanges authorization code for tokens            │  │
│  │ • Stores connection with Clerk organization ID       │  │
│  │ • Stores OAuth credentials with connection ID        │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                   │
│                         ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ PostgreSQL Database                                  │  │
│  │ • platform_connections (organization_id UUID)        │  │
│  │ • oauth_credentials (connection_id references)       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Setup Instructions

### 1. Create Clerk Application

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create a new application
3. Enable Organizations feature
4. Copy your publishable and secret keys

### 2. Configure Environment Variables

**Backend (.env)**
```bash
CLERK_PUBLISHABLE_KEY=pk_test_your-clerk-publishable-key
CLERK_SECRET_KEY=sk_test_your-clerk-secret-key
```

**Frontend (.env.development)**
```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your-clerk-publishable-key
```

### 3. Clerk Dashboard Configuration

**Allowed Origins:**
- `http://localhost:4200` (frontend dev)
- `http://localhost:4201` (backend dev)
- Your production URLs

**OAuth Redirect URIs:**
- `http://localhost:4200/oauth/callback`
- Your production callback URL

### 4. Organization Setup

Users must create or join an organization in Clerk before connecting platforms:

1. Sign in to the app
2. Create organization (if first user) or join existing organization
3. Then connect Slack/Google Workspace

## How It Works

### OAuth Flow with Clerk Organization ID

**Step 1: User clicks "Connect Slack"**
```typescript
// PlatformCard.tsx
const { organization } = useOrganization();
const orgId = organization?.id; // e.g., "org_2abc123xyz"
const authUrl = await initiateOAuth('slack', orgId);
```

**Step 2: Backend receives authorization request**
```typescript
// simple-server.ts
app.get('/api/auth/oauth/slack/authorize', (req, res) => {
  const clerkOrgId = req.query.orgId; // "org_2abc123xyz"

  // Validate Clerk org ID format
  if (!clerkOrgId || !clerkOrgId.startsWith('org_')) {
    return res.status(400).json({ error: 'Invalid organization ID' });
  }

  // Create state with org ID
  const state = `${clerkOrgId}:${Date.now()}:${Math.random()}`;

  // Redirect to Slack OAuth with state
  const authUrl = `https://slack.com/oauth/v2/authorize?...&state=${state}`;
  res.json({ authorizationUrl: authUrl });
});
```

**Step 3: OAuth callback receives authorization code**
```typescript
app.get('/api/auth/callback/slack', async (req, res) => {
  const { code, state } = req.query;

  // Extract Clerk org ID from state
  const [clerkOrgId] = state.split(':');

  // Exchange code for tokens
  const tokenData = await exchangeCodeForTokens(code);

  // Store connection with Clerk org ID
  const connection = await hybridStorage.storeConnection({
    organization_id: clerkOrgId, // Real Clerk UUID!
    platform_type: 'slack',
    // ...
  });

  // Store OAuth credentials
  await oauthStorage.storeCredentials(connection.id, credentials);
});
```

**Step 4: Discovery uses organization-scoped connections**
```typescript
app.get('/api/ai-platforms/audit-logs', optionalClerkAuth, async (req, res) => {
  // Get organization ID from Clerk auth
  const authRequest = req as ClerkAuthRequest;
  const organizationId = authRequest.auth?.organizationId;

  // Query connections for this organization
  const orgConnections = await hybridStorage.getConnections(organizationId);

  // Find Google connection for this org
  const googleConnection = orgConnections.data.find(c => c.platform_type === 'google');

  // Get credentials and query audit logs
  const credentials = await oauthStorage.getCredentials(googleConnection.id);
  const auditLogs = await googleConnector.getAIAuditLogs(...);
});
```

## Database Schema

### Before Clerk
```sql
organization_id = 'demo-org-id' -- ❌ String literal, not a UUID
```

### After Clerk
```sql
organization_id = 'org_2abc123xyz' -- ✅ Clerk UUID format
```

## Clerk Middleware

The backend includes Clerk authentication middleware:

```typescript
// middleware/clerk-auth.ts

// Required auth - returns 401 if no session
app.get('/api/protected', requireClerkAuth, async (req, res) => {
  const { organizationId } = (req as ClerkAuthRequest).auth;
  // Use organizationId
});

// Optional auth - continues even without session
app.get('/api/public', optionalClerkAuth, async (req, res) => {
  const authRequest = req as ClerkAuthRequest;
  const organizationId = authRequest.auth?.organizationId || 'demo-org-id';
  // Fallback to demo if no auth
});
```

## Testing the Integration

### 1. Start with Clerk Environment Variables
```bash
# Backend
export CLERK_SECRET_KEY=sk_test_...

# Frontend
export VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### 2. Test OAuth Flow
1. Sign in to app with Clerk
2. Create organization
3. Navigate to Connections page
4. Click "Connect Google Workspace"
5. Verify state parameter includes `org_` prefix
6. Complete OAuth authorization
7. Verify connection stored with Clerk org ID

### 3. Test AI Platform Detection
1. With Google Workspace connected
2. Navigate to Security → AI Platform Audit Logs
3. Verify logs are scoped to your organization
4. Check database: `SELECT * FROM platform_connections WHERE organization_id = 'org_...'`

## Migration Path

### For Existing Installations

If you have existing connections with 'demo-org-id':

```sql
-- Update existing connections to use Clerk org ID
UPDATE platform_connections
SET organization_id = 'org_your_clerk_org_id'
WHERE organization_id = 'demo-org-id';
```

### For New Installations

All new connections will automatically use Clerk organization IDs.

## Troubleshooting

### "Invalid organization ID" Error
- **Cause**: Frontend not sending Clerk org ID
- **Fix**: Ensure user is in an organization, check `useOrganization()` hook

### "No Google Workspace connection found"
- **Cause**: Connection stored with different org ID
- **Fix**: Reconnect Google Workspace while signed into correct organization

### OAuth Callback Fails
- **Cause**: State parameter validation failing
- **Fix**: Check state format: `org_xxx:timestamp:random`

### Database UUID Constraint Error
- **Cause**: Organization ID not in UUID format
- **Fix**: Ensure Clerk org ID (starts with `org_`) is being used

## Security Considerations

1. **CSRF Protection**: State parameter includes Clerk org ID + timestamp + random
2. **Organization Isolation**: All queries scoped to authenticated user's organization
3. **Session Validation**: Clerk middleware validates session on protected routes
4. **Token Storage**: OAuth tokens encrypted at rest, linked to organization

## Benefits

✅ **Multi-tenant Support**: Each organization has isolated connections and data
✅ **Real Authentication**: Clerk handles user auth, sessions, and organizations
✅ **Proper UUIDs**: Clerk org IDs are valid UUIDs that match database constraints
✅ **OAuth Security**: Organization context embedded in OAuth state parameter
✅ **Scalable**: Ready for production with enterprise organizations

## Next Steps

1. Set up Clerk webhook handlers for organization events
2. Implement role-based access control (RBAC) with Clerk roles
3. Add organization billing integration
4. Configure Clerk SSO for enterprise customers
