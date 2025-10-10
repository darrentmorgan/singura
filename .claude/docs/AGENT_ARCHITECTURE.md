# Agent Architecture Guide

A comprehensive guide to the dual-agent system in this Claude Code template.

## Overview

This template uses a **hybrid agent architecture** combining two complementary approaches:

1. **Markdown Agents** - User-customizable, `/agents` command compatible
2. **JSON Agent Configs** - Framework-level, Task tool integration

Both systems work together to provide maximum flexibility and power.

---

## Why We Use Both Formats

### The Critical Difference

**Markdown agents are the official Claude Code format**, but they have limitations. **JSON configs provide enterprise-grade features** that markdown can't.

Here's the honest comparison:

| Feature | Markdown Agents | JSON Configs |
|---------|----------------|--------------|
| Official Claude Code support | ✅ Yes | ❌ No |
| `/agents` command | ✅ Yes | ❌ No |
| **MCP server configuration** | ❌ **No** | ✅ **Yes** |
| **Response format limits** | ❌ **No** | ✅ **Yes** |
| **Memory crash prevention** | ❌ **No** | ✅ **Yes** |
| **Artifact/scratchpad pattern** | ❌ **No** | ✅ **Yes** |
| Model version control | ⚠️ Basic | ✅ Advanced |
| User-editable | ✅ Very easy | ⚠️ Requires JSON knowledge |

### Why This Matters

**Without JSON configs, your agents would:**
- ❌ Crash with "heap out of memory" on large MCP responses
- ❌ Can't configure Supabase, ClickUp, Chrome DevTools, etc.
- ❌ No control over response size (context bloat)
- ❌ No artifact pattern for large datasets

**With JSON configs, you get:**
- ✅ MCP server integration (Supabase, ClickUp, Playwright, etc.)
- ✅ Response size limits (prevents memory crashes)
- ✅ Artifact pattern (write large data to files, return summaries)
- ✅ Production-grade error handling
- ✅ Context optimization (~92k token savings)

### The Hybrid Strategy

This template is a **production framework**, not just a user tool. We provide:

1. **JSON Configs** → Framework-level agents with MCP, memory safety
2. **Markdown Agents** → User-customizable, project-specific agents
3. **Delegation Maps** → Routing intelligence

**Official Claude Code format** (markdown) handles simple tasks.
**Our enhanced format** (JSON) handles complex, production-grade tasks.

Don't sacrifice capability for "official compliance" - we support both! 🚀

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│           Main Orchestrator Agent                        │
│  - Reads delegation-map.json for routing                │
│  - Manages workflow state                               │
│  - Delegates to appropriate sub-agents                  │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌──────────────────┐          ┌──────────────────┐
│  Markdown Agents │          │   JSON Configs   │
│  (.claude/agents)│          │ (agents/configs) │
├──────────────────┤          ├──────────────────┤
│ • quality-judge  │          │ • backend-arch   │
│ • deep-research  │          │ • qa-expert      │
│ • code-reviewer  │          │ • test-automator │
│ • [user-created] │          │ • 18 more...     │
└──────────────────┘          └──────────────────┘
        │                               │
        └───────────────┬───────────────┘
                        ▼
              ┌──────────────────┐
              │  Delegation Map  │
              │  Routing Rules   │
              └──────────────────┘
```

---

## System 1: Markdown Agents

### Location
```
.claude/agents/
├── quality-judge.md
├── deep-research-analyst.md
└── [your-custom-agents].md
```

### Format

```markdown
---
name: code-reviewer
description: Expert code review specialist focusing on security and performance
tools: Read, Grep, Glob, Bash
model: sonnet
---

# System Prompt

You are an expert code reviewer specializing in...

## Responsibilities
- Review code for security vulnerabilities
- Check performance implications
- Ensure best practices

## Output Format
Provide structured feedback with:
1. Issues found
2. Severity (blocker/critical/minor)
3. Suggested fixes
```

### Creating Markdown Agents

**Method 1: Via `/agents` Command (Recommended)**
```bash
# In Claude Code CLI
/agents

# Follow prompts to create new agent
```

**Method 2: Manual Creation**
```bash
# Create file in .claude/agents/
cat > .claude/agents/my-agent.md <<'EOF'
---
name: my-agent
description: What this agent does
tools: Read, Write, Grep
model: sonnet
---

Your system prompt here...
EOF
```

### Invoking Markdown Agents

**Explicit Invocation:**
```
Use the quality-judge subagent to review this code.
```

**Automatic Delegation:**
```
Review this code for security issues.
# Orchestrator automatically routes to quality-judge based on keywords
```

---

## System 2: JSON Agent Configs

### Location
```
.claude/agents/configs/
├── backend-architect.json
├── frontend-developer.json
├── qa-expert.json
└── [21 total configs]
```

### Format

```json
{
  "agentName": "backend-architect",
  "description": "Backend architecture and Supabase database specialist",
  "model": "claude-sonnet-4-5-20250929",
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase"],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "${SUPABASE_ACCESS_TOKEN}"
      }
    }
  },
  "tools": [
    "Read", "Write", "Edit", "Grep", "Glob", "Bash",
    "mcp__supabase__*"
  ],
  "response_format": {
    "type": "architecture_summary",
    "max_tokens": 800
  },
  "artifacts": {
    "enabled": true,
    "scratchpad": true
  }
}
```

### Creating JSON Configs

**Template:**
```bash
cp .claude/agents/configs/backend-architect.json .claude/agents/configs/my-new-agent.json

# Edit the new file
# Update: agentName, description, model, mcpServers, tools
```

### Invoking JSON Agents

**Via Task Tool:**
```javascript
Task({
  agent: "backend-architect",
  task: "Create database migration for user_preferences table",
  config: ".claude/agents/configs/backend-architect.json"
})
```

**Via Delegation Map (Automatic):**
```
# User request contains keywords like "database", "migration", "supabase"
# Orchestrator reads delegation-map.json → routes to backend-architect
```

---

## Delegation Map

### File: `.claude/agents/delegation-map.json`

**Purpose:** Maps task keywords to appropriate agents

```json
{
  "delegation_rules": {
    "database": {
      "agents": ["backend-architect", "database-optimizer"],
      "primary": "backend-architect",
      "triggers": ["database", "migration", "schema", "SQL"]
    },
    "testing": {
      "agents": ["qa-expert", "test-automator"],
      "primary": "qa-expert",
      "triggers": ["test", "E2E", "QA", "browser automation"]
    }
  }
}
```

**How It Works:**
1. User makes request: "Create a database migration"
2. Orchestrator scans request for trigger keywords: "database", "migration"
3. Matches to rule → selects "backend-architect"
4. Delegates task to backend-architect agent

---

## When to Use Which System

### Use Markdown Agents When:
- ✅ User needs to customize agent behavior
- ✅ Agent is project-specific (code review rules, documentation style)
- ✅ No MCP servers required
- ✅ Simple tool access (Read, Grep, Bash)
- ✅ Created via `/agents` command for quick iterations

**Examples:**
- Quality judge with custom review criteria
- Code reviewer with project-specific rules
- Documentation generator with team style guide

### Use JSON Configs When:
- ✅ MCP server integration required (Supabase, ClickUp, Chrome DevTools)
- ✅ Complex tool permissions and response formats
- ✅ Framework-level agents (reusable across projects)
- ✅ Need structured configuration (artifacts, context optimization)
- ✅ Invoked via Task tool in automation

**Examples:**
- backend-architect (needs Supabase MCP)
- qa-expert (needs Chrome DevTools + Playwright MCP)
- task-coordinator (needs ClickUp MCP)

---

## Agent Communication Patterns

### Pattern 1: Sequential Delegation

```
Orchestrator
    ↓ (Task 1)
backend-architect → Creates schema
    ↓ (Task 2, waits for Task 1)
frontend-developer → Creates UI components
    ↓ (Task 3, waits for Task 2)
qa-expert → Tests integration
```

### Pattern 2: Parallel Delegation

```
Orchestrator
    ├─→ backend-architect (API endpoints)
    ├─→ frontend-developer (UI components)
    └─→ test-automator (test scaffolding)
         │
         └─→ All run simultaneously, orchestrator aggregates results
```

### Pattern 3: User-Invoked Review

```
Developer writes code
    ↓
Explicitly invokes: "Use quality-judge to review"
    ↓
quality-judge (markdown agent) provides structured feedback
    ↓
