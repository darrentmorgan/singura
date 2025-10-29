# Manual Test Setup - Quick Detection Test

## Goal
Prove Singura's detection system works by creating test automation patterns manually, then detecting them.

---

## Step 1: Create Test Folder (1 minute)

**In Google Drive (drive.google.com)**:

1. Create a new folder: **"[DEMO] Singura Detection Test"**
2. Note the folder ID from URL:
   ```
   https://drive.google.com/drive/folders/FOLDER_ID_HERE
   ```

---

## Step 2: Create Test Files - Velocity Pattern (2 minutes)

**Goal**: Create many files quickly to trigger velocity detector

**Two options**:

### Option A: Manual (Fast Enough)
1. In the **[DEMO] Singura Detection Test** folder
2. Create 20-30 text files rapidly:
   - Right-click → New → Google Docs
   - Name them: "Test File 1", "Test File 2", etc.
   - Do this as fast as you can (aim for <2 minutes total)
   - **Why**: Creates velocity pattern (10+ files in short time)

### Option B: Use Google Apps Script (Automated)
1. Go to: https://script.google.com
2. Create new project
3. Paste this code:

```javascript
function createTestFiles() {
  // Get or create demo folder
  const folders = DriveApp.getFoldersByName('[DEMO] Singura Detection Test');
  let folder;

  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder('[DEMO] Singura Detection Test');
  }

  // Create 30 files rapidly
  Logger.log('Creating test files...');

  for (let i = 1; i <= 30; i++) {
    const fileName = `[DEMO] Velocity Test ${i} - ${new Date().toISOString()}`;
    const content = `Test file ${i} created for Singura detection validation.\n\nCreated: ${new Date()}\nPurpose: Trigger velocity detector`;

    DriveApp.createFile(fileName, content).moveTo(folder);

    if (i % 10 === 0) {
      Logger.log(`Created ${i}/30 files`);
    }

    // Small delay (still fast enough to trigger)
    Utilities.sleep(200);
  }

  Logger.log('✅ Done! Created 30 files in ~6 seconds');
  Logger.log(`Folder: ${folder.getUrl()}`);
}
```

4. Click **Run** → Authorize the script → Run again
5. Check Execution log (View → Logs)

**Expected**: 30 files created in ~6 seconds = **5 files/second** (way above 1 file/sec threshold)

---

## Step 3: Create Test Pattern - Batch Sharing (Optional, 1 minute)

**Goal**: Trigger batch operation detector

1. In the same folder, select 10-15 files
2. Right-click → Share
3. Add an external email: `test-external@gmail.com` (doesn't have to be real)
4. Set to "Viewer"
5. Click Share

**Why**: Sharing many files at once = batch operation pattern

---

## Step 4: Wait for Audit Logs (5-10 minutes)

**IMPORTANT**: Google Workspace audit logs have a delay

- **Drive activity logs**: Usually 5-10 minutes
- **Admin audit logs**: Can be up to 24 hours (but usually faster)

**During this wait time**, let's connect your workspace to Singura...

---

## Step 5: Connect Google Workspace to Singura

**In Singura dashboard**:

1. Go to **Connections** page
2. Click **"Connect Google Workspace"**
3. Sign in with: **darren@baliluxurystays.com**
4. Grant permissions:
   - ✅ View and manage Drive files
   - ✅ View audit reports (Admin SDK)
5. Complete OAuth flow

**Expected**: Connection appears in dashboard with "Connected" status

---

## Step 6: Run Discovery (1 minute)

**Option A: Via UI**
1. Go to Connections page
2. Click on your Google Workspace connection
3. Click **"Run Discovery"** button
4. Wait 30-60 seconds

**Option B: Via API**
```bash
curl -X POST http://localhost:4201/api/discovery/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "organizationId": "your-org-id",
    "platform": "google",
    "connectionId": "your-connection-id"
  }'
```

---

## Step 7: Check for Detections

**Expected Detections**:

### Detection 1: Velocity Pattern
```
Name: Automated File Creation (Velocity)
Type: script or automation
Risk Level: High
Risk Score: 75-85
Detectors: velocity
Evidence: 5 files/second > 1 file/second threshold
```

### Detection 2: Batch Sharing (if you did step 3)
```
Name: Bulk File Sharing
Type: automation
Risk Level: Medium-High
Risk Score: 65-75
Detectors: batch_operation
Evidence: 15 files shared simultaneously
```

---

## Verification Checklist

After discovery completes:

- [ ] Go to **Automations** page in Singura dashboard
- [ ] See at least 1 detected automation
- [ ] Risk score is 70+
- [ ] Detection metadata shows "velocity" pattern
- [ ] Can click to see detection details
- [ ] Dashboard shows high-risk automation count increased

---

## If No Detections Appear

**Troubleshooting**:

1. **Check audit logs availability**:
   - Go to: https://admin.google.com/ac/reporting/audit/drive
   - Verify you see recent file creation events
   - If not, wait longer (up to 24 hours for first-time setup)

2. **Check Singura discovery logs**:
   ```bash
   # Backend logs
   tail -f /tmp/backend-dev.log | grep -i discovery
   ```

3. **Check database**:
   ```bash
   psql $DATABASE_URL -c "
     SELECT name, automation_type, risk_level, risk_score
     FROM discovered_automations
     WHERE platform = 'google'
     ORDER BY created_at DESC
     LIMIT 10;
   "
   ```

4. **Manual verification**:
   - Verify Google connection is active
   - Check OAuth token hasn't expired
   - Ensure Admin SDK is enabled in Google Cloud project

---

## Success Criteria

✅ **You've proven detection works if**:
- Singura discovers at least 1 automation
- Risk score matches expected range (70-85)
- Detection metadata shows correct pattern (velocity)
- Dashboard displays the automation

**Next steps after success**:
- Deploy more scenarios (OpenAI integration, off-hours access)
- Build demo mode UI
- Automate with service accounts (later, once policies resolved)

---

## Cleanup

**To remove test data**:
1. Delete the **[DEMO] Singura Detection Test** folder from Drive
2. All test files delete automatically
3. In Singura: Automations will remain in history (mark as resolved/ignore)
