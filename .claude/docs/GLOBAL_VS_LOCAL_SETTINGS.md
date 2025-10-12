# Global vs Local Settings Guide

## Overview

Claude Code settings are now organized into **global** (user-level) and **local** (project-level) configurations. This separation provides better isolation, version control, and team synchronization.

## Global Settings (`~/.claude/`)

**Location**: `~/.claude/settings.json`

**Purpose**: User-wide preferences that apply to ALL projects

**What belongs here:**
```json
{
  "alwaysThinkingEnabled": true,
  "enabledPlugins": {
    "git-workflow@claude-code-templates": true,
    "testing-suite@claude-code-templates": true,
    // ... other plugins
  },
  "statusLine": {
    "type": "command",
    "command": "/opt/homebrew/bin/ccr"
  },
  "permissions": {
    "deny": [
      "Bash(rm -rf:*)",
      "Bash(rm -rf /:*)",
      "Read(*/secrets/*)"
    ]
  }
}
```

### Global Settings Include:

1. **Authentication**
   - `apiKeyHelper`
   - `forceLoginMethod`
   - `forceLoginOrgUUID`

2. **Plugin Registry**
   - `enabledPlugins` (plugins install globally)
   - Plugin marketplace configuration

3. **User Preferences**
   - `alwaysThinkingEnabled`
   - `statusLine` (default status line)
   - `spinnerTipsEnabled`

4. **Basic Security**
   - Critical deny rules (rm -rf, secrets)

### What NOT to put in Global Settings:

❌ Project-specific agents (**agents are always project-local**)
❌ Project-specific hooks
❌ Detailed permissions (allow lists)
❌ CLAUDE.md delegation rules
❌ MCP server configurations

**Note**: The setup script no longer creates global shared agents. All agents are project-local for better version control and project isolation.

---

## Local/Project Settings (`{project}/.claude/`)

**Location**: `.claude/settings.local.json`

**Purpose**: Project-specific configuration that can be version controlled

**What belongs here:**
```json
{
  "env": {
    "NODE_OPTIONS": "--max-old-space-size=16384"
  },
  "permissions": {
    "allow": [
      "Bash",
      "Edit",
      "Read",
      "Write",
      // ... comprehensive tool permissions
    ],
    "deny": [
      "Bash(rm -rf:*)"
    ]
  },
  "hooks": {
    "PreToolUse": [...],
    "PostToolUse": [...],
    "UserPromptSubmit": [...]
  }
}
```

### Project Settings Include:

1. **Environment Variables**
   - `env` (Node options, API URLs, etc.)

2. **Permissions**
   - Comprehensive `allow` list
   - Project-specific `deny` rules
   - `defaultMode` (plan, acceptEdits, bypassPermissions)

3. **Hooks**
   - PreToolUse, PostToolUse
   - UserPromptSubmit
   - SessionStart, SessionEnd

4. **Project-Specific Overrides**
   - Custom status line (if different from global)
   - MCP server approvals

---

## Project Structure

```
{project}/
├── .claude/
│   ├── settings.local.json      # Project permissions, hooks, env
│   ├── agents/
│   │   ├── configs/              # Agent definitions
│   │   ├── delegation-map.json   # Routing rules
│   │   └── mcp-mapping.json      # MCP server routing
│   ├── docs/
│   │   ├── CLAUDE.md             # Coding standards & delegation
│   │   ├── ARCHITECTURE.md       # Architecture patterns
│   │   ├── DATABASE.md           # DB patterns
│   │   └── TESTING.md            # Test strategies
│   ├── hooks/                    # Shell script hooks
│   ├── commands/                 # Slash commands
│   └── scripts/                  # Automation scripts
```

---

## Migration from Global to Local

### Step 1: Backup Global Settings
```bash
cp -r ~/.claude ~/.claude.backup.$(date +%Y%m%d_%H%M%S)
```

### Step 2: Use Template Sync Script
```bash
cd /path/to/your/project
/path/to/claude-config-template/scripts/sync-from-template.sh
```

### Step 3: Customize for Project
1. Edit `.claude/docs/CLAUDE.md` for project-specific rules
2. Update `.claude/agents/delegation-map.json` for routing
3. Configure `.claude/settings.local.json` permissions
4. Add project-specific hooks

### Step 4: Verify
```bash
# Check project has all needed files
ls -la .claude/

# Verify settings are valid
cat .claude/settings.local.json | jq '.'
```

---

## Settings Precedence

**Order of application:**

1. **Global** (`~/.claude/settings.json`)
   - Base permissions (deny rules)
   - Plugins
   - Default status line

2. **Project** (`.claude/settings.local.json`)
   - **Overrides** global permissions
   - **Adds** project-specific hooks
   - **Defines** environment variables

**Important**: Project settings take precedence over global settings for overlapping configurations.

---

## Best Practices

### DO ✅

- **Version control** project settings (`.claude/` in git)
- **Use template** as starting point for new projects
- **Document** project-specific CLAUDE.md rules
- **Keep global settings minimal** (auth + plugins only)
- **Test independently** after migration

### DON'T ❌

- **Don't** put project settings in global config
- **Don't** put authentication in project settings
- **Don't** commit secrets in `.claude/` files
- **Don't** use `bypassPermissions` globally
- **Don't** create global shared agents (each project has its own `.claude/agents/`)

---

## Troubleshooting

### Problem: Agent not found
**Solution**: Check if agent exists in `.claude/agents/configs/` or use namespaced plugin agent

### Problem: Permission denied
**Solution**: Check `.claude/settings.local.json` allow list, not global settings

### Problem: Global override
**Solution**: Remove conflicting setting from `~/.claude/settings.json`

### Problem: Slash command fails
**Solution**: Ensure CLAUDE.md has slash command exception (no delegation)

---

## Template Updates

To get latest template improvements:

```bash
cd /path/to/your/project
/path/to/claude-config-template/scripts/sync-from-template.sh
```

The sync script will:
- ✅ Back up existing `.claude/`
- ✅ Copy latest template files
- ✅ Preserve project-specific settings
- ✅ Check for deprecated agents
- ✅ Report changes made

---

## Examples

### Example 1: New Project Setup

```bash
# 1. Create project
mkdir my-project && cd my-project

# 2. Copy template
cp -r /path/to/claude-config-template/.claude .

# 3. Customize
nano .claude/docs/CLAUDE.md
nano .claude/settings.local.json

# 4. Initialize git
git init
git add .claude/
git commit -m "feat: add Claude Code configuration"
```

### Example 2: Migrate Existing Project

```bash
cd /path/to/existing-project

# 1. Sync from template
/path/to/claude-config-template/scripts/sync-from-template.sh

# 2. Review changes
git diff .claude/

# 3. Test
# Open Claude Code and verify everything works

# 4. Commit
git add .claude/
git commit -m "feat: migrate to project-specific settings"
```

---

## Support

For issues or questions:
1. Check template documentation in `.claude/docs/`
2. Review this guide
3. Check GitHub issues: https://github.com/darrentmorgan/claude-config-template/issues
4. Run verification: `./scripts/verify-agent-setup.sh`
