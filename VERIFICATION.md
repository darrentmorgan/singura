# CI/CD Verification Quick Start

## One-Time Setup (Install Git Hooks)

Install the pre-push hook to automatically verify code before pushing:

```bash
pnpm run hooks:install
```

After installation, every `git push` will automatically run CI verification. Failed checks will prevent the push.

## Daily Usage

### During Development (Fast)

```bash
# Quick check (< 30s) - use frequently
pnpm run verify:quick

# Auto-fix linting issues
pnpm run verify:quick --fix
```

### Before Pushing

```bash
# Option 1: Let the pre-push hook handle it (automatic)
git push  # Hook runs verify:skip-e2e automatically

# Option 2: Run manually before pushing
pnpm run verify:skip-e2e

# Option 3: Full verification including E2E
pnpm run verify
```

### Auto-fix Linting

```bash
pnpm run verify:fix
```

## Available Commands

| Command | Description | Duration |
|---------|-------------|----------|
| `pnpm run verify` | Full CI verification (all checks) | ~70s |
| `pnpm run verify:quick` | Fast check (lint, security, tests) | < 30s |
| `pnpm run verify:skip-e2e` | Full check, skip E2E tests | ~40s |
| `pnpm run verify:fix` | Full check + auto-fix linting | ~70s |
| `pnpm run hooks:install` | Install pre-push hook | instant |

## What Gets Checked

### Blocking Checks (Must Pass)
- ✅ ESLint (Frontend & Backend)
- ✅ Security Audit (High-severity vulnerabilities)
- ✅ Frontend Tests with Coverage (80%+ required)
- ✅ Backend Tests with Coverage (80%+ required)
- ✅ Build Verification (Shared Types, Frontend, Backend)
- ✅ E2E Tests (skippable with `verify:skip-e2e`)

### Non-Blocking Checks (Warnings)
- ⚠️ TypeScript Type Check (tracked separately, ~78 errors being fixed)

## When Checks Fail

### View Details
```bash
# Check latest log
ls -lt .ci-verification-logs/

# View summary
cat .ci-verification-logs/verify-ci-*.log | head -1

# View specific check
cat .ci-verification-logs/check-ESLint-Frontend-*.log
```

### Common Fixes

**Linting Issues:**
```bash
pnpm run verify:fix  # Auto-fix
```

**Security Issues:**
```bash
cd frontend && pnpm audit
cd backend && pnpm audit
pnpm audit fix
```

**Test Failures:**
```bash
cd frontend && pnpm test
cd backend && pnpm test
```

**Build Failures:**
```bash
cd shared-types && pnpm exec tsc --noEmit
cd frontend && pnpm exec tsc --noEmit
cd backend && pnpm exec tsc --noEmit
```

## Bypass Hook (Emergency Only!)

```bash
# NOT recommended - use only in emergencies
git push --no-verify
```

## Documentation

Full documentation: [docs/CI_VERIFICATION.md](docs/CI_VERIFICATION.md)

## Support

```bash
# Show help
./scripts/verify-ci.sh --help

# Check logs
ls .ci-verification-logs/

# Run individual checks
cd frontend && pnpm run lint
cd frontend && pnpm test
cd backend && pnpm run lint
cd backend && pnpm test
```

---

**Remember:** Install hooks once, benefit forever! 🚀

```bash
pnpm run hooks:install
```
