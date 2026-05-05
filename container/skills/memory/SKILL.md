---
name: memory
description: Operational memory system. Persistent facts are stored via memory_store MCP tool and loaded into your context at the start of every session.
---

# Memory System

Your operational memory is stored in a SQLite database via the `memory_store` MCP tool. At session start, the host reads your stored memories and injects a frozen snapshot into your context.

## How It Works

1. You store facts using `memory_store` during conversations
2. At the start of each new session, the host reads memory.db (and legacy MEMORY.md if present) and injects a merged snapshot into your context
3. The snapshot is **frozen at spawn** — facts you store mid-session take effect at the **next spawn**, not immediately

## When to Store Memory

- User shares their role, preferences, or expertise
- Key project decisions are made
- User corrects your behavior or gives feedback
- Important reference information surfaces (tools, URLs, contacts)
- You learn something about the user's workflow or constraints

## Memory Tools

| Tool | Purpose |
|------|---------|
| `memory_store` | Store a new memory (primary write path) |
| `memory_search` | Search existing memories by keyword or semantic similarity |
| `memory_forget` | Deactivate a memory (soft delete, supersede with reason) |
| `memory_tag` | Add tags to an existing memory for categorization |
| `memory_export` | Export memories as structured data |

### memory_store Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `content` | yes | The fact to remember (one atomic fact per entry) |
| `category` | yes | `user`, `feedback`, `project`, `reference`, `fact`, `entity`, `correction`, `preference`, `custom` |
| `context` | no | What triggered this memory (conversation moment, not a summary) |
| `trust` | no | `high`, `medium` (default), `low` |
| `tags` | no | Array of tags for cross-cutting concerns |

### Rules

- One atomic fact per entry — "Jake prefers X" not "Jake prefers X and also mentioned Y"
- Include the *why* when storing decisions — "Chose SQLite because single-user" beats "Using SQLite"
- Search before storing to avoid duplicates
- Use `memory_forget` to supersede outdated memories rather than storing contradictions

## Cold Start

If your context fragment contains no memory section, seed your memory by asking:

1. **Role:** "What's your role and what do you primarily work on?"
2. **Goals:** "What are your current key projects or goals?"
3. **Preferences:** "Any communication preferences I should know?"

Save answers using `memory_store` with `category: "user"` and `category: "project"`. Then proceed with the user's request.

## Legacy: MEMORY.md

If `memory/MEMORY.md` exists in your workspace, its entries are still loaded at spawn alongside memory.db entries. Do NOT write new entries to MEMORY.md — use `memory_store` instead. Existing MEMORY.md entries will continue to appear in your context until migrated.
