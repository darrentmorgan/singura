# OAuth Setup Documentation

This document provides step-by-step instructions for configuring OAuth applications with Slack, Google Workspace, and Microsoft 365 to enable SaaS X-Ray's automation discovery capabilities.

## Overview

SaaS X-Ray requires read-only access to your organization's SaaS platforms to discover and analyze automations, bots, and integrations. All OAuth configurations follow the principle of least privilege, requesting only the minimum permissions necessary for automation detection.

## Slack OAuth Setup

### Step 1: Create Slack App

1. Visit [Slack API Console](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. App Name: `SaaS X-Ray Automation Scanner`
4. Select your workspace for development
5. Click "Create App"

### Step 2: Configure OAuth Scopes

Navigate to "OAuth & Permissions" in your app settings:

**Bot Token Scopes** (Required):
- `channels:read` - Access information about public channels
- `groups:read` - Access information about private channels  
- `users:read` - View people in the workspace
- `team:read` - Access workspace information
- `bots:read` - View information about bots
- `apps:read` - View installed apps (requires admin approval)

**User Token Scopes** (Optional - for enhanced discovery):
- `admin.apps:read` - View all workspace apps (admin only)
- `admin.users:read` - View user information (admin only)

### Step 3: Configure Redirect URLs

In "OAuth & Permissions":
1. Add Redirect URL: `http://localhost:3001/api/auth/callback/slack` (development)
2. Add Redirect URL: `https://your-domain.com/api/auth/callback/slack` (production)

### Step 4: Retrieve Credentials

From "Basic Information":
- Copy **Client ID**
- Copy **Client Secret** 
- Copy **Signing Secret** (optional, for webhook verification)

Add to your `.env` file:
```env
SLACK_CLIENT_ID=your-client-id-here
SLACK_CLIENT_SECRET=your-client-secret-here
SLACK_SIGNING_SECRET=your-signing-secret-here
SLACK_REDIRECT_URI=http://localhost:3001/api/auth/callback/slack
```

### Step 5: Install App to Workspace

1. Go to "Install App" in your app settings
2. Click "Install to Workspace"  
3. Review permissions and click "Allow"
4. Save the **Bot User OAuth Token** for testing

### What SaaS X-Ray Detects in Slack:
- ✅ Installed bots and their permissions
- ✅ Workflow automations and triggers
- ✅ App integrations and webhooks
- ✅ Custom slash commands
- ✅ Message shortcuts and actions
- ✅ External app connections

---

## Google Workspace OAuth Setup

### Step 1: Create Google Cloud Project

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: "SaaS X-Ray Scanner"
3. Enable required APIs:
   - Admin SDK API
   - Apps Script API
   - Drive API
   - Gmail API
   - Cloud Resource Manager API

### Step 2: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" user type (or "Internal" for Google Workspace organizations)
3. Fill in application details:
   - App name: `SaaS X-Ray`
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes (see Step 3)
5. Add test users for development

### Step 3: Required OAuth Scopes

**Admin SDK Scopes**:
- `https://www.googleapis.com/auth/admin.directory.user.readonly`
- `https://www.googleapis.com/auth/admin.directory.group.readonly`
- `https://www.googleapis.com/auth/admin.reports.audit.readonly`

**Apps Script Scopes**:
- `https://www.googleapis.com/auth/script.projects.readonly`
- `https://www.googleapis.com/auth/script.metrics`

**Drive & Gmail Scopes**:
- `https://www.googleapis.com/auth/drive.readonly`
- `https://www.googleapis.com/auth/gmail.readonly`

**Cloud Resource Manager**:
- `https://www.googleapis.com/auth/cloud-platform.read-only`

### Step 4: Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: "Web application"
4. Name: "SaaS X-Ray Web Client"
5. Authorized redirect URIs:
   - `http://localhost:3001/api/auth/callback/google`
   - `https://your-domain.com/api/auth/callback/google`

### Step 5: Retrieve Credentials

Copy the generated credentials:
```env
GOOGLE_CLIENT_ID=your-client-id.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/callback/google
```

### Step 6: Service Account (Optional - Enhanced Access)

For deeper integration insights:
1. Create Service Account in IAM & Admin
2. Enable Domain-wide Delegation
3. Add to Google Workspace Admin Console
4. Grant additional scopes for service account impersonation

### What SaaS X-Ray Detects in Google Workspace:
- ✅ Apps Script projects and triggers
- ✅ Service accounts and API keys
- ✅ OAuth applications and permissions
- ✅ Drive automations and sharing rules
- ✅ Gmail filters and forwarding rules
- ✅ Calendar integrations and bots
- ✅ Third-party app installations
- ✅ Workspace Add-ons

---

## Microsoft 365 OAuth Setup

### Step 1: Azure App Registration

1. Visit [Azure Portal](https://portal.azure.com/)
2. Go to "Azure Active Directory" → "App registrations"
3. Click "New registration"
4. Name: `SaaS X-Ray Automation Scanner`
5. Account types: "Accounts in this organizational directory only"
6. Redirect URI: `http://localhost:3001/api/auth/callback/microsoft`

### Step 2: Configure API Permissions

In your app registration, go to "API permissions":

**Microsoft Graph Delegated Permissions**:
- `Directory.Read.All` - Read directory data
- `User.Read.All` - Read all user profiles
- `Application.Read.All` - Read applications
- `AuditLog.Read.All` - Read audit log data
- `Policy.Read.All` - Read your organization's policies

**Microsoft Graph Application Permissions** (Optional - Admin Consent Required):
- `Application.Read.All` - Read all app registrations
- `Directory.Read.All` - Read directory data
- `AuditLog.Read.All` - Read all audit log data

**Power Platform (Optional)**:
- `https://service.powerapps.com/User` - Access Power Apps
- `https://service.flow.microsoft.com/User` - Access Power Automate

### Step 3: Grant Admin Consent

1. Click "Grant admin consent for [Organization]"
2. Confirm the permissions grant
3. Wait for "Granted for [Organization]" status

### Step 4: Configure Authentication

In "Authentication":
1. Add redirect URIs:
   - `http://localhost:3001/api/auth/callback/microsoft`
   - `https://your-domain.com/api/auth/callback/microsoft`
2. Enable "Access tokens" and "ID tokens"
3. Set "Allow public client flows" to "No"

### Step 5: Create Client Secret

1. Go to "Certificates & secrets"
2. Click "New client secret"
3. Description: "SaaS X-Ray Client Secret"
4. Expires: 12 months (or per your security policy)
5. Copy the secret value immediately

### Step 6: Retrieve Credentials

From "Overview" page:
```env
MICROSOFT_CLIENT_ID=your-application-id
MICROSOFT_CLIENT_SECRET=your-client-secret-value
MICROSOFT_TENANT_ID=your-tenant-id
MICROSOFT_REDIRECT_URI=http://localhost:3001/api/auth/callback/microsoft
```

### What SaaS X-Ray Detects in Microsoft 365:
- ✅ Azure AD app registrations
- ✅ Power Automate flows and connectors
- ✅ Power Apps and custom connectors
- ✅ Logic Apps and workflows
- ✅ SharePoint workflows and automations
- ✅ Teams apps and bots
- ✅ Office 365 connectors
- ✅ Third-party application permissions

---

## Security Best Practices

### Token Management
- Store OAuth tokens encrypted at rest
- Implement automatic token refresh
- Set appropriate token expiration policies
- Log token usage for audit purposes

### Permission Auditing
- Regularly review granted permissions
- Implement least-privilege access
- Monitor permission usage and scope
- Set up alerts for permission changes

### Data Protection
- Encrypt all data in transit and at rest
- Implement proper access controls
- Log all data access and modifications
- Comply with GDPR and other regulations

### Network Security
- Use HTTPS for all OAuth flows
- Implement proper CORS policies
- Validate all redirect URIs
- Use secure session management

---

## Troubleshooting

### Common OAuth Errors

**"invalid_client" Error**:
- Verify Client ID and Secret are correct
- Check redirect URI matches exactly
- Ensure app is properly registered

**"insufficient_scope" Error**:
- Review required scopes in app configuration
- Re-authorize with additional scopes
- Check admin consent for organization-level scopes

**"access_denied" Error**:
- User declined permission during OAuth flow
- Admin needs to pre-approve application
- Check if app is blocked by organization policy

**Token Refresh Failures**:
- Verify refresh token is stored correctly
- Check if refresh token has expired
- Implement exponential backoff for retries

### Testing OAuth Flows

Use these endpoints to test your OAuth configuration:

**Slack Test**:
```bash
curl -X GET "https://slack.com/api/auth.test" \
  -H "Authorization: Bearer YOUR_BOT_TOKEN"
```

**Google Test**:
```bash
curl -X GET "https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=YOUR_ACCESS_TOKEN"
```

**Microsoft Test**:
```bash
curl -X GET "https://graph.microsoft.com/v1.0/me" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Support and Documentation

- **Slack API**: https://api.slack.com/docs
- **Google APIs**: https://developers.google.com/identity/protocols/oauth2
- **Microsoft Graph**: https://docs.microsoft.com/en-us/graph/auth/

---

## Production Considerations

### App Store Submissions

**Slack App Directory**:
- Complete app review process
- Provide detailed app description
- Include privacy policy and terms of service
- Submit security and compliance documentation

**Google Workspace Marketplace**:
- Complete OAuth verification process
- Provide security assessment
- Include detailed permission justifications
- Set up proper support channels

**Microsoft AppSource** (Optional):
- Complete publisher verification
- Provide security and compliance documentation
- Include detailed app functionality description
- Set up customer support processes

### Compliance Requirements

- SOC 2 Type II compliance for OAuth flows
- GDPR compliance for data processing
- Regular security audits and penetration testing
- Incident response procedures for OAuth breaches

### Monitoring and Alerting

Set up monitoring for:
- OAuth token refresh failures
- Unusual API usage patterns
- Permission escalation attempts
- Failed authentication attempts
- Token expiration warnings

---

**Note**: This documentation assumes you have administrative access to your organization's SaaS platforms. Some features may require elevated permissions or admin approval. Always follow your organization's security policies when configuring OAuth applications.