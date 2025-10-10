# Agent Routing Guide for Main Orchestrator

This guide helps the main orchestrator agent select the correct sub-agent for any given task.

## Quick Decision Tree

```
User Request
    │
    ├─ Needs MCP server? → Use JSON config agent
    │  ├─ Database/migration → backend-architect.json
    │  ├─ Browser testing → qa-expert.json
    │  ├─ Web scraping → web-scraper.json
    │  └─ ClickUp tasks → task-coordinator.json or product-manager.json
    │
    ├─ Project-specific customization? → Use markdown agent
    │  ├─ Code review → quality-judge.md or code-reviewer.md
    │  ├─ Documentation → api-documenter.md
    │  └─ Security scan → security-scanner.md
    │
    └─ General development → Use JSON config agent
       ├─ React/UI → frontend-developer.json
       ├─ Backend/API → backend-architect.json
       ├─ Types → typescript-pro.json
       └─ Tests → test-automator.json or qa-expert.json
```

## Routing Strategy

### Step 1: Check for MCP Requirements

**If request mentions:**
- "database", "migration", "supabase", "SQL", "RLS" → **backend-architect** (JSON, has Supabase MCP)
- "browser test", "E2E", "screenshot", "playwright" → **qa-expert** (JSON, has Chrome DevTools + Playwright)
- "scrape website", "crawl", "extract from web" → **web-scraper** (JSON, has Firecrawl MCP)
- "ClickUp task", "create task", "project management" → **task-coordinator** (JSON, has ClickUp MCP)
- "library docs", "API reference", "how to use X" → **documentation-expert** (JSON, has Context7 MCP)

**→ Delegate to JSON config agent using Task tool**

### Step 2: Check for Customization Needs

**If request is project-specific:**
- "review this code" (project has custom criteria) → **quality-judge.md** (markdown)
- "document the API" (team style guide) → **api-documenter.md** (markdown)
- "scan for security issues" (custom patterns) → **security-scanner.md** (markdown)

**→ Invoke markdown agent directly**

### Step 3: Check File Patterns

Read `.claude/agents/delegation-map.json` to match file patterns:

```json
{
  "**/*.tsx": "frontend-developer",
  "**/*.sql": "backend-architect",
  "**/*.test.ts": "test-automator"
}
```

## Agent Selection Matrix

| Task Type | Keywords | Agent | Format | MCP Servers |
|-----------|----------|-------|--------|-------------|
| **DATABASE** |
| Schema design | "schema", "table", "database" | backend-architect | JSON | supabase |
| Migration | "migration", "alter table" | backend-architect | JSON | supabase |
| Query optimization | "slow query", "performance", "index" | database-optimizer | JSON | supabase |
| Data pipeline | "ETL", "data transformation" | data-engineer | JSON | supabase |
| **FRONTEND** |
| React component | "component", "tsx", "UI" | frontend-developer | JSON | - |
| State management | "zustand", "state", "store" | frontend-developer | JSON | - |
| Advanced React | "hooks", "performance", "memo" | react-pro | JSON | - |
| **BACKEND** |
| API endpoint | "API", "endpoint", "route" | backend-architect | JSON | supabase |
| Types/interfaces | "type", "interface", "schema" | typescript-pro | JSON | - |
| Python backend | "python", "FastAPI", "Flask" | python-pro | JSON | - |
| Go service | "go", "golang", "goroutine" | golang-pro | JSON | - |
| **TESTING** |
| E2E tests | "E2E", "browser", "playwright" | qa-expert | JSON | chrome-devtools, playwright |
| Unit tests | "unit test", "jest", "vitest" | test-automator | JSON | - |
| Performance | "performance", "profiling", "optimization" | performance-engineer | JSON | chrome-devtools |
| **QUALITY** |
| Code review (general) | "review code", "best practices" | code-reviewer-pro | JSON | - |
| Code review (project) | "review against our standards" | quality-judge or code-reviewer | Markdown | - |
| Debugging | "debug", "fix bug", "error" | debugger | JSON | - |
| Security audit | "security", "vulnerability", "audit" | security-scanner | Markdown | - |
| **DOCUMENTATION** |
| Library docs | "how to use", "documentation", "API reference" | documentation-expert | JSON | Context7 |
| API docs (generate) | "document the API", "generate docs" | api-documenter | Markdown | - |
| **DEPLOYMENT** |
| CI/CD | "deployment", "CI/CD", "GitHub Actions" | deployment-engineer | JSON | - |
| **UTILITIES** |
| Web scraping | "scrape", "crawl", "extract from website" | web-scraper | JSON | firecrawl-mcp |
| Data extraction | "parse CSV", "convert JSON", "extract data" | data-extractor | JSON | - |
| Task management (CRUD) | "create task", "update task", "ClickUp" | task-coordinator | JSON | clickup |
| Project planning | "roadmap", "sprint planning", "strategy" | product-manager | JSON | clickup |
| Research | "research", "investigate", "deep dive" | deep-research-analyst | Markdown | - |

