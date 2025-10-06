# SaaS X-Ray Development Guidelines

## CRITICAL PROTOCOL - Read First

### Pre-Action Checklist (MANDATORY)
Before ANY response:
1. **Evaluate Sub-Agent Delegation** - Can this be delegated? (See matrix below)
2. **Reference Project Context** - Is this SaaS X-Ray related?
3. **Check Documentation** - Need up-to-date library docs? (Use Context7)
4. **Validate Requirements** - TypeScript, testing, security requirements met?

---

## Sub-Agent Delegation Protocol

### Core Philosophy: Preserve Main Context
**RULE**: Main orchestrator NEVER consumes context on specialized tasks.
**GOAL**: Keep main context <100K tokens by delegating ALL specialized work.

### Delegation Decision Matrix

**ALWAYS Delegate (Automatic):**
- OAuth/credentials/platform APIs → `oauth-integration-specialist`
- Database/migrations/JSONB/queries → `database-architect`
- TypeScript errors/type coverage → `typescript-guardian`
- React/Clerk/Zustand issues → `react-clerk-expert`
- API endpoints/middleware → `api-middleware-specialist`
- Detection algorithms/ML/correlation → `detection-algorithm-engineer`
- Tests/coverage/failures → `test-suite-manager`
- Security/encryption/compliance → `security-compliance-auditor`
- Code reviews → `code-reviewer-pro`
- Documentation updates → `documentation-sync`
- Performance issues → `performance-optimizer`
- Docker/CI/CD → `docker-deployment-expert`
- API research/validation/best practices → `research-specialist`

**ONLY Main Agent Handles:**
- High-level architecture decisions
- Cross-domain tasks (3+ sub-agent expertise)
- Simple questions (no code changes)
- Requirements gathering

**Sub-Agent Details**: See `.claude/agents/README.md` for 13 specialist descriptions.

### Enforcement Rules
- Main agent NEVER directly edits OAuth/database/React code
- Main agent NEVER runs extensive grep/read operations
- Main agent NEVER debugs errors (delegate to specialist)
- Main agent NEVER writes tests (delegate to test-suite-manager)

---

## Core Development Beliefs

### Philosophy
- **Type-First** - All code MUST be fully typed (TypeScript strict mode)
- **Shared-Types Architecture** - Use `@saas-xray/shared-types` for all contracts
- **Test-First** - 80% coverage minimum, 100% for OAuth/security
- **Security-First** - OAuth and compliance in every decision
- **Singleton Pattern** - Stateful services MUST use singleton export pattern

### Workflow: Types → Tests → Code (TDD)
1. **Type Validation** - `npx tsc --noEmit` MUST pass first
2. **Test Verification** - Run tests, add new tests BEFORE implementation
3. **Code Integration** - Only integrate after types and tests validate
4. **Immediate Commit** - Commit after successful integration

**Failure Protocol**: ANY failure → IMMEDIATE REVERT

---

## SaaS X-Ray Quick Reference

### Project Overview
**Enterprise security platform** for discovering unauthorized AI agents, bots, and automations across SaaS applications.

**Tech Stack**:
- Frontend: React 18 + TypeScript 5.2 + Vite + Clerk Auth + Zustand + TailwindCSS
- Backend: Node.js 20 + Express + TypeScript 5.3 + Clerk + PostgreSQL (port 5433) + Redis (port 6379)
- Shared: `@saas-xray/shared-types` (9,000+ lines of centralized types)

**Current Features**:
- Multi-tenant auth (Clerk organization-based)
- Platform integrations: Slack ✅, Google Workspace ✅, Microsoft 365 🔄
- Real-time discovery (Socket.io)
- AI platform detection (OpenAI, Claude, Gemini)
- Cross-platform correlation engine

### Critical Architecture Patterns

**1. Singleton Services (Prevents State Loss)**
```typescript
// Service file exports singleton
export const oauthCredentialStorage = new OAuthCredentialStorageService();

// All consumers import singleton
import { oauthCredentialStorage } from './oauth-credential-storage-service';
```

**2. Dual Storage Architecture**
- Connection metadata → `hybridStorage` (database + memory)
- OAuth credentials → `oauthCredentialStorage` (singleton)
- SAME connection ID for both

**3. Repository Pattern (T | null)**
```typescript
interface Repository<T> {
  findById(id: string): Promise<T | null>;  // Standardized null handling
}
```

