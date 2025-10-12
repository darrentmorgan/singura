# CI/CD Verification System - Testing Guide

## Test Plan

This document outlines how to test the CI/CD Pre-Flight Verification System to ensure it works correctly.

## Prerequisites

Before testing:
```bash
cd /Users/darrenmorgan/AI_Projects/singura
pnpm install
docker compose up -d postgres redis
```

## Test Suite

### Test 1: Script Syntax Validation

Verify all scripts have valid bash syntax:

```bash
# Test syntax
bash -n scripts/verify-ci.sh && echo "✅ verify-ci.sh syntax OK"
bash -n scripts/quick-check.sh && echo "✅ quick-check.sh syntax OK"
bash -n scripts/install-hooks.sh && echo "✅ install-hooks.sh syntax OK"

# Verify executable permissions
ls -la scripts/*.sh | grep "^-rwxr-xr-x"
```

**Expected:** All scripts pass syntax check and have executable permissions.

---

### Test 2: Help Output

Test help messages display correctly:

```bash
./scripts/verify-ci.sh --help
```

**Expected:**
- Clear usage instructions
- List of all options
- Examples
- Exit code 0

---

### Test 3: Quick Check (Successful Run)

Test quick check with no changes:

```bash
./scripts/quick-check.sh
```

**Expected:**
- Linting passes (Frontend & Backend)
- Security audit passes
- Unit tests pass
- Duration < 30 seconds
- Exit code 0

---

### Test 4: Quick Check with Auto-Fix

Test auto-fix functionality:

```bash
# Introduce a linting error
echo "const unused = 'test';" >> frontend/src/test-lint.ts

# Run with fix
./scripts/quick-check.sh --fix

# Verify fix was applied
cat frontend/src/test-lint.ts

# Cleanup
rm frontend/src/test-lint.ts
```

**Expected:**
- Auto-fix attempts to resolve issues
- Modified files show fixes

---

### Test 5: Full Verification (Skip E2E)

Test full verification without E2E tests:

```bash
./scripts/verify-ci.sh --skip-e2e
```

**Expected:**
- All blocking checks pass:
  - ✅ ESLint (Frontend)
  - ✅ ESLint (Backend)
  - ✅ Security Audit
  - ✅ Frontend Tests
  - ✅ Backend Tests
  - ✅ Build Verification
- E2E tests skipped
- TypeScript check runs (non-blocking)
- Duration ~40 seconds
- Exit code 0
- Logs saved to `.ci-verification-logs/`

---

### Test 6: Full Verification (With E2E)

Test full verification including E2E tests:

**Prerequisites:**
```bash
# Terminal 1: Start backend
cd backend && pnpm run dev

# Terminal 2: Start frontend
cd frontend && pnpm run dev

# Wait for servers to be ready
```

**Run test:**
```bash
# Terminal 3: Run verification
./scripts/verify-ci.sh
```

**Expected:**
- All checks pass including E2E
- Duration ~70 seconds
- Exit code 0

---

### Test 7: Lint Failure Detection

Test that linting failures are caught:

```bash
# Introduce error
echo "const x = " >> backend/src/test-error.ts

# Run verification
./scripts/quick-check.sh

# Check exit code
echo $?

# Cleanup
rm backend/src/test-error.ts
```

**Expected:**
- Lint check fails
- Error message displayed
- Last 20 lines of output shown
- Log file path provided
- Exit code 1

---

### Test 8: Test Failure Detection

Test that test failures are caught:

```bash
# Create failing test
cat > frontend/src/test-fail.test.ts << 'EOF'
import { describe, it, expect } from 'vitest';

describe('Failing test', () => {
  it('should fail', () => {
    expect(true).toBe(false);
  });
});
EOF

# Run verification
./scripts/quick-check.sh

# Check exit code
echo $?

# Cleanup
rm frontend/src/test-fail.test.ts
```

**Expected:**
- Test check fails
- Error details shown
- Exit code 1

---

