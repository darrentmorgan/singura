<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# Singura Development - Quick Reference

## 🚨 CRITICAL: Pre-Action Checklist (MANDATORY)

**Before ANY response, check:**
1. **Delegate?** → See matrix below (if YES → Task tool immediately)
2. **Singura context?** → Use project patterns/pitfalls
3. **Need docs?** → Context7 for up-to-date library info
4. **Standards?** → TypeScript strict, TDD, security-first

---

## Sub-Agent Delegation Matrix

### ALWAYS Delegate (Automatic)
| Trigger Keywords | Agent | Notes |
|-----------------|-------|-------|
| OAuth/credentials/platform APIs | `oauth-integration-specialist` | Never handle directly |
| Database/migrations/JSONB/queries | `database-architect` | Has Supabase MCP |
| TypeScript errors/types | `typescript-guardian` | Type coverage expert |
| React/Clerk/Zustand | `react-clerk-expert` | Frontend specialist |
| API/middleware | `api-middleware-specialist` | Backend API expert |
| Detection/ML/correlation | `detection-algorithm-engineer` | Algorithm specialist |
| Tests/coverage/failures | `test-suite-manager` | Testing expert |
| Security/encryption/compliance | `security-compliance-auditor` | Security specialist |
| Code reviews | `code-reviewer-pro` | Quality assurance |
| Documentation | `documentation-sync` | Doc updates |
| Performance | `performance-optimizer` | Performance tuning |
| Docker/CI/CD | `docker-deployment-expert` | DevOps specialist |
| API research/validation | `research-specialist` | Research & validation |

### Main Agent ONLY Handles
- High-level architecture decisions (cross-domain, 3+ agents)
- Simple questions (no code changes)
- Requirements gathering

**Details**: See `.claude/agents/README.md` for 13 specialist descriptions

### Enforcement (VIOLATION = FAILURE)
- ❌ NEVER edit OAuth/database/React code directly
- ❌ NEVER read > 5 files (delegate instead)
- ❌ NEVER debug errors (delegate to specialist)
- ❌ NEVER write tests (delegate to test-suite-manager)
- ✅ ALWAYS check `.claude/agents/delegation-map.json` first
- ✅ ALWAYS use Task tool for code changes

**Examples**: See `.claude/docs/DELEGATION_EXAMPLES.md`

### TOOLS YOU CAN USE DIRECTLY (Don't Delegate These)

**Browser Automation & Testing:**
- ✅ Chrome DevTools MCP (all tools: navigate, click, screenshot, evaluate, console, network)
- ✅ Use these directly - DO NOT ask user to manually check DevTools
- ✅ Use these directly - DO NOT delegate browser tasks

**Research & Discovery:**
- ✅ WebSearch, WebFetch
- ✅ Read, Grep, Glob
- ✅ TodoWrite

**Shell Operations:**
- ✅ Bash (git, npm, pnpm, curl, chmod, docker, etc.)

**When to Act Autonomously:**
- Browser testing/debugging → Use Chrome DevTools MCP directly (evaluate, console, network)
- Web research → Use WebSearch/WebFetch directly
- File discovery → Use Grep/Glob directly
- Running commands → Use Bash directly

**Only Delegate When:**
- Writing/editing code in `src/**`
- Complex multi-file code changes
- Specialized tasks in the delegation matrix above

---

## Singura Tech Stack

**Platform**: Enterprise security for discovering unauthorized AI agents/bots
- **Frontend**: React 18, TS 5.2, Vite, Clerk, Zustand, TailwindCSS
- **Backend**: Node 20, Express, TS 5.3, Clerk, PostgreSQL (port 5433), Redis (6379)
- **Shared**: `@singura/shared-types` (9,000+ lines centralized types)

**Features**: Multi-tenant auth, Slack ✅, Google Workspace ✅, Microsoft 365 ✅ (OAuth testing pending), real-time discovery, AI detection

---

## Critical Patterns (Must Follow)

