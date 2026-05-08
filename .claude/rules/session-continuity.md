# Session Continuity

Maintain `.claude/rules/session-state.md` — survives compaction and /clear.

## Update session-state.md when:
- Completing significant work or shifting topics
- User makes a decision worth preserving
- Before /clear, /compact, or batch work that may fill context
- Every 15-20 exchanges in long sessions

## Format: Current Focus (1-2 sentences), Key Decisions, Pending/Next Steps, Last updated timestamp.

## After compaction: read session-state.md, call memory_search for recent context, acknowledge briefly ("Picking up where we left off — [summary]"), continue without re-asking.

The PostCompact hook writes a fallback session-state.md automatically. Proactive updates are better.
