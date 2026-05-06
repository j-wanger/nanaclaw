---
title: "Phase 41: Memory Migration Bugfixes Complete"
aliases: []
category: journal
tags: [memory-architecture, bugfix]
parents: [phase-41-memory-migration-bugfixes]
created: 2026-05-05
updated: 2026-05-05
source: debrief
---

# Phase 41: Memory Migration Bugfixes Complete

## What Happened
- Fixed 3 bugs in the auto-migration reported by Nana after live testing
- FTS5 index rebuild after external inserts (memories_fts content-sync doesn't fire from better-sqlite3)
- Dedup by content instead of title (MEMORY.md titles vs DB-derived first-line titles never matched)
- source-type tag used for MemoryType round-trip (bypasses lossy category mapping)

## Problems Solved
- FTS dead after migration: external inserts via better-sqlite3 don't trigger SQLite content-sync triggers. Fixed with explicit `INSERT INTO memories_fts(memories_fts) VALUES('rebuild')` after migration
- Duplicate entries in fragment: title-based dedup compared "Jake — Profile" (MEMORY.md) with "Software engineer working in AML..." (DB first-line). Fixed by comparing content instead
- [reference] instead of [user]: user→fact→reference round-trip lost the original type. Fixed by reading the `source-type:user` tag already stored during migration

## Artifacts Changed
- `src/modules/memory/context-builder.ts` (3 fixes)
- `src/modules/memory/context-builder.test.ts` (3 new tests replacing 1 broken test)

## Health Delta
- Host tests: 374 (net +2 from replaced dedup test + new FTS/tag tests)

## Related
- [[phase-41-memory-migration-bugfixes|Phase 41: Memory Migration Bugfixes]]
