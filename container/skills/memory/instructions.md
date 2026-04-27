# Memory Instructions

You have a structured memory system at `memory/MEMORY.md` in your workspace.

## Reading Memory

Your accumulated memory is injected as a frozen context fragment at session start. You do not need to read MEMORY.md to access your memories — they're already in your context.

## Writing Memory

Write to `memory/MEMORY.md` using this format:

```markdown
## [type] Title (YYYY-MM-DD)
Content
```

Types: `user`, `feedback`, `project`, `reference`.

**Important:** Memory updates are frozen at spawn. Facts you write mid-session will NOT appear in your context until the next session starts. Do not re-read MEMORY.md expecting to see changes reflected in your context fragment — they take effect at next spawn.

## Cold Start (No Memories Yet)

If your context fragment contains no memory section, seed your memory by asking:

1. "What's your role and what do you primarily work on?"
2. "What are your current key projects or goals?"
3. "Any communication preferences I should know?"

Save answers as `[user]` and `[project]` entries. Then proceed with the user's request.

## Coexistence with CLAUDE.local.md

`CLAUDE.local.md` is for freeform per-group notes. `MEMORY.md` is for structured, indexed facts. Do not duplicate content between them.
