# Automation Details Modal - Test Flow Diagram

## Test Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTOMATION DETAILS TEST                       │
│                                                                  │
│  Objective: Verify UUID used instead of external_id             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌──────────────────────┐
                    │  Code Review Phase   │
                    │  (COMPLETED ✅)      │
                    └──────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
         ┌──────────┐    ┌──────────┐   ┌──────────┐
         │ Frontend │    │ Backend  │   │ Database │
         │  Code    │    │   Code   │   │  Schema  │
         └──────────┘    └──────────┘   └──────────┘
              │                │              │
              │                │              │
         ✅ Sends         ✅ Returns     ✅ Stores
         automation.id    automation.id  both id &
         (UUID)           (UUID)         external_id
                                │
                                ▼
                    ┌──────────────────────┐
                    │  Manual Test Phase   │
                    │  (READY FOR TESTING) │
                    └──────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
      ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
      │   Browser    │  │   Console    │  │  Network     │
      │   Testing    │  │   Script     │  │   Monitor    │
      └──────────────┘  └──────────────┘  └──────────────┘
```

---

## Detailed Test Flow

### 1. User Action Flow

```
┌─────────────┐
│   User      │
│ navigates   │
│ to page     │
└──────┬──────┘
       │
       ▼
┌────────────────────────┐
│ http://localhost:4200  │
│    /automations        │
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐     ┌──────────────────┐
│ Automation cards       │────▶│ GET /api/        │
│ rendered               │     │ automations      │
└───────────┬────────────┘     └──────────────────┘
            │                           │
            │                           ▼
            │                  ┌──────────────────┐
            │                  │ Response:        │
            │                  │ [{               │
            │                  │   id: "uuid",    │
            │                  │   name: "..."    │
            │                  │ }]               │
            │                  └──────────────────┘
            ▼
┌────────────────────────┐
│ User clicks            │
│ "View Details" button  │
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│ Modal opens            │
│ + API call triggered   │
└───────────┬────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│ GET /api/automations/{id}/details   │
│                                     │
│ ✅ CORRECT: {id} = UUID             │
│ ❌ WRONG:   {id} = oauth-app-...    │
└────────────────┬────────────────────┘
                 │
     ┌───────────┴───────────┐
     ▼                       ▼
┌─────────┐          ┌─────────────┐
│ 200 OK  │          │ 404 Error   │
│ ✅ PASS │          │ ❌ FAIL     │
└─────────┘          └─────────────┘
     │
     ▼
┌──────────────────────────┐
│ Response contains:       │
│ - permissions (enriched) │
│ - metadata               │
│ - risk analysis          │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ Modal displays 3 tabs:   │
│ 1. Permissions           │
│ 2. Risk Analysis         │
│ 3. Details               │
└──────────────────────────┘
```

---

## API Request/Response Flow

### Correct Flow (UUID)

```
┌──────────────┐
│  Frontend    │
└──────┬───────┘
       │
       │ automation.id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
       │
       ▼
┌────────────────────────────────────────────────────────┐
│ GET /api/automations/                                  │
│     a1b2c3d4-e5f6-7890-abcd-ef1234567890/details       │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│ Backend (routes/automations.ts line 508-709)           │
│                                                         │
│ const automationId = req.params.id;                    │
│ // = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"            │
│                                                         │
│ SELECT * FROM discovered_automations                   │
│ WHERE id = $1 AND organization_id = $2                 │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│ PostgreSQL Database                                     │
│                                                         │
│ discovered_automations table:                          │
│ ┌──────────────────────────┬──────────────┬────────┐  │
│ │ id (UUID)                │ external_id  │ name   │  │
│ ├──────────────────────────┼──────────────┼────────┤  │
│ │ a1b2c3d4-e5f6-...        │ oauth-app-.. │ App    │  │
│ └──────────────────────────┴──────────────┴────────┘  │
│                                                         │
│ ✅ MATCH FOUND                                         │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│ Response: 200 OK                                        │
│ {                                                       │
│   "success": true,                                      │
│   "automation": {                                       │
│     "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",      │
│     "name": "Google OAuth App",                         │
│     "permissions": {                                    │
│       "total": 3,                                       │
│       "enriched": [...]                                 │
│     },                                                  │
│     "metadata": {                                       │
│       "platformName": "Google",                         │
│       "clientId": "123.apps.googleusercontent.com",     │
│       "detectionMethod": "OAuth Discovery"              │
│     }                                                   │
│   }                                                     │
│ }                                                       │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│ Frontend Modal Displays:                               │
│ ✅ Permissions tab (enriched OAuth scopes)             │
│ ✅ Risk Analysis tab (risk factors)                    │
│ ✅ Details tab (metadata fields)                       │
└────────────────────────────────────────────────────────┘
```

### Incorrect Flow (external_id - BUG)

```
┌──────────────┐
│  Frontend    │
└──────┬───────┘
       │
       │ automation.id = "oauth-app-123456"  ❌ WRONG
       │
       ▼
