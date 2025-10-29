# Project Context

## Purpose

Singura is an enterprise security platform for discovering and monitoring unauthorized AI agents, bots, and automation tools across organizational systems. The platform provides:

- **Multi-tenant SaaS architecture** with organization-scoped security
- **OAuth integration** with Slack, Google Workspace, and Microsoft 365
- **Real-time discovery** of AI agents, bots, and automation scripts
- **AI-powered detection** using machine learning for correlation and pattern recognition
- **Compliance framework** for governance and risk assessment
- **Executive dashboards** for security visibility and reporting

**Current Status**: 92% MVP complete with Clerk auth, Slack/Google OAuth working, Microsoft 365 code complete (OAuth testing pending)

## Tech Stack

### Frontend
- **React 18** with TypeScript 5.2
- **Vite** for build tooling
- **Clerk** for authentication and multi-tenancy
- **Zustand** for state management
- **TailwindCSS** for styling
- **Socket.io** for real-time updates

### Backend
- **Node.js 20** with Express
- **TypeScript 5.3** (strict mode)
- **Clerk** for authentication
- **PostgreSQL** (port 5433) for primary data storage
- **Redis** (port 6379) for caching and session management
- **Socket.io** for WebSocket communication

### Shared
- **@singura/shared-types** - 9,000+ lines of centralized TypeScript types
- Monorepo structure with shared type definitions across frontend/backend

### Infrastructure
- **Docker Compose** for local development (PostgreSQL + Redis)
- **pnpm** for package management (workspace-aware)

## Project Conventions

### Code Style

**TypeScript Standards (MANDATORY)**:
- Strict mode enabled (`strict: true`)
- No `@ts-ignore` allowed (use proper type guards)
- All code must pass `npx tsc --noEmit`
- Import shared types from `@singura/shared-types`

**Naming Conventions**:
- Services: `PascalCase` with `.service.ts` suffix
- Repositories: `PascalCase` with `.repository.ts` suffix
- Interfaces: `PascalCase` (e.g., `User`, `OAuthCredentials`)
- Constants: `SCREAMING_SNAKE_CASE`
- Functions/methods: `camelCase`

**File Organization**:
```
backend/src/
  ├── services/        # Business logic (singletons)
  ├── repositories/    # Data access layer
  ├── routes/          # Express route handlers
  ├── connectors/      # OAuth platform integrations
  └── database/        # Migrations and schema
```

**Formatting**:
- Prettier for auto-formatting
- ESLint for linting
- 2-space indentation
- Single quotes for strings

### Architecture Patterns

**1. Singleton Services** (CRITICAL):
```typescript
// Export singleton instance from service file
export const oauthCredentialStorage = new OAuthCredentialStorageService();
```
**Reason**: Prevents instance state loss in Node.js module system

**2. Dual Storage Architecture**:
- Connection metadata → `hybridStorage` (DB + in-memory)
- OAuth credentials → `oauthCredentialStorage` (singleton)
- SAME connection ID used for both stores

**3. Repository Pattern**:
```typescript
interface Repository<T> {
  findById(id: string): Promise<T | null>;  // Standardized null handling
  save(entity: T): Promise<T>;
  delete(id: string): Promise<void>;
}
```

**4. Shared-Types Architecture**:
- ALL type definitions in `@singura/shared-types`
- Frontend/backend import types (never duplicate)
- Build shared-types BEFORE frontend/backend

**5. OAuth Security Patterns**:
- Organization-scoped credentials (never user-scoped)
- Encrypted storage with AES-256-GCM
- Token rotation and refresh
- Scope validation against platform APIs

### Testing Strategy

**TDD Workflow (MANDATORY)**:
1. **Type Validation** → `npx tsc --noEmit` MUST pass first
2. **Test Verification** → Run tests, add new tests BEFORE implementation
3. **Code Integration** → Only integrate after types + tests validate
4. **Immediate Commit** → Commit after successful integration
5. **Failure Protocol** → ANY failure = IMMEDIATE REVERT

**Coverage Requirements**:
- **General code**: 80% minimum coverage
- **OAuth/Security**: 100% coverage (no exceptions)
- **New features**: Must include tests before merge

**Test Levels**:
- **Backend**: Unit, integration, DB migration, OAuth, security, rate limiting
- **Frontend**: Component, interaction, state, API client, validation, error boundary
- **E2E**: OAuth flows, discovery workflows, correlation engine

