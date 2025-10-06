# Full Stack Development Guidelines

## **🚨 CRITICAL PROTOCOL - READ FIRST EVERY TIME 🚨**

### **MANDATORY PRE-ACTION CHECKLIST**

**Before responding to ANY user request, you MUST:**

1. **🤖 EVALUATE SUB-AGENT DELEGATION** - Can this task be delegated to a specialized sub-agent?
2. **🔍 Reference SaaS X-Ray Context** - Does this relate to the existing project?
3. **📖 Consult Documentation Strategy** - Should Context7 be used for up-to-date docs?
4. **✅ Validate Technical Requirements** - Check TypeScript, testing, and security needs

---

## 🤖 **MANDATORY SUB-AGENT DELEGATION PROTOCOL (CRITICAL)**

### **Core Philosophy: Preserve Main Context**

**RULE: The main orchestrator agent should NEVER consume context on specialized tasks.**

**Goal:** Keep main context <100K tokens by delegating ALL specialized work to sub-agents.

### **Sub-Agent Delegation Decision Matrix**

**ALWAYS Delegate to Sub-Agent:**
- ✅ OAuth debugging, credential issues, platform API work
- ✅ Database schema changes, migrations, JSONB issues, query optimization
- ✅ TypeScript errors, type coverage, shared-types integration
- ✅ React component fixes, Clerk integration, state management
- ✅ API endpoint changes, middleware issues, Express routes
- ✅ Detection algorithm work, ML models, correlation engine
- ✅ Writing tests, fixing test failures, coverage improvements
- ✅ Security audits, encryption validation, compliance reviews
- ✅ Code reviews after changes, pattern enforcement
- ✅ Documentation updates, API reference changes
- ✅ Performance optimization, query tuning, rendering issues
- ✅ Docker issues, CI/CD failures, container orchestration

**ONLY Main Agent Handles:**
- ❌ High-level planning and architecture decisions
- ❌ Cross-domain tasks requiring 3+ sub-agent expertise
- ❌ Simple questions not requiring code changes
- ❌ User clarification and requirements gathering

### **Available Sub-Agents (12 Specialists)**

**Location:** `.claude/agents/` (see README.md for full details)

| Sub-Agent | Use For | Key Expertise |
|-----------|---------|---------------|
| **oauth-integration-specialist** | OAuth flows, credentials, platform APIs | Singleton pattern, Slack/Google APIs, org ID scoping |
| **database-architect** | PostgreSQL, repositories, JSONB, migrations | T \| null pattern, JSONB objects, Docker port 5433 |
| **typescript-guardian** | Type errors, shared-types, type coverage | 78→0 errors, shared-types imports, strict mode |
| **react-clerk-expert** | React components, Clerk hooks, Zustand | Clerk migration, useAuth, organization context |
| **api-middleware-specialist** | Express routes, middleware, headers | Clerk auth extraction, CORS, request handling |
| **detection-algorithm-engineer** | AI detection, correlation, ML algorithms | 7 detection services, cross-platform correlation |
| **test-suite-manager** | Jest/Vitest/Playwright, 80%+ coverage | 195 test files, type-safe mocks, TDD |
| **security-compliance-auditor** | OAuth security, encryption, SOC2/GDPR | AES-256-GCM, audit logging, compliance |
| **code-reviewer-pro** | Post-change reviews, pattern enforcement | Architecture patterns, shared-types, singletons |
| **documentation-sync** | Docs updates, API references | 8.3K lines of docs, CLAUDE.md patterns |
| **performance-optimizer** | Database/API/React optimization | <2s requirement, 10K+ automations support |
| **docker-deployment-expert** | Docker, CI/CD, GitHub Actions | Container orchestration, migrations, deployments |

### **Delegation Syntax**

**Automatic Delegation (Preferred):**
```
> Fix the OAuth credential storage issue
→ Delegates to: oauth-integration-specialist

> Optimize the slow connections query
→ Delegates to: performance-optimizer
```

**Explicit Delegation:**
```
> Use the typescript-guardian to fix type errors
> Ask the database-architect to create a migration for audit_logs
> Have the security-compliance-auditor review OAuth token encryption
```

### **If No Sub-Agent Exists**

**When encountering a task with no matching sub-agent:**

1. **Stop and evaluate**: Does this task warrant a sub-agent?
2. **If yes (task will recur or is complex):**
   ```
   "This task requires [domain expertise]. I recommend creating a new sub-agent:

   Suggested Agent:
   - Name: [domain]-specialist
   - Expertise: [key focus areas]
   - Tools: [required tools]
   - Use cases: [when to invoke]

   Would you like me to create this sub-agent, or shall I handle this task directly?"
   ```
3. **If no (one-off simple task):** Handle directly in main context

### **Enforcement Rules**

**MANDATORY:**
- ❌ Main agent NEVER directly edits OAuth/database/React code
- ❌ Main agent NEVER runs extensive grep/read operations
- ❌ Main agent NEVER debugs errors (delegate to debugger or specialist)
- ❌ Main agent NEVER writes tests (delegate to test-suite-manager)

**ALLOWED:**
- ✅ Main agent plans multi-stage implementations
- ✅ Main agent coordinates multiple sub-agents
- ✅ Main agent answers simple questions
- ✅ Main agent reviews sub-agent outputs and synthesizes results

### **Context Budget Monitoring**

**Target Context Usage:**
- Main Agent: <100K tokens (high-level coordination)
- Sub-Agents: Handle all specialized work (separate context windows)
- Total Efficiency: 5-10x more work per session

**When to Delegate:**
If you're about to:
- Read 5+ files to understand an issue → Delegate
- Write >50 lines of code → Delegate
- Debug across multiple layers → Delegate
- Run complex test suites → Delegate

---

## Philosophy

### Core Beliefs

- **🔒 Type-First Development** – All new code MUST be fully typed with TypeScript, no exceptions.
- **🔄 Shared-Types Architecture** – All API contracts use centralized type definitions via @saas-xray/shared-types.
- **🧪 Test-First Development** – All new features MUST have comprehensive tests before merge.
- **Security-First Approach** – Every OAuth integration and data handling decision prioritizes security.
- **Iterative delivery over massive releases** – Ship small, working slices of functionality from database to UI.
- **Understand before you code** – Explore both front-end and back-end patterns in the existing codebase.
- **Pragmatism over ideology** – Choose tools and architectures that serve the project's goals, not personal preference.
- **Readable code over clever hacks** – Optimize for the next developer reading your code, not for ego.

