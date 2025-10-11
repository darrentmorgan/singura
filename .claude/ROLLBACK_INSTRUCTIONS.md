# Rollback Instructions - Singura Rebrand

## Emergency Rollback

If the rebrand causes critical issues, use these commands to restore the previous state.

### Option 1: Quick Rollback (Undo Last Commit)

```bash
# Reset to state before last commit
git reset --hard HEAD~1

# If already pushed
git reset --hard HEAD~1
git push origin feat/singura-ai-rebrand --force
```

### Option 2: Full Rollback (Restore from Backup Tag)

```bash
# Create recovery branch from backup
git checkout -b recovery/pre-rebrand backup/pre-singura-rebrand

# Or reset current branch to backup
git reset --hard backup/pre-singura-rebrand
git push origin feat/singura-ai-rebrand --force
```

### Option 3: Abandon Rebrand Branch

```bash
# Switch back to main
git checkout main

# Delete rebrand branch (local)
git branch -D feat/singura-ai-rebrand

# Delete remote branch (if needed)
git push origin --delete feat/singura-ai-rebrand
```

## Backup Information

**Backup Tag**: `backup/pre-singura-rebrand`
**Created**: 2025-10-11
**Branch**: `feat/singura-ai-rebrand`
**Last Good Commit**: Check with `git log backup/pre-singura-rebrand`

## Verification After Rollback

Run these commands to verify the rollback was successful:

```bash
# Check current state
git status

# Verify package name
cat package.json | grep '"name"'

# Verify TypeScript compiles
npx tsc --noEmit

# Verify tests pass
pnpm test
```

## Common Issues & Solutions

### Issue: Merge Conflicts After Rollback

```bash
# Abort any merge in progress
git merge --abort

# Hard reset to backup
git reset --hard backup/pre-singura-rebrand
```

### Issue: Lock Files Out of Sync

```bash
# Regenerate all lock files
rm -rf node_modules package-lock.json pnpm-lock.yaml
pnpm install
```

### Issue: Docker Containers Won't Start

```bash
# Clean Docker state
docker-compose down -v
docker system prune -f

# Rebuild
docker-compose build --no-cache
docker-compose up -d
```

## Contact & Support

If rollback fails or causes additional issues:
1. Document the error messages
2. Check git reflog: `git reflog`
3. Check backup tag exists: `git tag | grep backup`
4. Restore from reflog if needed: `git reset --hard HEAD@{n}`

## Prevention Checklist

Before attempting rebrand again:
- [ ] Ensure all tests pass
- [ ] Create fresh backup tag
- [ ] Test changes in phases
- [ ] Commit after each successful phase
- [ ] Run full test suite between phases

---

**Emergency Backup Location**: Tag `backup/pre-singura-rebrand`
**Recovery Command**: `git checkout -b recovery backup/pre-singura-rebrand`
