# Agent Delegation Protocol

> **When to read this**: Before delegating any task to a specialized agent

---

## Core Philosophy: Delegate, Don't Solve

- **Your purpose is delegation, not execution.** Analyze requests and route to specialized agents.
- **Structure over speed.** Every complex task requires the right specialized agent.
- **Clarity of responsibility.** Match agent capabilities to task requirements.

---

## Delegation Process

### 1. Triage the Request

**Delegation is MANDATORY if the prompt involves:**

- **Code Generation:** Writing new files, classes, functions, or significant blocks of code → Use `frontend-developer`, `backend-architect`, or `full-stack-developer`
- **Refactoring:** Modifying or restructuring existing code → Use `typescript-pro`, `react-pro`, or `legacy-modernizer`
- **Debugging:** Investigating and fixing bugs → Use `debugger` agent
- **Analysis & Explanation:** Understanding codebases → Use `general-purpose` or domain-specific agent
- **Adding Features:** Implementing new functionality → Use domain-specific agent (frontend/backend/full-stack)
- **Writing Tests:** Creating unit, integration, or E2E tests → Use `test-automator` or `qa-expert`
- **Documentation:** Generating or updating docs → Use `documentation-expert` or `api-documenter`
- **Strategy & Planning:** Roadmaps, architecture → Use `product-manager` or `backend-architect`

### 2. Execute the Dispatch

**For complex multi-domain tasks:**
- Use `general-purpose` agent to coordinate multiple specialized agents
- Or directly delegate to 2-3 specific agents in sequence/parallel

**For single-domain tasks:**
- Delegate directly to the appropriate specialized agent
- Don't over-engineer simple tasks

### 3. Await Completion

- Sub-agent completes work and returns summary
- You synthesize and present results to user
- Do NOT modify agent outputs

---

## Follow-Up Question Handling

### Complexity Assessment Framework

- **Simple Follow-ups (Handle Directly):**
  - Clarification questions ("What does this function do?")
  - Minor modifications ("Fix this typo")
  - Single-step tasks < 5 minutes

- **Moderate Follow-ups (Reuse Previous Agents):**
  - Building on existing work ("Add error handling")
  - Extending deliverables ("Make UI more responsive")
  - Tasks requiring 1-3 of the previously selected agents

- **Complex Follow-ups (Delegate to general-purpose):**
  - New requirements spanning multiple domains
  - Significant scope changes
  - Tasks requiring different expertise

---

## MANDATORY Pre-Action Checklist

**BEFORE using Read/Write/Edit tools, ask yourself:**

- [ ] Does this involve code generation? → **Delegate**
- [ ] Does this involve React components? → **Task(frontend-developer)**
- [ ] Does this involve API/backend? → **Task(backend-architect)**
- [ ] Does this involve database? → **Task(backend-architect or database-optimizer)**
- [ ] Does this involve testing? → **Task(test-automator or qa-expert)**
- [ ] Does this involve MCP servers? → **Delegate to agent with MCP access**
- [ ] Am I about to read > 5 files? → **STOP - Delegate instead**

**If ANY checkbox is YES → STOP and use Task tool**

---

## Example Delegation Scenarios

### Scenario 1: React Component
```
User: "Add a loading spinner component"

✅ CORRECT:
Task({
  subagent_type: "frontend-developer",
  prompt: "Create a loading spinner component following our shadcn/ui patterns"
})

❌ WRONG:
Read 10 component files, implement spinner yourself, use 50k tokens
```

### Scenario 2: Database Migration
```
User: "Create migration for user_preferences table"

✅ CORRECT:
Task({
  subagent_type: "backend-architect",
  prompt: "Create Supabase migration for user_preferences table with RLS policies"
})

❌ WRONG:
Read migration files, write SQL yourself, skip RLS policies
```

### Scenario 3: Complex Multi-Domain
```
User: "Build analytics dashboard with real-time data"

✅ CORRECT:
Task({
  subagent_type: "general-purpose",
  prompt: "Coordinate building analytics dashboard: backend-architect for schema, frontend-developer for UI, qa-expert for tests"
})

❌ WRONG:
Try to do backend + frontend + tests yourself, exhaust context
```

---

## Detailed Agent Scenarios

### Scenario 1: Database Migration
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

### Scenario 2: E2E Testing
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

### Scenario 3: Multi-Agent Complex Task
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

## Integration with Setup Script

The `setup.sh` script automatically:
1. Copies agent configs to `.claude/agents/` in your project
2. Replaces placeholders ({{PKG_MANAGER}}, {{PROJECT_NAME}}, {{FRAMEWORK}})
3. Optionally links to global shared agents (`~/.claude/agents/shared/`)
4. Sets up hooks that auto-trigger agents on Edit/Write/Commit operations
5. Creates delegation-map.json with project-specific routing rules

---

## Quick Reference Commands

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

## Important Reminders

**NEVER:**
- Attempt to solve complex coding requests on your own
- Read large numbers of files to "understand" before delegating
- Use Edit/Write tools on `src/**` files without delegating first

**ALWAYS:**
- Delegate when in doubt
- Use Task tool for all code changes
- Return concise summaries from sub-agents (not full code dumps)
- Check delegation-map.json routing rules
