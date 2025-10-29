# OpenSpec Change: Fix Critical Bugs from QA Testing

**Change ID**: `fix-critical-bugs-from-qa-testing`
**Status**: Proposed
**Created**: 2025-10-28
**Type**: Bug Fix
**Severity**: Critical
**Estimated Effort**: 7-11 hours

## Quick Summary

Comprehensive fix for 7 bugs identified during webapp-testing on 2025-10-28, including critical database schema issues, OAuth credential retrieval failures, CSP violations, Socket.io parsing errors, and accessibility improvements.

## Documents

- **[proposal.md](./proposal.md)** - Complete problem statement, proposed solutions, and implementation strategy
- **[tasks.md](./tasks.md)** - Ordered, verifiable tasks broken down by phase (Critical → Medium → Low priority)
- **[design.md](./design.md)** - Architecture decisions, data flows, testing strategy, and security considerations

## Spec Deltas

1. **[audit-logging.md](./specs/audit-logging.md)** - Fix audit log schema mismatch, add migration verification
2. **[oauth-credentials.md](./specs/oauth-credentials.md)** - Fix Google OAuth credential retrieval, add token refresh logic
3. **[security-csp.md](./specs/security-csp.md)** - Fix CSP WebAssembly violations with minimal security impact
4. **[realtime-messaging.md](./specs/realtime-messaging.md)** - Add Socket.io message validation and error handling
5. **[ui-accessibility.md](./specs/ui-accessibility.md)** - Add ARIA attributes to dialogs, improve WCAG 2.1 compliance

## Bug Summary

### Critical (Priority 1)
| Bug | Description | Impact | Agent |
|-----|-------------|--------|-------|
| #1 | Audit logs schema mismatch | Compliance logging fails | `database-architect` |
| #2 | Google OAuth credential retrieval failure | Discovery feature broken | `oauth-integration-specialist` |
| #3 | CSP WebAssembly violations | Console errors, potential feature breakage | `security-compliance-auditor` |

### Medium (Priority 2)
| Bug | Description | Impact | Agent |
|-----|-------------|--------|-------|
| #4 | Socket.io parsing errors | Admin dashboard instability | `api-middleware-specialist` |
| #5 | Missing ARIA descriptions | Accessibility compliance | `react-clerk-expert` |

### Low (Priority 3)
| Bug | Description | Impact | Agent |
|-----|-------------|--------|-------|
| #6 | React Router future flags | Console warnings | `react-clerk-expert` |
| #7 | Development warnings | Developer experience | None (direct fix) |

## Implementation Phases

### Phase 1: Critical Fixes (4-7 hours)
1. **Audit Logs Schema** - Verify migration, fix INSERT queries
2. **OAuth Credentials** - Debug storage/retrieval, add token refresh
3. **CSP Policy** - Investigate WebAssembly usage, update policy

### Phase 2: Medium Fixes (2-3 hours)
4. **Socket.io Validation** - Add message schemas, error handling
5. **ARIA Accessibility** - Add dialog descriptions, WCAG compliance

### Phase 3: Low Priority (1 hour)
6. **Router Configuration** - Enable future flags
7. **Dev Warnings** - Document or suppress warnings

## Success Criteria

- ✅ Zero console errors during normal application flow
- ✅ Google Workspace discovery success rate: 100%
- ✅ Audit log persistence rate: 100%
- ✅ No Socket.io parsing errors over 24 hours
- ✅ WCAG 2.1 Level AA compliance for dialogs
- ✅ All automated tests passing
- ✅ 100% test coverage for OAuth and database fixes

## Testing Requirements

### Test Coverage
- **Unit Tests**: All new/modified functions
- **Integration Tests**: Full OAuth flow, database operations, WebSocket messages
- **E2E Tests**: Google discovery, admin dashboard, dialog accessibility
- **Accessibility Audit**: axe-core scan, screen reader testing

### CI/CD Gates
- ✅ TypeScript compiles (`npx tsc --noEmit`)
- ✅ All tests pass (unit + integration + e2e)
- ✅ 80%+ code coverage (100% OAuth/security)
- ✅ No `@ts-ignore` added
- ✅ Accessibility audit passes

