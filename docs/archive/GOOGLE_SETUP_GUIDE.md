# Google Workspace OAuth Setup Guide

This guide will help you set up Google Cloud Project and OAuth credentials for Singura's automation discovery features.

## 🎯 What We'll Discover

Singura's Google integration discovers:
- **Apps Script Projects** - Automation scripts in Sheets, Docs, Forms
- **Service Accounts** - Bot accounts with API access
- **OAuth Applications** - Third-party apps with workspace access
- **Drive Activities** - File operations and sharing patterns
- **Admin Activities** - User management and security events (requires admin)

## 📋 Prerequisites

- Google account with Google Cloud Console access
- Admin access to Google Workspace (for some features)
- Credit card for Google Cloud billing (free tier available)

## 🚀 Step 1: Create Google Cloud Project

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create New Project**
   - Click "Select a project" dropdown at the top
   - Click "New Project"
   - Project name: `singura-detection`
   - Organization: Select your workspace organization
   - Click "Create"

3. **Enable Required APIs**
   Navigate to APIs & Services > Library and enable:
   - ✅ **Google Drive API** (Required for file discovery)
   - ✅ **Drive Activity API** (Required for audit logs)
   - ✅ **Apps Script API** (Required for automation discovery)
   - ✅ **Google+ API** (Required for user info)
   - ✅ **Admin SDK API** (Optional - requires admin for advanced features)

## 🔑 Step 2: Create OAuth 2.0 Credentials

1. **Configure OAuth Consent Screen**
   - Go to APIs & Services > OAuth consent screen
   - User Type: **Internal** (if you have Google Workspace) or **External**
   - Application name: `Singura Security Platform`
   - User support email: Your email
   - Application home page: `http://localhost:3000`
   - Privacy policy: `http://localhost:3000/privacy`
   - Terms of service: `http://localhost:3000/terms`
   - Developer contact: Your email
   - Click "Save and Continue"

2. **Add OAuth Scopes**
   Click "Add or Remove Scopes" and add:
   ```
   https://www.googleapis.com/auth/userinfo.email
   https://www.googleapis.com/auth/userinfo.profile
   https://www.googleapis.com/auth/drive.readonly
   https://www.googleapis.com/auth/drive.activity.readonly
   https://www.googleapis.com/auth/script.projects.readonly
   https://www.googleapis.com/auth/admin.reports.audit.readonly
   https://www.googleapis.com/auth/admin.directory.user.readonly
   ```

3. **Create OAuth Client ID**
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: **Web application**
   - Name: `Singura Web Client`
   - Authorized JavaScript origins:
     - `http://localhost:3000`
     - `http://localhost:3001`
   - Authorized redirect URIs:
     - `http://localhost:3001/api/auth/callback/google`
   - Click "Create"

4. **Download Credentials**
   - Copy the Client ID and Client Secret
   - Store them securely (we'll add to .env next)

## 🛡️ Step 3: Security Configuration

1. **Domain Verification** (Production only)
   - Go to Search Console: https://search.google.com/search-console
   - Add and verify your domain
   - In Cloud Console > APIs & Services > Domain verification
   - Add your verified domain

2. **Service Account** (Optional for advanced features)
   - Go to APIs & Services > Credentials
   - Create Credentials > Service Account
   - Name: `singura-service-account`
   - Grant roles: `Viewer`, `Service Account User`
   - Create and download JSON key file

## ⚙️ Step 4: Configure Environment Variables

Update your `.env` file with the credentials:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=1234567890-abcdefghijk.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/callback/google

# Optional: Service Account (for domain-wide delegation)
GOOGLE_SERVICE_ACCOUNT_EMAIL=singura-service-account@your-project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=/path/to/service-account-key.json
```

## 🧪 Step 5: Test the Integration

1. **Start the Backend**
   ```bash
   cd backend
   npm run dev
   ```

2. **Test OAuth Flow**
   - Visit: http://localhost:3001/api/auth/oauth/google/authorize
   - Should redirect to Google OAuth
   - Authorize the application
   - Should redirect back with success

3. **Test Discovery**
   ```bash
   # Test the discovery endpoint
   curl -X POST http://localhost:3001/api/connections/conn-google-1/discover
   ```

## 🔍 API Capabilities by Permission Level

### **Standard User** (No Admin Required)
- ✅ Apps Script projects in user's Drive
- ✅ Files shared with user
- ✅ Drive activity for user's files
- ✅ OAuth applications user has authorized

### **Domain Admin** (Requires Admin SDK)
- ✅ All Apps Script projects in domain
- ✅ Service accounts and their usage
- ✅ Domain-wide OAuth applications
- ✅ Admin audit logs and security events
- ✅ User directory and group information

## 🚨 Security Best Practices

1. **Token Management**
   - Store tokens encrypted at rest
   - Implement automatic refresh
   - Log token usage for audit
   - Set appropriate expiration

2. **Permission Auditing**
   - Regular scope reviews
   - Monitor API usage patterns
   - Alert on unusual activity
   - Document all access grants

3. **Data Protection**
   - Encrypt all data in transit
   - Implement proper access controls
   - Maintain audit trails
   - Comply with data retention policies

## 🎬 Demo Scenarios

### **MVP Demo - Apps Script Discovery**
1. Create a simple Apps Script in Google Sheets
2. Share a folder with automation scripts
3. Run discovery to show detected automations
4. Display risk scores and recommendations

### **Advanced Demo - Cross-Platform Detection**
1. Set up Zapier integration with Google Sheets
2. Create workflow connecting Slack to Sheets
3. Discover automation chain across platforms
4. Show compliance violations and risks

## 🔧 Troubleshooting

### **Common Issues**

**Error: invalid_client**
- Check Client ID and Secret are correct
- Verify redirect URI matches exactly
- Ensure project is not deleted/suspended

**Error: access_denied**
- User declined authorization
- Check OAuth consent screen configuration
- Verify requested scopes are approved

**Error: insufficient_permissions**
- User lacks required Google Workspace permissions
- Some APIs require admin consent
- Check API enablement in Cloud Console

**Error: quota_exceeded**
- API quota limits reached
- Check quotas in Cloud Console
- Consider increasing limits or implementing rate limiting

### **Debug Commands**

```bash
# Check API availability
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  https://www.googleapis.com/drive/v3/about

# Test Drive Activity API
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  https://www.googleapis.com/driveactivity/v2/activity:query

# Check Apps Script projects
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  https://script.googleapis.com/v1/projects
```

## 📞 Support

- **Google Cloud Support**: https://cloud.google.com/support
- **API Documentation**: https://developers.google.com/workspace
- **OAuth Troubleshooting**: https://developers.google.com/identity/protocols/oauth2/troubleshooting

---

**Ready to proceed?** Once you have your credentials, update the `.env` file and restart the backend to begin discovering Google Workspace automations! 🚀