**4. Shared-Types Import Pattern**
```typescript
import { OAuthCredentials, User } from '@saas-xray/shared-types';
```

### Docker Infrastructure (CRITICAL)
```bash
# PostgreSQL: port 5433:5432
# Redis: port 6379:6379
docker compose up -d postgres redis

# Database URLs
DATABASE_URL=postgresql://postgres:password@localhost:5433/saas_xray
TEST_DATABASE_URL=postgresql://postgres:password@localhost:5433/saas_xray_test
```

### Validated OAuth Patterns

**Slack Scopes**: `users:read`, `team:read`, `channels:read`
**Google Scopes**: `script.projects.readonly`, `admin.directory.user.readonly`, `admin.reports.audit.readonly`

**Slack API Methods (Validated)**:
```typescript
// ✅ CORRECT: users.list() with is_bot filter
const users = await client.users.list();
const bots = users.members.filter(u => u.is_bot === true);

// ❌ WRONG: These methods DON'T EXIST
await client.apps.list();   // Does not exist!
await client.bots.list();   // Does not exist!
```

---

## Quality Gates

### Commit Requirements (Enforced by CI/CD)
- ✅ TypeScript compilation passes (`tsc --noEmit`)
- ✅ All tests pass (unit + integration + e2e)
- ✅ 80% test coverage for new code
- ✅ No `@ts-ignore` statements
- ✅ Shared-types build successful
- ✅ Proper shared-types imports
- ✅ Security tests pass for OAuth changes

### Testing Requirements
- **Backend**: Unit, integration, DB migration, OAuth, security, rate limiting tests
- **Frontend**: Component, interaction, state, API client, validation, error boundary tests
- **E2E**: Complete OAuth flows, discovery workflows, correlation tests

---

## Critical Pitfalls (MUST AVOID)

### Top 6 Learned Pitfalls
1. **Service Instance State Loss** - Use singleton exports (See `.claude/PITFALLS.md` #1)
2. **Slack API Method Validation** - Methods like `apps.list()` don't exist (See `.claude/PITFALLS.md` #2)
3. **Dual Storage Architecture** - Link connection metadata and OAuth tokens (See `.claude/PITFALLS.md` #3)
4. **Database Persistence Fallback** - Docker containers may fail (See `.claude/PITFALLS.md` #4)
5. **OAuth Scope Research** - Research BEFORE implementing (See `.claude/PITFALLS.md` #5)
6. **Database Migrations Not Applied** - Automated migration runner required (See `.claude/PITFALLS.md` #6)

**Full Details**: See `.claude/PITFALLS.md` for complete examples and solutions.

---

## Documentation Structure

### Quick Links
- **Architecture Details**: `.claude/ARCHITECTURE.md` - System architecture, tech stack, project structure
- **Code Patterns**: `.claude/PATTERNS.md` - Singleton usage, OAuth flows, repository patterns, type definitions
- **Critical Pitfalls**: `.claude/PITFALLS.md` - All 6 pitfalls with examples and solutions
- **Sub-Agents**: `.claude/agents/README.md` - 12 specialist sub-agents
- **API Reference**: `docs/API_REFERENCE.md` - Complete API documentation
- **Testing Guide**: `docs/guides/TESTING.md` - Test strategy and standards

### Context7 Library IDs
- Node.js/Express: `/websites/expressjs`
- React: `/reactjs/react.dev`
- TypeScript: `/websites/typescriptlang`
- PostgreSQL: `/websites/postgresql`
- OAuth 2.0: `/websites/oauth_net`
- Socket.io: `/websites/socket_io`

---

## Success Metrics

### Current Status (85% Complete)
- ✅ Clerk multi-tenant authentication
- ✅ Organization-scoped OAuth (Slack + Google Workspace)
- ✅ TypeScript errors: 199+ → 78 remaining
- ✅ Shared-types architecture (9,000+ lines)
- ✅ Repository standardization (T | null pattern)
- ✅ Real-time discovery system
- ✅ Automated migration runner
- 🔄 Next: Microsoft 365 integration

### You Are Succeeding When
- Sub-agent delegation used effectively (main context <100K tokens)
- TypeScript error count decreasing (target: 0)
- All new code uses shared-types imports
- OAuth security patterns followed
- Test coverage maintained at 80%+
- Live OAuth connections working with real workspaces

### You Are Failing When
- Main agent consuming context on specialized tasks
- Security requirements ignored
- Code changes without tests
- TypeScript standards violated
- OAuth integrations lack security
