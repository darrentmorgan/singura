# Singura Cleanup System

## Overview

Automated root folder organization system to maintain a clean project structure.

## Problem Solved

Before cleanup:
- 53 files in root directory
- Screenshots scattered across root and .playwright-mcp/
- 25 markdown reports cluttering root
- Log files accumulating
- Large temporary files (3.2MB XML files)

After cleanup:
- 19 essential files in root
- All screenshots organized in docs/screenshots/
- Historical reports archived
- Clean, maintainable structure

## Usage

### Run Cleanup Command

```bash
# From project root
bash .claude/commands/cleanup.sh

# Or make it a slash command (if using Claude Code)
/cleanup
```

### What Gets Organized

**1. Screenshots** → `docs/screenshots/`
- Root *.png, *.jpg files
- Playwright screenshots → `docs/screenshots/playwright/`

**2. Completed Reports** → `docs/archived-reports/`
- Implementation summaries
- OAuth fix reports
- Test coverage reports
- QA verification docs
- All historical development notes

**3. Active Documentation** → `docs/`
- DEPLOYMENT.md
- VERCEL_DEPLOYMENT.md

**4. Log Files** → Removed
- backend.log
- frontend.log
- frontend-new.log

**5. Temporary Files** → `.artifacts/temp/`
- flattened-codebase.xml
- Other large temporary files

### Files That Stay in Root

Essential project files:
- README.md (project overview)
- CLAUDE.md (development guidelines)
- package.json, package-lock.json
- docker-compose.yml, Dockerfile
- Config files (.gitignore, tsconfig.json, etc.)
- .env files

## Directory Structure

```
singura/
├── README.md                    # Project overview
├── CLAUDE.md                    # Development guidelines
├── package.json                 # Dependencies
├── docker-compose.yml           # Infrastructure
│
├── docs/
│   ├── screenshots/            # All screenshots
│   │   └── playwright/         # Browser test screenshots
│   ├── archived-reports/       # Historical dev reports
│   ├── DEPLOYMENT.md           # Deployment guide
│   └── VERCEL_DEPLOYMENT.md    # Vercel-specific docs
│
├── .artifacts/
│   ├── logs/                   # Temporary log files
│   └── temp/                   # Large temporary files
│
├── .playwright-mcp/            # Playwright working directory (gitignored)
└── .claude/
    └── commands/
        └── cleanup.sh          # This cleanup script
```

## Preventing Future Clutter

### Updated .gitignore

The cleanup system also updated .gitignore to prevent:
- Root-level screenshots (/*.png, /*.jpg)
- .playwright-mcp/ directory
- .artifacts/ directory
- Archived reports
- Large XML files

### Best Practices

1. **After Major Features**: Run cleanup to archive implementation reports
2. **Before Pull Requests**: Ensure clean root structure
3. **Weekly During Active Development**: Prevent accumulation
4. **After Testing Sessions**: Organize screenshots from Playwright

## When to Run

- After completing a feature (archive reports)
- When screenshots accumulate
- Before creating pull requests
- Weekly during active development
- After E2E test sessions

## Safe to Run Multiple Times

The script is idempotent - running it multiple times won't cause issues or duplicate work.

## Output Example

```
========================================
   Singura Root Folder Cleanup
========================================

1. Moving screenshots...
  ✓ Moved: landing-page-final.png

2. Archiving completed reports...
  ✓ Archived: OAUTH_FIX_REPORT.md
  ✓ Archived: TEST_COVERAGE_REPORT.md

3. Organizing active documentation...
  ✓ Moved: DEPLOYMENT.md → docs/

4. Cleaning up log files...
  ✓ Removed: backend.log

5. Moving temporary files...
  ✓ Moved: flattened-codebase.xml → .artifacts/temp/

6. Organizing Playwright screenshots...
  ✓ Moved 56 Playwright screenshots

========================================
          Cleanup Summary
========================================
Files moved:     59
Files archived:  20
Files removed:   3
```

## Troubleshooting

### No Files to Clean

If the cleanup reports "0 files moved", your root is already clean!

### Permission Denied

```bash
chmod +x .claude/commands/cleanup.sh
```

### Need to Restore a File

All archived files are in `docs/archived-reports/` - simply move them back to root if needed.

## Maintenance

The cleanup script list of reports to archive is defined in the script itself. To add new reports:

1. Edit `/Users/darrenmorgan/AI_Projects/singura/.claude/commands/cleanup.sh`
2. Add report filename to the `reports=()` array
3. Run cleanup

## Related Documentation

- [.claude/commands/README.md](/.claude/commands/README.md) - All available commands
- [CLAUDE.md](/CLAUDE.md) - Development guidelines
- [README.md](/README.md) - Project overview
