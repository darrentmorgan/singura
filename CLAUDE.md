# Full Stack Development Guidelines

## **🚨 CRITICAL PROTOCOL - READ FIRST EVERY TIME 🚨**

### **MANDATORY PRE-ACTION CHECKLIST (BMAD ENHANCED)**

**Before responding to ANY user request, you MUST:**

1. **📋 Check Agent Dispatch Requirements** - Is this a task requiring specialized agents?
2. **🔍 Reference SaaS X-Ray Context** - Does this relate to the existing project?
3. **💰 VALIDATE BMAD BUSINESS PRIORITY** - Check revenue impact in docs/bmad/
4. **📖 Consult Documentation Strategy** - Should Context7 be used for up-to-date docs?
5. **⚡ Apply Immediate Dispatch Rule** - If complex, delegate NOW, don't attempt yourself

### **🎯 IMMEDIATE DISPATCH TRIGGERS (NO EXCEPTIONS)**

If the request contains ANY of these keywords or concepts, **IMMEDIATELY** invoke `agent_organizer`:

- **Code Keywords**: `write`, `create`, `build`, `implement`, `add`, `fix`, `debug`, `refactor`
- **Analysis Keywords**: `analyze`, `explain`, `understand`, `review`, `examine`  
- **Project Keywords**: `feature`, `function`, `component`, `API`, `endpoint`, `test`
- **File Operations**: `modify`, `update`, `generate`, `document`
- **OAuth Keywords**: `authenticate`, `connect`, `integration`, `permissions`, `security`
- **Detection Keywords**: `discover`, `monitor`, `scan`, `correlate`, `risk assessment`

**❌ NEVER attempt these tasks yourself. ✅ ALWAYS dispatch to agent_organizer.**

---

## **💰 BMAD BUSINESS CONTEXT INTEGRATION**

### **MANDATORY BUSINESS-FIRST VALIDATION**

Before any technical decision, agents MUST reference BMAD documentation for business context:

#### **🎯 Business Impact Validation Framework**

**Step 1: Revenue Impact Assessment**
- **📊 Market Position**: Does this align with revenue goals in `docs/bmad/project-brief.md`?
- **💵 Pricing Tier Impact**: Will this enable higher subscription tiers ($299→$999→$2999)?
- **🎯 Customer Success**: Does this reduce time-to-value or increase retention?

**Step 2: Priority Validation (P0-P3 Framework)**
- **P0 (Revenue Blocker)**: Prevents customer acquisition or causes immediate churn
- **P1 (Revenue Driver)**: Directly increases ARR or enables premium pricing
- **P2 (Revenue Enabler)**: Supports future revenue growth or market expansion
- **P3 (Revenue Neutral)**: Technical debt with minimal business impact

Reference: `docs/bmad/epic-story-breakdown.md` for complete priority framework

**Step 3: Architecture Alignment Check**
- **🏗️ Scalability**: Does this support business scaling in `docs/bmad/architecture-bmad.md`?
- **🔒 Enterprise Requirements**: Does this meet enterprise buyer needs for $2999+ tier?
- **⚡ Performance**: Does this maintain competitive advantage through speed?

**Step 4: Implementation Gap Analysis**
- **📋 Critical Gaps**: Is this addressing P0/P1 gaps in `docs/bmad/implementation-gap-analysis.md`?
- **🔄 Revenue Risk**: What's the opportunity cost of NOT implementing this?
- **⏰ Timeline**: How does this align with revenue milestone targets?

### **🚀 BMAD-Enhanced Agent Dispatch Protocol**

```typescript
interface BMADValidatedRequest {
  businessContext: {
    revenueImpact: "P0 Revenue Blocker" | "P1 Revenue Driver" | "P2 Revenue Enabler" | "P3 Revenue Neutral";
    marketPosition: "Competitive Advantage" | "Table Stakes" | "Differentiation" | "Nice to Have";
    customerValue: "Immediate" | "Short-term" | "Long-term" | "Minimal";
    riskMitigation: "Critical" | "High" | "Medium" | "Low";
  };

  technicalExecution: {
    dispatchRequired: boolean;
    agentSpecialization: string[];
    businessValidation: boolean;
  };
}
```

