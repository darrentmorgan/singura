# Singura CI/CD Runbook

## Emergency Contacts
- **Repository**: https://github.com/darrentmorgan/singura
- **Actions**: https://github.com/darrentmorgan/singura/actions
- **Owner**: @darrentmorgan

## Quick Reference

### Check CI/CD Status
```bash
# View all workflow runs
gh run list --limit 10

# View specific workflow runs
gh run list --workflow=e2e-tests.yml --limit 5
gh run list --workflow=auto-merge-label.yml --limit 5

# View run details
gh run view <RUN_ID> --log
```

### Emergency Commands
```bash
# Stop a running workflow
gh run cancel <RUN_ID>

# Re-run failed workflow
gh run rerun <RUN_ID>

# Re-run failed jobs only
gh run rerun <RUN_ID> --failed
```

## E2E Test Workflow

### Location
`.github/workflows/e2e-tests.yml`

### Triggers
- Pull request to `main` or `develop`
- Push to `main` or `develop`
- Changes to `frontend/**` or workflow file
- Manual dispatch

### Test Matrix
- **Browsers**: chromium, firefox, webkit
- **Timeout**: 30 minutes per browser
- **Retries**: 2 (on CI only)
- **Workers**: 1 (sequential on CI)

### Common Failures

#### Setup Node.js Failure
**Symptom**: `##[error]Some specified paths were not resolved, unable to cache dependencies.`

**Cause**: Missing or incorrect `cache-dependency-path`

**Fix**: Already resolved in latest commit. Verify workflow uses:
```yaml
cache-dependency-path: 'package-lock.json'  # Not frontend/package-lock.json
```

**Recovery**:
```bash
# Re-run the workflow
gh run rerun <RUN_ID>
```

#### Browser Installation Failure
**Symptom**: `Error: browserType.launch: Executable doesn't exist`

**Cause**: Playwright browsers not installed properly

**Fix**:
```bash
# Locally test installation
cd frontend
npx playwright install --with-deps chromium firefox webkit

# Verify installation
npx playwright test --list
```

**Recovery**: Re-run workflow or update Playwright version in `frontend/package.json`

#### Test Timeout
**Symptom**: `Test timeout of 30000ms exceeded`

**Cause**: Application not starting or slow response

**Fix**:
1. Check if dev server starts: `webServer.timeout: 120000`
2. Increase test timeouts in `playwright.config.ts`
3. Check for network issues or slow database queries

**Recovery**:
```bash
# View detailed logs
gh run view <RUN_ID> --log-failed

# Download test artifacts
gh run download <RUN_ID>

# Check screenshots/videos for clues
open test-results/artifacts/
```

#### Supabase Connection Issues
**Symptom**: Tests fail with network or auth errors

**Cause**: Missing or invalid Supabase credentials

**Fix**:
1. Verify secrets are set:
   ```bash
   gh secret list
   ```

2. Required secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

3. Set secrets if missing:
   ```bash
   gh secret set VITE_SUPABASE_URL -b "https://your-project.supabase.co"
   gh secret set VITE_SUPABASE_ANON_KEY -b "your-anon-key"
   ```

**Recovery**: Re-run workflow after setting secrets

### Debugging E2E Tests

#### View Test Reports
```bash
# Download latest test results
gh run download <RUN_ID>

# Open HTML report
open playwright-report-chromium/index.html
open playwright-report-firefox/index.html
open playwright-report-webkit/index.html

# View screenshots (only on failure)
open screenshots-chromium/
```

#### Run Tests Locally
```bash
# Install dependencies
npm ci
cd frontend && npm ci

# Install browsers
npx playwright install --with-deps

# Run all tests
npm run test:e2e

# Run specific browser
npx playwright test --project=chromium

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug mode (step through tests)
npm run test:e2e:debug

# Run specific test file
npx playwright test waitlist.spec.ts
```

#### Test Artifacts
**Artifacts retained for 30 days**:
- `playwright-report-{browser}`: HTML test reports
- `screenshots-{browser}`: Screenshots on failure
- `videos-{browser}`: Videos on failure
- `e2e-test-report`: Merged test report

