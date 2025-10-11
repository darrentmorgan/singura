# OAuth Platform Setup Guide
**Singura - Enterprise Shadow AI Detection Platform**

*Last Updated: September 2025 - Production-Ready OAuth Integration*

---

## 🎯 **Overview**

This guide covers setting up OAuth integrations for discovering shadow AI and automation across enterprise SaaS platforms. Currently supporting Slack with Google Workspace and Microsoft 365 coming soon.

## ✅ **Current Working Configuration**

- **Frontend**: http://localhost:4200
- **Backend**: http://localhost:4201/api  
- **OAuth Endpoints**: `/api/auth/oauth/:platform/authorize`
- **Test Credentials**: admin@example.com / SecurePass123!

---

## 🔐 **Slack OAuth Setup** *(Production Ready)*

### **Step 1: Create Slack App (5 minutes)**

1. **Visit [Slack API Console](https://api.slack.com/apps)**
2. **Click "Create New App"** → **"From scratch"**
3. **App Name**: `Singura Scanner`
4. **Select your workspace** for development/testing
5. **Click "Create App"**

### **Step 2: Configure OAuth Scopes**

Navigate to **"OAuth & Permissions"** in the left sidebar:

#### **Bot Token Scopes (Required):**
```
channels:read        # View info about public channels
groups:read         # View info about private channels  
users:read          # View people in the workspace
team:read           # View workspace information
bots:read           # View information about bots
apps:read           # View installed apps
```

#### **Additional Scopes (Optional - Enhanced Discovery):**
```
admin.apps:read     # View all workspace apps (requires admin approval)
admin.users:read    # View enhanced user information (requires admin)
files:read          # View file automation patterns
```

### **Step 3: Set Redirect URL** *(UPDATED FOR 4201 PORT)*

In the **"OAuth & Permissions"** section:

1. **Redirect URLs** → Click **"Add New Redirect URL"**
2. **Enter**: `http://localhost:4201/api/auth/callback/slack`
   ⚠️ *Note: Backend now runs on port 4201 (updated from 3001)*
3. **Click "Save URLs"**

### **Step 4: Environment Configuration**

Update your `.env` file with Slack credentials:

```bash
# Slack OAuth Configuration (REQUIRED)
SLACK_CLIENT_ID=9468920071988.9461140356663
SLACK_CLIENT_SECRET=0777262ab14f8fb9f6d90f88f015064b
SLACK_SIGNING_SECRET=66c237cae91a8e61a57cbf02c89cc09d
SLACK_REDIRECT_URI=http://localhost:4201/api/auth/callback/slack

# Server Configuration (UPDATED PORTS)
PORT=4201
CORS_ORIGIN=http://localhost:4200
```

### **Step 5: Test OAuth Integration**

1. **Start both servers**:
   ```bash
   # Backend (Terminal 1)
   cd backend && npm run dev
   
   # Frontend (Terminal 2) 
   cd frontend && npm run dev
   ```

2. **Test the flow**:
   - Open http://localhost:4200
   - Login: admin@example.com / SecurePass123!
   - Navigate to Platform Connections
   - Click "Connect" on Slack platform
   - Complete OAuth authorization in Slack
   - Verify redirect back to dashboard with success message

### **Step 6: Verify Connection**

After successful OAuth:
- ✅ **Connection Status**: Shows "Connected" with green indicator
- ✅ **Platform Details**: Displays "Slack - Test Workspace"  
- ✅ **Permissions**: Lists granted OAuth scopes
- ✅ **Backend Storage**: Connection persists in API responses

---

## 🚀 **Upcoming Platform Support**

### **Google Workspace** *(Coming Soon)*
- OAuth 2.0 with Google APIs
- Service account detection
- Apps Script automation discovery
- Drive automation monitoring

### **Microsoft 365** *(Coming Soon)*
- Azure AD OAuth integration
- Power Platform automation detection  
- Graph API activity monitoring
- Teams bot and workflow discovery

### **Additional Platforms** *(Roadmap)*
- HubSpot automation workflows
- Salesforce Einstein bots
- Notion API integrations
- Jira automation rules

---

## 🔒 **Security Best Practices**

### **OAuth Token Management**
- ✅ **Encrypted Storage**: All tokens encrypted at rest
- ✅ **Automatic Refresh**: Token refresh handled automatically
- ✅ **CSRF Protection**: State parameter validation implemented
- ✅ **Secure Headers**: Proper CORS and security headers configured

### **Permission Auditing**
- **Least Privilege**: Request minimum required scopes
- **Regular Review**: Monitor granted permissions for scope creep
- **Permission Tracking**: Log all OAuth grants for audit trails
- **Scope Validation**: Verify only requested scopes are granted

### **Environment Security**
```bash
# Production checklist:
✅ HTTPS redirect URIs (not HTTP localhost)
✅ Environment variables (not hardcoded secrets)  
✅ Secure session management
✅ Rate limiting on OAuth endpoints
✅ Comprehensive audit logging
```

---

## 🧪 **Testing OAuth Integration**

### **Test Scenarios**
1. **Successful Authorization**: Complete OAuth flow end-to-end
2. **User Denial**: Handle when user cancels OAuth
3. **Invalid Scopes**: Error handling for scope mismatches
4. **Token Expiry**: Automatic token refresh functionality
5. **Connection Management**: Disconnect and reconnect flows

### **Mock vs Live Testing**
- **Mock Mode**: Use for UI development and testing
- **Live Mode**: Real Slack workspace for integration testing  
- **Test Workspace**: Dedicated Slack workspace recommended for development

---

## 🆘 **Troubleshooting**

### **Common Issues**

#### **"Invalid client_id parameter"**
- ✅ **Solution**: Verify SLACK_CLIENT_ID environment variable loaded
- ✅ **Check**: Backend console shows real client ID (not "mock")

#### **"Redirect URI hostname not allowed"**  
- ✅ **Solution**: Update Slack app redirect URI to match current port (4201)
- ✅ **Verify**: Exact match required including protocol and port

#### **CORS Errors**
- ✅ **Solution**: Verify CORS_ORIGIN environment variable set to frontend URL
- ✅ **Check**: Backend logs show correct CORS origin (4200)

### **Debug Commands**
```bash
# Test OAuth endpoint responds with real credentials
curl -s http://localhost:4201/api/auth/oauth/slack/authorize

# Verify environment variables loaded
echo $SLACK_CLIENT_ID

# Check backend health
curl -s http://localhost:4201/api/health
```

---

## 📊 **Success Metrics**

After successful OAuth setup, you should see:
- ✅ **Real Slack connections** in Platform Connections page
- ✅ **Active OAuth tokens** with proper expiration management
- ✅ **Audit trails** of OAuth grants and token usage
- ✅ **Shadow AI detection** based on connected workspace data

**Next Step**: Explore the discovered automations and AI integrations in your connected Slack workspace through the Singura dashboard.