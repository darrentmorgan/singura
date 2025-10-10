# Artifact System - Quick Start

## What Problem Does This Solve?

**Before**: Agents return 5,000-token responses → Orchestrator context exhausted after 3-5 tasks
**After**: Agents write to disk, return 50-token summaries → Orchestrator handles 50+ tasks

**Result**: 90%+ context reduction, no more memory crashes

## Installation (Already Included in Template)

The artifact system is pre-installed when you use the setup script:

```bash
npx degit darrentmorgan/claude-config-template .claude-temp && cd .claude-temp && bash setup.sh && cd .. && rm -rf .claude-temp
```

## Quick Test (30 seconds)

```bash
# 1. Create a test task
npx tsx .claude/scripts/delegation-router.ts "Add Button component" --execute

# 2. Check session was created
cat .claude/artifacts/.current-session
# Output: 2025-10-08_1430

# 3. Read agent summaries (lightweight)
npx tsx .claude/scripts/artifact-read.ts --summary
# Output: "frontend-developer: 1 task complete..."

# 4. View full details (on-demand)
npx tsx .claude/scripts/artifact-read.ts --agent frontend-developer
```

## How It Works (30 second explanation)

```
┌─────────────────────────────────────────────────────────────┐
│ OLD WAY (Context Exhaustion)                                 │
├─────────────────────────────────────────────────────────────┤
│ Orchestrator: "Add Button component"                        │
│ Agent: [Returns 5,000 tokens of code + explanation]         │
│ Orchestrator context: 5k → 10k → 15k → CRASH                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ NEW WAY (Artifact System)                                    │
├─────────────────────────────────────────────────────────────┤
│ Orchestrator: "Add Button component"                        │
│ Agent: Writes 5,000 tokens to disk scratchpad               │
│ Agent: Returns "✓ Added Button.tsx (120 lines)" (50 tokens) │
│ Orchestrator context: 50 → 100 → 150 → Sustainable          │
└─────────────────────────────────────────────────────────────┘
```

## Common Commands

```bash
# View current session
cat .claude/artifacts/.current-session

# List all agent work (summaries only)
npx tsx .claude/scripts/artifact-read.ts --summary

# Read specific agent's full scratchpad
npx tsx .claude/scripts/artifact-read.ts --agent backend-architect

# Search for specific work
npx tsx .claude/scripts/artifact-read.ts --search "button"

# Clean old sessions (7+ days)
npx tsx .claude/scripts/artifact-cleanup.ts --clean --days 7

# View session statistics
npx tsx .claude/scripts/artifact-cleanup.ts --stats
```

## What Gets Saved?

```
.claude/artifacts/
├── sessions/
│   └── 2025-10-08_1430/              # Your current session
│       ├── manifest.json             # Session metadata
│       ├── frontend-developer.md     # Agent scratchpad
│       ├── backend-architect.md      # Agent scratchpad
│       └── outputs/                  # Generated files
└── shared/
    ├── decisions.md                  # Cross-session decisions
    └── knowledge.md                  # Reusable patterns
```

## Context Savings

| Scenario | Without Artifacts | With Artifacts | Savings |
|----------|------------------|----------------|---------|
| 1 agent | 5k tokens | 50 tokens | 99% |
| 5 agents | 25k tokens | 250 tokens | 99% |
| 10 agents | 50k tokens | 500 tokens | 99% |
| 20 agents | 100k tokens (crash) | 1k tokens | 99% |

## Next Steps

1. ✅ Read [Full Artifact Guide](.claude/docs/ARTIFACT_SYSTEM_GUIDE.md)
2. ✅ Review [Agent Integration Patterns](.claude/artifacts/README.md)
3. ✅ Try delegating a real task with artifacts
4. ✅ Check session stats after a few tasks

## See Also

- [Artifact System Guide](ARTIFACT_SYSTEM_GUIDE.md) - Complete documentation
- [Agent Reference](AGENT_REFERENCE.md) - Agent capabilities
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues
