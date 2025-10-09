# CI/CD Quick Reference Card

## 🚀 Auto-Merge (Most Common)

### Enable Auto-Merge
```bash
gh pr edit <PR_NUMBER> --add-label auto-merge
```

### Check PR Status
```bash
gh pr checks <PR_NUMBER>
```

### Update Branch (if behind)
```bash
gh pr update-branch <PR_NUMBER>
```

---

## 🧪 E2E Tests

### Run Locally
```bash
cd frontend
npm run test:e2e              # All browsers
npm run test:e2e:headed       # See browser
npm run test:e2e:debug        # Step through
```

### View Failed Tests
```bash
gh run view --log-failed
gh run download <RUN_ID>
```

### Re-run Failed Tests
```bash
gh run rerun <RUN_ID> --failed
```

---

## 🔥 Emergency Commands

### Stop Running Workflow
```bash
gh run cancel <RUN_ID>
```

### Manual PR Merge
```bash
gh pr merge <PR_NUMBER> --squash --delete-branch
```

### Disable Auto-Merge
```bash
gh pr merge <PR_NUMBER> --disable-auto
```

### Revert Bad Commit
```bash
git revert <COMMIT_SHA>
git push
```

---

## 📊 Status Checks

### List Recent Runs
```bash
gh run list --limit 10
```

### Watch PR Checks
```bash
gh pr checks <PR_NUMBER> --watch
```

### View Specific Workflow
```bash
gh run list --workflow=e2e-tests.yml
```

---

## 🐛 Common Issues

### "Cache dependency path not found"
**Fixed** - Use root `package-lock.json`

### "Tests timeout"
Increase timeout in `playwright.config.ts`

### "Merge conflicts"
```bash
git fetch origin
git merge origin/main
# Resolve conflicts
git push
```

### "Draft PR won't auto-merge"
```bash
gh pr ready <PR_NUMBER>
```

---

## 📚 Full Documentation

- **Auto-Merge Guide**: `.github/AUTO_MERGE_GUIDE.md`
- **CI/CD Summary**: `CI_CD_FIXES_SUMMARY.md`
- **Operations Runbook**: `RUNBOOK.md`

---

## 🆘 Need Help?

1. Check workflow logs: `gh run view <RUN_ID> --log`
2. Download test artifacts: `gh run download <RUN_ID>`
3. Read full runbook: `RUNBOOK.md`
4. Create issue: `gh issue create --label ci/cd`
