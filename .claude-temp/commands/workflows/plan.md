# Plan - Create TDD Implementation Plan

Phase 2 of the Scout → Plan → Build workflow.

Creates a step-by-step, test-first implementation plan based on Scout's minimal context analysis.

## Purpose

Planner transforms Scout's file analysis into an actionable, ordered checklist with:
- Failing tests to write first (TDD)
- Minimal implementation steps
- Token budget estimates
- Risk assessment
- Deferral list (non-critical work)

**Input**: `.claude/artifacts/scout-report.md` (from Scout)
**Output**: `.claude/artifacts/plan.md`, `.claude/artifacts/design-notes.md`

---

## Usage

```bash
# After running Scout
User: "Create implementation plan from scout report"

# With specific focus
User: "Plan implementation for dark mode, prioritize system preference detection"

# With documentation lookup
User: "Plan Stripe integration, check Stripe SDK docs for best practices"
```

---

## Workflow

This command invokes the `planner-agent` via Task tool:

### 1. Load Scout Report

Planner reads `.claude/artifacts/scout-report.md` to understand:
- Files to modify vs files for context
- Dependencies and relationships
- Open questions from Scout
- Scope and complexity

### 2. Fetch Documentation (Optional)

If external documentation is needed:
- Planner delegates to `documentation-expert` agent
- Fetches relevant API docs, framework guides, best practices
- Extracts key patterns and examples

### 3. Design API Contracts

For features requiring new APIs/interfaces:
- Define request/response shapes
- Specify TypeScript interfaces
- Plan Zod validation schemas

### 4. Break Down into Steps

Creates ordered checklist (< 10 steps for most tasks):

Each step includes:
- **Title**: What's being built
- **Test case**: Failing test to write first
- **Implementation**: Minimal code to pass test
- **Agents needed**: Which specialists to delegate to
- **Token estimate**: Rough cost (small/medium/large)
- **Risk level**: low/medium/high

### 5. Defer Non-Critical Work

Identifies enhancements for future iterations:
- Performance optimizations
- Edge case handling
- Extra features
- Documentation updates

### 6. Generate Plan Files

**plan.md** - Execution checklist for Builder

```markdown
# Implementation Plan: [Feature Name]

## Goal
1-2 sentence description

## Prerequisites
- Files identified by Scout
- Dependencies installed
- Tests framework ready

## Steps

### Step 1: Write failing test for [component/feature]
- **Test**: Create `Component.test.tsx` with rendering test
- **Implementation**: Create minimal `Component.tsx` that fails test
- **Agents**: test-automator, frontend-developer
- **Tokens**: ~200-400 (small)
- **Risk**: low

### Step 2: Implement basic [feature] logic
- **Test**: Test passes from step 1
- **Implementation**: Add props, basic rendering
- **Agents**: frontend-developer, typescript-pro
- **Tokens**: ~400-800 (medium)
- **Risk**: low

[... more steps ...]

## Next Iterations (Deferred)
- Add loading states
- Implement error boundaries
- Add accessibility labels
- Performance optimization

## Rollback Plan
- All changes are in feature branch
- Each step is a separate commit
- Can revert individual commits if needed
```

**design-notes.md** (optional) - Architectural context

```markdown
# Design Notes: [Feature Name]

## Architecture
Brief overview of how components fit together

## API Contracts
interface UserProfile {
  id: string;
  name: string;
  // ...
}

## Data Flow
User action → Component state → API call → DB update

## Risk Areas
- Breaking change in API (requires version bump)
- Database migration needed
```

---

## Integration with Builder

Planner's output becomes input for `/build`:

```bash
# After planning
/build --plan .claude/artifacts/plan.md
```

Builder executes steps sequentially, delegating to specialist agents.

---

## Agent Delegation

This command delegates to `planner-agent`:

```
Task Tool → planner-agent
  Prompt: "Create TDD plan from scout report for: {task}"
  Input: .claude/artifacts/scout-report.md
  Tools: Read (scout report), Task (documentation-expert if needed)
  Output: plan.md, design-notes.md
```

**Planner may delegate** to `documentation-expert` for API docs lookup.

---

## Example Output

For task: *"Add dark mode toggle to Settings"*

**plan.md**:

```markdown
# Implementation Plan: Dark Mode Toggle

## Goal
Add UI toggle in Settings for light/dark theme with localStorage persistence

## Prerequisites
- Files: src/components/Settings.tsx, src/lib/theme.ts
- Scout identified existing Zustand store pattern
- Tailwind configured for dark mode

## Steps

### Step 1: Write failing test for theme store
- **Test**: `theme.test.ts` - test theme toggle and persistence
- **Implementation**: Empty themeStore scaffold
- **Agents**: test-automator, typescript-pro
- **Tokens**: ~300 (small)
- **Risk**: low

### Step 2: Implement theme store logic
- **Test**: Tests from Step 1 should pass
- **Implementation**: Zustand store with toggle() and persistence
- **Agents**: frontend-developer, typescript-pro
- **Tokens**: ~500 (medium)
- **Risk**: low

### Step 3: Write failing test for Settings UI
- **Test**: `Settings.test.tsx` - toggle button renders and calls store
- **Implementation**: Add button (fails without logic)
- **Agents**: test-automator, frontend-developer
- **Tokens**: ~400 (small)
- **Risk**: low

### Step 4: Wire toggle button to theme store
- **Test**: Tests from Step 3 pass
- **Implementation**: Connect button onClick to themeStore.toggle()
- **Agents**: frontend-developer
- **Tokens**: ~200 (small)
- **Risk**: low

### Step 5: Add dark mode styles
- **Test**: Visual test for dark mode classes
- **Implementation**: Add Tailwind dark: classes
- **Agents**: frontend-developer
- **Tokens**: ~300 (small)
- **Risk**: low

## Total Estimate: ~1700 tokens (5 small/medium steps)

## Next Iterations
- System preference detection (prefers-color-scheme)
- Smooth transition animation
- Dark mode preview before commit
- Icon for toggle button

## Rollback Plan
- Each step is a separate commit
- Theme store is isolated - easy to remove
- No breaking changes to existing components
```

**design-notes.md**:

```markdown
# Design Notes: Dark Mode Toggle

## Architecture
- Zustand store for theme state (matches existing pattern)
- LocalStorage for persistence
- Tailwind dark: classes for styling

## API
themeStore {
  theme: 'light' | 'dark'
  toggle: () => void
  setTheme: (theme: Theme) => void
}

## Files Modified
- src/lib/theme.ts (new file, ~50 lines)
- src/components/Settings.tsx (+15 lines)

## Risk Areas
None - purely additive feature
```

---

## Best Practices

### ✅ Do
- Start with **failing tests** (TDD non-negotiable)
- Keep steps **small and atomic** (< 500 tokens each when possible)
- **Defer** non-critical enhancements
- **Estimate tokens** to stay within budget
- **Flag risks** explicitly (breaking changes, migrations, etc.)

### ❌ Don't
- Skip test cases - every step needs tests
- Create large monolithic steps (split them!)
- Include nice-to-haves in main plan (defer instead)
- Ignore Scout's scope recommendations
- Plan implementation details (that's Builder's job)

---

## Success Criteria

✅ `plan.md` exists with clear step-by-step checklist
✅ Every step has a failing test defined
✅ Total scope is reasonable (< 3000 tokens ideal, < 5000 max)
✅ Risks and blockers are identified
✅ Non-critical work is deferred to "Next Iterations"
✅ Rollback strategy is documented

---

## Configuration

### Customize Step Limits

Edit `agents/configs/planner-agent.json`:

```json
{
  "special_instructions": [
    "Break complex tasks into <10 discrete steps",  // Adjust number
    // ...
  ]
}
```

### Adjust Token Budgets

Tune estimates in planner-agent config:
- Small: 100-500 tokens
- Medium: 500-1500 tokens
- Large: 1500-3000 tokens

---

## Next Steps

After Planner completes:

1. **Review** `.claude/artifacts/plan.md`
2. **Adjust** if needed (add/remove/reorder steps)
3. **Run Builder**: `/build --plan .claude/artifacts/plan.md`
4. **Or Auto-Chain**: Use `/auto-implement` for full Scout → Plan → Build

---

## Notes

- Planner has NO Write access - purely planning
- Can delegate to `documentation-expert` for API doc lookup
- For simple tasks (1-2 steps), can skip Planner and use existing commands
- Works best with Scout's context minimization (prevents scope creep)
