# Singura → Singura Rebrand Plan

**Date**: 2025-10-11
**Branch**: `feat/singura-ai-rebrand`
**Status**: In Progress

## Overview

Complete rebrand from "Singura" to "Singura" across the entire codebase, maintaining all functionality while updating:
- Repository name references
- Application branding
- Documentation
- Configuration files
- Docker containers
- CI/CD pipelines

## Pre-Rebrand Analysis

### Files Requiring Changes: 172 files found

Key areas identified:
- Package configuration files (package.json, package-lock.json, pnpm-lock.yaml)
- Application code (frontend/backend services)
- Documentation (README.md, API docs, guides)
- Docker configurations (Dockerfile, docker-compose files)
- CI/CD configurations
- Test files and mocks
- Environment templates

## Rebrand Strategy

### Phase 1: Backup & Preparation ✅
- [x] Create backup documentation
- [x] Document current state
- [x] Create rollback plan

### Phase 2: Package Configuration
- [ ] Update root package.json (name, description)
- [ ] Update backend/package.json
- [ ] Update frontend/package.json
- [ ] Update shared-types/package.json
- [ ] Regenerate lockfiles

### Phase 3: Application Code
- [ ] Update frontend branding (titles, meta tags)
- [ ] Update backend service references
- [ ] Update shared types references
- [ ] Update API documentation

### Phase 4: Infrastructure
- [ ] Update Dockerfile (comments, user names)
- [ ] Update docker-compose.yml
- [ ] Update docker-compose.prod.yml
- [ ] Update environment templates

### Phase 5: Documentation
- [ ] Update README.md
- [ ] Update API_REFERENCE.md
- [ ] Update all guides in docs/
- [ ] Update CLAUDE.md
- [ ] Update deployment docs

### Phase 6: Testing & Validation
- [ ] Run TypeScript compilation
- [ ] Run test suite (unit + integration + e2e)
- [ ] Verify Docker builds
- [ ] Test local development environment
- [ ] Verify all imports resolve

### Phase 7: CI/CD & Deployment
- [ ] Update GitHub Actions workflows
- [ ] Update deployment scripts
- [ ] Update Vercel configuration (if applicable)

## Naming Conventions

### Find & Replace Rules

| Current | New | Scope |
|---------|-----|-------|
| `Singura` | `Singura` | Display names, titles |
| `singura` | `singura` | Package names, URLs |
| `singura` | `singura` | Database names, env vars |
| `SAAS_XRAY` | `SINGURA` | Constants |
| `SaaSXRay` | `Singura` | Class names |
| `singura` | `singura` | Docker user, single-word refs |

### Files to Exclude
- `.git/` directory
- `node_modules/`
- Lock files (will be regenerated)
- `dist/` and `build/` directories

## Rollback Plan

If issues occur:
1. `git reset --hard HEAD~1` (for last commit)
2. `git checkout main` (abandon branch)
3. Restore from backup branch: `git checkout -b recovery backup/pre-rebrand`

## Testing Checklist

After each phase:
- [ ] TypeScript compiles without errors
- [ ] No broken imports
- [ ] Tests pass
- [ ] Application starts successfully
- [ ] Docker builds successfully

## Risk Mitigation

### High Risk Areas
1. **Shared Types**: Central to entire app, many dependencies
2. **Database Migrations**: References in SQL files
3. **OAuth Configurations**: Platform-specific settings
4. **Docker User Names**: Security implications

### Mitigation
- Test each phase independently
- Commit after each successful phase
- Run full test suite after major changes
- Keep backup branch for quick rollback

## Success Criteria

- ✅ All 172 files updated with new branding
- ✅ TypeScript compilation: 0 errors
- ✅ Test suite: 100% passing
- ✅ Docker build: Successful
- ✅ Local dev environment: Working
- ✅ No broken references or imports
- ✅ Documentation complete and accurate

## Estimated Timeline

- Phase 1 (Backup): 15 mins ✅
- Phase 2 (Packages): 30 mins
- Phase 3 (Code): 1 hour
- Phase 4 (Infrastructure): 30 mins
- Phase 5 (Docs): 45 mins
- Phase 6 (Testing): 1 hour
- Phase 7 (CI/CD): 30 mins

**Total**: ~4.5 hours (with testing and validation)

## Current Progress

- [x] Model configuration updated to Sonnet 4.5
- [x] Rebrand plan created
- [ ] Package configurations
- [ ] Application code
- [ ] Infrastructure
- [ ] Documentation
- [ ] Testing
- [ ] CI/CD

---

**Next Step**: Update package.json files in all workspaces
