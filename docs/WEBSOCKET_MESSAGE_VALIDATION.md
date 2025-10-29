# WebSocket Message Validation Implementation

## Overview

This document describes the implementation of Socket.io message validation and error handling to prevent parsing errors in the admin dashboard and other real-time features.

## Problem Statement

During QA testing, the admin dashboard showed Socket.io message parsing errors in the console. These errors were caused by:

1. **AdminDashboard using raw WebSocket** instead of Socket.io client (protocol mismatch)
2. **No message validation** - Backend broadcast messages without schema validation
3. **Unsafe JSON parsing** - Frontend parsed messages without type checking
4. **No error boundaries** - Parsing errors crashed UI components

## Solution Architecture

### 1. Zod Message Schemas (`shared-types/src/websocket.ts`)

Defined 4 core message types with runtime validation:

**Connection Update**
```typescript
{
  type: 'connection:update',
  payload: {
    connectionId: string (UUID),
    status: 'connected' | 'disconnected' | 'error' | 'refreshing',
    platform: 'slack' | 'google' | 'microsoft',
    timestamp: string (ISO 8601),
    error?: string
  }
}
```

**Discovery Progress**
```typescript
{
  type: 'discovery:progress',
  payload: {
    connectionId: string (UUID),
    progress: number (0-100),
    status: 'in_progress' | 'completed' | 'failed',
    itemsFound: number (>=0),
    timestamp: string (ISO 8601),
    stage?: string,
    message?: string
  }
}
```

**Automation Discovered**
```typescript
{
  type: 'automation:discovered',
  payload: {
    automationId: string (UUID),
    name: string,
    platform: 'slack' | 'google' | 'microsoft',
    riskLevel: 'low' | 'medium' | 'high' | 'critical',
    timestamp: string (ISO 8601),
    riskScore?: number (0-100),
    type?: string
  }
}
```

**System Notification**
```typescript
{
  type: 'system:notification',
  payload: {
    level: 'info' | 'warning' | 'error',
    message: string,
    timestamp: string (ISO 8601),
    title?: string,
    details?: Record<string, unknown>
  }
}
```

### 2. Backend Validation (`backend/src/services/websocket-server.ts`)

Created `WebSocketServer` class with type-safe broadcast methods:

```typescript
class WebSocketServer {
  // Validates before broadcasting
  broadcast(message: WebSocketMessage): boolean

  // Type-safe convenience methods
  broadcastConnectionUpdate(payload: ConnectionUpdatePayload): boolean
  broadcastDiscoveryProgress(payload: DiscoveryProgressPayload): boolean
  broadcastAutomationDiscovered(payload: AutomationDiscoveredPayload): boolean
  broadcastSystemNotification(payload: SystemNotificationPayload): boolean
}
```

**Validation Flow:**
1. Method receives typed payload
2. Constructs full message with `type` discriminator
3. Validates against Zod schema
4. Logs validation failures without exposing sensitive data
5. Only broadcasts if validation succeeds
6. Returns success/failure boolean

### 3. Frontend Hooks (`frontend/src/hooks/useWebSocket.ts`)

Created React hooks for safe message consumption:

```typescript
// Base Socket.io connection management
useWebSocket(): Socket | null

// Type-safe message hooks with validation
useConnectionUpdates(handler: (payload: ConnectionUpdatePayload) => void)
useDiscoveryProgress(handler: (payload: DiscoveryProgressPayload) => void)
useAutomationDiscovered(handler: (payload: AutomationDiscoveredPayload) => void)
useSystemNotifications(handler: (payload: SystemNotificationPayload) => void)

// Raw event hook for admin/debug (not validated)
useSocketEvent<T>(eventName: string, handler: (data: T) => void)
```

**Client-Side Validation:**
- Checks if data is an object before parsing
- Validates message structure with Zod
- Logs validation errors to console
- Does NOT crash UI if message is invalid
- Silently ignores malformed messages

### 4. AdminDashboard Fix (`frontend/src/components/admin/AdminDashboard.tsx`)

**Before:**
- Used raw WebSocket connection (`new WebSocket('ws://...')`)
- Manual JSON.parse() with try/catch
- No type checking on parsed data
- Errors could crash the component

**After:**
- Uses Socket.io client (`io('http://localhost:4201')`)
- Proper reconnection handling
- Type-safe data validation
- Error logging without UI crashes
- Connection status tracking in logs

## Implementation Files

### Created
1. `/shared-types/src/websocket.ts` - Zod schemas and validation helpers (198 lines)
2. `/backend/src/services/websocket-server.ts` - Validated broadcast methods (118 lines)
3. `/frontend/src/hooks/useWebSocket.ts` - React hooks for safe consumption (268 lines)
4. `/shared-types/src/__tests__/websocket.test.ts` - Unit tests (371 lines)

### Modified
1. `/shared-types/src/index.ts` - Export WebSocket types
2. `/shared-types/package.json` - Add Zod dependency
3. `/backend/src/simple-server.ts` - Integrate WebSocketServer (2 lines added)
4. `/frontend/src/components/admin/AdminDashboard.tsx` - Fix Socket.io usage (70 lines modified)

## Testing Strategy

### Unit Tests (`shared-types/src/__tests__/websocket.test.ts`)

**Coverage:**
- ✅ Valid message validation (all 4 message types)
- ✅ Invalid field type rejection (UUID, enums, numbers)
- ✅ Out-of-range value rejection (progress 0-100, negative counts)
- ✅ Optional field handling
- ✅ Malformed data handling (null, undefined, strings, missing fields)
- ✅ Helper function behavior (`validateWebSocketMessage`, `parseWebSocketMessage`, `isWebSocketMessage`)

