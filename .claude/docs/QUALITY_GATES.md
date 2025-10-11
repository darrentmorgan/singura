# Quality Gates

## Overview

Quality gates are automated checkpoints that enforce code quality, security, and reliability standards. All gates are enforced by CI/CD pipelines and pre-commit hooks.

---

## Commit Quality Gate

**Trigger**: Before every commit
**Enforcement**: Pre-commit hook + CI/CD
**Blocking**: Yes (commit will fail if any check fails)

### Required Checks

#### 1. TypeScript Compilation
```bash
npx tsc --noEmit
```

**Requirements**:
- ✅ Zero TypeScript errors
- ✅ All types properly defined
- ✅ No `any` types (use `unknown` if needed)
- ✅ No `@ts-ignore` comments
- ✅ Strict mode enabled

**Failure Examples**:
```typescript
// ❌ FAILS
const user: any = getUser();  // No 'any' types allowed

// ❌ FAILS
// @ts-ignore
const result = dangerousOperation();  // No @ts-ignore allowed

// ✅ PASSES
const user: User = getUser();
const result = safeOperation();
```

---

#### 2. Test Coverage
```bash
npm run test:coverage
```

**Requirements**:
- ✅ 80% minimum coverage for new code
- ✅ 100% coverage for OAuth/security code
- ✅ All tests pass (unit + integration)
- ✅ No skipped tests (`.skip()` not allowed)

**Coverage Targets**:
| Code Type | Min Coverage | Rationale |
|-----------|-------------|-----------|
| OAuth/Security | 100% | Critical security path |
| API Endpoints | 90% | User-facing functionality |
| Business Logic | 85% | Core features |
| UI Components | 80% | User experience |
| Utilities | 75% | Helper functions |

**Failure Examples**:
```typescript
// ❌ FAILS - Skipped test
describe.skip('OAuth flow', () => {  // Not allowed in commits
  it('should handle token refresh', () => {});
});

// ❌ FAILS - No test for new function
export function validateOAuthToken(token: string) {
  // New function with no corresponding test
}

// ✅ PASSES - Test exists
export function validateOAuthToken(token: string) {
  // Implementation
}

// In test file:
describe('validateOAuthToken', () => {
  it('should validate valid tokens', () => {});
  it('should reject invalid tokens', () => {});
  it('should handle expired tokens', () => {});
});
```

---

#### 3. Shared Types Build
```bash
cd packages/shared-types && npm run build
```

**Requirements**:
- ✅ Shared types package builds successfully
- ✅ No circular dependencies
- ✅ All exports properly typed
- ✅ Version updated if types changed

**Failure Examples**:
```typescript
// ❌ FAILS - Circular dependency
// packages/shared-types/src/user.ts
import { Organization } from './organization';

// packages/shared-types/src/organization.ts
import { User } from './user';  // Circular!

// ✅ PASSES - Break circular dependency
// packages/shared-types/src/base.ts
export interface BaseEntity { id: string; }

// packages/shared-types/src/user.ts
import { BaseEntity } from './base';
export interface User extends BaseEntity { orgId: string; }

// packages/shared-types/src/organization.ts
import { BaseEntity } from './base';
export interface Organization extends BaseEntity { name: string; }
```

---

#### 4. Proper Imports
**Requirements**:
- ✅ Use `@singura/shared-types` for all shared types
- ✅ No local type duplicates
- ✅ No cross-package direct imports (use package exports)

**Failure Examples**:
```typescript
// ❌ FAILS - Local type duplicate
// src/server/types/user.ts
export interface User {  // Duplicate of shared type!
  id: string;
  email: string;
}

// ❌ FAILS - Direct cross-package import
import { User } from '../../../packages/shared-types/src/user';

// ✅ PASSES - Use package import
import { User } from '@singura/shared-types';
```

---

#### 5. Security Tests (OAuth/Auth Changes Only)
```bash
npm run test:security
```

**Requirements** (if OAuth/auth code changed):
- ✅ All security tests pass
- ✅ No hardcoded credentials
- ✅ Encryption tests pass
- ✅ Token validation tests pass

**Failure Examples**:
```typescript
// ❌ FAILS - Hardcoded secret
const CLIENT_SECRET = "hardcoded-secret-123";  // Security violation!

// ❌ FAILS - No encryption test
export class OAuthStorage {
  storeToken(token: string) {
    // Stores token but no encryption test exists
  }
}

// ✅ PASSES - Environment variable + encryption test
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;

// In test file:
describe('OAuthStorage encryption', () => {
  it('should encrypt tokens before storage', () => {});
  it('should decrypt tokens on retrieval', () => {});
  it('should handle key rotation', () => {});
});
```

---

## Pre-Deployment Gate

**Trigger**: Before deployment to staging/production
**Enforcement**: CI/CD pipeline
**Blocking**: Yes (deployment will fail if any check fails)

### Required Checks

#### 1. All Commit Checks (from above)
All commit-level checks must pass first.

#### 2. E2E Tests
```bash
npm run test:e2e
```

**Requirements**:
- ✅ All E2E tests pass
- ✅ Critical user flows validated
- ✅ OAuth flows tested end-to-end
- ✅ Cross-browser compatibility verified

**Critical Flows**:
1. User signup/login
2. OAuth connection (Slack, Google, Microsoft)
3. Discovery execution
4. Real-time updates
5. Error handling and recovery

**Failure Examples**:
```typescript
// ❌ FAILS - Flaky test with no retry logic
test('OAuth callback', async () => {
  await page.click('[data-testid="oauth-connect"]');
  await page.waitForSelector('[data-testid="success"]', { timeout: 5000 });
  // Flaky: sometimes takes >5s
});

// ✅ PASSES - Robust test with retry
test('OAuth callback', async () => {
  await page.click('[data-testid="oauth-connect"]');
  await page.waitForSelector('[data-testid="success"]', {
    timeout: 30000,  // Longer timeout
    state: 'visible'
  });
});
```

