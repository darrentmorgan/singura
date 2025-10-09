# Agent MCP Configuration Files

This directory contains MCP server configurations for specialized sub-agents. Each agent has access only to the MCP servers relevant to their domain expertise.

## 📁 Configuration Files

| Agent | MCP Servers | Config File | Use Cases |
|-------|-------------|-------------|-----------|
| **documentation-expert** | Context7 | `documentation-expert.json` | Library docs, API references |
| **qa-expert** | chrome-devtools, playwright | `qa-expert.json` | E2E testing, visual QA |
| **test-automator** | chrome-devtools, playwright | `test-automator.json` | Test automation, debugging |
| **backend-architect** | supabase | `backend-architect.json` | DB migrations, schema, API design |
| **database-optimizer** | supabase | `database-optimizer.json` | Query optimization, indexing |
| **general-purpose** | firecrawl-mcp, Context7 | `general-purpose.json` | Web scraping, research, fallback |
| **product-manager** | clickup | `product-manager.json` | Task management, planning |
| **data-engineer** | supabase | `data-engineer.json` | Data pipelines, ETL |

## 🎯 Main Orchestrator

**CRITICAL**: The main orchestrator agent has **ZERO** MCP servers configured. All MCP operations MUST be delegated to specialized agents.

Main orchestrator config location:
- Global: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Project: `.claude/settings.local.json` (no mcpServers key)

## 🔄 How Agent Delegation Works

### 1. User Request → Main Agent
```
User: "How do I use React useEffect?"
Main Agent: [Analyzes request]
           [Detects: needs library docs]
           [Routes to: documentation-expert]
```

### 2. Main Agent → Specialized Agent
```
Main Agent → documentation-expert (Task tool)
Prompt: "Search Context7 for React useEffect usage and examples"
```

### 3. Specialized Agent Execution
```
documentation-expert:
  - Loads Context7 MCP server (only when invoked)
  - Searches library docs
  - Generates concise summary + code examples
  - Returns to main agent
```

### 4. Main Agent → User
```
Main Agent: [Receives summary from documentation-expert]
            [Formats response]
            [Returns to user]
```

## 📊 Context Savings

| Scenario | Main Agent Context | Total Context | Savings |
|----------|-------------------|---------------|---------|
| **Before (all MCP in main)** | 125k tokens | 125k tokens | - |
| **After (delegated MCP)** | 33k tokens | ~50k tokens* | **74% reduction** |

*Total includes main agent (33k) + active sub-agent context (varies by task)

## 🚀 Usage Examples

### Example 1: Library Documentation
```bash
# User request
"Show me Supabase RLS policy examples"

# Main agent delegates
Task(documentation-expert, "Search Context7 for Supabase RLS policy examples")

# documentation-expert returns
{
  summary: "RLS policy syntax and examples",
  code: "CREATE POLICY...",
  reference_url: "https://supabase.com/docs/guides/auth/row-level-security"
}
```

### Example 2: E2E Testing
```bash
# User request
"Run E2E tests for login flow"

# Main agent delegates
Task(qa-expert, "Execute E2E tests for login using Playwright")

# qa-expert returns
{
  results: "✅ 8 passed, ❌ 2 failed",
  failures: ["Login timeout on slow network", "2FA input not visible"],
  screenshots: ["test-screenshots/login-timeout.png"],
  file_references: ["tests/auth/login.spec.ts:42"]
}
```

### Example 3: Database Migration
```bash
# User request
"Create migration for user_preferences table"

# Main agent delegates
Task(backend-architect, "Create Supabase migration for user_preferences table with RLS")

# backend-architect returns
{
  migration_file: "supabase/migrations/20251008_user_preferences.sql",
  summary: "Created table with RLS policies for tenant isolation",
  rpc_functions: ["get_user_preference", "set_user_preference"],
  breaking_changes: "None"
}
```

## 🛠️ Configuration Structure

Each agent config file contains:

```json
{
  "agentName": "agent-name",
  "description": "Agent purpose",
  "mcpServers": {
    "server-name": {
      "command": "...",
      "args": [...],
      "env": {...}
    }
  },
  "capabilities": [...],
  "response_format": {
    "type": "...",
    "max_tokens": 500,
    "include": [...],
    "exclude": [...]
  },
  "routing_triggers": [...],
  "special_instructions": [...]
}
```

## ⚠️ Important Notes

1. **Never modify main agent config to add MCP servers** - This defeats the purpose
2. **Always delegate for MCP operations** - Main agent has no MCP access
3. **Return summaries, not raw data** - Keep context usage low
4. **Use routing_triggers** - Automatic delegation based on keywords
5. **Test with isolated Chrome** - Always use `--isolated` flag for chrome-devtools

## 📚 Related Documentation

- [MCP Delegation Guide](../../docs/MCP_DELEGATION_GUIDE.md)
- [Agent Delegation Map](../delegation-map.json)
- [MCP Server Mapping](../mcp-mapping.json)

## 🔒 Security

MCP server credentials are stored in agent configs. These files:
- Should NOT be committed to version control
- Are gitignored in `.gitignore`
- Use environment variables for sensitive data
- Follow principle of least privilege (each agent gets only needed servers)
