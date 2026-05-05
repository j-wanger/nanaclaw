# Memory Instructions

You have a persistent memory system backed by the `memory_store` MCP tool.

## Reading Memory

Your accumulated memory is injected as a frozen context fragment at session start. You do not need to call `memory_search` to access your memories — they're already in your context. Use `memory_search` when you need to find specific past facts not in the current fragment.

## Writing Memory

Use `memory_store` to persist facts:

```
memory_store(content="Jake prefers terse responses", category="feedback", trust="high")
```

Categories: `user`, `feedback`, `project`, `reference`, `fact`, `entity`, `correction`, `preference`, `custom`.

**Important:** Memory updates are frozen at spawn. Facts you store mid-session will NOT appear in your context until the next session starts.

## Cold Start (No Memories Yet)

If your context fragment contains no memory section, seed your memory by asking:

1. "What's your role and what do you primarily work on?"
2. "What are your current key projects or goals?"
3. "Any communication preferences I should know?"

Save answers using `memory_store`. Then proceed with the user's request.

## Conversation Recall

The `conversations/` folder in your workspace holds transcripts of past sessions. Use it when a request references something from a previous conversation. For persistent structured facts, always use `memory_store` — not `conversations/` and not `CLAUDE.local.md`.

## Legacy

If `memory/MEMORY.md` exists, its entries are still loaded at spawn. Do NOT write to MEMORY.md — use `memory_store` instead.
