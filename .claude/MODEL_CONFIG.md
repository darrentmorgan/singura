# Claude Model Configuration

## Current Configuration

**Model**: Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`)

All Claude Code agents and commands in this project use Claude Sonnet 4.5, which is:
- The best coding model available (as of 2025)
- Strongest model for building complex agents
- State-of-the-art on SWE-bench Verified benchmark
- Same pricing as Claude 3.5 Sonnet

## Configuration Locations

### 1. Global (Shell Profile)
```bash
# ~/.zshrc
export ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
```

This ensures all Claude Code sessions use Sonnet 4.5 by default.

### 2. Project-Level
```json
// .claude/settings.json
{
  "model": "claude-sonnet-4-5-20250929",
  "description": "Use Claude Sonnet 4.5 for all agents and commands in this project"
}
```

## Applying Changes

After updating shell profile:
```bash
source ~/.zshrc
```

Or simply open a new terminal session.

## Switching Models (if needed)

During a Claude Code session:
```bash
/model sonnet         # Use latest Sonnet
/model opus           # Use Opus for complex reasoning
/model haiku          # Use Haiku for simple tasks
```

## Why Sonnet 4.5?

- **Best coding performance**: 61.4% success on OSWorld benchmark
- **Complex agent capabilities**: Ideal for Git Flow and automation workflows
- **Better reasoning**: Improved logic for multi-step tasks
- **Same cost**: $3/M input, $15/M output tokens
- **Most aligned**: Better safety and instruction following

## Verification

Check current model:
```bash
echo $ANTHROPIC_MODEL
# Should output: claude-sonnet-4-5-20250929
```

---

**Last Updated**: 2025-10-11