**Download artifacts**:
```bash
gh run download <RUN_ID> --name playwright-report-chromium
```

## Auto-Merge Workflows

### Label-Based Auto-Merge (Recommended)

#### Location
`.github/workflows/auto-merge-label.yml`

#### Usage
```bash
# Enable auto-merge
gh pr edit <PR_NUMBER> --add-label auto-merge

# Disable auto-merge
gh pr edit <PR_NUMBER> --remove-label auto-merge

# Check if auto-merge is enabled
gh pr view <PR_NUMBER> --json autoMergeRequest
```

#### Requirements for Merge
1. ✅ All status checks pass
2. ✅ All required reviews approved
3. ✅ Branch is up to date
4. ✅ No merge conflicts
5. ✅ PR is not a draft

#### Troubleshooting

**Auto-merge not enabling**:
```bash
# Check PR status
gh pr view <PR_NUMBER> --json state,mergeable,mergeStateStatus

# Check workflow run
gh run list --workflow=auto-merge-label.yml

# View workflow logs
gh run view <RUN_ID> --log
```

**Auto-merge enabled but not merging**:
```bash
# Check status checks
gh pr checks <PR_NUMBER>

# Check if branch is up to date
gh pr view <PR_NUMBER> --json mergeStateStatus

# Update branch if behind
gh pr update-branch <PR_NUMBER>
```

**Disable auto-merge manually**:
```bash
gh pr merge <PR_NUMBER> --disable-auto
```

### Automatic Auto-Merge

#### Location
`.github/workflows/auto-merge.yml`

#### Behavior
- Runs automatically on all non-draft PRs
- Waits up to 10 minutes for checks to complete
- Enables auto-merge when all conditions met
- Comments on PR with status

#### Disable for Specific PR
Convert PR to draft:
```bash
gh pr ready <PR_NUMBER> --undo
```

## Deployment Procedures

### Normal Deployment

#### Prerequisites
1. All tests pass locally
2. Code reviewed and approved
3. Branch is up to date with `main`

#### Steps
```bash
# 1. Ensure you're on the right branch
git checkout feature/your-feature

# 2. Run tests locally
npm test
npm run test:e2e

# 3. Push to GitHub
git push origin feature/your-feature

# 4. Create PR
gh pr create --title "feat: Your Feature" --body "Description"

# 5. Add auto-merge label
gh pr edit --add-label auto-merge

# 6. Monitor CI/CD
gh pr checks

# 7. PR will auto-merge when checks pass
```

### Hotfix Deployment

**CRITICAL BUGS ONLY**

#### Prerequisites
1. Bug confirmed in production
2. Fix tested locally
3. Minimal scope of change

#### Steps
```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug-name

# 2. Apply fix
# ... make changes ...

# 3. Test locally
npm test
npm run test:e2e

# 4. Commit and push
git add .
git commit -m "fix: Critical bug description"
git push origin hotfix/critical-bug-name

# 5. Create PR with urgency label
gh pr create --title "fix: Critical bug" --label "hotfix" --label "auto-merge"

# 6. Monitor closely
gh pr checks --watch

# 7. If checks fail, fix immediately or rollback
```

### Rollback Procedure

**If deployment causes issues**:

#### Immediate Rollback
```bash
# 1. Identify the bad commit
git log --oneline -10

# 2. Create revert PR
git checkout main
git pull origin main
git revert <BAD_COMMIT_SHA>
git push origin main

# Or use GitHub UI
gh pr create --title "revert: Rollback bad deployment" --label "hotfix"
```

#### Emergency Rollback (Production Down)
```bash
# 1. Force push previous good commit (USE WITH CAUTION)
git checkout main
git reset --hard <GOOD_COMMIT_SHA>
git push origin main --force

# 2. Document in incident report
# 3. Fix issue in new PR
# 4. Re-deploy properly
```

## Monitoring