---

#### 3. Code Review Score
**Requirements**:
- ✅ Min score: 85/100 (staging), 90/100 (production)
- ✅ No critical security issues
- ✅ No performance regressions
- ✅ Code follows project patterns

**Automated Review Checks**:
- Security vulnerabilities (OWASP Top 10)
- Performance anti-patterns
- Code complexity (cyclomatic complexity < 10)
- Architecture consistency
- Proper error handling

**Failure Examples**:
```typescript
// ❌ FAILS - Security vulnerability (SQL injection)
const query = `SELECT * FROM users WHERE id = ${userId}`;  // SQL injection risk!

// ❌ FAILS - High complexity (cyclomatic complexity = 15)
function processData(data: any) {
  if (condition1) {
    if (condition2) {
      if (condition3) {
        // 15 nested conditions...
      }
    }
  }
}

// ✅ PASSES - Parameterized query
const query = supabase.from('users').select('*').eq('id', userId);

// ✅ PASSES - Refactored for lower complexity
function processData(data: ValidatedData) {
  const validator = new DataValidator(data);
  return validator.validate()
    .then(result => result.process())
    .catch(error => error.handle());
}
```

---

#### 4. Visual Regression Tests
```bash
npm run test:visual
```

**Requirements**:
- ✅ No unexpected UI changes
- ✅ Screenshots match baseline
- ✅ Responsive design maintained
- ✅ Accessibility standards met

**Checked Breakpoints**:
- Mobile: 375px, 414px
- Tablet: 768px, 1024px
- Desktop: 1280px, 1920px

---

## Quality Score Calculation

### Commit Gate Score
```
Score = (
  TypeScript_Pass * 0.25 +
  Test_Coverage * 0.30 +
  Shared_Types_Build * 0.20 +
  Proper_Imports * 0.15 +
  Security_Tests * 0.10
)

Min Score: 100% (all checks must pass)
```

### Deployment Gate Score
```
Score = (
  Commit_Gate * 0.30 +
  E2E_Tests * 0.30 +
  Code_Review * 0.25 +
  Visual_Regression * 0.15
)

Min Score: 85% (staging), 90% (production)
```

---

## Bypassing Gates (Emergency Only)

**When allowed**:
- Critical production hotfix (with post-deployment review)
- Security vulnerability patch (with immediate test addition)
- Infrastructure emergency (with rollback plan)

**Process**:
1. Get approval from tech lead
2. Document bypass reason in commit message
3. Create follow-up ticket for proper fix
4. Schedule post-mortem review

**Example Bypass Commit**:
```bash
git commit -m "hotfix: Critical OAuth token expiry bug

BYPASS: Pre-deployment E2E tests (production down)
Reason: Tokens expiring 24h early, blocking all OAuth flows
Approval: @tech-lead
Follow-up: Ticket #123 - Add E2E test for token expiry
Rollback plan: Revert to v1.2.3 if issues persist

This fixes the token expiry calculation in oauth-service.ts:145
"
```

---

## Quality Gate Integration with Agents

### Pre-Commit Hook Triggers
When commit is attempted, the following agents are automatically invoked:

1. **`code-reviewer-pro`** - Security, best practices, complexity analysis
2. **`typescript-guardian`** - Type coverage, strict mode compliance
3. **`test-suite-manager`** - Coverage validation, test quality

### Pre-Deployment Hook Triggers
When deployment is initiated, additional agents are invoked:

1. **`qa-expert`** - E2E test execution, visual regression
2. **`security-compliance-auditor`** - Security scan, compliance check
3. **`performance-optimizer`** - Performance regression analysis

### Agent Quality Checklist
Agents must verify:
- [ ] No TODO/FIXME comments in production code
- [ ] All console.log removed (use proper logging)
- [ ] Error handling comprehensive
- [ ] Database queries optimized (no N+1)
- [ ] API rate limiting implemented
- [ ] Secrets not hardcoded
- [ ] Dependencies updated (no critical CVEs)

---

## Monitoring Post-Deployment

After deployment passes gates, continuous monitoring ensures quality:

### Real-Time Alerts
- Error rate > 1% (immediate alert)
- Response time > 2s (warning)
- Database query time > 500ms (investigate)
- OAuth failure rate > 5% (rollback consideration)

### Daily Checks
- Test coverage trend (should increase)
- TypeScript error count (should be 0)
- Security vulnerabilities (should be 0)
- Code complexity trend (should decrease)

---

## Failure Recovery

### If Commit Gate Fails
1. **Identify failure** - Review error output
2. **Fix locally** - Correct the issue
3. **Verify fix** - Run checks locally
4. **Re-commit** - Attempt commit again

### If Deployment Gate Fails
1. **Immediate rollback** - Revert to last known good version
2. **Root cause analysis** - Identify why gate failed
3. **Fix in branch** - Create fix with proper tests
4. **Re-deploy** - Attempt deployment again

### Common Failures and Fixes

| Failure | Root Cause | Fix |
|---------|-----------|-----|
| TypeScript errors | Missing types | Add proper types from `@singura/shared-types` |
| Test coverage low | Missing tests | Write tests for new code |
| E2E test failure | Breaking change | Update tests or revert change |
| Code review score low | Security issue | Fix vulnerability, add security test |
| Visual regression | Unintended UI change | Restore UI or update baseline |

---

*For agent delegation, see `.claude/docs/DELEGATION_EXAMPLES.md`*
*For response format, see `.claude/docs/AGENT_RESPONSE_FORMAT.md`*