### Simplicity Means

- One clear responsibility per module, class, or API endpoint.
- Avoid premature frameworks, libraries, or abstractions.
- While latest and new technology is considerable, stable and efficient should be prioritized.
- If your OAuth integration flow diagram needs an explanation longer than 3 sentences, it's too complex.

---

## Process

### 1. Planning & Staging

Break work into 3–5 cross-stack stages (front-end, back-end, database, integration). Document in `IMPLEMENTATION_PLAN.md`:

```markdown
## Stage N: [Name]
**Goal**: [Specific deliverable across the stack]  
**Success Criteria**: [User story + passing tests + security validation]  
**Tests**: [Unit, integration, E2E, security coverage]  
**Security**: [OAuth flow validation, permission checks, audit logging]
**Status**: [Not Started|In Progress|Complete]
```

### 2. Implementation Flow

- **Understand** – Identify existing patterns for UI, API, OAuth, and detection engine.
- **Security First** – Implement proper OAuth flows and security measures.
- **Test First** – Write comprehensive tests including security tests.
- **Implement Minimal** – Write just enough code to pass all tests.
- **Refactor Safely** – Clean code with proper test coverage.

---

## 🔒 **MANDATORY TYPESCRIPT REQUIREMENTS (NO EXCEPTIONS)**

### **Type Safety Rules (ENFORCED BY CI/CD)**

**RULE 1: EXPLICIT TYPES EVERYWHERE**
- Every function MUST have explicit return types
- All parameters MUST be properly typed
- No `any` types allowed - use `unknown` and type guards
- All third-party libraries MUST have type definitions

**RULE 2: SHARED TYPES ARCHITECTURE (CENTRALIZED)**
- API request/response types MUST be shared via `@saas-xray/shared-types` package
- Database models MUST have corresponding TypeScript interfaces
- OAuth flows MUST use strongly-typed credentials and responses
- ALL imports from shared-types MUST follow: `import { Type } from '@saas-xray/shared-types'`
- Shared-types package MUST be built before frontend/backend compilation

**RULE 3: RUNTIME TYPE VALIDATION**
- Type guards MUST be used for external data (API responses, user input)
- Database query results MUST be validated against TypeScript types
- All environment variables MUST be typed and validated

### **Type Definition Standards**

```typescript
// ✅ CORRECT: Explicit return types, proper interfaces
interface CreateUserRequest {
  email: string;
  name: string;
  organizationId: string;
}

interface CreateUserResponse {
  userId: string;
  email: string;
  createdAt: Date;
}

function createUser(request: CreateUserRequest): Promise<CreateUserResponse> {
  // Implementation with proper error handling
}

// ❌ INCORRECT: No return type, using any
function createUser(request: any) {
  // This will be rejected in PR review
}
```

### **Required Type Coverage (ENFORCED - POST-MIGRATION STATUS)**

**Current Migration Status (85% Complete):**
- ✅ **Shared-types package**: 9,000+ lines of centralized type definitions
- ✅ **Error reduction**: From 199+ TypeScript errors to 78 remaining
- ✅ **Repository standardization**: All repositories use T | null pattern
- ✅ **OAuth security**: Enhanced with ExtendedTokenResponse pattern
- 🔄 **Remaining work**: 78 TypeScript errors to resolve for 100% completion

**Type Coverage Requirements:**
- **100% of new code** must be properly typed with shared-types imports
- **Zero @ts-ignore** statements in new code
- **All API endpoints** must use shared-types request/response interfaces
- **All React components** must have typed props from shared-types
- **All database operations** must use typed models with T | null pattern
- **All shared-types imports** must be explicit and documented

### **🏗️ SHARED-TYPES ARCHITECTURE (POST-MIGRATION)**

**Critical Architecture Change**: All type definitions now centralized in `@saas-xray/shared-types` package.

**Package Structure:**
```typescript
// @saas-xray/shared-types/src/index.ts
export * from './api';
export * from './database';
export * from './oauth';
export * from './common';
```

**Build Order Requirements:**
1. `@saas-xray/shared-types` MUST build first
2. Backend can then import and compile
3. Frontend imports compiled shared-types
4. All CI/CD pipelines MUST respect this order

---

## 🔧 **SERVICE SINGLETON PATTERN (CRITICAL - MANDATORY)**

### **The Problem: State Loss from Multiple Instances**

**CRITICAL ISSUE DISCOVERED**: Creating new service instances in constructors or on each request causes **STATE LOSS**.

**Example of BROKEN Pattern**:
```typescript
// ❌ WRONG: Each request creates NEW instance = credentials disappear
export class RealDataProvider {
  private oauthStorage: OAuthCredentialStorageService;

  constructor() {
    this.oauthStorage = new OAuthCredentialStorageService(); // ❌ NEW INSTANCE!
  }
}
```

**What Happens**:
1. OAuth callback stores credentials in instance A
2. Discovery request creates instance B (empty credentials)
3. Discovery fails: "No OAuth credentials found"

### **The Solution: Singleton Export Pattern**

**✅ CORRECT Pattern**:
```typescript
// In the service file (oauth-credential-storage-service.ts):
export class OAuthCredentialStorageService {
  private credentialStore = new Map<string, Credentials>();
  // ... service implementation
}

// Export singleton instance at end of file
export const oauthCredentialStorage = new OAuthCredentialStorageService();

// In consuming files (data-provider.ts, simple-server.ts):
import { oauthCredentialStorage } from './oauth-credential-storage-service';

export class RealDataProvider {
  private oauthStorage = oauthCredentialStorage; // ✅ SHARED SINGLETON!
}
```

### **MANDATORY SINGLETON SERVICES**

**These services MUST use singleton pattern** (state is shared across requests):
- ✅ `oauthCredentialStorage` - OAuth credential management
- ✅ `hybridStorage` - Connection metadata storage
- ✅ Any service that caches data between requests
- ✅ Any service that maintains WebSocket connections
- ✅ Any service that manages rate limiting state

**These can be per-request instances** (stateless or request-scoped):
- ✅ Request-specific validators
- ✅ Per-request loggers
- ✅ Temporary data processors

### **Validation Checklist**

Before deploying any service, verify:
- [ ] Does this service store state between requests?
- [ ] Is this service being used by multiple modules?
- [ ] Could creating multiple instances cause data loss?

**If YES to any** → **MUST USE SINGLETON PATTERN**

---

**Import Patterns (MANDATORY):**
```typescript
// ✅ CORRECT: Import from shared-types package
import { 
  CreateUserRequest, 
  CreateUserResponse, 
  User,
  OAuthCredentials 
} from '@saas-xray/shared-types';

// ❌ INCORRECT: Local type definitions for API contracts
interface CreateUserRequest {
  // This will be rejected in PR review
}
```

### **Type Architecture Patterns (UPDATED)**

**1. Standardized Repository Pattern (T | null):**
```typescript
// All repositories now use consistent T | null return pattern
interface Repository<T, CreateInput = Omit<T, 'id'>, UpdateInput = Partial<T>> {
  create(data: CreateInput): Promise<T>;
  findById(id: string): Promise<T | null>;  // Standardized null handling
  update(id: string, data: UpdateInput): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}

// Real implementation example:
class UserRepository implements Repository<User, CreateUserInput, UpdateUserInput> {
  async findById(id: string): Promise<User | null> {
    const result = await this.db.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;  // Explicit null handling
  }
}
```

**2. Enhanced OAuth Security Types:**
```typescript
// Extended token response with security enhancements
interface ExtendedTokenResponse extends OAuthCredentials {
  tokenType: string;
  expiresIn: number;
  scope: string;
  refreshToken?: string;
  userId?: string;
  teamId?: string;
  enterpriseId?: string;
}

// Type-safe OAuth flow with proper error handling
type OAuthFlowResult = 
  | { success: true; credentials: ExtendedTokenResponse }
  | { success: false; error: string; code: string; statusCode: number };
```

**3. Database Query Parameter Types:**
```typescript
// All database operations now have typed parameters
interface QueryBuilder {
  select<T>(table: string, conditions?: Partial<T>): Promise<T[]>;
  insert<T>(table: string, data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  update<T>(table: string, id: string, data: Partial<T>): Promise<T | null>;
}
```

**4. API Result Discriminated Unions:**
```typescript
type APIResult<T> = 
  | { status: 'success'; data: T; timestamp: Date }
  | { status: 'error'; error: string; code: string; timestamp: Date }
  | { status: 'loading'; progress?: number };
```

## 🔧 **MANDATORY TYPES-TESTS-CODE (TDD) PROTOCOL**

### **Core Methodology: Types → Tests → Code**

**RULE 1: Type Validation First**
- All changes MUST pass `npx tsc --noEmit` before proceeding
- TypeScript compilation errors = IMMEDIATE STOP and revert
- No exceptions for "it works with --transpile-only"
- Leverage `@saas-xray/shared-types` for consistent type definitions

**RULE 2: Test Verification Second**  
- Run existing tests to ensure no breaking changes
- Add tests for new functionality BEFORE implementation
- Test coverage must meet 80% threshold
- Comprehensive test strategy includes:
  - Unit tests for isolated functions
  - Integration tests for cross-component interactions
  - Type-safe mocking of dependencies
  - Security and performance test coverage

**RULE 3: Code Integration Last**
- Only integrate after types and tests validate
- Immediate commit after successful integration
- Create safety checkpoints at stable states
- Each commit represents a minimal, testable increment

**STASH AND CHANGE MANAGEMENT**
- Always validate stashed changes via Types-Tests-Code methodology
- Drop stashes that introduce type errors or test failures
- Create backup branches before complex stash integrations
- Maintain clean git history with logical, incremental changes

**FAILURE PROTOCOL**
- ANY failure in types/tests → IMMEDIATE REVERT
- Use git stash, git reset, or git revert as needed
- Preserve working system over experimental changes
- Log and document reasons for reversion to improve future development

**COMMIT FREQUENCY GUIDELINES**
- Commit after each successful feature/fix implementation
- Maintain granular, logically grouped commits
- Use descriptive commit messages explaining:
  - What changed
  - Why the change was necessary
  - Any type or test validation performed
- Never commit code with known type errors or test failures

**PRACTICAL EXAMPLE**
```typescript
// ✅ CORRECT: Types-Tests-Code Workflow
// 1. Define shared type
export interface UserPermission {
  level: 'read' | 'write' | 'admin';
  scope: string[];
}

// 2. Write type-safe test
describe('UserPermissionService', () => {
  it('should validate admin permissions correctly', () => {
    const adminPermission: UserPermission = {
      level: 'admin',
      scope: ['*']
    };
    expect(validatePermission(adminPermission)).toBeTruthy();
  });
});

// 3. Implement minimal code to pass test
function validatePermission(permission: UserPermission): boolean {
  return permission.level === 'admin' && permission.scope.includes('*');
}
```

**CRITICAL ENFORCEMENT**
- These protocols are MANDATORY for all development
- CI/CD will automatically enforce these guidelines
- No manual overrides without explicit senior developer approval

---

## 🧪 **MANDATORY TESTING REQUIREMENTS (ENFORCED BY CI/CD)**

### **Test Coverage Requirements (NO COMPROMISES)**

**MINIMUM COVERAGE THRESHOLDS:**
- **New Features**: 80% test coverage (functions, lines, branches)
- **Bug Fixes**: Must include regression tests that fail before fix
- **OAuth/Security Code**: 100% test coverage
- **API Endpoints**: Integration tests for all status codes
- **React Components**: Render tests + interaction tests

### **Testing Checklist (MUST COMPLETE BEFORE MERGE)**

**Backend Testing Requirements:**
- [ ] Unit tests for all service functions
- [ ] Integration tests for API endpoints
- [ ] Database migration tests
- [ ] OAuth flow integration tests
- [ ] Security/encryption tests
- [ ] Error handling tests
- [ ] Rate limiting tests

**Frontend Testing Requirements:**
- [ ] Component render tests
- [ ] User interaction tests (clicks, forms, navigation)
- [ ] State management tests (Zustand stores)
- [ ] API client tests with mocked responses
- [ ] Form validation tests
- [ ] Error boundary tests
- [ ] Accessibility tests

**E2E Testing Requirements:**
- [ ] Complete OAuth flows (Slack, Google, Microsoft)
- [ ] Discovery workflows with real API calls
- [ ] Risk assessment calculations
- [ ] Cross-platform correlation tests
- [ ] Dashboard navigation and data display

### **Test File Structure (STANDARDIZED)**

```
src/
├── components/
│   ├── AutomationCard.tsx
│   └── __tests__/
│       └── AutomationCard.test.tsx
├── services/
│   ├── oauth-service.ts
│   └── __tests__/
│       ├── oauth-service.test.ts        # Unit tests
│       └── oauth-service.integration.test.ts  # Integration tests
└── __tests__/
    └── e2e/
        └── oauth-flows.e2e.test.ts
```

### **Testing Standards (ENFORCED)**

**1. Test Naming Convention:**
```typescript
describe('OAuthService', () => {
  describe('when exchanging authorization code', () => {
    it('should return credentials for valid code', async () => {
      // Test implementation
    });
    
    it('should throw error for invalid code', async () => {
      // Test implementation
    });
  });
});
```

**2. Mock Strategy:**
```typescript
// ✅ CORRECT: Type-safe mocks
const mockSlackAPI = {
  oauth: {
    v2: {
      access: jest.fn().mockResolvedValue({
        ok: true,
        access_token: 'mock-token',
        scope: 'channels:read'
      } as SlackOAuthResponse)
    }
  }
} as jest.Mocked<WebClient>;

// ❌ INCORRECT: Untyped mocks
const mockSlackAPI = {
  oauth: { v2: { access: jest.fn() } }
};
```

**3. Test Data Management:**
```typescript
// Centralized test fixtures with proper types
export const TEST_USER: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  organizationId: 'test-org-id',
  createdAt: new Date('2025-01-01')
};

export const TEST_OAUTH_CREDENTIALS: OAuthCredentials = {
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token',
  expiresAt: new Date('2025-12-31'),
  scope: ['channels:read', 'users:read'],
  platform: 'slack'
};
```

### **CI/CD Integration (AUTOMATIC ENFORCEMENT)**

**Pre-commit Hooks (Updated for Shared Types):**
- Shared-types package build verification
- TypeScript type checking (`tsc --noEmit`) across all packages
- ESLint with TypeScript rules and shared-types import validation
- Test execution for changed files with type coverage
- Coverage threshold validation (80% minimum)
- Shared-types dependency validation

**PR Requirements (AUTOMATED CHECKS - Enhanced):**
- All tests passing (including shared-types integration tests)
- Coverage meets minimum thresholds (80% for new code)
- TypeScript compilation successful across all packages
- Shared-types build successful and imported correctly
- No console.log statements in production code
- API documentation updated for endpoint changes
- Type coverage report shows improvement or maintenance
- No @ts-ignore statements in new code
- All shared-types imports follow established patterns

### **Quality Gates (CANNOT BE BYPASSED)**

**Before ANY merge to main:**
1. ✅ All TypeScript compilation passes
2. ✅ All tests pass (unit + integration + e2e)
3. ✅ Coverage meets 80% threshold for new code
4. ✅ No runtime type errors in development
5. ✅ Security tests pass for auth-related changes
6. ✅ Performance tests pass for database changes
7. ✅ Accessibility tests pass for UI changes

**Emergency Override Process:**
- Only for production hotfixes
- Requires two senior developer approvals
- Must include follow-up ticket for proper testing
- Cannot be used for new features

---

## Technical Standards

### Architecture (TypeScript Enhanced)

- **Shared-Types Architecture** – All API contracts centralized in @saas-xray/shared-types package
- **Repository Pattern Standardization** – All data access uses T | null return pattern
- **Security-First Design** – OAuth flows with ExtendedTokenResponse and proper type safety
- **Composition over inheritance** – For both UI components and service classes with proper typing
- **Interfaces/contracts over direct calls** – Use shared-types API specs and type definitions
- **Explicit data flow** – Document request/response shapes with shared-types in OpenAPI/Swagger
- **TDD when possible** – Unit tests + integration tests + security tests + type coverage for each feature slice

### Code Quality

**Every commit must (TypeScript Enhanced):**
- Pass shared-types build and compilation
- Pass linting, type checks, and formatting across all packages
- Pass all unit, integration, E2E, security, and type coverage tests
- Include tests for new logic with proper shared-types usage
- Validate OAuth flows with ExtendedTokenResponse pattern
- Include audit logging for security events with typed audit trails
- Maintain or improve TypeScript error count (currently 78 remaining)
- Use proper shared-types imports and T | null repository patterns

### Security Standards (MANDATORY)

**OAuth Integration Requirements:**
- Store OAuth tokens encrypted at rest
- Implement automatic token refresh
- Set appropriate token expiration policies
- Log token usage for audit purposes

**Data Protection:**
- Encrypt all data in transit and at rest
- Implement proper access controls
- Log all data access and modifications
- Comply with GDPR and other regulations

### Decision Framework

When multiple solutions exist, prioritize in this order:

1. **🔒 Security** – Does this maintain OAuth security and data protection?
2. **🧪 Testability** – Can OAuth flows and detection logic be tested in isolation?
3. **📖 Readability** – Will another dev understand this in 6 months?
4. **🔄 Consistency** – Matches existing patterns and architecture?
5. **⚡ Simplicity** – Least complex solution achieving business goals
6. **🔄 Reversibility** – Can we swap OAuth providers/detection methods easily?

---

# **🏗️ SaaS X-Ray Project Context**

## **📋 Instant Reference Card**

**When ANY SaaS X-Ray request arrives:**
1. 🤖 **SUB-AGENT**: Check if task can be delegated (see matrix above) - FIRST PRIORITY
2. 📖 **CONTEXT**: Reference project architecture below
3. 🔐 **SECURITY**: Consider OAuth and compliance requirements
4. 📚 **DOCS**: Consider Context7 for up-to-date library docs

## **🎯 Quick Sub-Agent Mapping (Common Tasks)**

**"OAuth not working / credentials missing"**
→ `oauth-integration-specialist` (checks singletons, dual storage, org ID)

**"Database error / migration needed / JSONB issue"**
→ `database-architect` (handles PostgreSQL, port 5433, T | null patterns)

**"TypeScript errors / type checking failing"**
→ `typescript-guardian` (fixes 78 errors, shared-types imports)

**"React component blank / Clerk auth issue"**
→ `react-clerk-expert` (useAuth hooks, organization context)

**"API endpoint 500 error / middleware issue"**
→ `api-middleware-specialist` (Clerk headers, CORS, Express routes)

**"Detection algorithm / AI platform detection"**
→ `detection-algorithm-engineer` (ML models, correlation engine)

**"Tests failing / need test coverage"**
→ `test-suite-manager` (Jest/Vitest/Playwright, 80%+ requirement)

**"Security review / OAuth security / encryption"**
→ `security-compliance-auditor` (SOC2, GDPR, AES-256-GCM)

**"Review my code changes"**
→ `code-reviewer-pro` (enforces patterns, singleton usage)

**"Update documentation / API changed"**
→ `documentation-sync` (keeps 8.3K docs current)

**"Slow query / dashboard lag / performance"**
→ `performance-optimizer` (<2s requirement, optimization)

**"Docker not starting / CI/CD failing"**
→ `docker-deployment-expert` (containers, migrations, GitHub Actions)

## Project Overview

**SaaS X-Ray** is an enterprise security platform that automatically discovers and monitors unauthorized AI agents, bots, and automations running across an organization's SaaS applications. The platform provides real-time visibility into shadow AI usage, enabling security teams to identify risks before they become compliance violations or security breaches.

### Key Features (Current Implementation)

**Multi-tenant Authentication (Clerk)**:
- Organization-based access control with Clerk
- Google OAuth sign-in integration
- User profile management with Clerk components
- Organization switching for multi-org access

**Platform Integrations**:
- ✅ Slack: Bot detection, app inventory, automation discovery
- ✅ Google Workspace: Apps Script, service accounts, AI platform detection
- 🔄 Microsoft 365: Planned (Power Platform, Graph API)

**AI Platform Detection**:
- OpenAI API usage detection in Google Workspace
- Claude/Anthropic integration detection
- Google Gemini usage monitoring
- Automated pattern matching and correlation

**Real-time Discovery**:
- Live progress tracking via Socket.io
- Progressive automation detection stages
- Cross-platform correlation engine
- Risk assessment and scoring

### Business Context
- **Target Market**: Enterprise security teams, CISOs, IT Directors, Compliance Officers
- **Problem**: Average enterprise has 50-200 unauthorized bots/automations with no visibility
- **Solution**: Automated discovery and risk assessment of shadow AI across SaaS platforms
- **Business Model**: SaaS pricing from $99-$999/month based on organization size

### Key Value Propositions
1. **Automation-First Detection** - Specifically designed to find bots and AI agents
2. **Cross-Platform Correlation** - Maps automation chains across multiple SaaS tools  
3. **Real-Time Monitoring** - Continuous discovery of new automations
4. **Risk-Based Prioritization** - Focus on highest-risk automations first
5. **Compliance Ready** - Generate audit reports and evidence packages

---

## Technical Architecture

### Technology Stack

**Frontend** (`@saas-xray/frontend`):
- **Framework**: React 18.2+ with TypeScript 5.2+
- **Build Tool**: Vite 5.0+ for development and build tooling
- **Authentication**: Clerk React SDK (@clerk/clerk-react) for multi-tenant auth
- **Styling**: TailwindCSS 3.3+ with shadcn/ui components
- **State Management**: Zustand 4.4+ for global state
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts 2.8+ for data visualization
- **Real-time**: Socket.io-client 4.7+ for live updates
- **Testing**: Vitest + React Testing Library + Playwright

**Backend** (`@saas-xray/backend`):
- **Runtime**: Node.js 20+ with Express.js 4.18+
- **Language**: TypeScript 5.3+ with strict mode
- **Authentication**: Clerk Backend SDK (@clerk/backend, @clerk/express)
- **Types**: @saas-xray/shared-types (centralized type definitions)
- **Database**: PostgreSQL 16 with pg 8.11+ (containerized on port 5433)
- **Cache**: Redis 4.6+ for caching and job queues (containerized on port 6379)
- **Jobs**: Bull 4.12+ for background job processing
- **Real-time**: Socket.io 4.7+ for WebSocket communication
- **Repository**: Standardized Repository<T, CreateInput, UpdateInput> pattern
- **OAuth**: Google Workspace, Slack, Microsoft 365 integrations
- **AI Detection**: OpenAI 5.23+ for AI platform detection
- **Security**: helmet, express-rate-limit, bcryptjs, jsonwebtoken

**Shared Types** (`@saas-xray/shared-types`):
- **9,000+ lines** of centralized TypeScript type definitions
- **Build-first architecture**: Must compile before frontend/backend
- **API contracts, database models, OAuth types, repository interfaces**

**Infrastructure**:
- **Containers**: Docker Compose for PostgreSQL (5433:5432) and Redis (6379:6379)
- **Development Ports**:
  - Frontend: http://localhost:4200 (Vite dev server)
  - Backend: http://localhost:4201 (Express API)
- **Testing**: Jest (backend), Vitest (frontend), Playwright (E2E)
- **CI/CD**: GitHub Actions with type checking, linting, testing

### **🐳 CONTAINERIZED DATABASE INFRASTRUCTURE (CRITICAL)**

**All databases run in Docker containers for development consistency:**

- **PostgreSQL**: Docker container port mapping `5433:5432`
- **Redis**: Docker container port mapping `6379:6379`
- **Test Database**: `saas_xray_test` within PostgreSQL container
- **Production Database**: `saas_xray` within PostgreSQL container

**Environment Configuration:**
```bash
# Development (Docker containers)
DATABASE_URL=postgresql://postgres:password@localhost:5433/saas_xray
TEST_DATABASE_URL=postgresql://postgres:password@localhost:5433/saas_xray_test
DB_PORT=5433

# Container startup required for all development/testing
docker compose up -d postgres redis
```

**Testing Requirements:**
- All tests require Docker containers to be running
- Database migrations must run against containerized databases
- Test isolation achieved through `saas_xray_test` database

### System Architecture (Current State - Clerk Multi-tenant)

