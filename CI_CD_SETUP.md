# CI/CD Pipeline Setup - Singura AI

## Overview

This document describes the automated CI/CD pipeline for Singura AI (formerly SaaS X-Ray). The pipeline runs on every Pull Request to ensure code quality, security, and functionality before merging.

## GitHub Actions Workflow

**File**: `.github/workflows/pr-ci.yml`

### Pipeline Jobs

The CI/CD pipeline consists of 10 jobs that run in parallel (where possible) to maximize efficiency:

#### 1. **Setup Dependencies** (`setup`)
- Installs Node.js 20 and pnpm 8
- Caches pnpm store for faster subsequent runs
- Installs dependencies for frontend, backend, and shared-types
- Builds shared-types package
- **Duration**: ~2-3 minutes (cached: ~30 seconds)

#### 2. **TypeScript Type Check** (`typecheck`)
- Validates TypeScript types across all packages
- Runs `tsc --noEmit` for shared-types, frontend, and backend
- **Fails if**: Type errors exist
- **Duration**: ~30 seconds

#### 3. **Linting** (`lint`)
- Runs ESLint on frontend and backend code
- Checks code style and quality standards
- **Fails if**: Linting errors exist
- **Duration**: ~20 seconds

#### 4. **Security Audit** (`security`)
- Runs `pnpm audit` on frontend and backend dependencies
- Checks for high-severity vulnerabilities
- **Warning only**: Does not block PR (uses `|| true`)
- **Duration**: ~15 seconds

#### 5. **Frontend Tests** (`test-frontend`)
- Runs Vitest unit tests with coverage
- Uploads coverage to Codecov
- **Fails if**: Tests fail
- **Required Coverage**: 80% for new code
- **Duration**: ~1-2 minutes

#### 6. **Backend Tests** (`test-backend`)
- Spins up PostgreSQL and Redis containers
- Runs database migrations
- Runs Jest unit and integration tests with coverage
- Uploads coverage to Codecov
- **Fails if**: Tests fail or migrations fail
- **Duration**: ~2-3 minutes

#### 7. **E2E Tests** (`test-e2e`)
- Spins up PostgreSQL and Redis containers
- Builds and starts backend server (port 3000)
- Builds and starts frontend server (port 4200)
- Runs Playwright E2E tests
- Uploads test reports as artifacts
- **Fails if**: E2E tests fail
- **Duration**: ~3-5 minutes

#### 8. **Build Verification** (`build`)
- Builds shared-types package
- Builds frontend for production
- Builds backend for production
- Uploads build artifacts
- **Fails if**: Build fails
- **Duration**: ~2-3 minutes

#### 9. **Auto-Merge** (`auto-merge`)
- **Only runs if**: All previous jobs pass AND PR has `auto-merge` label
- Uses squash merge strategy
- Automatically merges PR
- **Requires**: All quality gates passing
- **Duration**: ~10 seconds

#### 10. **CI Summary** (`summary`)
- Always runs (even if other jobs fail)
- Posts detailed status comment on PR
- Shows which checks passed/failed
- Provides quick visual feedback
- **Duration**: ~5 seconds

### Total Pipeline Duration
- **First run**: ~5-7 minutes
- **Cached run**: ~3-4 minutes
- **Parallel execution**: Jobs run concurrently where possible

## Quality Gates

All of the following must pass before a PR can be merged:

| Gate | Requirement | Blocking |
|------|-------------|----------|
| TypeScript | Zero type errors | ✅ Yes |
| Linting | Zero lint errors | ✅ Yes |
| Security | No high-severity vulnerabilities | ⚠️ Warning only |
| Frontend Tests | All tests passing, 80%+ coverage | ✅ Yes |
| Backend Tests | All tests passing, 80%+ coverage | ✅ Yes |
| E2E Tests | All E2E scenarios passing | ✅ Yes |
| Build | Production builds successful | ✅ Yes |

## Using the CI/CD Pipeline

### For All Pull Requests

The pipeline runs automatically when you:
1. Open a new PR
2. Push new commits to an existing PR
3. Synchronize/update a PR

**No manual action required** - just push your code!

### Enabling Auto-Merge

To enable automatic merging when all checks pass:

```bash
# Add the auto-merge label to your PR
gh pr edit <PR_NUMBER> --add-label "auto-merge"
```

Or via GitHub UI:
1. Go to your PR
2. Click "Labels" on the right sidebar
3. Add the `auto-merge` label

**Requirements for auto-merge:**
- All CI checks must pass
- PR must have `auto-merge` label
- No merge conflicts

### Viewing Test Results

#### In GitHub UI
1. Go to your PR
2. Click "Checks" tab
3. View individual job results
4. Download artifacts (build files, test reports)

#### CI Summary Comment
The pipeline automatically posts a comment on your PR with a status table:

```
## ✅ CI Pipeline All checks passed!

| Check | Status |
|-------|--------|
| TypeScript | ✅ |
| Linting | ✅ |
| Security | ✅ |
| Frontend Tests | ✅ |
| Backend Tests | ✅ |
| E2E Tests | ✅ |
| Build | ✅ |

🎉 This PR is ready to merge!
```

### Test Coverage Reports

Coverage reports are uploaded to Codecov automatically:
- Frontend coverage: Flag `frontend`
- Backend coverage: Flag `backend`

