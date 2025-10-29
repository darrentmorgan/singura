# How to Capture Console Logs

## Method 1: Manual Copy (Easiest)

1. **Open DevTools**: Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows/Linux)
2. **Go to Console tab**
3. **Clear console**: Click the 🚫 icon or press `Cmd+K` / `Ctrl+L`
4. **Navigate to /automations**: Type `http://localhost:4200/automations` in address bar, press Enter
5. **Wait 3 seconds** for redirect to complete
6. **Right-click in console** → "Save as..." or select all logs and copy

## Method 2: Console Command (Best)

1. **Open DevTools Console** (`F12` → Console tab)
2. **Run this command BEFORE navigating**:
   ```javascript
   // Capture all console logs
   window.capturedLogs = [];
   ['log', 'info', 'warn', 'error', 'debug'].forEach(method => {
     const original = console[method];
     console[method] = function(...args) {
       window.capturedLogs.push(`[${method}] ${args.join(' ')}`);
       original.apply(console, args);
     };
   });
   console.log('✅ Log capture enabled');
   ```

3. **Navigate to /automations**
4. **After redirect, run this to see all logs**:
   ```javascript
   copy(window.capturedLogs.join('\n'));
   console.log('✅ Logs copied to clipboard');
   ```

5. **Paste the logs** (Cmd+V / Ctrl+V) and share them

## What I'm Looking For

In the logs, I need to see:
- `[ProtectedRoute] 🔍 State check: {pathname: /automations, isLoaded: true, isSignedIn: true, ...}`
- `[ProtectedRoute] ✅ All checks passed, rendering children for: /automations`
- `[AutomationsPage] 🚀 COMPONENT MOUNTING - URL: /automations`

**OR** identify where it stops and why it redirects.

## Quick Test

**While logged in**, open DevTools Console and run:
```javascript
console.log('Auth Status:', {
  url: window.location.href,
  pathname: window.location.pathname
});
```

Then navigate to /automations and run it again to see if pathname changed.
