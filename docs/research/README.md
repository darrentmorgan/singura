# Testing & API Research Documentation

## Overview

This directory contains comprehensive research documentation for Singura's testing infrastructure and platform API integrations.

## Documents

### [TESTING_FRAMEWORKS_AND_API_DOCUMENTATION.md](./TESTING_FRAMEWORKS_AND_API_DOCUMENTATION.md)

**Complete guide covering**:

1. **Testing Frameworks** (Jest, Supertest, Playwright)
   - TypeScript configuration and best practices
   - Mocking patterns (current Singura patterns)
   - Coverage requirements and thresholds

2. **Platform APIs - Response Formats**
   - **Slack Web API**: Audit logs, users, apps, bots detection
   - **Google Workspace Admin SDK**: Audit logs, Apps Script, tokens
   - **Microsoft Graph API**: Directory audits, sign-in logs

3. **OAuth & API Testing**
   - Token mocking and validation
   - HTTP request mocking with Nock
   - Token refresh testing patterns

4. **Data Generation**
   - Faker.js for realistic test data
   - Test fixtures (current patterns)
   - Time-series generation for audit logs

5. **CI/CD Testing**
   - GitHub Actions workflows
   - Coverage reporting (Codecov)
   - Automated test execution

6. **Performance Testing**
   - Artillery for load testing
   - Autocannon for HTTP benchmarking
   - Node.js profiling tools

7. **Current Singura Setup**
   - Test organization and structure
   - Running tests (commands reference)
   - Coverage requirements

8. **Code Examples**
   - Complete test suite examples
   - Integration tests with database
   - E2E tests with Playwright

## Quick Reference

### Platform API Endpoints

**Slack**:
- Audit Logs: `https://api.slack.com/audit/v1/logs`
- Users: `users.list` method
- Apps: `admin.apps.approved.list` (requires admin token)

**Google Workspace**:
- Audit Logs: `https://admin.googleapis.com/admin/reports/v1/activity/users/{userKey}/applications/{applicationName}`
- Apps Script: `script.projects.list`, `script.projects.get`
- Tokens: `admin.directory.tokens.list`

**Microsoft Graph**:
- Directory Audits: `https://graph.microsoft.com/v1.0/auditLogs/directoryAudits`
- Sign-in Logs: `https://graph.microsoft.com/v1.0/auditLogs/signIns`

### Test Commands

```bash
# Backend tests
cd backend
pnpm test                    # All tests
pnpm test:unit              # Unit only
pnpm test:integration       # Integration only
pnpm test:security          # Security tests
pnpm test:coverage          # With coverage

# E2E tests (root)
pnpm test:e2e               # Headless
pnpm test:e2e:headed        # With browser
pnpm test:e2e:debug         # Debug mode
```

### Key Learnings

1. **Slack Bot Detection**:
   - Use `users.list()` with `is_bot: true` filter
   - **AVOID**: `apps.list()` and `bots.list()` don't exist
   - Use `admin.apps.approved.list()` for approved apps

2. **Google Automation Detection**:
   - Apps Script API: Lists user-created automation scripts
   - Audit logs: Track script executions and OAuth grants
   - Token API: View all OAuth tokens granted by users

3. **Microsoft Automation Detection**:
   - Directory audits: Application management events
   - Sign-in logs: Track service principal authentications
   - Power Automate flows visible in audit logs

4. **Testing Best Practices**:
   - Use type-safe mocking helpers
   - Clean mocks between tests
   - Mock at module level for consistency
   - Generate realistic test data with Faker.js

## Recommended Additions

Based on research, consider adding these packages:

```bash
# Realistic test data generation
pnpm add -D @faker-js/faker

# HTTP request mocking
pnpm add -D nock

# JWT token mocking
pnpm add -D mock-jwks

# Load testing
pnpm add -D artillery

# HTTP benchmarking
pnpm add -D autocannon
```

## Coverage Requirements

- **Global**: 80% (branches, functions, lines, statements)
- **OAuth/Security**: 100% required
- **New code**: 80% minimum

## Next Steps

1. Review platform API response formats in main documentation
2. Implement test fixtures using patterns from Section 8
3. Consider adding Faker.js for more realistic test data
4. Set up Nock for HTTP mocking in integration tests
5. Add performance benchmarks using Artillery

## Resources

### Official Documentation
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Slack API Reference](https://api.slack.com/methods)
- [Google Admin SDK](https://developers.google.com/admin-sdk)
- [Microsoft Graph API](https://learn.microsoft.com/en-us/graph/)

### Testing Libraries
- [Faker.js](https://fakerjs.dev/guide/)
- [Nock](https://github.com/nock/nock)
- [Supertest](https://github.com/ladjs/supertest)
- [Artillery](https://www.artillery.io/docs)

---

**Last Updated**: 2025-10-25
**Maintained By**: Singura Engineering Team
