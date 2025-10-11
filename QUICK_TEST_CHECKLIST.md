# Quick Test Checklist - Automation Details Fix

## 🎯 What We're Testing
Verify that automation details modal now receives **UUID** instead of **external_id** (oauth-app-...)

---

## ⚡ Quick Test (2 minutes)

### Step 1: Open the Page
```
http://localhost:4200/automations
```

### Step 2: Open DevTools
Press **F12** → Go to **Network** tab

### Step 3: Click "View Details"
Click the "View Details" button on any automation card

### Step 4: Check the Network Request
1. Filter Network tab by typing: `details`
2. Find the request: `/api/automations/[ID]/details`
3. **Look at the ID in the URL**

### ✅ PASS Criteria
```
✅ URL: /api/automations/a1b2c3d4-e5f6-7890-abcd-ef1234567890/details
✅ Status: 200 OK
✅ Response has automation metadata
```

### ❌ FAIL Criteria
```
❌ URL: /api/automations/oauth-app-123456/details
❌ Status: 404 Not Found
❌ Error: "Automation not found"
```

---

## 📸 Screenshots Needed

1. Network tab showing the UUID in the request URL
2. Response body showing metadata fields (platformName, clientId, etc.)
3. All three modal tabs (Permissions, Risk Analysis, Details)

---

## 🔍 What to Look For in Modal

**Permissions Tab:**
- List of enriched OAuth permissions
- Each with description, risk level, data types

**Risk Analysis Tab:**
- Risk factors list
- AI platform warning (if applicable)
- Permission risk breakdown

**Details Tab:**
- Platform Name: ✓
- Client ID: ✓
- Detection Method: ✓
- Authorized By: ✓
- Created date: ✓
- Last Activity: ✓

---

## 🐛 Console Test Script

Paste this into browser console for automated test:

```javascript
// Located at: /Users/darrenmorgan/AI_Projects/singura/frontend/e2e/manual-automation-test.js
// Copy and paste the contents of that file
```

---

## 📝 Quick Result

**Did it work?**

- [ ] ✅ YES - UUID in API request, modal loads with metadata
- [ ] ❌ NO - Still getting external_id or 404 error

**API Request URL I saw:**
```
_________________________________________________
```

**Status Code:**
```
_________________________________________________
```

**Metadata Fields Populated:**
- [ ] platformName
- [ ] clientId
- [ ] detectionMethod

---

## 📞 If Test Fails

1. Check backend logs for errors
2. Verify both servers are running (frontend:4200, backend:4201)
3. Run database query:
   ```sql
   SELECT id, external_id, name FROM discovered_automations LIMIT 1;
   ```
4. Review `/Users/darrenmorgan/AI_Projects/singura/AUTOMATION_DETAILS_TEST_REPORT.md` for detailed troubleshooting

---

**Full Test Report**: `/Users/darrenmorgan/AI_Projects/singura/AUTOMATION_DETAILS_TEST_REPORT.md`
