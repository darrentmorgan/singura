# User-Friendly Error Messages - Quick Reference

## For Backend Developers

### Adding New Error Categories

**File**: `backend/src/simple-server.ts` (discover endpoint catch block)

```typescript
// Add new error pattern
if (errorMsg.includes('your-error-pattern')) {
  userMessage = 'Your user-friendly message here';
  errorCategory = 'your_category';
}
```

**Error Category Naming Convention**:
- Use snake_case: `authentication`, `rate_limit`, `not_found`
- Be specific: `invalid_token` > `error`
- Match frontend categories

### Emitting Socket.io Events

```typescript
io.emit('discovery:failed', {
  connectionId: id,
  error: userMessage,        // Required: User-friendly message
  errorCategory,             // Required: Error category
  technicalError: errorMsg   // Optional: Technical details
});
```

## For Frontend Developers

### Handling New Error Categories

**File**: `frontend/src/services/websocket.ts`

```typescript
socket.on('discovery:failed', (data) => {
  if (data.errorCategory === 'your_category') {
    useUIStore.getState().showError(
      data.error,
      'Your Title',
      {
        action: {
          label: 'Action Label',
          onClick: () => {
            // Your action logic
          }
        }
      }
    );
  }
});
```

### Using Action Buttons

**When to Add Action Buttons**:
- ✅ Authentication errors → "Reconnect"
- ✅ Permission errors → "Reconnect"
- ✅ Missing data → "Refresh"
- ❌ Rate limits → No action (user must wait)
- ❌ Network errors → No action (automatic retry)

### Toast Notification API

```typescript
// Basic error
showError('Something went wrong', 'Error Title');

// Error with action button
showError(
  'Your connection has expired',
  'Connection Expired',
  {
    action: {
      label: 'Reconnect',
      onClick: () => window.location.href = '/connections'
    },
    duration: 8000  // Optional: custom duration (default: 6000ms)
  }
);

// Success with action
showSuccess(
  'Data exported successfully',
  'Export Complete',
  {
    action: {
      label: 'Download',
      onClick: () => downloadFile()
    }
  }
);
```

## Error Message Writing Guidelines

### DO ✅
- Use simple, clear language
- Explain what happened and why
- Provide actionable next steps
- Be empathetic ("We couldn't connect" vs "Connection failed")
- Use present tense

**Good Examples**:
```
"Your connection has expired. Please reconnect your account to continue."
"Insufficient permissions. Please reconnect with required access scopes."
"API rate limit reached. Please try again in a few minutes."
```

### DON'T ❌
- Use technical jargon
- Blame the user
- Be vague
- Use past tense
- Include stack traces in user messages

**Bad Examples**:
```
"TokenExpiredError: invalid_grant"
"You didn't authorize the correct scopes"
"Error: Failed to authenticate"
"Something went wrong"
```

## Testing Error Messages

### Manual Testing

```bash
# 1. Start backend in development mode
cd backend
NODE_ENV=development npm run dev

# 2. Trigger error (e.g., delete OAuth token from database)
# 3. Trigger discovery from frontend
# 4. Verify:
#    - Toast shows user-friendly message
#    - Action button appears (if applicable)
#    - Technical details in console (dev mode only)
```

### Automated Testing

```typescript
// Test error categorization
describe('Discovery Error Handling', () => {
  it('should categorize authentication errors', async () => {
    const error = new Error('Failed to authenticate with stored credentials');
    // Trigger discovery with mocked error
    // Assert: errorCategory === 'authentication'
    // Assert: error message is user-friendly
  });

  it('should show reconnect button for auth errors', async () => {
    // Mock Socket.io event
    // Trigger 'discovery:failed' with errorCategory='authentication'
    // Assert: Toast has action button with label 'Reconnect'
  });
});
```

## Common Patterns

### Pattern 1: Async Operation Failure

```typescript
try {
  const result = await someAsyncOperation();
} catch (error) {
  // Categorize
  const category = categorizeError(error);
  const userMessage = getUserMessage(category);

  // Emit
  io.emit('operation:failed', { category, error: userMessage });

  // Respond
  res.status(500).json({
    success: false,
    error: userMessage,
    errorCategory: category
  });
}
```

### Pattern 2: Frontend Error Handling

```typescript
const handleAction = async () => {
  try {
    await performAction();
    showSuccess('Action completed');
  } catch (error) {
    const message = error.response?.data?.error || 'Action failed';
    const category = error.response?.data?.errorCategory;

    if (category === 'authentication') {
      showError(message, 'Session Expired', {
        action: { label: 'Login', onClick: () => redirectToLogin() }
      });
    } else {
      showError(message);
    }
  }
};
```

## Debugging Tips

### Backend Debugging

```typescript
// Add console logs for error categorization
console.log('Error details:', {
  originalError: error.message,
  errorCategory,
  userMessage,
  technicalDetails: error.stack
});
```

### Frontend Debugging

```typescript
// Listen to all Socket.io events
socket.onAny((event, ...args) => {
  console.log('Socket.io event:', event, args);
});

// Check notification state
console.log('Current notifications:', useUIStore.getState().notifications);
```

## Checklist for Adding New Errors

- [ ] Identify error pattern in backend
- [ ] Add error categorization logic
- [ ] Define user-friendly message
- [ ] Update Socket.io event emission
- [ ] Add frontend event handler
- [ ] Determine if action button needed
- [ ] Test in development mode
- [ ] Test in production mode (no tech details)
- [ ] Update documentation

## Reference Links

- Implementation Guide: `/USER_FRIENDLY_ERROR_MESSAGES_IMPLEMENTATION.md`
- Flow Diagram: `/ERROR_MESSAGE_FLOW_DIAGRAM.md`
- Backend Code: `/backend/src/simple-server.ts` (lines 1051-1117)
- Frontend WebSocket: `/frontend/src/services/websocket.ts` (lines 256-311)
- UI Store: `/frontend/src/stores/ui.ts` (lines 408-446)
