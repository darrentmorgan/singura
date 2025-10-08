# Agent Response Format Standards

## Overview

All specialized agents MUST return responses in a standardized JSON format to ensure consistency, parsability, and efficient context usage.

---

## Standard Response Schema

```typescript
interface AgentResponse {
  summary: string;           // 2-3 sentence concise summary
  files_changed: string[];   // Array of "file:line" references
  artifacts: string[];       // Generated files (screenshots, migrations, etc.)
  next_steps: string[];      // Actionable next steps for user
  issues: string[];          // Warnings, blockers, or problems encountered
  references: string[];      // Documentation URLs for further reading
}
```

---

## Field Specifications

### 1. `summary` (REQUIRED)
- **Format**: 2-3 concise sentences
- **Purpose**: Quick understanding of what was accomplished
- **Content**: Focus on WHAT changed, not HOW (no implementation details)
- **Max Length**: 200 tokens

**✅ Good Examples**:
```json
{
  "summary": "Created migration 20251008_user_preferences.sql with RLS policies for tenant isolation. Added indexes for optimal query performance. All tests pass with 95% coverage."
}
```

**❌ Bad Examples**:
```json
{
  "summary": "So I started by reading the existing schema, then I thought about the best approach, analyzed different RLS patterns, compared PostgreSQL documentation, implemented the migration using CREATE TABLE with JSONB columns for flexibility, added composite indexes using CREATE INDEX statements, wrote comprehensive tests using Jest framework, and finally verified everything works correctly."
}
```

**Why bad**: Too verbose, focuses on HOW instead of WHAT, exceeds token limit

---

### 2. `files_changed` (REQUIRED)
- **Format**: `"file_path:line_number"` or just `"file_path"` if entire file
- **Purpose**: Precise reference to modified code locations
- **Max Items**: 20 (for larger changes, group by directory)

**✅ Good Examples**:
```json
{
  "files_changed": [
    "src/server/oauth/oauth-service.ts:145",
    "src/server/oauth/oauth-service.ts:203",
    "src/lib/types/oauth.ts:12",
    "tests/oauth-service.test.ts:67"
  ]
}
```

**❌ Bad Examples**:
```json
{
  "files_changed": [
    "src/server/oauth/oauth-service.ts - Added validateToken method and refreshToken method with error handling",
    "Multiple test files updated with new test cases"
  ]
}
```

**Why bad**: Descriptions instead of references, vague "multiple files"

---

### 3. `artifacts` (OPTIONAL)
- **Format**: Array of file paths for generated assets
- **Purpose**: Reference non-code outputs (screenshots, PDFs, reports)
- **Examples**: Screenshots, performance reports, migration files, documentation

**✅ Good Examples**:
```json
{
  "artifacts": [
    "screenshots/login-flow-step1.png",
    "screenshots/login-flow-step2-error.png",
    "supabase/migrations/20251008_add_user_prefs.sql",
    "docs/api/oauth-endpoints.md",
    "performance-reports/query-optimization.json"
  ]
}
```

---

### 4. `next_steps` (REQUIRED)
- **Format**: Array of actionable items
- **Purpose**: Guide user on what to do next
- **Content**: Clear, specific, prioritized actions
- **Max Items**: 5

**✅ Good Examples**:
```json
{
  "next_steps": [
    "Run migration on dev: supabase db push",
    "Test OAuth flow with real Microsoft account",
    "Update API documentation with new endpoints",
    "Deploy to staging for QA review",
    "Monitor error logs for 24 hours"
  ]
}
```

**❌ Bad Examples**:
```json
{
  "next_steps": [
    "You might want to consider testing this",
    "Check if everything works",
    "Review the code",
    "Make sure it's good"
  ]
}
```

**Why bad**: Vague, not actionable, unclear priority

---

### 5. `issues` (OPTIONAL)
- **Format**: Array of specific problems/warnings
- **Purpose**: Alert user to blockers, warnings, or technical debt
- **Content**: Include file:line references for errors
- **Max Items**: 10

**✅ Good Examples**:
```json
{
  "issues": [
    "tests/e2e/checkout.spec.ts:67 - Payment timeout after 5s (increase timeout or add retry)",
    "WARNING: Breaking change in API contract - /api/oauth/callback signature changed",
    "src/server/oauth/microsoft-service.ts:145 - TODO: Add rate limiting",
    "TypeScript error in src/lib/types/user.ts:23 - Property 'tenantId' missing"
  ]
}
```

**❌ Bad Examples**:
```json
{
  "issues": [
    "Some tests are failing",
    "There might be a problem with the API",
    "Need to fix some errors"
  ]
}
```

**Why bad**: Vague, no file references, not specific

---

### 6. `references` (OPTIONAL)
- **Format**: Array of documentation URLs
- **Purpose**: Provide further reading for user
- **Content**: Official docs, RFCs, blog posts, Stack Overflow
- **Max Items**: 5

**✅ Good Examples**:
```json
{
  "references": [
    "https://supabase.com/docs/guides/auth/row-level-security",
    "https://oauth.net/2/",
    "https://www.postgresql.org/docs/current/ddl-rowsecurity.html",
    "https://react.dev/reference/react/hooks"
  ]
}
```

---

## Context Usage Guidelines

### Token Limits
- **Max total response**: 500-800 tokens
- **Summary**: 200 tokens max
- **Files changed**: 50 tokens max (use file:line format)
- **Next steps**: 100 tokens max
- **Issues**: 150 tokens max
- **References**: 50 tokens max

