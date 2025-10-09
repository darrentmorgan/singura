# Scout - Identify Minimal Context

Phase 1 of the Scout → Plan → Build workflow.

Identifies only the files, symbols, and dependencies truly necessary for implementing a feature or fixing a bug, minimizing context for downstream planning.

## Purpose

Before planning implementation, Scout analyzes the codebase to:
- Find relevant files and their dependencies
- Identify key symbols (functions, components, types)
- Determine byte/line ranges for precision
- Flag open questions or ambiguities

**Output**: `.claude/artifacts/scout-report.md`

---

## Usage

```bash
# Basic usage
User: "Scout the codebase to add dark mode toggle to settings"

# Specific directories
User: "Scout app/, src/components/, and src/lib/ for implementing user profiles"

# With documentation
User: "Scout for adding Stripe payment integration, check Stripe docs"
```

---

## Workflow

This command invokes the `scout-agent` via Task tool with the following workflow:

### 1. Understand the Task

Scout analyzes the user's request to determine:
- What feature/bug is being addressed
- What parts of the codebase are likely relevant
- What external documentation might be needed

### 2. Scan Directories

Default scan locations (customize per project):
- `app/` (Next.js app directory)
- `src/components/` (React components)
- `src/lib/` (Utility functions)
- `src/server/` (API handlers)
- `src/stores/` (State management)

Uses tools:
- **Glob**: Find files matching patterns (`*.tsx`, `*.ts`, etc.)
- **Grep**: Search for symbols, imports, function names
- **Read**: Examine file contents (minimal, strategic)

### 3. Identify Dependencies

Scout maps relationships:
- Component A imports component B
- Handler C calls database function D
- Type E is used in files F, G, H

### 4. Determine Precision Ranges

Instead of "entire file", Scout identifies:
- **Line ranges**: "lines 45-78" (contains Button component)
- **Byte ranges**: "offset 1200, length 450" (more precise)
- **Rationale**: Why this range matters

### 5. Generate Scout Report

**Output location**: `.claude/artifacts/scout-report.md`

**Report structure**:

```markdown
# Scout Report: [Task Name]

## Summary
1-2 sentence overview of scope

## Relevant Files

### Files to Modify
| Path | Reason | Ranges | Symbols | Risk |
|------|--------|--------|---------|------|
| `src/components/Settings.tsx` | Add dark mode toggle UI | lines 23-67 | Settings, useSettings | low |
| `src/lib/theme.ts` | Add theme toggle logic | lines 10-25 | themeStore | medium |

### Files for Context Only
| Path | Reason | Ranges | Symbols |
|------|--------|--------|---------|
| `src/lib/utils.ts` | Contains cn() utility | lines 8-12 | cn |

## Dependencies
- Settings → themeStore (state management)
- Settings → cn() utility
- themeStore → localStorage (persistence)

## Key Symbols
- `Settings` component
- `useSettings()` hook
- `themeStore` (Zustand store)
- `cn()` utility

## Open Questions
- Should dark mode persist across sessions?
- Are there existing theme tokens in Tailwind config?
- Do we need system preference detection?

## Documentation Needed
- (Optional) Links to relevant docs for planner to fetch
```

---

## Integration with Planner

Scout's output becomes the input for `/plan`:

```bash
# After running Scout
/plan --task "Add dark mode toggle" --scout-report .claude/artifacts/scout-report.md
```

The Planner uses Scout's file/range hints to:
- Stay focused on minimal scope
- Avoid scanning unnecessary files
- Create precise, scoped implementation steps

---

## Agent Delegation

This command delegates to `scout-agent`:

```
Task Tool → scout-agent
  Prompt: "Identify minimal files and dependencies for: {user's task}"
  Tools: Read, Grep, Glob (read-only)
  Output: .claude/artifacts/scout-report.md
```

**Scout agent has NO Write access** - purely analytical.

---

## Example Output

For task: *"Add loading spinner to Dashboard component"*

```markdown
# Scout Report: Add loading spinner to Dashboard

## Summary
Dashboard component in src/components/ needs loading state UI. Requires Spinner component (already exists) and loading state hook.

## Relevant Files

### Files to Modify
| Path | Reason | Ranges | Symbols | Risk |
|------|--------|--------|---------|------|
| `src/components/Dashboard.tsx` | Add loading UI | lines 15-45 | Dashboard | low |

### Files for Context Only
| Path | Reason | Ranges | Symbols |
|------|--------|--------|---------|
| `src/components/ui/Spinner.tsx` | Existing spinner component | all | Spinner |
| `src/hooks/useDashboardData.ts` | Provides isLoading state | lines 8-22 | useDashboardData |

## Dependencies
- Dashboard → Spinner (UI component)
- Dashboard → useDashboardData() (data hook with isLoading)

## Key Symbols
- `Dashboard` component
- `Spinner` component (reusable)
- `useDashboardData()` hook

## Open Questions
- Should spinner be fullscreen or inline?
- Do we need skeleton loading for specific sections?

## Estimated Scope
- Files to touch: 1 (Dashboard.tsx)
- Lines to change: ~10
- Risk: Low
- Complexity: Simple
```

---

## Best Practices

### ✅ Do
- Focus on **minimal context** - only what's truly needed
- Provide **rationale** for each file inclusion
- Flag **open questions** for planner to address
- Note **risk level** (low/medium/high) per file
- Identify **existing patterns** to follow

### ❌ Don't
- Include unrelated files "just in case"
- Read entire large files - use Grep for targeted search
- Make assumptions about implementation - that's planner's job
- Skip dependency analysis - crucial for planning

---

## Configuration

### Customize Scan Directories

Edit this command to change default scan paths:

```markdown
Default scan locations (customize per project):
- `your-app-dir/`
- `your-components-dir/`
```

### Adjust Output Format

Scout-agent's response_format is configurable in:
`agents/configs/scout-agent.json`

---

## Next Steps

After Scout completes:

1. **Review** `.claude/artifacts/scout-report.md`
2. **Run Planner**: `/plan --scout-report .claude/artifacts/scout-report.md`
3. **Or Auto-Chain**: Use `/auto-implement` to run Scout → Plan → Build automatically

---

## Success Criteria

✅ Scout report exists at `.claude/artifacts/scout-report.md`
✅ Relevant files identified with precision (line/byte ranges)
✅ Dependencies mapped clearly
✅ Open questions flagged for planner
✅ Scope is minimal (< 10 files for most tasks)
✅ Risk assessment provided

---

## Notes

- Scout is **read-only** - no files are modified
- Scout can be run multiple times to refine scope
- Large codebases benefit most from Scout (reduces planner context by 80-90%)
- For small tasks (1-2 files), can skip Scout and go straight to `/plan` or existing commands like `/create-component`