### Test 9: Security Audit Detection

Test security vulnerability detection:

```bash
# Check current audit status
cd frontend && pnpm audit --audit-level=high
cd backend && pnpm audit --audit-level=high

# Run verification
./scripts/verify-ci.sh --skip-e2e
```

**Expected:**
- Security audit runs successfully
- If vulnerabilities exist, check fails
- Exit code 0 if no high-severity issues

---

### Test 10: Build Failure Detection

Test that build failures are caught:

```bash
# Introduce TypeScript error
echo "const x: string = 123;" >> backend/src/test-build-error.ts

# Run verification
./scripts/verify-ci.sh --skip-e2e

# Check exit code
echo $?

# Cleanup
rm backend/src/test-build-error.ts
```

**Expected:**
- Build verification fails
- Error message displayed
- Exit code 1

---

### Test 11: Hook Installation

Test git hook installation:

```bash
# Backup existing hook (if any)
[ -f .git/hooks/pre-push ] && cp .git/hooks/pre-push .git/hooks/pre-push.test-backup

# Run installer
./scripts/install-hooks.sh

# Verify hook exists
ls -la .git/hooks/pre-push

# Check hook is executable
[ -x .git/hooks/pre-push ] && echo "✅ Hook is executable"

# Test hook manually
.git/hooks/pre-push

# Restore backup (if any)
[ -f .git/hooks/pre-push.test-backup ] && mv .git/hooks/pre-push.test-backup .git/hooks/pre-push
```

**Expected:**
- Hook installed successfully
- Backup created if previous hook existed
- Hook is executable
- Hook runs verification
- Summary displayed

---

### Test 12: Pre-Push Hook Blocking

Test that hook prevents bad pushes:

```bash
# Install hook
./scripts/install-hooks.sh

# Create failing code
echo "const error = " >> backend/src/test-push-block.ts

# Try to push (will be blocked)
git add backend/src/test-push-block.ts
git commit -m "test: intentional error"
git push origin HEAD:test-verification-branch

# Check that push was blocked
echo $?

# Cleanup
git reset HEAD~1
rm backend/src/test-push-block.ts
```

**Expected:**
- Pre-push hook runs
- Verification fails
- Push is blocked
- Error message displayed
- Exit code 1

---

### Test 13: Pre-Push Hook Bypass

Test bypass functionality:

```bash
# Create change
echo "// test" >> backend/src/test-bypass.ts

# Commit
git add backend/src/test-bypass.ts
git commit -m "test: bypass test"

# Push with bypass
git push --no-verify origin HEAD:test-verification-branch

# Check result
echo $?

# Cleanup
git push origin :test-verification-branch
git reset HEAD~1
rm backend/src/test-bypass.ts
```

**Expected:**
- Hook is bypassed
- Push succeeds
- No verification runs
- Exit code 0

---

### Test 14: Parallel Execution

Test that parallel checks work correctly:

```bash
# Run verification and observe parallel execution
./scripts/verify-ci.sh --skip-e2e 2>&1 | tee test-parallel.log

# Check log for parallel execution
grep -E "(ESLint Frontend|ESLint Backend)" test-parallel.log

# Cleanup
rm test-parallel.log
```

**Expected:**
- Multiple checks run in parallel
- Faster execution than sequential
- All results captured correctly

---

### Test 15: Log File Creation

Test log file generation:

```bash
# Run verification
./scripts/verify-ci.sh --skip-e2e

# Check logs created
ls -lt .ci-verification-logs/

# Verify log content
cat .ci-verification-logs/verify-ci-*.log | head -1
```

**Expected:**
- Summary log created
- Individual check logs created
- Logs contain useful information
- Log directory exists

---

### Test 16: NPM Script Integration

Test npm/pnpm script shortcuts:

```bash
# Test all shortcuts
pnpm run verify --help
pnpm run verify:quick --help
pnpm run hooks:install

# Verify they work
echo $?
```