```
┌─────────────────────────┐    ┌─────────────────────────┐    ┌─────────────────────────┐
│   Frontend (Vite)       │    │   Backend API           │    │   Detection Engine      │
│   Port: 4200            │    │   Port: 4201            │    │                         │
│                         │    │                         │    │                         │
│ • React 18 + TS 5.2     │◄───► • Express + TS 5.3      │◄───► • AI Platform Detection │
│ • Clerk Auth (React)    │    │ • Clerk Auth (Backend)  │    │ • Pattern Matching      │
│ • Zustand State         │    │ • JWT Verification      │    │ • Cross-Platform Corr.  │
│ • shadcn/ui + Tailwind  │    │ • REST + WebSocket      │    │ • Risk Assessment       │
│ • Socket.io Client      │    │ • Socket.io Server      │    │ • OpenAI Integration    │
│ • Real-time Updates     │    │ • Rate Limiting         │    │                         │
└─────────────────────────┘    └─────────────────────────┘    └─────────────────────────┘
         │                                │                                │
         │                                │                                │
         ▼                                ▼                                ▼
┌─────────────────────────┐    ┌─────────────────────────┐    ┌─────────────────────────┐
│ 🐳 PostgreSQL           │    │ 🐳 Redis + Bull         │    │   OAuth Connectors      │
│ Port: 5433:5432         │    │ Port: 6379:6379         │    │                         │
│                         │    │                         │    │ • Slack Web API         │
│ • Typed Repositories    │    │ • Background Jobs       │    │ • Google Workspace      │
│ • T | null Pattern      │    │ • Session Cache         │    │ • Microsoft 365         │
│ • Connection Metadata   │    │ • Rate Limit Store      │    │ • Encrypted Tokens      │
│ • Audit Logs            │    │ • Real-time Pub/Sub     │    │ • Auto-refresh          │
│ • Clerk Org IDs         │    │                         │    │                         │
└─────────────────────────┘    └─────────────────────────┘    └─────────────────────────┘
         ▲                                ▲                                ▲
         │                                │                                │
         └────────────────────────────────┼────────────────────────────────┘
                                          │
                          ┌───────────────────────────────────┐
                          │   @saas-xray/shared-types          │
                          │   (Centralized Type Definitions)   │
                          │                                    │
                          │ • 9,000+ lines of TypeScript       │
                          │ • API Request/Response Types       │
                          │ • Database Model Interfaces        │
                          │ • OAuth Security Types             │
                          │ • Repository Pattern Definitions   │
                          │ • Clerk Auth Types                 │
                          │ • Build-first Architecture         │
                          └───────────────────────────────────┘
```

### Project Structure

```
saas-xray/
├── frontend/                       # React + Vite frontend (port 4200)
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/             # Admin dashboard components
│   │   │   ├── auth/              # Clerk auth wrappers (ProtectedRoute)
│   │   │   ├── automations/       # Automation discovery UI
│   │   │   ├── connections/       # Platform connection cards
│   │   │   ├── correlation/       # Cross-platform correlation views
│   │   │   ├── dev/               # Development tools (MockDataToggle)
│   │   │   ├── layout/            # Header, sidebar, dashboard layout
│   │   │   ├── reports/           # Report generation components
│   │   │   └── ui/                # shadcn/ui base components
│   │   ├── lib/                   # Utilities (cn, date helpers)
│   │   ├── pages/                 # Route pages (Dashboard, Connections, etc.)
│   │   ├── services/              # API client (axios with interceptors)
│   │   ├── stores/                # Zustand state (connections, automations, UI)
│   │   ├── types/                 # Frontend-specific types
│   │   └── utils/                 # Clerk API helpers
│   └── package.json               # Vite, React, Clerk, Tailwind deps
│
├── backend/                       # Express API server (port 4201)
│   ├── src/
│   │   ├── config/                # Configuration files
│   │   ├── connectors/            # Platform-specific connectors
│   │   ├── controllers/           # Route controllers
│   │   ├── database/
│   │   │   └── repositories/      # Data access layer (T | null pattern)
│   │   ├── jobs/                  # Bull background jobs
│   │   ├── middleware/            # Clerk auth, rate limiting, CORS
│   │   ├── routes/                # API route definitions
│   │   ├── security/              # Encryption, JWT validation
│   │   ├── services/
│   │   │   ├── connectors/        # OAuth connector services
│   │   │   ├── detection/         # AI platform detection algorithms
│   │   │   └── ml-behavioral/     # ML-based behavior analysis
│   │   ├── types/                 # Backend-specific types
│   │   ├── simple-server.ts       # Main Express server (current)
│   │   └── server.ts              # Production server
│   └── package.json               # Express, Clerk, PostgreSQL, Redis deps
│
├── shared-types/                  # Centralized TypeScript types
│   ├── src/
│   │   ├── api/                   # API request/response interfaces
│   │   ├── common/                # Shared utility types
│   │   ├── database/              # Database model types
│   │   └── oauth/                 # OAuth credential types
│   └── package.json               # TypeScript with strict mode
│
├── docs/                          # Project documentation
│   ├── PRD.md                     # Product Requirements Document
│   ├── AI-PLATFORM-DETECTION-IMPLEMENTATION.md
│   └── CLERK_*.md                 # Clerk integration docs
│
├── e2e/                           # Playwright E2E tests
│   └── tests/
│
├── docker-compose.yml             # PostgreSQL + Redis containers
└── package.json                   # Root workspace configuration
```

---

## OAuth Integration Patterns

### Supported Platforms (OAuth 2.0 Integrations)

**Slack** (✅ Implemented):
- OAuth Scopes: `users:read`, `team:read`, `channels:read`, `usergroups:read`, `workflow.steps:execute`, `commands`
- Bot detection via `users.list()` API (filters `is_bot === true`)
- App inventory and webhook monitoring
- Real-time automation discovery

**Google Workspace** (✅ Implemented):
- OAuth Scopes: `openid`, `email`, `profile`, `script.projects.readonly`, `admin.directory.user.readonly`, `admin.reports.audit.readonly`, `drive.metadata.readonly`
- Apps Script project detection
- Service account discovery
- OAuth app audit logging
- AI platform detection (OpenAI, Claude, Gemini integrations)

**Microsoft 365** (🔄 Planned):
- Power Platform apps detection
- Microsoft Graph API activity monitoring
- Azure AD service principal discovery

### OAuth Security Requirements (CRITICAL)

**Token Management**:
- Store OAuth tokens encrypted at rest using `MASTER_ENCRYPTION_KEY`
- Implement automatic token refresh
- Set appropriate token expiration policies
- Log token usage for audit purposes
- **USE SINGLETON** `oauthCredentialStorage` for credential management

**Permission Auditing**:
- Regularly review granted permissions
- Implement least-privilege access
- Monitor permission usage and scope
- Set up alerts for permission changes

### **OAuth Implementation Flow (VALIDATED WORKING PATTERN)**

**Complete OAuth Flow** (from authorization to discovery):

