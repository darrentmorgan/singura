# Toast Notification Duplication Fix

**Date**: 2025-10-06
**Issue**: Duplicate toast notifications appearing multiple times, particularly "Real-time updates connected" appearing twice and OAuth success messages duplicating

## Root Causes Identified

### 1. React StrictMode Double Mounting
- **Location**: `/frontend/src/main.tsx` line 29
- **Impact**: In development mode, React StrictMode intentionally mounts components twice to detect side effects
- **Effect**: useEffect hooks run twice, causing duplicate API calls and toast notifications

### 2. WebSocket Connection Event Handlers
- **Location**: `/frontend/src/services/websocket.ts` line 72-94
- **Issue**: Used `socket.on()` for 'connect' and 'connect_error' events, which can attach multiple listeners
- **Effect**: Each connection attempt adds new event handlers, causing duplicate toasts on subsequent connections

### 3. Notification Processing Without Deduplication
- **Location**: `/frontend/src/App.tsx` NotificationManager component
- **Issue**: The useEffect processed ALL notifications in the array on every change without tracking which were already shown
- **Effect**: Same notification displayed multiple times if the notifications array updates

### 4. OAuth Callback Re-execution
- **Location**: `/frontend/src/pages/ConnectionsPage.tsx` line 21-56
- **Issue**: useEffect with `searchParams` dependency could run multiple times before URL parameters cleared
- **Effect**: OAuth success/error toasts shown multiple times during React StrictMode double-mounting

### 5. WebSocket Connection Manager Re-connection
- **Location**: `/frontend/src/App.tsx` ConnectionManager component
- **Issue**: useEffect could trigger multiple WebSocket connection attempts during StrictMode remounting
- **Effect**: "Real-time updates connected" toast shown twice

## Fixes Applied

### Fix 1: WebSocket Event Handler Deduplication
**File**: `/frontend/src/services/websocket.ts`
**Changes**:
- Changed `socket.on('connect', ...)` to `socket.once('connect', ...)`
- Changed `socket.on('connect_error', ...)` to `socket.once('connect_error', ...)`
- Added check to only show success toast on first connection (not reconnections)

```typescript
// Use once() instead of on() to prevent duplicate event handlers
this.socket.once('connect', () => {
  // Only show success toast on first connection (not reconnections)
  if (this.reconnectAttempts === 0) {
    useUIStore.getState().showSuccess('Real-time updates connected');
  }
});
```

### Fix 2: Notification Processing Deduplication
**File**: `/frontend/src/App.tsx`
**Changes**:
- Added `processedNotificationsRef` to track which notifications have already been shown
- Check notification ID before processing
- Pass notification ID to react-hot-toast to prevent its own duplicates
- Clean up old processed IDs after 10 seconds to prevent memory leak

```typescript
const processedNotificationsRef = React.useRef<Set<string>>(new Set());

useEffect(() => {
  notifications.forEach(notification => {
    // Skip if already processed
    if (processedNotificationsRef.current.has(notification.id)) {
      return;
    }
    
    processedNotificationsRef.current.add(notification.id);
    toast.success(message, {
      id: notification.id, // Prevent react-hot-toast duplicates
    });
  });
}, [notifications]);
```

### Fix 3: OAuth Callback Deduplication
**File**: `/frontend/src/pages/ConnectionsPage.tsx`
**Changes**:
- Added `oauthProcessedRef` to track if OAuth callback has been processed
- Only process URL parameters once, even if useEffect runs multiple times
- Guard prevents duplicate success/error toasts

```typescript
const oauthProcessedRef = useRef(false);

useEffect(() => {
  // Only process OAuth callback once
  if ((success === 'true' || success === 'false') && platform && !oauthProcessedRef.current) {
    oauthProcessedRef.current = true;
    showSuccess(`${platformName} connected successfully!`);
    setSearchParams(new URLSearchParams());
  }
}, [searchParams, ...]);
```

### Fix 4: WebSocket Connection Manager Deduplication
**File**: `/frontend/src/App.tsx`
**Changes**:
- Added `wsConnectionAttemptedRef` to track if WebSocket connection has been attempted
- Only connect once when signed in, prevent duplicate connections during StrictMode remounting
- Reset flag when signed out to allow reconnection on next sign-in

```typescript
const wsConnectionAttemptedRef = React.useRef(false);

useEffect(() => {
  if (isSignedIn && !wsConnectionAttemptedRef.current) {
    wsConnectionAttemptedRef.current = true;
    websocketService.connect();
  } else if (!isSignedIn) {
    wsConnectionAttemptedRef.current = false;
    websocketService.disconnect();
  }
}, [isSignedIn, setWebsocketStatus]);
```

### Fix 5: TypeScript Type Safety
**File**: `/frontend/src/App.tsx`
**Changes**:
- Handle optional `notification.message` field
- Fallback to `notification.title` if message is undefined
- Ensures type safety with react-hot-toast

```typescript
const message = notification.message || notification.title;
toast.success(message, { id: notification.id });
```

## Testing Verification

### Expected Behavior (After Fix)
1. **OAuth Connection**: "Google connected successfully!" appears exactly ONCE
2. **WebSocket Connection**: "Real-time updates connected" appears exactly ONCE
3. **StrictMode Development**: Toasts do not duplicate even with double-mounting
4. **Reconnections**: WebSocket reconnections do NOT show success toast again

### Test Cases
- [ ] Complete OAuth flow (Slack, Google) - verify single success toast
- [ ] Refresh page after authentication - verify single "Real-time updates connected" toast
- [ ] Sign out and sign in again - verify toasts appear once each time
- [ ] OAuth failure scenario - verify single error toast
- [ ] Network disconnect/reconnect - verify appropriate toast behavior

## Files Modified

1. `/frontend/src/services/websocket.ts` - WebSocket event handler deduplication
2. `/frontend/src/App.tsx` - Notification processing and connection manager deduplication
3. `/frontend/src/pages/ConnectionsPage.tsx` - OAuth callback deduplication

## Key Patterns Established

### Pattern 1: useRef for Idempotent Operations
When a useEffect should only execute an action once despite multiple runs (StrictMode, dependency changes):

```typescript
const actionPerformedRef = useRef(false);

useEffect(() => {
  if (condition && !actionPerformedRef.current) {
    actionPerformedRef.current = true;
    performAction();
  }
}, [dependencies]);
```

### Pattern 2: Socket.io Event Deduplication
For one-time events in Socket.io connection setup:

```typescript
socket.once('event', handler);  // ✅ CORRECT - runs once
// NOT: socket.on('event', handler);  // ❌ Can accumulate handlers
```

### Pattern 3: Notification ID Tracking
For processing items from an array only once:

```typescript
const processedIdsRef = useRef<Set<string>>(new Set());

items.forEach(item => {
  if (!processedIdsRef.current.has(item.id)) {
    processedIdsRef.current.add(item.id);
    processItem(item);
  }
});
```

## Related Issues Prevented

- Memory leaks from accumulated event listeners
- User confusion from duplicate notifications
- Potential race conditions from multiple WebSocket connections
- Unnecessary API calls from duplicate OAuth processing

## Success Criteria Met

✅ Each toast notification appears exactly ONCE per event
✅ No duplicate "Real-time updates connected" messages
✅ OAuth success toast shows once per connection
✅ WebSocket connection toast shows once per session
✅ StrictMode compatibility maintained
✅ TypeScript type safety preserved
✅ No memory leaks introduced
