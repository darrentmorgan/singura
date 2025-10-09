# Parallel Execution Quick Reference

## TL;DR

**Parallel**: Run independent agents concurrently (66% faster!)
**Sequential**: Run dependent agents one at a time

---

## When to Use Parallel

✅ **Code + Validation**
```
frontend-developer + code-reviewer-pro + typescript-pro
```

✅ **Multi-Domain Features**
```
backend-architect + frontend-developer + test-automator
```

✅ **Quality Gates**
```
code-reviewer-pro + qa-expert + security-auditor
```

---

## When to Use Sequential

❌ **Dependencies**
```
backend-architect (migration) → frontend-developer (use schema)
```

❌ **Breaking Changes**
```
backend-architect (API change) → frontend-developer (update clients)
```

❌ **Refactoring**
```
typescript-pro (rename) → test-automator (update tests)
```

---

## How to Execute Parallel Tasks

### ✅ CORRECT - Single Message, Multiple Tasks

```typescript
Task({ subagent_type: "frontend-developer", prompt: "..." })
Task({ subagent_type: "code-reviewer-pro", prompt: "..." })
Task({ subagent_type: "test-automator", prompt: "..." })
// All in ONE message
```

### ❌ WRONG - Separate Messages

```typescript
Task({ subagent_type: "frontend-developer", prompt: "..." })
// ...wait for response...
Task({ subagent_type: "code-reviewer-pro", prompt: "..." })
// This runs SEQUENTIALLY, not parallel!
```

---

## Test the Router

```bash
# See full delegation plan
npx tsx .claude/scripts/delegation-router.ts "Add Button component" --plan

# Output shows:
# - primary_agent
# - secondary_agents[]
# - execution_mode: "parallel" | "sequential"
# - rationale
```

---

## Performance Comparison

| Mode | Agents | Time | Speedup |
|------|--------|------|---------|
| Sequential | 3 agents | 9 min | 1x |
| Parallel | 3 agents | 3 min | **3x faster** |

---

## Config Location

`.claude/agents/delegation-map.json`

```json
{
  "execution_strategy": {
    "parallel": {
      "max_concurrent": 3  // Adjust based on machine
    }
  }
}
```

---

## Common Patterns

| Pattern | Agents | Mode |
|---------|--------|------|
| New React Component | frontend-developer, code-reviewer-pro, test-automator | Parallel ✅ |
| Database Migration + Code | backend-architect (2x), test-automator | Sequential ❌ |
| Full Stack Feature | backend-architect, frontend-developer, test-automator | Parallel ✅ |
| Refactor Function | typescript-pro, code-reviewer-pro, test-automator | Sequential ❌ |
| Security Audit | code-reviewer-pro, qa-expert, security-auditor | Parallel ✅ |

---

## Need Help?

See [PARALLEL_EXECUTION_GUIDE.md](PARALLEL_EXECUTION_GUIDE.md) for full details.
