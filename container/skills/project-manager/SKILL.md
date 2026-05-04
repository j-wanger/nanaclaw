---
name: project-manager
description: Simplified project management for multi-session coding tasks. Plan, track tasks, maintain state across sessions. Supports self-coding and orchestrator modes.
---

# Project Management

Structured planning and task tracking for complex work that spans multiple turns or sessions.

## When to Use

Create a project when:
- The task has 3+ distinct steps that need ordering
- Work will span multiple turns or sessions
- You need to track what's done and what's next
- The user asks you to "plan this", "build X", or describes a multi-part goal

Skip for:
- Single-step tasks (just do them)
- Questions or lookups
- Quick fixes with obvious scope

## Workflow

```
1. Plan    → project_init(name, objective) → edit plan.md with approach
2. Tasks   → write tasks to .project/tasks.md
3. Execute → work through tasks in order, mark each done
4. Track   → update .project/state.md as you go
```

## File Structure

`.project/` lives in your workspace directory. It persists across sessions.

### plan.md
```markdown
# Project: <name>

## Objective
<what we're building and why>

## Approach
<how we'll build it — key decisions, architecture choices>

## Scope
<files and modules affected>
```

### tasks.md
```markdown
# Tasks

- [ ] First task | scope: src/module/*.ts | success: `command that verifies`
- [ ] Second task | scope: src/other.ts | success: `test -f output.json`
- [x] Completed task | scope: src/done.ts | success: `bun test`
```

Each task has:
- **Description** — what to accomplish
- **scope:** — file globs affected
- **success:** — a command that verifies completion

Work tasks in order. Mark each `[x]` when done. Don't skip ahead.

### state.md
```markdown
# Project State

status: in_progress
current_task: 2
last_updated: 2026-04-29
blockers: none

## Progress
- Task 1: done — implemented the parser
- Task 2: in progress — writing tests
```

## Two Modes

### Self-Coding
You implement the code yourself. Read the task, write the code, run the success criterion, mark done.

### Orchestrator
You design the plan and dispatch workers for implementation tasks:

1. Break work into tasks sized for workers (single-file, bounded scope)
2. Use `dispatch_worker` with clear objectives and context
3. Review worker results when they arrive
4. Fix issues or re-dispatch as needed
5. Mark tasks done after verifying worker output

Use orchestrator mode when:
- Tasks are repetitive (same pattern across many files)
- Tasks are well-bounded (clear input → clear output)
- You want to parallelize independent work

Use self-coding mode when:
- Tasks require cross-file reasoning or complex refactoring
- The scope is ambiguous and needs exploration
- Worker output would need heavy editing anyway

## Session Continuity

On compaction recovery or new session start:
1. Check if `.project/` exists
2. Read `state.md` for current position
3. Read `tasks.md` for the task list
4. Resume from the current task

## Boundaries

- `.project/` is NOT memory. It tracks work state, not knowledge or preferences. Use MEMORY.md for things worth remembering across projects.
- Don't create a project inside a project. One `.project/` per workspace.
- If all tasks are done, delete `.project/` and report completion.