### **📚 Project Documentation Quick Reference**

#### **Strategic Business Context**
- **📊 Market & Revenue Strategy**: [`/docs/PROJECT-BRIEF.md`](/docs/PROJECT-BRIEF.md)
  - $2.3B market opportunity, competitive positioning
  - Revenue model validation ($299-2999/month tiers)
  - Go-to-market strategy and customer success metrics

- **📋 Business-Driven Product Spec**: [`/docs/PRD.md`](/docs/PRD.md)
  - Revenue-driven user stories with business impact
  - Competitive feature requirements for revenue protection
  - Success metrics correlated to revenue growth

#### **Technical Business Alignment**
- **🏗️ Business-Aligned Architecture**: [`/docs/ARCHITECTURE.md`](/docs/ARCHITECTURE.md)
  - Revenue-scalable technology stack decisions
  - Business-critical detection algorithms
  - Enterprise-grade security for premium pricing

- **📝 Development Roadmap**: [`/docs/ROADMAP.md`](/docs/ROADMAP.md)
  - P0-P3 priority framework based on revenue impact
  - Business value mapping for each epic and story
  - Implementation status with revenue validation

#### **Implementation Intelligence**
- **🔍 Customer Validation**: [`/docs/CUSTOMER-VALIDATION.md`](/docs/CUSTOMER-VALIDATION.md)
  - Critical insights from beta testing
  - Business-impact feature prioritization
  - Customer feedback and roadmap alignment

**Note:** Previous BMAD documentation has been consolidated into these standard project documentation files.

### **⚡ Revenue-First Development Protocol**

**All agents MUST validate business impact before technical implementation:**

1. **Business Context First**: Reference BMAD docs for revenue/market context
2. **Priority Validation**: Confirm P0-P3 priority based on business impact
3. **Technical Excellence**: Implement with full TypeScript/testing standards
4. **Revenue Correlation**: Measure success by business outcomes, not just technical metrics

**Success Criteria Integration:**
- ✅ Technical implementation achieves business objectives from BMAD docs
- ✅ Feature priority aligns with revenue impact (P0-P3 framework)
- ✅ Architecture decisions support business model scaling
- ✅ Customer success metrics improve through technical excellence

---

## Philosophy

### Core Beliefs

- **🚀 Agent-First Development** – Complex tasks require specialized virtual agents, not general responses.
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

## **🎭 AGENT DISPATCH PROTOCOL (MANDATORY)**

### **Core Philosophy: You Are a Dispatcher, Not a Solver**

Your primary function is **intelligent delegation**, not direct problem-solving.

```mermaid
graph TD
    A[📨 User Request Arrives] --> B[🔍 MANDATORY: Check Dispatch Criteria]
    B --> C{❓ Meets ANY Dispatch Trigger?}
    C -- ✅ YES --> D[🚨 IMMEDIATE: Invoke agent_organizer]
    C -- ❌ NO --> E{🤔 Still Uncertain?}
    E -- YES --> D
    E -- NO --> F[📝 Simple Direct Response Only]
    
    D --> G[🎯 Agent Organizer Analyzes Request]
    G --> H[👥 Specialized Agents Execute]
    H --> I[📋 Final Results Returned]
    I --> J[📤 You Present Results to User]

    style B fill:#ff9999,stroke:#333,stroke-width:3px
    style D fill:#99ff99,stroke:#333,stroke-width:3px
    style C fill:#ffff99,stroke:#333,stroke-width:2px
```

### **❗ CRITICAL DISPATCH RULES**

**RULE 1: When in Doubt, DISPATCH**
- If you spend more than 10 seconds thinking about how to solve it, dispatch it.
- Better to over-delegate than under-delegate.

