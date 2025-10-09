# Deploy Command

Execute autonomous deployment with AI quality gates.

## Workflow

1. **Pre-deployment Checks**
   - Verify on main branch (or confirm override)
   - Ensure clean working tree
   - Check all changes are committed

2. **Build & Test**
   - Run production build: `pnpm build`
   - Execute unit tests: `pnpm test`
   - Verify type safety: `tsc --noEmit`

3. **E2E Validation**
   - Start API server in background
   - Run Playwright E2E tests: `pnpm test:e2e`
   - Capture screenshots for AI review
   - Stop API server

4. **AI QA Gate** (🚧 Foundation - Phase 4)
   - Invoke `qa-expert` agent via Task tool
   - Agent reviews:
     - Test screenshots for visual regressions
     - E2E test results for functional correctness
     - Performance metrics
   - Agent provides APPROVE/REJECT decision

5. **Deploy to Production**
   - If approved: Push to origin/main (triggers GitHub Actions)
   - GitHub Actions deploys to Vercel
   - Deployment summary displayed

## Usage

```bash
/deploy
```

Or manually:
```bash
.claude/scripts/deploy.sh
```

## Success Criteria

✅ All tests pass (unit + E2E)
✅ Build succeeds
✅ No visual regressions
✅ AI QA gate approves
✅ Deployment initiated

## Failure Handling

If deployment fails:
1. Review error output
2. Check test screenshots in `tests/test-screenshots/`
3. Fix issues
4. Re-run `/deploy`

## Notes

- Only works from `main` branch (or with override)
- Requires clean working tree
- E2E tests run with `TEST_MODE=true`
- Screenshots automatically uploaded to CI artifacts
- AI QA gate can be bypassed in emergency (not recommended)

## Environment Requirements

- Node.js 20.0.0+ (LTS)
- pnpm 9+
- Supabase credentials in `.env`
- Playwright browsers installed

## Future Enhancements

- [ ] Real-time deployment status
- [ ] Automatic rollback on failure
- [ ] Blue-green deployment strategy
- [ ] Canary releases
- [ ] Performance benchmarking
