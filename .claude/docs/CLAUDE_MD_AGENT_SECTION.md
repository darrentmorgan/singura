# Agent Reference Section for CLAUDE.md

> **Instructions**: Copy the content below and add it to your `~/.claude/CLAUDE.md` file after the "Agent Dispatch Protocol" section.

---

## Available Specialized Agents

### Overview

The following specialized agents are available for delegation. Each agent has specific expertise and MCP server access optimized for their domain.

**Core Principle**: The main orchestrator has ZERO MCP servers configured. All MCP operations MUST be delegated to specialized agents for 74% context reduction (125k → 33k tokens).

---

### Development Agents

#### Backend & Database
- **`backend-architect`** - Database schema, migrations, RLS policies, API design
  - MCP: `supabase`
  - Triggers: `database`, `migration`, `schema`, `RPC`, `SQL query`, `RLS policy`

- **`database-optimizer`** - Query optimization, indexing, performance tuning
  - MCP: `supabase`
  - Triggers: `optimize query`, `slow query`, `database performance`, `index`

- **`data-engineer`** - Data pipelines, ETL, batch processing, data migration
  - MCP: `supabase`
  - Triggers: `data pipeline`, `ETL`, `data transformation`, `batch process`

#### Frontend
- **`frontend-developer`** - React components, hooks, Zustand stores, UI/UX
  - MCP: None
  - Patterns: `**/*.tsx`, `src/components/**`, `src/stores/**`

- **`typescript-pro`** - Advanced types, generics, API contracts, type errors
  - MCP: None
  - Patterns: `src/lib/api/contracts.ts`, `**/*.d.ts`, config files

---

### Quality Assurance Agents

- **`code-reviewer-pro`** - Security, best practices, maintainability, performance
  - MCP: None
  - Auto-triggered on Edit/Write operations

- **`test-automator`** - Unit/integration tests, test debugging, CI/CD automation
  - MCP: `chrome-devtools`, `playwright`
  - Triggers: `test automation`, `playwright`, `fix test`, `test coverage`

- **`qa-expert`** - E2E testing, visual QA, browser automation, performance profiling
  - MCP: `chrome-devtools`, `playwright`
  - Triggers: `E2E test`, `browser test`, `visual test`, `screenshot`

---

### Infrastructure & DevOps

- **`deployment-engineer`** - CI/CD pipelines, GitHub Actions, Docker, deployment scripts
  - MCP: None (uses GitHub CLI, Docker CLI)
  - Triggers: `CI/CD`, `deploy`, `GitHub Actions`, `docker`, `production`

- **`debugger`** - Root cause analysis, test failures, error investigation
  - MCP: None
  - Triggers: `debug`, `fix bug`, `test failure`, `error`, `investigate`

---

### Research & Documentation

- **`documentation-expert`** - Library docs, API references, framework guides, code examples
  - MCP: `Context7`
  - Triggers: `library docs`, `API reference`, `how to use`, `framework guide`

- **`general-purpose`** - Web scraping, competitor research, URL crawling, fallback handler
  - MCP: `firecrawl-mcp`, `Context7`
  - Triggers: `scrape`, `crawl`, `extract from web`, `research`

---

### Project Management

- **`product-manager`** - ClickUp tasks, sprint planning, roadmaps, milestone tracking
  - MCP: `clickup`
  - Triggers: `clickup`, `create task`, `project plan`, `roadmap`, `sprint`

---

### Agent Routing Rules

#### Automatic Delegation (Keyword Matching)

When user prompts contain routing trigger keywords, automatically delegate to the appropriate agent:

```
User: "Create migration for user_preferences table"
→ Triggers: "migration", "table"
→ Auto-routes to: backend-architect
```

#### Explicit Delegation

Users can explicitly request specific agents:

```
User: "@backend-architect create a migration for..."
User: "Use qa-expert to test the login flow"
User: "Have code-reviewer-pro check this code"
```

#### Multi-Agent Tasks

For complex tasks requiring multiple agents, use the `agent-organizer`:

```
User: "Build a user dashboard with data visualization and E2E tests"
→ Routes to: agent-organizer
→ Assembles team: frontend-developer, test-automator, qa-expert
→ Orchestrates: Parallel/sequential execution
→ Returns: Unified result
```

---

### Response Format Standards

All specialized agents must return responses in this format:

```json
{
  "summary": "Concise 2-3 sentence summary",
  "files_changed": ["src/file.ts:42", "tests/file.test.ts:15"],
  "artifacts": ["screenshots/login.png", "migrations/20251008_users.sql"],
  "next_steps": ["Run migrations", "Test on staging"],
  "issues": ["Warning: Breaking change in API contract"],
  "references": ["https://docs.example.com/api"]
}
```

**Context Limits**:
- Max 500-800 tokens per agent response
- Use `file:line` references, not full file content
- Summaries only, no verbose dumps
- Focus on WHAT changed, not HOW (implementation details)

---

### Quality Gates (Integration with Agent Dispatch Protocol)

#### Pre-Commit Gate
- **Required**: `code-reviewer-pro`
- **Optional**: `typescript-pro`, `test-automator`
- **Min Score**: 80/100
- **Blocking**: Yes

#### Pre-Deployment Gate
- **Required**: `qa-expert`, `code-reviewer-pro`
- **Optional**: `test-automator`
- **Min Score**: 85/100
- **Blocking**: Yes

---