## Invocation Patterns

### JSON Config Agents (via Task Tool)

```typescript
// Full invocation
Task({
  agent: "backend-architect",
  task: "Create database migration for user_preferences table with RLS policies",
  config: ".claude/agents/configs/backend-architect.json"
})

// Parallel invocation (multiple agents)
await Promise.all([
  Task({ agent: "backend-architect", task: "...", config: "..." }),
  Task({ agent: "frontend-developer", task: "...", config: "..." }),
  Task({ agent: "test-automator", task: "...", config: "..." })
])
```

### Markdown Agents (direct invocation)

```
Use quality-judge to review this code against our project standards
```

Or rely on automatic routing:
```
Review this code for security issues
# Orchestrator recognizes "security" keyword → routes to security-scanner.md
```

## Reading the Delegation Map

```typescript
// Read routing rules
const delegationMap = JSON.parse(fs.readFileSync('.claude/agents/delegation-map.json'));

// Match file pattern
function getAgentForFile(filePath) {
  for (const rule of delegationMap.delegation_rules) {
    if (minimatch(filePath, rule.pattern)) {
      return rule.primary_agent;
    }
  }
  return null;
}

// Match keywords
function getAgentForKeywords(userRequest) {
  const keywords = userRequest.toLowerCase();

  // Check MCP routing
  for (const [mcpServer, config] of Object.entries(delegationMap.mcp_routing_rules.routing_map)) {
    for (const keyword of config.keywords) {
      if (keywords.includes(keyword.toLowerCase())) {
        return config.primary_agent;
      }
    }
  }

  return null;
}
```

## Context Optimization Rules

### Always Delegate MCP Tasks

**NEVER call MCP tools directly from main orchestrator.**

❌ **Wrong:**
```javascript
// Main orchestrator calling Supabase MCP
const tables = await mcp.supabase.list_tables();
```

✅ **Correct:**
```javascript
// Delegate to backend-architect who has Supabase MCP
Task({
  agent: "backend-architect",
  task: "List all database tables",
  config: ".claude/agents/configs/backend-architect.json"
})
```

### Request Summaries, Not Raw Data

When delegating, explicitly request summaries:

```javascript
Task({
  agent: "qa-expert",
  task: "Run E2E tests for login flow. Return summary with pass/fail counts and any critical failures. DO NOT return full test logs."
})
```

### Use Artifacts for Large Data

If agent will return large datasets:

```javascript
Task({
  agent: "backend-architect",
  task: "Analyze database schema. Write full schema to .claude/artifacts/schema.sql. Return only summary with table count and key relationships."
})
```

## Parallel vs Sequential Delegation

### Use Parallel When:
- Tasks are independent
- No data dependencies
- Speed is important

**Example:**
```javascript
// All three can run simultaneously
await Promise.all([
  Task({ agent: "frontend-developer", task: "Create dashboard UI" }),
  Task({ agent: "backend-architect", task: "Create analytics API" }),
  Task({ agent: "test-automator", task: "Write test scaffolding" })
])
```

### Use Sequential When:
- Tasks have dependencies
- Output of one feeds into next
- Need to verify each step

**Example:**
```javascript
// Must run in order
await Task({ agent: "backend-architect", task: "Create schema" });
await Task({ agent: "frontend-developer", task: "Create UI using new schema" });
await Task({ agent: "qa-expert", task: "Test integration" });
```

## Error Handling

If agent returns error or fails:

1. **Analyze the error** - Is it missing context? Wrong agent? Blocker?
2. **Retry with more context** - Provide additional details
3. **Try different agent** - Maybe qa-expert instead of test-automator
4. **Escalate to user** - If unresolvable, ask for guidance

## Agent Capability Limits

### What Agents CAN'T Do

- **Markdown agents** can't access MCP servers
- **JSON agents** can't be created via `/agents` command
- **All agents** have token limits (respect response_format.max_tokens)
- **All agents** can't access other agents' private context

### What to Do Instead

- Need MCP? Use JSON config agent
- Need customization? Use markdown agent
- Need both? Use hybrid approach (delegate to JSON, customize via markdown wrapper)

## Quick Reference Commands

```bash
# View all agents
ls .claude/agents/*.md .claude/agents/configs/*.json

# Check delegation rules
cat .claude/agents/delegation-map.json | jq '.delegation_rules'

# Check MCP routing
cat .claude/agents/mcp-mapping.json | jq '.mcp_delegation_map'

# Validate agent config
jq . .claude/agents/configs/backend-architect.json
```

---

## For the Main Orchestrator

**Remember:**
1. Check MCP requirements FIRST
2. Use delegation-map.json for file pattern matching
3. Use mcp-mapping.json for MCP routing
4. Prefer JSON agents for framework tasks
5. Prefer markdown agents for project customization
6. Always request summaries, not full dumps
7. Use parallel delegation when possible

**When in doubt:** Check `.claude/docs/AGENT_QUICK_REFERENCE.md` for the full agent list and capabilities.
