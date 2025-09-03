# Quick Slack OAuth Setup Guide

## Step 1: Create a Slack App (5 minutes)

1. **Visit [Slack API Console](https://api.slack.com/apps)**
2. **Click "Create New App"** → **"From scratch"**
3. **App Name**: `SaaS X-Ray Scanner`
4. **Select your workspace** for development/testing
5. **Click "Create App"**

## Step 2: Configure OAuth Scopes

Navigate to **"OAuth & Permissions"** in the left sidebar:

### Bot Token Scopes (Required):
Add these scopes by clicking "Add an OAuth Scope":

```
channels:read        # View info about public channels
groups:read         # View info about private channels  
users:read          # View people in the workspace
team:read           # View workspace information
bots:read           # View information about bots
apps:read           # View installed apps
```

### Additional Scopes (Optional - for enhanced discovery):
```
admin.apps:read     # View all workspace apps (requires admin approval)
admin.users:read    # View enhanced user information (requires admin)
```

## Step 3: Set Redirect URL

In the **"OAuth & Permissions"** section:

1. **Redirect URLs** → Click **"Add New Redirect URL"**
2. **Enter**: `http://localhost:3001/api/auth/callback/slack`
   *Note: Backend runs on port 3001, Frontend on port 3000*
3. **Click "Save URLs"**

## Step 4: Get Your Credentials

Go to **"Basic Information"** in the left sidebar:

### Copy these values:
- **Client ID** (starts with numbers, like `1234567890.1234567890`)
- **Client Secret** (starts with letters, like `abc123def456...`)

## Step 5: Update Your .env File

Open `/Users/darrenmorgan/AI_Projects/saas-xray/.env` and replace:

```bash
# Replace these placeholder values with your real Slack credentials:
SLACK_CLIENT_ID=your-slack-client-id-here
SLACK_CLIENT_SECRET=your-slack-client-secret-here
```

**With your actual values:**
```bash
SLACK_CLIENT_ID=1234567890.1234567890
SLACK_CLIENT_SECRET=abc123def456ghi789jkl012mno345pqr678
```

## Step 6: Install App to Your Workspace

1. Go to **"Install App"** in the left sidebar
2. **Click "Install to Workspace"**  
3. **Review permissions** and click **"Allow"**
4. You'll get a **Bot User OAuth Token** - save this for reference

## Step 7: Test the Connection

1. **Restart your backend server** (if running)
2. **Open frontend**: http://localhost:3000
3. **Navigate to Connections page**
4. **Click "Connect"** on the Slack platform card
5. **Complete OAuth flow** - you should be redirected to Slack, then back
6. **Verify success** - connection should show as "Connected" with green status

## What You'll See After Setup

Once connected, SaaS X-Ray will discover:
- ✅ **Installed bots** and their permissions
- ✅ **Workflow automations** (if you have Workflow Builder workflows)
- ✅ **App integrations** and webhooks
- ✅ **Custom slash commands**
- ✅ **External app connections**

## Testing Tip

Create a simple Slack workflow or install a bot in your test workspace to see real discovery data!

---

**Need help?** Check the detailed setup guide at `/docs/OAUTH_SETUP.md` or the Slack API documentation at https://api.slack.com/docs