**Expected:**
- All shortcuts work correctly
- Help output displayed
- Exit code 0

---

### Test 17: TypeScript Non-Blocking

Test that TypeScript errors don't block:

```bash
# Verify current TypeScript status
cd backend && pnpm exec tsc --noEmit 2>&1 | wc -l

# Run full verification
./scripts/verify-ci.sh --skip-e2e

# Check exit code (should be 0 even with TS errors)
echo $?
```

**Expected:**
- TypeScript errors reported as warnings
- Verification still passes
- Exit code 0

---

### Test 18: Docker Services Check

Test Docker service detection:

```bash
# Stop Docker services
docker compose down

# Run verification
./scripts/verify-ci.sh --skip-e2e

# Observe auto-start
docker ps | grep postgres

# Cleanup
docker compose up -d postgres redis
```

**Expected:**
- Script detects missing services
- Auto-starts Docker services
- Tests run successfully

---

### Test 19: E2E Server Detection

Test E2E server requirement checking:

```bash
# Ensure servers are NOT running
pkill -f "vite"
pkill -f "ts-node"

# Run full verification
./scripts/verify-ci.sh

# Check behavior
echo $?
```

**Expected:**
- Script detects missing servers
- Warns user
- Skips E2E tests
- Exit code 0 (other checks pass)

---

### Test 20: Coverage Threshold

Test coverage requirements:

```bash
# Run with coverage
cd frontend && pnpm test -- --run --coverage

# Check coverage percentage
cat coverage/coverage-summary.json | grep -A 4 total

# Run verification
cd .. && ./scripts/verify-ci.sh --skip-e2e
```

**Expected:**
- Coverage measured
- 80%+ coverage required
- Fails if below threshold

---

## Automated Test Script

Run all tests automatically:

```bash
#!/usr/bin/env bash

echo "Running CI Verification System Tests..."

# Test 1: Syntax
echo "Test 1: Script Syntax..."
bash -n scripts/verify-ci.sh && bash -n scripts/quick-check.sh && bash -n scripts/install-hooks.sh
[ $? -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL"

# Test 2: Help
echo "Test 2: Help Output..."
./scripts/verify-ci.sh --help > /dev/null
[ $? -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL"

# Test 3: Quick Check
echo "Test 3: Quick Check..."
./scripts/quick-check.sh
[ $? -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL"

# Test 16: NPM Scripts
echo "Test 16: NPM Script Integration..."
pnpm run verify --help > /dev/null
[ $? -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL"

echo "Basic tests complete!"
```

## Success Criteria

All tests should:
- ✅ Execute without errors
- ✅ Produce expected output
- ✅ Return correct exit codes
- ✅ Create proper log files
- ✅ Handle errors gracefully
- ✅ Match CI/CD behavior

## Post-Testing

After testing:
```bash
# Clean up test artifacts
rm -rf .ci-verification-logs/
git reset --hard HEAD
git clean -fd

# Restore Docker
docker compose up -d postgres redis
```

## Continuous Testing

Run verification regularly:
```bash
# Daily smoke test
./scripts/quick-check.sh

# Before release
./scripts/verify-ci.sh

# After changes to scripts
./scripts/verify-ci.sh --skip-e2e
```

## Reporting Issues

If tests fail:
1. Note which test failed
2. Check log files in `.ci-verification-logs/`
3. Compare with CI/CD pipeline output
4. Document reproduction steps
5. Fix scripts accordingly

## Test Coverage

Current test coverage:
- ✅ Script syntax validation
- ✅ Help output
- ✅ Quick check flow
- ✅ Full verification flow
- ✅ Error detection (lint, test, build, security)
- ✅ Hook installation
- ✅ Hook blocking
- ✅ Hook bypass
- ✅ Parallel execution
- ✅ Log generation
- ✅ NPM integration
- ✅ TypeScript non-blocking
- ✅ Docker service handling
- ✅ E2E server detection
- ✅ Coverage thresholds

**Total: 20 test scenarios**
