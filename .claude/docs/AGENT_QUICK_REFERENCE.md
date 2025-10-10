# Agent Quick Reference

A quick lookup table for all available agents in this template.

## At a Glance

| Agent Name | Format | Model | MCP Servers | When to Use |
|-----------|--------|-------|-------------|-------------|
| **DEVELOPMENT** |
| backend-architect | JSON | Sonnet | supabase | Database, migrations, API endpoints |
| frontend-developer | JSON | Sonnet | - | React components, UI, state management |
| typescript-pro | JSON | Sonnet | - | Type safety, complex types, generics |
| python-pro | JSON | Sonnet | - | Python backend, scripts, automation |
| golang-pro | JSON | Sonnet | - | Go services, concurrency, performance |
| react-pro | JSON | Sonnet | - | Advanced React patterns, hooks, optimization |
| **TESTING & QA** |
| qa-expert | JSON | Sonnet | chrome-devtools, playwright | E2E testing, browser automation, visual QA |
| test-automator | JSON | Sonnet | chrome-devtools, playwright | Test generation, unit/integration tests |
| performance-engineer | JSON | Sonnet | chrome-devtools, playwright | Performance profiling, optimization |
| **CODE QUALITY** |
| code-reviewer-pro | JSON | Sonnet | - | Code review, best practices, security |
| quality-judge | Markdown | Sonnet | - | Project-specific review criteria |
| code-reviewer | Markdown | Sonnet | - | Generic code quality review |
| debugger | JSON | Sonnet | - | Bug fixing, root cause analysis |
| **DATABASE** |
| database-optimizer | JSON | Sonnet | supabase | Query optimization, performance tuning |
| data-engineer | JSON | Sonnet | supabase | ETL pipelines, data transformation |
| **DOCUMENTATION** |
| documentation-expert | JSON | Sonnet | Context7 | Library docs lookup, API references |
| api-documenter | Markdown | Sonnet | - | Generate API documentation |
| **SECURITY** |
| security-auditor | JSON | Sonnet | - | Security scanning, compliance checks |
| security-scanner | Markdown | Sonnet | - | Automated vulnerability scanning |
| **DEPLOYMENT** |
| deployment-engineer | JSON | Sonnet | - | CI/CD, deployments, infrastructure |
| **UTILITIES** |
| web-scraper | JSON | Haiku | firecrawl-mcp | Web scraping, content extraction |
| data-extractor | JSON | Haiku | - | CSV/JSON parsing, format conversion |
| task-coordinator | JSON | Haiku | clickup | ClickUp CRUD operations |
| **RESEARCH** |
| deep-research-analyst | Markdown | Sonnet | - | Comprehensive research tasks |
| general-purpose | JSON | Sonnet | firecrawl-mcp, Context7 | Fallback for misc tasks |
| product-manager | JSON | Sonnet | clickup | Strategic planning, roadmaps |

---

## Quick Invocation Guide

### JSON Agents (Task Tool)

```javascript
// Via Task tool
Task({
  agent: "backend-architect",
  task: "Create migration for user preferences",
  config: ".claude/agents/configs/backend-architect.json"
})
```

### Markdown Agents (Direct Invocation)

```
Use quality-judge to review this code
```

Or let the orchestrator auto-delegate:
```
Review this code for security issues
# → Routes to quality-judge or code-reviewer based on keywords
```

---

## By Use Case

### "I need to create a database migration"
→ **backend-architect** (JSON, has Supabase MCP)

### "I need to test this in the browser"
→ **qa-expert** (JSON, has Chrome DevTools + Playwright MCP)

### "I need to review code quality"
→ **quality-judge** (Markdown, project-specific criteria)
→ **code-reviewer-pro** (JSON, general best practices)

### "I need to scrape a website"
→ **web-scraper** (JSON, has Firecrawl MCP, uses Haiku for speed)

### "I need to look up library documentation"
→ **documentation-expert** (JSON, has Context7 MCP)

### "I need to create ClickUp tasks"
→ **task-coordinator** (JSON, has ClickUp MCP, uses Haiku for CRUD)
→ **product-manager** (JSON, has ClickUp MCP, uses Sonnet for strategy)

### "I need to optimize a slow database query"
→ **database-optimizer** (JSON, has Supabase MCP)

### "I need to deploy to production"
→ **deployment-engineer** (JSON, CI/CD expertise)

### "I need comprehensive research on a topic"
→ **deep-research-analyst** (Markdown, multi-source research)

---

## By MCP Server

### Supabase
- backend-architect
- database-optimizer
- data-engineer

### Chrome DevTools + Playwright
- qa-expert
- test-automator
- performance-engineer

### Firecrawl
- web-scraper
- general-purpose

### Context7
- documentation-expert
- general-purpose

### ClickUp
- task-coordinator (Haiku - CRUD)
- product-manager (Sonnet - Strategy)

### No MCP (Pure Logic)
- frontend-developer
- typescript-pro
- code-reviewer-pro
- debugger
- deployment-engineer
- All markdown agents

---

## Model Distribution

### Sonnet (Complex Tasks)
- All development agents (backend, frontend, typescript, etc.)
- All quality agents (code-reviewer, qa-expert, etc.)
- All database agents
- Security agents
- Documentation agents
- Research agents

### Haiku (Simple/Fast Tasks)
- web-scraper (content extraction)
- data-extractor (file parsing)
- task-coordinator (ClickUp CRUD)

---

## Creating New Agents

### Need Customization? → Markdown
```bash
/agents
# Follow prompts to create custom agent
# File saved to .claude/agents/your-agent.md
```

### Need MCP Integration? → JSON
```bash
# Copy existing template
cp .claude/agents/configs/backend-architect.json \
   .claude/agents/configs/my-new-agent.json

# Edit: agentName, description, mcpServers, tools
```

---

## Memory Crash Prevention

**All JSON agents include:**
- ✅ Response format limits (`max_tokens: 800`)
- ✅ Artifact pattern (large data → files, not context)
- ✅ MCP pagination support

**If you see "heap out of memory":**
1. Check if agent has `response_format` config
2. Verify `artifacts.enabled: true`
3. Increase Node heap: `export NODE_OPTIONS="--max-old-space-size=16384"`

---

## Agent Routing

The main orchestrator uses `.claude/agents/delegation-map.json` to route tasks based on:

1. **File patterns** - `*.tsx` → frontend-developer
2. **Keywords** - "database", "migration" → backend-architect
3. **MCP requirements** - Browser test → qa-expert (has Playwright)

See `delegation-map.json` for full routing rules.

---

## Related Documentation

- **Full Guide:** `.claude/docs/AGENT_ARCHITECTURE.md`
- **Routing Rules:** `.claude/agents/delegation-map.json`
- **MCP Mappings:** `.claude/agents/mcp-mapping.json`
- **Usage Examples:** `.claude/examples/agent-usage-examples.md`