┌────────────────────────────────────────────────────────┐
│ GET /api/automations/oauth-app-123456/details          │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│ Backend                                                 │
│                                                         │
│ const automationId = req.params.id;                    │
│ // = "oauth-app-123456"                                │
│                                                         │
│ SELECT * FROM discovered_automations                   │
│ WHERE id = $1 AND organization_id = $2                 │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│ PostgreSQL Database                                     │
│                                                         │
│ discovered_automations table:                          │
│ ┌──────────────────────────┬──────────────┬────────┐  │
│ │ id (UUID)                │ external_id  │ name   │  │
│ ├──────────────────────────┼──────────────┼────────┤  │
│ │ a1b2c3d4-e5f6-...        │ oauth-app-.. │ App    │  │
│ └──────────────────────────┴──────────────┴────────┘  │
│                                                         │
│ ❌ NO MATCH (searching id column with external_id)    │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│ Response: 404 Not Found                                 │
│ {                                                       │
│   "success": false,                                     │
│   "error": "AUTOMATION_NOT_FOUND",                      │
│   "message": "Automation not found"                     │
│ }                                                       │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│ Frontend Modal:                                         │
│ ❌ Error state or empty data                           │
└────────────────────────────────────────────────────────┘
```

---

## Console Test Script Flow

```
┌────────────────────────┐
│ User pastes script     │
│ into browser console   │
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│ Step 1: Find first     │
│ automation card        │
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│ Step 2: Override       │
│ window.fetch to        │
│ intercept API calls    │
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│ Step 3: Click          │
│ "View Details" button  │
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│ Step 4: Wait for       │
│ modal to open          │
│ (2 seconds)            │
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│ Step 5: Intercept      │
│ details API call       │
│ (3 seconds)            │
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│ Extract ID from URL    │
│ using regex:           │
│ /\/automations\/       │
│  ([^\/]+)\/details/    │
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│ Validate UUID format:  │
│ /^[0-9a-f]{8}-[0-9a-f] │
│ {4}-[0-9a-f]{4}-       │
│ [0-9a-f]{4}-[0-9a-f]   │
│ {12}$/i                │
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│ Log comprehensive      │
│ results to console:    │
│ - Modal opened?        │
│ - API called?          │
│ - ID is UUID?          │
│ - Status 200?          │
│ - Metadata present?    │
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│ ✅ PASS or ❌ FAIL     │
│ determination          │
└────────────────────────┘
```

---

## Network Tab Verification

```
┌─────────────────────────────────────────────────────────┐
│ Chrome DevTools - Network Tab                          │
├─────────────────────────────────────────────────────────┤
│ Filter: details                                         │
├────────┬──────────┬────────┬────────────────────────────┤
│ Name   │ Status   │ Type   │ URL                        │
├────────┼──────────┼────────┼────────────────────────────┤
│ details│   200    │  xhr   │ /api/automations/          │
│        │          │        │ a1b2c3d4-e5f6-7890-abcd-   │
│        │          │        │ ef1234567890/details       │
└────────┴──────────┴────────┴────────────────────────────┘
                    │
                    │ Click to view
                    ▼
