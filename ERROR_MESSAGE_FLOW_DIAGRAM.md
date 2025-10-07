# User-Friendly Error Messages - Flow Diagram

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DISCOVERY FAILURE                            │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  BACKEND: simple-server.ts (discover endpoint)                      │
│  ─────────────────────────────────────────────────────────────────  │
│  catch (error) {                                                    │
│    const errorMsg = error.message                                   │
│                                                                     │
│    // STEP 1: Categorize Error                                      │
│    if (errorMsg.includes('authenticate'))                           │
│      → errorCategory = 'authentication'                             │
│      → userMessage = "Your connection has expired..."               │
│                                                                     │
│    else if (errorMsg.includes('permission'))                        │
│      → errorCategory = 'permission'                                 │
│      → userMessage = "Insufficient permissions..."                  │
│                                                                     │
│    else if (errorMsg.includes('quota'))                             │
│      → errorCategory = 'rate_limit'                                 │
│      → userMessage = "API rate limit reached..."                    │
│                                                                     │
│    else if (errorMsg.includes('network'))                           │
│      → errorCategory = 'network'                                    │
│      → userMessage = "Network error..."                             │
│                                                                     │
│    else if (errorMsg.includes('not found'))                         │
│      → errorCategory = 'not_found'                                  │
│      → userMessage = "Connection not found..."                      │
│  }                                                                  │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
┌─────────────────────────────┐  ┌─────────────────────────────┐
│  STEP 2: Socket.io Emit     │  │  STEP 2: HTTP Response      │
│  ─────────────────────────  │  │  ─────────────────────────  │
│  io.emit('discovery:failed',│  │  res.status(500).json({     │
│  {                          │  │    success: false,          │
│    connectionId: id,        │  │    error: userMessage,      │
│    error: userMessage,      │  │    errorCategory,           │
│    errorCategory,           │  │    technicalDetails: {...}  │
│    technicalError: errorMsg │  │  })                         │
│  })                         │  │                             │
└──────────────┬──────────────┘  └─────────────┬───────────────┘
               │                                │
               │                                │
               ▼                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  FRONTEND: websocket.ts (discovery:failed event)                    │
│  ─────────────────────────────────────────────────────────────────  │
│  socket.on('discovery:failed', (data) => {                          │
│                                                                     │
│    // STEP 3: Update Discovery Progress                             │
│    updateDiscoveryProgress(connectionId, {                          │
│      stage: 'failed',                                               │
│      progress: 100,                                                 │
│      message: data.error                                            │
│    })                                                               │
│                                                                     │
│    // STEP 4: Set Error in Store                                    │
│    setError(data.error)                                             │
│                                                                     │
│    // STEP 5: Show Toast Notification                               │
│    if (data.errorCategory === 'authentication') {                   │
│      showError(                                                     │
│        data.error,                                                  │
│        'Connection Expired',                                        │
│        {                                                            │
│          action: {                                                  │
│            label: 'Reconnect',                                      │
│            onClick: () => window.location.href = '/connections'     │
│          }                                                          │
│        }                                                            │
│      )                                                              │
│    }                                                                │
│  })                                                                 │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  UI STORE: ui.ts (showError)                                        │
│  ─────────────────────────────────────────────────────────────────  │
│  showError: (message, title, options) => {                          │
│    addNotification({                                                │
│      type: 'error',                                                 │
│      title,                // 'Connection Expired'                  │
│      message,              // User-friendly message                 │
│      duration: 6000,       // 6 seconds                             │
│      action: options?.action  // { label: 'Reconnect', onClick }    │
│    })                                                               │
│  }                                                                  │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  USER SEES TOAST NOTIFICATION                                       │
│  ─────────────────────────────────────────────────────────────────  │
│  ┌─────────────────────────────────────────────────────┐           │
│  │  ⚠ Connection Expired                                │           │
│  │                                                      │           │
│  │  Your connection has expired. Please reconnect      │           │
│  │  your account to continue.                          │           │
│  │                                                      │           │
│  │  ┌──────────────┐                                   │           │
│  │  │  Reconnect   │  ← Clickable button               │           │
│  │  └──────────────┘                                   │           │
│  └─────────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │ User clicks "Reconnect" │
                    └───────────┬───────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  REDIRECT TO CONNECTIONS PAGE                                       │
│  window.location.href = '/connections'                              │
│                                                                     │
│  User can:                                                          │
│  - Reconnect the platform                                           │
│  - Re-authorize with correct scopes                                 │
│  - Resume discovery once connection is restored                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Error Category Matrix

| Error Pattern | Category | User Message | Action Button |
|--------------|----------|--------------|---------------|
| `authenticate`, `credential`, `invalid_grant`, `Token has been expired` | `authentication` | "Your connection has expired. Please reconnect your account to continue." | **Reconnect** |
| `permission`, `Access denied`, `insufficient`, `scope` | `permission` | "Insufficient permissions. Please reconnect with required access scopes." | **Reconnect** |
| `quota`, `rate limit`, `429` | `rate_limit` | "API rate limit reached. Please try again in a few minutes." | None (wait) |
| `network`, `ECONNREFUSED`, `ETIMEDOUT`, `fetch failed` | `network` | "Network error. Please check your connection and try again." | None |
| `not found`, `404` | `not_found` | "Connection not found. Please reconnect the platform." | **Reconnect** |
| Any other error | `unknown` | "Discovery failed" | None |

## Development vs Production Mode

### Development Mode
```json
{
  "success": false,
  "error": "Your connection has expired. Please reconnect your account to continue.",
  "errorCategory": "authentication",
  "technicalDetails": {
    "message": "Failed to initialize Google API client with stored credentials",
    "stack": "Error: Failed to initialize Google API client...\n    at..."
  }
}
```

### Production Mode
```json
{
  "success": false,
  "error": "Your connection has expired. Please reconnect your account to continue.",
  "errorCategory": "authentication"
}
```

## Component Interaction

```
PlatformCard.tsx
      │
      ├─ handleDiscoverAutomations()
      │   └─ startDiscovery(connectionId)
      │       └─ automationsApi.startDiscovery()
      │           └─ POST /api/connections/:id/discover
      │               │
      │               ▼ (fails)
      │           Error Response + Socket.io Event
      │               │
      │               ▼
      │           websocket.ts receives 'discovery:failed'
      │               │
      │               ├─ Updates automations store
      │               └─ Shows toast with action button
      │                   │
      │                   ▼ (user clicks Reconnect)
      │               Redirects to /connections page
```

## Key Benefits

1. **User-Centric**: Clear, actionable messages instead of technical jargon
2. **Contextual Actions**: "Reconnect" button for fixable errors
3. **Progressive Disclosure**: Technical details hidden in production
4. **Real-Time Feedback**: Socket.io ensures immediate notification
5. **Smart Categorization**: Different messages for different error types
6. **Developer-Friendly**: Technical details available in dev mode

## Testing Scenarios

| Scenario | Expected Outcome |
|----------|-----------------|
| Expired OAuth token | "Connection expired" + Reconnect button |
| Insufficient scopes | "Insufficient permissions" + Reconnect button |
| API rate limit hit | "API rate limit reached" (no button) |
| Network disconnected | "Network error" (no button) |
| Connection deleted | "Connection not found" + Reconnect button |
| Unknown error | "Discovery failed" (no button) |
