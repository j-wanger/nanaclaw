---
title: "Phase 41: Memory Migration Bugfixes"
aliases: []
category: phases
tags: [memory-architecture, bugfix]
parents: []
created: 2026-05-05
updated: 2026-05-05
source: plan
status: active
scope: ["src/modules/memory/context-builder.ts", "src/modules/memory/context-builder.test.ts"]
entry_criteria: "Phase 40 complete, Nana reported 3 bugs in auto-migration"
exit_criteria: "FTS rebuilt after migration; dedup by content not title; source-type tag used for type mapping; all tests passing"
---

# Phase 41: Memory Migration Bugfixes

## Objective

Fix 3 bugs in the auto-migration reported by Nana: FTS5 not rebuilt after external inserts, dedup comparing titles instead of content, category round-trip losing original type.

## Scope

- `src/modules/memory/context-builder.ts`
- `src/modules/memory/context-builder.test.ts`

## Exit Criteria

- [ ] memories_fts rebuilt after migration (if table exists)
- [ ] Dedup by content, not title
- [ ] readMcpMemories uses source-type tag for type mapping
- [ ] All tests passing