## Agent Delegation Map

| Task | Agent | Justification |
|------|-------|---------------|
| Task 1.1: Audit Logs | `database-architect` | Database schema expertise, Supabase MCP |
| Task 1.2: OAuth Credentials | `oauth-integration-specialist` | OAuth security patterns, credential management |
| Task 1.3: CSP Policy | `security-compliance-auditor` | Security expertise, policy audit |
| Task 2.1: Socket.io | `api-middleware-specialist` | Backend API expertise, WebSocket knowledge |
| Task 2.2: ARIA Accessibility | `react-clerk-expert` | Frontend React expertise, UI patterns |
| Task 3.1: Router Config | `react-clerk-expert` | Frontend React expertise |
| Task 3.2: Dev Warnings | Direct fix | Simple investigation/documentation |

## Dependencies

### Internal
- `@singura/shared-types` - Type definitions
- `backend/migrations/20250116_create_audit_logs.sql` - Audit log schema
- `backend/src/services/oauth-credential-storage-service.ts` - OAuth storage
- `backend/src/connectors/google.ts` - Google Workspace connector
- `frontend/src/components/ui/Dialog.tsx` - Dialog components

### External
- `zod` - Message validation (may need to install)
- `@axe-core/playwright` - Accessibility testing (may need to install)
- `helmet` - CSP configuration (likely already installed)

## Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| OAuth token refresh requires re-auth | Medium | High | Add graceful re-auth flow with notification |
| CSP policy change breaks functionality | Low | High | Test thoroughly, use reportOnly mode first |
| Database migration fails in production | Low | Critical | Test on staging, add rollback plan |
| Token refresh adds latency | Low | Low | Cache valid tokens, 5min buffer before expiry |

## Rollback Plan

Each phase can be rolled back independently:
1. **Phase 1**: Revert database query changes, OAuth service changes, CSP policy
2. **Phase 2**: Revert Socket.io validation, ARIA attributes
3. **Phase 3**: Disable router future flags, remove warning suppression

All changes committed separately with descriptive messages for easy cherry-pick revert.

## Post-Implementation

### Verification Steps
1. Run full test suite (unit + integration + e2e)
2. Manual testing of Google Workspace discovery
3. Check console for errors during 30-minute testing session
4. Run accessibility audit with axe-core
5. Verify audit logs persist correctly
6. Monitor OAuth credential refresh in logs

### Monitoring
- Track audit log insertion success rate
- Monitor OAuth credential refresh attempts/failures
- Track Socket.io message validation errors
- Monitor CSP violation reports
- Track accessibility audit scores

### Documentation Updates
- Update API documentation with new methods
- Add troubleshooting guides for OAuth and database issues
- Document CSP policy and rationale
- Add accessibility compliance documentation
- Update testing documentation

## Open Questions

1. **WebAssembly Usage**: Is WebAssembly actually being used? Need codebase scan.
2. **OAuth Testing**: Are there existing tests for Google OAuth flow?
3. **Audit Retention**: Confirm 90-day retention policy is correct.
4. **Monitoring**: Should we add alerting for OAuth credential failures?
5. **CSP Reporting**: Should we set up CSP violation reporting endpoint?

## Next Steps

1. **Review this proposal** - Stakeholder approval
2. **Validate proposal** - Run `openspec validate fix-critical-bugs-from-qa-testing --strict`
3. **Assign agents** - Create issues for each agent
4. **Phase 1 execution** - Critical fixes (4-7 hours)
5. **Phase 1 verification** - Test and deploy to staging
6. **Phase 2 execution** - Medium fixes (2-3 hours)
7. **Phase 2 verification** - Test and deploy to staging
8. **Phase 3 execution** - Low priority fixes (1 hour)
9. **Final verification** - Full regression testing
10. **Production deployment** - With monitoring

## Changelog

- **2025-10-28**: Initial proposal created after comprehensive QA testing
- **Status**: Waiting for approval and validation

---

**Related Issues**: None (bugs discovered in ad-hoc testing)
**Related PRs**: Will be created after approval
**Discussion**: [Link to discussion thread when available]
