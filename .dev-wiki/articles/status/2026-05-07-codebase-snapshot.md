---
title: "Codebase Snapshot — 2026-05-07"
category: status
created: 2026-05-07
updated: 2026-05-07
---

# Codebase Snapshot — 2026-05-07

## Metrics
- Host source files: 97 .ts
- Container source files: 63 .ts
- Memory server: 11 .py (~2,800 lines)
- Host tests: 377 pass (vitest)
- Container tests: 449 pass (bun:test)
- Memory tests: 186 pass (pytest)
- Type errors: 0 (both tsconfigs clean)

## Recent Commits
- 9dbe5a3 Phase 43 debrief: mark complete, journal entry, refresh active-phase
- 7fb148c Phase 43: Remove stale pipeline references from skill instructions
- 56aa6ce Phase 42: Remove Qwen-dependent summarization pipeline
- e74eb70 Phase 41: Fix 3 memory migration bugs reported by Nana
- 8e0ff85 Phase 40: Auto-migrate MEMORY.md at spawn + claim_dedup guard

## Key Changes Since Last Snapshot (2026-05-06)
- Phase 44 complete: curated article embedding in knowledge.db with type "curated"
- Article index at spawn via wiki-bridge buildArticleIndex
- Citation marker stripping for curated pre-processing
- knowledge_search type filtering extended to include "curated"

## Health
All test suites passing. No known regressions. Pipeline: research_fetch -> knowledge_embed -> knowledge_search + knowledge_conflicts.
