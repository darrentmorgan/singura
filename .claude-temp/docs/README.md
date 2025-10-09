# Documentation Structure

## Overview

This directory contains modular documentation that is **loaded on-demand** rather than being embedded in the global CLAUDE.md file.

**Why Modular?**
- ✅ **80%+ token reduction** in global CLAUDE.md
- ✅ **Faster conversation startup** (less context to load)
- ✅ **Better organization** (one file, one purpose)
- ✅ **Easier maintenance** (update one file, not hunting through 800 lines)
- ✅ **On-demand loading** (Claude reads files only when needed)

---

## File Structure

### Core Documentation (Always Referenced)

#### `DELEGATION.md` (~220 lines)
**When to read**: Before delegating to any specialized agent

**Contains**:
- Full delegation protocol and philosophy
- Triage process and dispatch strategy
- Detailed delegation scenarios with examples
- Pre-action checklist
- Quick reference commands

**Referenced from CLAUDE.md**:
```markdown
**Full Delegation Protocol**: Read `.claude/docs/DELEGATION.md`
```

---

#### `AGENT_REFERENCE.md` (~300 lines)
**When to read**: Need to know which agent handles what

**Contains**:
- Complete list of all specialized agents
- MCP server assignments per agent
- File patterns and routing triggers
- Example usage for each agent
- Response format standards

**Referenced from CLAUDE.md**:
```markdown
**Agent Capabilities**: Read `.claude/docs/AGENT_REFERENCE.md`
```

---

#### `WORKFLOWS.md` (~280 lines)
**When to read**: Starting multi-phase implementations

**Contains**:
- Scout → Plan → Build workflow
- Slash command documentation
- TDD enforcement strategies
- Autonomous development patterns

**Referenced from CLAUDE.md**:
```markdown
**Scout→Plan→Build**: Read `.claude/docs/WORKFLOWS.md`
```

---

#### `TESTING_GUIDE.md` (~260 lines)
**When to read**: Writing or reviewing tests

**Contains**:
- Unit/integration/E2E testing strategies
- Coverage requirements
- Test patterns and best practices
- Testing agent usage

**Referenced from CLAUDE.md**:
```markdown
**Testing Strategy**: Read `.claude/docs/TESTING.md`
```

---

### Supporting Documentation

#### `PARALLEL_EXECUTION_GUIDE.md`
Parallel agent execution patterns and optimization strategies

#### `PARALLEL_EXECUTION_QUICK_REF.md`
Quick reference for parallel vs sequential execution

#### `ARCHITECTURE.md` (Create this for frontend/backend patterns)
Frontend/backend architecture patterns and code quality standards

#### `DATABASE.md` (Create this for schema patterns)
Database schema design, migration patterns, and RLS policies

---

## How It Works

### In Global `~/.claude/CLAUDE.md` (Always Loaded)

**Small, focused content (~290 lines):**
- Critical enforcement rules ("NEVER do X")
- Auto-delegate triggers
- Pre-action checklist
- Quick agent dispatch table
- **References to detailed docs**

### In Project `.claude/docs/` (Loaded On-Demand)

**Detailed content (loaded when needed):**
- DELEGATION.md - When delegating
- AGENT_REFERENCE.md - When choosing agents
- TESTING_GUIDE.md - When writing tests
- WORKFLOWS.md - For multi-phase work

---

## Usage Examples

### Example 1: Delegating a Task

**Claude reads:**
1. CLAUDE.md (always loaded) - sees "Read DELEGATION.md for details"
2. `.claude/docs/DELEGATION.md` - loads full protocol on-demand
3. Executes delegation based on detailed protocol

### Example 2: Writing Tests

**Claude reads:**
1. CLAUDE.md (always loaded) - sees trigger "tests"
2. `.claude/docs/TESTING.md` - loads testing strategies
3. Delegates to `test-automator` with proper context

### Example 3: Database Migration

**Claude reads:**
1. CLAUDE.md (always loaded) - sees trigger "migration"
2. `.claude/docs/DATABASE.md` - loads schema patterns
3. Delegates to `backend-architect` with MCP access

---

## Installation

### For Users

**Install condensed CLAUDE.md:**
```bash
# From template directory
bash scripts/update-claude-md.sh
```

This will:
- Install condensed CLAUDE.md to `~/.claude/CLAUDE.md`
- Create backup of existing file
- Show size reduction stats

**Install docs to project:**
```bash
# Run setup.sh in your project
npx degit darrentmorgan/claude-config-template .claude-temp && cd .claude-temp && bash setup.sh && cd .. && rm -rf .claude-temp
```

This will:
- Copy all docs to `.claude/docs/`
- Install agent configs
- Set up hooks and scripts

---

## Maintenance

### Adding New Documentation

1. Create new doc in `/docs/`
2. Add reference in `CLAUDE_MD_CONDENSED.md`:
   ```markdown
   - **New Topic**: Read `.claude/docs/NEW_TOPIC.md`
   ```
3. Update `setup.sh` if needed (currently auto-copies all docs)
4. Run `bash scripts/update-claude-md.sh` to update global CLAUDE.md

### Updating Existing Docs

1. Edit the specific doc file (e.g., `DELEGATION.md`)
2. No need to update CLAUDE.md (references stay the same)
3. Users re-run setup.sh to get updated docs

---

## Token Savings Calculation

**Old Approach:**
- Global CLAUDE.md: ~800 lines
- Loaded EVERY conversation
- ~60,000 tokens per conversation

**New Approach:**
- Global CLAUDE.md: ~290 lines (~21,000 tokens)
- Detailed docs: Loaded only when needed (~5,000-8,000 tokens per doc)
- Average savings: ~30,000-40,000 tokens per conversation

**Real-world example:**
- Simple "fix this bug": 290 lines (only CLAUDE.md)
- Complex "build feature": 290 + DELEGATION.md + AGENT_REFERENCE.md = ~810 lines (still less than old 800-line monolith, but with better organization)

---

## FAQ

**Q: Will Claude actually read these files on-demand?**
A: Yes! Claude Code can read any file path. The references in CLAUDE.md tell Claude when to read detailed docs.

**Q: What if I customize my CLAUDE.md?**
A: The condensed template is a starting point. You can modify references to point to your custom docs.

**Q: Do I need to update every project?**
A: Run `setup.sh` once per project to install docs. Updates propagate automatically when you re-run setup.

**Q: What about the old CLAUDE_MD_AGENT_SECTION.md?**
A: It's deprecated in favor of the modular approach. Use `CLAUDE_MD_CONDENSED.md` instead.

---

## Contributing

When adding new documentation:
1. Keep it focused (one topic per file)
2. Add clear "When to read" section at top
3. Update CLAUDE_MD_CONDENSED.md with reference
4. Test that Claude can read it on-demand
5. Document token count (~wc -l * 70 tokens/line)

---

**✅ Ready to install? Run `bash scripts/update-claude-md.sh` from the template directory!**