### 1. Singleton Services (Prevents State Loss)
```typescript
// Export singleton from service file
export const oauthCredentialStorage = new OAuthCredentialStorageService();
```
**Why**: Prevents instance state loss (See `.claude/PITFALLS.md` #1)

### 2. Dual Storage Architecture
- Connection metadata → `hybridStorage` (DB + memory)
- OAuth credentials → `oauthCredentialStorage` (singleton)
- SAME connection ID for both

### 3. Repository Pattern
```typescript
interface Repository<T> {
  findById(id: string): Promise<T | null>;  // Standardized null handling
}
```

### 4. Shared-Types Imports
```typescript
import { OAuthCredentials, User } from '@singura/shared-types';
```

### 5. Docker Setup
```bash
docker compose up -d postgres redis
# PostgreSQL: 5433:5432 | Redis: 6379:6379
DATABASE_URL=postgresql://postgres:password@localhost:5433/singura
```

### 6. Chrome DevTools MCP (MANDATORY)
```bash
# ALWAYS run with --isolated flag
ps aux | grep -i "chrome\|chromium" | grep -v grep | awk '{print $2}' | xargs kill -9
chrome-devtools-mcp --isolated
```
**Why**: Enables parallel browser instances (See `.claude/PATTERNS.md` - Browser Testing)

**Migration Note (2025-10-11)**:
- ✅ Migrated from Playwright MCP to Chrome DevTools MCP exclusively
- Chrome DevTools provides better debugging, console access, and network inspection
- All agents (qa-expert, performance-engineer) now use Chrome DevTools only
- Main orchestrator has direct Chrome DevTools access (no delegation needed for browser tasks)

---

## Validated OAuth Patterns

**Slack Scopes**: `users:read`, `team:read`, `channels:read`
**Google Scopes**: `script.projects.readonly`, `admin.directory.user.readonly`, `admin.reports.audit.readonly`

**Slack API (Validated)**:
```typescript
// ✅ CORRECT
const users = await client.users.list();
const bots = users.members.filter(u => u.is_bot === true);

// ❌ WRONG - These DON'T EXIST
await client.apps.list();   // ❌
await client.bots.list();   // ❌
```

---

## TDD Workflow (Mandatory)

1. **Type Validation** → `npx tsc --noEmit` MUST pass first
2. **Test Verification** → Run tests, add new tests BEFORE implementation
3. **Code Integration** → Only integrate after types + tests validate
4. **Immediate Commit** → Commit after successful integration

**Failure Protocol**: ANY failure → IMMEDIATE REVERT

---

## Comprehensive Testing Best Practices

### Test Pyramid (70/20/10 Distribution)
- **70% Unit Tests**: Fast, isolated, test business logic
- **20% Integration Tests**: Test service interactions, database queries
- **10% E2E Tests**: Test complete user workflows

### Testing Infrastructure
**Mock Servers** (RFC 6749/7009/7636 Compliant):
- Slack OAuth mock server (259 lines, 21 tests)
- Google Workspace OAuth mock server (352 lines, 15 tests, OIDC)
- Microsoft 365 OAuth mock server (417 lines, 16 tests, Graph API)
- Use for offline testing, faster CI/CD, consistent test data

**Test Fixtures & Versioning**:
```typescript
// Use fixture version manager for backward compatibility
import { loadFixture } from './tests/helpers/fixture-loader';
const data = await loadFixture('slack', 'v1.0', 'oauth-tokens');
```

**Ground Truth Dataset**:
- 100 labeled automations (50 malicious, 50 legitimate)
- Validates detection accuracy: Precision ≥85%, Recall ≥90%, F1 ≥87%
- Run validation: `npx ts-node tests/validation/run-ground-truth-validation.ts`

### Performance & Stress Testing
**Targets (ALL EXCEEDED)**:
- Processing: <30s for 10K automations (actual: 47ms, 638x faster)
- Memory: <512MB peak usage (actual: ~66MB, 7.7x better)
- Throughput: >300 automations/sec (actual: >>300/sec)
- Concurrency: 100+ parallel discovery jobs supported

**Run Tests**:
```bash
npm test -- tests/stress/process-10k-automations.test.ts
npm test -- tests/stress/concurrent-discovery-jobs.test.ts
npm test -- tests/stress/database-query-performance.test.ts
```

### Detection Metrics & Baseline Monitoring
**Metrics Tracked**:
- Precision, Recall, F1 Score, Confusion Matrix, AUC
- False Positive/False Negative rates
- Drift detection (5% precision drop = warning, 3% recall drop = critical)

**Services**:
```typescript
import { DetectionMetricsService } from '@/services/detection/detection-metrics.service';
import { BaselineManagerService } from '@/services/detection/baseline-manager.service';

// Track metrics
const metrics = await DetectionMetricsService.calculateMetrics(predictions, groundTruth);

// Check for drift
const drift = await BaselineManagerService.detectDrift(currentMetrics);
```

### E2E Test Scenarios (88 tests, 49+ passing)
**Critical Workflows**:
- Cross-platform correlation detection (6 tests)
- False positive filtering (11 tests)
- Real-time WebSocket updates (10 tests)
- Risk score evolution (12 tests)
- ML baseline learning (7 tests)
- OAuth token lifecycle (12 tests)
- Dashboard validation (21 Playwright tests)

**Run E2E Tests**:
```bash
npm test -- tests/e2e/scenarios/
npm test -- tests/e2e/complete-workflows/
```

### CI/CD Pipeline (8-9 min runtime)
**11 Parallel Jobs**:
1. prepare-and-lint (ESLint, TypeScript checks)
2. unit-tests (no external dependencies)
3. integration-tests (PostgreSQL + Redis containers)
4. security-tests (100% coverage target)
5. e2e-tests (3x retry, screenshots)
6. stress-tests (performance benchmarks)
7. coverage-report (Codecov, PR comments)
8. performance-regression (<10% threshold)
9. drift-detection (Slack alerts)
10. flakiness-report (3x retry analysis)
11. test-validation-complete (final status)

**Local Validation**:
```bash
./scripts/validate-ci-setup.sh  # Verify CI environment locally
```

### Coverage Requirements
- **Overall**: ≥80% line coverage
- **Security/OAuth**: 100% coverage (mandatory)
- **Detection Algorithms**: ≥95% coverage
- **New Code**: ≥80% coverage on PR diff

**Check Coverage**:
```bash
npm run test:coverage
# View: coverage/lcov-report/index.html
```

### Test Naming Conventions
```typescript
describe('ServiceName', () => {
  describe('methodName()', () => {
    it('should handle success case', () => {});
    it('should throw error when invalid input', () => {});
    it('should return null when not found', () => {});
  });
});
```

### Database Testing Best Practices
- Use test database (`DATABASE_URL_TEST`)
- Clean up after each test (`afterEach` hook)
- Use transactions for isolation
- Mock external API calls
- Use fixtures for consistent data

### Flakiness Prevention
- Avoid time-based assertions (use retries with exponential backoff)
- Clean up resources in `afterEach`/`afterAll`
- Use deterministic test data
- Avoid shared mutable state
- Run tests 10x to verify stability

---

## Quality Gates (CI/CD Enforced)

**Commit Requirements**:
- ✅ TypeScript compiles (`tsc --noEmit`)
- ✅ All tests pass (unit + integration + e2e)
- ✅ 80% coverage for new code (100% OAuth/security)
- ✅ No `@ts-ignore`
- ✅ Shared-types build successful
- ✅ Proper shared-types imports

**Testing Coverage**:
- Backend: Unit, integration, DB migration, OAuth, security, rate limiting, stress, performance
- Frontend: Component, interaction, state, API client, validation, error boundary
- E2E: OAuth flows, discovery workflows, correlation, real-time updates

**Performance Targets** (All Exceeded):
- Processing: <30s → 47ms (638x faster)
- Memory: <512MB → ~66MB (7.7x better)
- Throughput: >300/sec → >>300/sec
- CI/CD: <10 min → 8-9 min (10% ahead)

**Detection Accuracy** (All Exceeded):
- Precision: ≥85% → 100%
- Recall: ≥90% → 100%
- F1 Score: ≥87% → 100%

**Details**: See `.claude/docs/QUALITY_GATES.md` and `docs/CI_CD_GUIDE.md`

---

## Critical Pitfalls (MUST AVOID)

**Top 7 Learned Lessons**:
1. Service Instance State Loss → Use singleton exports
2. Slack API Method Validation → Methods like `apps.list()` don't exist
3. Dual Storage Architecture → Link connection metadata + OAuth tokens
4. Database Persistence Fallback → Docker containers may fail
5. OAuth Scope Research → Research BEFORE implementing
6. Database Migrations Not Applied → Automated runner required
7. **Incomplete Auth Migration → Remove ALL old auth code** ⚠️ NEW

**Full Details**: See `.claude/PITFALLS.md` with examples and solutions

---

## Documentation Index

**Core Docs**:
- **Architecture**: `.claude/ARCHITECTURE.md` - System design, tech stack
- **Patterns**: `.claude/PATTERNS.md` - Singleton, OAuth, repository, browser testing
- **Pitfalls**: `.claude/PITFALLS.md` - All 7 pitfalls with solutions
- **Auth Fix**: `docs/fixes/AUTH_REDIRECT_BUG_FIX.md` - Complete auth migration guide
- **Sub-Agents**: `.claude/agents/README.md` - 13 specialists
- **Delegation Examples**: `.claude/docs/DELEGATION_EXAMPLES.md` - Full scenarios
- **Agent Response Format**: `.claude/docs/AGENT_RESPONSE_FORMAT.md` - Standards
- **Quality Gates**: `.claude/docs/QUALITY_GATES.md` - Detailed requirements
- **API Reference**: `docs/API_REFERENCE.md` - Complete API docs
- **Testing Guide**: `docs/guides/TESTING.md` - Test strategy
- **CI/CD Guide**: `backend/docs/CI_CD_GUIDE.md` - Complete CI/CD workflow (918 lines)
- **Performance Optimization**: `backend/docs/PERFORMANCE_OPTIMIZATION_RECOMMENDATIONS.md` - 8 sections
- **Testing Infrastructure**: `backend/tests/*/README.md` - E2E scenarios, mock servers, stress tests

**Context7 Library IDs**:
- Node/Express: `/websites/expressjs`
- React: `/reactjs/react.dev`
- TypeScript: `/websites/typescriptlang`
- PostgreSQL: `/websites/postgresql`
- OAuth 2.0: `/websites/oauth_net`
- Socket.io: `/websites/socket_io`

---

## Success Indicators

**Current Status (96% MVP Complete)** ✅:
- ✅ Clerk multi-tenant auth
- ✅ Org-scoped OAuth (Slack ✅ + Google ✅ + Microsoft ✅)
- ✅ TypeScript: 199+ → 0 errors remaining (100% complete)
- ✅ Shared-types architecture (9K+ lines)
- ✅ Repository standardization
- ✅ Real-time discovery
- ✅ Automated migration runner
- ✅ Google Workspace full implementation (930 lines production code)
- ✅ Microsoft 365 full implementation (562 lines)
- ✅ Comprehensive Testing Suite (600+ tests, 99% complete)
  - Mock OAuth servers (Slack, Google, Microsoft)
  - Detection metrics: 100% precision/recall/F1
  - Performance: 638x faster, 7.7x better memory
  - CI/CD pipeline: 8-9 min runtime, 11 jobs
- 🔄 Next: Export functionality, Executive dashboard, Compliance framework

**You're Succeeding When**:
- Sub-agent delegation used (main context <100K tokens)
- TypeScript strict mode compliance (✅ ACHIEVED: 0 errors)
- Shared-types imports everywhere
- OAuth security patterns followed
- 80%+ test coverage maintained
- Live OAuth working (✅ Slack + Google working, Microsoft code complete)

**You're Failing When**:
- Main agent consuming context on specialized tasks
- Security ignored
- Code without tests
- TypeScript standards violated
- OAuth lacks security
