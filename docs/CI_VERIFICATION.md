# CI/CD Pre-Flight Verification System

## Overview

The CI/CD Pre-Flight Verification System prevents pipeline failures by running all CI/CD checks locally before code is pushed to the remote repository. This system mirrors the exact checks performed by GitHub Actions, ensuring that your code will pass CI before you push.

## Table of Contents

- [Quick Start](#quick-start)
- [Available Scripts](#available-scripts)
- [Checks Performed](#checks-performed)
- [Usage Patterns](#usage-patterns)
- [Troubleshooting](#troubleshooting)
- [CI/CD Pipeline Architecture](#cicd-pipeline-architecture)
- [Advanced Usage](#advanced-usage)

## Quick Start

### 1. Install Git Hooks (Recommended)

```bash
# Install pre-push hook for automatic verification
./scripts/install-hooks.sh
```

After installation, every `git push` will automatically run verification checks. The hook will prevent pushing if critical checks fail.

### 2. Manual Verification

```bash
# Full verification (recommended before pushing)
./scripts/verify-ci.sh

# Quick check for rapid iteration (< 30s)
./scripts/quick-check.sh

# Full verification, skip E2E tests (~40s vs ~70s)
./scripts/verify-ci.sh --skip-e2e

# Auto-fix linting issues
./scripts/verify-ci.sh --fix
./scripts/quick-check.sh --fix
```

## Available Scripts

### `verify-ci.sh` - Full Verification

**Purpose:** Run complete CI/CD verification matching GitHub Actions pipeline.

**Usage:**
```bash
./scripts/verify-ci.sh [OPTIONS]
```

**Options:**
- `--skip-e2e` - Skip E2E tests (faster, ~40s vs ~70s)
- `--fix` - Auto-fix linting issues
- `--help` - Show usage information

**What it checks:**
1. ✅ ESLint (Frontend) - BLOCKING
2. ✅ ESLint (Backend) - BLOCKING
3. ✅ Security Audit - BLOCKING
4. ✅ Frontend Tests with Coverage - BLOCKING
5. ✅ Backend Tests with Coverage - BLOCKING
6. ✅ Build Verification (Shared Types, Frontend, Backend) - BLOCKING
7. ✅ E2E Tests - BLOCKING (skippable with `--skip-e2e`)
8. ⚠️ TypeScript Type Check - NON-BLOCKING

**Exit Codes:**
- `0` - All critical checks passed
- `1` - One or more checks failed

**Logs:**
- All output saved to `.ci-verification-logs/verify-ci-TIMESTAMP.log`
- Individual check logs saved for debugging

### `quick-check.sh` - Fast Validation

**Purpose:** Rapid validation for development iteration. Skips coverage and E2E tests.

**Usage:**
```bash
./scripts/quick-check.sh [OPTIONS]
```

**Options:**
- `--fix` - Auto-fix linting issues

**What it checks:**
1. ESLint (Frontend & Backend)
2. Security Audit
3. Unit Tests (no coverage)

**Duration:** < 30 seconds

**When to use:**
- During active development
- Before committing code
- Quick sanity checks

**Note:** Always run full verification (`verify-ci.sh`) before pushing!

### `install-hooks.sh` - Git Hook Installation

**Purpose:** Install pre-push hook for automatic CI verification.

**Usage:**
```bash
./scripts/install-hooks.sh
```

**What it does:**
- Installs pre-push hook to `.git/hooks/pre-push`
- Backs up existing hook (if present)
- Runs `verify-ci.sh --skip-e2e` on every push
- Prevents push if critical checks fail

**Bypass hook:**
```bash
# Emergency use only!
git push --no-verify
```

## Checks Performed

### 1. ESLint - Code Quality (BLOCKING)

**What:** Validates code quality and style using ESLint rules.

**Runs:**
- Frontend: `pnpm run lint` in `frontend/`
- Backend: `pnpm run lint` in `backend/`

**Common Failures:**
- Unused variables
- Incorrect TypeScript usage
- React hooks violations
- Import/export issues

**Fix:**
```bash
# Auto-fix many issues
./scripts/verify-ci.sh --fix

# Or manually
cd frontend && pnpm run lint:fix
cd backend && pnpm run lint:fix
```

### 2. Security Audit (BLOCKING)

**What:** Scans dependencies for high-severity vulnerabilities.

**Runs:**
- Frontend: `pnpm audit --audit-level=high`
- Backend: `pnpm audit --audit-level=high`

**Common Failures:**
- High-severity vulnerabilities in dependencies
- Outdated packages with security issues

**Fix:**
```bash
# Check vulnerabilities
cd frontend && pnpm audit
cd backend && pnpm audit

# Auto-fix (if available)
pnpm audit fix --audit-level=high

# Manual update
pnpm update <package-name>
```

### 3. Frontend Tests (BLOCKING)

**What:** Runs frontend unit and integration tests with coverage.

**Runs:**
- `pnpm test -- --run --coverage` in `frontend/`

**Coverage Requirements:**
- Minimum: 80% for new code
- Target: 85%+

**Common Failures:**
- Component rendering errors
- State management issues
- API client failures
- Missing test coverage

**Fix:**
```bash
cd frontend

# Run tests in watch mode
pnpm test

# Run specific test file
pnpm test -- path/to/test.test.tsx

# Update snapshots (if needed)
pnpm test -- -u

# View coverage report
pnpm test -- --coverage
```

### 4. Backend Tests (BLOCKING)

**What:** Runs backend unit, integration, and security tests with coverage.

**Runs:**
- Database migrations: `pnpm run migrate:test`
- Tests: `pnpm test -- --run --coverage`

**Coverage Requirements:**
- Minimum: 80% for new code
- Security code: 100% required
- OAuth flows: 100% required

**Common Failures:**
- Database connection issues
- Migration failures
- Security test violations
- API endpoint errors

**Fix:**
```bash
cd backend

# Ensure Docker services are running
docker compose up -d postgres redis

# Run migrations
pnpm run migrate:test

# Run tests
pnpm test

# Run specific test suite
pnpm test -- tests/security
pnpm test -- tests/api

# Debug failing test
pnpm test -- --testNamePattern="test name"
```

### 5. Build Verification (BLOCKING)

**What:** Verifies that production builds complete successfully.

**Runs:**
1. Shared Types: `pnpm run build` in `shared-types/`
2. Frontend: `pnpm run build` in `frontend/`
3. Backend: `pnpm run build` in `backend/`

**Common Failures:**
- TypeScript compilation errors
- Missing dependencies
- Build configuration issues
- Import path errors

**Fix:**
```bash
# Check TypeScript errors
cd shared-types && pnpm exec tsc --noEmit
cd frontend && pnpm exec tsc --noEmit
cd backend && pnpm exec tsc --noEmit

# Check dependencies
pnpm install

# Clean build
rm -rf dist/ && pnpm run build
```

### 6. E2E Tests (BLOCKING, skippable)

**What:** End-to-end tests using Playwright.

**Runs:**
- `pnpm run test:e2e` in `frontend/`

**Prerequisites:**
- Backend server running on `:3000`
- Frontend server running on `:4200`
- PostgreSQL and Redis running
- Playwright browsers installed

**Common Failures:**
- Servers not running
- Timing issues
- Authentication failures
- UI element selectors changed

**Fix:**
```bash
# Start servers in separate terminals
cd backend && pnpm run dev
cd frontend && pnpm run dev

# Install Playwright browsers
cd frontend && pnpm exec playwright install --with-deps chromium

# Run E2E tests
pnpm run test:e2e

# Debug mode
pnpm run test:e2e:debug

# UI mode (interactive)
pnpm run test:e2e:ui

# View report
pnpm run test:e2e:report
```

### 7. TypeScript Type Check (NON-BLOCKING)

**What:** Validates TypeScript types across all workspaces.

**Runs:**
- Shared Types: `pnpm exec tsc --noEmit`
- Frontend: `pnpm exec tsc --noEmit`
- Backend: `pnpm exec tsc --noEmit`

**Status:** NON-BLOCKING (warnings only)

**Why non-blocking:**
- Current codebase has ~78 TypeScript errors being fixed incrementally
- CI tracks these separately
- Target: 0 errors

**Fix:**
```bash
# Check errors in each workspace
cd shared-types && pnpm exec tsc --noEmit
cd frontend && pnpm exec tsc --noEmit
cd backend && pnpm exec tsc --noEmit

# Count errors
cd backend && pnpm run verify:types-count
```

## Usage Patterns

### Before First Commit

```bash
# Quick check during development
./scripts/quick-check.sh

# If issues, fix them
./scripts/quick-check.sh --fix
```

### Before Pushing (Manual)

```bash
# Full verification
./scripts/verify-ci.sh

# Or skip E2E if servers aren't running
./scripts/verify-ci.sh --skip-e2e
```

### With Git Hooks (Automatic)

```bash
# Install once
./scripts/install-hooks.sh

# Now every push runs verification automatically
git push

# Bypass in emergencies (NOT recommended)
git push --no-verify
```

### Continuous Development

```bash
# Quick iterations
while developing:
  make changes
  ./scripts/quick-check.sh
  git commit

# Before push
./scripts/verify-ci.sh --skip-e2e
git push
```

## Troubleshooting

### Problem: Linting fails with many errors

**Solution:**
```bash
# Auto-fix most issues
./scripts/verify-ci.sh --fix

# Check remaining errors
cd frontend && pnpm run lint
cd backend && pnpm run lint
```

### Problem: Security audit fails

**Solution:**
```bash
# View vulnerabilities
cd frontend && pnpm audit
cd backend && pnpm audit

# Try auto-fix
pnpm audit fix

# Update specific package
pnpm update <package-name>

# Check if fixed
pnpm audit --audit-level=high
```

### Problem: Tests fail locally but pass in CI

**Possible causes:**
1. Environment variables missing
2. Docker services not running
3. Stale build artifacts

**Solution:**
```bash
# Check environment
cp .env.example .env
# Edit .env with valid values

# Restart Docker services
docker compose down
docker compose up -d postgres redis

# Clean and rebuild
rm -rf dist/ node_modules/
pnpm install
pnpm run build
```

### Problem: E2E tests fail - servers not running

**Solution:**
```bash
# Terminal 1: Start backend
cd backend && pnpm run dev

# Terminal 2: Start frontend
cd frontend && pnpm run dev

# Terminal 3: Run E2E tests
cd frontend && pnpm run test:e2e

# OR skip E2E in verification
./scripts/verify-ci.sh --skip-e2e
```

### Problem: Build fails with TypeScript errors

**Solution:**
```bash
# Check which workspace has errors
cd shared-types && pnpm exec tsc --noEmit
cd frontend && pnpm exec tsc --noEmit
cd backend && pnpm exec tsc --noEmit

# Fix errors starting with shared-types
cd shared-types
# Fix errors
pnpm run build

# Then frontend and backend
```

### Problem: Pre-push hook not running

**Solution:**
```bash
# Reinstall hooks
./scripts/install-hooks.sh

# Check hook is executable
ls -la .git/hooks/pre-push

# Make executable if needed
chmod +x .git/hooks/pre-push

# Test manually
.git/hooks/pre-push
```

### Problem: Verification is too slow

**Options:**

```bash
# 1. Use quick check for development
./scripts/quick-check.sh  # < 30s

# 2. Skip E2E tests
./scripts/verify-ci.sh --skip-e2e  # ~40s vs ~70s

# 3. Run individual checks
cd frontend && pnpm run lint
cd frontend && pnpm test
```

## CI/CD Pipeline Architecture

### Local Verification Flow

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Developer runs: ./scripts/verify-ci.sh                     │
│                                                             │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 1: Code Quality (Parallel)                           │
├─────────────────────────────────────────────────────────────┤
│  ├─ ESLint Frontend                                         │
│  └─ ESLint Backend                                          │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 2: Security (Parallel)                               │
├─────────────────────────────────────────────────────────────┤
│  ├─ Security Audit Frontend                                 │
│  └─ Security Audit Backend                                  │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 3: Tests (Sequential)                                │
├─────────────────────────────────────────────────────────────┤
│  ├─ Frontend Tests + Coverage                               │
│  └─ Backend Tests + Coverage                                │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 4: Build (Sequential)                                │
├─────────────────────────────────────────────────────────────┤
│  ├─ Build Shared Types                                      │
│  ├─ Build Frontend (Parallel)                               │
│  └─ Build Backend (Parallel)                                │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 5: E2E Tests (Optional)                              │
├─────────────────────────────────────────────────────────────┤
│  └─ Playwright E2E Tests                                    │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 6: TypeScript (Non-blocking)                         │
├─────────────────────────────────────────────────────────────┤
│  ├─ TypeCheck Shared Types                                  │
│  ├─ TypeCheck Frontend                                      │
│  └─ TypeCheck Backend                                       │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
                  ┌─────────┴─────────┐
                  │                   │
                  ▼                   ▼
            ┌─────────┐         ┌─────────┐
            │  PASS   │         │  FAIL   │
            │  ✅     │         │  ❌     │
            └─────────┘         └─────────┘
                  │                   │
                  ▼                   ▼
          Ready to Push        Fix Issues
```

### GitHub Actions Flow

The CI pipeline (`.github/workflows/pr-ci.yml`) mirrors local verification:

```
Pull Request Opened/Updated
            │
            ▼
┌─────────────────────────────────────────┐
│  Setup Job                              │
│  - Install dependencies                 │
│  - Build shared types                   │
└───────────────┬─────────────────────────┘
                │
        ┌───────┴───────┬──────────────┬──────────────┬──────────────┐
        ▼               ▼              ▼              ▼              ▼
    TypeCheck        Lint         Security      Test Frontend   Test Backend
  (non-blocking)   (blocking)    (blocking)      (blocking)      (blocking)
                        │              │              │              │
                        └──────┬───────┴──────┬───────┴──────────────┘
                               ▼              ▼
                           E2E Tests      Build Verification
                          (blocking)       (blocking)
                               │              │
                               └──────┬───────┘
                                      ▼
                              All Jobs Complete
                                      │
                              ┌───────┴────────┐
                              ▼                ▼
                          Success          Failure
                              │                │
                              ▼                ▼
                      Auto-merge (if      Block Merge
                      labeled)
```

### Comparison: Local vs CI

| Check | Local Script | GitHub Actions | Blocking |
|-------|-------------|----------------|----------|
| ESLint | ✅ | ✅ | Yes |
| Security Audit | ✅ | ✅ | Yes |
| Frontend Tests | ✅ | ✅ | Yes |
| Backend Tests | ✅ | ✅ | Yes |
| E2E Tests | ✅ (skippable) | ✅ | Yes |
| Build | ✅ | ✅ | Yes |
| TypeScript | ✅ (warning) | ✅ (warning) | No |
| Coverage Upload | ❌ | ✅ (Codecov) | No |

## Advanced Usage

### Running Individual Checks

```bash
# Lint only
cd frontend && pnpm run lint
cd backend && pnpm run lint

# Security only
cd frontend && pnpm audit --audit-level=high
cd backend && pnpm audit --audit-level=high

# Tests only
cd frontend && pnpm test -- --run
cd backend && pnpm test -- --run

# Build only
cd shared-types && pnpm run build
cd frontend && pnpm run build
cd backend && pnpm run build

# TypeScript only
cd frontend && pnpm exec tsc --noEmit
cd backend && pnpm exec tsc --noEmit
```

### Customizing Pre-Push Hook

Edit `.git/hooks/pre-push`:

```bash
# Skip E2E tests (faster)
if "$VERIFY_SCRIPT" --skip-e2e; then

# Always auto-fix linting
if "$VERIFY_SCRIPT" --skip-e2e --fix; then

# Run quick check instead
if "$QUICK_CHECK_SCRIPT"; then
```

### Viewing Logs

```bash
# List all logs
ls -lt .ci-verification-logs/

# View latest verification log
cat .ci-verification-logs/verify-ci-*.log | tail -1

# View specific check log
cat .ci-verification-logs/check-Frontend-Tests-*.log
```

### Integration with IDE

**VS Code Tasks:**

Add to `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "CI: Quick Check",
      "type": "shell",
      "command": "./scripts/quick-check.sh",
      "group": "test",
      "presentation": {
        "reveal": "always",
        "panel": "new"
      }
    },
    {
      "label": "CI: Full Verification",
      "type": "shell",
      "command": "./scripts/verify-ci.sh --skip-e2e",
      "group": "test",
      "presentation": {
        "reveal": "always",
        "panel": "new"
      }
    }
  ]
}
```

## Best Practices

### Daily Development

1. **Quick checks frequently:**
   ```bash
   # After each feature
   ./scripts/quick-check.sh
   ```

2. **Full verification before push:**
   ```bash
   # Before git push
   ./scripts/verify-ci.sh --skip-e2e
   ```

3. **E2E tests before PR:**
   ```bash
   # Before opening PR
   ./scripts/verify-ci.sh  # includes E2E
   ```

### Handling Failures

1. **Fix immediately** - Don't accumulate failures
2. **Use auto-fix** - `--fix` flag for linting
3. **Run specific tests** - Debug individual failures
4. **Check logs** - Review `.ci-verification-logs/`

### Team Guidelines

1. **Install hooks** - All team members should run `./scripts/install-hooks.sh`
2. **Never bypass** - Avoid `--no-verify` unless emergency
3. **Fix TypeScript** - Work towards 0 errors
4. **Maintain coverage** - Keep tests at 80%+

## Support

### Common Commands

```bash
# Get help
./scripts/verify-ci.sh --help

# Install hooks
./scripts/install-hooks.sh

# Quick check
./scripts/quick-check.sh

# Full verification
./scripts/verify-ci.sh

# Skip E2E (faster)
./scripts/verify-ci.sh --skip-e2e

# Auto-fix linting
./scripts/verify-ci.sh --fix
```

### Log Files

All verification runs save logs to:
```
.ci-verification-logs/
├── verify-ci-20251012_143022.log      # Summary
├── check-ESLint-Frontend-*.log         # Individual checks
├── check-ESLint-Backend-*.log
├── check-Security-Audit-*.log
└── ...
```

### Need Help?

1. Check logs in `.ci-verification-logs/`
2. Run individual checks to isolate issue
3. Review this documentation
4. Check GitHub Actions output for comparison
5. Ask team for assistance

## Summary

The CI/CD Pre-Flight Verification System ensures code quality and prevents pipeline failures by:

- ✅ Running all CI checks locally
- ✅ Providing fast feedback
- ✅ Preventing bad pushes with hooks
- ✅ Matching GitHub Actions exactly
- ✅ Supporting rapid iteration with quick checks
- ✅ Auto-fixing common issues

**Install it once, benefit forever:**

```bash
./scripts/install-hooks.sh
```

Now every push is verified automatically! 🚀