Developer applies fixes
```

---

## Best Practices

### 1. Naming Conventions

**Markdown Agents:**
- Use descriptive, kebab-case names: `code-reviewer`, `api-documenter`
- Reflect role: `quality-judge`, `security-auditor`

**JSON Configs:**
- Match built-in agents: `backend-architect`, `frontend-developer`
- Use same name in `agentName` field

### 2. Context Optimization

**For Large Responses:**
```json
{
  "response_format": {
    "max_tokens": 800,
    "exclude": ["verbose_traces", "full_logs"]
  },
  "artifacts": {
    "enabled": true,
    "instructions": "Write full details to artifact, return summary only"
  }
}
```

**For Markdown Agents:**
```markdown
---
description: |
  Review code and return concise summary.
  Write detailed findings to .claude/artifacts/review-{timestamp}.md
---
```

### 3. Tool Permissions

**Principle of Least Privilege:**
```json
{
  "tools": ["Read", "Grep"]  // Only what's needed
}
```

**vs Excessive:**
```json
{
  "tools": ["*"]  // Avoid - gives all tools
}
```

### 4. Model Selection

**Lightweight Tasks (Haiku):**
- Data extraction
- Simple CRUD operations
- Web scraping

**Complex Tasks (Sonnet):**
- Code architecture
- Security reviews
- Complex analysis

```markdown
---
model: haiku  # For simple tasks
---
```

```json
{
  "model": "claude-sonnet-4-5-20250929"  // For complex tasks
}
```

---

## Troubleshooting

### Agent Not Found

**Problem:** "Agent 'my-agent' not found"

**Solutions:**
1. Check file exists: `ls .claude/agents/my-agent.md`
2. Verify YAML frontmatter has correct `name:` field
3. Restart Claude Code to reload agents

### MCP Server Errors

**Problem:** "MCP server 'supabase' failed to start"

**Solutions:**
1. Check API keys in environment: `echo $SUPABASE_ACCESS_TOKEN`
2. Verify MCP command correct: `npx @supabase/mcp-server-supabase`
3. Check `.claude/agents/configs/[agent].json` for typos

### Memory Crashes

**Problem:** "JavaScript heap out of memory"

**Solution:**
```bash
# Increase Node.js heap size
export NODE_OPTIONS="--max-old-space-size=16384"

# Add to agent config
{
  "response_format": {
    "max_tokens": 800  // Limit response size
  },
  "artifacts": {
    "enabled": true  // Write large data to files
  }
}
```

### Wrong Agent Invoked

**Problem:** Orchestrator selects wrong agent

**Solution:** Update `.claude/agents/delegation-map.json`:
```json
{
  "delegation_rules": {
    "your-task-type": {
      "triggers": ["keyword1", "keyword2", "keyword3"]
    }
  }
}
```

---

## Advanced: Creating Custom Agent Types

### Example: Security Scanner Agent

**1. Create Markdown Agent**

```markdown
---
name: security-scanner
description: Automated security vulnerability scanner
tools: Read, Grep, Bash, WebSearch
model: sonnet
---

# Security Scanner Agent

You scan codebases for security vulnerabilities.

## Checks
- Hardcoded secrets (API keys, passwords)
- SQL injection risks
- XSS vulnerabilities
- Insecure dependencies

## Output
Return JSON with:
- severity (critical/high/medium/low)
- location (file:line)
- description
- fix
```

**2. Add to Delegation Map**

```json
{
  "delegation_rules": {
    "security": {
      "agents": ["security-scanner"],
      "primary": "security-scanner",
      "triggers": [
        "security",
        "vulnerability",
        "scan",
        "audit",
        "CVE"
      ]
    }
  }
}
```

**3. Invoke**

```
Scan the codebase for security vulnerabilities
# Automatically routes to security-scanner
```

---

## Summary

### Markdown Agents
- ✅ User-customizable
- ✅ Simple configuration
- ✅ `/agents` command compatible
- ❌ No complex MCP integration

### JSON Configs
- ✅ MCP server support
- ✅ Complex tool permissions
- ✅ Task tool integration
- ❌ Harder to customize quickly

### Best Practice: Use Both
- **Markdown** for project-specific, customizable agents
- **JSON** for framework-level, MCP-enabled agents
- **Delegation Map** to route between them

This hybrid approach gives maximum flexibility and power! 🚀

---

## Related Documentation

- `.claude/docs/WORKFLOW_ORCHESTRATION.md` - Multi-phase task management
- `.claude/docs/DELEGATION.md` - Delegation protocol
- `.claude/agents/delegation-map.json` - Routing rules
- `.claude/agents/mcp-mapping.json` - MCP server mappings
