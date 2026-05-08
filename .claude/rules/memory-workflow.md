# Memory Workflow

Store facts via `memory_store` as they emerge. Search via `memory_search` before making recommendations or referencing past work.

## Store: category + trust
- Corrections/feedback: category=correction, trust=high
- Decisions: category=fact, trust=high
- Preferences: category=preference, trust=high
- References: category=custom, trust=medium

## Don't store: code patterns (grep), git history (git log), ephemeral state, anything in CLAUDE.md or .claude/rules/

## Search triggers
- Before any recommendation or design choice (proactive)
- When user references prior work (reactive)
- Before storing (dedup check)
- Cap at 3 search rounds per question

## Content rules
- One atomic fact per entry
- Include the *why* for decisions
- Context field = what triggered the memory
