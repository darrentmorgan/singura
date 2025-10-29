# Proposal: Fix Critical Bugs from QA Testing

## Overview

During comprehensive webapp testing on 2025-10-28, 7 bugs were identified across the application ranging from critical database schema errors to low-severity warnings. This proposal addresses all bugs systematically with a focus on critical OAuth and database issues first.

## Problem Statement

The application has multiple issues preventing production deployment:
1. **Critical**: Database schema mismatch causing audit log failures
2. **Critical**: Google OAuth authentication failures during discovery
3. **Critical**: CSP violations blocking WebAssembly functionality
4. **Medium**: Socket.io message parsing errors in admin dashboard
5. **Medium**: Missing ARIA descriptions affecting accessibility
6. **Low**: React Router future flag warnings
7. **Low**: Development-mode warnings

## Proposed Solution

### Critical Bug Fixes (Priority 1)

**1. Audit Logs Schema Mismatch**
- Root cause: Migration file exists but may not be applied, or INSERT query uses wrong column name
- Fix: Verify migration applied, update INSERT queries to use `timestamp` instead of `created_at`
- Impact: Unblocks audit logging for compliance requirements

**2. Google OAuth Credential Retrieval**
- Root cause: OAuth credentials not properly stored/retrieved or tokens expired
- Fix: Investigate `OAuthCredentialStorageService` singleton, add token refresh logic, validate encryption/decryption
- Impact: Unblocks Google Workspace discovery feature

**3. CSP WebAssembly Violations**
- Root cause: CSP policy blocks `data:` URIs for WebAssembly
- Fix: Update CSP policy to allow `'wasm-unsafe-eval'` or whitelist specific WebAssembly sources
- Impact: Enables WebAssembly-dependent features (if any)

### Medium Bug Fixes (Priority 2)

**4. Socket.io Parsing Errors**
- Root cause: Admin dashboard receiving malformed Socket.io messages
- Fix: Add message validation, update Socket.io event handlers to handle edge cases
- Impact: Improves real-time dashboard stability

**5. ARIA Accessibility**
- Root cause: Dialog components missing `aria-describedby` attributes
- Fix: Add proper ARIA descriptions to all dialog components
- Impact: Improves accessibility compliance (WCAG 2.1)

### Low Priority Fixes (Priority 3)

**6. React Router Future Flags**
- Root cause: Using deprecated behavior, warnings in console
- Fix: Enable `v7_startTransition`, `v7_relativeSplatPath` flags in router config
- Impact: Prepares for React Router v7 upgrade

**7. Development Warnings**
- Root cause: Console warnings about image optimization
- Fix: Document as expected behavior or optimize image loading
- Impact: Cleaner development experience

## Success Criteria

- All 7 bugs resolved and verified with automated tests
- Zero console errors during normal application flow
- OAuth discovery works for Google Workspace (Slack already working)
- Audit logs successfully persist to database
- 100% test coverage for OAuth and database fixes (per project standards)
- Accessibility audit passes for dialog components
- CSP policy allows necessary WebAssembly while maintaining security

## Implementation Strategy

1. **Database Migration Verification** (Agent: `database-architect`)
   - Verify audit_logs migration applied
   - Fix INSERT queries if needed
   - Add migration verification to CI/CD

2. **OAuth Credential Investigation** (Agent: `oauth-integration-specialist`)
   - Debug credential storage/retrieval
   - Add token refresh logic
   - Add encryption validation

3. **CSP Policy Update** (Agent: `security-compliance-auditor`)
   - Research WebAssembly CSP requirements
   - Update policy with minimal security impact
   - Document policy changes

4. **Socket.io Error Handling** (Agent: `api-middleware-specialist`)
   - Add message validation
   - Update admin dashboard event handlers
   - Add error logging

5. **Accessibility Improvements** (Agent: `react-clerk-expert`)
   - Audit all dialog components
   - Add ARIA descriptions
   - Verify WCAG 2.1 compliance

6. **Router Configuration** (Agent: `react-clerk-expert`)
   - Enable future flags
   - Test routing behavior
   - Update documentation

7. **Development Warnings Cleanup** (Direct fix)
   - Document or suppress image optimization warnings
   - Verify no functional impact

## Dependencies

- Existing audit_logs migration file (`backend/migrations/20250116_create_audit_logs.sql`)
- OAuth credential storage service (`backend/src/services/oauth-credential-storage-service.ts`)
- Google Workspace connector (`backend/src/connectors/google.ts`)
- Admin dashboard components (`frontend/src/components/admin/`)
- CSP configuration (location TBD during implementation)

## Risks and Mitigations

**Risk**: OAuth token refresh may require re-authentication
- Mitigation: Add graceful re-auth flow with user notification

**Risk**: CSP policy changes may introduce security vulnerabilities
- Mitigation: Security audit before/after policy change

**Risk**: Database migration may fail on production
- Mitigation: Test migration on staging, add rollback plan

## Rollout Plan

1. **Phase 1** (Critical fixes): Audit logs + OAuth (Estimated: 4-6 hours)
2. **Phase 2** (Medium fixes): Socket.io + Accessibility (Estimated: 2-3 hours)
3. **Phase 3** (Low priority): Router + warnings (Estimated: 1 hour)

Each phase includes testing verification before proceeding to next phase.

## Open Questions

1. Is WebAssembly actually being used? If not, CSP violation may be false positive.
2. Are there existing tests for Google OAuth flow that we can use for verification?
3. What is the current audit log retention policy? (Migration shows 90 days)
4. Should we add monitoring/alerting for OAuth credential failures?

## Stakeholders

- **Engineering**: Full implementation
- **QA**: Verification testing after each phase
- **Security**: Review CSP policy changes
- **Compliance**: Verify audit log fixes meet requirements
