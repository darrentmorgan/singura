# CLAUDE.md Integration Guide

## Overview

This guide explains how to integrate the specialized agent system with your global `CLAUDE.md` file for seamless agent delegation across all your projects.

---

## What is CLAUDE.md?

`CLAUDE.md` is a special file located at `~/.claude/CLAUDE.md` that contains global instructions for Claude Code. Any instructions in this file apply to ALL your projects, making it perfect for:

- Development workflow preferences
- Code style guidelines
- Agent delegation protocols
- Project-agnostic best practices

---

## Why Add Agent Reference to CLAUDE.md?

Adding the agent reference section to your CLAUDE.md file provides:

✅ **Global Awareness** - Claude knows about all available agents in every project
✅ **Automatic Routing** - Keyword-based delegation works automatically
✅ **Consistent Delegation** - Same agent patterns across all projects
✅ **Context Optimization** - 74% reduction in main agent context (125k → 33k tokens)
✅ **MCP Isolation** - Main orchestrator has ZERO MCP servers, all delegated to specialists

---

## Installation Methods

### Method 1: Automatic (During Setup)

When running `setup.sh`, you'll be prompted:

```bash
./setup.sh

# ... setup steps ...

Step 9: Global CLAUDE.md Update (Optional)
Would you like to add agent reference documentation to your global CLAUDE.md?
This adds a comprehensive agent guide to ~/.claude/CLAUDE.md

Update CLAUDE.md with agent reference? (y/n): y
```

Select `y` to automatically add the agent section.

---

### Method 2: Standalone Script

Run the update script directly at any time:

```bash
cd /path/to/claude-config-template
bash scripts/update-claude-md.sh
```

The script will:
1. Check if `~/.claude/CLAUDE.md` exists (creates it if not)
2. Detect if agent section already exists
3. Offer to update/replace the existing section
4. Append the complete agent reference

---

### Method 3: Manual Copy-Paste

1. Open the template file:
   ```bash
   cat docs/CLAUDE_MD_AGENT_SECTION.md
   ```

2. Copy everything AFTER the first 5 lines (skip the header)

3. Paste into your `~/.claude/CLAUDE.md` file at the end (or after the "Agent Dispatch Protocol" section)

---

## What Gets Added

The agent section includes:

### 1. Available Specialized Agents
Complete reference for all 14+ specialized agents:
- Development: `backend-architect`, `frontend-developer`, `typescript-pro`
- QA: `code-reviewer-pro`, `test-automator`, `qa-expert`
- Infrastructure: `deployment-engineer`, `database-optimizer`, `debugger`
- Research: `documentation-expert`, `general-purpose`
- Management: `product-manager`, `data-engineer`

### 2. Agent Routing Rules
- Keyword-based automatic delegation
- Explicit agent requests (`@backend-architect ...`)
- Multi-agent orchestration via `agent-organizer`

### 3. Response Format Standards
- Max 500-800 tokens per response
- Use `file:line` references
- Concise summaries only
- Excludes verbose dumps

### 4. Quality Gates
- Pre-commit: `code-reviewer-pro` required (80/100 min)
- Pre-deployment: `qa-expert` + `code-reviewer-pro` (85/100 min)

### 5. Configuration Files Reference
- `.claude/agents/delegation-map.json`
- `.claude/agents/configs/*.json`
- `~/.claude/agents/shared/` (global)

### 6. Best Practices
- Delegation patterns
- Anti-patterns to avoid
- Quick reference commands

### 7. Example Scenarios
- Database migrations
- E2E testing
- Multi-agent complex tasks

---

## File Structure After Integration

```
~/.claude/
├── CLAUDE.md                          ← Your global instructions + agent reference
└── agents/
    └── shared/                        ← Global shared agents (optional)
        ├── configs/
        │   ├── backend-architect.json
        │   ├── qa-expert.json
        │   └── ... (all agents)
        ├── delegation-map.json
        └── mcp-mapping.json

your-project/
└── .claude/
    ├── agents/
    │   ├── configs/ → ~/.claude/agents/shared/configs/  ← Symlink (if shared)
    │   ├── delegation-map.json        ← Project-specific overrides
    │   ├── mcp-mapping.json
    │   └── quality-judge.md
    ├── hooks/
    ├── commands/
    ├── settings.local.json
    └── docs/
        ├── AGENT_REFERENCE.md         ← Detailed agent docs
        └── MCP_DELEGATION_GUIDE.md
```

---

## Verification

After adding the agent section to CLAUDE.md, verify it works:

### Test 1: Agent Awareness
Ask Claude:
```
User: "What agents are available for database work?"

Expected Response:
"For database work, you have:
- backend-architect: Schema design, migrations, RLS policies
- database-optimizer: Query optimization, indexing, performance
- data-engineer: Data pipelines, ETL, batch processing"
```