### Configuration Files Location

#### Project-Level
- **Delegation Map**: `.claude/agents/delegation-map.json`
- **Agent Configs**: `.claude/agents/configs/*.json`
- **MCP Mapping**: `.claude/agents/mcp-mapping.json`
- **Quality Judge**: `.claude/agents/quality-judge.md`

#### Global Shared Agents
- **Location**: `~/.claude/agents/shared/`
- **Purpose**: Reduce duplication across projects
- **Setup**: Enable during `setup.sh` installation

---

### Best Practices Reminder

**ALWAYS**:
- Delegate all MCP operations to specialized agents
- Use keyword matching for automatic routing
- Return concise summaries with file:line references
- Run browser automation with `--isolated` flag
- Execute independent tasks in parallel
- Check delegation-map.json for routing rules

**NEVER**:
- Call MCP tools from main orchestrator (has ZERO MCP access)
- Load all MCP servers "just in case"
- Return full file content or verbose dumps
- Skip delegation for "simple" MCP tasks
- Modify main agent config to add MCP servers

---

### Quick Reference Commands

```bash
# View available agents and capabilities
cat ~/.claude/agents/shared/delegation-map.json | jq '.agent_capabilities'

# Check which agent handles a file pattern
cat .claude/agents/delegation-map.json | jq '.delegation_rules[] | select(.pattern == "**/*.tsx")'

# List MCP routing rules
cat .claude/agents/delegation-map.json | jq '.mcp_routing_rules.routing_map[].name'

# See agent response format requirements
cat .claude/agents/configs/backend-architect.json | jq '.response_format'
```

---

### Integration with Setup Script

The `setup.sh` script automatically:
1. Copies agent configs to `.claude/agents/` in your project
2. Replaces placeholders ({{PKG_MANAGER}}, {{PROJECT_NAME}}, {{FRAMEWORK}})
3. Optionally links to global shared agents (`~/.claude/agents/shared/`)
4. Sets up hooks that auto-trigger agents on Edit/Write/Commit operations
5. Creates delegation-map.json with project-specific routing rules

---

### Example Delegation Scenarios

#### Scenario 1: Database Migration
```
User: "Create a migration for adding user_preferences table with RLS"

Main Agent Analysis:
- Detects triggers: "migration", "table", "RLS"
- Routes to: backend-architect (has Supabase MCP access)

backend-architect Response:
{
  "summary": "Created migration 20251008_user_preferences.sql with RLS policies for tenant isolation",
  "files_changed": ["supabase/migrations/20251008_user_preferences.sql"],
  "artifacts": ["migration SQL file"],
  "next_steps": ["Run migration on dev: supabase db push", "Test RLS policies"],
  "issues": [],
  "references": ["https://supabase.com/docs/guides/auth/row-level-security"]
}
```

#### Scenario 2: E2E Testing
```
User: "Run E2E tests for the checkout flow and take screenshots"

Main Agent Analysis:
- Detects triggers: "E2E test", "screenshot"
- Routes to: qa-expert (has chrome-devtools + playwright MCP access)

qa-expert Response:
{
  "summary": "Executed 12 E2E tests for checkout flow. 10 passed, 2 failed due to payment gateway timeout",
  "files_changed": [],
  "artifacts": [
    "screenshots/checkout-step1.png",
    "screenshots/checkout-step2-failure.png"
  ],
  "next_steps": [
    "Increase payment gateway timeout",
    "Add retry logic for failed payments"
  ],
  "issues": [
    "tests/e2e/checkout.spec.ts:67 - Payment timeout after 5s",
    "tests/e2e/checkout.spec.ts:89 - Invalid coupon code handling"
  ],
  "references": []
}
```

#### Scenario 3: Multi-Agent Complex Task
```
User: "Build a campaign analytics dashboard with real-time data, database queries, and full test coverage"

Main Agent Analysis:
- Complex multi-domain task
- Routes to: agent-organizer

agent-organizer Assembles Team:
1. backend-architect - Design database schema for analytics
2. database-optimizer - Optimize real-time query performance
3. frontend-developer - Build dashboard UI components
4. test-automator - Create unit and integration tests
5. qa-expert - E2E testing with visual validation

Execution Strategy: Sequential with some parallel
- Phase 1: backend-architect + database-optimizer (parallel)
- Phase 2: frontend-developer (depends on Phase 1)
- Phase 3: test-automator + qa-expert (parallel)

Final Response: Synthesized from all agents
{
  "summary": "Built campaign analytics dashboard with real-time data pipeline, optimized queries, React UI, and comprehensive test coverage",
  "files_changed": [
    "supabase/migrations/20251008_analytics_schema.sql",
    "src/components/AnalyticsDashboard.tsx",
    "src/hooks/useAnalytics.ts",
    "tests/analytics.test.ts",
    "tests/e2e/analytics.spec.ts"
  ],
  "artifacts": [
    "screenshots/dashboard-desktop.png",
    "screenshots/dashboard-mobile.png",
    "performance-report.json"
  ],
  "next_steps": [
    "Deploy to staging",
    "Run load tests with 1000 concurrent users",
    "Review analytics data accuracy"
  ],
  "issues": [],
  "references": [
    "https://supabase.com/docs/guides/database/replication",
    "https://react.dev/reference/react/hooks"
  ]
}
```

---

*For detailed agent documentation, see `.claude/docs/AGENT_REFERENCE.md` in your project.*