```typescript
// 1. OAuth Callback Handler (simple-server.ts)
app.get('/api/auth/callback/slack', async (req, res) => {
  const { code } = req.query;

  // Exchange authorization code for access tokens
  const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID,
      client_secret: process.env.SLACK_CLIENT_SECRET,
      code: code,
      redirect_uri: redirectUri
    })
  });

  const tokenData = await tokenResponse.json();

  // Store connection metadata in hybridStorage
  const storageResult = await hybridStorage.storeConnection({
    organization_id: 'org-id',
    platform_type: 'slack',
    platform_user_id: userId,
    display_name: `Slack - ${teamName}`,
    permissions_granted: scopes
  });

  // Store OAuth credentials in singleton (CRITICAL!)
  await oauthCredentialStorage.storeCredentials(storageResult.data.id, {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    // ... other credential fields
  });
});

// 2. Discovery Handler (data-provider.ts)
async discoverAutomations(connectionId: string) {
  // Get connection metadata
  const connection = await hybridStorage.getConnections(orgId);

  // Get OAuth credentials from SINGLETON (shares state with callback!)
  const credentials = await this.oauthStorage.getCredentials(connectionId);

  // Authenticate API client
  await slackConnector.authenticate(credentials);

  // Make real API calls
  const automations = await slackConnector.discoverAutomations();
  return automations; // Real data!
}
```

### **OAuth Scope Requirements (VALIDATED)**

**Slack Minimum Scopes for Bot Discovery**:
```typescript
const slackScopes = [
  'users:read',              // Required for users.list API
  'team:read',               // Required for team.info API
  'channels:read',           // Channel information
  'usergroups:read',         // User groups
  'workflow.steps:execute',  // Workflow detection
  'commands'                 // Slash command detection
];
```

**Google Workspace Minimum Scopes for Automation Discovery**:
```typescript
const googleScopes = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/script.projects.readonly',      // Apps Script projects
  'https://www.googleapis.com/auth/admin.directory.user.readonly', // Service accounts
  'https://www.googleapis.com/auth/admin.reports.audit.readonly',  // Audit logs
  'https://www.googleapis.com/auth/drive.metadata.readonly'        // Drive metadata
];
```

### **Slack API Discovery Methods (VALIDATED WORKING)**

**CRITICAL**: Some API methods don't exist in Slack Web API! Use these instead:

```typescript
// ❌ WRONG: These methods DON'T EXIST
await client.apps.list();    // No such method
await client.bots.list();    // No such method

// ✅ CORRECT: Use these methods instead
const usersResult = await client.users.list();  // Returns all users including bots
const botUsers = usersResult.members.filter(user => user.is_bot === true);

// Bot information is in user.profile - no need for separate bots.info call
const botInfo = {
  userId: botUser.id,
  name: botUser.profile.real_name,
  appId: botUser.profile.app_id,
  botId: botUser.profile.bot_id
};
```

### Connector Interface Pattern (Enhanced with Shared Types)

```typescript
// Now imports from shared-types package
import { 
  OAuthCredentials, 
  ExtendedTokenResponse,
  ConnectionResult,
  AutomationEvent,
  AuditLogEntry,
  PermissionCheck 
} from '@saas-xray/shared-types';

interface PlatformConnector {
  platform: 'slack' | 'google' | 'microsoft';
  authenticate(credentials: OAuthCredentials): Promise<ConnectionResult>;
  refreshToken(refreshToken: string): Promise<ExtendedTokenResponse | null>;
  discoverAutomations(): Promise<AutomationEvent[]>;
  getAuditLogs(since: Date): Promise<AuditLogEntry[]>;
  validatePermissions(): Promise<PermissionCheck>;
}

// Repository pattern with T | null standardization
interface ConnectorRepository extends Repository<PlatformConnector> {
  findByPlatform(platform: string): Promise<PlatformConnector | null>;
  findActiveConnections(): Promise<PlatformConnector[]>;
}
```

---

## Project-Specific Development Patterns

### Connector Layer Implementation
- Each SaaS platform has its own connector class
- Unified interface for discovery and monitoring
- Rate limiting and error handling for API calls
- Secure credential management with encryption

### Detection Engine Architecture
- Pattern matching for automation identification
- Machine learning for behavior analysis
- Cross-platform correlation algorithms
- Risk scoring based on permissions and activity

### Real-Time Updates
- Socket.io for live dashboard updates
- Redis pub/sub for event broadcasting
- Background job queues for data processing
- Webhook handling for platform notifications

### Data Models
- Automation entities with risk scores
- Platform connections and credentials
- Audit trails and compliance reports
- Time-series data for activity tracking

---

## **⚡ EMERGENCY REMINDERS**

### **🚨 NEVER DO THESE:**
- ❌ Write OAuth flows without proper security validation
- ❌ Skip security tests for OAuth integrations
- ❌ Implement features without proper TypeScript typing
- ❌ Skip test coverage requirements

