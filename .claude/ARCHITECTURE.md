# SaaS X-Ray Architecture Documentation

## System Architecture Overview

SaaS X-Ray is an enterprise security platform for discovering unauthorized AI agents, bots, and automations across SaaS applications.

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

## Technology Stack

### Frontend (`@saas-xray/frontend`)

**Framework & Build**:
- React 18.2+ with TypeScript 5.2+
- Vite 5.0+ for development and build tooling
- Port: http://localhost:4200 (Vite dev server)

**Authentication & User Management**:
- Clerk React SDK (@clerk/clerk-react) for multi-tenant auth
- Organization-based access control
- Google OAuth sign-in integration
- User profile management with Clerk components

**Styling & UI**:
- TailwindCSS 3.3+ with shadcn/ui components
- shadcn/ui for base components (buttons, cards, dialogs)
- Responsive design with mobile-first approach

**State Management**:
- Zustand 4.4+ for global state
- Separate stores for connections, automations, UI state

**Forms & Validation**:
- React Hook Form for form handling
- Zod for schema validation
- Type-safe form state management

**Data Visualization**:
- Recharts 2.8+ for charts and graphs
- Real-time data updates via Socket.io

**Real-time Communication**:
- Socket.io-client 4.7+ for live updates
- Progressive discovery stage updates
- Connection status monitoring

**Testing**:
- Vitest for unit and component tests
- React Testing Library for component testing
- Playwright for E2E testing

### Backend (`@saas-xray/backend`)

**Runtime & Framework**:
- Node.js 20+ with Express.js 4.18+
- TypeScript 5.3+ with strict mode
- Port: http://localhost:4201 (Express API)

**Authentication**:
- Clerk Backend SDK (@clerk/backend, @clerk/express)
- JWT verification and validation
- Organization ID extraction from headers
- Multi-tenant request scoping

**Type System**:
- `@saas-xray/shared-types` for centralized type definitions
- 9,000+ lines of shared TypeScript interfaces
- Build-first architecture (types build before frontend/backend)

**Database**:
- PostgreSQL 16 with pg 8.11+
- Containerized on port 5433 (mapped from 5432)
- Typed repositories with T | null pattern
- Automated migration runner on server startup

**Caching & Jobs**:
- Redis 4.6+ for caching and job queues
- Containerized on port 6379
- Bull 4.12+ for background job processing
- Session cache and rate limit store

**Real-time Communication**:
- Socket.io 4.7+ for WebSocket communication
- Real-time progress updates
- Discovery stage broadcasting

**Repository Pattern**:
- Standardized Repository<T, CreateInput, UpdateInput> pattern
- Consistent T | null return pattern for queries
- Type-safe database operations

**OAuth & Platform Integrations**:
- Google Workspace OAuth integration
- Slack OAuth integration
- Microsoft 365 OAuth (planned)
- Encrypted token storage with AES-256-GCM

**AI Detection**:
- OpenAI 5.23+ for AI platform detection
- Pattern matching algorithms
- Cross-platform correlation engine

**Security**:
- helmet for HTTP security headers
- express-rate-limit for API rate limiting
- bcryptjs for password hashing
- jsonwebtoken for JWT operations

### Shared Types (`@saas-xray/shared-types`)

**Architecture**:
- 9,000+ lines of centralized TypeScript type definitions
- Build-first architecture (MUST compile before frontend/backend)
- Single source of truth for all API contracts

**Type Categories**:
- API request/response interfaces
- Database model types
- OAuth credential types
- Repository pattern definitions
- Common utility types

**Package Structure**:
```typescript
// @saas-xray/shared-types/src/index.ts
export * from './api';
export * from './database';
export * from './oauth';
export * from './common';
```

**Build Order**:
1. `@saas-xray/shared-types` builds first
2. Backend imports and compiles
3. Frontend imports compiled shared-types
4. All CI/CD pipelines respect this order

### Infrastructure

**Containerization**:
- Docker Compose for PostgreSQL and Redis
- PostgreSQL: 5433:5432 port mapping
- Redis: 6379:6379 port mapping

**Development Environment**:
- Frontend: http://localhost:4200
- Backend: http://localhost:4201
- PostgreSQL: localhost:5433
- Redis: localhost:6379

**Testing Infrastructure**:
- Jest for backend testing
- Vitest for frontend testing
- Playwright for E2E testing
- Separate test database: `saas_xray_test`

**CI/CD**:
- GitHub Actions workflows
- Type checking across all packages
- Automated linting and formatting
- Test execution with coverage reporting

---

## System Architecture Diagram

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

---