**RULE 2: Multi-Step Tasks = AUTOMATIC DISPATCH**
- Any task requiring more than 2 sequential actions gets dispatched.
- Example: "First do X, then Y" → DISPATCH

**RULE 3: SaaS X-Ray Context = ENHANCED DISPATCH**  
- All SaaS X-Ray-related requests get enhanced context via dispatch.
- Agent organizer has full project context you lack.

**RULE 4: OAuth/Security Tasks = IMMEDIATE DISPATCH**
- OAuth flows, security implementations, and compliance features require expert handling.

---

## Process

### 1. **🔥 URGENT: Pre-Response Protocol**

**Every single response must begin with this mental checklist:**

```
[ ] Does this involve code creation/modification?
[ ] Does this require analysis of existing code?  
[ ] Does this involve multiple technical steps?
[ ] Does this relate to SaaS X-Ray project specifically?
[ ] Does this involve OAuth, security, or compliance?
[ ] Does this involve platform connectors or detection logic?
[ ] Am I uncertain about the best approach?

If ANY checkbox is YES → DISPATCH TO AGENT_ORGANIZER
```

### 2. Planning & Staging (When NOT Dispatching)

Break work into 3–5 cross-stack stages (front-end, back-end, database, integration). Document in `IMPLEMENTATION_PLAN.md`:

```markdown
## Stage N: [Name]
**Goal**: [Specific deliverable across the stack]  
**Success Criteria**: [User story + passing tests + security validation]  
**Tests**: [Unit, integration, E2E, security coverage]  
**Security**: [OAuth flow validation, permission checks, audit logging]
**Status**: [Not Started|In Progress|Complete]
```

### 3. Implementation Flow (Agent-Managed)

When you dispatch to agent_organizer:
- **Understand** – Agents identify existing patterns for UI, API, OAuth, and detection engine.
- **Security First** – Agents implement proper OAuth flows and security measures.
- **Test First** – Agents write comprehensive tests including security tests.
- **Implement Minimal** – Agents write just enough code to pass all tests.
- **Refactor Safely** – Agents clean code with proper test coverage.

---

## **🚨 FOLLOW-UP PROTOCOL**

### Complexity Re-Assessment for Follow-ups

```mermaid
graph TD
    A[📬 Follow-up Question] --> B[⚡ URGENT: Re-check Dispatch Criteria]
    B --> C{🔍 New complexity or scope?}
    C -- YES --> D[🚨 RE-DISPATCH to agent_organizer]
    C -- NO --> E{💭 Simple clarification only?}
    E -- NO --> D
    E -- YES --> F[📝 Direct response OK]
    
    style B fill:#ff9999,stroke:#333,stroke-width:3px
    style D fill:#99ff99,stroke:#333,stroke-width:3px
```

**Follow-up Dispatch Triggers:**
- New OAuth platform integrations
- Security requirement changes
- Detection algorithm modifications
- Cross-platform correlation features
- Compliance or audit requirements
- Real-time monitoring enhancements

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

- **Agent-First Approach** – Complex technical decisions made by specialized agents
- **Shared-Types Architecture** – All API contracts centralized in @saas-xray/shared-types package
- **Repository Pattern Standardization** – All data access uses T | null return pattern
- **Security-First Design** – OAuth flows with ExtendedTokenResponse and proper type safety
- **Composition over inheritance** – For both UI components and service classes with proper typing
- **Interfaces/contracts over direct calls** – Use shared-types API specs and type definitions
- **Explicit data flow** – Document request/response shapes with shared-types in OpenAPI/Swagger
- **TDD when possible** – Unit tests + integration tests + security tests + type coverage for each feature slice

### Code Quality (Agent-Enforced)

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

### Decision Framework (BMAD Enhanced)

When multiple solutions exist (via agents), prioritize in this order:

1. **💰 Business Value (BMAD)** – Revenue impact and customer value from docs/bmad/
2. **🔒 Security** – Does this maintain OAuth security and data protection?
3. **🧪 Testability** – Can OAuth flows and detection logic be tested in isolation?
4. **📖 Readability** – Will another dev understand this in 6 months?
5. **🔄 Consistency** – Matches existing patterns and BMAD architecture?
6. **⚡ Simplicity** – Least complex solution achieving business goals
7. **🔄 Reversibility** – Can we swap OAuth providers/detection methods easily?

---

# **🏗️ SaaS X-Ray Project Context**

## **📋 Instant Reference Card**

**When ANY SaaS X-Ray request arrives:**
1. 🚨 **IMMEDIATE**: Check if it requires agent dispatch
2. 📖 **CONTEXT**: Reference project architecture below  
3. 🔐 **SECURITY**: Consider OAuth and compliance requirements
4. 📚 **DOCS**: Consider Context7 for up-to-date library docs
5. 🎯 **DISPATCH**: Let agent_organizer handle with full context

## Project Overview

**SaaS X-Ray** is an enterprise security platform that automatically discovers and monitors unauthorized AI agents, bots, and automations running across an organization's SaaS applications. The platform provides real-time visibility into shadow AI usage, enabling security teams to identify risks before they become compliance violations or security breaches.

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

**Frontend**:
- **Framework**: React 18.2+ with TypeScript
- **Build Tool**: Vite for build tooling  
- **Styling**: TailwindCSS + shadcn/ui components
- **Charts**: Recharts for data visualization
- **Real-time**: Socket.io client for real-time updates

**Backend**:
- **Runtime**: Node.js 20+ with Express.js
- **Language**: TypeScript with shared-types architecture
- **Types**: @saas-xray/shared-types for API contracts and data models
- **Database**: PostgreSQL 16 with typed queries (T | null pattern)
- **Cache**: Redis for caching and job queues
- **Jobs**: Bull for background job processing
- **Repository**: Standardized Repository<T, CreateInput, UpdateInput> pattern

**Infrastructure**:
- **Containers**: Docker containers with multi-stage builds
- **Proxy**: nginx reverse proxy
- **Development**: Docker Compose for local development
- **CI/CD**: GitHub Actions for CI/CD

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

### System Architecture (TypeScript Enhanced)

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Detection     │
│   Dashboard     │    │   Gateway       │    │   Engine        │
│                 │    │                 │    │                 │
│ • React + TS    │◄───► • Node.js + TS  │◄───► • Pattern ML    │
│ • Shared Types  │    │ • Shared Types  │    │ • Correlation   │
│ • Real-time UI  │    │ • REST + WS     │    │ • Risk Scoring  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ 🐳 Data Store   │    │ 🐳 Queue System │    │   Connector     │
│ (Containerized) │    │ (Containerized) │    │   Layer         │
│ • PostgreSQL    │    │ • Redis/Bull    │    │                 │
│ • Typed Queries │    │ • Typed Jobs    │    │ • OAuth 2.0     │
│ • T | null      │    │ • Scheduling    │    │ • ExtendedToken │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                        ▲                        ▲
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                  ┌─────────────────────────────┐
                  │     @saas-xray/shared-types │
                  │                             │
                  │ • API Contracts (9,000+ loc)│
                  │ • Database Models           │
                  │ • OAuth Security Types      │
                  │ • Repository Interfaces     │
                  └─────────────────────────────┘
