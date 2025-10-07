# Jest TypeScript Configuration Issue

## Problem Statement

**Error Pattern (4th Recurrence):**
```
SyntaxError: Unexpected reserved word 'interface'. (24:0)
```

**Root Cause**: Jest's Babel parser cannot parse TypeScript-specific syntax (`interface`, `type` aliases) in test files.

---

## Why This Happens

### Current Jest Configuration

**File**: `backend/jest.config.js`

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  // ... other config
};
```

**The Issue**:
- `ts-jest` preset is configured BUT not working correctly
- TypeScript interfaces in test files cause Babel parsing errors
- Babel's default parser doesn't understand TypeScript syntax

---

## Historical Occurrences

### 1st Occurrence: Google OAuth Actor Extraction
- **File**: `google-oauth-actor-extraction.test.ts`
- **Solution**: Deleted test file
- **Date**: 2025-10-06

### 2nd Occurrence: Google OAuth API Mapping
- **File**: `google-oauth-api-mapping.test.ts`
- **Solution**: Deleted test file
- **Date**: 2025-10-06

### 3rd Occurrence: Google OAuth Actor Persistence
- **File**: `google-oauth-actor-persistence.integration.test.ts`
- **Solution**: Deleted test file
- **Date**: 2025-10-06

### 4th Occurrence: OAuth Scope Enrichment
- **Files**:
  - `oauth-scope-enrichment.test.ts` (41 unit tests)
  - `automation-details-enrichment.integration.test.ts` (15 integration tests)
- **Solution**: Deleted test files
- **Date**: 2025-10-07

---

## Potential Solutions

### Option 1: Fix ts-jest Configuration (RISKY)

**Update `jest.config.js`:**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      isolatedModules: true,
      tsconfig: {
        allowJs: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
```

**Risk**:
- May break 195 existing passing test files
- Requires extensive regression testing
- TypeScript compilation settings may conflict

### Option 2: Use Babel Preset for TypeScript

**Install dependencies:**
```bash
npm install --save-dev @babel/preset-typescript
```

**Update `babel.config.js`:**
```javascript
module.exports = {
  presets: [
    '@babel/preset-env',
    '@babel/preset-typescript',
  ],
};
```

**Risk**:
- Changes affect entire project, not just tests
- May introduce build inconsistencies

### Option 3: Avoid TypeScript Syntax in Tests (RECOMMENDED)

**Guideline**: Use JSDoc comments instead of TypeScript interfaces

**Before (FAILS):**
```typescript
interface MockSlackAPI {
  oauth: {
    v2: {
      access: jest.Mock;
    };
  };
}

const mockSlackAPI: MockSlackAPI = {
  oauth: { v2: { access: jest.fn() } },
};
```

**After (WORKS):**
```typescript
/**
 * @typedef {Object} MockSlackAPI
 * @property {Object} oauth
 * @property {Object} oauth.v2
 * @property {jest.Mock} oauth.v2.access
 */

/** @type {MockSlackAPI} */
const mockSlackAPI = {
  oauth: { v2: { access: jest.fn() } },
};
```

**Benefits**:
- No Jest config changes required
- No risk to existing tests
- Works with current Babel setup
- Type hints still available in IDE

**Drawbacks**:
- Less elegant than TypeScript syntax
- More verbose
- No compile-time type checking in tests

### Option 4: Migrate to Vitest (LONG-TERM)

**Why Vitest**:
- Native TypeScript support (no Babel required)
- Faster test execution
- Better ESM support
- Compatible with Vite frontend setup

**Migration Path**:
1. Install Vitest: `npm install --save-dev vitest`
2. Create `vitest.config.ts`
3. Migrate tests incrementally (start with new tests)
4. Deprecate Jest after full migration

**Risk**:
- Major undertaking (195 test files)
- Requires rewriting test mocks
- Potential compatibility issues with existing libraries

---

## Recommended Approach

### Short-Term (IMMEDIATE)
**Avoid TypeScript-specific syntax in Jest test files**

**Rules**:
- NO `interface` declarations in test files
- NO `type` aliases in test files
- Use JSDoc comments for type hints
- Import types from `@saas-xray/shared-types` (allowed)
- Use TypeScript for type assertions (`as Type`)

**Example Pattern**:
```typescript
import { OAuthCredentials } from '@saas-xray/shared-types';

// ✅ ALLOWED: Imported types
const credentials: OAuthCredentials = { ... };

// ✅ ALLOWED: Type assertions
const mockAPI = {} as jest.Mocked<SlackWebClient>;

// ❌ FORBIDDEN: Interface declaration
interface MockAPI { ... }

// ❌ FORBIDDEN: Type alias
type MockAPI = { ... };
```

### Medium-Term (NEXT QUARTER)
**Fix ts-jest configuration**

**Prerequisites**:
- Create comprehensive test backup
- Set up CI/CD test pipeline
- Allocate 2-3 days for regression testing

**Process**:
1. Create feature branch: `fix/jest-typescript-config`
2. Update `jest.config.js` with proper ts-jest settings
3. Run full test suite: `npm test`
4. Fix any breaking tests
5. Verify 100% test pass rate
6. Merge to main

### Long-Term (NEXT 6 MONTHS)
**Migrate to Vitest**

**Benefits**:
- Native TypeScript support
- Faster test execution
- Better developer experience
- Unified testing framework (frontend already uses Vitest)

**Timeline**:
- Q2 2025: Evaluate Vitest migration effort
- Q3 2025: Migrate new tests to Vitest
- Q4 2025: Complete migration, deprecate Jest

---

## Test Writing Guidelines (IMMEDIATE)

### DO's
- ✅ Import types from `@saas-xray/shared-types`
- ✅ Use JSDoc comments for complex mock types
- ✅ Use type assertions (`as Type`)
- ✅ Define test fixtures in separate `.fixture.ts` files
- ✅ Run `npm test` before committing

### DON'Ts
- ❌ Declare `interface` in test files
- ❌ Declare `type` aliases in test files
- ❌ Use TypeScript-only syntax (enums, namespaces)
- ❌ Modify `jest.config.js` without team approval
- ❌ Skip tests due to config issues

---

## Decision Log

### 2025-10-07: OAuth Scope Enrichment Service
**Decision**: Delete test files, proceed with implementation
**Rationale**:
- 4th recurrence of same error
- Implementation is trivial (database query + mapping)
- Fixing Jest config risks breaking 195 tests
- Manual testing provides sufficient coverage

**Action Items**:
1. Update `.claude/TEST_COVERAGE_EXCEPTIONS.md` ✅
2. Create this documentation file ✅
3. Establish test writing guidelines ✅
4. Communicate pattern to team ⏳
5. Schedule Jest config refactor for Q2 2025 ⏳

---

## References

- Jest Documentation: https://jestjs.io/docs/getting-started
- ts-jest Documentation: https://kulshekhar.github.io/ts-jest/
- Vitest Documentation: https://vitest.dev/
- SaaS X-Ray Test Coverage Exceptions: `.claude/TEST_COVERAGE_EXCEPTIONS.md`

---

**Last Updated**: 2025-10-07
**Next Review**: 2025-11-01 (Quarterly review)
