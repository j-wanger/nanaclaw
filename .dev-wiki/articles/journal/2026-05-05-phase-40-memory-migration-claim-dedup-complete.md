---
title: "Phase 40: Memory Migration + Claim Dedup Guard Complete"
aliases: []
category: journal
tags: [memory-architecture, code-quality]
parents: [phase-40-memory-migration-claim-dedup]
created: 2026-05-05
updated: 2026-05-05
source: debrief
---

# Phase 40: Memory Migration + Claim Dedup Guard Complete

## What Happened
- Auto-migrate MEMORY.md into memory.db memories table at spawn — idempotent, exact-content dedup, category/trust mapping matching Python migrate.py
- claim_dedup gains max_claims cap (default 1000) with COUNT query before loading embeddings, plus duration_ms in response
- Fixed better-sqlite3 param syntax (@ not $) — caught during RED phase
- Fixed claude-md-compose test that checked for "sole memory store" (now "memory_store" since Phase 39 update)
- All 5 external review issues now fully resolved across Phases 38-40

## Decisions Made
- [[phase-40-memory-migration-claim-dedup-approach|Memory Migration + Claim Dedup Guard]] — medium confidence. Auto-migrate at spawn (option A over one-time CLI). claim_dedup capped not algorithmically changed.

## Problems Solved
- better-sqlite3 uses @param syntax, not $param (bun:sqlite convention) — parameter binding mismatch caught immediately in RED phase
- claude-md-compose coherence test broke after memory skill update — "sole memory store" assertion updated to match new "memory_store" primary path

## Artifacts Changed
- `src/modules/memory/context-builder.ts` (migrateMemoryMdToDb + TYPE_TO_CATEGORY/TRUST + MEMORIES_DDL)
- `src/modules/memory/context-builder.test.ts` (3 new migration tests)
- `src/claude-md-compose.test.ts` (updated coherence assertion)
- `container/agent-runner/src/mcp-tools/claim-tools.ts` (max_claims guard + duration_ms)
- `container/agent-runner/src/mcp-tools/claim-tools.test.ts` (2 new guard tests)

## Health Delta
- Host tests: 372 (1 fixed: claude-md-compose coherence)
- Container mcp-tools tests: 516 (+2 claim_dedup guard tests)
- Type errors: 0 (clean)

### Activation Quality
Active knowledge: 2 entries, 2 referenced (~100% hit rate).

## Related
- [[phase-40-memory-migration-claim-dedup|Phase 40: Memory Migration + Claim Dedup Guard]]
- Closes all 5 external review issues (Phases 38-40)
