# Auto-Merge Guide

This repository has two auto-merge workflows to streamline the PR merge process.

## Overview

- **Label-Based Auto-Merge** (Recommended): Simple, explicit control via labels
- **Automatic Auto-Merge**: Attempts to auto-merge all non-draft PRs when checks pass

## Label-Based Auto-Merge (Recommended)

### How to Use

1. **Enable auto-merge**: Add the `auto-merge` label to your PR
2. **Disable auto-merge**: Remove the `auto-merge` label from your PR

### What Happens

When you add the `auto-merge` label:
- GitHub will automatically enable auto-merge for the PR
- The PR will merge when ALL conditions are met:
  - ✅ All status checks pass (E2E tests, builds, security scans)
  - ✅ All required reviews are approved
  - ✅ Branch is up to date with base branch
  - ✅ No merge conflicts

### Merge Strategy

- **Method**: Squash and merge
- **Branch Deletion**: Source branch is automatically deleted after merge
- **Commit Message**: Uses PR title and description

### Example Workflow

```bash
# Create and push your feature branch
git checkout -b feature/my-awesome-feature
git push origin feature/my-awesome-feature

# Create PR
gh pr create --title "feat: Add awesome feature" --body "Description..."

# Add auto-merge label (can also be done via GitHub UI)
gh pr edit --add-label auto-merge

# The PR will now automatically merge when all checks pass
```

## Automatic Auto-Merge

This workflow runs automatically for all non-draft PRs and attempts to enable auto-merge when checks complete.

### When It Triggers

- Pull request opened, synchronized, or reopened
- Check suite completed
- Check run completed

### Conditions for Auto-Merge

1. PR is not a draft
2. PR state is OPEN
3. PR is mergeable (no conflicts)
4. All status checks have passed

### Behavior

- Waits up to 10 minutes for pending checks to complete
- Enables auto-merge with squash strategy
- Leaves a comment on success or failure

## Status Checks Required

All PRs must pass these checks before auto-merge:

### E2E Tests
- ✅ Chromium browser tests
- ✅ Firefox browser tests
- ✅ WebKit browser tests

### Build Checks
- ✅ Frontend build
- ✅ Backend build
- ✅ Shared-types build

### Security Scans
- ✅ Vercel deployment preview
- ✅ No TypeScript errors

## Disabling Auto-Merge

### For Label-Based
Remove the `auto-merge` label from the PR:
```bash
gh pr edit <PR_NUMBER> --remove-label auto-merge
```

### For Automatic
The automatic workflow doesn't need disabling - it only enables auto-merge when conditions are met. If you want to prevent it, convert your PR to a draft:
```bash
gh pr ready <PR_NUMBER> --undo
```

## Branch Protection Rules

To ensure auto-merge works correctly, configure these branch protection rules on `main`:

1. **Require status checks to pass**:
   - E2E Tests (chromium)
   - E2E Tests (firefox)
   - E2E Tests (webkit)
   - Vercel deployment

2. **Require branches to be up to date**: Enabled

3. **Require linear history**: Optional (enforced by squash merge)

4. **Allow auto-merge**: Enabled

## Troubleshooting

### Auto-merge not working?

**Check these common issues:**

1. **Draft PR**: Auto-merge is disabled for draft PRs
   ```bash
   gh pr ready <PR_NUMBER>
   ```

2. **Failed Checks**: View the failing check and fix the issue
   ```bash
   gh pr checks <PR_NUMBER>
   ```

3. **Merge Conflicts**: Update your branch with the base branch
   ```bash
   git fetch origin
   git merge origin/main
   git push
   ```

4. **Branch Not Up to Date**: Update your branch
   ```bash
   gh pr update-branch <PR_NUMBER>
   ```

5. **Missing Reviews**: Ensure required reviews are approved

### Check Auto-Merge Status

```bash
# View PR status
gh pr view <PR_NUMBER>

# View detailed status checks
gh pr checks <PR_NUMBER>

# View PR in browser
gh pr view <PR_NUMBER> --web
```

### Manual Override

If auto-merge isn't working and you need to merge manually:

```bash
# Disable auto-merge
gh pr merge <PR_NUMBER> --disable-auto

# Manually merge with squash
gh pr merge <PR_NUMBER> --squash --delete-branch
```

## Best Practices

1. **Add `auto-merge` label early**: Let CI run while you work on other tasks
2. **Keep PRs small**: Smaller PRs merge faster and have fewer conflicts
3. **Update branches regularly**: Prevent merge conflicts by staying up to date
4. **Fix failing checks promptly**: Don't let PRs linger with failing tests
5. **Use meaningful commit messages**: They become the squash commit message

## CI/CD Pipeline

### E2E Test Workflow

The E2E test workflow (`.github/workflows/e2e-tests.yml`) runs tests on:
- Chromium (Desktop Chrome)
- Firefox (Desktop Firefox)
- WebKit (Desktop Safari)

**Test artifacts available:**
- HTML test reports
- Screenshots (on failure)
- Videos (on failure)
- Test results JSON

**View test reports:**
```bash
# Download artifacts from latest run
gh run download <RUN_ID>

# Open HTML report
open playwright-report-chromium/index.html
```

## FAQ

**Q: Can I use auto-merge with required reviews?**
A: Yes! Auto-merge waits for all required reviews before merging.

**Q: What if I want to use merge commits instead of squash?**
A: Edit `.github/workflows/auto-merge-label.yml` and change `--squash` to `--merge`.

**Q: Can I auto-merge to branches other than `main`?**
A: Yes! The workflows trigger on PRs to `main` and `develop` branches.

**Q: How do I see why auto-merge failed?**
A: Check the workflow run logs or the PR comments for failure reasons.

**Q: Can I disable auto-merge for specific PRs?**
A: Yes! Don't add the `auto-merge` label (label-based) or convert to draft (automatic).

## Related Documentation

- [GitHub Auto-Merge Docs](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Status Checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks)
