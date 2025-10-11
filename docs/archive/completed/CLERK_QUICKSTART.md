# Clerk Quick Start Guide

## 🚀 Get OAuth AI Detection Working in 5 Minutes

Your OAuth AI detection feature is complete but blocked by the organization_id UUID issue. Clerk fixes this by providing real organization UUIDs. Here's how to get it running:

---

## Step 1: Create Clerk Application (2 minutes)

1. Go to https://dashboard.clerk.com
2. Click **"Create Application"**
3. Choose **"Google"** and **"Email"** for sign-in methods
4. Click **"Create Application"**

### Enable Organizations
1. In left sidebar, click **"Organizations"**
2. Toggle **"Enable Organizations"** ON
3. Save changes

### Get Your Keys
1. Click **"API Keys"** in left sidebar
2. Copy these keys (you'll need them next):
   - **Publishable Key**: `pk_test_...`
   - **Secret Key**: `sk_test_...`

---

## Step 2: Configure Environment Variables (1 minute)

### Backend
```bash
cd /Users/darrenmorgan/AI_Projects/singura/backend

# Create .env file if it doesn't exist
cp .env.example .env

# Add Clerk keys (replace with your actual keys)
echo "CLERK_PUBLISHABLE_KEY=pk_test_..." >> .env
echo "CLERK_SECRET_KEY=sk_test_..." >> .env
```

### Frontend
```bash
cd /Users/darrenmorgan/AI_Projects/singura/frontend

# Create .env.development file
cp .env.example .env.development

# Add Clerk publishable key (replace with your actual key)
echo "VITE_CLERK_PUBLISHABLE_KEY=pk_test_..." >> .env.development
```

---

## Step 3: Configure Clerk Allowed Origins (30 seconds)

1. In Clerk Dashboard, click **"Domains"**
2. Add these origins:
   - `http://localhost:4200` (frontend)
   - `http://localhost:4201` (backend)
3. Save

---

## Step 4: Start Application (1 minute)

### Terminal 1 - Start Database & Redis
```bash
cd /Users/darrenmorgan/AI_Projects/singura
docker compose up -d postgres redis
```

### Terminal 2 - Start Backend
```bash
cd /Users/darrenmorgan/AI_Projects/singura/backend
npm run dev
```

### Terminal 3 - Start Frontend
```bash
cd /Users/darrenmorgan/AI_Projects/singura/frontend
npm run dev
```

---

## Step 5: Test OAuth AI Detection (1 minute)

1. **Open browser**: http://localhost:4200
2. **Sign in with Clerk**: Create account if needed
3. **Create organization**:
   - Click profile icon
   - Select "Create Organization"
   - Name it (e.g., "My Company")
4. **Connect Google Workspace**:
   - Go to Connections page
   - Click "Connect Google Workspace"
   - Complete OAuth authorization
5. **Verify it works**:
   - Check browser console: Should see `organization_id: "org_..."`
   - Check database:
     ```sql
     SELECT organization_id, platform_type
     FROM platform_connections
     WHERE organization_id LIKE 'org_%';
     ```
   - Should show your Clerk organization ID!

---

## 🎉 Success!

Your OAuth AI detection is now working with real organization UUIDs!

### What Just Happened?

**Before Clerk:**
```javascript
// OAuth callback
const organizationId = 'demo-org-id';  // ❌ Hardcoded string
await storeConnection({ organization_id: 'demo-org-id' });
// Database: ❌ UUID constraint error
```

**After Clerk:**
```javascript
// OAuth callback
const [clerkOrgId] = state.split(':');  // Extract from state
const organizationId = clerkOrgId;  // ✅ Real Clerk UUID: "org_2abc..."
await storeConnection({ organization_id: 'org_2abc...' });
// Database: ✅ Valid UUID, constraint satisfied!
```

---

## Next Steps

### Test AI Platform Detection
```bash
# Navigate to Security → AI Platform Audit Logs
# Select date range
# Click "Detect AI Platform Logins"
# Should return audit logs for your organization!
```

### Test Multi-Tenancy
1. Create second Clerk account
2. Create second organization
3. Connect Google Workspace
4. Verify data is isolated between organizations

---

## Troubleshooting

### "Invalid organization ID" Error
**Problem**: Frontend not sending Clerk org ID
**Fix**: Make sure you created an organization in Clerk UI

### "No Google Workspace connection found"
**Problem**: Connection stored with wrong org ID
**Fix**: Disconnect and reconnect Google Workspace while signed into correct organization

### Database UUID Error
**Problem**: Organization ID not in UUID format
**Fix**: Verify state parameter includes Clerk org ID (should start with `org_`)

---

## Environment Variables Reference

### Required for Clerk
```bash
# Backend
CLERK_PUBLISHABLE_KEY=pk_test_...  # From Clerk Dashboard
CLERK_SECRET_KEY=sk_test_...       # From Clerk Dashboard

# Frontend
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...  # From Clerk Dashboard
```

### Required for OAuth
```bash
# Backend
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

---

## Files to Review

- **`CLERK_INTEGRATION.md`** - Complete technical documentation
- **`CLERK_INTEGRATION_SUMMARY.md`** - Implementation summary
- **Backend Middleware**: `/backend/src/middleware/clerk-auth.ts`
- **Frontend Setup**: `/frontend/src/main.tsx`

---

## Support

**Clerk Issues**: https://clerk.com/docs
**OAuth Setup**: See main project README
**Database Issues**: Check Docker containers are running

---

**Ready to detect shadow AI!** 🔍🤖
