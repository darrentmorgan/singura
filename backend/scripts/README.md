# Scripts Directory

This directory contains utility scripts for testing, CI/CD, migrations, and development tasks.

## CI/CD Scripts

### check-performance-regression.js
**Purpose:** Detects performance regressions by comparing current benchmarks against baseline metrics.

**Usage:**
```bash
node scripts/check-performance-regression.js
```

**Configuration:**
- Regression threshold: 10% (configurable in script)
- Baseline: `tests/fixtures/baselines/performance-baseline.json`
- Current: `tests/output/benchmarks/performance-results.json`
- Output: `performance-report.json`

**Exit Codes:**
- `0`: No regression or baseline not found
- `1`: Regression detected (>10% slower)

**Metrics Compared:**
- API response time (ms)
- Database query time (ms)
- Detection algorithm time (ms)
- Throughput (req/s)
- Memory usage (MB)

---

### check-detection-drift.js
**Purpose:** Monitors detection algorithm performance drift and alerts on threshold violations.

**Usage:**
```bash
node scripts/check-detection-drift.js
```

**Configuration:**
- Precision drop threshold: 5% (absolute)
- Recall drop threshold: 3% (absolute)
- F1 score drop threshold: 4% (absolute)
- Baseline: `tests/fixtures/baselines/detection-baseline.json`
- Current: `tests/output/benchmarks/detection-metrics.json`
- Output: `drift-report.json`

**Exit Codes:**
- `0`: No drift detected
- `1`: Drift detected (triggers Slack alert in CI/CD)

**Platforms Monitored:**
- Slack
- Google Workspace
- Microsoft 365

---

### validate-ci-setup.sh
**Purpose:** Validates CI/CD configuration before pushing to GitHub.

**Usage:**
```bash
./scripts/validate-ci-setup.sh
```

**Checks:**
- ✓ GitHub Actions workflow exists
- ✓ Codecov configuration exists
- ✓ CI/CD scripts are executable
- ✓ Test directory structure is correct
- ✓ Jest configuration is valid
- ✓ Package.json test scripts are present
- ✓ Node.js version compatibility
- ✓ Dependencies are installed
- ✓ Git repository status

**Exit Codes:**
- `0`: All checks passed (or warnings only)
- `1`: Critical issues found

---

## Migration Scripts

### migrate.ts
**Purpose:** Database migration runner with support for up/down/status/validate operations.

**Usage:**
```bash
# Run all pending migrations
npm run migrate

# Check migration status
npm run migrate:status

# Validate migrations
npm run migrate:validate

# Run migrations in test environment
npm run migrate:test
```

**Features:**
- Automatic rollback on failure
- Transaction support
- Migration versioning
- Validation before execution

**Documentation:** See `docs/MIGRATION_RUNNER.md`

---

## Testing Scripts

### run-tests.sh
**Purpose:** Comprehensive test runner with multiple test suites.

**Usage:**
```bash
# Run all tests
./scripts/run-tests.sh

# Run specific suite
./scripts/run-tests.sh unit
./scripts/run-tests.sh integration
./scripts/run-tests.sh security
./scripts/run-tests.sh e2e
```

**Features:**
- Parallel test execution
- Coverage reporting
- Service health checks
- Retry logic for flaky tests

---

## Development Scripts

### quick-test-detection.ts
**Purpose:** Quickly test detection algorithm changes without running full test suite.

**Usage:**
```bash
npx ts-node scripts/quick-test-detection.ts
```

**Features:**
- Fast iteration during development
- Tests all three platforms (Slack, Google, Microsoft)
- Outputs detection metrics

---

### test-service-account.ts
**Purpose:** Validates Google Workspace service account configuration.

**Usage:**
```bash
npx ts-node scripts/test-service-account.ts
```

**Features:**
- Tests service account authentication
- Validates scopes and permissions
- Checks API access

---

### verify-oauth-fix.ts
**Purpose:** Verifies OAuth credential storage and retrieval after auth migration.

**Usage:**
```bash
npx ts-node scripts/verify-oauth-fix.ts
```

**Features:**
- Tests dual storage architecture
- Validates credential encryption
- Checks connection metadata

---

## Demo Scripts

### demo-scenarios/
**Directory:** Contains scripts for demoing platform capabilities.

**Files:**
- `google-demo.ts`: Google Workspace detection demo
- `microsoft-demo.ts`: Microsoft 365 detection demo
- `slack-demo.ts`: Slack detection demo

**Usage:**
```bash
npx ts-node scripts/demo-scenarios/google-demo.ts
```

---

## Script Maintenance

### Adding New Scripts

1. Create script in appropriate category
2. Add execute permissions: `chmod +x scripts/your-script.sh`
3. Add documentation to this README
4. Add to `package.json` if it should be an npm script
5. Test locally before committing

### Script Conventions

**Shell Scripts (.sh):**
- Use `#!/bin/bash` shebang
- Set `set -e` for error handling
- Include usage documentation in comments
- Use colored output for better UX

**TypeScript Scripts (.ts):**
- Import required types and utilities
- Use async/await for async operations
- Include error handling and logging
- Export functions for testing

**JavaScript Scripts (.js):**
- Use `#!/usr/bin/env node` shebang
- Include JSDoc comments
- Handle errors gracefully
- Exit with appropriate codes

---

## CI/CD Integration

Scripts used in GitHub Actions workflow (`.github/workflows/test-validation.yml`):

1. **check-performance-regression.js** - Performance regression job
2. **check-detection-drift.js** - Drift detection job
3. **validate-ci-setup.sh** - Local pre-push validation (optional)

---

## Troubleshooting

### Script Permission Errors

```bash
# Make script executable
chmod +x scripts/your-script.sh

# Verify permissions
ls -la scripts/
```

### Node.js Version Issues

```bash
# Check Node.js version
node -v

# Should be ≥20.0.0
# Update if needed: nvm install 20
```

### Missing Dependencies

```bash
# Install all dependencies
npm install

# Verify installation
npm ls jest ts-jest supertest
```

### Script Not Found in CI/CD

Ensure script paths in workflow are relative to backend directory:
```yaml
working-directory: ./backend
run: node scripts/check-performance-regression.js
```

---

## Related Documentation

- **CI/CD Guide:** `docs/CI_CD_GUIDE.md`
- **Testing Guide:** `docs/guides/TESTING.md`
- **Migration Guide:** `docs/MIGRATION_RUNNER.md`
- **API Reference:** `docs/API_REFERENCE.md`

---

**Last Updated:** 2025-10-30
**Maintained By:** Backend Team
