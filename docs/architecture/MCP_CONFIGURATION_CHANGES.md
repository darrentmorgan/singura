# Chrome DevTools MCP Configuration

## Changes Made

### 1. Installed chrome-devtools-mcp
```bash
npm install -g chrome-devtools-mcp
```
- Package installed at: `/Users/darrenmorgan/.nvm/versions/node/v20.19.5/bin/chrome-devtools-mcp`
- Version: latest from npm

### 2. Created MCP Configuration
Created `/Users/darrenmorgan/AI_Projects/singura/mcp.json`:
```json
{
  "mcpServers": {
    "chrome-devtools": {
      "description": "Chrome DevTools MCP server for browser automation, debugging, and performance analysis",
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest", "--isolated"]
    }
  }
}
```

This configuration:
- Runs chrome-devtools-mcp via npx (always uses latest version)
- Uses `--isolated` flag to create temporary user-data-dir (as per CLAUDE.md requirements)
- Will provide tools prefixed with `mcp__chrome-devtools__*`

## Required Next Steps

### Step 1: Disable Playwright MCP Plugin (REQUIRED)
The Playwright MCP is currently loaded via the "testing-suite" plugin. To remove it:

1. Edit `~/.claude/settings.json`
2. Find this line:
   ```json
   "testing-suite@claude-code-templates": true,
   ```
3. Change it to:
   ```json
   "testing-suite@claude-code-templates": false,
   ```

### Step 2: Restart Claude Code Session
After making the changes above, restart your Claude Code session to load the new MCP configuration.

### Step 3: Verify Chrome DevTools MCP Tools
After restart, verify the following tools are available:
- `mcp__chrome-devtools__navigate_page`
- `mcp__chrome-devtools__click`
- `mcp__chrome-devtools__take_screenshot`
- `mcp__chrome-devtools__take_snapshot`
- `mcp__chrome-devtools__evaluate_script`
- `mcp__chrome-devtools__list_console_messages`
- `mcp__chrome-devtools__list_network_requests`
- And all other Chrome DevTools tools

## Current Status

✅ chrome-devtools-mcp installed globally
✅ mcp.json configuration file created
✅ Project permissions already include Chrome DevTools tools (in `.claude/settings.local.json`)
⏳ Waiting for user to disable Playwright plugin in global settings
⏳ Waiting for session restart to load new configuration

## Benefits of Chrome DevTools MCP vs Playwright

According to `CLAUDE.md`:
- Better debugging capabilities
- Better console access
- Better network inspection
- Enables parallel browser instances with `--isolated` flag
- Direct access for main orchestrator (no delegation needed for browser tasks)

## Migration Note

The project documentation (CLAUDE.md) indicates this migration was planned on 2025-10-11:
> - ✅ Migrated from Playwright MCP to Chrome DevTools MCP exclusively
> - Chrome DevTools provides better debugging, console access, and network inspection
> - All agents (qa-expert, performance-engineer) now use Chrome DevTools only
> - Main orchestrator has direct Chrome DevTools access (no delegation needed for browser tasks)

This configuration change completes that migration at the MCP server level.