### **✅ ALWAYS DO THESE:**
- ✅ Reference SaaS X-Ray context for project requests
- ✅ Prioritize OAuth security and compliance requirements
- ✅ **Use singleton pattern for stateful services** (prevents credential loss)
- ✅ **Validate Slack API methods exist** before implementing (some don't exist in Web API)
- ✅ Follow TypeScript-first development approach
- ✅ Write comprehensive tests for all new code

---

## ⚠️ **CRITICAL PITFALLS LEARNED (MUST READ)**

### **1. Service Instance State Loss (SOLVED)**

**Symptom**: OAuth credentials stored but discovery can't find them
**Cause**: Each module creating new service instance with empty state
**Solution**: Export singleton from service file, import everywhere

```typescript
// ✅ CORRECT: Service file exports singleton
export const oauthCredentialStorage = new OAuthCredentialStorageService();

// ✅ CORRECT: All consumers import singleton
import { oauthCredentialStorage } from './oauth-credential-storage-service';
```

### **2. Slack API Method Validation (CRITICAL)**

**Symptom**: Code calls `client.apps.list()` or `client.bots.list()` → API errors
**Cause**: These methods DON'T EXIST in Slack Web API
**Solution**: Use `users.list()` with `is_bot` filter instead

```typescript
// ❌ WRONG: Non-existent methods
await client.apps.list();   // Does not exist!
await client.bots.list();   // Does not exist!

// ✅ CORRECT: Use existing methods
const users = await client.users.list();
const bots = users.members.filter(u => u.is_bot === true);
```

### **3. OAuth Dual Storage Architecture**

**Symptom**: Connections show but discovery fails with "No credentials"
**Cause**: Connection metadata and OAuth tokens stored in different systems
**Solution**: Dual storage with linked IDs

```typescript
// Store connection metadata
const result = await hybridStorage.storeConnection(metadata);

// Store OAuth tokens with SAME connection ID
await oauthCredentialStorage.storeCredentials(result.data.id, tokens);
```

### **4. Database Persistence Fallback**

**Symptom**: Credentials lost on backend restart even with database code
**Cause**: PostgreSQL not running (Docker container failed)
**Solution**: Hybrid pattern with graceful degradation

```typescript
// Credentials attempt database, fall back to memory if DB unavailable
try {
  await db.saveCredentials(credentials);
  console.log('✅ Persisted to database');
} catch (dbError) {
  console.warn('⚠️  Database unavailable, using memory cache');
  // Memory cache still works for current session
}
```

### **5. OAuth Scope Research Before Implementation**

**Symptom**: APIs return 0 results or permission errors
**Cause**: Insufficient OAuth scopes requested
**Solution**: Research minimum scopes BEFORE implementing

**Validated Scopes**:
- Slack bot discovery: `users:read` + `team:read` (sufficient)
- Google Apps Script: `script.projects.readonly` + `admin.directory.user.readonly` + `admin.reports.audit.readonly`

### **6. Database Migrations Not Applied (CRITICAL - RECURRING ISSUE)**

**Symptom**: 500 errors on DELETE endpoints, UUID format errors, errors keep recurring after "fixes"
**Root Cause**: Migration files created but NEVER APPLIED to database
**Why It Recurs**:
- No migration tracking system
- No automated migration runner
- Database can be recreated from old schema
- Manual `psql -f migration.sql` easily forgotten

**The Problem:**
```
Error: invalid input syntax for type uuid: "google-1759721169098"
```
Application uses Clerk string IDs, but database still has UUID columns because migrations weren't applied.

**Permanent Solution (IMPLEMENTED 2025-10-06):**

1. **Migration Tracking Table** (`schema_migrations`)
   - Records which migrations have been applied
   - Checksums prevent tampering
   - Execution time tracking
   - Error logging

2. **Automated Migration Runner** (`/backend/src/database/migrate.ts`)
   - Runs on server startup BEFORE accepting traffic
   - Scans `/migrations/*.sql` files
   - Applies pending migrations in order
   - Server exits if migrations fail

3. **Server Integration** (`simple-server.ts`)
   ```typescript
   async function startServer() {
     await runMigrations();  // ✅ REQUIRED: Migrations run first
     const server = httpServer.listen(PORT);
     return server;
   }
   ```

**How to Verify Migrations Applied:**
```bash
export PGPASSWORD=password
psql -h localhost -p 5433 -U postgres -d saas_xray -c "SELECT * FROM schema_migrations ORDER BY applied_at DESC;"
```

**Critical Migrations Applied:**
- `000_create_migration_table` - Migration tracking system
- `003_clerk_complete_migration` - UUID → VARCHAR(255) for Clerk IDs
- `004_fix_audit_trigger_for_deletes` - Fix FK constraint on DELETE

**Documentation**: `/docs/DATABASE_MIGRATION_ISSUE_ROOT_CAUSE.md`

**NEVER DO THIS AGAIN:**
- ❌ Create migration file without applying it
- ❌ Assume Docker container persisted schema changes
- ❌ Fix database issues without updating migration files
- ❌ Skip migration verification after "fixing" errors

**ALWAYS DO THIS:**
- ✅ Create migration file in `/backend/migrations/`
- ✅ Use sequential numbering (005_your_change.sql)
- ✅ Let automated runner apply migrations on startup
- ✅ Verify migrations in `schema_migrations` table
- ✅ Test migrations in test database first

---

## Security Considerations (MANDATORY)

### Data Protection
- Encrypt all data in transit and at rest
- Implement proper access controls
- Log all data access and modifications
- Comply with GDPR and other regulations

### OAuth Flow Security
- Use HTTPS for all OAuth flows
- Implement proper CORS policies
- Validate all redirect URIs
- Use secure session management

### API Security
- Rate limiting on all endpoints
- Input validation and sanitization
- Correlation IDs for request tracking
- Comprehensive audit logging

---

## Testing Strategy (Agent-Enforced)

### Test Coverage Requirements
- Unit tests for all connector logic
- Integration tests for OAuth flows
- End-to-end tests for discovery workflows
- Security tests for credential handling

### Test Data Management
- Mock OAuth responses for testing
- Sanitized production data for development
- Test automation for CI/CD pipeline
- Performance testing for large datasets

---

## **🎯 Success Metrics**

**Migration Achievement Status (Updated 2025-10-04):**
- ✅ **Clerk Multi-tenant Authentication** - Integrated @clerk/clerk-react and @clerk/backend for enterprise auth
- ✅ **Organization-scoped OAuth** - Platform connections tied to Clerk organization IDs
- ✅ **Enhanced Type Safety** - TypeScript errors reduced from 199+ to 78 remaining (85% complete)
- ✅ **Dual OAuth Platform Integration** - Slack + Google Workspace working with Clerk auth
- ✅ **Google Workspace AI Detection** - Apps Script, service accounts, and AI platform detection
- ✅ **Real-time Discovery System** - Socket.io progress tracking with enterprise UX
- ✅ **Detection Algorithm Framework** - VelocityDetector, BatchOperationDetector, AIProviderDetector
- ✅ **Shared-Types Architecture** - 9,000+ lines of centralized type definitions
- ✅ **Repository Standardization** - All repositories use T | null pattern
- ✅ **OAuth Security Enhancement** - ExtendedTokenResponse with encrypted token storage
- ✅ **Multi-tenant Dashboard** - OrganizationSwitcher, UserProfile, Clerk components integrated
- 🔄 **Next: Microsoft 365 Integration** - Power Platform and Graph API detection

**You are succeeding when:**

- SaaS X-Ray patterns and shared-types architecture properly leveraged
- OAuth security requirements use ExtendedTokenResponse pattern
- Code quality remains high with comprehensive test coverage
- TypeScript error count decreases toward zero
- All new code uses shared-types imports
- Live OAuth connections working with real enterprise workspaces
- Security and compliance features properly implemented

**You are failing when:**

- SaaS X-Ray context ignored or shared-types architecture misapplied
- Security requirements not properly implemented
- Code changes lack proper testing and validation
- TypeScript standards not followed
- OAuth integrations lack comprehensive security

---

## **📚 Documentation Strategy**

### Context7 Integration
- Use Context7 MCP server for up-to-date documentation
- Retrieve docs before agent implementation begins

### Key Library IDs for SaaS X-Ray
- **Node.js/Express**: `/websites/expressjs`
- **React**: `/reactjs/react.dev`  
- **TypeScript**: `/websites/typescriptlang`
- **PostgreSQL**: `/websites/postgresql`
- **OAuth 2.0**: `/websites/oauth_net`
- **Socket.io**: `/websites/socket_io`
- **Bull Queue**: `/bull/bull`

---