### What NOT to Include
- ❌ Full code implementations (use file:line references)
- ❌ Verbose explanations (keep summary concise)
- ❌ Implementation details (focus on WHAT changed)
- ❌ Code diffs (too verbose)
- ❌ Long error messages (summarize with file:line)

### What TO Include
- ✅ Precise file:line references
- ✅ Concise summaries
- ✅ Actionable next steps
- ✅ Specific warnings/blockers
- ✅ Relevant documentation links

---

## Examples by Agent Type

### Database Agent
```json
{
  "summary": "Created analytics schema with time-series partitioning and optimized indexes. Migration includes RLS policies for tenant isolation.",
  "files_changed": [
    "supabase/migrations/20251008_analytics_schema.sql"
  ],
  "artifacts": [
    "supabase/migrations/20251008_analytics_schema.sql"
  ],
  "next_steps": [
    "Run migration: supabase db push",
    "Test RLS policies with multiple tenants",
    "Monitor query performance in dev"
  ],
  "issues": [],
  "references": [
    "https://www.postgresql.org/docs/current/ddl-partitioning.html",
    "https://supabase.com/docs/guides/auth/row-level-security"
  ]
}
```

### Frontend Agent
```json
{
  "summary": "Implemented loading spinner component with accessibility support and dark mode. Added to component library with Storybook documentation.",
  "files_changed": [
    "src/components/LoadingSpinner.tsx",
    "src/components/LoadingSpinner.stories.tsx",
    "src/components/index.ts:12"
  ],
  "artifacts": [
    "screenshots/loading-spinner-light.png",
    "screenshots/loading-spinner-dark.png"
  ],
  "next_steps": [
    "Review accessibility with screen reader",
    "Add to design system documentation",
    "Import in pending async components"
  ],
  "issues": [],
  "references": [
    "https://www.w3.org/WAI/ARIA/apg/patterns/alert/"
  ]
}
```

### Testing Agent
```json
{
  "summary": "Added E2E tests for OAuth flow with 92% coverage. Tests cover success path, error handling, and token refresh.",
  "files_changed": [
    "tests/e2e/oauth-flow.spec.ts",
    "tests/fixtures/oauth-mocks.ts:23"
  ],
  "artifacts": [
    "screenshots/oauth-success.png",
    "screenshots/oauth-error-state.png",
    "test-results/coverage-report.html"
  ],
  "next_steps": [
    "Run tests in CI pipeline",
    "Add visual regression tests",
    "Test with real OAuth providers in staging"
  ],
  "issues": [
    "tests/e2e/oauth-flow.spec.ts:45 - Flaky test: token refresh timing"
  ],
  "references": [
    "https://playwright.dev/docs/best-practices"
  ]
}
```

### Security Agent
```json
{
  "summary": "Implemented OAuth token encryption with AES-256-GCM and secure key rotation. All credentials now encrypted at rest.",
  "files_changed": [
    "src/server/security/encryption-service.ts",
    "src/server/oauth/oauth-storage.ts:67",
    "src/server/oauth/oauth-storage.ts:134",
    "tests/security/encryption.test.ts"
  ],
  "artifacts": [],
  "next_steps": [
    "Rotate encryption keys in production",
    "Update security documentation",
    "Schedule penetration test",
    "Add encryption key backup strategy"
  ],
  "issues": [
    "WARNING: Breaking change - requires database migration for existing tokens"
  ],
  "references": [
    "https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html"
  ]
}
```

---

## Validation Checklist

Before returning a response, verify:

- [ ] Summary is 2-3 sentences, <200 tokens
- [ ] Files use `file:line` format, max 20 items
- [ ] Artifacts are actual file paths to generated assets
- [ ] Next steps are actionable and specific, max 5 items
- [ ] Issues include file:line references for errors
- [ ] References are valid URLs, max 5 items
- [ ] Total response is <800 tokens
- [ ] No full code implementations included
- [ ] Focus on WHAT changed, not HOW

---

## Anti-Patterns

### ❌ Verbose Summary
```json
{
  "summary": "I started by carefully analyzing the existing OAuth implementation. After reviewing the Slack and Google integrations, I decided the best approach would be to create a similar pattern for Microsoft. I implemented the OAuth flow by first creating the authorization URL, then handling the callback, storing the tokens securely in the database using our encryption service, and finally adding comprehensive tests to ensure everything works correctly. The implementation follows all our security best practices and maintains consistency with our existing patterns."
}
```

**Fix**: Reduce to 2-3 sentences focusing on deliverables
```json
{
  "summary": "Implemented Microsoft 365 OAuth integration following Slack/Google patterns. Added token encryption, refresh logic, and RLS policies. All tests pass with 95% coverage."
}
```

### ❌ No File References
```json
{
  "files_changed": [
    "Updated OAuth service",
    "Modified storage layer",
    "Added some tests"
  ]
}
```

**Fix**: Use precise file:line format
```json
{
  "files_changed": [
    "src/server/oauth/microsoft-oauth-service.ts:45",
    "src/server/oauth/oauth-storage.ts:123",
    "tests/oauth/microsoft.test.ts"
  ]
}
```

### ❌ Vague Next Steps
```json
{
  "next_steps": [
    "Test the code",
    "Make sure it works",
    "Deploy when ready"
  ]
}
```

**Fix**: Be specific and actionable
```json
{
  "next_steps": [
    "Test OAuth flow with real Microsoft account",
    "Run E2E tests in staging environment",
    "Deploy to production after QA approval"
  ]
}
```

---

*For delegation examples, see `.claude/docs/DELEGATION_EXAMPLES.md`*
