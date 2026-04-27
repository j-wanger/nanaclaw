---
name: memory
description: Operational memory system. MEMORY.md is your persistent, structured memory — facts you learn are stored here and loaded into your context at the start of every session.
---

# Memory System

Your operational memory lives in `memory/MEMORY.md` in your workspace. This file is your source of truth for facts about the user, their projects, preferences, and anything else worth remembering across sessions.

## How It Works

1. You write facts to `memory/MEMORY.md` during conversations
2. At the start of each new session, the host reads MEMORY.md and injects a frozen snapshot into your context
3. The snapshot is **frozen at spawn** — changes you make mid-session take effect at the **next spawn**, not immediately

## When to Write Memory

- User shares their role, preferences, or expertise
- Key project decisions are made
- User corrects your behavior or gives feedback
- Important reference information surfaces (tools, URLs, contacts)
- You learn something about the user's workflow or constraints

## MEMORY.md Format

Each entry is a markdown section with a type tag and date:

```markdown
# Memory

## [user] Entry title (YYYY-MM-DD)
Content of the memory entry. Can be multiple lines.

## [project] Another entry (YYYY-MM-DD)
More content here.
```

### Types

| Type | When to use |
|------|------------|
| `user` | Facts about the user: role, skills, preferences, hardware |
| `feedback` | Corrections to your behavior, confirmed approaches |
| `project` | Ongoing work, goals, deadlines, context |
| `reference` | External resources, URLs, tool locations, contacts |

### Rules

- Keep entries concise — each one costs context tokens every session
- Use today's date when creating entries
- Update existing entries rather than creating duplicates
- Remove entries that are no longer relevant
- Do NOT store information already in CLAUDE.local.md (they coexist — CLAUDE.local.md is for freeform notes, MEMORY.md is for structured facts)

## Cold Start

If `memory/MEMORY.md` doesn't exist or is empty, ask the user these three seed questions before proceeding with their request:

1. **Role:** "What's your role and what do you primarily work on?"
2. **Goals:** "What are your current key projects or goals?"
3. **Preferences:** "Any communication preferences I should know? (e.g., terse vs detailed, timezone, tools you use)"

Save their answers as memory entries. After the first session, the memory system runs silently — you'll see your memories in the context fragment at the top of each session.
