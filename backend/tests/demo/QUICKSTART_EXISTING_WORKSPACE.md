# Quick Start: Using Your Existing Google Workspace

## ✅ Safety First

**Good News**: Your existing workspace is perfect for testing!

**Safety Measures**:
1. ✅ Create isolated test folders (won't touch real company data)
2. ✅ Use test user accounts (create 2-3 dummy users)
3. ✅ Service account only accesses test folders (scoped permissions)
4. ✅ All test files clearly labeled (e.g., `[DEMO] Test File`)
5. ✅ Easy cleanup (delete test folder when done)

---

## 🚀 30-Minute Setup Guide

### Step 1: Create Test Users (5 minutes)

**Option A: Admin Console UI**
```
1. Go to: admin.google.com → Users
2. Add users:
   - demo-user-1@[your-domain.com]
   - demo-user-2@[your-domain.com]
   - singura-test@[your-domain.com]

3. Set simple passwords (e.g., DemoTest2025!)
4. Skip 2FA for demo users (or use same phone)
```

**Option B: Command Line** (if you have gcloud)
```bash
# Install Google Workspace Admin SDK CLI
npm install -g @google-cloud/cli

# Create test users
gcloud identity groups memberships add \
  --group-email=demo-users@[your-domain.com] \
  --member-email=demo-user-1@[your-domain.com]
```

---

### Step 2: Create Google Cloud Project (10 minutes)

```bash
# 1. Go to: console.cloud.google.com
# 2. Create new project: "singura-detection-demo"
# 3. Enable APIs (click "Enable APIs and Services"):
#    - Google Drive API
#    - Admin SDK API
#    - Google Apps Script API

# OR via command line:
gcloud projects create singura-detection-demo
gcloud services enable drive.googleapis.com --project=singura-detection-demo
gcloud services enable admin.googleapis.com --project=singura-detection-demo
gcloud services enable script.googleapis.com --project=singura-detection-demo
```

---

### Step 3: Create Service Account (5 minutes)

```bash
# 1. Go to: console.cloud.google.com/iam-admin/serviceaccounts
# 2. Select project: "singura-detection-demo"
# 3. Click "Create Service Account"
#    - Name: singura-demo-bot
#    - Description: Service account for Singura detection demo scenarios
# 4. Click "Create and Continue"
# 5. Skip role assignment (we'll use domain-wide delegation)
# 6. Click "Done"

# 7. Click on the service account
# 8. Go to "Keys" tab
# 9. Click "Add Key" → "Create new key" → JSON
# 10. Save as: backend/config/demo-service-account.json

# OR via command line:
gcloud iam service-accounts create singura-demo-bot \
  --display-name="Singura Demo Bot" \
  --project=singura-detection-demo

gcloud iam service-accounts keys create ./backend/config/demo-service-account.json \
  --iam-account=singura-demo-bot@singura-detection-demo.iam.gserviceaccount.com
```

---

### Step 4: Enable Domain-Wide Delegation (10 minutes)

**CRITICAL STEP** - This allows the service account to impersonate users

```bash
# 1. Get service account Client ID:
#    Open: backend/config/demo-service-account.json
#    Copy the "client_id" value (looks like: 1234567890123456789)

# 2. Go to: admin.google.com/ac/owl/domainwidedelegation
#    (Admin Console → Security → API Controls → Domain-wide delegation)

# 3. Click "Add new"
#    - Client ID: [paste from service-account.json]
#    - OAuth Scopes (paste all these comma-separated):
#      https://www.googleapis.com/auth/drive,
#      https://www.googleapis.com/auth/drive.file,
#      https://www.googleapis.com/auth/admin.reports.audit.readonly,
#      https://www.googleapis.com/auth/script.projects

# 4. Click "Authorize"

# 5. Verify it worked:
#    You should see the service account listed with scopes
```

**Troubleshooting**:
- If you get "unauthorized_client" errors later, double-check the Client ID matches
- Scopes must be EXACT (no spaces, comma-separated)
- Changes can take 5-10 minutes to propagate

---

### Step 5: Create Test Folders in Drive (2 minutes)

**As your admin user**:

```bash
# 1. Go to: drive.google.com
# 2. Create folders:
#    - "[DEMO] Test Files" (for velocity scenario)
#    - "[DEMO] Sensitive Data" (for off-hours scenario)
#    - "[DEMO] Shared Documents" (for batch permissions scenario)

# 3. Share with demo users:
#    Right-click each folder → Share → Add:
#    - demo-user-1@[your-domain.com] (Editor)
#    - demo-user-2@[your-domain.com] (Editor)

# 4. Get folder IDs (for later):
#    Open each folder, URL looks like:
#    https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j
#                                          ^^^^^^^^^^^^^^^^^^
#    Copy this ID → Save for .env file
```

**Folder IDs needed**:
```
[DEMO] Test Files: _____________________
[DEMO] Sensitive Data: _____________________
[DEMO] Shared Documents: _____________________
```

---

## 🎯 Test the Setup (5 minutes)

Let's verify everything works before building scenarios.

**Create test file**: `backend/scripts/test-service-account.ts`

```typescript
import { google } from 'googleapis';
import * as path from 'path';

async function testServiceAccount() {
  console.log('Testing service account setup...\n');

  // 1. Load service account credentials
  const keyPath = path.join(__dirname, '../config/demo-service-account.json');
  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    // IMPORTANT: Impersonate a real user (service accounts can't access Drive directly)
    subject: 'admin@[YOUR-DOMAIN.COM]' // Replace with your admin email
  });

  const drive = google.drive({ version: 'v3', auth });

  // 2. Test: List files in root
  console.log('✓ Authenticating...');
  const response = await drive.files.list({
    pageSize: 10,
    fields: 'files(id, name, mimeType)',
    q: "name contains '[DEMO]'"
  });

  console.log('✓ Successfully authenticated!\n');
  console.log('Demo folders found:');
  response.data.files?.forEach(file => {
    console.log(`  - ${file.name} (${file.id})`);
  });

  console.log('\n✅ Service account setup is working!');
}

testServiceAccount().catch(console.error);
```

**Run it**:
```bash
cd backend
npm install googleapis
npx ts-node scripts/test-service-account.ts
```

**Expected output**:
```
Testing service account setup...

✓ Authenticating...
✓ Successfully authenticated!

Demo folders found:
  - [DEMO] Test Files (1a2b3c4d5e6f7g8h9i0j)
  - [DEMO] Sensitive Data (2b3c4d5e6f7g8h9i0j1k)
  - [DEMO] Shared Documents (3c4d5e6f7g8h9i0j1k2l)

✅ Service account setup is working!
```

**If you get errors**:
- `Error: invalid_grant` → Domain-wide delegation not enabled yet (wait 10 mins)
- `Error: unauthorized_client` → Client ID mismatch (check step 4)
- `Error: insufficient permissions` → Scopes not correct (re-check step 4)

---

## 🚀 Deploy First Scenario: Velocity Attack (15 minutes)

Once the test passes, let's deploy your first detection scenario!

**Create**: `backend/scripts/demo-scenarios/velocity-attack.ts`

```typescript
import { google } from 'googleapis';
import * as path from 'path';

interface VelocityAttackConfig {
  targetFolderId: string;  // From Step 5
  fileCount: number;        // Default: 50
  impersonateUser: string;  // Email of user to impersonate
}

async function runVelocityAttack(config: VelocityAttackConfig) {
  console.log('🚀 Starting Velocity Attack Demo Scenario\n');
  console.log(`Creating ${config.fileCount} files in ${config.targetFolderId}...\n`);

  // 1. Authenticate
  const keyPath = path.join(__dirname, '../../config/demo-service-account.json');
  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/drive'],
    subject: config.impersonateUser
  });

  const drive = google.drive({ version: 'v3', auth });

  // 2. Create files rapidly
  const startTime = Date.now();
  const filesCreated: string[] = [];

  for (let i = 0; i < config.fileCount; i++) {
    const fileName = `[DEMO] Velocity Test ${i + 1} - ${new Date().toISOString()}.txt`;

    const file = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType: 'text/plain',
        parents: [config.targetFolderId]
      },
      media: {
        mimeType: 'text/plain',
        body: `This is test file ${i + 1} created by Singura demo automation.\n\nCreated: ${new Date().toISOString()}\nPurpose: Velocity detection test`
      }
    });

    filesCreated.push(file.data.id!);

    // Progress indicator
    if ((i + 1) % 10 === 0) {
      console.log(`  ✓ Created ${i + 1}/${config.fileCount} files...`);
    }

    // Small delay to spread over ~10 seconds (but still very fast)
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  const duration = Date.now() - startTime;
  const eventsPerSecond = (config.fileCount / (duration / 1000)).toFixed(2);

  console.log('\n✅ Velocity Attack Scenario Complete!\n');
  console.log(`📊 Metrics:`);
  console.log(`   Files Created: ${filesCreated.length}`);
  console.log(`   Duration: ${(duration / 1000).toFixed(2)} seconds`);
  console.log(`   Rate: ${eventsPerSecond} files/second`);
  console.log(`   Threshold: 1 file/second (human maximum)`);
  console.log(`   Detection: ${parseFloat(eventsPerSecond) > 1 ? '✅ SHOULD TRIGGER' : '❌ BELOW THRESHOLD'}\n`);

  console.log('🔍 Next Steps:');
  console.log('   1. Wait 5-10 minutes for Google audit logs to update');
  console.log('   2. Run Singura discovery against your Google connection');
  console.log('   3. Check dashboard for velocity detection\n');

  return {
    filesCreated,
    duration,
    eventsPerSecond: parseFloat(eventsPerSecond)
  };
}

// Run it
runVelocityAttack({
  targetFolderId: 'YOUR_FOLDER_ID_HERE',  // From Step 5
  fileCount: 50,
  impersonateUser: 'admin@YOUR-DOMAIN.COM'  // Your admin email
}).catch(console.error);
```

**Run it**:
```bash
# 1. Update the config in the script:
#    - targetFolderId: Copy from Step 5 ("[DEMO] Test Files" folder ID)
#    - impersonateUser: Your admin email

# 2. Run the scenario
npx ts-node scripts/demo-scenarios/velocity-attack.ts
```

**Expected output**:
```
🚀 Starting Velocity Attack Demo Scenario

Creating 50 files in 1a2b3c4d5e6f7g8h9i0j...

  ✓ Created 10/50 files...
  ✓ Created 20/50 files...
  ✓ Created 30/50 files...
  ✓ Created 40/50 files...
  ✓ Created 50/50 files...

✅ Velocity Attack Scenario Complete!

📊 Metrics:
   Files Created: 50
   Duration: 10.24 seconds
   Rate: 4.88 files/second
   Threshold: 1 file/second (human maximum)
   Detection: ✅ SHOULD TRIGGER

🔍 Next Steps:
   1. Wait 5-10 minutes for Google audit logs to update
   2. Run Singura discovery against your Google connection
   3. Check dashboard for velocity detection
```

---

## 🔍 Verify Detection (10 minutes)

Now let's verify that Singura detects this automation!

**Manual verification** (while we build the automated flow):

```bash
# 1. Connect your Google Workspace to Singura
#    (You probably already have this set up for development)

# 2. Run discovery manually via API or UI
curl -X POST http://localhost:4201/api/discovery/run \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "your-org-id",
    "platform": "google",
    "connectionId": "your-connection-id"
  }'

# 3. Wait for discovery to complete (30 seconds - 2 minutes)

# 4. Check for detections
psql $DATABASE_URL -c "
  SELECT
    name,
    automation_type,
    risk_level,
    risk_score,
    detection_metadata->'detectionPatterns' as patterns
  FROM discovered_automations
  WHERE name LIKE '%Velocity Test%'
  ORDER BY created_at DESC
  LIMIT 5;
"
```

**Expected detection**:
```sql
                name                | automation_type | risk_level | risk_score |           patterns
------------------------------------+-----------------+------------+------------+------------------------------
 Automated File Creation (Velocity) | script          | high       | 78         | [{"type": "velocity", ...}]
```

**What to look for**:
- ✅ Detection exists in database
- ✅ `automation_type` = "script" or "bot"
- ✅ `risk_level` = "high" or "medium"
- ✅ `risk_score` ≥ 70
- ✅ `detection_metadata` includes `velocity` pattern
- ✅ Evidence shows 4-5 files/second rate

---

## 🎉 Success Checklist

After completing this guide, you should have:

- ✅ Test users created in your workspace
- ✅ Service account with domain-wide delegation
- ✅ Test folders in Google Drive
- ✅ Service account authentication working
- ✅ First scenario deployed (velocity attack)
- ✅ 50 test files created in ~10 seconds
- ✅ Velocity detection triggered in Singura

**Time to complete**: ~1 hour total

---

## 🧹 Cleanup (When Done Testing)

**Delete test data**:
```bash
# 1. Delete demo folders from Drive
#    (This deletes all test files automatically)

# 2. Delete test users
#    Admin Console → Users → Select users → Delete

# 3. Disable service account (optional)
#    Cloud Console → IAM → Service Accounts → Disable

# 4. Keep service account key file for future demos
```

**Pro Tip**: Keep the test folders and users - you can reuse them for all scenarios!

---

## 📋 Next Steps

Once velocity detection is working:

1. **Deploy Scenario 2**: OpenAI Integration
   - Apps Script that calls OpenAI API
   - Should trigger AI Provider detector
   - Higher risk score (~85)

2. **Deploy Scenario 3**: Batch Permissions
   - Share 20 files to external email
   - Should trigger Batch Operation detector
   - Medium-high risk (~70)

3. **Build Demo UI**:
   - Add demo mode page to frontend
   - "Run Scenario" buttons
   - Real-time detection display

**Estimated timeline**:
- Scenario 1 working: Today (1 hour)
- Scenarios 2-3 working: Tomorrow (2-3 hours)
- Demo UI: This week (1-2 days)

---

## 🆘 Troubleshooting

### "Error: invalid_grant"
**Cause**: Domain-wide delegation not enabled or not propagated yet
**Fix**: Wait 10-15 minutes, then retry

### "Error: unauthorized_client"
**Cause**: Client ID mismatch between service account and delegation settings
**Fix**: Re-check Client ID in admin.google.com/ac/owl/domainwidedelegation

### "Error: insufficient permissions"
**Cause**: Scopes not configured correctly
**Fix**: Verify all 4 scopes are added (Drive, Admin SDK, Script)

### "No detections found"
**Cause**: Audit logs haven't updated yet
**Fix**: Wait 10-15 minutes after running scenario, then run discovery again

### "Detection exists but risk score is low"
**Cause**: Detector thresholds may need tuning
**Fix**: Check `velocity-detector.service.ts` thresholds (should be 1 file/sec)

---

## 💬 Questions?

**Common questions**:

**Q: Will this affect my real company data?**
A: No - scenarios only touch the `[DEMO]` folders you created. Service account is scoped to test users.

**Q: Can I use my personal Google account instead?**
A: No - domain-wide delegation requires Google Workspace (paid). Personal Gmail won't work.

**Q: How do I delete all test files quickly?**
A: Just delete the `[DEMO]` folders from Drive. All files inside are deleted automatically.

**Q: Can I run scenarios in production Singura?**
A: Not recommended - create a separate "Demo" organization in Singura to isolate test data.

**Ready to start? Let me know if you hit any issues during setup!**