┌─────────────────────────────────────────────────────────┐
│ Headers Tab                                             │
├─────────────────────────────────────────────────────────┤
│ Request URL:                                            │
│ http://localhost:4201/api/automations/                  │
│ a1b2c3d4-e5f6-7890-abcd-ef1234567890/details            │
│                                                         │
│ ✅ VERIFY: ID is UUID format                           │
│ ❌ FAIL IF: ID is "oauth-app-..."                      │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ Response Tab                                            │
├─────────────────────────────────────────────────────────┤
│ {                                                       │
│   "success": true,                                      │
│   "automation": {                                       │
│     "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",      │
│     "permissions": { "total": 3, ... },                 │
│     "metadata": {                                       │
│       "platformName": "Google",                         │
│       "clientId": "123.apps.googleusercontent.com"      │
│     }                                                   │
│   }                                                     │
│ }                                                       │
│                                                         │
│ ✅ VERIFY: All metadata fields present                 │
└─────────────────────────────────────────────────────────┘
```

---

## Test Coverage Map

```
┌─────────────────────────────────────────────────────────┐
│                   TEST COVERAGE MATRIX                  │
├────────────────┬────────────────────────────────────────┤
│ Component      │ Test Method                            │
├────────────────┼────────────────────────────────────────┤
│ Frontend Code  │ ✅ Code Review                         │
│ Backend Code   │ ✅ Code Review                         │
│ Database Schema│ ✅ Code Review                         │
│ API Request    │ ⏳ Manual (Network tab)               │
│ API Response   │ ⏳ Manual (Console script)            │
│ Modal Behavior │ ⏳ Manual (Visual verification)       │
│ UUID Format    │ ⏳ Manual (Regex validation)          │
│ Metadata Fields│ ⏳ Manual (Tab inspection)            │
│ Error Handling │ ⏳ Manual (Console errors)            │
└────────────────┴────────────────────────────────────────┘

Legend:
✅ = Completed
⏳ = Ready for testing
❌ = Not tested
```

---

## Quick Test Decision Tree

```
                    ┌─────────────────┐
                    │ Start Test      │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Automations     │
                    │ exist on page?  │
                    └────┬────────┬───┘
                         │        │
                    YES  │        │ NO
                         │        │
                         │        ▼
                         │   ┌─────────────────┐
                         │   │ Click "Start    │
                         │   │ Discovery"      │
                         │   └────────┬────────┘
                         │            │
                         ◄────────────┘
                         │
                         ▼
                    ┌─────────────────┐
                    │ Run console     │
                    │ test script     │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Modal opened?   │
                    └────┬────────┬───┘
                         │        │
                    YES  │        │ NO
                         │        │
                         │        ▼
                         │   ┌─────────────────┐
                         │   │ ❌ FAIL         │
                         │   │ Check console   │
                         │   │ for errors      │
                         │   └─────────────────┘
                         │
                         ▼
                    ┌─────────────────┐
                    │ API called      │
                    │ with UUID?      │
                    └────┬────────┬───┘
                         │        │
                    YES  │        │ NO
                         │        │
                         │        ▼
                         │   ┌─────────────────┐
                         │   │ ❌ FAIL         │
                         │   │ external_id     │
                         │   │ being sent      │
                         │   └─────────────────┘
                         │
                         ▼
                    ┌─────────────────┐
                    │ Status 200 OK?  │
                    └────┬────────┬───┘
                         │        │
                    YES  │        │ NO
                         │        │
                         │        ▼
                         │   ┌─────────────────┐
                         │   │ ❌ FAIL         │
                         │   │ Server error    │
                         │   └─────────────────┘
                         │
                         ▼
                    ┌─────────────────┐
                    │ Metadata        │
                    │ populated?      │
                    └────┬────────┬───┘
                         │        │
                    YES  │        │ NO
                         │        │
                         │        ▼
                         │   ┌─────────────────┐
                         │   │ ❌ FAIL         │
                         │   │ Empty response  │
                         │   └─────────────────┘
                         │
                         ▼
                    ┌─────────────────┐
                    │ ✅ PASS         │
                    │ All tests OK    │
                    └─────────────────┘
```

---

**For detailed test procedures, see:**
- Main Report: `/Users/darrenmorgan/AI_Projects/saas-xray/AUTOMATION_DETAILS_TEST_REPORT.md`
- Quick Guide: `/Users/darrenmorgan/AI_Projects/saas-xray/QUICK_TEST_CHECKLIST.md`
- Summary: `/Users/darrenmorgan/AI_Projects/saas-xray/TEST_SUMMARY.md`