```

---

## OAuth Integration Patterns

### Supported Platforms
- **Slack** - Bot detection, app inventory, webhook monitoring
- **Google Workspace** - Service accounts, Apps Script, OAuth apps  
- **Microsoft 365** - Power Platform apps, Graph API activity

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
- ❌ Attempt to solve complex coding requests yourself
- ❌ Write OAuth flows without proper security validation
- ❌ Implement detection logic without agent analysis
- ❌ Skip security tests for OAuth integrations
- ❌ Modify SaaS X-Ray files without agent analysis
- ❌ Skip the dispatch protocol "to save time"
- ❌ Ignore follow-up dispatch requirements

### **✅ ALWAYS DO THESE:**
- ✅ Check dispatch criteria before every response
- ✅ Use agent_organizer for any technical complexity
- ✅ Reference SaaS X-Ray context for project requests
- ✅ Prioritize OAuth security and compliance requirements
- ✅ Let agents handle full analysis and implementation
- ✅ Present agent results directly to users
- ✅ **Use singleton pattern for stateful services** (prevents credential loss)
- ✅ **Validate Slack API methods exist** before implementing (some don't exist in Web API)

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

## **🎯 Success Metrics (BMAD + TypeScript Excellence)**

**Migration Achievement Status:**
- ✅ **99% TypeScript Migration Complete** - Near-perfect error reduction achieved (199+ → ~5 errors estimated)
- ✅ **Dual OAuth Platform Integration** - Slack + Google Workspace working simultaneously 
- ✅ **Google Workspace Shadow AI Detection** - Comprehensive detection algorithm framework
- ✅ **Real-time Discovery System** - Socket.io progress tracking with enterprise UX
- ✅ **Detection Algorithm Framework** - VelocityDetector, BatchOperationDetector, AIProviderDetector
- ✅ **Shared-Types Architecture** - 10,000+ lines of centralized type definitions
- ✅ **Repository Standardization** - All repositories use T | null pattern
- ✅ **OAuth Security Enhancement** - ExtendedTokenResponse pattern with enhanced CORS and ngrok support
- ✅ **Professional Discovery Experience** - Progressive stages with comprehensive automation scenarios
- 🔄 **Production API Integration Target** - Connect detection algorithms to live Google APIs

**You are succeeding when:**

**🎯 BMAD Business Alignment:**
- All technical decisions reference BMAD documentation for business context
- Feature priority aligns with P0-P3 revenue impact framework from docs/bmad/
- Implementation addresses critical gaps identified in BMAD gap analysis
- Technical architecture supports business model scaling (docs/bmad/architecture-bmad.md)
- Customer success metrics improve through business-focused development

**⚡ Technical Excellence + Business Value:**
- 95%+ of complex requests are dispatched to agents with BMAD context validation
- Users receive expert solutions that achieve both technical and business objectives
- SaaS X-Ray patterns and shared-types architecture properly leveraged for revenue goals
- OAuth security requirements use ExtendedTokenResponse pattern for enterprise sales
- Code quality remains high while delivering measurable business outcomes
- TypeScript error count decreases toward zero without sacrificing business priorities
- All new code uses shared-types imports and supports revenue-tier differentiation
- Advanced OAuth integrations enable premium pricing and enterprise deals
- Live OAuth connections working with real enterprise workspaces for customer validation
- PDF generation and compliance features support revenue expansion opportunities

**You are failing when:**

**🚫 BMAD Business Misalignment:**
- Technical decisions made without referencing BMAD business context documentation
- Feature priority ignores P0-P3 revenue impact framework from docs/bmad/
- Implementation doesn't address critical business gaps identified in BMAD analysis
- Architecture choices don't support business model scaling or revenue goals
- Technical metrics prioritized over business outcomes and customer success

**❌ Technical Execution Without Business Context:**
- You attempt complex solutions yourself without considering BMAD + shared-types context
- Users get technical responses that lack business value and revenue correlation
- SaaS X-Ray context ignored or shared-types architecture misapplied for business goals
- Security requirements implemented without considering enterprise sales impact
- Code changes lack proper business analysis, testing, and revenue outcome validation
- TypeScript improvements pursued without connection to business objectives
- OAuth integrations lack comprehensive security needed for premium tier pricing

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

**🔥 FINAL REMINDER: This protocol is MANDATORY, not optional. Every complex request gets dispatched with BMAD business context validation. Every SaaS X-Ray request leverages full business and technical context from docs/bmad/. OAuth integrations ALWAYS require agent expertise with revenue impact assessment. All technical decisions MUST reference business priorities (P0-P3) and revenue goals. No exceptions.**