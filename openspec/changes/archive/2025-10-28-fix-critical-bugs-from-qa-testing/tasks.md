# Tasks: Fix Critical Bugs from QA Testing

## Phase 1: Critical Database & OAuth Fixes

### Task 1.1: Verify and Fix Audit Logs Schema
**Agent**: `database-architect`
**Priority**: Critical
**Estimated Time**: 1-2 hours

**Subtasks**:
1. Verify `20250116_create_audit_logs.sql` migration has been applied to database
2. Check if any INSERT queries use `created_at` instead of `timestamp` column
3. Search codebase for all `audit_logs` INSERT/UPDATE queries
4. Update queries to use correct `timestamp` column name
5. Add migration verification to startup/CI pipeline
6. Test audit log creation with sample data
7. Verify indexes are properly created

**Success Criteria**:
- Migration confirmed applied in database
- All INSERT queries use `timestamp` column
- Audit logs successfully persist without errors
- Unit tests cover audit log creation

**Files to Check**:
- `backend/migrations/20250116_create_audit_logs.sql`
- `backend/src/repositories/audit-log.repository.ts` (if exists)
- Search for: `INSERT INTO audit_logs`

---

### Task 1.2: Debug Google OAuth Credential Retrieval
**Agent**: `oauth-integration-specialist`
**Priority**: Critical
**Estimated Time**: 2-3 hours

**Subtasks**:
1. Review `OAuthCredentialStorageService` singleton implementation
2. Add debug logging to credential storage/retrieval methods
3. Verify encryption/decryption works correctly
4. Check if Google tokens are properly stored after OAuth callback
5. Implement token refresh logic if missing
6. Add token expiration validation
7. Test credential retrieval during discovery flow
8. Add error handling for expired/invalid tokens

**Success Criteria**:
- Credentials successfully stored after OAuth callback
- Credentials successfully retrieved during discovery
- Token refresh works automatically when tokens expire
- 100% test coverage for OAuth credential flows
- Discovery succeeds for Google Workspace connections

**Files to Check**:
- `backend/src/services/oauth-credential-storage-service.ts`
- `backend/src/connectors/google.ts`
- `backend/src/services/discovery-service.ts`
- `backend/src/routes/auth.ts` (OAuth callback handler)

---

### Task 1.3: Fix CSP WebAssembly Violations
**Agent**: `security-compliance-auditor`
**Priority**: Critical
**Estimated Time**: 1-2 hours

**Subtasks**:
1. Locate current CSP policy configuration
2. Identify which component/library requires WebAssembly
3. Research secure CSP directives for WebAssembly (`wasm-unsafe-eval` vs specific sources)
4. Update CSP policy with minimal security impact
5. Test application functionality with new policy
6. Document CSP changes and rationale
7. Run security audit to verify no new vulnerabilities

**Success Criteria**:
- CSP violations no longer appear in console
- WebAssembly functionality works (if required)
- Security audit passes
- CSP policy documented with justification

**Files to Check**:
- `frontend/index.html` (meta tags)
- `frontend/vite.config.ts` (CSP plugin)
- `backend/src/simple-server.ts` (CSP headers)
- Search for: `Content-Security-Policy`

---

## Phase 2: Medium Priority Fixes

### Task 2.1: Fix Socket.io Parsing Errors
**Agent**: `api-middleware-specialist`
**Priority**: Medium
**Estimated Time**: 1-2 hours

**Subtasks**:
1. Identify Socket.io events sent to admin dashboard
2. Add message validation/schema for each event type
3. Update admin dashboard event handlers to handle edge cases
4. Add error logging for malformed messages
5. Test with various message payloads
6. Add unit tests for message parsing

**Success Criteria**:
- No Socket.io parsing errors in console
- Admin dashboard handles malformed messages gracefully
- Error logging captures message parsing failures
- Unit tests cover message validation

**Files to Check**:
- `frontend/src/components/admin/AdminDashboard.tsx`
- `backend/src/simple-server.ts` (Socket.io setup)
- Search for: `socket.emit`, `socket.on`

---

### Task 2.2: Add ARIA Accessibility Descriptions
**Agent**: `react-clerk-expert`
**Priority**: Medium
**Estimated Time**: 1 hour

**Subtasks**:
1. Audit all dialog components for missing `aria-describedby`
2. Add proper ARIA descriptions to each dialog
3. Verify WCAG 2.1 compliance with accessibility checker
4. Test with screen reader (VoiceOver on macOS)
5. Document accessibility improvements

**Success Criteria**:
- All dialogs have proper `aria-describedby` attributes
- No accessibility warnings in console
- WCAG 2.1 Level AA compliance
- Screen reader testing passes

**Files to Check**:
- `frontend/src/components/**/*Dialog.tsx`
- `frontend/src/components/**/*Modal.tsx`
- Search for: `<Dialog`, `<Modal`

---

## Phase 3: Low Priority Fixes

### Task 3.1: Enable React Router Future Flags
**Agent**: `react-clerk-expert`
**Priority**: Low
**Estimated Time**: 30 minutes

**Subtasks**:
1. Locate router configuration
2. Enable `v7_startTransition` flag
3. Enable `v7_relativeSplatPath` flag
4. Test all routing behavior
5. Verify no regressions
6. Update documentation

**Success Criteria**:
- Future flags enabled
- No console warnings about deprecated behavior
- All routes work as expected
- Documentation updated

**Files to Check**:
- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- Search for: `createBrowserRouter`, `RouterProvider`

---

### Task 3.2: Clean Up Development Warnings
**Agent**: None (direct fix)
**Priority**: Low
**Estimated Time**: 15 minutes

**Subtasks**:
1. Investigate image optimization warning
2. Determine if it's expected behavior
3. Either optimize images or document as expected
4. Suppress warning if appropriate

**Success Criteria**:
- Warning documented or resolved
- No functional impact
- Clean console in development

**Files to Check**:
- `frontend/src/components/landing/LandingPage.tsx`
- Search for: image imports, `<img>` tags

---

## Task Dependencies

```
Task 1.1 (Audit Logs) ──┐
                         ├─> Phase 1 Complete ─> Task 2.1 (Socket.io)
Task 1.2 (OAuth) ────────┤                       Task 2.2 (ARIA)
Task 1.3 (CSP) ──────────┘                          │
                                                    └─> Phase 2 Complete ─> Task 3.1 (Router)
                                                                             Task 3.2 (Warnings)
```

## Testing Checklist

After each task, verify:
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] Unit tests pass
- [ ] Integration tests pass (if applicable)
- [ ] Manual testing confirms fix
- [ ] No new console errors
- [ ] Code coverage meets requirements (80% general, 100% OAuth/security)

## Rollback Plan

Each task should be committed separately to allow easy rollback:
1. Create feature branch from `fix/clerk-navigation-redirect-loop`
2. Commit each task with descriptive message
3. If task causes regression, revert specific commit
4. Tag stable versions after Phase 1 and Phase 2 completion

## Time Estimates

- **Phase 1**: 4-7 hours (Critical)
- **Phase 2**: 2-3 hours (Medium)
- **Phase 3**: 1 hour (Low)
- **Total**: 7-11 hours

## Success Metrics

- Zero console errors during normal application flow
- Google Workspace discovery success rate: 100%
- Audit log persistence rate: 100%
- Accessibility score: WCAG 2.1 Level AA
- All automated tests passing