## Project Structure

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
│   │   │   ├── repositories/      # Data access layer (T | null pattern)
│   │   │   └── migrate.ts         # Automated migration runner
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
│   ├── migrations/                # SQL migration files
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
│   ├── ARCHITECTURE.md            # Architecture documentation
│   ├── API_REFERENCE.md           # API documentation
│   ├── OAUTH_SETUP.md             # OAuth setup guide
│   ├── guides/                    # Development guides
│   └── archive/                   # Historical documentation
│
├── .claude/                       # Claude development guidelines
│   ├── agents/                    # Sub-agent definitions
│   ├── ARCHITECTURE.md            # This file
│   ├── PATTERNS.md                # Code patterns
│   └── PITFALLS.md                # Critical pitfalls
│
├── e2e/                           # Playwright E2E tests
│   └── tests/
│
├── docker-compose.yml             # PostgreSQL + Redis containers
├── CLAUDE.md                      # Main development guidelines
└── package.json                   # Root workspace configuration
```

---

## Platform Integrations

### Slack (Implemented ✅)

**OAuth Scopes**:
- `users:read` - Required for users.list API
- `team:read` - Required for team.info API
- `channels:read` - Channel information
- `usergroups:read` - User groups
- `workflow.steps:execute` - Workflow detection
- `commands` - Slash command detection

**Discovery Capabilities**:
- Bot detection via `users.list()` API with `is_bot === true` filter
- App inventory and webhook monitoring
- Real-time automation discovery
- Workspace-level metadata

**Implementation Details**:
- Uses Slack Web API client
- Singleton credential storage
- Clerk organization scoping

### Google Workspace (Implemented ✅)

**OAuth Scopes**:
- `openid`, `email`, `profile` - Basic user info
- `script.projects.readonly` - Apps Script projects
- `admin.directory.user.readonly` - Service accounts
- `admin.reports.audit.readonly` - Audit logs
- `drive.metadata.readonly` - Drive metadata

**Discovery Capabilities**:
- Apps Script project detection
- Service account discovery
- OAuth app audit logging
- AI platform detection (OpenAI, Claude, Gemini integrations)
- Drive automation detection

**Implementation Details**:
- Uses Google APIs client library
- Singleton credential storage
- Clerk organization scoping
- AI platform pattern matching

### Microsoft 365 (Planned 🔄)

**Planned Scopes**:
- Power Platform apps detection
- Microsoft Graph API activity monitoring
- Azure AD service principal discovery

**Planned Capabilities**:
- Power Automate flow detection
- Logic Apps discovery
- Graph API bot detection
- Azure Functions monitoring

---

## Docker Infrastructure (CRITICAL)

### Container Configuration

**PostgreSQL Container**:
```bash
# Port mapping: 5433:5432 (external:internal)
# Database: saas_xray (production)
# Test Database: saas_xray_test
# User: postgres
# Password: password (development only)

# Connection string
DATABASE_URL=postgresql://postgres:password@localhost:5433/saas_xray
TEST_DATABASE_URL=postgresql://postgres:password@localhost:5433/saas_xray_test
```

**Redis Container**:
```bash
# Port mapping: 6379:6379
# Used for: Session cache, job queues, rate limiting, pub/sub

# Connection
REDIS_URL=redis://localhost:6379
```

### Container Startup

```bash
# Start all containers
docker compose up -d postgres redis

# Verify containers running
docker compose ps

# View logs
docker compose logs -f postgres
docker compose logs -f redis

# Stop containers
docker compose down

# Reset all data (WARNING: Deletes all data)
docker compose down -v
```

### Migration System

**Automated Migration Runner**:
- Runs on server startup BEFORE accepting traffic
- Scans `/backend/migrations/*.sql` files
- Applies pending migrations in order
- Tracks applied migrations in `schema_migrations` table
- Server exits if migrations fail

**Migration Files**:
```
backend/migrations/
├── 000_create_migration_table.sql
├── 003_clerk_complete_migration.sql
└── 004_fix_audit_trigger_for_deletes.sql
```

**Verification**:
```bash
export PGPASSWORD=password
psql -h localhost -p 5433 -U postgres -d saas_xray \
  -c "SELECT * FROM schema_migrations ORDER BY applied_at DESC;"
```

---

## Current Implementation Status

### Completed Features (85% Complete)

- ✅ Clerk multi-tenant authentication
- ✅ Organization-scoped OAuth (Slack + Google Workspace)
- ✅ TypeScript migration (199+ errors → 78 remaining)
- ✅ Shared-types architecture (9,000+ lines)
- ✅ Repository standardization (T | null pattern)
- ✅ Real-time discovery system (Socket.io)
- ✅ Automated migration runner
- ✅ Detection algorithm framework (VelocityDetector, BatchOperationDetector, AIProviderDetector)
- ✅ OAuth security enhancement (ExtendedTokenResponse, encrypted storage)
- ✅ Multi-tenant dashboard (OrganizationSwitcher, UserProfile)

### In Progress / Planned

- 🔄 Microsoft 365 integration (Power Platform, Graph API)
- 🔄 TypeScript error resolution (78 remaining → 0)
- 🔄 Test coverage expansion (current → 80%+)
- 🔄 Performance optimization (<2s response time requirement)
- 🔄 Enhanced detection algorithms (ML-based behavior analysis)

---

## Architecture Decision Records

### ADR-001: Shared-Types Centralization
**Decision**: All type definitions centralized in `@saas-xray/shared-types` package
**Rationale**: Single source of truth, build-time type checking, consistent API contracts
**Status**: Implemented ✅

### ADR-002: Singleton Service Pattern
**Decision**: Stateful services MUST use singleton export pattern
**Rationale**: Prevents state loss across request boundaries, maintains OAuth credentials
**Status**: Implemented ✅

### ADR-003: T | null Repository Pattern
**Decision**: All repository methods return `T | null` instead of throwing errors
**Rationale**: Explicit null handling, type-safe queries, consistent error handling
**Status**: Implemented ✅

### ADR-004: Automated Migration Runner
**Decision**: Migrations run automatically on server startup
**Rationale**: Prevents manual migration errors, ensures database consistency
**Status**: Implemented ✅

### ADR-005: Dual Storage Architecture
**Decision**: Connection metadata in database+memory, OAuth credentials in singleton service
**Rationale**: Performance (memory cache) + persistence (database) + security (encrypted)
**Status**: Implemented ✅
