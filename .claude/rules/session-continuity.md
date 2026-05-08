# Session Continuity

You maintain a session state file at `.claude/rules/session-state.md` that
survives compaction and /clear. This file is auto-loaded at every turn
because it lives in .claude/rules/.

## When to Update

Write or update `.claude/rules/session-state.md` at these moments:
- After completing a significant piece of work
- When the conversation shifts to a new topic
- When the user makes a decision worth preserving
- Before suggesting /clear or /compact to the user
- After every 15-20 exchanges in a long session
- Before any batch work that might fill the context

Do NOT wait for session end — update incrementally.

## Format

```markdown
# Session State
<!-- Auto-updated. Survives compaction and /clear. -->

## Current Focus
[1-2 sentences: what we're working on right now]

## Key Decisions This Session
- [decision with brief rationale]

## Pending / Next Steps
- [what's queued or was requested but not done yet]

## Context Notes
[partial results, comparisons in progress, documents under review]

Last updated: [ISO timestamp]
```

## After Compaction or /clear

When this file exists but you have no conversation history:
1. Read session-state.md to understand what was happening
2. Call memory_search for recent corrections or decisions
3. If curation-state.json exists in any wiki, read it for batch progress
4. Acknowledge briefly: "Picking up where we left off — [summary]"
5. Continue naturally without asking the user to re-explain

Note: The PostCompact hook automatically writes a fallback session-state.md
with the compact summary if you didn't update it recently. This is a safety
net — proactive updates are better.

## When to Clear

Overwrite session-state.md with a fresh template when:
- The user explicitly starts unrelated new work
- The state is more than 3 days old and no longer relevant
- The user says "forget what we were doing" or similar

## Long Session Warning

If a session has been running for 20+ exchanges, proactively:
1. Update session-state.md with current state
2. Suggest to the user: "This session is getting long. Want me to save
   our progress and start fresh with /clear? I'll pick up where we left off."
