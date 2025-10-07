# Cleanup Command Quick Reference

## Run Command

```bash
bash .claude/commands/cleanup.sh
```

## What It Does

| Action | Source | Destination |
|--------|--------|-------------|
| Move Screenshots | Root *.png, *.jpg | docs/screenshots/ |
| Move Playwright Screens | .playwright-mcp/*.png | docs/screenshots/playwright/ |
| Archive Reports | Root *_REPORT.md, etc. | docs/archived-reports/ |
| Move Active Docs | DEPLOYMENT.md | docs/ |
| Remove Logs | backend.log, frontend.log | Deleted |
| Move Temp Files | flattened-codebase.xml | .artifacts/temp/ |

## When to Run

- After completing a feature
- Before creating a PR
- When screenshots accumulate
- Weekly during active development

## Root Files (Keep)

- README.md
- CLAUDE.md
- package.json
- docker-compose.yml
- Config files (.gitignore, tsconfig.json, etc.)

## Full Docs

See: `/Users/darrenmorgan/AI_Projects/saas-xray/docs/CLEANUP_SYSTEM.md`