**Test Organization**:
```
backend/tests/
  ├── unit/           # Service/repository tests
  ├── integration/    # API endpoint tests
  └── demo/           # Demo scenarios and fixtures

frontend/src/
  └── __tests__/      # Component and integration tests
```

### Git Workflow

**Branch Strategy**:
- `main` - Production-ready code
- `fix/*` - Bug fixes
- `feature/*` - New features
- `refactor/*` - Code improvements

**Commit Requirements** (CI/CD Enforced):
- ✅ TypeScript compiles (`tsc --noEmit`)
- ✅ All tests pass (unit + integration + e2e)
- ✅ 80% coverage for new code (100% OAuth/security)
- ✅ No `@ts-ignore` in code
- ✅ Shared-types build successful
- ✅ Proper shared-types imports

**Commit Message Format**:
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

**Example**:
```
feat(oauth): Add Microsoft 365 OAuth connector

Implements OAuth 2.0 flow for Microsoft 365 with:
- Token encryption and storage
- Refresh token rotation
- Scope validation

Closes #123
```

## Domain Context

### OAuth Integration Patterns

**Slack API (Validated)**:
```typescript
// ✅ CORRECT - Validated methods
const users = await client.users.list();
const bots = users.members.filter(u => u.is_bot === true);

// ❌ WRONG - These methods DON'T EXIST
await client.apps.list();   // ❌ No such method
await client.bots.list();   // ❌ No such method
```

**Validated OAuth Scopes**:
- **Slack**: `users:read`, `team:read`, `channels:read`
- **Google**: `script.projects.readonly`, `admin.directory.user.readonly`, `admin.reports.audit.readonly`
- **Microsoft 365**: `User.Read.All`, `Directory.Read.All`, `AuditLog.Read.All`

**OAuth Security Requirements**:
1. Organization-scoped (not user-scoped)
2. Encrypted credential storage
3. Token rotation on refresh
4. Scope research BEFORE implementation
5. API method validation against official docs

### AI Detection Concepts

- **Automation Discovery**: Identifying bots, scripts, integrations
- **Correlation Engine**: Linking automation across platforms
- **Risk Assessment**: Scoring based on permissions and behavior
- **Real-time Monitoring**: WebSocket updates for new discoveries

## Important Constraints

### Security-First Architecture
- All OAuth credentials encrypted at rest
- Multi-tenant data isolation via Clerk organization IDs
- No cross-organization data leakage
- Security code requires 100% test coverage

### TypeScript Strict Compliance
- No `any` types (use `unknown` with type guards)
- No `@ts-ignore` comments
- All code must compile with `tsc --noEmit`
- Shared-types must build successfully

### Performance Requirements
- Database queries optimized with indexes
- Redis caching for frequently accessed data
- Real-time updates via WebSocket (not polling)
- Lazy loading for large datasets

### Regulatory & Compliance
- GDPR compliance for EU users
- SOC 2 preparation (audit trails, access logs)
- OAuth scope minimization
- Data retention policies

## External Dependencies

### Authentication
- **Clerk** - Multi-tenant authentication and organization management
  - Organization-scoped data isolation
  - User management and SSO
  - Webhook integration for user lifecycle

### Data Storage
- **PostgreSQL** (port 5433) - Primary data store
  - Connection metadata
  - Discovery results
  - Audit logs
- **Redis** (port 6379) - Caching layer
  - Session storage
  - Rate limiting
  - Real-time pubsub

### OAuth Platforms
- **Slack API** - Workspace integration
  - Users, channels, team info
  - Bot and app discovery
- **Google Workspace API** - Organization integration
  - Apps Script projects
  - Admin directory
  - Audit logs
- **Microsoft 365 API** - Tenant integration
  - Azure AD applications
  - Service principals
  - Audit logs

### Development Tools
- **Docker** - Container orchestration for PostgreSQL and Redis
- **pnpm** - Package management with workspace support
- **Vite** - Frontend build tooling
- **Chrome DevTools MCP** - Browser automation and testing (isolated mode)

### Context7 Library IDs (for up-to-date documentation)
- Node/Express: `/websites/expressjs`
- React: `/reactjs/react.dev`
- TypeScript: `/websites/typescriptlang`
- PostgreSQL: `/websites/postgresql`
- OAuth 2.0: `/websites/oauth_net`
- Socket.io: `/websites/socket_io`
