# Run QA Command

Execute comprehensive E2E quality assurance with AI-powered review.

## Workflow

1. **Environment Setup**
   - Start frontend dev server (`pnpm dev`)
   - Start API server (`pnpm run api:dev`)
   - Wait for servers to be ready

2. **E2E Test Execution**
   - Run Playwright E2E test suite
   - Capture screenshots at each critical step
   - Record test results and timings

3. **AI QA Expert Review** (via Task tool)
   - Invoke `qa-expert` agent
   - Agent analyzes:
     - Screenshot visual quality
     - Functional test results
     - Performance metrics
     - Browser console errors
   - Generates QA report with approval/issues

4. **Report Generation**
   - Create `docs/qa/QA_REPORT_{timestamp}.md`
   - Include:
     - Test summary (passed/failed)
     - Screenshot analysis
     - AI-identified issues
     - Recommendations

5. **Cleanup**
   - Stop dev servers
   - Archive test artifacts

## Usage

```bash
/run-qa
```

Optional: Specific test file
```bash
/run-qa tests/wizard.test.ts
```

## QA Report Format

```markdown
# QA Report - {timestamp}

## Test Summary
- Total Tests: X
- Passed: Y
- Failed: Z
- Duration: Nms

## Screenshot Analysis
[AI analysis of each screenshot]

## Issues Found
1. [Issue description with severity]

## Recommendations
- [Actionable recommendations]

## Approval
✅ APPROVED / ❌ REJECTED
```

## Success Criteria

✅ All E2E tests pass
✅ No visual regressions detected
✅ No console errors
✅ Performance within acceptable range
✅ AI QA expert approves

## Configuration

Environment variables:
- `TEST_MODE=true` for mock data
- `VITE_API_BASE_URL=http://localhost:8787/api`

## Browser Support

- Chromium (primary)
- Firefox (optional)
- WebKit (optional)

## Notes

- Screenshots saved to `tests/test-screenshots/`
- Test results saved to `tests/test-results/`
- QA reports archived in `docs/qa/`
- Can run before every deployment
- Integrates with deployment script

## Troubleshooting

**Servers won't start:**
- Check if ports 8080/8787 are already in use
- Kill existing processes: `pkill -f "vite|api:dev"`

**Tests flaky:**
- Increase timeout in `playwright.config.ts`
- Check for race conditions
- Review element selectors

**Screenshots missing:**
- Verify `test-screenshots/` directory exists
- Check Playwright screenshot config
- Ensure sufficient disk space
