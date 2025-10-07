# SaaS X-Ray Slash Commands

This directory contains automation scripts for maintaining the SaaS X-Ray project.

## Available Commands

### /cleanup (or /tidy)

**Purpose**: Organizes the root folder by moving screenshots, archiving old reports, and cleaning up temporary files.

**Usage**:
```bash
# From project root
bash .claude/commands/cleanup.sh

# Or make it executable and run directly
chmod +x .claude/commands/cleanup.sh
./.claude/commands/cleanup.sh
```

**What it does**:
1. Creates organized directory structure:
   - `docs/screenshots/` - All screenshots (root + playwright)
   - `docs/archived-reports/` - Completed implementation reports
   - `.artifacts/logs/` - Temporary log files
   - `.artifacts/temp/` - Large temporary files

2. Moves root screenshots to `docs/screenshots/`

3. Archives completed reports (no longer actively referenced):
   - Implementation summaries
   - OAuth fix reports
   - Test coverage reports
   - QA verification summaries

4. Moves active deployment docs to `docs/` folder

5. Removes temporary log files (backend.log, frontend.log)

6. Moves large temporary files (like flattened-codebase.xml) to `.artifacts/temp/`

7. Organizes .playwright-mcp screenshots to `docs/screenshots/playwright/`

**Files that stay in root**:
- README.md (project overview)
- CLAUDE.md (development guidelines)
- package.json, docker-compose.yml (essential configs)
- .env files (environment configs)
- Essential config files (.gitignore, tsconfig.json, etc.)

**When to run**:
- After completing a major feature (to archive implementation reports)
- When screenshots accumulate from testing
- Before creating a pull request
- Weekly during active development

**Safe to run multiple times**: The script is idempotent - running it multiple times won't cause issues.

## Creating New Commands

To add a new slash command:

1. Create a new `.sh` file in this directory
2. Make it executable: `chmod +x your-command.sh`
3. Add documentation to this README
4. Follow the naming convention: lowercase with hyphens

Example:
```bash
#!/bin/bash
# Brief description of what the command does

# Your script here
```