### Test 2: Automatic Routing
Ask Claude:
```
User: "Create a migration for adding a posts table"

Expected Behavior:
Claude should automatically detect "migration" and "table" keywords
and delegate to backend-architect without explicit instruction.
```

### Test 3: Quality Gates
Edit a file and commit:
```bash
# Edit a React component
code src/components/Dashboard.tsx

# Commit changes
git add .
git commit -m "update dashboard"

Expected Behavior:
- Hook triggers code-reviewer-pro automatically
- Review score calculated
- Commit blocked if score < 80
```

---

## Customization

### Modify Agent Routing Rules

Edit your project's delegation map:
```bash
code .claude/agents/delegation-map.json
```

Add custom routing triggers:
```json
{
  "name": "Custom API Routes",
  "pattern": "src/api/routes/**/*.ts",
  "primary_agent": "backend-architect",
  "secondary_agents": ["typescript-pro"],
  "triggers": ["Edit", "Write"],
  "context": {
    "framework": "Express 5",
    "validation": "Zod"
  }
}
```

### Add Project-Specific Agents

Create custom agent configs:
```bash
# Add to .claude/agents/configs/
code .claude/agents/configs/my-custom-agent.json
```

Follow the structure in existing agent configs.

---

## Troubleshooting

### Agent Section Not Working

**Symptom**: Claude doesn't recognize agents or delegate properly

**Solutions**:
1. Verify CLAUDE.md location:
   ```bash
   ls -la ~/.claude/CLAUDE.md
   ```

2. Check agent section exists:
   ```bash
   grep "Available Specialized Agents" ~/.claude/CLAUDE.md
   ```

3. Restart Claude Code to reload global config

### Agents Not Loading MCP Servers

**Symptom**: Agent returns errors about missing MCP access

**Solutions**:
1. Verify agent config exists:
   ```bash
   ls .claude/agents/configs/backend-architect.json
   ```

2. Check MCP server credentials:
   ```bash
   cat .claude/agents/configs/backend-architect.json | jq '.mcpServers'
   ```

3. Ensure main orchestrator has NO MCP servers:
   ```bash
   # Should NOT have mcpServers key
   cat .claude/settings.local.json
   ```

### Delegation Not Automatic

**Symptom**: Have to manually request agents instead of automatic routing

**Solutions**:
1. Check delegation-map.json routing triggers:
   ```bash
   cat .claude/agents/delegation-map.json | jq '.mcp_routing_rules.routing_map[].keywords'
   ```

2. Verify your prompt contains routing keywords
   - Use words like: "migration", "database", "E2E test", "scrape", etc.

3. Make sure hooks are installed:
   ```bash
   ls -la .claude/hooks/
   chmod +x .claude/hooks/*.sh
   ```

---

## Best Practices

### 1. Keep CLAUDE.md Updated

Periodically update your agent reference:
```bash
cd /path/to/claude-config-template
bash scripts/update-claude-md.sh
```

### 2. Use Global Shared Agents

Enable during setup to avoid duplicating agent configs:
```bash
./setup.sh
# Select "y" for "Enable global agent sharing?"
```

### 3. Project-Specific Overrides

Keep project-specific routing rules in `.claude/agents/delegation-map.json`:
```json
{
  "delegation_rules": [
    {
      "name": "Next.js Pages",
      "pattern": "pages/**/*.tsx",
      "primary_agent": "nextjs-pro",
      "context": {
        "framework": "Next.js 14",
        "routing": "App Router"
      }
    }
  ]
}
```

### 4. Monitor Agent Performance

Track which agents are used most:
```bash
# Check logs
ls -la .claude/logs/

# Review agent invocations
grep "Delegating to" .claude/logs/agent-*.log
```

---

## Migration from Old Setup

If you have an older Claude Code configuration without agent support:

### Step 1: Backup Existing Config
```bash
cp -r .claude .claude.backup
cp ~/.claude/CLAUDE.md ~/.claude/CLAUDE.md.backup
```

### Step 2: Run Setup Script
```bash
cd /path/to/claude-config-template
./setup.sh
```

### Step 3: Merge Custom Rules
```bash
# Copy your custom rules from backup
code .claude.backup/settings.local.json
code .claude/settings.local.json
```

### Step 4: Test Agent Delegation
```bash
# Test with a simple request
claude "Create a migration for users table"
```

---

## Related Documentation

- **Agent Reference**: `.claude/docs/AGENT_REFERENCE.md` - Complete agent documentation
- **Setup Guide**: `README.md` - Installation and configuration
- **Hooks**: `.claude/hooks/README.md` - Hook system documentation
- **Commands**: `.claude/commands/*.md` - Slash command reference

---

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review logs in `.claude/logs/`
3. Verify agent configs in `.claude/agents/configs/`
4. Open an issue with:
   - Error messages
   - Your CLAUDE.md structure
   - Agent config file contents (sanitize credentials!)

---

*Last Updated: 2025-10-08*
