# Setting Up Your Global CLAUDE.md

This template includes a pre-configured CLAUDE.md file that defines how Claude Code agents should work in your projects.

## Installation

Copy the template to your global Claude Code configuration:

```bash
cp .claude/CLAUDE.md.template ~/.claude/CLAUDE.md
```

## What It Does

The CLAUDE.md file configures:

1. **Delegation-First Protocol** - Main orchestrator delegates code writing to specialized agents
2. **Autonomous Actions** - Agents can use browser tools, web search, and shell commands directly
3. **Clear Routing Rules** - When to delegate vs when to act autonomously
4. **Full-Stack Development Guidelines** - Best practices for planning, implementation, and testing

## Key Features

- ✅ Agents use Chrome DevTools/Playwright directly for browser automation
- ✅ Agents use WebSearch/WebFetch for research without asking
- ✅ Agents use Bash directly for git, npm, and other commands
- ❌ Delegates code writing to specialized agents (frontend, backend, etc.)
- ❌ Delegates Supabase, ClickUp, Context7 operations to agents with MCP access

## Customization

Edit `~/.claude/CLAUDE.md` to:
- Add project-specific coding standards
- Modify delegation rules
- Adjust autonomous action boundaries
- Add custom agent routing logic

## Updating

When this template is updated, refresh your global config:

```bash
cp .claude/CLAUDE.md.template ~/.claude/CLAUDE.md
```

Or merge changes manually if you've customized your version.

## What This Fixes

This template addresses common issues:
- Agents asking permission for actions they can do autonomously
- Confusion about when to delegate vs act directly
- Inconsistent behavior across different agent types
- Unclear boundaries for autonomous operations

## Delegation Rules

The template includes routing rules for:
- Frontend development (React, components, UI)
- Backend development (APIs, database, migrations)
- Testing (unit, integration, E2E)
- DevOps (deployment, CI/CD)
- Documentation (technical writing, API docs)

## Integration with .claude/agents/

This template works with the agent configuration system in this repository:
- `.claude/agents/configs/` - Individual agent configurations
- `.claude/agents/delegation-map.json` - Routing rules
- `.claude/agents/mcp-mapping.json` - MCP server assignments

## Next Steps

After copying to `~/.claude/CLAUDE.md`:

1. Test with a simple request to verify delegation works
2. Review and customize routing rules for your workflow
3. Add project-specific coding standards as needed
4. Monitor agent behavior and adjust boundaries as needed
