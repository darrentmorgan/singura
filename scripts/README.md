# Singura Scripts

Automation scripts for development, testing, deployment, and CI/CD verification.

## CI/CD Verification Scripts

### `verify-ci.sh` - Full CI/CD Pre-Flight Check

Runs complete CI/CD verification matching GitHub Actions pipeline.

**Usage:**
```bash
./scripts/verify-ci.sh              # Full verification (~70s)
./scripts/verify-ci.sh --skip-e2e   # Skip E2E tests (~40s)
./scripts/verify-ci.sh --fix        # Auto-fix linting
./scripts/verify-ci.sh --help       # Show usage
```

**What it checks:**
- ✅ ESLint (Frontend & Backend) - BLOCKING
- ✅ Security Audit - BLOCKING
- ✅ Frontend Tests with Coverage - BLOCKING
- ✅ Backend Tests with Coverage - BLOCKING
- ✅ Build Verification - BLOCKING
- ✅ E2E Tests - BLOCKING (skippable)
- ⚠️ TypeScript - NON-BLOCKING

**Exit Codes:**
- `0` - All critical checks passed (ready to push)
- `1` - One or more checks failed

**Logs:** `.ci-verification-logs/verify-ci-TIMESTAMP.log`

---

### `quick-check.sh` - Fast Development Check

Quick validation for rapid iteration. Skips coverage and E2E tests.

**Usage:**
```bash
./scripts/quick-check.sh        # Quick check (< 30s)
./scripts/quick-check.sh --fix  # Auto-fix linting
```

**What it checks:**
- Linting (Frontend & Backend)
- Security Audit
- Unit Tests (no coverage)

**When to use:**
- During active development
- Before committing
- Quick sanity checks

**Note:** Always run full verification before pushing!

---

### `install-hooks.sh` - Git Hook Installer

Installs pre-push hook for automatic CI verification.

**Usage:**
```bash
./scripts/install-hooks.sh
```

**What it does:**
- Installs pre-push hook to `.git/hooks/pre-push`
- Backs up existing hook if present
- Runs `verify-ci.sh --skip-e2e` on every push
- Prevents push if critical checks fail

**Bypass hook:**
```bash
git push --no-verify  # Emergency use only!
```

**After installation:**
- Every `git push` triggers verification
- Failed checks block the push
- Manual override available with `--no-verify`

---

## Other Scripts

### `deploy.sh` - Deployment Script

Deploys Singura to production or staging environments.

**Usage:**
```bash
./scripts/deploy.sh [TAG] [ENV_FILE]

# Examples
./scripts/deploy.sh latest .env.production
./scripts/deploy.sh v1.2.3 .env.staging
```

---

### `test-oauth-enrichment.sh` - OAuth Testing

Tests OAuth credential enrichment with platform APIs.

**Usage:**
```bash
./scripts/test-oauth-enrichment.sh
```

---

### `check-automation-ids.ts` - Automation ID Validator

Validates automation IDs across the codebase.

**Usage:**
```bash
pnpm exec tsx scripts/check-automation-ids.ts
```

---

### `verify-automation-metadata.ts` - Metadata Validator

Verifies automation metadata consistency.

**Usage:**
```bash
pnpm exec tsx scripts/verify-automation-metadata.ts
```

---

### `delegation-router.ts` - Agent Delegation Router

Routes tasks to appropriate Claude Code agents (internal).

---

## Quick Reference

### Daily Development Workflow

```bash
# 1. Install hooks (once)
./scripts/install-hooks.sh

# 2. During development (frequent)
./scripts/quick-check.sh

# 3. Before committing
./scripts/quick-check.sh --fix
git add .
git commit -m "feat: add feature"

# 4. Before pushing (automatic via hook)
git push  # Hook runs verify-ci.sh --skip-e2e

# 5. Before opening PR
./scripts/verify-ci.sh  # Full verification including E2E
```

### Common Tasks

```bash
# Fix linting issues
./scripts/quick-check.sh --fix
./scripts/verify-ci.sh --fix

# Run full CI checks
./scripts/verify-ci.sh

# Skip E2E (faster)
./scripts/verify-ci.sh --skip-e2e

# View logs
ls -lt .ci-verification-logs/
cat .ci-verification-logs/verify-ci-*.log | head -1
```

### Troubleshooting

```bash
# Check what failed
cat .ci-verification-logs/verify-ci-TIMESTAMP.log

# Run individual checks
cd frontend && pnpm run lint
cd frontend && pnpm test
cd backend && pnpm run lint
cd backend && pnpm test

# View detailed check logs
ls .ci-verification-logs/check-*

# Reinstall hooks
./scripts/install-hooks.sh
```

## Documentation

For comprehensive documentation on CI/CD verification:

📚 **[CI/CD Verification Guide](../docs/CI_VERIFICATION.md)**

Covers:
- Detailed check descriptions
- Troubleshooting guide
- CI/CD pipeline architecture
- Best practices
- Advanced usage

## Support

### Getting Help

```bash
# Show script usage
./scripts/verify-ci.sh --help
./scripts/quick-check.sh --help

# Check documentation
cat docs/CI_VERIFICATION.md

# View logs
ls -lt .ci-verification-logs/
```

### Common Issues

**Issue:** Linting fails
```bash
# Auto-fix
./scripts/verify-ci.sh --fix
```

**Issue:** Security audit fails
```bash
# Check vulnerabilities
cd frontend && pnpm audit
cd backend && pnpm audit

# Try auto-fix
pnpm audit fix
```

**Issue:** Tests fail
```bash
# Ensure Docker is running
docker compose up -d postgres redis

# Run tests individually
cd frontend && pnpm test
cd backend && pnpm test
```

**Issue:** Pre-push hook not working
```bash
# Reinstall
./scripts/install-hooks.sh

# Check permissions
ls -la .git/hooks/pre-push
chmod +x .git/hooks/pre-push
```

## Best Practices

1. **Install hooks immediately** after cloning repo
2. **Run quick-check frequently** during development
3. **Run full verification** before opening PRs
4. **Never bypass hooks** unless absolute emergency
5. **Fix issues immediately** - don't accumulate failures
6. **Review logs** when checks fail

## Script Maintenance

### Adding New Checks

To add a new check to `verify-ci.sh`:

1. Add check in appropriate phase
2. Use `run_check` function:
   ```bash
   run_check "Check Name" "command to run" true/false
   ```
3. Handle failures appropriately
4. Update documentation

### Modifying Hooks

Edit `.git/hooks/pre-push` after installation, or modify `install-hooks.sh` to change default behavior.

### Log Cleanup

```bash
# Remove old logs (older than 7 days)
find .ci-verification-logs -type f -mtime +7 -delete

# Or clean all logs
rm -rf .ci-verification-logs/*
```

## License

Part of Singura platform - proprietary.