### CI/CD Health
```bash
# View recent runs
gh run list --limit 20

# Check failure rate
gh run list --workflow=e2e-tests.yml --limit 50 | grep -c "failure"

# View slow runs (> 10 minutes)
gh run list --limit 50 --json durationMs,name
```

### Auto-Merge Metrics
```bash
# Count auto-merged PRs (last 30 days)
gh pr list --state merged --limit 100 --json mergedAt,autoMergeRequest

# Average time to merge
gh pr list --state merged --limit 50 --json createdAt,mergedAt
```

## Incident Response

### CI/CD Down

**Symptoms**: All workflows failing, GitHub Actions unresponsive

**Response**:
1. Check GitHub status: https://www.githubstatus.com/
2. If GitHub issue: Wait for resolution, communicate to team
3. If configuration issue: Revert last workflow changes
4. Emergency: Merge PRs manually with thorough testing

### Flaky Tests

**Symptoms**: Tests pass/fail randomly

**Response**:
1. Identify flaky test:
   ```bash
   # Run test 10 times locally
   for i in {1..10}; do npm run test:e2e && echo "Pass $i" || echo "Fail $i"; done
   ```

2. Investigate causes:
   - Race conditions
   - Network timing
   - Async handling
   - Test dependencies

3. Fix or skip flaky test temporarily:
   ```typescript
   test.skip('flaky test', async ({ page }) => {
     // TODO: Fix flaky test - ticket #123
   });
   ```

4. Create ticket to fix properly

### Merge Conflicts

**Symptoms**: Auto-merge fails with conflicts

**Response**:
```bash
# 1. Update branch with main
git checkout feature/your-branch
git fetch origin
git merge origin/main

# 2. Resolve conflicts
# ... edit files ...

# 3. Test after resolution
npm test
npm run test:e2e

# 4. Push resolved conflicts
git add .
git commit -m "chore: Resolve merge conflicts with main"
git push

# Auto-merge will retry automatically
```

## Maintenance

### Weekly Tasks
```bash
# Review failed workflows
gh run list --status failure --limit 20

# Check for outdated dependencies
npm outdated

# Review open PRs
gh pr list --state open

# Clean up stale branches
git branch -r | grep -v "main\|develop" | xargs git push origin --delete
```

### Monthly Tasks
```bash
# Update Playwright
cd frontend
npm update @playwright/test
npx playwright install --with-deps

# Review workflow performance
gh run list --limit 200 --json conclusion,durationMs > runs.json

# Update documentation if workflows changed
```

## Configuration Files

### E2E Tests
- **Workflow**: `.github/workflows/e2e-tests.yml`
- **Config**: `frontend/playwright.config.ts`
- **Tests**: `frontend/tests/e2e/*.spec.ts`

### Auto-Merge
- **Label-based**: `.github/workflows/auto-merge-label.yml`
- **Automatic**: `.github/workflows/auto-merge.yml`
- **Documentation**: `.github/AUTO_MERGE_GUIDE.md`

### Secrets Required
```bash
# View current secrets
gh secret list

# Required secrets:
VITE_SUPABASE_URL          # Supabase project URL
VITE_SUPABASE_ANON_KEY     # Supabase anonymous key
```

## Support

### Documentation
1. `.github/AUTO_MERGE_GUIDE.md` - Auto-merge usage guide
2. `CI_CD_FIXES_SUMMARY.md` - Recent fixes and changes
3. `RUNBOOK.md` - This file

### Getting Help
1. Check workflow logs: `gh run view <RUN_ID> --log`
2. Review test artifacts: `gh run download <RUN_ID>`
3. Search issues: `gh issue list --label ci/cd`
4. Create issue: `gh issue create --label ci/cd --title "CI/CD Issue"`

### Useful Links
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Playwright Docs](https://playwright.dev/)
- [GitHub CLI Docs](https://cli.github.com/)
- [Auto-Merge Docs](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request)

---

**Last Updated**: 2025-10-08
**Maintained By**: DevOps Team
**Review Schedule**: Monthly