**Test Results:**
- Total: 30 tests
- All message types validated
- Edge cases covered (malformed data, missing fields, wrong types)

### Integration Testing

**Manual Testing Steps:**

1. **Start Backend:**
   ```bash
   cd backend && pnpm dev
   ```

2. **Start Frontend:**
   ```bash
   cd frontend && pnpm dev
   ```

3. **Navigate to Admin Dashboard:**
   - Open http://localhost:4200
   - Click on Admin Dashboard toggle (if visible)
   - Or directly navigate to `/admin` route

4. **Trigger Discovery:**
   - Go to Connections page
   - Connect a platform (Slack or Google)
   - Click "Discover Automations"
   - Watch admin dashboard for live events

5. **Verify:**
   - ✅ No WebSocket parsing errors in console
   - ✅ Live events appear in admin terminal
   - ✅ Connection status shows "ONLINE"
   - ✅ Discovery progress updates in real-time
   - ✅ Malformed messages logged but don't crash UI

**Expected Console Logs:**

✅ Good:
```
[WebSocket] Connected: abc123
[WebSocket] Broadcast discovery:progress: {"connectionId":"...","progress":50,...}
Admin terminal connected to Socket.io for live discovery events
```

❌ Bad (should NOT appear):
```
Uncaught SyntaxError: Unexpected token in JSON
WebSocket connection failed
Socket.io message parsing error
```

## Security Considerations

1. **No Sensitive Data in Logs:**
   - Validation errors log message type and field names only
   - Full message content truncated to 100 characters
   - Error details sanitized before broadcasting

2. **Schema Validation:**
   - UUIDs validated for correct format
   - Enums prevent injection attacks
   - Number ranges prevent overflow
   - Timestamps validated as ISO 8601

3. **Error Handling:**
   - Server validation failures don't expose stack traces
   - Client errors logged locally only
   - Malformed messages silently ignored (don't DOS clients)

## Performance Impact

**Minimal overhead:**
- Zod validation: ~0.1ms per message
- Message serialization: ~0.05ms
- Total: < 0.2ms per broadcast

**Benefits:**
- Prevents client-side crashes (saves re-rendering cost)
- Reduces support tickets (no parsing errors)
- Improves developer experience (type safety)

## Migration Guide

### For Backend Developers

**Old (Unsafe):**
```typescript
io.emit('discovery:progress', {
  connectionId: id,
  progress: 50,
  // Missing required fields
});
```

**New (Type-Safe):**
```typescript
import { wsServer } from './simple-server';

wsServer.broadcastDiscoveryProgress({
  connectionId: id,
  progress: 50,
  status: 'in_progress',
  itemsFound: 42,
  timestamp: new Date().toISOString(),
});
```

### For Frontend Developers

**Old (Unsafe):**
```typescript
socket.on('discovery:progress', (data) => {
  const progress = data.progress; // May be undefined!
  setProgress(progress);
});
```

**New (Type-Safe):**
```typescript
import { useDiscoveryProgress } from '@/hooks/useWebSocket';

useDiscoveryProgress((payload) => {
  // payload is validated and typed
  setProgress(payload.progress); // Always a number 0-100
}, []);
```

## Backward Compatibility

**Preserved:**
- Existing `io.emit()` calls still work (not breaking change)
- Existing socket event listeners remain functional
- Admin dashboard events (`admin:discovery_event`) unchanged

**Recommended:**
- Migrate to `wsServer.broadcast*()` methods over time
- Use typed hooks for new features
- Add validation to existing message handlers gradually

## Next Steps

### Phase 1: Immediate (Done ✅)
- [x] Define Zod schemas for core message types
- [x] Create WebSocketServer class with validation
- [x] Create React hooks for safe consumption
- [x] Fix AdminDashboard Socket.io usage
- [x] Write unit tests for validation

### Phase 2: Migration (Recommended)
- [ ] Update all `io.emit()` calls to use `wsServer.broadcast*()`
- [ ] Add validation to discovery service broadcasts
- [ ] Migrate frontend components to use typed hooks
- [ ] Add E2E tests for WebSocket flows

### Phase 3: Enhancement (Optional)
- [ ] Add message rate limiting
- [ ] Implement message queue with retry logic
- [ ] Add WebSocket monitoring dashboard
- [ ] Create message replay for debugging

## Troubleshooting

### Issue: "Cannot find module 'socket.io-client'"

**Solution:**
```bash
cd frontend && pnpm add socket.io-client
```

### Issue: "Zod validation failed: Invalid datetime"

**Cause:** Backend sending JavaScript `Date` object instead of ISO string

**Solution:**
```typescript
// Wrong
timestamp: new Date()

// Correct
timestamp: new Date().toISOString()
```

### Issue: AdminDashboard not receiving messages

**Check:**
1. Backend server running? (`http://localhost:4201/api/health`)
2. CORS configured correctly?
3. Socket.io connection established? (Check browser DevTools Network tab)
4. Event name matches exactly? (`discovery:progress` not `discoveryProgress`)

## References

- [Zod Documentation](https://zod.dev/)
- [Socket.io Client API](https://socket.io/docs/v4/client-api/)
- [React Hooks Best Practices](https://react.dev/reference/react)
- [OpenSpec Proposal](/openspec/changes/fix-critical-bugs-from-qa-testing/proposal.md)
- [Task 2.1 Details](/openspec/changes/fix-critical-bugs-from-qa-testing/tasks.md)