View coverage at: `https://codecov.io/gh/YOUR_ORG/saas-xray`

### E2E Test Reports

Playwright test reports are saved as artifacts for 7 days:
1. Go to PR → Checks → test-e2e job
2. Scroll to bottom
3. Download `playwright-report` artifact
4. Unzip and open `index.html` in browser

## Local Testing (Before Pushing)

Run the same checks locally before pushing:

```bash
# Frontend
cd frontend

# TypeScript check
pnpm run typecheck

# Linting
pnpm run lint

# Unit tests
pnpm run test

# E2E tests (requires backend running)
pnpm run test:e2e

# Build
pnpm run build
```

```bash
# Backend
cd backend

# TypeScript check
pnpm run typecheck

# Linting
pnpm run lint

# Unit tests
pnpm run test

# Build
pnpm run build
```

## Claude Code Hooks

The project includes automated quality hooks that run during development:

### Pre-Commit Hook
**File**: `.claude/hooks/pre-commit.sh`

Runs before every commit to ensure quality:
1. **Linting**: Auto-fixes lint issues
2. **Type Check**: Validates TypeScript types
3. **Fast Tests**: Runs unit tests (skips E2E)
4. **AI Review**: Optional AI code quality judge

**Blocks commit if**: Any check fails

### Tool-Use Hook
**File**: `.claude/hooks/tool-use.sh`

Runs after Edit/Write operations:
1. **Auto-Format**: Runs Prettier on modified files
2. **Quick Type Check**: Fast TypeScript validation
3. **Agent Routing**: Suggests appropriate sub-agent for review
4. **Logging**: Tracks all file modifications

**Non-blocking**: Warnings only

### Test Result Hook
**File**: `.claude/hooks/test-result.sh`

Runs after test execution:
1. **Result Logging**: Tracks test history
2. **Coverage Analysis**: Parses coverage reports
3. **Failure Analysis**: Logs failing tests

### Hook Fixes Applied

✅ Updated package manager from `npm` to `pnpm`
✅ Fixed command syntax (`pnpm run lint` instead of `pnpm lint`)
✅ All hooks executable (chmod +x)

## Environment Variables

The CI/CD pipeline requires these secrets in GitHub:

### Required Secrets
```bash
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Optional: Codecov token (for private repos)
CODECOV_TOKEN=xxx
```

### Setting Secrets

Via GitHub UI:
1. Go to repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each secret

Via CLI:
```bash
gh secret set VITE_CLERK_PUBLISHABLE_KEY
gh secret set VITE_SUPABASE_URL
gh secret set VITE_SUPABASE_ANON_KEY
```

## Troubleshooting

### Pipeline Failing?

#### TypeScript Errors
```bash
cd frontend  # or backend
pnpm run typecheck
# Fix errors shown
```

#### Linting Errors
```bash
cd frontend  # or backend
pnpm run lint --fix
```

#### Test Failures
```bash
cd frontend  # or backend
pnpm run test
# Check error messages
# Fix failing tests
```

#### Build Failures
```bash
cd frontend  # or backend
pnpm run build
# Check build errors
# Usually missing environment variables
```

### Common Issues

#### 1. Database Migration Failures
**Symptom**: Backend tests fail with "relation does not exist"
**Fix**: Ensure migrations are in `backend/src/migrations/`

#### 2. Missing Environment Variables
**Symptom**: Build fails with "undefined is not a function"
**Fix**: Add required secrets to GitHub repository

#### 3. E2E Tests Timeout
**Symptom**: E2E tests fail with "Navigation timeout"
**Fix**: Check server startup commands in workflow

#### 4. Cache Issues
**Symptom**: Dependencies not found or outdated
**Fix**: Clear GitHub Actions cache:
```bash
gh cache delete --all
```

## Best Practices

### Before Creating a PR
1. ✅ Run local tests: `pnpm run test`
2. ✅ Check types: `pnpm run typecheck`
3. ✅ Lint code: `pnpm run lint --fix`
4. ✅ Test build: `pnpm run build`

### During PR Review
1. ✅ Watch CI checks in "Checks" tab
2. ✅ Review test coverage reports
3. ✅ Address failing checks immediately
4. ✅ Add `auto-merge` label only when confident

### After Merge
1. ✅ Verify staging deployment (if configured)
2. ✅ Monitor error tracking (Sentry, etc.)
3. ✅ Check production logs

## Future Enhancements

Planned improvements to the CI/CD pipeline:

- [ ] **Staging Deployment**: Auto-deploy to staging on merge
- [ ] **Production Deployment**: Manual approval for production
- [ ] **Visual Regression Testing**: Percy/Chromatic integration
- [ ] **Performance Testing**: Lighthouse CI
- [ ] **Dependency Updates**: Dependabot auto-merge
- [ ] **Slack Notifications**: CI status to Slack channel
- [ ] **Docker Image Building**: Build and push Docker images
- [ ] **Kubernetes Deployment**: Deploy to K8s cluster

## Support

**Documentation**: See `.claude/docs/` for detailed guides
**Issues**: Report CI/CD issues with `ci-cd` label
**Questions**: Ask in #engineering Slack channel

---

**Last Updated**: 2025-10-10
**Maintained By**: DevOps Team
**Status**: ✅ Production Ready
